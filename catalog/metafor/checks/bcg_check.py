import csv
import sys

import numpy as np
import statsmodels.api as sm
from statsmodels.stats.meta_analysis import combine_effects

here = sys.argv[1]
rows = list(csv.DictReader(open(f"{here}/data/bcg.csv")))
a, b, c, d = (np.array([float(r[k]) for r in rows]) for k in ("tpos", "tneg", "cpos", "cneg"))
yi = np.log((a / (a + b)) / (c / (c + d)))
vi = 1 / a - 1 / (a + b) + 1 / c - 1 / (c + d)
print("studies", len(rows))
print("first trial log RR %.4f variance %.4f" % (yi[0], vi[0]))

dl = combine_effects(yi, vi, method_re="chi2")
fe, fse = dl.mean_effect_fe, dl.sd_eff_w_fe
print("fixed effect %.4f se %.4f ci %.4f to %.4f" % (fe, fse, fe - 1.959964 * fse, fe + 1.959964 * fse))
print("Q %.4f df %d" % (dl.q, len(rows) - 1))
print("DerSimonian-Laird tau2 %.4f estimate %.4f se %.4f" % (dl.tau2, dl.mean_effect_re, dl.sd_eff_w_re))
lo, hi = dl.mean_effect_re - 1.959964 * dl.sd_eff_w_re, dl.mean_effect_re + 1.959964 * dl.sd_eff_w_re
print("DerSimonian-Laird RR %.4f ci %.4f to %.4f" % (np.exp(dl.mean_effect_re), np.exp(lo), np.exp(hi)))
print("I2 from Q (DL) %.2f%%" % (100 * (dl.q - (len(rows) - 1)) / dl.q))

sei = np.sqrt(vi)
egger = sm.WLS(yi, sm.add_constant(sei), weights=1 / vi).fit()
print("classic Egger, weighted regression on the standard error: t %.4f df %d p %.4f" % (egger.tvalues[1], egger.df_resid, egger.pvalues[1]))
