import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { costUsd } from "../core/spend.ts";
import { DEFAULT_CLAUDE_MODEL } from "../providers/claude.ts";
import type { ItemScore } from "./papers-score.ts";
import { loadPaper, paperIds, PAPERS_DIR, type Paper } from "./papers-spec.ts";
import { summarize, type Cell } from "./papers-report.ts";
import type { PapersResult, PaperRun } from "./papers.ts";
import { ROOT } from "../root.ts";

const FALLBACK = join(ROOT, "src/bench/fallback_figure.py");
const STYLED = join(ROOT, "src/adapters/kinds/ga_figures.py");
const SCIENCE_PYTHON = join(homedir(), ".cuvette/envs/science/bin/python");
const MAX_WIDTH = 1600;

const FIELDS: [string, string[]][] = [
  ["Imaging", ["bankhead2017-qupath-workshop", "caicedo2019-bbbc039", "ljosa2012-bbbc005", "mahbod2024-nuinsseg", "schindelin2012-fiji-blobs", "white2021-flowkit"]],
  ["MS and proteomics", ["alexandrov2019-metaspace", "bemis2015-cardinal", "lazear2023-sage", "palmer2017-metaspace-fdr", "rost2016-openms", "schramm2012-imzml-pyimzml"]],
  ["Genomics and transcriptomics", ["andrews-fastqc", "danecek2021-bcftools", "li2009-samtools", "love2014-deseq2-airway", "quinlan2010-bedtools", "wolf2018-scanpy"]],
  ["Phylogenetics", ["minh2020-iqtree2"]],
  ["Neuroscience", ["gramfort2013-mne-sample"]],
  ["Structural biology", ["gowers2016-mdanalysis"]],
  ["Chemistry", ["delaney2004-esol"]],
  ["Statistics", ["bates2015-lme4-sleepstudy", "belenky2003-sleepstudy", "rossi1980-recidivism", "student1908-sleep"]],
  ["Ecology", ["oksanen-vegan-dune"]],
  ["Astronomy", ["bradley-photutils-100gaussians"]],
  ["Geospatial", ["rouault-gdal-autotest"]],
];

export interface SiteOptions {
  results: string[];
  out: string;
  papersDir?: string;
  python?: string;
  log?: (line: string) => void;
}

export interface SiteInfo {
  index: string;
  images: string[];
  papers: number;
  runs: number;
}

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, "_");
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + "..." : s);
const num = (x: number | null | undefined) => (x === null || x === undefined ? "-" : String(Number(x.toPrecision(7))));

export function mergeResults(files: string[]): PapersResult {
  const parts = files.map((f) => JSON.parse(readFileSync(f, "utf8")) as PapersResult);
  const models: string[] = [];
  for (const p of parts) for (const m of p.models) if (!models.includes(m)) models.push(m);
  const dates = parts.map((p) => p.date).sort();
  return { date: dates.at(-1) ?? "", models, runsPerCell: Math.max(...parts.map((p) => p.runsPerCell), 1), runs: parts.flatMap((p) => p.runs), problems: [] };
}

function fieldOf(id: string): string {
  return FIELDS.find(([, ids]) => ids.includes(id))?.[0] ?? "Other";
}

function paperTitle(dir: string, id: string): string {
  const f = join(dir, "paper.md");
  if (!existsSync(f)) return id;
  const line = readFileSync(f, "utf8").split("\n").find((l) => l.startsWith("# "));
  return line ? line.slice(2).trim() : id;
}

function question(paper: Paper | undefined, dir: string): string {
  const raw = paper?.prompt ?? (existsSync(join(dir, "prompt.md")) ? readFileSync(join(dir, "prompt.md"), "utf8") : "");
  return short(raw.replace(/\s+/g, " ").trim(), 420);
}

