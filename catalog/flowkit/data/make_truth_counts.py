import json
import os
import sys

src, out = sys.argv[1], sys.argv[2]
counts = {}
for name in sorted(os.listdir(src)):
    if name.startswith("Results_") and name.endswith(".txt"):
        with open(os.path.join(src, name)) as f:
            counts[name[len("Results_"):-4]] = sum(int(line) for line in f if line.strip())
with open(out, "w") as f:
    json.dump(counts, f, indent=1, sort_keys=True)
