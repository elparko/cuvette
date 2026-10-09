import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { saveClaudeKey, saveElabftw } from "../src/core/credentials.ts";
import { changeSetting, describe, find, recordSetting, settingsPath, type SettingSession } from "../src/core/settings.ts";
import { budgetUsd } from "../src/core/spend.ts";
import { loadSettings, xlsxOn } from "../src/core/config.ts";

const KEY = "sk-ant-api03-secretsecretsecret-WXYZ";
const old = process.env.GA_HOME;
let cwd = "";

beforeEach(() => {
  process.env.GA_HOME = mkdtempSync(join(tmpdir(), "ga-home-"));
  cwd = mkdtempSync(join(tmpdir(), "ga-proj-"));
});
afterEach(() => {
  if (old === undefined) delete process.env.GA_HOME;
  else process.env.GA_HOME = old;
});

function writeJson(path: string, data: object) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(data));
}

function fakeSession(over: Partial<SettingSession> = {}) {
  const events: { kind: string; data: Record<string, unknown> }[] = [];
  const s = {
    mode: "watch",
    busy: false,
    settings: { model: "claude", referee: "same", effort: "high" } as Record<string, unknown>,
    adapterInfo: [{ name: "imagej", version: "0.3.0" }],
    record: { append: (kind: string, data: Record<string, unknown>) => events.push({ kind, data }) },
    setMode(m: string) {
      s.mode = m;
    },
    ...over,
  };
  return { s: s as unknown as SettingSession & { mode: string; settings: Record<string, unknown> }, events };
}

const row = (rows: ReturnType<typeof describe>, name: string) => rows.find((r) => r.def.name === name)!;

test("the merged settings show each value and its source", () => {
  writeJson(settingsPath("user", cwd), { model: "claude:claude-haiku-5-5", permissions: { "run_script": "deny" } });
  writeJson(settingsPath("project", cwd), { referee: "none", permissions: { "imagej_*": "allow" } });
  writeJson(join(cwd, ".ga", "settings.local.json"), { mode: "plan" });
  const rows = describe({ cwd, env: {} });
  expect(row(rows, "model")).toMatchObject({ value: "claude:claude-haiku-5-5", source: "user" });
  expect(row(rows, "referee")).toMatchObject({ value: "none", source: "project" });
  expect(row(rows, "mode")).toMatchObject({ value: "plan", source: "project" });
  expect(row(rows, "effort")).toMatchObject({ value: "high", source: "default" });
  expect(row(rows, "output_folder")).toMatchObject({ value: "cuvette", source: "default" });
  expect(row(rows, "permissions").value).toBe("1 allow, 1 deny");
  expect(find("permissions")!.details!({ cwd }).join("\n")).toContain("deny  run_script  (user settings)");
  expect(rows.some((r) => r.def.name === "adapters")).toBe(false);
});

test("a session value that differs from the files shows as this session only", () => {
  const { s } = fakeSession();
  s.settings.model = "claude:claude-sonnet-5-5";
  s.mode = "teach";
  s.busy = true;
  const rows = describe({ cwd, env: {}, session: s });
  expect(row(rows, "model")).toMatchObject({ value: "claude:claude-sonnet-5-5", source: "session", locked: true });
  expect(row(rows, "mode")).toMatchObject({ value: "teach", source: "session", locked: false });
  expect(row(rows, "referee").source).toBe("default");
  expect(row(rows, "adapters").value).toBe("imagej 0.3.0");
});

test("export_xlsx and figure_formats are in the registry, on and png,svg by default", async () => {
  const rows = describe({ cwd, env: {} });
  expect(row(rows, "export_xlsx")).toMatchObject({ value: "on", source: "default" });
  expect(row(rows, "figure_formats")).toMatchObject({ value: "png,svg", source: "default" });
  expect(row(rows, "export_xlsx").def.group).toBe("Outputs");
  await changeSetting({ cwd, env: {} }, "export_xlsx", "off", "project");
  await changeSetting({ cwd, env: {} }, "figure_formats", "png,pdf", "project");
  await expect(changeSetting({ cwd, env: {} }, "export_xlsx", "maybe", "project")).rejects.toThrow(/on, off/);
  const s = loadSettings(cwd);
  expect(xlsxOn(s)).toBe(false);
  expect(s.figure_formats).toBe("png,pdf");
  expect(xlsxOn(loadSettings(mkdtempSync(join(tmpdir(), "ga-proj-"))))).toBe(true);
});

