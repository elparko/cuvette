import { expect, test } from "vitest";
import { COST_FITS } from "../src/core/estimate-table.ts";
import { FREE_TEXT, estimateCost, estimateText, modelName } from "../src/core/estimate.ts";

test("the range grows with the number of steps and the low end stays below the high end", () => {
  for (const model of Object.keys(COST_FITS)) {
    const few = estimateCost(model, 2)!;
    const many = estimateCost(model, 10)!;
    expect(few.low).toBeLessThan(few.high);
    expect(many.low).toBeGreaterThan(few.low);
    expect(many.high).toBeGreaterThan(few.high);
  }
});

test("a model with a fit uses its own table, and a cheaper model costs less", () => {
  const opus = estimateCost("claude:claude-opus-5-5", 5)!;
  const haiku = estimateCost("claude-haiku-5-5", 5)!;
  expect(haiku.high).toBeLessThan(opus.low);
});

test("a model without a fit scales the Sonnet band by the token prices", () => {
  const sonnet = estimateCost("claude-sonnet-5-5", 6)!;
  const fable = estimateCost("claude-fable-5-1", 6)!;
  expect(fable.low / sonnet.low).toBeGreaterThan(3);
  expect(fable.low / sonnet.low).toBeCloseTo(fable.high / sonnet.high, 6);
  expect(estimateCost("gpt-x", 6)).toBeUndefined();
});

test("the text names the model and rounds the range outward to whole cents", () => {
  const text = estimateText("claude:claude-sonnet-5-5", 6, false);
  expect(text).toMatch(/^About \$\d+\.\d{2} to \$\d+\.\d{2} with Sonnet\.$/);
  const r = estimateCost("claude-sonnet-5-5", 6)!;
  const [low, high] = [...text.matchAll(/\$(\d+\.\d{2})/g)].map((m) => Number(m[1]));
  expect(low).toBeLessThanOrEqual(r.low);
  expect(high).toBeGreaterThanOrEqual(r.high);
  expect(modelName("claude:claude-haiku-5-5")).toBe("Haiku");
});

test("a local model is free", () => {
  expect(estimateText("qwen3:8b", 6, true)).toBe(FREE_TEXT);
  expect(FREE_TEXT).toBe("Free: runs on this computer.");
});

test("the text warns if the estimate is more than the money that is left", () => {
  expect(estimateText("claude-opus-5-5", 8, false, 0.05)).toMatch(/Your limit has \$0\.05 left this month\.$/);
  expect(estimateText("claude-opus-5-5", 8, false, 500)).not.toContain("left this month");
});

test("the unknown model gives no text", () => {
  expect(estimateText("gpt-x", 6, false)).toBe("");
});
