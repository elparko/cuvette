#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/nowicka2019-cytof-bcrxl"
HERE="$(cd "$(dirname "$0")" && pwd)"
ADAPTER_DATA="$HERE/../../../catalog/cytof/data"
mkdir -p "$D"
CYTOF_BCRXL_DIR="$D/fcs" bash "$ADAPTER_DATA/fetch.sh"
cp "$ADAPTER_DATA/bcrxl_metadata.csv" "$D/sample_table.csv"
ls "$D/fcs" | wc -l
