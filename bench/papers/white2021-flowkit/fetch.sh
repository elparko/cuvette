#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/white2021-flowkit"
COMMIT=f2159043b6a56e527d4baacf97490caf8354618e
R="${CUVETTE_REFERENCE:-${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}}/white2021-flowkit"
mkdir -p "$D/src/data" "$R"
if [ ! -f "$D/src/data/8_color_data_set/8_color_ICS.wsp" ]; then
  curl -L -o "$R/flowkit.tar.gz" "https://github.com/whitews/FlowKit/archive/$COMMIT.tar.gz"
  mkdir -p "$R/src"
  tar -xzf "$R/flowkit.tar.gz" -C "$R/src" --strip-components=1
  rm "$R/flowkit.tar.gz"
  # The notebooks and the tests of the package print the gate counts. Copy only the data that the request names.
  cp -R "$R/src/data/8_color_data_set" "$R/src/data/gate_ref" "$D/src/data/"
fi
test -f "$D/src/data/8_color_data_set/fcs_files/101_DEN084Y5_15_E01_008_clean.fcs"
test -f "$D/src/data/gate_ref/data1.fcs"
