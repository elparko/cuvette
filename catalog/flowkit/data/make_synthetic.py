import sys

import flowio
import numpy as np

out = sys.argv[1] if len(sys.argv) > 1 else "synthetic_comp.fcs"
groups = [(40, 1000.0, 0.0), (30, 0.0, 1000.0), (20, 1000.0, 1000.0), (10, 0.0, 0.0)]
true = np.array([[a, b] for n, a, b in groups for _ in range(n)])
spill = np.array([[1.0, 0.1], [0.0, 1.0]])
raw = true @ spill
n = len(raw)
events = np.column_stack([np.full(n, 500.0), np.full(n, 200.0), raw, np.arange(n, dtype=float)])
names = ["FSC-A", "SSC-A", "FL1-A", "FL2-A", "Time"]
labels = ["FSC-A", "SSC-A", "CD3", "CD4", "Time"]
meta = {"spillover": "2,FL1-A,FL2-A,1,0.1,0,1"}
with open(out, "wb") as f:
    flowio.create_fcs(f, events.flatten().tolist(), names, labels, metadata_dict=meta)
with open(out.replace(".fcs", "_matrix.csv"), "w") as f:
    f.write("FL1-A,FL2-A\n1,0.1\n0,1\n")
