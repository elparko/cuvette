# Independent check with pandas (not R): Z' = 1 - 3 (SD_pos + SD_neg) / |mean_pos - mean_neg| for each plate and volume,
# from the first read, compared with the summary table of the authors (reference folder).
# Run: uv run --no-project --with pandas==2.3.3 python -I check.py > check.out
import os

import pandas as pd

data = os.environ.get("GA_DATA", "/Volumes/T7/guided-analysis/data")
ref = os.environ.get("GA_REFERENCE", "/Volumes/T7/guided-analysis/reference")
d = pd.read_csv(f"{data}/cooley2020-splitluc-zprime/splitluc_plates.csv")
t = pd.read_csv(f"{ref}/cooley2020-splitluc-zprime/All plates analysis.csv", header=None, encoding="utf-8-sig")
printed = {}
for i in range(3, 13):
    plate = int(float(t.iat[i, 0]))
    printed[(plate, 20)] = [float(t.iat[i, k]) for k in (1, 2, 3, 4, 5)]
    printed[(plate, 10)] = [float(t.iat[i, k]) for k in (8, 9, 10, 11, 12)]
print("plate volume | computed: mean_pos mean_neg sd_pos sd_neg Z' | printed: mean_pos mean_neg sd_pos sd_neg Z'")
for vol in (10, 20):
    for plate in range(1, 11):
        g = d[d.plate == plate]
        pos, neg = g[g.type == f"pos_{vol}ul"].signal, g[g.type == f"neg_{vol}ul"].signal
        z = 1 - 3 * (pos.std() + neg.std()) / abs(pos.mean() - neg.mean())
        pr = printed[(plate, vol)]
        flag = "" if abs(z - pr[4]) <= 0.005 else "  <- differs"
        print(f"{plate:2d} {vol} | {pos.mean():.1f} {neg.mean():.1f} {pos.std():.1f} {neg.std():.1f} {z:.4f} | {pr[0]:.0f} {pr[1]:.0f} {pr[2]:.0f} {pr[3]:.0f} {pr[4]:.2f}{flag}")
