#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/student1908-sleep"
mkdir -p "$D"
cd "$D"
curl -L -C - -o sleep.csv https://vincentarelbundock.github.io/Rdatasets/csv/datasets/sleep.csv
echo "5563ff4da6cf477df91551d9455f905dd0090cd82948fca985eda8a5440e548f  sleep.csv" | shasum -a 256 -c -
