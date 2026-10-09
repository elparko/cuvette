import { afterEach, describe, expect, test } from "vitest";
import { runTui } from "../src/tui/app.tsx";
import { FakeSession } from "../src/tui/fake-session.ts";
import { imageProtocol, inlineImage } from "../src/tui/image.ts";
import { Collapser, Mapper, mainView, settingsLine, type Item, type Logged } from "../src/tui/items.ts";
import { tableLines } from "../src/tui/markdown.tsx";
import { makeHarness, sleep, until, type Harness } from "../src/tui/testing.ts";
import { renderGraph, suggestions } from "../src/tui/commands.ts";

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

  test("shows steps with route, settings, fidelity, deviation and failure", async () => {
    const { h } = start();
    await sleep(100);
    await submit(h, "compare endo and epi");
    await until(() => h.all().includes("Permission needed: run_script"));
    await type(h, "y");
    await until(() => h.all().includes("Which AUC cutoff do you want?"));
    await type(h, "1");
    try {
      await until(() => h.all().includes("14 features differ between endo and epi at AUC 0.7.") && h.all().includes("✗ export_table") && /open\s+with\s+\/open 1/.test(h.all()));
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
    expect(text).toMatch(/image:\s*[\s\S]*\.png[\s\S]*\(open\s+with\s+\/open 1\)/);
    expect(text).toContain("✗ export_table  Folder is read-only");
    expect(text).not.toContain("Step 4");
    expect(text).toContain("· Looked at 1 folder (msi); Read 2 files (endo_epi.imzML, samples.csv)");
    expect(text).not.toContain("read_file");
    expect(text).toContain("◇ code only: no manual route");
    expect(text).toMatch(/\d+(\.\d)?k? in \/ \d+ out/);
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
});

describe("queue", () => {
  test("a message typed while busy waits and is sent when the turn ends", async () => {
    const { h, s } = start();
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
  test("permission card lists the code once", async () => {
    const { h } = start();
    await sleep(100);
    await submit(h, "go");
    await until(() => h.all().includes("Permission needed: run_script"));
    expect(h.all().match(/import numpy as np/g)).toHaveLength(1);
  });

  test("permission: n asks for a note and denies", async () => {
    const { h, s } = start();
    await sleep(100);
    await submit(h, "go");
    await until(() => h.all().includes("Permission needed: run_script"));
    expect(h.all()).toContain("1 import numpy as np");
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

  test("setup card edits a field and saves", async () => {
    const { h, s } = start({ autoSetup: true });
    await until(() => h.all().includes("Setup: your choices for this analysis"));
    h.type("\r");
    await sleep(600);
    await type(h, "Does X differ?");
    h.type("\r");
    await sleep(600);
    await type(h, "\x1b[B");
    h.type("\r");
    await sleep(600);
    await type(h, "\x7f");
    await type(h, "12");
    h.type("\r");
    await sleep(600);
    for (let i = 0; i < 6; i++) {
      await type(h, "\x1b[B");
      await sleep(60);
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
    const old = process.env.GA_HOME;
    process.env.GA_HOME = mkdtempSync(join(tmpdir(), "ga-tui-key-"));
    try {
      const h = makeHarness();
      const s = new FakeSession({ delayMs: 0 });
      s.model = { ...s.model, provider: "claude", model: "claude-opus-5-5" };
      const done = runTui(s, { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {} });
      live = { h, s, done };
      await until(() => h.all().includes("Claude API key"));
      expect(h.all()).toContain("No Claude API key is set");
      await submit(h, "abc");
      await until(() => h.all().includes("A Claude API key starts with sk-ant-."));
      expect(h.all()).not.toContain("abc");
      await type(h, "\x1b");
      await until(() => h.last().includes("Ask for an analysis step"));
    } finally {
      if (old === undefined) delete process.env.GA_HOME;
      else process.env.GA_HOME = old;
    }
  });

  test("/key opens the card and /key status reports no key", async () => {
    const { h } = start();
    await submit(h, "/key status");
    await until(() => h.all().includes("No Claude API key is set") || h.all().includes("comes from"));
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
    expect(texts(mainView(log, true).settled)).toEqual(["· Read 1 file (sleep.csv)", "✓ Which test? Welch", "✓ Alpha: 0.05"]);
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
    h.frames.length = 0;
    await submit(h, "again");
    await until(() => h.all().includes("Permission needed: run_script"));
    expect(h.all()).toContain("read_file  Read 90 of 90 bytes.");
    await type(h, "\x0f");
    const after = (a: string, b: string) => h.all().lastIndexOf(a) > h.all().lastIndexOf(b);
    await until(() => after("Ctrl+O: all steps", "Ctrl+O: short view"));
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
});
