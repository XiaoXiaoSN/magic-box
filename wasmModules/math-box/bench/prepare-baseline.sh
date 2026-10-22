#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: prepare-baseline.sh <requested-ref> <output-directory>" >&2
  exit 2
fi

requested_ref="$1"
output_directory="$2"

mkdir -p "$output_directory"
git fetch --no-tags origin "$requested_ref"
baseline_sha="$(git rev-parse 'FETCH_HEAD^{commit}')"
git archive "$baseline_sha" | tar -x -C "$output_directory"
printf '%s\n' "$baseline_sha"
