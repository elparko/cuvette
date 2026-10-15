import { expect, test } from "vitest";
import type { UsageReport, UsageRow } from "../src/core/account.ts";
import { groupUsage, tokensText, usd } from "../src/ui-web/lib/usage.ts";

const row = (at: string, session: string | null, model: string, cost: number, extra: Partial<UsageRow> = {}): UsageRow => ({
  at,
  session_id: session,
  model,
  input_tokens: 1000,
  output_tokens: 100,
  cache_write_tokens: 50,
  cache_read_tokens: 200,
  cost_usd: cost,
  paid_from: "allowance",
  ...extra,
});

test("requests of one session become one analysis row", () => {
  const report: UsageReport = {
    rows: [row("2026-10-12T10:00:00Z", "s1", "claude-sonnet-5-5", 0.25), row("2026-10-12T10:05:00Z", "s1", "claude-haiku-5-5", 0.05), row("2026-10-13T09:00:00Z", "s2", "claude-sonnet-5-5", 0.4)],
    sessions: [],
  };
  const g = groupUsage(report);
  expect(g.map((x) => x.key)).toEqual(["s2", "s1"]);
  const s1 = g[1]!;
  expect(s1).toMatchObject({ at: "2026-10-12T10:00:00Z", models: ["claude-sonnet-5-5", "claude-haiku-5-5"], inputTokens: 2000, outputTokens: 200, cacheTokens: 500 });
  expect(s1.costUsd).toBeCloseTo(0.3, 10);
  expect(s1.requests).toHaveLength(2);
});

test("requests with no session stay separate", () => {
  const g = groupUsage({ rows: [row("2026-10-12T10:00:00Z", null, "m", 0.1), row("2026-10-12T11:00:00Z", null, "m", 0.2)], sessions: [] });
  expect(g).toHaveLength(2);
  expect(g.map((x) => x.costUsd)).toEqual([0.2, 0.1]);
});

test("an empty report gives no rows", () => {
  expect(groupUsage({ rows: [], sessions: [] })).toEqual([]);
});

test("text helpers", () => {
  expect(usd(0.625)).toBe("$0.63");
  expect(tokensText(12000, 800, 5000)).toBe("12,000 in, 800 out, 5,000 cache");
  expect(tokensText(1, 2, 0)).toBe("1 in, 2 out");
});
