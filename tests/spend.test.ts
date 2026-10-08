import { readFileSync } from "node:fs";
import { afterEach, expect, test } from "vitest";
import { budgetProblem, costUsd, recordSpend, spendFile, totalSpend } from "../src/core/spend.ts";

afterEach(() => {
  delete process.env.GA_BUDGET_USD;
});

test("cost uses the model's prices", () => {
  expect(costUsd("claude-opus-5-5", { inputTokens: 1e6, outputTokens: 1e6, cacheRead: 1e6, cacheWrite: 1e6 })).toBeCloseTo(4 + 20 + 0.2 + 5, 6);
  expect(costUsd("claude-haiku-5-5", { inputTokens: 1e6, outputTokens: 1e6 })).toBeCloseTo(0.6, 6);
  expect(costUsd("unknown-model", { inputTokens: 1e6, outputTokens: 0 })).toBe(10);
});

test("the ledger adds up and the budget stops further requests", () => {
  expect(spendFile()).not.toContain(".guided-analysis/spend.jsonl");
  const before = totalSpend();
  recordSpend("claude-opus-5-5", { inputTokens: 500_000, outputTokens: 0 });
  expect(totalSpend() - before).toBeCloseTo(2, 6);
  expect(readFileSync(spendFile(), "utf8")).toContain('"model":"claude-opus-5-5"');
  process.env.GA_BUDGET_USD = String(before + 5);
  expect(budgetProblem()).toBeUndefined();
  recordSpend("claude-opus-5-5", { inputTokens: 1_000_000, outputTokens: 0 });
  expect(budgetProblem()).toMatch(/budget of \$.* is used up/);
});
