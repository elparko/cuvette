import sys

import numpy as np
import pandas as pd
from scipy import stats

data = sys.argv[1]


def pqn(x):
    tot = x.sum(1)
    tf = tot / np.median(tot)
    xi = x / tf[:, None]
    ref = np.median(xi, 0)
    f = tf * np.median(xi / ref, 1)
    return x / f[:, None], f


tiny = pd.read_csv(f"{data}/tiny_table.csv")
m = tiny[["m1", "m2", "m3", "m4", "m5"]].to_numpy(float)
m[m == 0] = np.nan
m = np.where(np.isnan(m), np.nanmin(np.where(m > 0, m, np.nan), 0) / 2, m)
print("tiny half_min m5 fill", m[0, 4], m[4, 4])
tot = m.sum(1)
print("tiny total_area factors", np.round(tot / np.median(tot), 6))
print("tiny total_area s1", np.round((m / (tot / np.median(tot))[:, None])[0], 6))
med = np.median(m, 1)
print("tiny median factors", np.round(med / np.median(med), 6))
x, f = pqn(m)
print("tiny pqn factors", np.round(f, 6))
print("tiny pqn s1", np.round(x[0], 6))
print("tiny pqn s5", np.round(x[4], 6))

sac = pd.read_csv(f"{data}/sacurine_linear.csv")
feat = sac.columns[4:]
X = sac[feat].to_numpy(float)
Xp, fp = pqn(X)
print("sacurine pqn factor min max", round(fp.min(), 6), round(fp.max(), 6))
L = np.log2(Xp)
male = (sac.gender == "M").to_numpy()
a, b = L[male], L[~male]
tw = stats.ttest_ind(a, b, equal_var=False)
ts = stats.ttest_ind(a, b, equal_var=True)
mw = np.array([stats.mannwhitneyu(a[:, j], b[:, j], method="asymptotic", use_continuity=True).pvalue for j in range(L.shape[1])])


def bh(p):
    n = len(p)
    o = np.argsort(p)
    q = p[o] * n / (np.arange(n) + 1)
    q = np.minimum.accumulate(q[::-1])[::-1]
    out = np.empty(n)
    out[o] = np.minimum(q, 1)
    return out


for name, p in (("welch", tw.pvalue), ("student", ts.pvalue), ("wilcoxon", mw)):
    q = bh(p)
    print(name, "n raw p<0.05", int((p < 0.05).sum()), "n BH<0.05", int((q < 0.05).sum()), "min p", f"{p.min():.6g}", "top", feat[int(np.argmin(p))])
print("welch top feature t", round(float(tw.statistic[int(np.argmin(tw.pvalue))]), 6))
d = a.mean(0) - b.mean(0)
print("log2fc of top welch feature", round(float(d[int(np.argmin(tw.pvalue))]), 6))

lg = pd.read_csv(f"{data}/sacurine.csv")
Z = lg[feat].to_numpy(float)
y = np.where(lg.gender == "M", 1.0, 0.0)
mz = (lg.gender == "M").to_numpy()
za, zb = Z[mz], Z[~mz]
tw2 = stats.ttest_ind(za, zb, equal_var=False)
mw2 = np.array([stats.mannwhitneyu(za[:, j], zb[:, j], method="asymptotic", use_continuity=True).pvalue for j in range(Z.shape[1])])
sp = np.array([stats.spearmanr(Z[:, j], lg.age).pvalue for j in range(Z.shape[1])])
an = stats.f_oneway(*[Z[(lg.gender == g).to_numpy()] for g in ("M", "F")])
for name, p in (("log10 welch", tw2.pvalue), ("log10 wilcoxon", mw2), ("log10 spearman age", sp), ("log10 anova", an.pvalue)):
    q = bh(p)
    print(name, "n raw p<0.05", int((p < 0.05).sum()), "n BH<0.05", int((q < 0.05).sum()), "min p", f"{p.min():.6g}", "top", feat[int(np.argmin(p))])
j0 = int(np.argmin(tw2.pvalue))
print("log10 welch top t", round(float(tw2.statistic[j0]), 6), "adj p", f"{bh(tw2.pvalue)[j0]:.6g}", "mean diff", round(float(za[:, j0].mean() - zb[:, j0].mean()), 6))
print("n up (diff>0) and BH<0.05 welch", int(((bh(tw2.pvalue) < 0.05) & (za.mean(0) > zb.mean(0))).sum()), "n down", int(((bh(tw2.pvalue) < 0.05) & (za.mean(0) < zb.mean(0))).sum()))
Zs = (Z - Z.mean(0)) / Z.std(0, ddof=1)
ys = (y - y.mean()) / y.std(ddof=1)
E, f_ = Zs.copy(), ys.copy()
ssx, ssy = (Zs**2).sum(), (ys**2).sum()
T, P, W, Q = [], [], [], []
for a_ in range(3):
    w = E.T @ f_
    w /= np.linalg.norm(w)
    t = E @ w
    p_ = E.T @ t / (t @ t)
    q_ = f_ @ t / (t @ t)
    E = E - np.outer(t, p_)
    f_ = f_ - q_ * t
    T.append(t), P.append(p_), W.append(w), Q.append(q_)
r2x = sum((t @ t) * (p_ @ p_) for t, p_ in zip(T, P)) / ssx
r2y = 1 - (f_ @ f_) / ssy
print("plsda 3 components R2X", round(r2x, 4), "R2Y", round(r2y, 4))
ssa = np.array([q_**2 * (t @ t) for t, q_ in zip(T, Q)])
Wm = np.array(W).T
vip = np.sqrt(Z.shape[1] * (Wm**2 @ ssa) / ssa.sum())
print("vip mean square", round(float((vip**2).mean()), 6), "n VIP>=1", int((vip >= 1).sum()))
top = np.argsort(-vip)[:3]
print("top vip", [(feat[i], round(float(vip[i]), 4)) for i in top])
rmsee = np.sqrt((f_ @ f_) / len(y))
print("plsda RMSEE (scaled y)", round(float(rmsee), 4))

u, s, vt = np.linalg.svd(Zs, full_matrices=False)
ev = s**2 / (s**2).sum()
print("pca R2X cumulative 8 components", round(float(ev[:8].sum()), 4), "pc1", round(float(ev[0]), 4), "pc2", round(float(ev[1]), 4), "pc3", round(float(ev[2]), 4))
