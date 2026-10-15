import { expect, test } from "vitest";
import { namesValue } from "../src/core/asked.ts";

const alpha = { key: "alpha", label: "Alpha" };
const perms = { key: "permutations", label: "Permutations" };
const power = { key: "power", label: "Power" };

test("a thousands separator with exactly three digits gives one number", () => {
  expect(namesValue("Use 1,000 permutations", perms, 1000)).toBe(true);
  expect(namesValue("Use 1,000 permutations", perms, 1)).toBe(false);
  expect(namesValue("Use 1 000 permutations", perms, 1000)).toBe(true);
  expect(namesValue("Use 12,345,678 permutations", perms, 12345678)).toBe(true);
  expect(namesValue("permutations: 2,500.5", perms, 2500.5)).toBe(true);
});

test("a decimal comma and a decimal point still give a decimal number", () => {
  expect(namesValue("alpha 0,05", alpha, 0.05)).toBe(true);
  expect(namesValue("alpha 1,5", alpha, 1.5)).toBe(true);
  expect(namesValue("alpha 0,050", alpha, 0.05)).toBe(true);
  expect(namesValue("alpha 1,5000", alpha, 1.5)).toBe(true);
  expect(namesValue("alpha 0.05 100 times", alpha, 0.05)).toBe(true);
});

test("a number after not, no, instead of or rather than is not the asked value", () => {
  expect(namesValue("Use alpha at 0.05, not 0.1", alpha, 0.05)).toBe(true);
  expect(namesValue("Use alpha at 0.05, not 0.1", alpha, 0.1)).toBe(false);
  expect(namesValue("Use alpha 0.05 instead of 0.1", alpha, 0.1)).toBe(false);
  expect(namesValue("Use alpha 0.05 rather than 0.1", alpha, 0.1)).toBe(false);
  expect(namesValue("Use alpha 0.05 and no 0.1", alpha, 0.1)).toBe(false);
  expect(namesValue("Do not use alpha 0.1", alpha, 0.1)).toBe(false);
  expect(namesValue("Don't use 0.1 as alpha", alpha, 0.1)).toBe(false);
  expect(namesValue("Use alpha 0.1", alpha, 0.1)).toBe(true);
});

test("a number far after a negation is still read", () => {
  expect(namesValue("It is not clear yet, so for the next run set the alpha to 0.1", alpha, 0.1)).toBe(true);
});

test("the number of the next setting is not the value of this setting", () => {
  expect(namesValue("Set alpha, power 0.8", alpha, 0.8)).toBe(false);
  expect(namesValue("Set alpha to 0.05 and power to 0.8", alpha, 0.8)).toBe(false);
  expect(namesValue("Set alpha to 0.05 and power to 0.8", power, 0.8)).toBe(true);
  expect(namesValue("Set alpha to 0.05 and power 0.8", power, 0.05)).toBe(false);
  expect(namesValue("Use alpha of about 0.05", alpha, 0.05)).toBe(true);
  expect(namesValue("Use 20 as alpha", alpha, 20)).toBe(true);
});

test("a long run of punctuation does not take quadratic time", () => {
  const request = `alpha 0.05 ${")".repeat(100_000)}x`;
  const start = Date.now();
  expect(namesValue(request, alpha, 0.05)).toBe(true);
  expect(Date.now() - start).toBeLessThan(3000);
});

test("a negation in the same clause before the number makes the number not asked", () => {
  expect(namesValue("Don't set alpha to 0.1", alpha, 0.1)).toBe(false);
  expect(namesValue("Do not use an alpha of 0.1", alpha, 0.1)).toBe(false);
  expect(namesValue("Never set the alpha to 0.1", alpha, 0.1)).toBe(false);
  expect(namesValue("Run it without alpha 0.1", alpha, 0.1)).toBe(false);
  expect(namesValue("Any alpha except 0.1", alpha, 0.1)).toBe(false);
  expect(namesValue("Any alpha other than 0.1", alpha, 0.1)).toBe(false);
  expect(namesValue("Use no more than 5 permutations", perms, 5)).toBe(false);
});

test("a clause after a comma with its own positive value still applies", () => {
  expect(namesValue("Set alpha to 0.05, not 0.1", alpha, 0.05)).toBe(true);
  expect(namesValue("Set alpha to 0.05, not 0.1", alpha, 0.1)).toBe(false);
  expect(namesValue("Do not use alpha 0.1 in the second test, use 0.05", alpha, 0.05)).toBe(true);
  expect(namesValue("Do not use alpha 0.1 in the second test, use 0.05", alpha, 0.1)).toBe(false);
  expect(namesValue("Do not touch the plots.\nSet alpha to 0.1", alpha, 0.1)).toBe(true);
});

