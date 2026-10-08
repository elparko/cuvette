import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Usage } from "./types.ts";

const PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
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

export function budgetUsd(): number | undefined {
  const v = Number(process.env.GA_BUDGET_USD);
  return Number.isFinite(v) && v > 0 ? v : undefined;
}

export function budgetProblem(): string | undefined {
  const budget = budgetUsd();
  if (budget === undefined) return undefined;
  const spent = totalSpend(process.env.GA_BUDGET_SINCE);
  return spent >= budget ? `The Claude budget of $${budget.toFixed(2)} is used up ($${spent.toFixed(2)} spent). Raise GA_BUDGET_USD to continue.` : undefined;
}
