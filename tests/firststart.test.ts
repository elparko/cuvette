import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { antLogin, savedClaudeKey } from "../src/core/credentials.ts";
import { startCards } from "../src/ui/cards.ts";
import { needsFirstSetup } from "../src/server/app.ts";
import { CHOICES, chooseClaude, chooseLocal, copySample, firstStartState, needsFirstStart, ollamaState, SAMPLE_DIR, savedModel } from "../src/core/firststart.ts";
import { settingsPath } from "../src/core/settings.ts";

const oldHome = process.env.CUVETTE_HOME;
let cwd = "";
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-first-"));
  cwd = mkdtempSync(join(tmpdir(), "cuvette-first-proj-"));
});
afterEach(() => {
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
});

const KEY = "sk-ant-api03-abcdefghijklmnop-WXYZ";
const tags = (models: object[]) => (async () => new Response(JSON.stringify({ models }))) as unknown as typeof fetch;
const down = (async () => {
  throw new Error("ECONNREFUSED");
}) as unknown as typeof fetch;

test("the two choices use plain words", () => {
  expect(CHOICES.map((c) => c.label)).toEqual(["Use Claude (needs an API key)", "Use a local model (Ollama, free, runs on this computer)"]);
});

test("first start is needed with no key and no local model", async () => {
  expect(needsFirstStart({ cwd, env: {} })).toBe(true);
  expect(needsFirstStart({ cwd, env: { ANTHROPIC_API_KEY: "sk-ant-x" } })).toBe(false);
  const st = await firstStartState({ cwd, env: {}, fetch: tags([{ name: "qwen3:8b" }]) });
  expect(st).toEqual({ needed: true, hasKey: false, model: "claude", ollama: { reachable: true, models: ["qwen3:8b"], recommended: "qwen3:8b" } });
});

test("choose Claude: a bad key is not saved, a good key is saved with the model", async () => {
  expect(await chooseClaude("abc", { cwd, env: {} })).toMatchObject({ ok: false, text: expect.stringMatching(/starts with sk-ant-/) });
  const rejected = await chooseClaude(KEY, { cwd, env: {}, check: async () => ({ ok: false, text: "The API rejected this key (HTTP 401)." }) });
  expect(rejected.ok).toBe(false);
  expect(savedClaudeKey()).toBeUndefined();
  const r = await chooseClaude(` ${KEY} `, { cwd, env: {}, check: async () => ({ ok: true, text: "The key works." }) });
  expect(r.ok).toBe(true);
  expect(r.text).toContain("The model is Claude.");
  expect(savedClaudeKey()).toBe(KEY);
  expect(JSON.parse(readFileSync(settingsPath("user", cwd), "utf8")).model).toBe("claude");
  expect(needsFirstStart({ cwd, env: {} })).toBe(false);
});

test("choose a local model: the choice is saved, and the next start does not ask", async () => {
  const r = await chooseLocal(undefined, { cwd, env: {}, fetch: tags([{ name: "qwen3:8b" }]) });
  expect(r).toEqual({ ok: true, text: "Saved the model ollama:qwen3:8b.", model: "ollama:qwen3:8b" });
  expect(savedModel({ cwd, env: {} })).toBe("ollama:qwen3:8b");
  expect(needsFirstStart({ cwd, env: {} })).toBe(false);
});

test("choose a local model when Ollama is not running or lacks the model", async () => {
  const off = await chooseLocal("qwen3:8b", { cwd, env: {}, fetch: down });
  expect(off.ok).toBe(false);
  expect(off.text).toContain("brew install ollama");
  expect(off.text).toContain("ollama pull qwen3:8b");
  const lacks = await chooseLocal("ollama:gemma3:4b", { cwd, env: {}, fetch: tags([{ name: "qwen3:8b" }]) });
  expect(lacks).toMatchObject({ ok: false, model: "ollama:gemma3:4b" });
  expect(lacks.text).toContain("ollama pull gemma3:4b");
});

