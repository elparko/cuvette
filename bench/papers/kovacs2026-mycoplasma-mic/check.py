import math
import re
import sys
import pandas as pd

df = pd.read_csv(sys.argv[1], dtype=str)
drugs = [c for c in df.columns if c not in ("strain", "species")]
rank_op = {"<=": 0, "<": 1, "": 2, ">=": 3, ">": 4}


def parse(s):
    m = re.match(r"^(<=|>=|<|>)?([0-9.]+)$", s.strip())
    return float(m.group(2)), m.group(1) or ""


def kth(values, p, rule):
    pairs = sorted(((v, rank_op[o], o) for v, o in map(parse, values)))
    n = len(pairs)
    k = math.ceil(p * n - 1e-9) if rule == "ceil" else round(p * n)
    v, _, o = pairs[k - 1]
    return f"{o}{v:g}"


print("strains", len(df))
for d in drugs:
    x = df[d].tolist()
    print(f"{d:16s} n={len(x)} MIC50 ceil={kth(x, .5, 'ceil')} round={kth(x, .5, 'round')} MIC90 ceil={kth(x, .9, 'ceil')} round={kth(x, .9, 'round')}")
