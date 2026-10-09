import sys
import fcsparser
import numpy as np
import pandas as pd
from scipy import stats

d = sys.argv[1]
ch = "PE-CF594-A"
read = lambda n: fcsparser.parse(f"{d}/{n}.fcs", reformat_meta=True)[1][ch].to_numpy()
ctl = np.concatenate([read(f"control_rep{i}") for i in (1, 2, 3)])
print("control events", len(ctl))
for q in (99.0, 99.9):
    cut = np.percentile(ctl, q)
    res = {}
    for kind in ("bv_hdr", "bv_hiti2c"):
        v = np.array([100 * (read(f"{kind}_rep{i}") > cut).mean() for i in (1, 2, 3)])
        res[kind] = v
        print(f"percentile {q}: cutoff {cut:.2f} {kind} values {np.round(v, 3)} mean {v.mean():.3f} sd {v.std(ddof=1):.3f}")
    t = stats.ttest_ind(res["bv_hiti2c"], res["bv_hdr"], equal_var=False)
    print(f"percentile {q}: Welch t {t.statistic:.4f} p {t.pvalue:.6f}")
