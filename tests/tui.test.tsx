import { afterEach, describe, expect, test } from "vitest";
import { runTui } from "../src/tui/app.tsx";
import { FakeSession } from "../src/ui/fake-session.ts";
import { imageProtocol, inlineImage } from "../src/tui/image.ts";
import { Collapser, Mapper, mainView, settingsLine, type Item, type Logged } from "../src/ui/items.ts";
import { liveTail, tableLines } from "../src/tui/markdown.tsx";
import { makeHarness, sleep, until, type Harness } from "../src/tui/testing.ts";
import { renderGraph, suggestions } from "../src/ui/commands.ts";
import React from "react";
import { Static, render } from "ink";
import { ItemView, activityText, busyHint, runningText } from "../src/tui/view.tsx";

let live: { h: Harness; s: FakeSession; done: Promise<void> } | undefined;

function start(opts: { mode?: "watch" | "follow"; autoSetup?: boolean; env?: Record<string, string> } = {}) {
  const h = makeHarness();
  const s = new FakeSession({ delayMs: 0, mode: opts.mode });
  const done = runTui(s, { stdin: h.stdin, stdout: h.stdout, autoSetup: opts.autoSetup ?? false, env: opts.env ?? {} });
  live = { h, s, done };
  return { h, s, done };
}

async function type(h: Harness, text: string) {
  h.type(text);
  await sleep(40);
}

const settle = () => sleep(250);

async function submit(h: Harness, text: string) {
  await type(h, text);
  await type(h, "\r");
}

afterEach(async () => {
  if (!live) return;
  live.h.type("\x03");
  await sleep(20);
  live.h.type("\x03");
  await Promise.race([live.done, sleep(500)]);
  live = undefined;
});

describe("transcript", () => {
  test("shows the header once", async () => {
    const { h } = start();
    await until(() => h.all().includes("Type /help for commands."));
    const text = h.all();
    expect(text).toContain("smile-msi 0.1.0 (SMILE MSI 2.4.0)");
    expect(text).toContain("Model: fake-model · Mode: watch · Session: 20261008-101500-ab12");
  });

  test("a resumed session shows its earlier conversation", async () => {
    const h = makeHarness();
    const s = new FakeSession({ delayMs: 0 });
    s.record.append("user", { text: "count the cells from before" });
    s.record.append("assistant", { text: "There are 42 cells.", final: true });
    const done = runTui(s, { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {} });
    live = { h, s, done };
    await until(() => h.all().includes("Type /help for commands."));
    expect(h.all()).toContain("> count the cells from before");
    expect(h.all()).toContain("There are 42 cells.");
  });

  test("shows steps with route, settings, fidelity, deviation and failure", async () => {
    const { h } = start();
    await sleep(100);
    await submit(h, "compare endo and epi");
    await until(() => h.all().includes("Permission needed: run_script"));
    await type(h, "y");
    await until(() => h.all().includes("Which AUC cutoff do you want?"));
    await type(h, "1");
    try {
      await until(() => h.all().includes("14 features differ between endo and epi at AUC 0.7.") && h.all().includes("✗ export_table") && /open\s+with\s+\/open\s+1/.test(h.all()));
    } catch (e) {
      throw new Error(`${(e as Error).message}\n--- last screen text ---\n${h.all().slice(-2500)}`);
    }
    const text = h.all();
    expect(text).toContain("● Step 1  Loaded 2 samples with 4812 spectra");
    expect(text).toContain("▸ File > Open > endo_epi.imzML · path endo_epi.imzML");
    expect(text).toContain("◇ close match");
    expect(text).toContain("⚠ Deviation: tolerance ppm 10 (setup says 5)");
    expect(text).toContain("● Step 3  Found 14 features different between endo and epi");
    expect(text).toContain("▸ Analyze > Discriminating features · group a endo");
    expect(text).toMatch(/image:\s*[\s\S]*\.png[\s\S]*\(open\s+with\s+\/open\s+1\)/);
    expect(text).toContain("✗ export_table  Folder is read-only");
    expect(text).not.toContain("Step 4");
    expect(text).toContain("· Looked at 1 folder (msi); Read 2 files (endo_epi.imzML, samples.csv)");
    expect(text).not.toContain("read_file");
    expect(text).toContain("◇ code only: no manual route");
    expect(text).toMatch(/price not known · context (<1|\d+)%/);
  });
});

describe("markdown", () => {
  test("assistant text shows no raw Markdown marks", async () => {
    const { h, s } = start();
    await sleep(100);
    s.record.append("assistant", {
      text: "## Result\nThe **AUC** is `0.8` [no source]\n- first item\n1. numbered item\n\n| Gene | Value |\n|---|---|\n| TP53 | 0.8 |\n| BRCA1 | 0.6 |",
      final: true,
    });
    await until(() => h.all().includes("BRCA1"));
    const text = h.all();
    expect(text).toContain("Result");
    expect(text).not.toContain("##");
    expect(text).not.toContain("**");
    expect(text).not.toContain("`");
    expect(text).toContain("The AUC is 0.8 [no source]");
    expect(text).toContain("• first item");
    expect(text).toContain("1. numbered item");
    expect(text).not.toContain("|---");
    expect(text).toMatch(/TP53\s+│ 0\.8/);
    expect(text).toMatch(/Gene\s+│ Value/);
  });

  test("tables shrink to fit the width", () => {
    const rows = [["Name", "Notes"], ["a", "word ".repeat(30).trim()]];
    const lines = tableLines(rows, 40);
    expect(lines.length).toBeGreaterThan(3);
    for (const l of lines) expect(l.text.length).toBeLessThanOrEqual(40);
  });

  test("the live reply keeps only the last blocks that fit on the screen", () => {
    const text = Array.from({ length: 50 }, (_, i) => `Paragraph ${i}.`).join("\n\n");
    const tail = liveTail(text, 6, 80);
    expect(tail.startsWith("Paragraph 4")).toBe(true);
    expect(tail.endsWith("Paragraph 49.")).toBe(true);
    expect(liveTail("short", 6, 80)).toBe("short");
    const code = `Intro.\n\n\`\`\`\n${Array.from({ length: 30 }, (_, i) => `line ${i}`).join("\n\n")}`;
    expect(liveTail(code, 4, 80).startsWith("```\n")).toBe(true);
  });
});

describe("queue", () => {
  test("with the queue setting, a message typed while busy waits and is sent when the turn ends", async () => {
    const { h, s } = start();
    s.settings.messages = "queue";
    await sleep(100);
    s.bus.emit({ type: "status", state: "thinking" });
    await sleep(40);
    await submit(h, "next question");
    await until(() => h.all().includes("Queued: next question"));
    expect(s.sent).toEqual([]);
    s.bus.emit({ type: "status", state: "idle" });
    await until(() => s.sent.includes("next question"));
  });

  test("slash commands run at once while busy", async () => {
    const { h, s } = start();
    await sleep(100);
    s.bus.emit({ type: "status", state: "thinking" });
    await sleep(40);
    await submit(h, "/help");
    await until(() => h.all().includes("/trail"));
    expect(h.all()).not.toContain("Queued: /help");
  });

  test("Esc stops the agent and clears the queue", async () => {
    const { h, s } = start();
    s.settings.messages = "queue";
    await sleep(100);
    s.bus.emit({ type: "status", state: "thinking" });
    await sleep(40);
    await submit(h, "later");
    await until(() => h.all().includes("Queued: later"));
    await type(h, "\x1b");
    await until(() => s.interrupts === 1);
    s.bus.emit({ type: "status", state: "idle" });
    await sleep(100);
    expect(s.sent).toEqual([]);
  });
});

