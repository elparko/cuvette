import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { blindPolicy, canonical, setBlindPolicy } from "../src/adapters/blind.ts";
import { applyHeadlessSetup, attachHeadless } from "../src/core/headless.ts";
import { Session, announcesStep, coerceArgs, endsWithPromise } from "../src/core/session.ts";
import { ProviderError } from "../src/core/types.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { loadAdapter } from "../src/adapters/manifest.ts";
import { saveVersion } from "../src/adapters/locate.ts";
import { unzip } from "./fixtures/unzip.ts";
import { writeXlsx } from "./fixtures/xlsx.ts";
import { recordSpend } from "../src/core/spend.ts";
import { processStart } from "../src/core/sessions.ts";
import { trustFolder } from "../src/core/trust.ts";

let session: Session | undefined;
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-session-"));
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), mode: "follow" });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { permissions: { count: "ask" } } });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false } });
  await session.send("hi");
  const id = session.id;
  await session.close();
  session = await Session.resume(id, { provider: new FakeProvider([{ text: "again" }]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  expect(session.history.length).toBe(2);
});

test("a promise of an action with no tool call gets one nudge", async () => {
  const provider = new FakeProvider([{ text: "I will now count the particles." }, { calls: [{ name: "state", args: {} }] }, { text: "The program is open." }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, headless: true } });
  const answer = await session.send("go");
  expect(answer).toBe("The program is open.");
  expect(provider.requests.length).toBe(3);
});

test("a nudge that leads to a tool call does not use up the nudges for later steps", async () => {
  const steps = [0, 1, 2, 3].flatMap((i) => [{ text: `Step ${i} done. Next, I will run the next step.` }, { calls: [{ name: "state", args: { i } }] }]);
  const provider = new FakeProvider([...steps, { text: "All four steps are done." }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, headless: true } });
  expect(await session.send("go")).toBe("All four steps are done.");
  expect(provider.requests.length).toBe(9);
});

test("generic file tools stay inside the folders of the analysis", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-cwd-"));
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false } });
  expect(await session.send("go")).toBe("Final.");
  expect(provider.requests.at(-1)!.tools.length).toBe(0);
});

test("a turn that stops during the revision keeps the first answer", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "state", args: {} }] }, { text: "The fold change was 3.7 in group B." }]);
  const step = provider.step.bind(provider);
  provider.step = async (req) => {
    if (provider.requests.length < 2) return step(req);
    session!.interrupt();
    throw new Error("aborted");
  };
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { headless: true, referee: "none" } });
  const answer = await session.send("go");
  expect(answer).toBe("The fold change was 3.7 in group B.");
  const final = session.record.entries(["assistant"]).filter((e) => e.data.final === true);
  expect(final.map((e) => e.data.text)).toEqual(["The fold change was 3.7 in group B."]);
  expect(session.record.entries(["notice"]).some((e) => /stopped during the revision/.test(String(e.data.text)))).toBe(true);
});

test("after a forced final answer the harness does not ask for a tool call", async () => {
  const same = { calls: [{ name: "note", args: { text: "x" } }] };
  const provider = new FakeProvider([same, same, same, { text: "The count is 64. I will now give the final answer." }, { text: "other" }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, headless: true } });
  expect(await session.send("go")).toBe("The count is 64. I will now give the final answer.");
  expect(provider.requests.length).toBe(4);
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
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
  expect(results.at(-1)!.text).toMatch(/of the last step, count \(.*input=\/data\/a\.tif.*\)\. Only that step was repeated/);
});

test("compare_options does not run comparison runs of a step tool in plan mode", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "count", args: { input: "/data/a.tif" } }] },
    { text: "done" },
    { calls: [{ name: "compare_options", args: { key: "method", values: ["Otsu", "Triangle"] } }] },
    { text: "done" },
  ]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  session.decisions.applySetup({ question: "How many?", method: "Default", min_size: 5 });
  await session.send("Count");
  session.setMode("plan");
  await session.send("Check other methods");
  const results = provider.requests.at(-1)!.messages.flatMap((m) => m.parts).filter((p) => p.type === "tool_result") as { text: string }[];
  expect(results.at(-1)!.text).toMatch(/Plan mode: the agent runs only read-only tools, so no comparison runs of count\./);
  expect(session.record.nodes().filter((n) => n.sensitivityOf)).toHaveLength(0);
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  session.decisions.applySetup({ question: "How many?", method: "Default", min_size: 5 });
  await session.send("What is the ratio?");
  const node = session.record.nodes().find((n) => n.tool === "calculate")!;
  expect(node).toBeDefined();
  const claim = session.record.entries(["claim_check"]).at(-1)!.data as { claims: { value: number; label: string; node?: string }[] };
  expect(claim.claims.find((c) => c.value === 0.938)).toMatchObject({ label: "measured", node: node.id });
});

test("an answer while plan steps are open gets one reminder to finish them", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "plan", args: { steps: [{ step: "Count the particles", status: "done" }, { step: "Blur the image", status: "todo" }] } }] },
    { text: "There are particles." },
    { calls: [{ name: "plan", args: { steps: [{ step: "Count the particles", status: "done" }, { step: "Blur the image", status: "skipped" }] } }] },
    { text: "Done." },
  ]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  session.decisions.applySetup({ question: "How many?", method: "Default", min_size: 5 });
  const answer = await session.send("Count and blur");
  const notes = provider.requests.flatMap((r) => r.messages).flatMap((m) => m.parts).filter((p) => p.type === "text" && /Your plan still has steps that are not done: Blur the image/.test((p as { text: string }).text));
  expect(notes.length).toBeGreaterThan(0);
  expect(answer).toMatch(/Done\./);
});

test("a revision that loses results and fixes nothing is replaced by the first answer", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "count", args: { input: "/data/a.tif" } }] },
    { text: "There are 64 particles. Also 999 cells." },
    { text: "There are 999 cells." },
  ]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  session.decisions.applySetup({ question: "How many?", method: "Default", min_size: 5 });
  const answer = await session.send("Count");
  expect(answer).toMatch(/There are 64 particles/);
  expect(session.record.entries(["notice"]).some((e) => /kept the first answer/.test(String(e.data.text)))).toBe(true);
});

test("the answer gets a list of step results that it does not mention", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "count", args: { input: "/data/a.tif" } }] },
    { calls: [{ name: "blur", args: { input: "/data/a.tif", sigma: 2 } }] },
    { text: "I counted the particles and blurred the image." },
  ]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  session.decisions.applySetup({ question: "How many?", method: "Default", min_size: 5 });
  await session.send("Count and blur");
  const last = session.record.entries(["assistant"]).at(-1)!.data as { text: string; results?: string };
  expect(last.results).toMatch(/Step results that the answer does not mention/);
  expect(last.results).toMatch(/n1 count: Counted 64 particles/);
  expect(last.text).toContain(last.results!);
});

test("an answer that still ends with a promise after three nudges is marked unfinished", async () => {
  const provider = new FakeProvider(() => ({ text: "I will now run the count." }));
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  session.decisions.applySetup({ question: "How many?", method: "Default", min_size: 5 });
  await session.send("Count");
  expect(session.findings.list().some((f) => f.check === "answer_unfinished")).toBe(true);
});

test("a promise survives a file name with a dot and verbs such as analyze", () => {
  expect(endsWithPromise("Done with the trajectory.\n\nNext, I will analyze the closed structure (1AKE.pdb) to see how different it is from chain A.")).toBe(true);
  expect(endsWithPromise("The RMSD is 6.8 A. We need to run the filter next.")).toBe(true);
  expect(endsWithPromise("The RMSD is 6.8 A. The structures differ by 7.1 A.")).toBe(false);
  expect(endsWithPromise("328 variants remain. Let me know if you need further analysis!")).toBe(false);
  expect(endsWithPromise("The image is 20 by 20 pixels.\n\n5. The average pixel value will be determined after the zonal statistics step.")).toBe(true);
  expect(endsWithPromise("The new size will be determined after the reprojecting step.")).toBe(true);
});

test("an answer that says it needs to run a tool is an announced step", () => {
  expect(announcesStep("3. To keep the variants, we need to run the `filter_variants` tool. This will give the count.")).toBe(true);
  expect(announcesStep("The count is 328. We checked the filter.")).toBe(false);
});

test("a result shows the text and the main files before the long list of pictures", async () => {
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider: new FakeProvider([{ text: "x" }]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false } });
  const tool = session.allTools().find((t) => t.name === "count")!;
  const outputs = [...Array.from({ length: 40 }, (_, i) => ({ name: `p${i}.png`, kind: "image" as const, path: `/w/p${i}.png` })), { name: "data.txt", kind: "file" as const, path: "/w/data.txt" }];
  const out = (session as any).render(tool, { ok: true, summary: "s", metrics: { n: 1 }, text: "data_file=/w/data.txt", outputs });
  const parsed = JSON.parse(out.text);
  expect(Object.keys(parsed).slice(0, 4)).toEqual(["ok", "summary", "metrics", "text"]);
  expect(parsed.outputs[0].name).toBe("data.txt");
  expect(parsed.outputs.length + parsed.outputs_omitted).toBe(41);
});

test("a result shows the program reply once, with the whole table", async () => {
  const provider = new FakeProvider([{ text: "x" }]);
  provider.info = { ...provider.info, small: true };
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false } });
  const tool = session.allTools().find((t) => t.name === "count")!;
  const table = { columns: ["gate", "count"], rows: Array.from({ length: 14 }, (_, i) => [`g${i}`, i * 10]), n_rows: 14 };
  const data = { ok: true, summary: "14 gates", metrics: { n_gates: 14 }, n_gates: 14, warning: "two gates share a name", table };
  const out = (session as any).render(tool, { ok: true, summary: "14 gates", metrics: { n_gates: 14 }, text: JSON.stringify(data), data, table });
  const parsed = JSON.parse(out.text);
  expect(parsed.text).toBeUndefined();
  expect(parsed.data).toEqual({ warning: "two gates share a name" });
  expect(parsed.table.rows).toHaveLength(14);
  expect(out.text.match(/g13/g)).toHaveLength(1);
});

test("a result keeps data that differs from the table and a text that is not the data", async () => {
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider: new FakeProvider([{ text: "x" }]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false } });
  const tool = session.allTools().find((t) => t.name === "count")!;
  const table = { columns: ["a"], rows: Array.from({ length: 20 }, (_, i) => [i]), n_rows: 20 };
  const out = (session as any).render(tool, { ok: true, summary: "s", metrics: { n: 1 }, text: "log line", data: { other: [1, 2] }, table });
  const parsed = JSON.parse(out.text);
  expect(parsed.text).toBe("log line");
  expect(parsed.data).toEqual({ other: [1, 2] });
  expect(parsed.table.rows).toHaveLength(12);
});

test("a result that used the recorded value says so to the model", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "count", args: { input: "/data/a.tif", min_size: 99 } }] }, { text: "done" }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  session.decisions.applySetup({ question: "How many?", method: "Default", min_size: 5 });
  await session.send("Count");
  const results = provider.requests.at(-1)!.messages.flatMap((m) => m.parts).filter((p) => p.type === "tool_result") as { text: string }[];
  expect(results[0]!.text).toMatch(/min_size.* = 5 \(you gave 99\)\. This result is for the recorded value, not for the value you gave\./);
  expect(results[0]!.text).toMatch(/call compare_options/);
});

test("comparison runs before a question wait for the other open decisions of the same call", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "fit", args: { data: "/data/x.csv", terms: "A + B", perms: 999 } }] }, { text: "done" }, { text: "done" }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/model")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  const asked: string[] = [];
  session.bus.on((e) => {
    if (e.type !== "question") return;
    asked.push(e.question.decisionKey);
    setTimeout(() => session!.answer(e.question.qid, e.question.decisionKey === "terms" ? "A + B" : 999), 0);
  });
  session.decisions.applySetup({ question: "Does A change the outcome?" });
  await session.send("Fit the model");

  expect(asked).toEqual(["terms", "perms"]);
  const comps = session.record.nodes().filter((n) => n.sensitivityOf === "perms");
  expect(comps.map((n) => n.args.perms)).toEqual([99, 999]);
  expect(comps.every((n) => n.args.terms === "A + B")).toBe(true);
  expect(session.record.entries(["tool_result"]).filter((e) => e.data.ok === false)).toHaveLength(0);
  const q = session.record.entries(["question"]).find((e) => e.data.decisionKey === "perms")!;
  expect(String(q.data.evidence)).not.toMatch(/No comparison yet|failed/);
  const main = session.record.nodes().filter((n) => !n.sensitivityOf);
  expect(main.map((n) => [n.args.terms, n.args.perms])).toEqual([["A + B", 999]]);
});

test("without a wait for answers, the comparison names the missing argument and does not run", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "fit", args: { data: "/data/x.csv", terms: "A", perms: 999 } }] }, { text: "done" }, { text: "done" }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/model")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { askWaits: false, autoResume: false } });
  session.decisions.applySetup({ question: "Does A change the outcome?" });
  await session.send("Fit the model");

  expect(session.record.nodes().filter((n) => n.sensitivityOf)).toHaveLength(0);
  expect(session.record.entries(["tool_result"]).some((e) => /length zero/.test(String(e.data.error ?? "")))).toBe(false);
  const q = session.record.entries(["question"]).find((e) => e.data.decisionKey === "perms")!;
  expect(String(q.data.evidence)).toMatch(/No comparison yet: the comparison runs of fit need a value for terms \(Model terms\)/);
});

test("an empty answer keeps the agent's argument in the comparison runs and in the held call", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "fit", args: { data: "/data/x.csv", terms: "A + B", perms: 999 } }] }, { text: "done" }, { text: "done" }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/model")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  session.bus.on((e) => {
    if (e.type !== "question") return;
    setTimeout(() => session!.answer(e.question.qid, e.question.decisionKey === "terms" ? "" : 999), 0);
  });
  session.decisions.applySetup({ question: "Does A change the outcome?" });
  await session.send("Fit the model");

  expect(session.decisions.isSet("terms")).toBe(true);
  expect(session.decisions.hasValue("terms")).toBe(false);
  expect(session.record.entries(["tool_result"]).filter((e) => e.data.ok === false)).toHaveLength(0);
  const comps = session.record.nodes().filter((n) => n.sensitivityOf === "perms");
  expect(comps.map((n) => n.args.terms)).toEqual(["A + B", "A + B"]);
  const main = session.record.nodes().filter((n) => !n.sensitivityOf);
  expect(main.map((n) => [n.args.terms, n.args.perms])).toEqual([["A + B", 999]]);
});

function pickCwd(): string {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-pick-"));
  const yaml = readFileSync(join(__dirname, "fixtures/lab/adapter.yaml"), "utf8");
  for (const name of ["lab", "lab2"]) {
    const dir = join(cwd, ".cuvette", "adapters", name);
    mkdirSync(join(dir, "skills"), { recursive: true });
    writeFileSync(
      join(dir, "adapter.yaml"),
      yaml.replace('adapter: { name: lab, title: Lab counter, version: "0.2.0" }', `adapter: { name: ${name}, title: Lab counter, version: "0.2.0", field: microscopy, file_types: [".lab", ".tif"] }\nstandards: "Count each image twice."`),
    );
    symlinkSync(join(__dirname, "fixtures/lab/server.ts"), join(dir, "server.ts"));
    writeFileSync(join(dir, "skills", "recount.md"), "---\nname: recount\ndescription: Count again with another method.\n---\nCount again.\n");
  }
  trustFolder(cwd);
  return cwd;
}

const toolNames = (p: FakeProvider, i: number) => p.requests[i].tools.map((t) => t.name);

test("with no adapter, use_adapter loads the agent's choice with no card, then adds the tools, standards, skills and decisions of the adapter", async () => {
  const cwd = pickCwd();
  const provider = new FakeProvider([
    { calls: [{ name: "list_adapters", args: { filter: ".lab" } }] },
    { calls: [{ name: "use_adapter", args: { name: "lab", reason: "The request names a lab image" } }] },
    { calls: [{ name: "count", args: { input: "/data/a.lab", method: "Otsu" } }] },
    { text: "There are 66 particles (step 1)." },
  ]);
  session = await Session.create({ adapters: [], provider, cwd });
  const asked: { key: string; text: string; options: string[] }[] = [];
  session.bus.on((e) => {
    if (e.type !== "question") return;
    asked.push({ key: e.question.decisionKey, text: e.question.text, options: e.question.options.map((o) => o.label) });
    setTimeout(() => session!.answer(e.question.qid, e.question.decisionKey === "adapter" ? "lab" : "Triangle"), 0);
  });
  session.decisions.applySetup({ question: "How many particles?" });
  await session.send("Count the particles in /data/a.lab");

  const first = toolNames(provider, 0);
  expect(first).toEqual(expect.arrayContaining(["list_adapters", "use_adapter", "read_file", "run_script"]));
  expect(first).not.toContain("count");
  expect(provider.requests[0].system).toMatch(/# Programs/);
  expect(provider.requests[0].system).not.toMatch(/Count each image twice/);
  expect(JSON.stringify(provider.requests[0].messages[0])).toMatch(/a\.lab -> lab, lab2/);
  expect(JSON.stringify(provider.requests[1].messages.at(-1))).toMatch(/- lab \| Lab counter \| microscopy/);

  const after = toolNames(provider, 2);
  expect(after.slice(0, first.length)).toEqual(first);
  expect(after.slice(first.length)).toEqual(expect.arrayContaining(["blur", "count", "state"]));
  expect(provider.requests[2].system).toMatch(/Count each image twice/);
  expect(provider.requests[2].system).toMatch(/recount: Count again with another method/);
  const loadText = JSON.stringify(provider.requests[2].messages.at(-1));
  expect(loadText).toMatch(/Loaded the adapter lab 0\.2\.0/);
  expect(loadText).toMatch(/is a draft/);
  expect(loadText).toMatch(/Smallest particle \(min_size\): 5/);

  expect(asked.map((a) => a.key)).toEqual(["method"]);
  const node = session.record.nodes().find((n) => n.tool === "count" && !n.sensitivityOf)!;
  expect(node.decisions.method).toBe("Triangle");
  expect(node.decisions.min_size).toBe(5);
  expect(session.decisions.value("adapter")).toBe("lab");
  const loaded = session.record.entries(["adapter"]);
  expect(loaded).toHaveLength(1);
  expect(loaded[0].data).toMatchObject({ name: "lab", program: "Lab counter", version: "0.2.0", programVersion: "1.0", reason: "The request names a lab image", by: "agent", status: "draft", programFound: null });
  expect(session.record.entries(["decision"]).find((e) => e.data.key === "adapter")!.data).toMatchObject({ new: "lab", by: "agent", reason: "The request names a lab image" });
  expect(session.record.entries(["setup"]).at(-1)!.data).toMatchObject({ values: { min_size: 5 }, adapter: "lab", defaultsAccepted: ["min_size"] });
  expect(session.record.entries(["session"])[0].data.pick).toBe(true);
});

test("a second load of the same adapter does nothing; an agent-owned program choice loads without a card; resume loads it again", async () => {
  const cwd = pickCwd();
  session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd });
  session.decisions.applySetup({});
  session.setOwner("adapter", "agent");
  const r = await session.useAdapter("lab", "it reads .lab files");
  expect(r.ok).toBe(true);
  const again = await session.useAdapter("lab", "again");
  expect(again).toMatchObject({ ok: true, summary: "The adapter lab is already loaded. Nothing changed." });
  expect(session.record.entries(["question"])).toHaveLength(0);
  expect(session.record.entries(["adapter"])).toHaveLength(1);
  expect(session.record.entries(["decision"]).find((e) => e.data.key === "adapter")!.data).toMatchObject({ new: "lab", by: "agent", reason: "it reads .lab files" });
  expect(session.allTools().filter((t) => t.name === "count")).toHaveLength(1);
  const id = session.id;
  await session.close();
  session = await Session.resume(id, { provider: new FakeProvider([]), cwd });
  expect(session.pick).toBe(true);
  expect(session.adapters.map((a) => a.name)).toEqual(["lab"]);
  expect(session.allTools().map((t) => t.name)).toEqual(expect.arrayContaining(["count", "use_adapter"]));
  expect(session.decisions.value("adapter")).toBe("lab");
});

