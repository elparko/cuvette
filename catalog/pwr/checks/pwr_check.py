import numpy as np
from scipy import stats
from statsmodels.stats.power import FTestAnovaPower, GofChisquarePower, NormalIndPower, TTestIndPower

t = TTestIndPower()
print("t two-sample d 0.5 power 0.8: n per group %.4f" % t.solve_power(effect_size=0.5, alpha=0.05, power=0.8))
print("t two-sample d 0.5 n 64: power %.7f" % t.power(effect_size=0.5, nobs1=64, alpha=0.05))
print("t two-sample d 0.2 power 0.8: n per group %.4f" % t.solve_power(effect_size=0.2, alpha=0.05, power=0.8))

z = stats.norm.ppf
n_r = ((z(0.975) + z(0.8)) / np.arctanh(0.3)) ** 2 + 3
print("correlation r 0.3, Fisher z formula: n %.4f" % n_r)

total = FTestAnovaPower().solve_power(effect_size=0.25, alpha=0.05, power=0.8, k_groups=4)
print("ANOVA k 4 f 0.25: total %.4f, per group %.4f" % (total, total / 4))

print("chi-square w 0.3 df 1: N %.4f" % GofChisquarePower().solve_power(effect_size=0.3, alpha=0.05, power=0.8, n_bins=2))

print("proportions h 0.5: n per group %.4f" % NormalIndPower().solve_power(effect_size=0.5, alpha=0.05, power=0.8))

p1, p2 = 0.65, 0.45
pbar = (p1 + p2) / 2
n = (z(0.975) * np.sqrt(2 * pbar * (1 - pbar)) + z(0.8) * np.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 / (p1 - p2) ** 2
ncc = n / 4 * (1 + np.sqrt(1 + 4 / (n * abs(p1 - p2)))) ** 2
print("proportions 0.65 against 0.45, pooled normal: n per group %.4f; Fleiss continuity correction: %.4f" % (n, ncc))
