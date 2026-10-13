import { afterEach, expect, test } from "vitest";
import { runTui } from "../src/tui/app.tsx";
import { FakeSession } from "../src/ui/fake-session.ts";
import { animationsOn, footerHints, hangWrap, liveLayout, statusRows } from "../src/tui/view.tsx";
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
  await sleep(200);
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
    const chrome = l.chrome ? 2 + 1 : 0;
    expect(chrome + box + l.live + l.pending + l.card).toBeLessThanOrEqual(Math.max(rows - 2, 4));
  }
});

test("at 80 by 24 a card gets the rows before the message box and the streamed text", () => {
  const l = liveLayout({ rows: 24, columns: 80, card: true, running: true, input: 0, queue: 0, suggestions: 0, text: true, pending: true, status: 2 });
  expect(l.inputBox).toBe(false);
  expect(l.card).toBeGreaterThanOrEqual(18);
});

const bottom = (h: Harness) => h.term.view().trimEnd().split("\n").slice(-4).join("\n");

test("footer hints: full, short and off; Ctrl+T cycles them; bypass and Waiting for your answer stay", async () => {
  const { h, s } = start();
  await until(() => h.term.view().includes("watch: the agent runs the steps"));
  expect(h.term.view()).toContain("Shift+Enter: new line");
  h.type("\x14");
  await until(() => s.settings.footer_hints === "short" && !h.term.view().includes("watch: the agent runs the steps"));
  await until(() => !h.term.view().includes("Footer hints: short"), 3000);
  expect(bottom(h)).toMatch(/watch · fake-model\s*$/);
  expect(h.term.view()).not.toContain("Ctrl+O: all steps");
  expect(h.term.view()).not.toContain("Shift+Enter: new line");
  h.type("\x14");
  await until(() => s.settings.footer_hints === "off");
  await until(() => !h.term.view().includes("Footer hints: off"), 3000);
  expect(bottom(h)).toMatch(/╰─+╯\s*$/);

  s.bus.emit({ type: "status", state: "running", tool: "run_script", since: Date.now() });
  await until(() => bottom(h).includes("Esc stops this step."));
  expect(bottom(h)).not.toContain("Your message goes in after the step.");
  s.bus.emit({ type: "status", state: "idle" });
  await until(() => !bottom(h).includes("Esc stops this step."));

  h.type("/permissions bypass");
  await sleep(40);
  h.type("\r");
  await until(() => s.permissionMode === "bypass" && /bypass permissions\s*$/.test(bottom(h)));
  s.bus.emit({ type: "status", state: "thinking", since: Date.now() });
  s.proposePlan("Question: Q1");
  await until(() => h.term.view().includes("● Waiting for your answer"));
  expect(bottom(h)).toMatch(/bypass permissions\s*$/);
  h.type("\x14");
  await until(() => s.settings.footer_hints === "full");
  await until(() => h.term.view().includes("bypass permissions · watch: the agent runs the steps"));
  expect(h.term.view()).toContain("● Waiting for your answer");
});

async function arrowDown(h: { type(t: string): void; term: { view(): string } }) {
  for (let tries = 0; tries < 8; tries++) {
    const before = h.term.view();
    h.type("\x1b[B");
    try {
      await until(() => h.term.view() !== before, 1500);
      return;
    } catch {}
  }
  throw new Error("the arrow key changed nothing");
}

test("/config changes the footer hints at once; /help shows Ctrl+T", async () => {
  const { h, s } = start();
  await until(() => h.term.view().includes("watch: the agent runs the steps"));
  h.type("/help");
  await sleep(40);
  h.type("\r");
  await until(() => h.all().includes("Change the footer hints: full, short, off."));
  h.type("/config");
  await sleep(40);
  h.type("\r");
  await until(() => h.term.view().includes("Settings"));
  for (let i = 0; i < 40 && !h.term.view().includes("▸ Footer hints"); i++) {
    const before = h.term.view();
    h.type("\x1b[B");
    await until(() => h.term.view() !== before);
    await sleep(60);
  }
  let before = h.term.view();
  h.type("\r");
  await until(() => h.term.view() !== before);
  for (let i = 0; i < 2; i++) await arrowDown(h);
  h.type("\r");
  await until(() => h.term.view().includes("Save off for:"));
  h.type("\r");
  await until(() => s.settings.footer_hints === "off");
  await until(() => h.term.view().includes("▸ Footer hints") && !h.term.view().includes("watch: the agent runs the steps"));
  h.type("\x1b");
  await until(() => !h.term.view().includes("Footer hints") && !h.term.view().includes("watch: the agent runs the steps"));
  expect(bottom(h)).toMatch(/╰─+╯\s*$/);
});

test("footer rows for the layout", () => {
  expect(footerHints("nonsense")).toBe("full");
  expect(statusRows({ hints: "full", state: "idle" })).toBe(2);
  expect(statusRows({ hints: "short", state: "idle" })).toBe(1);
  expect(statusRows({ hints: "off", state: "idle" })).toBe(0);
  expect(statusRows({ hints: "off", state: "running", bypass: true })).toBe(2);
  expect(statusRows({ hints: "off", state: "idle", hint: "Press Ctrl+C again to quit." })).toBe(1);
});

test("a wide table row wraps its last column under the start of that column", () => {
  const row = "Esc                             Stop the agent. If the agent is idle, Esc clears the input.";
  const out = hangWrap(row, 79).split("\n");
  expect(out).toEqual(["Esc                             Stop the agent. If the agent is idle, Esc", "                                clears the input."]);
  expect(hangWrap("short line", 79)).toBe("short line");
  expect(hangWrap("x".repeat(100), 40).split("\n").every((l) => l.length <= 40)).toBe(true);
});

test("in a narrow terminal, a table row puts the description under the key", () => {
  const row = "Esc                             Stop the agent. If the agent is idle, Esc clears the input.";
  const out = hangWrap(row, 39).split("\n");
  expect(out[0]).toBe("Esc");
  expect(out.slice(1).every((l) => l.startsWith("    ") && l.length <= 39)).toBe(true);
  expect(out.slice(1).join(" ").replace(/\s+/g, " ").trim()).toBe("Stop the agent. If the agent is idle, Esc clears the input.");
});
