#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/jang2016-hcc-biomarkers"
mkdir -p "$D"
cd "$D"
curl -fsSL -o hcc_raw.xlsx https://zenodo.org/api/records/4952129/files/HCC_biomarker_160206_data.xlsx/content
echo "b15abef285583662696fdc79e56e79fd5613938d07dbcf46ac83ffc8504d9839  hcc_raw.xlsx" | shasum -a 256 -c -

# Preprocessing: the first sheet of the Excel file to one CSV file, one row for each of the 401 patients.
# No column changes. HCC_studyGr is 1 for hepatocellular carcinoma and 0 for liver cirrhosis.
uv run -q --no-project --with pandas==2.3.3 --with openpyxl==3.1.5 python -I - "$D" <<'EOF'
import sys
import pandas as pd

d = sys.argv[1]
pd.read_excel(f"{d}/hcc_raw.xlsx", sheet_name="Sheet1").to_csv(f"{d}/hcc_biomarkers.csv", index=False)
EOF
echo "8a8f034695c0639a7b4209f145df88421c170c89ab84757bf76218c377470574  hcc_biomarkers.csv" | shasum -a 256 -c -
