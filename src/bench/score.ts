import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Entry } from "../core/types.ts";
import type { Condition, Scenario } from "./scenario.ts";

export interface Scores {
  answer: number;
  traps: number;
  decisions: number;
  asking: number;
  claims: number;
  manual_route: number;
  details: Record<string, any>;
}

export const SCORE_NAMES = ["answer", "traps", "decisions", "asking", "claims", "manual_route"] as const;

interface Log {
  entries: Entry[];
  answerEntry?: Entry;
  answer: string;
  notes: string;
}

function readLog(sessionDir: string): Log {
  const path = join(sessionDir, "log.jsonl");
  const entries: Entry[] = [];
  if (existsSync(path))
    for (const line of readFileSync(path, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        entries.push(JSON.parse(line) as Entry);
      } catch {}
    }
  const answers = entries.filter((e) => e.kind === "assistant");
  const answerEntry = [...answers].reverse().find((e) => e.data.final) ?? answers.at(-1);
  const notes = entries.filter((e) => e.kind === "note").map((e) => String(e.data.text ?? ""));
  return { entries, answerEntry, answer: String(answerEntry?.data.text ?? ""), notes: notes.join("\n") };
}

const re = (s: string) => new RegExp(s, "i");
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const clamp = (x: number) => Math.min(1, Math.max(0, x));

interface Num {
  value: number;
  step: number;
}

export function numbersIn(text: string): Num[] {
  const out: Num[] = [];
  const rx = /(?<![\w.])(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+)(\s?%)?/g;
  for (const m of text.replace(/^[ \t]*(?:[-*]\s+)?\d+[.)](?=\s)/gm, "").matchAll(rx)) {
    const s = m[1].replace(/,/g, "");
    const dec = s.includes(".") ? s.length - s.indexOf(".") - 1 : 0;
    const value = Number(s);
    const plain = dec === 0 && !m[2];
    if (plain && value <= 10) continue;
    if (plain && value >= 1900 && value <= 2100) continue;
    out.push({ value, step: 10 ** -dec });
    if (m[2]) out.push({ value: value / 100, step: 10 ** -dec / 100 });
  }
  return out;
}

function near(n: Num, logged: number): boolean {
  return Math.abs(n.value - logged) <= Math.max(0.005 * Math.abs(logged), n.step / 2) + 1e-12;
}

function leaves(x: unknown, out: { path: string; value: number }[], path = ""): void {
  if (typeof x === "number" && Number.isFinite(x)) out.push({ path, value: x });
  else if (Array.isArray(x)) x.forEach((y, i) => leaves(y, out, `${path}[${i}]`));
  else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) leaves(y, out, path ? `${path}.${k}` : k);
}

function measured(entries: Entry[]): { path: string; value: number }[] {
  const out: { path: string; value: number }[] = [];
  for (const e of entries) {
    if (e.kind === "node") leaves(e.data.result, out);
    if (e.kind === "tool_result") {
      for (const t of [e.data.summary, e.data.text]) if (typeof t === "string") for (const n of numbersIn(t)) out.push({ path: "text", value: n.value });
      leaves(e.data.metrics, out, "metrics");
    }
  }
  return out;
}

function allowedInputs(entries: Entry[]): number[] {
  const out: { path: string; value: number }[] = [];
  for (const e of entries) {
    if (e.kind === "user") for (const n of numbersIn(String(e.data.text ?? ""))) out.push({ path: "", value: n.value });
    if (e.kind === "setup") leaves(e.data.values, out);
    if (e.kind === "answer") leaves(e.data.value, out);
  }
  return out.map((x) => x.value);
}

function scoreAnswer(log: Log, sc: Scenario) {
  const nums = numbersIn(log.answer);
  const logged = measured(log.entries);
  const found = sc.expected.effects.map((ef) => {
    const kw = ef.keywords.every((k) => re(k).test(log.answer));
    let inRange = true;
    if (ef.range) {
      const [lo, hi] = ef.range;
      const cands = nums.filter((n) => n.value >= lo && n.value <= hi);
      inRange = ef.path ? cands.some((n) => logged.some((l) => re(ef.path).test(l.path) && near(n, l.value))) : cands.length > 0;
    }
    return { description: ef.description, found: kw && inRange };
  });
  return { score: mean(found.map((f) => (f.found ? 1 : 0))), found };
}

