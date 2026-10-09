import csv
import math
import sys
from pathlib import Path

import numpy as np
import tifffile
from oasis.oasis_methods import oasisAR1

root = Path(sys.argv[1])
sys.path.insert(0, str(root))
import calcium_tools as tool

MAD = 1.4826


def read_csv(path):
    with open(path) as f:
        rows = list(csv.reader(f))
    return rows[0], np.array([[float(v) for v in r] for r in rows[1:]])


def runs_by_hand(y, k, min_frames):
    med = np.median(y)
    sd = MAD * np.median(np.abs(y - med))
    hi, lo = med + k * sd, med + 0.5 * k * sd
    out, i, n = [], 0, len(y)
    while i < n:
        if y[i] > lo:
            j = i
            while j < n and y[j] > lo:
                j += 1
            if sum(1 for v in y[i:j] if v > hi) >= min_frames:
                out.append(i)
            i = j
        else:
            i += 1
    return out


def match(truth, found, tol):
    used, n = set(), 0
    for tt in sorted(truth):
        best, bd = None, tol + 1e-12
        for i, ff in enumerate(sorted(found)):
            if i not in used and abs(ff - tt) <= bd:
                best, bd = i, abs(ff - tt)
        if best is not None:
            used.add(best)
            n += 1
    return n


print("== Allen Institute cell-attached ground truth, neuron 101084 (Cascade database)")
h, d = read_csv(root / "data/cascade/allen_101084_dff.csv")
t, y = d[:, 0], d[:, 1]
fs = round(1.0 / np.median(np.diff(t)), 6)
with open(root / "data/cascade/allen_101084_spikes.csv") as f:
    truth = [float(r[0]) for r in list(csv.reader(f))[1:]]
print("frames", len(y), "frame_rate_hz", fs, "duration_s", round(len(y) / fs, 4), "n_truth", len(truth))
starts = runs_by_hand(y, 3.0, 1)
onset_times = []
med = np.median(y)
sd = MAD * np.median(np.abs(y - med))
lo = med + 0.5 * 3.0 * sd
i = 0
while i < len(y):
    if y[i] > lo:
        j = i
        while j < len(y) and y[j] > lo:
            j += 1
        if sum(1 for v in y[i:j] if v > med + 3.0 * sd) >= 1:
            onset_times.append(t[i])
        i = j
    else:
        i += 1
m = match(truth, onset_times, 0.5)
print("threshold k=3: n_events", len(starts), "n_matched", m, "sensitivity", round(m / len(truth), 6), "precision", round(m / len(onset_times), 6))

tau = 0.5
g = math.exp(-1.0 / (fs * tau))
d1 = np.diff(y)
sn = MAD * np.median(np.abs(d1 - np.median(d1))) / math.sqrt(2.0)
target = sn * sn * len(y)


def rss(lam):
    c, s = oasisAR1(y, g, lam=lam)
    return float(np.sum((y - c) ** 2)), c, s


lo_l, hi_l = 0.0, sn
for _ in range(60):
    if rss(hi_l)[0] > target:
        break
    lo_l, hi_l = hi_l, hi_l * 2
for _ in range(40):
    mid = 0.5 * (lo_l + hi_l)
    if rss(mid)[0] > target:
        hi_l = mid
    else:
        lo_l = mid
_, c_ref, s_ref = rss(lo_l)
idx = np.where(s_ref > 3.0 * sn)[0]
mo = match(truth, [t[i] for i in idx], 0.5)
print("oasis tau=0.5 s, reference package oasisAR1: noise_sd", round(sn, 6), "lambda", round(lo_l, 6), "n_events", len(idx), "n_matched", mo)
c_tool, s_tool = tool._oasis_ar1(y, g, lo_l)
print("max |c_tool - c_reference| at the same lambda:", float(np.max(np.abs(c_tool - c_ref))), " max |s diff|:", float(np.max(np.abs(s_tool - s_ref))))

print("== CaImAn demo movie, 12 circular ROIs of data/demo_rois.csv")
stack = tifffile.imread(root / "data/demo/demoMovie.tif").astype(float)
T, ny, nx = stack.shape
with open(root / "data/demo_rois.csv") as f:
    rois = list(csv.DictReader(f))
F, FN = np.zeros((T, len(rois))), np.zeros((T, len(rois)))
inside_all = np.zeros((ny, nx), bool)
masks = []
for r in rois:
    m_ = np.zeros((ny, nx), bool)
    for yy in range(ny):
        for xx in range(nx):
            if (xx - float(r["x"])) ** 2 + (yy - float(r["y"])) ** 2 <= float(r["radius_px"]) ** 2:
                m_[yy, xx] = True
    masks.append(m_)
    inside_all |= m_
for k, m_ in enumerate(masks):
    F[:, k] = stack[:, m_].mean(axis=1)
    ring = np.zeros((ny, nx), bool)
    ys, xs = np.where(m_)
    for yy in range(ny):
        for xx in range(nx):
            if inside_all[yy, xx]:
                continue
            dist = np.sqrt(((ys - yy) ** 2 + (xs - xx) ** 2).min())
            if 5.0 < dist <= 12.0:
                ring[yy, xx] = True
    FN[:, k] = stack[:, ring].mean(axis=1)
print("F mean over frames and ROIs", round(float(F.mean()), 4), "Fneu mean", round(float(FN.mean()), 4))
fs2, win_s, pct, coef = 10.0, 30.0, 8.0, 0.7
Fc = F - coef * FN
n = int(round(win_s * fs2))
n += 1 - n % 2
half = n // 2
rank = min(int(n * pct / 100.0), n - 1)
F0 = np.zeros_like(Fc)
for k in range(Fc.shape[1]):
    pad = np.concatenate([np.full(half, Fc[0, k]), Fc[:, k], np.full(half, Fc[-1, k])])
    for i in range(T):
        F0[i, k] = np.sort(pad[i:i + n])[rank]
dff = (Fc - F0) / F0
print("percentile baseline 30 s, 8th percentile (nearest rank), coefficient 0.7: mean_f0", round(float(F0.mean()), 4), "median_dff", round(float(np.median(dff)), 6), "max_dff", round(float(dff.max()), 6))
ev = [len(runs_by_hand(dff[:, k], 3.0, 3)) for k in range(dff.shape[1])]
print("threshold k=3 min 0.3 s: n_events", sum(ev), "mean rate hz", round(sum(ev) / len(ev) / (T / fs2), 6))
R = np.corrcoef(dff.T)
iu = np.triu_indices(R.shape[0], 1)
print("pairwise r: n_pairs", len(iu[0]), "mean", round(float(R[iu].mean()), 6), "median", round(float(np.median(R[iu])), 6))
