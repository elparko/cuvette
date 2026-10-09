#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/oksanen-vegan-dune"
mkdir -p "$D"
export R_LIBS_USER="${R_LIBS_USER:-/Volumes/T7/guided-analysis/tools/R-library}"
Rscript -e '
suppressMessages(library(vegan))
d <- commandArgs(TRUE)[1]
data(dune); data(dune.env)
write.csv(cbind(site = rownames(dune), dune), file.path(d, "dune.csv"), row.names = FALSE)
e <- dune.env
e[] <- lapply(e, function(x) if (is.factor(x)) as.character(x) else x)
write.csv(cbind(site = rownames(e), e), file.path(d, "dune_env.csv"), row.names = FALSE)
' "$D"
ls -l "$D"
