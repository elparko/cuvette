#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/delaney2004-esol"
mkdir -p "$D"
cd "$D"
curl -L -C - -o delaney-processed.csv https://raw.githubusercontent.com/deepchem/deepchem/master/datasets/delaney-processed.csv
echo "8c06a76f0c6487d29ab0f903e6a7a7139f189ab3c1178f159c8be8964602f189  delaney-processed.csv" | shasum -a 256 -c -
