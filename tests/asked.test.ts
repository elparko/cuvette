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
