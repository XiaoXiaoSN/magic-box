#!/usr/bin/env bash

set -euo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
prepare_script="$script_directory/prepare-baseline.sh"
temporary_directory="$(mktemp -d "${TMPDIR:-/tmp}/magic-box-baseline-test.XXXXXX")"
trap 'rm -rf "$temporary_directory"' EXIT

remote="$temporary_directory/remote.git"
source="$temporary_directory/source"
clone="$temporary_directory/clone"
archive="$temporary_directory/archive"

git init --bare "$remote" >/dev/null
git init "$source" >/dev/null
git -C "$source" config user.name "shipping profile test"
git -C "$source" config user.email "shipping-profile-test@example.invalid"
printf 'old\n' > "$source/marker.txt"
git -C "$source" add marker.txt
git -C "$source" commit -m "baseline marker" >/dev/null
git -C "$source" branch -M main
git -C "$source" remote add origin "$remote"
git -C "$source" push -u origin main >/dev/null

git clone --single-branch --branch main "$remote" "$clone" >/dev/null
printf 'new\n' > "$source/marker.txt"
git -C "$source" commit -am "update baseline marker" >/dev/null
git -C "$source" push origin main >/dev/null

mkdir -p "$archive"
resolved_sha="$(cd "$clone" && bash "$prepare_script" main "$archive")"
expected_sha="$(git --git-dir "$remote" rev-parse refs/heads/main)"

test "$resolved_sha" = "$expected_sha"
test "$(cat "$archive/marker.txt")" = "new"
test "$(git -C "$clone" rev-parse main)" != "$resolved_sha"
echo "prepare-baseline.sh fetched and archived $resolved_sha"
