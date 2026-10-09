# Independent check with SciPy (not drc, not renz): nonlinear Michaelis-Menten fit of Table 2, and the two
# Lineweaver-Burk lines that the paper shows as biased (unweighted, and weighted by v^4 as renz lb() does).
# Run: uv run --no-project --with numpy==2.3.3 --with scipy==1.16.2 --with pandas==2.3.3 python -I -W ignore check.py > check.out
import os

import numpy as np
import pandas as pd
from scipy.optimize import least_squares
from scipy.stats import t

data = os.environ.get("GA_DATA", "/Volumes/T7/guided-analysis/data")
d = pd.read_csv(f"{data}/aledo2022-renz-onpg/onpg_table2.csv")
S, v = d.onpg_mM.to_numpy(float), d.rate_mM_per_min.to_numpy(float)
r = least_squares(lambda p: v - p[0] * S / (p[1] + S), [0.2, 2], xtol=1e-15, ftol=1e-15, gtol=1e-15, method="lm")
n, k = len(v), 2
s2 = 2 * r.cost / (n - k)
se = np.sqrt(np.diag(s2 * np.linalg.inv(r.jac.T @ r.jac)))
q = t.ppf(0.975, n - k)
print(f"nonlinear: Vmax {r.x[0]:.6f} mM/min (SE {se[0]:.6f}, CI {r.x[0] - q * se[0]:.6f} to {r.x[0] + q * se[0]:.6f}), Km {r.x[1]:.6f} mM (SE {se[1]:.6f}, CI {r.x[1] - q * se[1]:.6f} to {r.x[1] + q * se[1]:.6f})")
X, Y = 1 / S, 1 / v
for name, w in [("Lineweaver-Burk, unweighted", np.ones_like(v)), ("Lineweaver-Burk, weights v^4", v ** 4)]:
    W = np.diag(w)
    A = np.column_stack([np.ones_like(X), X])
    b0, b1 = np.linalg.solve(A.T @ W @ A, A.T @ W @ Y)
    print(f"{name}: Vmax {1 / b0:.4f} mM/min, Km {b1 / b0:.4f} mM")
