#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/aledo2022-renz-onpg"
mkdir -p "$D"
cd "$D"
curl -fsSL -o renz_0.2.1.tar.gz "https://cran.r-project.org/src/contrib/renz_0.2.1.tar.gz" || curl -fsSL -o renz_0.2.1.tar.gz "https://cran.r-project.org/src/contrib/Archive/renz/renz_0.2.1.tar.gz"
echo "58ae6e9356f341ad0145e0f7658c57bb8e9f5e24ef983686ff806e79273ef21b  renz_0.2.1.tar.gz" | shasum -a 256 -c -
tar -xzf renz_0.2.1.tar.gz renz/data/ONPG.rda
# Preprocessing: replicate v6 of the ONPG data set is Table 2 of the paper (the paper prints the rates times 1000, in µM/min).
# The CSV keeps the package unit, mM/min.
Rscript -e 'e <- new.env(); load("renz/data/ONPG.rda", envir = e); d <- e$ONPG; write.csv(data.frame(onpg_mM = d$ONPG, rate_mM_per_min = d$v6), "onpg_table2.csv", row.names = FALSE)'
rm -rf renz renz_0.2.1.tar.gz
echo "26eed30bf439eb24f305a02f1e16d8a04ce5bfd0fc9a62422b1986c67a89db5e  onpg_table2.csv" | shasum -a 256 -c -
