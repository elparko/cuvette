import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { KnownAnswerTest, LoadedAdapter } from "../adapters/manifest.ts";
import { findAdapter } from "../adapters/manifest.ts";
import { extractNumbers } from "../core/claims.ts";
import { applyHeadlessSetup, attachHeadless } from "../core/headless.ts";
import type { Session as SessionT } from "../core/session.ts";
import type { Args, Entry, Provider, ToolOutput } from "../core/types.ts";
import { fillAdapterDir, getPath, judge } from "./kat.ts";
import { firstSentence } from "./lint.ts";

type Call = KnownAnswerTest["calls"][number];
type Expect = KnownAnswerTest["expect"][number];

export interface DriveCase {
  tool: string;
  test: string;
  steps: Call[];
  target: Call;
  expect: Expect[];
  request: string;
}

export interface Confusion {
  entry?: number;
  text: string;
}

export interface DriveResult {
  tool: string;
  test: string;
  request: string;
  rightTool: boolean;
  validArgs: boolean;
  reached: boolean | null;
  answer: string;
  confusions: Confusion[];
  entries: number[];
  session: string;
  error?: string;
}

export interface DriveOptions {
  model?: string;
  provider?: (c: DriveCase) => Provider;
  only?: string[];
  maxSteps?: number;
  timeoutS?: number;
}


function toolText(a: LoadedAdapter, extra: Map<string, string>, tool: string): string {
  return a.manifest.tools.find((t) => t.name === tool)?.description ?? extra.get(tool) ?? "";
}

function paramText(a: LoadedAdapter, tool: string, arg: string): string {
  const d = a.manifest.tools.find((t) => t.name === tool)?.params[arg]?.description;
  return typeof d === "string" && d.trim() ? firstSentence(d).replace(/\.$/, "") : arg;
}

function shown(value: unknown, root: string, steps: Call[]): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const ref = /\{saved\.([^.{}]+)/.exec(text);
  if (ref) return `the result of step ${steps.findIndex((s) => s.save_as === ref[1]) + 1}`;
  return fillAdapterDir(text, root);
}

export function buildRequest(a: LoadedAdapter, steps: Call[], target: Call, extra = new Map<string, string>()): string {
  const all = [...steps, target];
  const lines: string[] = [];
  all.forEach((c, i) => {
    const what = firstSentence(toolText(a, extra, c.tool)) || `Run step ${i + 1}.`;
    lines.push(all.length > 1 ? `Step ${i + 1}: ${what}` : what);
    for (const [k, v] of Object.entries(c.args)) lines.push(`- ${paramText(a, c.tool, k)}: ${shown(v, a.root, steps)}`);
  });
  lines.push("Report the numbers of the result in your answer.");
  return lines.join("\n");
}

export function driveCases(a: LoadedAdapter, toolNames?: string[], extra = new Map<string, string>()): DriveCase[] {
  const names = toolNames ?? [...new Set([...a.manifest.tools.map((t) => t.name), ...a.manifest.tests.flatMap((t) => t.calls.map((c) => c.tool))])];
  const out: DriveCase[] = [];
  for (const tool of names) {
    let best: { test: KnownAnswerTest; k: number } | undefined;
    for (const test of a.manifest.tests) {
      if (test.expect.some((e) => e.path === "ok" && e.equals === false)) continue;
      const k = test.calls.findIndex((c) => c.tool === tool);
      if (k < 0) continue;
      if (!best || k < best.k || (k === best.k && k === test.calls.length - 1)) best = { test, k };
    }
    if (!best) continue;
    const steps = best.test.calls.slice(0, best.k);
    const target = best.test.calls[best.k];
    const last = best.k === best.test.calls.length - 1;
    const expect = last ? best.test.expect.filter((e) => !e.path.startsWith("saved.") && e.path !== "ok") : [];
    out.push({ tool, test: best.test.id, steps, target, expect, request: buildRequest(a, steps, target, extra) });
  }
  return out;
}

