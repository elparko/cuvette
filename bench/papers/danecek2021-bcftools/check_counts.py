import gzip
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/data/danecek2021-bcftools/g1k_chr20_1000000_1100000.vcf.gz"
TRANSITIONS = {frozenset("AG"), frozenset("CT")}

total = snp = indel = other = ts = tv = in_region_pos = in_region_overlap = af5 = 0
with gzip.open(path, "rt") as f:
    for line in f:
        if line.startswith("#"):
            continue
        chrom, pos, _, ref, alt, _, _, info = line.rstrip("\n").split("\t")[:8]
        pos = int(pos)
        total += 1
        kinds = set()
        for a in alt.split(","):
            if a.startswith("<") or "[" in a or "]" in a or a == "*":
                kinds.add("other")
            elif len(a) == 1 and len(ref) == 1:
                kinds.add("snp")
                if frozenset((ref.upper(), a.upper())) in TRANSITIONS:
                    ts += 1
                else:
                    tv += 1
            elif len(a) != len(ref):
                kinds.add("indel")
            else:
                kinds.add("other")
        snp += "snp" in kinds
        indel += "indel" in kinds
        other += kinds == {"other"}
        if 1000000 <= pos <= 1050000:
            in_region_pos += 1
        if pos <= 1050000 and pos + len(ref) - 1 >= 1000000:
            in_region_overlap += 1
        fields = dict(kv.split("=", 1) for kv in info.split(";") if "=" in kv)
        if "AF" in fields and max(float(x) for x in fields["AF"].split(",")) >= 0.05:
            af5 += 1

print(f"total_records {total}")
print(f"snp_records {snp}")
print(f"indel_records {indel}")
print(f"other_records {other}")
print(f"transitions {ts} transversions {tv} ts_tv_ratio {ts / tv:.4f}")
print(f"records_in_region (POS in chr20:1000000-1050000) {in_region_pos}")
print(f"records_in_region (REF span overlaps the region) {in_region_overlap}")
print(f"records_af_5pct (INFO/AF >= 0.05) {af5}")
