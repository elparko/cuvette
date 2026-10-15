import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { saveClaudeKey } from "../src/core/credentials.ts";
import { describe, settingsPath } from "../src/core/settings.ts";
import { RESET } from "../src/ui/config.ts";
import { runTui } from "../src/tui/app.tsx";
import { FakeSession } from "../src/ui/fake-session.ts";
import { makeHarness, sleep, until, type Harness } from "../src/tui/testing.ts";

const KEY = "sk-ant-api03-panelsecretpanel-QRST";
const DOWN = "\x1b[B";
const old = process.env.CUVETTE_HOME;
let live: { h: Harness; done: Promise<void> } | undefined;

beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-home-"));
});
afterEach(async () => {
  if (live) {
    live.h.type("\x03");
    await sleep(20);
    live.h.type("\x03");
    await Promise.race([live.done, sleep(500)]);
    live = undefined;
  }
  if (old === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = old;
});

async function key(h: Harness, k: string) {
  h.type(k);
  await sleep(60);
}

async function open(rows = 80) {
  const h = makeHarness(120, rows);
  const s = new FakeSession({ delayMs: 0 });
  live = { h, done: runTui(s, { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {} }) };
  await sleep(100);
  await key(h, "/config");
  await key(h, "\r");
  await until(() => h.last().includes("Enter or Space change"));
  return { h, s };
}

test("the panel shows groups, values, sources and the help line", async () => {
  saveClaudeKey(KEY);
  const { h } = await open();
  const screen = h.last();
  for (const t of ["Settings", "Model", "Referee model", "Session", "Mode", "Save results in", "cuvette", "Permissions", "Adapters", "Loaded adapters", "smile-msi", "Account and spend", "Claude API key", "saved", "Budget per month", "Spent this month", "Lab notebook"])
    expect(screen).toContain(t);
  expect(screen).toMatch(/Model\s+fake:\s+This session/);
  expect(screen).toMatch(/Mode\s+watch\s+Default/);
  expect(screen).toContain("The model that does the analysis.");
  expect(h.all()).not.toContain("panelsecret");
  expect(h.all()).not.toContain("QRST");
});

test("in a short terminal the panel keeps the selected row and the help line in view", async () => {
  const { h } = await open(24);
  expect(h.term.view()).toContain("Enter or Space change");
  expect(h.term.view()).not.toContain("Lab notebook");
  await key(h, "\x1b[A");
  await until(() => h.term.view().includes("Lab notebook"));
  const view = h.term.view();
  expect(view).toContain("Lab notebook");
  expect(view).toContain("Enter or Space change");
  expect(view.split("\n").length).toBeLessThanOrEqual(24);
});

test("a change asks where to save it and goes into the record", async () => {
  const { h, s } = await open();
  await key(h, DOWN);
  await key(h, DOWN);
  await until(() => h.last().includes("watch: the agent runs the steps."));
  await key(h, "\r");
  await key(h, DOWN);
  await key(h, " ");
  await until(() => h.last().includes("Save follow for:"));
  expect(h.last()).toContain("This session");
  expect(h.last()).toContain("Me (all projects)");
  expect(h.last()).toContain("This project");
  await key(h, DOWN);
  await key(h, "\r");
  await until(() => h.last().includes("Saved for me (all projects). Mode is now follow."));
  expect(s.mode).toBe("follow");
  expect(JSON.parse(readFileSync(settingsPath("user", s.cwd), "utf8"))).toEqual({ mode: "follow" });
  expect(s.record.entries(["setting"]).map((e) => e.data)).toEqual([{ name: "mode", old: "watch", new: "follow", scope: "user" }]);
  await key(h, "\x1b");
  await until(() => h.all().includes("Setting mode: watch → follow (user settings)"));
});

test("a model row is locked during a turn", async () => {
  const { h, s } = await open();
  s.busy = true;
  s.bus.emit({ type: "status", state: "thinking" });
  await until(() => /Model\s+fake:\s+This session · locked/.test(h.last()));
  expect(h.last()).toMatch(/Mode\s+watch\s+Default/);
  await key(h, "\r");
  await until(() => h.last().includes("Model cannot change until the turn ends."));
  expect(s.record.entries(["setting"])).toHaveLength(0);
});

test("the panel shows every setting of the registry with its section", async () => {
  const { h, s } = await open(200);
  const screen = h.last();
  const ctx = { cwd: s.cwd, env: {}, session: s as never, ui: { details: () => false, toggleDetails() {} } };
  for (const r of describe(ctx)) {
    expect(screen).toContain(r.def.label);
    expect(screen).toContain(r.def.group);
  }
});

test("typing filters the rows by label and help, and Esc clears the search first", async () => {
  const { h } = await open();
  for (const c of "budget") await key(h, c);
  await until(() => h.last().includes("Search: budget"));
  expect(h.last()).toContain("Budget per month");
  expect(h.last()).not.toContain("Referee model");
  for (let i = 0; i < 6; i++) await key(h, "\x7f");
  for (const c of "spinner") await key(h, c);
  await until(() => h.last().includes("Search: spinner"));
  expect(h.last()).toContain("Animations");
  expect(h.last()).not.toContain("Budget per month");
  await key(h, "\x1b");
  await until(() => h.last().includes("Type to search"));
  expect(h.last()).toContain("Referee model");
});

test("a project file badge names the file, and a model choice shows its price", async () => {
  const { h, s } = await open();
  mkdirSync(join(s.cwd, ".cuvette"), { recursive: true });
  writeFileSync(join(s.cwd, ".cuvette", "settings.local.json"), JSON.stringify({ openImages: "off" }));
  await key(h, DOWN);
  await until(() => /Open QC images\s+off\s+Project · \.cuvette[\\/]settings\.local\.json/.test(h.last()));
  await key(h, "\x1b[A");
  await key(h, "\r");
  await until(() => h.last().includes("$4 in, $20 out per million tokens"));
  expect(h.last()).toContain("claude:claude-haiku-5-5  $0.1 in, $0.5 out per million tokens");
});

test("reset to default is the last choice, and the next save remembers the scope", async () => {
  const { h, s } = await open();
  writeFileSync(settingsPath("user", s.cwd), JSON.stringify({ pilot: "off" }));
  for (const c of "pilot") await key(h, c);
  await until(() => /Pilot\s+off\s+User/.test(h.last()));
  await key(h, "\r");
  await until(() => h.last().includes(RESET));
  await key(h, DOWN);
  await key(h, "\r");
  await until(() => h.last().includes("Reset to default. Pilot is now on."));
  expect(JSON.parse(readFileSync(settingsPath("user", s.cwd), "utf8"))).toEqual({});
  await key(h, "\r");
  await key(h, DOWN);
  await key(h, "\r");
  await key(h, DOWN);
  await key(h, DOWN);
  await key(h, "\r");
  await until(() => h.last().includes("Saved for this project. Pilot is now off."));
  await key(h, "\r");
  await key(h, "\x1b[A");
  await key(h, "\r");
  await until(() => h.last().includes("Save on for:"));
  expect(h.last()).toMatch(/▸ This project/);
});

test("the spend row shows a bar against the budget", async () => {
  appendFileSync(process.env.CUVETTE_SPEND_FILE!, JSON.stringify({ t: new Date().toISOString(), model: "claude-opus-5-5", usd: 30 }) + "\n");
  writeFileSync(settingsPath("user", "/"), JSON.stringify({ budgetUsd: 40 }));
  const { h } = await open();
  await until(() => /█+░*\s\$[\d.]+ of \$40\.00 this month/.test(h.last()));
});
