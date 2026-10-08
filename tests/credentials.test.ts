import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { claudeKey, credentialsPath, keyProblem, keyVersion, maskKey, removeClaudeKey, saveClaudeKey, savedClaudeKey } from "../src/core/credentials.ts";

const old = process.env.GA_HOME;
beforeEach(() => {
  process.env.GA_HOME = mkdtempSync(join(tmpdir(), "ga-cred-"));
});
afterEach(() => {
  if (old === undefined) delete process.env.GA_HOME;
  else process.env.GA_HOME = old;
});

const KEY = "sk-ant-api03-abcdefghijklmnop-WXYZ";

test("save, read and remove the key", () => {
  expect(claudeKey({})).toEqual({ from: "none" });
  const v = keyVersion();
  expect(saveClaudeKey(KEY)).toBe(credentialsPath());
  expect(keyVersion()).toBe(v + 1);
  expect(savedClaudeKey()).toBe(KEY);
  expect(claudeKey({})).toEqual({ key: KEY, from: "file" });
  if (process.platform !== "win32") expect(statSync(credentialsPath()).mode & 0o777).toBe(0o600);
  expect(removeClaudeKey()).toBe(true);
  expect(claudeKey({})).toEqual({ from: "none" });
  expect(removeClaudeKey()).toBe(false);
});

test("the shell variable wins over the saved key", () => {
  saveClaudeKey(KEY);
  expect(claudeKey({ ANTHROPIC_API_KEY: "sk-ant-env" })).toEqual({ key: "sk-ant-env", from: "env" });
});

test("mask and format checks", () => {
  expect(maskKey(KEY)).toBe("sk-ant-…WXYZ");
  expect(maskKey("short")).toBe("…");
  expect(keyProblem("")).toMatch(/empty/);
  expect(keyProblem("abc")).toMatch(/sk-ant-/);
  expect(keyProblem("sk-ant- x")).toMatch(/space/);
  expect(keyProblem(KEY)).toBeUndefined();
});
