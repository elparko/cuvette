#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/astapova2021-deseq2-kgn"
mkdir -p "$D"
cd "$D"
curl -L -C - -o GSE158218_experiment1_deSeq2_counts.txt.gz \
  "https://www.ncbi.nlm.nih.gov/geo/download/?acc=GSE158218&format=file&file=GSE158218%5Fexperiment1%5FdeSeq2%5Fcounts%2Etxt%2Egz"
echo "3b9b398e89e3e2b95eb42924e3bdaae837c26e1e18154a5cb58cac199148b555  GSE158218_experiment1_deSeq2_counts.txt.gz" | shasum -a 256 -c -
# The GEO file is tab-separated with an empty first header cell. The deseq2 adapter reads CSV.
gunzip -c GSE158218_experiment1_deSeq2_counts.txt.gz | awk 'BEGIN { FS = "\t"; OFS = "," } NR == 1 { $1 = "gene" } { $1 = $1; print }' > kgn_counts.csv
# Sample table from the GEO sample titles (GSM4795440-44 DHT, GSM4795450-54 vehicle).
# The suffix of each column name is the date of the experiment. One DHT and one vehicle culture come from each date.
{
  echo "sample,treatment,experiment"
  for t in DHT VEH; do
    for d in 10_23 10_28 11_1 11_5 12_4; do echo "$t$d,$t,$d"; done
  done
} > kgn_samples.csv