describe("messages during a turn", () => {
  test("a message typed while busy goes to the agent after the step and shows at once", async () => {
    const { h, s } = start();
    await sleep(100);
    s.bus.emit({ type: "status", state: "running", tool: "run_script", purpose: "Running a script", since: Date.now() });
    await sleep(40);
    expect(h.all()).toContain("Esc stops this step. Your message goes in after the step. Start it with ! to send it now.");
    await submit(h, "use TIC");
    await until(() => h.all().includes("Sent. The agent reads it after the current step."));
    expect(h.all()).toContain("> use TIC");
    expect(s.steered).toEqual([{ text: "use TIC", now: false }]);
    expect(s.sent).toEqual([]);
  });

  test("! sends now; Esc drops messages that the agent did not read", async () => {
    const { h, s } = start();
    await sleep(100);
    s.bus.emit({ type: "status", state: "running", tool: "run_script", since: Date.now() });
    await sleep(40);
    await submit(h, "!stop, wrong folder");
    await until(() => h.all().includes("Sent now. The current step stops"));
    expect(s.steered).toEqual([{ text: "stop, wrong folder", now: true }]);
    await type(h, "\x1b");
    await until(() => s.interrupts === 1);
    s.bus.emit({ type: "status", state: "idle" });
    await sleep(100);
    expect(s.sent).toEqual([]);
  });

  test("a message that the agent did not read before the turn ended goes as the next request", async () => {
    const { h, s } = start();
    await sleep(100);
    s.bus.emit({ type: "status", state: "thinking" });
    await sleep(40);
    await submit(h, "and the median");
    await until(() => s.steered.length === 1);
    s.bus.emit({ type: "status", state: "idle" });
    await until(() => s.sent.includes("and the median"));
  });

  test("the mapper marks a delivered message as read", () => {
    const s = new FakeSession({ delayMs: 0 });
    const e = s.record.append("user", { text: "use TIC", during: true, afterStep: 2 });
    expect(new Mapper(s).map(e)).toMatchObject([{ t: "line", text: "The agent read your message.", dim: true }]);
  });
});

describe("follow step lines", () => {
  test("no warning while the step waits", async () => {
    const { h, s } = start();
    await sleep(100);
    s.record.append("follow_step", { step: 1, tool: "t", instruction: "x", status: "waiting" });
    s.record.append("follow_step", { step: 2, tool: "t", status: "done", match: false, differences: ["area 3 vs 4"] });
    await until(() => h.all().includes("Step 2 differs: area 3 vs 4"));
    expect(h.all()).not.toContain("undefined");
    expect(h.all()).not.toContain("Step 1 differs");
  });
});

describe("cards", () => {
  test("permission card shows the purpose in plain words and the code only after c", async () => {
    const { h } = start();
    await sleep(100);
    await submit(h, "go");
    await until(() => h.all().includes("Permission needed: run_script"));
    expect(h.all()).toContain("AUC per feature");
    expect(h.all()).toContain("Computes the AUC of each feature between endo and epi.");
    expect(h.all()).toContain("c shows the code");
    expect(h.all()).not.toContain("import numpy as np");
    await type(h, "c");
    await until(() => h.all().includes("import numpy as np"));
    expect(h.last().match(/import numpy as np/g)).toHaveLength(1);
  });

  test("permission: n asks for a note and denies", async () => {
    const { h, s } = start();
    await sleep(100);
    await submit(h, "go");
    await until(() => h.all().includes("Permission needed: run_script"));
    expect(h.all()).toContain("This will touch: a Python process");
    await type(h, "n");
    await until(() => h.all().includes("Reason for the agent"));
    await type(h, "too risky");
    h.type("\r");
    await until(() => h.all().includes("I did not run the script"));
    expect(s.record.entries(["permission"])[0]!.data).toMatchObject({ decision: "denied", note: "too risky" });
  });

  test("question: number key answers and the card closes", async () => {
    const { h, s } = start();
    await sleep(100);
    await submit(h, "go");
    await until(() => h.all().includes("Permission needed"));
    await type(h, "y");
    await until(() => h.all().includes("0.8 (6 features)"));
    expect(h.all()).toContain("Recommended: 0.7 is the cutoff in your lab profile.");
    expect(h.all()).toContain("Cutoff  Features  Both normalizations");
    await type(h, "2");
    await until(() => s.questions.open().length === 0);
    expect(s.record.entries(["answer"])[0]!.data.value).toBe(0.8);
  });

  test("question: o opens free text", async () => {
    const { h, s } = start();
    await sleep(100);
    await submit(h, "go");
    await until(() => h.all().includes("Permission needed"));
    await type(h, "y");
    await until(() => h.all().includes("other: type your own answer"));
    await type(h, "o");
    await type(h, "0.75");
    h.type("\r");
    await until(() => s.questions.open().length === 0);
    expect(s.record.entries(["answer"])[0]!.data.value).toBe("0.75");
  });

  test("follow instruction: Enter confirms, s lets the agent act", async () => {
    const { h, s } = start({ mode: "follow" });
    await sleep(100);
    await submit(h, "go");
    await until(() => h.all().includes("Permission needed"));
    await type(h, "y");
    await until(() => h.all().includes("Which AUC cutoff"));
    await type(h, "1");
    await until(() => h.all().includes("Do this step in SMILE MSI, then press Enter. Press s to let the agent do it."));
    expect(h.all()).toContain("Analyze > Discriminating features. Group A = endo.");
    await type(h, "s");
    await until(() => s.record.entries(["follow_step"]).length === 1);
    expect(s.record.entries(["follow_step"])[0]!.data.agentDoes).toBe(true);
  });

  test("the sample request at first start does not open the setup card", async () => {
    const h = makeHarness();
    const s = new FakeSession({ delayMs: 0 });
    const done = runTui(s, { stdin: h.stdin, stdout: h.stdout, autoSetup: true, env: {}, firstMessage: "Is drug 2 better than drug 1?" });
    live = { h, s, done };
    await until(() => s.sent.includes("Is drug 2 better than drug 1?") && h.all().includes("Type /help for commands."));
    await settle();
    expect(h.all()).not.toContain("Setup: your choices for this analysis");
  });

  test("setup card edits a field and saves", async () => {
    const { h, s } = start({ autoSetup: true });
    const card = () => {
      const t = h.term.view();
      return t.slice(t.lastIndexOf("Setup: your choices"));
    };
    await until(() => h.all().includes("Setup: your choices for this analysis"));
    for (let i = 0; ; i++) {
      h.type("\r");
      try {
        await until(() => !card().includes("One sentence."), 2000);
        break;
      } catch (e) {
        if (i === 4) throw e;
      }
    }
    h.type("Does X differ?");
    await until(() => card().includes("asking?: Does X differ?"));
    h.type("\r");
    await until(() => card().includes("One sentence."));
    h.type("\x1b[B");
    await until(() => card().includes("▸ Mass tolerance (ppm)"));
    h.type("\r");
    await until(() => !card().includes("How far apart"));
    h.type("\x7f");
    await until(() => !/Mass tolerance \(ppm\): 5/.test(card()));
    h.type("12");
    await until(() => card().includes("Mass tolerance (ppm): 12"));
    h.type("\r");
    await until(() => card().includes("How far apart"));
    for (let i = 0; i < 12 && !card().includes("▸ Save setup and start"); i++) {
      const before = card();
      h.type("\x1b[B");
      await until(() => card() !== before);
    }
    h.type("\r");
    await until(() => s.record.entries(["setup"]).length === 1);
    expect(s.decisions.value("question")).toBe("Does X differ?");
    expect(s.decisions.value("tolerance_ppm")).toBe(12);
  });
});