test("the answers file can change the program choice", async () => {
  const cwd = pickCwd();
  session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd, settings: { headless: true } });
  attachHeadless(session, { answers: { adapter: "lab2" }, allow: new Set() });
  applyHeadlessSetup(session, undefined, { adapter: "lab2" });
  const r = await session.useAdapter("lab", "it reads .lab files");
  expect(r.ok).toBe(true);
  expect(r.text).toMatch(/The scientist chose lab2 instead of lab/);
  expect(session.adapters.map((a) => a.name)).toEqual(["lab2"]);
  expect(session.record.entries(["adapter"])[0].data.reason).toMatch(/chosen by the scientist instead of lab/);
  expect(session.record.entries(["decision"]).find((e) => e.data.key === "adapter")!.data).toMatchObject({ new: "lab2", by: "human", reason: "from the answers file" });
  expect(session.record.entries(["question"])).toHaveLength(0);
  expect(session.decisions.value("adapter")).toBe("lab2");
});

test("headless run: a refused answer from the catch-all falls back to the default and logs a notice", async () => {
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider: new FakeProvider([]), cwd: pickCwd(), settings: { headless: true } });
  attachHeadless(session, { answers: { "*": "Use the values in the decision record." }, allow: new Set() });
  const q = await session.questions.ask({ decisionKey: "min_size", title: "Smallest particle", text: "?", options: [], default: 5, evidence: "" });
  session.bus.emit({ type: "question", question: q });
  await vi.waitFor(() => expect(session!.questions.get(q.qid)!.status).toBe("answered"));
  expect(session.questions.get(q.qid)!.answer).toBe(5);
  expect(session.decisions.value("min_size")).toBe(5);
  const text = session.record.entries(["notice"]).map((e) => String(e.data.text)).join("\n");
  expect(text).toMatch(/The answers file gave 'Use the values in the decision record\.' for min_size, which it refused: .* Used '5' instead\./);
});

test("blind mode adds a mid-session adapter folder to the allow list and hides it from the file tools", async () => {
  const cwd = pickCwd();
  setBlindPolicy({ allow: [cwd], deny: [] });
  try {
    session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd });
    session.decisions.applySetup({});
    session.setOwner("adapter", "agent");
    await session.useAdapter("lab", "test");
    const p = blindPolicy()!;
    const root = session.adapters[0].root;
    expect(p.allow).toContain(canonical(root));
    expect(p.hide).toContain(canonical(root));
  } finally {
    setBlindPolicy(undefined);
  }
});

test("with --adapter, the session has no adapter tools and no program decision", async () => {
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  expect(session.pick).toBe(false);
  expect(session.allTools().map((t) => t.name)).not.toContain("use_adapter");
  expect(session.decisions.has("adapter")).toBe(false);
});

test("a session with defaults loads the default adapters, keeps the adapter choice open, and reports a missing one", async () => {
  const cwd = pickCwd();
  const provider = new FakeProvider([{ text: "Done." }]);
  session = await Session.create({ adapters: [], provider, cwd, defaults: true, settings: { defaultAdapters: ["lab2", "no-such-adapter"] } });
  expect(session.pick).toBe(true);
  expect(session.adapters.map((a) => a.name)).toEqual(["lab2"]);
  expect(session.adapterInfo.map((a) => a.name)).toEqual(["lab2"]);
  expect(session.allTools().map((t) => t.name)).toEqual(expect.arrayContaining(["count", "list_adapters", "use_adapter"]));
  expect(session.record.entries(["session"])[0].data).toMatchObject({ pick: true, defaults: ["lab2"] });
  session.decisions.applySetup({});
  await session.send("Count the particles");
  expect(provider.requests[0].system).toMatch(/loaded in every session\. If their tools do the request, use them/);
  expect(provider.requests[0].system).toMatch(/Count each image twice/);
  expect(JSON.stringify(provider.requests[0].messages[0])).toMatch(/The default adapter no-such-adapter is not loaded/);
});

test("without defaults, as in the benchmark, only the named adapters load; a named default loads once", async () => {
  const cwd = pickCwd();
  session = await Session.create({ adapters: ["lab"], provider: new FakeProvider([]), cwd, settings: { defaultAdapters: ["lab2"] } });
  expect(session.adapters.map((a) => a.name)).toEqual(["lab"]);
  await session.close();
  session = await Session.create({ adapters: ["lab"], provider: new FakeProvider([]), cwd, defaults: true, settings: { defaultAdapters: ["lab", "lab2"] } });
  expect(session.pick).toBe(false);
  expect(session.adapters.map((a) => a.name)).toEqual(["lab", "lab2"]);
  expect(session.adapterInfo.map((a) => a.name)).toEqual(["lab", "lab2"]);
  expect(session.allTools().filter((t) => t.name === "count")).toHaveLength(1);
});

test("a script that walks a large folder asks first, even after always allow", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-cwd-"));
  const plain = { purpose: "Count the files", does: "Counts the files in the project folder.", code: "import os\nprint(len(os.listdir('.')))" };
  const walk = { purpose: "Find the image folder", does: "Looks through every folder on the drives for the images.", code: "import os\nfor r, d, f in os.walk('/Volumes'):\n    pass" };
  const provider = new FakeProvider([{ calls: [{ name: "run_script", args: plain }] }, { calls: [{ name: "run_script", args: walk }] }, { text: "ok" }]);
  session = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false } });
  const seen: { search?: { root: string; purpose: string }; touches: string }[] = [];
  session.bus.on((e) => {
    if (e.type !== "permission") return;
    seen.push(e);
    setTimeout(() => (e.search ? session!.respondPermission(e.rid, false) : session!.respondPermission(e.rid, true, "", true)), 0);
  });
  await session.send("find the images");
  expect(seen).toHaveLength(2);
  expect(seen[0]!.search).toBeUndefined();
  expect(seen[1]!.search).toEqual({ root: "/Volumes", purpose: "Find the image folder" });
  expect(seen[1]!.touches).toBe("The agent wants to search /Volumes for this purpose: Find the image folder. This can take minutes and reads folders outside your project.");
  expect(lastToolText(provider)).toMatch(/did not allow a search of \/Volumes/);
  expect(session.record.entries(["permission"]).map((e) => e.data.search)).toEqual([undefined, "/Volumes"]);
});

test("harness and generic tools take an optional purpose; the status line says it, and the tool does not get it", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "plan", args: { steps: [{ step: "blur" }], purpose: "write down the steps before the blur" } }] },
    { calls: [{ name: "blur", args: { input: "/data/a.tif", sigma: 2 } }] },
    { text: "Done." },
  ]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  session.decisions.applySetup({ question: "q" });
  const texts: string[] = [];
  session.bus.on((e) => { if (e.type === "status" && e.state === "running") texts.push(e.purpose ?? ""); });
  await session.send("Blur a.tif");
  const tools = provider.requests[0]!.tools as unknown as { name: string; inputSchema: { properties: Record<string, unknown> } }[];
  expect(tools.find((t) => t.name === "plan")!.inputSchema.properties.purpose).toBeDefined();
  expect(tools.find((t) => t.name === "blur")?.inputSchema.properties.purpose).toBeUndefined();
  expect(texts[0]).toBe("Write down the steps before the blur");
  expect(texts[1]).toMatch(/a\.tif/);
  expect(session.record.entries(["tool_call"])[0]!.data.args).toMatchObject({ purpose: "write down the steps before the blur" });
  expect(session.record.entries(["tool_result"])[0]!.data.ok).toBe(true);
});

test("applySetting changes the model, the referee and the mode of a running session", async () => {
  session = await Session.create({ adapters: [], model: "fake:", cwd: mkdtempSync(join(tmpdir(), "cuvette-cwd-")) });
  const first = session.provider;
  expect(session.refereeProvider).toBe(first);
  await session.applySetting("referee", "none");
  expect(session.refereeProvider).toBeUndefined();
  await session.applySetting("model", "fake:");
  expect(session.provider).not.toBe(first);
  expect(session.settings.model).toBe("fake:");
  await session.applySetting("referee", "same");
  expect(session.refereeProvider).toBe(session.provider);
  await expect(session.applySetting("model", "nope:x")).rejects.toThrow(/Unknown model spec/);
  expect(session.settings.model).toBe("fake:");
  await session.applySetting("mode", "plan");
  expect(session.mode).toBe("plan");
});

const LAB = join(__dirname, "fixtures/lab");
const LOOK = { name: "inspect_data", args: { path: join(__dirname, "fixtures/lab") } };
const CLARIFY = { calls: [LOOK, { name: "clarify", args: { found: "I see one image." } }] };
const PLAN = {
  question: "How does a blur change a.tif?",
  data: { files: ["/data/a.tif"], row: "One image.", replicate: "One image.", n: "1 image." },
  programs: [{ part: "Image work", adapter: "lab", why: "It has the blur.", alternatives: ["imagej"] }],
  steps: [{ step: "Blur the image", method: "Gaussian blur", tool: "blur", decisions: [{ key: "method", label: "Threshold method", recommendation: "Otsu" }] }],
  outputs: ["The blurred image"],
  checks: [{ check: "The image opens.", if_fails: "Stop and tell the scientist." }],
  out_of_scope: ["Particle counts"],
};
const blur = { name: "blur", args: { input: "/data/a.tif", sigma: 2 } };

function toolTexts(p: FakeProvider): string[] {
  return p.requests.at(-1)!.messages.flatMap((m) => m.parts).filter((x) => x.type === "tool_result").map((x) => (x as { text: string }).text);
}

test("plan first: no step runs before approval; a recommended setting is pre-filled, so no card asks it; approve logs plan_approved and starts step 1 in watch mode", async () => {
  const provider = new FakeProvider([CLARIFY, { calls: [blur] }, { calls: [{ name: "plan", args: PLAN }] }, { calls: [blur] }, { text: "Blurred with sigma 2." }, { text: "Blurred with sigma 2." }]);
  session = await Session.create({ adapters: [LAB], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), interactive: true });
  session.decisions.applySetup({});
  const seen: string[][] = [];
  session.bus.on((e) => {
    if (e.type === "question") setTimeout(() => session!.answer(e.question.qid, "Triangle"), 0);
    if (e.type === "plan") {
      seen.push(e.qids);
      setTimeout(() => session!.respondPlan({ action: "approve" }), 0);
    }
  });
  expect(Object.keys((session.allTools().find((t) => t.name === "plan")!.inputSchema as { properties: object }).properties)).toContain("out_of_scope");
  await session.send("Blur a.tif and tell me what changes");

  const results = session.record.entries(["tool_result"]).filter((e) => e.data.tool === "blur");
  expect(results[0]!.data.ok).toBe(false);
  expect(String(results[0]!.data.error)).toMatch(/^Plan first: no analysis step runs before the scientist approves the plan/);
  expect(session.record.nodes().map((n) => n.tool)).toEqual(["blur"]);
  expect(seen).toEqual([[]]);
  const approved = session.record.entries(["plan_approved"]);
  expect(approved).toHaveLength(1);
  expect(approved[0]!.data).toMatchObject({ phase: "Confirmed", version: 1, mode: "watch" });
  expect(String(approved[0]!.data.text)).toContain("Question: How does a blur change a.tif?");
  expect(String(approved[0]!.data.text)).toContain("   - Threshold method: Otsu (agent)");
  expect(approved[0]!.id).toBeLessThan(session.record.nodes()[0]!.entry);
  expect(session.mode).toBe("watch");
  expect(session.decisions.value("method")).toBe("Otsu");
  expect(session.record.entries(["question"])).toHaveLength(0);
  expect(toolTexts(provider).some((t) => t.includes("The scientist confirmed the analysis, version 1. Mode is now watch."))).toBe(true);
});

test("plan first: Change sends the request back and the agent revises; Cancel ends the turn with no step", async () => {
  const provider = new FakeProvider([CLARIFY, { calls: [{ name: "plan", args: PLAN }] }, { calls: [{ name: "plan", args: { ...PLAN, out_of_scope: [] } }] }, { calls: [blur] }, { text: "Blurred." }, { text: "Blurred." }]);
  session = await Session.create({ adapters: [LAB], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), interactive: true, mode: "follow" });
  session.decisions.applySetup({ method: "Otsu" });
  let n = 0;
  const modes: string[] = [];
  session.bus.on((e) => {
    if (e.type !== "plan") return;
    modes.push(e.mode);
    setTimeout(() => session!.respondPlan(n++ === 0 ? { action: "change", text: "Also count the particles." } : { action: "approve", mode: "watch" }), 0);
  });
  await session.send("Blur a.tif");
  expect(modes).toEqual(["follow", "follow"]);
  expect(session.record.entries(["plan"]).map((e) => e.data.action)).toEqual(["proposed", "change_requested", "proposed"]);
  expect(session.record.entries(["plan"])[1]!.data.text).toBe("Also count the particles.");
  expect(session.record.entries(["plan_approved"])[0]!.data).toMatchObject({ version: 2, mode: "watch" });
  expect(String(session.record.entries(["plan_approved"])[0]!.data.text)).toContain("   - Threshold method: Otsu (you)");
  expect(session.mode).toBe("watch");

  const p2 = new FakeProvider([CLARIFY, { calls: [{ name: "plan", args: PLAN }] }, { calls: [blur] }]);
  const s2 = await Session.create({ adapters: [LAB], provider: p2, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), interactive: true });
  s2.decisions.applySetup({});
  s2.bus.on((e) => {
    if (e.type === "plan") setTimeout(() => s2.respondPlan({ action: "cancel" }), 0);
  });
  expect(await s2.send("Blur a.tif")).toBe("");
  expect(s2.record.entries(["plan"]).map((e) => e.data.action)).toEqual(["proposed", "cancelled"]);
  expect(s2.record.entries(["notice"]).some((e) => e.data.text === "You cancelled the plan. No analysis step ran.")).toBe(true);
  expect(s2.record.nodes()).toHaveLength(0);
  expect(s2.mode).toBe("watch");
  expect(p2.requests).toHaveLength(2);
  await s2.close();
});

test("a step that is not in the approved plan gets a visible note, and the agent adds it with a reason", async () => {
  const provider = new FakeProvider([CLARIFY, { calls: [{ name: "plan", args: PLAN }] },
    { calls: [blur] },
    { text: "I also count the particles to check the blur.", calls: [{ name: "count", args: { input: "/data/a.tif", method: "Otsu", min_size: 5 } }] },
    { calls: [{ name: "plan", args: { steps: [{ step: "Count the particles", tool: "count" }] } }] },
    { calls: [{ name: "plan", args: { steps: [{ step: "Count the particles", tool: "count" }], reason: "The count checks the blur." } }] },
    { text: "Blurred with sigma 2. The count is 41." },
    { text: "Blurred with sigma 2. The count is 41." },
  ]);
  session = await Session.create({ adapters: [LAB], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), interactive: true });
  session.decisions.applySetup({ method: "Otsu" });
  session.bus.on((e) => {
    if (e.type === "plan") setTimeout(() => session!.respondPlan({ action: "approve" }), 0);
  });
  await session.send("Blur a.tif");
  const notices = session.record.entries(["notice"]).filter((e) => e.data.plan).map((e) => e.data.text);
  expect(notices).toEqual(["Not in the approved plan: count. Reason: I also count the particles to check the blur.", "Added to the approved plan: Count the particles. Reason: The count checks the blur."]);
  const planResults = session.record.entries(["tool_result"]).filter((e) => e.data.tool === "plan");
  expect(planResults.some((e) => /Give the reason/.test(String(e.data.error)))).toBe(true);
  expect(session.record.entries(["plan"]).at(-1)!.data).toMatchObject({ action: "updated", version: 2, reason: "The count checks the blur." });
  expect(session.findings.list().filter((f) => f.check.startsWith("plan_"))).toEqual([]);
});

test("headless runs do not plan unless asked; with planFirst the headless runner approves the plan", async () => {
  session = await Session.create({ adapters: [LAB], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { headless: true } });
  expect(session.planFirst).toBe(false);
  expect(Object.keys((session.allTools().find((t) => t.name === "plan")!.inputSchema as { properties: object }).properties)).toEqual(["steps"]);
  await session.close();

  const { attachHeadless } = await import("../src/core/headless.ts");
  const provider = new FakeProvider([CLARIFY, { calls: [{ name: "plan", args: PLAN }] }, { calls: [blur] }, { text: "Blurred with sigma 2." }, { text: "Blurred with sigma 2." }]);
  session = await Session.create({ adapters: [LAB], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { headless: true, planFirst: true } });
  attachHeadless(session, { answers: { method: "Default" }, allow: new Set(["all"]) });
  session.decisions.applySetup({});
  await session.send("Blur a.tif");
  expect(session.record.entries(["plan_approved"])).toHaveLength(1);
  expect(session.record.nodes().map((n) => n.tool)).toEqual(["blur"]);
});

test("a message typed during a turn goes in after the current step, with the step it came after", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "blur", args: { input: "/data/a.tif", sigma: 2 } }] },
    { text: "Done." },
    { text: "Done with the log scale." },
  ]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  session.decisions.applySetup({ question: "q" });
  let sent = false;
  session.bus.on((e) => {
    if (e.type === "status" && e.state === "running" && !sent) {
      sent = true;
      session!.steer("Use the log scale.");
    }
  });
  await session.send("Blur a.tif");
  const second = provider.requests[1]!.messages.at(-1)!;
  expect(second.parts.map((p) => p.type)).toEqual(["tool_result", "text"]);
  expect((second.parts[1] as { text: string }).text).toContain("Use the log scale.");
  const u = session.record.entries(["user"]);
  expect(u).toHaveLength(2);
  expect(u[1]!.data).toMatchObject({ text: "Use the log scale.", during: true, afterStep: 0 });
  expect(session.takeSteered()).toEqual([]);
});

test("a message that comes while the agent writes its answer starts one more step, not a new turn", async () => {
  const provider = new FakeProvider([{ text: "First answer." }, { text: "Second answer, with your note." }]);
  session = await Session.create({ adapters: [], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false } });
  session.bus.on((e) => {
    if (e.type === "status" && e.state === "thinking" && provider.requests.length === 0) session!.steer("Also give the median.");
  });
  const answer = await session.send("Describe sleep.csv");
  expect(answer).toBe("Second answer, with your note.");
  expect(session.record.entries(["assistant"]).map((e) => e.data.final)).toEqual([false, true]);
  expect(JSON.stringify(provider.requests[1]!.messages.at(-1))).toContain("Also give the median.");
});

test("a message with send now stops the running tool and the agent reads it next", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "run_command", args: { purpose: "wait", does: "Waits 20 seconds.", argv: ["sleep", "20"] } }, { name: "list_dir", args: { path: "." } }] },
    { text: "Stopped as you asked." },
  ]);
  session = await Session.create({ adapters: [], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, permissionMode: "bypass" } });
  session.bus.on((e) => {
    if (e.type === "status" && e.state === "running" && e.tool === "run_command") setTimeout(() => session!.steer("Stop, wrong folder.", true), 300);
  });
  const t0 = Date.now();
  await session.send("wait");
  expect(Date.now() - t0).toBeLessThan(10000);
  const parts = provider.requests[1]!.messages.at(-1)!.parts as { type: string; text?: string }[];
  expect(parts[1]!.text).toMatch(/not run\. The scientist sent a message/);
  expect(parts.at(-1)!.text).toContain("Stop, wrong folder.");
  expect(session.record.entries(["user"]).at(-1)!.data).toMatchObject({ during: true, now: true });
});

