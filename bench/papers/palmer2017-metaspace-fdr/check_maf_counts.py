# Run: python3 -I check_maf_counts.py <MTBLS313 v2 MAF tsv>
# Counts sum formulas in the MetaboLights annotation table with the csv module. No METASPACE code.
import csv
import sys

rows = list(csv.DictReader(open(sys.argv[1], newline=""), delimiter="\t"))
print("rows", len(rows))
print("unique formulas, all rows", len({r["chemical_formula"] for r in rows}))


def present(r, col):
    v = (r.get(col) or "").strip()
    return v not in ("", "0", "0.0", "NA", "nan")


def formulas(col):
    return {r["chemical_formula"] for r in rows if present(r, col)}


cols = ["a2s1", "a2s2", "a2s3", "a2s4", "a2s5"]
for c in cols + ["a1s1", "a1s2", "a1s3", "a1s4", "a1s5"]:
    print(c, len(formulas(c)))
s1, s2, s3 = (formulas(c) for c in cols[:3])
print("a2 s1 to s3: in all three", len(s1 & s2 & s3), "union", len(s1 | s2 | s3))
print("a2 s1 to s5: union", len(set().union(*(formulas(c) for c in cols))))
print("formulas with an entry in any a1 or a2 column", len({r["chemical_formula"] for r in rows if any(present(r, c) for c in cols + ["a1s1", "a1s2", "a1s3", "a1s4", "a1s5"])}))
