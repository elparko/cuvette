import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { afterEach, beforeEach, expect, test } from "vitest";
import { buildChecklist, checklistText, GUIDELINE_IDS, guessGuideline, guidelineId, loadGuideline, offerText, REPORTING_KEY, setGuideline } from "../src/core/checklist.ts";
import { AnalysisRecord } from "../src/core/record.ts";
import { exportMarkdown, exportHtml } from "../src/core/trail.ts";
import { buildWorkbook, copyFigures } from "../src/core/results.ts";
import type { NodeIn } from "../src/core/types.ts";
import { Session } from "../src/core/session.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { analysedSession } from "./fixtures/eln-session.ts";
import { unzip } from "./fixtures/unzip.ts";

function recordWith(values: Record<string, unknown>): AnalysisRecord {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-checklist-"));
  const r = new AnalysisRecord(dir, "s1");
  r.append("setup", { values, owners: {}, profile: null, how: "form", defaultsAccepted: [] });
  return r;
}

function node(over: Partial<NodeIn>): NodeIn {
  return {
    entry: 1, adapter: "biostats", adapterVersion: "0.1.0", programVersion: "1.2", tool: "two_group_test", args: {}, decisions: {}, codeHash: "", inputHashes: [],
    outputs: [], result: {}, parents: [], summary: "Welch t-test of the groups.", model: "fake", manualRoute: "", fidelity: "code_only", ...over,
  };
}

const item = (c: ReturnType<typeof buildChecklist>, id: string) => c.items.find((i) => i.id === id)!;

test("each guideline file loads and has unique item ids", () => {
  for (const id of GUIDELINE_IDS) {
    const g = loadGuideline(id);
    expect(g.id).toBe(id);
    const ids = g.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const i of g.items) {
      expect(i.text.length).toBeGreaterThan(10);
      expect(Boolean(i.from.length) || Boolean(i.hand)).toBe(true);
    }
  }
  expect(loadGuideline("arrive").items.map((i) => i.id)).toEqual(expect.arrayContaining(["1a", "1b", "2a", "2b", "3a", "3b", "3c", "4a", "4b", "5", "6a", "6b", "7a", "7b", "8a", "8b", "9a", "9b", "9c", "9d", "10a", "10b"]));
  expect(loadGuideline("consort").items.map((i) => i.id)).toEqual(expect.arrayContaining(["8a", "11a", "12a", "13a", "17a"]));
  expect(loadGuideline("strobe").items.map((i) => i.id)).toEqual(expect.arrayContaining(["6a", "12c", "14b", "16a"]));
  expect(loadGuideline("miqe").items.map((i) => i.id)).toEqual(expect.arrayContaining(["DA3", "DA5", "DA6", "DA8"]));
});

test("a guideline id is read from the text of the command", () => {
  expect(guidelineId(" ARRIVE ")).toBe("arrive");
  expect(guidelineId("prisma")).toBeUndefined();
});

test("randomization and blinding decisions give Covered for the ARRIVE items", () => {
  const r = recordWith({ randomization: "block randomization by litter", blinding: "the analyst did not know the group", replicate: "animals" });
  const c = buildChecklist(r, "arrive");
  expect(item(c, "4a").status).toBe("covered");
  expect(item(c, "4a").value).toContain("block randomization by litter");
  expect(item(c, "4a").source).toBe("Decision randomization");
  expect(item(c, "5").status).toBe("covered");
  expect(item(c, "5").value).toContain("did not know the group");
  expect(item(c, "1b").status).toBe("covered");
});

test("a record without randomization and blinding gives Not in the record", () => {
  const r = recordWith({ replicate: "animals" });
  const c = buildChecklist(r, "arrive");
  expect(item(c, "4a").status).toBe("missing");
  expect(item(c, "4a").ask).toBe("The record has no randomization method. Add it?");
  expect(item(c, "5").status).toBe("missing");
  expect(item(c, "8a").status).toBe("missing");
  expect(item(c, "8a").hand).toMatch(/by hand/);
  expect(item(c, "8a").ask).toBeUndefined();
  expect(checklistText(c)).toContain("[Not in the record]");
});

test("a later decision replaces the setup value, and an unset decision removes it", () => {
  const r = recordWith({ blinding: "none" });
  r.append("decision", { key: "blinding", old: "none", new: "outcome assessor", by: "human", reason: "" });
  expect(item(buildChecklist(r, "arrive"), "5").value).toContain("outcome assessor");
  r.append("decision", { key: "blinding", old: "outcome assessor", new: null, by: "human", reason: "", unset: true });
  expect(item(buildChecklist(r, "arrive"), "5").status).toBe("missing");
});

