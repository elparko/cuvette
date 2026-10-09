#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/rossi1980-recidivism"
PY="${CUVETTE_BIOSTATS_PYTHON:-${GA_BIOSTATS_PYTHON:-$HOME/.cuvette/envs/biostats/bin/python}}"
mkdir -p "$D"
"$PY" -c "from lifelines.datasets import load_rossi; load_rossi().to_csv('$D/rossi.csv', index=False)"
echo "0214400170e07f3015a285edca2014cac0dae8aac125fcbaad642490e05f892c  $D/rossi.csv" | shasum -a 256 -c -
