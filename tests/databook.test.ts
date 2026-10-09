import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildDatabook, localePaper, openRecord, pdfPages, resolveTarget, writeDatabook } from "../src/core/databook.ts";
import { AnalysisRecord } from "../src/core/record.ts";
import { find } from "../src/core/settings.ts";
import { findChrome } from "../src/core/trail.ts";

const FIXTURE = join(__dirname, "fixtures", "databook", "log.jsonl");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const PLAN_KINDS = new Set(["plan", "plan_approved"]);

let home: string;
let oldHome: string | undefined;

beforeEach(() => {
  oldHome = process.env.GA_HOME;
  home = mkdtempSync(join(tmpdir(), "ga-db-home-"));
  process.env.GA_HOME = home;
});

afterEach(() => {
  if (oldHome === undefined) delete process.env.GA_HOME;
  else process.env.GA_HOME = oldHome;
});

function session(opts: { plan?: boolean; dir?: string } = {}): AnalysisRecord {
  const dir = opts.dir ?? join(mkdtempSync(join(tmpdir(), "ga-db-")), "s");
  mkdirSync(dir, { recursive: true });
  const lines = readFileSync(FIXTURE, "utf8").split("\n").filter(Boolean).filter((l) => opts.plan !== false || !PLAN_KINDS.has(JSON.parse(l).kind));
  writeFileSync(join(dir, "log.jsonl"), lines.join("\n") + "\n");
  return new AnalysisRecord(dir, "20261008-192132-8dd2");
}

function addPilot(r: AnalysisRecord): void {
  const dir = mkdtempSync(join(tmpdir(), "ga-db-fig-"));
  const qc = join(dir, "pilot-qc.png");
  const plot = join(dir, "bland-altman-mean_diff.png");
  writeFileSync(qc, PNG);
  writeFileSync(plot, Buffer.concat([PNG, Buffer.from([0])]));
  const run = r.append("pilot_run", {
    sample: "/data/sleep_pilot.csv", values: { mean_diff: 1.6 }, images: [qc], check: "The pilot difference is close to the reference.",
    comparison: ["The agent found 1.6 hours; the reference has 1.58 hours."], reference: { path: "/data/reference.xlsx", mode: "compare", values: { mean_diff: 1.58 } },
    definitions: [{ measure: "mean_diff", definition: "mean of drug 2 minus drug 1 for each patient" }],
  });
  r.append("pilot_approved", { run: run.id, sample: "/data/sleep_pilot.csv" });
  r.append("validation", {
    measure: "mean_diff", reference: "/data/reference.xlsx", mode: "compare", plot,
    pairs: [{ sample: "a", ours: 1.6, ref: 1.58, pilot: true }, { sample: "b", ours: 1.5, ref: 1.55, pilot: false }],
    summary: ["The mean difference is 0.01 hours."],
  });
}

function addFigure(r: AnalysisRecord): void {
  const sha = r.putBlob(Buffer.concat([PNG, Buffer.from([1])]), ".png");
  r.addNode({
    entry: 0, adapter: "biostats", adapterVersion: "0.1.1", programVersion: "0.30.3", tool: "plot_groups",
    args: { path: "/data/sleep.csv", y: "extra", error_bars: "95% confidence interval", title: "Extra sleep by drug" },
    decisions: {}, codeHash: "c", inputHashes: [], outputs: [{ path: "/work/groups.png", kind: "image", name: "groups.png", sha }],
    result: { ok: true, metrics: { n_a: 10, n_b: 10 } }, parents: [], summary: "Plotted extra sleep by drug.", model: "m", manualRoute: "", fidelity: "close",
  });
}

const book = (records: AnalysisRecord[]) => buildDatabook({ records, project: "/labs/sleep-study", author: "A. Scientist", paper: "a4", date: "2026-10-09" });
const titles = (b: ReturnType<typeof book>) => b.toc.map((t) => t.title);

