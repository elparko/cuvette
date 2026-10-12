import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { Session } from "../src/core/session.ts";
import { deleteMethod, exportMethod, importMethod, listMethods, loadMethod, methodsDir, readMethod } from "../src/core/methods.ts";
import { attachHeadless } from "../src/core/headless.ts";
import { rewindPoints } from "../src/core/rewind.ts";
import { FakeProvider, type FakeStep } from "../src/providers/fake.ts";
import type { Question } from "../src/core/types.ts";
import { folderLines, scanFolder, trustFolder } from "../src/core/trust.ts";

const LAB = join(__dirname, "fixtures/lab");
const open: Session[] = [];
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-method-"));
});
afterEach(async () => {
  for (const s of open.splice(0)) await s.close();
});

const QUESTION = "What counts as one particle: one dark spot, or one cluster?";
const METRICS = {
  restatement: "You want: the number of particles in a.tif.",
  definitions: [{ measure: "particle", definition: "One cluster above the threshold, at least 8 px." }],
  exclusions: [{ what: "Clusters that touch the edge.", effect: "The count is a little lower." }],
  pilot: { sample: "a.tif", shows: ["the outlines of the counted clusters"] },
  steps: [{ step: "Count the particles", tool: "count", settings: [{ key: "method", label: "Threshold method", value: "Otsu", by: "agent" }, { key: "min_size", label: "Smallest particle", value: 8, by: "agent" }] }],
};

async function finished(): Promise<Session> {
  const p = new FakeProvider([
    { calls: [{ name: "inspect_data", args: { path: join(__dirname, "fixtures/lab") } }, { name: "clarify", args: { found: "I see one image with about 60 dark particles.", questions: [{ question: QUESTION, options: ["One dark spot", "One cluster"] }] } }] },
    { calls: [{ name: "plan", args: METRICS }] },
    { calls: [{ name: "count", args: { input: "/data/a.tif", method: "Otsu", min_size: 8 } }] },
    { text: "The count is done." },
  ]);
  const s = await Session.create({ adapters: [LAB], provider: p, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), interactive: true });
  open.push(s);
  s.decisions.applySetup({});
  s.bus.on((e) => {
    if (e.type === "question") setTimeout(() => s.answer(e.question.qid, "One cluster"), 0);
    if (e.type === "plan") setTimeout(() => s.respondPlan({ action: "approve" }), 0);
  });
  await s.send("Count the particles in a.tif");
  return s;
}

test("/save-method saves the confirmed analysis as one file in the home folder, and it loads, exports, imports and deletes", async () => {
  const s = await finished();
  expect(rewindPoints(s.record).map((x) => x.label)).toEqual(["You wrote: Count the particles in a.tif", "Questions answered (1)", "Analysis confirmed, version 1"]);
  const { method, path } = s.saveMethod("particles");
  expect(path).toBe(join(methodsDir(), "particles.json"));
  const file = readMethod(readFileSync(path, "utf8"));
  expect(file).toEqual(JSON.parse(JSON.stringify(method)));
  expect(file).toMatchObject({
    cuvette_method: 1,
    name: "particles",
    request: "Count the particles in a.tif",
    questions: [{ question: QUESTION, answer: "One cluster" }],
    programs: [{ adapter: "lab", version: "0.2.0" }],
    decisions: { method: "Otsu", min_size: 8 },
    pilot: { required: true, shows: ["the outlines of the counted clusters"] },
    from: { session: s.id, folder: s.place.outDir },
  });
  expect(file.analysis.definitions).toEqual(METRICS.definitions);
  expect(file.analysis.exclusions).toEqual(METRICS.exclusions);
  expect(file.analysis.steps[0]!.decisions!.map((d) => [d.label, d.value])).toEqual([["Threshold method", "Otsu"], ["Smallest particle", 8]]);
  expect(file.analysis.steps[0]!.status).toBe("todo");
  expect(s.record.entries(["method"]).at(-1)!.data).toMatchObject({ action: "saved", name: "particles", path });

  expect(listMethods().map((m) => m.name)).toEqual(["particles"]);
  expect(loadMethod("particles").questions).toEqual(file.questions);
  const shared = exportMethod("particles", mkdtempSync(join(tmpdir(), "cuvette-share-")));
  expect(shared).toMatch(/particles\.cuvette-method\.json$/);
  expect(() => importMethod(shared)).toThrow(/A method named particles exists/);
  importMethod(shared, "particles-lab");
  expect(listMethods().map((m) => m.name)).toEqual(["particles", "particles-lab"]);
  deleteMethod("particles");
  expect(existsSync(path)).toBe(false);
  expect(() => loadMethod("particles")).toThrow(/No method named particles/);
  expect(() => readMethod("{}")).toThrow(/is not a Cuvette method file/);
});

