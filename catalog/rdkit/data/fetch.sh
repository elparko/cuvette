#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
F=delaney-processed.csv
SUM=8c06a76f0c6487d29ab0f903e6a7a7139f189ab3c1178f159c8be8964602f189
sha() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
if [ -f "$F" ] && [ "$(sha "$F")" = "$SUM" ]; then exit 0; fi
curl -fL --retry 3 -o "$F.part" https://raw.githubusercontent.com/deepchem/deepchem/108af2176a5f876c2df1df922baadb02d647c826/datasets/delaney-processed.csv
[ "$(sha "$F.part")" = "$SUM" ] || { echo "checksum mismatch: $F" >&2; rm -f "$F.part"; exit 1; }
mv "$F.part" "$F"