test("a message with send now stops the wait for a question card; the card stays open and a later answer reaches the agent", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "ask_scientist", args: { question: "Which file?", options: ["a.csv", "b.csv"] } }] }, { text: "I read your message." }]);
  session = await Session.create({ adapters: [], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false } });
  let qid = "";
  session.bus.on((e) => {
    if (e.type === "question") {
      qid = e.question.qid;
      setTimeout(() => session!.steer("Use the second file.", true), 0);
    }
  });
  await session.send("Read the data.");
  const parts = provider.requests[1]!.messages.at(-1)!.parts as { type: string; text?: string }[];
  expect(parts[0]!.text).toMatch(/Question q\d+ is still open\. The scientist did not answer it yet\. The scientist sent a message instead\./);
  expect(parts.at(-1)!.text).toContain("Use the second file.");
  expect(session.questions.get(qid)?.status).toBe("open");
  await session.answer(qid, "b.csv");
  expect(session["notes"].join("\n")).toContain(`The scientist answered ${qid}`);
});

test("a failed tool with printed output still tells the model why it failed", async () => {
  session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false } });
  const tool = session.findTool("run_script")!;
  expect(session["render"](tool, { ok: false, error: "the script timed out after 5 s", text: "step 1 done" }).text).toBe("ERROR: the script timed out after 5 s\nstep 1 done");
  expect(session["render"](tool, { ok: false, error: "boom", text: "Traceback: boom" }).text).toBe("Traceback: boom");
  expect(session["render"](tool, { ok: true, text: "fine" }).text).toBe("fine");
});

test("with plan first and no confirmed plan, a continue or an answer that resumes the turn plans first", async () => {
  const provider = new FakeProvider([{ text: "a" }, { text: "b" }, { text: "c" }, { text: "d" }, { text: "e" }, { text: "f" }]);
  session = await recoverySession(provider, { planFirst: "on" });
  await session.send("Count the cells in images/");
  await session.send("continue");
  await session.send("Continue the analysis with this answer.", { internal: true });
  expect(session.record.entries(["mode"]).filter((e) => e.data.reason === "plan first")).toHaveLength(3);
});

test("a turn with results writes results.xlsx in the output folder and one saved line; export_xlsx off writes none", async () => {
  const run = async (settings: Record<string, unknown>) => {
    const provider = new FakeProvider([{ calls: [{ name: "count", args: { input: "/data/a.tif", method: "Default" } }] }, { text: "The count is 64 (step 1)." }]);
    const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
    session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd, settings: { guidance: false, ...settings } });
    session.decisions.applySetup({ method: "Default" });
    await session.send("Count the particles in a.tif");
    const s = session;
    const saved = s.record.entries(["notice"]).filter((e) => e.data.saved);
    const out = { dir: s.outputDir, saved, xlsx: join(s.outputDir, "results.xlsx") };
    await s.close();
    session = undefined;
    return out;
  };
  const on = await run({});
  expect(on.dir).toMatch(/\/cuvette-proj-[^/]+\/cuvette\/\d{4}-\d\d-\d\d-count-particles-tif$/);
  expect(readFileSync(on.xlsx).subarray(0, 2).toString()).toBe("PK");
  expect(on.saved.map((e) => e.data.text)).toEqual([expect.stringMatching(/^Saved: results\.xlsx \(5 sheets\)\. Folder: /)]);
  const off = await run({ export_xlsx: "off" });
  expect(off.saved).toEqual([]);
  expect(existsSync(off.xlsx)).toBe(false);
});

function pilotProject() {
  const root = mkdtempSync(join(tmpdir(), "cuvette-pilotproj-"));
  const proj = join(root, "oxldl");
  const images = join(proj, "images");
  mkdirSync(images, { recursive: true });
  for (const s of ["Set 1", "Set 2", "Set 3"]) writeFileSync(join(images, `${s}.tif`), "x");
  const ref = writeXlsx(join(root, "Analysis.xlsx"), [{ name: "Ox-LDL", rows: [["Field", "Red dots", "Total cells"], ["Set 1", 530, 900], ["Set 2", 410, 800], ["Set 3", 300, 700]] }]);
  const qc = join(root, "qc.png");
  writeFileSync(qc, Buffer.from("89504e470d0a1a0a", "hex"));
  return { root, proj, images, ref, qc };
}

const CELL_PLAN = (images: string) => ({
  restatement: "You want: for each field, the number of cells that took up red particles.",
  question: "How many cells in each field took up red particles?",
  definitions: [{ measure: "positive cell", definition: "A cell with at least 1 red pixel inside its outline." }],
  exclusions: [{ what: "Clumps over 15,000 px are left out.", effect: "About 40% of the area with cells." }],
  pilot: { sample: "Set 1", shows: ["The overlay image"] },
  steps: [{ step: "Count the cells in each field", tool: "count" }],
  data: { files: [images] },
});

test("pilot: the plan card runs the pilot, the gate blocks the batch until the scientist confirms, and the plan is confirmed with its pilot", async () => {
  const { proj, images, ref, qc } = pilotProject();
  const folder = { name: "count", args: { input: images, method: "Otsu", min_size: 5 } };
  const provider = new FakeProvider([CLARIFY, { calls: [{ name: "plan", args: CELL_PLAN(images) }] },
    { text: "I count all fields at once.", calls: [folder] },
    { calls: [{ name: "count", args: { input: join(images, "Set 1.tif"), method: "Otsu", min_size: 5 } }] },
    { calls: [{ name: "pilot_result", args: { sample: "Set 1", values: { "positive cell": 41 }, images: [qc], check: "Clumps are left out." } }] },
    { calls: [folder] },
    { calls: [{ name: "batch_results", args: { measure: "positive cell", values: [{ sample: "Set 1", value: 41 }, { sample: "Set 2", value: 400 }, { sample: "Set 3", value: 290 }] } }] },
    { text: "Set 1 has 41 positive cells (a positive cell has at least 1 red pixel inside its outline)." },
    { text: "Set 1 has 41 positive cells (a positive cell has at least 1 red pixel inside its outline)." },
  ]);
  session = await Session.create({ adapters: [LAB], provider, cwd: proj, interactive: true });
  session.decisions.applySetup({ method: "Otsu" });
  const events: any[] = [];
  const asked: string[] = [];
  session.bus.on((e) => {
    if (e.type === "question") {
      asked.push(e.question.text);
      setTimeout(() => session!.answer(e.question.qid, e.question.title === "Earlier results" ? "compare" : e.question.options[0]?.value ?? "yes"), 0);
    }
    if (e.type !== "plan") return;
    events.push(e);
    setTimeout(() => session!.respondPlan(e.stage === "plan" ? { action: "pilot" } : { action: "confirm" }), 0);
  });
  await session.send(`Count the red-positive cells in ${images}`);

  expect(events.map((e) => e.stage)).toEqual(["plan", "pilot"]);
  expect(events[0].restatement).toBe("You want: for each field, the number of cells that took up red particles.");
  expect(events[0].pilot).toBe("Set 1");
  expect(asked).toEqual(["I found Analysis.xlsx (sheet Ox-LDL: Field, Red dots, Total cells). Is this an earlier analysis of these images? Should the demonstration compare with it?"]);
  expect(events[0].text).toContain("Metrics\n[1] positive cell: A cell with at least 1 red pixel inside its outline.");
  expect(events[0].details).toContain("What I will leave out, and what it does\n- Clumps over 15,000 px are left out. Effect: About 40% of the area with cells.");
  const counts = session.record.entries(["tool_result"]).filter((e) => e.data.tool === "count");
  expect(counts.map((e) => e.data.ok)).toEqual([false, true, true]);
  expect(String(counts[0]!.data.error)).toBe(`Pilot first: count gets the folder ${images}. This step processes many files, so it waits for a pilot. Run the method on one sample only, save QC images with outlines of what was counted and what was left out, and call pilot_result. The scientist approves the pilot before the batch runs.`);
  const run = session.record.entries(["pilot_run"])[0]!;
  expect(run.data.comparison).toEqual(['positive cell: the agent got 41; the reference "Red dots" says 530 (8% of the reference).']);
  expect(run.data.images).toEqual([join(session.workDir, "figures", "pilot-set1-qc.png")]);
  expect(existsSync(join(session.workDir, "figures", "pilot-set1-qc.png"))).toBe(true);
  expect(JSON.stringify(provider.requests[0]!.messages[0])).toContain("Pilot: before the first step that changes or counts things, say in one sentence how you will check the method on one sample first.");
  expect(events[1].text).toContain("Against the reference");
  const kinds = session.record.entries(["reference", "pilot_run", "pilot_approved", "plan_approved", "validation"]).map((e) => e.kind);
  expect(kinds).toEqual(["reference", "pilot_run", "pilot_approved", "plan_approved", "validation"]);
  const approved = session.record.entries(["plan_approved"])[0]!;
  expect((approved.data.pilot as { sample: string }).sample).toBe("Set 1");
  const v = session.record.entries(["validation"])[0]!.data as { pairs: { sample: string; ours: number; ref: number; pilot: boolean }[]; summary: string[]; plot: string };
  expect(v.pairs).toEqual([{ sample: "Set 1", ours: 41, ref: 530, pilot: true }, { sample: "Set 2", ours: 400, ref: 410, pilot: false }, { sample: "Set 3", ours: 290, ref: 300, pilot: false }]);
  expect(v.summary[2]).toBe("Without the pilot sample: 2 samples. Mean difference (agent minus reference) -10 (-2.886%). Correlation r = not defined.");
  expect(existsSync(v.plot)).toBe(true);
  const final = session.record.entries(["assistant"]).filter((e) => e.data.final).at(-1)!;
  expect(String(final.data.text)).toContain("Definitions, from the confirmed analysis:\n- positive cell: A cell with at least 1 red pixel inside its outline.");
  const book = unzip(readFileSync(join(session.workDir, "results.xlsx")));
  const workbook = book.get("xl/workbook.xml")!.toString();
  expect(workbook).toMatch(/name="Summary".*name="Pilot".*name="Validation"/s);
  const sheetText = [...book.entries()].filter(([k]) => k.startsWith("xl/worksheets/")).map(([, v]) => v.toString()).join("\n");
  expect(sheetText).toContain("Definition");
  expect(sheetText).toContain("A cell with at least 1 red pixel inside its outline.");
  expect(sheetText).toContain("Without the pilot sample: 2 samples.");

  session.planFirst = false;
  session.setDecision("min_size", 9);
  const p2 = new FakeProvider([{ calls: [folder] }, { text: "Waiting for a new pilot." }, { text: "Waiting for a new pilot." }]);
  session.provider = p2;
  await session.send("Count all fields again");
  const last = session.record.entries(["tool_result"]).filter((e) => e.data.tool === "count").at(-1)!;
  expect(String(last.data.error)).toMatch(/^Pilot first: count gets the folder .*The pilot is out of date: min_size changed to 9 after the pilot\./);
});

test("pilot: a held-back reference is hidden from the agent, and the harness compares every sample after the batch", async () => {
  const { proj, images, ref } = pilotProject();
  const provider = new FakeProvider([CLARIFY, { calls: [{ name: "plan", args: CELL_PLAN(images) }] },
    { calls: [{ name: "plan", args: { ...CELL_PLAN(images), definitions: [{ measure: "positive cell", definition: "A cell with at least 5 red pixels inside its outline." }] } }] },
    { calls: [{ name: "read_file", args: { path: ref } }] },
    { calls: [{ name: "run_script", args: { code: "import pandas as pd\nprint(pd.read_excel('Analysis.xlsx'))" } }] },
    { calls: [{ name: "count", args: { input: join(images, "Set 1.tif"), method: "Otsu" } }] },
    { calls: [{ name: "pilot_result", args: { sample: "Set 1", values: { "positive cell": 41 }, images: [], check: "" } }] },
    { calls: [{ name: "count", args: { input: images, method: "Otsu" } }] },
    { calls: [{ name: "batch_results", args: { measure: "positive cell", values: [{ sample: "Set 1", value: 41 }, { sample: "Set 2", value: 400 }] } }] },
    { text: "Done. Set 2 has 400 positive cells (a positive cell has at least 5 red pixels inside its outline)." },
    { text: "Done." },
  ]);
  session = await Session.create({ adapters: [LAB], provider, cwd: proj, interactive: true, settings: { permissionMode: "bypass" } as never });
  session.decisions.applySetup({ method: "Otsu" });
  let n = 0;
  const texts: string[] = [];
  session.bus.on((e) => {
    if (e.type === "question" && e.question.title === "Earlier results") setTimeout(() => session!.answer(e.question.qid, "blind"), 0);
    if (e.type !== "plan") return;
    texts.push(e.text);
    const r = e.stage === "pilot" ? { action: "confirm" as const } : n++ === 0 ? { action: "change" as const, text: "Use 5 red pixels.", definition: { measure: "positive cell", old: "A cell with at least 1 red pixel inside its outline.", new: "A cell with at least 5 red pixels inside its outline." } } : { action: "pilot" as const };
    setTimeout(() => session!.respondPlan(r), 0);
  });
  await session.send(`Count the red-positive cells in ${images}`);

  expect(session.record.entries(["decision"]).find((e) => e.data.key === "definition:positive cell")!.data).toMatchObject({ old: "A cell with at least 1 red pixel inside its outline.", new: "A cell with at least 5 red pixels inside its outline.", by: "human" });
  const blocked = session.record.entries(["tool_result"]).filter((e) => e.data.tool === "read_file" || e.data.tool === "run_script");
  expect(blocked.map((e) => e.data.error)).toEqual(["Analysis.xlsx is held back for the blind test. The harness compares it with your results after the batch. Do not read it.", "Analysis.xlsx is held back for the blind test. The harness compares it with your results after the batch. Do not read it."]);
  expect(session.record.entries(["pilot_run"])[0]!.data.comparison).toEqual([]);
  expect(texts[2]).toContain("The reference is held back for the blind test.");
  const v = session.record.entries(["validation"])[0]!.data as { mode: string; pairs: { ref: number }[] };
  expect(v.mode).toBe("blind");
  expect(v.pairs.map((p) => p.ref)).toEqual([530, 410]);
  expect(session.record.entries(["reference"]).at(-1)!.data).toMatchObject({ mode: "blind", revealed: true });
  expect(toolTexts(provider).at(-1)).toContain("Now you can read the reference.");
});

test("a script that only lists files makes no result node; a script that saves a table does", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-cwd-"));
  writeFileSync(join(cwd, "sleep.csv"), "extra,group\n0.7,1\n1.9,2\n");
  const look = { purpose: "Find the data", does: "Lists the files in the project folder.", code: "import os\nprint(sorted(os.listdir('.')))" };
  const mean = { purpose: "Mean extra sleep", does: "Reads sleep.csv and saves the mean extra sleep of each group.", code: "import csv\nrows=list(csv.DictReader(open('sleep.csv')))\nsave_table('means', [{'group': r['group'], 'extra': float(r['extra'])} for r in rows])" };
  const provider = new FakeProvider([{ calls: [{ name: "run_script", args: look }] }, { calls: [{ name: "run_script", args: mean }] }, { text: "ok" }]);
  session = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false, permissionMode: "bypass" } });
  await session.send("mean extra sleep");
  const results = session.record.entries(["tool_result"]);
  expect(results.map((e) => e.data.ok)).toEqual([true, true]);
  expect(results.map((e) => e.node)).toEqual([undefined, "n1"]);
  expect(session.record.nodes().map((n) => n.tool)).toEqual(["run_script"]);
});

test("a confirmed plan covers the load of the adapter it names; an adapter that it does not name loads as the agent's choice with a note and no card", async () => {
  const cwd = pickCwd();
  const provider = new FakeProvider([CLARIFY, { calls: [{ name: "use_adapter", args: { name: "lab", reason: "It counts." } }] },
    { calls: [{ name: "list_adapters", args: {} }] },
    { calls: [{ name: "plan", args: { question: "How many particles?", programs: [{ part: "Counting", adapter: "lab", why: "It counts particles." }], steps: [{ step: "Count the particles", tool: "count" }] } }] },
    { calls: [{ name: "use_adapter", args: { name: "lab", reason: "The plan names it." } }] },
    { calls: [{ name: "use_adapter", args: { name: "lab2", reason: "A second counter to check the first." } }] },
    { text: "Both adapters are loaded." },
    { text: "Both adapters are loaded." },
  ]);
  session = await Session.create({ adapters: [], provider, cwd, interactive: true });
  const asked: { key: string; options: string[] }[] = [];
  session.bus.on((e) => {
    if (e.type === "plan") setTimeout(() => session!.respondPlan({ action: "approve" }), 0);
    if (e.type !== "question") return;
    asked.push({ key: e.question.decisionKey, options: e.question.options.map((o) => o.label) });
    setTimeout(() => session!.answer(e.question.qid, e.question.options[0]!.value), 0);
  });
  session.decisions.applySetup({ question: "How many particles?" });
  await session.send("Count the particles in /data/a.lab");

  const uses = session.record.entries(["tool_result"]).filter((e) => e.data.tool === "use_adapter");
  expect(String(uses[0]!.data.error)).toMatch(/^Plan first: name the adapter in the programs section of the plan/);
  expect(uses.slice(1).map((e) => e.data.ok)).toEqual([true, true]);
  expect(asked).toEqual([]);
  expect(session.adapters.map((a) => a.name)).toEqual(["lab", "lab2"]);
  const labDecision = session.record.entries(["decision"]).find((e) => e.data.key === "adapter")!;
  expect(labDecision.data).toMatchObject({ new: "lab", by: "human", reason: "the scientist approved plan version 1, which names lab" });
  const notes = session.record.entries(["notice"]).filter((e) => e.data.plan === "deviation").map((e) => e.data.text);
  expect(notes).toEqual(["Not in the approved plan: the adapter lab2. Reason: A second counter to check the first."]);
  expect(session.planApproves("lab2")).toBe(false);
  expect(session.planApproves("lab")).toBe(true);
});

test("Questions come before the proposed metrics; technical questions and questions the request answers are not asked", async () => {
  const metrics = {
    restatement: "You want: the number of particles in a.tif. You also want to know if ImageJ is ready.",
    definitions: [{ measure: "particle", definition: "An object above the threshold, at least 5 px." }],
    steps: [{ step: "Count the particles", tool: "count", settings: [{ key: "method", label: "Threshold method", value: "Otsu", by: "default" }, { key: "min_size", label: "Smallest particle", value: 5, by: "default" }] }],
  };
  const provider = new FakeProvider([
    { calls: [{ name: "plan", args: metrics }] },
    {
      calls: [LOOK, {
        name: "clarify",
        args: {
          found: "I see one image with about 60 dark particles.",
          questions: [
            { question: "What counts as one particle: one dark spot, or one cluster?", options: ["One dark spot", "One cluster"] },
            { question: "Which threshold method should I use?", options: ["Otsu", "Triangle"] },
            { question: "Which image?", answered_by_request: "Count the particles in a.tif" },
          ],
        },
      }],
    },
    { calls: [{ name: "plan", args: metrics }] },
    { calls: [{ name: "count", args: { input: "/data/a.tif", method: "Otsu", min_size: 5 } }] },
    { text: "There are 41 particles (a particle is an object above the threshold, at least 5 px)." },
    { text: "There are 41 particles (a particle is an object above the threshold, at least 5 px)." },
  ]);
  session = await Session.create({ adapters: [LAB], provider, cwd: tmpdir(), interactive: true });
  session.decisions.applySetup({});
  const order: string[] = [];
  const asked: string[] = [];
  let edited = false;
  session.bus.on((e) => {
    if (e.type === "clarify") order.push(`questions:${e.qids.length}`);
    if (e.type === "question") {
      asked.push(e.question.text);
      setTimeout(() => session!.answer(e.question.qid, "One dark spot"), 0);
    }
    if (e.type !== "plan") return;
    order.push(`metrics:${e.version}`);
    if (!edited) {
      edited = true;
      expect(e.settings!.map((x) => [x.label, x.value, x.by])).toEqual([["Threshold method", "Otsu", "default"], ["Smallest particle", 5, "default"]]);
      expect(e.text).toContain("[2] Threshold method: Otsu (default) · [3] Smallest particle: 5 (default)");
      setTimeout(() => session!.respondPlan({ action: "set", index: 1, value: "8" }), 0);
    } else setTimeout(() => session!.respondPlan({ action: "approve" }), 0);
  });
  await session.send("Count the particles in a.tif");

  const plans = session.record.entries(["tool_result"]).filter((e) => e.data.tool === "plan");
  expect(String(plans[0]!.data.error)).toMatch(/^Phase 1 first: call clarify/);
  expect(order).toEqual(["questions:1", "metrics:1", "metrics:2"]);
  expect(asked).toEqual(["What counts as one particle: one dark spot, or one cluster?"]);
  const clarify = session.record.entries(["clarify"]);
  expect(clarify.map((e) => e.data.action)).toEqual(["asked", "answered"]);
  expect(clarify[0]!.data).toMatchObject({ phase: "Questions", technical: ["Which threshold method should I use?"], skipped: ["Which image? The request says: Count the particles in a.tif"] });
  expect(toolTexts(provider).find((t) => t.includes("technical settings"))).toContain("These are technical settings, not questions for the scientist: Which threshold method should I use?");
  const approved = session.record.entries(["plan_approved"])[0]!.data;
  expect(approved.version).toBe(2);
  expect(String(approved.text)).toMatch(/^You want: the number of particles in a\.tif\.\n/);
  expect(String(approved.text)).not.toContain("ImageJ");
  expect(String(approved.text)).toContain("   - Smallest particle: 8 (you)");
  expect(session.record.entries(["plan"]).find((e) => e.data.action === "setting_changed")!.data).toMatchObject({ label: "Smallest particle", old: 5, new: 8 });
  expect(session.decisions.value("method")).toBe("Otsu");
  expect(session.decisions.value("min_size")).toBe(8);
  expect(session.record.entries(["question"]).map((e) => e.data.decisionKey)).toEqual([""]);
  const node = session.record.nodes().find((n) => n.tool === "count")!;
  expect(node.decisions).toMatchObject({ method: "Otsu", min_size: 8 });
});

