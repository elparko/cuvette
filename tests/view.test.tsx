import { afterEach, expect, test } from "vitest";
import { runTui } from "../src/tui/app.tsx";
import { FakeSession } from "../src/ui/fake-session.ts";
import { animationsOn, liveLayout } from "../src/tui/view.tsx";
import { makeHarness, plain, sleep, until, type Harness } from "../src/tui/testing.ts";

let live: { h: Harness; done: Promise<void> } | undefined;

function start(settings: Record<string, unknown> = {}) {
  const h = makeHarness(100, 40);
  const s = new FakeSession({ delayMs: 0 });
  Object.assign(s.settings, settings);
  const done = runTui(s, { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {} });
  live = { h, done };
  return { h, s };
}

afterEach(async () => {
  if (!live) return;
  live.h.type("\x03");
  await sleep(20);
  live.h.type("\x03");
  await Promise.race([live.done, sleep(500)]);
  live = undefined;
});

const SPIN = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/;

test("the spinner turns on the status line only, and stops when a card waits for the scientist", async () => {
  const { h, s } = start();
  await until(() => h.all().includes("Type /plan"));
  s.bus.emit({ type: "status", state: "thinking", since: Date.now() });
  await until(() => SPIN.test(h.term.view()));
  const from = h.frames.length;
  await sleep(500);
  const ticks = h.frames.slice(from).map(plain);
  expect(ticks.length).toBeGreaterThanOrEqual(3);
  for (const t of ticks) {
    expect(t).not.toContain("Ask for an analysis step");
    expect(t).not.toContain("watch: the agent runs the steps");
    expect(t.split("\n").filter((l) => l.trim()).length).toBeLessThanOrEqual(1);
  }
  expect(h.term.view()).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏] Thinking about the next step/);

  s.proposePlan("Question: Q1");
  await until(() => h.term.view().includes("● Waiting for your answer") && h.term.view().includes("No analysis step runs") && !h.term.view().includes(" of ?"));
  expect(h.term.view()).not.toMatch(SPIN);
  await sleep(100);
  const quiet = h.frames.length;
  await sleep(400);
  expect(h.frames.length).toBe(quiet);
});

test("with animations off the line shows a still dot", async () => {
  const { h, s } = start({ animations: "off" });
  await until(() => h.all().includes("Type /plan"));
  s.bus.emit({ type: "status", state: "thinking", since: Date.now() });
  await until(() => h.term.view().includes("● Thinking about the next step"));
  await sleep(300);
  expect(h.all()).not.toMatch(SPIN);
});

test("animations need an interactive terminal and the setting", () => {
  expect(animationsOn({ isTTY: true }, {})).toBe(true);
  expect(animationsOn({ isTTY: false }, {})).toBe(false);
  expect(animationsOn(undefined, {})).toBe(false);
  expect(animationsOn({ isTTY: true }, { TERM: "dumb" })).toBe(false);
  expect(animationsOn({ isTTY: true }, {}, "off")).toBe(false);
});

test("the live region leaves two rows of the terminal free", () => {
  for (const rows of [12, 20, 40, 60]) {
    const l = liveLayout({ rows, columns: 80, card: true, running: true, input: 0, queue: 0, suggestions: 0, text: true, pending: true });
    const box = l.inputBox ? 3 : 0;
    expect(2 + 1 + box + l.live + l.pending + l.card).toBeLessThanOrEqual(Math.max(rows - 2, 2 + 1 + 4));
  }
});
