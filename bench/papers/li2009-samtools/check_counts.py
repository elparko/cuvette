import gzip
import re
import sys
from collections import Counter

path = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/data/li2009-samtools/ex1.sam.gz"

total = mapped = proper = singletons = mapq30 = region = 0
per_ref = Counter()
with gzip.open(path, "rt") as f:
    for line in f:
        if line.startswith("@"):
            continue
        qname, flag, rname, pos, mapq, cigar = line.split("\t")[:6]
        flag, pos, mapq = int(flag), int(pos), int(mapq)
        total += 1
        unmapped = flag & 0x4
        primary = not flag & 0x900
        if not unmapped:
            mapped += 1
            per_ref[rname] += 1
        if primary and flag & 0x1 and not unmapped:
            if flag & 0x2:
                proper += 1
            if flag & 0x8:
                singletons += 1
        if mapq >= 30:
            mapq30 += 1
        if rname == "seq2" and pos > 0:
            span = sum(int(n) for n, op in re.findall(r"(\d+)([MDN=X])", cigar)) if cigar != "*" else 1
            if pos <= 200 and pos + max(span, 1) - 1 >= 100:
                region += 1

print(f"total_reads {total}")
print(f"mapped_reads {mapped}")
print(f"properly_paired {proper}")
print(f"singletons {singletons}")
print(f"reads_seq1 {per_ref['seq1']}")
print(f"reads_seq2 {per_ref['seq2']}")
print(f"mapq_ge_30 {mapq30}")
print(f"reads_seq2_100_200 {region}")
