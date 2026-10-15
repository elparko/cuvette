import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PRICES, listCost, priceOf } from "../src/pricing.ts";

function appTable(): Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> {
  const source = readFileSync(new URL("../../src/core/spend.ts", import.meta.url), "utf8");
  const block = /const PRICES[^=]*=\s*\{([\s\S]*?)\n\};/.exec(source);
  if (!block) throw new Error("PRICES table not found in src/core/spend.ts");
  const out: Record<string, any> = {};
  for (const m of block[1]!.matchAll(/"([^"]+)":\s*\{\s*input:\s*([\d.]+),\s*output:\s*([\d.]+),\s*cacheRead:\s*([\d.]+),\s*cacheWrite:\s*([\d.]+)\s*\}/g)) {
    out[m[1]!] = { input: Number(m[2]), output: Number(m[3]), cacheRead: Number(m[4]), cacheWrite: Number(m[5]) };
  }
  return out;
}

describe("price table", () => {
  it("has the same models as src/core/spend.ts", () => {
    expect(Object.keys(PRICES).sort()).toEqual(Object.keys(appTable()).sort());
    expect(Object.keys(appTable()).length).toBeGreaterThan(0);
  });

  it("has the same list prices as src/core/spend.ts", () => {
    for (const [model, p] of Object.entries(appTable())) {
      const s = PRICES[model]!;
      expect(s.input, model).toBe(p.input);
      expect(s.output, model).toBe(p.output);
      expect(s.cacheRead, model).toBe(p.cacheRead);
      expect(s.cacheWrite5m, model).toBe(p.cacheWrite);
    }
  });

  it("prices one-hour cache writes at twice the input price", () => {
    for (const [model, p] of Object.entries(PRICES)) expect(p.cacheWrite1h, model).toBe(p.input * 2);
  });

  it("uses the most expensive price for a model that is not in the table", () => {
    expect(priceOf("claude-unknown")).toBeUndefined();
    expect(priceOf("constructor")).toBeUndefined();
    const t = { input: 1000, output: 1000, cacheRead: 1000, cacheWrite5m: 1000, cacheWrite1h: 1000 };
    const worst = Math.max(...Object.keys(PRICES).map((m) => listCost(PRICES[m], t)));
    expect(listCost(undefined, t)).toBe(worst);
  });

  it("adds the five token kinds at their own prices", () => {
    const cost = listCost(PRICES["claude-sonnet-5-5"], { input: 100, output: 200, cacheRead: 1000, cacheWrite5m: 400, cacheWrite1h: 300 });
    expect(cost).toBeCloseTo((100 * 2 + 200 * 10 + 1000 * 0.2 + 400 * 2.5 + 300 * 4) / 1e6, 12);
  });
});
