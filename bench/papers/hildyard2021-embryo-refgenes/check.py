# Independent check with numpy (not R, not NormqPCR): geNorm M and V, and the standard curve slopes.
# It also prints the published geNorm and NormFinder values (Excel add-ins) from the analysis workbook in the reference folder.
# Run: uv run --no-project --with numpy==2.3.3 --with pandas==2.3.3 --with openpyxl==3.1.5 python -I -W ignore check.py > check.out
import os

import numpy as np
import pandas as pd

data = os.environ.get("GA_DATA", "/Volumes/T7/guided-analysis/data") + "/hildyard2021-embryo-refgenes"
ref = os.environ.get("GA_REFERENCE", "/Volumes/T7/guided-analysis/reference") + "/hildyard2021-embryo-refgenes"
cq = pd.read_csv(f"{data}/embryo_cq.csv")


def genorm(frame):
    L = -frame.pivot(index="sample", columns="gene", values="cq")
    cur = list(L.columns)
    order, steps = [], []
    while len(cur) >= 2:
        M = {g: np.mean([np.std(L[g] - L[h], ddof=1) for h in cur if h != g]) for g in cur}
        avg = np.mean(list(M.values()))
        if len(cur) == 2:
            steps.append(("/".join(sorted(cur)), avg))
            order = cur + order
            break
        worst = max(M, key=M.get)
        steps.append((worst, avg))
        order = [worst] + order
        cur.remove(worst)
    v23 = np.std(L[order[:2]].mean(axis=1) - L[order[:3]].mean(axis=1), ddof=1)
    return steps, v23


print("samples", cq["sample"].nunique(), "genes", cq.gene.nunique())
steps, v23 = genorm(cq)
for g, m in steps:
    print(f"all samples, geNorm step {g}: average M {m:.6f}")
print(f"all samples, V2/3 {v23:.6f}; genes with average M below 0.5: {sum(m < 0.5 for _, m in steps) + (steps[-1][1] < 0.5)}")
steps, v23 = genorm(cq[cq.tissue == "H"])
print(f"heads, best pair {steps[-1][0]}: average M {steps[-1][1]:.6f}; first step {steps[0][0]} {steps[0][1]:.6f}")

dil = pd.read_csv(f"{data}/embryo_dilution.csv")
for g, x in dil.groupby("gene", sort=False):
    slope, _ = np.polyfit(np.log10(x.molecules), x.cq, 1)
    print(f"dilution {g}: slope {slope:.4f} efficiency {10 ** (-1 / slope):.6f}")

wb = f"{ref}/embryo_qpcr_refanalysis.xlsx"
if os.path.exists(wb):
    gn = pd.read_excel(wb, sheet_name="geNorm", header=None)
    print("published geNorm, all samples:", dict(zip(gn.iloc[2, 1:15], gn.iloc[3, 1:15].astype(float).round(6))))
    print("published geNorm, heads:", dict(zip(gn.iloc[12, 1:15], gn.iloc[13, 1:15].astype(float).round(6))))
    print("published V2/3, all samples:", round(gn.iat[3, 17], 6))
    nf = pd.read_excel(wb, sheet_name="Normfinder data", header=None)
    print("published NormFinder, no groups:", dict(zip(nf.iloc[3:18, 1], nf.iloc[3:18, 2].astype(float).round(6))))
    print("published NormFinder, grouped by tissue:", dict(zip(nf.iloc[3:18, 8], nf.iloc[3:18, 9].astype(float).round(6))))
ef = f"{ref}/embryo_qpcr_efficiencies.xlsx"
if os.path.exists(ef):
    s = pd.read_excel(ef, sheet_name="Summary", header=None)
    print("published slopes and efficiencies:", {r[1]: (r[2], round(float(r[3]), 6)) for _, r in s.iloc[3:18].iterrows()})
