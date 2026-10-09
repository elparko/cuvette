import csv
import os

import numpy as np
from scipy import stats

d = os.environ.get("GA_DATA", "/Volumes/T7/guided-analysis/data")
rows = list(csv.DictReader(open(os.path.join(d, "jang2016-hcc-biomarkers", "hcc_biomarkers.csv"))))
y = np.array([r["HCC_studyGr"] == "1" for r in rows])
print("patients", len(rows), "HCC", int(y.sum()), "cirrhosis", int((~y).sum()))
z = stats.norm.ppf(0.975)
for col, cut in (("AFP_ng_per_ml", 20), ("PIVKA_delete_range", 10), ("OPN", 100), ("DKK", 500)):
    x = np.array([float(r[col]) for r in rows])
    cases, controls = x[y], x[~y]
    psi = (cases[:, None] > controls[None, :]) + 0.5 * (cases[:, None] == controls[None, :])
    auc = psi.mean()
    var = psi.mean(axis=1).var(ddof=1) / len(cases) + psi.mean(axis=0).var(ddof=1) / len(controls)
    pos = x >= cut
    print("%-18s AUC %.4f DeLong 95%% CI %.4f to %.4f; at >= %g: sensitivity %.4f specificity %.4f"
          % (col, auc, auc - z * np.sqrt(var), auc + z * np.sqrt(var), cut, pos[y].mean(), (~pos[~y]).mean()))
b = np.array([float(r["AFP_20_ng"]) for r in rows])
psi = (b[y][:, None] > b[~y][None, :]) + 0.5 * (b[y][:, None] == b[~y][None, :])
print("AUC of the 0/1 column AFP_20_ng (wrong method): %.4f" % psi.mean())
