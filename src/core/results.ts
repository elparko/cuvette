import { CHECKLIST_COLUMNS, checklistRows, recordChecklist } from "./checklist.ts";
import { pilotRows, validationRows } from "./pilot.ts";
import { AFTER_RESULT, NO_DEVIATIONS, deviations, frozenPlan } from "./freeze.ts";
import { approvedPlan, definitionsOf } from "./plan.ts";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, isAbsolute, join, relative, resolve } from "node:path";
import type { LoadedAdapter } from "../adapters/manifest.ts";
import { zip } from "../eln/zip.ts";
import { allRefs, formatRef, sessionCitations, toBibtex, type CitationStyle, type Ref } from "./citations.ts";
import { checkAnswer } from "./claims.ts";
import type { DecisionField } from "./decisions.ts";
import { mainNodes, methodsSentence, stepLines } from "./exports.ts";
import { stepNumbers } from "./housekeeping.ts";
import { ownerOf, sha256File, type AnalysisRecord } from "./record.ts";
import { replaySheet } from "./samples.ts";
import type { Node, TablePreview } from "./types.ts";
import { renvLock, requirementsText } from "./envlock.ts";
import { testsTable } from "./testcount.ts";
import { changeCell, reruns, stepStatus } from "./status.ts";

export type Cell = string | number | boolean | null | undefined;

export interface Sheet {
  name: string;
  columns: string[];
  rows: Cell[][];
}

export interface Saved {
  dir: string;
  xlsx?: string;
  sheets: number;
  figures: number;
  decks?: string[];
}

export const DECKS = ["images.pptx", "images.pdf"];

const MAX_ROWS = 1_048_575;
const MAX_TABLE_BYTES = 50_000_000;
const MAX_CELL = 32_767;
const RASTER = new Set([".png", ".jpg", ".jpeg", ".tif", ".tiff", ".gif", ".bmp", ".webp"]);
const FIGURE = new Set([...RASTER, ".svg", ".pdf", ".eps"]);
const TABLE = new Set([".csv", ".tsv"]);
const MISSING = new Set(["", "NA", "N/A", "NaN", "nan", "null", "None", "<NA>"]);
const NUMBER = /^\s*[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?\s*$/;

export function outputDir(s: { workDir: string }): string {
  return s.workDir;
}

export function vectorFormats(formats: string): string[] {
  return formats.split(",").map((f) => f.trim().toLowerCase().replace(/^\./, "")).filter((f) => f === "svg" || f === "pdf" || f === "eps");
}

// With no output path, the rules name the folders only. The paths are then in the first message, so the text stays the same in each session.
export function outputRules(o: { output?: string; figureFormats: string; xlsx: boolean }): string {
  const vec = vectorFormats(o.figureFormats).map((f) => f.toUpperCase());
  const figuresFolder = o.output ? `the figures folder ${join(o.output, "figures")}` : "the figures folder of the output folder";
  const outputFolder = o.output ?? "the output folder";
  const figures =
    `Save every figure in ${figuresFolder} as PNG (300 dpi)${vec.length ? ` and ${vec.join(" and ")}` : ""}, with axis labels and units.` +
    (vec.length ? ` A PNG that matplotlib saves gets the ${vec.join(" and ")} copy automatically.` : "");
  const tables = o.xlsx
    ? `Write each result table as a CSV file in ${outputFolder}. The harness adds each CSV to results.xlsx. Do not write an xlsx file yourself, unless the scientist asks for a specific layout.`
    : `Write each result table as a CSV file in ${outputFolder}.`;
  return `${figures} ${tables}`;
}

// ---------------------------------------------------------------- xlsx

function esc(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colName(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function cellXml(v: Cell, ref: string, style = ""): string {
  if (v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v))) return "";
  if (typeof v === "number") return `<c r="${ref}"${style}><v>${v}</v></c>`;
  if (typeof v === "boolean") return `<c r="${ref}"${style} t="b"><v>${v ? 1 : 0}</v></c>`;
  return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${esc(String(v).slice(0, MAX_CELL))}</t></is></c>`;
}

function sheetXml(s: Sheet): string {
  const rows = [s.columns, ...s.rows].map((r, i) => {
    const style = i === 0 ? ` s="1"` : "";
    return `<row r="${i + 1}">${r.map((v, j) => cellXml(v, `${colName(j)}${i + 1}`, style)).join("")}</row>`;
  });
  const width = Math.max(1, s.columns.length);
  const cols = Array.from({ length: width }, (_, j) => {
    const longest = Math.max(...[s.columns[j], ...s.rows.slice(0, 200).map((r) => r[j])].map((v) => (v === null || v === undefined ? 0 : String(v).length)));
    return `<col min="${j + 1}" max="${j + 1}" width="${Math.min(60, Math.max(8, longest + 2))}" customWidth="1"/>`;
  }).join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${cols}</cols><sheetData>${rows.join("")}</sheetData></worksheet>`
  );
}

