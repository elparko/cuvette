#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/thaqi2026-bovine-corpus-luteum"
R="${CUVETTE_REFERENCE:-${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}}/thaqi2026-bovine-corpus-luteum"
mkdir -p "$D" "$R"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
curl -fsSL -o "$T/record.zip" "https://zenodo.org/api/records/18680101/files/000dapi000/Bovine_Corpus_Luteum_Scientific_data_R_script-Bovine_Corpus_Luteum_Scientific_data_R_script.zip/content"
echo "6ebc9deb6a950b61c30614d54df5e016887e2078c8b2aa0b1a2111e64071b559  $T/record.zip" | shasum -a 256 -c -
unzip -q -o "$T/record.zip" -d "$T/x"
S="$(echo "$T"/x/*)"
# The R code of the authors holds the pipeline, so it goes to the reference folder.
cp "$S/13.02.26_Scientific_Data.R" "$R/"
unzip -q -o "$S/RAW proteinGroups with FASTA file_Bovine_proteomics.zip" RAW_P337_02B_proteinGroups.txt -d "$D"
echo "322d42f7e6d303b961f467ed756bd367842c9ac466ff1cb4d91687cf21c80308  $D/RAW_P337_02B_proteinGroups.txt" | shasum -a 256 -c -
