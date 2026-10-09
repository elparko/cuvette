#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/wang2023-cuproptosis-oa"
mkdir -p "$D"
cd "$D"
# The four hub genes are named in the abstract and in the Results of the paper.
printf 'gene\nDBT\nDLST\nFDX1\nLIPT1\n' > hub_genes.csv
# DSigDB through Enrichr. gseapy.get_library drops the 20 lines whose first gene field is empty,
# which changes the Benjamini-Hochberg denominator, so this fetch keeps the raw file and filters it here.
curl -fsSL -o DSigDB_raw.txt "https://maayanlab.cloud/Enrichr/geneSetLibrary?mode=text&libraryName=DSigDB"
awk -F'\t' 'NF > 2 && $1 != ""' DSigDB_raw.txt > DSigDB.gmt
shasum -a 256 -c - <<EOF
fd0745b8d089c19b133bcad3bf8f0f5d71f9bb0c5b1f1c24c7d01e9d82a81666  DSigDB.gmt
EOF
# The sum is the library as Enrichr served it on 2026-10-09, with 4026 gene sets.
# A mismatch means that Enrichr changed the library. The published p values then no longer apply.
