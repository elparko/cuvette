import { existsSync, mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { loadAdapter } from "../src/adapters/manifest.ts";
import { COPY_LIMIT_BYTES } from "../src/core/places.ts";
import { AnalysisRecord } from "../src/core/record.ts";
import { buildWorkbook, copyFigures, decodeText, typed, outputRules, parseCsv, readTable, savedLine, sheetName, writeResults, xlsx, type Sheet } from "../src/core/results.ts";
import type { NodeIn } from "../src/core/types.ts";
import { runScriptTool, scriptPython } from "../src/tools/run_script.ts";
import { unzip } from "./fixtures/unzip.ts";

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082", "hex");

function readBook(buf: Buffer): { name: string; rows: { ref: string; t?: string; v: string }[][] }[] {
  const files = unzip(buf);
  const names = [...files.get("xl/workbook.xml")!.toString().matchAll(/<sheet name="([^"]*)"/g)].map((m) => m[1]!);
  return names.map((name, i) => {
    const xml = files.get(`xl/worksheets/sheet${i + 1}.xml`)!.toString();
    const rows = [...xml.matchAll(/<row [^>]*>(.*?)<\/row>/g)].map((r) =>
      [...r[1]!.matchAll(/<c r="([A-Z]+\d+)"(?: s="\d+")?(?: t="(\w+)")?>(?:<v>([^<]*)<\/v>|<is><t[^>]*>([^<]*)<\/t><\/is>)<\/c>/g)].map((c) => ({ ref: c[1]!, t: c[2], v: c[3] ?? c[4] ?? "" })),
    );
    return { name, rows };
  });
}

function node(over: Partial<NodeIn>): NodeIn {
  return {
    entry: 1, adapter: "", adapterVersion: "", programVersion: "", tool: "run_script", args: {}, decisions: {}, codeHash: "", inputHashes: [],
    outputs: [], result: {}, parents: [], summary: "", model: "fake", manualRoute: "", fidelity: "code_only", ...over,
  };
}

test("the workbook keeps numbers as numbers and strings as inline strings", () => {
  const sheets: Sheet[] = [{ name: "Data", columns: ["id", "x", "ok"], rows: [["a", 1.5, true], ["b", -2e-7, false], ["c", null, null]] }];
  const [s] = readBook(xlsx(sheets));
  expect(s!.name).toBe("Data");
  expect(s!.rows[0]!.map((c) => c.v)).toEqual(["id", "x", "ok"]);
  expect(s!.rows[1]).toEqual([{ ref: "A2", t: "inlineStr", v: "a" }, { ref: "B2", t: undefined, v: "1.5" }, { ref: "C2", t: "b", v: "1" }]);
  expect(s!.rows[2]![1]).toEqual({ ref: "B3", t: undefined, v: "-2e-7" });
  expect(s!.rows[3]).toEqual([{ ref: "A4", t: "inlineStr", v: "c" }]);
});

test("sheet names keep the Excel limits: 31 characters, no special characters, unique", () => {
  const used = new Set(["summary"]);
  expect(sheetName("Summary", used)).toBe("Summary (2)");
  const long = sheetName("Step 12 histogram of red channel intensity per cell", used);
  expect(long.length).toBeLessThanOrEqual(31);
  expect(sheetName("Step 12 histogram of red channel intensity per cell", used)).toMatch(/ \(2\)$/);
  expect(sheetName("a/b:c*d?[e]\\f", used)).toBe("a b c d e f");
  expect(sheetName("A B C D E F", used)).toBe("A B C D E F (2)");
  for (const n of used) expect(n.length).toBeLessThanOrEqual(31);
});

test("CSV columns keep their types: numbers, missing values and text IDs", () => {
  expect(parseCsv('a,b\n1,"x, ""y"""\r\n2,z')).toEqual([["a", "b"], ["1", 'x, "y"'], ["2", "z"]]);
  const dir = mkdtempSync(join(tmpdir(), "cuvette-res-"));
  writeFileSync(join(dir, "t.csv"), "id,value,flag,note\nA01,1.25,True,x\nA02,NA,False,\nA03,3e2,True,7\n");
  const t = readTable(join(dir, "t.csv"))!;
  expect(t.columns).toEqual(["id", "value", "flag", "note"]);
  expect(t.rows).toEqual([["A01", 1.25, true, "x"], ["A02", null, false, ""], ["A03", 300, true, "7"]]);
});

function sampleRecord() {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-res-"));
  const record = new AnalysisRecord(join(dir, "session"), "s1");
  const out = record.workDir;
  const data = join(dir, "data.csv");
  writeFileSync(data, "group,extra\n1,0.7\n2,1.9\n");
  writeFileSync(join(out, "means.csv"), "group,mean,n\n1,0.75,10\n2,2.33,10\n");
  writeFileSync(join(out, "histogram_red intensity.png"), PNG);
  writeFileSync(join(out, "histogram_red intensity.svg"), "<svg/>");
  mkdirSync(join(out, "figures"), { recursive: true });
  writeFileSync(join(out, "figures", "box.png"), PNG);
  record.append("user", { text: "Does the drug change sleep?" });
  const r1 = record.append("tool_result", { tool: "describe" });
  record.addNode(node({
    entry: r1.id, adapter: "biostats", adapterVersion: "0.1.1", programVersion: "0.30.0", tool: "describe", args: { path: data, purpose: "Summary statistics" },
    inputHashes: ["abc123"], result: { metrics: { n: 20 }, table: { columns: ["group", "mean"], rows: [[1, 0.7], [2, 1.9]], n_rows: 2 } }, summary: "Means by group.", manualRoute: "Analysis > Describe",
  }));
  const r2 = record.append("tool_result", { tool: "run_script" });
  record.addNode(node({
    entry: r2.id, args: { purpose: "Plot", does: "Draws a histogram and a box plot." },
    outputs: [
      { path: join(out, "means.csv"), kind: "table" },
      { path: join(out, "histogram_red intensity.png"), kind: "image", sha: record.putBlob(join(out, "histogram_red intensity.png")) },
      { path: join(out, "figures", "box.png"), kind: "image" },
    ],
    result: { metrics: { mean_group2: 2.33 } },
    summary: "The script ran.",
  }));
  const tail = "Step results that the answer does not mention, from the record:\n- n9 run_script: wrote 777 files.";
  record.append("assistant", { text: `The mean extra sleep was 2.33 hours in group 2 (step 2).\n\n${tail}`, final: true, results: tail });
  return { record, out, data };
}

test("figures are copied to figures/ with the step number and a readable name, with the vector copy", () => {
  const { record, out } = sampleRecord();
  const figs = copyFigures(record, out);
  const names = figs.map((f) => f.path.slice(out.length + 1)).sort();
  expect(names).toEqual(["figures/box.png", "figures/step02-histogram-red-intensity.png", "figures/step02-histogram-red-intensity.svg"]);
  expect(readFileSync(join(out, "figures", "step02-histogram-red-intensity.png"))).toEqual(PNG);
  expect(copyFigures(record, out).map((f) => f.path).sort()).toEqual(figs.map((f) => f.path).sort());
});

test("a figure that changed after the run is copied from the recorded blob, with a note", () => {
  const { record, out } = sampleRecord();
  const live = join(out, "histogram_red intensity.png");
  const other = Buffer.concat([PNG, Buffer.from([1, 2, 3])]);
  writeFileSync(live, other);
  const figs = copyFigures(record, out);
  const fig = figs.find((f) => f.path.endsWith("step02-histogram-red-intensity.png"))!;
  expect(readFileSync(fig.path)).toEqual(PNG);
  expect(fig.note).toMatch(/changed after the run/);
  expect(figs.find((f) => f.path.endsWith("box.png"))!.note).toBeUndefined();
  const sheets = buildWorkbook({ record, adapters: [], fields: [] as never, programs: [], dir: out, figures: figs });
  expect(sheets[0]!.rows.some((r) => r[0] === "Note" && /changed after the run/.test(String(r[2])))).toBe(true);
});

test("a large figure that changed after the run gives a Note row", () => {
  const record = new AnalysisRecord(join(mkdtempSync(join(tmpdir(), "cuvette-res-")), "session"), "s4");
  const path = join(mkdtempSync(join(tmpdir(), "cuvette-res-big-")), "big.png");
  writeFileSync(path, Buffer.alloc(COPY_LIMIT_BYTES + 1, 7));
  const sha = record.putBlob(path);
  const r1 = record.append("tool_result", { tool: "run_script" });
  record.addNode(node({ entry: r1.id, outputs: [{ path, kind: "image", sha }], result: { metrics: {} }, summary: "Plot." }));
  const bytes = readFileSync(path);
  bytes[5] = 9;
  writeFileSync(path, bytes);
  utimesSync(path, new Date(), new Date(Date.now() + 5000));
  const out = record.workDir;
  const figures = copyFigures(record, out);
  expect(figures).toEqual([]);
  const sheets = buildWorkbook({ record, adapters: [], fields: [] as never, programs: [], dir: out, figures });
  expect(sheets[0]!.rows.some((r) => r[0] === "Note" && /big\.png \(step 1\)/.test(String(r[1])) && /changed after the run/.test(String(r[2])))).toBe(true);
});

test("a large table that changed after the run says that no copy exists", () => {
  const record = new AnalysisRecord(join(mkdtempSync(join(tmpdir(), "cuvette-res-")), "session"), "s5");
  const path = join(mkdtempSync(join(tmpdir(), "cuvette-res-big-")), "big.csv");
  writeFileSync(path, "a,b\n" + "1,2\n".repeat(COPY_LIMIT_BYTES / 4 + 10));
  const sha = record.putBlob(path);
  const r1 = record.append("tool_result", { tool: "run_script" });
  record.addNode(node({ entry: r1.id, outputs: [{ path, kind: "table", sha }], result: { metrics: {} }, summary: "Big table." }));
  const bytes = readFileSync(path);
  bytes[6] = 57;
  writeFileSync(path, bytes);
  utimesSync(path, new Date(), new Date(Date.now() + 5000));
  const sheets = buildWorkbook({ record, adapters: [], fields: [] as never, programs: [], dir: record.workDir, figures: [] });
  const note = sheets[0]!.rows.find((r) => r[0] === "Note" && /big\.csv/.test(String(r[1])))!;
  expect(String(note[3])).toMatch(/record kept no copy/);
  expect(String(note[3])).not.toMatch(/uses the copy/);
});

test("a table that changed after the run is read from the recorded blob, with a note", () => {
  const record = new AnalysisRecord(join(mkdtempSync(join(tmpdir(), "cuvette-res-")), "session"), "s3");
  const out = record.workDir;
  const path = join(out, "means.csv");
  writeFileSync(path, "group,mean\n1,0.7\n2,1.9\n");
  const sha = record.putBlob(path);
  const r1 = record.append("tool_result", { tool: "run_script" });
  record.addNode(node({ entry: r1.id, outputs: [{ path, kind: "table", sha }], result: { metrics: {} }, summary: "Means." }));
  writeFileSync(path, "group,mean\n1,9.9\n2,9.9\n");
  const sheets = buildWorkbook({ record, adapters: [], fields: [] as never, programs: [], dir: out, figures: [] });
  const table = sheets.find((x) => x.name.startsWith("Step 1"))!;
  expect(table.rows).toEqual([[1, 0.7], [2, 1.9]]);
  expect(sheets[0]!.rows.some((r) => r[0] === "Note" && /changed after the run/.test(String(r[2])))).toBe(true);
});

test("the Steps sheet shows no curly-brace text when a summary names a value that the result lacks", () => {
  const record = new AnalysisRecord(join(mkdtempSync(join(tmpdir(), "cuvette-res-")), "session"), "s2");
  const out = record.workDir;
  const r1 = record.append("tool_result", { tool: "describe" });
  record.addNode(node({ entry: r1.id, adapter: "biostats", tool: "describe", args: { path: "a.csv" }, result: { metrics: { n: 20 } }, summary: "Means by group." }));
  const home = mkdtempSync(join(tmpdir(), "cuvette-res-ad-"));
  writeFileSync(join(home, "adapter.yaml"), `adapter: { name: biostats, title: Biostats }\nprogram: { name: Biostats, version: "1.0" }\nconnection: { kind: cli }\nmap:\n  - { tool: describe, route: "", summary: "{path} has {metrics.missing} rows" }\n`);
  const stub = loadAdapter(home);
  const sheets = buildWorkbook({ record, adapters: [stub], fields: [] as never, programs: [], dir: out, figures: copyFigures(record, out) });
  const steps = sheets.find((x) => x.name === "Steps")!;
  const text = steps.rows.map((r) => String(r[steps.columns.indexOf("Description")])).join("\n");
  expect(text).toBe("Means by group.");
});

test("the workbook has Summary, one sheet for each step table, Steps, Metrics and Files", () => {
  const { record, out, data } = sampleRecord();
  const fields = [
    { key: "question", label: "Question", value: "Does the drug change sleep?", set: true, owner: "human" },
    { key: "alpha", label: "Significance level", value: 0.05, set: true, owner: "human" },
  ] as never;
  record.append("setup", { values: { alpha: 0.05 }, owners: {}, profile: null, defaultsAccepted: ["alpha"] });
  const sheets = buildWorkbook({ record, adapters: [], fields, programs: [{ name: "Biostatistics", version: "0.1.1", programVersion: "0.30.0" }], dir: out, figures: copyFigures(record, out) });
  expect(sheets.map((s) => s.name)).toEqual(["Summary", "Step 1 Summary statistics", "Step 2 means", "Steps", "Metrics", "Files", "References"]);
  const summary = sheets[0]!.rows;
  expect(summary[0]).toEqual(["Question", "Question", "Does the drug change sleep?", ""]);
  expect(summary).toContainEqual(["Program", "Biostatistics", "0.30.0", "adapter 0.1.1"]);
  expect(summary).toContainEqual(["Decision", "Significance level", 0.05, "default, accepted at setup"]);
  expect(summary.filter((r) => r[0] === "Answer number")).toEqual([["Answer number", expect.stringContaining("2.33"), 2.33, "step 2 (measured)"]]);
  expect(sheets[2]!.columns).toEqual(["group", "mean", "n"]);
  expect(sheets[2]!.rows).toEqual([[1, 0.75, 10], [2, 2.33, 10]]);
  const steps = sheets[3]!;
  expect(steps.rows[0]!.slice(0, 3)).toEqual([1, "describe", "biostats"]);
  expect(steps.rows[0]![steps.columns.indexOf("Inputs")]).toBe(data);
  expect(steps.rows[0]![steps.columns.indexOf("Input SHA-256")]).toBe("abc123");
  expect(steps.rows[1]![steps.columns.indexOf("Description")]).toBe("Draws a histogram and a box plot.");
  expect(sheets[4]!.rows).toEqual([[1, "n", 20], [2, "mean_group2", 2.33]]);
  const files = sheets[5]!.rows.map((r) => `${r[0]} ${r[1]} ${r[2]}`);
  expect(files).toContain("2 figure figures/step02-histogram-red-intensity.png");
  expect(files).toContain("2 figure figures/box.png");
  expect(files).toContain("2 table means.csv");
});

test("the Summary sheet marks the assumptions as text of the harness and a default decision as set by the harness", () => {
  const { record, out } = sampleRecord();
  record.append("assistant", { text: "The mean is 2.33.", final: true, assumed: "Assumed because no answer was given:\n- Which sigma?: used sigma 2." });
  record.append("decision", { key: "alpha", old: null, new: 0.05, by: "default", reason: "answer to q1" });
  const fields = [{ key: "alpha", label: "Significance level", value: 0.05, set: true, owner: "human" }] as never;
  const summary = buildWorkbook({ record, adapters: [], fields, programs: [], dir: out, figures: [] })[0]!.rows;
  expect(summary).toContainEqual(["Assumption", "Which sigma?: used sigma 2.", "", "text of the harness, not of the model"]);
  expect(summary).toContainEqual(["Decision", "Significance level", 0.05, "default, set by the harness (answer to q1)"]);
});

test("writeResults writes results.xlsx and the line names the sheets, the figures and the folder", () => {
  const { record, out } = sampleRecord();
  const saved = writeResults({ record, adapters: [], fields: [], programs: [], dir: out, xlsx: true });
  expect(existsSync(join(out, "results.xlsx"))).toBe(true);
  const book = readBook(readFileSync(join(out, "results.xlsx")));
  expect(book.map((s) => s.name)).toEqual(["Summary", "Step 1 Summary statistics", "Step 2 means", "Steps", "Metrics", "Files", "References"]);
  expect(book[2]!.rows[1]!.map((c) => c.t)).toEqual([undefined, undefined, undefined]);
  expect(saved).toMatchObject({ sheets: 7, figures: 2 });
  expect(savedLine(saved, "")).toBe(`Saved: results.xlsx (7 sheets), 2 figures in figures/. Folder: ${out}`);
  expect(savedLine({ dir: "/home/me/p", sheets: 0, figures: 1 }, "/home/me")).toBe("Saved: 1 figure in figures/. Folder: ~/p");
  const off = writeResults({ record, adapters: [], fields: [], programs: [], dir: join(out, "other"), xlsx: false });
  expect(off.xlsx).toBeUndefined();
  expect(existsSync(join(out, "other", "results.xlsx"))).toBe(false);
});

test("the rules name the figures folder, the formats and the CSV tables", () => {
  const on = outputRules({ output: "/o", figureFormats: "png,svg", xlsx: true });
  expect(on).toContain("/o/figures as PNG (300 dpi) and SVG, with axis labels and units");
  expect(on).toContain("CSV file in /o");
  expect(on).toContain("results.xlsx");
  expect(outputRules({ output: "/o", figureFormats: "png", xlsx: false })).not.toMatch(/SVG|xlsx/);
  expect(outputRules({ output: "/o", figureFormats: "png,pdf", xlsx: true })).toContain("and PDF");
});

function pngDpi(buf: Buffer): number {
  const i = buf.indexOf("pHYs");
  return i < 0 ? 0 : Math.round(buf.readUInt32BE(i + 4) * 0.0254);
}

test.skipIf(!scriptPython().includes("science"))("a matplotlib figure from run_script gets a 300 dpi PNG and an SVG copy", async () => {
  const root = mkdtempSync(join(tmpdir(), "cuvette-res-mpl-"));
  const dirs = { workDir: join(root, "work"), sessionDir: root, outputDir: join(root, "work"), figureFormats: "png,svg" };
  mkdirSync(dirs.workDir, { recursive: true });
  const tool = runScriptTool(dirs, { network: false });
  expect(tool.description).toContain("as PNG (300 dpi) and SVG");
  const code = [
    "import matplotlib.pyplot as plt",
    "from ga_api import save_figure",
    "fig, ax = plt.subplots(figsize=(3, 2))",
    "ax.plot([1, 2, 3]); ax.set_xlabel('time (s)'); ax.set_ylabel('signal (mV)')",
    "fig.savefig('figures/trace.png', dpi=72)",
    "save_figure('second')",
  ].join("\n");
  const r = await tool.execute({ purpose: "Plot", does: "Draws a line.", code }, { session: "s", callId: "c", workDir: dirs.workDir, sessionDir: root, signal: new AbortController().signal, log: () => ({}) as never, callTool: async () => ({ ok: true }) });
  expect(r.ok, r.error).toBe(true);
  for (const stem of ["trace", "second"]) {
    expect(pngDpi(readFileSync(join(dirs.workDir, "figures", `${stem}.png`)))).toBe(300);
    expect(readFileSync(join(dirs.workDir, "figures", `${stem}.svg`), "utf8")).toContain("<svg");
  }
  expect(r.outputs!.map((o) => o.name).sort()).toEqual(["second.png", "second.svg", "trace.png", "trace.svg"]);
});

test("decodeText reads UTF-16 with no byte order mark in both byte orders", () => {
  const text = "group,value\nµ-control,1.5\n";
  const le = Buffer.from(text, "utf16le");
  expect(decodeText(le)).toEqual({ text, encoding: "utf-16le" });
  expect(decodeText(Buffer.from(le).swap16())).toEqual({ text, encoding: "utf-16be" });
  expect(decodeText(Buffer.from("caf\xe9,1\n", "latin1")).encoding).toBe("windows-1252");
});

test("typed keeps a column of IDs with a leading zero as text", () => {
  expect(typed([["001", "1.5"], ["002", "2"]], 2)).toEqual([["001", 1.5], ["002", 2]]);
});

test("an integer with more than 15 digits stays text, so the workbook keeps each digit", () => {
  expect(typed([["12345678901234567890"], ["98765432109876543210"]], 1)).toEqual([["12345678901234567890"], ["98765432109876543210"]]);
  expect(typed([["0.30000000000000004"], ["123456789012345"]], 1)).toEqual([[0.30000000000000004], [123456789012345]]);
});

test("readTable keeps the cells of a wide row after row 1000", () => {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-wide-"));
  const p = join(dir, "t.csv");
  writeFileSync(p, ["a,b", ...Array.from({ length: 1200 }, (_, i) => (i === 1100 ? "1,2,3" : "1,2"))].join("\n"));
  const t = readTable(p)!;
  expect(t.columns).toEqual(["a", "b", "column 3"]);
  expect(t.rows[1100]).toEqual([1, 2, 3]);
});
