from pathlib import Path

seq = "".join(l.strip() for l in (Path(__file__).resolve().parent.parent / "data" / "sars_cov_2_MN908947.3.fasta").read_text().splitlines()[1:]).upper()
comp = {"A": "T", "C": "G", "G": "C", "T": "A"}


def rc(s):
    return "".join(comp[c] for c in reversed(s))


for name, f, r in [("N2", "TTACAAACATTGGCCGCAAA", "GCGCGACATTCCGAAGAA")]:
    fs = [i + 1 for i in range(len(seq)) if seq.startswith(f, i)]
    rs = [i + 1 for i in range(len(seq)) if seq.startswith(rc(r), i)]
    print(name, "forward exact matches (1-based start)", fs, "reverse complement matches", rs)
    for a in fs:
        for b in rs:
            if b > a:
                end = b + len(r) - 1
                print(name, "product", a, "to", end, "length", end - a + 1)
print("genome length", len(seq))
