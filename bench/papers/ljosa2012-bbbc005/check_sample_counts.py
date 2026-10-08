# Run: python3 check_sample_counts.py [data folder]
# Standard library only. Recomputes the sample values from the file names and the published counts.
import csv
import re
import sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/data/ljosa2012-bbbc005")
names = sorted(p.name for p in (root / "sub/BBBC005_v1_images").glob("*_w2.TIF") if not p.name.startswith("."))[::6]
truth = {n: int(re.search(r"_C(\d+)_", n).group(1)) for n in names}
with open(root / "BBBC005_results_bray.csv", newline="") as f:
    found = {r["Image_FileName_Nuclei"]: int(r["Image_Count_DetectedNuclei"]) for r in csv.DictReader(f)}
missing = [n for n in names if n not in found]
true_total = sum(truth.values())
det_total = sum(found[n] for n in names if n in found)
mae = sum(abs(found[n] - truth[n]) for n in names if n in found) / (len(names) - len(missing))
print(f"sampled images: {len(names)}, not in the published file: {len(missing)}")
print(f"true_total_sample (sum of C in the file names): {true_total}")
print(f"ratio_sample (published detected total / true total): {det_total / true_total:.4f}")
print(f"mean_abs_error_sample (published counts): {mae:.3f}")