test("the proposed metrics leave no setting open", async () => {
  const open = (label: string) => ({ label });
  const provider = new FakeProvider([
    CLARIFY,
    { calls: [{ name: "plan", args: { steps: [{ step: "Count", tool: "count", settings: [open("a"), open("b"), open("c")] }] } }] },
    { text: "I will fill them in." },
    { text: "I will fill them in." },
  ]);
  session = await Session.create({ adapters: [LAB], provider, cwd: tmpdir(), interactive: true });
  session.decisions.applySetup({});
  await session.send("Count the particles in a.tif");
  const r = session.record.entries(["tool_result"]).filter((e) => e.data.tool === "plan").at(-1)!;
  expect(String(r.data.error)).toMatch(/^Open settings: a; b; c\. Fill in every setting with a value/);
});

test("a setting named like a decision counts as that decision, and the run asks no second time; a hand count named by a relative path is found", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-rel-"));
  mkdirSync(join(cwd, "images", "control"), { recursive: true });
  writeFileSync(join(cwd, "images", "control", "field1_ch1.png"), "x");
  writeFileSync(join(cwd, "hand_counts.csv"), "field,red-positive cells\ncontrol/field1,7\n");
  const provider = new FakeProvider([
    CLARIFY,
    { calls: [{ name: "plan", args: { steps: [{ step: "Count", tool: "count", settings: [{ label: "Threshold method", value: "Triangle", by: "agent" }] }] } }] },
    { calls: [{ name: "count", args: { input: "/data/a.tif", method: "Triangle", min_size: 5 } }] },
    { text: "There are 66 particles." },
    { text: "There are 66 particles." },
  ]);
  session = await Session.create({ adapters: [LAB], provider, cwd, interactive: true });
  session.decisions.applySetup({});
  const asked: string[] = [];
  session.bus.on((e) => {
    if (e.type === "question") {
      asked.push(e.question.title);
      setTimeout(() => session!.answer(e.question.qid, "none"), 0);
    }
    if (e.type === "plan") setTimeout(() => session!.respondPlan({ action: "approve" }), 0);
  });
  await session.send("Count the red-positive cells in images/ for each group.");
  expect(asked).toEqual(["Earlier results"]);
  expect(session.record.entries(["clarify"])[0]!.data.reference).toBe(join(cwd, "hand_counts.csv"));
  expect(session.decisions.value("method")).toBe("Triangle");
  expect(session.record.nodes().find((n) => n.tool === "count")!.decisions).toMatchObject({ method: "Triangle" });
});

test("outside the plan the agent's program loads with no card and one line; /program changes it; an empty answer takes the recommendation; setup with no program value does not fail", async () => {
  const cwd = pickCwd();
  session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd });
  expect(() => session!.decisions.applySetup({ question: "q", adapter: undefined })).not.toThrow();
  expect(session.decisions.owner("adapter")).toBe("agent");
  const r = await session.useAdapter("lab", "It reads .lab files.");
  expect(r.ok).toBe(true);
  expect(session.record.entries(["question"])).toHaveLength(0);
  const { Mapper } = await import("../src/ui/items.ts");
  const m = new Mapper(session as never);
  const loaded = session.record.entries(["adapter"]).at(-1)!;
  expect(m.map(loaded).map((x: any) => x.text)).toEqual(["Using Lab counter through lab: It reads .lab files. Change with /program."]);
  const changed = await session.changeProgram("lab2");
  expect(changed).toEqual({ ok: true, text: "The program is now Lab counter through lab2. The agent uses it from the next step." });
  expect(session.record.entries(["decision"]).filter((e) => e.data.key === "adapter").at(-1)!.data).toMatchObject({ new: "lab2", by: "human", reason: "chosen by the scientist with /program" });
  expect(session.adapters.map((a) => a.name)).toEqual(["lab", "lab2"]);
  const q = await session.questions.ask({ decisionKey: "", title: "Threshold", text: "?", options: [{ value: "Otsu", label: "Otsu" }, { value: "Li", label: "Li" }], recommendation: { value: "Li", reason: "" }, evidence: "" });
  await session.answer(q.qid, undefined);
  expect(session.record.entries(["answer"]).at(-1)!.data.value).toBe("Li");
  const none = await session.questions.ask({ decisionKey: "", title: "Color", text: "?", options: [], evidence: "" });
  await expect(session.answer(none.qid, undefined)).rejects.toThrow("Color: choose an option or type a value.");
});

test("the data check and the sample sheet: problems become question cards, the sheet is edited and saved, and the design notes reach the agent", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-effero-"));
  const root = join(cwd, "Ox-LDL");
  for (const g of ["Ceramide", "Control"]) for (const s of [1, 2, 3]) for (const f of [1, 2, 3]) for (const ch of ["red", "green"]) {
    if (g === "Control" && s === 3 && f === 2 && ch === "red") continue;
    mkdirSync(join(root, g, `Set ${s}`), { recursive: true });
    writeFileSync(join(root, g, `Set ${s}`, `Set ${s}_0${f}_${ch}.tif`), "xxxx");
  }
  const steps = [{ step: "Count the red-positive cells in each field", tool: "count", settings: [{ key: "method", label: "Threshold method", value: "Otsu", by: "default" }, { key: "min_size", label: "Smallest particle", value: 5, by: "default" }] }];
  const provider = new FakeProvider([
    { calls: [{ name: "list_dir", args: { path: root } }] },
    { calls: [{ name: "clarify", args: { found: "I see 2 groups, 3 Sets each, 2 channels.", questions: [{ question: "What counts as one n?", options: ["One Set", "One field"], key: "replicate" }] } }] },
    { calls: [{ name: "plan", args: { restatement: "You want: the share of red-positive cells.", steps } }] },
    { text: "Done." },
    { text: "Done." },
    { text: "Done." },
  ]);
  session = await Session.create({ adapters: [LAB], provider, cwd, interactive: true });
  session.decisions.applySetup({});
  const titles: string[] = [];
  const clarifies: { qids: string[]; check?: string; notes?: string[] }[] = [];
  let sheetAsked = 0;
  session.bus.on((e) => {
    if (e.type === "clarify") clarifies.push(e);
    if (e.type === "question") {
      const q = e.question;
      titles.push(q.title);
      const value = q.title.startsWith("Data check") ? "leave_out" : q.title === "Sample sheet" ? (sheetAsked++ ? "accept" : "1-9 batch Day 1") : "One Set";
      if (q.title === "Sample sheet") expect(q.table?.columns).toEqual(["sample", "group", "unit", "batch", "path"]);
      setTimeout(() => session!.answer(q.qid, value), 0);
    }
    if (e.type === "plan") setTimeout(() => session!.respondPlan({ action: "approve" }), 0);
  });
  await session.send("Count the red-positive cells in Ox-LDL for each group.");

  const listed = toolTexts(provider).find((t) => t.includes("Data check by the harness"))!;
  expect(listed).toContain("1 field has no 'red' image: Control/Set 3/Set 3_02.");
  expect(listed).toContain(`Sample sheet: the harness made ${join(session.outputDir, "samples.csv")} (18 rows)`);
  expect(titles).toEqual(["Data check: missing images", "What counts as one n?", "Sample sheet", "Sample sheet"]);
  expect(clarifies[0]!.check).toContain("Data check of Ox-LDL: 35 files in 6 folders, 2 channels (green, red).");
  expect(clarifies.at(-1)!.notes!.join(" ")).toContain("n is the Set. n per group: Ceramide 3 (9 samples), Control 3 (9 samples).");
  expect(session.record.entries(["decision"]).find((e) => e.data.key === "data_check:channel:red")!.data).toMatchObject({ new: "leave_out", by: "human" });
  const csv = readFileSync(join(session.outputDir, "samples.csv"), "utf8").split("\n");
  expect(csv[0]).toBe("sample,group,unit,batch,path");
  expect(csv[1]).toBe("Ceramide Set 1_01,Ceramide,Set 1,Day 1,Ox-LDL/Ceramide/Set 1/Set 1_01*");
  expect(csv[10]).toBe("Control Set 1_01,Control,Set 1,,Ox-LDL/Control/Set 1/Set 1_01*");
  expect(session.record.entries(["samples"]).map((e) => e.data.action)).toEqual(["drafted", "edited", "accepted", "design_checks"]);
  const summary = toolTexts(provider).find((t) => t.includes("The scientist checked the sample sheet"))!;
  expect(summary).toContain("Data check answers: 1 field has no 'red' image: Control/Set 3/Set 3_02. Answer: Leave out the 1 field.");
  expect(summary).toContain("use the unit column as n");
  const approved = session.record.entries(["plan_approved"])[0]!.data.plan as { data: { n: string; files: string[] } };
  expect(approved.data.n).toBe("From the sample sheet: Ceramide: 3 Sets, 9 samples; Control: 3 Sets, 9 samples");
  expect(approved.data.files).toEqual([join(session.outputDir, "samples.csv")]);
  const { checkSheets } = await import("../src/core/results.ts");
  const sheets = checkSheets(session.record);
  expect(sheets.map((s) => s.name)).toEqual(["Data check", "Samples"]);
  expect(sheets[0]!.rows.find((r) => r[1] === "missing channel")!.slice(2)).toEqual(["question", "Control/Set 3/Set 3_02", "1 field has no 'red' image: Control/Set 3/Set 3_02.", "leave_out"]);
  expect(sheets[0]!.rows.some((r) => r[1] === "pseudoreplication")).toBe(true);
});

test("a table with missing values: the data check asks, and stop ends the turn before the proposed metrics", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-dose-"));
  const csv = join(cwd, "dose.csv");
  writeFileSync(csv, ["Animal,Group,dose", ...Array.from({ length: 20 }, (_, i) => `M${i + 1},${i % 2 ? "Drug" : "Control"},${i < 12 ? "" : (i / 10).toFixed(1)}`)].join("\n") + "\n");
  const provider = new FakeProvider([
    { calls: [{ name: "read_file", args: { path: csv } }] },
    { calls: [{ name: "clarify", args: { found: "I see 20 animals in 2 groups." } }] },
    { text: "Please fill in the dose for the 12 animals." },
    { text: "Please fill in the dose for the 12 animals." },
  ]);
  session = await Session.create({ adapters: [LAB], provider, cwd, interactive: true });
  session.decisions.applySetup({});
  const asked: string[] = [];
  session.bus.on((e) => {
    if (e.type === "question") {
      asked.push(e.question.text);
      setTimeout(() => session!.answer(e.question.qid, "stop"), 0);
    }
  });
  await session.send("Compare the dose between the groups in dose.csv.");
  expect(asked[0]).toBe("12 rows have no value for 'dose'. Leave them out, or stop?");
  expect(asked).not.toContain("Sample sheet");
  expect(session.record.entries(["plan"])).toEqual([]);
  expect(session.record.entries(["notice"]).some((e) => String(e.data.text).startsWith("You stopped the analysis to correct the data: 12 rows have no value for 'dose'"))).toBe(true);
  expect(String(session.record.entries(["tool_result"]).find((e) => e.data.tool === "clarify")!.data.summary)).toContain("No step runs. Stop now.");
  expect(readFileSync(join(session.outputDir, "samples.csv"), "utf8").split("\n").slice(0, 2)).toEqual(["sample,group,unit,batch,path", "M1,Control,M1,,dose.csv row 2"]);
});

test("a changed answer goes through the decision record: it is logged, and the steps that used the old value are out of date", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "count", args: { input: "/data/a.tif", min_size: 10 } }] },
    { text: "There are 66 particles (step 1)." },
    { text: "There are 66 particles (step 1)." },
  ]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  let qid = "";
  session.bus.on((e) => {
    if (e.type !== "question") return;
    qid = e.question.qid;
    setTimeout(() => session!.answer(e.question.qid, "Triangle"), 0);
  });
  session.decisions.applySetup({ question: "How many particles?" });
  await session.send("Count the particles in a.tif");
  const node = session.record.nodes().find((n) => n.tool === "count" && !n.sensitivityOf)!;
  const stale = await session.changeAnswer(qid, "Otsu");
  expect(stale).toContain(node.id);
  expect(session.decisions.value("method")).toBe("Otsu");
  expect(session.record.entries(["answer"]).at(-1)!.data).toMatchObject({ qid, value: "Otsu", changed: true, old: "Triangle" });
  expect(session.record.entries(["decision"]).at(-1)!.data).toMatchObject({ key: "method", old: "Triangle", new: "Otsu", reason: `changed answer to ${qid}` });
  expect(await session.changeAnswer(qid, "Otsu")).toEqual([]);
});

test("the four stages in order: Questions (meaning only), Proposed metrics (pre-filled), Demonstration (runs again after a change), Confirmed (no second card at run time)", async () => {
  const { proj, images, qc } = pilotProject();
  const one = join(images, "Set 1.tif");
  const provider = new FakeProvider([
    {
      calls: [LOOK, {
        name: "clarify",
        args: {
          found: "I see 3 fields.",
          questions: [
            { question: "What is one sub-sample (one n)?", options: ["One Set", "One field"] },
            { question: "Threshold method for cells (Otsu, Default, Triangle, Li)", options: ["Otsu", "Default", "Triangle", "Li"] },
            { question: "Minimum cell size" },
            { question: "Maximum cell size" },
            { question: "Red threshold" },
            { question: "What counts as a positive cell?", options: ["At least 1 red pixel inside the outline", "Red covers most of the cell"] },
          ],
        },
      }],
    },
    { calls: [{ name: "plan", args: { ...CELL_PLAN(images), steps: [{ step: "Count the cells in each field", tool: "count", settings: [{ key: "method", label: "Threshold method", value: "Otsu", by: "agent" }, { key: "min_size", label: "Smallest particle", value: 5, by: "default" }] }] } }] },
    { calls: [{ name: "count", args: { input: one, method: "Otsu", min_size: 5 } }] },
    { calls: [{ name: "pilot_result", args: { sample: "Set 1", values: { "positive cell": 41 }, images: [qc], legend: "yellow = counted as positive", check: "Small debris is counted." } }] },
    { calls: [{ name: "count", args: { input: one, method: "Otsu", min_size: 8 } }] },
    { calls: [{ name: "pilot_result", args: { sample: "Set 1", values: { "positive cell": 39 }, images: [qc], legend: "yellow = counted as positive", check: "The debris is gone." } }] },
    { calls: [{ name: "count", args: { input: images, method: "Otsu", min_size: 8 } }] },
    { text: "Set 1 has 39 positive cells (a positive cell has at least 1 red pixel inside its outline)." },
    { text: "Set 1 has 39 positive cells (a positive cell has at least 1 red pixel inside its outline)." },
  ]);
  session = await Session.create({ adapters: [LAB], provider, cwd: proj, interactive: true });
  session.decisions.applySetup({});
  const asked: string[] = [];
  const cards: { stage: string; text: string; settings?: { label: string; value?: unknown; by?: string }[] }[] = [];
  session.bus.on((e) => {
    if (e.type === "question") {
      asked.push(e.question.title);
      setTimeout(() => session!.answer(e.question.qid, e.question.title === "Earlier results" ? "none" : e.question.options[0]?.value ?? "yes"), 0);
    }
    if (e.type !== "plan") return;
    cards.push({ stage: e.stage, text: e.text, settings: e.settings });
    const n = cards.length;
    setTimeout(() => session!.respondPlan(n === 1 ? { action: "pilot" } : n === 2 ? { action: "set", index: 1, value: "8" } : { action: "confirm" }), 0);
  });
  await session.send(`Count the red-positive cells in ${images}`);

  expect(asked.filter((t) => t !== "Earlier results")).toEqual(["What is one sub-sample (one n)?", "What counts as a positive cell?"]);
  expect(session.record.entries(["clarify"])[0]!.data.technical).toEqual(["Threshold method for cells (Otsu, Default, Triangle, Li)", "Minimum cell size", "Maximum cell size", "Red threshold"]);
  expect(cards.map((c) => c.stage)).toEqual(["plan", "pilot", "pilot"]);
  expect(cards[0]!.settings!.map((x) => [x.label, x.value, x.by])).toEqual([["Threshold method", "Otsu", "agent"], ["Smallest particle", 5, "default"]]);
  expect(cards[0]!.text).toContain("1. Count the cells in each field: [2] Threshold method: Otsu (agent) · [3] Smallest particle: 5 (default)");
  expect(cards[1]!.text).toContain("Legend: yellow = counted as positive");
  expect(cards[2]!.text).toContain("- positive cell: 39");
  const phases = session.record
    .entries(["clarify", "plan", "pilot_run", "plan_approved"])
    .map((e) => e.data.phase)
    .filter((p, i, all) => p && p !== all[i - 1]);
  expect(phases).toEqual(["Questions", "Proposed metrics", "Demonstration on a sample", "Confirmed"]);
  const counts = session.record.entries(["tool_result"]).filter((e) => e.data.tool === "count");
  expect(counts.map((e) => (e.data.effectiveArgs as { min_size: number }).min_size)).toEqual([5, 8, 8]);
  expect(session.record.entries(["pilot_rejected"])[0]!.data.reason).toBe("Smallest particle changed to 8");
  expect(session.decisions.value("min_size")).toBe(8);
  expect(session.decisions.value("method")).toBe("Otsu");
  const runQuestions = session.record.entries(["question"]).filter((e) => e.data.decisionKey === "method" || e.data.decisionKey === "min_size");
  expect(runQuestions).toHaveLength(0);
});

