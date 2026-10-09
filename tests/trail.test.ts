import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, test } from "vitest";
import { loadAdapter, type LoadedAdapter } from "../src/adapters/manifest.ts";
import { AnalysisRecord } from "../src/core/record.ts";
import { exportHtml, exportJsonl, exportMarkdown, exportPdf, groupTrail, parseRoute, renderMarkdown, shortReason, trail } from "../src/core/trail.ts";
import type { NodeIn } from "../src/core/types.ts";

const YAML = `
adapter: { name: fake, title: Fake }
program: { name: FakeJ, version: "1.0" }
connection: { kind: cli }
decisions:
  - { key: sigma, label: Blur radius, kind: float, default: 1 }
map:
  - tool: open
    route: "File > Open..."
  - tool: blur
    route: "Process > Filters > Gaussian Blur..."
    steps: ["Type {sigma} in the Sigma box", "Click OK"]
    params: [{ arg: sigma, label: "Sigma (Radius)", ui_default: 1 }]
  - { tool: fit, route: "", fidelity: code_only }
`;

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let dir: string;
let adapter: LoadedAdapter;
let rec: AnalysisRecord;

function nodeIn(over: Partial<NodeIn>): NodeIn {
  return {
    entry: 0, adapter: "fake", adapterVersion: "0.1.0", programVersion: "1.0", tool: "open", args: {}, decisions: {},
    codeHash: "c", inputHashes: ["h1"], outputs: [], result: {}, parents: [], summary: "", model: "m1",
    manualRoute: "", fidelity: "exact", ...over,
  };
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "ga-trail-"));
  mkdirSync(join(dir, "ad"));
  writeFileSync(join(dir, "ad", "adapter.yaml"), YAML);
  adapter = loadAdapter(join(dir, "ad"));
  rec = new AnalysisRecord(join(dir, "s"), "20260101-000000-abcd");
  rec.append("session", { adapters: [{ name: "fake", version: "0.1.0", programVersion: "1.0" }], model: "fake-model" });
  rec.append("setup", { values: { sigma: 2, question: "Is it blurred?" }, how: "form", defaultsAccepted: [] });
  const sha = rec.putBlob(PNG, ".png");
  const n1 = rec.addNode(nodeIn({ tool: "open", args: { path: "/d/a.tif" }, outputs: [{ path: "/w/a.tif", kind: "image", sha }], summary: "Opened a.tif" }));
  rec.append("tool_result", { tool: "open", adapter: "fake", ok: true, summary: "Opened a.tif", images: [sha], durationS: 0.5, effectiveArgs: { path: "/d/a.tif" } }, { node: n1.id });
  const n2 = rec.addNode(nodeIn({
    tool: "blur", args: { path: "/w/a.tif", sigma: 2 }, decisions: { sigma: 2 }, parents: [n1.id],
    result: { metrics: { mean: 12.5 }, table: { columns: ["a", "b"], rows: [[1, 2]], n_rows: 5 } },
  }));
  rec.append("tool_result", { tool: "blur", adapter: "fake", ok: true, effectiveArgs: { path: "/w/a.tif", sigma: 2 } }, { node: n2.id });
  rec.append("tool_result", { tool: "open", adapter: "fake", ok: false, error: "file missing" });
  const n3 = rec.addNode(nodeIn({ tool: "fit", fidelity: "code_only", summary: "Fitted the curve" }));
  rec.append("tool_result", { tool: "fit", adapter: "fake", ok: true, summary: "Fitted the curve" }, { node: n3.id });
  rec.append("decision", { key: "sigma", old: 2, new: 3, by: "human" });
  rec.markStale("sigma", "sigma changed");
  rec.append("question", { qid: "q1", title: "Which cutoff?", text: "Pick one" });
  rec.append("answer", { qid: "q1", value: 0.5, by: "human" });
  rec.append("deviation", { tool: "blur", deviations: [{ arg: "sigma", setup: 2, used: 4 }] });
  rec.append("finding", { fid: "f1", severity: "warning", message: "Small sample", check: "n" });
  rec.append("message", { message: { role: "user", parts: [] } });
  rec.append("usage", { inputTokens: 1 });
  rec.append("assistant", { text: "**All done.** See `a.csv`.", final: true });
});