test("effort shows only for a Claude model", () => {
  writeJson(settingsPath("project", cwd), { model: "ollama:qwen3:8b" });
  expect(describe({ cwd, env: {} }).some((r) => r.def.name === "effort")).toBe(false);
});

test("save to this session, user settings and project settings", async () => {
  const { s, events } = fakeSession();
  const ctx = { cwd, env: {}, session: s };

  await changeSetting(ctx, "mode", "follow", "session");
  expect(s.mode).toBe("follow");
  expect(row(describe(ctx), "mode").source).toBe("session");

  const r = await changeSetting(ctx, "effort", "low", "user");
  expect(r).toMatchObject({ old: "high", value: "low" });
  expect(JSON.parse(readFileSync(settingsPath("user", cwd), "utf8"))).toEqual({ effort: "low" });
  expect(s.settings.effort).toBe("low");
  expect(row(describe(ctx), "effort")).toMatchObject({ value: "low", source: "user" });

  await changeSetting(ctx, "referee", "none", "project");
  expect(JSON.parse(readFileSync(settingsPath("project", cwd), "utf8"))).toEqual({ referee: "none" });
  expect(row(describe(ctx), "referee").source).toBe("project");

  const shadow = await changeSetting(ctx, "referee", "same", "user");
  expect(shadow.note).toMatch(/project setting \(none\) still wins/);

  expect(events.map((e) => e.data)).toEqual([
    { name: "mode", old: "watch", new: "follow", scope: "session" },
    { name: "effort", old: "high", new: "low", scope: "user" },
    { name: "referee", old: "same", new: "none", scope: "project" },
    { name: "referee", old: "none", new: "same", scope: "user" },
  ]);
  expect(events.every((e) => e.kind === "setting")).toBe(true);
});

test("bad values, read-only rows, scopes and locked rows are refused", async () => {
  const { s, events } = fakeSession();
  const ctx = { cwd, env: {}, session: s };
  await expect(changeSetting(ctx, "mode", "fast", "session")).rejects.toThrow(/one of: watch, follow, teach, plan/);
  await expect(changeSetting(ctx, "nope", "x", "user")).rejects.toThrow(/No setting named nope/);
  await expect(changeSetting(ctx, "output_folder", " ", "user")).rejects.toThrow(/must be a folder/);
  await expect(changeSetting(ctx, "output_folder", "out", "session")).rejects.toThrow(/only in: user settings, project settings/);
  await expect(changeSetting(ctx, "budgetUsd", "50", "project")).rejects.toThrow(/only in: user settings/);
  s.busy = true;
  await expect(changeSetting(ctx, "model", "claude:claude-haiku-5-5", "session")).rejects.toThrow(/locked until the turn ends/);
  await changeSetting(ctx, "mode", "plan", "session");
  expect(events).toHaveLength(1);
});

test("the budget setting is read by the spend check, and GA_BUDGET_USD wins", async () => {
  await changeSetting({ cwd, env: {} }, "budgetUsd", "150", "user");
  expect(budgetUsd({})).toBe(150);
  expect(row(describe({ cwd, env: {} }), "budgetUsd")).toMatchObject({ value: "$150.00", source: "user" });
  expect(row(describe({ cwd, env: { GA_BUDGET_USD: "200" } }), "budgetUsd")).toMatchObject({ value: "$200.00", source: "env" });
  const r = await changeSetting({ cwd, env: { GA_BUDGET_USD: "200" } }, "budgetUsd", "100", "user");
  expect(r.note).toMatch(/GA_BUDGET_USD in this shell still wins/);
  await changeSetting({ cwd, env: {} }, "budgetUsd", "off", "user");
  expect(budgetUsd({})).toBeUndefined();
  await expect(changeSetting({ cwd, env: {} }, "budgetUsd", "-3", "user")).rejects.toThrow(/above 0/);
});

