import bisect
import sys

d = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/data/quinlan2010-bedtools"


def read(path):
    with open(path) as f:
        return [(r[0], int(r[1]), int(r[2])) for r in (line.split("\t") for line in f if line.strip())]


exons = read(f"{d}/refseq.chr1.exons.bed")
alus = read(f"{d}/aluY.chr1.bed")

by_chrom = {}
for c, s, e in sorted(alus):
    by_chrom.setdefault(c, []).append((s, e))
starts = {c: [s for s, _ in v] for c, v in by_chrom.items()}
max_len = max(e - s for _, s, e in alus)

pairs = bases = exons_hit = 0
for c, s, e in exons:
    v = by_chrom.get(c, [])
    lo = bisect.bisect_left(starts.get(c, []), s - max_len)
    hi = bisect.bisect_left(starts.get(c, []), e)
    hit = False
    for bs, be in v[lo:hi]:
        if bs < e and s < be:
            pairs += 1
            bases += min(e, be) - max(s, bs)
            hit = True
    exons_hit += hit

merged = 0
for c, v in by_chrom.items():
    cur_end = None
    for s, e in v:
        if cur_end is None or s > cur_end + 100:
            merged += 1
            cur_end = e
        else:
            cur_end = max(cur_end, e)

print(f"exons_with_overlap {exons_hit}")
print(f"overlapping_pairs {pairs}")
print(f"overlap_bases {bases}")
print(f"merged_intervals (distance 100) {merged}")
