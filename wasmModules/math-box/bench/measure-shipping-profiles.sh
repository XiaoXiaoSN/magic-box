#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
wasm_pack="${WASM_PACK:-wasm-pack}"
node_bin="${NODE:-node}"
output_root="${1:-$(mktemp -d "${TMPDIR:-/tmp}/magic-box-wasm-profiles.XXXXXX")}"
measure_script="$repo_dir/wasmModules/math-box/bench/measure-shipping.mjs"
baseline_root="${WASM_BASELINE_ROOT:-}"
require_tool_metadata="${REQUIRE_TOOL_METADATA:-0}"

if [[ -n "$baseline_root" ]]; then
  baseline_root="$(cd "$baseline_root" && pwd)"
fi

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
echo "shipping profile output: $output_root"
echo "wasm-pack: $($wasm_pack --version)"

find_cached_tool() {
  local name="$1"
  local cache_dir="${WASM_PACK_CACHE:-$HOME/.cache/.wasm-pack}"
  if [[ -d "$cache_dir" ]]; then
    find "$cache_dir" -type f -name "$name" -perm -u+x -print 2>/dev/null | head -n 1
  fi
}

resolve_tool() {
  local name="$1"
  local variable="$2"
  local configured="${!variable:-}"
  if [[ -n "$configured" && -x "$configured" ]]; then
    printf '%s\n' "$configured"
    return
  fi
  if command -v "$name" >/dev/null 2>&1; then
    command -v "$name"
    return
  fi
  find_cached_tool "$name"
}

require_tool() {
  local name="$1"
  local variable="$2"
  local path
  path="$(resolve_tool "$name" "$variable")"
  if [[ -z "$path" && "$require_tool_metadata" == 1 ]]; then
    echo "unable to locate the actual $name binary after wasm-pack build" >&2
    exit 1
  fi
  printf '%s\n' "$path"
}

build_module() {
  local source_root="$1"
  local module="$2"
  local package_out="$3"
  local target_dir="$4"
  local module_dir="$source_root/wasmModules/$module"

  mkdir -p "$(dirname "$package_out")"
  (
    cd "$module_dir"
    CARGO_PROFILE_RELEASE_BUILD_OVERRIDE_STRIP=none \
      CARGO_TARGET_DIR="$target_dir" \
      RUSTC_WRAPPER="" \
      CARGO_PROFILE_RELEASE_OPT_LEVEL="$profile" \
      "$wasm_pack" build --target web --release . --out-dir "$package_out" -- --locked
  )
}

for profile in 3 s z; do
  profile_root="$output_root/$profile"
  target_dir="$output_root/target-$profile/candidate"
  math_out="$profile_root/math-box"
  base64_out="$profile_root/base64-box"
  mkdir -p "$profile_root"

  build_module "$repo_dir" math-box "$math_out" "$target_dir/math-box"
  build_module "$repo_dir" base64-box "$base64_out" "$target_dir/base64-box"

  if [[ -n "$baseline_root" ]]; then
    baseline_out="$profile_root/baseline"
    build_module "$baseline_root" math-box "$baseline_out/math-box" "$output_root/target-$profile/baseline/math-box"
    build_module "$baseline_root" base64-box "$baseline_out/base64-box" "$output_root/target-$profile/baseline/base64-box"
  fi

  export WASM_PACK="$wasm_pack"
  wasm_bindgen_path="$(require_tool wasm-bindgen WASM_BINDGEN)"
  wasm_opt_path="$(require_tool wasm-opt WASM_OPT)"
  export WASM_BINDGEN="$wasm_bindgen_path"
  export WASM_OPT="$wasm_opt_path"
  printf 'wasm-pack=%s\nwasm-bindgen=%s\nwasm-opt=%s\n' \
    "$WASM_PACK" "$WASM_BINDGEN" "$WASM_OPT" > "$profile_root/toolchain-paths.txt"

  WASM_PROFILE="$profile" WASM_PACK="$wasm_pack" \
    "$node_bin" "$measure_script" "$math_out" "$base64_out" \
    | tee "$profile_root/measurement.json"
  if [[ -n "$baseline_root" ]]; then
    WASM_PROFILE="$profile-baseline" WASM_PACK="$wasm_pack" \
      "$node_bin" "$measure_script" "$profile_root/baseline/math-box" "$profile_root/baseline/base64-box" \
      | tee "$profile_root/baseline-measurement.json"
  fi
done