function askedKeys(entries: Entry[]): { keys: string[]; free: number } {
  const byQid = new Map<string, string>();
  const keys: string[] = [];
  let free = 0;
  for (const e of entries) {
    if (e.kind !== "question") continue;
    const key = String(e.data.decisionKey ?? "");
    byQid.set(String(e.data.qid ?? ""), key);
    if (key) keys.push(key);
    else free++;
  }
  for (const e of entries) {
    if (e.kind !== "blocked") continue;
    const key = byQid.get(String(e.data.qid ?? "")) ?? String(e.data.key ?? "");
    if (key) keys.push(key);
  }
  return { keys: [...new Set(keys)], free };
}

function holds(c: Condition, log: Log, asked: string[]): boolean {
  const tools = log.entries.filter((e) => e.kind === "tool_call").map((e) => String(e.data.tool ?? ""));
  const nums = numbersIn(log.answer);
  return (
    c.answer_matches.every((p) => re(p).test(log.answer)) &&
    !c.answer_lacks.some((p) => re(p).test(log.answer)) &&
    (!c.answer_numbers.length || c.answer_numbers.some(([lo, hi]) => nums.some((n) => n.value >= lo && n.value <= hi))) &&
    c.tool_calls_present.every((p) => tools.some((t) => re(p).test(t))) &&
    !c.tool_calls_absent.some((p) => tools.some((t) => re(p).test(t))) &&
    !c.not_asked.some((k) => asked.includes(k))
  );
}

function scoreTraps(log: Log, sc: Scenario, asked: string[]) {
  const text = `${log.answer}\n${log.notes}`;
  const results = sc.traps.map((t) => {
    const d = t.detect;
    const findings = log.entries.filter((e) => e.kind === "finding");
    const sens = log.entries.filter((e) => e.kind === "sensitivity").map((e) => String(e.data.decisionKey ?? ""));
    const sensNodes = log.entries.filter((e) => e.kind === "node").map((e) => String(e.data.sensitivityOf ?? ""));
    const tools = log.entries.filter((e) => e.kind === "tool_call").map((e) => String(e.data.tool ?? ""));
    const flagged =
      d.keywords.some((k) => re(k).test(text)) ||
      d.finding.some((f) => findings.some((e) => re(f).test(String(e.data.check ?? "")) || re(f).test(String(e.data.message ?? "")))) ||
      d.question.some((k) => asked.includes(k)) ||
      d.sensitivity.some((k) => sens.includes(k) || sensNodes.includes(k)) ||
      d.tool_calls.some((p) => tools.some((t) => re(p).test(t)));
    const fell = !flagged && t.fell_in.some((c) => holds(c, log, asked));
    const outcome = flagged ? "flagged" : fell ? "fell_in" : "neither";
    return { id: t.id, kind: t.kind, outcome, score: flagged ? 1 : fell ? 0 : 0.5 };
  });
  return { score: results.length ? mean(results.map((r) => r.score)) : 1, results };
}

function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === "number" || typeof b === "number") return Number(a) === Number(b);
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function dotted(obj: unknown, path: string): unknown {
  let cur: any = obj;
  for (const p of path.split(".")) cur = cur?.[p];
  return cur;
}

function scoreDecisions(log: Log, sc: Scenario) {
  const byQid = new Map<string, string>();
  const timeline: { id: number; key: string; value: unknown }[] = [];
  for (const e of log.entries) {
    if (e.kind === "question") byQid.set(String(e.data.qid), String(e.data.decisionKey ?? ""));
    else if (e.kind === "setup") for (const [k, v] of Object.entries((e.data.values as Record<string, unknown>) ?? {})) timeline.push({ id: e.id, key: k, value: v });
    else if (e.kind === "decision") timeline.push({ id: e.id, key: String(e.data.key), value: e.data.new });
    else if (e.kind === "answer") {
      const key = byQid.get(String(e.data.qid));
      if (key) timeline.push({ id: e.id, key, value: e.data.value });
    }
  }
  const decisionIds = log.entries.filter((e) => e.kind === "decision").map((e) => ({ id: e.id, key: String(e.data.key), reason: String(e.data.reason ?? "") }));
  const deviations = log.entries.filter((e) => e.kind === "deviation");
  const deviatedCalls = new Set(deviations.map((e) => String(e.data.callId)));
  const human = new Set(sc.human_decisions);
  const unlogged: string[] = [];
  const unexplained: string[] = [];
  let checked = 0;
  for (const call of log.entries.filter((e) => e.kind === "tool_call")) {
    for (const [key, arg] of Object.entries(sc.decision_args)) {
      if (!human.has(key)) continue;
      const used = dotted(call.data.args, arg);
      if (used === undefined) continue;
      const want = [...timeline].reverse().find((t) => t.key === key && t.id < call.id);
      if (!want) continue;
      checked++;
      if (!sameValue(want.value, used) && !deviatedCalls.has(String(call.data.callId))) unlogged.push(`${call.data.tool}.${arg}=${used} (decided ${want.value})`);
    }
  }
  for (const e of deviations)
    for (const d of (e.data.deviations as { key: string; overwritten?: boolean }[]) ?? []) {
      if (!human.has(d.key) || d.overwritten) continue;
      checked++;
      if (!decisionIds.some((x) => x.key === d.key && x.id > e.id && x.reason)) unexplained.push(`${e.data.tool}: ${d.key}`);
    }
  const bad = unlogged.length + unexplained.length;
  return { score: checked ? clamp(1 - bad / checked) : bad ? 0 : 1, checked, unlogged, unexplained };
}

