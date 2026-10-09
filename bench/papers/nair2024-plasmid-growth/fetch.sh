#!/usr/bin/env bash
set -euo pipefail
D="${GA_DATA:-/Volumes/T7/guided-analysis/data}/nair2024-plasmid-growth"
R="${GA_REFERENCE:-/Volumes/T7/guided-analysis/reference}/nair2024-plasmid-growth"
mkdir -p "$D" "$R"
# Raw Bioscreen OD600 data. Figure_1_2.xlsx holds the published growth rates (the results), so it goes to the reference folder.
curl -fsSL -o "$D/Bioscreen_data.xlsx" https://ndownloader.figshare.com/files/45013072
curl -fsSL -o "$R/Figure_1_2.xlsx" https://ndownloader.figshare.com/files/45013075
echo "f00304e2186f6a9048b694d7634d5208f9f3468b3698f94a084cde26cc4e20f2  $D/Bioscreen_data.xlsx" | shasum -a 256 -c -
echo "9e57ac968bba726444bd6d8ae09df843e98d014203dddc57b655166c09a9d864  $R/Figure_1_2.xlsx" | shasum -a 256 -c -

# Preprocessing: the sheet STR-R (host DA49828, streptomycin resistant, with plasmids) to two CSV files.
# strr_od.csv: the column time (hours) and one column for each of the 84 wells, W01 to W84, in the order of the sheet.
# strr_design.csv: for each well the block, the host and the plasmid. A block starts at each plasmid-free host well
# (the topmost well of a plate column) and holds the plasmid wells below it.
uv run -q --no-project --with pandas==2.3.3 --with openpyxl==3.1.5 python -I - "$D/Bioscreen_data.xlsx" "$D" <<'EOF'
import sys
import pandas as pd

src, out = sys.argv[1], sys.argv[2]
df = pd.read_excel(src, sheet_name="STR-R", header=None)
hosts, plasmids = df.iloc[0, 2:], df.iloc[1, 2:]
wells = [f"W{i + 1:02d}" for i in range(len(hosts))]
od = df.iloc[2:, 2:].apply(pd.to_numeric, errors="coerce")
od.columns = wells
od.insert(0, "time", df.iloc[2:, 0].astype(float).values)
od.to_csv(f"{out}/strr_od.csv", index=False)
design = pd.DataFrame({"well": wells, "host": hosts.astype(str).values, "plasmid": plasmids.astype(str).values})
design.insert(1, "block", (design.plasmid == "Host").cumsum())
design.to_csv(f"{out}/strr_design.csv", index=False)
EOF
shasum -a 256 -c - <<S
5f9d34de8585a961460b42ae4a397fd98ca46c5ec3defef6055042fe0f201a60  $D/strr_od.csv
2d6e4ec9751370033a41049c25fdc46ad26f58f85184e429c800ee6893833fcb  $D/strr_design.csv
S
