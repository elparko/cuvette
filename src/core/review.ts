import type { AdapterCheckContext, LoadedAdapter } from "../adapters/manifest.ts";
import type { DecisionRecord } from "./decisions.ts";
import type { AnalysisRecord } from "./record.ts";
import type { Claim, Entry, Finding, FindingIn, Node, Provider } from "./types.ts";

export interface ReviewContext {
  record: AnalysisRecord;
  decisions: DecisionRecord;
  adapters: LoadedAdapter[];
  answer: string;
  claims: Claim[];
}

const STATUS = { accept: "accepted", reject: "rejected", fix: "fixed" } as const;

export class Findings {
  private items: Finding[] = [];

  constructor(private record: AnalysisRecord) {
    for (const e of record.entries(["finding", "finding_resolution"])) {
      if (e.kind === "finding") this.items.push({ ...(e.data as unknown as Finding) });
      else {
        const f = this.items.find((x) => x.fid === e.data.fid);
        const status = STATUS[e.data.action as keyof typeof STATUS];
        if (f && status) f.status = status;
      }
    }
  }

  add(f: FindingIn, source: Finding["source"]): Finding {
    const finding: Finding = { ...f, fid: `f${this.items.length + 1}`, source, status: "open" };
    this.items.push(finding);
    this.record.append("finding", { ...finding }, { refs: f.entries, node: f.nodes?.[0] });
    return finding;
  }

  resolve(fid: string, action: "accept" | "reject" | "fix", reason?: string): void {
    const f = this.items.find((x) => x.fid === fid);
    if (!f) throw new Error(`no finding ${fid}`);
    f.status = STATUS[action];
    this.record.append("finding_resolution", { fid, action, reason }, { refs: f.entries });
  }

  list(status?: Finding["status"]): Finding[] {
    return this.items.filter((f) => !status || f.status === status);
  }
}

function stepNumbers(entries: Entry[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of entries) if (e.kind === "tool_call") out.set(String(e.data.callId), out.size + 1);
  return out;
}

function failedNotRepeated(ctx: ReviewContext): FindingIn[] {
  const { record } = ctx;
  const steps = stepNumbers(record.entries(["tool_call"]));
  const results = record.entries(["tool_result"]);
  const skipped = new Set(record.entries(["blocked"]).map((e) => String(e.data.callId)));
  const out: FindingIn[] = [];
  results.forEach((r, i) => {
    if (r.data.ok !== false || skipped.has(String(r.data.callId))) return;
    const tool = String(r.data.tool);
    if (results.slice(i + 1).some((x) => x.data.tool === tool && x.data.ok !== false)) return;
    const n = steps.get(String(r.data.callId));
    out.push({
      check: "failed_result_used",
      severity: "warning",
      message: `Step ${n ?? "?"} (${tool}) failed and was not repeated.${r.data.error ? ` Error: ${String(r.data.error).slice(0, 160)}` : ""}`,
      entries: [r.id],
      nodes: r.node ? [r.node] : undefined,
    });
  });
  return out;
}

function mentions(answer: string, term: string): boolean {
  const t = term.toLowerCase();
  const a = answer.toLowerCase();
  return a.includes(t) || a.includes(t.replace(/[_-]/g, " "));
}

function deviationsNotMentioned(ctx: ReviewContext): FindingIn[] {
  const out: FindingIn[] = [];
  for (const e of ctx.record.entries(["deviation"])) {
    const list = (e.data.deviations ?? []) as { arg: string; key: string; setup: unknown; used: unknown; overwritten?: boolean }[];
    for (const d of list) {
      if (d.overwritten) continue;
      const last = d.arg.split(".").at(-1) ?? d.arg;
      if ([d.key, d.arg, last].some((t) => t && mentions(ctx.answer, t))) continue;
      out.push({
        check: "deviation_not_mentioned",
        severity: "warning",
        message: `Step used ${d.arg} = ${JSON.stringify(d.used)}, but the setup value is ${JSON.stringify(d.setup)}. The answer does not mention this.`,
        entries: [e.id],
        nodes: e.node ? [e.node] : undefined,
      });
    }
  }
  return out;
}

