#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/li2014-mageck-melanoma"
mkdir -p "$D"
cd "$D"
# Additional file 4 of Li et al. 2014, Genome Biology 15:554: raw sgRNA read counts of the leukemia, melanoma and ESC screens.
curl -fsSL -o moesm4.xlsx "https://static-content.springer.com/esm/art%3A10.1186%2Fs13059-014-0554-4/MediaObjects/13059_2014_554_MOESM4_ESM.xlsx"
echo "ce92ee9969057686118500e7b532531c21ce057423a3ecd8c49ba584d8262de6  moesm4.xlsx" | shasum -a 256 -c -

# Preprocessing: the sheet "melanoma dataset" to a tab-separated count table.
# Excel changed 118 gene symbols (SEPT and MARCH families) to dates. The sgRNA name starts with the symbol, so the script restores it.
# Run with Python that has openpyxl, for example: uv run --with openpyxl==3.1.5 python -I - "$D"
uv run -q --no-project --with openpyxl==3.1.5 python -I - "$D" <<'EOF'
import csv
import datetime
import sys

import openpyxl

d = sys.argv[1]
wb = openpyxl.load_workbook(f"{d}/moesm4.xlsx", read_only=True)
ws = wb["melanoma dataset"]
fixed = 0
with open(f"{d}/melanoma_counts.txt", "w", newline="") as f:
    w = csv.writer(f, delimiter="\t", lineterminator="\n")
    for r in ws.iter_rows(values_only=True):
        r = list(r)
        if isinstance(r[1], (datetime.datetime, datetime.date)):
            r[1] = str(r[0]).split("_")[0]
            fixed += 1
        w.writerow(r)
print("melanoma_counts.txt written,", fixed, "gene symbols restored")
EOF
echo "7a8a01e00c5dc685a6f6d6bcc68fd0e27c75f22bc1b3cfe4f41c895bc529a596  melanoma_counts.txt" | shasum -a 256 -c -
