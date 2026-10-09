#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/hahne2009-flowcore-compdata"
R="${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}/hahne2009-flowcore-compdata"
mkdir -p "$D" "$R"
# The data set compdata of the Bioconductor package flowCore: an unstained control and four single-stain controls (extdata/compdata).
# The reference matrix compref (the result of the flowCore tests) goes to the reference folder.
SRC="$(Rscript -e 'cat(system.file("extdata", "compdata", package = "flowCore"))' 2>/dev/null || true)"
if [ -z "$SRC" ] || [ ! -d "$SRC" ]; then
  for lib in "${GA_R_LIBS:-}" "${R_LIBS_USER:-}" /Volumes/T7/guided-analysis/tools/R-library-microcyto "$HOME/.guided-analysis/R-library"; do
    if [ -n "$lib" ] && [ -d "$lib/flowCore/extdata/compdata" ]; then SRC="$lib/flowCore/extdata/compdata"; break; fi
  done
fi
for n in 001 002 003 004 005; do cp "$SRC/data/060909.$n" "$D/compdata_060909_$n.fcs"; done
cp "$SRC/compref" "$R/compref.txt"
shasum -a 256 -c - <<S
a1f8d1fe481a9256a1b3cbd04743aa064a046274eb272a5a52e6cf77e40016eb  $D/compdata_060909_001.fcs
016cc924dd60c7573d36971072e5e458e2a73a1bdbcb7bc05d1d22fcfc4945a4  $D/compdata_060909_002.fcs
ff0b26141b897acccae2e6df46b41cb36b10d250867e00d740adf71e89f31bef  $D/compdata_060909_003.fcs
c189dd5fdc588991bb6dd6bce3fef8147d1f629ccfea6e667f7281da89517250  $D/compdata_060909_004.fcs
8b6fb0538c437186a94eaad32a4c8bfde92a468dafe42228ade55b06a123b4b5  $D/compdata_060909_005.fcs
2181f1d5d6ca23337040bfbbd3c489ac00506d538a5f9732d00b58276948d0b8  $R/compref.txt
S
