#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/argelaguet2018-mofa-cll"
mkdir -p "$D"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
U="https://raw.githubusercontent.com/bioFAM/MOFAdata/master/data"
curl -fsSL -o "$T/CLL_data.RData" "$U/CLL_data.RData"
curl -fsSL -o "$T/CLL_covariates.RData" "$U/CLL_covariates.RData"
echo "a85c19b2a8160006fa42bf836d48745e3959567a8723eaabe73ee6efd904893a  $T/CLL_data.RData" | shasum -a 256 -c -
echo "3abfd16dbca5bb0afc2a500edddb8e36f2123a529e81438f06a734b15dbc1cd7  $T/CLL_covariates.RData" | shasum -a 256 -c -
# One CSV file for each view. The features are in rows and the patients in columns.
Rscript -e 'args <- commandArgs(TRUE); load(file.path(args[1], "CLL_data.RData")); load(file.path(args[1], "CLL_covariates.RData")); for (n in names(CLL_data)) write.csv(CLL_data[[n]], file.path(args[2], paste0(tolower(n), ".csv"))); write.csv(CLL_covariates, file.path(args[2], "covariates.csv"))' "$T" "$D"
