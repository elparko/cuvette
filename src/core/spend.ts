import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { gaHome } from "../adapters/manifest.ts";
import type { Usage } from "./types.ts";

const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
};
const FALLBACK = PRICES["claude-fable-5-1"]!;

export function spendFile(): string {
  return process.env.GA_SPEND_FILE || join(homedir(), ".guided-analysis", "spend.jsonl");
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
    return Number(JSON.parse(readFileSync(join(gaHome(), "settings.json"), "utf8")).budgetUsd);
  } catch {
    return undefined;
  }
}

export function budgetUsd(env: Record<string, string | undefined> = process.env): number | undefined {
  for (const v of [Number(env.GA_BUDGET_USD), userBudget()]) if (v !== undefined && Number.isFinite(v) && v > 0) return v;
  return undefined;
}

export function budgetProblem(): string | undefined {
  const budget = budgetUsd();
  if (budget === undefined) return undefined;
  const spent = totalSpend(process.env.GA_BUDGET_SINCE || monthStart());
  return spent >= budget ? `The Claude budget of $${budget.toFixed(2)} for this month is used up ($${spent.toFixed(2)} spent). Raise GA_BUDGET_USD or the budgetUsd setting to continue.` : undefined;
}