function schemaProblems(schema: Record<string, unknown> | undefined, args: Args): string[] {
  if (!schema) return [];
  const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
  const out: string[] = [];
  for (const r of (schema.required as string[] | undefined) ?? []) if (args[r] === undefined) out.push(`the required argument ${r} is missing`);
  for (const [k, v] of Object.entries(args)) {
    const p = props[k];
    if (!p) {
      if (Object.keys(props).length) out.push(`${k} is not an argument of the tool`);
      continue;
    }
    if (Array.isArray(p.enum) && !p.enum.some((x) => JSON.stringify(x) === JSON.stringify(v))) out.push(`${k} = ${JSON.stringify(v)} is not one of ${JSON.stringify(p.enum)}`);
    const types = (Array.isArray(p.type) ? p.type : [p.type]).filter(Boolean) as string[];
    const actual = Array.isArray(v) ? "array" : v === null ? "null" : typeof v === "number" ? (Number.isInteger(v) ? "integer" : "number") : typeof v;
    if (types.length && !types.includes(actual) && !(actual === "integer" && types.includes("number"))) out.push(`${k} is ${actual}, the schema wants ${types.join(" or ")}`);
  }
  return out;
}

function numbersWanted(expect: Expect[]): { value: number; tol: number; path: string }[] {
  const out: { value: number; tol: number; path: string }[] = [];
  for (const e of expect) {
    if (typeof e.equals === "number") out.push({ value: e.equals, tol: Math.max(1e-9, Math.abs(e.equals) * 0.005), path: e.path });
    if (typeof e.approx === "number") out.push({ value: e.approx, tol: Math.max(e.abs, e.rel * Math.abs(e.approx), Math.abs(e.approx) * 0.005), path: e.path });
  }
  return out;
}

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function judgeDrive(c: DriveCase, entries: Entry[], nodes: { entry: number; result: unknown }[], answer: string, schema: Record<string, unknown> | undefined, root: string): Omit<DriveResult, "request" | "session"> {
  const confusions: Confusion[] = [];
  const calls = entries.filter((e) => e.kind === "tool_call" && !e.data.from);
  const results = new Map(entries.filter((e) => e.kind === "tool_result").map((e) => [String(e.data.callId), e]));
  const isTarget = (name: string) => name === c.tool || name.endsWith(`_${c.tool}`);
  const prior = new Set(c.steps.map((s) => s.tool));
  for (const e of calls) {
    const name = String(e.data.tool);
    const r = results.get(String(e.data.callId));
    if (!isTarget(name) && !prior.has(name)) confusions.push({ entry: e.id, text: `called ${name}, not ${c.tool}` });
    if (r && r.data.ok === false) confusions.push({ entry: r.id, text: `${name} failed: ${String(r.data.error ?? "no reason").split("\n")[0].slice(0, 200)}` });
  }
  const targets = calls.filter((e) => isTarget(String(e.data.tool)));
  const rightTool = targets.length > 0;
  if (!rightTool) confusions.push({ text: `never called ${c.tool}` });
  let validArgs = false;
  let output: ToolOutput | undefined;
  const wanted = Object.fromEntries(Object.entries(c.target.args).filter(([, v]) => !(typeof v === "string" && v.includes("{saved."))).map(([k, v]) => [k, typeof v === "string" ? fillAdapterDir(v, root) : v]));
  for (const t of targets) {
    const args = (t.data.args ?? {}) as Args;
    const problems = schemaProblems(schema, args);
    for (const p of problems) confusions.push({ entry: t.id, text: p });
    for (const [k, v] of Object.entries(wanted)) if (args[k] !== undefined && !sameValue(args[k], v)) confusions.push({ entry: t.id, text: `${k} = ${JSON.stringify(args[k])}; the test uses ${JSON.stringify(v)}` });
    const r = results.get(String(t.data.callId));
    if (!problems.length && r?.data.ok) {
      validArgs = true;
      const node = nodes.find((n) => n.entry === r.id);
      output = { ...(r.data as object), ...((node?.result as object) ?? {}) } as ToolOutput;
    }
  }
  let reached: boolean | null = null;
  if (c.expect.length) {
    const fails = output ? c.expect.flatMap((e) => judge(e, getPath(output, e.path))) : ["no successful call of the tool"];
    for (const f of fails) confusions.push({ text: `result: ${f}` });
    const said = extractNumbers(answer, { small: true }).map((f) => f.value);
    const missing = numbersWanted(c.expect).filter((w) => !said.some((s) => Math.abs(s - w.value) <= w.tol));
    for (const m of missing) confusions.push({ text: `the answer does not give ${m.path} = ${m.value}` });
    reached = fails.length === 0 && missing.length === 0;
  }
  return { tool: c.tool, test: c.test, rightTool, validArgs, reached, answer, confusions, entries: calls.map((e) => e.id) };
}

