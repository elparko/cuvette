import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { afterAll, beforeAll, expect, test } from "vitest";
import { buildCases, caseGaps, listedHashes, loadCase, makeSanitizer, sourceText } from "../src/bench/papers-cases.ts";
import { loadPaper, paperIds } from "../src/bench/papers-spec.ts";

test("every paper has a case.yaml that covers each answer and each item", () => {
  const ids = paperIds();
  expect(ids.length).toBeGreaterThanOrEqual(28);
  for (const id of ids) {
    const c = loadCase(id);
    expect(c, id).toBeDefined();
    expect(caseGaps(loadPaper(id), c!), id).toEqual([]);
    for (const [k, i] of Object.entries(c!.items)) if (i.source === "computed") expect(i.tool, `${id} ${k}`).toBeTruthy();
  }
});

test("every computed value has an independence class, and every independent value names its check", () => {
  for (const id of paperIds()) {
    for (const [k, i] of Object.entries(loadCase(id)!.items)) {
      if (i.source !== "computed") continue;
      expect(i.independence, `${id} ${k}`).toBeDefined();
      if (i.independence === "independent") expect(i.check, `${id} ${k}`).toBeTruthy();
    }
  }
});

test("sourceText names the tool of a computed value and never calls it published", () => {
  const c = loadCase("student1908-sleep")!;
  expect(sourceText(c, "mean_difference")).toBe("published in the paper");
  expect(sourceText(c, "paired_p")).toMatch(/^computed by the benchmark authors with SciPy/);
  expect(sourceText(c, "no_such_item")).toBe("not recorded");
});

test("the sanitizer removes local paths, keys, addresses and host names", () => {
  const san = makeSanitizer({ dir: "/Volumes/T7/guided-analysis/tools/bench-runs/d/claude/p/run1/home/sessions/s1" });
  const text = [
    "/Volumes/T7/guided-analysis/data/p/a.csv",
    "/Volumes/T7/guided-analysis/tools/bench-runs/d/claude/p/run1/home/sessions/s1/work/x.csv",
    "/Volumes/T5/guided-analysis/data/p/a.csv",
    "/Users/someone/Code/guided-analysis/catalog/biostats",
    "/Users/someone/notes.txt",
    "key sk-ant-api03-abcdefghijklmnop",
    "mail someone@example.org",
    "http://localhost:11434",
    "biostats@0.1.0",
  ].join("\n");
  const out = san(text);
  expect(out).toContain("{data}/p/a.csv");
  expect(out).toContain("{work}/x.csv");
  expect(out).toContain("{other volume}/data/p/a.csv");
  expect(out).toContain("{repo}/catalog/biostats");
  expect(out).toContain("{home}/notes.txt");
  expect(out).toContain("biostats@0.1.0");
  for (const bad of ["/Users/", "/Volumes/", "sk-ant", "@example.org", "localhost"]) expect(out).not.toContain(bad);
});

test("listedHashes reads checksum lines from fetch scripts and SHA256SUMS files", () => {
  const a = "a".repeat(64);
  const b = "b".repeat(64);
  const m = listedHashes([`echo "${a}  sleep.csv" | shasum -a 256 -c -`, `${b}  sub/dir/x.fif\n`]);
  expect(m.get("sleep.csv")).toBe(a);
  expect(m.get("x.fif")).toBe(b);
});

