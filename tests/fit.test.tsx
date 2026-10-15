import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { RESIZE_MS, runTui } from "../src/tui/app.tsx";
import { FakeSession } from "../src/ui/fake-session.ts";
import { Session } from "../src/core/session.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import type { SessionLike } from "../src/tui/types.ts";
import { makeHarness, sleep, until, type Harness } from "../src/tui/testing.ts";
import { Last } from "../src/tui/fit.tsx";
import { Text, render } from "ink";
import React from "react";

let live: { h: Harness; done: Promise<void> } | undefined;

function start(columns = 100, rows = 40, session?: SessionLike) {
  const h = makeHarness(columns, rows);
  const s = session ?? new FakeSession({ delayMs: 0 });
  const done = runTui(s, { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {} });
  live = { h, done };
  return { h, s: s as FakeSession };
}

async function resize(h: Harness, columns: number, rows: number) {
  h.resize(columns, rows);
  await sleep(RESIZE_MS + 150);
  const lines = h.term.lines();
  for (const l of lines) expect(l.length).toBeLessThanOrEqual(columns);
  expect(h.term.wraps).toBe(0);
  return lines;
}

const once = (lines: string[], part: string) => expect(lines.filter((l) => l.includes(part))).toHaveLength(1);

afterEach(async () => {
  if (!live) return;
  live.h.type("\x03");
  await sleep(20);
  live.h.type("\x03");
  await Promise.race([live.done, sleep(500)]);
  live = undefined;
});

const count = (text: string, part: string) => text.split(part).length - 1;
const planText = Array.from({ length: 200 }, (_, i) => `Plan line ${String(i + 1).padStart(3, "0")} of the proposed analysis.`).join("\n");

describe("a card taller than the terminal", () => {
  test("shows the card text once, inside the rows, while timers and status events tick", async () => {
    const { h, s } = start(100, 40);
    await until(() => h.all().includes("Type /plan"));
    s.bus.emit({ type: "status", state: "thinking", since: Date.now() });
    s.proposePlan(planText);
    await until(() => h.all().includes("approve and start"));
    for (let i = 0; i < 20; i++) {
      s.bus.emit({ type: "status", state: "running", tool: "run_script", since: Date.now() - 9000 });
      await sleep(100);
    }
    await sleep(300);
    const lines = h.term.lines();
    const text = lines.join("\n");
    expect(count(text, "Plan line 001 ")).toBe(1);
    expect(count(text, "Proposed metrics, version 1")).toBe(1);
    expect(h.all()).not.toContain("Plan line 040 ");
    expect(h.term.view()).toContain("approve and start");
    expect(h.term.view()).toMatch(/lines 1–\d+ of 201 · .*scroll/);
    expect(h.term.view()).toContain("Waiting for your answer");
    expect(h.all()).not.toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/);
    const quiet = h.frames.length;
    await sleep(1500);
    expect(h.frames.length).toBe(quiet);
  });

  test("PgDn and the arrows scroll inside the card and its keys still work", async () => {
    const { h, s } = start(100, 30);
    await until(() => h.all().includes("Type /plan"));
    s.proposePlan(planText);
    await until(() => h.term.view().includes("of 201"));
    h.type("\x1b[6~");
    await until(() => h.term.view().includes("Plan line 030 "));
    h.type("\x1b[B");
    await sleep(50);
    expect(h.all()).not.toContain("Plan line 200 ");
    expect(h.term.view()).toContain("approve and start");
    h.type("a");
    await until(() => s.planResponses.length === 1);
    expect(s.planResponses[0]).toEqual({ action: "approve", mode: "watch" });
  });
});

describe("Last", () => {
  test("shows only the last rows of tall content", async () => {
    const h = makeHarness(60, 20);
    const app = render(
      <Last max={3}>
        {Array.from({ length: 10 }, (_, i) => (
          <Text key={i}>{`row ${i + 1}`}</Text>
        ))}
      </Last>,
      { stdout: h.stdout, stdin: h.stdin, patchConsole: false },
    );
    await sleep(100);
    const view = h.term.lines();
    app.unmount();
    expect(view).toEqual(["row 8", "row 9", "row 10"]);
  });
});