test("settings of a program that loads after the confirmation count at run time: the harness asks for the tools once, keys the settings, and no card asks again", async () => {
  const cwd = pickCwd();
  const loose = { programs: [{ part: "Counting", adapter: "lab", why: "It counts particles." }], steps: [{ step: "Count the particles" }] };
  const named = { ...loose, steps: [{ step: "Count the particles", tool: "count", settings: [{ label: "Threshold method", value: "Triangle", by: "agent" }] }] };
  const provider = new FakeProvider([
    CLARIFY,
    { calls: [{ name: "plan", args: loose }] },
    { calls: [{ name: "plan", args: named }] },
    { calls: [{ name: "use_adapter", args: { name: "lab", reason: "The plan names it." } }] },
    { calls: [{ name: "count", args: { input: "/data/a.lab" } }] },
    { text: "There are 66 particles (step 1)." },
    { text: "There are 66 particles (step 1)." },
  ]);
  session = await Session.create({ adapters: [], provider, cwd, interactive: true });
  session.decisions.applySetup({ question: "How many particles?" });
  const cards: { settings?: { label: string; key?: string; value?: unknown; by?: string }[] }[] = [];
  session.bus.on((e) => {
    if (e.type === "question") setTimeout(() => session!.answer(e.question.qid, e.question.options[0]?.value ?? "x"), 0);
    if (e.type === "plan") {
      cards.push({ settings: e.settings });
      setTimeout(() => session!.respondPlan({ action: "approve" }), 0);
    }
  });
  await session.send("Count the particles in /data/a.lab");
  const plans = session.record.entries(["tool_result"]).filter((e) => e.data.tool === "plan");
  expect(String(plans[0]!.data.error)).toMatch(/^Name the tool of each step .*Tools of the planned programs and their settings: count: method \(Threshold method: Default, Otsu, Triangle\)\. Then call plan again\.$/);
  expect(cards[0]!.settings!.map((x) => [x.label, x.key, x.value, x.by])).toEqual([["Threshold method", "method", "Triangle", "agent"], ["Smallest particle", "min_size", 5, "default"]]);
  expect(session.record.entries(["question"]).filter((e) => e.data.decisionKey && e.data.decisionKey !== "")).toHaveLength(0);
  expect(session.decisions.value("method")).toBe("Triangle");
  expect(session.decisions.value("min_size")).toBe(5);
  expect(session.record.nodes().find((n) => n.tool === "count")!.decisions).toMatchObject({ method: "Triangle", min_size: 5 });
});

test("batch runner: after the pilot, the harness repeats the pilot steps on the other samples with no model call", async () => {
  const { proj, images } = pilotProject();
  const provider = new FakeProvider([CLARIFY, { calls: [{ name: "plan", args: { ...CELL_PLAN(images), steps: [{ step: "Blur each field", tool: "blur" }] } }] },
    { calls: [{ name: "blur", args: { input: join(images, "Set 1.tif"), sigma: 2, purpose: "Blur the field: Set 1" } }] },
    { calls: [{ name: "pilot_result", args: { sample: "Set 1", values: { "positive cell": 41 }, images: [], check: "" } }] },
    { text: "The model must not be called again." },
  ]);
  session = await Session.create({ adapters: [LAB], provider, cwd: proj, interactive: true, settings: { permissionMode: "bypass" } as never });
  session.decisions.applySetup({ method: "Otsu" });
  const asked: string[] = [];
  session.bus.on((e) => {
    if (e.type === "question") {
      asked.push(e.question.text);
      setTimeout(() => session!.answer(e.question.qid, e.question.title === "Earlier results" ? "ignore" : e.question.options[0]?.value ?? "yes"), 0);
    }
    if (e.type === "plan") setTimeout(() => session!.respondPlan(e.stage === "plan" ? { action: "pilot" } : { action: "confirm" }), 0);
  });
  await session.send(`Blur each field in ${images}`);

  expect(asked.at(-1)).toBe(`Run the confirmed steps (blur) with the same settings on the other 2 samples now? The harness runs them without a model, so the run costs no tokens. First samples: Set 2.tif; Set 3.tif.`);
  expect(provider.requests).toHaveLength(4);
  const blurs = session.record.nodes().filter((n) => n.tool === "blur");
  expect(blurs.map((n) => [n.args.input, n.args.sigma])).toEqual([[join(images, "Set 1.tif"), 2], [join(images, "Set 2.tif"), 2], [join(images, "Set 3.tif"), 2]]);
  const calls = session.record.entries(["tool_call"]).filter((e) => e.data.tool === "blur").map((e) => (e.data.args as { purpose?: string }).purpose);
  expect(calls.slice(1)).toEqual(["blur: Set 2.tif", "blur: Set 3.tif"]);
  const table = readFileSync(join(session.outputDir, "batch-results.csv"), "utf8");
  expect(table).toBe("sample,status,blur.sigma,error\nSet 2.tif,done,2,\nSet 3.tif,done,2,\n");
  const notices = session.record.entries(["notice"]).map((e) => String(e.data.text));
  expect(notices.find((t) => t.startsWith("The harness ran"))).toMatch(/^The harness ran the pilot steps on 2 of 2 samples: 2 done, 0 with an error\. Table: .*batch-results\.csv\. Ask the agent for a summary when you want one\.$/);
});

function failOn(provider: FakeProvider, failures: Set<number>) {
  const step = provider.step.bind(provider);
  let n = 0;
  provider.step = async (req) => {
    const i = n++;
    if (failures.has(i)) throw new ProviderError("Cannot reach the Claude API. Check the network.", true);
    return step(req);
  };
}

async function recoverySession(provider: FakeProvider, extra: Record<string, unknown> = {}) {
  const s = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { referee: "none", ...extra } });
  s.decisions.applySetup({});
  return s;
}

const toolCalls = (s: Session) => s.record.entries(["tool_call"]).map((e) => `${e.data.callId}:${e.data.tool}`);

test("a failure in the middle of a turn shows a card and Resume does not repeat a finished tool call", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "state", args: {} }] }, { calls: [{ name: "note", args: { text: "x" } }] }, { text: "All done." }]);
  failOn(provider, new Set([1]));
  session = await recoverySession(provider);
  const titles: string[] = [];
  session.bus.on((e) => {
    if (e.type === "question") {
      titles.push(`${e.question.title}|${e.question.options.map((o) => o.label).join(",")}`);
      setTimeout(() => session!.answer(e.question.qid, "resume"), 0);
    }
  });
  const answer = await session.send("go");
  expect(answer).toBe("All done.");
  expect(titles).toEqual(["The model did not answer|Resume,Stop"]);
  const calls = toolCalls(session);
  expect(calls.filter((c) => c.endsWith(":state"))).toHaveLength(1);
  expect(new Set(calls).size).toBe(calls.length);
  const sent = provider.requests.map((r) => r.messages.length);
  expect(sent[1]).toBe(sent[0]! + 2);
});

test("Stop on the card ends the turn and keeps the finished steps", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "state", args: {} }] }, { text: "never" }]);
  failOn(provider, new Set([1, 2, 3]));
  session = await recoverySession(provider);
  session.bus.on((e) => {
    if (e.type === "question") setTimeout(() => session!.answer(e.question.qid, "stop"), 0);
  });
  await session.send("go");
  expect(toolCalls(session)).toHaveLength(1);
  expect(session.record.entries(["error"]).map((e) => String(e.data.message))).toEqual(["Cannot reach the Claude API. Check the network."]);
  expect(session.record.entries(["tool_result"])).toHaveLength(1);
});

test("Answer later on the card ends the wait and closes the card question", async () => {
  const provider = new FakeProvider([{ text: "never" }]);
  failOn(provider, new Set([0, 1, 2]));
  session = await recoverySession(provider);
  session.bus.on((e) => {
    if (e.type === "question") setTimeout(() => session!.answerLater([e.question.qid]), 0);
  });
  await session.send("go");
  expect(session.questions.open()).toHaveLength(0);
  expect(session.record.entries(["error"])).toHaveLength(1);
});

test("Stop during a streamed reply keeps the text and marks it as stopped", async () => {
  const provider = new FakeProvider([]);
  provider.step = (req) =>
    new Promise((_done, fail) => {
      req.onDelta?.({ type: "text", text: "The first part of the reply" });
      req.signal?.addEventListener("abort", () => fail(new Error("aborted")));
      setTimeout(() => session!.interrupt(), 5);
    });
  session = await recoverySession(provider);
  const events: string[] = [];
  session.bus.on((e) => e.type === "delta_reset" && events.push(e.type));
  await session.send("go");
  const kept = session.record.entries(["assistant"]).at(-1)!;
  expect(kept.data).toMatchObject({ text: "The first part of the reply", final: false, stopped: true });
  expect(session.record.entries(["notice"]).map((e) => e.data.text)).toContain("Stopped. The reply above is not complete.");
  expect(events).toEqual([]);
});

test("the card offers the local model if one is set", async () => {
  const provider = new FakeProvider([{ text: "ok" }]);
  failOn(provider, new Set([0]));
  session = await recoverySession(provider, { local_model: "ollama:qwen3:8b" });
  const labels: string[] = [];
  session.bus.on((e) => {
    if (e.type === "question") {
      labels.push(...e.question.options.map((o) => o.label));
      setTimeout(() => session!.answer(e.question.qid, "resume"), 0);
    }
  });
  await session.send("go");
  expect(labels).toEqual(["Resume", "Switch to the local model", "Stop"]);
});

test("a headless run waits, tries again and then stops with a clear error", async () => {
  const provider = new FakeProvider([{ text: "ok" }]);
  failOn(provider, new Set([0, 1, 2, 3, 4]));
  session = await recoverySession(provider, { headless: true });
  session.recoveryWaitMs = 0;
  session.recoveryRounds = 2;
  const cards: unknown[] = [];
  session.bus.on((e) => e.type === "question" && cards.push(e));
  await session.send("go");
  expect(cards).toHaveLength(0);
  expect(String(session.record.entries(["error"]).at(-1)!.data.message)).toMatch(/waited 2 times and then stopped/);
});

test("a headless run goes on if the network comes back", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "state", args: {} }] }, { text: "Back again." }]);
  failOn(provider, new Set([1, 2]));
  session = await recoverySession(provider, { headless: true });
  session.recoveryWaitMs = 0;
  expect(await session.send("go")).toBe("Back again.");
});

function nearLimit(): void {
  process.env.CUVETTE_SPEND_FILE = join(mkdtempSync(join(tmpdir(), "cuvette-spend-")), "spend.jsonl");
  process.env.CUVETTE_BUDGET_USD = "5";
  recordSpend("claude-opus-5-5", { inputTokens: 1_000_000, outputTokens: 0 });
}

function paidProvider(steps: ConstructorParameters<typeof FakeProvider>[0]): FakeProvider {
  const p = new FakeProvider(steps);
  p.info = { provider: "claude", model: "claude-opus-5-5", contextWindow: 1_000_000, vision: false, small: false };
  return p;
}

test("at 80% of the spend limit the card asks once, and Continue goes on", async () => {
  nearLimit();
  const provider = paidProvider([{ calls: [{ name: "state", args: {} }] }, { text: "done" }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), interactive: true, settings: { guidance: false } });
  const titles: string[] = [];
  const values: unknown[][] = [];
  session.bus.on((e) => {
    if (e.type !== "question") return;
    titles.push(e.question.title);
    values.push(e.question.options.map((o) => o.value));
    setTimeout(() => session!.answer(e.question.qid, "continue"), 0);
  });
  await session.send("go");
  delete process.env.CUVETTE_BUDGET_USD;
  expect(titles).toEqual(["Spend limit nearly reached"]);
  expect(values[0]).toEqual(["continue", "cheaper", "stop"]);
  expect(provider.requests.length).toBe(2);
});

test("the Stop answer at 80% sends nothing to the model", async () => {
  nearLimit();
  const provider = paidProvider([{ text: "done" }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), interactive: true, settings: { guidance: false } });
  session.bus.on((e) => {
    if (e.type === "question") setTimeout(() => session!.answer(e.question.qid, "stop"), 0);
  });
  await session.send("go");
  delete process.env.CUVETTE_BUDGET_USD;
  expect(provider.requests.length).toBe(0);
  expect(session.record.entries(["notice"]).some((e) => String(e.data.text).includes("Stopped at your choice"))).toBe(true);
});

test("a headless run at 80% logs one notice, asks nothing and goes on", async () => {
  nearLimit();
  const provider = paidProvider([{ calls: [{ name: "state", args: {} }] }, { text: "done" }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, headless: true } });
  await session.send("go");
  delete process.env.CUVETTE_BUDGET_USD;
  expect(session.record.entries(["question"])).toHaveLength(0);
  expect(session.record.entries(["notice"]).filter((e) => String(e.data.text).includes("of your $5.00 limit"))).toHaveLength(1);
  expect(provider.requests.length).toBe(2);
});

test("no card appears for a local model or below 80%", async () => {
  nearLimit();
  const local = new FakeProvider([{ text: "done" }]);
  local.info = { provider: "ollama", model: "qwen3:8b", contextWindow: 32768, vision: false, small: true, local: true };
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider: local, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), interactive: true, settings: { guidance: false } });
  await session.send("go");
  expect(session.record.entries(["question"])).toHaveLength(0);
  process.env.CUVETTE_BUDGET_USD = "50";
  await session.close();
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider: paidProvider([{ text: "done" }]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), interactive: true, settings: { guidance: false } });
  await session.send("go");
  delete process.env.CUVETTE_BUDGET_USD;
  expect(session.record.entries(["question"])).toHaveLength(0);
});

test("the plan card carries the cost estimate for the model, and a local model shows the free text", async () => {
  const estimates: (string | undefined)[] = [];
  for (const info of [{ provider: "claude", model: "claude-sonnet-5-5" }, { provider: "ollama", model: "qwen3:8b", local: true }] as const) {
    const provider = new FakeProvider([CLARIFY, { calls: [{ name: "plan", args: PLAN }] }, { text: "ok" }]);
    provider.info = { contextWindow: 100_000, vision: false, small: false, ...info };
    session = await Session.create({ adapters: [LAB], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), interactive: true });
    session.decisions.applySetup({});
    session.bus.on((e) => {
      if (e.type === "question") setTimeout(() => session!.answer(e.question.qid, "Triangle"), 0);
      if (e.type === "plan") {
        estimates.push(e.estimate);
        setTimeout(() => session!.respondPlan({ action: "approve" }), 0);
      }
    });
    await session.send("Blur a.tif and tell me what changes");
    await session.close();
  }
  expect(estimates[0]).toMatch(/^About \$\d+\.\d{2} to \$\d+\.\d{2} with Sonnet\./);
  expect(estimates[1]).toBe("Free: runs on this computer.");
});

test("a reply cut at the output limit gets a note to continue, not a final answer", async () => {
  const provider = new FakeProvider([{ text: "The counts are", stop: "max_tokens" }, { text: "All done." }]);
  session = await recoverySession(provider, { guidance: false });
  const answer = await session.send("go");
  expect(answer).toBe("All done.");
  const sent = provider.requests[1]!.messages.at(-1)!.parts[0] as { text: string };
  expect(sent.text).toMatch(/output limit stopped your last reply/);
});

test("a context that is too long is summarized once and the step runs again", async () => {
  const provider = new FakeProvider([{ text: "All done." }]);
  const step = provider.step.bind(provider);
  let n = 0;
  provider.step = async (req) => {
    if (n++ === 0) throw new ProviderError("Claude rejected the request: prompt is too long", false, true);
    return step(req);
  };
  session = await recoverySession(provider, { guidance: false });
  const forced: boolean[] = [];
  session["maybeCompact"] = async (_s: AbortSignal, force = false) => (forced.push(force), force);
  expect(await session.send("go")).toBe("All done.");
  expect(forced.filter(Boolean)).toHaveLength(1);
  expect(session.record.entries(["notice"]).some((e) => /too long for the model/.test(String(e.data.text)))).toBe(true);
});

test("a context that stays too long stops the turn with the error and no loop", async () => {
  const provider = new FakeProvider([{ text: "never" }]);
  let n = 0;
  provider.step = async () => {
    n++;
    throw new ProviderError("Claude rejected the request: prompt is too long", false, true);
  };
  session = await recoverySession(provider, { guidance: false });
  session["maybeCompact"] = async (_s: AbortSignal, force = false) => force;
  await session.send("go");
  expect(n).toBe(2);
  expect(session.record.entries(["error"]).map((e) => String(e.data.message))).toEqual(["Claude rejected the request: prompt is too long"]);
});

test("if the turn fails after one of two calls, the call that ran keeps its result", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "state", args: {} }, { name: "note", args: { text: "x" } }] }, { text: "All done." }]);
  session = await recoverySession(provider, { guidance: false });
  const run = session["runCall"].bind(session);
  let n = 0;
  session["runCall"] = async (call: never, signal: AbortSignal) => {
    if (n++ === 1) throw new Error("hook failed");
    return run(call, signal);
  };
  await session.send("go");
  const last = session["history"].at(-1)!.parts as { text: string; isError?: boolean }[];
  expect(last).toHaveLength(2);
  expect(last[0]!.isError).toBeFalsy();
  expect(last[0]!.text).not.toMatch(/not run/);
  expect(last[1]!.text).toMatch(/not run/);
});

test("a long plain text result says that the harness cut it", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  writeFileSync(join(cwd, "long.txt"), "x".repeat(500));
  const provider = new FakeProvider([{ calls: [{ name: "read_file", args: { path: join(cwd, "long.txt") } }] }, { text: "All done." }]);
  session = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false, maxResultChars: 100, phi_check: false } as never });
  session.decisions.applySetup({});
  await session.send("read long.txt");
  expect(lastToolText(provider)).toMatch(/The harness cut \d+ characters/);
});

test("a call to an unknown tool names the tools that exist", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "nope", args: {} }] }, { text: "All done." }]);
  session = await recoverySession(provider, { guidance: false });
  await session.send("go");
  expect(lastToolText(provider)).toMatch(/no tool named nope\. Use only these tools: .*\bstate\b/);
});

test("a pasted API key does not reach the model or the record", async () => {
  const key = "sk-ant-api03-Zx9_abcdefghijklmnopqrstuvwxyz0123456789";
  const provider = new FakeProvider([{ text: "ok" }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false } });
  await session.send(`my key is ${key} please count`);
  session.steer(`and ${key}`);
  const q = await session.questions.ask({ decisionKey: "", title: "Which?", text: "Which?", options: [], evidence: [] } as never);
  await session.answer(q.qid, { picked: ["a"], other: `the key ${key}` }, `note ${key}`);
  expect(JSON.stringify(provider.requests)).not.toContain(key);
  expect(readFileSync(join(session.record.dir, "log.jsonl"), "utf8")).not.toContain(key);
  expect(session.record.entries(["user"])[0]!.data.text).toBe("my key is [API key removed] please count");
  expect(session.record.entries(["notice"]).some((e) => /removed an API key/.test(String(e.data.text)))).toBe(true);
});

test("an API key in a data file does not reach the model through a tool result", async () => {
  const key = "sk-ant-api03-Qq7_abcdefghijklmnopqrstuvwxyz0123456789";
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  writeFileSync(join(cwd, "notes.txt"), `run 1\nANTHROPIC_API_KEY=${key}\n`);
  const provider = new FakeProvider([{ calls: [{ name: "read_file", args: { path: join(cwd, "notes.txt") } }] }, { text: "All done." }]);
  session = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false, phi_check: false } as never });
  session.decisions.applySetup({});
  await session.send("read notes.txt");
  expect(lastToolText(provider)).toContain("[API key removed]");
  expect(JSON.stringify(provider.requests)).not.toContain(key);
  expect(readFileSync(join(session.record.dir, "log.jsonl"), "utf8")).not.toContain(key);
  expect(session.record.entries(["notice"]).some((e) => /from the result of read_file/.test(String(e.data.text)))).toBe(true);
});

test("a session open in another live process cannot open twice, and a reused process ID does not hold it", async () => {
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false } });
  const id = session.id;
  const lock = join(session.record.dir, "open.json");
  await session.close();
  session = undefined;
  const other = process.ppid;
  const start = processStart(other);
  writeFileSync(lock, JSON.stringify({ pid: other, procStart: start ?? 0 }));
  if (start !== undefined) await expect(Session.resume(id, { provider: new FakeProvider([]) })).rejects.toThrow(/open in another window \(process \d+\)/);
  writeFileSync(lock, JSON.stringify({ pid: other, procStart: (start ?? Date.now()) - 3_600_000 }));
  session = await Session.resume(id, { provider: new FakeProvider([]) });
  expect(JSON.parse(readFileSync(lock, "utf8")).pid).toBe(process.pid);
});

