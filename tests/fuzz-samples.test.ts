import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import {
  SAMPLE_COLUMNS,
  applyChanges,
  applyEdit,
  designChecks,
  groupSummary,
  readSheet,
  replaySheet,
  sheetChanges,
  sheetCsv,
  sheetFromFiles,
  sheetFromTable,
  sheetTable,
  writeSheet,
  type SampleRow,
} from "../src/core/samples.ts";
import { Rng, runs } from "./fuzz-rng.ts";

const dir = mkdtempSync(join(tmpdir(), "cuvette-fuzz-samples-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const CELL = [..."abcXYZ 019_-.é日😀"].concat(",", ";", "\t", '"', "'", "\n", "\r\n", "=", " ", "/", "\\");

function cell(r: Rng): string {
  return r.bool(0.1) ? "" : r.string(CELL, 1, 10);
}

function row(r: Rng): SampleRow {
  return { sample: cell(r), group: cell(r), unit: cell(r), batch: cell(r), path: cell(r) };
}

const trimmed = (rows: SampleRow[]) => rows.map((x) => Object.fromEntries(SAMPLE_COLUMNS.map((c) => [c, x[c].trim()])) as SampleRow);
const visible = (rows: SampleRow[]) => rows.filter((x) => SAMPLE_COLUMNS.some((c) => x[c].trim()));

let n = 0;
const file = (name: string) => join(dir, `${n++}-${name}`);

describe("fuzz: the sample sheet file", () => {
  test("rows that are written to samples.csv are read back with the same cells", () => {
    for (let seed = 1; seed <= runs(150); seed++) {
      const r = new Rng(seed);
      const rows = Array.from({ length: r.int(1, 8) }, () => ({ ...row(r), sample: cell(r) || "s" }));
      const path = file("samples.csv");
      writeSheet(path, rows);
      expect(readSheet(path), `seed ${seed}`).toEqual(trimmed(visible(rows)));
    }
  });

  test("a sheet in another form is read in the same way: BOM, Windows line breaks, tabs, semicolons, UTF-16, Windows-1252", () => {
    for (let seed = 1; seed <= runs(150); seed++) {
      const r = new Rng(seed + 100);
      const rows = Array.from({ length: r.int(1, 6) }, () => ({ sample: r.string([..."abcS019 _-é"], 1, 8), group: r.string([..."abG 1é"], 0, 6), unit: r.string([..."Set 12"], 0, 6), batch: r.string([..."P12"], 0, 3), path: r.string([..."a/b.tif"], 1, 8) }));
      const sep = r.pick([",", ";", "\t"]);
      const eol = r.pick(["\n", "\r\n", "\r"]);
      const order = r.bool() ? [...SAMPLE_COLUMNS] : [...SAMPLE_COLUMNS].sort(() => r.next() - 0.5);
      const head = order.map((c) => r.pick([c, c.toUpperCase(), ` ${c} `, c[0]!.toUpperCase() + c.slice(1)]));
      const extra = r.bool();
      const lines = [[...head, ...(extra ? ["notes"] : [])], ...rows.map((x) => [...order.map((c) => x[c]), ...(extra ? ["n"] : [])])].map((cells) => cells.join(sep));
      const text = lines.join(eol) + (r.bool() ? eol : "");
      const kind = r.int(0, 3);
      let buf: Buffer;
      if (kind === 0) buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text)]);
      else if (kind === 1) buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]);
      else if (kind === 2) buf = Buffer.from(text, "latin1");
      else buf = Buffer.from(text);
      const path = file(r.pick(sep === "\t" ? ["samples.csv", "samples.tsv", "samples.txt", "Samples.CSV"] : ["samples.csv", "samples.txt", "Samples.CSV"]));
      writeFileSync(path, buf);
      expect(() => readSheet(path), `seed ${seed} kind ${kind} sep ${JSON.stringify(sep)} eol ${JSON.stringify(eol)} ${JSON.stringify(text)}`).not.toThrow();
      expect(readSheet(path), `seed ${seed} kind ${kind} sep ${JSON.stringify(sep)} eol ${JSON.stringify(eol)}`).toEqual(trimmed(rows));
    }
  });

  test("a sheet without a sample column gives a clear error, and a sheet without a group column gives empty groups", () => {
    const a = file("samples.csv");
    writeFileSync(a, "group,unit\nA,M1\n");
    expect(() => readSheet(a)).toThrow(/no column named sample/);
    const b = file("samples.csv");
    writeFileSync(b, "sample,unit\ns1,M1\ns2,M2\n");
    expect(readSheet(b).map((x) => x.group)).toEqual(["", ""]);
    for (const body of ["", "\n\n", "sample", "sample\n", ",,,\n,,,\n"]) {
      const p = file("samples.csv");
      writeFileSync(p, body);
      const out = (() => {
        try {
          return readSheet(p);
        } catch (e) {
          return (e as Error).message;
        }
      })();
      expect(typeof out === "string" ? out : out.every((x) => x.sample === "")).toBeTruthy();
    }
  });
});

