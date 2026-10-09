import sys

import pandas as pd

src, dst = sys.argv[1], sys.argv[2]
parts = []
for sheet in pd.ExcelFile(src).sheet_names:
    d = pd.read_excel(src, sheet_name=sheet)
    d = d[d.iloc[:, 2].notna()].copy()
    marker = sheet.split(" consolidated")[0]
    d.columns = ["case_id", "pct_0", "pct_1", "pct_2", "pct_3", "pathologist_h", "transcript", "h_halo", "h_qupath", "atm", "pix_h_vis", "pix_h_halo"]
    d.insert(0, "marker", marker)
    parts.append(d)
out = pd.concat(parts, ignore_index=True)
out["case_id"] = out["case_id"].astype(str)
out.to_csv(dst, index=False)
print(out.groupby("marker").size())
