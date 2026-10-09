#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/andreasson2019-endotoxin-health"
mkdir -p "$D"
cd "$D"
curl -fsSL -o endotoxin_raw.xlsx "https://zenodo.org/api/records/4987396/files/Endotoxin_self-rated%20health.xlsx/content"
echo "235ee673874cba6c3054f74ff27a8cce81e5832940be0124618084ed74f87547  endotoxin_raw.xlsx" | shasum -a 256 -c -

# Preprocessing: the Experiment 2 sheet (52 subjects, long format) to CSV with short column names.
# endotoxin_exp2_current.csv drops the 5 rows with a blank current health value, because fit_mixed_model
# stops on a blank outcome. endotoxin_exp2_general.csv holds the 48 rows at 90 minutes with a general
# health value, the only time point with this rating in Experiment 2.
uv run -q --no-project --with pandas==2.3.3 --with openpyxl==3.1.5 python -I - "$D" <<'EOF'
import sys
import pandas as pd

d = sys.argv[1]
x = pd.read_excel(f"{d}/endotoxin_raw.xlsx", sheet_name="Experiment 2 0.6 ng per kg")
x.columns = ["id", "time", "tnf", "il6", "il8", "current", "general", "lps", "woman", "sickq"]
x = x[["id", "time", "lps", "woman", "current", "general", "sickq", "tnf", "il6", "il8"]]
for c in ["current", "general", "sickq"]:
    x[c] = x[c].astype("Int64")
x.to_csv(f"{d}/endotoxin_exp2.csv", index=False)
x.dropna(subset=["current"]).to_csv(f"{d}/endotoxin_exp2_current.csv", index=False)
x[(x.time == 2) & x.general.notna()].to_csv(f"{d}/endotoxin_exp2_general.csv", index=False)
EOF
shasum -a 256 -c - <<EOF
9f3b765a90b427e8bb297e2d6a1936fd40960224e822b49e0ff072da70c796a0  endotoxin_exp2.csv
ce2623b652f01990689fee123c86bf79ff552f372705ae2ac09568a5432c8c77  endotoxin_exp2_current.csv
b236418f9b0ebe517bf64f4283766ec7c620e6d23f42dcb232d05b5d70fcba8e  endotoxin_exp2_general.csv
EOF
