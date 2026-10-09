import csv
import os
import sys
from collections import OrderedDict

import numpy as np

path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.environ.get("GA_DATA", "/Volumes/T7/guided-analysis/data"), "kochanek2023-deaths-final-data-2020", "nchs_2020_age_rates.csv")
groups = OrderedDict()
with open(path) as f:
    for r in csv.DictReader(f):
        g = groups.setdefault(r["group"], {"rate": [], "std": []})
        g["rate"].append(float(r["rate_per_100000"]))
        g["std"].append(float(r["std_pop_2000"]))

adj = {}
for name, g in groups.items():
    w = np.array(g["std"])
    adj[name] = float(np.sum(w / w.sum() * np.array(g["rate"])))
    print(f"{name}: age groups {len(w)}, standard total {int(w.sum())}, age-adjusted rate {adj[name]:.4f}")

print(f"ratio all_2020 / all_2019 = {adj['all_2020'] / adj['all_2019']:.5f} (printed rates 835.4 / 715.2 = {835.4 / 715.2:.5f})")
print(f"ratio male_2020 / female_2020 = {adj['male_2020'] / adj['female_2020']:.5f} (printed rates 998.3 / 695.1 = {998.3 / 695.1:.5f})")
