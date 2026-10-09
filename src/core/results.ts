import { pilotRows, validationRows } from "./pilot.ts";
import { approvedPlan, definitionsOf } from "./plan.ts";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, isAbsolute, join, relative } from "node:path";
import type { LoadedAdapter } from "../adapters/manifest.ts";
import { zip } from "../eln/zip.ts";
import { checkAnswer } from "./claims.ts";
import type { DecisionField } from "./decisions.ts";
import { mainNodes, methodsSentence, stepLines } from "./exports.ts";
import { stepNumbers } from "./housekeeping.ts";
import type { AnalysisRecord } from "./record.ts";
import type { Node, TablePreview } from "./types.ts";

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
}

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

export function outputRules(o: { output: string; figureFormats: string; xlsx: boolean }): string {
  const vec = vectorFormats(o.figureFormats).map((f) => f.toUpperCase());
  const figures =
    `Save every figure in the figures folder ${join(o.output, "figures")} as PNG (300 dpi)${vec.length ? ` and ${vec.join(" and ")}` : ""}, with axis labels and units.` +
    (vec.length ? ` A PNG that matplotlib saves gets the ${vec.join(" and ")} copy automatically.` : "");
  const tables = o.xlsx
    ? `Write each result table as a CSV file in ${o.output}. The harness adds each CSV to results.xlsx. Do not write an xlsx file yourself, unless the scientist asks for a specific layout.`
    : `Write each result table as a CSV file in ${o.output}.`;
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

export function parseCsv(text: string, sep = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
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
      if (!(typeof v === "number" || (typeof v === "string" && NUMBER.test(v)))) numeric = false;
      if (!(typeof v === "boolean" || (typeof v === "string" && /^(true|false)$/i.test(v.trim())))) bool = false;
    }
    return !any ? "text" : numeric ? "number" : bool ? "bool" : "text";
  });
  return rows.map((r) =>
    Array.from({ length: width }, (_, j) => {
      const v = r[j];
      if (v === null || v === undefined) return null;
      if (kinds[j] === "number") return typeof v === "number" ? v : typeof v === "string" && MISSING.has(v.trim()) ? null : Number(v);
      if (kinds[j] === "bool") return typeof v === "boolean" ? v : typeof v === "string" && MISSING.has(v.trim()) ? null : /^true$/i.test(String(v).trim());
      if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") return v;
      return JSON.stringify(v);
    }),
  );
}

export function readTable(path: string): { columns: string[]; rows: Cell[][]; total: number } | undefined {
  if (!existsSync(path) || statSync(path).size > MAX_TABLE_BYTES) return undefined;
  const all = parseCsv(readFileSync(path, "utf8").replace(/^\ufeff/, ""), extname(path).toLowerCase() === ".tsv" ? "\t" : ",");
  if (!all.length) return undefined;
  const [head, ...body] = all;
  const width = Math.max(head!.length, ...body.slice(0, 1000).map((r) => r.length));
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
}

