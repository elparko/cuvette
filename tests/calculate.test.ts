import { expect, test } from "vitest";
import { calculateTool, evaluate } from "../src/tools/calculate.ts";

test("evaluates arithmetic, lists and functions", () => {
  expect(evaluate("4696 / 5007")).toBeCloseTo(0.93789, 5);
  expect(evaluate("2 + 3 * 4 ^ 2")).toBe(50);
  expect(evaluate("-(2 - 5) * 2")).toBe(6);
  expect(evaluate("ratio(4696, 5007)")).toBeCloseTo(0.93789, 5);
  expect(evaluate("pct_change(46, 50)")).toBeCloseTo(8.6957, 4);
  expect(evaluate("mean([1, 2, 3, 4])")).toBe(2.5);
  expect(evaluate("median(5, 1, 3)")).toBe(3);
  expect(evaluate("sd([2, 4, 4, 4, 5, 5, 7, 9])")).toBeCloseTo(2.13809, 5);
  expect(evaluate("mae([48, 10, 7], [50, 10, 10])")).toBeCloseTo(5 / 3, 10);
  expect(evaluate("r2([1, 2, 3, 4], [2, 4, 6, 8])")).toBeCloseTo(1, 10);
  expect(evaluate("round(2.345, 2)")).toBe(2.35);
  expect(evaluate("1.5e3 + 1")).toBe(1501);
});

test("rejects unsafe or broken input", () => {
  expect(() => evaluate("process.exit(1)")).toThrow();
  expect(() => evaluate("foo(1)")).toThrow(/unknown function foo/);
  expect(() => evaluate("mae([1,2],[1])")).toThrow(/same length/);
  expect(() => evaluate("r2([4706], [5007])")).toThrow(/at least two pairs/);
  expect(() => evaluate("r2([1,1,1], [1,2,3])")).toThrow(/all numbers in one list are equal/);
  expect(() => evaluate("2 +")).toThrow();
  expect(() => evaluate("mean([1,2]) ; 3")).toThrow();
});

test("the tool returns named metrics and reports bad items", async () => {
  const t = calculateTool();
  const r = await t.execute({ items: [{ name: "ratio", expression: "4696/5007" }, { name: "bad", expression: "nope(1)" }] }, {} as never);
  expect(r.ok).toBe(true);
  expect(r.metrics!.ratio).toBeCloseTo(0.93789, 5);
  expect(r.text).toMatch(/error: bad: unknown function nope/);
  expect((await t.execute({ items: [] }, {} as never)).ok).toBe(false);
});