const P_VALUE = /\b[pPqQ](?:[ -]?values?)?\s*(?:=|<|>|≤|≥|<=|>=|~|of)\s*(?:\d*\.\d+|\d+)/;
const EFFECT = /effect size|fold[- ]?change|\bAUC\b|\bAUROC\b|cohen|hedges|difference of|mean difference|ratio|odds/i;

function pWithoutEffect(ctx: ReviewContext): FindingIn[] {
  if (!P_VALUE.test(ctx.answer) || EFFECT.test(ctx.answer)) return [];
  return [
    {
      check: "p_without_effect",
      severity: "warning",
      message: "The answer reports a p or q value with no effect size. Add the size of the difference.",
    },
  ];
}

function unsourcedNumbers(ctx: ReviewContext): FindingIn[] {
  const bad = ctx.claims.filter((c) => c.label === "unsourced");
  if (!bad.length) return [];
  const values = [...new Set(bad.map((c) => String(c.value)))].join(", ");
  return [
    {
      check: "unsourced_numbers",
      severity: "error",
      message: `${bad.length} number${bad.length === 1 ? "" : "s"} in the answer match no logged tool result: ${values}. Run the tool that measures each number, or remove the number, or say how you derived it from logged results.`,
    },
  ];
}

function staleUsed(ctx: ReviewContext): FindingIn[] {
  const stale = ctx.record.stale();
  const nodes = [...new Set(ctx.claims.filter((c) => c.label === "measured" && c.node && stale.has(c.node)).map((c) => c.node!))];
  if (!nodes.length) return [];
  return [
    {
      check: "stale_used",
      severity: "error",
      message: `The answer uses numbers from stale results: ${nodes.join(", ")}. A decision changed after these ran. Run them again.`,
      nodes,
    },
  ];
}

const CONCLUSION = /\b(?:therefore|thus|conclude[sd]?|conclusion|demonstrates?|shows? that|we found|is significant|are significant|confirms?)\b/i;

function openQuestions(ctx: ReviewContext): FindingIn[] {
  const answered = new Set(ctx.record.entries(["answer"]).map((e) => e.data.qid));
  const open = ctx.record.entries(["question"]).filter((e) => !answered.has(e.data.qid));
  if (!open.length || !CONCLUSION.test(ctx.answer)) return [];
  return [
    {
      check: "open_questions",
      severity: "info",
      message: `The answer states a conclusion while ${open.length} question${open.length === 1 ? " is" : "s are"} still open.`,
      entries: open.map((e) => e.id),
    },
  ];
}

function pathValue(obj: unknown, path: string): unknown {
  let cur: any = obj;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = cur[part];
  }
  return cur;
}

function holds(op: string, actual: unknown, expected: unknown): boolean {
  const empty = actual === undefined || actual === null || actual === "";
  if (op === "missing") return empty;
  if (op === "present") return !empty;
  if (empty) return false;
  const a = typeof expected === "number" ? Number(actual) : String(actual);
  const b = typeof expected === "number" ? expected : String(expected);
  if (op === "==") return a === b;
  if (op === "!=") return a !== b;
  if (op === "<") return a < b;
  if (op === "<=") return a <= b;
  if (op === ">") return a > b;
  return a >= b;
}

function ruleChecks(ctx: ReviewContext): FindingIn[] {
  const out: FindingIn[] = [];
  const nodes = ctx.record.nodes().filter((n) => !n.sensitivityOf);
  for (const adapter of ctx.adapters) {
    for (const c of adapter.manifest.checks) {
      const rule = c.rule;
      if (!rule) continue;
      const hit = nodes.filter(
        (n) => n.tool === rule.tool && (!n.adapter || n.adapter === adapter.name) && holds(rule.op, pathValue(n.args, rule.arg), rule.value),
      );
      if (!hit.length) continue;
      out.push({
        check: c.id,
        severity: c.severity,
        message: rule.message,
        nodes: hit.map((n) => n.id),
        entries: hit.map((n) => n.entry),
      });
    }
  }
  return out;
}

