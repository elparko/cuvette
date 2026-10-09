#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/thevenot2015-ropls-sacurine"
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$D"
# The sacurine table of the ropls package. make_fixtures.R in the adapter writes the CSV.
cp "$HERE/../../../catalog/metabolomics-stats/data/sacurine.csv" "$D/sacurine.csv"
echo "77497cb05b6339139bea66bc1111f08763af1b6aca66e516dd7dfa6589fe0a43  $D/sacurine.csv" | shasum -a 256 -c -
