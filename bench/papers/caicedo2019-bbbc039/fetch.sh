#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/caicedo2019-bbbc039"
mkdir -p "$D"
cd "$D"
base=https://data.broadinstitute.org/bbbc/BBBC039
check() { echo "$1  $2" | shasum -a 256 -c -; }
curl -L -C - -O "$base/images.zip"
curl -L -C - -O "$base/masks.zip"
curl -L -C - -O "$base/metadata.zip"
check 6f30a5d4fe38c928ded972704f085975f8dc0d65d9aa366df00e5a9d449fddd7 images.zip
check f9e6043d8ca56344a4886f96a700d804d6ee982f31e2b2cd3194af2a053c2710 masks.zip
check a2c1f900bed9ba92a99553efd4c2ae98598433691c7401d818653ab61110deb2 metadata.zip
for f in images masks metadata; do
  mkdir -p "x/$f"
  unzip -qo "$f.zip" -d "x/$f" -x '__MACOSX/*'
done