test("read-only calls in one reply run together, keep their order, and a call that writes waits for them", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  for (const f of ["a", "b", "c"]) writeFileSync(join(cwd, `${f}.txt`), `text of ${f}`);
  const read = (f: string) => ({ name: "read_file", args: { path: join(cwd, `${f}.txt`) } });
  const provider = new FakeProvider([{ calls: [read("a"), read("b"), { name: "note", args: { text: "x" } }, read("c"), { name: "write_file", args: { name: "out.txt", text: "y" } }] }, { text: "All done." }]);
  session = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false, phi_check: false } as never });
  session.decisions.applySetup({});
  session.bus.on((e) => {
    if (e.type === "permission") setTimeout(() => session!.respondPermission(e.rid, true), 0);
  });
  const log: string[] = [];
  const one = session["runOne"].bind(session);
  session["runOne"] = async (call: { name: string; args: unknown }, signal: AbortSignal) => {
    const path = (call.args as { path?: string }).path;
    const name = path ? path.slice(-5, -4) : call.name;
    log.push(`start ${name}`);
    await new Promise((r) => setTimeout(r, name === "a" ? 30 : 5));
    const out = await one(call as never, signal);
    log.push(`end ${name}`);
    return out;
  };
  await session.send("read the files");
  expect(log.slice(0, 2)).toEqual(["start a", "start b"]);
  expect(log.indexOf("start note")).toBeGreaterThan(log.indexOf("end a"));
  expect(log.indexOf("start c")).toBeGreaterThan(log.indexOf("end note"));
  expect(log.indexOf("start write_file")).toBeGreaterThan(log.indexOf("end c"));
  const results = provider.requests[1]!.messages.at(-1)!.parts.filter((p) => p.type === "tool_result") as { name: string; text: string }[];
  expect(results.map((r) => r.name)).toEqual(["read_file", "read_file", "note", "read_file", "write_file"]);
  expect(results.filter((r) => r.name === "read_file").map((r) => r.text)).toEqual(["text of a", "text of b", "text of c"]);
});

test("after a call cancels the plan, the later calls in the same reply do not run", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "note", args: { text: "x" } }, { name: "state", args: {} }] }, { text: "never" }]);
  session = await recoverySession(provider, { guidance: false });
  const run = session["runCall"].bind(session);
  const ran: string[] = [];
  session["runCall"] = async (call: { name: string }, signal: AbortSignal) => {
    ran.push(call.name);
    if (call.name === "note") session!["stopTurn"] = true;
    return run(call as never, signal);
  };
  expect(await session.send("go")).toBe("");
  expect(ran).toEqual(["note"]);
  const last = session["history"].at(-1)!.parts as { text: string }[];
  expect(last[1]!.text).toMatch(/not run/);
});

test("a switch from a local model to Claude scans the earlier messages for patient identifiers again", async () => {
  const provider = new FakeProvider([{ text: "ok" }]);
  provider.info = { ...provider.info, provider: "ollama", local: true };
  session = await recoverySession(provider, { guidance: false });
  await session.send("go");
  expect(session["phiFrom"]).toBeGreaterThan(0);
  await session.applySetting("model", "claude:claude-haiku-5-5");
  expect(session["phiFrom"]).toBe(0);
});

test("a read-only call that needs a permission card does not run in parallel", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  const provider = new FakeProvider([{ text: "All done." }]);
  session = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false, phi_check: false, permissions: { read_file: "ask" } } as never });
  const call = { type: "tool_call" as const, id: "c1", name: "read_file", args: { path: join(cwd, "a.txt") } };
  expect(session["parallelSafe"](call)).toBe(false);
  expect(session["parallelSafe"]({ ...call, name: "list_dir" })).toBe(true);
  expect(session["parallelSafe"]({ ...call, name: "write_file" })).toBe(false);
  expect(session["parallelSafe"]({ ...call, name: "ask_scientist" })).toBe(false);
});

test("a retry removes the partial streamed text, and the notice counts the real tries", async () => {
  const provider = new FakeProvider([{ text: "All done." }]);
  const step = provider.step.bind(provider);
  let n = 0;
  provider.step = async (req) => {
    req.onDelta?.({ type: "text", text: "half a rep" });
    if (n++ === 0) {
      for (let attempt = 1; attempt <= 3; attempt++) req.onRetry?.({ attempt, of: 3, waitMs: 0, reason: "server error" });
      throw new ProviderError("The Claude API had a server error (529). Retry in a moment.", true);
    }
    req.onRetry?.({ attempt: 1, of: 3, waitMs: 0, reason: "server error" });
    return step(req);
  };
  session = await recoverySession(provider, { guidance: false });
  const events: string[] = [];
  session.bus.on((e) => {
    if (e.type === "delta" || e.type === "delta_reset") events.push(e.type === "delta" ? e.text : "reset");
    if (e.type === "question") setTimeout(() => session!.answer(e.question.qid, "resume"), 0);
  });
  expect(await session.send("go")).toBe("All done.");
  expect(events).toEqual(["half a rep", "reset", "half a rep", "reset", "All done."]);
  expect(session.record.entries(["notice"]).map((e) => String(e.data.text))).toContain("The model did not answer after four tries. The conversation is saved up to the last finished step.");
});

test("a reply after a full context is kept if the summary cannot make the context shorter", async () => {
  const provider = new FakeProvider([{ text: "All done." }]);
  const step = provider.step.bind(provider);
  provider.step = async (req) => {
    const result = await step(req);
    throw new ProviderError("The prompt has 31000 tokens and fills the context window of 32768 tokens.", false, true, result);
  };
  session = await recoverySession(provider, { guidance: false });
  session["maybeCompact"] = async () => false;
  expect(await session.send("go")).toBe("All done.");
  expect(session.record.entries(["error"])).toHaveLength(0);
  expect(session.record.entries(["notice"]).some((e) => /could not make the context shorter/.test(String(e.data.text)))).toBe(true);
});

test("a failed switch to the local model keeps the model, the referee and the tools of before", async () => {
  const provider = new FakeProvider([{ text: "ok" }]);
  provider.info = { provider: "claude", model: "claude-haiku-5-5", contextWindow: 1_000_000, vision: false, small: false };
  session = await recoverySession(provider, { local_model: "openai:https://models.example.com/v1|m" });
  const before = { provider: session.provider, model: session.settings.model, active: [...session["active"]] };
  const problem = await session["useLocalModel"]();
  expect(problem).toMatch(/does not run on this computer/);
  expect(session.provider).toBe(before.provider);
  expect(session.settings.model).toBe(before.model);
  expect([...session["active"]]).toEqual(before.active);
});

test("of two inspections in one reply, the session keeps the one that the agent called last", async () => {
  const provider = new FakeProvider([{ text: "ok" }]);
  session = await recoverySession(provider, { guidance: false });
  const dir = mkdtempSync(join(tmpdir(), "cuvette-data-"));
  writeFileSync(join(dir, "a.csv"), "alpha,beta\n1,2\n3,4\n");
  writeFileSync(join(dir, "b.csv"), "gamma,delta\n1,2\n3,4\n");
  await Promise.all([session["inspectPath"](join(dir, "b.csv"), undefined, 2), session["inspectPath"](join(dir, "a.csv"), undefined, 1)]);
  expect(session.inspection!.columns!.map((c) => c.name)).toEqual(["gamma", "delta"]);
  await session["inspectPath"](join(dir, "a.csv"), undefined, 1);
  expect(session.inspection!.columns!.map((c) => c.name)).toEqual(["gamma", "delta"]);
});

test("a Stop hook that blocks keeps the agent working, with its reason as the next note", async () => {
  const provider = new FakeProvider([{ text: "First try." }, { text: "Second try." }]);
  session = await recoverySession(provider, { guidance: false });
  const seen: unknown[] = [];
  session["hooks"].add([{ name: "check", event: "Stop", run: async (input: any) => (seen.push(input.stop_hook_active), seen.length === 1 ? { decision: "block", reason: "Save the table first." } : {}) } as never]);
  expect(await session.send("go")).toBe("Second try.");
  expect(seen).toEqual([false, true]);
  const note = provider.requests[1]!.messages.at(-1)!.parts[0] as { text: string };
  expect(note.text).toMatch(/A Stop hook asks you to continue: Save the table first\./);
});

test("a deny rule wins over always allow", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd, settings: { guidance: false, phi_check: false, permissions: { read_file: "deny" } } as never });
  session["sessionAllow"].add("read_file");
  const tool = session.findTool("read_file")!;
  expect(session["permitted"](tool, { path: join(cwd, "a.txt") })).toBe("deny");
});

test("an Esc on a permission card records a cancel by the harness, not a denial by the scientist", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  writeFileSync(join(cwd, "a.txt"), "text");
  const provider = new FakeProvider([{ calls: [{ name: "read_file", args: { path: join(cwd, "a.txt") } }] }, { text: "never" }]);
  session = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false, phi_check: false, permissions: { read_file: "ask" } } as never });
  session.bus.on((e) => {
    if (e.type === "permission") setTimeout(() => session!.interrupt(), 0);
  });
  await session.send("read a.txt");
  expect(session.record.entries(["permission"]).map((e) => [e.data.decision, e.data.by])).toEqual([["cancelled", "harness"]]);
  const stopped = session.record.entries(["notice"]).filter((e) => String(e.data.text).startsWith("Stopped"));
  expect(stopped.length).toBeGreaterThan(0);
  expect(stopped.every((e) => e.data.warn === true)).toBe(true);
});

test("resume after a crash between the tool calls and their results gives each call a result", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider: new FakeProvider([]), cwd, settings: { guidance: false } });
  const id = session.id;
  session["push"]({ role: "user", parts: [{ type: "text", text: "go" }] });
  session["push"]({ role: "assistant", parts: [{ type: "tool_call", id: "call_1", name: "state", args: {} }, { type: "tool_call", id: "call_2", name: "note", args: { text: "x" } }] });
  session.record.append("tool_result", { callId: "call_1", tool: "state", ok: true, summary: "State is fine.", text: "" });
  await session.close();
  session = await Session.resume(id, { provider: new FakeProvider([]), cwd });
  const last = session["history"].at(-1)!;
  expect(last.role).toBe("user");
  const parts = last.parts as { callId: string; text: string; isError?: boolean }[];
  expect(parts.map((p) => p.callId)).toEqual(["call_1", "call_2"]);
  expect(parts[0]!.text).toMatch(/^State is fine\./);
  expect(parts[1]!.text).toMatch(/not run/);
});

test("a cut last line in the log does not take the next entry with it", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider: new FakeProvider([]), cwd, settings: { guidance: false } });
  const id = session.id;
  const log = join(session.record.dir, "log.jsonl");
  await session.close();
  writeFileSync(log, readFileSync(log, "utf8") + '{"id": 99, "kind": "no');
  session = await Session.resume(id, { provider: new FakeProvider([]), cwd });
  session.record.append("notice", { text: "after the crash" });
  await session.close();
  session = await Session.resume(id, { provider: new FakeProvider([]), cwd });
  expect(session.record.entries(["notice"]).some((e) => e.data.text === "after the crash")).toBe(true);
});

test("after a switch to a model with a smaller window, the context size is an estimate, not the count of the other model", async () => {
  const provider = new FakeProvider([{ text: "ok" }]);
  provider.info = { provider: "claude", model: "claude-haiku-5-5", contextWindow: 1_000_000, vision: false, small: false };
  session = await recoverySession(provider, { guidance: false });
  await session.send("go");
  session.record.append("usage", { inputTokens: 300_000, outputTokens: 10, model: "claude-haiku-5-5", provider: "claude" });
  expect(session.contextTokens()).toBeGreaterThan(300_000);
  const local = new FakeProvider([]);
  local.info = { provider: "ollama", model: "qwen3:8b", contextWindow: 32768, vision: false, small: true, local: true };
  session.provider = local;
  expect(session.contextTokens()).toBeLessThan(32768);
});

test("a mode change during planning waits until the plan ends", async () => {
  session = await recoverySession(new FakeProvider([]), {});
  session["startPlanning"]("count the cells");
  session.setMode("watch");
  expect(session.mode).toBe("plan");
  session["endPlanning"]();
  expect(session.mode).toBe("watch");
});

test("string arguments become numbers, true or false, and lists when the schema asks for them", () => {
  const schema = { properties: { n: { type: "integer" }, x: { type: "number" }, on: { type: "boolean" }, list: { type: "array" }, name: { type: "string" }, either: { type: ["string", "number"] } } };
  expect(coerceArgs({ n: "3", x: "2.5", on: "true", list: '["a"]', name: "7", either: "7" }, schema)).toEqual({ n: 3, x: 2.5, on: true, list: ["a"], name: "7", either: "7" });
  expect(coerceArgs({ n: "2.5", x: "auto" }, schema)).toEqual({ n: "2.5", x: "auto" });
});

test("resume keeps a blind reference hidden and keeps the last mode", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  writeFileSync(join(cwd, "hand-counts.csv"), "sample,count\na,1\n");
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider: new FakeProvider([]), cwd, settings: { guidance: false } });
  const id = session.id;
  session["setReference"]({ mode: "blind", path: "hand-counts.csv" });
  session.setMode("teach");
  await session.close();
  session = await Session.resume(id, { provider: new FakeProvider([]), cwd });
  expect(session["hidden"]).toEqual([join(cwd, "hand-counts.csv")]);
  expect(session["reference"]?.mode).toBe("blind");
  expect(session.mode).toBe("teach");
});

function answerCards(s: Session, plan: (e: any) => any) {
  s.bus.on((e) => {
    if (e.type === "question") setTimeout(() => s.answer(e.question.qid, e.question.title === "Earlier results" ? "none" : e.question.options[0]?.value ?? "yes"), 0);
    if (e.type === "plan") setTimeout(() => s.respondPlan(plan(e)), 0);
  });
}

const PILOT_CALL = { name: "pilot_result", args: { sample: "Set 1", values: { "positive cell": 41 }, images: [], check: "" } };

test("pilot: a definition change on the pilot card goes into the plan that the pilot confirmation approves", async () => {
  const { proj, images } = pilotProject();
  const provider = new FakeProvider([CLARIFY, { calls: [{ name: "plan", args: CELL_PLAN(images) }] }, { calls: [PILOT_CALL] }, { calls: [PILOT_CALL] }, { text: "Done." }, { text: "Done." }]);
  session = await Session.create({ adapters: [LAB], provider, cwd: proj, interactive: true, settings: { referee: "none" } });
  session.decisions.applySetup({ method: "Otsu" });
  const cards: any[] = [];
  const s = session;
  answerCards(s, (e) => {
    cards.push(e);
    if (e.stage === "plan") return { action: "pilot" };
    return cards.filter((c) => c.stage === "pilot").length === 1 ? { action: "change", text: "Count 5 red pixels.", definition: { measure: "positive cell", old: "A cell with at least 1 red pixel inside its outline.", new: "A cell with at least 5 red pixels inside its outline." } } : { action: "confirm" };
  });
  await s.send(`Count the red-positive cells in ${images}`);
  const second = cards.filter((c) => c.stage === "pilot")[1];
  expect(second.definitions).toEqual([{ measure: "positive cell", definition: "A cell with at least 5 red pixels inside its outline." }]);
  const approved = s.record.entries(["plan_approved"]).at(-1)!;
  expect((approved.data.plan as any).definitions).toEqual([{ measure: "positive cell", definition: "A cell with at least 5 red pixels inside its outline." }]);
  expect(s.record.entries(["plan"]).some((e) => e.data.action === "pilot_changed")).toBe(true);
});

test("pilot: a plan call during the pilot changes the pending plan, not the earlier one", async () => {
  const { proj, images } = pilotProject();
  const redefine = { name: "plan", args: { definitions: [{ measure: "positive cell", definition: "A cell with at least 3 red pixels inside its outline." }], reason: "The scientist asked." } };
  const provider = new FakeProvider([CLARIFY, { calls: [{ name: "plan", args: CELL_PLAN(images) }] }, { calls: [redefine] }, { calls: [PILOT_CALL] }, { text: "Done." }, { text: "Done." }]);
  session = await Session.create({ adapters: [LAB], provider, cwd: proj, interactive: true, settings: { referee: "none" } });
  session.decisions.applySetup({ method: "Otsu" });
  const s = session;
  answerCards(s, (e) => (e.stage === "plan" ? { action: "pilot" } : { action: "confirm" }));
  await s.send(`Count the red-positive cells in ${images}`);
  const planResult = s.record.entries(["tool_result"]).filter((e) => e.data.tool === "plan").at(-1)!;
  expect(String(planResult.data.summary)).toMatch(/^The proposed analysis is now version \d+\./);
  const approved = s.record.entries(["plan_approved"]).at(-1)!;
  expect((approved.data.plan as any).definitions[0].definition).toBe("A cell with at least 3 red pixels inside its outline.");
});

test("resume restores a pilot that waits, so its confirmation also approves the plan", async () => {
  const { proj, images } = pilotProject();
  const provider = new FakeProvider([CLARIFY, { calls: [{ name: "plan", args: CELL_PLAN(images) }] }, { text: "Later." }, { text: "Later." }, { text: "Later." }]);
  session = await Session.create({ adapters: [LAB], provider, cwd: proj, interactive: true, settings: { referee: "none" } });
  session.decisions.applySetup({ method: "Otsu" });
  answerCards(session, () => ({ action: "pilot" }));
  await session.send(`Count the red-positive cells in ${images}`);
  expect(session.record.entries(["plan_approved"])).toHaveLength(0);
  const id = session.id;
  await session.close();
  const p2 = new FakeProvider([{ calls: [PILOT_CALL] }, { text: "Done." }, { text: "Done." }]);
  session = await Session.resume(id, { provider: p2, cwd: proj, interactive: true, settings: { referee: "none" } });
  expect(session.pilotStage).toBe(true);
  answerCards(session, () => ({ action: "confirm" }));
  await session.send("continue");
  const approved = session.record.entries(["plan_approved"]);
  expect(approved).toHaveLength(1);
  expect((approved[0]!.data.pilot as { sample: string }).sample).toBe("Set 1");
});

test("resume does not restore a pilot that a new request replaced", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  session = await Session.create({ adapters: [LAB], provider: new FakeProvider([]), cwd, settings: { referee: "none" } });
  const id = session.id;
  session.record.append("plan", { action: "proposed", version: 1, plan: { steps: [] } });
  session.record.append("plan", { action: "pilot_requested", version: 1, sample: "Set 1", target: "watch", answers: [] });
  await session.close();
  session = await Session.resume(id, { provider: new FakeProvider([]), cwd });
  expect(session.pilotStage).toBe(true);
  session.record.append("mode", { old: "watch", new: "plan", reason: "plan first" });
  await session.close();
  session = await Session.resume(id, { provider: new FakeProvider([]), cwd });
  expect(session.pilotStage).toBe(false);
});

test("resume uses the model that the session used last, not the first one", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  const script = join(cwd, "second.json");
  writeFileSync(script, "[]");
  session = await Session.create({ adapters: [LAB], provider: new FakeProvider([]), cwd, model: "fake:", settings: { guidance: false } });
  const id = session.id;
  session.record.append("setting", { name: "model", old: "fake:", new: `fake:${script}`, scope: "session" });
  await session.close();
  session = await Session.resume(id, { cwd });
  expect(session.settings.model).toBe(`fake:${script}`);
});

