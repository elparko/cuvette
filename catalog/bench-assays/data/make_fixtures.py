import math
import os

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
PROTEIN_COLUMNS = ["Sample", "Type", "Concentration", "Absorbance", "Dilution"]


def write(name, rows, columns):
    frame = pd.DataFrame(rows, columns=columns)
    path = os.path.join(HERE, name)
    if name.endswith(".xlsx"):
        frame.to_excel(path, index=False, sheet_name="Counts")
    else:
        frame.to_csv(path, index=False)
    return frame


def duplicate(label, kind, conc, signal, dilution, noise):
    return [[label, kind, conc, round(signal + noise, 6), dilution], [label, kind, conc, round(signal - noise, 6), dilution]]


def protein_linear():
    rows = [["Blank", "blank", 0, 0.100, 1], ["Blank", "blank", 0, 0.100, 1]]
    for c in (200, 400, 600, 800, 1000):
        rows += duplicate("Std %d" % c, "standard", c, 0.100 + 0.001 * c, 1, 0.01)
    for label, well, dil in (("S1", 300, 2), ("S2", 800, 1), ("S low", 100, 1), ("S high", 1500, 1)):
        rows += duplicate(label, "sample", None, 0.100 + 0.001 * well, dil, 0.005)
    frame = write("protein_linear.csv", rows, PROTEIN_COLUMNS)
    std = frame[frame["Type"] == "standard"]
    m, b = np.polyfit(std["Concentration"], std["Absorbance"] - 0.100, 1)
    assert abs(m - 0.001) < 1e-12 and abs(b) < 1e-12
    wells = (frame[frame["Sample"] == "S1"]["Absorbance"] - 0.100 - b) / m
    assert abs(wells.mean() - 300) < 1e-9 and abs(wells.std(ddof=1) - 5 * math.sqrt(2)) < 1e-9
    print("protein_linear: slope 0.001, intercept 0, S1 300 x 2 = 600, SD", 5 * math.sqrt(2), "CV %", 5 * math.sqrt(2) / 300 * 100)


def protein_quadratic():
    f = lambda x: 0.02 + 0.0012 * x - 1.5e-7 * x * x
    rows = [["Blank", "blank", 0, 0.070, 1], ["Blank", "blank", 0, 0.070, 1]]
    for c in (100, 250, 500, 1000, 1500, 2000):
        rows += duplicate("Std %d" % c, "standard", c, 0.070 + f(c), 1, 0.004)
    for label, well in (("Q1", 750), ("Q2", 1250)):
        rows += duplicate(label, "sample", None, 0.070 + f(well), 1, 0.0)
    frame = write("protein_quadratic.csv", rows, PROTEIN_COLUMNS)
    std = frame[frame["Type"] == "standard"]
    a, b, c = np.polyfit(std["Concentration"], std["Absorbance"] - 0.070, 2)
    assert abs(a + 1.5e-7) < 1e-12 and abs(b - 0.0012) < 1e-10 and abs(c - 0.02) < 1e-8
    print("protein_quadratic: a -1.5e-7, b 0.0012, c 0.02; Q1 750, Q2 1250")


def protein_4pl():
    bottom, top, mid, hill = 0.02, 1.60, 500.0, 1.4
    f = lambda x: top + (bottom - top) / (1 + (x / mid) ** hill)
    rows = [["Blank", "blank", 0, 0.050, 1], ["Blank", "blank", 0, 0.050, 1]]
    for c in (25, 50, 125, 250, 500, 750, 1000, 1500, 2000):
        rows += duplicate("Std %d" % c, "standard", c, 0.050 + f(c), 1, 0.0)
    for label, well in (("B200", 200), ("B600", 600), ("B1200", 1200)):
        rows += duplicate(label, "sample", None, 0.050 + f(well), 1, 0.0)
    write("protein_4pl.csv", rows, PROTEIN_COLUMNS)
    print("protein_4pl: bottom", bottom, "top", top, "midpoint", mid, "hill", hill, "samples 200, 600, 1200")