test("a number in brackets before a full stop is read", () => {
  expect(namesValue("Use the standard level (alpha 0.05).", alpha, 0.05)).toBe(true);
  expect(namesValue("(alpha 0.05).", alpha, 0.05)).toBe(true);
});

test("a negation reaches only five tokens back and not over a clause boundary", () => {
  const window = { key: "window", label: "Window" };
  expect(namesValue("I don't have replicates so use window 5", window, 5)).toBe(true);
  expect(namesValue("I don't have replicates, use window 5", window, 5)).toBe(true);
  expect(namesValue("I don't have replicates because window 5 is the default", window, 5)).toBe(true);
  expect(namesValue("Do not worry about the old runs window 5", window, 5)).toBe(true);
});

test("a value for another target in a later clause is not the value of the setting", () => {
  const window = { key: "window", label: "Window" };
  expect(namesValue("don't set window to 5, I want 7 for the threshold", window, 7)).toBe(false);
  expect(namesValue("don't set window to 5, I want 7 for the threshold", window, 5)).toBe(false);
  expect(namesValue("Set window, then use 7 for the threshold", window, 7)).toBe(false);
  expect(namesValue("Do not use window 5, use 7", window, 7)).toBe(true);
});

const cells = { key: "min_cells", label: "Min cells" };
const minimum = { key: "min_cells", label: "Minimum cells" };
const oldWindow = { key: "window", label: "Window" };
const threads = { key: "threads", label: "Threads" };
const tree = { key: "tree_depth", label: "Tree depth" };

test("a negation earlier in the same sentence makes a card", () => {
  const card = (text: string, field: typeof cells, value: number, others = [threads]) => expect(namesValue(text, field, value, others), `${text} (${value})`).toBe(false);
  card("Do not change the old runs window to 5", oldWindow, 5);
  card("Do not bother to set the old runs window to 5", oldWindow, 5);
  card("Do not set the old runs window to 5", oldWindow, 5);
  card("I do not want to set the minimum cells to 5", minimum, 5);
  card("Do not rerun to change the min cells to 5; use 10 threads", cells, 5);
  card("Do not rerun to change the min cells to 5; use 10 threads", cells, 10);
  card("Do not set min cells to 5, set the others to 10.", cells, 10);
  card("Do not set min cells to 5, set everything else to 10.", cells, 10);
  card("use 10 threads min cells as before", cells, 10);
  card("Do not set min cells to 5, run 10 in parallel.", cells, 10);
  card("Do not set min cells to 5, use 10 as the threads value.", cells, 10);
  card("Do not set min cells to 5, use 10 of the 16 cores.", cells, 10);
  card("Do not set min cells to 5, use 10 or more threads.", cells, 10);
  card("Do not set min cells to 5, use 10 on the threads.", cells, 10);
  card("Do not set min cells to 5, use 10 threads", cells, 10);
  card("Do not set min cells to 5, use 10 please", cells, 10);
  card("Do not set min cells to 5. Use 10 for the threads", cells, 10);
  card("No need to rerun to set min cells to 5, use 10", cells, 10);
  card("No need to rerun to set min cells to 5, use 10", cells, 5);
  card("Do not set min cells to 5 and threads to 10", cells, 5);
  card("Do not set min cells to 5 and threads to 10", threads as typeof cells, 10, [cells]);
  card("Set min cells to 5 instead of 10", cells, 10);
  card("min cells: 5, not 10", cells, 10);
  card("min cells: 5 (not 10)", cells, 10);
  card("Don't, under any circumstances, set alpha to 0.1", alpha, 0.1, []);
});

test("a retry in its own clause for the same setting applies, and a statement of doubt does not block", () => {
  const apply = (text: string, field: typeof cells, value: number, others = [threads]) => expect(namesValue(text, field, value, others), `${text} (${value})`).toBe(true);
  apply("Do not worry about the old runs window 5", oldWindow, 5, []);
  apply("Use alpha 0.05 instead of 0.1", alpha, 0.05, []);
  apply("Set minimum cells to 5 for 10 samples", minimum, 5);
  apply("Set Minimum cells to 42 and Tree depth to 521", minimum, 42, [tree]);
  apply("Set Minimum cells to 42 and Tree depth to 521", tree as typeof cells, 521, [minimum]);
  apply("Set min cells to 5.", cells, 5);
  apply("Do not set min cells to 5, use 10", cells, 10);
  apply("Do not set min cells to 5, use 10.", cells, 10);
  apply("Do not set min cells to 5, set to 10.", cells, 10);
  apply("Do not set min cells to 5, use 10 min cells", cells, 10);
  apply("Do not set min cells to 1,000, use 500", cells, 500);
  apply("I don't have replicates so use window 5", oldWindow, 5, []);
});
