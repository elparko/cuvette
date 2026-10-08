#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
U="${OPENMS_TUTORIAL_URL:-https://abibuilder.cs.uni-tuebingen.de/archive/openms/Tutorials/Example_Data/Metabolomics/datasets}"
SRC=2012_02_03_PStd_050_1.mzML
OUT=PStd_050_1_rt600-660_mz100-200.mzML
PY="${PYOPENMS_PYTHON:-python3}"
sha() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
[ -f "$OUT" ] && exit 0
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
curl -fL --retry 3 -o "$TMP/$SRC" "$U/$SRC"
[ "$(sha "$TMP/$SRC")" = 00962f2a50ec976bcf2993dd72ef2ec190a53b9c6a117958f61e4149371a9512 ] || { echo "checksum mismatch: $SRC" >&2; exit 1; }
"$PY" -I crop_pstd.py "$TMP/$SRC" "$OUT"
