#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/bates2015-lme4-sleepstudy"
mkdir -p "$D"
export R_LIBS_USER="${R_LIBS_USER:-/Volumes/T7/guided-analysis/tools/R-library}"
Rscript -e '
suppressMessages(library(lme4))
d <- commandArgs(TRUE)[1]
data(sleepstudy)
s <- sleepstudy
s$Subject <- as.character(s$Subject)
write.csv(s, file.path(d, "sleepstudy.csv"), row.names = FALSE)
' "$D"
ls -l "$D"
