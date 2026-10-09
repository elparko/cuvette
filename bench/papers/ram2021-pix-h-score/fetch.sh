#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/ram2021-pix-h-score"
R="${CUVETTE_REFERENCE:-${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}}/ram2021-pix-h-score"
mkdir -p "$D" "$R"
curl -fsSL -o "$R/journal.pone.0245638.s002.xlsx" "https://journals.plos.org/plosone/article/file?type=supplementary&id=10.1371/journal.pone.0245638.s002"
echo "d30ea4dc7024e8083b12f188a0fc352f0302384d54650d20a924adf562109ef0  $R/journal.pone.0245638.s002.xlsx" | shasum -a 256 -c -

# S1 Table has one sheet for each marker. This joins the sheets into one table with a marker column and short column names.
uv run -q --no-project --with pandas==2.3.3 --with openpyxl==3.1.5 python -I - "$R" "$D" <<'PY'
import sys

import pandas as pd

ref, out = sys.argv[1], sys.argv[2]
src = f"{ref}/journal.pone.0245638.s002.xlsx"
parts = []
for sheet in pd.ExcelFile(src).sheet_names:
    d = pd.read_excel(src, sheet_name=sheet)
    d = d[d.iloc[:, 2].notna()].copy()
    d.columns = ["case_id", "pct_0", "pct_1", "pct_2", "pct_3", "pathologist_h", "transcript", "h_halo", "h_qupath", "atm", "pix_h_vis", "pix_h_halo"]
    d.insert(0, "marker", sheet.split(" consolidated")[0])
    parts.append(d)
t = pd.concat(parts, ignore_index=True)
t["case_id"] = t["case_id"].astype(str)
t.to_csv(f"{out}/pix_h_score_table.csv", index=False)
PY
echo "aecb8a4edc6c21b6d6fa57bba12a65eef047d0eaee60c58171241049d258e617  $D/pix_h_score_table.csv" | shasum -a 256 -c -
