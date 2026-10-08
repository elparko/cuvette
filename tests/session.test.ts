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

test("a promise of an action with no tool call gets one nudge", async () => {
  const provider = new FakeProvider([{ text: "I will now count the particles." }, { calls: [{ name: "state", args: {} }] }, { text: "The program is open." }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: tmpdir(), settings: { guidance: false, headless: true } });
  const answer = await session.send("go");
  expect(answer).toBe("The program is open.");
  expect(provider.requests.length).toBe(3);
});

test("generic file tools stay inside the folders of the analysis", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "ga-cwd-"));
  const provider = new FakeProvider([{ calls: [{ name: "list_dir", args: { path: "/" } }, { name: "list_dir", args: { path: cwd } }] }, { text: "ok" }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd, settings: { guidance: false } });
  await session.send("look");
  const results = provider.requests.at(-1)!.messages.flatMap((m) => m.parts).filter((p) => p.type === "tool_result") as { text: string; isError?: boolean }[];
  expect(results[0].isError).toBe(true);
  expect(results[0].text).toMatch(/outside the folders/);
  expect(results[1].isError).toBeFalsy();
});

test("three identical calls in a row end in a forced final answer", async () => {
  const same = { calls: [{ name: "note", args: { text: "x" } }] };
  const provider = new FakeProvider([same, same, same, { text: "Final." }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: tmpdir(), settings: { guidance: false } });
  expect(await session.send("go")).toBe("Final.");
  expect(provider.requests.at(-1)!.tools.length).toBe(0);
});

test("propose_change asks the scientist, and an agreed change updates the record for later steps", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "count", args: { input: "/data/a.tif" } }] },
    { calls: [{ name: "propose_change", args: { key: "min_size", value: "20", reason: "Objects under 20 px are noise." } }] },
    { calls: [{ name: "count", args: { input: "/data/a.tif" } }] },
    { calls: [{ name: "propose_change", args: { key: "method", value: "Otsu", reason: "Try Otsu." } }] },
    { calls: [{ name: "propose_change", args: { key: "nope", value: 1, reason: "x" } }] },
    { text: "done" },
  ]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: tmpdir() });
  const asked: { key: string; options: string[] }[] = [];
  session.bus.on((e) => {
    if (e.type !== "question") return;
    asked.push({ key: e.question.decisionKey, options: e.question.options.map((o) => o.label) });
    const keep = e.question.decisionKey === "method";
    setTimeout(() => session!.answer(e.question.qid, e.question.options[keep ? 1 : 0]!.value), 0);
  });
  session.decisions.applySetup({ question: "How many?", method: "Default", min_size: 5 });
  await session.send("Count the particles in a.tif");

  expect(asked).toEqual([
    { key: "min_size", options: ["Change to 20", "Keep 5"] },
    { key: "method", options: ["Change to Otsu", "Keep Default"] },
  ]);
  expect(session.decisions.value("min_size")).toBe(20);
  expect(session.decisions.value("method")).toBe("Default");
  const counts = session.record.nodes().filter((n) => n.tool === "count" && !n.sensitivityOf);
  expect(counts.map((n) => n.decisions.min_size)).toEqual([5, 20]);
  const change = session.record.entries(["decision"]).find((e) => e.data.key === "min_size");
  expect(change?.data).toMatchObject({ old: 5, new: 20, by: "human" });
  const results = provider.requests.at(-1)!.messages.flatMap((m) => m.parts).filter((p) => p.type === "tool_result") as { text: string }[];
  expect(results.at(-1)!.text).toMatch(/No decision nope/);
});

test("compare_options reruns the last step with other values as comparison runs and keeps the record", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "compare_options", args: { key: "method", values: ["Otsu"] } }] },
    { calls: [{ name: "count", args: { input: "/data/a.tif" } }] },
    { calls: [{ name: "compare_options", args: { key: "method", values: ["Otsu", "Triangle"] } }] },
    { text: "done" },
  ]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: tmpdir() });
  session.decisions.applySetup({ question: "How many?", method: "Default", min_size: 5 });
  await session.send("Count, then check other methods");

  const results = provider.requests.at(-1)!.messages.flatMap((m) => m.parts).filter((p) => p.type === "tool_result") as { text: string }[];
  expect(results[0]!.text).toMatch(/No step that uses Threshold method has run yet/);
  const comps = session.record.nodes().filter((n) => n.sensitivityOf === "method");
  expect(comps.map((n) => n.args.method)).toEqual(["Otsu", "Triangle"]);
  expect(comps.every((n) => n.args.min_size === 5 && n.args.input === "/data/a.tif")).toBe(true);
  expect(session.decisions.value("method")).toBe("Default");
  expect(session.record.entries(["deviation"])).toHaveLength(0);
  expect(results.at(-1)!.text).toMatch(/The record still says "Default"/);
});

test("a step that uses the output of a comparison run is also a comparison run", async () => {
  let step = 0;
  const provider = new FakeProvider(() => {
    step++;
    if (step === 1) return { calls: [{ name: "blur", args: { input: "/data/a.tif", sigma: 1 } }] };
    if (step === 2) return { calls: [{ name: "compare_options", args: { key: "sigma", values: [3] } }] };
    if (step === 3) {
      const comp = session!.record.nodes().find((n) => n.sensitivityOf === "sigma")!;
      return { calls: [{ name: "count", args: { input: comp.outputs[0]!.path } }] };
    }
    return { text: "done" };
  });
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: tmpdir() });
  session.decisions.applySetup({ question: "How many?", method: "Default", min_size: 5 });
  await session.send("Blur, compare, then count the comparison output");
  const last = session.record.nodes().at(-1)!;
  expect(last.tool).toBe("count");
  expect(last.sensitivityOf).toBe("sigma");
  expect(session.record.nodes().filter((n) => !n.sensitivityOf).map((n) => n.tool)).toEqual(["blur"]);
});

test("a calculate result is a logged step that claims can cite", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "calculate", args: { items: [{ name: "ratio", expression: "4696 / 5007" }] } }] },
    { text: "The ratio is 0.938." },
    { text: "The ratio is 0.938." },
  ]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: tmpdir() });
  session.decisions.applySetup({ question: "How many?", method: "Default", min_size: 5 });
  await session.send("What is the ratio?");
  const node = session.record.nodes().find((n) => n.tool === "calculate")!;
  expect(node).toBeDefined();
  const claim = session.record.entries(["claim_check"]).at(-1)!.data as { claims: { value: number; label: string; node?: string }[] };
  expect(claim.claims.find((c) => c.value === 0.938)).toMatchObject({ label: "measured", node: node.id });
});
