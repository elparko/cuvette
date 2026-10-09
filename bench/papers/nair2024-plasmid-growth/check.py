# Independent check with SciPy (not growthcurver).
# 1. A logistic fit K / (1 + ((K - N0) / N0) exp(-r t)) of each well after the subtraction of the well minimum,
#    the growthcurver model with bg_correct = "min". Compared with the published r of each well (Figure_1_2.xlsx).
# 2. From the published per-well rel_r of the sheet STR-R: the mean for each plasmid, the 95% t interval,
#    the two-sided one-sample t test against 1, and the mean of the plasmid means.
# Run: uv run --no-project --with numpy==2.3.3 --with scipy==1.16.2 --with pandas==2.3.3 --with openpyxl==3.1.5 python -I -W ignore check.py > check.out
import os

import numpy as np
import pandas as pd
from scipy import stats
from scipy.optimize import curve_fit

data = os.environ.get("GA_DATA", "/Volumes/T7/guided-analysis/data") + "/nair2024-plasmid-growth"
ref = os.environ.get("GA_REFERENCE", "/Volumes/T7/guided-analysis/reference") + "/nair2024-plasmid-growth"
od = pd.read_csv(f"{data}/strr_od.csv")
design = pd.read_csv(f"{data}/strr_design.csv")
pub = pd.read_excel(f"{ref}/Figure_1_2.xlsx", sheet_name="STR-R")


def logistic(t, k, n0, r):
    return k / (1 + ((k - n0) / n0) * np.exp(-r * t))


fit = {}
for w in design.well:
    ok = od[w].notna()
    t, y = od.time[ok].to_numpy(float), od[w][ok].to_numpy(float)
    y = y - y.min()
    p, _ = curve_fit(logistic, t, y, p0=[y.max(), max(y[y > 0].min(), 1e-3), 0.5], bounds=([0, 1e-9, 0], [10, 10, 10]), maxfev=200000, ftol=1e-14, xtol=1e-14, gtol=1e-14)
    fit[w] = p[2]
design["r_scipy"] = design.well.map(fit)

match = []
for _, row in pub.iterrows():
    cand = design[(design.plasmid == row["Plasmid.ID"])]
    j = (cand.r_scipy - row.r).abs().idxmin()
    match.append((design.well[j], design.block[j], abs(design.r_scipy[j] - row.r)))
pub["well"] = [m[0] for m in match]
pub["block"] = [m[1] for m in match]
print(f"published wells: {len(pub)}; largest difference SciPy r against published r: {max(m[2] for m in match):.2e}")
print("wells not in the published file:", ", ".join(sorted(set(design.well) - set(pub.well))))
print("host well r of block 1 (published):", round(pub.r[pub.well == "W01"].iloc[0], 6))

rows = []
for pl, g in pub[pub["Plasmid.ID"] != "Host"].groupby("Plasmid.ID", sort=False):
    v = g.rel_r.to_numpy(float)
    m, se = v.mean(), v.std(ddof=1) / np.sqrt(len(v))
    q = stats.t.ppf(0.975, len(v) - 1)
    rows.append((pl, len(v), m, m - q * se, m + q * se, stats.ttest_1samp(v, 1).pvalue))
t = pd.DataFrame(rows, columns=["plasmid", "n", "mean_rel_r", "ci_low", "ci_high", "p_vs_1"])
print(t.round(6).to_string(index=False))
print(f"mean of the plasmid means: {t.mean_rel_r.mean():.6f}; mean of all plasmid wells: {pub.rel_r[pub['Plasmid.ID'] != 'Host'].mean():.6f}")
