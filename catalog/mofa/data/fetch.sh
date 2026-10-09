#!/usr/bin/env bash
# Downloads the CLL data of the Bioconductor package MOFAdata (LGPL-3), checks each SHA-256 sum, and writes one CSV file for each view.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p cll
U="https://raw.githubusercontent.com/bioFAM/MOFAdata/master/data"
sha() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
get() {
  local name=$1 sum=$2
  if [ -f "cll/$name" ] && [ "$(sha "cll/$name")" = "$sum" ]; then return; fi
  curl -fsL --retry 3 -o "cll/$name.part" "$U/$name"
  [ "$(sha "cll/$name.part")" = "$sum" ] || { echo "checksum mismatch: $name" >&2; rm -f "cll/$name.part"; exit 1; }
  mv "cll/$name.part" "cll/$name"
}
get CLL_data.RData a85c19b2a8160006fa42bf836d48745e3959567a8723eaabe73ee6efd904893a
get CLL_covariates.RData 3abfd16dbca5bb0afc2a500edddb8e36f2123a529e81438f06a734b15dbc1cd7
if [ ! -f cll/mrna.csv ]; then
  Rscript -e 'load("cll/CLL_data.RData"); load("cll/CLL_covariates.RData"); for (n in names(CLL_data)) write.csv(CLL_data[[n]], file.path("cll", paste0(tolower(n), ".csv"))); write.csv(CLL_covariates, "cll/covariates.csv")'
fi
