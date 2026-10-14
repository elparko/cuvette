import { spawn } from "node:child_process";
import { blindArgv } from "../blind.ts";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, extname, isAbsolute, join, resolve } from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { addOldEnv } from "../../core/old-names.ts";
import type { Args, Fidelity, OutputFile, TablePreview, Tool, ToolContext, ToolOutput } from "../../core/types.ts";
import type { LoadedAdapter, MapEntry, ToolDef } from "../manifest.ts";
import type { AdapterRuntime } from "../runtime.ts";
import { ROOT } from "../../root.ts";

export interface Dirs {
  workDir: string;
  sessionDir: string;
  projectDir?: string;
  outputDir?: string;
  figureFormats?: string;
  xlsx?: boolean;
  heldBack?: () => string[];
}

export interface KindContext {
  adapter: LoadedAdapter;
  dirs: Dirs;
  ph: Record<string, string>;
  programPath?: string;
  programVersion: string;
  how: string;
  ready?: Promise<void>;
}

export interface CallDir {
  dir: string;
  outputs: Record<string, string>;
}

export const TSX_CLI = join(ROOT, "node_modules/tsx/dist/cli.mjs");

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".tif", ".tiff", ".gif", ".bmp", ".webp", ".svg"]);
const TABLE_EXT = new Set([".csv", ".tsv"]);

export function fileKind(path: string): OutputFile["kind"] {
  const e = extname(path).toLowerCase();
  if (IMAGE_EXT.has(e)) return "image";
  if (TABLE_EXT.has(e)) return "table";
  return "file";
}

export function outputFile(path: string, name?: string): OutputFile {
  return { path, kind: fileKind(path), name: name ?? basename(path) };
}

