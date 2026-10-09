#!/usr/bin/env bash
set -euo pipefail
D="${CUVETTE_DATA:-${GA_DATA:-/Volumes/T7/guided-analysis/data}}/cooley2020-splitluc-zprime"
R="${CUVETTE_REFERENCE:-${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}}/cooley2020-splitluc-zprime"
mkdir -p "$D/raw" "$R"
cd "$D/raw"
get() { curl -fsSL -o "$1" "https://osf.io/download/$2/"; }
get plate01.csv 5mx39
get plate02.csv kmfzj
get plate03.csv 43sm8
get plate04.csv sjkve
get plate05.csv tuwhm
get plate06.csv zemhj
get plate07.csv 5bmg2
get plate08.csv 6bpag
get plate09.csv wavfn
get plate10.xlsx emd6c
shasum -a 256 -c - <<'S'
c09a9b92f13382c37a6c817d30a6afc283effdf319bbbf02537003360a262c41  plate01.csv
f8c74fe959172fd19277f1c5e0b28607eb6f259472a63a13354572ed12a89dd3  plate02.csv
b7b32beb609bc41375579c0400ca857f7b17072ecc38fbf810369970186f75d1  plate03.csv
621ef6e735e84d790af299ac6544ff2aa46b16f5104bdf148ede2c26b31f16b6  plate04.csv
4f56fb5a897d440395eb6ae339d4ff3dc6af252cfca6f6cacd0d15cf3723d4ad  plate05.csv
f69cf299a6b221b71b4d94424fd25ecadd1edbdccbee8468000bc4d3316f70ed  plate06.csv
9222775296d9d1343777d8d565c69200e82a576f1a5f038dcd29eb2f3f744fa6  plate07.csv
0f48cc801c956304e1fb2b168a259b3c2f3ac6f87b5085210569fc231999fb90  plate08.csv
46ee528bfc23f2edc4f3c88de01b5801193c5a3c0324201294ea0c860b1ca2ba  plate09.csv
a8d471742e535657092e78addcd2fb4bc0782753640f2aa8bba8446cb5dde291  plate10.xlsx
S
# The summary table of the authors (means, SDs and Z' of each plate) is the published result. It goes to the reference folder.
curl -fsSL -o "$R/All plates analysis.csv" "https://osf.io/download/$(curl -fsSL 'https://api.osf.io/v2/registrations/mgkqv/files/osfstorage/5e2f27a8e71ef8000c188cf2/?page%5Bsize%5D=100' | python3 -I -c 'import json,sys; print(next(f["links"]["download"].rstrip("/").split("/")[-1] for f in json.load(sys.stdin)["data"] if f["attributes"]["name"] == "All plates analysis.csv"))')/"

# Preprocessing: the first read (cycle 1) of each 384-well plate to one row for each well.
# The rows labelled 20µL, DM 20µL, 10µL and DM 10µL hold the positive (SmKRAS/LgRBD) and negative (DM) wells in columns
# 3 to 7. In plate 1 the DM 20µL values are on the row below the label. Only the first grid of cycle 1 is read (plate 7
# also has a grid of averages). Column 8 of each row is a sixth well with a low signal; it is labelled "blank".
uv run -q --no-project --with pandas==2.3.3 --with openpyxl==3.1.5 python -I - "$D" <<'EOF'
import sys
import pandas as pd

d = sys.argv[1]
labels = {"20µL": "pos_20ul", "DM 20µL": "neg_20ul", "10µL": "pos_10ul", "DM 10µL": "neg_10ul"}
rows = []
for n in range(1, 11):
    f = f"{d}/raw/plate{n:02d}." + ("xlsx" if n == 10 else "csv")
    df = pd.read_excel(f, header=None) if n == 10 else pd.read_csv(f, header=None, encoding="utf-8-sig", names=range(26), dtype=str)
    first = df.index[df[0].astype(str).str.startswith("Cycle 1")][0]
    top = next(i for i in df.index if i > first and str(df.at[i, 0]).strip() == "A")
    current = None
    for i in range(top, top + 16):
        row = str(df.at[i, 0]).strip()
        label = str(df.at[i, 2]).strip()
        if label in labels:
            current = labels[label]
        vals = [(col, pd.to_numeric(df.at[i, col], errors="coerce")) for col in range(3, 9)]
        vals = [(col, v) for col, v in vals if not pd.isna(v)]
        if not vals or current is None:
            continue
        for col, v in vals:
            rows.append({"plate": n, "well": f"P{n}-{row}{col}", "type": current if col < 8 else "blank", "volume_ul": int(current.split("_")[1][:2]), "signal": float(v)})
        current = None
pd.DataFrame(rows).to_csv(f"{d}/splitluc_plates.csv", index=False)
EOF
cd "$D"
echo "488aa9574df87021cbd50740b03a11ad9681302795673cb1a1f6b7a4aee69b65  splitluc_plates.csv" | shasum -a 256 -c -
