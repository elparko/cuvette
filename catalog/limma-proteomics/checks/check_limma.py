import sys

import numpy as np
import pandas as pd
from scipy import special, stats

path = sys.argv[1]
df = pd.read_csv(path, sep="\t", low_memory=False)
df = df[(df["Reverse"] != "+") & (df["Contaminant"] != "+")]
lfq = df[[c for c in df.columns if c.startswith("LFQ intensity")]].astype(float)
x = np.log2(lfq.where(lfq > 0))
cols = list(x.columns)
group = np.array([c.split()[-1][0] for c in cols])
a = x.loc[:, group == "H"].to_numpy()
b = x.loc[:, group == "L"].to_numpy()
keep = ((~np.isnan(a)).sum(1) >= 3) & ((~np.isnan(b)).sum(1) >= 3)
a, b = a[keep], b[keep]
ann = df["Fasta headers"].str.contains("Escherichia|_ECOLI", regex=True).to_numpy()[keep]
ids = df["Protein IDs"].to_numpy()[keep]

na, nb = (~np.isnan(a)).sum(1), (~np.isnan(b)).sum(1)
ma, mb = np.nanmean(a, 1), np.nanmean(b, 1)
ss = np.nansum((a - ma[:, None]) ** 2, 1) + np.nansum((b - mb[:, None]) ** 2, 1)
df1 = na + nb - 2
s2 = ss / df1
lfc = ma - mb
unscaled = np.sqrt(1 / na + 1 / nb)
t_ord = lfc / (np.sqrt(s2) * unscaled)


def trigamma_inverse(x0):
    if x0 > 1e7:
        return 1 / np.sqrt(x0)
    if x0 < 1e-6:
        return 1 / x0
    y = 0.5 + 1 / x0
    for _ in range(100):
        tri = special.polygamma(1, y)
        dif = tri * (1 - tri / x0) / special.polygamma(2, y)
        y = y + dif
        if -dif / y < 1e-8:
            break
    return y


m = np.median(s2)
z = np.log(np.maximum(s2, 1e-5 * m))
e = z - special.digamma(df1 / 2) + np.log(df1 / 2)
emean = e.mean()
evar = ((e - emean) ** 2).sum() / (len(e) - 1) - special.polygamma(1, df1 / 2).mean()
d0 = 2 * trigamma_inverse(evar)
s20 = np.exp(emean + special.digamma(d0 / 2) - np.log(d0 / 2))
s2_post = (d0 * s20 + df1 * s2) / (d0 + df1)
t_mod = lfc / (np.sqrt(s2_post) * unscaled)
p = 2 * stats.t.sf(np.abs(t_mod), d0 + df1)
order = np.argsort(p)
n = len(p)
adj = np.empty(n)
adj[order] = np.minimum.accumulate((p[order] * n / np.arange(1, n + 1))[::-1])[::-1]
adj = np.minimum(adj, 1)
sig = adj < 0.01
up = sig & (lfc > 0)
down = sig & (lfc < 0)
i = list(ids).index("P09373")
print(f"n_tested {n}")
print(f"ecoli_tested {ann.sum()}")
print(f"d0 {d0:.4f}")
print(f"s20 {s20:.6f}")
print(f"P09373 log2fc {lfc[i]:.6f} t_ordinary {t_ord[i]:.4f} t_moderated {t_mod[i]:.4f} p {p[i]:.6e} adj_p {adj[i]:.6e}")
print(f"sig_fdr_0.01 {sig.sum()} up {up.sum()} down {down.sum()}")
print(f"up_ecoli {(up & ann).sum()} up_other {(up & ~ann).sum()}")

full = x.to_numpy()
k2 = ((~np.isnan(full[:, group == "H"])).sum(1) >= 2) & ((~np.isnan(full[:, group == "L"])).sum(1) >= 2)
sub = full[k2]
med = np.nanmedian(sub, 0)
norm = sub - med + med.mean()
pid = df["Protein IDs"].str.split(";").str[0].to_numpy()[k2]
j = list(pid).index("P09373")
print(f"min_valid2_proteins {k2.sum()}")
print("column_medians " + " ".join(f"{v:.6f}" for v in med))
print("P09373 median_normalized " + " ".join(f"{v:.6f}" for v in norm[j]))
print(f"missing_values_min_valid2 {int(np.isnan(sub).sum())}")