describe("databook", () => {
  it("puts the sections in the fixed order", () => {
    const r = session();
    addPilot(r);
    addFigure(r);
    const b = book([r]);
    expect(titles(b)).toEqual([
      "Question and confirmed analysis", "Data", "Methods", "Pilot and validation", "Results", "Final answer",
      "Checks", "Manual route", "References", "Steps and arguments", "Software environment", "Record files",
    ]);
    expect(b.toc.map((t) => t.num)).toEqual(["1", "2", "3", "4", "5", "5.1", "6", "7", "8", "Appendix A", "Appendix B", "Appendix C"]);
    const at = (s: string) => b.html.indexOf(s);
    expect(at('class="title-page"')).toBeGreaterThan(0);
    expect(at('class="title-page"')).toBeLessThan(at('class="contents"'));
    expect(at('class="contents"')).toBeLessThan(at('id="sec-1"'));
    expect(b.html).toContain("A. Scientist");
    expect(b.html).toContain("size:A4");
  });

  it("leaves out the plan and the pilot when the record has no such events", () => {
    const b = book([session({ plan: false })]);
    expect(titles(b)).toEqual(["Question", "Data", "Methods", "Results", "Final answer", "Checks", "Manual route", "References", "Steps and arguments", "Software environment", "Record files"]);
    expect(b.html).not.toContain("confirmed version");
    expect(b.html).not.toContain("Pilot");
  });

  it("shows the confirmed version and lists earlier versions in the appendix", () => {
    const r = session();
    r.append("plan", { action: "update_proposed", version: 2, text: "Question: version two" });
    r.append("plan_approved", {
      version: 2, text: "Question: version two, confirmed",
      plan: { question: "Is drug 2 better?", steps: [], definitions: [{ measure: "extra sleep", definition: "hours of sleep above the baseline night" }], exclusions: [{ what: "Patients with a missing night", effect: "removes 0 of 10 patients" }] },
    });
    const b = book([r]);
    expect(b.html).toContain("The scientist confirmed version 2 of the proposed analysis");
    expect(b.html).toContain("Question: version two, confirmed");
    expect(titles(b).at(-1)).toBe("Earlier versions of the analysis");
    expect(b.html).toMatch(/version 1, proposed on/);
    expect(b.html).toMatch(/Definitions of each measure\.<\/caption>.*<td>extra sleep<\/td><td>hours of sleep above the baseline night<\/td>/);
    expect(b.html).toMatch(/Exclusions and their effect on the data\.<\/caption>.*Patients with a missing night.*removes 0 of 10 patients/);
  });

  it("writes the methods paragraph from the record", () => {
    const b = book([session()]);
    const methods = /<p class="methods">([^<]*)<\/p>/.exec(b.html)![1]!.replace(/&quot;/g, '"');
    expect(methods).toMatch(/^The analysis used statsmodels, pingouin, lifelines \(version lifelines 0\.30\.3[^)]*\) \[2\]\./);
    expect(methods).toContain("ran the program steps through the biostats 0.1.1 adapter");
    expect(methods).toContain("Step 1 (inspect_table): 20 rows x 4 columns.");
    expect(methods).toContain("Step 2 (compare_two_groups): paired t-test, two-sided");
    expect(methods).toContain("The scientist chose these settings: Paired test = true");
    expect(methods).toContain("Sidedness = two-sided");
    expect(methods).toMatch(/The scientist kept the default for: What is the unit of replication = subjects/);
    expect(b.html).toMatch(/<td[^>]*>scientist<\/td><td[^>]*>answer to q1<\/td>/);
    expect(b.html).toMatch(/<ol class="refs"><li>[^<]*Cuvette[^<]*<\/li><li>[^<]*(statsmodels|Seabold)/);
  });

  it("numbers figures and tables in order and gives n and the error bar type", () => {
    const r = session();
    addPilot(r);
    addFigure(r);
    const b = book([r]);
    const figs = [...b.html.matchAll(/<b>Figure (\d+)\.<\/b>/g)].map((m) => Number(m[1]));
    const tabs = [...b.html.matchAll(/<b>Table (\d+)\.<\/b>/g)].map((m) => Number(m[1]));
    expect(figs).toEqual([1, 2, 3]);
    expect(tabs).toEqual(Array.from({ length: tabs.length }, (_, i) => i + 1));
    expect(b.figures).toBe(3);
    expect(b.tables).toBe(tabs.length);
    expect(b.html).toMatch(/Figure 1\.<\/b> Quality-control image 1 of the pilot sample \/data\/sleep_pilot\.csv/);
    expect(b.html).toMatch(/Figure 2\.<\/b> Bland-Altman plot[^<]*n = 2 samples\./);
    expect(b.html).toMatch(/Figure 3\.<\/b> Extra sleep by drug\. Step 3 \(plot_groups\)[^<]*n: n_a = 10, n_b = 10\. Error bars: 95% confidence interval\./);
    expect(b.html).toContain("Pilot results: each measure on the pilot sample");
    expect(b.html).toContain("The agent found 1.6 hours; the reference has 1.58 hours.");
    expect(b.html).toMatch(/The scientist approved this pilot on/);
  });

  it("links each number in the final answer to its step", () => {
    const b = book([session()]);
    expect(b.html).toMatch(/1\.58 <sup>\[<a href="#p1-step-2">step 2<\/a>\]<\/sup>/);
    expect(b.html).toContain('id="p1-step-2"');
    expect(b.html).not.toMatch(/drug 2 <sup>/);
  });

  it("collects every session of a project folder", () => {
    const project = mkdtempSync(join(tmpdir(), "ga-db-proj-"));
    session({ dir: join(project, "cuvette", "2026-10-08-sleep", ".record") });
    const lines = readFileSync(FIXTURE, "utf8").replace(/20261008-192132-8dd2/g, "20261009-100000-aaaa");
    mkdirSync(join(project, "cuvette", "2026-10-09-sleep", ".record"), { recursive: true });
    writeFileSync(join(project, "cuvette", "2026-10-09-sleep", ".record", "log.jsonl"), lines);
    writeFileSync(join(project, "cuvette", "2026-10-09-sleep", ".record", "meta.json"), JSON.stringify({ id: "20261009-100000-aaaa", title: "sleep", created: "2026-10-09T10:00:00Z", fromProject: "cuvette/2026-10-09-sleep" }));
    const t = resolveTarget(project, "/", undefined);
    expect(t.projectLevel).toBe(true);
    expect(t.found).toHaveLength(2);
    expect(t.found.map((f) => f.project)).toEqual([project, project]);
    expect(t.outDir).toBe(join(project, "cuvette"));
    expect(t.base).toMatch(/^databook-\d{4}-\d{2}-\d{2}$/);
    expect(resolveTarget(project, "/", ["20261009-100000-aaaa"]).found).toHaveLength(1);
    const one = resolveTarget(join(project, "cuvette", "2026-10-08-sleep"), "/");
    expect(one.projectLevel).toBe(false);
    expect(one.outDir).toBe(join(project, "cuvette", "2026-10-08-sleep"));
    const b = book(t.found.map(openRecord));
    expect(b.toc.filter((x) => x.level === 1).map((x) => x.num)).toEqual(["1", "2", "3", "Appendix A", "Appendix B", "Appendix C"]);
    expect(b.toc[1]).toMatchObject({ num: "1.1", title: "Question and confirmed analysis" });
  });

  it("has settings for the author and the paper size", () => {
    expect(find("databook_author")?.scopes).toContain("user");
    expect(find("databook_paper")?.choices?.()).toEqual(["a4", "letter"]);
    expect(localePaper({ LANG: "en_US.UTF-8" })).toBe("letter");
    expect(localePaper({ LANG: "de_DE.UTF-8" })).toBe("a4");
  });

  it.skipIf(!findChrome())("writes a PDF with more than one page", async () => {
    const r = session();
    addFigure(r);
    const w = await writeDatabook({ target: r.dir, cwd: "/", formats: ["pdf"], author: "A. Scientist", paper: "a4" });
    expect(existsSync(w.html)).toBe(true);
    expect(w.pdf && existsSync(w.pdf)).toBe(true);
    expect(w.pages).toBeGreaterThan(1);
    expect(pdfPages(w.pdf!)).toBe(w.pages);
  }, 120000);
});