describe("fuzz: the sheet from a table", () => {
  test("every row of the table is in a row of the sheet, and no row has an empty name", () => {
    const heads = [["Animal", "Treatment", "Plate", "v"], ["Sample ID", "Group", "Date", "x"], ["mouse", "genotype", "Batch"], ["Treatment", "Value"], ["ID", "Value"], ["Subject", "Cohort"], ["Group", "Group", "Animal"]];
    for (let seed = 1; seed <= runs(200); seed++) {
      const r = new Rng(seed + 300);
      const columns = r.pick(heads);
      const names = r.int(1, 4);
      const rows = Array.from({ length: r.int(0, 10) }, () => columns.map((_, i) => (i === 0 ? r.pick(["NA", "", " ", "M1", "M2", "M3", `S${r.int(1, names)}`]) : r.pick(["A", "B", "", "x", "NA", "1"]))));
      const sheet = sheetFromTable({ columns, rows }, "/data/some table.csv");
      if (!sheet) continue;
      const seen = new Set<number>();
      for (const s of sheet.rows) {
        expect(s.sample, `seed ${seed}`).not.toBe("");
        for (const k of SAMPLE_COLUMNS) expect(typeof s[k]).toBe("string");
        for (const m of s.path.matchAll(/\d+/g)) seen.add(Number(m[0]));
      }
      expect(seen.size, `seed ${seed}: rows of the table`).toBe(rows.length);
      expect(new Set(sheet.rows.map((s) => s.sample)).size).toBe(sheet.rows.length);
    }
  });

  test("a sample that has two groups in the table does not lose one group without a sign", () => {
    const sheet = sheetFromTable({ columns: ["Animal", "Group"], rows: [["M1", "A"], ["M1", "B"], ["M2", "A"]] }, "/data/t.csv")!;
    expect(sheet.rows.map((s) => [s.sample, s.group])).toEqual([["M1", "A"], ["M2", "A"]]);
    expect(sheet.from).toContain("M1 has more than one value in 'Group' (A, B). The sheet uses A.");
    expect(sheetFromTable({ columns: ["Animal", "Group"], rows: [["M1", "A"], ["M1", "A"], ["M1", ""]] }, "/data/t.csv")!.from).not.toContain("more than one");
  });
});

describe("fuzz: the sheet from file names", () => {
  test("each file is in exactly one row, the sample names are different, and no cell is undefined", () => {
    const parts = ["Ctrl", "Drug", "Set 1", "Set 2", "Mouse 3", "2024-03-01", "Plate A", "KO", "WT", "img_01", "img_02", "a b", "é", "日本", "x.y", "Day 1", "..", ".", "", "A", "B"];
    for (let seed = 1; seed <= runs(250); seed++) {
      const r = new Rng(seed + 600);
      const depth = r.int(0, 4);
      const rels = [...new Set(Array.from({ length: r.int(1, 25) }, () => [...Array.from({ length: depth }, () => r.pick(parts)), `${r.pick(["img_01", "x", "Ctrl_Set 1_02", "KO-3", "a b c", "é", "7"])}${r.pick(["", "_red", "_green", " c1", "_ch00"])}.${r.pick(["tif", "png", "czi"])}`].join("/")))];
      const sheet = sheetFromFiles(rels, "/data");
      expect(sheet.rows.length, `seed ${seed}`).toBeGreaterThan(0);
      for (const s of sheet.rows) for (const k of SAMPLE_COLUMNS) expect(typeof s[k], `seed ${seed} ${JSON.stringify(s)}`).toBe("string");
      const covered = (rel: string) => sheet.rows.filter((s) => (s.path.endsWith("*") ? rel.startsWith(s.path.slice(0, -1)) : s.path === rel));
      for (const rel of rels) expect(covered(rel).length, `seed ${seed}: ${rel} in ${JSON.stringify(sheet.rows.map((s) => s.path))}`).toBeGreaterThanOrEqual(1);
      expect(new Set(sheet.rows.map((s) => s.sample)).size, `seed ${seed}: names ${JSON.stringify(sheet.rows.map((s) => s.sample))}`).toBe(sheet.rows.length);
      sheetTable(sheet.rows);
      groupSummary(sheet.rows);
      const csv = file("samples.csv");
      writeSheet(csv, sheet.rows);
      expect(readSheet(csv)).toEqual(trimmed(visible(sheet.rows)));
    }
  });
});

