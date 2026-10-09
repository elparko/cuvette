#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/kresken2021-temocillin"
mkdir -p "$D"
curl -fsSL -o "$D/mics.xlsx" "https://zenodo.org/api/records/6575080/files/Data_MICs_PEG_2016_17_temocillin_data_set_11062021.xlsx/content"
echo "9c9b01d18d554488bdf7480277d9168fd9fabf37367820ba9ce646f094c3e048  $D/mics.xlsx" | shasum -a 256 -c -

# Preprocessing: one row for each isolate. The columns are the isolate, the species, the group by third-generation
# cephalosporin (3GC) resistance and one MIC column for each of five drugs, named with the drug name.
# 3GC resistant: cefotaxime MIC above 2 mg/L or ceftazidime MIC above 4 mg/L (EUCAST clinical breakpoints for Enterobacterales).
uv run -q --no-project --with pandas==2.3.3 --with openpyxl==3.1.5 python -I - "$D/mics.xlsx" "$D" <<'EOF'
import sys
import numpy as np
import pandas as pd

src, out = sys.argv[1], sys.argv[2]
df = pd.read_excel(src)
df = df[df["species"].notna()].copy()
res = pd.DataFrame({
    "isolate": df["number of isolate"].str.strip(),
    "species": df["genus"].str.strip() + " " + df["species"].str.strip(),
    "cephalosporin_group": np.where((df["CTX"] > 2) | (df["CAZ"] > 4), "3GC-resistant", "3GC-susceptible"),
    "piperacillin/tazobactam": df["PIT"],
    "temocillin": df["TMO"],
    "cefotaxime": df["CTX"],
    "ceftazidime": df["CAZ"],
    "meropenem": df["MER"],
})
res.to_csv(f"{out}/temocillin_mics.csv", index=False)
print(len(res), res["species"].value_counts().to_dict(), res["cephalosporin_group"].value_counts().to_dict())
EOF
shasum -a 256 -c - <<S
d6189db98a5fd512c1de66bea65f6d0dd2a02cc2cc2965ef0acda70446785df0  $D/temocillin_mics.csv
S
