# Independent check with SciPy (not drc) of the nine-run Lassa ELISA test (data/lasv_elisa_runs.csv).
# 4PL for each run on the mean OD of the standards, no blank subtraction, masked wells left out.
# LOD of a run: the mean of the four blank wells plus 3 standard deviations, back-calculated on the curve of the run.
# Run: uv run --no-project --with numpy==2.3.3 --with scipy==1.16.2 --with pandas==2.3.3 python -I -W ignore checks/check_elisa_lasv.py data/lasv_elisa_runs.csv > checks/check_elisa_lasv.out
import sys

import numpy as np
import pandas as pd
from scipy.optimize import least_squares

d = pd.read_csv(sys.argv[1])
d = d[d.masked == 0]


def f4(p, x):
    b, c, dd, e = p
    return c + (dd - c) / (1 + np.exp(b * (np.log(x) - np.log(e))))


def inv(p, y):
    b, c, dd, e = p
    with np.errstate(invalid="ignore", divide="ignore"):
        r = (dd - c) / (np.asarray(y, float) - c)
        out = e * (r - 1) ** (1 / b)
    return np.where((r > 1) & np.isfinite(out), out, np.nan)


rows = []
for run, g in d.groupby("run"):
    st = g[g.type == "standard"].groupby("conc").od.mean()
    x, y = st.index.to_numpy(float), st.to_numpy(float)
    r = least_squares(lambda p: y - f4(p, x), [-1, y.min(), y.max(), np.median(x)], xtol=1e-15, ftol=1e-15, gtol=1e-15, method="lm", max_nfev=100000)
    bl = g[g.type == "blank"].od
    lod = inv(r.x, bl.mean() + 3 * bl.std())
    print(f"run {run}: e {r.x[3]:.6f} blank mean {bl.mean():.6f} sd {bl.std():.6f} LOD {float(lod):.6f}")
    sm = g[g.type.isin(["sample", "control"])].groupby("sample").agg(od=("od", "mean"), nominal=("nominal", "first"))
    sm["conc"] = inv(r.x, sm.od)
    rows.append(sm.reset_index())
a = pd.concat(rows)
t = a.groupby("sample").agg(mean_conc=("conc", "mean"), sd=("conc", "std"), nominal=("nominal", "first"))
t["cv_conc"] = 100 * t.sd / t.mean_conc
t["recovery"] = 100 * t.mean_conc / t.nominal
print(t.round(6).to_string())
