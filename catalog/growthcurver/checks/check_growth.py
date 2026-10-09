# Independent check with SciPy and NumPy (not growthcurver, not growthrates).
# 1. growthdata well A1: logistic fit after the subtraction of the well minimum (the growthcurver model, bg_correct = "min").
#    Doubling time ln(2) / r; auc_e by the trapezoid rule on the corrected data.
# 2. bactgrowth D_0_1: the logistic fit with no background correction.
# 3. bactgrowth D_0_1: the easylinear method of Hall et al. (2014), h = 5, quota 0.95, written again in NumPy.
# Run: uv run --no-project --with numpy==2.3.3 --with scipy==1.16.2 --with pandas==2.3.3 python -I -W ignore checks/check_growth.py data > checks/check_growth.out
import sys

import numpy as np
import pandas as pd
from scipy.optimize import curve_fit

folder = sys.argv[1]


def logistic(t, k, n0, r):
    return k / (1 + ((k - n0) / n0) * np.exp(-r * t))


def fit(t, y):
    p, _ = curve_fit(logistic, t, y, p0=[y.max(), max(y[y > 0].min(), 1e-4), 0.5], bounds=([0, 1e-12, 0], [10, 10, 10]), maxfev=200000, ftol=1e-15, xtol=1e-15, gtol=1e-15)
    sigma = np.sqrt(np.sum((y - logistic(t, *p)) ** 2) / (len(y) - 3))
    return p, sigma


g = pd.read_csv(f"{folder}/growthdata.csv")
t, y = g.time.to_numpy(float), g.A1.to_numpy(float)
y = y - y.min()
(k, n0, r), sigma = fit(t, y)
print(f"growthdata A1, min corrected: k {k:.6f} n0 {n0:.6e} r {r:.6f} t_gen {np.log(2) / r:.6f} sigma {sigma:.9f} auc_e {np.trapezoid(y, t):.6f}")

b = pd.read_csv(f"{folder}/bactgrowth_D_0_1.csv")
t, y = b.time.to_numpy(float), b.D_0_1.to_numpy(float)
(k, n0, r), sigma = fit(t, y)
print(f"bactgrowth D_0_1, no correction: k {k:.6f} n0 {n0:.6f} r {r:.6f}")

h, quota = 5, 0.95
ly = np.log(y)
slopes = np.array([np.polyfit(t[i:i + h], ly[i:i + h], 1)[0] for i in range(len(t) - h + 1)])
cand = np.where(slopes >= quota * slopes.max())[0]
idx = np.arange(cand.min(), cand.max() + h)
slope, icept = np.polyfit(t[idx], ly[idx], 1)
y0_lm = np.exp(icept)
lag = (np.log(y[0]) - icept) / slope
print(f"bactgrowth D_0_1, easylinear: windows {cand.tolist()}, mumax {slope:.7f} y0_lm {y0_lm:.7f} lag {lag:.7f}")