test("the sample sheet leaves out the output folder, a clarify question sets the waiting status, and a step that did not run is a deviation", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-out-"));
  for (const g of ["A", "B"]) {
    mkdirSync(join(cwd, g));
    for (const i of [1, 2]) writeFileSync(join(cwd, g, `s${i}.tif`), "xxxx");
  }
  mkdirSync(join(cwd, "cuvette", "2026-10-01-old", ".record"), { recursive: true });
  writeFileSync(join(cwd, "cuvette", "2026-10-01-old", "old.tif"), "xxxx");
  const provider = new FakeProvider([
    { calls: [{ name: "list_dir", args: { path: cwd } }] },
    { calls: [{ name: "clarify", args: { found: "I see 2 groups of 2 images.", questions: [{ question: "What counts as one n?", options: ["One image", "One group"] }] } }] },
    { calls: [{ name: "plan", args: { restatement: "You want: the cell count.", steps: [{ step: "Count the cells", tool: "count" }] } }] },
    { text: "Done." },
    { text: "Done." },
    { text: "Done." },
  ]);
  session = await Session.create({ adapters: [LAB], provider, cwd, interactive: true });
  session.decisions.applySetup({});
  let state = "";
  const atAnswer: string[] = [];
  session.bus.on((e) => {
    if (e.type === "status") state = e.state;
    if (e.type === "question")
      setTimeout(() => {
        atAnswer.push(state);
        session!.answer(e.question.qid, e.question.title === "Sample sheet" ? "accept" : "One image");
      }, 0);
    if (e.type === "plan") setTimeout(() => session!.respondPlan({ action: "approve" }), 0);
  });
  await session.send("Count the cells in each group.");

  expect(atAnswer.length).toBeGreaterThan(1);
  expect(atAnswer.every((s) => s === "waiting")).toBe(true);
  const csv = readFileSync(join(session.outputDir, "samples.csv"), "utf8");
  expect(csv.split("\n").filter(Boolean)).toHaveLength(5);
  expect(csv).not.toContain("cuvette");
  expect(session.record.entries(["tool_result"]).find((e) => e.data.tool === "plan")!.data.fidelity).toBeUndefined();
  expect(session.record.entries(["plan_deviation"]).map((e) => e.data.what)).toContain("Not done: Count the cells");
});

const ASK2 = (q1: string, q2: string) => ({ calls: [LOOK, { name: "clarify", args: { found: "I see one image.", questions: [{ question: q1, options: ["a", "b"] }, { question: q2, options: ["c", "d"] }] } }] });
const COUNT_PLAN = {
  restatement: "You want: the number of particles in a.tif.",
  definitions: [{ measure: "particle", definition: "An object above the threshold, at least 5 px." }],
  steps: [{ step: "Count the particles", tool: "count", settings: [{ key: "method", label: "Threshold method", value: "Otsu", by: "default" }, { key: "min_size", label: "Smallest particle", value: 5, by: "default" }] }],
};
const COUNT = { name: "count", args: { input: "/data/a.tif", method: "Otsu", min_size: 5 } };

test("a stopped clarify card closes its questions, so a new request does not ask them a second time", async () => {
  const provider = new FakeProvider([ASK2("What is one particle?", "Which groups?"), ASK2("What is one cell?", "Which wells?"), { text: "Waiting." }, { text: "Waiting." }]);
  session = await Session.create({ adapters: [LAB], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), interactive: true, settings: { referee: "none" } });
  session.decisions.applySetup({});
  const s = session;
  let stopped = false;
  s.bus.on((e) => {
    if (e.type === "clarify" && !stopped) {
      stopped = true;
      setTimeout(() => s.interrupt(), 0);
    }
  });
  await s.send("Count the particles in a.tif");
  expect(s.questions.open()).toEqual([]);
  expect(s.record.entries(["clarify"]).map((e) => e.data.action)).toEqual(["asked", "stopped"]);
  expect(s.record.entries(["answer"]).filter((e) => e.data.withdrawn)).toHaveLength(2);
  s.bus.on((e) => {
    if (e.type === "question") setTimeout(() => s.answer(e.question.qid, e.question.options[0]?.value), 0);
  });
  await s.send("Count the cells in b.tif");
  expect(s.questions.answered().filter((q) => q.status === "answered").map((q) => q.text)).toEqual(["What is one cell?", "Which wells?"]);
  expect(s.questions.open()).toEqual([]);
});

test("Answer later on a card that the agent waits for ends the wait, the message typed meanwhile reaches the agent, and a later answer comes as a note", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "ask_scientist", args: { question: "Which file?", options: ["a.csv", "b.csv"], wait: true } }] }, { text: "I go on without the answer." }]);
  session = await Session.create({ adapters: [], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, autoResume: false } });
  const s = session;
  let qid = "";
  s.bus.on((e) => {
    if (e.type !== "question") return;
    qid = e.question.qid;
    setTimeout(() => {
      s.steer("Use the newest file.");
      s.answerLater([qid]);
    }, 0);
  });
  await s.send("Read the data.");
  const parts = provider.requests[1]!.messages.at(-1)!.parts as { type: string; text?: string }[];
  expect(parts[0]!.text).toMatch(/Question q\d+ is still open\. The scientist did not answer it yet\. The scientist chose to answer it later\./);
  expect(parts.at(-1)!.text).toContain("Use the newest file.");
  expect(s.questions.get(qid)?.status).toBe("open");
  await s.answer(qid, "b.csv");
  expect(s["notes"].join("\n")).toContain(`The scientist answered ${qid}`);
});

test("send now on the plan card and on the clarify card: the card closes, the turn goes on, and the agent reads the message", async () => {
  const provider = new FakeProvider([ASK2("What is one particle?", "Which groups?"), { calls: [{ name: "plan", args: COUNT_PLAN }] }, { calls: [{ name: "plan", args: COUNT_PLAN }] }, { calls: [COUNT] }, { text: "There are 41 particles." }, { text: "There are 41 particles." }]);
  session = await Session.create({ adapters: [LAB], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), interactive: true, settings: { referee: "none" } });
  session.decisions.applySetup({});
  const s = session;
  let plans = 0;
  let answered = false;
  s.bus.on((e) => {
    if (e.type === "question" && !answered) {
      answered = true;
      setTimeout(() => s.answer(e.question.qid, "a").then(() => s.steer("One particle is one dark spot.", true)), 0);
    }
    if (e.type === "plan") setTimeout(() => (plans++ === 0 ? s.steer("Use Otsu.", true) : s.respondPlan({ action: "approve" })), 0);
  });
  await s.send("Count the particles in a.tif");
  const results = s.record.entries(["tool_result"]);
  const clarify = results.find((e) => e.data.tool === "clarify")!;
  expect(String(clarify.data.error)).toMatch(/^The scientist sent a message instead of answering the questions\. Read it first\. Answers so far: What is one particle\? -> a\./);
  expect(s.questions.open()).toEqual([]);
  const plan = results.filter((e) => e.data.tool === "plan")[0]!;
  expect(String(plan.data.error)).toMatch(/^The scientist sent a message instead of answering the proposed analysis \(version 1\)/);
  expect(s.record.entries(["plan"]).map((e) => e.data.action)).toEqual(["proposed", "stopped", "proposed"]);
  expect(s.record.entries(["plan_approved"])).toHaveLength(1);
  expect(s.record.entries(["user"]).filter((e) => e.data.now).map((e) => e.data.text)).toEqual(["One particle is one dark spot.", "Use Otsu."]);
  expect(s.record.nodes().map((n) => n.tool)).toEqual(["count"]);
});

test("send now on the pilot card: the agent shows the same pilot again with no new run", async () => {
  const { proj, images } = pilotProject();
  const provider = new FakeProvider([CLARIFY, { calls: [{ name: "plan", args: CELL_PLAN(images) }] }, { calls: [PILOT_CALL] }, { calls: [PILOT_CALL] }, { text: "Done." }, { text: "Done." }]);
  session = await Session.create({ adapters: [LAB], provider, cwd: proj, interactive: true, settings: { referee: "none" } });
  session.decisions.applySetup({ method: "Otsu" });
  const s = session;
  let pilots = 0;
  s.bus.on((e) => {
    if (e.type === "question") setTimeout(() => s.answer(e.question.qid, e.question.title === "Earlier results" ? "none" : e.question.options[0]?.value ?? "yes"), 0);
    if (e.type !== "plan") return;
    if (e.stage === "plan") return void setTimeout(() => s.respondPlan({ action: "pilot" }), 0);
    setTimeout(() => (pilots++ === 0 ? s.steer("The overlay looks right.", true) : s.respondPlan({ action: "confirm" })), 0);
  });
  await s.send(`Count the red-positive cells in ${images}`);
  const pilot = s.record.entries(["tool_result"]).filter((e) => e.data.tool === "pilot_result");
  expect(String(pilot[0]!.data.error)).toMatch(/^The scientist sent a message instead of answering the pilot on Set 1\. Read it first\./);
  expect(s.record.entries(["pilot_rejected"])[0]!.data.reason).toBe("the scientist sent a message instead of an answer");
  expect(s.record.entries(["plan_approved"])).toHaveLength(1);
});

test("a plan call during the pilot with an open setting is refused, and its settings go into the decisions", async () => {
  const { proj, images } = pilotProject();
  const open = { name: "plan", args: { steps: [{ step: "Count the cells in each field", tool: "count", settings: [{ label: "Edge rule" }] }], reason: "An edge rule." } };
  const filled = { name: "plan", args: { steps: [{ step: "Count the cells in each field", tool: "count", settings: [{ label: "Edge rule", value: "leave out", by: "agent" }, { label: "Smallest particle", key: "min_size", value: 7, by: "agent" }] }], reason: "An edge rule." } };
  const provider = new FakeProvider([CLARIFY, { calls: [{ name: "plan", args: CELL_PLAN(images) }] }, { calls: [open] }, { calls: [filled] }, { calls: [PILOT_CALL] }, { text: "Done." }, { text: "Done." }]);
  session = await Session.create({ adapters: [LAB], provider, cwd: proj, interactive: true, settings: { referee: "none" } });
  session.decisions.applySetup({ method: "Otsu" });
  const s = session;
  answerCards(s, (e) => (e.stage === "plan" ? { action: "pilot" } : { action: "confirm" }));
  await s.send(`Count the red-positive cells in ${images}`);
  const plans = s.record.entries(["tool_result"]).filter((e) => e.data.tool === "plan");
  expect(String(plans[1]!.data.error)).toMatch(/^Open settings: Edge rule\./);
  expect(plans[2]!.data.ok).toBe(true);
  expect(s.decisions.value("min_size")).toBe(7);
  const approved = s.record.entries(["plan_approved"]).at(-1)!;
  expect(String(approved.data.text)).toContain("Smallest particle: 7 (agent)");
});

test("a definition change on a pilot card with no pending plan waits for the pilot confirmation before the approved plan changes", async () => {
  const { proj, images } = pilotProject();
  const provider = new FakeProvider([CLARIFY, { calls: [{ name: "plan", args: CELL_PLAN(images) }] }, { text: "Done." }, { text: "Done." }]);
  session = await Session.create({ adapters: [LAB], provider, cwd: proj, interactive: true, settings: { referee: "none" } });
  session.decisions.applySetup({ method: "Otsu" });
  const s = session;
  let stage = "plan";
  const change = { action: "change", text: "Count 5 red pixels.", definition: { measure: "positive cell", old: "", new: "A cell with at least 5 red pixels inside its outline." } };
  answerCards(s, () => (stage === "plan" ? { action: "approve" } : change));
  await s.send(`Count the red-positive cells in ${images}`);
  expect(s.record.entries(["plan_approved"])).toHaveLength(1);
  const before = s.plan!.definitions![0]!.definition;
  stage = "pilot";
  s.planFirst = false;
  s.provider = new FakeProvider([{ calls: [PILOT_CALL] }, { text: "I run it again." }, { text: "I run it again." }]);
  await s.send("Show me the pilot again");
  expect(s.plan!.definitions![0]!.definition).toBe(before);
  expect(s.record.entries(["plan_approved"])).toHaveLength(1);
  expect(s.pilotStage).toBe(true);
  const id = s.id;
  await s.close();
  session = await Session.resume(id, { provider: new FakeProvider([{ calls: [PILOT_CALL] }, { text: "Done." }, { text: "Done." }]), cwd: proj, interactive: true, settings: { referee: "none", planFirst: "off" } });
  const r = session;
  expect(r.pilotStage).toBe(true);
  answerCards(r, () => ({ action: "confirm" }));
  await r.send("continue");
  const approved = r.record.entries(["plan_approved"]);
  expect(approved).toHaveLength(2);
  expect((approved[1]!.data.plan as any).definitions[0].definition).toBe("A cell with at least 5 red pixels inside its outline.");
});

test("resume after a crash during the questions closes them, and a new plan asks again", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  session = await Session.create({ adapters: [LAB], provider: new FakeProvider([]), cwd, interactive: true, settings: { referee: "none" } });
  session.record.append("clarify", { action: "asked", phase: "Questions", found: "One image.", questions: ["What is one particle?"] });
  const q = await session.questions.ask({ decisionKey: "", title: "One particle", text: "What is one particle?", options: [], evidence: "" });
  const id = session.id;
  await session.close();
  session = await Session.resume(id, { provider: new FakeProvider([]), cwd, interactive: true, settings: { referee: "none" } });
  expect(session.questions.get(q.qid)?.status).toBe("withdrawn");
  expect(session.record.entries(["clarify"]).map((e) => e.data.action)).toEqual(["asked", "stopped"]);
  await session.close();
  session = await Session.resume(id, { provider: new FakeProvider([]), cwd, interactive: true, settings: { referee: "none" } });
  expect(session.record.entries(["clarify"]).map((e) => e.data.action)).toEqual(["asked", "stopped"]);
});

test("the referee reads only an answer that has numbers or follows a step", async () => {
  const ref = new FakeProvider([]);
  let calls = 0;
  ref.complete = async () => (calls++, "No findings.");
  session = await Session.create({ adapters: [LAB], provider: new FakeProvider([{ text: "Hello. Which images do you want to count?" }, { calls: [COUNT] }, { text: "There are 41 particles (step 1)." }]), refereeProvider: ref, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  session.decisions.applySetup({ method: "Otsu" });
  await session.send("Hello");
  expect(calls).toBe(0);
  await session.send("Count the particles in a.tif");
  expect(calls).toBe(1);
});

test("a rewind scans the restored history for patient identifiers again", async () => {
  const p = new FakeProvider([{ text: "One." }, { text: "Two." }]);
  session = await Session.create({ adapters: [], provider: p, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, referee: "none" } });
  const s = session;
  await s.send("First question");
  await s.send("Second question");
  expect(s["phiFrom"]).toBeGreaterThan(0);
  s.rewind(2);
  expect(s["phiFrom"]).toBe(0);
});

test("with deferred tools, a tool that find_tools brought in leaves the list after two turns with no call; the list stays the same inside a turn", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "find_tools", args: { query: "zeta spectrum" } }] },
    { calls: [{ name: "note", args: { text: "a" } }] },
    { text: "Found it." },
    { text: "Two." },
    { text: "Three." },
    { text: "Four." },
  ]);
  session = await Session.create({ adapters: [LAB], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, referee: "none", toolExposure: "search" } });
  const s = session;
  const tools = s["tools"] as Map<string, any>;
  for (let i = 0; i < 20; i++) tools.set(`extra_${i}`, { name: `extra_${i}`, description: i === 19 ? "Zeta spectrum fit." : `Tool ${i}.`, inputSchema: { type: "object", properties: {} }, source: "adapter", adapter: "lab", readOnly: true, permission: "allow", execute: async () => ({ ok: true }) });
  const names = (i: number) => provider.requests[i]!.tools.map((t) => t.name);
  await s.send("Start");
  expect(names(0)).not.toContain("extra_19");
  expect(names(1)).toContain("extra_19");
  expect(names(2)).toEqual(names(1));
  await s.send("two");
  await s.send("three");
  expect(names(4)).toContain("extra_19");
  await s.send("four");
  expect(names(5)).not.toContain("extra_19");
  expect(names(5).filter((n) => n.startsWith("extra_") || ["blur", "count", "state"].includes(n))).toHaveLength(16);
});

test("a read-only call that repeats an earlier call with the same output does not repeat the output", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  writeFileSync(join(cwd, "data.csv"), Array.from({ length: 60 }, (_, i) => `row${i},${i * 3},${i * 7}`).join("\n"));
  const read = { name: "read_file", args: { path: join(cwd, "data.csv") } };
  const provider = new FakeProvider([{ calls: [read] }, { calls: [read] }, { text: "The table has 60 rows." }]);
  session = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false, referee: "none" } });
  await session.send("Read data.csv");
  const texts = toolTexts(provider);
  expect(texts[0]).toContain("row59");
  expect(texts[1]).toMatch(/^\[The output is the same as the output of the earlier call call_1 with the same input\./);
  expect(String(session.record.entries(["tool_result"])[1]!.data.text)).toContain("row59");
});

test("a structured tool result has one key on each line and compact values", async () => {
  session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false } });
  const tool = session.findTool("run_script")!;
  const text = session["render"](tool, { ok: true, summary: "Counted.", metrics: { n: 3 }, table: { columns: ["a", "b"], rows: [[1, 2], [3, 4]], n_rows: 2 } }).text;
  expect(text).toBe('{\n"ok": true,\n"summary": "Counted.",\n"metrics": {"n":3},\n"table": {"columns":["a","b"],"rows":[[1,2],[3,4]],"n_rows":2}\n}');
  expect(JSON.parse(text).table.rows).toEqual([[1, 2], [3, 4]]);
});

test("full session: plan first from the request to the results, a continue after the questions plans with the answers, and resume keeps the plan", async () => {
  const provider = new FakeProvider([
    ASK2("What is one particle?", "Which groups?"),
    { text: "I wait for you." },
    { text: "I wait for you." },
    { text: "I wait for you." },
    { calls: [{ name: "plan", args: COUNT_PLAN }] },
    { calls: [COUNT] },
    { text: "There are 41 particles (a particle is an object above the threshold, at least 5 px)." },
    { text: "There are 41 particles (a particle is an object above the threshold, at least 5 px)." },
  ]);
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  session = await Session.create({ adapters: [LAB], provider, cwd, interactive: true, settings: { referee: "none" } });
  session.decisions.applySetup({});
  const s = session;
  answerCards(s, () => ({ action: "approve" }));
  await s.send("Count the particles in a.tif");
  expect(s.record.entries(["clarify"]).map((e) => e.data.action)).toEqual(["asked", "answered"]);
  expect(s.record.entries(["plan_approved"])).toHaveLength(0);
  await s.send("continue");
  expect(s.record.entries(["clarify"]).map((e) => e.data.action)).toEqual(["asked", "answered"]);
  expect(s.record.entries(["question"])).toHaveLength(2);
  expect(s.record.entries(["plan_approved"])).toHaveLength(1);
  expect(s.record.nodes().map((n) => n.tool)).toEqual(["count"]);
  expect(s.endedBy).toBe("answer");
  const withNote = provider.requests.at(-1)!.messages.filter((m) => m.role === "user" && m.parts.some((p) => p.type === "text" && p.text.includes("Plan first, in two phases.")));
  expect(withNote).toHaveLength(1);
  expect(JSON.stringify(provider.requests[4]!.messages)).toContain("The scientist answered the questions above. Call plan now");
  const id = s.id;
  await s.close();
  session = await Session.resume(id, { provider: new FakeProvider([{ calls: [COUNT] }, { text: "Still 41 particles (step 2)." }, { text: "Still 41 particles (step 2)." }]), cwd, interactive: true, settings: { referee: "none" } });
  const r = session;
  expect(r.plan?.steps[0]?.step).toBe("Count the particles");
  expect(r["approvedEntry"]).toBeGreaterThan(0);
  answerCards(r, () => ({ action: "approve" }));
  await r.send("Count again");
  expect(r.record.nodes().filter((n) => !n.sensitivityOf).map((n) => n.tool)).toEqual(["count", "count"]);
});

const OPEN_Q = { decisionKey: "", title: "Which file?", text: "Which file?", options: [], evidence: "" };

test("headless: a decision question with no answer in the file and no recommendation closes, so the run does not wait for ever", async () => {
  session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { headless: true, guidance: false } });
  const s = session;
  attachHeadless(s, { answers: {}, allow: new Set() });
  const q = await s.questions.ask({ decisionKey: "threshold", title: "Threshold", text: "Which threshold?", options: [], evidence: "" });
  const wait = s.questions.wait(q.qid);
  s.bus.emit({ type: "question", question: q });
  expect((await wait).status).toBe("withdrawn");
  expect(s.record.entries(["notice"]).some((e) => /The answers file has no value for threshold/.test(String(e.data.text)))).toBe(true);
});

