#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/yun2026-lasv-elisa"
R="${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}/yun2026-lasv-elisa"
mkdir -p "$D" "$R"
# The workbook holds the Gen5 concentrations (the published results). It goes to the reference folder.
curl -fsSL -o "$R/S1_Data.xlsx" "https://journals.plos.org/plosone/article/file?type=supplementary&id=10.1371/journal.pone.0340568.s010"
echo "0c4d929cf71b17b41a7f6cb6d58ee28b7c5d301d42b9b746957ec006662b35e1  $R/S1_Data.xlsx" | shasum -a 256 -c -

# Preprocessing: the sheet "Table 1 dynamic range" to one row for each well of the nine runs.
# Standards STD1-STD10 (nominal IU/mL in the sheet), four blank wells, HPC, LPC and NEG in triplicate, and the
# dilution series STD*-1 to STD*-10 of the new reference serum pool in duplicate.
# The nominal values are the column "Nominal concentration IU/mL" of Table 1 of the paper (a two-fold series from 7.744 IU/mL,
# rounded to three decimals by the authors); HPC 1.858 and LPC 0.465 IU/mL.
# Only the optical densities and the nominal values go to the CSV. The Gen5 concentrations stay in the workbook.
# A trailing * marks a well that the authors masked in Gen5; the column masked is 1 for these wells.
uv run -q --no-project --with pandas==2.3.3 --with openpyxl==3.1.5 python -I - "$R/S1_Data.xlsx" "$D/lasv_elisa_runs.csv" <<'EOF'
import sys
import pandas as pd

src, out = sys.argv[1], sys.argv[2]
df = pd.read_excel(src, sheet_name="Table 1 dynamic range", header=None)
runs = [(j, int(str(v).split()[1])) for j, v in enumerate(df.iloc[0]) if isinstance(v, str) and v.startswith("Run")]
nominal = dict(zip([f"STD*-{k}" for k in range(1, 11)], [7.744, 3.872, 1.936, 0.968, 0.484, 0.242, 0.121, 0.060, 0.030, 0.015]))
nominal.update({"HPC": 1.858, "LPC": 0.465})
rows = []
for j, run in runs:
    od_cols = [k for k in range(j, j + 4) if str(df.iat[1, k]).startswith("OD")]
    for i in range(2, len(df)):
        label = df.iat[i, 0]
        if not isinstance(label, str):
            continue
        label = label.strip()
        if label.startswith("STD*"):
            kind = "sample"
        elif label.startswith("STD"):
            kind = "standard"
        elif label == "Blank":
            kind = "blank"
        else:
            kind = "control"
        for rep, k in enumerate(od_cols, start=1):
            v = df.iat[i, k]
            if pd.isna(v):
                continue
            masked = isinstance(v, str) and v.endswith("*")
            rows.append({
                "run": run,
                "well": f"R{run}-{label}-{rep}",
                "type": kind,
                "sample": label,
                "conc": df.iat[i, 1] if kind == "standard" else None,
                "nominal": nominal.get(label),
                "od": float(str(v).rstrip("*")),
                "masked": int(masked),
            })
pd.DataFrame(rows).to_csv(out, index=False)
EOF
echo "a55a3143fb1227651a7b046aaac3d22c4fdaa7e01c1503da82a18b2fbfac3c10  $D/lasv_elisa_runs.csv" | shasum -a 256 -c -
