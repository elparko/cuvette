import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { checkTable, isMissing, toNumber, type Table } from "../src/core/datacheck.ts";
import { compareChecks, summarizeTable } from "../src/core/datacompare.ts";
import { designChecks, readSheet, sheetCsv, sheetFromFiles, sheetFromTable, type SampleRow } from "../src/core/samples.ts";
import { linear, Rng, runs } from "./fuzz-rng.ts";

const root = mkdtempSync(join(tmpdir(), "cuvette-fuzz-datacheck-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const NAMES = ["sample", "Sample ID", "group", "treatment", "animal", "mouse id", "batch", "date", "value", "area (µm²)", "area (mm)", "area [um]", "time_s", "time (min)", "mass mg", "mass g", "count", "id", "", " ", "x", "Länge", "well", "replicate"];

function cell(r: Rng): string {
  const k = r.int(0, 14);
  if (k === 0) return "";
  if (k === 1) return String(r.int(-1000, 100000));
  if (k === 2) return r.logUniform(1e-6, 1e9).toFixed(r.int(0, 6));
  if (k === 3) return `${r.int(0, 99)},${r.int(0, 999)}`;
  if (k === 4) return r.pick(["NA", "n/a", "-", "nan", "?", ".", "null", "None", "#N/A", "—"]);
  if (k === 5) return r.pick(["Control", "control ", "CONTROL", "Drug A", "drug a", "WT", "KO", " KO"]);
  if (k === 6) return r.pick(["1e400", "-1e400", "1e-400", "9".repeat(400), "0x1F", "Infinity", "NaN", "1_000", "+.5", "5.", "'0042", " 12 "]);
  if (k === 7) return r.pick(["M1", "M2", "mouse 3", "A01", "rat-4", "donor 7"]);
  if (k === 8) return r.pick(["2024-01-02", "2024-01-03", "batch1", "run 2"]);
  if (k === 9) return r.string("abcXYZ019 ._-µ日\u0000\t", 1, 12);
  if (k === 10) return "x".repeat(r.int(100, 3000));
  return String(r.int(0, 30));
}

function table(r: Rng, maxRows = 40): Table {
  const width = r.int(1, 8);
  const columns = Array.from({ length: width }, () => r.pick(NAMES));
  const base = Array.from({ length: r.int(0, maxRows) }, () => Array.from({ length: width }, () => cell(r)));
  const rows = base.flatMap((row) => (r.bool(0.1) ? [row, [...row]] : [row]));
  return { columns, rows };
}

const clone = (t: Table): Table => ({ columns: [...t.columns], rows: t.rows.map((r) => [...r]) });

describe("fuzz: data check, samples and data compare", () => {
  test("checkTable takes any table, gives the same answer twice, and names only real rows", () => {
    const r = new Rng(10001);
    for (let i = 0; i < runs(400); i++) {
      const t = table(r);
      const a = checkTable(t, "t.csv");
      const b = checkTable(t, "t.csv");
      expect(b).toEqual(a);
      expect(checkTable(clone(t), "t.csv")).toEqual(a);
      for (const item of a.items) {
        for (const row of item.rows ?? []) {
          expect(row).toBeGreaterThanOrEqual(2);
          expect(row).toBeLessThanOrEqual(t.rows.length + 1);
        }
        expect(item.text).not.toMatch(/undefined|NaN/);
      }
      for (const [, n] of a.groups?.sizes ?? []) expect(n).toBeGreaterThan(0);
      expect((a.groups?.sizes ?? []).reduce((s, [, n]) => s + n, 0)).toBeLessThanOrEqual(t.rows.length);
    }
  });

  test("a number column reports each row with no value: no silent row loss", () => {
    const r = new Rng(10002);
    for (let i = 0; i < runs(400); i++) {
      const n = r.int(3, 40);
      const columns = ["value", r.pick(["group", "x"])];
      const rows = Array.from({ length: n }, () => [r.bool(0.8) ? String(r.int(0, 999)) : r.pick(["", "NA", "-", " "]), r.pick(["a", "b"])]);
      const t = { columns, rows };
      const c = checkTable(t, "t.csv");
      const gaps = rows.flatMap((row, k) => (isMissing(row[0]!) ? [k + 2] : []));
      const numbers = rows.filter((row) => toNumber(row[0]!) !== undefined).length;
      if (!gaps.length || numbers < 2 || gaps.length === n) continue;
      const item = c.items.find((x) => x.id === "missing:value");
      expect(item?.rows).toEqual(gaps);
    }
  });

  test("summarizeTable keeps each column, and a table compared with itself has no difference", () => {
    const r = new Rng(10003);
    for (let i = 0; i < runs(400); i++) {
      const t = table(r);
      if (r.bool()) checkTable(t, "t.csv");
      const s = summarizeTable(t, "t.csv");
      expect(s.columns.length).toBe(t.columns.length);
      expect(s.rows).toBe(t.rows.length);
      expect(summarizeTable(clone(t), "t.csv")).toEqual(s);
      expect(compareChecks(s, summarizeTable(clone(t), "t.csv"))).toEqual([]);
      if (t.columns.length >= 2) {
        const drop = r.int(0, t.columns.length - 1);
        const u = { columns: t.columns.filter((_, k) => k !== drop), rows: t.rows.map((row) => row.filter((_, k) => k !== drop)) };
        const diff = compareChecks(s, summarizeTable(u, "u.csv"));
        expect(diff.length, JSON.stringify({ columns: t.columns, drop })).toBeGreaterThan(0);
      }
      const other = table(r);
      for (const d of compareChecks(s, summarizeTable(other, "o.csv"))) expect(d.text).not.toMatch(/undefined|NaN/);
    }
  });

  test("a sample sheet from a table names every row once, and the CSV reads back", () => {
    const r = new Rng(10004);
    for (let i = 0; i < runs(300); i++) {
      const t = table(r);
      const sheet = sheetFromTable(t, join(root, "data.csv"));
      if (!sheet) continue;
      const seen: number[] = [];
      for (const row of sheet.rows) {
        const m = /(?:row|rows) ([\d, ]+)$/.exec(row.path);
        expect(m, row.path).toBeTruthy();
        seen.push(...m![1]!.split(", ").map(Number));
      }
      expect(seen.sort((a, b) => a - b)).toEqual(t.rows.map((_, k) => k + 2));
      const p = join(root, `s${i}.csv`);
      writeFileSync(p, sheetCsv(sheet.rows));
      const back = readSheet(p);
      const norm = (rows: SampleRow[]) => rows.map((x) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, v.trim()])));
      expect(norm(back)).toEqual(norm(sheet.rows));
      designChecks(sheet.rows, { n: r.pick(["mouse", "field", "cells", undefined]), test: r.pick(["Mann-Whitney", "t-test", undefined]) });
    }
  });

  test("a sample sheet from file names keeps every file", () => {
    const r = new Rng(10005);
    const parts = ["Control", "Drug", "M1", "M2", "mouse3", "2024-01-02", "batch1", "plate 1", "a b", "日本", ""];
    for (let i = 0; i < runs(300); i++) {
      const rels = [...new Set(Array.from({ length: r.int(1, 40) }, () => [...Array.from({ length: r.int(0, 3) }, () => r.pick(parts)).filter(Boolean), `${r.pick(["img", "Control_M1", "KO-3", "field"])}${r.int(0, 20)}${r.pick(["", "_c1", "_DAPI", "-ch2"])}.${r.pick(["tif", "png", "czi"])}`].join("/")))];
      const sheet = sheetFromFiles(rels, root);
      const covered = (rel: string) => sheet.rows.some((row) => row.path === rel || (row.path.endsWith("*") && rel.startsWith(row.path.slice(0, -1))));
      for (const rel of rels) expect(covered(rel), rel).toBe(true);
      expect(new Set(sheet.rows.map((x) => x.sample)).size).toBeLessThanOrEqual(sheet.rows.length);
      designChecks(sheet.rows, { n: "mouse", test: "Mann-Whitney" });
    }
  });

  test("the checks run in linear time", () => {
    const make = (n: number) => {
      const lines = ["sample,group,value,area (mm),area (um)"];
      for (let k = 0; k < n; k++) lines.push(`M${k % 997},${["a", "b", "c"][k % 3]},${(k * 7919) % 1000},${k % 50},${k % 51}`);
      return lines.join("\n");
    };
    const parse = (s: string): Table => {
      const [head, ...rows] = s.split("\n");
      return { columns: head!.split(","), rows: rows.map((l) => l.split(",")) };
    };
    for (const run of [(t: Table) => checkTable(t, "t"), (t: Table) => summarizeTable(t, "t"), (t: Table) => sheetFromTable(t, "t.csv"), (t: Table) => designChecks(sheetFromTable(t, "t.csv")!.rows)]) {
      const res = linear(make, (s) => run(parse(s)), 5000);
      expect(res.ok, JSON.stringify(res)).toBe(true);
    }
  });
});
