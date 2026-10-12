import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { cuvetteHome } from "../adapters/manifest.ts";
import { homeFolder } from "./old-names.ts";
import type { Usage } from "./types.ts";

const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
};
const FALLBACK = PRICES["claude-fable-5-1"]!;

export function modelPrice(model: string): { input: number; output: number } | undefined {
  return PRICES[model.replace(/^claude:/, "")];
}

export function spendFile(): string {
  return process.env.CUVETTE_SPEND_FILE || join(homeFolder(), "spend.jsonl");
}

export function costUsd(model: string, u: Usage): number {
  const p = PRICES[model] ?? FALLBACK;
  return (u.inputTokens * p.input + u.outputTokens * p.output + (u.cacheRead ?? 0) * p.cacheRead + (u.cacheWrite ?? 0) * p.cacheWrite) / 1e6;
}

export function recordSpend(model: string, u: Usage, session?: string): number {
  const usd = costUsd(model, u);
  const path = spendFile();
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify({ t: new Date().toISOString(), model, session, usd, ...u }) + "\n");
  return usd;
}

export function readSpend(): { t: string; model: string; usd: number }[] {
  const path = spendFile();
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").filter(Boolean).flatMap((l) => {
    try {
      return [JSON.parse(l)];
    } catch {
      return [];
    }
  });
}

export function totalSpend(since?: string): number {
  return readSpend().filter((e) => !since || e.t >= since).reduce((s, e) => s + (Number(e.usd) || 0), 0);
}

