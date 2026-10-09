# Reads the printed counts from the metadata sheet of the data set and the bounding box table (no adapter code).
# Run: uv run --no-project --with xlrd python -I check.py > check.out
import csv
import sys
from collections import Counter

import xlrd

R = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/reference/makrai2023-colonies"
names = ["sp14_img0%d.jpg" % i for i in range(1, 7)]
s = xlrd.open_workbook(R + "/images.xls").sheet_by_index(0)
counts = {s.cell_value(i, 1): (s.cell_value(i, 2), int(s.cell_value(i, 3))) for i in range(1, s.nrows)}
boxes = Counter(r["image_name"] for r in csv.DictReader(open(R + "/annot_tab.csv")))
for n in names:
    print("%s background %s, printed count %d, bounding boxes %d" % (n, counts[n][0], counts[n][1], boxes[n]))
print("total printed count of the six photos:", sum(counts[n][1] for n in names))
