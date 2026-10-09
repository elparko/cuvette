import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { blindPolicy, canonical, setBlindPolicy } from "../src/adapters/blind.ts";
import { applyHeadlessSetup, attachHeadless } from "../src/core/headless.ts";
import { Session, announcesStep, endsWithPromise } from "../src/core/session.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { unzip } from "./fixtures/unzip.ts";
import { writeXlsx } from "./fixtures/xlsx.ts";

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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")) });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), mode: "follow" });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), settings: { permissions: { count: "ask" } } });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), settings: { guidance: false } });
  await session.send("hi");
  const id = session.id;
  await session.close();
  session = await Session.resume(id, { provider: new FakeProvider([{ text: "again" }]), cwd: mkdtempSync(join(tmpdir(), "ga-proj-")) });
  expect(session.history.length).toBe(2);
});

test("a promise of an action with no tool call gets one nudge", async () => {
  const provider = new FakeProvider([{ text: "I will now count the particles." }, { calls: [{ name: "state", args: {} }] }, { text: "The program is open." }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), settings: { guidance: false, headless: true } });
  const answer = await session.send("go");
  expect(answer).toBe("The program is open.");
  expect(provider.requests.length).toBe(3);
});

test("a nudge that leads to a tool call does not use up the nudges for later steps", async () => {
  const steps = [0, 1, 2, 3].flatMap((i) => [{ text: `Step ${i} done. Next, I will run the next step.` }, { calls: [{ name: "state", args: { i } }] }]);
  const provider = new FakeProvider([...steps, { text: "All four steps are done." }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), settings: { guidance: false, headless: true } });
  expect(await session.send("go")).toBe("All four steps are done.");
  expect(provider.requests.length).toBe(9);
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), settings: { guidance: false } });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), settings: { headless: true, referee: "none" } });
  const answer = await session.send("go");
  expect(answer).toBe("The fold change was 3.7 in group B.");
  const final = session.record.entries(["assistant"]).filter((e) => e.data.final === true);
  expect(final.map((e) => e.data.text)).toEqual(["The fold change was 3.7 in group B."]);
  expect(session.record.entries(["notice"]).some((e) => /stopped during the revision/.test(String(e.data.text)))).toBe(true);
});

test("after a forced final answer the harness does not ask for a tool call", async () => {
  const same = { calls: [{ name: "note", args: { text: "x" } }] };
  const provider = new FakeProvider([same, same, same, { text: "The count is 64. I will now give the final answer." }, { text: "other" }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), settings: { guidance: false, headless: true } });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")) });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")) });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")) });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")) });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")) });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")) });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")) });
  session.decisions.applySetup({ question: "How many?", method: "Default", min_size: 5 });
  await session.send("Count and blur");
  const last = session.record.entries(["assistant"]).at(-1)!.data as { text: string; results?: string };
  expect(last.results).toMatch(/Step results that the answer does not mention/);
  expect(last.results).toMatch(/n1 count: Counted 64 particles/);
  expect(last.text).toContain(last.results!);
});

test("an answer that still ends with a promise after three nudges is marked unfinished", async () => {
  const provider = new FakeProvider(() => ({ text: "I will now run the count." }));
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")) });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider: new FakeProvider([{ text: "x" }]), cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), settings: { guidance: false } });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), settings: { guidance: false } });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider: new FakeProvider([{ text: "x" }]), cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), settings: { guidance: false } });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")) });
  session.decisions.applySetup({ question: "How many?", method: "Default", min_size: 5 });
  await session.send("Count");
  const results = provider.requests.at(-1)!.messages.flatMap((m) => m.parts).filter((p) => p.type === "tool_result") as { text: string }[];
  expect(results[0]!.text).toMatch(/min_size.* = 5 \(you gave 99\)\. This result is for the recorded value, not for the value you gave\./);
  expect(results[0]!.text).toMatch(/call compare_options/);
});

test("comparison runs before a question wait for the other open decisions of the same call", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "fit", args: { data: "/data/x.csv", terms: "A + B", perms: 999 } }] }, { text: "done" }, { text: "done" }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/model")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")) });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/model")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), settings: { askWaits: false, autoResume: false } });
  session.decisions.applySetup({ question: "Does A change the outcome?" });
  await session.send("Fit the model");

  expect(session.record.nodes().filter((n) => n.sensitivityOf)).toHaveLength(0);
  expect(session.record.entries(["tool_result"]).some((e) => /length zero/.test(String(e.data.error ?? "")))).toBe(false);
  const q = session.record.entries(["question"]).find((e) => e.data.decisionKey === "perms")!;
  expect(String(q.data.evidence)).toMatch(/No comparison yet: the comparison runs of fit need a value for terms \(Model terms\)/);
});

