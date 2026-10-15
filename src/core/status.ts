import { createHash } from "node:crypto";
import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
import { basename } from "node:path";
import { adapterDirs, findAdapter } from "../adapters/manifest.ts";
import { locate } from "../adapters/locate.ts";
import { expand, placeholders } from "../adapters/kinds/common.ts";
import { scriptPython } from "../tools/run_script.ts";
import { captureEnv, envTarget, packageChanges, type EnvLock } from "./envlock.ts";
import { stepNumbers } from "./housekeeping.ts";
import type { AnalysisRecord } from "./record.ts";
import type { Node, TablePreview } from "./types.ts";

export type ReasonKind = "decision" | "input" | "adapter" | "program" | "environment" | "parent";

export interface Reason {
  kind: ReasonKind;
  text: string;
}

export interface StepState {
  node: string;
  step: number;
  tool: string;
  title: string;
  current: boolean;
  reasons: Reason[];
}

export interface CurrentAdapter {
  version?: string;
  programVersion?: string;
  program?: string;
  env?: EnvLock;
}

export type Current = Map<string, CurrentAdapter>;

export interface ChangeRow {
  name: string;
  before: number | null;
  after: number | null;
  change: number | null;
}

export interface RerunData {
  old: string;
  node: string;
  oldStep: number;
  step: number;
  tool: string;
  reasons: string[];
  rows: ChangeRow[];
  changed: number;
  unchanged: number;
}

const HASH_LIMIT = 2_000_000_000;
const hashes = new Map<string, string>();

export async function fileSha(path: string): Promise<string> {
  const st = statSync(path);
  if (st.size > HASH_LIMIT) return createHash("sha256").update(`${path}:${st.size}:${st.mtimeMs}`).digest("hex");
  const key = `${path}\u0000${st.size}\u0000${st.mtimeMs}`;
  const hit = hashes.get(key);
  if (hit) return hit;
  const h = createHash("sha256");
  for await (const chunk of createReadStream(path)) h.update(chunk as Buffer);
  const sha = h.digest("hex");
  hashes.set(key, sha);
  return sha;
}

export const adapterKey = (n: Pick<Node, "adapter" | "tool">) => n.adapter || n.tool;

export function currentNodes(record: AnalysisRecord): Node[] {
  const rewound = record.rewound();
  return record.nodes().filter((n) => !n.sensitivityOf && !rewound.has(n.id) && !record.replacedBy(n.id));
}

export async function liveReasons(record: AnalysisRecord, cur: Current): Promise<Map<string, Reason[]>> {
  const out = new Map<string, Reason[]>();
  for (const n of currentNodes(record)) {
    const rs: Reason[] = [];
    for (const f of n.inputFiles ?? []) {
      const name = basename(f.path);
      if (!existsSync(f.path)) {
        rs.push({ kind: "input", text: `The input file ${name} is missing.` });
        continue;
      }
      const st = statSync(f.path);
      if (st.size === f.size && st.mtime.toISOString() === f.mtime) continue;
      if ((await fileSha(f.path)) !== f.sha256) rs.push({ kind: "input", text: `The input file ${name} changed after this step ran.` });
    }
    const a = cur.get(adapterKey(n));
    if (a?.version && n.adapterVersion && a.version !== n.adapterVersion) rs.push({ kind: "adapter", text: `The adapter ${n.adapter} changed from version ${n.adapterVersion} to ${a.version} after this step ran.` });
    if (a?.programVersion && n.programVersion && a.programVersion !== n.programVersion) rs.push({ kind: "program", text: `The program ${a.program || n.adapter} changed from version ${n.programVersion} to ${a.programVersion} after this step ran.` });
    if (a?.env && n.envHash && a.env.kind !== "program" && a.env.hash !== n.envHash) {
      const old = record.environment(n.envHash);
      const list = old ? packageChanges(old, a.env) : [];
      const shown = list.slice(0, 3).join(", ");
      const more = list.length > 3 ? `, and ${list.length - 3} more` : "";
      rs.push({ kind: "environment", text: `The packages in the ${adapterKey(n)} environment changed after this step ran${shown ? `: ${shown}${more}` : ""}.` });
    }
    if (rs.length) out.set(n.id, rs);
  }
  return out;
}

export function recordReasons(record: AnalysisRecord, labels: Record<string, string> = {}): Map<string, Reason[]> {
  const out = new Map<string, Reason[]>();
  const add = (id: string, r: Reason) => {
    const list = out.get(id) ?? [];
    if (!list.some((x) => x.text === r.text)) list.push(r);
    out.set(id, list);
  };
  for (const e of record.staleMarks()) {
    const nodes = (e.data.nodes as string[] | undefined) ?? [];
    if (e.data.kind) {
      for (const id of (e.data.direct as string[] | undefined) ?? nodes) add(id, { kind: e.data.kind as ReasonKind, text: String(e.data.reason) });
      continue;
    }
    const key = String(e.data.key ?? "");
    for (const id of nodes) if (Object.hasOwn(record.node(id)?.decisions ?? {}, key)) add(id, { kind: "decision", text: `The decision "${labels[key] ?? key}" changed after this step ran.` });
  }
  return out;
}

