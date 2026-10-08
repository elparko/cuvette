import type { AdapterModule, LoadedAdapter } from "../adapters/manifest.ts";
import type { DecisionRecord } from "./decisions.ts";
import type { AnalysisRecord } from "./record.ts";
import type { Args, ToolOutput } from "./types.ts";

function fill(template: string, args: Args): string {
  return template.replace(/\{([\w.]+)\}/g, (m, k) => (args[k] === undefined ? m : String(args[k])));
}

export function instruction(adapter: LoadedAdapter | undefined, tool: string, args: Args, manualRoute?: string): string {
  const entry = adapter?.mapEntry(tool, args);
  if (!entry) return manualRoute || `Run ${tool} with ${JSON.stringify(args)}. This step has no manual route yet.`;
  const lines = [entry.route];
  for (const s of entry.steps) lines.push(`- ${fill(s, args)}`);
  for (const p of entry.params) {
    if (!(p.arg in args)) continue;
    const used = args[p.arg];
    let line = `- ${p.label}: ${String(used)}`;
    if (p.ui_default !== undefined && String(p.ui_default) !== String(used)) line += ` (the program shows ${String(p.ui_default)} by default; change it)`;
    lines.push(line);
  }
  if (entry.fidelity === "close" && entry.difference) lines.push(`Note: ${entry.difference}`);
  if (entry.fidelity === "code_only") lines.push("This step has no manual route in the program. Let the agent do it.");
  return lines.join("\n");
}

export function compareNote(note: string, metrics: Record<string, number>, tolerance = 0.02) {
  const seen = [...note.matchAll(/-?\d+(?:\.\d+)?(?:e-?\d+)?/gi)].map((m) => Number(m[0]));
  const named = new Map<string, number>();
  for (const m of note.matchAll(/([a-z_ ]+?)\s*[:=]\s*(-?\d+(?:\.\d+)?)/gi)) named.set(m[1].trim().toLowerCase().replace(/ /g, "_"), Number(m[2]));
  const differences: string[] = [];
  let checked = 0;
  for (const [k, v] of Object.entries(metrics)) {
    const close = (x: number) => Math.abs(x - v) <= Math.max(Math.abs(v) * tolerance, 1e-9);
    const given = named.get(k.toLowerCase());
    if (given !== undefined) {
      checked++;
      if (!close(given)) differences.push(`${k}: you got ${given}, the reference run got ${v}`);
    } else if (seen.some(close)) checked++;
  }
  return { checked, match: checked > 0 && differences.length === 0, differences };
}

export interface TeachStep {
  tool: string;
  args: Args;
  line: string;
}

export interface TeachDeps {
  adapters: LoadedAdapter[];
  decisions: DecisionRecord;
  record: AnalysisRecord;
  runHistory: (adapter: LoadedAdapter, tool: string, args: Args) => Promise<ToolOutput>;
}

export interface TeachSummary {
  ok: boolean;
  adapter: string;
  error?: string;
  steps: { step: number; tool: string; line: string; differences: string[]; waiting: string[]; mapped: boolean; match: boolean }[];
  n_steps: number;
  n_match: number;
  order: string;
  text: string;
}

function stepsOf(output: ToolOutput, mod: AdapterModule): TeachStep[] {
  if (mod.historySteps) return mod.historySteps(output);
  const raw = (output.data as { steps?: unknown } | undefined)?.steps;
  if (!Array.isArray(raw)) return [];
  return raw.filter((s) => s && typeof s.tool === "string").map((s) => ({ tool: s.tool, args: s.args ?? {}, line: String(s.line ?? "") }));
}

function planOrder(record: AnalysisRecord, steps: TeachStep[]): string {
  const plan = record.entries(["note"]).filter((e) => Array.isArray(e.data.plan)).at(-1)?.data.plan as { step: string }[] | undefined;
  if (!plan?.length) return "";
  const at = steps.map((s) => plan.findIndex((p) => p.step.toLowerCase().includes(s.tool.replace(/_/g, " ")) || p.step.toLowerCase().includes(s.tool)));
  const found = at.filter((i) => i >= 0);
  if (found.length < 2) return "";
  return found.every((v, i) => i === 0 || v >= found[i - 1]) ? "The order of the steps follows the plan." : "The order of the steps differs from the plan.";
}

export async function teachReview(d: TeachDeps, adapterName?: string, args: Args = {}): Promise<TeachSummary> {
  const adapter = adapterName ? d.adapters.find((a) => a.name === adapterName) : d.adapters.find((a) => a.manifest.connection.history_tool);
  const none = (error: string): TeachSummary => ({ ok: false, adapter: adapter?.name ?? adapterName ?? "", error, steps: [], n_steps: 0, n_match: 0, order: "", text: error });
  if (!adapter) return none(`No adapter named ${adapterName}.`);
  const historyTool = adapter.manifest.connection.history_tool;
  if (!historyTool) return none(`${adapter.name} has no history tool. The harness cannot read the steps of the scientist in this program.`);
  const output = await d.runHistory(adapter, historyTool, args);
  if (!output.ok) return none(output.error ?? "The history tool failed.");
  const mod = await adapter.module();
  const steps = stepsOf(output, mod);
  const out: TeachSummary["steps"] = [];
  steps.forEach((s, i) => {
    const e = d.decisions.enforce(adapter.name, s.tool, s.args, { readOnly: true });
    const label = (key: string) => d.decisions.fields().find((f) => f.key === key)?.label ?? key;
    const differences = e.deviations.map((v) => `${label(v.key)}: you used ${JSON.stringify(v.requested ?? v.used)}, the record says ${JSON.stringify(v.setup)}.`);
    const waiting = e.waiting.map((k) => `${label(k)}: the record has no value yet. The scientist decides it.`);
    const mapped = !!adapter.mapEntry(s.tool, s.args);
    if (!mapped) differences.push(`${s.tool}: this step has no entry in the map of the adapter, so the harness cannot compare it.`);
    const match = differences.length === 0;
    out.push({ step: i + 1, tool: s.tool, line: s.line, differences, waiting, mapped, match });
    d.record.append("follow_step", { mode: "teach", step: i + 1, tool: s.tool, instruction: s.line, line: s.line, status: "checked", differences, waiting, match });
  });
  const order = planOrder(d.record, steps);
  const n_match = out.filter((s) => s.match).length;
  const lines = out.map((s) => `${s.step}. ${s.tool}${s.line ? ` (${s.line})` : ""}: ${s.match ? "matches the record" : s.differences.join(" ")}${s.waiting.length ? ` ${s.waiting.join(" ")}` : ""}`);
  const text = steps.length ? [`${n_match} of ${out.length} steps match the decision record.`, ...lines, order].filter(Boolean).join("\n") : "The history has no steps yet.";
  return { ok: true, adapter: adapter.name, steps: out, n_steps: out.length, n_match, order, text };
}