let root: string;
let oldData: string | undefined;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "cuvette-cases-test-"));
  oldData = process.env.CUVETTE_BENCH_DATA;
  const data = join(root, "data");
  process.env.CUVETTE_BENCH_DATA = data;
  mkdirSync(join(data, "toy"), { recursive: true });
  const csv = "id,group,extra\n1,1,0.5\n";
  writeFileSync(join(data, "toy", "toy.csv"), csv);
  const sha = createHash("sha256").update(csv).digest("hex");
  const paper = join(root, "papers", "toy");
  mkdirSync(paper, { recursive: true });
  writeFileSync(join(paper, "paper.md"), "# Toy 2020: a toy paper\n");
  writeFileSync(join(paper, "fetch.sh"), `D="\${CUVETTE_DATA:-x}/toy"\necho "${sha}  toy.csv" | shasum -a 256 -c -\n`);
  writeFileSync(
    join(paper, "bench.yaml"),
    `adapters: [biostats]\nprompt: "Compare the two groups in {data}/toy/toy.csv please."\nanswers:\n  paired: true\ndata: [toy/toy.csv]\nitems:\n  - {key: diff, description: "Mean difference", value: 1.5, tolerance: 0.01}\n  - {key: wrong_p, description: "Unpaired p", value: 0.4, tolerance: 0.01, in_answer: false, trap: true}\n`,
  );
  writeFileSync(
    join(paper, "case.yaml"),
    `kind: research paper\nshort: Toy 2020\nfield: Statistics\nprogram: SciPy\ncitation: {authors: Doe J, title: A toy, venue: "J Toy 1:1-2", year: 2020, doi: 10.1000/toy}\nmeasured: Two groups.\ninstruction: Compare the groups.\nanswers:\n  paired: {decision: Paired test, value: true, source: Methods section.}\nitems:\n  diff: {source: published, where: Table 1.}\n  wrong_p: {source: computed, tool: SciPy 1.x, where: Not in the paper.}\ndata: {source: Toy data, license: CC0, size: 20 bytes}\n`,
  );
  const sess = join(root, "runs", "claude", "toy", "run1", "home", "sessions", "s1");
  mkdirSync(sess, { recursive: true });
  const file = join(data, "toy", "toy.csv");
  let id = 0;
  const e = (kind: string, d: Record<string, unknown>, extra: Record<string, unknown> = {}) => JSON.stringify({ id: ++id, ts: "2026-10-08T10:00:00.000Z", session: "s1", kind, ...extra, data: d });
  const node = { entry: 9, adapter: "biostats", adapterVersion: "0.1.0", programVersion: "1.0", tool: "compare_two_groups", args: { path: file, paired: true }, decisions: { paired: true }, codeHash: "c".repeat(64), inputHashes: [sha], outputs: [{ path: join(sess, "work", "out.csv"), kind: "table", name: "out.csv", sha: "d".repeat(64) }], result: { ok: true, summary: "diff 1.5", metrics: { mean_diff: 1.5 } }, parents: [], summary: "diff 1.5", model: "m", manualRoute: `ga_biostats.compare_two_groups(path="${file}")`, fidelity: "exact", sensitivityOf: "", id: "n1", ts: "t" };
  const lines = [
    e("session", { adapters: [{ name: "biostats", version: "0.1.0", programVersion: "1.0", path: "/Users/someone/Code/guided-analysis/catalog/biostats" }], model: "claude-opus-5-5", provider: "claude", cwd: "/Users/someone/Code/guided-analysis" }),
    e("setup", { values: {} }),
    e("user", { text: `Compare the two groups in ${file} please.` }),
    e("message", { message: { role: "assistant", parts: [{ type: "text", text: "I will run the test." }] } }),
    e("tool_call", { callId: "c1", tool: "compare_two_groups", adapter: "biostats", args: { path: file, paired: false } }),
    e("question", { decisionKey: "paired", title: "Paired test", text: "Pair or not.", options: [], qid: "q1" }),
    e("blocked", { callId: "c1", tool: "compare_two_groups", reason: "waiting for the scientist: paired", qid: "q1" }),
    e("answer", { qid: "q1", value: true, note: "answered from the answers file", by: "human" }),
    e("tool_result", { callId: "c1", tool: "compare_two_groups", ok: true, summary: "diff 1.5", text: '{"ok":true}' }, { node: "n1" }),
    e("node", node, { node: "n1" }),
    e("deviation", { callId: "c1", tool: "compare_two_groups", deviations: [{ arg: "paired", key: "paired", setup: true, requested: false, used: true, overwritten: true }] }),
    e("message", { message: { role: "assistant", parts: [{ type: "text", text: "The difference is 1.5." }] } }),
    e("claim_check", { claims: [{ text: "The difference is 1.5.", value: 1.5, label: "measured", node: "n1" }], unsourced: 0 }),
    e("finding", { check: "referee", severity: "info", message: `Looked at ${file}.`, source: "referee", status: "open", fid: "f1" }),
    e("usage", { inputTokens: 10, outputTokens: 5, cacheRead: 0, cacheWrite: 0, model: "claude-opus-5-5" }),
    e("assistant", { text: "The difference is 1.5.\n\nSettings used, from the decision record: Paired test: true.", final: true }),
  ];
  writeFileSync(join(sess, "log.jsonl"), lines.join("\n") + "\n");
  const item = { key: "diff", description: "Mean difference", expected: 1.5, tolerance: 0.01, abs: false, inAnswer: true, reference: false, computed: { pass: true, via: "main", value: 1.5, diff: 0, node: "n1", path: "metrics.mean_diff", entry: 9 }, reported: { pass: true, value: 1.5, diff: 0, via: "tolerance", node: "n1", claimEntry: 13, text: "The difference is 1.5." } };
  const run = { paper: "toy", model: "claude", run: 1, status: "answer", durationS: 12, session: "s1", dir: sess, answer: "The difference is 1.5.", items: [item], metrics: { requests: 1, inputTokens: 10, outputTokens: 5, cacheRead: 0, cacheWrite: 0, toolCalls: 1, failedToolCalls: 0 } };
  writeFileSync(join(root, "r.json"), JSON.stringify({ date: "2026-10-08", models: ["claude"], runsPerCell: 1, problems: [], runs: [run] }));
});

