#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/elmasri2026-limit-maaslin2"
mkdir -p "$D"
cd "$D"
sha() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
get() {
  local file=$1 sum=$2
  if [ -f "$file" ] && [ "$(sha "$file")" = "$sum" ]; then return; fi
  curl -fsSL --retry 3 -o "$file" "https://zenodo.org/records/18376726/files/$file?download=1"
  [ "$(sha "$file")" = "$sum" ] || { echo "checksum mismatch: $file" >&2; exit 1; }
}
get otutable.csv d5ea8e304cfa40917471ee081999fa222834f9405b0003fb8041cdbb711fa8bb
get metadata.csv 4f7e424c4461b1ab30b5a0a04e4732caaa8dc53a1dcc5b9dbd09d374425ca80e
ls -l
