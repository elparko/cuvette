import sys

import anndata as ad
import numpy as np

d = sys.argv[1]
sets = {n: ad.read_h5ad("%s/%s_small.h5ad" % (d, n)) for n in ["jurkat", "t293", "mix"]}


def lognorm(a):
    x = a.X.toarray().astype(np.float64)
    return np.log1p(x / x.sum(axis=1, keepdims=True) * 1e4)


logs = {n: lognorm(a) for n, a in sets.items()}
ref = {"jurkat": logs["jurkat"].mean(axis=0), "t293": logs["t293"].mean(axis=0)}
for n, x in logs.items():
    r = {k: np.array([np.corrcoef(row, v)[0, 1] for row in x]) for k, v in ref.items()}
    best_j = r["jurkat"] > r["t293"]
    print("%s: cells %d, jurkat %d, t293 %d" % (n, len(x), best_j.sum(), (~best_j).sum()))
print("XIST counts: jurkat %d, t293 %d, mix %d" % tuple(int(sets[n][:, "XIST"].X.sum()) for n in ["jurkat", "t293", "mix"]))