export function figureFor(run: PaperRun, paperDir: string, imgDir: string, python: string, log: (s: string) => void): string | undefined {
  const key = createHash("sha1").update(run.dir ?? run.session ?? `${run.paper}${run.model}${run.run}`).digest("hex").slice(0, 8);
  const name = `${run.paper}-${slug(run.model)}-run${run.run}-${key}.png`;
  const out = join(imgDir, name);
  if (existsSync(out)) return name;
  const tmp = mkdtempSync(join(tmpdir(), "cuvette-site-"));
  const runFile = join(tmp, "run.json");
  writeFileSync(runFile, JSON.stringify(run));
  const script = join(paperDir, "figure.py");
  const expected = join(paperDir, "expected.yaml");
  let ok = false;
  if (existsSync(script)) {
    const r = spawnSync(python, [STYLED, script, "--session", run.dir ?? "", "--run", runFile, "--expected", expected, "--out", out], { encoding: "utf8", timeout: 180_000 });
    ok = r.status === 0 && existsSync(out);
    if (!ok) log(`${run.paper} ${run.model}: figure.py failed, using the fallback figure. ${short((r.stderr || "").trim().split("\n").at(-1) ?? "", 160)}`);
  }
  if (!ok) {
    const r = spawnSync(python, [FALLBACK, "--run", runFile, "--out", out], { encoding: "utf8", timeout: 120_000 });
    ok = r.status === 0 && existsSync(out);
    if (!ok) log(`${run.paper} ${run.model}: fallback figure failed. ${short((r.stderr || "").trim().split("\n").at(-1) ?? "", 160)}`);
  }
  if (!ok) return undefined;
  spawnSync(python, [FALLBACK, "--out", out, "--shrink", String(MAX_WIDTH)], { encoding: "utf8", timeout: 60_000 });
  return name;
}

type CellClass = "all" | "part" | "none" | "error" | "pending";

function cellClass(c: Cell | undefined): CellClass {
  if (!c) return "pending";
  const bad = Object.entries(c.statuses).some(([k, v]) => k !== "answer" && v > 0);
  if (bad && c.computed === 0) return "error";
  if (c.computed === c.computedOf && c.reported === c.reportedOf) return "all";
  if (c.computed === 0 && c.reported === 0) return "none";
  return "part";
}

const CLASS_LABEL: Record<CellClass, string> = { all: "all pass", part: "part", none: "none", error: "error", pending: "not run yet" };

const modelName = (m: string) => (m.startsWith("ollama:") ? m.slice(7) : m);

function cellHtml(id: string, c: Cell | undefined): string {
  const k = cellClass(c);
  if (!c) return `<td class="cell pending"><span class="lbl">not run yet</span></td>`;
  const bad = Object.entries(c.statuses).filter(([s]) => s !== "answer").map(([s, v]) => `${v} ${s}`).join(", ");
  return `<td class="cell ${k}"><a href="#p-${esc(id)}"><span class="pair"><b>${c.computed}/${c.computedOf}</b> computed</span><span class="pair">${c.reported}/${c.reportedOf} reported</span>${bad ? `<span class="lbl">${esc(bad)}</span>` : ""}</a></td>`;
}

