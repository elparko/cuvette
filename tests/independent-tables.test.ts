import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("tables");
const python = join(homedir(), ".cuvette/envs/biostats/bin/python");
const slow = 600_000;
const data = join(CATALOG, "tables/data");

describe.skipIf(!found || !existsSync(python))("tables against the Python standard library and numpy", () => {
  let tables: OpenAdapter;
  let root: string;
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "cuvette-tables-"));
    tables = await openAdapter("tables");
  });
  afterAll(async () => {
    await tables?.close();
    rmSync(root, { recursive: true, force: true });
  });

  // The standard library module statistics: stdev is the sample SD (STDEV.S in Excel), quantiles with method inclusive is QUARTILE.INC.
  test("the group summary agrees with the statistics module for n, mean, SD, SEM, median, quartiles and the per-row ratio", { timeout: slow }, async () => {
    const file = join(root, "groups.csv");
    const want = await pyJson<Record<string, number[]>>(
      python,
      `
import csv, random, statistics as st, math
random.seed(3)
rows = []
for g in ("ctl", "drug", "rescue"):
    for i in range(random.randint(4, 9)):
        red = round(random.uniform(1, 40), 3); tot = round(random.uniform(20, 80), 3)
        rows.append((g, red, tot))
rows.append(("ctl", "", 50.0))
rows.append(("drug", 7.5, 0.0))
with open(${JSON.stringify(file)}, "w", newline="") as f:
    w = csv.writer(f); w.writerow(["Group", "Red dots", "Total cells"]); w.writerows(rows)
out = {}
for g in ("ctl", "drug", "rescue"):
    v = [r[1] for r in rows if r[0] == g and r[1] != ""]
    q = st.quantiles(v, n=4, method="inclusive")
    out[g + "/Red dots"] = [len(v), st.mean(v), st.stdev(v), st.stdev(v) / math.sqrt(len(v)), st.median(v), q[0], q[2], q[2] - q[0], min(v), max(v)]
    ratio = [r[1] / r[2] * 100 for r in rows if r[0] == g and r[1] != "" and r[2] != 0]
    q = st.quantiles(ratio, n=4, method="inclusive")
    out[g + "/Red %"] = [len(ratio), st.mean(ratio), st.stdev(ratio), st.stdev(ratio) / math.sqrt(len(ratio)), st.median(ratio), q[0], q[2], q[2] - q[0], min(ratio), max(ratio)]
print(json.dumps(out))`,
    );
    const out = await tables.run("summarize_table", { path: file, group_by: ["Group"], values: ["Red dots"], ratios: { "Red %": "Red dots / Total cells * 100" } });
    expect(out.table.columns).toEqual(["Group", "variable", "n", "mean", "sd", "sem", "median", "q1", "q3", "iqr", "min", "max"]);
    const rows = out.table.rows as (string | number)[][];
    expect(rows.length).toBe(6);
    for (const r of rows) {
      const expected = want[`${r[0]}/${r[1]}`];
      expect(expected, `${r[0]}/${r[1]}`).toBeDefined();
      expected.forEach((v, i) => expect(Math.abs((r[2 + i] as number) - v), `${r[0]}/${r[1]} column ${i}`).toBeLessThan(1e-9));
    }
  });

  // Join, filter, pivot, melt and sort are done here with plain Python lists and dictionaries.
  test("a left join, a filter, a pivot, a melt and a descending sort give the rows of a hand computation", { timeout: slow }, async () => {
    const left = join(root, "left.csv");
    const right = join(root, "right.csv");
    writeFileSync(left, "Sample,Dose,Signal\ns1,0,1.5\ns2,0,2.5\ns3,10,3.5\ns4,10,4.5\ns5,20,5.5\nsX,20,6.5\n");
    writeFileSync(right, "Sample,Batch\ns1,A\ns2,A\ns3,B\ns4,B\ns5,B\n");
    const joined = await tables.run("reshape_table", { path: left, join: { path: right, on: "Sample", how: "left" }, sort: ["-Signal"], name: "joined" });
    expect(joined.metrics.n_unmatched).toBe(1);
    expect(joined.metrics.n_rows).toBe(6);
    const rows = joined.table.rows as (string | number | null)[][];
    expect(rows.map((r) => r[0])).toEqual(["sX", "s5", "s4", "s3", "s2", "s1"]);
    expect(rows.map((r) => r[3])).toEqual([null, "B", "B", "B", "A", "A"]);

    const inner = await tables.run("reshape_table", { path: left, join: { path: right, on: "Sample", how: "inner" } });
    expect(inner.metrics.n_rows).toBe(5);
    const outer = await tables.run("reshape_table", { path: left, join: { path: right, on: ["Sample"], how: "outer" } });
    expect(outer.metrics.n_rows).toBe(6);

    const filtered = await tables.run("reshape_table", { path: left, filter: "Dose >= 10 and Signal < 6", compute: { Double: "Signal * 2" }, select: ["Sample", "Double"] });
    expect(filtered.table.rows).toEqual([["s3", 7], ["s4", 9], ["s5", 11]]);

    const wide = await tables.run("reshape_table", { path: left, pivot: { index: "Sample", columns: "Dose", values: "Signal" } });
    expect(wide.table.columns).toEqual(["Sample", "0", "10", "20"]);
    expect(wide.table.rows.find((r) => r[0] === "s3")).toEqual(["s3", null, 3.5, null]);

    const long = await tables.run("reshape_table", { path: wide.data.path, melt: { id_columns: ["Sample"], value_columns: ["0", "10", "20"], name: "Dose", value: "Signal" } });
    expect(long.metrics.n_rows).toBe(18);
  });

  // numpy.polyfit gives the least squares line and numpy.corrcoef gives r.
  test("the scatter fit gives the slope, the intercept and r of numpy for each group, and the bar and box plots give the means and the medians", { timeout: slow }, async () => {
    const file = join(root, "scatter.csv");
    const want = await pyJson<Record<string, number>>(
      python,
      `
import numpy as np
rng = np.random.default_rng(5)
x = np.arange(1, 13, dtype=float)
a = 2.0 * x[:6] + 1 + rng.normal(0, 0.7, 6)
b = -0.5 * x[6:] + 9 + rng.normal(0, 0.7, 6)
with open(${JSON.stringify(file)}, "w") as f:
    f.write("Dose,Response,Arm\\n")
    for xi, yi in zip(x[:6], a): f.write("%r,%r,A\\n" % (float(xi), float(yi)))
    for xi, yi in zip(x[6:], b): f.write("%r,%r,B\\n" % (float(xi), float(yi)))
out = {}
for name, xs, ys in (("A", x[:6], a), ("B", x[6:], b)):
    s, i = np.polyfit(xs, ys, 1)
    out["slope_" + name], out["intercept_" + name], out["r_" + name] = float(s), float(i), float(np.corrcoef(xs, ys)[0, 1])
    out["mean_" + name], out["median_" + name] = float(ys.mean()), float(np.median(ys))
print(json.dumps(out))`,
    );
    const sc = await tables.run("make_plot", { path: file, kind: "scatter", x: "Dose", x_label: "Dose (uM)", y: "Response", y_label: "Response (%)", group: "Arm", fit: true });
    for (const g of ["A", "B"]) {
      expect(Math.abs(sc.metrics[`slope_${g}`] - want[`slope_${g}`])).toBeLessThan(1e-9);
      expect(Math.abs(sc.metrics[`intercept_${g}`] - want[`intercept_${g}`])).toBeLessThan(1e-9);
      expect(Math.abs(sc.metrics[`r_${g}`] - want[`r_${g}`])).toBeLessThan(1e-9);
    }
    const bar = await tables.run("make_plot", { path: file, kind: "bar", x: "Arm", y: "Response", y_label: "Response (%)", error_bars: "SEM" });
    const box = await tables.run("make_plot", { path: file, kind: "box", x: "Arm", y: "Response", y_label: "Response (%)" });
    for (const g of ["A", "B"]) {
      expect(Math.abs(bar.metrics[`mean_${g}`] - want[`mean_${g}`])).toBeLessThan(1e-9);
      expect(Math.abs(box.metrics[`median_${g}`] - want[`median_${g}`])).toBeLessThan(1e-9);
    }
  });

  // The long table is checked well by well against the grid values that the test writes. A cell with OVRFLW or a blank cell must stay missing and must not become zero.
  test("the plate reader grids give one row per well with the value of the grid, the plate map text and the missing wells counted", { timeout: slow }, async () => {
    const grid = join(root, "plate.csv");
    const map = join(root, "plate_map.csv");
    const rowsText = ["Plate:,Read 1", ",,1,2,3,4,5,6"];
    const value = (r: number, c: number) => Math.round((r * 100 + c * 7 + 0.5) * 100) / 100;
    for (let r = 0; r < 4; r++) {
      const letter = "ABCD"[r];
      const cells = Array.from({ length: 6 }, (_, c) => (r === 1 && c === 2 ? "OVRFLW" : r === 2 && c === 4 ? "" : String(value(r + 1, c + 1))));
      rowsText.push(`,${letter},${cells.join(",")}`);
    }
    writeFileSync(grid, rowsText.join("\n") + "\n");
    writeFileSync(map, "Well,Sample\n" + ["A01,blank", "B03,std1", "C05,std2", "D06,unk"].join("\n") + "\n");
    const out = await tables.run("read_plate", { path: grid, plate_map: map });
    expect(out.metrics).toMatchObject({ n_wells: 24, n_values: 22, n_missing: 2, n_overflow: 1, n_empty: 1 });
    const csv = (await import("node:fs/promises")).readFile;
    const text = (await csv(out.data.path, "utf8")).trim().split("\n").map((l) => l.split(","));
    const head = text[0];
    const at = (n: string) => head.indexOf(n);
    expect(text.length - 1).toBe(24);
    for (const r of text.slice(1)) {
      const row = "ABCD".indexOf(r[at("row")]) + 1;
      const col = Number(r[at("col")]);
      expect(r[at("well")]).toBe(`${r[at("row")]}${col}`);
      if ((row === 2 && col === 3) || (row === 3 && col === 5)) expect(r[at("value")]).toBe("");
      else expect(Number(r[at("value")])).toBeCloseTo(value(row, col), 9);
    }
    const mapped = Object.fromEntries(text.slice(1).filter((r) => r[at("map")] || r[at("Sample")]).map((r) => [r[at("well")], r[at("Sample")]]));
    expect(mapped).toEqual({ A1: "blank", B3: "std1", C5: "std2", D6: "unk" });
  });

  // The SoftMax Pro fixture has no row letters. Row 1 of the block is A. Plate 2 has one blank cell at row C, column 4 (plate_softmax_pro.tsv, line 14).
  test("a SoftMax Pro file without row letters gives the row letters from the row order and keeps the blank cell missing", { timeout: slow }, async () => {
    const out = await tables.run("read_plate", { path: join(data, "plate_softmax_pro.tsv") });
    expect(out.metrics.n_blocks).toBe(2);
    expect(out.metrics.n_empty).toBe(1);
    const text = (await (await import("node:fs/promises")).readFile(out.data.path, "utf8")).trim().split("\n").map((l) => l.split(","));
    const at = (n: string) => text[0].indexOf(n);
    const plate1 = text.slice(1).filter((r) => r[at("block")] === text[1][at("block")]);
    const a1 = plate1.find((r) => r[at("well")] === "A1")!;
    const h12 = plate1.find((r) => r[at("well")] === "H12")!;
    expect(Number(a1[at("value")])).toBeCloseTo(0.05, 9);
    expect(Number(h12[at("value")])).toBeCloseTo(0.422, 9);
    const blank = text.slice(1).filter((r) => r[at("value")] === "");
    expect(blank.map((r) => r[at("well")])).toEqual(["C4"]);
  });
  test("a plot of a column without numbers stops with a message, and a plot with some text rows says how many rows it left out", { timeout: slow }, async () => {
    const file = join(root, "text.csv");
    writeFileSync(file, "Dose,Resp,Arm\nlow,1,A\nhigh,2,A\nmid,3,B\n");
    const scatter = await tables.run("make_plot", { path: file, kind: "scatter", x: "Dose", x_label: "Dose (uM)", y: "Resp", y_label: "Response (%)" }).catch((e: Error) => e);
    expect(String(scatter)).toContain("The column Dose has no numbers");
    const bar = await tables.run("make_plot", { path: file, kind: "bar", x: "Arm", y: "Dose", y_label: "Dose (uM)" }).catch((e: Error) => e);
    expect(String(bar)).toContain("The column Dose has no numbers");
    const mixed = join(root, "mixed.csv");
    writeFileSync(mixed, "Dose,Resp\n1,2\n2,4.1\nn.d.,5\n4,8.2\n");
    const out = await tables.run("make_plot", { path: mixed, kind: "scatter", x: "Dose", x_label: "Dose (uM)", y: "Resp", y_label: "Response (%)", fit: true });
    expect(out.metrics.n).toBe(3);
    expect(out.summary).toContain("1 of 4 rows have no number in Dose");
  });
  for (const label of ["None", "NA", "null"]) {
    test(`the group summary keeps a group named ${label}`, { timeout: slow }, async () => {
      const file = join(root, `label-${label}.csv`);
      writeFileSync(file, `Group,Value\n${label},1\n${label},3\nA,10\nA,12\n`);
      const out = await tables.run("summarize_table", { path: file, group_by: ["Group"], values: ["Value"] });
      const groups = out.table.rows.map((r) => r[0]);
      expect(groups).toEqual([label, "A"]);
      expect(out.table.rows.map((r) => r[2])).toEqual([2, 2]);
    });
  }
});