async function moduleChecks(ctx: ReviewContext): Promise<FindingIn[]> {
  const out: FindingIn[] = [];
  const cctx: AdapterCheckContext = {
    entries: ctx.record.entries(),
    nodes: ctx.record.nodes().filter((n) => !n.sensitivityOf),
    decisions: ctx.decisions.values(),
    answer: ctx.answer,
  };
  for (const adapter of ctx.adapters) {
    let checks: Awaited<ReturnType<LoadedAdapter["module"]>>["checks"];
    try {
      checks = (await adapter.module()).checks;
    } catch (err) {
      out.push({ check: `${adapter.name}.module`, severity: "info", message: `adapter module failed to load: ${(err as Error).message}` });
      continue;
    }
    for (const c of adapter.manifest.checks) {
      const fn = checks?.[c.id];
      if (typeof fn !== "function") continue;
      try {
        out.push(...(await fn(cctx)));
      } catch (err) {
        out.push({ check: c.id, severity: "info", message: `check ${c.id} failed to run: ${(err as Error).message}` });
      }
    }
  }
  return out;
}

const SAYS_COMPARISON = /\bcompar(?:ison|ed|ing|e)\b/i;

function decisionsMisreported(ctx: ReviewContext): FindingIn[] {
  const out: FindingIn[] = [];
  const values = ctx.decisions.values();
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const word = (t: string) => new RegExp(`(^|[^A-Za-z0-9])${esc(t)}([^A-Za-z0-9]|$)`, "i");
  const STOP = new Set(["what", "which", "with", "from", "that", "this", "unit", "value", "values", "pixels", "none", "used"]);
  const sentences = ctx.answer.split(/(?<=[.!?\n])\s+/).filter((s) => !SAYS_COMPARISON.test(s));
  for (const a of ctx.adapters)
    for (const d of a.manifest.decisions ?? []) {
      if (d.kind !== "choice" || !(d.key in values)) continue;
      const actual = String(values[d.key]);
      const names = [d.key.replace(/_/g, " "), ...d.label.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 5 && !STOP.has(w))];
      const about = sentences.filter((s) => names.some((n) => word(n).test(s)));
      const named = new Set<string>();
      for (const s of about)
        for (const c of d.choices.map(String))
          if (c !== actual && c.length > 2 && !/^\d+(\.\d+)?$/.test(c) && word(c).test(s) && !word(actual).test(s)) named.add(c);
      if (named.size)
        out.push({
          check: "decision_misreported",
          severity: "error",
          message: `The answer names ${[...named].join(", ")} for "${d.label}", but the decision record says ${actual}. Report the value that was used.`,
        });
    }
  return out;
}

function numbersFromComparisons(ctx: ReviewContext): FindingIn[] {
  const nodes = new Map(ctx.record.nodes().map((n) => [n.id, n]));
  const chosen = (key: string) => (ctx.decisions as { value?: (k: string) => unknown }).value?.(key);
  const ranChosen = (n: { args?: Record<string, unknown>; sensitivityOf?: string }) => {
    const v = chosen(n.sensitivityOf ?? "");
    return v !== undefined && v !== null && Object.values(n.args ?? {}).some((a) => String(a) === String(v));
  };
  const hits = ctx.claims.filter((c) => c.node && nodes.get(c.node)?.sensitivityOf && !ranChosen(nodes.get(c.node)!) && !SAYS_COMPARISON.test(c.text));
  if (!hits.length) return [];
  return [{
    check: "number_from_comparison",
    severity: "error",
    message: `The answer uses ${hits.map((c) => c.value).join(", ")} from a comparison run of another option (${[...new Set(hits.map((c) => nodes.get(c.node!)!.sensitivityOf))].join(", ")}), not from the setting that was chosen. Use the result of the chosen setting, or say clearly that the number is from the comparison.`,
    nodes: hits.map((c) => c.node!),
  }];
}

