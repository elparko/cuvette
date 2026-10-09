import sys

import numpy as np
import pandas as pd
from scipy.stats import ttest_ind

path = sys.argv[1]
df = pd.read_csv(path).set_index("feature")
sub = df
conds = np.array(["NS"] * 7 + ["S"] * 7)
counts = sub.to_numpy(float)
n_feat = counts.shape[0]
draws = int(sys.argv[2]) if len(sys.argv) > 2 else 4000
rng = np.random.default_rng(1)

diff_btw = np.zeros((draws, n_feat))
we_p = np.zeros((draws, n_feat))
we_q = np.zeros((draws, n_feat))


def bh(pv):
    o = np.argsort(pv)
    q = pv[o] * len(pv) / (np.arange(len(pv)) + 1)
    q = np.minimum.accumulate(q[::-1])[::-1]
    out = np.empty_like(q)
    out[o] = np.minimum(q, 1)
    return out


for k in range(draws):
    g = rng.gamma(counts + 0.5)
    p = g / g.sum(0, keepdims=True)
    lg = np.log2(p)
    clr = lg - lg.mean(0, keepdims=True)
    a = clr[:, conds == "NS"]
    b = clr[:, conds == "S"]
    diff_btw[k] = np.median(b, axis=1) - np.median(a, axis=1)
    we_p[k] = ttest_ind(a, b, axis=1, equal_var=False).pvalue
    we_q[k] = bh(we_p[k])

med_btw = np.median(diff_btw, axis=0)
order = np.argsort(-np.abs(med_btw))
print(f"features {n_feat}, Dirichlet draws {draws}, prior 0.5, log2 centered log-ratio over all features")
for i in order[:6]:
    print(f"{sub.index[i]} diff.btw {med_btw[i]:.3f}")
mean_q = we_q.mean(0)
print(f"features with mean Benjamini-Hochberg q below 0.05 (Welch t-test): {(mean_q < 0.05).sum()}")
i = list(sub.index).index("V:E:G:D")
print(f"V:E:G:D mean Welch p {we_p.mean(0)[i]:.3e} mean q {mean_q[i]:.3e}")
