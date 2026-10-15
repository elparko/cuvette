import { existsSync, linkSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { commands } from "../src/ui/commands.ts";
import { claudeKey, credentialsPath, isCredentialsFile, elabftwConfig, elabftwProblem, hideKeys, removeElabftw, saveClaudeWorkspace, saveElabftw, keyProblem, keyVersion, maskKey, removeClaudeKey, saveClaudeKey, savedClaudeKey } from "../src/core/credentials.ts";

const old = process.env.CUVETTE_HOME;
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-cred-"));
});
afterEach(() => {
  if (old === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = old;
});

const KEY = "sk-ant-api03-abcdefghijklmnop-WXYZ";

test("a damaged credentials file gives no key, and a new key replaces it", () => {
  for (const body of ["", "null", "[1]", '{"anthropic_api_key": 5}']) {
    mkdirSync(process.env.CUVETTE_HOME!, { recursive: true });
    writeFileSync(credentialsPath(), body);
    expect(claudeKey({})).toEqual({ from: "none" });
  }
  saveClaudeKey(KEY);
  expect(savedClaudeKey()).toBe(KEY);
});

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

test("the key file is found by its identity: a hard link and a name in other capitals are the same file", () => {
  saveClaudeKey(KEY);
  const project = mkdtempSync(join(tmpdir(), "cuvette-cred-proj-"));
  expect(isCredentialsFile(credentialsPath())).toBe(true);
  expect(isCredentialsFile(join(project, "other.txt"))).toBe(false);
  expect(isCredentialsFile(join(process.env.CUVETTE_HOME!, "missing.json"))).toBe(false);
  const upper = join(process.env.CUVETTE_HOME!, "CREDENTIALS.JSON");
  if (existsSync(upper)) expect(isCredentialsFile(upper)).toBe(true);
  if (process.platform === "win32") return;
  linkSync(credentialsPath(), join(project, "notes.txt"));
  expect(isCredentialsFile(join(project, "notes.txt"))).toBe(true);
});

test("a key file that is replaced by a new file inside the cache time is still found by its path", () => {
  saveClaudeKey(KEY);
  expect(isCredentialsFile(credentialsPath())).toBe(true);
  saveClaudeKey(`${KEY}-second`);
  rmSync(credentialsPath());
  writeFileSync(credentialsPath(), JSON.stringify({ anthropic_api_key: KEY }));
  expect(isCredentialsFile(credentialsPath())).toBe(true);
});

function antConfig(): string {
  const cfg = mkdtempSync(join(tmpdir(), "cuvette-ant-"));
  mkdirSync(join(cfg, "configs"), { recursive: true });
  writeFileSync(join(cfg, "configs", "default.json"), "{}");
  return cfg;
}

test("/key status says that an ant auth login is signed in, not that there is no key", async () => {
  const cfg = antConfig();
  const saved = { key: process.env.ANTHROPIC_API_KEY, dir: process.env.ANTHROPIC_CONFIG_DIR };
  process.env.ANTHROPIC_API_KEY = "";
  const notices: string[] = [];
  const run = () => commands.find((c) => c.name === "key")!.run(["status"], { notice: (m: string) => notices.push(m) } as never);
  try {
    process.env.ANTHROPIC_CONFIG_DIR = join(cfg, "none");
    await run();
    process.env.ANTHROPIC_CONFIG_DIR = cfg;
    await run();
  } finally {
    for (const [name, v] of [["ANTHROPIC_API_KEY", saved.key], ["ANTHROPIC_CONFIG_DIR", saved.dir]] as const) {
      if (v === undefined) delete process.env[name];
      else process.env[name] = v;
    }
    rmSync(cfg, { recursive: true, force: true });
  }
  expect(notices[0]).toMatch(/^There is no Claude API key/);
  expect(notices[1]).toBe("You signed in with ant auth login.");
});

test("cuvette key status says that an ant auth login is signed in", () => {
  const cfg = antConfig();
  try {
    const r = spawnSync("node", [join(__dirname, "..", "bin/cuvette.js"), "key", "status"], { env: { ...process.env, CUVETTE_HOME: process.env.CUVETTE_HOME, ANTHROPIC_API_KEY: "", ANTHROPIC_CONFIG_DIR: cfg }, encoding: "utf8", timeout: 60_000 });
    expect(r.stdout.trim()).toBe("You signed in with ant auth login.");
  } finally {
    rmSync(cfg, { recursive: true, force: true });
  }
}, 60_000);
