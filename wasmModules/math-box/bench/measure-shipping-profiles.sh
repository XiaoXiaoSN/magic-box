#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
wasm_pack="${WASM_PACK:-wasm-pack}"
node_bin="${NODE:-node}"
output_root="${1:-$(mktemp -d "${TMPDIR:-/tmp}/magic-box-wasm-profiles.XXXXXX")}"
measure_script="$repo_dir/wasmModules/math-box/bench/measure-shipping.mjs"
baseline_root="${WASM_BASELINE_ROOT:-}"
baseline_sha="${WASM_BASELINE_SHA:-}"
require_tool_metadata="${REQUIRE_TOOL_METADATA:-0}"

if [[ -n "$baseline_root" ]]; then
  baseline_root="$(cd "$baseline_root" && pwd)"
fi

resolve_executable_path() {
  local name="$1"
  local variable="$2"
  local configured="${!variable:-}"

  if [[ -n "$configured" ]]; then
    if [[ "$configured" == */* && -x "$configured" ]]; then
      printf '%s\n' "$configured"
      return 0
    fi
    if [[ "$configured" != */* ]] && command -v "$configured" >/dev/null 2>&1; then
      command -v "$configured"
      return 0
    fi
  fi
  if command -v "$name" >/dev/null 2>&1; then
    command -v "$name"
    return 0
  fi
  return 1
}

resolve_rust_tool() {
  local name="$1"
  local variable="$2"
  local configured="${!variable:-}"
  local path

  if [[ -n "$configured" && "$configured" == */* && -x "$configured" ]]; then
    printf '%s\n' "$configured"
    return 0
  fi
  if command -v rustup >/dev/null 2>&1 && path="$(rustup which "$name" 2>/dev/null)" && [[ -x "$path" ]]; then
    printf '%s\n' "$path"
    return 0
  fi
  resolve_executable_path "$name" "$variable"
}

command -v "$wasm_pack" >/dev/null || {
  echo "missing wasm-pack: $wasm_pack" >&2
  exit 1
}
command -v "$node_bin" >/dev/null || {
  echo "missing node: $node_bin" >&2
  exit 1
}

mkdir -p "$output_root"
output_root="$(cd "$output_root" && pwd)"
wasm_pack="$(command -v "$wasm_pack")"
node_bin="$(command -v "$node_bin")"

rustc_path="$(resolve_rust_tool rustc RUSTC)"
cargo_path="$(resolve_rust_tool cargo CARGO)"
export RUSTC="$rustc_path"
export CARGO="$cargo_path"
rust_tool_path="$(dirname "$cargo_path"):$(dirname "$rustc_path"):$PATH"
export PATH="$rust_tool_path"

wasm_bindgen_path="$(resolve_executable_path wasm-bindgen WASM_BINDGEN || true)"
wasm_opt_path="$(resolve_executable_path wasm-opt WASM_OPT || true)"
if [[ -n "$wasm_bindgen_path" ]]; then
  wasm_bindgen_path_dir="$(dirname "$wasm_bindgen_path"):$PATH"
  export PATH="$wasm_bindgen_path_dir"
fi
if [[ -n "$wasm_opt_path" ]]; then
  wasm_opt_path_dir="$(dirname "$wasm_opt_path"):$PATH"
  export PATH="$wasm_opt_path_dir"
fi

strace_path="$(resolve_executable_path strace STRACE || true)"
if [[ "$require_tool_metadata" == 1 && -z "$strace_path" ]]; then
  echo "REQUIRE_TOOL_METADATA=1 needs strace to prove wasm-pack child binaries" >&2
  exit 1
fi
if [[ "$require_tool_metadata" == 1 && -n "$baseline_root" && -z "$baseline_sha" ]]; then
  echo "WASM_BASELINE_SHA is required when measuring a baseline archive" >&2
  exit 1
fi

echo "shipping profile output: $output_root"
echo "wasm-pack: $($wasm_pack --version)"
echo "rustc: $rustc_path"
echo "cargo: $cargo_path"
echo "strace: ${strace_path:-unavailable}"

extract_trace_tool() {
  local name="$1"
  local trace_file="$2"
  local matches

  matches="$(sed -n -E "s|.*execve\\(\"([^\"]*/${name})\".* = 0$|\\1|p" "$trace_file" || true)"
  if [[ -n "$matches" ]]; then
    printf '%s\n' "$matches" | tail -n 1
  fi
}

record_actual_tools() {
  local trace_file="$1"
  local actual_bindgen
  local actual_opt

  [[ -n "$strace_path" ]] || return 0
  actual_bindgen="$(extract_trace_tool wasm-bindgen "$trace_file")"
  actual_opt="$(extract_trace_tool wasm-opt "$trace_file")"
  if [[ -z "$actual_bindgen" || -z "$actual_opt" ]]; then
    echo "strace did not capture both wasm-bindgen and wasm-opt in $trace_file" >&2
    exit 1
  fi
  if [[ -n "$wasm_bindgen_path" && "$actual_bindgen" != "$wasm_bindgen_path" ]]; then
    echo "wasm-pack used $actual_bindgen, expected bound wasm-bindgen $wasm_bindgen_path" >&2
    exit 1
  fi
  if [[ -n "$wasm_opt_path" && "$actual_opt" != "$wasm_opt_path" ]]; then
    echo "wasm-pack used $actual_opt, expected bound wasm-opt $wasm_opt_path" >&2
    exit 1
  fi
  wasm_bindgen_path="$actual_bindgen"
  wasm_opt_path="$actual_opt"
  export WASM_BINDGEN="$wasm_bindgen_path"
  export WASM_OPT="$wasm_opt_path"
  actual_tools_path="$(dirname "$wasm_bindgen_path"):$(dirname "$wasm_opt_path"):$PATH"
  export PATH="$actual_tools_path"
}

