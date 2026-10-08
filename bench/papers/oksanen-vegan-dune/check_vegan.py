import numpy as np
import pandas as pd
from scipy.spatial.distance import pdist, squareform

DATA = "/Volumes/T7/guided-analysis/data/oksanen-vegan-dune"
comm = pd.read_csv(f"{DATA}/dune.csv", index_col=0).to_numpy(float)
env = pd.read_csv(f"{DATA}/dune_env.csv", index_col=0)
groups = env["Management"].to_numpy()
labels = np.unique(groups)
n = len(groups)

p = comm[0] / comm[0].sum()
p = p[p > 0]
print(f"shannon_site1 {-(p * np.log(p)).sum():.4f}")

D = squareform(pdist(comm, "braycurtis"))


def pseudo_f(D2, g):
    ss_total = D2[np.triu_indices(n, 1)].sum() / n
    ss_within = 0.0
    for lab in labels:
        idx = np.where(g == lab)[0]
        sub = D2[np.ix_(idx, idx)]
        ss_within += sub[np.triu_indices(len(idx), 1)].sum() / len(idx)
    ss_between = ss_total - ss_within
    a = len(labels)
    return (ss_between / (a - 1)) / (ss_within / (n - a)), ss_between / ss_total


D2 = D ** 2
f_obs, r2 = pseudo_f(D2, groups)
print(f"permanova_r2 {r2:.4f}")
print(f"permanova_f {f_obs:.4f}")
ps = []
for seed in (1, 2, 3, 42, 123):
    rng = np.random.default_rng(seed)
    hits = sum(pseudo_f(D2, rng.permutation(groups))[0] >= f_obs - 1e-12 for _ in range(999))
    ps.append((hits + 1) / 1000)
print("permanova_p, 999 permutations, numpy seeds 1 2 3 42 123:", " ".join(f"{x:.3f}" for x in ps))

A = -0.5 * D2
J = np.eye(n) - np.ones((n, n)) / n
G = J @ A @ J
vals, vecs = np.linalg.eigh(G)
keep = np.abs(vals) > 1e-8 * np.abs(vals).max()
vals, vecs = vals[keep], vecs[:, keep]
X = vecs * np.sqrt(np.abs(vals))
pos = vals > 0


def spatial_median(Y):
    m = Y.mean(0)
    for _ in range(1000):
        d = np.sqrt(((Y - m) ** 2).sum(1))
        d = np.where(d < 1e-12, 1e-12, d)
        new = (Y / d[:, None]).sum(0) / (1 / d).sum()
        if np.abs(new - m).max() < 1e-12:
            return new
        m = new
    return m


z = np.zeros(n)
for lab in labels:
    idx = groups == lab
    cp = spatial_median(X[idx][:, pos])
    cn = spatial_median(X[idx][:, ~pos])
    dp = ((X[idx][:, pos] - cp) ** 2).sum(1)
    dn = ((X[idx][:, ~pos] - cn) ** 2).sum(1)
    z[idx] = np.sqrt(np.abs(dp - dn))

grand = z.mean()
ss_b = sum(((z[groups == lab].mean() - grand) ** 2) * (groups == lab).sum() for lab in labels)
ss_w = sum(((z[groups == lab] - z[groups == lab].mean()) ** 2).sum() for lab in labels)
a = len(labels)
print(f"negative eigenvalues {int((~pos).sum())}")
print(f"dispersion_f {(ss_b / (a - 1)) / (ss_w / (n - a)):.4f}")
