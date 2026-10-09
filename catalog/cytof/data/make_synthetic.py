import os
import sys

import flowio
import numpy as np

out = sys.argv[1] if len(sys.argv) > 1 else "synthetic"
os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(20261009)
markers = ["CD3", "CD19", "CD14", "pErk"]
means = {1: [300, 3, 3, 20], 2: [3, 250, 3, 40], 3: [3, 3, 400, 10]}
counts = {
    "p1_ref": (120, 80, 100), "p1_stim": (200, 70, 90),
    "p2_ref": (110, 90, 95), "p2_stim": (190, 85, 80),
    "p3_ref": (130, 75, 105), "p3_stim": (210, 60, 100),
}
for name, sizes in counts.items():
    rows = []
    for pop, n in zip((1, 2, 3), sizes):
        x = np.rint(rng.normal(means[pop], [30, 30, 40, 8], size=(n, 4)))
        x = np.clip(x, 0, None)
        rows.append(np.column_stack([x, np.full(n, pop)]))
    ev = np.vstack(rows)
    ev = ev[rng.permutation(len(ev))]
    channels = [f"Nd{140 + i}Di" for i in range(4)] + ["truth"]
    labels = markers + ["truth"]
    with open(os.path.join(out, name + ".fcs"), "wb") as f:
        flowio.create_fcs(f, ev.astype(np.float32).flatten().tolist(), channels, labels)
with open(os.path.join(out, "metadata.csv"), "w") as f:
    f.write("sample_id,condition,patient_id\n")
    for name in counts:
        p, c = name.split("_")
        f.write(f"{name},{c},{p}\n")
