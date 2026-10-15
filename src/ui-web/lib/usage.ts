import type { UsageReport, UsageRow } from "../../core/account.ts";

export interface AnalysisUsage {
  key: string;
  at: string;
  models: string[];
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  costUsd: number;
  requests: UsageRow[];
}

export function groupUsage(report: UsageReport): AnalysisUsage[] {
  const groups = new Map<string, AnalysisUsage>();
  report.rows.forEach((r, i) => {
    const key = r.session_id ?? `request-${i}`;
    const g = groups.get(key) ?? { key, at: r.at, models: [], inputTokens: 0, outputTokens: 0, cacheTokens: 0, costUsd: 0, requests: [] };
    if (r.at < g.at) g.at = r.at;
    if (!g.models.includes(r.model)) g.models.push(r.model);
    g.inputTokens += r.input_tokens;
    g.outputTokens += r.output_tokens;
    g.cacheTokens += r.cache_write_tokens + r.cache_read_tokens;
    g.costUsd += r.cost_usd;
    g.requests.push(r);
    groups.set(key, g);
  });
  return [...groups.values()].sort((a, b) => b.at.localeCompare(a.at));
}

export const PLAN_NAMES: Record<string, string> = { basic: "Basic", standard: "Standard", lab: "Lab", lab_plus: "Lab Plus", none: "No plan" };

export const usd = (n: number): string => `$${n.toFixed(2)}`;

export const tokensText = (input: number, output: number, cache: number): string =>
  `${input.toLocaleString("en-US")} in, ${output.toLocaleString("en-US")} out${cache ? `, ${cache.toLocaleString("en-US")} cache` : ""}`;

export const dateText = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
};
