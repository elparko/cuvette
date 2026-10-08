import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { Session } from "../src/core/session.ts";
import { FakeProvider } from "../src/providers/fake.ts";

let session: Session | undefined;
beforeEach(() => {
  process.env.GA_HOME = mkdtempSync(join(tmpdir(), "ga-session-"));
});
afterEach(async () => {
  await session?.close();
  session = undefined;
});

function lastToolText(p: FakeProvider, n = 1): string {
  const msgs = p.requests.at(-1)!.messages;
  const results = msgs.flatMap((m) => m.parts).filter((x) => x.type === "tool_result");
  return (results.at(-n) as { text: string }).text;
}

test("a scientist-owned decision blocks, runs the sensitivity check, and resumes after the answer", async () => {
  const provider = new FakeProvider([
    { text: "I will blur, then count.", calls: [{ name: "blur", args: { input: "/data/a.tif", sigma: 2 } }] },
    { calls: [{ name: "count", args: { input: "/data/a.tif", method: "Otsu", min_size: 10 } }] },
    { text: "There are 66 particles with the Triangle method (step 2). Also 999 cells." },
    { text: "There are 66 particles with the Triangle method (step 2). Also 999 cells." },
  ]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: tmpdir() });
  session.bus.on((e) => {
    if (e.type === "question") setTimeout(() => session!.answer(e.question.qid, "Triangle"), 0);
  });
  session.decisions.applySetup({ question: "How many particles?" });
  const answer = await session.send("Count the particles in a.tif");

  const kinds = session.record.entries().map((e) => e.kind);
  expect(kinds).toContain("sensitivity");
  expect(kinds).toContain("question");
  expect(kinds).toContain("answer");
  expect(kinds).toContain("deviation");
  const sens = session.record.entries(["sensitivity"])[0].data as { table: string };
  expect(sens.table).toMatch(/41/);
  const nodes = session.record.nodes().filter((n) => !n.sensitivityOf);
  expect(nodes.map((n) => n.tool)).toEqual(["blur", "count"]);
  expect(nodes[1].decisions.method).toBe("Triangle");
  expect((nodes[1].result as { metrics: { count: number } }).metrics.count).toBe(66);
  expect(session.decisions.value("sigma")).toBe(2);
  expect(session.decisions.value("method")).toBe("Triangle");
  expect(lastToolText(provider)).toMatch(/66/);
  expect(answer).toMatch(/999 \[no source\]/);
  expect(session.record.entries(["notice"]).some((e) => /revises the answer/.test(String(e.data.text)))).toBe(true);
  const claim = session.record.entries(["claim_check"]).at(-1)!.data as { claims: { value: number; label: string; node?: string }[] };
  expect(claim.claims.find((c) => c.value === 66)?.label).toBe("measured");
});

test("follow mode shows the manual route and checks the scientist's numbers", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "count", args: { input: "/data/a.tif", method: "Default" } }] }, { text: "done" }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: tmpdir(), mode: "follow" });
  session.decisions.applySetup({});
  session.decisions.change("method", "Default");
  let instruction = "";
  session.bus.on((e) => {
    if (e.type === "instruction") {
      instruction = e.text;
      setTimeout(() => session!.followDone(e.step, "I got count = 64"), 0);
    }
  });
  await session.send("count");
  expect(instruction).toMatch(/Analyze > Count/);
  expect(instruction).toMatch(/Minimum size: 5 \(the program shows 0 by default/);
  const step = session.record.entries(["follow_step"]).at(-1)!.data as { match: boolean };
  expect(step.match).toBe(true);
});

test("permission ask waits for the scientist and a denial goes back to the model", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "count", args: { input: "x", method: "Default" } }] }, { text: "ok" }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: tmpdir(), settings: { permissions: { count: "ask" } } });
  session.decisions.applySetup({});
  session.decisions.change("method", "Default");
  session.bus.on((e) => {
    if (e.type === "permission") setTimeout(() => session!.respondPermission(e.rid, false, "not now"), 0);
  });
  await session.send("count");
  expect(lastToolText(provider)).toMatch(/did not allow this: not now/);
});

test("resume rebuilds the history from the log", async () => {
  const provider = new FakeProvider([{ text: "hello" }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: tmpdir(), settings: { guidance: false } });
  await session.send("hi");
  const id = session.id;
  await session.close();
  session = await Session.resume(id, { provider: new FakeProvider([{ text: "again" }]), cwd: tmpdir() });
  expect(session.history.length).toBe(2);
});