describe("resize", () => {
  test("after each resize the transcript shows once, every line fits, and the open card still takes its keys", async () => {
    const { h, s } = start(100, 40);
    await until(() => h.all().includes("Type /plan"));
    h.type("compare endo and epi");
    await sleep(40);
    h.type("\r");
    await until(() => h.term.view().includes("Permission needed: run_script"));
    h.type("y");
    await until(() => h.term.view().includes("Enter accepts"));
    for (const [c, r] of [[60, 30], [120, 30], [45, 14], [100, 40]] as const) {
      const lines = await resize(h, c, r);
      once(lines, "> compare endo and epi");
      once(lines, "Step 1");
      once(lines, "Cuvette");
      once(lines, "Your decision: Which AUC cutoff");
      expect(h.term.view()).toContain("Enter accepts");
    }
    expect(h.term.view()).toContain("2 0.8 (6 features)");
    h.type("2");
    await until(() => s.record.entries(["answer"]).length === 1);
    expect(s.record.entries(["answer"])[0]!.data.value).toBe(0.8);
    await until(() => h.term.view().includes("14 features differ between endo and epi at AUC 0.8."));
  });
});

describe("resume", () => {
  test("an open question from the last run shows as a card again and takes its answer", async () => {
    process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-fit-"));
    const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
    const adapters = [join(__dirname, "fixtures/lab")];
    const first = await Session.create({
      adapters,
      cwd,
      provider: new FakeProvider([
        { text: "I will blur, then count.", calls: [{ name: "blur", args: { input: "/data/a.tif", sigma: 2 } }] },
        { calls: [{ name: "count", args: { input: "/data/a.tif", method: "Otsu", min_size: 10 } }] },
      ]),
    });
    first.decisions.applySetup({ question: "How many particles?" });
    const asked = new Promise<void>((r) => first.bus.on((e) => e.type === "question" && r()));
    void first.send("Count the particles in a.tif").catch(() => {});
    await asked;
    await first.close();

    const again = await Session.resume(first.id, { cwd, addAdapters: adapters, provider: new FakeProvider([{ text: "Counted with the answer." }]) });
    const qid = again.questions.open()[0]!.qid;
    const { h } = start(100, 40, again as unknown as SessionLike);
    await until(() => h.term.view().includes("Your decision:"));
    await resize(h, 70, 24);
    expect(h.term.view()).toContain("Enter accepts");
    h.type("1");
    await until(() => again.record.entries(["answer"]).some((e) => e.data.qid === qid));
    expect(again.questions.open()).toHaveLength(0);
    await again.close();
  });
});

