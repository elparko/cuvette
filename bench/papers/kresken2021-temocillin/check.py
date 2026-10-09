import math
import sys
import pandas as pd

path = sys.argv[1]
df = pd.read_csv(path)
bp_s_or_i_max = {"piperacillin/tazobactam": 8, "temocillin": 16}


def rank(values, p):
    v = sorted(values)
    return v[math.ceil(p * len(v) - 1e-9) - 1]


print("isolates", len(df), df["cephalosporin_group"].value_counts().to_dict())
for sp in ("Escherichia coli", "Klebsiella pneumoniae"):
    for grp in ("3GC-resistant", "3GC-susceptible"):
        sub = df[(df.species == sp) & (df.cephalosporin_group == grp)]
        for drug, cut in bp_s_or_i_max.items():
            x = sub[drug].dropna().tolist()
            pct = 100 * sum(v <= cut for v in x) / len(x)
            print(f"{sp:22s} {grp:16s} {drug:24s} n={len(x):2d} MIC50={rank(x, 0.5):g} MIC90={rank(x, 0.9):g} susceptible(S+I, MIC<={cut})={pct:.1f}%")
