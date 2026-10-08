# ~/.guided-analysis/envs/mne/bin/python check_events_epochs.py /Volumes/T7/guided-analysis/data/gramfort2013-mne-sample/MNE-sample-data/MEG/sample/sample_audvis_filt-0-40_raw.fif
# MNE reads the FIF file only. Event detection, projection, baseline, rejection, averaging and peaks are numpy code here.
import sys

import mne
import numpy as np

raw = mne.io.read_raw_fif(sys.argv[1], preload=True, verbose=False)
info = raw.info
data = raw.get_data()
names = raw.ch_names
kind = np.array(raw.get_channel_types())
bads = set(info["bads"])
good = np.array([n not in bads for n in names])
sf = info["sfreq"]

stim = data[names.index("STI 014")]
idx = np.flatnonzero(stim[1:] != stim[:-1]) + 1
idx = idx[(stim[idx] > 0) & (stim[idx] > stim[idx - 1])]
ids = stim[idx].astype(int)
print("events found:", len(idx))
for i in (1, 2, 3, 4, 5, 32):
    print(f"events with id {i}:", int((ids == i).sum()))

vecs = []
for p in info["projs"]:
    v = np.zeros(len(names))
    for n, x in zip(p["data"]["col_names"], p["data"]["data"][0]):
        if n in names and n not in bads:
            v[names.index(n)] = x
    vecs.append(v / np.linalg.norm(v))
u, s, _ = np.linalg.svd(np.array(vecs).T, full_matrices=False)
u = u[:, s / s[0] > 1e-2]
proj = np.eye(len(names)) - u @ u.T

lo, hi = int(round(-0.2 * sf)), int(round(0.5 * sf))
times = np.arange(lo, hi + 1) / sf
base = (times >= -0.2) & (times <= 0)
limits = {"grad": 4000e-13, "mag": 4000e-15, "eeg": 150e-6, "eog": 250e-6}
kept, kept_ids = [], []
for i, c in zip(idx, ids):
    x = data[:, i + lo : i + hi + 1]
    x = proj @ (x - x[:, base].mean(1, keepdims=True))
    ptp = np.ptp(x, axis=1)
    if all((ptp[(kind == k) & good] <= lim).all() for k, lim in limits.items()):
        kept.append(x)
        kept_ids.append(c)
kept, kept_ids = np.array(kept), np.array(kept_ids)
print("epochs:", len(idx), "kept:", len(kept), "dropped:", len(idx) - len(kept))
print("auditory/left epochs kept:", int((kept_ids == 1).sum()))

ev = kept[kept_ids == 1].mean(0)
win = (times >= 0.08 - 1e-9) & (times <= 0.12 + 1e-9)
g = (kind == "grad") & good
gfp = np.sqrt((ev[g] ** 2).mean(0))
j = np.flatnonzero(win)[np.argmax(gfp[win])]
print(f"gradiometer GFP peak: {times[j]:.4f} s, {gfp[j] * 1e13:.2f} fT/cm")
a = np.abs(ev[g][:, win])
c, t = np.unravel_index(np.argmax(a), a.shape)
print(f"strongest gradiometer: {np.array(names)[g][c]} at {times[win][t]:.4f} s, {ev[g][c, np.flatnonzero(win)[t]] * 1e13:.2f} fT/cm")
e = (kind == "eeg") & good
m = ev[e][:, win]
c, t = np.unravel_index(np.argmin(m), m.shape)
print(f"EEG most negative channel: {np.array(names)[e][c]} at {times[win][t]:.4f} s, {m[c, t] * 1e6:.2f} uV")
