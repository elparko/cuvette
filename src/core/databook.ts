import { spawn, spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { platform, release, tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { cuvetteHome, type LoadedAdapter } from "../adapters/manifest.ts";
import { labelMap, loadAdapters, sha256File, sizeText } from "../bench/papers-cases.ts";
import { citationStyle, cuvetteRef, Markers, nodeCitations, programCitations, referencesHtml, sessionCitations, type CitationStyle, type Ref, type SessionCitations } from "./citations.ts";
import { extractNumbers } from "./claims.ts";
import { envsUsed } from "./results.ts";
import { changeCell, num, reruns, stepStatus } from "./status.ts";
import { mainNodes, methodsSentence, stepLines } from "./exports.ts";
import { stepNumbers } from "./housekeeping.ts";
import { inProject, outputRoot, placeAt, readIndex } from "./places.ts";
import { pilotRows, validationRows } from "./pilot.ts";
import { checkSheets } from "./results.ts";
import { AnalysisRecord, ownerOf } from "./record.ts";
import { find, resolve as resolveSetting, type Paper } from "./settings.ts";
export { localePaper, type Paper } from "./settings.ts";
import { dataUri, esc, fillTemplate, findChrome, findPandoc, renderMarkdown, show } from "./trail.ts";
import type { Claim, Entry, Node } from "./types.ts";
import { ROOT } from "../root.ts";

export type BookFormat = "pdf" | "html" | "docx";

const IMAGE_CAP = 3 * 1024 * 1024;
const MAX_ROWS = 30;
const MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml" };
const SIZE_KEYS = /^n($|_)|_n$|^n[A-Z]/;
const NOT_SIZES = new Set(["n_columns", "n_missing", "n_unique", "n_cols"]);

export const CUVETTE_VERSION = (() => {
  try {
    return String(JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version);
  } catch {
    return "unknown";
  }
})();

// ---------------------------------------------------------------- small helpers

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null || v === "" ? [] : [v]);
const str = (v: unknown) => (v === undefined || v === null ? "" : typeof v === "string" ? v.trim() : show(v));
const clip = (s: string, n: number) => {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > n ? one.slice(0, n - 1).trimEnd() + "…" : one;
};
const time = (ts: unknown) => (typeof ts === "string" && ts.length >= 16 ? `${ts.slice(0, 10)} ${ts.slice(11, 16)} UTC` : "");
const pick = (o: Record<string, unknown>, ...keys: string[]) => keys.map((k) => o[k]).find((v) => v !== undefined && v !== null && v !== "");
const kinds = (r: AnalysisRecord, ...k: string[]) => r.entries().filter((e) => k.includes(e.kind));
const sentence = (s: string) => (s.trim() ? s.trim().replace(/[.\s]+$/, "") + "." : "");
const looksLikeCode = (s: string) => /\w\(.*\)|\w\[.*\]|\s=\s\w+\(|;\s*$|^\s*(import|from|library)\b/m.test(s);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function cell(v: unknown): string {
  if (typeof v === "number") return esc(Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(Math.max(6, String(Math.trunc(Math.abs(v))).length)))));
  return esc(str(v));
}

function stringsIn(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => stringsIn(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => stringsIn(x, out));
  return out;
}