test("level 1 gives one numbered line per visible entry with icons", () => {
  const t = trail(rec, 1, [adapter]);
  expect(t.map((x) => x.n)).toEqual(t.map((_, i) => i + 1));
  expect(t.map((x) => x.icon)).toEqual(["setup", "step", "step", "step", "step", "decision", "question", "question", "deviation", "finding", "note"]);
  expect(t[0].line).toMatch(/^Setup: 2 settings/);
  expect(t[1].line).toBe("Opened a.tif");
  expect(t[2].line).toBe("Ran blur");
  expect(t[2].stale).toBe(true);
  expect(t[2].badges).toEqual(["out of date"]);
  expect(t[3].line).toBe("Failed: file missing");
  expect(t[3].failed).toBe(true);
  expect(t[4].line).toBe("Fitted the curve");
  expect(t[4].badges).toEqual(["no manual route"]);
  expect(t.at(-1)!.line).toBe("All done. See a.csv.");
  expect(t[1].details).toBeUndefined();
});

test("level 2 adds the manual route, settings, decisions, outputs, table and images", () => {
  const t = trail(rec, 2, [adapter]);
  const open = t[1].details!;
  expect(open.manualRoute).toBe("File > Open...");
  expect(open.outputs).toEqual([expect.objectContaining({ name: "a.tif", kind: "image" })]);
  expect((open.images as string[]).length).toBe(1);
  const blur = t[2].details!;
  expect(blur.manualRoute).toContain("Process > Filters > Gaussian Blur...");
  expect(blur.manualRoute).toContain("1. Type 2 in the Sigma box");
  expect(blur.manualRoute).toContain("Sigma (Radius) = 2");
  expect(blur.manualRoute).toContain("Warning: If you keep the default 1, you get a different result.");
  expect(blur.settings).toEqual({ path: "/w/a.tif", sigma: 2 });
  expect(blur.decisions).toEqual({ sigma: 2 });
  expect((blur.table as { n_rows: number }).n_rows).toBe(5);
  expect(t[2].technical).toBeUndefined();
});

test("level 3 adds the technical record", () => {
  const t = trail(rec, 3, [adapter]);
  expect(t[1].technical).toMatchObject({ tool: "open", adapter: "fake", inputHashes: ["h1"], programVersion: "1.0", durationS: 0.5, model: "m1" });
  expect(t[1].technical?.entry).toBe(t[1].entry);
});

test("exportHtml writes one self-contained file with details and inlined images", () => {
  const out = join(dir, "t.html");
  exportHtml(rec, [adapter], out);
  const html = readFileSync(out, "utf8");
  expect(html).toContain("20260101-000000-abcd");
  expect(html).toContain("fake-model");
  expect(html).toContain("Blur radius");
  expect(html.match(/<article class=/g)!.length).toBe(10);
  expect(html).toContain('<div class="answer">');
  expect(html).toContain("<strong>All done.</strong>");
  expect(html).toContain("Technical record");
  expect(html).toContain("data:image/png;base64,");
  expect(html).toContain("prefers-color-scheme:dark");
  expect(html).toContain("@media print");
  expect(html).toContain("<svg");
  expect(html).not.toMatch(/<(script|link)\b/);
});

test("exportMarkdown and exportJsonl", () => {
  const md = readFileSync(exportMarkdown(rec, [adapter], join(dir, "t.md")), "utf8");
  expect(md).toContain("1. Setup: 2 settings");
  expect(md).toContain("3. Ran blur [out of date]");
  expect(md).toContain("Warning: If you keep the default 1");
  expect(md).toContain("| a | b |");
  expect(md).toContain("![Result image]");
  const lines = readFileSync(exportJsonl(rec, join(dir, "t.jsonl")), "utf8").trim().split("\n");
  expect(lines).toHaveLength(rec.entries().length);
  expect(JSON.parse(lines[0]).kind).toBe("session");
});

test("exportPdf writes a file or throws a plain error", () => {
  const out = join(dir, "t.pdf");
  try {
    exportPdf(rec, [adapter], out);
    expect(existsSync(out)).toBe(true);
  } catch (e) {
    expect((e as Error).message).toMatch(/PDF/);
  }
}, 90000);

