# Independent check of the dose-response and Michaelis-Menten values with SciPy (not drc).
# Run: uv run --no-project --with numpy==2.3.3 --with scipy==1.16.2 --with pandas==2.3.3 python -I -W ignore checks/check_dose_kinetics.py data > checks/check_dose_kinetics.out
import sys

import numpy as np
import pandas as pd
from scipy.optimize import least_squares
from scipy.stats import t

folder = sys.argv[1]


def fit(fun, p0, x, y):
    r = least_squares(lambda p: y - fun(p, x), p0, xtol=1e-15, ftol=1e-15, gtol=1e-15, method="lm", max_nfev=100000)
    n, k = len(y), len(p0)
    s2 = 2 * r.cost / (n - k)
    cov = s2 * np.linalg.inv(r.jac.T @ r.jac)
    return r.x, np.sqrt(np.diag(cov)), n - k, 2 * r.cost


def ll4(p, x):
    b, c, d, e = p
    with np.errstate(divide="ignore"):
        return c + (d - c) / (1 + np.exp(b * (np.log(x) - np.log(e))))


rg = pd.read_csv(f"{folder}/ryegrass.csv")
p, se, df, rss = fit(ll4, [2, 0.5, 7.8, 3], rg.conc.to_numpy(float), rg.rootl.to_numpy(float))
q = t.ppf(0.975, df)
print("ryegrass 4PL: b %.6f c %.6f d %.6f e %.6f" % tuple(p))
print("ryegrass SE:  b %.6f c %.6f d %.6f e %.6f; residual SE %.6f on %d df" % (*se, np.sqrt(rss / df), df))
print("ryegrass ED50 delta CI %.5f to %.5f" % (p[3] - q * se[3], p[3] + q * se[3]))
print("ryegrass ED50 log-scale CI %.5f to %.5f" % (np.exp(np.log(p[3]) - q * se[3] / p[3]), np.exp(np.log(p[3]) + q * se[3] / p[3])))


sa = pd.read_csv(f"{folder}/s_alba.csv")
rss_sep, k_sep, starts = 0.0, 0, {}
for h, g in sa.groupby("Herbicide"):
    p, se, df, rss = fit(ll4, [2, 0.5, 4, 20], g.Dose.to_numpy(float), g.DryMatter.to_numpy(float))
    rss_sep += rss
    k_sep += 4
    starts[h] = p
    print(f"S.alba {h}: b {p[0]:.5f} c {p[1]:.5f} d {p[2]:.5f} e {p[3]:.5f}")
hs = sorted(starts)
x, y = sa.Dose.to_numpy(float), sa.DryMatter.to_numpy(float)
gi = (sa.Herbicide == hs[1]).to_numpy()


def shared(q):
    b = np.where(gi, q[3], q[0]); c = np.where(gi, q[4], q[1]); d = np.where(gi, q[5], q[2])
    with np.errstate(divide="ignore"):
        return c + (d - c) / (1 + np.exp(b * (np.log(x) - np.log(q[6]))))


q0 = [*starts[hs[0]][:3], *starts[hs[1]][:3], np.sqrt(starts[hs[0]][3] * starts[hs[1]][3])]
r = least_squares(lambda q: y - shared(q), q0, xtol=1e-15, ftol=1e-15, gtol=1e-15, method="lm", max_nfev=100000)
rss_red = 2 * r.cost
df2 = len(y) - k_sep
F = (rss_red - rss_sep) / (k_sep - 7) / (rss_sep / df2)
from scipy.stats import f as fdist
print(f"S.alba shared ED50: RSS separate {rss_sep:.4f}, shared {rss_red:.4f}, F {F:.4f} on {k_sep - 7} and {df2} df, p {fdist.sf(F, k_sep - 7, df2):.3e}")


def mm(p, x):
    return p[0] * x / (p[1] + x)


pu = pd.read_csv(f"{folder}/puromycin.csv")
for state in ["treated", "untreated"]:
    s = pu[pu.state == state]
    p, se, df, rss = fit(mm, [200, 0.05], s.conc.to_numpy(float), s.rate.to_numpy(float))
    q = t.ppf(0.975, df)
    print(f"Puromycin {state}: Vmax {p[0]:.4f} (SE {se[0]:.4f}, CI {p[0] - q * se[0]:.4f} to {p[0] + q * se[0]:.4f}), Km {p[1]:.6f} (SE {se[1]:.6f}, CI {p[1] - q * se[1]:.6f} to {p[1] + q * se[1]:.6f}), n {len(s)}")

inh = pd.read_csv(f"{folder}/competitive_synthetic.csv")
S, I, v = inh.substrate.to_numpy(float), inh.inhibitor.to_numpy(float), inh.rate.to_numpy(float)
models = {
    "competitive": (lambda p: p[0] * S / (p[1] * (1 + I / p[2]) + S), [100, 2, 0.5]),
    "noncompetitive": (lambda p: p[0] * S / ((p[1] + S) * (1 + I / p[2])), [100, 2, 0.5]),
    "uncompetitive": (lambda p: p[0] * S / (p[1] + S * (1 + I / p[2])), [100, 2, 0.5]),
    "mixed": (lambda p: p[0] * S / (p[1] * (1 + I / p[2]) + S * (1 + I / (p[3] * p[2]))), [100, 2, 0.5, 1]),
}
for name, (fun, p0) in models.items():
    r = least_squares(lambda p: v - fun(p), p0, xtol=1e-15, ftol=1e-15, gtol=1e-15, method="lm", max_nfev=100000)
    n, k = len(v), len(p0)
    rss = 2 * r.cost
    se = np.sqrt(np.diag(rss / (n - k) * np.linalg.inv(r.jac.T @ r.jac)))
    aicc = n * np.log(rss / n) + 2 * (k + 1) + 2 * (k + 1) * (k + 2) / (n - k - 2)
    print(f"{name}: " + ", ".join(f"{a} {b:.6f} (SE {c:.6f})" for a, b, c in zip(["Vmax", "Km", "Ki", "alpha"], r.x, se)) + f"; RSS {rss:.6f}, AICc {aicc:.4f}")
