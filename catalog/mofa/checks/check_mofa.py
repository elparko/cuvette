import sys

import numpy as np
import pandas as pd

run, data = sys.argv[1], sys.argv[2]
factors = pd.read_csv(run + "/mofa_factors.csv", index_col=0)
weights = pd.read_csv(run + "/mofa_weights.csv")

for view in ["drugs", "mrna"]:
    y = pd.read_csv(f"{data}/{view}.csv", index_col=0).T.reindex(factors.index)
    w = weights[weights["view"] == view].pivot(index="feature", columns="factor", values="weight").reindex(y.columns)
    w = w[factors.columns]
    mask = y.notna().to_numpy()
    yc = (y - y.mean()).to_numpy()
    fit = factors.to_numpy() @ w.to_numpy().T
    ss_tot = np.nansum(yc ** 2)
    ss_res = np.nansum((np.where(mask, yc - fit, 0.0)) ** 2)
    print(f"{view} total variance explained {100 * (1 - ss_res / ss_tot):.2f}")

mut = pd.read_csv(f"{data}/mutations.csv", index_col=0).T.reindex(factors.index)
for cov in ["IGHV", "trisomy12"]:
    ok = mut[cov].notna()
    r = factors[ok].apply(lambda col: np.corrcoef(col, mut.loc[ok, cov].astype(float))[0, 1])
    best = r.abs().idxmax()
    print(f"{cov} best factor {best} abs_r {abs(r[best]):.3f} n {int(ok.sum())}")
