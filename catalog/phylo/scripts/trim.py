import sys

from fasta_stats import check_equal_length, read_fasta, stats

src, out, max_gap = sys.argv[1], sys.argv[2], float(sys.argv[3])
names, seqs = read_fasta(src)
if not seqs:
    sys.exit("error: no sequences found")
check_equal_length(seqs)
n, length = len(seqs), len(seqs[0])
keep = [i for i in range(length) if sum(s[i] == "-" for s in seqs) / n <= max_gap]
if not keep:
    sys.exit("error: every column is above the gap limit")
with open(out, "w") as f:
    for name, s in zip(names, seqs):
        f.write(f">{name}\n{''.join(s[i] for i in keep)}\n")
print(f"alignment={out}")
print(f"columns_before={length}")
print(f"columns_removed={length - len(keep)}")
for k, v in stats([''.join(s[i] for i in keep) for s in seqs]).items():
    print(f"{k}={v}")
