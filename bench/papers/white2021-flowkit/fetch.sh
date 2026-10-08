#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/white2021-flowkit"
COMMIT=f2159043b6a56e527d4baacf97490caf8354618e
mkdir -p "$D"
if [ ! -f "$D/src/data/8_color_data_set/8_color_ICS.wsp" ]; then
  curl -L -o "$D/flowkit.tar.gz" "https://github.com/whitews/FlowKit/archive/$COMMIT.tar.gz"
  mkdir -p "$D/src"
  tar -xzf "$D/flowkit.tar.gz" -C "$D/src" --strip-components=1
  rm "$D/flowkit.tar.gz"
fi
test -f "$D/src/data/8_color_data_set/fcs_files/101_DEN084Y5_15_E01_008_clean.fcs"
test -f "$D/src/data/gate_ref/data1.fcs"
