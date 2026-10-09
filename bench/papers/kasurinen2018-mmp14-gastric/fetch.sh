#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/kasurinen2018-mmp14-gastric"
mkdir -p "$D"
cd "$D"
curl -fsSL -o mmp14_raw.xlsx "https://zenodo.org/api/records/4945997/files/High%20serum%20MMP-14%20predicts%20worse%20survival%20in%20gastric%20cancer%20data.xlsx/content"
echo "5079adaff0ec69e86654f6ba7dd341ba228ebad59afb539192584754207d05e7  mmp14_raw.xlsx" | shasum -a 256 -c -

# Preprocessing: Excel to CSV for the 240 cancer patients with a serum MMP-14 value.
# The column "Disease specific censor" is 1 for censored, so dss_event = 1 - censor.
# The 8 TNM 7 stage codes become stage 1 to 4, with 0/1 indicator columns for stage II, III, IV.
# age_ge67, diffuse and the stage indicators exist because fit_cox reads numeric columns only.
uv run -q --no-project --with pandas==2.3.3 --with openpyxl==3.1.5 python -I - "$D" <<'EOF'
import sys
import pandas as pd

d = sys.argv[1]
raw = pd.read_excel(f"{d}/mmp14_raw.xlsx", header=None)
label = raw[0].astype(str)
start = label[label.str.contains("GASTRIC CANCER")].index[0] + 1
end = label[label.str.contains("CONTROLS")].index[0]
cols = ["id", "sex", "age", "years", "dss_censor", "pT", "pN", "pM", "stage_code", "lauren", "mmp14_ngml", "mmp14_high"]
g = raw.iloc[start:end, :12].copy()
g.columns = cols
g = g.apply(pd.to_numeric, errors="coerce").dropna(subset=["id", "mmp14_high"])
g["dss_event"] = 1 - g.dss_censor
g["stage"] = g.stage_code.map({1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 3, 8: 4})
g["age_ge67"] = (g.age >= 67).astype(int)
g["diffuse"] = (g.lauren == 2).astype(int)
for s in (2, 3, 4):
    g[f"stage{s}"] = (g.stage == s).astype(int)
out = ["id", "sex", "age", "age_ge67", "years", "dss_event", "pT", "pN", "pM", "stage_code", "stage", "stage2", "stage3", "stage4",
       "lauren", "diffuse", "mmp14_ngml", "mmp14_high"]
ints = [c for c in out if c not in ("age", "years", "mmp14_ngml")]
g[ints] = g[ints].astype("Int64")
g = g[out]
g.to_csv(f"{d}/mmp14_gastric.csv", index=False)
g[g.lauren == 1].to_csv(f"{d}/mmp14_gastric_intestinal.csv", index=False)
g[g.lauren == 2].to_csv(f"{d}/mmp14_gastric_diffuse.csv", index=False)
EOF
shasum -a 256 -c - <<EOF
ed1935f3a83ba9556e9f52a6597a6ac1552658e2cc2576e77f3f0c3c1e1fcd22  mmp14_gastric.csv
d9cbcee6ab5d56ea25e680c4c8f52f2e37a56b82316dea1e54234ae477354bc5  mmp14_gastric_intestinal.csv
9d486fdbad03116777e1dceebe3d44c2ea7fdd7f2010e0cd5635a233aa2e03fa  mmp14_gastric_diffuse.csv
EOF
