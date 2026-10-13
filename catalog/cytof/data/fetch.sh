#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
OUT="${CYTOF_BCRXL_DIR:-${CUVETTE_HOME:-$HOME/.cuvette}/cache/data/cytof-bcrxl}"
URL="${CYTOF_BCRXL_URL:-https://experimenthub.bioconductor.org/fetch/2255}"
SHA=2a3048ceba78e7bdee72932f54087519ffd626d0faa4fd512598c0eb105a83b5
sha() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
complete() { [ -f "$1/PBMC8_30min_patient8_Reference.fcs" ] && [ "$(ls "$1"/*.fcs | wc -l)" -eq 16 ]; }
link() {
  [ "$OUT" -ef bcrxl ] && return
  if [ -L bcrxl ]; then rm bcrxl; elif [ -d bcrxl ]; then rmdir bcrxl || { echo "data/bcrxl is a folder with incomplete data: remove it" >&2; exit 1; }; fi
  ln -s "$OUT" bcrxl
}
if [ -d bcrxl ] && [ ! -L bcrxl ] && complete bcrxl; then exit 0; fi
if complete "$OUT"; then link; exit 0; fi
if [ -d bcrxl ] && [ ! -L bcrxl ] && [ -n "$(ls -A bcrxl)" ]; then echo "data/bcrxl is a folder with incomplete data: remove it" >&2; exit 1; fi
mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
curl -fsSL --retry 3 -o "$TMP/bcrxl.rda" "$URL"
[ "$(sha "$TMP/bcrxl.rda")" = "$SHA" ] || { echo "checksum mismatch: Bodenmiller_BCR_XL_flowSet.rda" >&2; exit 1; }
for d in "${CUVETTE_R_LIBS:-}" "$HOME/.cuvette/R-library"; do
  [ -n "$d" ] && [ -d "$d" ] && R_LIBS_USER="${R_LIBS_USER:+$R_LIBS_USER:}$d" && export R_LIBS_USER
done
Rscript -e '
suppressMessages(library(flowCore))
a <- commandArgs(TRUE)
e <- new.env()
load(a[1], e)
write.flowSet(get("d_flowSet", e), a[2])
unlink(file.path(a[2], "annotation.txt"))
' "$TMP/bcrxl.rda" "$OUT"
link
ls bcrxl/ | wc -l
