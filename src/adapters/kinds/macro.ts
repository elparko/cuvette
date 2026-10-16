import { guardCommand } from "../../tools/run_script.ts";
import { existsSync, readdirSync, readFileSync, writeFileSync, realpathSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import type { Args, Fidelity, OutputFile, TablePreview, Tool, ToolOutput } from "../../core/types.ts";
import { locate } from "../locate.ts";
import type { AdapterModule, LoadedAdapter, ToolDef } from "../manifest.ts";
import type { AdapterRuntime } from "../runtime.ts";
import {
  cap, childEnv, samePath, defTool, envAllowed, expand, fileKind, fmtNumber, inflight, lookup, makeRuntime, makeSummary, numberOrString,
  integrityError, placeholders, processFailure, runProcess, scalar, tablePreview, type CallDir, type Dirs, type KindContext,
} from "./common.ts";

const TOKEN = /\{(raw:|include:)?([A-Za-z_][\w.:-]*)\}/g;
const KEY_LINE = /^([A-Za-z_][\w.]*)=(.*)$/;
const RESERVED = new Set(["table", "output", "error", "warning"]);

export function macroString(v: unknown): string {
  return scalar(v)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

export interface MacroScope {
  args: Args;
  outputs: Record<string, string>;
  ph: Record<string, string>;
  declared: Set<string>;
  adapterDir: string;
}

export function renderMacro(template: string, s: MacroScope): string {
  return template.replace(TOKEN, (all, mode: string | undefined, name: string) => {
    if (mode === "include:") return readFileSync(join(s.adapterDir, name), "utf8");
    if (name.startsWith("output.") && !mode) {
      const p = s.outputs[name.slice(7)];
      return p === undefined ? all : macroString(p);
    }
    if (name in s.ph && !mode) return macroString(s.ph[name]);
    const v = lookup(s.args, name);
    if (v === undefined) return s.declared.has(name.split(".")[0]) ? "" : all;
    return mode === "raw:" ? scalar(v) : macroString(v);
  });
}

export interface ParsedStdout {
  values: Record<string, number | string>;
  metrics: Record<string, number>;
  tables: string[];
  outputs: string[];
  errors: string[];
  warnings: string[];
}

export function parseStdout(stdout: string): ParsedStdout {
  const p: ParsedStdout = { values: {}, metrics: {}, tables: [], outputs: [], errors: [], warnings: [] };
  for (const line of stdout.split(/\r?\n/)) {
    const m = KEY_LINE.exec(line.trim());
    if (!m) continue;
    const [, key, raw] = m;
    const value = raw.trim();
    if (key === "table") p.tables.push(value);
    else if (key === "output") p.outputs.push(value);
    else if (key === "error") p.errors.push(value);
    else if (key === "warning") p.warnings.push(value);
    else {
      const v = numberOrString(value);
      p.values[key] = v;
      if (typeof v === "number" && Number.isFinite(v)) p.metrics[key] = v;
    }
  }
  return p;
}

function textFor(def: ToolDef, p: ParsedStdout, files: OutputFile[], stdout: string): string {
  const lines: string[] = [];
  if (files.length) {
    lines.push("Files:");
    for (const f of files) lines.push(`  ${f.name}: ${f.path}`);
  }
  const vals = Object.entries(p.values);
  if (vals.length) {
    lines.push("Values:");
    for (const [k, v] of vals) lines.push(`  ${k}=${typeof v === "number" ? fmtNumber(v) : v}`);
  }
  for (const w of p.warnings) lines.push(`Warning: ${w}`);
  if (def.parse === "text" || (!vals.length && !files.length)) lines.push(stdout.trim());
  return cap(lines.filter(Boolean).join("\n"), 20000);
}

function outputList(call: CallDir, def: ToolDef, extra: string[], macroFile: string): OutputFile[] {
  const byPath = new Map(Object.entries(call.outputs).map(([k, p]) => [samePath(p), k]));
  const seen = new Set<string>();
  const out: OutputFile[] = [];
  const add = (path: string, kindHint?: OutputFile["kind"]) => {
    if (!existsSync(path)) return;
    const id = samePath(path);
    if (seen.has(id) || id === samePath(macroFile)) return;
    seen.add(id);
    const key = byPath.get(id);
    const spec = key ? def.outputs[key] : undefined;
    const kind = kindHint ?? (spec && (spec.kind === "image" || spec.kind === "table") ? spec.kind : fileKind(path));
    out.push({ path, kind, name: key ?? basename(path) });
  };
  for (const p of Object.values(call.outputs)) add(p);
  for (const p of extra) add(p);
  for (const e of readdirSync(call.dir, { withFileTypes: true })) if (e.isFile() && !e.name.startsWith(".")) add(join(call.dir, e.name));
  return out;
}

async function runMacroTool(c: KindContext, def: ToolDef, args: Args, call: CallDir, signal: AbortSignal, mod: AdapterModule): Promise<ToolOutput> {
  const conn = c.adapter.manifest.connection;
  const scope: MacroScope = {
    args,
    outputs: call.outputs,
    ph: { ...c.ph, call_dir: call.dir },
    declared: new Set(Object.keys(def.params)),
    adapterDir: c.adapter.root,
  };
  const macro = renderMacro(def.macro, scope);
  const macroFile = join(call.dir, `macro${conn.macro_ext}`);
  writeFileSync(macroFile, macro);
  const shown = renderMacro(def.macro.replace(/\{include:([^}]+)\}/g, (_m, f: string) => `// (the helper file ${f} from the adapter folder goes here)`), scope);
  const manual = mod.manualRoute?.(def.name, args) ?? shown;
  const fidelity = (mod as { fidelity?: (t: string, a: Args) => Fidelity | undefined }).fidelity?.(def.name, args);
  const argv = conn.interpreter.map((a) => expand(a, { ...c.ph, macro_file: macroFile, call_dir: call.dir }, envAllowed(c.adapter.manifest)));
  const env = childEnv(c);
  const guarded = await guardCommand(argv, c.dirs, { cwd: call.dir, env, adapterRoot: c.adapter.root });
  const r = await runProcess(guarded.argv, { cwd: call.dir, env, signal, timeoutMs: conn.call_timeout_s * 1000 });
  const changed = guarded.changed();
  if (changed.length) return { ok: false, error: integrityError("program", changed), manualRoute: manual };
  const failure = processFailure(r, basename(argv[0] ?? "the program"), conn.call_timeout_s);
  const base = { manualRoute: manual, data: { macro } as Record<string, unknown> };
  if (failure) {
    const hint = r.timedOut ? " A macro error can open a dialog that waits for a click." : "";
    return { ok: false, error: failure + hint, text: cap(r.stdout.trim(), 4000), ...base };
  }
  const p = parseStdout(r.stdout);
  const outputs = outputList(call, def, [...p.outputs, ...p.tables], macroFile);
  if (p.errors.length) return { ok: false, error: p.errors.join("; "), text: cap(r.stdout.trim(), 4000), outputs, ...base };
  const missing = Object.entries(call.outputs).filter(([, path]) => !existsSync(path)).map(([k]) => k);
  if (missing.length) {
    return { ok: false, error: `the program did not write: ${missing.join(", ")}. The macro stopped early.`, text: cap(r.stdout.trim(), 4000), outputs, ...base };
  }
  let table: TablePreview | undefined;
  const tablePath = p.tables.find((t) => existsSync(t)) ?? outputs.find((o) => o.kind === "table")?.path;
  if (tablePath) table = tablePreview(readFileSync(tablePath, "utf8"), tablePath);
  const images = outputs.filter((o) => o.kind === "image" && [".png", ".jpg", ".jpeg"].includes(extname(o.path).toLowerCase())).map((o) => o.path);
  const entry = c.adapter.mapEntry(def.name, args);
  const data = { ...base.data, values: p.values, files: Object.fromEntries(Object.entries(call.outputs).filter(([, f]) => existsSync(f))), warnings: p.warnings };
  const out: ToolOutput = {
    ok: true,
    text: textFor(def, p, outputs, r.stdout),
    data,
    outputs,
    manualRoute: manual,
    fidelity: fidelity ?? entry?.fidelity,
  };
  if (Object.keys(p.metrics).length) out.metrics = p.metrics;
  if (images.length) out.images = images;
  if (table) out.table = table;
  out.summary = makeSummary(entry, def.title || def.name, args, { metrics: out.metrics, data, table });
  return out;
}

async function programVersion(c: KindContext, found: string): Promise<string> {
  if (found) return found;
  const conn = c.adapter.manifest.connection;
  const file = join(c.adapter.root, `version${conn.macro_ext}`);
  if (!c.programPath || !existsSync(file)) return "";
  const argv = conn.interpreter.map((a) => expand(a, { ...c.ph, macro_file: file }, envAllowed(c.adapter.manifest)));
  const r = await runProcess(argv, { timeoutMs: 30_000 });
  return /version=(\S+)/.exec(r.stdout)?.[1] ?? "";
}

export async function startMacro(adapter: LoadedAdapter, dirs: Dirs): Promise<AdapterRuntime> {
  const found = await locate(adapter.manifest, adapter.root);
  const c: KindContext = {
    adapter,
    dirs,
    ph: placeholders(adapter, dirs, found.path),
    programPath: found.path,
    programVersion: found.version,
    how: found.how,
  };
  c.programVersion = await programVersion(c, found.version);
  const live = inflight();
  const modPromise = adapter.module();
  return makeRuntime(c, {
    async tools() {
      const mod = await modPromise;
      const tools: Tool[] = adapter.manifest.tools
        .filter((d) => d.macro)
        .map((def) => defTool(c, def, ({ args, ctx, call }) => live.track(ctx.signal, (signal) => runMacroTool(c, def, args, call, signal, mod))));
      return [...tools, ...(mod.tools ?? [])];
    },
    cancel: () => live.cancel(),
    close: () => live.cancel(),
  });
}
