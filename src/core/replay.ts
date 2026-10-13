import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { findAdapter } from "../adapters/manifest.ts";
import { AnalysisRecord } from "./record.ts";
import type { Args, Tool, ToolOutput } from "./types.ts";

export interface Runner {
  call(adapter: string, tool: string, args: Args): Promise<ToolOutput>;
  close(): Promise<void>;
}

export class ToolRunner implements Runner {
  private constructor(
    private tools: Tool[],
    private closers: (() => Promise<void>)[],
    private workDir: string,
  ) {}

  static async start(adapters: string[], opts: { workDir?: string } = {}): Promise<ToolRunner> {
    const { startAdapter } = await import("../adapters/runtime.ts");
    const workDir = opts.workDir ?? mkdtempSync(join(tmpdir(), "cuvette-run-"));
    const tools: Tool[] = [];
    const closers: (() => Promise<void>)[] = [];
    const runner = new ToolRunner(tools, closers, workDir);
    try {
      for (const name of adapters.filter(Boolean)) {
        const a = findAdapter(name);
        const rt = await startAdapter(a, { workDir, sessionDir: workDir });
        closers.push(() => rt.close());
        for (const t of await rt.tools()) tools.push({ ...t, adapter: t.adapter ?? a.name, meta: { ...(t as { meta?: object }).meta, alias: name } } as Tool);
      }
    } catch (e) {
      await runner.close();
      throw e;
    }
    return runner;
  }

  async call(adapter: string, tool: string, args: Args): Promise<ToolOutput> {
    const t = this.tools.find(
      (x) => (x.adapter === adapter || (x as { meta?: { alias?: string } }).meta?.alias === adapter) && (x.name === tool || x.remoteName === tool || x.name === `${adapter}_${tool}`),
    );
    if (!t) return { ok: false, error: adapter ? `no tool "${tool}" in adapter "${adapter}"` : `"${tool}" is a step of the harness, not of an adapter. Replay runs adapter steps only.` };
    const callId = `run-${Date.now()}`;
    return t.execute(args, {
      session: "run",
      callId,
      workDir: this.workDir,
      sessionDir: this.workDir,
      signal: new AbortController().signal,
      log: (kind, data) => ({ id: 0, ts: new Date().toISOString(), session: "run", kind, data }),
      callTool: (name, a) => this.call(adapter, name, a),
    });
  }

  async close(): Promise<void> {
    const failed = (await Promise.allSettled(this.closers.map((c) => c()))).find((r) => r.status === "rejected");
    if (failed) throw failed.reason;
  }
}

export interface ReplayOptions {
  sessionDir?: string;
  workDir?: string;
  runtimeFactory?: (adapters: string[]) => Promise<Runner>;
}

export interface ReplayStep {
  tool: string;
  ok: boolean;
  metrics: Record<string, number>;
  before?: Record<string, number>;
  diffs: string[];
}

interface Flow {
  adapters: string[];
  steps: { adapter: string; tool: string; args: Args }[];
  inputs: Record<string, string>;
}

const PLACEHOLDER = /\{(input_\d+|step\d+\.outputs\.\d+\.path)\}/g;
const REL_TOL = 1e-6;

function substitute(v: unknown, values: Map<string, string>): unknown {
  if (typeof v === "string") {
    return v.replace(PLACEHOLDER, (m, k: string) => {
      const x = values.get(k);
      if (x === undefined) throw new Error(`no value for placeholder ${m}`);
      return x;
    });
  }
  if (Array.isArray(v)) return v.map((x) => substitute(x, values));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, substitute(x, values)]));
  return v;
}

function compare(before: Record<string, number>, now: Record<string, number>): string[] {
  const diffs: string[] = [];
  for (const k of new Set([...Object.keys(before), ...Object.keys(now)])) {
    const a = before[k];
    const b = now[k];
    if (a === undefined) diffs.push(`${k}: new metric ${b}`);
    else if (b === undefined) diffs.push(`${k}: missing, was ${a}`);
    else if (Object.is(a, b)) continue;
    else if (typeof a !== "number" || typeof b !== "number" || !Number.isFinite(a) || !Number.isFinite(b)) diffs.push(`${k}: was ${a}, now ${b}`);
    else {
      const scale = Math.max(Math.abs(a), Math.abs(b));
      if (scale > 0 && Math.abs(a - b) / scale > REL_TOL) diffs.push(`${k}: was ${a}, now ${b}`);
    }
  }
  return diffs;
}

function metricsOf(result: unknown): Record<string, number> | undefined {
  const m = (result as { metrics?: unknown } | null)?.metrics;
  return m && typeof m === "object" ? (m as Record<string, number>) : undefined;
}

export async function replayFlow(
  flowPath: string,
  inputs: Record<string, string>,
  opts: ReplayOptions = {},
): Promise<{ steps: ReplayStep[] }> {
  const flow = JSON.parse(readFileSync(flowPath, "utf8")) as Flow;
  const values = new Map<string, string>();
  for (const k of Object.keys(flow.inputs)) {
    const v = inputs[k] ?? inputs[flow.inputs[k]];
    if (v === undefined) throw new Error(`no input given for ${k} (original: ${flow.inputs[k]})`);
    values.set(k, v);
  }
  const record = opts.sessionDir ? new AnalysisRecord(opts.sessionDir, basename(opts.sessionDir)) : undefined;
  const rewound = record?.rewound() ?? new Set<string>();
  const original = record ? record.nodes().filter((n) => !n.sensitivityOf && !rewound.has(n.id)) : [];
  const runner = await (opts.runtimeFactory ?? ((a) => ToolRunner.start(a, { workDir: opts.workDir })))(flow.adapters);
  const steps: ReplayStep[] = [];
  try {
    for (const [k, s] of flow.steps.entries()) {
      const out = await runner.call(s.adapter, s.tool, substitute(s.args, values) as Args);
      out.outputs?.forEach((o, i) => values.set(`step${k + 1}.outputs.${i}.path`, o.path));
      const step: ReplayStep = { tool: s.tool, ok: out.ok, metrics: out.metrics ?? {}, diffs: [] };
      if (!out.ok) step.diffs.push(`step failed: ${out.error ?? "no error text"}`);
      const before = metricsOf(original[k]?.result);
      if (before) {
        step.before = before;
        if (out.ok) step.diffs.push(...compare(before, step.metrics));
      }
      steps.push(step);
      if (!out.ok) break;
    }
  } finally {
    await runner.close();
  }
  return { steps };
}