def western():
    raw = [
        ("Lane 1", "Control", 1, "Blot A", 1000, 100, 2000, 200),
        ("Lane 2", "Treated", 1, "Blot A", 2100, 100, 2200, 200),
        ("Lane 3", "Control", 2, "Blot B", 1300, 100, 2200, 200),
        ("Lane 4", "Treated", 2, "Blot B", 3100, 100, 2700, 200),
        ("Lane 5", "Control", 3, "Blot C", 700, 100, 1700, 200),
        ("Lane 6", "Treated", 3, "Blot C", 1500, 100, 1200, 200),
    ]
    write("western_blots.csv", raw, ["Sample", "Group", "Experiment", "Blot", "Target", "Target_bg", "Reference", "Reference_bg"])
    ratios = {"Control": [], "Treated": []}
    for _, g, _, _, t, tb, r, rb in raw:
        ratios[g].append((t - tb) / (r - rb))
    ctrl = float(np.mean(ratios["Control"]))
    pooled = {g: [v / ctrl for v in vals] for g, vals in ratios.items()}
    within = {g: [v / ratios["Control"][i] for i, v in enumerate(vals)] for g, vals in ratios.items()}
    for name, d in (("pooled", pooled), ("within_block", within)):
        for g, vals in d.items():
            print("western", name, g, "mean", np.mean(vals), "sd", np.std(vals, ddof=1), "mean log2", np.mean(np.log2(vals)))
    print("western without background, lane 2 ratio", 2100 / 2200)


def luciferase():
    data = {
        ("Empty vector", 1): [(1000, 500), (1200, 500)], ("Treated", 1): [(4000, 500), (4400, 500)],
        ("Empty vector", 2): [(900, 300), (1500, 500)], ("Treated", 2): [(2700, 300), (3000, 250)],
        ("Empty vector", 3): [(2000, 1000), (1600, 800)], ("Treated", 3): [(5000, 1000), (3000, 600)],
    }
    rows, n = [], 0
    for (g, rep), wells in data.items():
        for ff, rl in wells:
            n += 1
            rows.append(["W%02d" % n, g, rep, ff, rl])
    write("dual_luciferase.csv", rows, ["Well", "Group", "Replicate", "Firefly", "Renilla"])
    unit = {k: np.mean([a / b for a, b in v]) for k, v in data.items()}
    ctrl = np.mean([unit[("Empty vector", r)] for r in (1, 2, 3)])
    for g in ("Empty vector", "Treated"):
        vals = [unit[(g, r)] / ctrl for r in (1, 2, 3)]
        print("luciferase", g, "mean", np.mean(vals), "sd", np.std(vals, ddof=1))
    print("luciferase control mean", ctrl)


def cells():
    write("cell_counts.xlsx", [["A", 50, 10, 4], ["A", 60, 10, 4], ["B", 100, 5, 4], ["C", 12, 3, 4]], ["Sample", "Live", "Dead", "Squares"])
    a = [50 / 4 * 1e4 * 2, 60 / 4 * 1e4 * 2]
    print("cells A live/mL", np.mean(a), "SD", np.std(a, ddof=1), "CV %", np.std(a, ddof=1) / np.mean(a) * 100, "viability", 110 / 130 * 100)
    print("cells B live/mL", 100 / 4 * 1e4 * 2, "viability", 100 / 105 * 100, "C live/mL", 12 / 4 * 1e4 * 2)
    print("plan 1e6 cells: A", 1e6 / np.mean(a), "mL; B", 1e6 / 500000, "mL; density 2e5 in 10 mL: A", 2e6 / np.mean(a), "C", 2e6 / 60000)
    write("counter_export.csv", [["X", 1.2e6, 1.5e6, 80], ["Y", None, 2.0e6, 90]], ["Sample", "Live/mL", "Total/mL", "Viability"])
    print("counter X dead/mL", 1.5e6 - 1.2e6, "Y live/mL", 2e6 * 0.9)


def nucleic():
    rows = [["N1", 0.900, 0.500, 0.450, 0.000], ["N2", 0.600, 0.400, 0.500, 0.000], ["N3", 0.520, 0.320, 0.270, 0.020], ["N4", 0.050, 0.027, 0.024, 0.000]]
    write("nanodrop.csv", rows, ["Sample", "A260", "A280", "A230", "A320"])
    print("dsDNA N1 conc", 0.9 * 50, "ratios", 0.9 / 0.5, 0.9 / 0.45, "RNA, 5 mm, dilution 2:", 0.9 * 40 * (10 / 5) * 2)
    print("N3 with A320: conc", 0.5 * 50, "ratios", 0.5 / 0.3, 0.5 / 0.25, "N4 conc", 0.05 * 50)


if __name__ == "__main__":
    for fn in (protein_linear, protein_quadratic, protein_4pl, western, luciferase, cells, nucleic):
        fn()
