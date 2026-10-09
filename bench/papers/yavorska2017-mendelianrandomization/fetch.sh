#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/yavorska2017-mendelianrandomization"
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$D"
# The 28 variants of the MendelianRandomization data (ldlc, chdlodds). make_fixtures.R in the adapter writes the CSV.
cp "$HERE/../../../catalog/mendelianrandomization/data/ldl_chd.csv" "$D/ldl_chd.csv"
echo "7073c729f8929f31b69ca7d0037b0647e4381d6b45c314bd4cc0c46ae46bcc10  $D/ldl_chd.csv" | shasum -a 256 -c -
