import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import type { LoadedAdapter } from "../adapters/manifest.ts";
import { scriptPython } from "../tools/run_script.ts";
import { CUVETTE_VERSION, errorBars, pdfPages, printPdf, sizes } from "./databook.ts";
import { mainNodes, methodsSentence, programNames } from "./exports.ts";
import { stepNumbers } from "./housekeeping.ts";
import { ownerOf, type AnalysisRecord } from "./record.ts";
import { copyFigures } from "./results.ts";
import { esc, fillTemplate, show } from "./trail.ts";
import type { Node } from "./types.ts";
import { ROOT } from "../root.ts";

export type DeckFormat = "pptx" | "pdf";
export type DeckSet = "figures" | "qc" | "pilot" | "all";
export type DeckOrder = "step" | "group" | "name";
export type DeckSize = "16:9" | "a4" | "letter";
export type PerPage = 1 | 2 | 4 | 6 | 9;
export type ImageKind = "figure" | "qc" | "pilot";

export interface DeckOptions {
  formats: DeckFormat[];
  images: DeckSet | string;
  order: DeckOrder;
  perPage: PerPage;
  size?: DeckSize;
}

export interface DeckImage {
  path: string;
  file: string;
  kind: ImageKind;
  also: ImageKind[];
  step: number;
  group: string;
  title: string;
  details: string[];
  sha: string;
}

export interface DeckWritten {
  pptx?: string;
  pdf?: string;
  images: number;
  slides: number;
  pages?: number;
  bytes: Record<string, number>;
  notes: string[];
}

type Rect = [number, number, number, number];
interface Para { text: string; pt: number; bold?: boolean; space?: number }
export interface Page {
  texts: { rect: Rect; paras: Para[] }[];
  images: { rect: Rect; path: string }[];
  notes?: string;
}