describe("keys and commands", () => {
  test("Shift+Tab cycles the mode", async () => {
    const { h, s } = start();
    await sleep(100);
    await type(h, "\x1b[Z");
    expect(s.mode).toBe("follow");
    await type(h, "\x1b[Z");
    expect(s.mode).toBe("teach");
    await type(h, "\x1b[Z");
    await type(h, "\x1b[Z");
    expect(s.mode).toBe("watch");
  });

  test("Esc interrupts a running turn", async () => {
    const { h, s } = start();
    await sleep(100);
    await submit(h, "go");
    await until(() => h.all().includes("Permission needed"));
    await type(h, "\x1b");
    await until(() => s.interrupts === 1 || false);
  });

  test("Ctrl+C twice quits", async () => {
    const { h, done } = start();
    await sleep(100);
    await type(h, "\x03");
    expect(h.all()).toContain("Press Ctrl+C again to quit.");
    h.type("\x03");
    await done;
  });

  test("a slash shows filtered suggestions", async () => {
    const { h } = start();
    await sleep(100);
    await type(h, "/de");
    expect(h.last()).toContain("/decisions");
    expect(h.last()).not.toContain("/graph");
    expect(suggestions("/q").map((c) => c.name)).toEqual(["questions", "quit"]);
    expect(suggestions("/mode x")).toEqual([]);
  });

  test("/decisions prints the table; /owner changes the owner", async () => {
    const { h, s } = start();
    await sleep(100);
    await submit(h, "/owner seed fixed");
    await until(() => s.decisions.owner("seed") === "fixed");
    await submit(h, "/decisions");
    await until(() => h.all().includes("Set by"));
    expect(h.all()).toMatch(/tolerance_ppm\s+5\s+human\s+not set/);
    expect(h.all()).toMatch(/seed\s+42\s+fixed/);
  });

  test("/mode, /trail and unknown commands", async () => {
    const { h, s } = start();
    await sleep(100);
    await submit(h, "/mode teach");
    await until(() => s.mode === "teach");
    await submit(h, "/nope");
    await until(() => h.all().includes("Unknown command /nope"));
    await submit(h, "/trail");
    await until(() => /Audit trail|Not available yet/.test(h.all()));
  });

  test("/graph marks out-of-date steps; /findings resolves with keys", async () => {
    const { h, s } = start();
    await sleep(100);
    await submit(h, "go");
    await until(() => h.all().includes("Permission needed"));
    await type(h, "y");
    await until(() => h.all().includes("Which AUC cutoff"));
    await type(h, "1");
    await until(() => h.all().includes("export_table"));
    s.setDecision("normalization", "RMS", "test");
    const graph = renderGraph(s);
    expect(graph).toContain("Step 1 Loaded 2 samples");
    expect(graph).toMatch(/└─ Step 2 Normalized spectra with TIC {2}\[out of date\]/);
    await submit(h, "/review");
    await until(() => h.all().includes("Review finding 1 of 1"));
    await type(h, "a");
    await until(() => s.findings.list("accepted").length === 1);
  });

  test("/open without outputs, /clear and /quit", async () => {
    const { h, done } = start();
    await sleep(100);
    await submit(h, "/open 1");
    await until(() => h.all().includes("No outputs yet."));
    await submit(h, "/quit");
    await done;
  });
});

describe("API key", () => {
  test("the key card opens at start for Claude with no key, checks the format, and Esc closes it", async () => {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const old = process.env.CUVETTE_HOME;
    process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-tui-key-"));
    try {
      const h = makeHarness();
      const s = new FakeSession({ delayMs: 0 });
      s.model = { ...s.model, provider: "claude", model: "claude-opus-5-5" };
      const done = runTui(s, { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {} });
      live = { h, s, done };
      await until(() => h.all().includes("Claude API key"));
      expect(h.all()).toContain("There is no Claude API key");
      await submit(h, "abc");
      await until(() => h.all().includes("A Claude API key starts with sk-ant-."));
      expect(h.all()).not.toContain("abc");
      await type(h, "\x1b");
      await until(() => h.last().includes("Ask for an analysis step"));
    } finally {
      if (old === undefined) delete process.env.CUVETTE_HOME;
      else process.env.CUVETTE_HOME = old;
    }
  });

  test("/key opens the card and /key status reports no key", async () => {
    const { h } = start();
    await submit(h, "/key status");
    await until(() => h.all().includes("There is no Claude API key") || h.all().includes("comes from"));
    await submit(h, "/key");
    await until(() => h.all().includes("Paste your key"));
  });
});

