# Independent check of the DNase standard curve values with SciPy (not drc).
# Run: uv run --no-project --with numpy==2.3.3 --with scipy==1.16.2 --with pandas==2.3.3 python -I checks/check_elisa_dnase.py data/dnase_elisa.csv
import sys

import numpy as np
import pandas as pd
from scipy.optimize import least_squares

d = pd.read_csv(sys.argv[1])
st = d[d.type == "standard"]
x, y = st.conc.to_numpy(float), st.signal.to_numpy(float)


def f5(p, x):
    b, c, dd, e, ff = p
    return c + (dd - c) / (1 + np.exp(b * (np.log(x) - np.log(e)))) ** ff


def inv(p, yv):
    b, c, dd, e, ff = p
    r = (dd - c) / (yv - c)
    with np.errstate(invalid="ignore"):
        return e * (r ** (1 / ff) - 1) ** (1 / b)


def fit(start, five, w):
    def res(q):
        p = q if five else np.append(q, 1.0)
        return (y - f5(p, x)) / w

    best = None
    for s in start:
        r = least_squares(res, s, xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=200000, method="lm")
        if best is None or r.cost < best.cost:
            best = r
    p = best.x if five else np.append(best.x, 1.0)
    return p, 2 * best.cost


ones = np.ones_like(y)
p4, ss4 = fit([[-1, 0, 2.4, 4.5], [-0.5, 0.1, 3, 10]], False, ones)
p5, ss5 = fit([[-1, 0, 2.4, 4.5, 1], [-1.2, -0.02, 2.2, 6, 0.7]], True, ones)
p5s, ss5s = fit([[0.94, 2.38, -0.008, 4.5, 1], [1.1, 2.6, 0.0, 3, 0.8]], True, ones)
p4w, ss4w = fit([[-0.8, -0.03, 2.9, 7], [-1, 0, 2.4, 4.5]], False, y)

for name, p in [("4PL", p4), ("5PL", p5), ("5PL-softmax", p5s), ("4PL 1/y^2", p4w)]:
    mid = inv(p, (p[1] + p[2]) / 2)
    print(f"{name:12s} b {p[0]:.6f} c {p[1]:.6f} d {p[2]:.6f} e {p[3]:.6f} f {p[4]:.6f} ec50 {mid:.6f}")
print(f"4PL residual SE {np.sqrt(ss4 / (len(y) - 4)):.6f}  R2 {1 - ss4 / np.sum((y - y.mean()) ** 2):.6f}")

sm = d[d.type == "sample"].copy()
sm["well_conc"] = inv(p4, sm.signal.to_numpy(float))
sm["conc"] = sm.well_conc * sm.dilution
g = sm.groupby("sample").conc.agg(["mean", "std"])
g["cv_pct"] = 100 * g["std"] / g["mean"]
print("4PL samples, concentration x dilution 10:")
print(g.round(6).to_string())

st = st.copy()
st["back"] = inv(p4, y)
lev = st[st.conc > 0].groupby("conc").back.agg(["mean", "std"])
lev["recovery_pct"] = 100 * lev["mean"] / lev.index
lev["cv_pct"] = 100 * lev["std"] / lev["mean"]
lev["in_range"] = (abs(lev.recovery_pct - 100) <= 20) & (lev.cv_pct <= 20)
print("4PL standards back-calculated:")
print(lev.round(4).to_string())
