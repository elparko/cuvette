import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { claudeKey, credentialsPath, elabftwConfig, elabftwProblem, hideKeys, removeElabftw, saveClaudeWorkspace, saveElabftw, keyProblem, keyVersion, maskKey, removeClaudeKey, saveClaudeKey, savedClaudeKey } from "../src/core/credentials.ts";

const old = process.env.CUVETTE_HOME;
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-cred-"));
});
afterEach(() => {
  if (old === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = old;
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

test("hideKeys removes pasted keys and the saved keys, and keeps normal text", () => {
  const ant = "sk-ant-api03-Zx9_abcdefghijklmnopqrstuvwxyz0123456789";
  const oai = "sk-proj-Ab3dEfGhIjKlMnOpQrStUvWxYz0123456789abcd";
  const elab = "4-" + "a1".repeat(42);
  const h = hideKeys(`my key is ${ant}, the old one ${oai}, eLab ${elab}`, {});
  expect(h.found).toBe(3);
  expect(h.text).toBe("my key is [API key removed], the old one [API key removed], eLab [API key removed]");
  saveElabftw("https://elab.example.org", "plainsavedsecret12345");
  expect(hideKeys("use plainsavedsecret12345 here", {}).text).toBe("use [API key removed] here");
  saveClaudeWorkspace("wrkspc_0123456789abcdef");
  expect(hideKeys("workspace wrkspc_0123456789abcdef", {}).found).toBe(0);
  expect(hideKeys("token OTHERENVSECRET-value-1234", { MY_TOKEN: "OTHERENVSECRET-value-1234" }).text).toBe("token [API key removed]");
  const plain = "Run sk-learn-pipeline-results-and-plots on task-1234 at https://elab.example.org with /Users/me/data.csv";
  expect(hideKeys(plain, { HOME_KEYS_DIR: "/Users/me/data.csv" })).toEqual({ text: plain, found: 0 });
});
