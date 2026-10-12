import { readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type { Args, Node } from "./types.ts";

// Tools that look at data or run free code. Their arguments do not tell which input a sample uses.
const NOT_REPEATABLE = new Set(["run_script", "run_command", "read_file", "list_dir", "write_file", "screenshot", "calculate", "compare_options"]);
const MAX_SAMPLES = 2000;
const MAX_FOLDERS = 20000;

export interface Sample {
  label: string;
  files: Map<string, string>;
}

export interface BatchPlan {
  steps: Node[];
  inputs: string[];
  samples: Sample[];
}

export const abs = (v: string, cwd: string) => (v.startsWith("{project}") ? join(cwd, v.slice("{project}".length)) : isAbsolute(v) ? v : resolve(cwd, v));

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}

const isFile = (p: string) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

// The pilot chain: the last run of each repeatable tool between the start and the pilot result.
// Comparison runs and steps with no output files are not part of it.
export function pilotChain(nodes: Node[], from: number, to: number): Node[] {
  const last = new Map<string, Node>();
  for (const n of nodes) if (n.entry > from && n.entry < to && !n.sensitivityOf && !NOT_REPEATABLE.has(n.tool) && n.outputs.length) last.set(n.tool, n);
  return [...last.values()].sort((a, b) => a.entry - b.entry);
}

// The files that the chain reads and that no earlier step of the chain made.
export function chainInputs(steps: Node[], cwd: string): string[] {
  const made = new Set<string>();
  const inputs: string[] = [];
  for (const n of steps) {
    for (const s of strings(n.args)) {
      const p = abs(s, cwd);
      if (!made.has(p) && !inputs.includes(p) && isFile(p)) inputs.push(p);
    }
    for (const o of n.outputs) made.add(abs(o.path, cwd));
  }
  return inputs;
}

function folders(root: string, skip: Set<string>): string[] {
  const out: string[] = [];
  const walk = (d: string, depth: number) => {
    if (out.length >= MAX_FOLDERS || depth > 12) return;
    out.push(d);
    let names: string[] = [];
    try {
      names = readdirSync(d);
    } catch {
      return;
    }
    for (const n of names.sort()) {
      if (n.startsWith(".") || n === "node_modules") continue;
      const p = join(d, n);
      if (skip.has(p)) continue;
      try {
        if (statSync(p).isDirectory()) walk(p, depth + 1);
      } catch {}
    }
  };
  walk(root, 0);
  return out;
}

function findIn(dir: string, name: string): string | undefined {
  try {
    const names = readdirSync(dir);
    const hit = names.find((n) => n === name) ?? names.find((n) => n.toLowerCase() === name.toLowerCase());
    return hit && isFile(join(dir, hit)) ? join(dir, hit) : undefined;
  } catch {
    return undefined;
  }
}

// Other samples have the same files as the pilot folder, by name (case does not matter).
// With one input file and no such folders, the other files of its type in its folder are the samples.
export function findSamples(root: string, inputs: string[], skip: string[] = []): Sample[] {
  if (!inputs.length) return [];
  const home = dirname(inputs[0]!);
  if (inputs.some((p) => dirname(p) !== home)) return [];
  const names = inputs.map((p) => basename(p));
  const out: Sample[] = [];
  for (const d of folders(root, new Set(skip.map((s) => resolve(s))))) {
    if (d === home) continue;
    const hits = names.map((n) => findIn(d, n));
    if (hits.every(Boolean)) out.push({ label: relative(root, d).split(sep).join("/") || basename(d), files: new Map(inputs.map((p, i) => [p, hits[i]!])) });
    if (out.length >= MAX_SAMPLES) break;
  }
  if (out.length || inputs.length > 1) return out;
  const ext = extname(inputs[0]!).toLowerCase();
  const stem = (n: string) => n.slice(0, n.length - extname(n).length).replace(/\d+/g, "#").toLowerCase();
  try {
    return readdirSync(home)
      .filter((n) => extname(n).toLowerCase() === ext && n !== basename(inputs[0]!) && stem(n) === stem(basename(inputs[0]!)) && isFile(join(home, n)))
      .sort()
      .slice(0, MAX_SAMPLES)
      .map((n) => ({ label: n, files: new Map([[inputs[0]!, join(home, n)]]) }));
  } catch {
    return [];
  }
}

// The same arguments, with each pilot file or pilot output replaced by the one for this sample.
export function swapArgs(args: Args, map: Map<string, string>, cwd: string): Args {
  const swap = (v: unknown): unknown => {
    if (typeof v === "string") return map.get(abs(v, cwd)) ?? v;
    if (Array.isArray(v)) return v.map(swap);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)]));
    return v;
  };
  return swap(args) as Args;
}

export function metricsOf(result: unknown): Record<string, number> {
  const m = (result as { metrics?: Record<string, unknown> } | undefined)?.metrics;
  if (!m || typeof m !== "object") return {};
  return Object.fromEntries(Object.entries(m).filter(([, v]) => typeof v === "number" && Number.isFinite(v)) as [string, number][]);
}

export interface BatchRow {
  sample: string;
  ok: boolean;
  error?: string;
  values: Record<string, number>;
}

export function writeTable(path: string, rows: BatchRow[]): void {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r.values)))];
  const cell = (v: unknown) => {
    const s = v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [["sample", "status", ...cols, "error"], ...rows.map((r) => [r.sample, r.ok ? "done" : "failed", ...cols.map((c) => r.values[c]), r.error ?? ""])];
  writeFileSync(path, lines.map((l) => l.map(cell).join(",")).join("\n") + "\n");
}

export function planBatch(nodes: Node[], from: number, to: number, cwd: string, skip: string[] = []): BatchPlan | undefined {
  const steps = pilotChain(nodes, from, to);
  if (!steps.length) return undefined;
  const inputs = chainInputs(steps, cwd);
  const samples = findSamples(cwd, inputs, skip);
  return samples.length ? { steps, inputs, samples } : undefined;
}

