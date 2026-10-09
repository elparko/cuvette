import csv
import math
import sys

import numpy as np
from scipy import stats

counts_path, treat, ctrl, sgrna_path, gene_path = sys.argv[1:6]
treat = treat.split(",")
ctrl = ctrl.split(",")

with open(counts_path, newline="") as f:
    first = f.readline()
    delim = "\t" if "\t" in first else ","
    f.seek(0)
    table = list(csv.DictReader(f, delimiter=delim))
samples = [k for k in table[0] if k not in ("sgRNA", "sgrna", "Gene", "gene")]
ids = [r["sgRNA"] for r in table]
genes_of = {r["sgRNA"]: r["Gene"] for r in table}
x = np.array([[float(r[s]) for s in samples] for r in table])

keep = x.sum(axis=1) > 0
geo = np.exp(np.log(x + 1.0).mean(axis=1))
factor = np.zeros(len(samples))
for j in range(len(samples)):
    ratio = np.sort(x[keep, j] / geo[keep])
    factor[j] = 1.0 / ratio[len(ratio) // 2]
norm = x * factor

ti = [samples.index(s) for s in treat]
ci = [samples.index(s) for s in ctrl]
tm = np.median(norm[:, ti], axis=1)
cm = np.median(norm[:, ci], axis=1)
lfc = np.log2(tm + 1.0) - np.log2(cm + 1.0)
lfc_by_id = dict(zip(ids, lfc))
print("size factors", " ".join("%.6g" % v for v in factor))

with open(sgrna_path, newline="") as f:
    srows = list(csv.DictReader(f, delimiter="\t"))
d_sg = max(abs(lfc_by_id[r["sgrna"]] - float(r["LFC"])) for r in srows)
print("sgRNAs", len(srows), "max absolute difference of sgRNA LFC %.2e" % d_sg)

by_gene = {}
for r in srows:
    by_gene.setdefault(r["Gene"], []).append(lfc_by_id[r["sgrna"]])
with open(gene_path, newline="") as f:
    grows = {r["id"]: r for r in csv.DictReader(f, delimiter="\t")}
d_gene = max(abs(float(np.median(by_gene[g])) - float(grows[g]["neg|lfc"])) for g in grows if g in by_gene)
print("genes", len(grows), "max absolute difference of gene LFC (median of sgRNA LFC) %.2e" % d_gene)

cutoff = float(sys.argv[6])
p_low = np.array([float(r["p.low"]) for r in srows])
n_all = len(p_low)
rank = stats.rankdata(p_low, method="average")
perc = {}
for r, rk in zip(srows, rank):
    perc.setdefault(r["Gene"], []).append((rk - 0.5) / n_all)


def rho(u):
    u = np.sort(u)
    n = len(u)
    best = 1.0
    for k in range(n):
        if u[k] > cutoff and k > 0:
            break
        best = min(best, stats.beta.cdf(u[k], k + 1, n - k))
    return best


worst = 0.0
for g, r in grows.items():
    if g not in perc:
        continue
    mine = rho(perc[g])
    theirs = float(r["neg|score"])
    worst = max(worst, abs(math.log10(mine) - math.log10(theirs)))
print("max absolute difference of log10 of the negative RRA score over %d genes: %.3f" % (len(grows), worst))
bad_sg = [r for r in srows if abs(lfc_by_id[r["sgrna"]] - float(r["LFC"])) > 1e-3]
print("sgRNAs with LFC difference above 0.001:", len(bad_sg))
for r in bad_sg[:3]:
    print(r["sgrna"], r["control_count"], r["treatment_count"], r["LFC"], "%.4f" % lfc_by_id[r["sgrna"]])
bad_g = [g for g in grows if g in perc and abs(math.log10(rho(perc[g])) - math.log10(float(grows[g]["neg|score"]))) > 0.01]
print("genes with a score difference above 0.01 in log10:", len(bad_g), bad_g[:5])
for g in bad_g[:2]:
    print(g, grows[g]["num"], grows[g]["neg|goodsgrna"], "mine %.4e tool %s" % (rho(perc[g]), grows[g]["neg|score"]), sorted(round(v, 4) for v in perc[g]))
top = sorted(grows, key=lambda g: int(grows[g]["neg|rank"]))[:5]
for g in top:
    print(g, "n %s" % grows[g]["num"], "rho %.4e" % rho(perc[g]), "tool %s" % grows[g]["neg|score"], "gene LFC %.4f" % float(np.median(by_gene[g])), "tool %s" % grows[g]["neg|lfc"])
