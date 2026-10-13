#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
ROOT="${GA_DIFFBIND_DATA:-${CUVETTE_HOME:-$HOME/.cuvette}/cache/data/diffbind-vignette}"
mkdir -p "$ROOT"
TAR="$ROOT/DiffBind_vignette_data.tar.gz"
SUM="8d08067509c819d1b0e8df07781045c6ac86d4093db2bd0be62b78e4ec8b1cef"
sha() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
if [ ! -f "$ROOT/x/DiffBind_Vignette/tamoxifen.csv" ]; then
  if [ ! -f "$TAR" ] || [ "$(sha "$TAR")" != "$SUM" ]; then
    curl -fL --retry 3 -C - -o "$TAR" https://content.cruk.cam.ac.uk/bioinformatics/software/DiffBind/DiffBind_vignette_data.tar.gz
  fi
  [ "$(sha "$TAR")" = "$SUM" ] || { echo "checksum mismatch: $TAR" >&2; exit 1; }
  mkdir -p "$ROOT/x"
  tar xzf "$TAR" -C "$ROOT/x"
fi
rm -f vignette
ln -s "$ROOT/x/DiffBind_Vignette" vignette
[ -f vignette/reads/Chr18_BT474_ER_1.bam ] || { echo "the BAM files are missing in $ROOT" >&2; exit 1; }
