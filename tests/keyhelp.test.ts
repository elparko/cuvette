import { expect, test } from "vitest";
import { BILLING_URL, KEY_GUIDE, KEYS_URL, LIMITS_URL, keyApiProblem, keyFormatProblem, keyGuideText } from "../src/core/keyhelp.ts";

const KEY = "sk-ant-api03-abcdefghijklmnop-WXYZ";

test("a good key has no problem", () => {
  expect(keyFormatProblem(KEY)).toBeUndefined();
  expect(keyFormatProblem(`  ${KEY}\n`)).toBeUndefined();
});

test("each bad key gets a specific next step", () => {
  expect(keyFormatProblem("")).toMatch(/empty.*Copy the key from/);
  expect(keyFormatProblem(`"${KEY}"`)).toMatch(/quote marks/);
  expect(keyFormatProblem(`'${KEY}'`)).toMatch(/quote marks/);
  expect(keyFormatProblem("sk-ant- abc")).toMatch(/space or a line break/);
  expect(keyFormatProblem("sk-ant-abc\ndef")).toMatch(/space or a line break/);
  expect(keyFormatProblem("sk-proj-abc123")).toMatch(/OpenAI key/);
  expect(keyFormatProblem("sk-abc123")).toMatch(/OpenAI key/);
  expect(keyFormatProblem("abc123")).toMatch(/starts with sk-ant-/);
  for (const bad of ["", "sk-proj-x", "abc"]) expect(keyFormatProblem(bad)).toContain(KEYS_URL);
});

test("each API failure maps to a next step", () => {
  expect(keyApiProblem(401)).toMatch(/HTTP 401.*create a new key at https:\/\/platform\.claude\.com\/settings\/keys/);
  expect(keyApiProblem(403)).toContain(BILLING_URL);
  expect(keyApiProblem(403)).toMatch(/HTTP 403/);
  expect(keyApiProblem(400, "Your credit balance is too low to access the Anthropic API.")).toMatch(/Add credit at .*billing/);
  expect(keyApiProblem(429)).toContain(LIMITS_URL);
  expect(keyApiProblem(undefined)).toMatch(/internet connection/);
  expect(keyApiProblem(500)).toMatch(/HTTP 500.*Try again/);
});

test("the guide covers the whole path", () => {
  const text = keyGuideText();
  expect(KEY_GUIDE.steps).toHaveLength(6);
  for (const part of ["platform.claude.com", BILLING_URL, KEYS_URL, LIMITS_URL, "Pro or Max", "sk-ant-", "secret", "monthly", "Ollama", "one time"]) expect(text).toContain(part);
  expect(text).toMatch(/1\. .*\n.*2\. /);
});

test("guide sentences stay short", () => {
  const all = [KEY_GUIDE.intro, ...KEY_GUIDE.steps, ...KEY_GUIDE.notes];
  for (const sentence of all.flatMap((t) => t.split(/(?<=\.)\s+/))) expect(sentence.replace(/https?:\/\/\S+/g, "URL").split(/\s+/).length).toBeLessThanOrEqual(25);
});
