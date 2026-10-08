# uv run --no-project --with openbabel-wheel --with numpy python check_esol.py /Volumes/T7/guided-analysis/data/delaney2004-esol/delaney-processed.csv
import csv
import sys

import numpy as np
from openbabel import openbabel as ob
from openbabel import pybel

ob.obErrorLog.SetOutputLevel(0)
rows = list(csv.DictReader(open(sys.argv[1], newline="")))
print("rows in file:", len(rows))

y, logp, mw, rb, ap, hbd, hba = [], [], [], [], [], [], []
for r in rows:
    m = pybel.readstring("smi", r["smiles"].strip())
    d = m.calcdesc(["logP", "MW", "rotors"])
    heavy = [a for a in ob.OBMolAtomIter(m.OBMol) if a.GetAtomicNum() > 1]
    logp.append(d["logP"])
    mw.append(d["MW"])
    rb.append(d["rotors"])
    ap.append(sum(a.IsAromatic() for a in heavy) / len(heavy))
    hbd.append(sum(a.GetImplicitHCount() + a.ExplicitHydrogenCount() for a in heavy if a.GetAtomicNum() in (7, 8)))
    hba.append(sum(1 for a in heavy if a.GetAtomicNum() in (7, 8)))
    y.append(float(r["measured log solubility in mols per litre"]))

y, logp, mw, rb, ap, hbd, hba = map(np.array, (y, logp, mw, rb, ap, hbd, hba))
print("molecules parsed:", len(y))
v = (mw > 500).astype(int) + (logp > 5) + (hbd > 5) + (hba > 10)
print("zero violations:", int((v == 0).sum()))
print("one violation:", int((v == 1).sum()))
print("two or more violations:", int((v >= 2).sum()))
print("logP above 5:", int((logp > 5).sum()))

p = 0.16 - 0.63 * logp - 0.0062 * mw + 0.066 * rb - 0.74 * ap
res = ((y - p) ** 2).sum()
print("ESOL squared correlation:", round(float(np.corrcoef(y, p)[0, 1] ** 2), 4))
print("ESOL 1 - SSres/SStot:", round(float(1 - res / ((y - y.mean()) ** 2).sum()), 4))
print("ESOL RMSE:", round(float(np.sqrt(res / len(y))), 4))

pub = np.array([float(r["ESOL predicted log solubility in mols per litre"]) for r in rows])
res = ((y - pub) ** 2).sum()
print("file column 'ESOL predicted' (Delaney, clogP), squared correlation:", round(float(np.corrcoef(y, pub)[0, 1] ** 2), 4))
print("file column 'ESOL predicted' (Delaney, clogP), RMSE:", round(float(np.sqrt(res / len(y))), 4))
