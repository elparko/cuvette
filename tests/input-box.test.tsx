import { afterEach, describe, expect, test } from "vitest";
import { runTui } from "../src/tui/app.tsx";
import { FakeSession } from "../src/ui/fake-session.ts";
import { makeHarness, sleep, until, type Harness } from "../src/tui/testing.ts";

let live: { h: Harness; done: Promise<void> } | undefined;

function start(keys?: string, autoSetup = false) {
  const h = makeHarness();
  const s = new FakeSession({ delayMs: 0 });
  if (keys) s.settings.input_keys = keys;
  const done = runTui(s, { stdin: h.stdin, stdout: h.stdout, autoSetup, env: {} });
  live = { h, done };
  return { h, s };
}

async function keys(h: Harness, ...seqs: string[]) {
  for (const k of seqs) {
    h.type(k);
    await sleep(40);
  }
}

const screen = (h: Harness) => h.last();

afterEach(async () => {
  if (!live) return;
  live.h.type("\x03");
  await sleep(20);
  live.h.type("\x03");
  await Promise.race([live.done, sleep(500)]);
  live = undefined;
});

test("mac style is the default: Option+Backspace deletes a word, Shift+Enter makes a new line", async () => {
  const { h, s } = start();
  await sleep(250);
  expect(h.all()).toContain("Shift+Enter: new line · Option+←→: word");
  await keys(h, "hello world", "\x1b\x7f", "there", "\x1b[13;2u", "next", "\x1bb", "X", "\x1b[1;3C", "!", "\r");
  await until(() => s.sent.length === 1);
  expect(s.sent[0]).toBe("hello there\nXnext!");
});

test("a bracketed paste with line breaks stays one message", async () => {
  const { h, s } = start();
  await sleep(250);
  expect(h.frames.join("")).toContain("\x1b[?2004h");
  await keys(h, "\x1b[200~line one\rline two\r\x1b[201~");
  await sleep(100);
  expect(s.sent).toEqual([]);
  expect(h.all()).toContain("line two");
  await keys(h, "end", "\r");
  await until(() => s.sent.length === 1);
  expect(s.sent[0]).toBe("line one\nline two\nend");
});

test("Up goes through lines of a message, then through past messages", async () => {
  const { h, s } = start();
  await sleep(250);
  s.bus.emit({ type: "status", state: "running", tool: "run_script", since: Date.now() });
  await keys(h, "earlier", "\r");
  await keys(h, "first", "\x1b\r", "second", "\x1b[A", "X");
  await until(() => screen(h).includes("firstX"));
  await keys(h, "\x7f", "\x1b[A", "\x1b[A");
  await until(() => screen(h).includes("> earlier"));
  await keys(h, "\x1b[B");
  await until(() => screen(h).includes("second"));
  await keys(h, "\x1b[1;9D", "\x1b[1;9D", "\x1b[1;9C", "!", "\r");
  await until(() => s.steered.length === 2);
  expect(s.steered.map((x) => x.text)).toEqual(["earlier", "first\nsecond!"]);
});

test("/config switches to vim at once; Esc leaves insert mode, a second Esc stops the agent", async () => {
  const { h, s } = start();
  await sleep(250);
  await keys(h, "/config", "\r");
  await until(() => h.all().includes("Settings"));
  for (let i = 0; i < 40 && !screen(h).includes("▸ Input keys"); i++) await keys(h, "\x1b[B");
  await keys(h, "\r");
  for (let i = 0; i < 6 && !/▸ vim/.test(screen(h)); i++) await keys(h, "\x1b[B");
  await keys(h, "\r");
  await until(() => screen(h).includes("Save vim where?"));
  await keys(h, "\r");
  await until(() => s.settings.input_keys === "vim");
  await keys(h, "\x1b");
  await until(() => screen(h).includes("-- INSERT --"));

  await keys(h, "/help", "\r");
  await until(() => h.all().includes("dw, dd"));

  s.bus.emit({ type: "status", state: "running", tool: "run_script", since: Date.now() });
  await keys(h, "abc");
  await until(() => screen(h).includes("Esc twice stops this step."));
  await keys(h, "\x1b");
  await until(() => screen(h).includes("-- NORMAL --"));
  expect(screen(h)).toContain("Esc: stop the agent");
  expect(s.interrupts).toBe(0);
  await keys(h, "\x1b");
  await until(() => s.interrupts === 1);
  s.bus.emit({ type: "status", state: "idle" });
  await keys(h, "0", "x", "i", "Z", "\r");
  await until(() => s.sent.length === 1);
  expect(s.sent[0]).toBe("Zbc");
});

