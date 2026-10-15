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

test("a minus sign binds less tightly than a power, and a number can start with a point", () => {
  expect(evaluate("-2^2")).toBe(-4);
  expect(evaluate("(-2)^2")).toBe(4);
  expect(evaluate("2^-1")).toBe(0.5);
  expect(evaluate("2*-3")).toBe(-6);
  expect(evaluate(".5*2")).toBe(1);
  expect(evaluate("2^3^2")).toBe(512);
});

test("a thousands separator in the arguments of a variadic function is an error, not two arguments", () => {
  expect(() => evaluate("sum(1,234)")).toThrow(/thousands separator/);
  expect(() => evaluate("mean(1,234,5)")).toThrow(/1,234/);
  expect(() => evaluate("abs(1,234)")).toThrow(/takes 1 argument.*thousands separator/);
  expect(evaluate("sum(1, 234)")).toBe(235);
  expect(evaluate("sum([1,2,3])")).toBe(6);
});

test("a comma with no space is an argument separator if the argument count fits", () => {
  expect(evaluate("ratio(412,450)")).toBeCloseTo(412 / 450, 10);
  expect(evaluate("mean([100,200,300])")).toBe(200);
  expect(evaluate("sum([100,200], 5)")).toBe(305);
  expect(evaluate("pct_change(100,150)")).toBe(50);
  expect(calculateTool().description).toContain("space after each comma");
});

test("a function with the wrong number of arguments is an error", () => {
  expect(() => evaluate("abs(1, 2)")).toThrow(/takes 1 argument/);
  expect(() => evaluate("ratio(4)")).toThrow(/takes 2 argument/);
  expect(() => evaluate("round(1, 2, 3)")).toThrow(/takes 1 to 2/);
  expect(() => evaluate("mean()")).toThrow(/takes 1 or more/);
});

test("round moves a half away from zero, as Excel does", () => {
  expect(evaluate("round(0.285, 2)")).toBe(0.29);
  expect(evaluate("round(-2.5)")).toBe(-3);
  expect(evaluate("round(2.5)")).toBe(3);
  expect(evaluate("round(1.005, 2)")).toBe(1.01);
  expect(evaluate("round(-0.285, 2)")).toBe(-0.29);
  expect(evaluate("round(1234.5, -2)")).toBe(1200);
  expect(evaluate("round(0.0000001234, 8)")).toBe(1.2e-7);
  expect(evaluate("round(0, 2)")).toBe(0);
  expect(calculateTool().description).toContain("away from zero");
});

test("round keeps an infinite value", () => {
  expect(evaluate("round(1/0, 2)")).toBe(Infinity);
  expect(evaluate("round(-1/0)")).toBe(-Infinity);
});
