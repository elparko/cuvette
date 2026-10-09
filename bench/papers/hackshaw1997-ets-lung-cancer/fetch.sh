#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/hackshaw1997-ets-lung-cancer"
mkdir -p "$D"
cd "$D"
curl -fsSL -o dat.hackshaw1998.rda https://raw.githubusercontent.com/wviechtb/metadat/b19c23b4c09e16d0c14a31af94fca190c7dd0357/data/dat.hackshaw1998.rda
echo "a0a8476ab3ce31723e8ebd1a6ca365d77dd9a384bef32c21834f7dfc69d51275  dat.hackshaw1998.rda" | shasum -a 256 -c -

# Preprocessing: the R data file to one CSV file, one row for each of the 37 studies.
# Columns: study, author, year, country, design, cases, or, or.lb, or.ub (as printed in the paper),
# yi (log odds ratio) and vi (its sampling variance), which metadat back-calculates from the odds ratio and the interval.
Rscript --vanilla -e 'load("dat.hackshaw1998.rda"); x <- data.frame(unclass(dat.hackshaw1998)); write.csv(x, "ets_lung_cancer.csv", row.names = FALSE)'
echo "c81943cde9db47d35e207ceb4e340cd180981fded5e7a65ccd10e359c072d32f  ets_lung_cancer.csv" | shasum -a 256 -c -