export const DECK_USAGE = "Use: /export images [pptx|pdf|both] [figures|qc|pilot|all|<glob>] [step|group|name] [1|2|4|6|9] [16:9|a4|letter]";
const DECK_PY = join(ROOT, "src/core/imagedeck.py");
const RASTER = /\.(png|jpe?g|gif|bmp|tiff?|webp)$/i;
const CONVERT = /\.(tiff?|webp|bmp)$/i;
const CODE = /\w\(.*\)|\w\[.*\]|\s=\s\w+\(|;\s*$|^\s*(import|from|library)\b|^In Python:/m;
const QC = /qc|overlay|outline|mask|label|contour|roi|seg|check|preview|threshold|watershed|particle|open_image/i;
const PLOT = /plot|chart|graph|bar|box|hist|volcano|curve|scatter|figure|violin|heatmap/i;
const SIZES: Record<DeckSize, [number, number]> = { "16:9": [338.667, 190.5], a4: [210, 297], letter: [215.9, 279.4] };
const PER: PerPage[] = [1, 2, 4, 6, 9];
const MARGIN = 12;
const GAP = 6;
const CAPTION: Record<PerPage, { h: number; title: number; detail: number; titleLines: number }> = {
  1: { h: 30, title: 14, detail: 10, titleLines: 2 },
  2: { h: 24, title: 12, detail: 9, titleLines: 1 },
  4: { h: 18, title: 10, detail: 8, titleLines: 1 },
  6: { h: 16, title: 9, detail: 7.5, titleLines: 1 },
  9: { h: 13, title: 8, detail: 7, titleLines: 1 },
};
const KIND_TEXT: Record<ImageKind, string> = { figure: "result figure", qc: "QC image", pilot: "demonstration image" };

const clip = (s: string, n: number) => {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > n ? one.slice(0, Math.max(1, n - 1)).trimEnd() + "…" : one;
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pretty = (s: string) => s.replace(/\.[^.]+$/, "").replace(/^step\d+-/, "").replace(/[_-]+/g, " ").trim();
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const localDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function sha256(p: string): string {
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

// ---------------------------------------------------------------- options

export function parseDeckArgs(args: string[]): DeckOptions | string {
  const o: DeckOptions = { formats: [], images: "all", order: "step", perPage: 1 };
  const words = args.filter((a) => !/^--/.test(a));
  for (const w of words) {
    const v = w.toLowerCase();
    if (v === "pptx" || v === "pdf") o.formats.push(v);
    else if (v === "both") o.formats.push("pptx", "pdf");
    else if (v === "figures" || v === "qc" || v === "pilot" || v === "all") o.images = v;
    else if (v === "demonstration") o.images = "pilot";
    else if (v === "step" || v === "group" || v === "name") o.order = v;
    else if (v === "sample") o.order = "group";
    else if (PER.includes(Number(v) as PerPage) && /^\d$/.test(v)) o.perPage = Number(v) as PerPage;
    else if (v === "16:9" || v === "a4" || v === "letter") o.size = v;
    else if (/[*?./]/.test(w)) o.images = w;
    else return `Unknown option "${w}". ${DECK_USAGE}`;
  }
  o.formats = [...new Set(o.formats)];
  if (!o.formats.length) o.formats = ["pptx"];
  return o;
}

export function globRe(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!;
    if (c === "*" && glob[i + 1] === "*") {
      re += ".*";
      i++;
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`, "i");
}

// ---------------------------------------------------------------- selection

const INPUT_KEY = /^(path|paths|image|images|input|inputs|file|files|intensity_image|source)$/i;

function samplePath(n: Node): string {
  const entries = Object.entries(n.args).sort(([a], [b]) => Number(!INPUT_KEY.test(a)) - Number(!INPUT_KEY.test(b)));
  for (const [, v] of entries) {
    if (typeof v !== "string" || v.length > 1024 || !/\.[A-Za-z0-9]{1,6}$/.test(v) || !/[\\/]/.test(v)) continue;
    const parts = v.split(/[\\/]/).filter(Boolean);
    return parts.slice(-2).join("/").replace(/\.[^.]+$/, "");
  }
  return "";
}

function groupsOf(n: Node): string {
  const metrics = (n.result as { metrics?: Record<string, unknown> } | undefined)?.metrics ?? {};
  const names = [...new Set(Object.keys(metrics).map((k) => /^(?:mean|median|n)_(.+)$/.exec(k)?.[1]).filter((g): g is string => !!g && !/^(groups|rows|columns|values|files)$/.test(g)))];
  const by = [n.args.group_by, n.args.groups, n.args.x, n.args.group].map((v) => (Array.isArray(v) ? v.join(", ") : str(v))).find(Boolean);
  if (names.length) return `Groups: ${names.join(", ")}${by ? ` (by ${by})` : ""}`;
  return by ? `Groups by ${by}` : "";
}

function resultText(n: Node): string[] {
  return n.tool === "run_script" || /^The script ran\b/.test(n.summary) || !n.summary.trim() ? [] : [`Result: ${clip(n.summary, 100).replace(/\.$/, "")}`];
}

function nodeTitle(n: Node, file: string, kind: ImageKind): string {
  const t = str(n.args.title) || str(n.args.caption) || (n.tool === "run_script" ? str(n.args.purpose) : "");
  if (t) return clip(cap(t).replace(/\.$/, ""), 160);
  return `${cap(pretty(file))}: ${kind === "qc" ? "QC image" : "figure"} from ${n.tool.replace(/_/g, " ")}`;
}

function displayName(dir: string, p: string): string {
  const r = relative(dir, p);
  return r && !r.startsWith("..") && !isAbsolute(r) ? r.split("\\").join("/") : basename(p);
}

function stepBefore(nodes: Node[], steps: Map<string, number>, entryId: number): number {
  let s = 0;
  for (const n of nodes) if (n.entry < entryId) s = Math.max(s, steps.get(n.id) ?? 0);
  return s;
}

export function collectImages(record: AnalysisRecord, dir: string, opts: Pick<DeckOptions, "images" | "order">): DeckImage[] {
  const steps = stepNumbers(record.nodes());
  const nodes = mainNodes(record);
  const copies = new Map<string, string>();
  try {
    for (const f of copyFigures(record, dir)) copies.set(f.source, f.path);
  } catch {}
  const seen = new Map<string, DeckImage>();
  const out: DeckImage[] = [];
  const add = (path: string | undefined, img: Omit<DeckImage, "path" | "file" | "sha" | "also">, shown?: string, tail: string[] = []) => {
    if (!path || !existsSync(path) || !RASTER.test(path)) return;
    const sha = sha256(path);
    const twin = seen.get(sha);
    if (twin) {
      if (img.kind === "pilot" && !twin.also.includes("pilot")) {
        twin.also.push("pilot");
        twin.details.splice(twin.details.findIndex((d) => d.startsWith("File: ")), 0, `Shown in the demonstration on ${img.group || "one sample"}`);
      }
      return;
    }
    const file = displayName(dir, shown && existsSync(shown) ? shown : path);
    const details = [...img.details, `File: ${file}`, ...(CONVERT.test(path) ? ["Shown as an 8-bit PNG copy"] : []), ...tail];
    const im = { ...img, also: [], details, path, file, sha };
    seen.set(sha, im);
    out.push(im);
  };

  for (const n of nodes) {
    const step = steps.get(n.id)!;
    const imgs = n.outputs.filter((o) => RASTER.test(o.path) && (o.kind === "image" || o.kind === "file"));
    const flat = imgs.some((o) => !/\.tiff?$/i.test(o.path));
    for (const o of imgs) {
      if (flat && /\.tiff?$/i.test(o.path)) continue;
      const file = o.name ?? basename(o.path);
      const kind: ImageKind = QC.test(`${file} ${n.tool}`) && !PLOT.test(`${file} ${str(n.args.kind)}`) ? "qc" : "figure";
      const src = existsSync(o.path) ? o.path : o.sha ? record.blobPath(o.sha) : undefined;
      const ns = sizes(n).map(([k, v]) => `${k} = ${show(v)}`);
      const details: string[] = [];
      const group = (kind === "figure" ? groupsOf(n) : "") || (samplePath(n) ? `Sample: ${samplePath(n)}` : "");
      if (group) details.push(group);
      if (kind === "figure") {
        const eb = errorBars(n);
        details.push(ns.length ? `n: ${ns.join(", ")}` : "n: not given in the record");
        details.push(eb ? `Error bars: ${eb}` : "Error bars: not given in the record");
      } else if (ns.length) details.push(`n: ${ns.join(", ")}`);
      details.push(`Step ${step} (${n.tool})`);
      add(src, { kind, step, group: group.replace(/^(Sample|Groups)( by)?:? /, ""), title: nodeTitle(n, file, kind), details }, copies.get(o.path), resultText(n));
    }
  }

  const runs = record.entries(["pilot_run"]);
  runs.forEach((e, i) => {
    const sample = str(e.data.sample);
    const after = stepBefore(nodes, steps, e.id);
    const images = Array.isArray(e.data.images) ? e.data.images.map(String) : [];
    images.forEach((p, k) => {
      const blob = /^[0-9a-f]{64}$/.test(p) ? record.blobPath(p) : undefined;
      add(blob ?? p, {
        kind: "pilot",
        step: after + 0.5,
        group: sample,
        title: `Demonstration on one sample: QC image ${k + 1} of ${images.length}, run ${i + 1}`,
        details: [`Sample: ${sample || "not given in the record"}`, "n = 1 sample", after ? `After step ${after}, before the batch` : "Before the first step"],
      });
    });
  });

  for (const e of record.entries(["validation"])) {
    const plot = str(e.data.plot);
    const pairs = Array.isArray(e.data.pairs) ? e.data.pairs.length : 0;
    const after = stepBefore(nodes, steps, e.id);
    add(plot, {
      kind: "figure",
      step: after + 0.75,
      group: "All samples",
      title: `Bland-Altman plot of the agent's values against the reference${e.data.measure ? ` for ${show(e.data.measure)}` : ""}`,
      details: ["Group: all samples", `n = ${plural(pairs, "sample")}`, "Error bars: none; the dashed lines are the limits of agreement (mean difference plus and minus 1.96 SD)", `After step ${after}`],
    });
  }

  const figDir = join(dir, "figures");
  if (existsSync(figDir)) {
    const copied = new Set(copies.values());
    for (const f of readdirSync(figDir).filter((x) => RASTER.test(x) && !x.startsWith(".")).sort()) {
      const p = join(figDir, f);
      if (copied.has(p)) continue;
      const step = Number(/^step(\d+)-/.exec(f)?.[1] ?? 0);
      const pilot = /^pilot-/.test(f);
      const kind: ImageKind = pilot ? "pilot" : QC.test(f) && !PLOT.test(f) ? "qc" : "figure";
      add(p, {
        kind,
        step: step || (pilot ? 0.5 : 9999),
        group: "",
        title: cap(pretty(f.replace(/^pilot-/, ""))),
        details: [step ? `Step ${step}. The record does not link this file to one output of the step` : "The record does not link this file to one step"],
      });
    }
  }

  const want = opts.images;
  const re = ["figures", "qc", "pilot", "all"].includes(want) ? undefined : globRe(want);
  const picked = out.filter((im) => {
    if (re) return re.test(im.file) || re.test(basename(im.file)) || re.test(basename(im.path));
    if (want === "figures") return im.kind === "figure";
    if (want === "qc") return im.kind === "qc" || im.kind === "pilot";
    if (want === "pilot") return im.kind === "pilot" || im.also.includes("pilot");
    return true;
  });
  return orderImages(picked, opts.order);
}

export function orderImages(list: DeckImage[], order: DeckOrder): DeckImage[] {
  const nat = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  const byName = (a: DeckImage, b: DeckImage) => nat(basename(a.file), basename(b.file)) || nat(a.file, b.file);
  const byStep = (a: DeckImage, b: DeckImage) => a.step - b.step || byName(a, b);
  const sorted = [...list];
  if (order === "name") sorted.sort(byName);
  else if (order === "group") sorted.sort((a, b) => (a.group ? 0 : 1) - (b.group ? 0 : 1) || nat(a.group, b.group) || byStep(a, b));
  else sorted.sort(byStep);
  return sorted;
}

export function caption(im: DeckImage): string {
  return [im.title, ...im.details].map((s) => s.replace(/\.$/, "")).join(". ") + ".";
}

// ---------------------------------------------------------------- layout

export function gridOf(per: PerPage, landscape: boolean): [number, number] {
  if (per === 2) return landscape ? [2, 1] : [1, 2];
  if (per === 6) return landscape ? [3, 2] : [2, 3];
  if (per === 4) return [2, 2];
  if (per === 9) return [3, 3];
  return [1, 1];
}

export function chunk<T>(list: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}

const lineMm = (pt: number) => pt * 0.3528 * 1.2;
const fitLine = (text: string, wMm: number, pt: number, lines: number) => clip(text, Math.floor(wMm / (pt * 0.19)) * lines);

export function cells(size: DeckSize, per: PerPage): { img: Rect; cap: Rect }[] {
  const [W, H] = SIZES[size];
  const [cols, rows] = gridOf(per, W > H);
  const c = CAPTION[per];
  const cw = (W - 2 * MARGIN - GAP * (cols - 1)) / cols;
  const ch = (H - 2 * MARGIN - GAP * (rows - 1)) / rows;
  const out: { img: Rect; cap: Rect }[] = [];
  for (let r = 0; r < rows; r++)
    for (let k = 0; k < cols; k++) {
      const x = MARGIN + k * (cw + GAP);
      const y = MARGIN + r * (ch + GAP);
      out.push({ img: [x, y, cw, ch - c.h - 2], cap: [x, y + ch - c.h, cw, c.h] });
    }
  return out;
}

function captionParas(im: DeckImage, per: PerPage, w: number): Para[] {
  const c = CAPTION[per];
  const detailLines = Math.max(1, Math.floor((c.h - c.titleLines * lineMm(c.title)) / lineMm(c.detail)));
  return [
    { text: fitLine(im.title, w, c.title, c.titleLines), pt: c.title, bold: true },
    { text: fitLine(im.details.map((s) => s.replace(/\.$/, "")).join(". ") + ".", w, c.detail, detailLines), pt: c.detail },
  ];
}

export interface DeckInfo {
  question: string;
  date: string;
  session: string;
  analysis: string;
  methods: string[];
  record: string;
  hash: string;
  entries: number;
}

function analysisParagraph(record: AnalysisRecord): string {
  const ok = record.entries(["plan_approved"]).at(-1);
  if (!ok) return "The record has no confirmed analysis.";
  const text = str(ok.data.text) || str(ok.data.full);
  const first = text.split(/\n\s*\n/)[0] ?? "";
  return clip(`Confirmed analysis, version ${show(ok.data.version)}: ${first.replace(/^You want:\s*/i, "")}`, 420);
}

export function deckInfo(record: AnalysisRecord, adapters: LoadedAdapter[], dir: string): DeckInfo {
  const plan = record.entries(["plan_approved", "plan"]).at(-1)?.data.plan as { question?: string } | undefined;
  const first = record.entries()[0];
  const question = str(plan?.question) || str(record.entries(["user"])[0]?.data.text) || "The record has no question.";
  const nodes = mainNodes(record);
  const sentences: string[] = [];
  const prog = programNames(adapters, nodes.filter((n) => n.adapter));
  if (prog) sentences.push(`Data were analyzed in ${prog}.`);
  const steps = stepNumbers(record.nodes());
  const lines = new Map<string, { steps: number[]; tool: string }>();
  for (const n of nodes) {
    let m = str(n.args.purpose) || str(n.args.does);
    if (!m && n.adapter) {
      try {
        m = fillTemplate(methodsSentence(adapters, n), (n.result ?? {}) as Record<string, unknown>);
      } catch {}
    }
    if (!m || CODE.test(m) || /\{[\w.]+\}/.test(m)) m = n.summary || n.tool;
    m = clip(m.replace(/(?:\/[^\s/,;]+)+\/([^\s/,;]+)/g, "$1").replace(/\.?$/, "."), 140);
    const line = lines.get(m) ?? { steps: [], tool: n.tool };
    line.steps.push(steps.get(n.id)!);
    lines.set(m, line);
  }
  for (const [m, l] of lines) {
    const st = l.steps.length === 1 ? `Step ${l.steps[0]}` : `Steps ${l.steps.slice(0, -1).join(", ")} and ${l.steps.at(-1)}`;
    sentences.push(`${clip(st, 40)} (${l.tool}): ${m}`);
  }
  const shown = sentences.slice(0, 10);
  if (sentences.length > shown.length) shown.push(`The record has ${plural(sentences.length - shown.length, "more method line")}. The protocol export lists all steps.`);
  const rel = relative(dir, record.logPath);
  return {
    question,
    date: localDate(first?.ts ?? new Date().toISOString()),
    session: ownerOf(record.entries()),
    analysis: analysisParagraph(record),
    methods: shown,
    record: rel.startsWith("..") || isAbsolute(rel) ? record.logPath : rel,
    hash: existsSync(record.logPath) ? sha256(record.logPath) : "",
    entries: record.entries().length,
  };
}

export function buildPages(images: DeckImage[], info: DeckInfo, size: DeckSize, per: PerPage): Page[] {
  const [W, H] = SIZES[size];
  const w = W - 2 * MARGIN;
  const kinds = (["figure", "qc", "pilot"] as ImageKind[]).map((k) => [k, images.filter((i) => i.kind === k).length] as const).filter(([, n]) => n);
  const title: Page = {
    texts: [
      {
        rect: [MARGIN, MARGIN + 8, w, H - 2 * MARGIN - 8],
        paras: [
          { text: "Images", pt: 12, bold: true },
          { text: clip(info.question, 260), pt: 24, bold: true, space: 6 },
          { text: `Date: ${info.date}. Session ${info.session}.`, pt: 14, space: 12 },
          { text: `${plural(images.length, "image")}${kinds.length ? `: ${kinds.map(([k, n]) => plural(n, KIND_TEXT[k])).join(", ")}` : ""}.`, pt: 14, space: 4 },
          { text: info.analysis, pt: 14, space: 12 },
        ],
      },
    ],
    images: [],
  };
  const grid = cells(size, per);
  const pages: Page[] = chunk(images, per).map((group) => ({
    texts: group.map((im, i) => ({ rect: grid[i]!.cap, paras: captionParas(im, per, grid[i]!.cap[2]) })),
    images: group.map((im, i) => ({ rect: grid[i]!.img, path: im.path })),
    notes: group.map(caption).join("\n\n"),
  }));
  const end: Page = {
    texts: [
      {
        rect: [MARGIN, MARGIN, w, H - 2 * MARGIN],
        paras: [
          { text: "Methods, in short", pt: 20, bold: true },
          ...info.methods.map((m) => ({ text: m, pt: size === "16:9" ? 11 : 10, space: 3 })),
          { text: "Record", pt: 14, bold: true, space: 14 },
          { text: `Record file: ${info.record} (${plural(info.entries, "entry", "entries")} when this deck was made).`, pt: 10, space: 3 },
          { text: `SHA-256: ${info.hash}`, pt: 9, space: 3 },
          { text: `Made with Cuvette ${CUVETTE_VERSION} on ${localDate(new Date().toISOString())}. Compute the SHA-256 hash of the record file to check this deck against the record.`, pt: 9, space: 3 },
        ],
      },
    ],
    images: [],
  };
  return [title, ...pages, end];
}

// ---------------------------------------------------------------- output

export function deckHtml(pages: Page[], size: DeckSize): string {
  const [W, H] = SIZES[size];
  const box = (r: Rect) => `left:${r[0]}mm;top:${r[1]}mm;width:${r[2]}mm;height:${r[3]}mm`;
  const body = pages
    .map((p) => {
      const texts = p.texts.map((t) => `<div class="t" style="${box(t.rect)}">${t.paras.map((x) => `<p style="font-size:${x.pt}pt;${x.bold ? "font-weight:700;" : ""}margin-top:${x.space ?? 0}pt">${esc(x.text)}</p>`).join("")}</div>`).join("");
      const imgs = p.images.map((i) => `<img style="${box(i.rect)}" src="${pathToFileURL(i.path).href}" alt="">`).join("");
      return `<section>${imgs}${texts}</section>`;
    })
    .join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Images</title><style>
@page{size:${W}mm ${H}mm;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#000;font-family:Helvetica,Arial,sans-serif}
section{position:relative;width:${W}mm;height:${H - 0.5}mm;overflow:hidden;break-after:page}
section:last-child{break-after:auto}
img{position:absolute;object-fit:contain;object-position:center bottom}
.t{position:absolute;overflow:hidden}
.t p{margin:0;line-height:1.2;overflow-wrap:anywhere}
</style></head><body>
${body}
</body></html>
`;
}

const run = promisify(execFile);

async function python(spec: object, dir: string): Promise<void> {
  const p = join(dir, `spec-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(p, JSON.stringify(spec));
  try {
    await run(scriptPython(), [DECK_PY, p], { timeout: 300000, maxBuffer: 16 << 20 });
  } catch (e) {
    const err = String((e as { stderr?: string }).stderr ?? (e as Error).message);
    if (/No module named 'pptx'/.test(err)) throw new Error(`python-pptx is not installed in the science environment (${scriptPython()}). Run: cuvette doctor --fix`);
    throw new Error(err.trim().split("\n").at(-1) || "the Python step stopped with an error");
  }
}

export interface DeckInput {
  record: AnalysisRecord;
  adapters: LoadedAdapter[];
  dir: string;
  options: DeckOptions;
  paper?: "a4" | "letter";
}

export async function writeImageDeck(w: DeckInput): Promise<DeckWritten> {
  const o = w.options;
  mkdirSync(w.dir, { recursive: true });
  const images = collectImages(w.record, w.dir, o);
  if (!images.length) throw new Error(`no images match "${o.images}"`);
  const info = deckInfo(w.record, w.adapters, w.dir);
  const out: DeckWritten = { images: images.length, slides: 0, bytes: {}, notes: [] };
  const tmp = mkdtempSync(join(tmpdir(), "cuvette-deck-"));
  try {
    const convert = images.filter((i) => CONVERT.test(i.path)).map((i, k) => ({ src: i.path, dst: join(tmp, `image-${k + 1}.png`) }));
    if (convert.length) {
      try {
        await python({ convert }, tmp);
      } catch (e) {
        out.notes.push(`The TIFF, WEBP or BMP images were not converted: ${(e as Error).message}`);
      }
      for (const c of convert) {
        const im = images.find((i) => i.path === c.src)!;
        if (existsSync(c.dst)) im.path = c.dst;
        else images.splice(images.indexOf(im), 1);
      }
    }
    for (const fmt of o.formats) {
      const size: DeckSize = o.size ?? (fmt === "pptx" ? "16:9" : w.paper ?? "a4");
      const pages = buildPages(images, info, size, o.perPage);
      out.slides = pages.length;
      if (fmt === "pptx") {
        const path = join(w.dir, "images.pptx");
        rmSync(path, { force: true });
        await python({ size: SIZES[size], pages, out: path }, tmp);
        out.pptx = path;
        out.bytes.pptx = statSync(path).size;
      } else {
        const html = join(tmp, "images.html");
        writeFileSync(html, deckHtml(pages, size));
        const path = join(w.dir, "images.pdf");
        const note = await printPdf(html, path);
        if (note) out.notes.push(note);
        else {
          out.pdf = path;
          out.pages = pdfPages(path);
          out.bytes.pdf = statSync(path).size;
        }
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return out;
}

const mb = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

export function deckLine(w: DeckWritten): string {
  const files = [
    ...(w.pptx ? [`${w.pptx} (${plural(w.slides, "slide")}, ${mb(w.bytes.pptx ?? 0)})`] : []),
    ...(w.pdf ? [`${w.pdf} (${plural(w.pages ?? 0, "page")}, ${mb(w.bytes.pdf ?? 0)})`] : []),
  ];
  return [`Image deck: ${plural(w.images, "image")}.`, files.length ? `Saved ${files.join(" and ")}.` : "No file was saved.", ...w.notes].join(" ");
}