export function cap(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}\n[truncated: ${s.length - n} more characters]` : s;
}

export function tail(s: string, n: number): string {
  return s.length > n ? s.slice(s.length - n) : s;
}

// ---------------------------------------------------------------- placeholders and templates

export function placeholders(adapter: LoadedAdapter, dirs: Dirs, programPath: string | undefined): Record<string, string> {
  return {
    node: process.execPath,
    tsx: TSX_CLI,
    adapter_dir: adapter.root,
    work_dir: dirs.workDir,
    session_dir: dirs.sessionDir,
    program_path: programPath ?? "",
  };
}

export function childEnv(c: KindContext, extra: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  for (const [k, v] of Object.entries(c.adapter.manifest.connection.env)) env[k] = expand(v, c.ph);
  env.CUVETTE_WORK_DIR = c.dirs.workDir;
  env.CUVETTE_SESSION_DIR = c.dirs.sessionDir;
  env.CUVETTE_ADAPTER_DIR = c.adapter.root;
  env.CUVETTE_PROGRAM_PATH = c.programPath ?? "";
  if (c.dirs.figureFormats !== undefined) env.CUVETTE_FIGURE_FORMATS = c.dirs.figureFormats;
  if (c.dirs.outputDir) env.CUVETTE_OUTPUT_DIR = c.dirs.outputDir;
  return addOldEnv({ ...env, ...extra });
}

export function expand(s: string, ph: Record<string, string>): string {
  return s.replace(/\{(env:[^{}]+|[a-z_]+)\}/g, (all, name: string) => {
    if (name.startsWith("env:")) return process.env[name.slice(4)] ?? "";
    if (name === "program_path" && !ph.program_path) throw new Error("the program was not found. Set locate.env, locate.paths or locate.which in the adapter");
    return name in ph ? ph[name] : all;
  });
}

export interface Scope {
  ph: Record<string, string>;
  args: Args;
  outputs: Record<string, string>;
  declared: Set<string>;
}

export function lookup(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function scalar(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(Number(v.toPrecision(12)));
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const NAME = /\{([A-Za-z_][\w.:-]*)\}/g;

function resolveName(name: string, s: Scope): { value: string | undefined; absent: boolean } | undefined {
  if (name.startsWith("output.")) {
    const p = s.outputs[name.slice(7)];
    return p === undefined ? undefined : { value: p, absent: false };
  }
  if (name.startsWith("env:") || name in s.ph) return { value: expand(`{${name}}`, s.ph), absent: false };
  const v = lookup(s.args, name);
  if (v !== undefined) return { value: scalar(v), absent: false };
  if (s.declared.has(name.split(".")[0])) return { value: undefined, absent: true };
  return undefined;
}

export function renderString(tpl: string, s: Scope): string {
  return tpl.replace(NAME, (all, name: string) => {
    const r = resolveName(name, s);
    if (!r) return all;
    return r.value ?? "";
  });
}

export function renderArgv(template: string[], s: Scope): string[] {
  const out: string[] = [];
  let flagAt = -1;
  for (const item of template) {
    const whole = /^\{([A-Za-z_][\w.:-]*)\}$/.exec(item);
    if (whole) {
      const v = lookup(s.args, whole[1]);
      if (Array.isArray(v) && !(whole[1] in s.ph)) {
        out.push(...v.map(scalar));
        flagAt = -1;
        continue;
      }
    }
    let absent = false;
    let hasName = false;
    const text = item.replace(NAME, (all, name: string) => {
      const r = resolveName(name, s);
      if (!r) return all;
      hasName = true;
      if (r.absent) absent = true;
      return r.value ?? "";
    });
    if (absent) {
      if (whole && flagAt === out.length - 1) out.pop();
      flagAt = -1;
      continue;
    }
    out.push(text);
    flagAt = !hasName && /^-/.test(item) && !item.includes("=") ? out.length - 1 : -1;
  }
  return out;
}

export function quoteArg(a: string): string {
  if (/^[\w@%+=:,./\\-]+$/.test(a)) return a;
  if (process.platform === "win32") return `"${a.replace(/"/g, '\\"')}"`;
  return `'${a.replace(/'/g, `'\\''`)}'`;
}

export function commandLine(argv: string[]): string {
  return argv.map(quoteArg).join(" ");
}

// ---------------------------------------------------------------- schema

export function schemaFor(def: ToolDef): Record<string, unknown> {
  return { type: "object", properties: def.params, required: def.required, additionalProperties: false };
}

function typeOk(t: string, v: unknown): boolean {
  switch (t) {
    case "string": return typeof v === "string";
    case "number": return typeof v === "number" && Number.isFinite(v);
    case "integer": return typeof v === "number" && Number.isInteger(v);
    case "boolean": return typeof v === "boolean";
    case "array": return Array.isArray(v);
    case "object": return typeof v === "object" && v !== null && !Array.isArray(v);
    case "null": return v === null;
    default: return true;
  }
}

function coerce(schema: Record<string, unknown>, v: unknown): unknown {
  const types = ([] as unknown[]).concat(schema.type ?? []).map(String);
  if (typeof v === "string" && !types.includes("string")) {
    if ((types.includes("number") || types.includes("integer")) && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
    if (types.includes("boolean") && (v === "true" || v === "false")) return v === "true";
  }
  return v;
}

function checkValue(path: string, schema: Record<string, unknown>, raw: unknown): { value: unknown; error?: string } {
  const v = coerce(schema, raw);
  const types = ([] as unknown[]).concat(schema.type ?? []).map(String);
  if (types.length && !types.some((t) => typeOk(t, v))) return { value: v, error: `${path} must be of type ${types.join(" or ")}` };
  if (Array.isArray(schema.enum) && !schema.enum.some((e) => e === v)) return { value: v, error: `${path} must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(", ")}` };
  if (typeof v === "number") {
    if (typeof schema.minimum === "number" && v < schema.minimum) return { value: v, error: `${path} must be at least ${schema.minimum}` };
    if (typeof schema.maximum === "number" && v > schema.maximum) return { value: v, error: `${path} must be at most ${schema.maximum}` };
    if (typeof schema.exclusiveMinimum === "number" && v <= schema.exclusiveMinimum) return { value: v, error: `${path} must be above ${schema.exclusiveMinimum}` };
    if (typeof schema.exclusiveMaximum === "number" && v >= schema.exclusiveMaximum) return { value: v, error: `${path} must be below ${schema.exclusiveMaximum}` };
  }
  if (typeof v === "string") {
    if (typeof schema.minLength === "number" && v.length < schema.minLength) return { value: v, error: `${path} must have at least ${schema.minLength} characters` };
    if (typeof schema.maxLength === "number" && v.length > schema.maxLength) return { value: v, error: `${path} must have at most ${schema.maxLength} characters` };
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern).test(v)) return { value: v, error: `${path} must match the pattern ${schema.pattern}` };
  }
  if (Array.isArray(v)) {
    if (typeof schema.minItems === "number" && v.length < schema.minItems) return { value: v, error: `${path} must have at least ${schema.minItems} items` };
    if (typeof schema.maxItems === "number" && v.length > schema.maxItems) return { value: v, error: `${path} must have at most ${schema.maxItems} items` };
    if (schema.items && typeof schema.items === "object") {
      const out: unknown[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = checkValue(`${path}[${i}]`, schema.items as Record<string, unknown>, v[i]);
        if (r.error) return r;
        out.push(r.value);
      }
      return { value: out };
    }
  }
  if (typeof v === "object" && v !== null && !Array.isArray(v) && schema.properties) {
    const r = checkObject(path, schema, v as Args);
    return r.error ? { value: v, error: r.error } : { value: r.args };
  }
  return { value: v };
}

function checkObject(path: string, schema: Record<string, unknown>, args: Args): { args: Args; error?: string } {
  const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const out: Args = {};
  const prefix = path ? `${path}.` : "";
  for (const key of Object.keys(args)) {
    if (!(key in props) && schema.additionalProperties === false) return { args, error: `unknown argument ${prefix}${key}. The arguments of this tool are: ${Object.keys(props).join(", ")}. Leave out the others.` };
  }
  for (const [key, sub] of Object.entries(props)) {
    let v = args[key];
    if (v === undefined && "default" in sub) v = sub.default;
    if (v === undefined) continue;
    const r = checkValue(`${prefix}${key}`, sub, v);
    if (r.error) return { args, error: r.error };
    out[key] = r.value;
  }
  for (const key of (schema.required ?? []) as string[]) {
    if (out[key] === undefined) return { args, error: `missing required argument ${prefix}${key}` };
  }
  for (const key of Object.keys(args)) if (!(key in props) && args[key] !== undefined) out[key] = args[key];
  return { args: out };
}

export function validateArgs(schema: Record<string, unknown>, args: Args): { args: Args; error?: string } {
  return checkObject("", schema, args ?? {});
}

// ---------------------------------------------------------------- per-call folder and output files

const EXT_BY_KIND: Record<string, string> = { image: ".png", table: ".csv", json: ".json", text: ".txt", file: "" };

export function safeName(s: string): string {
  return s.replace(/[^\w.-]+/g, "_") || "tool";
}

export function uniqueDir(base: string, stem: string): string {
  mkdirSync(base, { recursive: true });
  for (let n = 1; ; n++) {
    const dir = join(base, `${stem}-${n}`);
    try {
      mkdirSync(dir);
      return dir;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
  }
}

export function uniqueFile(dir: string, stem: string, ext: string): string {
  mkdirSync(dir, { recursive: true });
  for (let n = 0; ; n++) {
    const p = join(dir, n === 0 ? `${stem}${ext}` : `${stem}-${n + 1}${ext}`);
    if (!existsSync(p)) return p;
  }
}

export function prepareCall(dirs: Dirs, def: ToolDef): CallDir {
  const dir = uniqueDir(dirs.workDir, safeName(def.name));
  const outputs: Record<string, string> = {};
  for (const [key, spec] of Object.entries(def.outputs)) {
    let ext = spec.ext || EXT_BY_KIND[spec.kind] || "";
    if (ext && !ext.startsWith(".")) ext = `.${ext}`;
    outputs[key] = join(dir, `${safeName(key)}${ext}`);
  }
  return { dir, outputs };
}

export function samePath(p: string): string {
  let r: string;
  try {
    r = realpathSync.native(p);
  } catch {
    r = resolve(p);
  }
  return process.platform === "win32" ? r.toLowerCase() : r;
}

export function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.push(p);
    }
  };
  if (existsSync(dir)) walk(dir);
  return out.sort();
}

export function collectOutputs(call: CallDir, def: ToolDef): OutputFile[] {
  const byPath = new Map(Object.entries(call.outputs).map(([k, p]) => [p, k]));
  return listFiles(call.dir).map((p) => {
    const key = byPath.get(p);
    const spec = key ? def.outputs[key] : undefined;
    const kind = spec && (spec.kind === "image" || spec.kind === "table") ? spec.kind : fileKind(p);
    return { path: p, kind, name: key ?? basename(p) };
  });
}

// ---------------------------------------------------------------- parsing

export interface Fields {
  ok?: boolean;
  error?: string;
  summary?: string;
  metrics?: Record<string, number>;
  outputs?: OutputFile[];
  table?: TablePreview;
  manualRoute?: string;
  fidelity?: Fidelity;
}

export function numberOrString(s: string): number | string {
  const t = s.trim();
  return t !== "" && /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t) ? Number(t) : s;
}

export function parseCsv(text: string, delim = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

export function tablePreview(text: string, path?: string, maxRows = 12, delim?: string): TablePreview {
  const d = delim ?? (path?.toLowerCase().endsWith(".tsv") || (text.split("\n", 1)[0].includes("\t") && !text.split("\n", 1)[0].includes(",")) ? "\t" : ",");
  const rows = parseCsv(text, d);
  const [columns = [], ...body] = rows;
  return { columns, rows: body.slice(0, maxRows).map((r) => r.map(numberOrString)), n_rows: body.length, path };
}

export function parseKeyValue(text: string): { data: Record<string, number | string>; metrics: Record<string, number> } {
  const data: Record<string, number | string> = {};
  const metrics: Record<string, number> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([^:=\s][^:=]*?)\s*[:=]\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1].replace(/\s+/g, "_");
    const v = numberOrString(m[2]);
    data[key] = v;
    if (typeof v === "number") metrics[key] = v;
  }
  return { data, metrics };
}

function numericTop(obj: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  return out;
}

function pathOutputs(value: unknown, into: Map<string, OutputFile>, depth = 0): void {
  if (depth > 6) return;
  if (typeof value === "string") {
    if (isAbsolute(value) && value.length < 1024) {
      try {
        if (statSync(value).isFile()) into.set(value, outputFile(value));
      } catch {}
    }
  } else if (Array.isArray(value)) for (const v of value.slice(0, 200)) pathOutputs(v, into, depth + 1);
  else if (value && typeof value === "object") for (const v of Object.values(value).slice(0, 200)) pathOutputs(v, into, depth + 1);
}

function asOutputFile(v: unknown): OutputFile | undefined {
  if (typeof v === "string") return outputFile(v);
  if (v && typeof v === "object" && typeof (v as { path?: unknown }).path === "string") {
    const o = v as { path: string; kind?: string; name?: string };
    const kind = o.kind === "image" || o.kind === "table" || o.kind === "file" ? o.kind : fileKind(o.path);
    return { path: o.path, kind, name: o.name ?? basename(o.path) };
  }
  return undefined;
}

export function readFields(obj: unknown, opts: { inferMetrics?: boolean; scanPaths?: boolean } = {}): Fields {
  const f: Fields = {};
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return f;
  const o = obj as Record<string, unknown>;
  if (typeof o.ok === "boolean") f.ok = o.ok;
  if (typeof o.error === "string") f.error = o.error;
  else if (Array.isArray(o.error) && o.error.length && o.error.every((e) => typeof e === "string")) f.error = [...new Set(o.error)].join("; ");
  if (typeof o.summary === "string") f.summary = o.summary;
  if (o.metrics && typeof o.metrics === "object" && !Array.isArray(o.metrics)) f.metrics = numericTop(o.metrics as Record<string, unknown>);
  else if (opts.inferMetrics) {
    const m = numericTop(o);
    if (Object.keys(m).length) f.metrics = m;
  }
  const found = new Map<string, OutputFile>();
  if (Array.isArray(o.outputs)) for (const v of o.outputs) {
    const of = asOutputFile(v);
    if (of) found.set(samePath(of.path), of);
  }
  if (opts.scanPaths) pathOutputs(o, found);
  if (found.size) f.outputs = [...found.values()];
  const t = o.table as { columns?: unknown; rows?: unknown; n_rows?: unknown; path?: unknown } | undefined;
  if (t && Array.isArray(t.columns) && Array.isArray(t.rows)) {
    const columns = t.columns.map((c) => (typeof c === "string" ? c : c && typeof c === "object" ? JSON.stringify(c) : String(c)));
    const rows = t.rows.map((r) => (Array.isArray(r) ? r : [r]));
    f.table = { columns, rows, n_rows: typeof t.n_rows === "number" ? t.n_rows : t.rows.length, path: typeof t.path === "string" ? t.path : undefined };
  }
  const route = o.manualRoute ?? o.manual_route;
  if (typeof route === "string") f.manualRoute = route;
  if (o.fidelity === "exact" || o.fidelity === "close" || o.fidelity === "code_only" || o.fidelity === "none") f.fidelity = o.fidelity;
  return f;
}

export function fmtNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toPrecision(Math.max(6, Math.floor(Math.log10(Math.abs(n))) + 2))));
}

export function failSummary(title: string, error?: string): string {
  const reason = (error ?? "").split("\n").map((l) => l.trim()).find(Boolean) ?? "the tool gave no reason";
  const short = reason.length > 160 ? `${reason.slice(0, 157).trimEnd()}...` : reason.replace(/[.\s]+$/, "");
  return `${title} failed: ${short}.`;
}

export function makeSummary(entry: MapEntry | undefined, title: string, args: Args, extra: { metrics?: Record<string, number>; data?: unknown; table?: TablePreview; summary?: string }): string {
  if (entry?.summary) {
    const scope = { ...args, metrics: extra.metrics ?? {}, data: extra.data, n_rows: extra.table?.n_rows, summary: extra.summary };
    let missing = false;
    const text = entry.summary.replace(NAME, (all, name: string) => {
      const v = lookup(scope, name);
      if (v === undefined) {
        missing = true;
        return all;
      }
      return typeof v === "number" ? fmtNumber(v) : scalar(v);
    });
    if (!missing) return text;
  }
  const m = Object.entries(extra.metrics ?? {}).slice(0, 4).map(([k, v]) => `${k}=${fmtNumber(v)}`);
  const parts = [`${title} finished.`];
  if (extra.table) parts.push(`Table: ${extra.table.n_rows} rows, ${extra.table.columns.length} columns.`);
  if (m.length) parts.push(`${m.join(", ")}.`);
  return parts.join(" ");
}

export function parseToolText(mode: ToolDef["parse"], stdout: string, files: OutputFile[]): { data?: unknown; metrics?: Record<string, number>; table?: TablePreview; fields: Fields } {
  const text = stdout.trim();
  if (mode === "json") {
    if (!text) return { fields: {} };
    const data = JSON.parse(text);
    return { data, fields: readFields(data, { inferMetrics: true, scanPaths: true }) };
  }
  if (mode === "keyvalue") {
    const { data, metrics } = parseKeyValue(stdout);
    return { data, metrics, fields: {} };
  }
  if (mode === "csv") {
    const file = text ? undefined : files.find((f) => f.kind === "table");
    return { table: tablePreview(text ? stdout : file ? readFileSync(file.path, "utf8") : "", file?.path), fields: {} };
  }
  return { fields: {} };
}


export function buildOutput(a: {
  adapter: LoadedAdapter;
  def: ToolDef;
  args: Args;
  call: CallDir;
  stdout: string;
  route: string;
  fidelity?: Fidelity;
}): ToolOutput {
  const files = collectOutputs(a.call, a.def);
  let parsed: ReturnType<typeof parseToolText>;
  try {
    parsed = parseToolText(a.def.parse, a.stdout, files);
  } catch (e) {
    return { ok: false, error: `the output is not valid ${a.def.parse}: ${(e as Error).message}`, text: cap(a.stdout, 4000), outputs: files, manualRoute: a.route };
  }
  const f = parsed.fields;
  const outputs = new Map(files.map((o) => [o.path, o]));
  for (const o of f.outputs ?? []) if (!outputs.has(o.path)) outputs.set(o.path, o);
  const metrics = f.metrics ?? parsed.metrics;
  const table = f.table ?? parsed.table;
  const entry = a.adapter.mapEntry(a.def.name, a.args);
  let shown = a.stdout;
  if (!shown.trim()) {
    for (const [key, spec] of Object.entries(a.def.outputs)) {
      const p = a.call.outputs[key];
      if ((spec.kind === "text" || spec.kind === "json") && existsSync(p)) {
        shown = readFileSync(p, "utf8");
        break;
      }
    }
  }
  const out: ToolOutput = {
    ok: f.ok !== false,
    text: cap(shown, 20000),
    summary: "",
    manualRoute: f.manualRoute ?? a.route,
    fidelity: f.fidelity ?? a.fidelity ?? entry?.fidelity,
  };
  if (f.error) out.error = f.error;
  if (parsed.data !== undefined) out.data = parsed.data;
  if (metrics) out.metrics = metrics;
  if (table) out.table = table;
  if (outputs.size) out.outputs = [...outputs.values()];
  if (!out.ok && !out.error) out.error = f.summary ?? "the tool reported a failure";
  out.summary = !out.ok
    ? failSummary(a.def.title || a.def.name, out.error)
    : entry?.summary ? makeSummary(entry, a.def.title || a.def.name, a.args, { metrics, data: out.data, table, summary: f.summary }) : f.summary ?? makeSummary(entry, a.def.title || a.def.name, a.args, { metrics, data: out.data, table });
  return out;
}

// ---------------------------------------------------------------- processes

export interface RunOpts {
  cwd?: string;
  env?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  stdin?: string;
  maxBytes?: number;
}

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  aborted: boolean;
  error?: string;
}

export function killTree(pid: number | undefined): void {
  if (!pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true }).on("error", () => {});
    return;
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {}
  }
}

async function descendants(pid: number): Promise<number[]> {
  const r = await runProcess(["ps", "-A", "-o", "pid=,ppid="], { timeoutMs: 5000 });
  const kids = new Map<number, number[]>();
  for (const line of r.stdout.split("\n")) {
    const [c, p] = line.trim().split(/\s+/).map(Number);
    if (c && p) kids.set(p, [...(kids.get(p) ?? []), c]);
  }
  const all: number[] = [];
  const walk = (n: number) => {
    for (const k of kids.get(n) ?? []) {
      all.push(k);
      walk(k);
    }
  };
  walk(pid);
  return all;
}

export async function killWithChildren(pid: number | undefined): Promise<void> {
  if (!pid) return;
  if (process.platform === "win32") {
    killTree(pid);
    return;
  }
  for (const n of [pid, ...(await descendants(pid))]) {
    try {
      process.kill(n, "SIGKILL");
    } catch {}
  }
}

// A script can start a process in a new session. The process group kill does not reach it, so the children are listed first.
// SIGSTOP stops the group, so the script starts no new process in it while the list is made. A child in a new session keeps running.
// If Cuvette exits during the list, the exit handler kills the stopped group.
const stoppedGroups = new Set<number>();
let exitHandler = false;

function killGroup(pid: number): void {
  try {
    process.kill(-pid, "SIGKILL");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ESRCH") return;
    try {
      process.kill(pid, "SIGKILL");
    } catch {}
  }
}

export async function killAll(pid: number | undefined): Promise<void> {
  if (!pid) return;
  if (process.platform === "win32") {
    killTree(pid);
    return;
  }
  if (!exitHandler) {
    exitHandler = true;
    process.on("exit", () => stoppedGroups.forEach(killGroup));
  }
  stoppedGroups.add(pid);
  let kids: number[] = [];
  try {
    try {
      process.kill(-pid, "SIGSTOP");
    } catch {}
    kids = await descendants(pid).catch(() => []);
  } finally {
    killGroup(pid);
    stoppedGroups.delete(pid);
    for (const n of kids) {
      try {
        process.kill(n, "SIGKILL");
      } catch {}
    }
  }
}

export function runProcess(given: string[], o: RunOpts = {}): Promise<RunResult> {
  const argv = blindArgv(given);
  return new Promise((done) => {
    const max = o.maxBytes ?? 16_000_000;
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let aborted = false;
    let settled = false;
    const child = spawn(argv[0], argv.slice(1), {
      cwd: o.cwd,
      env: o.env,
      stdio: [o.stdin === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      detached: process.platform !== "win32",
      windowsHide: true,
    });
    const finish = (r: Partial<RunResult>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      o.signal?.removeEventListener("abort", onAbort);
      done({ code: null, stdout, stderr, timedOut, aborted, ...r });
    };
    const timer = o.timeoutMs ? setTimeout(() => {
      timedOut = true;
      killTree(child.pid);
    }, o.timeoutMs) : undefined;
    const onAbort = () => {
      aborted = true;
      killTree(child.pid);
    };
    if (o.signal?.aborted) onAbort();
    else o.signal?.addEventListener("abort", onAbort, { once: true });
    child.stdout?.setEncoding("utf8").on("data", (d: string) => {
      if (stdout.length < max) stdout += d;
    });
    child.stderr?.setEncoding("utf8").on("data", (d: string) => {
      if (stderr.length < max) stderr += d;
    });
    if (o.stdin !== undefined) {
      child.stdin?.on("error", () => {});
      child.stdin?.end(o.stdin);
    }
    child.on("error", (e) => finish({ error: e.message }));
    child.on("exit", (code) => {
      setTimeout(() => {
        child.stdout?.destroy();
        child.stderr?.destroy();
        finish({ code });
      }, EXIT_GRACE_MS).unref();
    });
    child.on("close", (code) => finish({ code }));
  });
}

export const EXIT_GRACE_MS = 2000;

const SECRET_ENV = /key|token|secret|password|passwd|credential/i;

export function withoutSecrets(env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) if (v !== undefined && !SECRET_ENV.test(k)) out[k] = v;
  return out;
}

export function processFailure(r: RunResult, label: string, timeoutS: number): string | undefined {
  if (r.error) return `cannot start ${label}: ${r.error}`;
  if (r.aborted) return `${label} was cancelled`;
  if (r.timedOut) return `${label} timed out after ${timeoutS} s`;
  if (r.code !== 0) return `${label} exited with code ${r.code}${r.stderr.trim() ? `: ${tail(r.stderr.trim(), 2000)}` : ""}`;
  return undefined;
}

export function inflight() {
  const live = new Set<AbortController>();
  return {
    async track<T>(outer: AbortSignal, fn: (s: AbortSignal) => Promise<T>): Promise<T> {
      const c = new AbortController();
      live.add(c);
      try {
        return await fn(AbortSignal.any([outer, c.signal]));
      } finally {
        live.delete(c);
      }
    },
    cancel() {
      for (const c of live) c.abort();
    },
    get busy() {
      return live.size > 0;
    },
  };
}

// ---------------------------------------------------------------- tools and runtimes

export function decorate(c: KindContext, def: Pick<ToolDef, "read_only" | "approval"> | undefined, tool: Omit<Tool, "source" | "adapter" | "remoteName">): Tool {
  const t: Tool = { ...tool, source: "adapter", adapter: c.adapter.name, remoteName: tool.name };
  if (def?.read_only) t.readOnly = true;
  if (def?.approval) t.permission = "ask";
  return t;
}

function handleStrings(schema: Record<string, unknown>, raw: Args): Args {
  const props = (schema.properties ?? {}) as Record<string, { type?: unknown }>;
  const out: Args = { ...raw };
  for (const [k, v] of Object.entries(raw)) {
    const t = props[k]?.type;
    const types = Array.isArray(t) ? t : [t];
    if (typeof v === "string" && /^h\d+$/.test(v) && types.includes("object") && !types.includes("string")) out[k] = { handle: v };
  }
  return out;
}

export function defTool(c: KindContext, def: ToolDef, run: (a: { args: Args; ctx: ToolContext; call: CallDir }) => Promise<ToolOutput>): Tool {
  const schema = schemaFor(def);
  return decorate(c, def, {
    name: def.name,
    title: def.title || undefined,
    description: def.description,
    inputSchema: schema,
    async execute(raw, ctx) {
      const v = validateArgs(schema, handleStrings(schema, raw));
      if (v.error) return { ok: false, error: v.error };
      try {
        return await run({ args: v.args, ctx, call: prepareCall(c.dirs, def) });
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },
  });
}

export function scopeFor(c: KindContext, def: ToolDef, args: Args, call: CallDir): Scope {
  return { ph: c.ph, args, outputs: call.outputs, declared: new Set(Object.keys(def.params)) };
}

export function makeRuntime(c: KindContext, parts: {
  tools: () => Promise<Tool[]> | Tool[];
  instructions?: string;
  running?: () => boolean;
  cancel?: () => Promise<void> | void;
  close?: () => Promise<void> | void;
  warm?: (load: boolean) => void;
}): AdapterRuntime {
  let closed = false;
  let interpreter: string[] = [];
  try {
    interpreter = c.adapter.manifest.connection.interpreter.map((a) => expand(a, c.ph));
  } catch {}
  return {
    adapter: c.adapter,
    programVersion: c.programVersion,
    programPath: c.programPath,
    interpreter,
    instructions: parts.instructions ?? c.adapter.manifest.adapter.description,
    get running() {
      return !closed && (parts.running?.() ?? true);
    },
    async tools() {
      return parts.tools();
    },
    async cancel() {
      await parts.cancel?.();
    },
    warm: parts.warm,
    async close() {
      closed = true;
      await parts.close?.();
    },
  };
}

// ---------------------------------------------------------------- images

export function solidPng(w: number, h: number, rgb: [number, number, number] = [200, 60, 60]): Buffer {
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) row.set(rgb, 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
