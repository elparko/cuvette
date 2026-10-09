import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { saveClaudeKey } from "../src/core/credentials.ts";
import { settingsPath } from "../src/core/settings.ts";
import { runTui } from "../src/tui/app.tsx";
import { FakeSession } from "../src/tui/fake-session.ts";
import { makeHarness, sleep, until, type Harness } from "../src/tui/testing.ts";

const KEY = "sk-ant-api03-panelsecretpanel-QRST";
const DOWN = "\x1b[B";
const old = process.env.GA_HOME;
let live: { h: Harness; done: Promise<void> } | undefined;

beforeEach(() => {
  process.env.GA_HOME = mkdtempSync(join(tmpdir(), "ga-home-"));
});
afterEach(async () => {
  if (live) {
    live.h.type("\x03");
    await sleep(20);
    live.h.type("\x03");
    await Promise.race([live.done, sleep(500)]);
    live = undefined;
  }
  if (old === undefined) delete process.env.GA_HOME;
  else process.env.GA_HOME = old;
});

async function key(h: Harness, k: string) {
  h.type(k);
  await sleep(60);
}

async function open() {
  const h = makeHarness(120);
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
  expect(screen).toMatch(/Model\s+fake:\s+this session only/);
  expect(screen).toContain("The model that does the analysis.");
  expect(h.all()).not.toContain("panelsecret");
  expect(h.all()).not.toContain("QRST");
});

test("a change asks where to save it and goes into the record", async () => {
  const { h, s } = await open();
  await key(h, DOWN);
  await key(h, DOWN);
  await until(() => h.last().includes("watch: the agent runs the steps."));
  await key(h, "\r");
  await key(h, DOWN);
  await key(h, " ");
  await until(() => h.last().includes("Save follow where?"));
  expect(h.last()).toContain("This session only");
  expect(h.last()).toContain(`User settings  ${settingsPath("user", s.cwd)}`);
  await key(h, DOWN);
  await key(h, "\r");
  await until(() => h.last().includes("Mode is now follow (user settings)."));
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
  await until(() => /Model\s+fake:\s+this session only · locked/.test(h.last()));
  expect(h.last()).toMatch(/Mode\s+watch\s+default/);
  await key(h, "\r");
  await until(() => h.last().includes("Model is locked until the turn ends."));
  expect(s.record.entries(["setting"])).toHaveLength(0);
});