export function xlsx(sheets: Sheet[]): Buffer {
  const ns = "http://schemas.openxmlformats.org";
  const files = [
    {
      name: "[Content_Types].xml",
      text:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="${ns}/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
        `</Types>`,
    },
    {
      name: "_rels/.rels",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${ns}/package/2006/relationships"><Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      text:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="${ns}/spreadsheetml/2006/main" xmlns:r="${ns}/officeDocument/2006/relationships"><sheets>` +
        sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
        `</sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      text:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${ns}/package/2006/relationships">` +
        sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${ns}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
        `<Relationship Id="rId${sheets.length + 1}" Type="${ns}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: "xl/styles.xml",
      text:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="${ns}/spreadsheetml/2006/main">` +
        `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
        `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
        `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>` +
        `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, text: sheetXml(s) })),
  ];
  return zip(files.map((f) => ({ name: f.name, data: Buffer.from(f.text, "utf8") })));
}

export function sheetName(wanted: string, used: Set<string>): string {
  const clean = wanted.replace(/[[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim().replace(/^'+|'+$/g, "") || "Sheet";
  for (let n = 1; ; n++) {
    const tail = n === 1 ? "" : ` (${n})`;
    const name = clean.slice(0, 31 - tail.length).trimEnd() + tail;
    const key = name.toLowerCase();
    if (!used.has(key) && key !== "history") {
      used.add(key);
      return name;
    }
  }
}

// ---------------------------------------------------------------- tables

export function decodeText(buf: Buffer): { text: string; encoding: string } {
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return { text: buf.subarray(3).toString("utf8"), encoding: "utf-8" };
  if (buf[0] === 0xff && buf[1] === 0xfe) return { text: buf.subarray(2).toString("utf16le"), encoding: "utf-16le" };
  if (buf[0] === 0xfe && buf[1] === 0xff) return { text: Buffer.from(buf.subarray(2, buf.length - (buf.length % 2))).swap16().toString("utf16le"), encoding: "utf-16be" };
  const head = buf.subarray(0, 4096);
  let oddNul = 0;
  let evenNul = 0;
  for (let i = 0; i < head.length; i++) if (head[i] === 0) i % 2 ? oddNul++ : evenNul++;
  if (head.length >= 4 && oddNul > head.length / 4 && oddNul > evenNul) return { text: buf.subarray(0, buf.length - (buf.length % 2)).toString("utf16le"), encoding: "utf-16le" };
  if (head.length >= 4 && evenNul > head.length / 4 && evenNul > oddNul) return { text: Buffer.from(buf.subarray(0, buf.length - (buf.length % 2))).swap16().toString("utf16le"), encoding: "utf-16be" };
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(buf), encoding: "utf-8" };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(buf), encoding: "windows-1252" };
  }
}

// The delimiter gives the same count of fields on most of the first 20 records. A delimiter or a line break inside quotes does not count.
// If two delimiters are equal, the comma comes first, then the tab.
export function delimiterOf(text: string, path: string): string {
  if (extname(path).toLowerCase() === ".tsv") return "\t";
  const counts: Record<string, number>[] = [];
  let now: Record<string, number> = { "\t": 0, ";": 0, ",": 0 };
  let q = false;
  let filled = false;
  for (let i = 0; i < text.length && counts.length < 20; i++) {
    const c = text[i]!;
    const start = i === 0 || /[\t;,\r\n]/.test(text[i - 1]!);
    if (c === '"' && (q || start)) q = !q;
    else if (!q && (c === "\n" || c === "\r")) {
      if (filled) counts.push(now);
      now = { "\t": 0, ";": 0, ",": 0 };
      filled = false;
    } else {
      if (!q && c in now) now[c]!++;
      if (c.trim()) filled = true;
    }
  }
  if (filled && counts.length < 20) counts.push(now);
  const score = (c: string): [number, number] => {
    const head = counts[0]?.[c] ?? 0;
    return head ? [counts.filter((r) => r[c] === head).length, head] : [0, 0];
  };
  let best = ",";
  let top = score(",");
  for (const c of ["\t", ";"]) {
    const s = score(c);
    if (s[0] > top[0] || (s[0] === top[0] && s[1] > top[1])) [best, top] = [c, s];
  }
  return best;
}

export interface CsvNotes {
  stray: number[];
  multiline: number[];
  starts?: number[];
}

// The parser reads a quote mark with no closing quote as a normal character. Then it does not join the rest of the file into one cell.
// The notes give the line numbers of such quote marks and of cells that go over more than one line.
export function parseCsv(text: string, sep = ",", notes?: CsvNotes): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  const starts = notes?.starts;
  let open = { at: -1, line: 1, rows: 0, cells: 0 };
  let literal = -1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        if (line > open.line) notes?.multiline.push(open.line);
      } else {
        field += c;
        if (c === "\n" || (c === "\r" && text[i + 1] !== "\n")) line++;
      }
      if (quoted && i >= text.length - 1) {
        notes?.stray.push(open.line);
        literal = open.at;
        i = open.at - 1;
        line = open.line;
        rows.length = open.rows;
        if (starts) starts.length = open.rows;
        row.length = open.cells;
        field = "";
        quoted = false;
      }
    } else if (c === '"' && field === "" && i !== literal) {
      quoted = true;
      open = { at: i, line, rows: rows.length, cells: row.length };
      if (i === text.length - 1) {
        notes?.stray.push(line);
        quoted = false;
        field += c;
      }
    } else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      starts?.push(rowLine);
      row = [];
      field = "";
      line++;
      rowLine = line;
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
    starts?.push(rowLine);
  }
  return rows;
}

// An integer with more than 15 digits, such as a barcode, changes in a double. It stays text.
// An unsigned integer with a capital E exponent, such as the ID 5E3, stays text too.
function exact(v: string): boolean {
  if (/^\s*\d+E\d+\s*$/.test(v)) return false;
  return /[.eE]/.test(v) || v.replace(/\D/g, "").length <= 15;
}

function staysText(v: string): boolean {
  if (/^\s*[-+]?(inf|infinity)\s*$/i.test(v)) return true;
  if (!NUMBER.test(v)) return false;
  const n = Number(v);
  return !Number.isFinite(n) || (n === 0 && /[1-9]/.test(v.split(/e/i)[0]!));
}

export function typed(rows: unknown[][], width: number): Cell[][] {
  const kinds = Array.from({ length: width }, (_, j) => {
    let numeric = true;
    let bool = true;
    let any = false;
    for (const r of rows) {
      const v = r[j];
      if (v === null || v === undefined || (typeof v === "string" && MISSING.has(v.trim()))) continue;
      any = true;
      const huge = typeof v === "string" && staysText(v);
      if (!huge && !(typeof v === "number" || (typeof v === "string" && NUMBER.test(v) && !/^[-+]?0\d+$/.test(v.trim()) && exact(v)))) numeric = false;
      if (!(typeof v === "boolean" || (typeof v === "string" && /^(true|false)$/i.test(v.trim())))) bool = false;
    }
    return !any ? "text" : numeric ? "number" : bool ? "bool" : "text";
  });
  return rows.map((r) =>
    Array.from({ length: width }, (_, j) => {
      const v = r[j];
      if (v === null || v === undefined) return null;
      if (kinds[j] === "number") return typeof v === "number" ? v : typeof v === "string" && MISSING.has(v.trim()) ? null : typeof v === "string" && staysText(v) ? v : Number(v);
      if (kinds[j] === "bool") return typeof v === "boolean" ? v : typeof v === "string" && MISSING.has(v.trim()) ? null : /^true$/i.test(String(v).trim());
      if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") return v;
      return JSON.stringify(v);
    }),
  );
}

export function readTable(path: string): { columns: string[]; rows: Cell[][]; total: number } | undefined {
  if (!existsSync(path) || statSync(path).size > MAX_TABLE_BYTES) return undefined;
  const { text } = decodeText(readFileSync(path));
  const all = parseCsv(text, delimiterOf(text, path)).filter((r) => r.some((c) => c.trim() !== ""));
  if (!all.length) return undefined;
  const [head, ...body] = all;
  const width = body.reduce((w, r) => Math.max(w, r.length), head!.length);
  const columns = Array.from({ length: width }, (_, j) => head![j] || `column ${j + 1}`);
  return { columns, rows: typed(body.slice(0, MAX_ROWS), width), total: body.length };
}

function previewTable(t: TablePreview): { columns: string[]; rows: Cell[][]; total: number } {
  const columns = t.columns.map(String);
  return { columns, rows: typed(t.rows.slice(0, MAX_ROWS), columns.length), total: t.n_rows ?? t.rows.length };
}

// ---------------------------------------------------------------- figures

function slug(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 60);
}

const pad = (n: number) => String(n).padStart(2, "0");

function inside(dir: string, p: string): boolean {
  const r = relative(dir, p);
  return r !== "" && !r.startsWith("..") && !isAbsolute(r);
}

export interface FigureFile {
  step: number;
  node: string;
  path: string;
  source: string;
  note?: string;
}

const CHANGED_NOTE_LOST = "The file changed after the run, and the record kept no copy. The workbook has no figure for this file.";
const CHANGED_NOTE_TABLE_LOST = "The file changed after the run, and the record kept no copy. The workbook does not use the changed file.";
const CHANGED_NOTE = "The file changed after the run. The workbook uses the copy that the record kept.";
const MISSING_NOTE_LOST = "The file is missing, and the record kept no copy. The workbook has no figure for this file.";
const MISSING_NOTE_TABLE_LOST = "The file is missing, and the record kept no copy. The workbook does not use the file.";

function recordedSource(record: AnalysisRecord, o: { path: string; sha?: string }): { path?: string; changed: boolean; missing?: boolean } {
  const blob = o.sha ? record.blobPath(o.sha) : undefined;
  if (blob && resolve(blob) !== resolve(o.path)) return { path: blob, changed: existsSync(o.path) && o.sha!.length === 64 && sha256File(o.path) !== o.sha };
  if (o.sha && !blob && record.blobRef(o.sha)) return existsSync(o.path) ? { path: undefined, changed: true } : { path: undefined, changed: false, missing: true };
  return { path: existsSync(o.path) ? o.path : undefined, changed: false };
}

function figureSources(n: Node, record: AnalysisRecord, keepAll = false): { path: string; sha?: string }[] {
  const out: { path: string; sha?: string }[] = [];
  const seen = new Set<string>();
  const add = (path: string, sha?: string) => {
    if (seen.has(path)) return;
    seen.add(path);
    out.push({ path, sha });
  };
  for (const o of n.outputs) {
    const ext = extname(o.path).toLowerCase();
    if (!(o.kind === "image" || FIGURE.has(ext))) continue;
    if (ext === ".pdf" && !n.outputs.some((x) => x !== o && RASTER.has(extname(x.path).toLowerCase()) && x.path.slice(0, -extname(x.path).length) === o.path.slice(0, -4))) continue;
    add(o.path, o.sha);
    if (RASTER.has(ext)) {
      const stem = o.path.slice(0, -ext.length);
      for (const v of [".svg", ".pdf", ".eps"]) if (existsSync(stem + v)) add(stem + v);
    }
  }
  return keepAll ? out : out.filter((f) => recordedSource(record, f).path);
}

export function copyFigures(record: AnalysisRecord, dir: string): FigureFile[] {
  const figDir = join(dir, "figures");
  const steps = stepNumbers(record.nodes());
  const used = new Map<string, string>();
  const out: FigureFile[] = [];
  for (const n of mainNodes(record)) {
    const step = steps.get(n.id)!;
    for (const f of figureSources(n, record)) {
      if (inside(figDir, f.path)) {
        out.push({ step, node: n.id, path: f.path, source: f.path });
        continue;
      }
      const ext = extname(f.path).toLowerCase();
      let stem = slug(basename(f.path, extname(f.path))) || "figure";
      if (/^(plot|figure|fig|image|img|output|out|result)(-?\d+)?$/.test(stem)) stem = `${slug(n.tool)}-${stem}`;
      if (!/^step\d+-/.test(stem)) stem = `step${pad(step)}-${stem}`;
      let name = stem + ext;
      for (let k = 2; used.has(name) && used.get(name) !== f.path; k++) name = `${stem}-${k}${ext}`;
      used.set(name, f.path);
      const dest = join(figDir, name);
      const found = recordedSource(record, f);
      const src = found.path!;
      mkdirSync(figDir, { recursive: true });
      const fresh = existsSync(dest) && statSync(dest).size === statSync(src).size && statSync(dest).mtimeMs >= statSync(src).mtimeMs;
      if (!fresh) copyFileSync(src, dest);
      out.push({ step, node: n.id, path: dest, source: f.path, ...(found.changed ? { note: CHANGED_NOTE } : {}) });
    }
  }
  return out;
}

// ---------------------------------------------------------------- workbook

export interface WorkbookInput {
  record: AnalysisRecord;
  adapters: LoadedAdapter[];
  fields: DecisionField[];
  programs: { name: string; version: string; programVersion: string }[];
  dir: string;
  figures: FigureFile[];
  toolText?: Record<string, string>;
  citationStyle?: CitationStyle;
}

const GROUP_LABEL: Record<Ref["group"], string> = { used: "used", comparison: "used in a comparison", out_of_date: "used only in steps that are out of date" };

export function referenceSheet(record: AnalysisRecord, adapters: LoadedAdapter[], style: CitationStyle = "apa"): Sheet {
  const c = sessionCitations(record, adapters, stepNumbers(record.nodes()));
  const rows: Cell[][] = allRefs(c).map((r, i) => [i + 1, formatRef(r, style), r.kind, r.program === "Cuvette" && !r.adapter ? "Cuvette" : r.kind === "program" ? r.program : r.tools.join(", "), r.steps.join(", "), GROUP_LABEL[r.group], r.doi, r.url, r.key]);
  return { name: "References", columns: ["Number", "Reference", "Kind", "Used for", "Steps", "Status", "DOI", "URL", "BibTeX key"], rows };
}

export function writeReferences(record: AnalysisRecord, adapters: LoadedAdapter[], dir: string): string | undefined {
  const c = sessionCitations(record, adapters);
  if (!record.nodes().some((n) => n.adapter)) return undefined;
  const path = join(dir, "references.bib");
  const head = (t: string, refs: Ref[]) => (refs.length ? `% ${t}\n\n${toBibtex(refs)}\n` : "");
  writeFileSync(path, `% References for session ${ownerOf(record.entries())}. Cuvette writes this file; it lists only what ran.\n\n${head("Used", c.used)}${head("Used in a comparison only", c.comparison)}${head("Used only in steps that are out of date", c.outOfDate)}`);
  return path;
}

const LABEL_BEFORE = /\b(?:group|step|id|subject|run|q|question|figure|fig|table|column|row|channel|day|week)\s*$/i;

function answerText(data: Record<string, unknown>): string {
  let t = String(data.text ?? "");
  for (const part of [data.results, data.settings]) if (typeof part === "string" && part) t = t.replace(part, "");
  return t.trim();
}

function localDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function show(v: unknown): Cell {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") return v;
  return JSON.stringify(v);
}

function chosenBy(record: AnalysisRecord, key: string, owner: string): string {
  const last = record.entries(["decision"]).filter((e) => e.data.key === key).at(-1);
  if (last) return `${last.data.by === "agent" ? "agent" : last.data.by === "profile" ? "lab profile" : last.data.by === "default" ? "default, set by the harness" : "scientist"}${last.data.reason ? ` (${last.data.reason})` : ""}`;
  const setup = record.entries(["setup"]).at(-1);
  if (setup && Object.hasOwn((setup.data.values as object) ?? {}, key)) {
    if (((setup.data.defaultsAccepted as string[]) ?? []).includes(key)) return "default, accepted at setup";
    const profile = setup.data.profile as { name?: string; version?: number } | null;
    return profile ? `lab profile ${profile.name} v${profile.version}` : "scientist, at setup";
  }
  return owner === "fixed" ? "fixed by the lab" : owner === "agent" ? "agent" : "scientist";
}

function rel(dir: string, p: string): string {
  return inside(dir, p) ? relative(dir, p).split("\\").join("/") : p;
}

function inputsOf(record: AnalysisRecord, n: Node): { path: string; sha: string }[] {
  const strings: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") strings.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(n.args);
  const made = new Set(record.nodes().filter((x) => x.ts < n.ts || x.id === n.id).flatMap((x) => x.outputs.map((o) => o.path)));
  const paths = strings.filter((s) => s.length < 1024 && (s.startsWith("/") || /^[A-Za-z]:\\/.test(s)) && !made.has(s) && existsSync(s) && statSync(s).isFile());
  return n.inputHashes.map((sha, i) => ({ path: paths.length === n.inputHashes.length ? paths[i]! : "", sha }));
}

function stepTitle(n: Node): string {
  const t = typeof n.args.purpose === "string" && n.args.purpose.trim() ? n.args.purpose : n.tool;
  return t.replace(/[_-]+/g, " ").trim();
}

export function checkSheets(record: AnalysisRecord): Sheet[] {
  const answer = new Map(record.entries(["decision"]).filter((e) => /^(data_check|design):/.test(String(e.data.key))).map((e) => [String(e.data.key), show(e.data.new)]));
  const rows: Cell[][] = [];
  for (const e of record.entries(["data_check"])) {
    for (const i of (e.data.items as { id: string; check: string; level: string; text: string; column?: string; files?: string[] }[]) ?? [])
      rows.push([String(e.data.source ?? ""), i.check.replace(/_/g, " "), i.level === "ask" ? "question" : "shown", i.column ?? (i.files ?? []).slice(0, 5).join("; "), i.text, answer.get(`data_check:${i.id}`) ?? (i.level === "ask" ? "not answered" : "")]);
    if (!((e.data.items as unknown[]) ?? []).length) rows.push([String(e.data.source ?? ""), "all", "shown", "", "No problem found.", ""]);
  }
  const issues = record.entries(["samples"]).filter((e) => e.data.action === "design_checks").flatMap((e) => (e.data.issues as { id: string; check: string; level: string; text: string }[]) ?? []);
  for (const i of issues.filter((x, k) => issues.findIndex((y) => y.text === x.text) === k)) rows.push(["sample sheet", i.check.replace(/_/g, " "), i.level === "ask" ? "question" : "shown", "", i.text, answer.get(`design:${i.id}`) ?? (i.level === "ask" ? "not answered" : "")]);
  const out: Sheet[] = [];
  if (rows.length) out.push({ name: "Data check", columns: ["Source", "Check", "Level", "Column or files", "Finding", "Answer"], rows });
  const sheet = replaySheet(record.entries(["samples"]));
  if (sheet) out.push({ name: "Samples", columns: ["sample", "group", "unit", "batch", "path"], rows: sheet.map((r) => [r.sample, r.group, r.unit, r.batch, r.path]) });
  return out;
}

export function deviationSheets(record: AnalysisRecord): Sheet[] {
  if (!frozenPlan(record)) return [];
  const list = deviations(record);
  const rows: Cell[][] = list.length ? list.map((d) => [d.ts, d.kind, d.what, d.from ?? "", d.to ?? "", d.reason, d.afterResult ? AFTER_RESULT : ""]) : [["", "", NO_DEVIATIONS, "", "", "", ""]];
  return [{ name: "Deviations", columns: ["Time", "Kind", "What changed", "Planned", "Now", "Reason", "Mark"], rows }];
}

export function buildWorkbook(w: WorkbookInput): Sheet[] {
  const { record, adapters, dir } = w;
  const used = new Set(["summary", "steps", "files", "metrics", "pilot", "validation", "data check", "samples", "changes", "packages", "references", "tests in this session", "deviations"]);
  const steps = stepNumbers(record.nodes());
  const status = new Map(stepStatus(record, { labels: Object.fromEntries(w.fields.map((f) => [f.key, f.label || f.key])) }).map((x) => [x.node, x]));
  const rewound = record.rewound();
  const nodes = mainNodes(record);

  const question = w.fields.find((f) => f.key === "question" && f.set && f.value)?.value ?? record.entries(["user"])[0]?.data.text ?? "";
  const first = record.entries()[0];
  const summary: Cell[][] = [["Question", "Question", show(question), ""]];
  for (const p of w.programs) summary.push(["Program", p.name, p.programVersion || "", p.version ? `adapter ${p.version}` : ""]);
  if (nodes.some((n) => n.tool === "run_script")) summary.push(["Program", "Python script (run_script)", "", ""]);
  summary.push(["Date", "Session started", localDate(first?.ts ?? new Date().toISOString()), ownerOf(record.entries())]);
  summary.push(["Date", "Workbook saved", `${localDate(new Date().toISOString())} ${new Date().toTimeString().slice(0, 8)}`, ""]);
  for (const f of w.fields) {
    if (!f.set || f.key === "question") continue;
    summary.push(["Decision", f.label || f.key, show(f.value), chosenBy(record, f.key, f.owner)]);
  }
  const defs = [...definitionsOf(record)].sort((a, b) => b.measure.length - a.measure.length);
  const confirmed = approvedPlan(record);
  if (confirmed) summary.push(["Analysis", "Confirmed analysis", `version ${confirmed.version}`, confirmed.pilot ? `pilot on ${confirmed.pilot.sample}` : "no pilot"]);
  for (const d of definitionsOf(record)) summary.push(["Definition", d.measure, d.definition, "confirmed analysis", d.definition]);
  const answer = record.entries(["assistant"]).filter((e) => e.data.final).at(-1);
  if (answer) {
    const text = answerText(answer.data);
    for (const line of String(answer.data.assumed ?? "").split("\n").filter((l) => l.startsWith("- "))) summary.push(["Assumption", line.slice(2), "", "text of the harness, not of the model"]);
    const seen = new Set<string>();
    for (const c of checkAnswer(text, record)) {
      if (c.value === null || seen.has(`${c.text}\u0000${c.value}`)) continue;
      seen.add(`${c.text}\u0000${c.value}`);
      const label = Number.isInteger(c.value) && [...c.text.matchAll(new RegExp(`(?<![\\d.])${c.value}(?!\\d|\\.\\d)`, "g"))].some((m) => LABEL_BEFORE.test(c.text.slice(0, m.index)));
      if (label) continue;
      const step = c.node ? steps.get(c.node) : undefined;
      const def = defs.find((d) => new RegExp(`\\b${d.measure.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(c.text));
      summary.push(["Answer number", c.text.trim(), c.value, `${step ? `step ${step}` : c.node ? `node ${c.node}` : "no step"} (${c.label})`, ...(def ? [def.definition] : [])]);
    }
  }

  const tableSheets: Sheet[] = [];
  const tableNames = new Map<string, string[]>();
  const stepRows: Cell[][] = [];
  const metricRows: Cell[][] = [];
  for (const n of nodes) {
    const step = steps.get(n.id)!;
    const result = (n.result ?? {}) as { table?: TablePreview; metrics?: Record<string, number> };
    const sources: { title: string; table: ReturnType<typeof readTable> }[] = [];
    const seen = new Set<string>();
    const read = (path: string, sha?: string) => {
      const found = recordedSource(record, { path, sha });
      if (found.changed) summary.push(["Note", `${basename(path)} (step ${step})`, "changed after the run", found.path ? CHANGED_NOTE : CHANGED_NOTE_TABLE_LOST]);
      else if (found.missing) summary.push(["Note", `${basename(path)} (step ${step})`, "missing", MISSING_NOTE_TABLE_LOST]);
      return found.path ? readTable(found.path) : undefined;
    };
    if (result.table?.columns?.length) {
      const p = result.table.path;
      const full = p && TABLE.has(extname(p).toLowerCase()) ? read(p, n.outputs.find((o) => o.path === p)?.sha) : undefined;
      if (p) seen.add(p);
      sources.push({ title: p ? basename(p, extname(p)) : stepTitle(n), table: full ?? previewTable(result.table) });
    }
    for (const o of n.outputs) {
      if (seen.has(o.path) || !TABLE.has(extname(o.path).toLowerCase())) continue;
      seen.add(o.path);
      const t = read(o.path, o.sha);
      if (t) sources.push({ title: basename(o.path, extname(o.path)), table: t });
    }
    const names: string[] = [];
    for (const s of sources) {
      if (!s.table) continue;
      const name = sheetName(`Step ${step} ${s.title.replace(/[_-]+/g, " ")}`, used);
      names.push(s.table.rows.length < s.table.total ? `${name} (${s.table.rows.length} of ${s.table.total} rows)` : name);
      tableSheets.push({ name, columns: s.table.columns, rows: s.table.rows });
    }
    tableNames.set(n.id, names);
    for (const [k, v] of Object.entries(result.metrics ?? {})) metricRows.push([step, k, typeof v === "number" ? v : show(v)]);
    const said = [n.args.does, n.args.purpose].find((v): v is string => typeof v === "string" && v.trim() !== "");
    const methods = n.adapter ? methodsSentence(adapters, n) : n.summary;
    const plain = said?.trim() ?? w.toolText?.[n.tool] ?? (/\{[\w.]+\}/.test(methods) ? n.summary || n.tool : methods);
    const inputs = inputsOf(record, n);
    stepRows.push([
      step,
      n.tool,
      n.adapter || "harness",
      plain,
      n.summary,
      inputs.map((i) => i.path || "(path not recorded)").join("\n"),
      inputs.map((i) => i.sha).join("\n"),
      n.outputs.map((o) => rel(dir, o.path)).join("\n"),
      names.join("\n"),
      stepLines(adapters, n).join("\n"),
      n.fidelity,
      rewound.has(n.id) ? "rewound" : stateOf(record, status, steps, n.id),
      n.envHash ? n.envHash.slice(0, 12) : "",
      n.id,
    ]);
  }

  const fileRows: Cell[][] = [];
  const listed = new Set<string>();
  for (const n of nodes)
    for (const f of figureSources(n, record, true)) {
      const found = recordedSource(record, f);
      if (!found.path && found.changed) summary.push(["Note", `${basename(f.path)} (step ${steps.get(n.id)})`, "changed after the run", `${CHANGED_NOTE_LOST}`]);
      else if (found.missing) summary.push(["Note", `${basename(f.path)} (step ${steps.get(n.id)})`, "missing", MISSING_NOTE_LOST]);
    }
  for (const f of w.figures) {
    listed.add(f.path);
    if (f.note) summary.push(["Note", `${basename(f.source)} (step ${f.step})`, "changed after the run", f.note]);
    fileRows.push([f.step, "figure", rel(dir, f.path), f.source === f.path ? "" : rel(dir, f.source)]);
  }
  for (const n of nodes) {
    for (const o of n.outputs) {
      if (listed.has(o.path)) continue;
      listed.add(o.path);
      const kind = TABLE.has(extname(o.path).toLowerCase()) ? "table" : o.kind === "image" ? "image" : "file";
      fileRows.push([steps.get(n.id)!, kind, rel(dir, o.path), ""]);
    }
  }

  for (const d of DECKS) if (!listed.has(join(dir, d)) && existsSync(join(dir, d))) fileRows.push(["", "image deck", d, ""]);
  const packaged = envsUsed(record).filter((e) => e.kind !== "program");
  for (const e of packaged) summary.push(["Environment", e.name, e.language, `${e.packages.length} packages, lock ${e.hash.slice(0, 12)}`]);
  const packageRows: Cell[][] = packaged.flatMap((e) => e.packages.map((p) => [e.name, e.language, p.name, p.version, e.path, e.hash.slice(0, 12)]));
  const changeRowsOut: Cell[][] = reruns(record).flatMap((d) => d.rows.map((r) => [d.step, d.oldStep, d.tool, r.name, r.before, r.after, r.change, changeCell(r), d.reasons.join(" ")]));

  const pilot = pilotRows(record);
  const validation = validationRows(record);
  const tests = testsTable(record);
  const checklist = recordChecklist(record);
  return [
    { name: "Summary", columns: ["Section", "Item", "Value", "Source", "Definition"], rows: summary },
    ...(pilot.rows.length ? [{ name: "Pilot", columns: pilot.columns, rows: pilot.rows }] : []),
    ...(validation ? [{ name: "Validation", columns: validation.columns, rows: [...validation.rows, [], ...validation.summary.map((x) => [x]), ...(validation.plot ? [[`Bland-Altman plot: ${rel(dir, validation.plot)}`]] : [])] }] : []),
    ...checkSheets(record),
    ...deviationSheets(record),
    ...(tests ? [{ name: "Tests in this session", columns: tests.columns, rows: tests.rows }] : []),
    ...tableSheets,
    { name: "Steps", columns: ["Step", "Tool", "Adapter", "Description", "Result", "Inputs", "Input SHA-256", "Outputs", "Table sheets", "Manual route", "Fidelity", "Status", "Environment", "Node"], rows: stepRows },
    ...(metricRows.length ? [{ name: "Metrics", columns: ["Step", "Metric", "Value"], rows: metricRows }] : []),
    { name: "Files", columns: ["Step", "Kind", "Path", "Copied from"], rows: fileRows },
    ...(changeRowsOut.length ? [{ name: "Changes", columns: ["Step", "Repeats step", "Tool", "Number", "Before", "After", "Change", "Change shown", "Why it ran again"], rows: changeRowsOut }] : []),
    ...(checklist ? [{ name: "Checklist", columns: CHECKLIST_COLUMNS, rows: checklistRows(checklist) }] : []),
    ...(packageRows.length ? [{ name: "Packages", columns: ["Environment", "Language", "Package", "Version", "Path", "Lock"], rows: packageRows }] : []),
    referenceSheet(record, adapters, w.citationStyle),
  ];
}

