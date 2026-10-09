import sys
from pathlib import Path

import flowio
import numpy as np

folder = Path(sys.argv[1])
names = {1: "B-cells IgM-", 2: "B-cells IgM+", 3: "CD4 T-cells", 4: "CD8 T-cells", 5: "DC", 6: "monocytes", 7: "NK cells", 8: "surface-"}
files = sorted(folder.glob("*.fcs"), key=lambda p: (int(p.stem.split("patient")[1].split("_")[0]), "Reference" not in p.stem))
counts = {}
for path in files:
    fd = flowio.FlowData(str(path))
    ev = np.array(fd.events, dtype=np.float64).reshape(-1, fd.channel_count)
    col = [c for c in fd.pnn_labels].index("population_id")
    counts[path.stem] = np.bincount(ev[:, col].astype(int), minlength=9)[1:]

print("cells per sample")
for stem, c in counts.items():
    print(f"{stem} {c.sum()}")
print(f"total {sum(c.sum() for c in counts.values())}")

print("percent of cells per population, Reference samples then BCR-XL samples")
for pop in range(1, 9):
    ref = [100 * c[pop - 1] / c.sum() for s, c in counts.items() if "Reference" in s]
    bcr = [100 * c[pop - 1] / c.sum() for s, c in counts.items() if "BCR-XL" in s]
    print(f"{pop} {names[pop]}: Ref " + " ".join(f"{v:.1f}" for v in ref) + " | BCR-XL " + " ".join(f"{v:.1f}" for v in bcr))
