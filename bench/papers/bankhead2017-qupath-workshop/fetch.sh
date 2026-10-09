#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/bankhead2017-qupath-workshop"
mkdir -p "$D"
cd "$D"
md5of() { md5 -q "$1" 2>/dev/null || md5sum "$1" | cut -d' ' -f1; }
get() {
  curl -L -C - -o "$1" "https://zenodo.org/records/6390370/files/$1?download=1"
  [ "$(md5of "$1")" = "$2" ] || { echo "md5 mismatch: $1"; exit 1; }
}
get prostate_1.ome.tif e735ab1943526efeaf9d3fd01678680e
get prostate_2.ome.tif bde6c6a50ff402a1f6a440b06d1ba735
get prostate_3.ome.tif 57e4647344124e3303af6549170ae26c
get ki678_lymphoma.ndpi be545d0d234840e21e4a53f2bca6cd35
