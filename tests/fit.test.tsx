import { afterEach, describe, expect, test } from "vitest";
import { runTui } from "../src/tui/app.tsx";
import { FakeSession } from "../src/ui/fake-session.ts";
import { makeHarness, sleep, until, type Harness } from "../src/tui/testing.ts";

let live: { h: Harness; done: Promise<void> } | undefined;

function start(columns = 100, rows = 40) {
  const h = makeHarness(columns, rows);
  const s = new FakeSession({ delayMs: 0 });
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
    expect(count(text, "Proposed analysis, version 1")).toBe(1);
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
