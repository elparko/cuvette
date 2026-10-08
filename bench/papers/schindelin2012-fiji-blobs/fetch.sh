#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/schindelin2012-fiji-blobs"
mkdir -p "$D"
cd "$D"
curl -L -C - -o blobs.gif https://imagej.net/ij/images/blobs.gif
echo "507d168e317a6b80cd4a2e94f5ff483769779553b7d02b98cb94f790333d5271  blobs.gif" | shasum -a 256 -c -