test("the animal-study paper of the benchmark gives a checklist with the unit, the test and the gaps", () => {
  const spec = parseYaml(readFileSync(join(__dirname, "..", "bench", "papers", "jahncke2025-dag1-mipsc", "case.yaml"), "utf8")) as { answers: Record<string, { value: unknown }> };
  const values = Object.fromEntries(Object.entries(spec.answers).map(([k, a]) => [k, a.value]));
  const r = recordWith(values);
  r.addNode(node({ result: { metrics: { diff_amplitude: -4.1, lower_amplitude: -7.3, upper_amplitude: -0.9 } } }));
  const c = buildChecklist(r, "arrive");
  expect(item(c, "1b").status).toBe("covered");
  expect(item(c, "1b").value).toContain("cells");
  expect(item(c, "7a").status).toBe("covered");
  expect(item(c, "7a").value).toContain("group_test = t");
  expect(item(c, "10b").status).toBe("covered");
  expect(item(c, "10b").source).toBe("Result of step 1");
  expect(item(c, "4a").status).toBe("missing");
  expect(item(c, "5").status).toBe("missing");
  expect(c.counts.covered + c.counts.missing + c.counts.not_applicable).toBe(c.items.length);
});

test("the plan, the sample sheet and the data check fill items", () => {
  const r = recordWith({});
  r.append("plan_approved", { version: 1, text: "plan", plan: { steps: [], exclusions: [{ what: "Wells with Cq above 35", effect: "Left out" }], data: { replicate: "mouse", n: "6 per group" } } });
  r.append("samples", { action: "accepted", rows: [
    { sample: "a1", group: "control", unit: "m1", batch: "d1", path: "" },
    { sample: "a2", group: "control", unit: "m2", batch: "d1", path: "" },
    { sample: "b1", group: "ko", unit: "m3", batch: "d2", path: "" },
  ] });
  r.append("data_check", { source: "plate.csv", kind: "table", size: "3 rows", items: [], text: "" });
  const c = buildChecklist(r, "arrive");
  expect(item(c, "1a").value).toBe("control, ko");
  expect(item(c, "1b").value).toBe("mouse");
  expect(item(c, "2a").value).toBe("control: 2 units, 2 samples; ko: 1 unit, 1 sample");
  expect(item(c, "3a").value).toContain("Wells with Cq above 35");
  expect(item(c, "4b").value).toBe("2 batches: d1, d2");
  const strobe = buildChecklist(r, "strobe");
  expect(item(strobe, "12c").status).toBe("covered");
  expect(item(strobe, "12c").source).toBe("Data check of plate.csv");
});

test("changes to the confirmed plan fill the CONSORT items about changes", () => {
  const r = recordWith({});
  expect(item(buildChecklist(r, "consort"), "3b").status).toBe("missing");
  r.append("plan_approved", { version: 1, text: "plan", plan: { steps: [] } });
  expect(item(buildChecklist(r, "consort"), "3b").value).toContain("no change");
  r.append("plan", { action: "updated", version: 2, reason: "Added a sensitivity step", text: "x", plan: { steps: [] } });
  expect(item(buildChecklist(r, "consort"), "3b").value).toBe("Version 2: Added a sensitivity step");
});

test("MIQE items read the qPCR decisions and metrics", () => {
  const r = recordWith({ reference_genes: "GAPDH, ACTB", quant_method: "ddCt", replicates: 3, exclude_wells: "none" });
  r.addNode(node({ adapter: "qpcr", tool: "fit_efficiency", summary: "Fit the efficiency.", result: { metrics: { efficiency_GAPDH: 1.96, r_squared_GAPDH: 0.99 } } }));
  const c = buildChecklist(r, "miqe");
  expect(item(c, "DA5").status).toBe("covered");
  expect(item(c, "DA6").value).toContain("ddCt");
  expect(item(c, "DA8").value).toContain("replicates = 3");
  expect(item(c, "DA3").value).toContain("none");
  expect(item(c, "VA1").value).toContain("efficiency_GAPDH = 1.96");
  expect(item(c, "DA1").value).toContain("qpcr program 1.2");
  expect(item(c, "DA13").status).toBe("missing");
});

test("the guess uses the adapter first and the words of the request second", () => {
  expect(guessGuideline(recordWith({ question: "Do the mice in the knockout group gain weight?" }), [])?.id).toBe("arrive");
  expect(guessGuideline(recordWith({ question: "Compare Cq values" }), ["qpcr"])?.id).toBe("miqe");
  expect(guessGuideline(recordWith({ question: "Plot the data" }), [])).toBeUndefined();
});

let s: Session;
beforeEach(async () => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-checklist-home-"));
  s = await analysedSession();
});
afterEach(() => s.close());

test("/checklist with no guideline asks which one, with a recommendation", async () => {
  const r = await s.checklist("");
  expect(r.asked).toBe(1);
  const q = s.questions.open().find((x) => x.decisionKey === REPORTING_KEY)!;
  expect(q.options.map((o) => o.value)).toEqual(["arrive", "consort", "strobe", "miqe"]);
  await s.checklist("");
  expect(s.questions.open().filter((x) => x.decisionKey === REPORTING_KEY)).toHaveLength(1);
  await s.answer(q.qid, "strobe");
  expect(setGuideline(s.record)).toBe("strobe");
});

