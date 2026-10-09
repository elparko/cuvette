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
    expect(h.term.view()).toMatch(/scroll · lines 1–\d+ of 201/);
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
    await until(() => h.all().includes("approve and start"));
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
      once(lines, "guided-analysis");
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
    process.env.GA_HOME = mkdtempSync(join(tmpdir(), "ga-fit-"));
    const cwd = mkdtempSync(join(tmpdir(), "ga-proj-"));
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

    const again = await Session.resume(first.id, { cwd, provider: new FakeProvider([{ text: "Counted with the answer." }]) });
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
