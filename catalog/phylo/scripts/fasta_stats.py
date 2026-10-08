import sys


def read_fasta(path):
    names, seqs = [], []
    for line in open(path):
        line = line.strip()
        if line.startswith(">"):
            names.append(line[1:].split()[0])
            seqs.append("")
        elif line and seqs:
            seqs[-1] += line
    return names, seqs


def stats(seqs):
    n = len(seqs)
    length = len(seqs[0]) if n else 0
    gaps = sum(s.count("-") for s in seqs)
    constant = 0
    for i in range(length):
        col = {s[i].upper() for s in seqs}
        if len(col) == 1 and "-" not in col:
            constant += 1
    ident_sum, pairs = 0.0, 0
    for a in range(n):
        for b in range(a + 1, n):
            same = comp = 0
            for x, y in zip(seqs[a], seqs[b]):
                if x != "-" and y != "-":
                    comp += 1
                    same += x.upper() == y.upper()
            if comp:
                ident_sum += same / comp
                pairs += 1
    return {
        "n_sequences": n,
        "alignment_length": length,
        "gap_fraction": round(gaps / (n * length), 4) if n and length else 0,
        "constant_columns": constant,
        "mean_pairwise_identity": round(ident_sum / pairs, 4) if pairs else 0,
    }


def check_equal_length(seqs):
    if len({len(s) for s in seqs}) > 1:
        sys.exit("error: the sequences have different lengths, so this is not an alignment")


if __name__ == "__main__":
    names, seqs = read_fasta(sys.argv[1])
    if not seqs:
        sys.exit("error: no sequences found")
    check_equal_length(seqs)
    for k, v in stats(seqs).items():
        print(f"{k}={v}")