function significanceWithoutTest(ctx: ReviewContext): FindingIn[] {
  if (!/\bsignifican(t|tly|ce)\b/i.test(ctx.answer)) return [];
  if (/\bnot (statistically )?significan|\bno (statistical )?test|\bwithout a (statistical )?test|cannot (be )?test/i.test(ctx.answer)) return [];
  const testKey = /^(p|q|p_?val(ue)?|q_?val(ue)?|p_adj|padj|fdr|pvalue|qvalue)$/i;
  const tested = ctx.record.nodes().some((n) => {
    const m = (n.result as { metrics?: Record<string, number> } | undefined)?.metrics ?? {};
    return Object.keys(m).some((k) => testKey.test(k) || /(^|_)(p|q)_?value/i.test(k));
  }) || ctx.record.numbers().some((x) => /(^|[._\[])(p|q|p_?value|q_?value|padj|fdr)($|[._\]])/i.test(x.path));
  if (tested) return [];
  return [{
    check: "significance_without_test",
    severity: "error",
    message: "The answer uses the word significant, but no statistical test ran in this session. Say that the difference is descriptive, or run a test with the right unit of replication.",
  }];
}

export async function runChecks(ctx: ReviewContext): Promise<FindingIn[]> {
  return [
    ...significanceWithoutTest(ctx),
    ...numbersFromComparisons(ctx),
    ...decisionsMisreported(ctx),
    ...failedNotRepeated(ctx),
    ...deviationsNotMentioned(ctx),
    ...pWithoutEffect(ctx),
    ...unsourcedNumbers(ctx),
    ...staleUsed(ctx),
    ...openQuestions(ctx),
    ...ruleChecks(ctx),
    ...(await moduleChecks(ctx)),
  ];
}

function clip(x: unknown, n = 200): string {
  const s = typeof x === "string" ? x : JSON.stringify(x);
  return s.length > n ? s.slice(0, n - 3) + "..." : s;
}

export function logText(record: AnalysisRecord): string {
  const nodes = new Map<number, Node>(record.nodes().map((n) => [n.entry, n]));
  const lines: string[] = [];
  const steps = stepNumbers(record.entries(["tool_call"]));
  const calls = new Map(record.entries(["tool_call"]).map((e) => [String(e.data.callId), e]));
  for (const e of record.entries()) {
    const d = e.data;
    const id = `#${e.id}`;
    if (e.kind === "setup") lines.push(`${id} setup: ${clip(d.values, 600)}${d.defaultsAccepted ? ` defaults accepted: ${clip(d.defaultsAccepted)}` : ""}`);
    else if (e.kind === "user") lines.push(`${id} scientist: ${clip(d.text, 400)}`);
    else if (e.kind === "tool_call") lines.push(`${id} step ${steps.get(String(d.callId))} call ${d.tool} ${clip(d.args, 300)}`);
    else if (e.kind === "tool_result") {
      const call = calls.get(String(d.callId));
      const n = e.node ? record.node(e.node) : undefined;
      const step = steps.get(String(d.callId));
      const bits = [d.ok === false ? `FAILED ${clip(d.error ?? "", 200)}` : `ok ${clip(d.summary ?? "", 300)}`];
      const metrics = n && typeof n.result === "object" && n.result ? (n.result as any).metrics : undefined;
      if (metrics) bits.push(`metrics ${clip(metrics, 300)}`);
      const route = d.manualRoute ?? n?.manualRoute;
      if (route) bits.push(`manual route: ${clip(route, 200)}`);
      if (d.fidelity) bits.push(`fidelity ${d.fidelity}`);
      if (e.node) bits.push(`node ${e.node}`);
      if (d.tool === "run_script" && d.ok !== false && d.text) bits.push(`printed output: ${clip(d.text, 1500)}`);
      const label = d.sensitivityOf ? `comparison run for ${d.sensitivityOf}` : `step ${step}`;
      lines.push(`${id} ${label} result of ${d.tool ?? call?.data.tool}: ${bits.join("; ")}`);
    } else if (e.kind === "decision") lines.push(`${id} decision ${d.key}: ${clip(d.old)} -> ${clip(d.new)} by ${d.by}${d.reason ? ` (${clip(d.reason)})` : ""}`);
    else if (e.kind === "owner_change") lines.push(`${id} owner of ${d.key}: ${d.old} -> ${d.new} by ${d.by}`);
    else if (e.kind === "deviation") lines.push(`${id} deviation in ${d.tool}: ${clip(d.deviations, 300)}`);
    else if (e.kind === "blocked") lines.push(`${id} blocked ${d.tool}: ${clip(d.reason)}`);
    else if (e.kind === "question") lines.push(`${id} question ${d.qid}: ${clip(d.title)} - ${clip(d.text)}`);
    else if (e.kind === "answer") lines.push(`${id} answer to ${d.qid}: ${clip(d.value)} by ${d.by}`);
    else if (e.kind === "stale") lines.push(`${id} stale nodes ${clip(d.nodes)} because ${clip(d.reason)}`);
  }
  return lines.join("\n");
}

