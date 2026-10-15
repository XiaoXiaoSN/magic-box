#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
wasm_pack="${WASM_PACK:-wasm-pack}"
node_bin="${NODE:-node}"
output_root="${1:-$(mktemp -d "${TMPDIR:-/tmp}/magic-box-wasm-profiles.XXXXXX")}"
measure_script="$repo_dir/wasmModules/math-box/bench/measure-shipping.mjs"

command -v "$wasm_pack" >/dev/null || {
  echo "missing wasm-pack: $wasm_pack" >&2
  exit 1
}
command -v "$node_bin" >/dev/null || {
  echo "missing node: $node_bin" >&2
  exit 1
}

mkdir -p "$output_root"
echo "shipping profile output: $output_root"
echo "wasm-pack: $($wasm_pack --version)"
echo "wasm-bindgen: $(${WASM_BINDGEN:-wasm-bindgen} --version 2>/dev/null || echo unavailable)"
echo "wasm-opt: $(${WASM_OPT:-wasm-opt} --version 2>/dev/null || echo unavailable)"

for profile in 3 s z; do
  profile_root="$output_root/$profile"
  target_dir="$output_root/target-$profile"
  math_out="$profile_root/math-box"
  base64_out="$profile_root/base64-box"
  mkdir -p "$profile_root"

  for module in math-box base64-box; do
    module_dir="$repo_dir/wasmModules/$module"
    package_out="$profile_root/$module"
    relative_out="$(python3 -c 'import os, sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))' "$package_out" "$repo_dir")"
    (
      cd "$repo_dir"
      CARGO_PROFILE_RELEASE_OPT_LEVEL="$profile" \
        CARGO_PROFILE_RELEASE_BUILD_OVERRIDE_STRIP=none \
        CARGO_TARGET_DIR="$target_dir" \
        RUSTC_WRAPPER="" \
        "$wasm_pack" build --target web --release "$module_dir" --out-dir "$relative_out" -- --locked
    )
  done

  WASM_PROFILE="$profile" WASM_PACK="$wasm_pack" \
    "$node_bin" "$measure_script" "$math_out" "$base64_out" \
    | tee "$profile_root/measurement.json"
done
