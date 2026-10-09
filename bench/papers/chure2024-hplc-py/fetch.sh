#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/chure2024-hplc-py"
mkdir -p "$D"
cd "$D"
# Zenodo record 10642439, the archive of hplc-py 0.2.5 that the JOSS paper cites. License GPL-3.0.
if [ ! -f hplc-py-0.2.5.zip ]; then
  curl -fsSL -o hplc-py-0.2.5.zip "https://zenodo.org/api/records/10642439/files/cremerlab/hplc-py-0.2.5.zip/content"
fi
R="cremerlab-hplc-py-4830014/docs/source/tutorials/data"
unzip -o -q hplc-py-0.2.5.zip "$R/sample.txt" "$R/calibration/*.csv" "$R/test/lactose_mM_2.csv"
cp "$R/sample.txt" sample.txt
mkdir -p lactose
cp "$R"/calibration/lactose_mM_*.csv lactose/
cp "$R/test/lactose_mM_2.csv" lactose/
shasum -a 256 -c - <<EOF
e2ae63ab3db1c8ba7e170be1fdfd74585b6b29b4eaf4555869d6a2d0098d58c9  sample.txt
4a4de2575098f3ffea609633d0b2e312d38731d070c48fa977affc5f680ffdf3  lactose/lactose_mM_0.5.csv
9bb8e4e639741d3877486b2be195f7485fc129f83a560c3f53c5d43c047b9a2e  lactose/lactose_mM_1.csv
7beefc3ef2a14e502c5f084bdee37fb699d84c3f84b6f64418580d00fa05e7af  lactose/lactose_mM_3.csv
aff86e7f1982e66f2eedef486c867d0d55b20b0e2f78c9fdf17269abd37e2b1c  lactose/lactose_mM_6.csv
97941046a1a0712305b145d725a2d2c33bcb93b42ebbc192a9c9e34c29d61aa9  lactose/lactose_mM_2.csv
EOF
# sample.txt is a Shimadzu LabSolutions export. The trace starts at line 84, with the columns
# "R.Time (min)" and "Intensity", separated by commas.