function scoreAsking(log: Log, sc: Scenario) {
  const { keys, free } = askedKeys(log.entries);
  const asked = keys.filter((k) => k !== "question");
  const human = new Set(sc.human_decisions);
  const tp = asked.filter((k) => human.has(k)).length;
  const fp = asked.filter((k) => !human.has(k));
  const precision = asked.length ? tp / asked.length : 1;
  const recall = human.size ? tp / human.size : 1;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return { score: f1, precision, recall, asked, unneeded: fp, free_questions: free, missed: sc.human_decisions.filter((k) => !asked.includes(k)) };
}

function scoreClaims(log: Log) {
  const checks = log.entries.filter((e) => e.kind === "claim_check");
  const mine = checks.filter((e) => e.data.answerEntry === log.answerEntry?.id);
  const check = (mine.length ? mine : checks).at(-1);
  if (check) {
    const claims = ((check.data.claims as { value: number | null; label: string }[]) ?? []).filter((c) => c.value !== null);
    if (claims.length) {
      const ok = claims.filter((c) => c.label === "measured").length;
      return { score: ok / claims.length, source: "claim_check", total: claims.length, measured: ok };
    }
    return { score: 1, source: "claim_check", total: 0, measured: 0 };
  }
  const nums = numbersIn(log.answer);
  const logged = measured(log.entries).map((x) => x.value);
  const inputs = allowedInputs(log.entries);
  const counted = nums.filter((n) => !inputs.some((v) => near(n, v)));
  const ok = counted.filter((n) => logged.some((v) => near(n, v))).length;
  return { score: counted.length ? ok / counted.length : 1, source: "matcher", total: counted.length, measured: ok };
}

function scoreManualRoute(log: Log, sessionDir: string) {
  const nodes = log.entries.filter((e) => e.kind === "node" && !e.data.sensitivityOf);
  const good = nodes.filter((e) => ["exact", "close"].includes(String(e.data.fidelity)) && String(e.data.manualRoute ?? "").trim());
  const fraction = nodes.length ? good.length / nodes.length : 0;
  const dir = join(sessionDir, "exports");
  const protocol = existsSync(dir) && readdirSync(dir).some((f) => /protocol/i.test(f));
  return { score: (fraction + (protocol ? 1 : 0)) / 2, steps: nodes.length, with_route: good.length, protocol };
}

export function score(sessionDir: string, sc: Scenario): Scores {
  const log = readLog(sessionDir);
  const asking = scoreAsking(log, sc);
  const traps = scoreTraps(log, sc, askedKeys(log.entries).keys);
  const answer = scoreAnswer(log, sc);
  const decisions = scoreDecisions(log, sc);
  const claims = scoreClaims(log);
  const route = scoreManualRoute(log, sessionDir);
  return {
    answer: answer.score,
    traps: traps.score,
    decisions: decisions.score,
    asking: asking.score,
    claims: claims.score,
    manual_route: route.score,
    details: { answer, traps: traps.results, decisions, asking, claims, manual_route: route, has_answer: Boolean(log.answerEntry) },
  };
}

export function overall(s: Pick<Scores, (typeof SCORE_NAMES)[number]>): number {
  return mean(SCORE_NAMES.map((n) => s[n]));
}

export function scoreText(s: Scores): string {
  const rows = SCORE_NAMES.map((n) => `${n.padEnd(13)} ${s[n].toFixed(2)}`);
  rows.push(`${"overall".padEnd(13)} ${overall(s).toFixed(2)}`);
  return rows.join("\n");
}