test("an empty answer keeps the agent's argument in the comparison runs and in the held call", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "fit", args: { data: "/data/x.csv", terms: "A + B", perms: 999 } }] }, { text: "done" }, { text: "done" }]);
  session = await Session.create({ adapters: [join(__dirname, "fixtures/model")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")) });
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
  const cwd = mkdtempSync(join(tmpdir(), "ga-pick-"));
  const yaml = readFileSync(join(__dirname, "fixtures/lab/adapter.yaml"), "utf8");
  for (const name of ["lab", "lab2"]) {
    const dir = join(cwd, ".ga", "adapters", name);
    mkdirSync(join(dir, "skills"), { recursive: true });
    writeFileSync(
      join(dir, "adapter.yaml"),
      yaml.replace('adapter: { name: lab, title: Lab counter, version: "0.2.0" }', `adapter: { name: ${name}, title: Lab counter, version: "0.2.0", field: microscopy, file_types: [".lab", ".tif"] }\nstandards: "Count each image twice."`),
    );
    symlinkSync(join(__dirname, "fixtures/lab/server.ts"), join(dir, "server.ts"));
    writeFileSync(join(dir, "skills", "recount.md"), "---\nname: recount\ndescription: Count again with another method.\n---\nCount again.\n");
  }
  return cwd;
}

const toolNames = (p: FakeProvider, i: number) => p.requests[i].tools.map((t) => t.name);

test("with no adapter, use_adapter asks the scientist, then adds the tools, standards, skills and decisions of the adapter", async () => {
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

  expect(asked[0]).toEqual({ key: "adapter", text: "The agent wants to use Lab counter through the lab adapter: The request names a lab image. The request names a.lab, and lab reads that file type.", options: expect.arrayContaining(["lab", "lab2"]) });
  expect(asked[0].options[0]).toBe("lab");
  expect(asked[1].key).toBe("method");
  const node = session.record.nodes().find((n) => n.tool === "count" && !n.sensitivityOf)!;
  expect(node.decisions.method).toBe("Triangle");
  expect(node.decisions.min_size).toBe(5);
  expect(session.decisions.value("adapter")).toBe("lab");
  const loaded = session.record.entries(["adapter"]);
  expect(loaded).toHaveLength(1);
  expect(loaded[0].data).toMatchObject({ name: "lab", version: "0.2.0", programVersion: "1.0", reason: "The request names a lab image", by: "human", status: "draft", programFound: null });
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
  expect(session.record.entries(["answer"]).at(-1)!.data.note).toBe("answered from the answers file");
  expect(session.decisions.value("adapter")).toBe("lab2");
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "ga-proj-")) });
  expect(session.pick).toBe(false);
  expect(session.allTools().map((t) => t.name)).not.toContain("use_adapter");
  expect(session.decisions.has("adapter")).toBe(false);
});

test("a script that walks a large folder asks first, even after always allow", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "ga-cwd-"));
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")) });
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
  session = await Session.create({ adapters: [], model: "fake:", cwd: mkdtempSync(join(tmpdir(), "ga-cwd-")) });
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

test("plan first: no step runs before approval; approve logs plan_approved and starts step 1 in watch mode", async () => {
  const provider = new FakeProvider([{ calls: [blur] }, { calls: [{ name: "plan", args: PLAN }] }, { calls: [blur] }, { text: "Blurred with sigma 2." }, { text: "Blurred with sigma 2." }]);
  session = await Session.create({ adapters: [LAB], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), interactive: true });
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
  expect(seen).toEqual([["q1"]]);
  const approved = session.record.entries(["plan_approved"]);
  expect(approved).toHaveLength(1);
  expect(approved[0]!.data).toMatchObject({ version: 1, mode: "watch" });
  expect(String(approved[0]!.data.text)).toContain("Question: How does a blur change a.tif?");
  expect(String(approved[0]!.data.text)).toContain("- Set: Threshold method = Triangle (you)");
  expect(approved[0]!.id).toBeLessThan(session.record.nodes()[0]!.entry);
  expect(session.mode).toBe("watch");
  expect(session.decisions.value("method")).toBe("Triangle");
  expect(toolTexts(provider).some((t) => t.includes("The scientist approved plan version 1. Mode is now watch."))).toBe(true);
});

test("plan first: Change sends the request back and the agent revises; Cancel ends the turn with no step", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "plan", args: PLAN }] }, { calls: [{ name: "plan", args: { ...PLAN, out_of_scope: [] } }] }, { calls: [blur] }, { text: "Blurred." }, { text: "Blurred." }]);
  session = await Session.create({ adapters: [LAB], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), interactive: true, mode: "follow" });
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
  expect(String(session.record.entries(["plan_approved"])[0]!.data.text)).toContain("- Set: Threshold method = Otsu (decision record)");
  expect(session.mode).toBe("watch");

  const p2 = new FakeProvider([{ calls: [{ name: "plan", args: PLAN }] }, { calls: [blur] }]);
  const s2 = await Session.create({ adapters: [LAB], provider: p2, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), interactive: true });
  s2.decisions.applySetup({});
  s2.bus.on((e) => {
    if (e.type === "plan") setTimeout(() => s2.respondPlan({ action: "cancel" }), 0);
  });
  expect(await s2.send("Blur a.tif")).toBe("");
  expect(s2.record.entries(["plan"]).map((e) => e.data.action)).toEqual(["proposed", "cancelled"]);
  expect(s2.record.entries(["notice"]).some((e) => e.data.text === "You cancelled the plan. No analysis step ran.")).toBe(true);
  expect(s2.record.nodes()).toHaveLength(0);
  expect(s2.mode).toBe("watch");
  expect(p2.requests).toHaveLength(1);
  await s2.close();
});