describe("quiet view", () => {
  const texts = (items: Item[]) => items.map((i) => (i.t === "line" ? `${i.sym} ${i.text}` : i.t === "step" ? `${i.n ? `Step ${i.n}` : i.tool} ${i.ok ? i.summary : i.error}` : i.t));

  function feed(build: (s: FakeSession) => void) {
    const s = new FakeSession({ delayMs: 0 });
    const start = s.record.entries().length;
    build(s);
    const m = new Mapper(s);
    const log: Logged[] = s.record.entries().slice(start).map((e) => ({ e, items: m.map(e) }));
    return { s, log };
  }

  test("consecutive housekeeping calls become one dim line, and only analysis steps get numbers", () => {
    const { log } = feed((s) => {
      s.record.append("user", { text: "compare sleep" });
      s.record.append("tool_call", { callId: "a", tool: "list_dir", args: { path: "/data/sleep" } });
      s.record.append("tool_result", { callId: "a", tool: "list_dir", ok: true, summary: "2 entries" });
      s.record.append("tool_result", { callId: "b", tool: "read_file", ok: true, summary: "Read", effectiveArgs: { path: "/data/sleep/sleep.csv" } });
      s.record.append("permission", { tool: "run_command", decision: "allowed" });
      s.record.append("tool_result", { callId: "c", tool: "run_command", ok: true, summary: "Ran ls", effectiveArgs: { argv: ["/bin/ls", "-l"] } });
      s.record.append("tool_result", { callId: "d", tool: "compare_two_groups", adapter: "biostats", ok: true, summary: "Welch t test" }, { node: "n1" });
      s.record.append("tool_result", { callId: "e", tool: "list_adapters", ok: true, summary: "2 adapters" });
      s.record.append("tool_result", { callId: "f", tool: "describe", adapter: "biostats", ok: true, summary: "Means" }, { node: "n2" });
      s.record.append("assistant", { text: "Done.", final: true });
    });
    const { settled, pending } = mainView(log, true);
    expect(pending).toEqual([]);
    expect(texts(settled)).toEqual([
      "user",
      "· Looked at 1 folder (sleep); Read 1 file (sleep.csv); Ran 1 command (ls)",
      "Step 1 Welch t test",
      "· Checked the adapter list",
      "Step 2 Means",
      "assistant",
    ]);
  });

  test("a failed call that the agent retries joins the dim line; one that blocks shows as a warning", () => {
    const { log } = feed((s) => {
      s.record.append("tool_result", { callId: "a", tool: "run_script", ok: false, error: "NameError: x" });
      s.record.append("assistant", { text: "I fix the column name.", final: false });
      s.record.append("tool_result", { callId: "b", tool: "run_script", ok: true, summary: "Mean 7.1 h" }, { node: "n1" });
      s.record.append("tool_result", { callId: "c", tool: "read_file", ok: false, error: "no such file" });
      s.record.append("assistant", { text: "I cannot read the file.", final: true });
    });
    const out = texts(mainView(log, true).settled);
    expect(out).toEqual(["· Tried run_script again after 1 error", "assistant", "Step 1 Mean 7.1 h", "read_file no such file", "assistant"]);
  });

  test("setup questions read as a short form: one line for each answer", () => {
    const { log } = feed((s) => {
      s.record.append("blocked", { tool: "compare_two_groups", reason: "waiting for the scientist: test", qid: "q1" });
      s.record.append("question", { qid: "q1", title: "Which test?" });
      s.record.append("tool_result", { callId: "a", tool: "read_file", ok: true, summary: "Read", effectiveArgs: { path: "/d/sleep.csv" } });
      s.record.append("answer", { qid: "q1", value: "Welch", by: "human" });
      s.record.append("question", { qid: "q2", title: "Alpha" });
      s.record.append("answer", { qid: "q2", value: 0.05, by: "human" });
    });
    expect(texts(mainView(log, true).settled)).toEqual(["· Read 1 file (sleep.csv)", "✓ Which test? Welch · /change q1", "✓ Alpha: 0.05 · /change q2"]);
  });

  test("several questions at once stay one line for each answer, and the decision lines go to the details view", () => {
    const { log } = feed((s) => {
      s.record.append("question", { qid: "q1", title: "Paired test" });
      s.record.append("question", { qid: "q2", title: "Sidedness" });
      s.record.append("blocked", { tool: "compare_two_groups", reason: "waiting for the scientist: paired, alternative", qid: "q1,q2" });
      s.record.append("answer", { qid: "q1", value: true, by: "human" });
      s.record.append("decision", { key: "paired", old: null, new: true, by: "human", reason: "answer to q1" });
      s.record.append("answer", { qid: "q2", value: "two-sided", by: "human" });
      s.record.append("decision", { key: "alternative", old: null, new: "two-sided", by: "human", reason: "answer to q2" });
      s.record.append("tool_result", { callId: "a", tool: "compare_two_groups", adapter: "biostats", ok: true, summary: "Paired t test" }, { node: "n1" });
    });
    expect(texts(mainView(log, true).settled)).toEqual(["✓ Paired test: true · /change q1", "✓ Sidedness: two-sided · /change q2", "Step 1 Paired t test"]);
    expect(log.flatMap((l) => l.items).some((i) => i.t === "line" && i.text.startsWith("Decision: paired"))).toBe(true);
  });

  test("a step with no agent text before it shows its purpose; code never shows in the settings", () => {
    const { log } = feed((s) => {
      const args = { code: "import x\nprint(1)", purpose: "count nuclei in 24 images", does: "Opens 24 images, finds the nuclei and saves counts.csv." };
      s.record.append("tool_call", { callId: "a", tool: "run_script", args });
      s.record.append("tool_result", { callId: "a", tool: "run_script", ok: true, summary: "The script finished and wrote 1 new file(s).", effectiveArgs: { ...args, timeout_s: 60 } }, { node: "n1" });
      s.record.append("assistant", { text: "Next I compare the groups.", final: false });
      s.record.append("tool_call", { callId: "b", tool: "compare", args: { file: "/d/c.csv" } });
      s.record.append("tool_result", { callId: "b", tool: "compare", adapter: "biostats", ok: true, summary: "Welch t test", effectiveArgs: { file: "/d/c.csv" } }, { node: "n2" });
    });
    const steps = mainView(log, true).settled.filter((i) => i.t === "step") as Extract<Item, { t: "step" }>[];
    expect(steps[0]).toMatchObject({ n: 1, summary: "Opens 24 images, finds the nuclei and saves counts.csv.", why: "count nuclei in 24 images", settings: "timeout s 60" });
    expect(steps[1]).toMatchObject({ n: 2, summary: "Welch t test" });
    expect(steps[1]!.why).toBeUndefined();
  });

  test("the activity line names the state in plain words", () => {
    expect(activityText("running", "Reading sleep.csv", "read_file")).toBe("Reading sleep.csv");
    expect(activityText("running", undefined, "read_file")).toBe("Running read file");
    expect(activityText("waiting")).toBe("Waiting for your answer");
    expect(activityText("thinking", "Waiting to retry (2 of 3)")).toBe("Waiting to retry (2 of 3)");
    expect(activityText("thinking")).toBe("Thinking about the next step");
    expect(activityText("thinking")).toBe("Thinking about the next step");
  });

  test("scripts that only looked at folders join the dim line", () => {
    const { log } = feed((s) => {
      s.record.append("tool_result", { callId: "a", tool: "run_script", ok: true, summary: "x", effectiveArgs: { code: "x", purpose: "find the images", does: "Lists the folders in LDL." } });
      s.record.append("tool_result", { callId: "b", tool: "list_dir", ok: true, summary: "x", effectiveArgs: { path: "/d/LDL" } });
    });
    expect(texts(mainView(log, true).settled)).toEqual(["· Listed folders with a script; Looked at 1 folder (LDL)"]);
  });

  test("a reply that the scientist stopped shows at once, after the failed step that waits", () => {
    const c = new Collapser();
    const { log } = feed((s) => {
      s.record.append("tool_result", { callId: "a", tool: "run_script", ok: false, summary: "The script failed.", error: "The script failed." });
      s.record.append("assistant", { text: "The script failed, so I", final: false });
      s.record.append("assistant", { text: "I try again with", final: false, stopped: true });
    });
    expect(c.add(log[0]!)).toEqual([]);
    expect(c.add(log[1]!)).toEqual([]);
    const out = c.add(log[2]!);
    expect(out.map((i) => i.t)).toEqual(["step", "assistant", "assistant"]);
    expect(out.at(-1)).toMatchObject({ t: "assistant", text: expect.stringContaining("I try again with") });
    expect(c.preview()).toEqual([]);
  });

  test("held lines show in the live area until the next main line", () => {
    const c = new Collapser();
    const { log } = feed((s) => {
      s.record.append("tool_result", { callId: "a", tool: "list_dir", ok: true, summary: "x", effectiveArgs: { path: "/a" } });
      s.record.append("tool_result", { callId: "b", tool: "list_dir", ok: true, summary: "x", effectiveArgs: { path: "/b" } });
    });
    expect(c.add(log[0]!)).toEqual([]);
    expect(c.add(log[1]!)).toEqual([]);
    expect(texts(c.preview())).toEqual(["· Looked at 2 folders (a, b)"]);
    expect(texts(c.add({ items: [{ key: "x", t: "line", sym: "▸", text: "hi" }] }))).toEqual(["· Looked at 2 folders (a, b)", "▸ hi"]);
  });

  test("/details and Ctrl+O show every housekeeping call, and the setting stays", async () => {
    const { h } = start();
    await sleep(100);
    await submit(h, "compare endo and epi");
    await until(() => h.all().includes("Permission needed: run_script"));
    await type(h, "y");
    await until(() => h.all().includes("Which AUC cutoff do you want?"));
    await type(h, "1");
    await until(() => h.all().includes("14 features differ") && h.all().includes("export_table"));
    await sleep(100);
    expect(h.all()).toContain("Ctrl+O: all steps");
    expect(h.all()).not.toContain("read_file  Read 400 of 400 bytes.");
    await submit(h, "/details");
    await until(() => h.all().includes("read_file  Read 400 of 400 bytes."));
    expect(h.all()).toContain("list_dir  3 entries in /data/msi.");
    expect(h.all()).toContain("Ctrl+O: short view");
    h.reset();
    await submit(h, "again");
    await until(() => h.all().includes("Permission needed: run_script"));
    expect(h.all()).toContain("read_file  Read 90 of 90 bytes.");
    h.reset();
    await type(h, "\x0f");
    await until(() => h.all().includes("· Looked at 1 folder (msi)"));
    expect(h.all()).not.toContain("read_file  Read");
  });
});

