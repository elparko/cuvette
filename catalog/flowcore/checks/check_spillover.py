import sys
import numpy as np
from flowio import FlowData

data = sys.argv[1]
ref = np.loadtxt(f"{data}/compdata_compref.txt", skiprows=1, usecols=(1, 2, 3, 4))


def load(name):
    fd = FlowData(f"{data}/compdata_060909_{name}.fcs")
    ev = np.array(fd.events, dtype=float).reshape(-1, fd.channel_count)
    names = [fd.channels[i + 1]["pnn"] for i in range(fd.channel_count)]
    return ev, names


unst, names = load("001")
chs = ["FL1-H", "FL2-H", "FL3-H", "FL4-H"]
idx = [names.index(c) for c in chs]
lin = lambda m: 10 ** (m / 256.0)
u = lin(unst[:, idx])
mu = np.median(u, axis=0)
files = {"FL1-H": "002", "FL2-H": "003", "FL4-H": "004", "FL3-H": "005"}

for pct in (50, 80, 99):
    S = np.zeros((4, 4))
    for i, c in enumerate(chs):
        x = lin(load(files[c])[0][:, idx])
        cut = np.percentile(u[:, i], pct)
        pos = x[x[:, i] > cut]
        mp = np.median(pos, axis=0)
        S[i] = (mp - mu) / (mp[i] - mu[i])
    print(f"positive cutoff: {pct}th percentile of unstained; max |difference| to flowCore compref: {np.abs(S - ref).max():.6f}")
    if pct == 80:
        print(np.round(S, 6))
print("flowCore reference (compref)")
print(np.round(ref, 6))
