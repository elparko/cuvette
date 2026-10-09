#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/bemis2015-cardinal"
R="${CUVETTE_REFERENCE:-${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}}/bemis2015-cardinal"
mkdir -p "$D/x" "$R"
cd "$R"
curl -L -C - -O https://bioconductor.org/packages/release/data/experiment/src/contrib/CardinalWorkflows_1.44.0.tar.gz
echo "301a38159adc03243459095b5d7836f5900687e48e332b5e704b98e28a18c485  CardinalWorkflows_1.44.0.tar.gz" | shasum -a 256 -c -
# Only the data object goes to the data folder. The vignettes hold the results of the workflow.
tar -xzf CardinalWorkflows_1.44.0.tar.gz -C "$D/x" CardinalWorkflows/data/pig206.rda