describe("pieces", () => {
  test("settingsLine keeps scalars only", () => {
    expect(settingsLine({ tolerance_ppm: 5, min_auc: 0.7, nested: { a: 1 }, none: null })).toBe("tolerance ppm 5 · min auc 0.7");
  });

  test("image protocol follows the terminal", () => {
    expect(imageProtocol({ TERM_PROGRAM: "iTerm.app" })).toBe("iterm");
    expect(imageProtocol({ KITTY_WINDOW_ID: "3" })).toBe("kitty");
    expect(imageProtocol({ TERM_PROGRAM: "ghostty", TERM: "xterm-ghostty" })).toBe("kitty");
    expect(imageProtocol({ TERM_PROGRAM: "WezTerm" })).toBe("iterm");
    expect(imageProtocol({ TERM_PROGRAM: "Apple_Terminal" })).toBeUndefined();
    expect(inlineImage("/missing.png", "iterm")).toBeUndefined();
  });

  test("mapper shows a line when the agent loads an adapter, with the reason", () => {
    const s = new FakeSession({ delayMs: 0 });
    const e = s.record.append("adapter", { name: "biostats", version: "0.1.1", programVersion: "0.30.0", reason: "a paired test on a CSV file" });
    expect(new Mapper(s).map(e)).toEqual([{ key: `e${e.id}`, t: "line", sym: "+", color: "cyan", text: "Loaded the adapter biostats 0.1.1 (program 0.30.0): a paired test on a CSV file", dim: undefined }]);
  });

  test("mapper shows the saved files in one green line, and the quiet view keeps it", () => {
    const s = new FakeSession({ delayMs: 0 });
    const text = "Saved: results.xlsx (4 sheets), 3 figures in figures/. Folder: ~/p/work";
    const e = s.record.append("notice", { text, saved: { dir: "/p/work", sheets: 4, figures: 3 } });
    expect(new Mapper(s).map(e)).toEqual([{ key: `e${e.id}`, t: "line", sym: "✓", color: "green", text, dim: undefined }]);
    const { settled } = mainView([{ e, items: new Mapper(s).map(e) }], true);
    expect(settled.map((i) => (i.t === "line" ? i.text : ""))).toEqual([text]);
  });

  test("mapper numbers analysis steps and tracks outputs", () => {
    const s = new FakeSession({ delayMs: 0 });
    const m = new Mapper(s);
    const look = s.record.append("tool_result", { tool: "read_file", ok: true, summary: "Read a.csv" });
    expect(m.map(look)[0]).toMatchObject({ t: "step", n: undefined });
    const e = s.record.append("tool_result", { tool: "t", adapter: "a", ok: true, summary: "Did it", images: ["abc"], files: [], effectiveArgs: {}, manualRoute: "Menu > Item" }, { node: "n1" });
    const [item] = m.map(e);
    expect(item).toMatchObject({ t: "step", n: 1, summary: "Did it", route: "Menu > Item" });
    expect(m.outputs).toHaveLength(1);
  });

  const script = {
    purpose: "Find the ImageJ install",
    does: "Looks for ImageJ in the usual program folders and prints where it is.",
    code: "import shutil\nprint(shutil.which('ImageJ'))",
    timeout_s: 30,
  };

  test("a script step shows the purpose and the plain description, not the code", async () => {
    const s = new FakeSession({ delayMs: 0 });
    const [item] = new Mapper(s).map(s.record.append("tool_result", { tool: "run_script", ok: true, summary: "The script ran in /p and wrote 0 new file(s) to /w.", effectiveArgs: script, manualRoute: "Run the Python code in /w/script-1/script.py" }));
    expect(item).toMatchObject({ t: "step", purpose: script.purpose, summary: script.does, code: script.code, settings: "timeout s 30" });
    const h = makeHarness();
    const app = render(<ItemView item={item!} />, { stdout: h.stdout as never, patchConsole: false });
    await sleep(30);
    app.unmount();
    expect(h.all()).toContain(`${script.purpose}  ${script.does}`);
    expect(h.all()).not.toContain("shutil");
  });

  test("a long user message wraps inside the terminal width with its prefix kept", async () => {
    const h = makeHarness(80, 24);
    const text = "compare endo and epi, and this is a very long message that goes past the end of one line of the terminal at eighty columns wide";
    const app = render(<ItemView item={{ key: "u1", t: "user", text }} />, { stdout: h.stdout as never, patchConsole: false });
    await sleep(30);
    app.unmount();
    const lines = h.last().split("\n").filter(Boolean);
    expect(lines[0]!.startsWith("> compare")).toBe(true);
    expect(lines[1]!.startsWith("  ")).toBe(true);
    expect(Math.max(...lines.map((l) => l.length))).toBeLessThanOrEqual(80);
  });

  test("a status line and a step line that wrap continue under their text, not at column 0", async () => {
    const text = "The referee found a problem with the normalization step and holds the result until you answer the question";
    for (const item of [
      { key: "l1", t: "line", sym: "⚠", color: "yellow", text },
      { key: "l2", t: "line", sym: "✓", color: "green", text },
      { key: "l3", t: "line", sym: "▸", dim: true, text: `${text}\n   and a demonstration before any step runs.` },
      { key: "u1", t: "user", text },
      { key: "s2", t: "step", n: 3, ok: false, tool: "normalize", summary: "Failed", error: text, outputs: [] },
    ] as Item[]) {
      const h = makeHarness(50, 20);
      const app = render(<Static items={[item]}>{(it) => <ItemView key={it.key} item={it} />}</Static>, { stdout: h.stdout as never, patchConsole: false });
      await sleep(30);
      app.unmount();
      const lines = h.term.lines().filter(Boolean);
      expect(lines.length).toBeGreaterThan(2);
      expect(lines.slice(1).every((l) => l.startsWith("  "))).toBe(true);
      expect(h.term.wraps).toBe(0);
    }
  });

  test("a step detail that wraps keeps its indent", async () => {
    const h = makeHarness(50, 20);
    const item: Item = { key: "s1", t: "step", n: 2, ok: true, tool: "normalize", summary: "Normalized", route: "Preprocess > Normalization", settings: "method TIC · log transform false", outputs: [] };
    const app = render(<ItemView item={item} />, { stdout: h.stdout as never, patchConsole: false });
    await sleep(30);
    app.unmount();
    const lines = h.last().split("\n").filter(Boolean);
    expect(lines.length).toBeGreaterThan(2);
    expect(lines.slice(1).every((l) => l.startsWith("  "))).toBe(true);
  });

  test("a command step hides the argument list", () => {
    const s = new FakeSession({ delayMs: 0 });
    const [item] = new Mapper(s).map(s.record.append("tool_result", { tool: "run_command", ok: true, summary: "Ran ls.", effectiveArgs: { purpose: "List the images", does: "Lists the image folder.", argv: ["ls", "-la"] } }));
    expect(item).toMatchObject({ purpose: "List the images", summary: "Lists the image folder.", code: "ls -la", settings: "" });
  });

  test("the running line gives the purpose, and after 5 s the time and how to stop", () => {
    expect(runningText("run_script", script.purpose, 2)).toBe("Find the ImageJ install");
    expect(runningText("run_script", script.purpose, 12)).toBe("Find the ImageJ install · 12 s · Esc stops it");
    expect(runningText("list_dir", undefined, 75)).toBe("Running list_dir · 1 min 15 s · Esc stops it");
  });

  test("the live screen shows the purpose and the elapsed time of a running call", async () => {
    const { h, s } = start();
    await sleep(100);
    s.bus.emit({ type: "status", state: "running", tool: "run_script", purpose: script.purpose, since: Date.now() - 12_000 });
    await until(() => /Find the ImageJ install · 1\d s · Esc stops it/.test(h.all()));
    expect(h.all()).not.toContain("running run_script");
  });
});

