import sys
import fcsparser

meta, _ = fcsparser.parse(sys.argv[1], reformat_meta=True, data_set=0)
parts = meta["SPILL"].split(",")
n = int(parts[0])
names = parts[1 : 1 + n]
vals = [float(v) for v in parts[1 + n :]]
with open(sys.argv[2], "w") as fh:
    fh.write("," + ",".join(names) + "\n")
    for i in range(n):
        fh.write(names[i] + "," + ",".join(repr(v) for v in vals[i * n : (i + 1) * n]) + "\n")
