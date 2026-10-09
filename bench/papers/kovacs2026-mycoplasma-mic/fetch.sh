#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/kovacs2026-mycoplasma-mic"
mkdir -p "$D"
curl -fsSL -o "$D/MOESM3.xlsx" "https://static-content.springer.com/esm/art%3A10.1038%2Fs41598-026-39804-w/MediaObjects/41598_2026_39804_MOESM3_ESM.xlsx"
echo "ea53f108f08389db88a8c418ea5fb5cc2bac6feb578ba688a50d9be11f211daf  $D/MOESM3.xlsx" | shasum -a 256 -c -

# Preprocessing: Supplementary Table 1 to one CSV file. One row for each strain. The columns are the strain, the species and
# the MIC in ug/ml of nine drugs, named with the drug name. The limit signs become ASCII: "<=0.25" and ">64".
uv run -q --no-project --with pandas==2.3.3 --with openpyxl==3.1.5 python -I - "$D/MOESM3.xlsx" "$D" <<'PY'
import re
import sys
import pandas as pd

src, out = sys.argv[1], sys.argv[2]
df = pd.read_excel(src, sheet_name=0)
df.columns = [re.sub(r"\s+", " ", str(c)).strip() for c in df.columns]
drugs = [c for c in df.columns if "(μg/ml)" in c]
res = pd.DataFrame({"strain": df["Strain"].astype(str).str.strip(), "species": "Mycoplasma anserisalpingitidis"})
for c in drugs:
    name = c.split("(")[0].strip()
    res[name] = df[c].astype(str).str.strip().str.replace("≤", "<=", regex=False).str.replace("≥", ">=", regex=False).str.replace(",", ".", regex=False)
res.to_csv(f"{out}/mycoplasma_mics.csv", index=False)
print(len(res), list(res.columns))
PY