function answersFor(a: LoadedAdapter, c: DriveCase): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const d of a.manifest.decisions) {
    for (const l of d.links) {
      const call = [...c.steps, c.target].find((s) => s.tool === l.tool);
      const v = call ? getPath(call.args, l.arg) : undefined;
      if (v !== undefined && !(typeof v === "string" && v.includes("{saved."))) out[d.key] = typeof v === "string" ? fillAdapterDir(v, a.root) : v;
    }
  }
  return out;
}

export async function runDrive(nameOrDir: string, opts: DriveOptions = {}): Promise<DriveResult[]> {
  const { Session } = await import("../core/session.ts");
  const a = findAdapter(nameOrDir);
  const mod = await a.module();
  const extra = new Map((mod.tools ?? []).map((t) => [t.name, t.description]));
  const cases = driveCases(a, undefined, extra).filter((c) => !opts.only?.length || opts.only.includes(c.tool));
  const out: DriveResult[] = [];
  for (const c of cases) {
    const cwd = mkdtempSync(join(tmpdir(), "cuvette-drive-"));
    let s: SessionT | undefined;
    try {
      s = await Session.create({
        adapters: [a.root],
        cwd,
        model: opts.model,
        provider: opts.provider?.(c),
        defaults: false,
        settings: { headless: true, permissionMode: "bypass", maxSteps: opts.maxSteps ?? 8, referee: "none", reviseOnFindings: false, planFirst: "off", pilot: "off", export_xlsx: "off" },
      });
      const answers = answersFor(a, c);
      attachHeadless(s, { answers, allow: new Set(["all"]) });
      applyHeadlessSetup(s, undefined, answers);
      const session = s;
      const timer = new Promise<string>((_, no) => setTimeout(() => no(new Error(`no answer in ${opts.timeoutS ?? 600} s`)), (opts.timeoutS ?? 600) * 1000).unref());
      const answer = await Promise.race([session.send(c.request), timer]);
      const schema = session.findTool(c.tool)?.inputSchema;
      out.push({ ...judgeDrive(c, session.record.entries(), session.record.nodes(), answer, schema, a.root), request: c.request, session: session.dir });
    } catch (err) {
      const entries = s?.record.entries() ?? [];
      const r = judgeDrive(c, entries, s?.record.nodes() ?? [], "", s?.findTool(c.tool)?.inputSchema, a.root);
      out.push({ ...r, reached: c.expect.length ? false : null, request: c.request, session: s?.dir ?? "", error: (err as Error).message });
    } finally {
      await s?.close().catch(() => undefined);
    }
  }
  return out;
}

export function driveText(results: DriveResult[]): string {
  const mark = (v: boolean | null) => (v === null ? "n/a" : v ? "yes" : "NO");
  const lines: string[] = [];
  for (const r of results) {
    lines.push(`${r.tool} (test ${r.test}): right tool ${mark(r.rightTool)}, valid arguments ${mark(r.validArgs)}, reached the answer ${mark(r.reached)}`);
    if (r.error) lines.push(`  stopped: ${r.error}`);
    for (const c of r.confusions) lines.push(`  - ${c.entry !== undefined ? `entry ${c.entry}: ` : ""}${c.text}`);
    if (r.session) lines.push(`  record: ${r.session}`);
  }
  const ok = results.filter((r) => r.rightTool && r.validArgs && r.reached !== false).length;
  lines.push(`${ok} of ${results.length} tools passed the drive test.`);
  return lines.join("\n");
}
