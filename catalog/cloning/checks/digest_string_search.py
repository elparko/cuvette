import re
from pathlib import Path

D = Path(__file__).resolve().parent.parent / "data"


def genbank_seq(p):
    body = p.read_text().split("ORIGIN")[1]
    return re.sub(r"[^acgtn]", "", body.lower()).upper()


lam = genbank_seq(D / "lambda.gb")
cuts = [m.start() + 2 for m in re.finditer("(?=GAATTC)", lam)]
b = [1] + cuts + [len(lam) + 1]
print("lambda length", len(lam), "EcoRI cuts (first base after the cut)", cuts)
print("lambda EcoRI linear fragments", sorted([b[i + 1] - b[i] for i in range(len(b) - 1)], reverse=True))
puc = genbank_seq(D / "puc19.gb")
e = [m.start() + 2 for m in re.finditer("(?=GAATTC)", puc)]
h = [m.start() + 2 for m in re.finditer("(?=AAGCTT)", puc)]
c = sorted(e + h)
print("pUC19 length", len(puc), "EcoRI site starts", [x - 1 for x in e], "HindIII site starts", [x - 1 for x in h])
print("pUC19 circular fragments", sorted([c[1] - c[0], len(puc) - c[1] + c[0]]))
