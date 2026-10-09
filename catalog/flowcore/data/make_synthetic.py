import json
import sys
import numpy as np
from flowio import create_fcs
from scipy import stats

out = sys.argv[1]
n = 2000
chans = ["FSC-A", "SSC-A", "FL1-A", "FL2-A"]
markers = ["", "", "CD4", "CD8"]
cd4_pos = {"ctl1": 900, "ctl2": 840, "ctl3": 960, "trt1": 600, "trt2": 660, "trt3": 540}
cd8_pos = {"ctl1": 360, "ctl2": 400, "ctl3": 320, "trt1": 600, "trt2": 640, "trt3": 700}
cutoffs = {"CD4": 2500.0, "CD8": 2500.0}
truth = {"cutoffs": cutoffs, "samples": {}}

for name in cd4_pos:
    k = int(name[-1])
    idx = np.arange(n)
    debris = idx % 10 == 0
    live = np.where(~debris)[0]
    fsc = np.where(debris, 1000.0, 100000.0)
    ssc = np.full(n, 50000.0)
    cd4 = np.full(n, 300.0 + 10 * k)
    cd8 = np.full(n, 200.0 + 10 * k)
    cd4[live[: cd4_pos[name]]] = 6000.0 + 100 * np.arange(cd4_pos[name]) / cd4_pos[name]
    cd8[live[-cd8_pos[name]:]] = 5000.0 + 100 * np.arange(cd8_pos[name]) / cd8_pos[name]
    ev = np.column_stack([fsc, ssc, cd4, cd8]).astype(np.float32)
    with open(f"{out}/synthetic_{name}.fcs", "wb") as fh:
        create_fcs(fh, ev.flatten().tolist(), chans, opt_channel_names=markers)
    x = ev[~debris]
    p4 = x[:, 2] > cutoffs["CD4"]
    p8 = x[:, 3] > cutoffs["CD8"]
    truth["samples"][name] = {
        "n_parent": int(len(x)),
        "cd4_pct": float(100 * p4.mean()),
        "cd8_pct": float(100 * p8.mean()),
        "cd4_cd8_pct": float(100 * (p4 & p8).mean()),
        "cd4_only_pct": float(100 * (p4 & ~p8).mean()),
        "cd4_median_all": float(np.median(x[:, 2])),
        "cd4_median_pos": float(np.median(x[p4, 2])),
    }

with open(f"{out}/synthetic_design.csv", "w") as fh:
    fh.write("sample,group\n")
    for name in cd4_pos:
        fh.write(f"synthetic_{name},{name[:3]}\n")

for pop in ("cd4_pct", "cd8_pct"):
    a = [truth["samples"][s][pop] for s in ("ctl1", "ctl2", "ctl3")]
    b = [truth["samples"][s][pop] for s in ("trt1", "trt2", "trt3")]
    t = stats.ttest_ind(b, a, equal_var=False)
    u = stats.mannwhitneyu(b, a, alternative="two-sided", method="asymptotic")
    truth[pop + "_welch"] = {"mean_ctl": float(np.mean(a)), "mean_trt": float(np.mean(b)), "p": float(t.pvalue), "mw_p": float(u.pvalue)}
json.dump(truth, open(f"{out}/synthetic_truth.json", "w"), indent=1)
print(json.dumps(truth, indent=1))