test("a call from the MCP server gets absolute paths and drops empty optional values, like a call from the model", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  writeFileSync(join(cwd, "a.txt"), "hello");
  session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd, settings: { guidance: false } });
  const s = session;
  const tool = s.allTools().find((t) => t.name === "read_file")!;
  const spy = vi.spyOn(s, "pipeline");
  const r = await s.runTool(tool, { path: "a.txt", purpose: "" }, "mcp1", new AbortController().signal);
  expect(spy.mock.calls[0]![1]).toEqual({ path: join(cwd, "a.txt") });
  expect(r.isError).toBe(false);
});

test("export with an unknown format fails with the list of formats", async () => {
  session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false } });
  await expect(session.exportAs("docx" as never)).rejects.toThrow(/^No export format docx\. Use html/);
});

test("two waits on one question: Answer later ends both waits", async () => {
  session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, autoResume: false } });
  const s = session as any;
  const q = await s.questions.ask(OPEN_Q);
  s.busy = true;
  const a = s.waitFor(q.qid).then(() => "answered", () => "stopped");
  const b = s.waitFor(q.qid).then(() => "answered", () => "stopped");
  s.answerLater([q.qid]);
  expect(await Promise.all([a, b])).toEqual(["stopped", "stopped"]);
  s.busy = false;
});

test("two waits on one question: one stopped wait does not turn the answer to the other wait into a note", async () => {
  session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, autoResume: false } });
  const s = session as any;
  const q = await s.questions.ask(OPEN_Q);
  const ctl = new AbortController();
  const a = s.waitFor(q.qid, ctl.signal).catch(() => "stopped");
  const b = s.waitFor(q.qid);
  ctl.abort();
  expect(await a).toBe("stopped");
  await s.answer(q.qid, "a.csv");
  expect((await b).answer).toBe("a.csv");
  expect(s.notes.join("\n")).not.toContain(`The scientist answered ${q.qid}`);
});

test("Answer later applies to the turn only: the next turn can wait on the same question again", async () => {
  session = await Session.create({ adapters: [], provider: new FakeProvider([{ text: "Done." }]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, autoResume: false } });
  const s = session as any;
  const q = await s.questions.ask(OPEN_Q);
  s.answerLater([q.qid]);
  expect(s.laterQids.size).toBe(0);
  s.busy = true;
  s.answerLater([q.qid]);
  s.busy = false;
  await s.send("Hello.");
  expect(s.laterQids.size).toBe(0);
  const w = s.waitFor(q.qid);
  await s.answer(q.qid, "b.csv");
  expect((await w).status).toBe("answered");
});

test("the plan tool schema stays the same after the first approval", async () => {
  const { proj, images } = pilotProject();
  const provider = new FakeProvider([CLARIFY, { calls: [{ name: "plan", args: CELL_PLAN(images) }] }, { text: "Done." }, { text: "Done." }]);
  session = await Session.create({ adapters: [LAB], provider, cwd: proj, interactive: true, settings: { referee: "none", pilot: "off" } });
  session.decisions.applySetup({ method: "Otsu" });
  const s = session;
  const schema = () => JSON.stringify(s.allTools().find((t) => t.name === "plan")!.inputSchema);
  const before = schema();
  answerCards(s, () => ({ action: "approve" }));
  await s.send(`Count the red-positive cells in ${images}`);
  expect(s["approvedEntry"]).toBeGreaterThan(0);
  expect(schema()).toBe(before);
});

test("resume restores a pilot that a pilot card change started from the approved plan, with the plan that was current", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  session = await Session.create({ adapters: [LAB], provider: new FakeProvider([]), cwd, settings: { referee: "none" } });
  const id = session.id;
  session.record.append("plan", { action: "proposed", version: 1, plan: { steps: [{ step: "Old step", status: "todo" }] } });
  session.record.append("plan_approved", { version: 1, plan: { steps: [{ step: "Approved step", status: "todo" }] }, mode: "watch" });
  session.record.append("plan", { action: "updated", version: 2, plan: { steps: [{ step: "Approved step", status: "done" }, { step: "Added step", status: "todo" }] } });
  session.record.append("plan", { action: "pilot_requested", version: 2, sample: "Set 1", target: "watch", answers: [] });
  await session.close();
  session = await Session.resume(id, { provider: new FakeProvider([]), cwd });
  expect(session.pilotStage).toBe(true);
  expect(session["pilotPlan"]!.plan.steps.map((x: { step: string }) => x.step)).toEqual(["Approved step", "Added step"]);
});

function slowPython(delayS: number): string {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-slowpy-"));
  const exe = join(dir, "python");
  writeFileSync(exe, `#!/bin/sh\ncase "$1" in -W) sleep ${delayS}; echo "openpyxl 9.9";; esac\n`);
  chmodSync(exe, 0o755);
  writeFileSync(
    join(dir, "adapter.yaml"),
    [
      "adapter: { name: slowpy }",
      'program: { name: openpyxl, version: "from the manifest" }',
      'connection: { kind: python, interpreter: ["{program_path}"] }',
      "locate:",
      `  paths: [${JSON.stringify(exe)}]`,
      '  version_command: ["{program_path}", "-W", "ignore", "-c", "print(1)"]',
      "  version_pattern: 'openpyxl (\\S+)'",
      "  identity: 'openpyxl \\d'",
    ].join("\n"),
  );
  return dir;
}

test("the first request does not wait for the version command of a Python adapter", async () => {
  if (process.platform === "win32") return;
  const sent: number[] = [];
  const provider = new FakeProvider([{ text: "done" }]);
  const step = provider.step.bind(provider);
  provider.step = (req) => (sent.push(Date.now()), step(req));
  const t0 = Date.now();
  session = await Session.create({ adapters: [slowPython(2)], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, headless: true } });
  await session.send("Say done.");
  expect(sent[0]! - t0).toBeLessThan(1500);
  expect((session.record.entries(["session"])[0]!.data.adapters as { programVersion: string }[])[0]!.programVersion).toBe("from the manifest");
  expect(session.adapterInfo[0]!.programVersion).toBe("from the manifest");
  await session["starting"];
  expect(session.adapterInfo[0]!.programVersion).toBe("9.9");
  expect(session.record.entries(["notice"]).some((e) => String(e.data.text).includes("version command"))).toBe(false);
});

test("a saved program version that the version command does not confirm gives a notice", async () => {
  if (process.platform === "win32") return;
  const dir = slowPython(0);
  const a = loadAdapter(dir);
  saveVersion(a.manifest, join(dir, "python"), "8.0");
  session = await Session.create({ adapters: [dir], provider: new FakeProvider([{ text: "done" }]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, headless: true } });
  expect((session.record.entries(["session"])[0]!.data.adapters as { programVersion: string }[])[0]!.programVersion).toBe("8.0");
  await session.send("Say done.");
  await session["starting"];
  expect(session.adapterInfo[0]!.programVersion).toBe("9.9");
  expect(session.record.entries(["notice"]).map((e) => String(e.data.text))).toContain("The version command of the adapter slowpy gives the program version 9.9. The start of this session used the saved version 8.0. The steps record 9.9.");
});

test("a version command that runs longer than the time limit gives a notice", async () => {
  if (process.platform === "win32") return;
  session = await Session.create({ adapters: [slowPython(7)], provider: new FakeProvider([{ text: "done" }]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, headless: true } });
  await session.send("Say done.");
  await session["starting"];
  const notice = session.record.entries(["notice"]).find((e) => String(e.data.text).includes("version command"));
  expect(notice?.data.text).toContain("The version command of the adapter slowpy ran longer than 5 s.");
  expect(session.adapterInfo[0]!.programVersion).toBe("from the manifest");
});

test("the system prompt shows the program version that the version command gives", async () => {
  if (process.platform === "win32") return;
  session = await Session.create({ adapters: [slowPython(1)], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { headless: true } });
  expect(session["system"]).toContain("# Program: openpyxl from the manifest");
  await session["starting"];
  expect(session["system"]).toContain("# Program: openpyxl 9.9");
});

function napPython(delayS: number): string {
  const dir = slowPython(delayS);
  writeFileSync(join(dir, "python"), `#!/bin/sh\ncase "$1" in -W) sleep ${delayS}; echo "openpyxl 9.9";; *) exec python3 "$@";; esac\n`);
  writeFileSync(join(dir, "napmod.py"), "import time\n\ndef nap(seconds=0):\n    time.sleep(seconds)\n    return {'slept': seconds}\n");
  writeFileSync(join(dir, "adapter.yaml"), `${readFileSync(join(dir, "adapter.yaml"), "utf8")}\ntools:\n  - name: nap\n    description: Wait.\n    function: "napmod:nap"\n    params: { seconds: { type: number } }\n`);
  return dir;
}

test("a tool call that arrives while the version command runs waits for it, runs, and records the checked version", async () => {
  if (process.platform === "win32") return;
  const provider = new FakeProvider([{ calls: [{ name: "nap", args: { seconds: 0 } }] }, { text: "Done." }]);
  session = await Session.create({ adapters: [napPython(1)], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, headless: true } });
  await session.send("Nap.");
  expect(session.record.entries(["tool_result"])[0]!.data.ok).toBe(true);
  expect(session.record.nodes()[0]!.programVersion).toBe("9.9");
});

test("Stop while a tool call waits for the version command ends the turn at once", async () => {
  if (process.platform === "win32") return;
  const provider = new FakeProvider([{ calls: [{ name: "nap", args: { seconds: 5 } }] }, { text: "Done." }]);
  session = await Session.create({ adapters: [napPython(2)], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, headless: true } });
  session.bus.on((e) => {
    if (e.type === "status" && e.state === "running") setTimeout(() => session!.interrupt(), 100);
  });
  const t0 = Date.now();
  await session.send("Nap.");
  expect(Date.now() - t0).toBeLessThan(1500);
  expect(session.record.entries(["tool_result"])[0]!.data.ok).toBe(false);
  expect(session.endedBy).toBe("stopped");
});

test("after the first model request, the version command does not change the system prompt, so the prompt cache stays valid", async () => {
  if (process.platform === "win32") return;
  const provider = new FakeProvider([{ calls: [{ name: "nap", args: { seconds: 0 } }] }, { text: "Done." }]);
  session = await Session.create({ adapters: [napPython(1)], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { headless: true } });
  await session.send("Nap.");
  expect(provider.requests).toHaveLength(2);
  expect(provider.requests[0]!.system).toContain("# Program: openpyxl from the manifest");
  expect(provider.requests[1]!.system).toBe(provider.requests[0]!.system);
  expect(session.adapterInfo[0]!.programVersion).toBe("9.9");
  expect(session.record.nodes()[0]!.programVersion).toBe("9.9");
});

test("the data check after an inspect tool reads the input file, not the summary table of the tool", async () => {
  if (process.platform === "win32") return;
  const dir = slowPython(0);
  writeFileSync(join(dir, "python"), `#!/bin/sh\ncase "$1" in -W) echo "openpyxl 9.9";; *) exec python3 "$@";; esac\n`);
  writeFileSync(
    join(dir, "peekmod.py"),
    [
      "import csv, os",
      "",
      "def inspect_table(path):",
      "    rows = list(csv.reader(open(path)))",
      "    out = os.path.join(os.getcwd(), 'columns.csv')",
      "    summary = [[c, ''] for c in rows[0]]",
      "    with open(out, 'w', newline='') as f:",
      "        csv.writer(f).writerows([['column', 'max']] + summary)",
      "    return {'ok': True, 'summary': '%d rows' % (len(rows) - 1), 'table': {'columns': ['column', 'max'], 'rows': summary, 'n_rows': len(summary), 'path': out}}",
    ].join("\n"),
  );
  writeFileSync(join(dir, "adapter.yaml"), `${readFileSync(join(dir, "adapter.yaml"), "utf8")}\ntools:\n  - name: inspect_table\n    description: List the columns.\n    read_only: true\n    function: "peekmod:inspect_table"\n    params: { path: { type: string } }\n`);
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  writeFileSync(join(cwd, "data.csv"), "sample_id,group,value\nS1,control,4.0\nS2,control,4.5\nS3,control,3.8\nS4,treated,5.0\nS5,treated,5.4\nS6,treated,4.7\n");
  const provider = new FakeProvider([{ calls: [{ name: "inspect_table", args: { path: join(cwd, "data.csv") } }] }, { text: "Done." }]);
  session = await Session.create({ adapters: [dir], provider, cwd, settings: { guidance: false, headless: true } });
  await session.send("Look at data.csv.");
  const text = lastToolText(provider);
  expect(text).toContain("Data check of data.csv: 6 rows, 3 columns.");
  expect(text).toContain("Groups in 'group': control 3, treated 3.");
  expect(text).not.toContain("Column 'max'");
});

test("with deferred tools, a tool that an open plan step names stays in the list; a call to a tool that left the list still runs", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "find_tools", args: { query: "zeta spectrum" } }] },
    { text: "Found it." },
    { text: "Two." },
    { text: "Three." },
    { calls: [{ name: "extra_18", args: {} }] },
    { text: "Four." },
  ]);
  session = await Session.create({ adapters: [LAB], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, referee: "none", toolExposure: "search" } });
  const s = session;
  const tools = s["tools"] as Map<string, any>;
  let ran = 0;
  for (let i = 0; i < 20; i++) tools.set(`extra_${i}`, { name: `extra_${i}`, description: i >= 18 ? "Zeta spectrum fit." : `Tool ${i}.`, inputSchema: { type: "object", properties: {} }, source: "adapter", adapter: "lab", readOnly: true, permission: "allow", execute: async () => (ran++, { ok: true, summary: "Ran." }) });
  s.plan = { steps: [{ step: "Fit the spectrum", tool: "extra_19", status: "todo" }] } as any;
  const names = (i: number) => provider.requests[i]!.tools.map((t) => t.name);
  await s.send("Start");
  expect(names(1)).toEqual(expect.arrayContaining(["extra_18", "extra_19"]));
  await s.send("two");
  await s.send("three");
  await s.send("four");
  expect(names(4)).toContain("extra_19");
  expect(names(4)).not.toContain("extra_18");
  expect(ran).toBe(1);
  expect(names(5)).toContain("extra_18");
});

test("a cut tool result does not end in half of an emoji, so the request stays valid JSON for the API", async () => {
  const lone = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
  for (const limit of [1001, 1002]) {
    const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
    writeFileSync(join(cwd, "notes.txt"), "😀".repeat(3000));
    const provider = new FakeProvider([{ calls: [{ name: "read_file", args: { path: join(cwd, "notes.txt") } }] }, { text: "Done." }]);
    session = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false, referee: "none", maxResultChars: limit } });
    await session.send("Read notes.txt");
    const text = toolTexts(provider)[0]!;
    expect(text).toContain("The harness cut");
    expect(lone.test(text)).toBe(false);
    await session.close();
    session = undefined;
  }
});

// Each pointer to an earlier result in a request must have that result, in full, in the same request.
function pointersResolve(messages: { parts: any[] }[]): string[] {
  const parts = messages.flatMap((m) => m.parts).filter((p) => p.type === "tool_result");
  const bad: string[] = [];
  for (const p of parts) {
    const id = /earlier call (\S+) with the same input/.exec(p.text)?.[1];
    if (!id) continue;
    const target = parts.find((x) => x.callId === id);
    if (!target || target.text.includes("[Older tool output shortened:")) bad.push(id);
  }
  return bad;
}

test("a repeated-call pointer keeps its result after the older output is shortened", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  const big = (name: string) => {
    writeFileSync(join(cwd, name), Array.from({ length: 300 }, (_, i) => `${name}-row${i},${i * 3},${i * 7}`).join("\n"));
    return { name: "read_file", args: { path: join(cwd, name) } };
  };
  const a = big("a.csv");
  const provider = new FakeProvider([{ calls: [a] }, { calls: [big("b.csv")] }, { calls: [a] }, { calls: [big("c.csv")] }, { text: "Done." }]);
  provider.info = { ...provider.info, contextWindow: 16000 };
  session = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false, referee: "none" } });
  await session.send("Read the files.");
  expect(toolTexts(provider)[0]).toContain("a.csv-row299");
  for (const r of provider.requests) expect(pointersResolve(r.messages)).toEqual([]);
});

test("a repeated-call pointer gets the full result when the summary removes the earlier call", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
  const big = (name: string) => {
    writeFileSync(join(cwd, name), Array.from({ length: 300 }, (_, i) => `${name}-row${i},${i * 3},${i * 7}`).join("\n"));
    return { name: "read_file", args: { path: join(cwd, name) } };
  };
  const a = big("a.csv");
  const provider = new FakeProvider({ steps: [{ calls: [a] }, { calls: [big("b.csv")] }, { calls: [a] }, { calls: [big("c.csv")] }, { calls: [big("d.csv")] }, { text: "Done." }], complete: "## Steps done\nRead a.csv." });
  provider.info = { ...provider.info, contextWindow: 9000 };
  session = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false, referee: "none" } });
  await session.send("Read the files.");
  expect(session.record.entries(["compaction"]).length).toBeGreaterThan(0);
  for (const r of provider.requests) expect(pointersResolve(r.messages)).toEqual([]);
  const resumed = session.record.messages();
  expect(pointersResolve(resumed)).toEqual([]);
});

test("rewind withdraws the open questions of the part that it removes, so a late answer does not change a decision", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "ask_scientist", args: { question: "Which cutoff?", options: ["5", "10"], wait: false } }] },
    { text: "The question waits." },
  ]);
  session = await Session.create({ adapters: [], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, referee: "none", autoResume: true } });
  await session.send("First request.");
  const open = session.questions.open();
  expect(open).toHaveLength(1);
  session.rewind(1);
  expect(session.questions.get(open[0]!.qid)!.status).toBe("withdrawn");
  expect(session.questions.open()).toHaveLength(0);
});

test("with deferred tools, a plan step that names a tool with a slash keeps that tool in the list", async () => {
  const provider = new FakeProvider([{ text: "One." }, { text: "Two." }]);
  session = await Session.create({ adapters: [LAB], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, referee: "none", toolExposure: "search" } });
  const s = session;
  const tools = s["tools"] as Map<string, any>;
  for (let i = 0; i < 20; i++) tools.set(`fiji_t${i}`, { name: `fiji_t${i}`, remoteName: `fiji/t${i}`, description: `Tool ${i}.`, inputSchema: { type: "object", properties: {} }, source: "adapter", adapter: "lab", readOnly: true, deferred: true, permission: "allow", execute: async () => ({ ok: true, summary: "Ran." }) });
  s.plan = { steps: [{ step: "Run the macro", tool: "fiji/t7", status: "todo" }] } as any;
  await s.send("Start");
  const names = provider.requests[0]!.tools.map((t) => t.name);
  expect(names).toContain("fiji_t7");
  expect(names).not.toContain("fiji_t6");
});

test("the provider gets the names of all tools, so a text call to a tool outside the list still runs", async () => {
  const provider = new FakeProvider([{ text: "Done." }]);
  let known: string[] | undefined;
  const step = provider.step.bind(provider);
  provider.step = async (req) => ((known = req.knownTools), step(req));
  session = await Session.create({ adapters: [LAB], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, referee: "none" } });
  await session.send("Start");
  expect(known).toEqual([...(session["tools"] as Map<string, unknown>).keys()]);
});

test("a notice tells the scientist when the version check no longer finds the program", async () => {
  session = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, referee: "none" } });
  const rt = {
    adapter: { name: "fiji", manifest: { program: { name: "Fiji", version: "2.14" }, connection: { kind: "python" } } },
    programPath: undefined,
    startPath: "/Applications/Fiji.app",
    programVersion: "2.14",
    checked: Promise.resolve({ path: undefined, version: "2.14", how: "not found" }),
  };
  await (session as any).afterStart(rt);
  const text = session.record.entries(["notice"]).map((e) => String(e.data.text)).join("\n");
  expect(text).toContain("did not find Fiji at /Applications/Fiji.app: not found");
});
