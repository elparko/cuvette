#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/gouwens2019-allen-ephys"
mkdir -p "$D"
cd "$D"
# Three mouse cells of the Allen Cell Types Database (NWB 1.0 files, 16 to 21 MB each). Allen Institute Terms of Use.
U="http://api.brain-map.org/api/v2/well_known_file_download"
sha() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
get() {
  local cell=$1 file=$2 sum=$3
  if [ -f "$cell.nwb" ] && [ "$(sha "$cell.nwb")" = "$sum" ]; then return; fi
  curl -fsL --retry 3 -o "$cell.nwb.part" "$U/$file"
  [ "$(sha "$cell.nwb.part")" = "$sum" ] || { echo "checksum mismatch: $cell" >&2; rm -f "$cell.nwb.part"; exit 1; }
  mv "$cell.nwb.part" "$cell.nwb"
}
get 567987585 659446977 02121c0125ac2510ff22391d77127198e304ca9acabe06e45ed0c5a028993806
get 595511209 646542044 60e483ce3617efe90dd778c682ad27d67d106b7a9f5f74b066d78e3376c3afeb
get 563220277 659448635 c0a70c2180e1b172cf4b6b8b3b6d43512aabce27f372758c1642082a0ceea20b
