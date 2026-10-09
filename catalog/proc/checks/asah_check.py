import csv
import sys

import numpy as np
from scipy import stats

here = sys.argv[1]
rows = list(csv.DictReader(open(f"{here}/data/asah.csv")))
y = np.array([r["outcome"] == "Poor" for r in rows])
print("patients", len(rows), "Poor", int(y.sum()), "Good", int((~y).sum()))


def placements(x):
    cases, controls = x[y], x[~y]
    psi = (cases[:, None] > controls[None, :]) + 0.5 * (cases[:, None] == controls[None, :])
    return psi.mean(), psi.mean(axis=1), psi.mean(axis=0)


def delong(x):
    auc, v10, v01 = placements(x)
    var = v10.var(ddof=1) / len(v10) + v01.var(ddof=1) / len(v01)
    return auc, var, v10, v01


x = {k: np.array([float(r[k]) for r in rows]) for k in ("s100b", "wfns", "ndka")}
z = stats.norm.ppf(0.975)
for k in x:
    auc, var, _, _ = delong(x[k])
    print("%s AUC %.4f DeLong 95%% CI %.4f to %.4f" % (k, auc, auc - z * np.sqrt(var), auc + z * np.sqrt(var)))

a1, _, v10a, v01a = delong(x["s100b"])
a2, _, v10b, v01b = delong(x["wfns"])
s10 = np.cov(np.vstack([v10a, v10b]))
s01 = np.cov(np.vstack([v01a, v01b]))
s = s10 / len(v10a) + s01 / len(v01a)
var = s[0, 0] + s[1, 1] - 2 * s[0, 1]
zstat = (a1 - a2) / np.sqrt(var)
print("paired DeLong s100b against wfns: difference %.4f Z %.4f p %.5f CI %.4f to %.4f" % (a1 - a2, zstat, 2 * stats.norm.sf(abs(zstat)), a1 - a2 - z * np.sqrt(var), a1 - a2 + z * np.sqrt(var)))

for name, thr in (("s100b", 0.205), ("wfns", 3.5), ("wfns", 2.5)):
    pos = x[name] >= thr
    tp, fn, fp, tn = int((pos & y).sum()), int((~pos & y).sum()), int((pos & ~y).sum()), int((~pos & ~y).sum())
    sens, spec = tp / (tp + fn), tn / (tn + fp)
    ci_s = stats.binomtest(tp, tp + fn).proportion_ci(method="exact")
    ci_p = stats.binomtest(tn, tn + fp).proportion_ci(method="exact")
    youden = sens + spec - 1
    dist = (1 - sens) ** 2 + (1 - spec) ** 2
    print("%s >= %g: TP %d FP %d TN %d FN %d sensitivity %.4f (%.4f to %.4f) specificity %.4f (%.4f to %.4f) PPV %.4f NPV %.4f Youden %.4f topleft distance %.4f"
          % (name, thr, tp, fp, tn, fn, sens, ci_s.low, ci_s.high, spec, ci_p.low, ci_p.high, tp / (tp + fp), tn / (tn + fn), youden, dist))
    prev = 0.1
    print("  at prevalence 0.1: PPV %.4f NPV %.4f" % (sens * prev / (sens * prev + (1 - spec) * (1 - prev)), spec * (1 - prev) / (spec * (1 - prev) + (1 - sens) * prev)))

w = x["wfns"]
best = max(((t, ((w >= t) & y).sum() / y.sum() + ((w < t) & ~y).sum() / (~y).sum() - 1) for t in np.unique(w)[1:]), key=lambda v: v[1])
print("wfns threshold with the largest Youden index: a positive test is wfns >= %g (Youden %.4f)" % best)
