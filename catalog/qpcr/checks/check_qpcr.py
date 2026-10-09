# Independent check of the qpcr known-answer values with numpy and SciPy (not R, not NormqPCR, not pcr).
# Run: uv run --no-project --with numpy==2.3.3 --with scipy==1.16.2 --with pandas==2.3.3 python -I -W ignore checks/check_qpcr.py data > checks/check_qpcr.out
import sys

import numpy as np
import pandas as pd
from scipy import stats

folder = sys.argv[1]

dil = pd.read_csv(f"{folder}/livak_dilution.csv")
eff = {}
for g, x in dil.groupby("gene", sort=False):
    slope, icpt = np.polyfit(np.log10(x.quantity), x.cq, 1)
    r2 = np.corrcoef(np.log10(x.quantity), x.cq)[0, 1] ** 2
    eff[g] = 10 ** (-1 / slope)
    print(f"livak dilution {g}: slope {slope:.6f} intercept {icpt:.6f} R2 {r2:.7f} efficiency {eff[g]:.6f}")

ct = pd.read_csv(f"{folder}/livak_ct.csv").pivot(index=["sample", "group"], columns="gene", values="cq").reset_index()
ct["dct"] = ct.c_myc - ct.GAPDH
cal = ct[ct.group == "brain"]
for g, x in ct.groupby("group"):
    ddct = x.dct.mean() - cal.dct.mean()
    e_livak = np.sqrt(x.c_myc.std() ** 2 + x.GAPDH.std() ** 2)
    e_sd = x.dct.std()
    print(f"ddct {g}: mean dCt {x.dct.mean():.6f} ddCt {ddct:.6f} fold {2 ** -ddct:.6f} sd_livak {2 ** -(ddct + e_livak):.6f} to {2 ** -(ddct - e_livak):.6f} sd_dct {2 ** -(ddct + e_sd):.6f} to {2 ** -(ddct - e_sd):.6f}")
k, b = -ct[ct.group == "kidney"].dct, -cal.dct
t = stats.ttest_ind(k, b, equal_var=False)
ci = t.confidence_interval(0.95)
print(f"ci95 kidney: Welch p {t.pvalue:.6g} fold CI {2 ** ci.low:.6f} to {2 ** ci.high:.6f}")
lt, lr = np.log2(eff["c_myc"]), np.log2(eff["GAPDH"])
L = -ct.c_myc * lt + ct.GAPDH * lr
fc = 2 ** (L[ct.group == "kidney"].mean() - L[ct.group == "brain"].mean())
pf = eff["c_myc"] ** (cal.c_myc.mean() - ct[ct.group == "kidney"].c_myc.mean()) / eff["GAPDH"] ** (cal.GAPDH.mean() - ct[ct.group == "kidney"].GAPDH.mean())
print(f"pfaffl kidney with the dilution efficiencies: fold {fc:.6f}; Pfaffl 2001 formula on group means {pf:.6f}")

ed = pd.read_csv(f"{folder}/embryo_dilution.csv")
for g, x in ed.groupby("gene", sort=False):
    slope, _ = np.polyfit(np.log10(x.molecules), x.cq, 1)
    print(f"embryo dilution {g}: slope {slope:.4f} efficiency {10 ** (-1 / slope):.6f} points {len(x)}")

cq = pd.read_csv(f"{folder}/embryo_cq.csv").pivot(index="sample", columns="gene", values="cq")
L = -cq


def m_values(cols):
    return {g: np.mean([np.std(L[g] - L[h], ddof=1) for h in cols if h != g]) for g in cols}


cur = list(L.columns)
order = []
while len(cur) >= 2:
    M = m_values(cur)
    avg = np.mean(list(M.values()))
    if len(cur) == 2:
        print(f"geNorm best pair {'/'.join(sorted(cur))}: average M {avg:.6f}")
        order = cur + order
        break
    worst = max(M, key=M.get)
    print(f"geNorm step, remove {worst}: average M {avg:.6f}")
    order = [worst] + order
    cur.remove(worst)
for n in range(2, 6):
    gm_n = L[order[:n]].mean(axis=1)
    gm_n1 = L[order[: n + 1]].mean(axis=1)
    print(f"geNorm V{n}/{n + 1} {np.std(gm_n - gm_n1, ddof=1):.6f}")