describe("bypass permissions", () => {
  test("/permissions bypass shows the marker and logs the change; /permissions ask removes it", async () => {
    const { h, s } = start();
    await sleep(100);
    expect(h.last()).not.toContain("bypass permissions ·");
    await submit(h, "/permissions bypass");
    await until(() => s.permissionMode === "bypass" && h.last().includes("bypass permissions ·"));
    expect(h.all()).toContain("Bypass permissions is on.");
    expect(h.all()).toContain("Method decisions stay with you");
    await submit(h, "/permissions ask");
    await until(() => s.permissionMode === "ask" && !h.last().includes("bypass permissions ·"));
    expect(s.record.entries(["permission_mode"]).map((e) => e.data.new)).toEqual(["bypass", "ask"]);
  });

  test("/decisions agent gives the scientist's decisions to the agent; /decisions me takes them back", async () => {
    const { h, s } = start();
    await sleep(100);
    s.setOwner("seed", "fixed");
    const human = s.decisions.fields().filter((f) => s.decisions.owner(f.key) === "human").map((f) => f.key);
    expect(human.length).toBeGreaterThan(0);
    await submit(h, "/decisions agent");
    await until(() => human.every((k) => s.decisions.owner(k) === "agent"));
    expect(s.decisions.owner("seed")).toBe("fixed");
    await submit(h, "/decisions me");
    await until(() => s.decisions.fields().every((f) => s.decisions.owner(f.key) !== "agent"));
    expect(s.decisions.owner("seed")).toBe("fixed");
  });
});

describe("plan card", () => {
  const question = (sid: string) => ({
    qid: "q9",
    session: sid,
    decisionKey: "alpha",
    title: "Significance level",
    text: "Step 2 of the plan needs this decision.",
    options: [{ value: 0.05, label: "0.05" }, { value: 0.01, label: "0.01" }],
    recommendation: { value: 0.05, reason: "The agent recommends it in the plan." },
    evidence: "",
    status: "open" as const,
    created: "",
  });

  test("the hint, then the plan with its open decision in the question card style; m sets the mode and a approves", async () => {
    const { h, s } = start();
    await until(() => h.all().includes("Type /plan to get questions, proposed metrics and a demonstration before any step runs."));
    s.proposePlan("Question: Does drug 2 help?\n\nSteps\n1. Paired t test", [question(s.id)]);
    await until(() => h.all().includes("Proposed metrics, version 1"));
    expect(h.all()).toContain("Question: Does drug 2 help?");
    await until(() => h.all().includes("Your decision: Significance level"));
    expect(h.all()).toContain("Open setting 1 of 1.");
    await type(h, "2");
    await until(() => h.all().includes("m mode watch"));
    expect(s.record.entries(["answer"])[0]!.data.value).toBe(0.01);
    await type(h, "m");
    await until(() => h.all().includes("m mode follow"));
    await type(h, "a");
    await until(() => s.planResponses.length === 1);
    expect(s.planResponses[0]).toEqual({ action: "approve", mode: "follow" });
  });

  test("c sends a change, p offers the other program, x cancels", async () => {
    const { h, s } = start();
    await sleep(100);
    const programs = [{ part: "Statistics", adapter: "biostats", alternatives: ["lme4"] }];
    s.proposePlan("Question: Q1", [], programs);
    await until(() => h.all().includes("p program"));
    await sleep(50);
    await type(h, "c");
    await until(() => h.all().includes("What must change?"));
    await type(h, "Use a Wilcoxon test.");
    h.type("\r");
    await until(() => s.planResponses.length === 1);
    expect(s.planResponses[0]).toEqual({ action: "change", text: "Use a Wilcoxon test." });
    s.proposePlan("Question: Q2", [], programs);
    await sleep(100);
    await type(h, "p");
    await until(() => h.all().includes("1 Use lme4 for Statistics, not biostats."));
    await type(h, "1");
    await until(() => s.planResponses.length === 2);
    expect(s.planResponses[1]).toEqual({ action: "change", text: "Use lme4 for Statistics, not biostats." });
    s.proposePlan("Question: Q3");
    await sleep(100);
    await type(h, "x");
    await until(() => s.planResponses.length === 3);
    expect(s.planResponses[2]).toEqual({ action: "cancel" });
  });
});