export function monthStart(now = new Date()): string {
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function userBudget(): number | undefined {
  try {
    return Number(JSON.parse(readFileSync(join(cuvetteHome(), "settings.json"), "utf8")).budgetUsd);
  } catch {
    return undefined;
  }
}

export function budgetUsd(env: Record<string, string | undefined> = process.env): number | undefined {
  for (const v of [Number(env.CUVETTE_BUDGET_USD), userBudget()]) if (v !== undefined && Number.isFinite(v) && v > 0) return v;
  return undefined;
}

export const BUDGET_WARN = 0.8;

const CHEAPER: Record<string, string> = {
  "claude-fable-5-1": "claude-sonnet-5-5",
  "claude-opus-5-5": "claude-sonnet-5-5",
  "claude-sonnet-5-5": "claude-haiku-5-5",
};

export function cheaperModel(model: string): string | undefined {
  return CHEAPER[model.replace(/^claude:/, "")];
}

export function budgetState(env: Record<string, string | undefined> = process.env): { budget: number; spent: number; ratio: number } | undefined {
  const budget = budgetUsd(env);
  if (budget === undefined) return undefined;
  const spent = totalSpend(env.CUVETTE_BUDGET_SINCE || monthStart());
  return { budget, spent, ratio: spent / budget };
}

export function budgetProblem(): string | undefined {
  const budget = budgetUsd();
  if (budget === undefined) return undefined;
  const spent = totalSpend(process.env.CUVETTE_BUDGET_SINCE || monthStart());
  return spent >= budget ? `The Claude budget of $${budget.toFixed(2)} for this month is used up ($${spent.toFixed(2)} spent). Raise CUVETTE_BUDGET_USD or the budgetUsd setting to continue.` : undefined;
}

export function promptTokens(d: Record<string, unknown>): number {
  return ["inputTokens", "cacheRead", "cacheWrite", "outputTokens"].reduce((n, k) => n + (Number(d[k]) || 0), 0);
}

export function entryCost(d: Record<string, unknown>): number | undefined {
  if (d.local === true) return 0;
  const model = String(d.model ?? "");
  const claude = d.provider ? d.provider === "claude" : model.startsWith("claude");
  if (!claude) return undefined;
  return costUsd(model, { inputTokens: Number(d.inputTokens) || 0, outputTokens: Number(d.outputTokens) || 0, cacheRead: Number(d.cacheRead) || 0, cacheWrite: Number(d.cacheWrite) || 0 });
}

export interface TurnUsage {
  turn: number;
  request: string;
  steps: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  usd?: number;
  unpriced?: number;
}

export interface UsageSummary {
  model: string;
  local: boolean;
  usd?: number;
  turns: TurnUsage[];
  total: TurnUsage;
  contextTokens: number;
  contextWindow: number;
  percent: number;
  steps: number;
}

const blank = (turn: number, request: string): TurnUsage => ({ turn, request, steps: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, usd: 0 });

function add(t: TurnUsage, d: Record<string, unknown>): void {
  t.steps++;
  t.input += Number(d.inputTokens) || 0;
  t.output += Number(d.outputTokens) || 0;
  t.cacheRead += Number(d.cacheRead) || 0;
  t.cacheWrite += Number(d.cacheWrite) || 0;
  const c = entryCost(d);
  if (c === undefined) t.unpriced = (t.unpriced ?? 0) + 1;
  else t.usd = (t.usd ?? 0) + c;
}

// A sum with no priced step is not known. A sum with some priced steps keeps the known part.
function settle(t: TurnUsage): TurnUsage {
  if (t.unpriced === t.steps) t.usd = undefined;
  return t;
}

export function usageSummary(entries: { kind: string; data: Record<string, unknown> }[], info: { model: string; provider: string; contextWindow: number; local?: boolean }, contextTokens: number): UsageSummary {
  const turns: TurnUsage[] = [];
  const total = blank(0, "Total");
  let cur: TurnUsage | undefined;
  for (const e of entries) {
    if (e.kind === "user") {
      if (e.data.during) continue;
      cur = blank(turns.length + 1, String(e.data.text ?? ""));
      turns.push(cur);
    } else if (e.kind === "usage") {
      if (!cur) turns.push((cur = blank(turns.length + 1, "")));
      add(cur, e.data);
      add(total, e.data);
    }
  }
  const local = info.local ?? info.provider === "ollama";
  const win = info.contextWindow || 1;
  for (const t of [...turns, total]) settle(t);
  return { model: info.model, local, usd: total.usd, turns: turns.filter((t) => t.steps), total, contextTokens, contextWindow: win, percent: (contextTokens / win) * 100, steps: total.steps };
}

export function dollars(usd: number | undefined): string {
  if (usd === undefined) return "price not known";
  if (usd === 0) return "$0";
  return usd < 0.01 ? "<$0.01" : `$${usd.toFixed(2)}`;
}

export function kTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : String(n);
}

export function percentText(p: number): string {
  return p > 0 && p < 1 ? "<1%" : `${Math.round(p)}%`;
}

function moneyText(u: UsageSummary): string {
  return u.usd !== undefined && u.total.unpriced ? `${dollars(u.usd)} and steps with no price` : dollars(u.usd);
}

export function usageShort(u: UsageSummary): string {
  return `${u.local ? `local, ${moneyText(u)}` : moneyText(u)} · context ${percentText(u.percent)}`;
}

export function usageLong(u: UsageSummary): string {
  const money = u.local ? `local model, ${moneyText(u)} this session` : u.usd === undefined ? "the price of this model is not known" : `${moneyText(u)} this session`;
  return `${money} · context ${kTokens(u.contextTokens)} of ${kTokens(u.contextWindow)} tokens (${percentText(u.percent)})`;
}

export function contextWarning(used: number, win: number): string {
  return `The context is ${percentText((used / win) * 100)} full: ${kTokens(used)} of ${kTokens(win)} tokens. Before each step, the harness shortens old tool output if its estimate is more than 50%. It summarizes the older messages if its estimate is more than 70%. It keeps the current request and the recent steps. Type /compact to summarize now.`;
}

export function priceLine(model: string): string {
  const p = PRICES[model];
  return p ? `List prices for ${model}, in US dollars for each million tokens: input $${p.input}, output $${p.output}, cache read $${p.cacheRead}, cache write $${p.cacheWrite}.` : "";
}
