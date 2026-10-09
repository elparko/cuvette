#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/hildyard2021-embryo-refgenes"
R="${CUVETTE_REFERENCE:-${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}}/hildyard2021-embryo-refgenes"
mkdir -p "$D" "$R"
# All three workbooks go to the reference folder. The analysis workbook holds the published geNorm and NormFinder
# values, and the efficiency workbook holds the published slopes. The data folder gets only the Cq values as CSV.
curl -fsSL -o "$R/embryo_qpcr_raw_data.xlsx" "https://ndownloader.figshare.com/files/28355517"
curl -fsSL -o "$R/embryo_qpcr_refanalysis.xlsx" "https://ndownloader.figshare.com/files/28356900"
curl -fsSL -o "$R/embryo_qpcr_efficiencies.xlsx" "https://ndownloader.figshare.com/files/37394590"
shasum -a 256 -c - <<EOF
d67fab956008ca1de354f40c1ae2173b54f2a3789fdc8d5dc6ab4aee1c386245  $R/embryo_qpcr_raw_data.xlsx
b387eb4a0d80179a1bd1338ce26f9ee09c5cfed0aca0b65e7d7f499105d395b5  $R/embryo_qpcr_refanalysis.xlsx
cac5c558f78a23f5b9b6e07a0251a9da06c92fde248c595585c1571a45240770  $R/embryo_qpcr_efficiencies.xlsx
EOF

# Preprocessing.
# 1. Sheet "Mean Cq and RQ Refgenes" of the raw data workbook: the mean Cq of the technical duplicates of 44 samples
#    for 15 genes, after the between-plate correction of the authors. One row for each sample and gene.
#    tissue is E (whole embryo), H (head) or FL (forelimb); age is the day post coitum.
# 2. Sheet "Efficiency data" of the efficiency workbook: the ten-fold dilution series (molecules) with one Cq for each
#    gene and point. One row for each gene and point. Empty cells (no Cq) are left out. HTAT is HTATSF1.
uv run -q --no-project --with pandas==2.3.3 --with openpyxl==3.1.5 python -I - "$R" "$D" <<'PY'
import sys
import pandas as pd

ref, out = sys.argv[1], sys.argv[2]
m = pd.read_excel(f"{ref}/embryo_qpcr_raw_data.xlsx", sheet_name="Mean Cq and RQ Refgenes", header=None)
genes = [str(g) for g in m.iloc[0, 1:16]]
c = m.iloc[1:45, 0:16].copy()
c.columns = ["sample"] + genes
c["tissue"] = c["sample"].str.extract(r" ([A-Z]+)#")[0]
c["age"] = c["sample"].str.extract(r"^([\d.]+)dpc")[0].astype(float)
long = c.melt(id_vars=["sample", "tissue", "age"], var_name="gene", value_name="cq")
long["cq"] = long["cq"].astype(float).round(6)
long.to_csv(f"{out}/embryo_cq.csv", index=False)

e = pd.read_excel(f"{ref}/embryo_qpcr_efficiencies.xlsx", sheet_name="Efficiency data", header=None)
rows = []
for j in range(4, 18):
    g = {"HTAT": "HTATSF1", "Ap3d1": "AP3D1"}.get(str(e.iat[3, j]), str(e.iat[3, j]))
    for i in range(4, 12):
        v = e.iat[i, j]
        if pd.notna(v):
            rows.append({"gene": g, "molecules": int(e.iat[i, 2]), "cq": round(float(v), 6)})
pd.DataFrame(rows).to_csv(f"{out}/embryo_dilution.csv", index=False)
PY
shasum -a 256 -c - <<EOF
c7ed4ae5a963939a1830c92fbd1a977b9f4cd93041541c76558d2966eafa8fcd  $D/embryo_cq.csv
f28aa6f541ed604a92874cc4cbe42151b28ddab6afbfe3bfabd2e32f46a4a9a8  $D/embryo_dilution.csv
EOF
