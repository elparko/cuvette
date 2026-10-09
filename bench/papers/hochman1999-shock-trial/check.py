import sys

import numpy as np
import pandas as pd
from lifelines import CoxPHFitter
from lifelines.statistics import logrank_test
from scipy import stats

Z = 1.959964
d = pd.read_csv(sys.argv[1])
e = d[d.arm == "early_revascularization"]
m = d[d.arm == "medical_stabilization"]
print("patients", len(e), len(m))
x1, n1, x0, n0 = e.died_30d.sum(), len(e), m.died_30d.sum(), len(m)
p1, p0 = x1 / n1, x0 / n0
se = np.sqrt(p1 * (1 - p1) / n1 + p0 * (1 - p0) / n0)
print(f"30-day mortality {p1:.4f} {p0:.4f} difference {p1 - p0:.4f} Wald CI {p1 - p0 - Z * se:.4f} {p1 - p0 + Z * se:.4f}")
print(f"chi-square p {stats.chi2_contingency([[x1, n1 - x1], [x0, n0 - x0]], correction=False)[1]:.4f}")

s = d.dropna(subset=["time_days", "death"]).assign(a=lambda t: (t.arm == "early_revascularization").astype(int))
c = CoxPHFitter().fit(s[["time_days", "death", "a"]], "time_days", "death")
r = c.summary.loc["a"]
print(f"hazard ratio {np.exp(r['coef']):.4f} CI {np.exp(r['coef lower 95%']):.4f} {np.exp(r['coef upper 95%']):.4f}")
a, b = s[s.a == 1], s[s.a == 0]
print(f"log-rank p {logrank_test(a.time_days, b.time_days, a.death, b.death).p_value:.5f}")


def km(t, ev):
    times = np.unique(t[ev == 1])
    out, sv, g = [], 1.0, 0.0
    for u in times:
        n = np.sum(t >= u)
        k = np.sum((t == u) & (ev == 1))
        sv *= 1 - k / n
        g += k / (n * (n - k)) if n > k else 0
        out.append((u, sv, g, n, k))
    return out


def at(curve, x):
    sv, g = 1.0, 0.0
    for u, su, gu, n, k in curve:
        if u <= x:
            sv, g = su, gu
    return sv, sv * np.sqrt(g)


ca, cb = km(a.time_days.to_numpy(), a.death.to_numpy()), km(b.time_days.to_numpy(), b.death.to_numpy())
sa, ea = at(ca, 365)
sb, eb = at(cb, 365)
dd, sd = sa - sb, np.sqrt(ea**2 + eb**2)
print(f"1-year survival {sa:.4f} {sb:.4f} difference {dd:.4f} CI {dd - Z * sd:.4f} {dd + Z * sd:.4f}")


def rmst(curve, tau):
    pts = [(0.0, 1.0)] + [(u, sv) for u, sv, g, n, k in curve if u <= tau]
    return sum(sv * ((pts[i + 1][0] if i + 1 < len(pts) else tau) - u) for i, (u, sv) in enumerate(pts))


print(f"RMST to 1825 days {rmst(ca, 1825):.3f} {rmst(cb, 1825):.3f} difference {rmst(ca, 1825) - rmst(cb, 1825):.3f}")
