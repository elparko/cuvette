#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/mahbod2024-nuinsseg"
mkdir -p "$D"
cd "$D"
curl -L -C - -o NuInsSeg.zip "https://zenodo.org/records/10518968/files/NuInsSeg.zip?download=1"
got=$(md5 -q NuInsSeg.zip 2>/dev/null || md5sum NuInsSeg.zip | cut -d' ' -f1)
[ "$got" = "08f9a33e23e983d82ee93aa58e69d095" ] || { echo "md5 mismatch: $got"; exit 1; }
mkdir -p x
unzip -qo NuInsSeg.zip -d x -x '__MACOSX/*'
