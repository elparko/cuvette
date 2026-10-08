#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/li2009-samtools"
mkdir -p "$D"
cd "$D"
curl -L -C - -O https://raw.githubusercontent.com/samtools/samtools/develop/examples/ex1.fa
curl -L -C - -O https://raw.githubusercontent.com/samtools/samtools/develop/examples/ex1.sam.gz
cat > SHA256SUMS <<'S'
b9969f5de2e8a630134fa8af6b6a9f69f540f48de9b15eaba80b6711d21b15c7  ex1.fa
dc89fe1d2277324ff0de90bce457cf1579ec078a25944c8400b8a0576712993a  ex1.sam.gz
S
shasum -a 256 -c SHA256SUMS
