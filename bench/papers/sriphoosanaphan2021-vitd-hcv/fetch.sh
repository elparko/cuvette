#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/sriphoosanaphan2021-vitd-hcv"
mkdir -p "$D"
cd "$D"
curl -fsSL -o vitd_raw.xlsx https://zenodo.org/api/records/4404285/files/Data_set.xlsx/content
curl -fsSL -o Readme.txt https://zenodo.org/api/records/4404285/files/Readme.txt/content
shasum -a 256 -c - <<EOF
572de0b842f2bb148c6cbe7f9821dbd2d537700ec4bafbdd78d8236a38c1189e  vitd_raw.xlsx
66df730e07351ca32b9e2324d0454fd766ea48e5549aecb96178b36775e4b368  Readme.txt
EOF

# Preprocessing: Excel to CSV, one row for each of the 75 patients.
# Group A is the vitamin D arm and group B the placebo arm. The readme does not say this. The group sizes
# (37, 38), the sex counts and the 25(OH)D means of each group match Tables 2 and 3 of the paper.
# Each <marker>_change column is the week-6 value minus the baseline value, because compare_two_groups
# reads one outcome column.
uv run -q --no-project --with pandas==2.3.3 --with openpyxl==3.1.5 python -I - "$D" <<'EOF'
import sys
import pandas as pd

d = sys.argv[1]
x = pd.read_excel(f"{d}/vitd_raw.xlsx")
x.insert(1, "arm", x.pop("Group").map({"A": "vitamin_d", "B": "placebo"}))
for m in ["VD", "AST", "ALT", "TGF", "TIMP", "MMP", "P3NP"]:
    x[f"{m}_change"] = (x[f"{m}6"] - x[f"{m}0"]).round(2)
x.to_csv(f"{d}/vitd_hcv.csv", index=False)
EOF
echo "0a0861006d85089d9ee747b77be63672ac9478c6e9b06803eb39a00e1a87ec0a  vitd_hcv.csv" | shasum -a 256 -c -