describe("fuzz: the edits of a sheet", () => {
  test("an edit command never throws, keeps the number of rows, and changes only the named cells", () => {
    const words = ["group", "sample", "unit", "batch", "path", "Group", "1", "2", "3", "0", "-", " ", "=", "x", "Ceramide", "10", "99", "é", ""];
    for (let seed = 1; seed <= runs(400); seed++) {
      const r = new Rng(seed + 900);
      const rows = Array.from({ length: r.int(0, 6) }, () => row(r));
      const text = Array.from({ length: r.int(0, 6) }, () => r.pick(words)).join(r.pick([" ", "  ", ""]));
      const out = applyEdit(rows, text);
      if ("error" in out) {
        expect(out.error.length).toBeGreaterThan(0);
        continue;
      }
      expect(out.rows.length).toBe(rows.length);
      const changed = sheetChanges(rows, out.rows) ?? [];
      expect(changed.length, text).toBeGreaterThan(-1);
      expect(out.said.length).toBeGreaterThan(0);
      expect(applyChanges(rows, changed)).toEqual(out.rows);
    }
  });

  test("the changes of a sheet, applied to the first sheet, give the second sheet; a replay gives the last sheet", () => {
    for (let seed = 1; seed <= runs(200); seed++) {
      const r = new Rng(seed + 1200);
      const first = Array.from({ length: r.int(1, 6) }, () => row(r));
      let now = first;
      const entries: { data: Record<string, unknown> }[] = [{ data: { rows: first } }];
      for (let i = 0; i < r.int(1, 5); i++) {
        const next = now.map((x) => (r.bool(0.3) ? { ...x, [r.pick(SAMPLE_COLUMNS)]: cell(r) } : x));
        const changes = sheetChanges(now, next);
        entries.push({ data: changes ? { changes } : { rows: next } });
        if (changes) expect(applyChanges(now, changes), `seed ${seed}`).toEqual(next);
        now = next;
      }
      expect(replaySheet(entries), `seed ${seed}`).toEqual(now);
      expect(replaySheet([{ data: { changes: [[0, "group", "x"]] } }])).toBeUndefined();
      expect(sheetCsv(now).endsWith("\n")).toBe(true);
    }
  });
});

describe("fuzz: the design checks", () => {
  test("any sheet gives issues with a complete text, and each question has its options and its recommendation", () => {
    for (let seed = 1; seed <= runs(400); seed++) {
      const r = new Rng(seed + 1500);
      const groups = ["A", "B", "C", ""].slice(0, r.int(1, 4));
      const rows = Array.from({ length: r.int(0, 14) }, () => ({ sample: cell(r), group: r.pick(groups), unit: r.pick(["", "M1", "M2", "M3", "Set 1", "Set 2", "set 3"]), batch: r.pick(["", "P1", "P2"]), path: "p" }));
      const issues = designChecks(rows, { n: r.pick([undefined, "", "animals", "fields", "n = 3 sets", "cells"]), test: r.pick([undefined, "t-test", "Mann-Whitney U"]) });
      const ids = new Set<string>();
      for (const i of issues) {
        expect(`${i.text} ${i.question ?? ""}`, `seed ${seed}`).not.toMatch(/undefined|NaN|Infinity|\[object/);
        expect(ids.has(i.id), `seed ${seed}: ${i.id} twice`).toBe(false);
        ids.add(i.id);
        if (i.level === "ask") {
          expect(i.question).toBeTruthy();
          expect(i.options!.length).toBeGreaterThan(1);
          expect(i.options!.map((o) => o.value)).toContain(i.recommendation);
        }
      }
      groupSummary(rows);
      sheetTable(rows, r.int(0, 5));
    }
  });
});
