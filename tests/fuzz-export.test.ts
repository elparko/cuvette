import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { transformSync } from "esbuild";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { loadAdapter, type LoadedAdapter } from "../src/adapters/manifest.ts";
import { exportFlow, exportNotebook, exportProtocol, exportScript } from "../src/core/exports.ts";
import { readPlan } from "../src/core/plan.ts";
import { AnalysisRecord } from "../src/core/record.ts";
import { buildWorkbook, xlsx } from "../src/core/results.ts";
import { exportMarkdown, trailHtml } from "../src/core/trail.ts";
import type { NodeIn } from "../src/core/types.ts";
import { buildElnFiles, collect } from "../src/eln/export.ts";
import { crc32, zip } from "../src/eln/zip.ts";
import { Rng, runs } from "./fuzz-rng.ts";

const root = mkdtempSync(join(tmpdir(), "cuvette-fuzz-export-"));
const saved = { home: process.env.HOME, cuvette: process.env.CUVETTE_HOME };
beforeAll(() => {
  process.env.HOME = join(root, "home");
  process.env.CUVETTE_HOME = join(root, "cuvette");
});
afterAll(() => {
  process.env.HOME = saved.home;
  if (saved.cuvette === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = saved.cuvette;
  rmSync(root, { recursive: true, force: true });
});

const HOSTILE = [
  "<script>INJECTED()</script>",
  "<img src=x onerror=INJECTED()>",
  '"><b onclick="INJECTED()">',
  "' onmouseover='INJECTED()",
  "[link](javascript:INJECTED())",
  '[link](https://a.b/"onclick="INJECTED())',
  "`code` **bold** *em*",
  "| a | b |\n| --- | --- |\n| 1 | 2 |",
  "```\n</pre><script>INJECTED()</script>\n```",
  "&amp; &lt; &#0; &",
  "]]> <![CDATA[ x ]]>",
  "<!-- x -->",
  "\u0000\u0001\u0008\u000b\u001f",
  "‮RTL‬ ‏",
  "\ud800 lone",
  "日本語 µg/mL naïve é 🧪👩‍🔬",
  "x".repeat(20000),
  "line1\nline2\r\nline3\rline4",
  " INJECTED() ",
  "*/ INJECTED(); /*",
  "${INJECTED()} {x} $HOME",
  "'; INJECTED(); '",
  "\\",
  "",
];

function text(r: Rng): string {
  if (r.bool(0.3)) return r.pick(HOSTILE);
  return Array.from({ length: r.int(1, 4) }, () => (r.bool(0.5) ? r.pick(HOSTILE) : r.string("abc XYZ019.,-", 1, 12))).join(r.pick([" ", "\n", ""]));
}

function value(r: Rng): unknown {
  const k = r.int(0, 5);
  if (k === 0) return r.logUniform(1e-6, 1e9);
  if (k === 1) return r.int(-5, 5);
  if (k === 2) return r.bool();
  if (k === 3) return [text(r), r.int(0, 9)];
  return text(r);
}

const YAML = `
adapter: { name: fz, title: Fuzz }
program: { name: FuzzJ, version: "1.0" }
connection: { kind: cli }
decisions:
  - { key: sigma, label: "Blur <radius> & \\"size\\"", kind: float, default: 1 }
map:
  - tool: blur
    route: "Process > Filters > Gaussian Blur..."
    steps: ["Type {sigma} in the Sigma box", "Choose {path}", "Click OK"]
    params: [{ arg: sigma, label: "Sigma (Radius)", ui_default: 1 }]
  - { tool: fit, route: "", fidelity: code_only, difference: "Only available in code." }
`;

let adapter: LoadedAdapter;
let count = 0;

function node(r: Rng, rec: AnalysisRecord): NodeIn {
  const ids = rec.nodes().map((n) => n.id);
  const args: Record<string, unknown> = {};
  for (let n = r.int(0, 4); n > 0; n--) args[r.bool(0.7) ? r.pick(["sigma", "path", "does", "purpose"]) : text(r)] = value(r);
  const metrics: Record<string, number> = {};
  for (let n = r.int(0, 3); n > 0; n--) metrics[text(r).slice(0, 40)] = r.logUniform(1e-3, 1e6);
  const cols = Array.from({ length: r.int(1, 4) }, () => text(r));
  return {
    entry: rec.entries().length,
    adapter: r.bool(0.9) ? "fz" : "",
    adapterVersion: "0.1.0",
    programVersion: r.bool() ? "1.0" : text(r),
    tool: r.bool(0.8) ? r.pick(["blur", "fit", "measure", "run_script"]) : r.pick(["a b", "x; INJECTED", "$(INJECTED)", "`INJECTED`", "it's", "{x}", "$HOME", "a\nb", "a\nINJECTED()", "a\u2028INJECTED()"]),
    args,
    decisions: r.bool() ? { sigma: value(r) } : {},
    codeHash: "c",
    inputHashes: [],
    outputs: r.bool(0.3) ? [{ path: `/w/${text(r).slice(0, 30)}.csv`, kind: "table", name: text(r).slice(0, 30) }] : [],
    result: { metrics, table: r.bool(0.3) ? { columns: cols, rows: Array.from({ length: r.int(0, 3) }, () => cols.map(() => value(r))), n_rows: 9 } : undefined },
    parents: ids.length && r.bool() ? [r.pick(ids)] : [],
    summary: r.bool(0.7) ? text(r) : "",
    model: "m",
    manualRoute: r.bool(0.4) ? text(r) : "",
    fidelity: r.pick(["exact", "close", "code_only"]),
  } as NodeIn;
}

function record(r: Rng): AnalysisRecord {
  const dir = join(root, `s${count++}`);
  mkdirSync(dir, { recursive: true });
  const rec = new AnalysisRecord(dir, `2026-${count}`);
  rec.append("session", { adapters: [{ name: "fz", version: "0.1.0", programVersion: "1.0" }], model: text(r) });
  const values: Record<string, unknown> = { sigma: value(r), question: text(r) };
  if (r.bool(0.3)) values.reporting_guideline = r.pick(["arrive", "consort", "strobe", "miqe"]);
  for (let n = r.int(0, 3); n > 0; n--) values[text(r).slice(0, 30)] = value(r);
  rec.append("setup", { values });
  if (r.bool(0.4)) {
    const plan = readPlan({ restatement: text(r), definitions: [{ measure: text(r), definition: text(r) }], exclusions: [{ what: text(r) }], steps: [{ step: text(r), method: text(r), decisions: [{ label: text(r), value: value(r) }] }] });
    rec.append("plan_approved", { version: 1, text: text(r), plan });
  }
  for (let i = r.int(3, 25); i > 0; i--) {
    const k = r.int(0, 12);
    if (k <= 2) rec.addNode(node(r, rec));
    else if (k === 3) rec.append("user", { text: text(r) });
    else if (k === 4) rec.append("assistant", { text: text(r), final: true });
    else if (k === 5) rec.append("decision", { key: r.pick(["sigma", text(r)]), old: value(r), new: value(r), by: text(r), reason: text(r) });
    else if (k === 6) rec.append("question", { qid: "q1", title: text(r), text: text(r), options: [{ value: text(r), label: text(r) }], recommendation: text(r) });
    else if (k === 7) rec.append("answer", { qid: "q1", value: value(r), by: text(r), note: text(r) });
    else if (k === 8) rec.append("finding", { fid: "f1", severity: r.pick(["low", "high"]), message: text(r), check: text(r) });
    else if (k === 9) rec.append("deviation", { tool: text(r), deviations: [{ arg: text(r), used: value(r), setup: value(r) }] });
    else if (k === 10) rec.append("note", { text: text(r) });
    else if (k === 11) rec.append("plan_deviation", { what: text(r), from: value(r), to: value(r), reason: text(r) });
    else rec.append("tool_result", { tool: "blur", adapter: "fz", ok: r.bool(0.7), error: text(r), summary: text(r), table: { columns: [text(r)], rows: [[value(r)]] } });
  }
  return rec;
}

const TAGS = new Set("html head meta title style body main h1 h2 h3 h4 h5 h6 p b i span section div table thead tbody tr th td pre code strong em a ul ol li dl dt dd svg path details summary img br hr figure figcaption blockquote small sup sub nav header article aside footer label caption col colgroup".split(" "));

function checkHtml(html: string): void {
  for (const m of html.matchAll(/<\/?([a-zA-Z][\w-]*)/g)) expect(TAGS.has(m[1]!.toLowerCase()), `tag <${m[1]}>`).toBe(true);
  for (const m of html.matchAll(/<[a-zA-Z][^>]*>/g)) {
    expect(m[0]).not.toMatch(/\son\w+\s*=/i);
    expect(m[0]).not.toMatch(/(href|src)\s*=\s*["']?\s*javascript:/i);
  }
  expect(html).not.toContain("INJECTED()</script>");
  expect(/[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(html), "a control character that HTML does not allow").toBe(false);
}

function checkXml(xml: string, name: string): void {
  const bad = /[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
  expect(bad.test(xml), `${name}: a character that XML 1.0 does not allow`).toBe(false);
  const token = /<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>|[^<]+/y;
  const entity = /&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/;
  const stack: string[] = [];
  let at = 0;
  while (at < xml.length) {
    token.lastIndex = at;
    const m = token.exec(xml);
    expect(m, `${name}: bad XML at ${at}: ${xml.slice(at, at + 60)}`).toBeTruthy();
    if (m![2]) {
      expect(entity.test(m![3] ?? ""), `${name}: a raw & in an attribute`).toBe(false);
      if (m![1]) expect(stack.pop(), `${name}: closing tag ${m![2]}`).toBe(m![2]);
      else if (!m![4]) stack.push(m![2]);
    } else if (!m![0].startsWith("<")) expect(entity.test(m![0]), `${name}: a raw & in text`).toBe(false);
    at = token.lastIndex;
  }
  expect(stack, `${name}: open tags`).toEqual([]);
}

function unzip(buf: Buffer): Map<string, Buffer> {
  const end = buf.length - 22;
  expect(buf.readUInt32LE(end)).toBe(0x06054b50);
  const n = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  const out = new Map<string, Buffer>();
  for (let i = 0; i < n; i++) {
    expect(buf.readUInt32LE(p)).toBe(0x02014b50);
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const packed = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extra = buf.readUInt16LE(p + 30);
    const comment = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    expect(buf.readUInt32LE(local)).toBe(0x04034b50);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const body = buf.subarray(start, start + packed);
    const data = method === 8 ? inflateRawSync(body) : Buffer.from(body);
    expect(data.length, name).toBe(size);
    expect(crc32(data), name).toBe(crc);
    expect(out.has(name), `a second ${name}`).toBe(false);
    out.set(name, data);
    p += 46 + nameLen + extra + comment;
  }
  return out;
}

// Undo the IPython escapes, then split the line as sh does. Only plain words and single-quoted words are safe.
function shellWords(line: string): string[] | undefined {
  const s = line.replace(/\{\{/g, "{").replace(/\}\}/g, "}").replace(/\$\$/g, "$");
  const words: string[] = [];
  const re = /\s*((?:[\w.\-/!]+|'[^']*'|\\')+)/y;
  let at = 0;
  while (at < s.length) {
    re.lastIndex = at;
    const m = re.exec(s);
    if (!m) return undefined;
    words.push(m[1]!.replace(/'([^']*)'|\\'/g, (all, q: string | undefined) => (q !== undefined ? q : "'")));
    at = re.lastIndex;
  }
  return words;
}

// esbuild drops the comments. After the string literals go too, no record text can stay.
function injectedCalls(code: string): string[] {
  let out: string;
  try {
    out = transformSync(code, { loader: "ts", format: "esm", target: "esnext", charset: "utf8" }).code;
  } catch (e) {
    return [`syntax: ${(e as Error).message.slice(0, 300)}`];
  }
  const bare = out.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
  return bare.split("\n").filter((l) => l.includes("INJECTED"));
}

describe("fuzz: HTML report and exports", () => {
  beforeAll(() => {
    const dir = join(root, "ad");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "adapter.yaml"), YAML);
    adapter = loadAdapter(dir);
  });

  test("the HTML trail escapes every record text", () => {
    const r = new Rng(8001);
    for (let i = 0; i < runs(25); i++) {
      const rec = record(r);
      const html = trailHtml(rec, [adapter]);
      checkHtml(html);
      expect(html).toMatch(/<\/html>\s*$/);
      exportMarkdown(rec, [adapter], join(rec.dir, "t.md"));
      exportProtocol(rec, [adapter], join(rec.dir, "p.md"));
    }
  });

  test("the script export has no code from the record outside a string", () => {
    const r = new Rng(8002);
    for (let i = 0; i < runs(25); i++) {
      const rec = record(r);
      const code = readFileSync(exportScript(rec, [adapter], join(rec.dir, "s.mjs")), "utf8");
      expect(injectedCalls(code)).toEqual([]);
      const nb = JSON.parse(readFileSync(exportNotebook(rec, [adapter], join(rec.dir, "n.ipynb")), "utf8"));
      expect(nb.nbformat).toBe(4);
      const steps = rec.nodes().filter((n) => n.adapter);
      const lines = nb.cells.filter((c: { cell_type: string }) => c.cell_type === "code").map((c: { source: string[] }) => c.source.join(""));
      expect(lines.length).toBeLessThanOrEqual(steps.length);
      for (const line of lines) {
        expect(line.split("\n").length, line).toBe(1);
        const words = shellWords(line);
        expect(words, line).toBeDefined();
        expect(words!.length, line).toBe(5);
        expect(steps.some((n) => n.tool.replace(/[\r\n\u2028\u2029]+/g, " ") === words![3] && JSON.stringify(n.args) === JSON.stringify(JSON.parse(words![4]!))), line).toBe(true);
      }
      const flow = JSON.parse(readFileSync(exportFlow(rec, [adapter], join(rec.dir, "f.json")), "utf8"));
      expect(Array.isArray(flow.steps)).toBe(true);
    }
  });

  test("the ELN export is a valid zip with valid JSON and escaped HTML", () => {
    const r = new Rng(8003);
    for (let i = 0; i < runs(10); i++) {
      const rec = record(r);
      const content = collect({ dir: rec.dir, record: rec, adapters: [adapter], decisions: { fields: () => [] }, findings: { list: () => [] } });
      checkHtml(content.bodyHtml);
      const files = unzip(zip(buildElnFiles(content)));
      const meta = [...files.entries()].find(([k]) => k.endsWith("ro-crate-metadata.json"));
      expect(meta).toBeTruthy();
      expect(JSON.parse(meta![1].toString("utf8"))["@graph"].length).toBeGreaterThan(3);
      for (const [name, data] of files) if (name.endsWith(".html")) checkHtml(data.toString("utf8"));
    }
  });

  test("the xlsx opens: zip structure, well-formed XML, escaped cell text", () => {
    const r = new Rng(8004);
    for (let i = 0; i < runs(15); i++) {
      const rec = record(r);
      const sheets = buildWorkbook({ record: rec, adapters: [adapter], fields: [], programs: [{ name: text(r), version: "1", programVersion: text(r) }], dir: rec.dir, figures: [] });
      if (r.bool(0.5)) sheets.push({ name: "extra", columns: [text(r), text(r)], rows: Array.from({ length: r.int(0, 20) }, () => [value(r) as string, text(r)]) });
      const files = unzip(xlsx(sheets));
      for (const need of ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/worksheets/sheet1.xml"]) expect(files.has(need), need).toBe(true);
      for (const [name, data] of files) if (name.endsWith(".xml") || name.endsWith(".rels")) checkXml(data.toString("utf8"), name);
      const names = [...files.get("xl/workbook.xml")!.toString("utf8").matchAll(/<sheet name="([^"]*)"/g)].map((m) => m[1]!.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
      expect(names.length).toBe(sheets.length);
      for (const n of names) {
        expect(n.length).toBeGreaterThan(0);
        expect(n.length).toBeLessThanOrEqual(31);
        expect(n).not.toMatch(/[[\]:*?/\\]/);
      }
      expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(names.length);
    }
  });
});