function itemTable(items: ItemScore[]): string {
  const rows = items.map((i) => {
    const tol = i.tolerance === "exact" ? "exact" : `±${num(i.tolerance)}`;
    const c = i.computed;
    const r = i.reported;
    const mark = (p: boolean | null) => (p === null ? `<span class="tag na">not asked</span>` : p ? `<span class="tag ok">pass</span>` : `<span class="tag bad">fail</span>`);
    return `<tr><td class="key" title="${esc(i.description)}">${esc(i.key)}</td><td>${i.abs ? "abs " : ""}${num(i.expected)} <small>${esc(tol)}</small></td><td>${mark(c.pass)} ${num(c.value)}</td><td>${mark(r.pass)} ${r.pass === null ? "" : num(r.value)}${r.via === "rounding" ? " <small>via rounding</small>" : ""}</td></tr>`;
  });
  return `<div class="scroll"><table class="items"><thead><tr><th>Item</th><th>Expected</th><th>Computed</th><th>Reported</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

function runBlock(r: PaperRun, img: string | undefined): string {
  const m = r.metrics;
  const secs = r.durationS >= 100 ? Math.round(r.durationS) : Number(r.durationS.toFixed(1));
  const stats = [`<span class="tag st-${esc(r.status)}">${esc(r.status)}</span>`, `${secs} s`, m ? `${m.toolCalls} tool calls` : "", m ? `${m.nudges} nudges` : ""].filter(Boolean).join(" · ");
  const answer = r.answer ? `<details><summary>Answer, first 400 characters</summary><pre>${esc(short(r.answer, 400))}</pre></details>` : "";
  const err = r.error ? `<p class="err">${esc(short(r.error, 240))}</p>` : "";
  return `<div class="run"><h4>${esc(modelName(r.model))}<small> run ${r.run}</small></h4><p class="stats">${stats}</p>${err}${img ? `<img src="img/${esc(img)}" alt="Figure for ${esc(r.paper)}, ${esc(r.model)}" loading="lazy">` : `<p class="muted">No figure.</p>`}${itemTable(r.items)}${answer}</div>`;
}

function triageHtml(dir: string): string {
  const f = join(dir, "triage.md");
  if (!existsSync(f)) return "";
  const text = readFileSync(f, "utf8").trim();
  if (!text) return "";
  const paras = text.split(/\n\s*\n/);
  const head = short(paras.slice(0, 2).join("\n\n"), 700);
  const more = text.length > head.length ? `<details><summary>Full triage notes</summary><pre>${esc(text)}</pre></details>` : "";
  return `<div class="triage"><h4>Triage</h4><pre>${esc(head)}</pre>${more}</div>`;
}

const CSS = `
:root{--bg:#f6f7f9;--panel:#fff;--ink:#1b1f24;--muted:#5d6672;--line:#dde1e6;--accent:#2f5fd0;--all:#d5efdf;--all-ink:#115c35;--part:#fdf0c9;--part-ink:#6b4e00;--none:#f9d9d6;--none-ink:#8a1c14;--error:#e4d4f3;--error-ink:#4e2178;--pending:#eceef1;--pending-ink:#5d6672;--code:#eef0f3}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111418;--panel:#1a1e24;--ink:#e6e9ed;--muted:#9aa4b0;--line:#2c333b;--accent:#8fb0ff;--all:#143d29;--all-ink:#8fe0b3;--part:#43380f;--part-ink:#f2d777;--none:#4a1f1c;--none-ink:#ffaba4;--error:#35214d;--error-ink:#d6b8f5;--pending:#242a31;--pending-ink:#9aa4b0;--code:#232930}}
:root[data-theme="dark"]{--bg:#111418;--panel:#1a1e24;--ink:#e6e9ed;--muted:#9aa4b0;--line:#2c333b;--accent:#8fb0ff;--all:#143d29;--all-ink:#8fe0b3;--part:#43380f;--part-ink:#f2d777;--none:#4a1f1c;--none-ink:#ffaba4;--error:#35214d;--error-ink:#d6b8f5;--pending:#242a31;--pending-ink:#9aa4b0;--code:#232930}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 "Inter",system-ui,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:26px;margin:0 0 4px}
h2{font-size:19px;margin:36px 0 12px}
h3{font-size:17px;margin:0 0 4px}
h4{font-size:14px;margin:0 0 4px}
small,.muted{color:var(--muted)}
a{color:var(--accent)}
.sub{color:var(--muted);margin:0 0 16px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.tile,.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px}
.tile h4{overflow-wrap:anywhere}
.big{font-size:22px;font-weight:600;font-variant-numeric:tabular-nums}
.tile p{margin:2px 0}
.scroll{overflow-x:auto;max-width:100%;-webkit-overflow-scrolling:touch}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);white-space:nowrap}
.matrix td.paper{min-width:200px}
.matrix tr.field th{background:var(--code);color:var(--ink)}
.cell{min-width:150px}
.cell a{display:block;color:inherit;text-decoration:none}
.cell .pair,.cell .lbl{display:block;font-size:13px}
.cell .lbl{font-size:12px}
.cell.all{background:var(--all);color:var(--all-ink)}
.cell.part{background:var(--part);color:var(--part-ink)}
.cell.none{background:var(--none);color:var(--none-ink)}
.cell.error{background:var(--error);color:var(--error-ink)}
.cell.pending{background:var(--pending);color:var(--pending-ink)}
.legend{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
.legend span{padding:2px 10px;border-radius:99px;font-size:12px}
.legend .all{background:var(--all);color:var(--all-ink)}.legend .part{background:var(--part);color:var(--part-ink)}.legend .none{background:var(--none);color:var(--none-ink)}.legend .error{background:var(--error);color:var(--error-ink)}.legend .pending{background:var(--pending);color:var(--pending-ink)}
.card{margin:16px 0;overflow-wrap:anywhere}
.card .meta{color:var(--muted);font-size:13px;margin:0 0 8px}
.card .q{margin:8px 0 12px}
.run{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}
.run img{display:block;max-width:100%;height:auto;border:1px solid var(--line);border-radius:6px;background:#fff;margin:8px 0}
.stats{margin:2px 0 6px;color:var(--muted);font-size:13px}
.err{color:var(--none-ink);font-size:13px;margin:4px 0}
.items td.key{font-family:ui-monospace,Menlo,monospace;font-size:12px;white-space:nowrap}
.items small{color:var(--muted)}
.tag{display:inline-block;padding:0 7px;border-radius:99px;font-size:11px;font-weight:600;background:var(--pending);color:var(--pending-ink)}
.tag.ok,.tag.st-answer{background:var(--all);color:var(--all-ink)}
.tag.bad,.tag.st-error,.tag.st-timeout,.tag.st-no_answer{background:var(--none);color:var(--none-ink)}
details{margin:8px 0}
summary{cursor:pointer;color:var(--accent);font-size:13px}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--code);padding:10px;border-radius:6px;font:12px/1.5 ui-monospace,Menlo,monospace;margin:6px 0}
.triage{border-top:1px solid var(--line);margin-top:12px;padding-top:8px}
.pendingcard{color:var(--muted);font-size:14px}
@media (max-width:600px){.wrap{padding-top:16px}h1{font-size:22px}}
`;

export function buildSite(opts: SiteOptions): SiteInfo {
  const log = opts.log ?? (() => {});
  const papersDir = opts.papersDir ?? PAPERS_DIR;
  const python = opts.python ?? (existsSync(SCIENCE_PYTHON) ? SCIENCE_PYTHON : "python3");
  const result = mergeResults(opts.results);
  const imgDir = join(opts.out, "img");
  mkdirSync(imgDir, { recursive: true });
  const sum = summarize(result);
  const ids = [...new Set([...paperIds(papersDir), ...result.runs.map((r) => r.paper)])];
  const ordered = [...FIELDS.flatMap(([, f]) => f.filter((i) => ids.includes(i))), ...ids.filter((i) => !FIELDS.some(([, f]) => f.includes(i)))];

  const tiles = result.models.map((m) => {
    const t = sum.totals[m];
    const x = sum.metrics[m];
    if (!t) return `<div class="tile"><h4>${esc(modelName(m))}</h4><p class="muted">Not run yet.</p></div>`;
    const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "-");
    let cost = "";
    if (m.startsWith("claude") && x) {
      const model = m.includes(":") ? m.slice(m.indexOf(":") + 1) : DEFAULT_CLAUDE_MODEL;
      const usd = costUsd(model, { inputTokens: x.inputTokens ?? 0, outputTokens: x.outputTokens ?? 0, cacheRead: x.cacheRead ?? 0, cacheWrite: x.cacheWrite ?? 0 });
      cost = `<p>Claude cost: <b>$${usd.toFixed(2)}</b> for ${t.runs} runs (list price, from token counts)</p>`;
    }
    return `<div class="tile"><h4>${esc(modelName(m))}</h4><p class="big">${pct(t.computed, t.computedOf)} <small>computed ${t.computed}/${t.computedOf}</small></p><p class="big">${pct(t.reported, t.reportedOf)} <small>reported ${t.reported}/${t.reportedOf}</small></p><p class="muted">${t.runs} runs${Object.entries(t.statuses).filter(([k]) => k !== "answer").map(([k, v]) => `, ${v} ${esc(k)}`).join("")}</p>${cost}</div>`;
  });

  const head = `<tr><th>Paper</th>${result.models.map((m) => `<th>${esc(modelName(m))}</th>`).join("")}</tr>`;
  const matrixRows: string[] = [];
  for (const [field, fieldIds] of [...FIELDS, ["Other", ordered.filter((i) => !FIELDS.some(([, f]) => f.includes(i)))] as [string, string[]]]) {
    const inField = ordered.filter((i) => fieldIds.includes(i));
    if (!inField.length) continue;
    matrixRows.push(`<tr class="field"><th colspan="${result.models.length + 1}">${esc(field)}</th></tr>`);
    for (const id of inField) {
      const title = paperTitle(join(papersDir, id), id);
      matrixRows.push(`<tr><td class="paper"><a href="#p-${esc(id)}">${esc(short(title, 70))}</a><br><small>${esc(id)}</small></td>${result.models.map((m) => cellHtml(id, sum.cells[id]?.[m])).join("")}</tr>`);
    }
  }

  const images: string[] = [];
  const cards = ordered.map((id) => {
    const dir = join(papersDir, id);
    let paper: Paper | undefined;
    try {
      paper = loadPaper(id, papersDir);
    } catch {
      paper = undefined;
    }
    const runs = result.runs.filter((r) => r.paper === id && r.status !== "skipped").sort((a, b) => result.models.indexOf(a.model) - result.models.indexOf(b.model) || a.run - b.run);
    const skip = result.runs.find((r) => r.paper === id && r.status === "skipped");
    const body: string[] = [];
    for (const m of result.models) {
      const mine = runs.filter((r) => r.model === m);
      if (!mine.length) body.push(`<div class="run pendingcard"><h4>${esc(modelName(m))}</h4>${skip ? `Skipped: ${esc(short(skip.error ?? "", 200))}` : "Not run yet."}</div>`);
      for (const r of mine) {
        const img = r.items.length ? figureFor(r, dir, imgDir, python, log) : undefined;
        if (img) images.push(img);
        body.push(runBlock(r, img));
      }
    }
    return `<section class="card" id="p-${esc(id)}"><h3>${esc(paperTitle(dir, id))}</h3><p class="meta">${esc(id)} · ${esc(fieldOf(id))} · adapter ${esc((paper?.adapters ?? []).map((a) => a.split("/").pop()).join(", ") || "-")}</p><p class="q">${esc(question(paper, dir))}</p>${body.join("")}${triageHtml(dir)}</section>`;
  });

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Paper Benchmark</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<h1>Paper benchmark</h1>
<p class="sub">${esc(result.date)} · ${result.models.length} models · ${ordered.length} papers · ${result.runs.filter((r) => r.status !== "skipped").length} runs</p>
<div class="tiles">${tiles.join("")}</div>
<p class="muted">Computed: a logged number is within the tolerance. Reported: the final answer states the value and the claim check labels it measured.</p>
<h2>Matrix</h2>
<div class="legend"><span class="all">all pass</span><span class="part">part</span><span class="none">none</span><span class="error">error</span><span class="pending">not run yet</span></div>
<div class="scroll"><table class="matrix"><thead>${head}</thead><tbody>${matrixRows.join("")}</tbody></table></div>
<h2>Papers</h2>
${cards.join("\n")}
</div>
</body>
</html>
`;
  const index = join(opts.out, "index.html");
  writeFileSync(index, html);
  return { index, images: [...new Set(images)], papers: ordered.length, runs: result.runs.length };
}