function stateOf(record: AnalysisRecord, status: Map<string, { current: boolean; reasons: { text: string }[] }>, steps: Map<string, number>, id: string): string {
  const newer = record.replacedBy(id);
  if (newer) return `replaced by step ${steps.get(record.latest(id)) ?? ""}`;
  const s = status.get(id);
  return !s || s.current ? "current" : `out of date: ${s.reasons.map((r) => r.text).join(" ")}`;
}

export function envsUsed(record: AnalysisRecord) {
  const hashes = new Set([...record.nodes().map((n) => n.envHash), ...record.entries(["adapter"]).map((e) => e.data.envHash as string | undefined)].filter((h): h is string => !!h));
  return record.environments().filter((e) => hashes.has(e.hash) || !record.nodes().length);
}

export function lockFiles(record: AnalysisRecord): { name: string; text: string }[] {
  const envs = envsUsed(record);
  if (!envs.length) return [];
  const steps = stepNumbers(record.nodes());
  const lock = {
    session: record.sessionId,
    written: new Date().toISOString(),
    environments: envs.map((e) => ({
      hash: e.hash,
      name: e.name,
      kind: e.kind,
      path: e.path,
      language: e.language,
      steps: record.nodes().filter((n) => n.envHash === e.hash && steps.has(n.id)).map((n) => steps.get(n.id)),
      packages: Object.fromEntries(e.packages.map((p) => [p.name, p.version])),
    })),
  };
  const latest = (kind: string) => {
    const by = new Map<string, (typeof envs)[number]>();
    for (const e of envs) if (e.kind === kind) by.set(e.path, e);
    return [...by.values()];
  };
  const named = (list: typeof envs, base: string, ext: string) => list.map((e) => ({ e, name: list.length === 1 ? `${base}${ext}` : `${base}-${e.name.replace(/[^\w.-]+/g, "_")}${ext}` }));
  return [
    { name: "environment.lock.json", text: JSON.stringify(lock, null, 2) + "\n" },
    ...named(latest("python"), "requirements", ".txt").map(({ e, name }) => ({ name, text: requirementsText(e) })),
    ...named(latest("r"), "renv", ".lock").map(({ e, name }) => ({ name, text: renvLock(e) })),
  ];
}

