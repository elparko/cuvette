# Run: sage check_fdr_config.json -o <out> ; python3 -I check_fdr.py <out>/results.sage.tsv
# Recounts the PSM table and the FDR from the target and decoy labels in plain Python.
# It does not use the q-value columns of Sage. Only the PSM scores come from Sage.
import csv
import re
import sys

rows = list(csv.DictReader(open(sys.argv[1]), delimiter="\t"))
print("psms_result_table", len(rows))
print("decoy_psms", sum(r["label"] == "-1" for r in rows))


def qvalues(rows, plus_one):
    order = sorted(rows, key=lambda r: -float(r["sage_discriminant_score"]))
    fdr, t, d = [], 0, 0
    for r in order:
        if r["label"] == "1":
            t += 1
        else:
            d += 1
        fdr.append(((d + 1) if plus_one else d) / max(t, 1))
    q, low = [0.0] * len(order), float("inf")
    for i in range(len(order) - 1, -1, -1):
        low = min(low, fdr[i])
        q[i] = low
    return list(zip(order, q))


for plus_one in (True, False):
    qs = qvalues(rows, plus_one)
    tag = "(decoys + 1) / targets" if plus_one else "decoys / targets"
    for thr in (0.01, 0.05):
        kept = [r for r, q in qs if q <= thr]
        tgt = [r for r in kept if r["label"] == "1"]
        peps = {r["peptide"] for r in tgt}
        bare = {re.sub(r"\[[^\]]*\]", "", p) for p in peps}
        print(f"{tag} at {thr}: target_psms {len(tgt)}, decoy_psms_kept {len(kept) - len(tgt)}, distinct peptides {len(peps)} (without modifications {len(bare)})")

sage_1 = [r for r in rows if r["label"] == "1" and float(r["spectrum_q"]) <= 0.01]
sage_5 = [r for r in rows if r["label"] == "1" and float(r["spectrum_q"]) <= 0.05]
print("for comparison, Sage spectrum_q column: target_psms at 0.01", len(sage_1), "at 0.05", len(sage_5))
