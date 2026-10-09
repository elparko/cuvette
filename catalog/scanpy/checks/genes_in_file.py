import sys

import h5py

f = h5py.File(sys.argv[1], "r")
names = set(f["var"]["_index"]["values"][:].astype(str))
print("h5py", h5py.__version__, "genes in var", len(names))
for g in ["CD3E", "MS4A1", "NOT_A_GENE"]:
    print(g, g in names)
