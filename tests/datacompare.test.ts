import { expect, test } from "vitest";
import { compareChecks, matchSummary, summarizeTable } from "../src/core/datacompare.ts";
import type { Table } from "../src/core/datacheck.ts";

const table = (weight: (i: number) => number | string, group: (i: number) => string, extra: string[] = ["length"]): Table => ({
  columns: ["id", "group", "weight", ...extra],
  rows: Array.from({ length: 24 }, (_, i) => [`M${i}`, group(i), String(weight(i)), ...extra.map(() => String(10 + (i % 5)))]),
});
const kg = (i: number) => 20 + (i % 9);
const half = (i: number) => (i % 2 ? "Drug" : "Control");
const before = summarizeTable(table(kg, half), "old.csv");
const kinds = (a: typeof before, b: typeof before) => compareChecks(a, b).map((d) => d.kind);

test("a median that is 1000 times larger shows as a unit change with both medians", () => {
  const found = compareChecks(before, summarizeTable(table((i) => kg(i) * 1000, half), "new.csv"));
  expect(found.map((d) => d.kind)).toEqual(["unit"]);
  expect(found[0]!.text).toMatch(/^Column 'weight' has a median of 23,500\. Before, the median was 23.5\./);
  expect(found[0]!.text).toContain("The unit may be grams, not kilograms.");
});

test("a median that is 1000 times smaller names the other direction", () => {
  const big = summarizeTable(table((i) => kg(i) * 1000, half), "old.csv");
  const found = compareChecks(big, summarizeTable(table(kg, half), "new.csv"));
  expect(found[0]!.text).toContain("The unit may be kilograms, not grams.");
});

test("it finds a factor of 60 and a factor of 3600", () => {
  expect(kinds(before, summarizeTable(table((i) => kg(i) * 60, half), "n"))).toEqual(["unit"]);
  expect(kinds(before, summarizeTable(table((i) => kg(i) * 3600, half), "n"))).toEqual(["unit"]);
});

test("it finds a missing column", () => {
  const found = compareChecks(summarizeTable(table(kg, half, ["length", "height"]), "old.csv"), summarizeTable(table(kg, half), "new.csv"));
  expect(found).toMatchObject([{ kind: "missing_column", column: "height" }]);
});

test("it finds a new column", () => {
  expect(kinds(before, summarizeTable(table(kg, half, ["length", "height"]), "n"))).toEqual(["new_column"]);
});

test("a column at the same position with similar values is a rename", () => {
  const renamed = table(kg, half);
  renamed.columns[2] = "body mass";
  expect(compareChecks(before, summarizeTable(renamed, "n"))).toMatchObject([{ kind: "renamed", column: "body mass" }]);
});

test("it finds a new group and a missing group", () => {
  const three = summarizeTable(table(kg, (i) => ["Control", "Drug", "Vehicle"][i % 3]!), "n");
  expect(compareChecks(before, three)).toMatchObject([{ kind: "new_group", column: "group" }]);
  expect(compareChecks(three, before)).toMatchObject([{ kind: "missing_group", column: "group" }]);
});

test("it finds very different group sizes", () => {
  const skew = summarizeTable(table(kg, (i) => (i < 22 ? "Control" : "Drug")), "n");
  expect(kinds(before, skew)).toEqual(["group_sizes"]);
});

test("it finds a changed column order, a type change, a far range and more missing values", () => {
  const swapped: Table = { columns: ["group", "id", "weight", "length"], rows: table(kg, half).rows.map(([a, b, ...r]) => [b!, a!, ...r]) };
  expect(kinds(before, summarizeTable(swapped, "n"))).toEqual(["order"]);
  expect(kinds(before, summarizeTable(table((i) => (i % 2 ? "heavy" : "light"), half), "n"))).toEqual(["type"]);
  expect(kinds(before, summarizeTable(table((i) => (i < 18 ? kg(i) : 400), half), "n"))).toEqual(["range"]);
  const gaps = table(kg, half);
  gaps.rows.forEach((r, i) => i < 12 && (r[2] = ""));
  expect(kinds(before, summarizeTable(gaps, "n"))).toEqual(["missing_values"]);
});

test("the same data with the rows in another order has no difference", () => {
  const t = table(kg, half);
  const shuffled: Table = { columns: t.columns, rows: [...t.rows].reverse() };
  expect(compareChecks(summarizeTable(t, "a.csv"), summarizeTable(shuffled, "b.csv"))).toEqual([]);
});

test("a summary keeps names, order, type, unit, median, range, missing count and group sizes", () => {
  const s = summarizeTable({ columns: ["id", "group", "dose (mg)"], rows: [["a", "X", "1"], ["b", "Y", "3"], ["c", "X", ""], ["d", "Y", "5"]] }, "d.csv");
  expect(s.columns.map((c) => c.name)).toEqual(["id", "group", "dose (mg)"]);
  expect(s.columns[1]).toMatchObject({ type: "text", groups: [["X", 2], ["Y", 2]] });
  expect(s.columns[2]).toEqual({ name: "dose (mg)", type: "number", unit: "mg", median: 3, min: 1, max: 5, missing: 1 });
});

test("matchSummary picks the table with the same file name, then the table with the same columns", () => {
  const other = summarizeTable({ columns: ["x", "y"], rows: [["1", "2"], ["3", "4"]] }, "/p/other.csv");
  const mine = summarizeTable(table(kg, half), "/p/old.csv");
  expect(matchSummary([other, mine], summarizeTable(table(kg, half), "/q/old.csv"))).toBe(mine);
  expect(matchSummary([other, mine], summarizeTable(table(kg, half), "/q/new.csv"))).toBe(mine);
  expect(matchSummary([other], summarizeTable(table(kg, half), "/q/new.csv"))).toBeUndefined();
});

test("a number column with many rows does not overflow the stack", () => {
  const rows = Array.from({ length: 200000 }, (_, i) => [String(i)]);
  const s = summarizeTable({ columns: ["value"], rows }, "big.csv");
  expect(s.columns[0]).toMatchObject({ min: 0, max: 199999 });
});
