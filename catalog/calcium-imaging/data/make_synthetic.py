import csv
import sys
from pathlib import Path

import numpy as np

out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent
rng = np.random.default_rng(20261009)
fs, dur, tau, amp, f_base = 10.0, 100.0, 1.0, 0.5, 100.0
t = np.arange(int(dur * fs)) / fs
onsets = [10.0, 30.0, 50.0, 70.0, 90.0]


def transients(tt, starts, f0, a, tau):
    y = np.full_like(tt, f0)
    for s in starts:
        m = tt >= s
        y[m] += f0 * a * np.exp(-(tt[m] - s) / tau)
    return y


def write(path, cols, names):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["time_s"] + names)
        for i in range(len(t)):
            w.writerow(["%.1f" % t[i]] + ["%.6f" % c[i] for c in cols])


clean = transients(t, onsets, f_base, amp, tau)
write(out / "synthetic_transients.csv", [clean + rng.normal(0, 1.0, len(t)), clean + rng.normal(0, 1.0, len(t))], ["roi1", "roi2"])

roi = transients(t, onsets, 120.0 - 0.7 * 40.0, amp, tau) + 0.7 * 40.0
write(out / "synthetic_neuropil_F.csv", [roi + rng.normal(0, 0.5, len(t))], ["roi1"])
write(out / "synthetic_neuropil_Fneu.csv", [np.full(len(t), 40.0)], ["roi1"])

stim = [10.0, 30.0, 50.0, 70.0, 90.0]
cols, names = [], []
for k in range(6):
    y = rng.normal(0, 0.02, len(t))
    if k < 3:
        for s in stim:
            y[(t >= s) & (t < s + 2.0)] += 0.3
    cols.append(y)
    names.append("roi%d" % (k + 1))
write(out / "synthetic_stimulus.csv", cols, names)

a = np.sin(2 * np.pi * t / 7.0) + 0.3 * np.sin(2 * np.pi * t / 3.1)
write(out / "synthetic_correlation.csv", [a, 2 * a + 5, -a], ["roiA", "roiB", "roiC"])

offsets = np.linspace(-0.2, 0.2, 10)
with open(out / "synthetic_groups.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["group", "animal", "field", "event_rate_hz"])
    for g, means in (("control", [1.0, 2.0, 3.0]), ("treated", [4.0, 5.0, 6.0])):
        for ai, m in enumerate(means):
            for ci, o in enumerate(offsets):
                w.writerow([g, "%s_m%d" % (g, ai + 1), "f%d" % (ci % 2 + 1), "%.4f" % (m + o)])
