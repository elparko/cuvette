#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/desveaux2026-pcrv-ic50"
mkdir -p "$D"
cd "$D"
curl -fsSL -o fig6-data1.xlsx "https://cdn.elifesciences.org/articles/105195/elife-105195-fig6-data1-v1.xlsx"
echo "239e598474b0652756becbca29b0d8748b57a1bc7ac563d909b301319db2e9e2  fig6-data1.xlsx" | shasum -a 256 -c -

# Preprocessing: Figure 6 source data to three CSV files with one row for each well.
# The sheets Medi3902, 30-B8 and P3D6 have a cytotoxicity block and an injection block. The no-antibody wells
# (concentration 0) of each block belong to the experiments of that antibody, so they get the antibody name.
# Fig_supp holds the injection assay of 30-B8 against the PcrV variants V1 to V5.
# norm is the value that the authors normalized: (raw - mean of non-infected wells) / (mean of no-IgG wells - mean of non-infected wells).
# The P3D6 injection block has an extra variant column in the data rows; the parser reads the cells by type, not by header.
uv run -q --no-project --with pandas==2.3.3 --with openpyxl==3.1.5 python -I - "$D" <<'EOF'
import sys
import pandas as pd

d = sys.argv[1]
xl = pd.ExcelFile(f"{d}/fig6-data1.xlsx")
blocks = {"cytotox": [], "injection": []}
for sheet, antibody in [("Medi3902", "MEDI3902"), ("30-B8", "30-B8"), ("P3D6", "P3D6")]:
    df = xl.parse(sheet, header=None)
    head = [str(v) for v in df.iloc[0]]
    for name, label in [("Cytotoxicity", "cytotox"), ("Injection", "injection")]:
        j0 = head.index(name)
        j1 = next((k for k in range(j0 + 1, len(head)) if head[k] in ("Cytotoxicity", "Injection")), len(head))
        for i in range(2, len(df)):
            cells = [v for v in df.iloc[i, j0:j1] if pd.notna(v)]
            if len(cells) < 5:
                continue
            text = [c for c in cells[1:] if isinstance(c, str)]
            nums = [float(c) for c in cells[1:] if not isinstance(c, str)]
            ab = text[-1]
            conc, raw, mean_no_igg, mean_noninf, norm = nums[-5:]
            blocks[label].append({"antibody": antibody, "control": int(ab == "No_Ab"), "experiment": int(cells[0]), "conc_ug_ml": conc,
                                  "raw": raw, "mean_no_igg": mean_no_igg, "mean_noninfected": mean_noninf, "norm": norm})
pd.DataFrame(blocks["injection"]).to_csv(f"{d}/pcrv_injection.csv", index=False)
pd.DataFrame(blocks["cytotox"]).to_csv(f"{d}/pcrv_cytotox.csv", index=False)

v = xl.parse("Fig_supp")
v = v.rename(columns={"Experiment": "experiment", "Variant": "variant", "Concentration": "conc_ug_ml", "Raw_injection": "raw",
                      "Mean_No_IgG": "mean_no_igg", "Mean_Non_infected": "mean_noninfected", "Norm_injection": "norm"})
v["control"] = (v.Ab == "No_Ab").astype(int)
v["antibody"] = "30-B8"
v[["antibody", "variant", "control", "experiment", "conc_ug_ml", "raw", "mean_no_igg", "mean_noninfected", "norm"]].to_csv(f"{d}/pcrv_variants_30b8.csv", index=False)
EOF
shasum -a 256 -c - <<S
25cf612593d2c5b5f7bd3748049d382414b4863e189d2feed21913dd750fae0e  pcrv_injection.csv
541dfcdb10f2b7b4c81dc6fe24df4cebcad06555eb2613dc85372837e2ec3ccd  pcrv_cytotox.csv
d3bf9bb3b6cd889c93bfc8c2f76bb89f6e0103b95339af267a6d254c1d896e7a  pcrv_variants_30b8.csv
S