afterAll(() => {
  if (oldData === undefined) delete process.env.CUVETTE_BENCH_DATA;
  else process.env.CUVETTE_BENCH_DATA = oldData;
});

test("buildCases writes an index, a case page and a sanitized session record", () => {
  const info = buildCases({ results: [join(root, "r.json")], out: join(root, "out"), papersDir: join(root, "papers"), figures: false });
  expect(info.problems).toEqual([]);
  expect(info.pages).toEqual(["toy.html"]);
  const index = readFileSync(info.index, "utf8");
  expect(index).toContain('href="toy.html"');
  expect(index).toContain("1 research paper and 0 tool tutorials or test suites");
  const page = readFileSync(join(root, "out", "papers", "toy.html"), "utf8");
  for (const id of ["paper", "instruction", "session", "answer", "results", "checks", "repeat", "figure", "facts"]) expect(page).toContain(`id="${id}"`);
  expect(page).toContain("doi.org/10.1000/toy");
  expect(page).toContain("gave the scientist's answers automatically");
  expect(page).toContain("The harness held <code>compare_two_groups</code> until the scientist chose: Paired test");
  expect(page).toContain("The agent asked for paired = false. The scientist chose true for Paired test. The harness kept true.");
  expect(page).toContain("Source in the paper: Methods section.");
  expect(page).toContain("published in the paper");
  expect(page).toContain("The run did not change the data.");
  expect(page).toContain("{data}/toy/toy.csv");
  expect(page).toContain("trap");
  expect(page).not.toContain(root);
  expect(page).not.toContain("/Users/");
  expect(page.indexOf('id="e5"')).toBeLessThan(page.indexOf('id="e7"'));
  expect(page.indexOf('id="e7"')).toBeLessThan(page.indexOf('id="e6"'));
  const rec = join(root, "out", "papers", "records", "toy-Claude.jsonl.gz");
  expect(existsSync(rec)).toBe(true);
  const log = gunzipSync(readFileSync(rec)).toString("utf8");
  expect(log.trim().split("\n")).toHaveLength(16);
  expect(log).not.toContain(root);
  expect(log).not.toContain("/Users/");
  expect(log).toContain("{data}/toy/toy.csv");
  expect(existsSync(join(root, "out", "papers", "case.css"))).toBe(true);
});
