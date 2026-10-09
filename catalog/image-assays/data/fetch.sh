#!/usr/bin/env bash
# Downloads the Fiji Coloc 2 test images (GPL-3) at a fixed commit and checks each SHA-256 sum.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p coloc2
U="https://raw.githubusercontent.com/fiji/Colocalisation_Analysis/82af2de4ad477e723d77a815279ee1c23b285da9/src/test/resources"
sha() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
get() {
  local name=$1 sum=$2
  if [ -f "coloc2/$name" ] && [ "$(sha "coloc2/$name")" = "$sum" ]; then return; fi
  curl -fsL --retry 3 -o "coloc2/$name.part" "$U/$name"
  [ "$(sha "coloc2/$name.part")" = "$sum" ] || { echo "checksum mismatch: $name" >&2; rm -f "coloc2/$name.part"; exit 1; }
  mv "coloc2/$name.part" "coloc2/$name"
}
get colocsample1b-green.tif a099913867fcc12494387661951585cfd90ae6dd37adf388c8e306bb064f437e
get colocsample1b-red.tif 009a17105e71ad479bac2230ff3503fe514f9b75c9c5ebfbdfae57dd67aa8739
get colocsample1b-mask.tif f71661c414f44a4a5d88b7e34a7a792a10277389f1e5ccf01e732695aafc99a6
get mandersA.tiff 55f0e233d0322cf360a243f433092f4498b62864825af3c7040ba50b13bb45e2
get mandersB.tiff f013fac909a0d211894695abfab4068a8479350932f2f924bd2e9ffb7b80c6f9
get mandersC.tiff 12cc8512baae5e277930507e048cba119bfdb54e0b0dd3a7c14bca5cc3c4cada
get mandersD.tiff a3c3946baf6f152e42e8248f67d12ffe5abb4c8f83915cfb68075b466a4aa27a
get mandersI.tiff 7e9c4ae3405fc9c518f2dc8139be5adee2928a73ad2475c2f145d1868e3dc1ed