export function stepStatus(record: AnalysisRecord, opts: { live?: Map<string, Reason[]>; labels?: Record<string, string> } = {}): StepState[] {
  const steps = stepNumbers(record.nodes());
  const recorded = recordReasons(record, opts.labels);
  const stale = record.stale();
  const states = new Map<string, StepState>();
  for (const n of currentNodes(record)) {
    const reasons: Reason[] = [];
    for (const r of [...(recorded.get(n.id) ?? []), ...(opts.live?.get(n.id) ?? [])]) if (!reasons.some((x) => x.text === r.text)) reasons.push(r);
    for (const p of n.parents) {
      const newer = record.replacedBy(p) ? record.latest(p) : undefined;
      if (newer) reasons.push({ kind: "parent", text: `Step ${steps.get(p)} ran again as step ${steps.get(newer)}. This step still uses the old result.` });
      else if (states.get(p)?.current === false) reasons.push({ kind: "parent", text: `It uses the result of step ${steps.get(p)}, which is out of date.` });
    }
    if (!reasons.length && stale.has(n.id)) reasons.push({ kind: "parent", text: "It uses a result that changed after this step ran." });
    states.set(n.id, { node: n.id, step: steps.get(n.id) ?? 0, tool: n.tool, title: n.summary || n.tool, current: reasons.length === 0, reasons });
  }
  return [...states.values()];
}

export function outOfDateNodes(record: AnalysisRecord): Set<string> {
  const out = new Set<string>(record.stale?.() ?? []);
  if (typeof record.staleMarks !== "function") return out;
  const rewound = record.rewound();
  for (const s of stepStatus(record)) if (!s.current) out.add(s.node);
  for (const n of record.nodes()) if (record.replacedBy(n.id)) out.add(n.id);
  for (const id of rewound) out.delete(id);
  return out;
}

export function statusText(states: StepState[], next = "Type /rerun to run the out-of-date steps again."): string {
  if (!states.length) return "No steps yet.";
  const out = states.filter((s) => !s.current);
  const width = Math.max(...states.map((s) => `Step ${s.step}`.length));
  const lines = states.flatMap((s) => [
    `${`Step ${s.step}`.padEnd(width)}  ${s.current ? "Up to date " : "Out of date"}  ${clip(s.title, 70)}`,
    ...s.reasons.map((r) => `${" ".repeat(width + 2)}${r.text}`),
  ]);
  const head = out.length ? `${out.length} of ${states.length} ${states.length === 1 ? "step" : "steps"} ${out.length === 1 ? "is" : "are"} out of date. ${next}` : states.length === 1 ? "The step is up to date." : `All ${states.length} steps are up to date.`;
  return [...lines, "", head].join("\n");
}

function clip(s: string, n: number): string {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > n ? one.slice(0, n - 1) + "…" : one;
}

export async function currentFromDisk(record: AnalysisRecord, cwd: string): Promise<{ current: Current; labels: Record<string, string> }> {
  const current: Current = new Map();
  const labels: Record<string, string> = {};
  const paths = new Map<string, string>();
  const first = record.entries(["session"])[0]?.data.adapters as { name: string; path?: string }[] | undefined;
  for (const a of [...(first ?? []), ...record.entries(["adapter"]).map((e) => e.data as { name: string; path?: string })]) if (a.path && existsSync(a.path)) paths.set(a.name, a.path);
  for (const name of new Set(record.nodes().map((n) => n.adapter).filter(Boolean))) {
    try {
      const path = paths.get(name);
      const known = path ? Object.values(adapterDirs(cwd)).some((d) => realpathSync(d) === realpathSync(path)) : true;
      if (!known) continue;
      const a = findAdapter(path ?? name, cwd);
      for (const d of a.manifest.decisions) labels[d.key] = d.label;
      const found = await locate(a.manifest, a.root);
      const ph = placeholders(a, { workDir: record.workDir, sessionDir: record.dir }, found.path);
      let interpreter: string[] = [];
      try {
        interpreter = a.manifest.connection.interpreter.map((x) => expand(x, ph));
      } catch {}
      const macro = a.manifest.connection.kind === "macro";
      const programVersion = macro ? undefined : found.version || undefined;
      const env = await captureEnv(envTarget({ kind: a.manifest.connection.kind, interpreter, programPath: found.path, program: a.manifest.program.name, programVersion: found.version })).catch(() => undefined);
      current.set(name, { version: a.manifest.adapter.version, programVersion, program: a.manifest.program.name, env: macro ? undefined : env });
    } catch {}
  }
  if (record.nodes().some((n) => n.tool === "run_script" && n.envHash)) {
    const env = await captureEnv(envTarget({ kind: "python", interpreter: [scriptPython()], program: "", programVersion: "" })).catch(() => undefined);
    current.set("run_script", { env });
  }
  return { current, labels };
}

// ---------------------------------------------------------------- reruns

