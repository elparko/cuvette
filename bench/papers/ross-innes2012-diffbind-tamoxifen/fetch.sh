#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/ross-innes2012-diffbind-tamoxifen"
mkdir -p "$D"
cd "$D"
# The DiffBind vignette data: chromosome 18 BAM files, peak files and the sample sheet of 11 ER ChIP-seq samples (561 MB).
sha() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
SUM="8d08067509c819d1b0e8df07781045c6ac86d4093db2bd0be62b78e4ec8b1cef"
if [ ! -f x/DiffBind_Vignette/tamoxifen.csv ]; then
  curl -fL --retry 3 -C - -o DiffBind_vignette_data.tar.gz https://content.cruk.cam.ac.uk/bioinformatics/software/DiffBind/DiffBind_vignette_data.tar.gz
  [ "$(sha DiffBind_vignette_data.tar.gz)" = "$SUM" ] || { echo "checksum mismatch: DiffBind_vignette_data.tar.gz" >&2; exit 1; }
  mkdir -p x
  tar xzf DiffBind_vignette_data.tar.gz -C x
fi
echo "$SUM  DiffBind_vignette_data.tar.gz" | shasum -a 256 -c -
