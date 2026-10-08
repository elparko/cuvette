import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { claudeKey, credentialsPath, elabftwConfig, elabftwProblem, removeElabftw, saveElabftw, keyProblem, keyVersion, maskKey, removeClaudeKey, saveClaudeKey, savedClaudeKey } from "../src/core/credentials.ts";

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

test("the eLabFTW address and key are saved with mode 600 next to the Claude key", () => {
  expect(elabftwConfig()).toBeUndefined();
  saveClaudeKey(KEY);
  saveElabftw("https://elab.example.org", "3-abcdef");
  expect(elabftwConfig()).toEqual({ url: "https://elab.example.org", key: "3-abcdef" });
  expect(savedClaudeKey()).toBe(KEY);
  if (process.platform !== "win32") expect(statSync(credentialsPath()).mode & 0o777).toBe(0o600);
  expect(removeElabftw()).toBe(true);
  expect(elabftwConfig()).toBeUndefined();
  expect(savedClaudeKey()).toBe(KEY);
  expect(removeElabftw()).toBe(false);
});

test("address and key checks", () => {
  expect(elabftwProblem("https://elab.example.org", "3-abc")).toBeUndefined();
  expect(elabftwProblem("http://127.0.0.1:8080", "k")).toBeUndefined();
  expect(elabftwProblem("http://elab.example.org", "k")).toMatch(/https/);
  expect(elabftwProblem("not a url", "k")).toMatch(/not valid/);
  expect(elabftwProblem("https://elab.example.org", "")).toMatch(/empty/);
  expect(elabftwProblem("https://elab.example.org", "a b")).toMatch(/space/);
});
