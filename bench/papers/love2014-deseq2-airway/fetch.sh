#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/love2014-deseq2-airway"
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$D"
cd "$D"
curl -L -C - -O https://bioconductor.org/packages/release/data/experiment/src/contrib/airway_1.32.0.tar.gz
echo "829f654fc8075ac9d810574e8a8d4672e69e847c45fa2ce598d1ffbc30c7fe19  airway_1.32.0.tar.gz" | shasum -a 256 -c -
mkdir -p x
tar xzf airway_1.32.0.tar.gz -C x
# needs python with pandas, numpy, rdata; run: uv run --with pandas --with rdata python
python3 -I "$HERE/extract_airway.py" x/airway/data/airway.RData "$D"
rm -rf x
# data(gse) (Salmon and tximeta) as airway_gse.rds and gse_counts.csv, gse_length.csv, gse_coldata.csv.
# Needs R with SummarizedExperiment. It installs airway into a library in the data folder.
mkdir -p "$D/R-airway"
R CMD INSTALL -l "$D/R-airway" airway_1.32.0.tar.gz
R_LIBS_USER="$D/R-airway" Rscript "$HERE/export_gse.R" "$D"