test("a new session from a method shows the questions pre-answered and still demands the demonstration before the batch", async () => {
  const first = await finished();
  first.saveMethod("particles");
  const data = mkdtempSync(join(tmpdir(), "cuvette-new-data-"));
  const p = new FakeProvider([
    { calls: [{ name: "inspect_data", args: { path: join(__dirname, "fixtures/lab") } }, { name: "clarify", args: { found: "I see 12 images." } }] },
    { calls: [{ name: "plan", args: { restatement: "You want: the number of particles in each image.", steps: [{ step: "Count the particles", tool: "count", settings: [{ key: "min_size", label: "Smallest particle" }] }] } }] },
    { calls: [{ name: "count", args: { input: data, method: "Otsu", min_size: 8 } }] },
    { text: "I wait for the demonstration." },
  ]);
  const s = await Session.create({ adapters: [LAB], provider: p, cwd: data, interactive: true, method: "particles" });
  open.push(s);
  expect(s.record.entries(["method"])[0]!.data).toMatchObject({ action: "started", name: "particles", questions: 1 });
  expect(s.decisions.value("method")).toBe("Otsu");
  expect(s.decisions.value("min_size")).toBe(8);
  expect(s.record.entries(["setup"])[0]!.data.how).toBe("from the method particles");
  const asked: Question[] = [];
  let card: { settings?: { label: string; value?: unknown; by?: string }[]; definitions?: unknown; pilot?: string } | undefined;
  s.bus.on((e) => {
    if (e.type === "question") {
      asked.push(e.question);
      setTimeout(() => s.answer(e.question.qid, undefined), 0);
    }
    if (e.type === "plan" && e.stage === "plan") {
      card = e;
      setTimeout(() => s.respondPlan({ action: "approve" }), 0);
    }
  });
  await s.send("Count the particles in each image of this folder");

  expect(asked.map((q) => [q.title, q.recommendation?.value, q.options[0]?.value])).toEqual([[QUESTION, "One cluster", "One cluster"]]);
  expect(asked[0]!.text).toContain("The method particles answers: One cluster. Confirm it, or choose another answer for the new data.");
  expect(s.record.entries(["clarify"]).at(-1)!.data.answers).toEqual([`${QUESTION} -> One cluster`]);
  expect(p.requests[0]!.messages.flatMap((m) => m.parts).some((x) => x.type === "text" && x.text.includes('started this session from the saved method "particles"'))).toBe(true);

  expect(card!.definitions).toEqual(METRICS.definitions);
  expect(card!.pilot).toBe("a.tif");
  expect(card!.settings!.map((x) => [x.label, x.value, x.by])).toEqual([["Smallest particle", 8, "method particles"]]);
  expect(s.record.entries(["plan_approved"])).toEqual([]);
  expect(s.record.entries(["plan"]).some((e) => e.data.action === "pilot_requested")).toBe(true);
  expect(s.record.entries(["notice"]).some((e) => /requires the demonstration on a sample before the batch/.test(String(e.data.text)))).toBe(true);
  const batch = s.record.entries(["tool_result"]).find((e) => e.data.tool === "count")!;
  expect(String(batch.data.error ?? batch.data.text)).toMatch(/Pilot first/);
  expect(s.record.nodes()).toEqual([]);
});

