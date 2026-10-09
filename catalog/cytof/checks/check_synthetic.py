import sys
from pathlib import Path

import flowio
import numpy as np

folder = Path(sys.argv[1])
cofactor = 5.0
markers = ["CD3", "CD19", "CD14", "pErk"]
rows = []
for path in sorted(folder.glob("*.fcs")):
    fd = flowio.FlowData(str(path))
    ev = np.array(fd.events, dtype=np.float32).reshape(-1, fd.channel_count)
    rows.append((path.stem, ev))

print("cells per file")
for name, ev in rows:
    print(f"{name} {len(ev)}")
all_ev = np.vstack([ev for _, ev in rows])
print(f"total {len(all_ev)}")

print("cells per true population (all files)")
labels = all_ev[:, 4]
for pop in (1, 2, 3):
    print(f"pop{pop} {int((labels == pop).sum())}")

print(f"median of asinh(x / {cofactor:g}) per true population")
for pop in (1, 2, 3):
    sub = all_ev[labels == pop, :4].astype(np.float64)
    med = np.median(np.arcsinh(sub / cofactor), axis=0)
    print(f"pop{pop} " + " ".join(f"{m}={v:.6f}" for m, v in zip(markers, med)))

print("cells per true population per file")
for name, ev in rows:
    print(name + " " + " ".join(str(int((ev[:, 4] == pop).sum())) for pop in (1, 2, 3)))