export function writeResults(w: Omit<WorkbookInput, "figures"> & { xlsx: boolean }): Saved {
  mkdirSync(w.dir, { recursive: true });
  const figures = copyFigures(w.record, w.dir);
  for (const f of lockFiles(w.record)) writeFileSync(join(w.dir, f.name), f.text);
  const shown = figures.filter((f) => !/\.(svg|pdf|eps)$/i.test(f.path) || !figures.some((g) => g !== f && g.path.replace(/\.[^.]+$/, "") === f.path.replace(/\.[^.]+$/, "")));
  writeReferences(w.record, w.adapters, w.dir);
  const decks = DECKS.filter((d) => existsSync(join(w.dir, d)));
  if (!w.xlsx) return { dir: w.dir, sheets: 0, figures: shown.length, decks };
  const sheets = buildWorkbook({ ...w, figures });
  const path = join(w.dir, "results.xlsx");
  writeFileSync(path, xlsx(sheets));
  return { dir: w.dir, xlsx: path, sheets: sheets.length, figures: shown.length, decks };
}

export function savedLine(s: Saved, home = process.env.HOME ?? ""): string {
  const parts: string[] = [];
  if (s.xlsx) parts.push(`results.xlsx (${s.sheets} ${s.sheets === 1 ? "sheet" : "sheets"})`);
  if (s.figures) parts.push(`${s.figures} ${s.figures === 1 ? "figure" : "figures"} in figures/`);
  if (s.decks?.length) parts.push(s.decks.join(" and "));
  const dir = home && (s.dir === home || s.dir.startsWith(home + "/")) ? "~" + s.dir.slice(home.length) : s.dir;
  return `Saved: ${parts.join(", ") || "nothing new"}. Folder: ${dir}`;
}