describe("proposed analysis card", () => {
  const plan = (s: FakeSession, extra: Record<string, unknown>) =>
    s.bus.emit({ type: "plan", stage: "plan", version: 1, text: "Question: Q", update: false, qids: [], programs: [], mode: "watch", ...extra } as never);

  test("Questions: what the agent found, then one question card at a time", async () => {
    const { h, s } = start();
    await sleep(100);
    const mk = (qid: string, text: string, options: string[]) => ({ qid, session: s.id, decisionKey: "", title: text, text, options: options.map((o) => ({ value: o, label: o })), evidence: "", status: "open" as const, created: "" });
    s.clarify("I see 6 groups, 139 fields, 2 channels plus an overlay in each field.", [mk("q1", "What counts as one n?", ["One Set", "One field"]), mk("q2", "What counts as a positive cell?", ["Any red inside the outline", "Red covers most of the cell"])], ["Which groups to compare? The request says: all six."]);
    await until(() => h.all().includes("I see 6 groups, 139 fields"));
    expect(h.all()).toContain("Questions");
    expect(h.all()).toContain("Question 1 of 2");
    expect(h.all()).toContain("Not asked, because your request answers it: Which groups to compare?");
    await type(h, "1");
    await until(() => h.all().includes("Question 2 of 2"));
    await type(h, "o");
    await type(h, "At least 1 red pixel");
    h.type("\r");
    await until(() => s.record.entries(["answer"]).length === 2);
    expect(s.record.entries(["answer"]).map((e) => e.data.value)).toEqual(["One Set", "At least 1 red pixel"]);
  });

  test("Questions: the data check, the design notes and the sample sheet; a typed edit changes a cell", async () => {
    const { h, s } = start();
    await sleep(100);
    const check = "Data check of Ox-LDL: 35 files in 6 folders, 2 channels (green, red).\nProblems found in the data:\n- 1 field has no 'red' image: Control/Set 3/Set 3_02.\nAlso found:\n- The names spell one part in 2 ways: '20x' (30 files) and '20X' (5 files).";
    const mk = (qid: string, title: string, text: string, options: string[], evidence = "") => ({ qid, session: s.id, decisionKey: "", title, text, options: options.map((o) => ({ value: o, label: o })), evidence, status: "open" as const, created: "" });
    const evidence = "#  sample             group     unit   batch  path\n1  Ceramide Set 1_01  Ceramide  Set 1         Ox-LDL/Ceramide/Set 1/Set 1_01*\nCeramide: 3 Sets, 9 samples; Control: 3 Sets, 9 samples.";
    s.clarify("I see 2 groups.", [mk("q1", "Data check: missing images", "1 field has no 'red' image (Control/Set 3/Set 3_02). Leave this field out, or stop?", ["leave_out", "stop"]), mk("q2", "Sample sheet", "The agent made this sample sheet. Is it correct?", ["accept", "reload"], evidence)], [], { check, notes: ["n is the Set. n per group: Ceramide 3 (9 samples), Control 3 (9 samples)."] });
    await until(() => h.all().includes("Data check of Ox-LDL"));
    expect(h.all()).toContain("1 field has no 'red' image: Control/Set 3/Set 3_02.");
    expect(h.all()).toContain("Design notes");
    expect(h.all()).toContain("! n is the Set.");
    await type(h, "1");
    await until(() => h.all().includes("Ceramide Set 1_01"));
    expect(h.all()).toContain("Ceramide: 3 Sets, 9 samples");
    await type(h, "o");
    await type(h, "1 batch Day 1");
    h.type("\r");
    await until(() => s.record.entries(["answer"]).length === 2);
    expect(s.record.entries(["answer"]).map((e) => e.data.value)).toEqual(["leave_out", "1 batch Day 1"]);
  });

  test("/samples shows the sheet, changes a cell and shows the data check", async () => {
    const { h, s } = start();
    await sleep(100);
    s.sheet = { rows: [{ sample: "Cer Set 1_01", group: "Cer", unit: "Set 1", batch: "", path: "Cer/Set 1/Set 1_01.tif" }], path: "/out/samples.csv", from: "the folder and file names" };
    s.record.append("data_check", { source: "/data/Ox-LDL", text: "Data check of Ox-LDL: 2 files in 1 folder.\nNo missing channels, name problems or odd files." });
    await submit(h, "/samples");
    await until(() => h.all().includes("Saved as /out/samples.csv"));
    expect(h.all()).toContain("Cer Set 1_01");
    await submit(h, "/samples 1 group Ceramide");
    await until(() => h.all().includes("Row 1: group is now Ceramide."));
    expect(s.sheet.rows[0]!.group).toBe("Ceramide");
    await submit(h, "/samples check");
    await until(() => h.all().includes("No missing channels, name problems or odd files."));
  });

  test("the settings are pre-filled and a number changes one", async () => {
    const { h, s } = start();
    await sleep(100);
    plan(s, {
      text: "Metrics\n[1] n: one Set\n\nSteps\n1. Outline the cells\n   [2] cell model: cyto3 (default)",
      details: "Data\n- Files: 139 fields",
      definitions: [{ measure: "n", definition: "one Set" }],
      settings: [{ index: 0, step: 1, label: "cell model", value: "cyto3", by: "default", options: ["cyto3", "nuclei"] }],
    });
    await until(() => h.all().includes("[2] cell model: cyto3 (default)"));
    expect(h.all()).not.toContain("139 fields");
    await type(h, "d");
    await until(() => h.all().includes("139 fields"));
    await type(h, "2");
    await until(() => h.all().includes("Choose a new value"));
    await type(h, "2");
    await until(() => s.planResponses.length === 1);
    expect(s.planResponses[0]).toEqual({ action: "set", index: 0, value: "nuclei" });
  });

  test("the reference question, a changed definition, and Run the pilot", async () => {
    const { h, s } = start();
    await sleep(100);
    const reference = { question: "I found Analysis.xlsx (sheet Ox-LDL: Red dots). Is this an earlier analysis of these images? Should the pilot compare with it?", candidates: [{ path: "/p/Analysis.xlsx", sheet: "Ox-LDL", columns: ["Red dots"], label: "Analysis.xlsx" }] };
    const definitions = [{ measure: "positive cell", definition: "At least 1 red pixel." }];
    plan(s, { reference, definitions, pilot: "Set 1" });
    await until(() => h.all().includes("Should the pilot compare with it?"));
    expect(h.all()).toContain("2 Yes. Hold it back (blind test)");
    await type(h, "2");
    await until(() => h.all().includes("r run the demonstration on Set 1"));
    expect(h.all()).toContain("Reference: /p/Analysis.xlsx (held back for a blind test)");
    await type(h, "r");
    await until(() => s.planResponses.length === 1);
    expect(s.planResponses[0]).toEqual({ action: "pilot", mode: "watch", reference: { mode: "blind", path: "/p/Analysis.xlsx", sheet: "Ox-LDL" } });

    plan(s, { definitions, pilot: "Set 1", version: 2 });
    await until(() => h.all().includes("Proposed metrics, version 2"));
    await sleep(150);
    await type(h, "1");
    await until(() => h.all().includes("New definition of positive cell (now: At least 1 red pixel.):"));
    await type(h, "At least 5 red pixels.");
    h.type("\r");
    await until(() => s.planResponses.length === 2);
    expect(s.planResponses[1]).toEqual({ action: "change", text: "Change the definition of positive cell to: At least 5 red pixels.", definition: { measure: "positive cell", old: "At least 1 red pixel.", new: "At least 5 red pixels." } });
  });

  test("the demonstration asks: Confirm and run all?", async () => {
    const { h, s } = start();
    await sleep(100);
    s.bus.emit({ type: "plan", stage: "pilot", version: 1, text: "Pilot sample: Set 1\n\nNumbers\n- positive cell: 296", update: false, qids: [], programs: [], mode: "watch" });
    await until(() => h.all().includes("Confirm and run all?"));
    expect(h.all()).toContain("Demonstration on a sample");
    expect(h.all()).toContain("3 Try another sample");
    await type(h, "3");
    await until(() => s.planResponses.length === 1);
    expect(s.planResponses[0]).toEqual({ action: "another" });
    s.bus.emit({ type: "plan", stage: "pilot", version: 1, text: "Pilot sample: Set 2", update: false, qids: [], programs: [], mode: "watch" });
    await sleep(150);
    await type(h, "1");
    await until(() => s.planResponses.length === 2);
    expect(s.planResponses[1]).toEqual({ action: "confirm" });
  });
});

