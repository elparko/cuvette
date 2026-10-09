import os
from datetime import date

from openpyxl import Workbook

here = os.path.dirname(os.path.abspath(__file__))
wb = Workbook()
ws = wb.active
ws.title = "Counts"
ws["A1"] = "RNAscope counts, batch 4 (synthetic test data)"
ws["D3"] = "Control"
ws.merge_cells("D3:E3")
ws["F3"] = "Knockdown"
ws.merge_cells("F3:G3")
for col, text in zip("CDEFG", ["Sample", "Red dots", "Total cells", "Red dots", "Total cells"]):
    ws[col + "5"] = text
control = [10, 12, 14, 16, 18, 20]
knockdown = [5, 6, 4, 5, 7, 3]
for i in range(6):
    r = 6 + i
    ws["C%d" % r] = "Slice %d" % (i + 1)
    ws["D%d" % r], ws["E%d" % r] = control[i], 100
    ws["F%d" % r], ws["G%d" % r] = knockdown[i], 50
ws["C12"], ws["D12"] = "Slice 7", "lost"
ws["C13"], ws["D13"], ws["E13"], ws["F13"], ws["G13"] = "Average", 15, 100, 5, 50
ws["C15"] = "Note: slice 4 knockdown was imaged twice, the second image is used"
ws["I3"] = "Imaging"
ws["I5"], ws["J5"] = "Date", "Slide"
for i, (d, s) in enumerate([(date(2026, 9, 1), "S-101"), (date(2026, 9, 2), "S-102"), (date(2026, 9, 3), "S-103")]):
    ws["I%d" % (6 + i)], ws["J%d" % (6 + i)] = d, s
ws["L10"] = "ask PI about slide 3"
wb.create_sheet("Plate map")["A1"] = "empty plate map"
wb.save(os.path.join(here, "messy_lab.xlsx"))

with open(os.path.join(here, "slices.csv"), "w") as f:
    f.write("Sample,Section depth (um)\n")
    for i in range(5):
        f.write("Slice %d,%d\n" % (i + 1, 40 + 10 * i))