test("missing items become question cards, and an answer makes the item Covered", async () => {
  const r = await s.checklist("arrive");
  expect(setGuideline(s.record)).toBe("arrive");
  expect(r.asked).toBeGreaterThan(5);
  const q = s.questions.open().find((x) => x.title.startsWith("Checklist ARRIVE 4a"))!;
  expect(q.text).toBe("The record has no randomization method. Add it?");
  expect(q.decisionKey).toBe("");
  await s.answer(q.qid, "Random numbers from a table, by litter");
  const na = s.questions.open().find((x) => x.title.startsWith("Checklist ARRIVE 5"))!;
  await s.answer(na.qid, "not applicable");
  const c = buildChecklist(s.record, "arrive");
  expect(item(c, "4a").status).toBe("covered");
  expect(item(c, "4a").value).toBe("Random numbers from a table, by litter");
  expect(item(c, "4a").source).toBe(`Your answer to ${q.qid}`);
  expect(item(c, "5").status).toBe("not_applicable");
  const again = await s.checklist("");
  expect(again.text).toContain("[Covered]");
  expect(s.questions.open().filter((x) => x.title.startsWith("Checklist ARRIVE 4a"))).toHaveLength(0);
});

test("a wrong guideline name is an error", async () => {
  await expect(s.checklist("prisma")).rejects.toThrow(/Use: \/checklist/);
});

test("the trail, the workbook and the .eln file hold the checklist table", async () => {
  await s.checklist("arrive");
  const out = mkdtempSync(join(tmpdir(), "cuvette-checklist-out-"));
  const md = readFileSync(exportMarkdown(s.record, s.adapters, join(out, "trail.md")), "utf8");
  expect(md).toContain("## Reporting checklist: ARRIVE 2.0 Essential 10");
  expect(md).toContain("| 4a | Describe the method that made the random sequence. If you did not randomize, say so. | Not in the record |");
  const html = readFileSync(exportHtml(s.record, s.adapters, join(out, "trail.html")), "utf8");
  expect(html).toContain("<h2>Reporting checklist: ARRIVE 2.0 Essential 10</h2>");
  const sheets = buildWorkbook({ record: s.record, adapters: s.adapters, fields: s.decisions.fields(), programs: [], dir: out, figures: copyFigures(s.record, out) });
  const sheet = sheets.find((x) => x.name === "Checklist")!;
  expect(sheet.rows).toHaveLength(loadGuideline("arrive").items.length);
  expect(sheet.rows.find((r) => r[1] === "4a")![4]).toBe("Not in the record");
  const files = unzip(readFileSync(await s.exportAs("eln")));
  const top = `${s.id}/analysis/`;
  expect(files.get(`${top}checklist.md`)!.toString()).toContain("# Reporting checklist: ARRIVE 2.0 Essential 10");
  expect(files.get(`${top}checklist.csv`)!.toString().split("\n")[0]).toBe("Guideline,Item,Section,Requirement,Status,Value in the record,Source or note");
  const crate = JSON.parse(files.get(`${s.id}/ro-crate-metadata.json`)!.toString());
  expect(crate["@graph"].some((n: { "@id": string }) => n["@id"] === "./analysis/checklist.md")).toBe(true);
});

test("a session with no guideline exports no checklist", async () => {
  const out = mkdtempSync(join(tmpdir(), "cuvette-checklist-none-"));
  expect(readFileSync(exportMarkdown(s.record, s.adapters, join(out, "trail.md")), "utf8")).not.toContain("Reporting checklist");
  const files = unzip(readFileSync(await s.exportAs("eln")));
  expect(files.has(`${s.id}/analysis/checklist.md`)).toBe(false);
});

test("the offer text names the guideline and the count", () => {
  const c = buildChecklist(recordWith({ randomization: "x" }), "arrive");
  expect(offerText(c)).toContain("ARRIVE 2.0 Essential 10 checklist is ready: 1 of 22 items");
});

test("after the last step, the session offers the checklist once when a guideline is set", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "count", args: { input: "/data/b.tif", method: "Otsu", min_size: 10 } }] },
    { text: "There are 12 particles (step 1)." },
    { calls: [{ name: "count", args: { input: "/data/c.tif", method: "Otsu", min_size: 10 } }] },
    { text: "There are 9 particles (step 2)." },
  ]);
  const t = await Session.create({ adapters: [join(__dirname, "fixtures", "lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  t.decisions.applySetup({ question: "How many particles?", method: "Otsu" });
  t.decisions.change(REPORTING_KEY, "arrive");
  const offers = () => t.record.entries(["notice"]).filter((e) => e.data.checklist === "offer");
  await t.send("Count the particles in b.tif");
  expect(offers()).toHaveLength(1);
  expect(String(offers()[0]!.data.text)).toContain("Type /checklist");
  await t.send("Count the particles in c.tif");
  expect(offers()).toHaveLength(1);
  await t.close();
});