describe("question sequence", () => {
  const mk = (s: FakeSession, qid: string, title: string, options: string[], rec?: string, decisionKey = "") => ({ qid, session: s.id, decisionKey, title, text: `${title} (text)`, options: options.map((o) => ({ value: o, label: o })), recommendation: rec ? { value: rec, reason: "" } : undefined, evidence: "", status: "open" as const, created: "" });
  const three = (s: FakeSession) => s.askMany([mk(s, "q1", "One n", ["one Set", "one field"], "one Set"), mk(s, "q2", "Positive cell", ["any red", "most red"], "most red"), mk(s, "q3", "Groups", ["all six", "two"])]);
  const yourCards = (h: Harness) => (h.term.view().match(/Your decision:/g) ?? []).length;

  test("the first question opens at once with a count; Enter accepts the recommendation and the next opens by itself; arrows choose", async () => {
    const { h, s } = start();
    await until(() => h.all().includes("Type /plan"));
    three(s);
    await until(() => h.term.view().includes("Question 1 of 3"));
    expect(h.term.view()).toContain("Your decision: One n");
    expect(yourCards(h)).toBe(1);
    expect(h.term.view()).toMatch(/▸ 1 one Set \(recommended\)/);
    h.type("\r");
    await until(() => h.term.view().includes("Question 2 of 3"));
    expect(s.record.entries(["answer"])[0]!.data).toMatchObject({ qid: "q1", value: "one Set" });
    await until(() => h.all().includes("✓ One n: one Set · /change q1"));
    expect(h.term.view()).toMatch(/▸ 2 most red \(recommended\)/);
    h.type("\x1b[A");
    await until(() => /▸ 1 any red/.test(h.term.view()));
    await settle();
    h.type("\r");
    await until(() => h.term.view().includes("Question 3 of 3"));
    expect(s.record.entries(["answer"])[1]!.data).toMatchObject({ qid: "q2", value: "any red" });
    expect(h.term.view()).toContain("There is no recommendation for Groups. Choose one of the options.");
    await type(h, "2");
    await until(() => s.questions.open().length === 0);
    await until(() => !h.term.view().includes("Your decision:"));
    expect(s.record.entries(["answer"]).map((e) => e.data.value)).toEqual(["one Set", "any red", "two"]);
  });

  test("Back opens the previous question with its answer selected and changes it; Esc leaves, and the next message brings the questions back", async () => {
    const { h, s } = start();
    await until(() => h.all().includes("Type /plan"));
    three(s);
    await until(() => h.term.view().includes("Question 1 of 3"));
    await settle();
    await type(h, "2");
    await until(() => h.term.view().includes("Question 2 of 3"));
    await settle();
    h.type("\x1b[D");
    await until(() => h.term.view().includes("Question 1 of 3"));
    expect(h.term.view()).toMatch(/▸ 2 one field/);
    await type(h, "1");
    await until(() => h.term.view().includes("Question 2 of 3"));
    expect(s.record.entries(["answer"]).at(-1)!.data).toMatchObject({ qid: "q1", value: "one Set", changed: true, old: "one field" });
    await until(() => h.all().includes("Changed One n: one field → one Set · /change q1"));
    await settle();
    h.type("\x1b");
    await until(() => !h.term.view().includes("Your decision:"));
    expect(h.all()).toContain("The questions stay open. They come back with your next message or with /questions.");
    expect(s.questions.open().map((q) => q.qid)).toEqual(["q2", "q3"]);
    await submit(h, "hello");
    await until(() => h.term.view().includes("Your decision: Positive cell"));
    expect(h.term.view()).toContain("Question 1 of 2");
  });
});

describe("/change", () => {
  test("/change lists the answers newest first; Enter opens one with its value selected; a new value is logged", async () => {
    const { h, s } = start();
    await until(() => h.all().includes("Type /plan"));
    s.askMany([{ qid: "q1", session: s.id, decisionKey: "", title: "One n", text: "What is one n?", options: [{ value: "one Set", label: "one Set" }, { value: "one field", label: "one field" }], evidence: "", status: "open", created: "" }]);
    await until(() => h.term.view().includes("Your decision: One n"));
    await settle();
    await type(h, "2");
    await until(() => s.questions.open().length === 0);
    await until(() => !h.term.view().includes("Your decision:"));
    await settle();
    await submit(h, "/change");
    await until(() => h.term.view().includes("Change an answer"));
    expect(h.term.view()).toMatch(/▸ 1 One n: one field/);
    h.type("\r");
    await until(() => h.term.view().includes("Change: One n"));
    expect(h.term.view()).toMatch(/▸ 2 one field/);
    await type(h, "1");
    await until(() => s.record.entries(["answer"]).some((e) => e.data.changed));
    expect(s.record.entries(["answer"]).at(-1)!.data).toMatchObject({ qid: "q1", value: "one Set", old: "one field" });
    await until(() => h.all().includes("One n is now one Set."));
  });

  test("/change <id> opens one directly, and Tab completion suggests the ids with their labels", async () => {
    const { h, s } = start();
    await until(() => h.all().includes("Type /plan"));
    s.askMany([{ qid: "q1", session: s.id, decisionKey: "", title: "One n", text: "What is one n?", options: [{ value: "one Set", label: "one Set" }, { value: "one field", label: "one field" }], evidence: "", status: "open", created: "" }]);
    await until(() => h.term.view().includes("Your decision: One n"));
    await settle();
    await type(h, "1");
    await until(() => !h.term.view().includes("Your decision:"));
    expect(suggestions("/change q", s).map((c) => [c.name, c.help])).toEqual([["change q1", "One n: one Set"]]);
    expect(suggestions("/change one", s).map((c) => c.name)).toEqual(["change q1"]);
    await type(h, "/change q");
    await until(() => h.term.view().includes("/change q1"));
    await settle();
    h.type("\t");
    await sleep(40);
    h.type("\r");
    await until(() => h.term.view().includes("Change: One n"));
  });
});

describe("Questions stage", () => {
  test("Back in the Questions card opens the previous question and changes its answer", async () => {
    const { h, s } = start();
    await until(() => h.all().includes("Type /plan"));
    const mk = (qid: string, text: string, options: string[]) => ({ qid, session: s.id, decisionKey: "", title: text, text, options: options.map((o) => ({ value: o, label: o })), evidence: "", status: "open" as const, created: "" });
    s.clarify("Each field has 2 images: CH1 is brightfield, CH3 is red fluorescence.", [mk("q1", "What counts as one n?", ["One Set", "One field"]), mk("q2", "What counts as a positive cell?", ["Any red", "Most red"])]);
    await until(() => h.term.view().includes("Question 1 of 2"));
    await settle();
    await type(h, "1");
    await until(() => h.term.view().includes("Question 2 of 2"));
    await settle();
    h.type("\x1b[D");
    await until(() => h.term.view().includes("Question 1 of 2"));
    expect(h.term.view()).toMatch(/▸ 1 One Set/);
    await type(h, "2");
    await until(() => h.term.view().includes("Question 2 of 2"));
    expect(s.record.entries(["answer"]).at(-1)!.data).toMatchObject({ qid: "q1", value: "One field", changed: true });
  });
});