test("a method in the project folder loads only after the scientist trusts the folder", async () => {
  const first = await finished();
  const { path } = first.saveMethod("lab-way", "project");
  expect(path).toBe(join(first.cwd, ".cuvette", "methods", "lab-way.json"));
  expect(listMethods(first.cwd).map((m) => [m.name, m.where, m.trusted])).toEqual([["lab-way", "project", true]]);
  const colleague = mkdtempSync(join(tmpdir(), "cuvette-colleague-"));
  mkdirSync(join(colleague, ".cuvette", "methods"), { recursive: true });
  copyFileSync(path, join(colleague, ".cuvette", "methods", "lab-way.json"));
  expect(listMethods(colleague).map((m) => [m.name, m.where, m.trusted])).toEqual([["lab-way", "project", false]]);
  expect(folderLines(scanFolder(colleague))).toContain("  lab-way");
  await expect(Session.create({ adapters: [LAB], provider: new FakeProvider([]), cwd: colleague, interactive: true, method: "lab-way" })).rejects.toThrow(/not trusted\. Check the folder with \/trust/);
  trustFolder(colleague);
  const s = await Session.create({ adapters: [LAB], provider: new FakeProvider([]), cwd: colleague, interactive: true, method: "lab-way" });
  open.push(s);
  expect(s.method?.name).toBe("lab-way");
});

const weights = (scale: number, name = "weight") => [`animal,${name},length`, ...Array.from({ length: 20 }, (_, i) => `M${i + 1},${(20 + (i % 9)) * scale},${10 + (i % 5)}`)].join("\n") + "\n";
const STEPS = { restatement: "You want: the mean weight.", steps: [{ step: "Count", tool: "count", settings: [{ key: "min_size", label: "Smallest particle", value: 8, by: "agent" }] }] };

async function runOn(csv: string, method?: string, steps: FakeStep[] = [], allow?: Set<string>) {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-weights-"));
  writeFileSync(join(cwd, "weights.csv"), csv);
  const p = new FakeProvider([{ calls: [{ name: "read_file", args: { path: join(cwd, "weights.csv") } }] }, { calls: [{ name: "clarify", args: { found: "I see 20 animals." } }] }, { calls: [{ name: "plan", args: STEPS }] }, ...steps, { text: "done" }, { text: "done" }]);
  const s = await Session.create({ adapters: [LAB], provider: p, cwd, interactive: true, method });
  open.push(s);
  s.decisions.applySetup({});
  const cards: Question[] = [];
  if (allow) attachHeadless(s, { answers: {}, allow });
  s.bus.on((e) => {
    if (e.type === "question" && e.question.title.startsWith("Data check: the data differs")) cards.push(e.question);
    if (allow) return;
    if (e.type === "question") setTimeout(() => s.answer(e.question.qid, e.question.recommendation?.value ?? e.question.options[0]?.value), 0);
    if (e.type === "plan") setTimeout(() => s.respondPlan({ action: e.stage === "pilot" ? "confirm" : "approve" }), 0);
  });
  await s.send("Compare the weights in weights.csv");
  return { s, cards };
}

