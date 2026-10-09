import csv
import sys

import numpy as np
from scipy import stats


def load(path):
    with open(path) as f:
        r = list(csv.DictReader(f))
    return [np.array([float(x[k]) for x in r]) for k in ("beta_exposure", "se_exposure", "beta_outcome", "se_outcome")]


def ivw(bx, bxse, by, byse):
    w = bx**2 / byse**2
    est = np.sum(bx * by / byse**2) / np.sum(w)
    ratio = by / bx
    q = np.sum(w * (ratio - est) ** 2)
    n = len(bx)
    rse = np.sqrt(q / (n - 1))
    se = np.sqrt(1 / np.sum(w)) * max(1.0, rse)
    i2 = max(0.0, 100 * (q - (n - 1)) / q)
    f = np.mean(bx**2 / bxse**2)
    return est, se, q, rse, i2, f


def egger(bx, bxse, by, byse):
    sign = np.where(bx < 0, -1.0, 1.0)
    x = bx * sign
    y = by * sign
    w = 1 / byse**2
    X = np.column_stack([np.ones_like(x), x])
    W = np.diag(w)
    cov_unscaled = np.linalg.inv(X.T @ W @ X)
    beta = cov_unscaled @ X.T @ W @ y
    resid = y - X @ beta
    n = len(x)
    s2 = np.sum(w * resid**2) / (n - 2)
    se = np.sqrt(np.diag(cov_unscaled)) * max(1.0, np.sqrt(s2))
    return beta[1], se[1], beta[0], se[0], np.sum(w * resid**2), np.sqrt(s2)


def weighted_median(bx, bxse, by, byse):
    ratio = by / bx
    se = byse / np.abs(bx)
    w = 1 / se**2
    w = w / w.sum()
    order = np.argsort(ratio)
    r = ratio[order]
    ww = w[order]
    cum = np.cumsum(ww) - 0.5 * ww
    below = np.max(np.where(cum < 0.5)[0])
    return r[below] + (r[below + 1] - r[below]) * (0.5 - cum[below]) / (cum[below + 1] - cum[below])


def simple_median(bx, by):
    ratio = np.sort(by / bx)
    n = len(ratio)
    w = np.ones(n) / n
    cum = np.cumsum(w) - 0.5 * w
    below = np.max(np.where(cum < 0.5)[0])
    return ratio[below] + (ratio[below + 1] - ratio[below]) * (0.5 - cum[below]) / (cum[below + 1] - cum[below])


bx, bxse, by, byse = load(sys.argv[1])
est, se, q, rse, i2, f = ivw(bx, bxse, by, byse)
n = len(bx)
print(f"variants {n}")
print(f"ivw estimate {est:.4f} se {se:.4f} p {2 * stats.norm.sf(abs(est / se)):.3g}")
print(f"cochran q {q:.4f} df {n - 1} p {stats.chi2.sf(q, n - 1):.3g} i2 {i2:.1f} rse {rse:.4f}")
print(f"f statistic {f:.1f}")
e, es, ic, ics, qe, rsee = egger(bx, bxse, by, byse)
print(f"egger estimate {e:.4f} se {es:.4f} intercept {ic:.4f} se {ics:.4f} q {qe:.4f} rse {rsee:.4f}")
print(f"weighted median point estimate {weighted_median(bx, bxse, by, byse):.4f}")
print(f"simple median point estimate {simple_median(bx, by):.4f}")
worst = max(range(n), key=lambda i: (by[i] / bx[i] - est) ** 2 * bx[i] ** 2 / byse[i] ** 2)
keep = [i for i in range(n) if i != worst]
est2 = ivw(bx[keep], bxse[keep], by[keep], byse[keep])[0]
qmax = (by[worst] / bx[worst] - est) ** 2 * bx[worst] ** 2 / byse[worst] ** 2
print(f"largest q contribution variant index {worst + 1}, q {qmax:.4f}; ivw without it {est2:.4f}")