test("Ollama state lists models with tools and recommends qwen3:8b", async () => {
  const st = await ollamaState({ env: {}, fetch: tags([{ name: "medgemma:4b", capabilities: ["completion"] }, { name: "qwen3:14b", capabilities: ["completion", "tools"] }, { name: "qwen3:8b" }]) });
  expect(st).toEqual({ reachable: true, models: ["qwen3:14b", "qwen3:8b"], recommended: "qwen3:8b" });
  expect(await ollamaState({ env: {}, fetch: down })).toEqual({ reachable: false, models: [] });
});

test("the sample copies only the CSV, and the data are the Student 1908 values", () => {
  const dest = join(mkdtempSync(join(tmpdir(), "cuvette-sample-")), "Cuvette sample");
  const s = copySample(dest);
  expect(s.folder).toBe(dest);
  expect(readdirSync(dest)).toEqual(["sleep.csv"]);
  const rows = readFileSync(s.file, "utf8").trim().split("\n");
  expect(rows[0]).toBe("patient,drug,extra_sleep_hours");
  expect(rows).toHaveLength(21);
  const v = (drug: number) => rows.slice(1).map((r) => r.split(",")).filter((r) => Number(r[1]) === drug).map((r) => Number(r[2]));
  const mean = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
  expect(mean(v(1))).toBeCloseTo(0.75, 6);
  expect(mean(v(2))).toBeCloseTo(2.33, 6);
  expect(s.request).toContain("sleep.csv");
  expect(readFileSync(join(SAMPLE_DIR, "README.md"), "utf8")).toContain("public domain");
  expect(existsSync(join(dest, "README.md"))).toBe(false);
});

test("a login from ant auth login counts as a credential, so the first start is not needed", () => {
  const cfg = mkdtempSync(join(tmpdir(), "cuvette-ant-"));
  const env = { ANTHROPIC_CONFIG_DIR: cfg };
  expect(antLogin(env)).toBe(false);
  expect(needsFirstStart({ cwd, env })).toBe(true);
  mkdirSync(join(cfg, "credentials"), { recursive: true });
  writeFileSync(join(cfg, "credentials", "default.json"), "{}");
  expect(antLogin(env)).toBe(true);
  expect(needsFirstStart({ cwd, env })).toBe(false);
  expect(needsFirstSetup("claude", env)).toBe(false);
  expect(needsFirstSetup("claude", {})).toBe(true);
  expect(antLogin({ ...env, ANTHROPIC_PROFILE: "work" })).toBe(false);
  writeFileSync(join(cfg, "active_config"), "work\n");
  expect(antLogin(env)).toBe(false);
  writeFileSync(join(cfg, "credentials", "work.json"), "{}");
  expect(antLogin(env)).toBe(true);
  expect(antLogin({ ...env, ANTHROPIC_PROFILE: "../x" })).toBe(false);
  expect(needsFirstStart({ cwd, env: { ...env, ANTHROPIC_PROFILE: "other" } })).toBe(true);
});

test("choose Claude warns when ANTHROPIC_API_KEY is set, because that key wins", async () => {
  const check = async () => ({ ok: true, text: "The key works." });
  const shadowed = await chooseClaude(KEY, { cwd, env: { ANTHROPIC_API_KEY: "sk-ant-other" }, check });
  expect(shadowed.text).toContain("This shell also has ANTHROPIC_API_KEY. Cuvette uses that one first.");
  const plain = await chooseClaude(KEY, { cwd, env: {}, check });
  expect(plain.text).not.toContain("ANTHROPIC_API_KEY");
});

test("the key card does not show for a user of ant auth login", () => {
  const cfg = mkdtempSync(join(tmpdir(), "cuvette-ant-card-"));
  const session = { model: { provider: "claude" }, questions: { open: () => [] } } as never;
  expect(startCards(session, { ANTHROPIC_CONFIG_DIR: cfg }).map((c) => c.t)).toEqual(["key"]);
  mkdirSync(join(cfg, "credentials"), { recursive: true });
  writeFileSync(join(cfg, "credentials", "default.json"), "{}");
  expect(startCards(session, { ANTHROPIC_CONFIG_DIR: cfg })).toEqual([]);
});
