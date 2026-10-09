#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/rees2019-uptake/fields"
R="${CUVETTE_REFERENCE:-${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}}/rees2019-uptake"
mkdir -p "$D" "$R"
# BioImage Archive S-BSST249. The first three fields of BEAS-2B, 0.5 nM, 1 h go to the data folder.
# The CellProfiler result file of that experiment holds the counts of each field; it goes to the reference folder.
B=https://www.ebi.ac.uk/biostudies/files/S-BSST249
for i in 1 2 3; do curl -fsSL -o "$D/1_BEAS_0.5nM_1h_$i.lsm" "$B/u/1_BEAS_0.5nM_1h_$i.lsm"; done
curl -fsSL -o "$R/1_BEAS_0.5nM_1h.mat" "$B/1_BEAS_0.5nM_1h.mat"
shasum -a 256 -c - <<EOF
b24c666461ff36ad7e0654e570310806b1343e0412d119ab4226069a89cbc784  $D/1_BEAS_0.5nM_1h_1.lsm
907cd44ec40f85b4e95baa24716c9ef1b9998e5043d7e9e04282d31e7cc88a3e  $D/1_BEAS_0.5nM_1h_2.lsm
7a8ae6e6cf52f0765dfc3a1fb5c1984892dc86ec45733b6f3cef4fa107fd5010  $D/1_BEAS_0.5nM_1h_3.lsm
5ae2c6166f96f29d4ee1714b33670116e1a3a7b214c97c788dc6edd388065680  $R/1_BEAS_0.5nM_1h.mat
EOF
