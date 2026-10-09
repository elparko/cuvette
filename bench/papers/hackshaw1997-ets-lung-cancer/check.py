import csv
import os

import numpy as np
from statsmodels.stats.meta_analysis import combine_effects

d = os.environ.get("GA_DATA", "/Volumes/T7/guided-analysis/data")
rows = list(csv.DictReader(open(os.path.join(d, "hackshaw1997-ets-lung-cancer", "ets_lung_cancer.csv"))))
yi = np.array([float(r["yi"]) for r in rows])
vi = np.array([float(r["vi"]) for r in rows])
print("studies", len(rows), "cases", sum(int(r["cases"]) for r in rows))
z = 1.959964
for name, kind in [("DerSimonian-Laird", "chi2"), ("Paule-Mandel", "iterated")]:
    m = combine_effects(yi, vi, method_re=kind)
    est, se = m.mean_effect_re, m.sd_eff_w_re
    print("%s random effects: OR %.4f, 95%% CI %.4f to %.4f, tau2 %.4f" % (name, np.exp(est), np.exp(est - z * se), np.exp(est + z * se), m.tau2))
m = combine_effects(yi, vi, method_re="chi2")
fe, fse = m.mean_effect_fe, m.sd_eff_w_fe
print("fixed effect (wrong model for the paper): OR %.4f, 95%% CI %.4f to %.4f" % (np.exp(fe), np.exp(fe - z * fse), np.exp(fe + z * fse)))
print("Q %.4f on %d df, I2 %.2f%%" % (m.q, len(rows) - 1, 100 * max(0, m.q - (len(rows) - 1)) / m.q))
