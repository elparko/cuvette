import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { decodePng } from "../src/bench/png.ts";
import { writeXlsx } from "./fixtures/xlsx.ts";
import { agreement, agreementText, blandAltmanPng, compareLine, describeCandidate, findReferences, readTable, referenceValues } from "../src/core/reference.ts";


function project() {
  const root = mkdtempSync(join(tmpdir(), "ga-ref-"));
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
  const png = blandAltmanPng(pairs, join(mkdtempSync(join(tmpdir(), "ga-ba-")), "ba.png"));
  const img = decodePng(readFileSync(png));
  expect([img.width, img.height]).toEqual([480, 360]);
  expect(img.pixels.some((v) => v === 0)).toBe(true);
});
