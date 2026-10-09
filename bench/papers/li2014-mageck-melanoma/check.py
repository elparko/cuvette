# Reads the gene summary files of the MAGeCK command line program (version 0.5.9.5) for the two melanoma comparisons.
# Run the program first, for example:
#   mageck test -k melanoma_counts.txt -t PLX14_R1,PLX14_R2 -c D14_R1,D14_R2 -n mel14
#   mageck test -k melanoma_counts.txt -t PLX7_R1,PLX7_R2 -c D7_R1,D7_R2 -n mel7
# Then: python -I check.py mel14.gene_summary.txt mel7.gene_summary.txt > check.out
import csv
import sys


def load(path):
    with open(path, newline="") as f:
        return {r["id"]: r for r in csv.DictReader(f, delimiter="\t")}


d14, d7 = load(sys.argv[1]), load(sys.argv[2])
print("genes ranked: day 14 %d, day 7 %d" % (len(d14), len(d7)))
for g in ["MED12", "NF2", "CUL3", "TADA2B", "NF1", "CDH13", "TADA1", "PPT1"]:
    r = d14[g]
    print("day 14 %s: positive rank %s, FDR %s" % (g, r["pos|rank"], r["pos|fdr"]))
r = d14["RREB1"]
print("day 14 RREB1: negative rank %s, FDR %s" % (r["neg|rank"], r["neg|fdr"]))
r = d7["EGFR"]
print("day 7 EGFR: negative rank %s, FDR %s" % (r["neg|rank"], r["neg|fdr"]))
print("day 7 positive ranks:", ", ".join("%s %s" % (g, d7[g]["pos|rank"]) for g in ["MED12", "NF2", "CUL3", "TADA2B", "NF1", "TADA1"]))