test("a step that is not in the approved plan gets a visible note, and the agent adds it with a reason", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "plan", args: PLAN }] },
    { calls: [blur] },
    { text: "I also count the particles to check the blur.", calls: [{ name: "count", args: { input: "/data/a.tif", method: "Otsu", min_size: 5 } }] },
    { calls: [{ name: "plan", args: { steps: [{ step: "Count the particles", tool: "count" }] } }] },
    { calls: [{ name: "plan", args: { steps: [{ step: "Count the particles", tool: "count" }], reason: "The count checks the blur." } }] },
    { text: "Blurred with sigma 2. The count is 41." },
    { text: "Blurred with sigma 2. The count is 41." },
  ]);
  session = await Session.create({ adapters: [LAB], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), interactive: true });
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
  session = await Session.create({ adapters: [LAB], provider: new FakeProvider([]), cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), settings: { headless: true } });
  expect(session.planFirst).toBe(false);
  expect(Object.keys((session.allTools().find((t) => t.name === "plan")!.inputSchema as { properties: object }).properties)).toEqual(["steps"]);
  await session.close();

  const { attachHeadless } = await import("../src/core/headless.ts");
  const provider = new FakeProvider([{ calls: [{ name: "plan", args: PLAN }] }, { calls: [blur] }, { text: "Blurred with sigma 2." }, { text: "Blurred with sigma 2." }]);
  session = await Session.create({ adapters: [LAB], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), settings: { headless: true, planFirst: true } });
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
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")) });
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
  session = await Session.create({ adapters: [], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), settings: { guidance: false } });
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
  session = await Session.create({ adapters: [], provider, cwd: mkdtempSync(join(tmpdir(), "ga-proj-")), settings: { guidance: false, permissionMode: "bypass" } });
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

test("a turn with results writes results.xlsx in the output folder and one saved line; export_xlsx off writes none", async () => {
  const run = async (settings: Record<string, unknown>) => {
    const provider = new FakeProvider([{ calls: [{ name: "count", args: { input: "/data/a.tif", method: "Default" } }] }, { text: "The count is 64 (step 1)." }]);
    const cwd = mkdtempSync(join(tmpdir(), "ga-proj-"));
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
  expect(on.dir).toMatch(/\/ga-proj-[^/]+\/cuvette\/\d{4}-\d\d-\d\d-count-particles-tif$/);
  expect(readFileSync(on.xlsx).subarray(0, 2).toString()).toBe("PK");
  expect(on.saved.map((e) => e.data.text)).toEqual([expect.stringMatching(/^Saved: results\.xlsx \(4 sheets\)\. Folder: /)]);
  const off = await run({ export_xlsx: "off" });
  expect(off.saved).toEqual([]);
  expect(existsSync(off.xlsx)).toBe(false);
});

function pilotProject() {
  const root = mkdtempSync(join(tmpdir(), "ga-pilotproj-"));
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
  const provider = new FakeProvider([
    { calls: [{ name: "plan", args: CELL_PLAN(images) }] },
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
  session.bus.on((e) => {
    if (e.type !== "plan") return;
    events.push(e);
    const c = e.reference?.candidates[0];
    setTimeout(() => session!.respondPlan(e.stage === "plan" ? { action: "pilot", reference: { mode: "compare", path: c!.path, sheet: c!.sheet } } : { action: "confirm" }), 0);
  });
  await session.send(`Count the red-positive cells in ${images}`);

  expect(events.map((e) => e.stage)).toEqual(["plan", "pilot"]);
  expect(events[0].restatement).toBe("You want: for each field, the number of cells that took up red particles.");
  expect(events[0].pilot).toBe("Set 1");
  expect(events[0].reference.question).toBe("I found Analysis.xlsx (sheet Ox-LDL: Field, Red dots, Total cells). Is this an earlier analysis of these images? Should the pilot compare with it?");
  expect(events[0].text).toContain("What I will count\n1) positive cell: A cell with at least 1 red pixel inside its outline.");
  expect(events[0].text).toContain("What I will leave out, and what it does\n- Clumps over 15,000 px are left out. Effect: About 40% of the area with cells.");
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
  const provider = new FakeProvider([
    { calls: [{ name: "plan", args: CELL_PLAN(images) }] },
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
    if (e.type !== "plan") return;
    texts.push(e.text);
    const c = e.reference?.candidates[0];
    const r = e.stage === "pilot" ? { action: "confirm" as const } : n++ === 0 ? { action: "change" as const, text: "Use 5 red pixels.", definition: { measure: "positive cell", old: "A cell with at least 1 red pixel inside its outline.", new: "A cell with at least 5 red pixels inside its outline." } } : { action: "pilot" as const, reference: { mode: "blind" as const, path: c?.path ?? ref, sheet: "Ox-LDL" } };
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