test("a saved method stores a summary of its data, and a run on data with another unit shows a card before any step runs", async () => {
  const first = await runOn(weights(1));
  expect(first.cards).toEqual([]);
  const saved = first.s.saveMethod("weights").method;
  expect(saved.inputs).toHaveLength(1);
  expect(saved.inputs![0]!.columns.map((c) => [c.name, c.type, c.median])).toEqual([["animal", "text", undefined], ["weight", "number", 23.5], ["length", "number", 12]]);
  expect(loadMethod("weights").inputs).toEqual(saved.inputs);

  const { s, cards } = await runOn(weights(1000), "weights", [{ calls: [{ name: "count", args: { input: "x", method: "Otsu", min_size: 8 } }] }]);
  expect(cards).toHaveLength(1);
  expect(cards[0]!.text).toContain("Column 'weight' has a median of 23,500. Before, the median was 23.5.");
  expect(cards[0]!.text).toContain("The unit may be grams, not kilograms.");
  expect(cards[0]!.options.map((o) => o.value)).toEqual(["continue", "stop"]);
  const entries = s.record.entries();
  const card = entries.find((e) => e.kind === "question" && String(e.data.title).startsWith("Data check: the data differs"))!;
  const firstTool = entries.find((e) => e.kind === "tool_call" && !["read_file", "clarify", "plan", "inspect_data"].includes(String(e.data.tool ?? e.data.name)));
  if (firstTool) expect(card.id).toBeLessThan(firstTool.id);
  const compare = s.record.entries(["data_compare"]);
  expect(compare).toHaveLength(1);
  expect(compare[0]!.data).toMatchObject({ method: "weights", differences: [{ kind: "unit", column: "weight" }] });
  expect(s.record.entries(["decision"]).some((e) => String(e.data.key).startsWith("data_check:method_data:") && e.data.new === "stop")).toBe(true);
  expect(s.record.entries(["notice"]).some((e) => /You stopped the analysis to correct the data: Column 'weight' has a median of 23,500/.test(String(e.data.text)))).toBe(true);
  expect(s.record.entries(["tool_call"]).some((e) => (e.data.tool ?? e.data.name) === "count")).toBe(false);
});

test("a run on the same kind of data shows no card", async () => {
  const first = await runOn(weights(1));
  first.s.saveMethod("weights");
  const again = await runOn(weights(1), "weights");
  expect(again.cards).toEqual([]);
  expect(again.s.record.entries(["data_compare"])[0]!.data.differences).toEqual([]);
});

test("a method without a stored summary still runs, with one note, and the record holds the summary for the next save", async () => {
  const first = await runOn(weights(1));
  const { method } = first.s.saveMethod("old-way");
  const { inputs: _i, ...old } = method;
  writeFileSync(join(methodsDir(), "old-way.json"), JSON.stringify(old));
  expect(loadMethod("old-way").inputs).toBeUndefined();
  const { s, cards } = await runOn(weights(1000), "old-way");
  expect(cards).toEqual([]);
  expect(s.record.entries(["notice"]).filter((e) => /has no stored summary of its data/.test(String(e.data.text)))).toHaveLength(1);
  expect(s.record.entries(["data_compare"])).toEqual([]);
  expect(s.record.entries(["data_check"])[0]!.data.summary).toMatchObject({ rows: 20, columns: [{ name: "animal" }, { name: "weight", median: 23500 }, { name: "length" }] });
});

test("headless mode stops at a likely unit change and writes it to the record, unless --allow data-change is set", async () => {
  const first = await runOn(weights(1));
  first.s.saveMethod("weights");
  const stopped = await runOn(weights(1000), "weights", [], new Set());
  expect(stopped.s.record.entries(["data_compare"])[0]!.data).toMatchObject({ differences: [{ kind: "unit" }] });
  expect(stopped.s.record.entries(["decision"]).find((e) => String(e.data.key).startsWith("data_check:method_data:"))!.data.new).toBe("stop");
  expect(stopped.s.record.entries(["notice"]).some((e) => /Headless mode stops at a likely unit change\. Column 'weight'.*Pass --allow data-change to continue\./.test(String(e.data.text)))).toBe(true);
  const allowed = await runOn(weights(1000), "weights", [], new Set(["data-change"]));
  expect(allowed.s.record.entries(["decision"]).find((e) => String(e.data.key).startsWith("data_check:method_data:"))!.data.new).toBe("continue");
});
