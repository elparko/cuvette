import { mkdirSync, mkdtempSync, readFileSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { decodePng } from "../src/bench/png.ts";
import { writeXlsx } from "./fixtures/xlsx.ts";
import { zip } from "../src/eln/zip.ts";
import { agreement, agreementText, blandAltmanPng, compareLine, describeCandidate, findReferences, readTable, referenceValues } from "../src/core/reference.ts";


function project() {
  const root = mkdtempSync(join(tmpdir(), "cuvette-ref-"));
  const proj = join(root, "oxldl");
  mkdirSync(join(proj, "images"), { recursive: true });
  for (const s of ["Set 1", "Set 2", "Set 3"]) writeFileSync(join(proj, "images", `${s}.tif`), "x");
  writeXlsx(join(root, "Analysis.xlsx"), [{ name: "Ox-LDL", rows: [["Field", "Red dots", "Total cells"], ["Set 1", 530, 900], ["Set 2", 410, 800], ["Set 3", 300, 700]] }]);
  writeFileSync(join(proj, "unrelated.csv"), "a,b\n1,2\n");
  return { root, proj };
}

test("readTable reads csv and xlsx", () => {
  const { root, proj } = project();
  expect(readTable(join(proj, "unrelated.csv"))).toEqual([{ name: "unrelated.csv", columns: ["a", "b"], rows: [[1, 2]] }]);
  const [s] = readTable(join(root, "Analysis.xlsx"));
  expect(s).toEqual({ name: "Ox-LDL", columns: ["Field", "Red dots", "Total cells"], rows: [["Set 1", 530, 900], ["Set 2", 410, 800], ["Set 3", 300, 700]] });
});

test("the search looks in the project folder and its parent for files that name the samples", () => {
  const { root, proj } = project();
  const found = findReferences([proj, root], ["Set 1", "Set 2", "images"]);
  expect(found.map((c) => [c.path, c.sheet, c.matched])).toEqual([[join(root, "Analysis.xlsx"), "Ox-LDL", ["set1", "set2"]]]);
  expect(describeCandidate(found[0]!)).toBe("Analysis.xlsx (sheet Ox-LDL: Field, Red dots, Total cells)");
  expect(findReferences([join(proj, "images")], ["Set 1"])).toEqual([]);
});

test("the pilot reads the reference row of its sample and says the difference in plain words", () => {
  const { root } = project();
  const ref = { path: join(root, "Analysis.xlsx"), sheet: "Ox-LDL", mode: "compare" as const };
  expect(referenceValues(ref, "Set 1.tif")).toEqual({ "Red dots": 530, "Total cells": 900 });
  expect(referenceValues({ ...ref, columns: ["Red dots"] }, "set 2")).toEqual({ "Red dots": 410 });
  expect(referenceValues(ref, "Set 9")).toBeUndefined();
  expect(compareLine("positive cells", 296, 530, "Red dots")).toBe('positive cells: the agent got 296; the reference "Red dots" says 530 (56% of the reference).');
});

test("agreement gives the mean difference, the percent and the correlation, and the plot is a PNG", () => {
  const pairs = [
    { sample: "a", ours: 90, ref: 100, pilot: true },
    { sample: "b", ours: 180, ref: 200, pilot: false },
    { sample: "c", ours: 290, ref: 300, pilot: false },
  ];
  const a = agreement(pairs);
  expect(a.n).toBe(3);
  expect(a.meanDiff).toBeCloseTo(-13.333, 3);
  expect(a.meanPercent).toBeCloseTo(-7.778, 3);
  expect(a.r).toBeCloseTo(0.99834, 4);
  expect(agreementText("All samples", a)).toBe("All samples: 3 samples. Mean difference (agent minus reference) -13.33 (-7.778%). Correlation r = 0.9983.");
  const png = blandAltmanPng(pairs, join(mkdtempSync(join(tmpdir(), "cuvette-ba-")), "ba.png"));
  const img = decodePng(readFileSync(png));
  expect([img.width, img.height]).toEqual([480, 360]);
  expect(img.pixels.some((v) => v === 0)).toBe(true);
});

test("referenceValues takes the exact sample name before a longer name that contains it", () => {
  const dir = mkdtempSync(join(tmpdir(), "ga-ref-exact-"));
  const p = join(dir, "ref.csv");
  writeFileSync(p, "sample,count\nmouse10,99\nmouse1,5\n");
  expect(referenceValues({ path: p, mode: "compare" }, "mouse1")).toEqual({ count: 5 });
  writeFileSync(p, "sample,count\nmouse10,99\nmouse11,7\n");
  expect(referenceValues({ path: p, mode: "compare" }, "mouse1")).toBeUndefined();
  writeFileSync(p, "sample,count\nctrl,1\nctrl1,2\n");
  expect(referenceValues({ path: p, mode: "compare" }, "ctrl1_rep2")).toBeUndefined();
});

test("referenceValues does not match a sample to a longer name that contains it", () => {
  const dir = mkdtempSync(join(tmpdir(), "ga-ref-substring-"));
  const p = join(dir, "ref.csv");
  writeFileSync(p, "sample,count\nS10,99\n");
  expect(referenceValues({ path: p, mode: "compare" }, "S1")).toBeUndefined();
  expect(referenceValues({ path: p, mode: "compare" }, " s 10.TIF")).toEqual({ count: 99 });
});

test("readTable reads a semicolon file with decimal commas and a quoted comma", () => {
  const dir = mkdtempSync(join(tmpdir(), "ga-ref-semi-"));
  const p = join(dir, "ref.csv");
  writeFileSync(p, 'sample;note;area\nS1;"a, b";1,5\n');
  expect(readTable(p)[0]).toMatchObject({ columns: ["sample", "note", "area"], rows: [["S1", "a, b", 1.5]] });
});

test("agreementText leaves out the percent if no reference value is above zero", () => {
  const a = agreement([{ sample: "a", ours: 1, ref: 0, pilot: false }]);
  expect(agreementText("Count", a)).not.toContain("%");
});

test("readTable reads xlsx cells that have no r attribute or that have r after other attributes", () => {
  const sheet = `<worksheet><sheetData><row><c t="inlineStr"><is><t>Field</t></is></c><c t="inlineStr"><is><t>Red dots</t></is></c><c t="inlineStr"><is><t>Total</t></is></c></row><row><c t="inlineStr"><is><t>Set 1</t></is></c><c s="1" r="C2"><v>900</v></c></row><row><c t="inlineStr"><is><t>Set 2</t></is></c><c><v>410</v></c><c t="e"><v>#N/A</v></c></row></sheetData></worksheet>`;
  const files = [
    { name: "xl/workbook.xml", data: Buffer.from(`<workbook xmlns:r="r"><sheets><sheet name="S" sheetId="1" r:id="rId1"/></sheets></workbook>`) },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(`<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`) },
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheet) },
  ];
  const p = join(mkdtempSync(join(tmpdir(), "cuvette-ref-")), "plain.xlsx");
  writeFileSync(p, zip(files));
  const [s] = readTable(p);
  expect(s!.columns).toEqual(["Field", "Red dots", "Total"]);
  expect(s!.rows[0]).toEqual(["Set 1", undefined, 900]);
  expect(s!.rows[1]).toEqual(["Set 2", 410, null]);
});

