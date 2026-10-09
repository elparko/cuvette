import re
from pathlib import Path

IUPAC = {"A": "A", "C": "C", "G": "G", "T": "T", "R": "AG", "Y": "CT", "S": "CG", "W": "AT", "K": "GT",
         "M": "AC", "B": "CGT", "D": "AGT", "H": "ACT", "V": "ACG", "N": "ACGT"}
PAIRS = {"A": "T", "C": "G", "G": "C", "T": "A", "R": "Y", "Y": "R", "S": "S", "W": "W", "K": "M",
         "M": "K", "B": "V", "V": "B", "D": "H", "H": "D", "N": "N"}
seq = "".join(l.strip() for l in (Path(__file__).resolve().parent.parent / "data" / "ecoli_rrnb_J01695.2.fasta").read_text().splitlines()[1:]).upper()


def pattern(p):
    return "".join("[%s]" % IUPAC[c] for c in p)


def rc(p):
    return "".join(PAIRS[c] for c in reversed(p))


f = "CCTACGGGNGGCWGCAG"
r = "GACTACHVGGGTATCTAATCC"
fs = [m.start() + 1 for m in re.finditer(pattern(f), seq)]
rs = [m.start() + 1 for m in re.finditer(pattern(rc(r)), seq)]
print("J01695.2 length", len(seq))
print("forward matches (1-based start)", fs)
print("reverse complement matches (1-based start)", rs)
for a in fs:
    for b in rs:
        if b > a:
            end = b + len(r) - 1
            print("product", a, "to", end, "inclusive length", end - a + 1)
print("The 16S gene of J01695.2 starts at 1268 (GenBank feature), so the forward primer start is E. coli position", fs[0] - 1268 + 1)
