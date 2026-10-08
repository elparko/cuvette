#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/quinlan2010-bedtools"
mkdir -p "$D"
cd "$D"
B=https://raw.githubusercontent.com/arq5x/bedtools2/master/data
curl -sfL -C - -O $B/aluY.chr1.bed.gz
curl -sfL -C - -O $B/refseq.chr1.exons.bed.gz
cat > SHA256SUMS <<'S'
9832a6c68ebf70763086d4dc16837d55e6838b4249a70b2eb3a4ab6a8349d338  aluY.chr1.bed.gz
0756bd10c1aaf8e337e06e7f69797da411f0aa1a8c4c1b033dc43aaa2428d202  refseq.chr1.exons.bed.gz
S
shasum -a 256 -c SHA256SUMS
gunzip -c aluY.chr1.bed.gz > aluY.chr1.bed
gunzip -c refseq.chr1.exons.bed.gz > refseq.chr1.exons.bed