const SYSTEM = `You are an independent reviewer of a scientific data analysis.
You see only the log of the analysis and the final answer with its number claims.
You do not see the analyst's reasoning. Judge only what the log supports.

Look for:
- conclusions that the logged results do not support
- numbers in the answer that no step produced
- steps that failed, were skipped or were repeated with other settings
- method choices that the scientist did not make or that differ from the setup
- statistics used on the wrong unit of replication, a p value with no effect size
- certainty that is stronger than the evidence

Write your report as JSON lines. One finding for each line, with no other text:
{"severity": "info" | "warning" | "error", "message": "<one or two plain sentences>", "entries": [<log entry numbers>]}
Cite the log entry numbers (the number after #) that support each finding.
If you find nothing, write [].`;

export function refereePrompt(ctx: ReviewContext): { system: string; text: string } {
  const textChecks = ctx.adapters.flatMap((a) => a.manifest.checks.filter((c) => !c.rule && c.text.trim()).map((c) => `- ${c.id}: ${c.text.trim()}`));
  const standards = ctx.adapters.map((a) => a.standardsText()).filter(Boolean);
  let system = SYSTEM;
  if (textChecks.length) system += `\n\nChecks from the adapter. Apply each one:\n${textChecks.join("\n")}`;
  if (standards.length) system += `\n\nStandards of the program:\n${standards.join("\n\n")}`;
  const claims = ctx.claims.map((c) => `- ${c.value ?? "(no number)"} [${c.label}${c.node ? " " + c.node : ""}] ${clip(c.text, 160)}`).join("\n");
  const text = `LOG\n${logText(ctx.record)}\n\nFINAL ANSWER\n${ctx.answer}\n\nCLAIMS\n${claims || "(none)"}`;
  return { system, text };
}

const SEVERITIES = new Set(["info", "warning", "error"]);

function toFinding(x: unknown): FindingIn | undefined {
  if (!x || typeof x !== "object") return undefined;
  const o = x as Record<string, unknown>;
  if (typeof o.message !== "string" || !o.message.trim()) return undefined;
  const entries = Array.isArray(o.entries) ? o.entries.map((n) => Number(String(n).replace(/^#/, ""))).filter(Number.isFinite) : [];
  return {
    check: "referee",
    severity: SEVERITIES.has(String(o.severity)) ? (o.severity as FindingIn["severity"]) : "info",
    message: o.message.trim(),
    entries: entries.length ? entries : undefined,
  };
}

export function parseReferee(raw: string): FindingIn[] {
  const body = raw.replace(/```[a-z]*\n?/gi, "").trim();
  if (!body || /^(none|no findings|no problems( found)?|\[\s*\])\.?$/i.test(body)) return [];
  const tryParse = (s: string): unknown => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };
  const whole = tryParse(body);
  let items: unknown[] | undefined;
  if (Array.isArray(whole)) items = whole;
  else if (whole && typeof whole === "object") items = Array.isArray((whole as any).findings) ? (whole as any).findings : [whole];
  else {
    const lines = body.split("\n").map((l) => l.trim().replace(/,$/, "")).filter((l) => l.startsWith("{"));
    const parsed = lines.map(tryParse).filter((x) => x !== undefined);
    if (parsed.length) items = parsed;
  }
  const findings = (items ?? []).map(toFinding).filter((f): f is FindingIn => Boolean(f));
  if (findings.length || (items && items.length === 0)) return findings;
  return [{ check: "referee", severity: "info", message: `The referee reply could not be read: ${clip(body, 800)}` }];
}

export async function referee(provider: Provider, ctx: ReviewContext): Promise<FindingIn[]> {
  const { system, text } = refereePrompt(ctx);
  return parseReferee(await provider.complete(system, text));
}
