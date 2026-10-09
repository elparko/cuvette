import os
import sys

import numpy as np
from scipy.stats import hypergeom

D = os.path.join(os.environ.get("GA_DATA", "/Volumes/T7/guided-analysis/data"), "wang2023-cuproptosis-oa")
GENES = {"DBT", "DLST", "FDX1", "LIPT1"}
sets = {}
with open(os.path.join(D, "DSigDB.gmt")) as fh:
    for line in fh:
        parts = line.rstrip("\n").split("\t")
        if len(parts) > 2 and parts[0]:
            g = [x.split(",")[0] for x in parts[2:] if x and x.split(",")[0]]
            if g:
                sets[parts[0]] = g
print("gene sets in the file:", len(sets))
library_genes = {g for v in sets.values() for g in v}
print("distinct genes in the library:", len(library_genes))

rows = []
for name, g in sets.items():
    s = set(g)
    x = len(GENES & s)
    if x:
        rows.append((name, x, len(s), float(hypergeom.sf(x - 1, 20000, len(s), len(GENES)))))
rows.sort(key=lambda r: (r[3], r[0]))
p = np.array([r[3] for r in rows])
order = np.argsort(p)
adj = np.minimum.accumulate((p[order] * len(p) / (np.arange(len(p)) + 1))[::-1])[::-1]
padj = np.empty_like(adj)
padj[order] = np.minimum(adj, 1.0)

print("\n%d of the %d gene sets share a gene with the list. Benjamini-Hochberg runs over those, background 20000." % (len(rows), len(sets)))
print("%-38s %6s %7s %22s %22s %18s" % ("term", "x", "set", "p", "p adjusted", "odds ratio"))
for i, (name, x, m, pv) in enumerate(rows[:5]):
    n, N = len(GENES), 20000
    odds = x * (N - m - n + x) / max((m - x) * (n - x), 1)
    print("%-38s %6d %7d %22.17g %22.17g %18.12g" % (name[:38], x, m, pv, padj[i], odds))

print("\nThe same top term with the genes of the library as the background (the gseapy default):")
name, x, m, _ = rows[0]
inlib = {g for g in GENES if g in library_genes}
print("%s: p = %.10g" % (name, hypergeom.sf(x - 1, len(library_genes), m, len(inlib))))
sys.exit(0)