const pathLike = (s: string) => s.length < 1024 && !/\n/.test(s) && (isAbsolute(s) || /^[.~]?[\w-]*\//.test(s)) && /\.[A-Za-z0-9]{1,6}$/.test(s);

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function fileUri(p: string): string | undefined {
  const mime = MIME[extname(p).toLowerCase()];
  if (!mime || !isFile(p) || statSync(p).size > IMAGE_CAP) return undefined;
  return `data:${mime};base64,${readFileSync(p).toString("base64")}`;
}

function imageSrc(record: AnalysisRecord, ref: unknown): string | undefined {
  const s = str(ref);
  if (/^[0-9a-f]{64}$/.test(s)) return dataUri(record, s);
  return s ? fileUri(s) : undefined;
}

// ---------------------------------------------------------------- references

class References {
  markers: Markers;
  cited = new Map<string, Ref>();
  other = new Map<string, Ref>();
  constructor(public style: CitationStyle) {
    this.markers = new Markers(style);
  }
  cite(refs: Ref[]): string {
    for (const r of refs) {
      this.cited.set(r.id, r);
      this.other.delete(r.id);
    }
    return this.markers.cite(refs);
  }
  note(c: SessionCitations): void {
    for (const r of [...c.comparison, ...c.outOfDate]) if (!this.cited.has(r.id) && !this.other.has(r.id)) this.other.set(r.id, r);
  }
  citations(): SessionCitations {
    const rest = [...this.other.values()].filter((r) => !this.cited.has(r.id));
    return { used: this.markers.list([...this.cited.values()]), comparison: rest.filter((r) => r.group === "comparison"), outOfDate: rest.filter((r) => r.group === "out_of_date"), notRun: [] };
  }
}

// ---------------------------------------------------------------- the writer

interface TocItem {
  num: string;
  title: string;
  id: string;
  level: number;
}

class Writer {
  out: string[] = [];
  toc: TocItem[] = [];
  fig = 0;
  tab = 0;
  private n = [0, 0, 0];
  private appendix = false;

  head(level: number, title: string, cls = ""): void {
    this.n[level - 1]!++;
    for (let i = level; i < this.n.length; i++) this.n[i] = 0;
    const num = this.n.slice(0, level).map((x, i) => (i === 0 && this.appendix ? String.fromCharCode(64 + x) : String(x))).join(".");
    const shown = this.appendix && level === 1 ? `Appendix ${num}` : num;
    const id = `sec-${num.replace(/\./g, "-")}`;
    this.toc.push({ num: shown, title, id, level });
    this.out.push(`<h${level + 1} id="${id}"${cls ? ` class="${cls}"` : ""}><span class="num">${esc(shown)}</span> ${esc(title)}</h${level + 1}>`);
  }

  startAppendix(): void {
    this.appendix = true;
    this.n = [0, 0, 0];
  }

  add(html: string): void {
    this.out.push(html);
  }

  p(text: string): void {
    if (text.trim()) this.out.push(`<p>${esc(text)}</p>`);
  }

  table(caption: string, columns: string[], rows: unknown[][], note = "", raw = false): void {
    this.tab++;
    const narrow = columns.length <= 6;
    const short = (html: string) => {
      const t = html.replace(/<[^>]+>/g, "");
      return /^[-+]?[\d.,]+(e[-+]?\d+)?%?$/i.test(t) || (narrow && /^\S{1,12}$/.test(t));
    };
    const td = (html: string) => `<td${short(html) ? ' class="s"' : ""}>${html}</td>`;
    const body = rows.map((r) => `<tr>${r.map((c) => td(raw ? String(c ?? "") : cell(c))).join("")}</tr>`).join("");
    const th = (c: string) => `<th${short(c) ? ' class="s"' : ""}>${esc(c).replace(/_/g, "_<wbr>")}</th>`;
    this.out.push(
      `<table id="table-${this.tab}"${columns.length > 8 ? ' class="wide"' : ""}><caption><b>Table ${this.tab}.</b> ${esc(caption)}</caption><thead><tr>${columns.map(th).join("")}</tr></thead><tbody>${body}</tbody></table>${note ? `<p class="note">${esc(note)}</p>` : ""}`,
    );
  }

  figure(src: string, caption: string): void {
    this.fig++;
    this.out.push(`<figure id="figure-${this.fig}"><img src="${src}" alt="Figure ${this.fig}"><figcaption><b>Figure ${this.fig}.</b> ${esc(caption)}</figcaption></figure>`);
  }
}

// ---------------------------------------------------------------- one session

interface Part {
  k: number;
  record: AnalysisRecord;
  adapters: LoadedAdapter[];
  labels: Map<string, string>;
  nodes: Node[];
  steps: Map<string, number>;
  all: Node[];
  outDir?: string;
  shown: Set<string>;
}

const anchor = (p: Part, step: number) => `p${p.k}-step-${step}`;
const stepLink = (p: Part, step: number) => `<a href="#${anchor(p, step)}">step ${step}</a>`;

function firstQuestion(r: AnalysisRecord): string {
  const plan = rec(kinds(r, "plan_approved", "plan").at(-1)?.data.plan);
  const user = r.entries(["user"])[0];
  return str(plan.question) || str(user?.data.text) || str(r.entries(["setup"]).map((e) => rec(e.data.values).question).find(Boolean));
}

export function sessionTitle(r: AnalysisRecord): string {
  return clip(firstQuestion(r) || `Session ${ownerOf(r.entries())}`, 90);
}

function confirmedPlan(r: AnalysisRecord) {
  const approved = kinds(r, "plan_approved");
  const confirmed = approved.at(-1);
  const proposals = kinds(r, "plan").filter((e) => /proposed/.test(str(e.data.action)));
  const v = confirmed ? Number(confirmed.data.version) : undefined;
  const earlier = [...proposals.filter((e) => Number(e.data.version) !== v), ...approved.slice(0, -1)].sort((a, b) => a.id - b.id);
  return { confirmed, proposal: proposals.at(-1), earlier, plan: rec(confirmed?.data.plan ?? proposals.at(-1)?.data.plan) };
}

function sectionQuestion(w: Writer, p: Part, level: number): void {
  const { confirmed, proposal, earlier } = confirmedPlan(p.record);
  w.head(level, confirmed ? "Question and confirmed analysis" : proposal ? "Question and proposed analysis" : "Question");
  const users = p.record.entries(["user"]);
  const q = firstQuestion(p.record);
  if (q) w.add(`<p class="question"><b>Question.</b> ${esc(q)}</p>`);
  const later = users.slice(1).map((u) => str(u.data.text)).filter(Boolean);
  if (later.length) w.add(`<p>Later requests in this session:</p><ol>${later.map((t) => `<li>${esc(clip(t, 400))}</li>`).join("")}</ol>`);
  if (confirmed) {
    const v = str(confirmed.data.version);
    w.p(`The scientist confirmed version ${v} of the proposed analysis on ${time(confirmed.ts)}.${earlier.length ? ` Appendix D lists the ${plural(earlier.length, "earlier version")}.` : ""}`);
    w.add(`<div class="plan">${esc(str(confirmed.data.text ?? confirmed.data.full))}</div>`);
  } else if (proposal) {
    w.p(`The agent proposed version ${str(proposal.data.version)} of the analysis. The record has no confirmation of it.`);
    w.add(`<div class="plan">${esc(str(proposal.data.full ?? proposal.data.text))}</div>`);
  }
}

interface InputFile {
  path?: string;
  sha: string;
  steps: number[];
}

function inputFiles(p: Part): InputFile[] {
  const produced = new Set<string>();
  const files = new Map<string, InputFile>();
  for (const n of p.nodes) {
    const step = p.steps.get(n.id)!;
    let cands = [...new Set(stringsIn(n.args).filter((s) => pathLike(s) && !produced.has(s)))];
    if (cands.length !== n.inputHashes.length) cands = cands.filter(isFile);
    const paired = cands.length === n.inputHashes.length;
    n.inputHashes.forEach((sha, i) => {
      const f = files.get(sha) ?? { sha, steps: [] };
      if (paired && !f.path) f.path = cands[i];
      if (!f.steps.includes(step)) f.steps.push(step);
      files.set(sha, f);
    });
    for (const o of n.outputs) produced.add(o.path);
  }
  return [...files.values()];
}

function setupValue(r: AnalysisRecord, re: RegExp): [string, unknown] | undefined {
  let hit: [string, unknown] | undefined;
  for (const e of r.entries(["setup", "decision"])) {
    if (e.kind === "setup") for (const [k, v] of Object.entries(rec(e.data.values))) if (re.test(k)) hit = [k, v];
    if (e.kind === "decision" && re.test(str(e.data.key))) hit = [str(e.data.key), e.data.new];
  }
  return hit;
}

export function sizes(n: Node): [string, unknown][] {
  return Object.entries(rec(rec(n.result).metrics)).filter(([k, v]) => SIZE_KEYS.test(k) && !NOT_SIZES.has(k) && typeof v === "number");
}

function sectionData(w: Writer, p: Part, level: number): void {
  w.head(level, "Data");
  const files = inputFiles(p);
  if (files.length) {
    const rows = files.map((f) => {
      const there = f.path && isFile(f.path);
      const st = there ? statSync(f.path!) : undefined;
      const now = there ? sha256File(f.path!) : undefined;
      const check = !f.path ? "The record has no path for this hash." : !there ? "Not found on this computer." : now === f.sha ? "Same as the record." : now ? "Changed after the analysis." : "Too large to check.";
      return [f.path ?? "not recorded", st ? sizeText(st.size) : "-", st ? st.mtime.toISOString().slice(0, 10) : "-", `<code class="hash">${esc(f.sha)}</code>`, f.steps.map((s) => stepLink(p, s)).join(", "), check];
    });
    w.table("Input files. The hash is the SHA-256 of the file when the step read it.", ["Path", "Size", "Modified", "SHA-256", "Steps", "Check today"], rows.map((r) => r.map((c, i) => (i === 3 || i === 4 ? c : esc(String(c))))), "", true);
  } else w.p("The record has no input files with a hash.");
  const plan = confirmedPlan(p.record).plan;
  const data = rec(plan.data);
  const unit = setupValue(p.record, /replicat|^unit/);
  if (data.replicate) w.p(`One unit of replication: ${sentence(str(data.replicate))}`);
  else if (unit) w.p(`One unit of replication: ${sentence(str(unit[1]))}`);
  if (data.row) w.p(`One row of the data: ${sentence(str(data.row))}`);
  if (data.n) w.p(`Planned sample size: ${sentence(str(data.n))}`);
  const rows = p.nodes.flatMap((n) => sizes(n).map(([k, v]) => [stepLink(p, p.steps.get(n.id)!), esc(k), cell(v)]));
  if (rows.length) w.table("Sample sizes that each step reported. Each value counts the units in one group or in the whole data.", ["Step", "Measure", "n"], rows, "", true);
}

function sectionDataCheck(w: Writer, p: Part, level: number): void {
  const sheets = checkSheets(p.record);
  const check = sheets.find((s) => s.name === "Data check");
  const samples = sheets.find((s) => s.name === "Samples");
  if (!check && !samples) return;
  w.head(level, "Data check and sample sheet");
  if (check) {
    w.p("Code in the harness checked the data when the agent first read it: missing values, copied rows and IDs, text in number columns, group sizes, extreme values (modified z-score above 3.5; reported, never removed), units in the column names, and for file sets missing channels, names, file sizes and bit depths. Each problem that needed a choice went to the scientist as a question. The answer is in the last column.");
    w.table("Data check findings and the answers of the scientist.", check.columns, check.rows);
  }
  if (samples) {
    const from = p.record.entries(["samples"]).find((e) => e.data.action === "drafted");
    const edits = p.record.entries(["samples"]).filter((e) => e.data.action === "edited" || e.data.action === "reloaded").length;
    w.p(`The agent made the sample sheet from ${str(from?.data.from) || "the data"}.${edits ? ` The scientist changed it ${edits === 1 ? "one time" : `${edits} times`}.` : ""} The analysis used it for the groups and for n.`);
    w.table("Sample sheet: one row for each sample. unit is the unit of replication (one n).", samples.columns, samples.rows.slice(0, 200), samples.rows.length > 200 ? `The table shows 200 of ${samples.rows.length} rows. All rows are in samples.csv.` : "");
  }
}

interface DecisionRow {
  label: string;
  value: unknown;
  by: string;
  reason: string;
}

function decisionRows(p: Part): DecisionRow[] {
  const rows = new Map<string, DecisionRow>();
  for (const e of p.record.entries(["setup", "decision"])) {
    if (e.kind === "setup") {
      const defaults = new Set(arr(e.data.defaultsAccepted).map(String));
      for (const [k, v] of Object.entries(rec(e.data.values)))
        rows.set(k, { label: p.labels.get(k) ?? k, value: v, by: defaults.has(k) ? "default, kept by the scientist" : "scientist (setup)", reason: str(e.data.how) });
    } else {
      const k = str(e.data.key);
      const by = str(e.data.by);
      rows.set(k, { label: p.labels.get(k) ?? k, value: e.data.new, by: by === "human" ? "scientist" : by || "not recorded", reason: str(e.data.reason) });
    }
  }
  return [...rows.values()].filter((r) => r.label !== "question");
}

function definitions(plan: Record<string, unknown>): [string, string, string][] {
  const src = plan.definitions ?? plan.measures;
  if (src && typeof src === "object" && !Array.isArray(src)) return Object.entries(src).map(([k, v]) => [k, str(typeof v === "object" ? pick(rec(v), "definition", "text", "meaning") : v), str(rec(v).unit)]);
  return arr(src).map((x) => {
    const o = rec(x);
    return [str(pick(o, "measure", "name", "term", "key")), str(pick(o, "definition", "text", "meaning", "how")), str(o.unit)] as [string, string, string];
  }).filter((r) => r[0] || r[1]);
}

function exclusions(plan: Record<string, unknown>): [string, string, string][] {
  const items = arr(plan.exclusions);
  return items.map((x) => {
    const o = typeof x === "string" ? { rule: x } : rec(x);
    const removed = pick(o, "effect", "removed", "n_removed", "result");
    return [str(pick(o, "rule", "criterion", "exclusion", "what")), str(pick(o, "reason", "why")), str(removed) || "not recorded"] as [string, string, string];
  }).filter((r) => r[0]);
}

function programRows(p: Part): { name: string; version: string; adapter: string; adapterVersion: string; a?: LoadedAdapter }[] {
  const out = new Map<string, { name: string; version: string; adapter: string; adapterVersion: string; a?: LoadedAdapter }>();
  for (const n of p.nodes) {
    if (!n.adapter) continue;
    const a = p.adapters.find((x) => x.name === n.adapter);
    const name = a?.manifest.program.name ?? n.adapter;
    const listed = a?.manifest.program.version ?? "";
    const version = listed && (!n.programVersion || (listed.includes(n.programVersion) && listed.length > n.programVersion.length)) ? listed : n.programVersion;
    if (!out.has(name)) out.set(name, { name, version, adapter: n.adapter, adapterVersion: n.adapterVersion, a });
  }
  return [...out.values()];
}

function sectionMethods(w: Writer, p: Part, level: number, refs: References): void {
  w.head(level, "Methods");
  const progs = programRows(p);
  const sentences: string[] = [];
  refs.note(sessionCitations(p.record, p.adapters, p.steps));
  const progCite = (g: (typeof progs)[number]) => refs.cite(g.a ? programCitations(g.a) : nodeCitations(p.adapters, { adapter: g.adapter, tool: "", args: {} }).program);
  if (progs.length) {
    const named = progs.map((g) => `${g.name}${g.version ? ` version ${g.version}` : ""}${progCite(g)}`);
    sentences.push(`The analysis used ${named.join(" and ")}.`);
    const ads = [...new Set(progs.map((g) => `${g.adapter} ${g.adapterVersion}`))];
    sentences.push(`Cuvette ${CUVETTE_VERSION}${refs.cite([cuvetteRef(CUVETTE_VERSION)])} ran the program steps through the ${ads.join(" and ")} adapter${ads.length === 1 ? "" : "s"} and kept a record of each step.`);
  } else sentences.push(`Cuvette ${CUVETTE_VERSION}${refs.cite([cuvetteRef(CUVETTE_VERSION)])} kept the record of this session.${p.nodes.length ? "" : " The record has no analysis steps."}`);
  const stale = p.record.stale();
  const scripts = p.nodes.filter((n) => !n.adapter).map((n) => p.steps.get(n.id));
  if (scripts.length) sentences.push(`${scripts.length === 1 ? "Step" : "Steps"} ${scripts.join(", ")} ran ${scripts.length === 1 ? "a script" : "scripts"} that the agent wrote. Appendix A has the code.`);
  for (const n of p.nodes) {
    let m = fillTemplate(methodsSentence(p.adapters, n), rec(n.result));
    if (looksLikeCode(m) || /\{[\w.]+\}/.test(m)) m = n.summary || n.tool;
    const cites = stale.has(n.id) ? "" : refs.cite(nodeCitations(p.adapters, n).methods);
    sentences.push(`Step ${p.steps.get(n.id)} (${n.tool}): ${sentence(m).replace(/\.$/, `${cites}.`)}`);
  }
  const rows = decisionRows(p);
  const by = (who: RegExp) => rows.filter((r) => who.test(r.by)).map((r) => `${r.label.replace(/\?$/, "")} = ${show(r.value)}`);
  const sci = by(/^scientist/);
  const agent = by(/^agent/);
  const kept = by(/^default/);
  if (sci.length) sentences.push(`The scientist chose these settings: ${sci.join("; ")}.`);
  if (agent.length) sentences.push(`The agent chose these settings: ${agent.join("; ")}.`);
  if (kept.length) sentences.push(`The scientist kept the default for: ${kept.join("; ")}.`);
  w.add(`<p class="methods">${esc(sentences.join(" "))}</p>`);
  if (rows.length) w.table("Settings and decisions, with the person who chose each one.", ["Decision", "Value", "Chosen by", "Reason or route"], rows.map((r) => [r.label, r.value, r.by, r.reason]));
  const plan = confirmedPlan(p.record).plan;
  const defs = definitions(plan);
  const unit = defs.some((d) => d[2]);
  if (defs.length) w.table("Definitions of each measure.", unit ? ["Measure", "Definition", "Unit"] : ["Measure", "Definition"], defs.map((d) => (unit ? d : d.slice(0, 2))));
  const ex = exclusions(plan);
  const why = ex.some((x) => x[1]);
  if (ex.length) w.table("Exclusions and their effect on the data.", why ? ["Exclusion", "Reason", "Effect"] : ["Exclusion", "Effect"], ex.map((x) => (why ? x : [x[0], x[2]])));
}

function sectionPilot(w: Writer, p: Part, level: number): void {
  const runs = p.record.entries(["pilot_run"]);
  const v = validationRows(p.record);
  const ref = p.record.entries(["reference"]).filter((e) => e.data.mode !== "none" && !e.data.revealed).at(-1);
  if (!runs.length && !v) return;
  w.head(level, "Pilot and validation");
  const status = new Map<number, Entry>();
  for (const e of p.record.entries(["pilot_approved", "pilot_rejected"])) status.set(Number(e.data.run), e);
  if (ref) w.p(`Reference: ${str(ref.data.path)}${ref.data.sheet ? `, sheet ${str(ref.data.sheet)}` : ""}. ${ref.data.mode === "blind" ? "The harness held the reference back from the agent until all samples were done (blind comparison)." : "The pilot compared its values with this reference."}`);
  runs.forEach((e, i) => {
    const d = e.data;
    const st = status.get(e.id);
    const verdict = !st ? "The record has no decision on this pilot." : st.kind === "pilot_approved" ? `The scientist approved this pilot on ${time(st.ts)}.` : `The scientist did not approve this pilot (${str(st.data.reason) || "no reason given"}).`;
    w.p(`Pilot run ${i + 1} on ${time(e.ts)}. Pilot sample: ${str(d.sample)}. ${verdict}`);
    const comparison = arr(d.comparison).map(str).filter(Boolean);
    if (comparison.length) w.add(`<p>Comparison with the reference:</p><ul>${comparison.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>`);
    if (d.check) w.p(`The agent's check: ${sentence(str(d.check))}`);
    arr(d.images).forEach((img, k) => {
      const src = imageSrc(p.record, img);
      p.shown.add(basename(str(img)));
      if (src) w.figure(src, `Quality-control image ${k + 1} of the pilot sample ${str(d.sample)}, run ${i + 1}. The scientist looked at this image before the decision on the pilot. n = 1 sample. Error bars: none, this image is not a plot.`);
    });
  });
  const pr = pilotRows(p.record);
  if (pr.rows.length) w.table("Pilot results: each measure on the pilot sample, with its definition, the reference value and the decision.", pr.columns.slice(0, 7), pr.rows.map((r) => r.slice(0, 7)));
  if (v) {
    if (v.summary.length) w.add(`<p>Comparison of every sample with the reference:</p><ul>${v.summary.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`);
    w.table("Each sample: the agent's value, the reference value and the difference.", v.columns, v.rows);
    const src = v.plot ? fileUri(v.plot) : undefined;
    if (v.plot) p.shown.add(basename(v.plot));
    if (src) w.figure(src, `Bland-Altman plot of the agent's values against the reference. Each dot is one sample: the mean of the two values (across) against the agent minus the reference (up). n = ${v.rows.length} samples. The solid line is the mean difference. The dashed lines are the mean plus and minus 1.96 SD (limits of agreement); the plot has no error bars. The gray dot is the pilot sample.`);
  }
}

export function errorBars(n: Node): string {
  for (const [k, v] of Object.entries(n.args)) if (/err|error_?bar|^ci$|interval/i.test(k) && v !== undefined && v !== "" && typeof v !== "boolean") return show(v);
  const m = rec(rec(n.result).data);
  const eb = pick(m, "error_bars", "error_bar", "errorbar");
  if (eb) return show(eb);
  return /plot|chart|graph|bar|box|hist|volcano|curve|scatter|figure/i.test(`${n.tool} ${Object.keys(n.args).join(" ")}`) ? "" : "none, this image is not a plot";
}

function figureCaption(p: Part, n: Node, name: string): string {
  const step = p.steps.get(n.id);
  const title = str(pick(n.args, "title", "caption")) || name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  const ns = sizes(n).map(([k, v]) => `${k} = ${show(v)}`);
  const eb = errorBars(n);
  return [
    `${title.charAt(0).toUpperCase()}${title.slice(1).replace(/\.$/, "")}.`,
    `Step ${step} (${n.tool}): ${clip(n.summary || n.tool, 200).replace(/\.$/, "")}.`,
    ns.length ? `n: ${ns.join(", ")}.` : "n: the record does not give n for this figure.",
    eb ? `Error bars: ${eb}.` : "Error bars: the record does not give an error bar type.",
  ].join(" ");
}

function nodeImages(p: Part, n: Node): { src?: string; name: string; tiff: boolean }[] {
  const seen = new Set<string>();
  const out: { src?: string; name: string; tiff: boolean }[] = [];
  const shown = n.outputs.filter((o) => o.kind === "image" || /\.(png|jpe?g|gif|webp|svg|tiff?)$/i.test(o.path));
  const stems = new Set(shown.filter((o) => !/\.svg$/i.test(o.path)).map((o) => o.path.replace(/\.[^.]+$/, "")));
  for (const o of shown) {
    if (/\.svg$/i.test(o.path) && stems.has(o.path.replace(/\.[^.]+$/, ""))) continue;
    const key = o.sha ?? o.path;
    if (seen.has(key)) continue;
    seen.add(key);
    const tiff = /\.tiff?$/i.test(o.path);
    out.push({ src: tiff ? undefined : (o.sha ? dataUri(p.record, o.sha) : undefined) ?? fileUri(o.path), name: o.name ?? basename(o.path), tiff });
  }
  return out;
}

const plainMd = (s: string) => s.replace(/\*\*?|`|^#+\s*|^\s*[-*]\s+/gm, "").trim();

function labelNumber(c: Claim): boolean {
  if (c.value === null || !Number.isInteger(c.value) || Math.abs(c.value) > 9) return false;
  return new RegExp(`\\b[A-Za-z]{3,}\\s+${c.value}(?![.\\d])`).test(plainMd(c.text));
}

function answerClaims(claims: Claim[]): Claim[] {
  const seen = new Set<string>();
  return claims.filter((c) => {
    if (!c || typeof c !== "object" || c.value === null || labelNumber(c)) return false;
    const key = `${c.value}|${c.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function linkedAnswer(p: Part, text: string, claims: Claim[]): string {
  const found = extractNumbers(text);
  const taken = new Set<number>();
  const marks: { pos: number; tag: string }[] = [];
  for (const c of claims) {
    if (c.value === null) continue;
    const i = found.findIndex((f, k) => !taken.has(k) && f.value === c.value && c.text.includes(text.slice(f.start, f.end).trim()));
    if (i < 0) continue;
    taken.add(i);
    const step = c.node ? p.steps.get(c.node) : undefined;
    marks.push({ pos: found[i]!.end, tag: step ? `@@STEP${step}@@` : c.label === "unsourced" ? "@@NOSOURCE@@" : "" });
  }
  let out = text;
  for (const m of marks.filter((x) => x.tag).sort((a, b) => b.pos - a.pos)) out = out.slice(0, m.pos) + ` ${m.tag}` + out.slice(m.pos);
  return renderMarkdown(out)
    .replace(/@@STEP(\d+)@@/g, (_, s) => `<sup>[${stepLink(p, Number(s))}]</sup>`)
    .replace(/@@NOSOURCE@@/g, "<sup>[no source]</sup>");
}

function sectionResults(w: Writer, p: Part, level: number): void {
  w.head(level, "Results");
  const used = new Set<string>();
  const drawn = new Set<number>();
  let any = false;
  for (const n of p.nodes) {
    const step = p.steps.get(n.id)!;
    const t = rec(rec(n.result).table);
    if (arr(t.columns).length) {
      any = true;
      const rows = arr(t.rows) as unknown[][];
      const total = typeof t.n_rows === "number" ? t.n_rows : rows.length;
      const note = total > Math.min(rows.length, MAX_ROWS) ? `The table shows ${Math.min(rows.length, MAX_ROWS)} of ${total} rows.${t.path ? ` The full table is in ${str(t.path)}.` : ""}` : "";
      w.table(`${clip(n.summary || n.tool, 200).replace(/\.$/, "")}. Step ${step} (${n.tool}).`, arr(t.columns).map(str), rows.slice(0, MAX_ROWS), note);
    }
    for (const img of nodeImages(p, n)) {
      used.add(img.name);
      drawn.add(step);
      any = true;
      if (img.src) w.figure(img.src, figureCaption(p, n, img.name));
      else w.p(`Step ${step} made the image ${img.name}. ${img.tiff ? "The data book does not show TIFF images." : "The image file is not on this computer."}`);
    }
  }
  const figDir = p.outDir ? join(p.outDir, "figures") : "";
  if (figDir && existsSync(figDir)) {
    const stepOf = (f: string) => Number(/^step(\d+)-/.exec(f)?.[1] ?? 0);
    const files = readdirSync(figDir).filter((f) => /\.(png|jpe?g|svg)$/i.test(f) && !used.has(f) && !p.shown.has(f) && !drawn.has(stepOf(f))).sort();
    const pngStems = new Set(files.filter((f) => !/\.svg$/i.test(f)).map((f) => f.replace(/\.[^.]+$/, "")));
    for (const f of files.filter((x) => !/\.svg$/i.test(x) || !pngStems.has(x.replace(/\.[^.]+$/, "")))) {
      const src = fileUri(join(figDir, f));
      if (!src) continue;
      any = true;
      const node = p.nodes.find((n) => p.steps.get(n.id) === stepOf(f));
      w.figure(src, node ? `${figureCaption(p, node, f.replace(/^step\d+-/, ""))} File figures/${f}.` : `${f.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ")}. File figures/${f}. The record does not link this figure to one step, so n and the error bar type are not given here.`);
    }
  }
  const xlsx = p.outDir ? join(p.outDir, "results.xlsx") : "";
  if (xlsx && isFile(xlsx)) w.p(`The workbook results.xlsx has each result table in full (SHA-256 ${sha256File(xlsx)}).`);
  if (!any) w.p("The steps made no tables or figures.");
  const final = p.record.entries(["assistant"]).filter((e) => e.data.final).at(-1);
  if (!final) {
    w.p("The session has no final answer.");
    return;
  }
  const check = p.record.entries(["claim_check"]).filter((e) => !e.data.answerEntry || Number(e.data.answerEntry) <= final.id).at(-1);
  const claims = answerClaims(arr(check?.data.claims) as Claim[]);
  w.head(level + 1, "Final answer");
  w.add(`<div class="answer">${linkedAnswer(p, str(final.data.text), claims)}</div>`);
  if (final.data.assumed) w.add(`<div class="answer harness"><p><em>Text of the harness, not of the model:</em></p><pre>${esc(str(final.data.assumed))}</pre></div>`);
  const numbered = claims;
  if (numbered.length) {
    const source = (c: Claim) => (c.node && p.steps.has(c.node) ? stepLink(p, p.steps.get(c.node)!) : c.label === "unsourced" ? "no source" : esc(c.label));
    w.table("Each number in the final answer and the step that it comes from.", ["Number", "Source", "Sentence"], numbered.map((c) => [cell(c.value), source(c), esc(clip(plainMd(c.text), 160))]), "", true);
  }
}

function findingRows(r: AnalysisRecord): unknown[][] {
  const res = new Map<string, string>();
  for (const e of r.entries(["finding_resolution"])) res.set(str(e.data.fid), `${str(e.data.action)}${e.data.reason ? `: ${str(e.data.reason)}` : ""}`);
  return r.entries(["finding"]).map((e) => [str(e.data.fid), str(e.data.severity), str(e.data.source), str(e.data.message), res.get(str(e.data.fid)) ?? (str(e.data.status) === "open" ? "open, no resolution recorded" : str(e.data.status))]);
}

function sectionChecks(w: Writer, p: Part, level: number): void {
  w.head(level, "Checks");
  const findings = findingRows(p.record);
  if (findings.length) w.table("Review findings and their resolution.", ["ID", "Severity", "Source", "Finding", "Resolution"], findings);
  const devs = p.record.entries(["deviation"]).flatMap((e) => arr(e.data.deviations).map((x) => {
    const d = rec(x);
    return [str(e.data.tool), str(d.arg), show(d.setup), show(d.requested ?? d.used), show(d.used), d.overwritten ? "The harness used the recorded value." : "The step used a different value."];
  }));
  if (devs.length) w.table("Deviations from the recorded settings.", ["Tool", "Argument", "Recorded value", "Asked for", "Used", "What happened"], devs);
  const blocked = p.record.entries(["blocked"]);
  if (blocked.length) w.add(`<p>The harness withheld or blocked ${plural(blocked.length, "call")}:</p><ul>${blocked.map((e) => `<li>${esc(str(e.data.tool))}: ${esc(str(e.data.reason))}</li>`).join("")}</ul>`);
  const stale = stepStatus(p.record).filter((x) => !x.current);
  if (stale.length) w.add(`<p>These steps are out of date:</p><ul>${stale.map((x) => `<li>${stepLink(p, x.step)}: ${esc(x.reasons.map((r) => r.text).join(" "))}</li>`).join("")}</ul>`);
  const changes = reruns(p.record);
  for (const d of changes) {
    const rows = d.rows.filter((r) => r.change !== 0);
    if (rows.length) w.table(`Step ${d.step} repeats step ${d.oldStep}. ${d.reasons.join(" ")} The numbers that changed.`, ["Number", "Before", "After", "Change"], rows.slice(0, 40).map((r) => [r.name, num(r.before), num(r.after), changeCell(r)]), rows.length > 40 ? `The table shows 40 of ${rows.length} numbers. The Changes sheet of results.xlsx has all of them.` : "");
  }
  const check = p.record.entries(["claim_check"]).at(-1);
  if (check) {
    const cl = arr(check.data.claims) as Claim[];
    const count = (l: string) => cl.filter((c) => c.label === l).length;
    w.p(`The number check of the final answer found ${count("measured")} numbers from the steps, ${count("inferred")} inferred, ${count("literature")} from the literature and ${count("unsourced")} with no source.`);
  }
  if (!findings.length && !devs.length && !blocked.length && !stale.length && !changes.length && !check) w.p("The record has no findings, deviations or warnings.");
}

function sectionManual(w: Writer, p: Part, level: number): void {
  w.head(level, "Manual route");
  if (!p.nodes.length) return w.p("The session has no steps to repeat.");
  w.p("Do these steps in order to repeat the analysis by hand. Use the input files in the Data section.");
  const items = p.nodes.map((n) => {
    const lines = stepLines(p.adapters, n);
    const [first, ...rest] = lines;
    return `<li><b>${esc(clip(n.summary || n.tool, 200))}</b><div class="route">${esc(first ?? "")}</div>${rest.length ? `<ul>${rest.map((l) => `<li>${esc(l.replace(/^-\s*/, ""))}</li>`).join("")}</ul>` : ""}</li>`;
  });
  w.add(`<ol class="manual">${items.join("")}</ol>`);
}

// ---------------------------------------------------------------- appendix

function appendixSteps(w: Writer, p: Part, level: number): void {
  if (!p.all.length) return w.p("The session has no steps.");
  for (const n of p.all) {
    const step = p.steps.get(n.id);
    const title = step ? `Step ${step}` : `Comparison run ${n.id}`;
    const outs = n.outputs.map((o) => `${o.name ?? basename(o.path)}${o.sha ? ` (${o.sha})` : ""}`);
    const kv: [string, string][] = [
      ["Tool", `${n.tool} (adapter ${n.adapter} ${n.adapterVersion}, program ${n.programVersion || "version not recorded"})`],
      ["Node and time", `${n.id}, ${time(n.ts)}`],
      ["Summary", n.summary],
      ["Input hashes", n.inputHashes.join(", ") || "none"],
      ["Outputs", outs.join("; ") || "none"],
      ["Code hash", n.codeHash],
    ];
    const env = n.envHash ? p.record.environment(n.envHash) : undefined;
    if (env) kv.push(["Environment", `${env.name}${env.language ? `, ${env.language}` : ""}, ${env.kind === "program" ? "program version only" : `${env.packages.length} packages`}, lock ${env.hash.slice(0, 12)}`]);
    if (n.sensitivityOf) kv.push(["Comparison for", n.sensitivityOf]);
    w.add(`<div class="step" id="${step ? anchor(p, step) : `p${p.k}-${n.id}`}"><h${Math.min(level + 2, 6)}>${esc(title)}: ${esc(n.tool)}</h${Math.min(level + 2, 6)}><dl>${kv.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}<dt>Arguments</dt><dd><pre>${esc(JSON.stringify(n.args, null, 1))}</pre></dd></dl></div>`);
  }
}

function sessionFacts(r: AnalysisRecord) {
  const s = r.entries(["session"])[0]?.data ?? {};
  const ads = [...arr(s.adapters), ...r.entries(["adapter"]).map((e) => e.data)].map(rec);
  return {
    adapters: [...new Set(ads.map((a) => `${str(a.name)} ${str(a.version)} (program ${str(a.programVersion) || "version not recorded"})`))].join("; ") || "none",
    model: str(s.modelSpec ?? s.model) || "not recorded",
    referee: str(s.referee) === "same" ? `same as the model (${str(s.model)})` : str(s.referee) || "not recorded",
    mode: str(s.mode),
  };
}

// ---------------------------------------------------------------- the book

export interface BookInput {
  records: AnalysisRecord[];
  project: string;
  author?: string;
  paper: Paper;
  date?: string;
  outDirs?: (string | undefined)[];
  citationStyle?: CitationStyle;
}

export interface Book {
  html: string;
  toc: TocItem[];
  figures: number;
  tables: number;
}

const CSS = (paper: Paper, header: string) => `
@page{size:${paper === "letter" ? "letter" : "A4"};margin:22mm 18mm 20mm 20mm;
@top-left{content:"${header}";font:8pt Helvetica,Arial,sans-serif;color:#444}
@top-right{content:"Data book";font:8pt Helvetica,Arial,sans-serif;color:#444}
@bottom-center{content:"Page " counter(page) " of " counter(pages);font:8pt Helvetica,Arial,sans-serif;color:#444}}
@page:first{@top-left{content:none}@top-right{content:none}}
:root{color-scheme:light}
*{box-sizing:border-box}
html{background:#fff}
body{margin:0 auto;max-width:180mm;padding:12mm 4mm;color:#000;background:#fff;font:10.5pt/1.45 Georgia,"Times New Roman",serif}
h1,h2,h3,h4,h5,caption,figcaption,th,.title-page dt,.note{font-family:Helvetica,Arial,sans-serif}
h1{font-size:22pt;margin:0 0 6mm}
h2{font-size:14pt;margin:9mm 0 3mm;padding-bottom:1mm;border-bottom:1.5pt solid #000;break-after:avoid}
h3{font-size:12pt;margin:6mm 0 2mm;break-after:avoid}
h4,h5{font-size:10.5pt;margin:4mm 0 1mm;break-after:avoid}
.num{display:inline-block;min-width:9mm}
section.session{break-before:page}
section.session:first-of-type{break-before:auto}
.title-page{min-height:230mm;display:flex;flex-direction:column;justify-content:center;break-after:page}
.title-page .kind{font:600 11pt Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;margin:0 0 2mm}
.title-page dl{display:grid;grid-template-columns:38mm 1fr;gap:2mm 4mm;margin:6mm 0 0}
.title-page dd{margin:0}
.title-page ol{margin:0;padding-left:5mm}
nav.contents{break-after:page}
nav.contents ol{list-style:none;padding:0;margin:0}
nav.contents li{margin:1mm 0}
nav.contents li.l2{padding-left:9mm}
nav.contents li.l3{padding-left:18mm;font-size:9.5pt}
nav.contents a{color:#000;text-decoration:none}
a{color:#000}
table{border-collapse:collapse;width:100%;margin:2mm 0 4mm;font-size:8.5pt;line-height:1.3}
caption{caption-side:top;text-align:left;font-size:9pt;padding:0 0 1.5mm}
thead{display:table-header-group}
tr,figure,.step,.answer{break-inside:avoid}
th,td{border:.6pt solid #555;padding:1mm 1.5mm;text-align:left;vertical-align:top;overflow-wrap:anywhere}
th{background:#e6e6e6;font-weight:600}
td.s,th.s{white-space:nowrap}
table.wide{font-size:7pt}
table.wide th,table.wide td{padding:.6mm .8mm}
code,pre,.hash{font-family:Menlo,Consolas,monospace;font-size:7.5pt}
.hash{word-break:break-all}
pre{white-space:pre-wrap;word-break:break-word;margin:0;border:.5pt solid #999;padding:1.5mm;background:#f4f4f4}
figure{margin:3mm 0 5mm;text-align:center}
figure img{max-width:100%;max-height:150mm;height:auto;border:.5pt solid #999}
figcaption{text-align:left;font-size:9pt;margin-top:1.5mm}
.plan{white-space:pre-wrap;border-left:2pt solid #000;padding:1mm 0 1mm 4mm;margin:2mm 0 4mm;font-size:9.5pt}
.answer{border:1pt solid #000;padding:1mm 4mm;margin:2mm 0 4mm}
.answer h3,.answer h4,.answer h5{font-size:10.5pt}
.note{font-size:8.5pt;color:#333;margin:-2mm 0 4mm}
ol.manual>li{margin:0 0 2.5mm}
.route{font-family:Menlo,Consolas,monospace;font-size:8pt;white-space:pre-wrap}
.step{border-top:.5pt solid #999;padding-top:1mm;margin-top:2mm}
.step dl{display:grid;grid-template-columns:30mm 1fr;gap:.5mm 3mm;margin:1mm 0;font-size:9pt}
.step dd{margin:0;overflow-wrap:anywhere}
.step dt{font-family:Helvetica,Arial,sans-serif;font-size:8.5pt;color:#333}
sup{font-size:7pt}
@media print{body{max-width:none;padding:0}}
`;

export function buildDatabook(input: BookInput): Book {
  const w = new Writer();
  const refs = new References(input.citationStyle ?? "apa");
  const single = input.records.length === 1;
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const project = basename(input.project) || input.project;
  const parts: Part[] = input.records.map((record, k) => {
    const entries = record.entries();
    const adapters = loadAdapters(entries);
    const nodes = mainNodes(record);
    return { k: k + 1, record, adapters, labels: labelMap(entries, adapters, undefined), nodes, all: record.nodes(), steps: stepNumbers(record.nodes()), outDir: input.outDirs?.[k], shown: new Set<string>() };
  });
  const L = single ? 1 : 2;
  for (const p of parts) {
    if (!single) {
      w.add(`<section class="session">`);
      w.head(1, `Session ${ownerOf(p.record.entries()) || p.k}: ${sessionTitle(p.record)}`);
    }
    sectionQuestion(w, p, L);
    sectionData(w, p, L);
    sectionDataCheck(w, p, L + 1);
    sectionMethods(w, p, L, refs);
    sectionPilot(w, p, L);
    sectionResults(w, p, L);
    sectionChecks(w, p, L);
    sectionManual(w, p, L);
    if (!single) w.add(`</section>`);
  }
  w.head(1, "References");
  const cited = refs.citations();
  w.add(referencesHtml(cited, refs.style, "h2").replace(/^<h2 id="references">References<\/h2>\n/, ""));

  w.add(`<section class="session">`);
  w.startAppendix();
  w.head(1, "Steps and arguments");
  for (const p of parts) {
    if (!single) w.head(2, `Session ${ownerOf(p.record.entries())}`);
    appendixSteps(w, p, single ? 1 : 2);
  }
  w.head(1, "Software environment");
  w.table(
    "Programs, adapters and models. The values come from the record. The Cuvette, Node.js and system rows describe the computer that made this data book.",
    ["Session", "Adapters and programs", "Model", "Referee model"],
    parts.map((p) => {
      const f = sessionFacts(p.record);
      return [ownerOf(p.record.entries()), f.adapters, f.model, f.referee];
    }),
  );
  for (const p of parts) {
    for (const e of envsUsed(p.record).filter((x) => x.kind !== "program")) {
      const where = `${single ? "" : `Session ${ownerOf(p.record.entries()) || p.k}, `}environment ${e.name}`;
      w.table(`Package versions: ${where} (${e.language}, ${e.path}). Lock hash ${e.hash}.`, ["Package", "Version"], e.packages.map((x) => [x.name, x.version]));
    }
  }
  w.p(`This data book was made with Cuvette ${CUVETTE_VERSION}, Node.js ${process.version}, on ${platform()} ${release()}.`);
  w.head(1, "Record files");
  w.table(
    "The record file of each session and its SHA-256 hash. Compute the hash of the record file to check this book against the record.",
    ["Session", "Record file", "SHA-256", "Entries", "First and last entry"],
    parts.map((p) => {
      const e = p.record.entries();
      return [esc(ownerOf(e)), esc(p.record.logPath), `<code class="hash">${esc(sha256File(p.record.logPath) ?? "")}</code>`, String(e.length), esc(`${time(e[0]?.ts)} to ${time(e.at(-1)?.ts)}`)];
    }),
    "",
    true,
  );
  const earlier = parts.flatMap((p) => confirmedPlan(p.record).earlier.map((e) => ({ p, e })));
  if (earlier.length) {
    w.head(1, "Earlier versions of the analysis");
    for (const { p, e } of earlier) {
      const what = (e.kind as string) === "plan_approved" ? "confirmed" : "proposed";
      w.add(`<h4>${single ? "" : `Session ${esc(ownerOf(p.record.entries()))}, `}version ${esc(str(e.data.version))}, ${what} on ${esc(time(e.ts))}</h4><div class="plan">${esc(str(e.data.full ?? e.data.text))}</div>`);
    }
  }
  w.add(`</section>`);

  const questions = parts.map((p) => firstQuestion(p.record)).filter(Boolean);
  const days = parts.map((p) => p.record.entries()[0]?.ts.slice(0, 10) ?? "").filter(Boolean).sort();
  const dates = days.length ? (days[0] === days.at(-1) ? days[0]! : `${days[0]} to ${days.at(-1)}`) : "not recorded";
  const title = `<section class="title-page"><p class="kind">Data book</p><h1>${esc(project)}</h1><dl>
<dt>Project folder</dt><dd>${esc(input.project)}</dd>
<dt>${questions.length > 1 ? "Questions" : "Question"}</dt><dd>${questions.length > 1 ? `<ol>${questions.map((q) => `<li>${esc(clip(q, 300))}</li>`).join("")}</ol>` : esc(clip(questions[0] ?? "not recorded", 600))}</dd>
<dt>Author</dt><dd>${esc(input.author || "not recorded")}</dd>
<dt>Analysis dates</dt><dd>${esc(dates)}</dd>
<dt>Made on</dt><dd>${esc(date)}</dd>
<dt>Sessions</dt><dd>${parts.length}</dd>
<dt>Cuvette version</dt><dd>${esc(CUVETTE_VERSION)}</dd>
</dl></section>`;
  const contents = `<nav class="contents"><h2>Contents</h2><ol>${w.toc.map((t) => `<li class="l${t.level}"><a href="#${t.id}">${esc(t.num)}&nbsp;&nbsp;${esc(t.title)}</a></li>`).join("")}</ol></nav>`;
  const header = `${project} · ${date}`.replace(/["\\]/g, "\\$&");
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Data book ${esc(project)}</title><style>${CSS(input.paper, header)}</style></head>
<body>
${title}
${contents}
${w.out.join("\n")}
</body></html>
`;
  return { html, toc: w.toc, figures: w.fig, tables: w.tab };
}

// ---------------------------------------------------------------- finding the sessions

function sessionIdOf(dir: string): string {
  const place = placeAt(dir);
  if (place) return place.id;
  try {
    const first = readFileSync(join(dir, "log.jsonl"), "utf8").split("\n", 1)[0]!;
    return String(JSON.parse(first).session ?? basename(dir));
  } catch {
    return basename(dir);
  }
}

interface Found {
  recordDir: string;
  outDir: string;
  project: string;
  inProject: boolean;
}

function sessionCwd(dir: string): string | undefined {
  try {
    const first = JSON.parse(readFileSync(join(dir, "log.jsonl"), "utf8").split("\n", 1)[0]!);
    const cwd = first.kind === "session" ? first.data?.cwd : undefined;
    return typeof cwd === "string" && isAbsolute(cwd) ? cwd : undefined;
  } catch {
    return undefined;
  }
}

const real = (p: string) => {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
};

function hasContent(dir: string): boolean {
  try {
    return /"kind":\s*"(user|node)"/.test(readFileSync(join(dir, "log.jsonl"), "utf8"));
  } catch {
    return false;
  }
}

export function foundAt(recordDir: string): Found | undefined {
  if (!existsSync(join(recordDir, "log.jsonl"))) return undefined;
  const place = placeAt(recordDir);
  if (place) return { recordDir, outDir: place.outDir, project: place.project, inProject: inProject(place) };
  if (basename(recordDir) === ".record") {
    const outDir = dirname(recordDir);
    const cwd = sessionCwd(recordDir);
    return { recordDir, outDir, project: cwd && existsSync(cwd) ? cwd : dirname(dirname(outDir)), inProject: true };
  }
  return { recordDir, outDir: join(recordDir, "exports"), project: sessionCwd(recordDir) ?? dirname(recordDir), inProject: false };
}

export function openRecord(f: Found): AnalysisRecord {
  const places = basename(f.recordDir) === ".record" ? { workDir: f.outDir, exportDir: f.outDir, project: f.inProject ? f.project : undefined } : {};
  return new AnalysisRecord(f.recordDir, sessionIdOf(f.recordDir), places);
}

function outputFolder(project: string): string {
  return outputRoot(project, str(resolveSetting(find("output_folder")!, { cwd: project }).value) || "cuvette");
}

export function projectSessions(project: string, ids?: string[]): Found[] {
  const out = new Map<string, Found>();
  const me = real(project);
  const add = (recordDir: string) => {
    const f = foundAt(recordDir);
    if (f && real(f.project) === me && !out.has(sessionIdOf(recordDir))) out.set(sessionIdOf(recordDir), f);
  };
  const root = outputFolder(project);
  if (existsSync(root))
    for (const d of readdirSync(root)) if (!d.startsWith(".new-") && !lstatSync(join(root, d)).isSymbolicLink()) add(join(root, d, ".record"));
  for (const r of readIndex()) if (real(r.project) === me) add(join(r.folder, ".record"));
  const home = join(cuvetteHome(), "sessions");
  if (existsSync(home)) for (const d of readdirSync(home)) add(join(home, d));
  const pickIds = ids?.filter((x) => x && x !== "all");
  return [...out.entries()]
    .filter(([id, f]) => (pickIds?.length ? pickIds.some((x) => id === x || basename(f.outDir) === x || id.startsWith(x)) : hasContent(f.recordDir)))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, f]) => f);
}

export interface BookTarget {
  project: string;
  found: Found[];
  outDir: string;
  base: string;
  projectLevel: boolean;
}

export function resolveTarget(target: string | undefined, cwd: string, ids?: string[]): BookTarget {
  const p = resolve(cwd, (target ?? ".").replace(/^~(?=\/|$)/, process.env.HOME ?? "~"));
  const byId = target && !target.includes("/") ? (readIndex().find((r) => r.id === target)?.folder ?? (existsSync(join(cuvetteHome(), "sessions", target)) ? join(cuvetteHome(), "sessions", target) : undefined)) : undefined;
  const one = foundAt(p) ?? foundAt(join(p, ".record")) ?? (byId ? (foundAt(byId) ?? foundAt(join(byId, ".record"))) : undefined);
  if (one) return { project: one.project, found: [one], outDir: one.outDir, base: "databook", projectLevel: false };
  if (!existsSync(p) || !statSync(p).isDirectory()) throw new Error(`${p} is not a session folder or a project folder.`);
  const found = projectSessions(p, ids);
  if (!found.length) throw new Error(`No sessions found for the project folder ${p}. Give a session folder, or start a session in this folder.`);
  return { project: p, found, outDir: outputFolder(p), base: `databook-${new Date().toISOString().slice(0, 10)}`, projectLevel: true };
}

// ---------------------------------------------------------------- author and paper

export function gitAuthor(cwd: string): string | undefined {
  const r = spawnSync("git", ["config", "user.name"], { cwd: existsSync(cwd) ? cwd : undefined, encoding: "utf8", timeout: 5000 });
  return !r.error && r.status === 0 && r.stdout.trim() ? r.stdout.trim() : undefined;
}

export function bookSettings(cwd: string): { author?: string; authorFrom: "setting" | "git" | ""; paper: Paper; style: CitationStyle } {
  const ctx = { cwd };
  const a = str(resolveSetting(find("databook_author")!, ctx).value);
  const paper = str(resolveSetting(find("databook_paper")!, ctx).value) === "letter" ? "letter" : "a4";
  const style = citationStyle(resolveSetting(find("citation_style")!, ctx).value);
  if (a) return { author: a, authorFrom: "setting", paper, style };
  const g = gitAuthor(cwd);
  return { author: g, authorFrom: g ? "git" : "", paper, style };
}

// ---------------------------------------------------------------- output

export function pdfPages(path: string): number {
  const text = readFileSync(path).toString("latin1");
  return (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
}

export interface WriteOptions {
  target?: string;
  cwd: string;
  sessions?: string[];
  formats?: BookFormat[];
  author?: string;
  paper?: Paper;
  citationStyle?: CitationStyle;
}

export interface Written {
  html: string;
  pdf?: string;
  docx?: string;
  pages?: number;
  toc: TocItem[];
  figures: number;
  tables: number;
  sessions: number;
  notes: string[];
}

function run(cmd: string, args: string[], cwd: string, timeoutMs: number, doneWhen?: RegExp): Promise<{ ok: boolean; err: string }> {
  return new Promise((done) => {
    const child = spawn(cmd, args, { cwd, stdio: ["ignore", "ignore", "pipe"], detached: process.platform !== "win32" });
    let err = "";
    let finished = false;
    const stop = (ok: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try {
        if (child.pid && process.platform !== "win32") process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch {}
      done({ ok, err });
    };
    child.stderr.on("data", (d) => {
      err += String(d);
      if (doneWhen?.test(err)) stop(true);
    });
    const timer = setTimeout(() => stop(false), timeoutMs);
    child.on("error", (e) => {
      err += e.message;
      stop(false);
    });
    child.on("exit", (code) => stop(code === 0));
  });
}

export async function printPdf(html: string, pdf: string): Promise<string | undefined> {
  const chrome = findChrome();
  if (!chrome) return "No PDF: Google Chrome or Chromium is not installed. Open the HTML file and print it from a browser.";
  const tmp = mkdtempSync(join(tmpdir(), "cuvette-databook-"));
  try {
    rmSync(pdf, { force: true });
    for (let attempt = 1; attempt <= 2; attempt++) {
      const args = [
        "--headless", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-background-networking",
        "--use-mock-keychain", "--password-store=basic", `--user-data-dir=${join(tmp, `profile-${attempt}`)}`, "--no-pdf-header-footer", `--print-to-pdf=${pdf}`, html,
      ];
      await run(chrome, args, dirname(html), 45000, /bytes written to file/);
      if (existsSync(pdf) && statSync(pdf).size > 0) return undefined;
    }
    return "No PDF: Chrome did not write the file.";
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export async function writeDatabook(o: WriteOptions): Promise<Written> {
  const t = resolveTarget(o.target, o.cwd, o.sessions);
  const records = t.found.map(openRecord);
  const s = bookSettings(t.project);
  const book = buildDatabook({
    records,
    project: t.project,
    author: o.author ?? s.author,
    paper: o.paper ?? s.paper,
    citationStyle: o.citationStyle ?? s.style,
    outDirs: t.found.map((f) => (basename(f.recordDir) === ".record" ? f.outDir : undefined)),
  });
  mkdirSync(t.outDir, { recursive: true });
  const html = join(t.outDir, `${t.base}.html`);
  writeFileSync(html, book.html);
  const formats = o.formats?.length ? o.formats : ["pdf"];
  const out: Written = { html, toc: book.toc, figures: book.figures, tables: book.tables, sessions: records.length, notes: [] };
  if (formats.includes("pdf")) {
    const pdf = join(t.outDir, `${t.base}.pdf`);
    const note = await printPdf(html, pdf);
    if (note) out.notes.push(note);
    else {
      out.pdf = pdf;
      out.pages = pdfPages(pdf);
    }
  }
  if (formats.includes("docx")) {
    const pandoc = findPandoc();
    if (!pandoc) out.notes.push("No DOCX: the DOCX file needs pandoc. Install pandoc, then try again.");
    else {
      const docx = join(t.outDir, `${t.base}.docx`);
      const r = await run(pandoc, [html, "-f", "html", "-t", "docx", "-o", docx], t.outDir, 120000);
      if (r.ok && existsSync(docx)) out.docx = docx;
      else out.notes.push(`No DOCX: pandoc stopped with an error. ${clip(r.err, 200)}`);
    }
  }
  return out;
}

export function writtenLines(w: Written): string[] {
  return [
    `Data book: ${plural(w.sessions, "session")}, ${plural(w.figures, "figure")}, ${plural(w.tables, "table")}.`,
    `HTML: ${w.html}`,
    ...(w.pdf ? [`PDF: ${w.pdf} (${plural(w.pages ?? 0, "page")})`] : []),
    ...(w.docx ? [`DOCX: ${w.docx}`] : []),
    ...w.notes,
  ];
}
