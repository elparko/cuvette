#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/minh2020-iqtree2"
mkdir -p "$D"
cd "$D"
curl -L -C - -O https://raw.githubusercontent.com/iqtree/iqtree2/master/example/example.phy
cat > SHA256SUMS <<'S'
d3365cbea79ab6d7b184d1bd9153871616041c6e0e8e591d2a0b4bd08dc0b9bf  example.phy
S
shasum -a 256 -c SHA256SUMS
