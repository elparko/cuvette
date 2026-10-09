#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/makrai2023-colonies/plates"
R="${CUVETTE_REFERENCE:-${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}}/makrai2023-colonies"
mkdir -p "$D" "$R"
# The six photos of species 14 (three plates, each on a black and on a white background) go to the data folder.
# The metadata sheet with the printed counts and the bounding box table go to the reference folder.
F=https://ndownloader.figshare.com/files
curl -fsSL -o "$D/sp14_img01.jpg" "$F/39122363"
curl -fsSL -o "$D/sp14_img02.jpg" "$F/39122366"
curl -fsSL -o "$D/sp14_img03.jpg" "$F/39122369"
curl -fsSL -o "$D/sp14_img04.jpg" "$F/39122372"
curl -fsSL -o "$D/sp14_img05.jpg" "$F/39122375"
curl -fsSL -o "$D/sp14_img06.jpg" "$F/39122378"
curl -fsSL -o "$R/images.xls" "$F/40585193"
curl -fsSL -o "$R/annot_tab.csv" "$F/40581101"
shasum -a 256 -c - <<EOF
969d8d094344f41e69b8a3787daf293bb56ca997303ca31c1d6106b2d5d4edf0  $D/sp14_img01.jpg
1fc958681c3acb063e34e6f1327742661645a80dafa0be458fa7e8634d7abd6d  $D/sp14_img02.jpg
13940905c53a218207c632b8754f2c6bc2493d34e12f40290c1c74ffa2fe89c9  $D/sp14_img03.jpg
e55fa91bd7b0315c0276ba89f38beb61460ba4c3c62c183e78e7f1eb1fc192aa  $D/sp14_img04.jpg
6da082feae2dfacb8a000a67ba328f6c3561fce798b705771785d383c7d1825d  $D/sp14_img05.jpg
8d2338e698f6fde24a4e7fefbab09f41b5a2ade66008181d55b57bf2af0c6880  $D/sp14_img06.jpg
cb5800dee3ad795539984a003c71f77a9c6a77135afd2cca952e51c4ac6cf608  $R/images.xls
fd3c2a53c19975c2f6718cfb3e47de98933fd7d86dfff44298c1cf6053ea39c0  $R/annot_tab.csv
EOF
