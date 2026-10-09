import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { KnownAnswerTest, LoadedAdapter } from "../adapters/manifest.ts";
import type { Args, OutputFile, Tool, ToolContext, ToolOutput } from "../core/types.ts";

export interface TestOutcome {
  id: string;
  ok: boolean;
  failures: string[];
  durationMs: number;
  outputs: OutputFile[];
}

export interface RuntimeLike {
  tools(): Promise<Tool[]>;
}

export interface RunOptions {
  only?: string[];
  workDir?: string;
  sessionDir?: string;
  callTimeoutMs?: number;
}

type Expect = KnownAnswerTest["expect"][number];

export function getPath(root: unknown, path: string): unknown {
  const parts = path.split(/\.|\[(\d+)\]/).filter((p) => p !== undefined && p !== "");
  let cur: unknown = root;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

const WHOLE = /^\{(saved\.[^{}]+|adapter_dir)\}$/;
const ANY = /\{(saved\.[^{}]+|adapter_dir)\}/g;

function lookup(ref: string, saved: Record<string, ToolOutput>, adapterDir: string): unknown {
  if (ref === "adapter_dir") return adapterDir;
  const [, name, ...rest] = ref.split(".");
  const out = saved[name];
  if (!out) throw new Error(`no saved result named "${name}"`);
  const value = rest.length ? getPath(out, rest.join(".")) : out;
  if (value === undefined) throw new Error(`saved result "${name}" has no value at "${rest.join(".")}"`);
  return value;
}

export function substitute(value: unknown, saved: Record<string, ToolOutput>, adapterDir: string): unknown {
  if (typeof value === "string") {
    const whole = WHOLE.exec(value);
    if (whole) return lookup(whole[1], saved, adapterDir);
    return value.replace(ANY, (_, ref: string) => String(lookup(ref, saved, adapterDir)));
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, saved, adapterDir));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, saved, adapterDir)]));
  }
  return value;
}

function resolveTarget(path: string, last: ToolOutput, saved: Record<string, ToolOutput>): unknown {
  const m = /^saved\.([^.]+)\.?(.*)$/.exec(path);
  if (!m) return getPath(last, path);
  const out = saved[m[1]];
  return out && (m[2] ? getPath(out, m[2]) : out);
}

function judge(e: Expect, got: unknown): string[] {
  const out: string[] = [];
  const at = e.path;
  if (e.equals !== undefined && JSON.stringify(got) !== JSON.stringify(e.equals)) {
    out.push(`${at}: expected ${JSON.stringify(e.equals)}, got ${JSON.stringify(got)}`);
  }
  const needsNumber = e.approx !== undefined || e.min !== undefined || e.max !== undefined;
  if (needsNumber && (typeof got !== "number" || Number.isNaN(got))) {
    out.push(`${at}: expected a number, got ${JSON.stringify(got)}`);
    return out;
  }
  const n = got as number;
  if (e.approx !== undefined) {
    const tol = Math.max(e.abs, e.rel * Math.abs(e.approx));
    if (Math.abs(n - e.approx) > tol) out.push(`${at}: expected ${e.approx} within ${tol}, got ${n}`);
  }
  if (e.min !== undefined && n < e.min) out.push(`${at}: ${n} is below the minimum ${e.min}`);
  if (e.max !== undefined && n > e.max) out.push(`${at}: ${n} is above the maximum ${e.max}`);
  if (e.contains !== undefined) {
    const hit = Array.isArray(got)
      ? got.some((g) => String(g).includes(e.contains!))
      : got !== undefined && got !== null && (typeof got === "object" ? JSON.stringify(got) : String(got)).includes(e.contains);
    if (!hit) out.push(`${at}: expected to contain ${JSON.stringify(e.contains)}, got ${JSON.stringify(got)}`);
  }
  if (e.equals === undefined && !needsNumber && e.contains === undefined && got === undefined) {
    out.push(`${at}: no value at this path`);
  }
  return out;
}

function makeContext(workDir: string, sessionDir: string, signal: AbortSignal, byName: Map<string, Tool>): ToolContext {
  const ctx: ToolContext = {
    session: "kat",
    callId: "kat",
    workDir,
    sessionDir,
    signal,
    log: (kind, data) => ({ id: 0, ts: new Date().toISOString(), session: "kat", kind, data }),
    callTool: async (name, args) => {
      const t = byName.get(name);
      return t ? t.execute(args, ctx) : { ok: false, error: `no tool named "${name}"` };
    },
  };
  return ctx;
}

async function runOne(
  test: KnownAnswerTest,
  adapter: LoadedAdapter,
  byName: Map<string, Tool>,
  opts: Required<Pick<RunOptions, "workDir" | "sessionDir" | "callTimeoutMs">>,
): Promise<TestOutcome> {
  const started = Date.now();
  const failures: string[] = [];
  const outputs: OutputFile[] = [];
  const saved: Record<string, ToolOutput> = {};
  let last: ToolOutput = { ok: false, error: "the test has no calls" };
  const nextWanted = test.expect.some((e) => e.path === "ok");
  for (const [i, call] of test.calls.entries()) {
    const label = `call ${i + 1} (${call.tool})`;
    const tool = byName.get(call.tool);
    if (!tool) {
      failures.push(`${label}: the adapter has no tool with this name`);
      break;
    }
    let args: Args;
    try {
      args = substitute(call.args, saved, adapter.root) as Args;
    } catch (err) {
      failures.push(`${label}: ${(err as Error).message}`);
      break;
    }
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), opts.callTimeoutMs);
    try {
      last = await tool.execute(args, makeContext(opts.workDir, opts.sessionDir, ctl.signal, byName));
    } catch (err) {
      last = { ok: false, error: (err as Error).message };
    } finally {
      clearTimeout(timer);
    }
    outputs.push(...(last.outputs ?? []));
    if (call.save_as) saved[call.save_as] = last;
    const isLast = i === test.calls.length - 1;
    if (!last.ok && !(isLast && nextWanted)) {
      failures.push(`${label}: the tool failed${last.error ? `: ${last.error}` : ""}`);
      break;
    }
  }
  if (!failures.length) {
    for (const e of test.expect) failures.push(...judge(e, resolveTarget(e.path, last, saved)));
  }
  return { id: test.id, ok: failures.length === 0, failures, durationMs: Date.now() - started, outputs };
}

export async function runTests(adapter: LoadedAdapter, runtime: RuntimeLike, opts: RunOptions = {}): Promise<TestOutcome[]> {
  const tools = await runtime.tools();
  const byName = new Map<string, Tool>();
  for (const t of tools) {
    byName.set(t.name, t);
    if (t.remoteName) byName.set(t.remoteName, t);
  }
  for (const t of (await adapter.module()).tools ?? []) if (!byName.has(t.name)) byName.set(t.name, t);
  const base = opts.workDir ?? mkdtempSync(join(tmpdir(), "ga-kat-"));
  const resolved = { workDir: base, sessionDir: opts.sessionDir ?? base, callTimeoutMs: opts.callTimeoutMs ?? 600_000 };
  const selected = adapter.manifest.tests.filter((t) => !opts.only || opts.only.includes(t.id));
  const outcomes: TestOutcome[] = [];
  for (const t of selected) outcomes.push(await runOne(t, adapter, byName, resolved));
  return outcomes;
}
