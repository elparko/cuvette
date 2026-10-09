import struct
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent / "data"


def abif_entries(raw):
    n = struct.unpack(">i", raw[18:22])[0]
    off = struct.unpack(">i", raw[26:30])[0]
    out = {}
    for i in range(n):
        e = raw[off + 28 * i: off + 28 * (i + 1)]
        name, num, etype, esize, count, size, dataoff = struct.unpack(">4sihhiii", e[:24])
        data = e[20:24] if size <= 4 else raw[dataoff: dataoff + size]
        out[(name.decode(), num)] = data[:size]
    return out


def mott(quals, limit=0.05):
    score, best, start, best_start, best_end = 0.0, 0.0, 0, 0, 0
    for i, q in enumerate(quals):
        score += limit - 10 ** (-q / 10.0)
        if score < 0:
            score, start = 0.0, i + 1
        elif score > best:
            best, best_start, best_end = score, start, i + 1
    return best_start, best_end


raw = (HERE / "3730.ab1").read_bytes()
entries = abif_entries(raw)
seq = entries[("PBAS", 2)].decode()
quals = list(entries[("PCON", 2)])
s, e = mott(quals)
trimmed = seq[s:e]
print("raw length", len(seq))
print("Mott trimmed (limit 0.05) start", s, "end", e, "length", len(trimmed))

comp = {"A": "T", "C": "G", "G": "C", "T": "A", "N": "N"}
lam = "".join(l.strip() for l in (HERE / "lambda.gb").read_text().split("ORIGIN")[1].splitlines() if l.strip() and not l.startswith("//"))
lam = "".join(c for c in lam if c.isalpha()).upper()
mod = list(trimmed)
changes = [100, 301, 502]
for p in changes:
    mod[p] = {"A": "C", "C": "G", "G": "T", "T": "A"}[mod[p]]
mod = "".join(mod)
rc = "".join(comp[c] for c in reversed(mod))
ref = lam[:40] + rc + lam[40:80]
(HERE / "sanger_reference.fasta").write_text(">sanger_reference synthetic: lambda 1-40, reverse complement of the trimmed 3730.ab1 read with 3 substitutions, lambda 41-80\n" + ref + "\n")
n_mis = sum(1 for a, b in zip(trimmed, mod) if a != b)
L = len(trimmed)
print("reference length", len(ref))
print("substitutions in read coordinates (1-based)", [p + 1 for p in changes], "count", n_mis)
print("expected aligned reference span", 41, "to", 40 + L)
print("expected identity percent %.3f" % (100.0 * (L - n_mis) / L))
sys.exit(0)
