import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { checkTable, dataCheckText, readCsvTable } from "../src/core/datacheck.ts";
import { delimiterOf, parseCsv } from "../src/core/results.ts";
import { linear, Rng, runs } from "./fuzz-rng.ts";

const root = mkdtempSync(join(tmpdir(), "cuvette-fuzz-table-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
let files = 0;

const DELIMS = [",", ";", "\t"] as const;
const NAMES = ["sample", "group", "area (µm²)", "mass; g", "count, total", 'say "hi"', "time_s", "id", "treatment", "value", "Länge"];

function cell(r: Rng): string {
  const k = r.int(0, 11);
  if (k === 0) return "";
  if (k === 1) return String(r.int(-1000, 100000));
  if (k === 2) return r.logUniform(1e-4, 1e6).toFixed(r.int(0, 4));
  if (k === 3) return `${r.int(0, 99)},${r.int(0, 999)}`;
  if (k === 4) return r.pick(["NA", "n/a", "-", "nan", "?"]);
  if (k === 5) return r.pick(["Control", "control ", "Drug A", "drug a", "WT", "KO"]);
  if (k === 6) return `a "quoted" word`;
  if (k === 7) return `line one\nline two`;
  if (k === 8) return r.pick(["x;y", "x,y", "x\ty", "µg/mL", "naïve", "1e-3", "'0042"]);
  if (k === 9) return ` ${r.int(0, 9)} `;
  return r.string("abcXYZ019 ._-", 1, 8);
}

// A careful writer quotes a cell with any delimiter in it. A cell with only another delimiter makes the delimiter unclear.
function quoteCell(v: string, _d: string): string {
  return /["\n\r,;\t]/.test(v) || /^\s|\s$/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function table(r: Rng): { columns: string[]; rows: string[][] } {
  const width = r.int(1, 6);
  const columns = Array.from({ length: width }, (_, i) => `${r.pick(NAMES)}${r.bool(0.3) ? ` ${i}` : ""}`);
  const rows = Array.from({ length: r.int(0, 25) }, () => Array.from({ length: width }, () => cell(r)));
  return { columns, rows: rows.filter((row) => row.some((c) => c.trim() !== "")) };
}

function encode(r: Rng, text: string): { buf: Buffer; encoding: string } {
  const k = r.int(0, 5);
  if (k === 1) return { buf: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text)]), encoding: "utf-8" };
  if (k === 2) return { buf: Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]), encoding: "utf-16le" };
  if (k === 3) return { buf: Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(text, "utf16le").swap16()]), encoding: "utf-16be" };
  if (k === 4 && /[µäï²]/.test(text) && ![...text].some((c) => c.charCodeAt(0) > 255)) return { buf: Buffer.from(text, "latin1"), encoding: "windows-1252" };
  return { buf: Buffer.from(text), encoding: "utf-8" };
}

function write(name: string, buf: Buffer): string {
  const p = join(root, `${files++}-${name}`);
  writeFileSync(p, buf);
  return p;
}

describe("fuzz: table reader and data check", () => {
  test("a valid file reads back with every row and cell", () => {
    const r = new Rng(1001);
    const bad: string[] = [];
    for (let i = 0; i < runs(400); i++) {
      const t = table(r);
      const d = r.pick(DELIMS);
      const nl = r.pick(["\n", "\r\n", "\r"]);
      const text = [t.columns, ...t.rows].map((row) => row.map((c) => quoteCell(c, d)).join(d)).join(nl) + (r.bool() ? nl : "");
      const { buf, encoding } = encode(r, text);
      const path = write(d === "\t" && r.bool() ? "t.tsv" : "t.csv", buf);
      const got = readCsvTable(path);
      const want = { columns: t.columns.map((c) => c.trim()), rows: t.rows };
      // A file with one column gives no sign of its delimiter, so only the absence of a crash counts.
      const guess = t.columns.length === 1;
      if (!guess && JSON.stringify({ columns: got.columns, rows: got.rows }) !== JSON.stringify(want)) bad.push(`${JSON.stringify(d)} ${encoding}: ${JSON.stringify(text).slice(0, 200)} -> ${JSON.stringify(got).slice(0, 200)}`);
      else if ((got.encoding ?? "utf-8") !== encoding) bad.push(`encoding ${encoding} read as ${got.encoding}`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  test("a damaged file gives no crash, and a lost row always has a notice", () => {
    const r = new Rng(1002);
    const bad: string[] = [];
    for (let i = 0; i < runs(400); i++) {
      const t = table(r);
      const d = r.pick(DELIMS);
      let lines = [t.columns, ...t.rows.map((row) => row.map((c) => c.replace(/[\n"]/g, " ")))].map((row) => row.join(d));
      const k = r.int(0, 5);
      if (k === 0 && lines.length > 1) {
        const at = r.int(1, lines.length - 1);
        lines[at] = `"${lines[at]}`;
      } else if (k === 1 && lines.length > 1) lines[r.int(1, lines.length - 1)] += `${d}extra${d}more`;
      else if (k === 2) lines = lines.map((l) => (r.bool(0.3) ? l.replace(/^[^,;\t]*/, (m) => `"${m}`) : l));
      else if (k === 3) lines.splice(r.int(0, lines.length), 0, "", d.repeat(3), "\u0000\u0001");
      const text = lines.join(r.pick(["\n", "\r\n"]));
      const buf = r.bool(0.1) ? Buffer.concat([encode(r, text).buf, r.bytes(r.int(1, 9))]) : encode(r, text).buf;
      const path = write("d.csv", buf);
      try {
        const got = readCsvTable(path);
        const check = checkTable(got, "d.csv");
        dataCheckText(check);
        const dataLines = lines.slice(1).filter((l) => l.split(d).some((c) => c.trim() !== "" && c.trim() !== "\u0000\u0001")).length;
        const lostRows = got.rows.length < dataLines;
        if (lostRows && !check.items.some((x) => x.check === "quotes" || x.check === "ragged_rows")) bad.push(`${dataLines} rows -> ${got.rows.length} with no notice: ${JSON.stringify(text).slice(0, 160)}`);
      } catch (e) {
        bad.push(`crash: ${(e as Error).message}`);
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  test("the data check is the same on a second call", () => {
    const r = new Rng(1003);
    for (let i = 0; i < runs(200); i++) {
      const t = table(r);
      const first = JSON.stringify(checkTable(t, "x.csv"));
      expect(JSON.stringify(checkTable(t, "x.csv"))).toBe(first);
    }
  });

  test("the run time grows about linearly with the row width", () => {
    const shapes: [string, (n: number) => string][] = [
      ["quoted cells", (n) => `${Array.from({ length: n / 4 }, () => '"a"').join(",")}\n`],
      ["stray quotes", (n) => `${'a,"b'.repeat(n / 4)}\n`],
    ];
    const slow = shapes.map(([name, make]) => ({ name, ...linear(make, (s) => parseCsv(s, delimiterOf(s, "x.csv"), { stray: [], multiline: [] }), 20000) })).filter((x) => !x.ok);
    expect(slow).toEqual([]);
  });
});
