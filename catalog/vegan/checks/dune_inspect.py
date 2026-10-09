import csv
import sys
from collections import Counter

here = sys.argv[1]
rows = list(csv.reader(open(f"{here}/data/dune.csv")))
species = rows[0][1:]
sites = [(r[0], [float(v) for v in r[1:]]) for r in rows[1:]]
values = [v for _, vs in sites for v in vs]
totals = [sum(vs) for _, vs in sites]
print("sites", len(sites), "species", len(species))
print("max value", max(values), "min positive", min(v for v in values if v > 0))
print("site totals min", min(totals), "max", max(totals))
print("site 1 total", totals[0], "richness", sum(v > 0 for v in sites[0][1]))
print("fraction zero %.6f" % (sum(v == 0 for v in values) / len(values)))
env = list(csv.DictReader(open(f"{here}/data/dune_env.csv")))
print("Management counts", sorted(Counter(r["Management"] for r in env).items()))