function figureSources(n: Node, record: AnalysisRecord): { path: string; sha?: string }[] {
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
  return out.filter((f) => existsSync(f.path) || (f.sha && record.blobPath(f.sha)));
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
      const src = existsSync(f.path) ? f.path : record.blobPath(f.sha!)!;
      mkdirSync(figDir, { recursive: true });
      const fresh = existsSync(dest) && statSync(dest).size === statSync(src).size && statSync(dest).mtimeMs >= statSync(src).mtimeMs;
      if (!fresh) copyFileSync(src, dest);
      out.push({ step, node: n.id, path: dest, source: f.path });
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
  if (last) return `${last.data.by === "agent" ? "agent" : last.data.by === "profile" ? "lab profile" : "scientist"}${last.data.reason ? ` (${last.data.reason})` : ""}`;
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

export function buildWorkbook(w: WorkbookInput): Sheet[] {
  const { record, adapters, dir } = w;
  const used = new Set(["summary", "steps", "files", "metrics", "pilot", "validation"]);
  const steps = stepNumbers(record.nodes());
  const stale = record.stale();
  const nodes = mainNodes(record);

  const question = w.fields.find((f) => f.key === "question" && f.set && f.value)?.value ?? record.entries(["user"])[0]?.data.text ?? "";
  const first = record.entries()[0];
  const summary: Cell[][] = [["Question", "Question", show(question), ""]];
  for (const p of w.programs) summary.push(["Program", p.name, p.programVersion || "", p.version ? `adapter ${p.version}` : ""]);
  if (nodes.some((n) => n.tool === "run_script")) summary.push(["Program", "Python script (run_script)", "", ""]);
  summary.push(["Date", "Session started", localDate(first?.ts ?? new Date().toISOString()), first?.session ?? ""]);
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
    if (result.table?.columns?.length) {
      const p = result.table.path;
      const full = p && TABLE.has(extname(p).toLowerCase()) ? readTable(p) : undefined;
      if (p) seen.add(p);
      sources.push({ title: p ? basename(p, extname(p)) : stepTitle(n), table: full ?? previewTable(result.table) });
    }
    for (const o of n.outputs) {
      if (seen.has(o.path) || !TABLE.has(extname(o.path).toLowerCase())) continue;
      seen.add(o.path);
      const t = readTable(o.path);
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
    const plain = said?.trim() ?? w.toolText?.[n.tool] ?? (n.adapter ? methodsSentence(adapters, n) : n.summary);
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
      stale.has(n.id) ? "out of date" : "current",
      n.id,
    ]);
  }

  const fileRows: Cell[][] = [];
  const listed = new Set<string>();
  for (const f of w.figures) {
    listed.add(f.path);
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

  const pilot = pilotRows(record);
  const validation = validationRows(record);
  return [
    { name: "Summary", columns: ["Section", "Item", "Value", "Source", "Definition"], rows: summary },
    ...(pilot.rows.length ? [{ name: "Pilot", columns: pilot.columns, rows: pilot.rows }] : []),
    ...(validation ? [{ name: "Validation", columns: validation.columns, rows: [...validation.rows, [], ...validation.summary.map((x) => [x]), ...(validation.plot ? [[`Bland-Altman plot: ${rel(dir, validation.plot)}`]] : [])] }] : []),
    ...tableSheets,
    { name: "Steps", columns: ["Step", "Tool", "Adapter", "Description", "Result", "Inputs", "Input SHA-256", "Outputs", "Table sheets", "Manual route", "Fidelity", "Status", "Node"], rows: stepRows },
    ...(metricRows.length ? [{ name: "Metrics", columns: ["Step", "Metric", "Value"], rows: metricRows }] : []),
    { name: "Files", columns: ["Step", "Kind", "Path", "Copied from"], rows: fileRows },
  ];
}

export function writeResults(w: Omit<WorkbookInput, "figures"> & { xlsx: boolean }): Saved {
  mkdirSync(w.dir, { recursive: true });
  const figures = copyFigures(w.record, w.dir);
  const shown = figures.filter((f) => !/\.(svg|pdf|eps)$/i.test(f.path) || !figures.some((g) => g !== f && g.path.replace(/\.[^.]+$/, "") === f.path.replace(/\.[^.]+$/, "")));
  if (!w.xlsx) return { dir: w.dir, sheets: 0, figures: shown.length };
  const sheets = buildWorkbook({ ...w, figures });
  const path = join(w.dir, "results.xlsx");
  writeFileSync(path, xlsx(sheets));
  return { dir: w.dir, xlsx: path, sheets: sheets.length, figures: shown.length };
}

export function savedLine(s: Saved, home = process.env.HOME ?? ""): string {
  const parts: string[] = [];
  if (s.xlsx) parts.push(`results.xlsx (${s.sheets} ${s.sheets === 1 ? "sheet" : "sheets"})`);
  if (s.figures) parts.push(`${s.figures} ${s.figures === 1 ? "figure" : "figures"} in figures/`);
  const dir = home && (s.dir === home || s.dir.startsWith(home + "/")) ? "~" + s.dir.slice(home.length) : s.dir;
  return `Saved: ${parts.join(", ") || "nothing new"}. Folder: ${dir}`;
}

