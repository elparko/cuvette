#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/belenky2003-sleepstudy"
mkdir -p "$D"
cd "$D"
curl -L -C - -o sleepstudy.csv https://vincentarelbundock.github.io/Rdatasets/csv/lme4/sleepstudy.csv
echo "20922ddc87d538bf2344f73d49000eeb2d7e14934b6191a3e071fefc329942c4  sleepstudy.csv" | shasum -a 256 -c -
