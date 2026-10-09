import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { Session } from "../src/core/session.ts";
import { FakeProvider } from "../src/providers/fake.ts";

let session: Session | undefined;
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-teach-"));
});
afterEach(async () => {
  await session?.close();
  session = undefined;
});

const LAB_TEACH = join(__dirname, "fixtures/lab-teach");

async function open(provider = new FakeProvider([{ text: "ok" }]), adapters = [LAB_TEACH]) {
  session = await Session.create({ adapters, provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), mode: "teach" });
  session.decisions.applySetup({});
  return session;
}

function snapshot(s: Session) {
  return { values: s.decisions.values(), entries: s.record.entries(["decision", "owner_change", "setup"]).length };
}

test("teachReview lists differences, steps with no map entry, and keeps the decision record unchanged", async () => {
  const s = await open();
  s.decisions.change("method", "Triangle");
  s.decisions.change("sigma", 2, { by: "agent" });
  const before = snapshot(s);
  const r = await s.teachReview("lab-teach");
  expect(r.ok).toBe(true);
  expect(r.n_steps).toBe(4);
  expect(r.steps.map((x) => x.match)).toEqual([false, false, false, true]);
  expect(r.steps[0].differences).toEqual([
    'Threshold method: you used "Otsu", the record says "Triangle".',
    "Smallest particle: you used 10, the record says 5.",
  ]);
  expect(r.steps[1].differences).toEqual(["Blur: you used 3, the record says 2."]);
  expect(r.steps[2].mapped).toBe(false);
  expect(r.steps[2].differences[0]).toMatch(/no entry in the map/);
  expect(r.n_match).toBe(1);
  expect(snapshot(s)).toEqual(before);
  expect(s.decisions.value("sigma")).toBe(2);
  expect(s.decisions.value("method")).toBe("Triangle");
});

test("a decision that the record does not cover yet is listed as waiting, not as a difference", async () => {
  const s = await open();
  const before = snapshot(s);
  const r = await s.teachReview();
  expect(r.steps[0].waiting).toEqual(["Threshold method: the record has no value yet. The scientist decides it."]);
  expect(r.steps[0].differences).toEqual(["Smallest particle: you used 10, the record says 5."]);
  expect(r.steps[3].waiting).toHaveLength(1);
  expect(r.steps[3].match).toBe(true);
  expect(snapshot(s)).toEqual(before);
  expect(s.decisions.isSet("sigma")).toBe(false);
});

test("each checked step is logged as a follow_step entry", async () => {
  const s = await open();
  s.decisions.change("method", "Triangle");
  await s.teachReview();
  const logged = s.record.entries(["follow_step"]).map((e) => e.data as { mode: string; step: number; tool: string; line: string; differences: string[]; match: boolean });
  expect(logged.map((d) => [d.mode, d.step, d.tool, d.match])).toEqual([
    ["teach", 1, "count", false],
    ["teach", 2, "blur", true],
    ["teach", 3, "mystery", false],
    ["teach", 4, "count", true],
  ]);
  expect(logged[0].line).toBe("Analyze > Count, Otsu, size 10");
  expect(logged[0].differences).toHaveLength(2);
});

test("the model calls review_my_steps in teach mode and reads the differences", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "review_my_steps", args: {} }] }, { text: "Step 1 used Otsu, but the record says Triangle." }]);
  const s = await open(provider);
  s.decisions.change("method", "Triangle");
  expect(provider.requests).toHaveLength(0);
  await s.send("I finished the steps.");
  expect(provider.requests[0].tools.map((t) => t.name)).toContain("review_my_steps");
  const results = provider.requests[1].messages.flatMap((m) => m.parts).filter((p) => p.type === "tool_result") as { text: string; isError?: boolean }[];
  expect(results[0].isError).toBeFalsy();
  expect(results[0].text).toMatch(/Threshold method: you used "Otsu", the record says "Triangle"/);
  expect(results[0].text).toMatch(/2 of 4 steps match/);
  const first = provider.requests[0].messages[0].parts[0] as { text: string };
  expect(first.text).toMatch(/review_my_steps/);
});

test("an adapter without a history tool gets no review_my_steps tool", async () => {
  const s = await open(new FakeProvider([{ text: "ok" }]), [join(__dirname, "fixtures/lab")]);
  expect(s.allTools().some((t) => t.name === "review_my_steps")).toBe(false);
  const r = await s.teachReview("lab");
  expect(r.ok).toBe(false);
  expect(r.error).toMatch(/no history tool/);
});

test("teach mode still denies a tool that is not read-only", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "count", args: { input: "a.tif", method: "Default" } }] }, { text: "ok" }]);
  const s = await open(provider);
  await s.send("count");
  const results = provider.requests[1].messages.flatMap((m) => m.parts).filter((p) => p.type === "tool_result") as { text: string; isError?: boolean }[];
  expect(results[0].isError).toBe(true);
  expect(results[0].text).toMatch(/Teach mode/);
});