test("a second search reads the folders again only after they change, so a parent folder with many files does not slow each turn", () => {
  const root = mkdtempSync(join(tmpdir(), "cuvette-refbig-"));
  for (let i = 0; i < 20000; i++) writeFileSync(join(root, `n${i}.txt`), "");
  const proj = join(root, "proj");
  mkdirSync(join(proj, "sub"), { recursive: true });
  writeFileSync(join(proj, "sub", "old_counts.csv"), "sample,count\nwell_a,3\n");
  const old = new Date(Date.now() - 60_000);
  for (const d of [root, proj, join(proj, "sub"), join(proj, "sub", "old_counts.csv")]) utimesSync(d, old, old);
  const t0 = performance.now();
  expect(findReferences([proj, root], ["counts"]).map((c) => c.path)).toEqual([join(proj, "sub", "old_counts.csv")]);
  const first = performance.now() - t0;
  const t1 = performance.now();
  findReferences([proj, root], ["counts"]);
  expect(performance.now() - t1).toBeLessThan(Math.max(20, first / 5));
  writeFileSync(join(root, "counts_summary.csv"), "sample,count\nwell_a,3\n");
  writeFileSync(join(proj, "sub", "old_counts.csv"), "sample,area,count\nwell_a,3,4\n");
  const again = findReferences([proj, root], ["counts", "area"]);
  expect(again.map((c) => c.path).sort()).toEqual([join(proj, "sub", "old_counts.csv"), join(root, "counts_summary.csv")].sort());
  expect(again.find((c) => c.path.endsWith("old_counts.csv"))!.columns).toEqual(["sample", "area", "count"]);
});

test("a file added in the same step of the modification time is found: a folder that changed in the last seconds is not cached", () => {
  const root = mkdtempSync(join(tmpdir(), "cuvette-refracy-"));
  writeFileSync(join(root, "a_counts.csv"), "sample,count\nwell_a,3\n");
  const was = statSync(root).mtime;
  expect(findReferences([root], ["counts"]).map((c) => c.path)).toEqual([join(root, "a_counts.csv")]);
  writeFileSync(join(root, "b_counts.csv"), "sample,count\nwell_b,4\n");
  utimesSync(root, was, was);
  expect(findReferences([root], ["counts"]).map((c) => c.path).sort()).toEqual([join(root, "a_counts.csv"), join(root, "b_counts.csv")]);
});
