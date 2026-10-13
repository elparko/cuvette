import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, test } from "vitest";
import { adapterIndex, type AdapterSummary } from "../src/adapters/catalog.ts";
import { suggestLines, suggestPrograms } from "../src/core/suggest.ts";

let list: AdapterSummary[] = [];
beforeAll(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-suggest-home-"));
  list = adapterIndex(mkdtempSync(join(tmpdir(), "cuvette-suggest-cwd-")));
});

const folder = () => mkdtempSync(join(tmpdir(), "cuvette-suggest-"));
const put = (dir: string, name: string, head: Buffer | string = "x") => writeFileSync(join(dir, name), head);
const first = (dir: string) => suggestPrograms(dir, list).matches[0];

test("flow cytometry files rank FlowKit first and name the file count", () => {
  const d = folder();
  for (let i = 0; i < 12; i++) put(d, `s${i}.fcs`, Buffer.concat([Buffer.from("FCS3.1    "), Buffer.alloc(20)]));
  const m = first(d);
  expect(m.adapter).toBe("flowkit");
  expect(m.reason).toBe("12 .fcs files");
  expect(m.headline).toBe("These look like flow cytometry files. Use FlowKit?");
  expect(suggestPrograms(d, list).matches.map((x) => x.adapter)).toEqual(expect.arrayContaining(["flowcore", "cytof"]));
});

test("a czi file is found by its extension", () => {
  const d = folder();
  put(d, "scan.czi", "ZISRAWFILE");
  expect(first(d).adapter).toBe("bftools");
});

test("a file with no extension is found by its first bytes", () => {
  const d = folder();
  put(d, "run1", Buffer.concat([Buffer.from("ZISRAWFILE"), Buffer.alloc(8)]));
  const m = first(d);
  expect(m.adapter).toBe("bftools");
  expect(m.reason).toContain("matching header");
});

test("an h5ad file ranks a single-cell adapter first", () => {
  const d = folder();
  put(d, "cells.h5ad", Buffer.from([0x89, 0x48, 0x44, 0x46, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]));
  expect(first(d).adapter).toBe("scanpy");
});

test("an imzML file ranks a mass spectrometry imaging adapter first", () => {
  const d = folder();
  put(d, "tissue.imzML", '<?xml version="1.0"?>');
  put(d, "tissue.ibd");
  const m = first(d);
  expect(m.label).toBe("imaging mass spectrometry files");
  expect(m.adapter).toBe("pyimzml");
});

test("a folder of tif files ranks an image adapter first", () => {
  const d = folder();
  put(d, "a.tif", Buffer.from([0x49, 0x49, 0x2a, 0x00, 0, 0, 0, 0]));
  put(d, "b.tif", Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 0]));
  expect(first(d).adapter).toBe("image-assays");
});

test("an empty folder gives no match", () => {
  const r = suggestPrograms(folder(), list);
  expect(r.scanned).toBe(0);
  expect(r.matches).toEqual([]);
  expect(suggestLines(r)).toEqual([]);
});

test("a folder with only csv files gives the table route", () => {
  const d = folder();
  put(d, "a.csv", "a,b\n1,2\n");
  put(d, "b.csv", "a,b\n3,4\n");
  const m = first(d);
  expect(m.table).toBe(true);
  expect(m.adapter).toBe("tables");
  expect(m.reason).toBe("2 .csv files");
});

test("unknown files say that no program matches and offer the table route", () => {
  const d = folder();
  put(d, "data.xyz");
  const m = first(d);
  expect(m.table).toBe(true);
  expect(m.headline).toContain("No program matches these files");
});

test("the scan reads folders two levels down and no deeper", () => {
  const d = folder();
  mkdirSync(join(d, "a", "b", "c"), { recursive: true });
  put(join(d, "a", "b"), "ok.fcs", "FCS3.0");
  put(join(d, "a", "b", "c"), "deep.fcs", "FCS3.0");
  expect(first(d).count).toBe(1);
});

test("the scan leaves out the session folders that Cuvette wrote", () => {
  const d = folder();
  put(d, "a.csv", "a,b\n1,2\n");
  mkdirSync(join(d, "cuvette", "2026-10-12-run", ".record"), { recursive: true });
  put(join(d, "cuvette", "2026-10-12-run"), "samples.csv", "sample\n");
  put(join(d, "cuvette", "2026-10-12-run"), "README.txt", "x");
  const r = suggestPrograms(d, list);
  expect(r.scanned).toBe(1);
  expect(r.matches[0].reason).toBe("1 .csv file");
});

test("csv files do not count toward a specific adapter", () => {
  const d = folder();
  put(d, "a.abf", "ABF2");
  put(d, "a.csv", "a,b\n");
  const r = suggestPrograms(d, list);
  expect(r.matches[0].adapter).toBe("patch-clamp");
  expect(r.matches.every((m) => !m.table)).toBe(true);
});

test("in a folder with more files than the scan reads, the counts say at least", () => {
  const d = folder();
  for (let i = 0; i < 450; i++) put(d, `t${String(i).padStart(3, "0")}.csv`, "a,b\n");
  const r = suggestPrograms(d, list);
  expect(r.scanned).toBe(400);
  expect(r.matches[0]!.reason).toBe("at least 400 .csv files");
  const few = folder();
  put(few, "a.csv", "a,b\n");
  expect(suggestPrograms(few, list).matches[0]!.reason).toBe("1 .csv file");
});

test("a csv file whose first bytes look like an FCS header stays a table", () => {
  const d = folder();
  put(d, "export.csv", "FCS file,count\na.fcs,12\n");
  const m = first(d);
  expect(m.table).toBe(true);
  expect(m.adapter).toBe("tables");
});

test("an HDF5 file with the extension of one adapter does not match the other HDF5 adapters by header", () => {
  const d = folder();
  put(d, "cell1.nwb", Buffer.from([0x89, 0x48, 0x44, 0x46, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]));
  const r = suggestPrograms(d, list);
  expect(r.matches[0].adapter).toBe("patch-clamp");
  expect(r.matches.map((m) => m.adapter)).not.toContain("harmony");
});

test("the scan follows a link to a data file or a data folder", () => {
  const d = folder();
  const real = folder();
  put(real, "s1.fcs", "FCS3.0");
  put(real, "s2.fcs", "FCS3.0");
  symlinkSync(join(real, "s1.fcs"), join(d, "s1.fcs"));
  symlinkSync(real, join(d, "linked"));
  symlinkSync(join(real, "missing.fcs"), join(d, "broken.fcs"));
  symlinkSync(d, join(d, "up"));
  symlinkSync(join(d, "self.fcs"), join(d, "self.fcs"));
  const m = first(d);
  expect(m.adapter).toBe("flowkit");
  expect(m.count).toBe(3);
});
