#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/hochman1999-shock-trial"
mkdir -p "$D"
cd "$D"
curl -fsSL --retry 6 --retry-delay 5 --retry-all-errors -o trial_deident.csv "https://zenodo.org/api/records/14046978/files/trial_deident.csv/content"
curl -fsSL --retry 6 --retry-delay 5 --retry-all-errors -o survival_deident.csv "https://zenodo.org/api/records/14046978/files/survival_deident.csv/content"
shasum -a 256 -c - <<EOF
6e4fa44152c87513782878d210840271b29540f5e6dd7106bc0e4687e765c253  trial_deident.csv
5b40245477af6120032088727a545c7751b016a9f098634305c0c2641298c1a0  survival_deident.csv
EOF

# Preprocessing: join the trial file and the survival file on ID (302 patients; the survival file lacks one patient of the medical stabilization arm).
# GROUP 2 is early revascularization, GROUP 1 is initial medical stabilization. VITAL30 1 is dead at 30 days.
# agelt75 is coded 1 = NO and 2 = YES (SAS format NY). realsurv is the follow-up time in days. realcens 1 is a censored time.
# The table has no patient identifier.
uv run -q --no-project --with pandas==2.3.3 python -I - "$D" <<'EOF'
import sys
import pandas as pd

d = sys.argv[1]
t = pd.read_csv(f"{d}/trial_deident.csv", na_values=["", ".", "NA"], usecols=["ID", "GROUP", "VITAL30", "agelt75"])
s = pd.read_csv(f"{d}/survival_deident.csv", na_values=["", ".", "NA"], usecols=["ID", "realsurv", "realcens"])
m = t.merge(s, on="ID", how="left").sort_values("ID")
out = pd.DataFrame({
    "arm": m.GROUP.map({2: "early_revascularization", 1: "medical_stabilization"}),
    "died_30d": (m.VITAL30 == 1).astype(int),
    "age_lt75": (m.agelt75 == 2).astype(int),
    "time_days": m.realsurv.round(4),
    "death": (1 - m.realcens).astype("Int64"),
})
out.to_csv(f"{d}/shock_endpoints.csv", index=False, float_format="%.10g")
EOF
shasum -a 256 -c - <<EOF
57106f89431e5571e4ba16ae2b7b37ed925ff05e20781e81127f3ceb4abbb636  shock_endpoints.csv
EOF
rm -f trial_deident.csv survival_deident.csv
