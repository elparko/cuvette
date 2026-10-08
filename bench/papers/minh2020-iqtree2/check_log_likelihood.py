import re
import sys
from collections import Counter

import numpy as np
from scipy.linalg import expm
from scipy.special import gammainc
from scipy.stats import gamma

aln_path = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/data/minh2020-iqtree2/example.phy"

TREE = "(LngfishAu:0.1709068277,(LngfishSA:0.1883311672,LngfishAf:0.1648032873)100:0.1073256416,(Frog:0.2561720790,((((Turtle:0.2214955116,(Crocodile:0.3056436573,Bird:0.2309752831)97:0.0651735079)70:0.0364941210,Sphenodon:0.3446303789)51:0.0204677635,Lizard:0.3859794405)99:0.0739928283,(((Human:0.1850870817,(Seal:0.0943875559,(Cow:0.0822572767,Whale:0.1012437124)99:0.0404174962)71:0.0252594799)93:0.0340514112,(Mouse:0.0583901122,Rat:0.0905005039)100:0.1217432345)100:0.0607172631,(Platypus:0.1919645817,Opossum:0.1509515712)96:0.0373002662)100:0.1490260063)100:0.1275594673)100:0.0940391076);"
RATES = {"AC": 5.5843, "AG": 7.6324, "AT": 5.5843, "CG": 1.0, "CT": 22.6443, "GT": 1.0}
P_INV = 0.154
ALPHA = 0.7287
K = 4

IUPAC = {"A": "A", "C": "C", "G": "G", "T": "T", "U": "T", "R": "AG", "Y": "CT", "S": "CG", "W": "AT", "K": "GT", "M": "AC",
         "B": "CGT", "D": "AGT", "H": "ACT", "V": "ACG"}
ORDER = "ACGT"


def read_phylip(path):
    with open(path) as f:
        n, m = map(int, f.readline().split())
        seqs = {}
        for line in f:
            if line.strip():
                name, seq = line.split(None, 1)
                seqs[name] = re.sub(r"\s", "", seq).upper()
    assert len(seqs) == n and all(len(s) == m for s in seqs.values())
    return seqs


def parse_newick(s):
    pos = 0

    def node():
        nonlocal pos
        children = []
        if s[pos] == "(":
            pos += 1
            while True:
                children.append(node())
                if s[pos] == ",":
                    pos += 1
                    continue
                pos += 1
                break
        m = re.match(r"([^:,();]*)(?::([0-9.eE-]+))?", s[pos:])
        pos += m.end()
        label = m.group(1)
        return {"name": label if not children else None, "children": children, "length": float(m.group(2) or 0)}

    return node()


seqs = read_phylip(aln_path)
names = list(seqs)
counts = Counter(c for s in seqs.values() for c in s if c in ORDER)
pi = np.array([counts[c] for c in ORDER], float)
pi /= pi.sum()

R = np.zeros((4, 4))
for pair, r in RATES.items():
    i, j = ORDER.index(pair[0]), ORDER.index(pair[1])
    R[i, j] = R[j, i] = r
Q = R * pi[None, :]
np.fill_diagonal(Q, -Q.sum(1))
Q /= -(pi * np.diag(Q)).sum()

cuts = gamma.ppf(np.arange(1, K) / K, ALPHA, scale=1 / ALPHA)
upper = np.append(gammainc(ALPHA + 1, cuts * ALPHA), 1.0)
lower = np.insert(gammainc(ALPHA + 1, cuts * ALPHA), 0, 0.0)
cat_rates = (upper - lower) * K / (1 - P_INV)

columns = Counter(tuple(seqs[n][i] for n in names) for i in range(len(seqs[names[0]])))
patterns = list(columns)
weights = np.array([columns[p] for p in patterns], float)


def tip_partials(name):
    idx = names.index(name)
    out = np.zeros((len(patterns), 4))
    for p, col in enumerate(patterns):
        for c in IUPAC.get(col[idx], ORDER):
            out[p, ORDER.index(c)] = 1.0
    return out


tips = {n: tip_partials(n) for n in names}


def partial(node, rate):
    if node["name"]:
        return tips[node["name"]]
    res = np.ones((len(patterns), 4))
    for ch in node["children"]:
        P = expm(Q * ch["length"] * rate)
        res *= partial(ch, rate) @ P.T
    return res


tree = parse_newick(TREE)
site_lik = np.zeros(len(patterns))
for r in cat_rates:
    site_lik += (1 - P_INV) / K * (partial(tree, r) @ pi)

for p, col in enumerate(patterns):
    states = {c for c in col if c in ORDER}
    ambiguous = [c for c in col if c not in ORDER]
    if len(states) == 1:
        s = states.pop()
        if all(s in IUPAC.get(c, ORDER) for c in ambiguous):
            site_lik[p] += P_INV * pi[ORDER.index(s)]

lnl = float((weights * np.log(site_lik)).sum())
print(f"patterns {len(patterns)}")
print(f"category rates {np.round(cat_rates, 5).tolist()}")
print(f"log_likelihood {lnl:.4f}")
