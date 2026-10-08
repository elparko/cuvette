#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/andrews-fastqc"
R="${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}/andrews-fastqc"
mkdir -p "$D" "$R"
cd "$D"
curl -L -C - -O https://www.bioinformatics.babraham.ac.uk/projects/fastqc/good_sequence_short.txt
curl -L -C - -O https://www.bioinformatics.babraham.ac.uk/projects/fastqc/bad_sequence.txt
curl -L -C - -o "$R/good_sequence_short_fastqc.html" https://www.bioinformatics.babraham.ac.uk/projects/fastqc/good_sequence_short_fastqc.html
curl -L -C - -o "$R/bad_sequence_fastqc.html" https://www.bioinformatics.babraham.ac.uk/projects/fastqc/bad_sequence_fastqc.html
cat > SHA256SUMS <<'S'
56d49e766f2fdb6f65563b5ae5584e678c5bec3cfadd58643132a6d5dc161810  good_sequence_short.txt
6a13706bf7bfa821498168bc29cf2388d9925c8d834cf0e9c920bfb570d86eb1  bad_sequence.txt
S
shasum -a 256 -c SHA256SUMS
