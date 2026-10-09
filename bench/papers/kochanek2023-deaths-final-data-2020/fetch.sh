#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/kochanek2023-deaths-final-data-2020"
HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$D"
# Age-specific death rates of 11 age groups, typed from Tables 2 and 5 of NVSR 72(10). make_fixtures.R in the adapter writes the CSV.
cp "$HERE/../../../catalog/epi-rates/data/nchs_2020_age_rates.csv" "$D/nchs_2020_age_rates.csv"
echo "57e9b17472b15d289a81ea6b3f27e5632b602b6c35139a7c118e3fa95e19855f  $D/nchs_2020_age_rates.csv" | shasum -a 256 -c -