describe("bottom of the terminal", () => {
  const atBottom = (h: Harness, rows: number) => {
    const view = h.term.view().split("\n");
    expect(view).toHaveLength(rows);
    let last = view.length - 1;
    while (last > 0 && !view[last]!.trim()) last--;
    expect(last).toBeGreaterThanOrEqual(rows - 2);
    const box = view.findLastIndex((l) => l.startsWith("╰"));
    expect(box).toBeGreaterThan(rows - 8);
    const seen = h.term.lines().filter((l) => /[a-z]/i.test(l) && !/^[╭╰│]/.test(l));
    expect(new Set(seen).size).toBe(seen.length);
  };

  for (const rows of [40, 80]) {
    test(`at ${rows} rows the input box sits on the bottom rows after start, /clear and a resize`, async () => {
      const { h } = start(100, rows);
      await until(() => h.term.view().includes("Type /plan"));
      await sleep(100);
      atBottom(h, rows);
      h.type("/clear");
      await sleep(40);
      h.type("\r");
      await until(() => !h.term.view().includes("Type /plan"));
      await sleep(100);
      atBottom(h, rows);
      h.type("/help");
      await sleep(40);
      h.type("\r");
      await sleep(200);
      await resize(h, 80, rows - 10);
      atBottom(h, rows - 10);
    });
  }

  test("five turns with cards append in place: no clear, no jump to the top, the scrollback keeps its order", async () => {
    const { h, s } = start(100, 40);
    await until(() => h.term.view().includes("Type /plan"));
    await sleep(100);
    const from = h.frames.length;
    for (let i = 1; i <= 5; i++) {
      h.type(`message ${i}`);
      await sleep(40);
      h.type("\r");
      await until(() => h.term.view().includes("Permission needed: run_script"));
      h.type("y");
      await until(() => h.term.view().includes("a number answers at once"));
      h.type("1");
      await until(() => s.record.entries(["answer"]).length === i && !s.busy);
      await sleep(100);
    }
    const out = h.frames.slice(from).join("");
    expect(out).not.toMatch(/\x1b\[[23]J/);
    expect(out).not.toMatch(/\x1b\[(\d*;\d*)?H/);
    const lines = h.term.lines();
    const at = [1, 2, 3, 4, 5].map((i) => lines.findIndex((l) => l === `> message ${i}`));
    expect(at.every((x) => x >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    for (let i = 1; i <= 5; i++) once(lines, `> message ${i}`);
    expect(lines.filter((l) => l.includes("14 features differ between endo and epi at AUC 0.7."))).toHaveLength(5);
  });

  test("the input box keeps its row when the status line comes and goes", async () => {
    const { h, s } = start(100, 40);
    await until(() => h.term.view().includes("Type /plan"));
    await sleep(100);
    const row = () => h.term.view().split("\n").findLastIndex((l) => l.startsWith("╰"));
    const idle = row();
    s.bus.emit({ type: "status", state: "thinking", since: Date.now() });
    await until(() => h.term.view().includes("Thinking about the next step"));
    expect(row()).toBe(idle);
    s.bus.emit({ type: "status", state: "idle" });
    await until(() => !h.term.view().includes("Thinking about the next step"));
    expect(row()).toBe(idle);
  });
});

describe("the proposed metrics card in a 40-row terminal", () => {
  test("the efferocytosis plan fits without scrolling: every metric, action and program is one line, and the details stay folded", async () => {
    const { planText, settingsOf } = await import("../src/core/plan.ts");
    const plan = {
      restatement: "You want: the percent of macrophages that ate red apoptotic cells, control against treated, with one Set as one n.",
      definitions: [
        { measure: "n", definition: "one Set (4 per group); the fields of a Set are pooled." },
        { measure: "cell", definition: "an object in CH1 (brightfield) of 300 to 15,000 px, outlined with Cellpose cyto3." },
        { measure: "positive cell", definition: "a cell with at least 1 red pixel (CH3, Otsu threshold per image) inside its outline." },
        { measure: "efferocytosis index", definition: "positive cells / all cells x 100 for each n." },
      ],
      exclusions: [{ what: "Cells that touch the image edge.", effect: "About 6% of the cells." }],
      data: { files: ["images/ (6 groups, 139 fields)"], row: "One cell.", replicate: "One Set.", n: "4 Sets per group." },
      programs: [{ part: "Cell outlines", adapter: "cellpose", program: "Cellpose", why: "It outlines cells in brightfield.", alternatives: ["imagej"] }, { part: "Statistics", adapter: "biostats", program: "SciPy", why: "It compares the groups.", alternatives: [] }],
      steps: [
        { step: "Outline the cells in CH1", status: "todo", decisions: [{ label: "Cell model", value: "cyto3", by: "default" }, { label: "Cell size (px)", value: "300 to 15,000", by: "agent" }] },
        { step: "Find red in CH3", status: "todo", decisions: [{ label: "Red threshold", value: "Otsu per image", by: "agent" }] },
        { step: "Count positive cells per Set", status: "todo", decisions: [{ label: "Positive", value: "at least 1 red pixel", by: "from your answer" }] },
        { step: "Compare control and treated", status: "todo", decisions: [{ label: "Test", value: "Welch t test", by: "agent" }, { label: "Error bars", value: "SD", by: "default" }] },
      ],
      pilot: { sample: "control/Set 1/field 1" },
      outputs: ["A table per cell", "A bar plot per group", "QC images"],
      checks: [{ check: "The outlines match the cells in 3 fields.", if_fails: "Change the cell size." }],
    };
    const { h, s } = start(100, 40);
    await until(() => h.all().includes("Type /plan"));
    s.bus.emit({
      type: "plan",
      stage: "plan",
      version: 1,
      text: planText(plan as never, { view: "compact", numbered: true }),
      details: planText(plan as never, { view: "details", numbered: true }),
      update: false,
      qids: [],
      programs: plan.programs.map((g) => ({ ...g })),
      mode: "watch",
      definitions: plan.definitions,
      settings: settingsOf(plan as never).map((x, i) => ({ index: i, step: x.step, label: x.setting.label, value: x.setting.value, by: x.setting.by })),
      pilot: plan.pilot.sample,
    } as never);
    await until(() => h.term.view().includes("run the demonstration") && !h.term.view().includes(" of ?"));
    await sleep(200);
    const view = h.term.view();
    const rows = view.split("\n");
    expect(rows.length).toBeLessThanOrEqual(40);
    expect(view).not.toMatch(/lines \d+–\d+ of/);
    for (const part of ["Proposed metrics, version 1", "[1] n: one Set", "[4] efferocytosis index", "1. Outline the cells in CH1: [5] Cell model: cyto3 (default)", "[6] Cell size (px): 300 to 15,000", "[12] Statistics: SciPy through biostats (agent)", "r run the demonstration on control/Set 1/field 1"])
      expect(view).toContain(part);
    expect(view).not.toContain("What I will leave out");
    expect(view).not.toContain("Unit of replication");
  });
});

describe("a short or narrow terminal", () => {
  test("in a 10-row terminal an open card shows its question and every option", async () => {
    const { h } = start(80, 10);
    await until(() => h.all().includes("Type /plan"));
    h.type("compare endo and epi");
    await sleep(40);
    h.type("\r");
    await until(() => h.term.view().includes("Permission needed: run_script"));
    await sleep(200);
    expect(h.term.view()).toContain("y allow · n deny");
    h.type("y");
    await until(() => h.term.view().includes("Your decision: Which AUC cutoff"));
    await sleep(200);
    const view = h.term.view();
    for (const part of ["The cutoff changes how many features pass.", "1 0.7 (14 features)", "2 0.8 (6 features)", "o other", "Enter accepts"]) expect(view).toContain(part);
    expect(view).not.toMatch(/lines \d+–\d+ of/);
  });

  test("at 40 columns the card for a command of 2000 characters shows its length first, and PgDn reaches the end of the command", async () => {
    const { h, s } = start(40, 24);
    await until(() => h.all().includes("Type /plan"));
    const argv = ["sh", "-c", `${"abcdefghij".repeat(200)}; rm -rf /tmp/last-word`];
    s.bus.emit({ type: "permission", rid: "rx", tool: "run_command", args: { purpose: "Run", does: "Runs it.", argv }, touches: "Runs on this computer with your user permissions." });
    await until(() => h.term.view().includes("Permission needed: run_command"));
    await until(() => /lines 1–\d+ of \d+ · /.test(h.term.view()));
    expect(h.term.view()).toMatch(/lines 1–\d+ of \d+ · /);
    for (let i = 0; i < 40 && !h.term.view().includes("last-word"); i++) {
      h.type("\x1b[6~");
      await sleep(40);
    }
    expect(h.term.view()).toContain("last-word");
    for (const l of h.term.lines()) expect(l.length).toBeLessThanOrEqual(40);
    expect(h.term.wraps).toBe(0);
  });

  test("in a short terminal a card with many options scrolls to keep the cursor in view", async () => {
    const { h, s } = start(80, 14);
    await until(() => h.all().includes("Type /plan"));
    const options = Array.from({ length: 15 }, (_, i) => ({ value: `v${i + 1}`, label: `Choice number ${i + 1}` }));
    s.askMany([{ qid: "qm", session: s.id, decisionKey: "k", title: "Which choice?", text: "Pick one.", options, status: "open", created: new Date().toISOString() } as never]);
    await until(() => h.term.view().includes("Your decision: Which choice?"));
    await sleep(200);
    expect(h.term.view()).toMatch(/▸ +1 Choice number 1\b/);
    for (let i = 0; i < 11; i++) {
      h.type("\x1b[B");
      await sleep(40);
    }
    await until(() => h.term.view().includes("▸ 12 Choice number 12"));
    expect(h.term.view()).not.toMatch(/ 1 Choice number 1\b/);
    h.type("\r");
    await until(() => s.record.entries(["answer"]).length === 1);
    expect(s.record.entries(["answer"])[0]!.data).toMatchObject({ value: "v12" });
  });

  test("with 10 or more options a number moves the cursor and Enter answers", async () => {
    const { h, s } = start(100, 40);
    await until(() => h.all().includes("Type /plan"));
    const options = Array.from({ length: 15 }, (_, i) => ({ value: `v${i + 1}`, label: `Choice number ${i + 1}` }));
    s.askMany([{ qid: "qn", session: s.id, decisionKey: "k", title: "Which choice?", text: "Pick one.", options, status: "open", created: new Date().toISOString() } as never]);
    await until(() => h.term.view().includes("Your decision: Which choice?"));
    h.type("1");
    await until(() => /▸ +1 Choice number 1\b/.test(h.term.view()));
    h.type("2");
    await until(() => /▸ 12 Choice number 12\b/.test(h.term.view()));
    expect(s.record.entries(["answer"])).toHaveLength(0);
    h.type("\r");
    await until(() => s.record.entries(["answer"]).length === 1);
    expect(s.record.entries(["answer"])[0]!.data).toMatchObject({ value: "v12" });
  });

  test("at 40 columns a long option and a long setup field continue under their text", async () => {
    const { h, s } = start(40, 30);
    await until(() => h.all().includes("Type /plan"));
    s.askMany([{ qid: "qx", session: s.id, decisionKey: "k", title: "Which normalization?", text: "It changes the feature list.", options: [{ value: "tic", label: "TIC: divide each spectra by its total ion count" }, { value: "rms", label: "RMS: divide each spectra by its root mean square" }], status: "open", created: new Date().toISOString() } as never]);
    await until(() => h.term.view().includes("Your decision: Which normalization?"));
    await sleep(200);
    const rows = h.term.view().split("\n");
    const at = rows.findIndex((l) => l.includes("1 TIC: divide"));
    expect(rows[at + 1]).toMatch(/^│ {5}\S/);
  });
});