function sameSet(a: string[], b: string[]): boolean {
  const x = [...new Set(a)].sort();
  const y = [...new Set(b)].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

export function replacedNode(record: AnalysisRecord, n: Node, outOfDate: Set<string>): Node | undefined {
  const inputs = (m: Node) => (m.inputFiles ?? []).map((f) => f.path);
  return record
    .nodes()
    .filter((o) => o.id !== n.id && outOfDate.has(o.id) && !o.sensitivityOf && !record.replacedBy(o.id) && o.tool === n.tool && o.adapter === n.adapter)
    .filter((o) => sameSet(inputs(o), inputs(n)) && sameSet(o.parents.map((p) => record.latest(p)), n.parents))
    .at(-1);
}

const MAX_NUMBERS = 200;
const SHOWN = new Set(["metrics", "table", "ok"]);

export function numbersOf(result: unknown): Map<string, number> {
  const out = new Map<string, number>();
  const r = (result ?? {}) as { metrics?: Record<string, unknown>; data?: unknown; table?: TablePreview };
  const put = (k: string, v: unknown) => {
    if (out.size >= MAX_NUMBERS || out.has(k)) return;
    const x = typeof v === "number" ? v : typeof v === "string" && /^\s*-?\d+(?:\.\d+)?(?:e[-+]?\d+)?\s*$/i.test(v) ? Number(v) : NaN;
    if (Number.isFinite(x)) out.set(k, x);
  };
  for (const [k, v] of Object.entries(r.metrics ?? {})) put(k, v);
  const walk = (v: unknown, path: string, depth: number) => {
    if (depth > 4 || out.size >= MAX_NUMBERS) return;
    if (typeof v === "number") put(path, v);
    else if (Array.isArray(v)) v.slice(0, 50).forEach((x, i) => walk(x, `${path}[${i + 1}]`, depth + 1));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (path || !SHOWN.has(k)) walk(x, path ? `${path}.${k}` : k, depth + 1);
  };
  walk(r.data, "", 0);
  const t = r.table;
  if (t?.columns?.length && Array.isArray(t.rows)) {
    const labelled = t.rows.some((row) => typeof row[0] === "string" && !/^\s*-?\d/.test(row[0]));
    t.rows.forEach((row, i) => {
      const label = labelled ? String(row[0]) : `row ${i + 1}`;
      t.columns.forEach((c, j) => {
        if (labelled && j === 0) return;
        put(`${label} · ${c}`, row[j]);
      });
    });
  }
  return out;
}

export function changeRows(before: unknown, after: unknown): { rows: ChangeRow[]; changed: number; unchanged: number } {
  const a = numbersOf(before);
  const b = numbersOf(after);
  const names = [...new Set([...a.keys(), ...b.keys()])];
  const all = names.map((name) => {
    const x = a.get(name) ?? null;
    const y = b.get(name) ?? null;
    return { name, before: x, after: y, change: x !== null && y !== null ? y - x : null };
  });
  const moved = all.filter((r) => r.change !== 0);
  return { rows: [...moved, ...all.filter((r) => r.change === 0)], changed: moved.length, unchanged: all.length - moved.length };
}

export function num(v: number | null): string {
  if (v === null) return "none";
  if (Number.isInteger(v)) return String(v);
  return String(Number(v.toPrecision(4)));
}

export function changeCell(r: ChangeRow): string {
  if (r.change === null) return r.before === null ? "new" : "removed";
  if (r.change === 0) return "0";
  const pct = r.before ? ` (${r.change > 0 ? "+" : ""}${num(Math.round((r.change / Math.abs(r.before)) * 1000) / 10)}%)` : "";
  return `${r.change > 0 ? "+" : ""}${num(r.change)}${pct}`;
}

export function changeTable(rows: ChangeRow[], limit = 12): string {
  const shown = rows.filter((r) => r.change !== 0).slice(0, limit);
  if (!shown.length) return "";
  const cells = shown.map((r) => [clip(r.name, 40), num(r.before), num(r.after), changeCell(r)]);
  const head = ["Number", "Before", "After", "Change"];
  const w = head.map((h, i) => Math.max(h.length, ...cells.map((c) => c[i]!.length)));
  const fmt = (c: string[]) => c.map((x, i) => (i === 0 ? x.padEnd(w[i]!) : x.padStart(w[i]!))).join("  ");
  return [fmt(head), ...cells.map(fmt)].join("\n");
}

export function rerunTitle(d: RerunData): string {
  return `Before and after: step ${d.step} repeats step ${d.oldStep}`;
}

export function rerunBody(d: RerunData): string {
  const table = changeTable(d.rows);
  const hidden = d.changed - Math.min(d.changed, 12);
  const parts = [
    d.reasons.length ? `Why it ran again: ${d.reasons.join(" ")}` : "",
    table || "No number changed.",
    hidden > 0 ? `${hidden} more ${hidden === 1 ? "number changed" : "numbers changed"}. The Changes sheet of results.xlsx has all of them.` : "",
    d.unchanged ? `${d.unchanged} ${d.unchanged === 1 ? "number did" : "numbers did"} not change.` : "",
  ];
  return parts.filter(Boolean).join("\n");
}

export function reruns(record: AnalysisRecord): RerunData[] {
  return record.entries(["rerun"]).map((e) => e.data as unknown as RerunData);
}
