# Independent check with SciPy (not drc): three-parameter log-logistic (lower limit 0) for each antibody or variant,
# with the no-antibody wells at dose 0, and a four-parameter fit for the 30-B8 cytotoxicity data.
# Run: uv run --no-project --with numpy==2.3.3 --with scipy==1.16.2 --with pandas==2.3.3 python -I -W ignore check.py > check.out
import os

import numpy as np
import pandas as pd
from scipy.optimize import least_squares

data = os.environ.get("GA_DATA", "/Volumes/T7/guided-analysis/data") + "/desveaux2026-pcrv-ic50"


def ll(p, x, four):
    b, d, e = p[0], p[1], p[2]
    c = p[3] if four else 0.0
    with np.errstate(divide="ignore"):
        return c + (d - c) / (1 + np.exp(b * (np.log(x) - np.log(e))))


def fit(g, four=False):
    x, y = g.conc_ug_ml.to_numpy(float), g.norm.to_numpy(float)
    best = None
    for e0 in np.geomspace(0.001, 100, 21):
        p0 = [1.0, 1.0, e0] + ([0.1] if four else [])
        r = least_squares(lambda p: y - ll(p, x, four), p0, xtol=1e-15, ftol=1e-15, gtol=1e-15, method="lm", max_nfev=20000)
        if best is None or r.cost < best.cost:
            best = r
    return best.x


for name, col in [("injection", "antibody"), ("cytotox", "antibody"), ("variants_30b8", "variant")]:
    d = pd.read_csv(f"{data}/pcrv_{name}.csv")
    for g, sub in d.groupby(col, sort=False):
        p = fit(sub)
        print(f"{name} {g}: LL.3 IC50 {p[2]:.6f} µg/mL ({1000 * p[2]:.3f} ng/mL), b {p[0]:.4f}, top {p[1]:.4f}, n {len(sub)}")
d = pd.read_csv(f"{data}/pcrv_cytotox.csv")
p = fit(d[d.antibody == "30-B8"], four=True)
print(f"cytotox 30-B8: LL.4 IC50 {p[2]:.6f} µg/mL ({1000 * p[2]:.3f} ng/mL), bottom {p[3]:.4f}")