test("emacs style: Ctrl+A, Ctrl+K, Alt+F", async () => {
  const { h, s } = start("emacs");
  await sleep(250);
  expect(h.all()).toContain("Alt+Enter: new line");
  await keys(h, "one two three", "\x01", "\x1bf", "\x0b", "\r");
  await until(() => s.sent.length === 1);
  expect(s.sent[0]).toBe("one");
});

test("classic style is a one-line box on the shared editor: no new lines, Ctrl letters type nothing", async () => {
  const { h, s } = start("classic");
  await sleep(250);
  await keys(h, "ab", "\x1b[13;2u", "\x1bb", "\x01", "\x17", "X", "\r");
  await until(() => s.sent.length === 1);
  expect(s.sent[0]).toBe("Xab");
});

describe("every text field uses the shared editor: Option+Backspace deletes a word", () => {
  const OPT_BS = ["\x1b\x7f", "\x1b[127;3u"];

  test.each(OPT_BS)("setup card field (%j)", async (bs) => {
    const { h, s } = start(undefined, true);
    await until(() => h.all().includes("Setup: your choices for this analysis"));
    await sleep(100);
    await keys(h, "\r", "Does Z", bs, "Y differ?");
    await until(() => screen(h).includes("asking?: Does Y differ?"));
    await keys(h, "\r");
    for (let i = 0; i < 12 && !screen(h).includes("▸ Save setup and start"); i++) {
      const before = screen(h);
      h.type("\x1b[B");
      await until(() => screen(h) !== before);
    }
    await keys(h, "\r");
    await until(() => s.record.entries(["setup"]).length === 1);
    expect(s.decisions.value("question")).toBe("Does Y differ?");
  });

  test.each(OPT_BS)("permission note (%j)", async (bs) => {
    const { h, s } = start();
    await sleep(250);
    await keys(h, "go", "\r");
    await until(() => h.all().includes("Permission needed: run_script"));
    await keys(h, "n", "too risky today", bs, "\x17", "risky", "\r");
    await until(() => s.record.entries(["permission"]).length === 1);
    expect(s.record.entries(["permission"])[0]!.data).toMatchObject({ decision: "denied", note: "too risky" });
  });

  test.each(OPT_BS)("free-text answer on a question card (%j)", async (bs) => {
    const { h, s } = start();
    await sleep(250);
    await keys(h, "go", "\r");
    await until(() => h.all().includes("Permission needed"));
    await keys(h, "y");
    await until(() => h.all().includes("other: type your own answer"));
    await keys(h, "o", "0.75 maybe", bs, "\r");
    await until(() => s.questions.open().length === 0);
    expect(s.record.entries(["answer"])[0]!.data.value).toBe("0.75");
  });

  test.each(OPT_BS)("change text on the proposed metrics card (%j)", async (bs) => {
    const { h, s } = start();
    await sleep(250);
    s.proposePlan("Question: Q1", []);
    await until(() => h.all().includes("c change"));
    await keys(h, "c");
    await until(() => h.all().includes("What must change?"));
    await keys(h, "Use a Wilcoxon text", bs, "rank test.", "\r");
    await until(() => s.planResponses.length === 1);
    expect(s.planResponses[0]).toEqual({ action: "change", text: "Use a Wilcoxon rank test." });
  });

  test.each(OPT_BS)("/config value field (%j)", async (bs) => {
    const { h } = start();
    await sleep(250);
    await keys(h, "/config", "\r");
    await until(() => h.all().includes("Settings"));
    for (let i = 0; i < 40 && !screen(h).includes("▸ Adapters in every session"); i++) {
      const before = screen(h);
      h.type("\x1b[B");
      await until(() => screen(h) !== before);
    }
    await keys(h, "\r");
    await until(() => screen(h).includes("New value:"));
    await keys(h, "imagej fiji", bs, "biostats");
    await until(() => screen(h).includes("New value: imagej biostats"));
    await keys(h, "\x1b");
    await until(() => !screen(h).includes("New value:"));
  });

  test.each(OPT_BS)("masked API key field (%j)", async (bs) => {
    const { h } = start();
    await sleep(250);
    await keys(h, "/key", "\r");
    await until(() => h.all().includes("Paste your key"));
    await keys(h, "sk-ant-abc def", bs);
    await until(() => /Key: \*{11}(?!\*)/.test(screen(h)));
    expect(screen(h)).not.toContain("abc");
  });
});