run_wasm_pack() {
  local trace_file="$1"
  shift

  if [[ -n "$strace_path" ]]; then
    "$strace_path" -f -e trace=execve -o "$trace_file" "$@"
    record_actual_tools "$trace_file"
  else
    "$@"
  fi
}

bootstrap_tools() {
  local bootstrap_root="$1"
  local bootstrap_crate="$bootstrap_root/crate"
  local bootstrap_trace="$output_root/3/bootstrap-wasm-pack.strace"

  mkdir -p "$bootstrap_crate/src" "$(dirname "$bootstrap_trace")"
  cat > "$bootstrap_crate/Cargo.toml" <<'EOF'
[package]
name = "magic-box-wasm-tool-bootstrap"
version = "0.0.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "=0.2.129"

[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-O"]
EOF
  cat > "$bootstrap_crate/src/lib.rs" <<'EOF'
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn preflight() {}
EOF
  cargo generate-lockfile --manifest-path "$bootstrap_crate/Cargo.toml"
  run_wasm_pack "$bootstrap_trace" "$wasm_pack" build --target web --release "$bootstrap_crate" --out-dir "$bootstrap_root/package" -- --locked
}

build_module() {
  local source_root="$1"
  local module="$2"
  local package_out="$3"
  local target_dir="$4"
  local trace_file="$5"
  local module_dir="$source_root/wasmModules/$module"

  mkdir -p "$(dirname "$package_out")" "$(dirname "$trace_file")"
  (
    cd "$module_dir"
    CARGO_PROFILE_RELEASE_BUILD_OVERRIDE_STRIP=none \
      CARGO_TARGET_DIR="$target_dir" \
      RUSTC_WRAPPER="" \
      CARGO_PROFILE_RELEASE_OPT_LEVEL="$profile" \
      run_wasm_pack "$trace_file" "$wasm_pack" build --target web --release . --out-dir "$package_out" -- --locked
  )
}

bootstrap_root="$(mktemp -d "${TMPDIR:-/tmp}/magic-box-wasm-tools.XXXXXX")"
trap 'rm -rf "$bootstrap_root"' EXIT
if [[ -n "$strace_path" ]]; then
  bootstrap_tools "$bootstrap_root"
fi

for profile in 3 s z; do
  profile_root="$output_root/$profile"
  target_dir="$output_root/target-$profile/candidate"
  math_out="$profile_root/math-box"
  base64_out="$profile_root/base64-box"
  mkdir -p "$profile_root"

  build_module "$repo_dir" math-box "$math_out" "$target_dir/math-box" "$profile_root/candidate-math-wasm-pack.strace"
  build_module "$repo_dir" base64-box "$base64_out" "$target_dir/base64-box" "$profile_root/candidate-base64-wasm-pack.strace"

  if [[ -n "$baseline_root" ]]; then
    baseline_out="$profile_root/baseline"
    build_module "$baseline_root" math-box "$baseline_out/math-box" "$output_root/target-$profile/baseline/math-box" "$profile_root/baseline-math-wasm-pack.strace"
    build_module "$baseline_root" base64-box "$baseline_out/base64-box" "$output_root/target-$profile/baseline/base64-box" "$profile_root/baseline-base64-wasm-pack.strace"
  fi

  if [[ "$require_tool_metadata" == 1 && ( -z "$wasm_bindgen_path" || -z "$wasm_opt_path" ) ]]; then
    echo "unable to prove the actual wasm-bindgen and wasm-opt binaries" >&2
    exit 1
  fi
  export WASM_PACK="$wasm_pack"
  export WASM_BINDGEN="$wasm_bindgen_path"
  export WASM_OPT="$wasm_opt_path"
  {
    printf 'wasm-pack=%s\n' "$WASM_PACK"
    printf 'rustc=%s\n' "$RUSTC"
    printf 'cargo=%s\n' "$CARGO"
    printf 'wasm-bindgen=%s\n' "$WASM_BINDGEN"
    printf 'wasm-opt=%s\n' "$WASM_OPT"
    printf 'strace=%s\n' "${strace_path:-unavailable}"
    printf 'baseline-sha=%s\n' "$baseline_sha"
  } > "$profile_root/toolchain-paths.txt"

  WASM_PROFILE="$profile" \
    "$node_bin" "$measure_script" "$math_out" "$base64_out" \
    | tee "$profile_root/measurement.json"
  if [[ -n "$baseline_root" ]]; then
    WASM_PROFILE="$profile-baseline" \
      "$node_bin" "$measure_script" "$profile_root/baseline/math-box" "$profile_root/baseline/base64-box" \
      | tee "$profile_root/baseline-measurement.json"
  fi
done
