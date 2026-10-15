#!/usr/bin/env bash

set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# preserve build-script metadata on release toolchains that strip host proc-macros.
export CARGO_PROFILE_RELEASE_BUILD_OVERRIDE_STRIP=none

for module_dir in "$root_dir"/wasmModules/*/; do
  [ -d "$module_dir" ] || continue
  wasm-pack build --target web --release "$module_dir" -- --locked
done
