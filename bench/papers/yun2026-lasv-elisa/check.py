# Independent check with SciPy (not drc): a 4PL for each run on the mean OD of the duplicate standards, no blank
# subtraction, then the mean OD of each sample back-calculated. The masked wells are left out.
# It also compares each back-calculated value with the Gen5 concentration in the workbook (reference folder).
# Run: uv run --no-project --with numpy==2.3.3 --with scipy==1.16.2 --with pandas==2.3.3 --with openpyxl==3.1.5 python -I -W ignore check.py > check.out
import os

import numpy as np
import pandas as pd
from scipy.optimize import least_squares

data = os.environ.get("GA_DATA", "/Volumes/T7/guided-analysis/data")
ref = os.environ.get("GA_REFERENCE", "/Volumes/T7/guided-analysis/reference")
d = pd.read_csv(f"{data}/yun2026-lasv-elisa/lasv_elisa_runs.csv")
d = d[d.masked == 0]


def f4(p, x):
    b, c, dd, e = p
    return c + (dd - c) / (1 + np.exp(b * (np.log(x) - np.log(e))))


def inv(p, y):
    b, c, dd, e = p
    with np.errstate(invalid="ignore", divide="ignore"):
        r = (dd - c) / (y - c)
        out = e * (r - 1) ** (1 / b)
    return np.where((r > 1) & np.isfinite(out), out, np.nan)


rows = []
for run, g in d.groupby("run"):
    st = g[g.type == "standard"].groupby("conc").od.mean()
    x, y = st.index.to_numpy(float), st.to_numpy(float)
    r = least_squares(lambda p: y - f4(p, x), [-1, y.min(), y.max(), np.median(x)], xtol=1e-15, ftol=1e-15, gtol=1e-15, method="lm", max_nfev=100000)
    sm = g[g.type.isin(["sample", "control"])].groupby("sample").agg(od=("od", "mean"), nominal=("nominal", "first"))
    sm["conc"] = inv(r.x, sm.od.to_numpy(float))
    sm["run"] = run
    rows.append(sm.reset_index())
    print(f"run {run}: b {r.x[0]:.5f} c {r.x[1]:.5f} d {r.x[2]:.5f} e {r.x[3]:.5f}")
a = pd.concat(rows)


def cv(v):
    v = v.dropna()
    return 100 * v.std() / v.mean()


t = a.groupby("sample").agg(mean_od=("od", "mean"), cv_od=("od", cv), mean_conc=("conc", "mean"), cv_conc=("conc", cv), n_conc=("conc", "count"), nominal=("nominal", "first"))
t["recovery"] = 100 * t.mean_conc / t.nominal
t["in_range"] = (abs(t.recovery - 100) <= 25) & (t.cv_conc < 25) & (t.cv_od < 25)
order = [f"STD*-{k}" for k in range(1, 11)] + ["HPC", "LPC", "NEG"]
print(t.loc[order].round(4).to_string())
ok = t.loc[[f"STD*-{k}" for k in range(1, 11)]]
ok = ok[ok.in_range]
print(f"range from the dilution series: LLOQ {ok.nominal.min()} ULOQ {ok.nominal.max()}")

wb = pd.read_excel(f"{ref}/yun2026-lasv-elisa/S1_Data.xlsx", sheet_name="Table 1 dynamic range", header=None)
gen5 = []
for j, v in enumerate(wb.iloc[0]):
    if isinstance(v, str) and v.startswith("Run"):
        run = int(v.split()[1])
        k = j + 5
        for i in range(18, 28):
            if pd.notna(wb.iat[i, k]):
                gen5.append((run, wb.iat[i, 0].strip(), float(wb.iat[i, k])))
g5 = pd.DataFrame(gen5, columns=["run", "sample", "gen5"]).merge(a, on=["run", "sample"])
ratio = g5.conc / g5.gen5
print(f"SciPy over Gen5, {len(ratio)} values: median {ratio.median():.5f}, min {ratio.min():.5f}, max {ratio.max():.5f}")