test("the trail groups steps under each request", () => {
  const r = new AnalysisRecord(join(dir, "g"), "20260101-000000-gggg");
  r.append("setup", { values: { question: "Is it blurred?" } });
  r.append("user", { text: "Blur the image" });
  const a = r.addNode(nodeIn({ tool: "blur", summary: "Blurred" }));
  r.append("tool_result", { tool: "blur", adapter: "fake", ok: true, summary: "Blurred" }, { node: a.id });
  r.append("assistant", { text: "Done.\n\n- one\n- two", final: true });
  r.append("user", { text: "Now fit it" });
  r.append("tool_result", { tool: "fit", adapter: "fake", ok: false, error: "Traceback (most recent call last):\n  File \"x\", line 1\nValueError: bad data" });
  const lines = trail(r, 2);
  expect(lines.map((l) => l.group)).toEqual([0, 1, 1, 1, 2, 2]);
  const groups = groupTrail(lines);
  expect(groups.map((g) => g.request?.line)).toEqual([undefined, "You asked: Blur the image", "You asked: Now fit it"]);
  expect(groups[1].lines.map((l) => l.icon)).toEqual(["step", "note"]);
  expect(groups[1].lines[1].answer).toBe(true);
  expect(groups[2].lines[0].line).toBe("Failed: ValueError: bad data");
  expect(String(groups[2].lines[0].details?.error)).toContain("Traceback");
});

test("comparison runs get a badge and stay out of the step count", () => {
  const r = new AnalysisRecord(join(dir, "c"), "20260101-000000-cccc");
  const base = r.addNode(nodeIn({ tool: "blur", summary: "Blurred" }));
  r.append("tool_result", { tool: "blur", adapter: "fake", ok: true, summary: "Blurred" }, { node: base.id });
  const alt = r.addNode(nodeIn({ tool: "blur", summary: "Blurred alt", sensitivityOf: "sigma" }));
  r.append("tool_result", { tool: "blur", adapter: "fake", ok: true, sensitivityOf: "sigma" }, { node: alt.id });
  const child = r.addNode(nodeIn({ tool: "fit", summary: "Fit alt", parents: [alt.id] }));
  r.append("tool_result", { tool: "fit", adapter: "fake", ok: true, summary: "Fit alt" }, { node: child.id });
  expect(r.comparisons().get(child.id)).toBe("sigma");
  const lines = trail(r, 1);
  expect(lines.map((l) => [l.line, l.badges])).toEqual([["Blurred", []], ["Fit alt", ["comparison run"]]]);
});

test("shortReason, parseRoute and renderMarkdown", () => {
  expect(shortReason("Error executing tool x: Error executing tool x: no file")).toBe("no file");
  expect(shortReason("first\nsecond")).toBe("first");
  const r = parseRoute("Image > Adjust > Threshold...\n  Select Default\n  Click Auto\nMacro Recorder text:\n  setAutoThreshold(\"Default\");");
  expect(r).toMatchObject({ menu: "Image > Adjust > Threshold...", steps: ["Select Default", "Click Auto"], macro: ['setAutoThreshold("Default");'] });
  expect(parseRoute("File > Open...\n1. Type 2 in the box\nWarning: keep it").warnings).toEqual(["Warning: keep it"]);
  const html = renderMarkdown("# Title\n\nText with **bold** and `code` and <b>.\n\n1. a\n2. b\n\n| x | y |\n| - | - |\n| 1 | 2 |\n\n```\nraw <1>\n```");
  expect(html).toContain("<h3>Title</h3>");
  expect(html).toContain("<strong>bold</strong>");
  expect(html).toContain("<code>code</code>");
  expect(html).toContain("&lt;b&gt;");
  expect(html).toContain("<ol><li>a</li><li>b</li></ol>");
  expect(html).toContain("<th>x</th>");
  expect(html).toContain("<pre>raw &lt;1&gt;</pre>");
});

test("the trail leaves out housekeeping calls and numbers only the analysis steps", () => {
  const r = new AnalysisRecord(join(dir, "hk"), "20260101-000000-hk00");
  r.append("user", { text: "go" });
  r.append("tool_result", { tool: "run_command", ok: true, summary: "Ran ls" });
  r.append("tool_result", { tool: "open", adapter: "fake", ok: false, error: "no file" });
  const a = r.addNode(nodeIn({ tool: "open", summary: "Opened a.tif" }));
  r.append("tool_result", { tool: "open", adapter: "fake", ok: true, summary: "Opened a.tif" }, { node: a.id });
  r.append("tool_result", { tool: "read_file", ok: false, error: "missing" });
  const t = trail(r, 1, [adapter]);
  expect(t.map((x) => [x.line, x.step])).toEqual([["You asked: go", undefined], ["Opened a.tif", 1], ["Failed: missing", undefined]]);
});