test("secrets never show and the record keeps only that they changed", async () => {
  saveClaudeKey(KEY);
  saveElabftw("https://elab.example.org", "elab-secret-key-1234567");
  const { s, events } = fakeSession();
  const rows = describe({ cwd, env: {}, session: s });
  expect(row(rows, "claude_key")).toMatchObject({ value: "saved", source: "user" });
  expect(row(rows, "elabftw_key").value).toBe("saved");
  expect(row(describe({ cwd, env: { ANTHROPIC_API_KEY: KEY } }), "claude_key")).toMatchObject({ value: "set by environment", source: "env" });
  const all = JSON.stringify(rows.map((r) => r.value));
  expect(all).not.toContain("secret");
  expect(all).not.toContain("WXYZ");

  recordSetting(s, find("claude_key")!, KEY, "sk-ant-new", "user");
  expect(events).toEqual([{ kind: "setting", data: { name: "claude_key", scope: "user", change: "changed" } }]);
  await expect(changeSetting({ cwd, session: s }, "claude_key", KEY, "user")).rejects.toThrow(/cannot change here/);
});

test("permission mode reads the bypass shorthand and a save keeps the rules", async () => {
  writeJson(settingsPath("project", cwd), { permissions: "bypass" });
  writeJson(settingsPath("user", cwd), { permissions: { "run_script": "deny" } });
  const { s, events } = fakeSession({ permissionMode: "bypass", setPermissionMode: (m: string) => void (s.permissionMode = m) } as never);
  const ctx = { cwd, env: {}, session: s };
  expect(row(describe(ctx), "permissionMode")).toMatchObject({ value: "bypass", source: "project" });
  expect(row(describe(ctx), "permissions").value).toBe("0 allow, 1 deny");
  await changeSetting(ctx, "permissionMode", "ask", "project");
  expect(s.permissionMode).toBe("ask");
  expect(JSON.parse(readFileSync(settingsPath("project", cwd), "utf8"))).toEqual({ permissionMode: "ask" });
  expect(row(describe(ctx), "permissionMode")).toMatchObject({ value: "ask", source: "project" });
  expect(events.map((e) => e.data)).toEqual([{ name: "permissionMode", old: "bypass", new: "ask", scope: "project" }]);
});

test("show details is a session-only switch for the terminal view", async () => {
  let on = false;
  const ui = { details: () => on, toggleDetails: () => void (on = !on) };
  const { s, events } = fakeSession();
  const ctx = { cwd, env: {}, session: s, ui };
  expect(row(describe(ctx), "details")).toMatchObject({ value: "off", source: "default" });
  expect(describe({ cwd }).some((r) => r.def.name === "details")).toBe(false);
  await changeSetting(ctx, "details", "on", "session");
  expect(on).toBe(true);
  expect(row(describe(ctx), "details")).toMatchObject({ value: "on", source: "session" });
  await expect(changeSetting(ctx, "details", "off", "user")).rejects.toThrow(/only in: this session only/);
  expect(events.map((e) => e.data)).toEqual([{ name: "details", old: "off", new: "on", scope: "session" }]);
});

test("the adapters for every session are a list, and none clears the list", async () => {
  expect(row(describe({ cwd, env: {} }), "defaultAdapters")).toMatchObject({ value: "tables", source: "default" });
  await changeSetting({ cwd, env: {} }, "defaultAdapters", "tables, biostats", "project");
  expect(JSON.parse(readFileSync(settingsPath("project", cwd), "utf8"))).toEqual({ defaultAdapters: ["tables", "biostats"] });
  expect(row(describe({ cwd, env: {} }), "defaultAdapters")).toMatchObject({ value: "tables, biostats", source: "project" });
  await changeSetting({ cwd, env: {} }, "defaultAdapters", "none", "user");
  expect(JSON.parse(readFileSync(settingsPath("user", cwd), "utf8"))).toEqual({ defaultAdapters: [] });
});
