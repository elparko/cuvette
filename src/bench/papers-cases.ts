import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir, hostname } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { findAdapter, type LoadedAdapter } from "../adapters/manifest.ts";
import { stepLines } from "../core/exports.ts";
import { AnalysisRecord } from "../core/record.ts";
import { costUsd } from "../core/spend.ts";
import { renderMarkdown, show } from "../core/trail.ts";
import type { Entry, Node } from "../core/types.ts";
import { modelAnswer, scoreComputed, type ComputedMatch, type ItemScore } from "./papers-score.ts";
import { figureFor, mergeResults } from "./papers-site.ts";
import { dataRoot, loadPaper, paperIds, PAPERS_DIR, resolveData, type Paper, type PaperItem } from "./papers-spec.ts";
import type { PaperRun } from "./papers.ts";

const SCIENCE_PYTHON = join(homedir(), ".cuvette/envs/science/bin/python");
const FIELD_ORDER = ["Imaging", "Flow cytometry", "Mass spectrometry and proteomics", "Genomics and transcriptomics", "Phylogenetics", "Neuroscience", "Structural biology", "Chemistry", "Statistics", "Ecology", "Astronomy", "Geospatial"];
const MAX_OUTPUT = 3000;
const SHORT_THINKING = 300;

const CaseAnswer = z.object({ decision: z.string(), value: z.unknown(), source: z.string() });
const CaseItem = z.object({ source: z.enum(["published", "tutorial", "computed"]), tool: z.string().optional(), where: z.string().default(""), independence: z.enum(["independent", "same path", "unknown"]).optional(), check: z.string().optional() }).refine((i) => i.source !== "computed" || !!i.tool, { message: "a computed item needs a tool" });

export const CaseSpec = z.object({
  kind: z.enum(["research paper", "tool tutorial or test suite"]),
  short: z.string(),
  field: z.string(),
  program: z.string(),
  citation: z.object({ authors: z.string(), title: z.string(), venue: z.string().optional(), year: z.union([z.number(), z.string()]).optional(), doi: z.string().optional(), url: z.string().optional() }),
  related: z.array(z.object({ text: z.string(), doi: z.string().optional(), url: z.string().optional() })).default([]),
  measured: z.string(),
  instruction: z.string(),
  instruction_basis: z.string().default(""),
  answers: z.record(z.string(), CaseAnswer).default({}),
  items: z.record(z.string(), CaseItem).default({}),
  data: z.object({ source: z.string(), url: z.string().optional(), license: z.string(), size: z.string().optional() }),
});
export type CaseSpec = z.infer<typeof CaseSpec>;

export function loadCase(id: string, dir = PAPERS_DIR): CaseSpec | undefined {
  const f = join(dir, id, "case.yaml");
  if (!existsSync(f)) return undefined;
  const parsed = CaseSpec.safeParse(parseYaml(readFileSync(f, "utf8")));
  if (!parsed.success) throw new Error(`${id}/case.yaml: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  return parsed.data;
}

export function caseGaps(paper: Paper, c: CaseSpec): string[] {
  const answers = paper.answers && typeof paper.answers === "object" ? Object.keys(paper.answers) : [];
  return [...answers.filter((k) => !c.answers[k]).map((k) => `answer ${k}`), ...paper.items.map((i) => i.key).filter((k) => !c.items[k]).map((k) => `item ${k}`)];
}

// ---------------------------------------------------------------- sanitizing

type Rule = [string | RegExp, string];

const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function makeSanitizer(run?: { dir?: string }): (s: string) => string {
  const rules: Rule[] = [];
  if (run?.dir) {
    rules.push([join(run.dir, "work"), "{work}"], [run.dir, "{session}"]);
    const home = run.dir.replace(/\/sessions\/[^/]+$/, "");
    if (home !== run.dir) rules.push([home, "{run home}"]);
  }
  const h = homedir();
  const host = hostname();
  rules.push(
    [dataRoot(), "{data}"],
    ["/Volumes/T7/guided-analysis/data", "{data}"],
    [/\/Volumes\/[^/\s"'`]+\/guided-analysis\/tools\/bench-runs/g, "{runs}"],
    [/\/Volumes\/[^/\s"'`]+(\/guided-analysis)?/g, "{other volume}"],
    [join(h, ".cuvette"), "{cuvette home}"],
    [join(h, ".cuvette"), "{cuvette home}"],
    [new RegExp(`${reEsc(h)}/code/(guided-analysis|cuvette)(/\\.claude/worktrees/[^/\\s"'\`]+)?`, "gi"), "{repo}"],
    [/\/(Users|home)\/[^/\s"'`]+\/code\/(guided-analysis|cuvette)(\/\.claude\/worktrees\/[^/\s"'`]+)?/gi, "{repo}"],
    [h, "{home}"],
    [/\/(Users|home)\/[^/\s"'`]+/g, "{home}"],
    [/\/(private\/)?(tmp|var\/folders)\/[^\s"'`]*/g, "{tmp}"],
    [/sk-ant-[A-Za-z0-9_-]+/g, "{removed}"],
    [/\b(api[_-]?key|token|secret|password)(["'\s:=]+)[A-Za-z0-9_\-.]{12,}/gi, "$1$2{removed}"],
    [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, "{email}"],
    [/\b(localhost|127\.0\.0\.1)(:\d+)?/g, "{local server}"],
  );
  if (host) for (const v of new Set([host, host.replace(/\.local$/, "")])) if (v.length > 3) rules.push([new RegExp(reEsc(v), "gi"), "{host}"]);
  return (s: string) => {
    let out = s;
    for (const [from, to] of rules) out = typeof from === "string" ? out.split(from).join(to) : out.replace(from, to);
    return out;
  };
}

function sanitizeDeep(v: unknown, san: (s: string) => string): unknown {
  if (typeof v === "string") return san(v);
  if (Array.isArray(v)) return v.map((x) => sanitizeDeep(x, san));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sanitizeDeep(x, san)]));
  return v;
}

export function sanitizedLog(entries: Entry[], san: (s: string) => string): string {
  return entries.map((e) => JSON.stringify(sanitizeDeep(e, san))).join("\n") + "\n";
}

// ---------------------------------------------------------------- hashes

export function sha256File(p: string): string | undefined {
  if (!existsSync(p)) return undefined;
  const st = statSync(p);
  if (!st.isFile() || st.size > 2_000_000_000) return undefined;
  const h = createHash("sha256");
  const fd = openSync(p, "r");
  const buf = Buffer.alloc(1 << 20);
  try {
    for (let n = readSync(fd, buf); n > 0; n = readSync(fd, buf)) h.update(buf.subarray(0, n));
  } finally {
    closeSync(fd);
  }
  return h.digest("hex");
}

export function listedHashes(texts: string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const t of texts) for (const m of t.matchAll(/\b([0-9a-f]{64})\s+\*?["']?([^\s"'|]+)/g)) out.set(basename(m[2]), m[1]);
  return out;
}

function stringsIn(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => stringsIn(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => stringsIn(x, out));
  return out;
}

function inputPairs(n: Node, earlier: Node[]): { path?: string; sha: string }[] {
  const outs = new Set(earlier.flatMap((x) => x.outputs.map((o) => o.path)));
  const files = stringsIn(n.args).filter((s) => s.length < 1024 && s.startsWith("/") && existsSync(s) && statSync(s).isFile() && !outs.has(s));
  return files.length === n.inputHashes.length ? n.inputHashes.map((sha, i) => ({ path: files[i], sha })) : n.inputHashes.map((sha) => ({ sha }));
}

interface DataRow {
  path: string;
  size?: number;
  sha?: string;
  listed?: string;
  steps: string[];
}

function dataRows(paper: Paper | undefined, nodes: Node[]): DataRow[] {
  if (!paper) return [];
  const dirs = new Set(paper.data.map((d) => dirname(resolveData(d))));
  const texts = [join(paper.dir, "fetch.sh"), ...[...dirs].flatMap((d) => (existsSync(d) ? readdirSync(d).filter((f) => /sha256/i.test(f)).map((f) => join(d, f)) : []))].filter((f) => existsSync(f)).map((f) => readFileSync(f, "utf8"));
  const listed = listedHashes(texts);
  return paper.data.map((d) => {
    const p = resolveData(d);
    const sha = sha256File(p);
    return { path: p, size: existsSync(p) ? statSync(p).size : undefined, sha, listed: listed.get(basename(p)), steps: sha ? nodes.filter((n) => n.inputHashes.includes(sha)).map((n) => n.id) : [] };
  });
}

// ---------------------------------------------------------------- html helpers

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (x: number | null | undefined) => (x === null || x === undefined ? "-" : String(Number(x.toPrecision(7))));
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + " ..." : s);
const sha8 = (s: string | undefined) => (s ? s.slice(0, 12) : "-");
const slug = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, "-");
export const modelLabel = (m: string) => (m.startsWith("ollama:") ? m.slice(7) : m === "claude" ? "Claude" : m);
const tolText = (t: number | "exact") => (t === "exact" ? "exact" : `± ${num(t)}`);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function sizeText(n: number | undefined): string {
  if (n === undefined) return "-";
  if (n < 1024) return `${n} bytes`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function details(summary: string, body: string, open = false): string {
  return `<details${open ? " open" : ""}><summary>${summary}</summary>${body}</details>`;
}

function pretty(text: string): string {
  const t = text.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return text;
  try {
    return JSON.stringify(JSON.parse(t), null, 1);
  } catch {
    return text;
  }
}

function pre(text: string, limit = MAX_OUTPUT): string {
  const cut = text.length > limit ? `${text.slice(0, limit)}\n... (${text.length - limit} more characters in the session record)` : text;
  return `<pre>${esc(cut)}</pre>`;
}

const SOURCE_TEXT: Record<string, string> = { published: "published in the paper", tutorial: "official tutorial output" };

export function sourceText(c: CaseSpec | undefined, key: string): string {
  const i = c?.items[key];
  if (!i) return "not recorded";
  return i.source === "computed" ? `computed by the benchmark authors with ${i.tool}` : SOURCE_TEXT[i.source];
}

const sourceWord = (c: CaseSpec | undefined) => (c?.kind === "research paper" ? "Source in the paper" : "Source in the tutorial or test suite");

const FIDELITY: Record<string, string> = {
  exact: "The manual route gives the same numbers. A test shows it.",
  close: "The manual route uses the same method with a known difference.",
  code_only: "The program has no manual route for this step. Run the code.",
  none: "No manual route is recorded for this step.",
};

// ---------------------------------------------------------------- run context

interface RunCtx {
  run: PaperRun;
  entries: Entry[];
  record?: AnalysisRecord;
  nodes: Node[];
  san: (s: string) => string;
  labels: Map<string, string>;
  adapters: LoadedAdapter[];
  recordFile?: string;
  figure?: string;
  extra: ExtraItem[];
}

interface ExtraItem {
  item: PaperItem;
  match: ComputedMatch;
}

function readEntries(dir: string | undefined): Entry[] {
  const f = dir ? join(dir, "log.jsonl") : "";
  if (!f || !existsSync(f)) return [];
  return readFileSync(f, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as Entry];
      } catch {
        return [];
      }
    });
}

export function loadAdapters(entries: Entry[]): LoadedAdapter[] {
  const s = entries.find((e) => e.kind === "session");
  const names = new Set([...((s?.data.adapters as { name: string }[] | undefined) ?? []).map((a) => a.name), ...entries.filter((e) => e.kind === "adapter").map((e) => String(e.data.name))]);
  return [...names].flatMap((n) => {
    try {
      return [findAdapter(n)];
    } catch {
      return [];
    }
  });
}

export function labelMap(entries: Entry[], adapters: LoadedAdapter[], c: CaseSpec | undefined): Map<string, string> {
  const m = new Map<string, string>();
  for (const [k, v] of Object.entries(c?.answers ?? {})) m.set(k, v.decision);
  for (const a of adapters) for (const d of a.manifest.decisions) if (!m.has(d.key)) m.set(d.key, d.label);
  for (const e of entries) if (e.kind === "question" && !m.has(String(e.data.decisionKey))) m.set(String(e.data.decisionKey), String(e.data.title));
  return m;
}

// ---------------------------------------------------------------- transcript

const NOTES = "[Notes from the harness]";
const REVIEW = "[Review before the answer";

function argsTable(args: Record<string, unknown>, ctx: RunCtx): string {
  const rows = Object.entries(args).map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td><code>${esc(short(ctx.san(typeof v === "string" ? v : JSON.stringify(v)), 400))}</code></td></tr>`);
  return rows.length ? `<div class="table-wrap"><table class="kv">${rows.join("")}</table></div>` : "";
}

function stepCard(n: Node, e: Entry, ctx: RunCtx): string {
  const earlier = ctx.nodes.filter((x) => x.entry < n.entry);
  const ad = ctx.adapters.find((a) => a.name === n.adapter);
  const program = ad ? `${ad.manifest.program.name} ${n.programVersion || ad.manifest.program.version || ""}`.trim() : n.programVersion ? `version ${n.programVersion}` : "";
  const head = `<p class="step-head"><span class="tag">${n.sensitivityOf ? "comparison run" : "step"} ${esc(n.id)}</span> <code>${esc(n.tool)}</code>${n.adapter ? ` <span class="muted">adapter ${esc(n.adapter)} ${esc(n.adapterVersion)}${program ? `, ${esc(program)}` : ""}</span>` : ""}</p>`;
  const ok = e.data.ok !== false;
  const summary = `<p class="${ok ? "" : "bad-text"}">${esc(ctx.san(String(n.summary || e.data.summary || (ok ? "" : "The step failed."))))}</p>`;
  const decisions = Object.entries(n.decisions ?? {});
  const dec = decisions.length ? `<p class="small">Decisions applied: ${decisions.map(([k, v]) => `${esc(ctx.labels.get(k) ?? k)} = <b>${esc(ctx.san(show(v)))}</b>`).join("; ")}.</p>` : "";
  const inputs = inputPairs(n, earlier);
  const ins = inputs.length ? `<p class="small">Input ${inputs.length === 1 ? "file" : "files"}: ${inputs.map((i) => `${i.path ? `<code>${esc(ctx.san(i.path))}</code> ` : ""}SHA-256 <code>${sha8(i.sha)}</code>`).join("; ")}.</p>` : "";
  const outs = n.outputs?.length ? `<p class="small">Outputs: ${n.outputs.map((o) => `<code>${esc(ctx.san(o.name ?? basename(o.path)))}</code>${o.sha ? ` (<code>${sha8(o.sha)}</code>)` : ""}`).join(", ")}.</p>` : "";
  const err = !ok && e.data.error ? `<p class="bad-text">${esc(ctx.san(String(e.data.error)))}</p>` : "";
  const text = String(e.data.text ?? "");
  const body = [
    details("Arguments", argsTable(n.args ?? {}, ctx)),
    text ? details("Tool output", pre(ctx.san(pretty(text)))) : "",
  ].join("");
  return `<div class="ev step${n.sensitivityOf ? " cmp" : ""}" id="e${e.id}">${head}${summary}${err}${dec}${ins}${outs}${body}</div>`;
}

function questionCard(q: Entry, ctx: RunCtx, answers: Map<string, Entry>, c: CaseSpec | undefined): string {
  const d = q.data;
  const key = String(d.decisionKey ?? "");
  const opts = (d.options as { value: unknown; label: string }[] | undefined) ?? [];
  const rec = d.recommendation as { value: unknown; reason?: string } | undefined;
  const ans = answers.get(String(d.qid));
  const src = c?.answers[key];
  const optHtml = opts.length ? `<p class="small">Options: ${opts.map((o) => `<code>${esc(ctx.san(o.label ?? show(o.value)))}</code>`).join(" ")}</p>` : "";
  const recHtml = rec ? `<p class="small">Suggested: <code>${esc(ctx.san(show(rec.value)))}</code>${rec.reason ? ` (${esc(ctx.san(rec.reason))})` : ""}</p>` : "";
  const ev = d.evidence ? details("Evidence on the card", pre(ctx.san(String(d.evidence)))) : "";
  const answer = ans
    ? `<div class="answer"><p><span class="who">Scientist</span> <b>${esc(ctx.san(show(ans.data.value)))}</b></p><p class="small muted">${ans.data.note === "answered from the answers file" ? "The benchmark gave this answer from its answers file." : esc(ctx.san(String(ans.data.note ?? "")))}${src ? ` ${sourceWord(c)}: ${esc(src.source)}` : ""}</p></div>`
    : `<p class="small muted">No answer is recorded for this card.</p>`;
  return `<div class="ev qcard" id="e${q.id}"><p class="step-head"><span class="tag">decision card</span> <b>${esc(String(d.title ?? key))}</b></p><p class="small">${esc(ctx.san(String(d.text ?? "")))}</p>${optHtml}${recHtml}${ev}${answer}</div>`;
}

function planHtml(plan: { step: string; status: string }[], id: number, label: string): string {
  return `<div class="ev plan" id="e${id}"><p class="step-head"><span class="tag">plan</span> ${esc(label)}</p><ol>${plan.map((p) => `<li><span class="st st-${esc(p.status)}">${esc(p.status)}</span> ${esc(p.step)}</li>`).join("")}</ol></div>`;
}

function answerDraftIds(entries: Entry[]): Set<number> {
  const ids = new Set<number>();
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.kind !== "message" || (e.data.message as { role: string }).role !== "assistant") continue;
    for (let j = i + 1; j < entries.length; j++) {
      const k = entries[j].kind;
      if (k === "claim_check") {
        ids.add(e.id);
        break;
      }
      if (k === "message" || k === "tool_call") break;
    }
  }
  return ids;
}

export function transcriptHtml(ctx: RunCtx, c: CaseSpec | undefined, finalText: string): string {
  const { entries, san } = ctx;
  const answers = new Map(entries.filter((e) => e.kind === "answer").map((e) => [String(e.data.qid), e]));
  const results = new Map(entries.filter((e) => e.kind === "tool_result").map((e) => [e.id, e]));
  const nodeByEntry = new Map(ctx.nodes.map((n) => [n.entry, n]));
  const drafts = answerDraftIds(entries);
  const firstUser = entries.find((e) => e.kind === "user");
  const callTools = new Map(entries.filter((e) => e.kind === "tool_call").map((e) => [String(e.data.callId), String(e.data.tool)]));
  const out: string[] = [];
  const heldShown = new Set<number>();
  const held = (b: Entry) => {
    heldShown.add(b.id);
    const keys = String(b.data.reason ?? "").replace(/^waiting for the scientist:\s*/, "").split(/,\s*/).filter(Boolean);
    return `<div class="ev held" id="e${b.id}"><p><span class="tag">held</span> The harness held <code>${esc(String(b.data.tool))}</code> until the scientist chose: ${esc(keys.map((k) => ctx.labels.get(k) ?? k).join(", "))}. The decision cards follow.</p></div>`;
  };
  let draftNo = 0;
  for (const e of entries) {
    const d = e.data;
    switch (e.kind) {
      case "setup": {
        const vals = Object.entries((d.values as Record<string, unknown>) ?? {});
        if (!vals.length) break;
        const rows = vals.map(([k, v]) => `<li>${esc(ctx.labels.get(k) ?? k)}: <b>${esc(san(show(v)))}</b>${c?.answers[k] ? `<span class="sub">${sourceWord(c)}: ${esc(c.answers[k].source)}</span>` : ""}</li>`);
        out.push(`<div class="ev setup" id="e${e.id}"><p class="step-head"><span class="tag">setup</span> The decision record starts with these values. The benchmark set them from its answers file before the first message.</p><ul class="plain">${rows.join("")}</ul></div>`);
        break;
      }
      case "message": {
        const m = d.message as { role: string; parts: { type: string; text?: string }[] };
        if (m.role === "user") {
          const p = m.parts[0];
          if (p?.type !== "text" || !p.text) break;
          if (p.text.startsWith(REVIEW)) {
            out.push(`<div class="ev harness" id="e${e.id}"><p class="step-head"><span class="tag">review</span> The review sent the answer back to the agent before the scientist saw it.</p>${pre(san(p.text.split("\n").slice(1).join("\n")))}</div>`);
          } else if (p.text.startsWith(NOTES)) {
            let text = p.text.slice(NOTES.length).trim();
            const u = String(firstUser?.data.text ?? "");
            if (u && text.endsWith(u.trim())) text = text.slice(0, text.length - u.trim().length).trim();
            out.push(`<div class="ev harness" id="e${e.id}">${details("<span class=\"tag\">harness note</span> A note from the harness to the agent. The scientist did not write it.", pre(san(text)))}</div>`);
          }
          break;
        }
        if (m.role !== "assistant") break;
        for (const p of m.parts) {
          if (p.type === "thinking" && p.text && p.text.trim().length <= SHORT_THINKING) out.push(`<div class="ev thinking" id="e${e.id}t"><p class="small muted">Agent thinking, summary: ${esc(san(p.text.trim()))}</p></div>`);
          if (p.type !== "text" || !p.text?.trim()) continue;
          if (drafts.has(e.id)) {
            draftNo++;
            const isFinal = modelAnswer(p.text).trim() === finalText.trim();
            out.push(`<div class="ev agent draft" id="e${e.id}">${isFinal ? `<p><span class="who">Agent</span> The agent writes its answer. The claim check reads it. See <a href="#answer">the final answer</a>.</p>` : details(`<span class="who">Agent</span> Answer draft ${draftNo}. The claim check and the review read it.`, `<div class="md">${renderMarkdown(san(p.text))}</div>`)}</div>`);
          } else out.push(`<div class="ev agent" id="e${e.id}"><p><span class="who">Agent</span></p><div class="md">${renderMarkdown(san(p.text))}</div></div>`);
        }
        break;
      }
      case "note": {
        if (Array.isArray(d.plan) && d.plan.length) out.push(planHtml(d.plan as { step: string; status: string }[], e.id, "The agent updates its plan."));
        else if (d.text) out.push(`<div class="ev note" id="e${e.id}"><p class="small"><span class="tag">note</span> ${esc(san(String(d.text)))}</p></div>`);
        break;
      }
      case "tool_call": {
        const tool = String(d.tool);
        if (["plan", "note"].includes(tool)) break;
        if (tool === "load_skill") out.push(`<div class="ev small muted" id="e${e.id}">The agent reads the skill <code>${esc(String((d.args as { name?: string })?.name ?? ""))}</code>.</div>`);
        else if (tool === "run_script" || tool === "calculate") {
          const code = String((d.args as { code?: string; expression?: string })?.code ?? (d.args as { expression?: string })?.expression ?? JSON.stringify(d.args));
          out.push(`<div class="ev call" id="e${e.id}">${details(`The agent runs <code>${esc(tool)}</code>.`, pre(san(code)))}</div>`);
        } else out.push(`<div class="ev call small" id="e${e.id}">The agent calls <code>${esc(tool)}</code>${d.adapter ? ` (adapter ${esc(String(d.adapter))})` : ""}.</div>`);
        const b = entries.find((x) => x.kind === "blocked" && x.data.callId === d.callId && x.id > e.id);
        if (b) out.push(held(b));
        break;
      }
      case "tool_result": {
        const tool = String(d.tool ?? callTools.get(String(d.callId)) ?? "");
        if (["plan", "note", "load_skill"].includes(tool)) break;
        const n = nodeByEntry.get(e.id);
        if (n) out.push(stepCard(n, e, ctx));
        else {
          const text = String(d.text ?? d.summary ?? "");
          const ok = d.ok !== false;
          out.push(`<div class="ev result" id="e${e.id}">${details(`<span class="${ok ? "" : "bad-text"}">${ok ? "Result" : "Failed"} of <code>${esc(tool)}</code>: ${esc(short(san(String(d.summary ?? d.error ?? "")), 160))}</span>`, pre(san(pretty(text))))}</div>`);
        }
        break;
      }
      case "question":
        out.push(questionCard(e, ctx, answers, c));
        break;
      case "blocked":
        if (!heldShown.has(e.id)) out.push(held(e));
        break;
      case "decision": {
        if (/^answer to q/.test(String(d.reason ?? ""))) break;
        out.push(`<div class="ev small" id="e${e.id}"><span class="tag">decision</span> ${esc(ctx.labels.get(String(d.key)) ?? String(d.key))}: ${esc(san(show(d.old)))} to <b>${esc(san(show(d.new)))}</b>, by ${esc(String(d.by ?? "-"))}. ${esc(san(String(d.reason ?? "")))}</div>`);
        break;
      }
      case "deviation":
        for (const v of (d.deviations as { arg: string; key: string; setup: unknown; requested: unknown; used: unknown; overwritten?: boolean }[]) ?? []) out.push(`<div class="ev dev" id="e${e.id}"><p><span class="tag">deviation</span> ${esc(deviationText(v, ctx))}</p></div>`);
        break;
      case "sensitivity": {
        const label = ctx.labels.get(String(d.decisionKey)) ?? String(d.decisionKey);
        out.push(`<div class="ev cmp-sum" id="e${e.id}">${details(`<span class="tag">comparison</span> Comparison runs for ${esc(label)}. The record keeps the scientist's choice.`, pre(san(String(d.table ?? ""))))}</div>`);
        break;
      }
      case "permission":
        out.push(`<div class="ev small muted" id="e${e.id}">The harness allows <code>${esc(String(d.tool))}</code>. The benchmark setting allows every tool, so the permission is automatic.</div>`);
        break;
      case "claim_check": {
        const claims = (d.claims as { label: string }[]) ?? [];
        out.push(`<div class="ev small muted" id="e${e.id}"><span class="tag">claim check</span> ${plural(claims.length, "number")} in the answer, ${plural(Number(d.unsourced ?? 0), "number")} without a source in the record.</div>`);
        break;
      }
      case "notice":
        out.push(`<div class="ev small muted" id="e${e.id}">${esc(san(String(d.text ?? "")))}</div>`);
        break;
      case "error":
        out.push(`<div class="ev bad-text" id="e${e.id}">Error: ${esc(san(String(d.message ?? "")))}</div>`);
        break;
    }
  }
  return `<div class="timeline">${out.join("\n")}</div>`;
}

function deviationText(v: { arg: string; key: string; setup: unknown; requested: unknown; used: unknown; overwritten?: boolean }, ctx: RunCtx): string {
  const label = ctx.labels.get(v.key) ?? v.key;
  return v.overwritten
    ? `The agent asked for ${v.arg} = ${ctx.san(show(v.requested))}. The scientist chose ${ctx.san(show(v.setup))} for ${label}. The harness kept ${ctx.san(show(v.used))}.`
    : `The agent used ${v.arg} = ${ctx.san(show(v.requested))}, not the scientist's ${ctx.san(show(v.setup))} for ${label}. The harness logged this deviation.`;
}

// ---------------------------------------------------------------- page sections

function citationHtml(c: CaseSpec): string {
  const ci = c.citation;
  const link = ci.doi ? `<a href="https://doi.org/${esc(ci.doi)}">doi:${esc(ci.doi)}</a>` : ci.url ? `<a href="${esc(ci.url)}">${esc(ci.url)}</a>` : "";
  const rel = c.related.map((r) => `<li>${esc(r.text)}${r.doi ? ` <a href="https://doi.org/${esc(r.doi)}">doi:${esc(r.doi)}</a>` : r.url ? ` <a href="${esc(r.url)}">link</a>` : ""}</li>`);
  return `<p class="cite">${esc(ci.authors)}. ${esc(ci.title)}. ${ci.venue ? `<i>${esc(ci.venue)}</i>` : ""}${ci.year ? ` (${esc(ci.year)})` : ""}. ${link}</p>${rel.length ? `<p class="small muted">Related sources:</p><ul class="small">${rel.join("")}</ul>` : ""}`;
}

function resultCell(i: ItemScore): string {
  const c = i.computed;
  if (i.reference) return c.pass ? `<span class="tag ok">match</span>` : `<span class="tag">differs</span>`;
  return c.pass ? `<span class="tag ok">pass</span>` : `<span class="tag bad">fail</span>`;
}

function reportedCell(i: ItemScore): string {
  const r = i.reported;
  if (r.pass === null) return `<span class="muted">not asked</span>`;
  return `${r.pass ? `<span class="tag ok">pass</span>` : `<span class="tag bad">fail</span>`} <span class="nw">${num(r.value)}</span>${r.via === "rounding" ? " <span class=\"sub\">by rounding</span>" : r.via === "code" ? " <span class=\"sub\">code stated</span>" : ""}`;
}

function provenance(i: ItemScore, ctx: RunCtx): string {
  const c = i.computed;
  const n = c.node ? ctx.nodes.find((x) => x.id === c.node) : undefined;
  const comp = c.node ? `<a href="#e${c.entry}">${esc(c.node)}</a> ${n ? `<code>${esc(n.tool)}</code>` : ""} ${c.path ? `<code>${esc(c.path)}</code>` : ""}, entry ${c.entry ?? "-"}${c.via === "comparison" ? " (comparison run)" : ""}` : "no logged number";
  const ce = i.reported.claimEntry;
  const toFinal = ce !== null && ctx.entries.find((e) => e.id === ce)?.kind === "assistant";
  const rep = ce && i.reported.pass !== null ? (toFinal ? `; the <a href="#answer">final answer</a>, entry ${ce}` : `; claim check <a href="#e${ce}">entry ${ce}</a>`) : "";
  return comp + rep;
}

function itemsTable(items: ItemScore[], ctx: RunCtx, c: CaseSpec | undefined): string {
  const rows = items.map((i) => `<tr><td><code>${esc(i.key)}</code><span class="sub">${esc(i.description)}</span></td><td class="num" data-label="Paper value">${i.abs ? "abs " : ""}${num(i.expected)}</td><td class="num" data-label="Cuvette value">${num(i.computed.value)}</td><td class="num" data-label="Tolerance">${tolText(i.tolerance)}</td><td data-label="Computed">${resultCell(i)}</td><td data-label="In the answer">${reportedCell(i)}</td><td data-label="Expected value" class="small">${esc(sourceText(c, i.key))}${c?.items[i.key]?.where ? `<span class="sub">${esc(c.items[i.key].where)}</span>` : ""}</td><td data-label="Provenance" class="small">${provenance(i, ctx)}</td></tr>`);
  return `<div class="table-wrap"><table class="stack items"><thead><tr><th>Item</th><th class="num">Paper value</th><th class="num">Cuvette value</th><th class="num">Tolerance</th><th>Computed</th><th>In the answer</th><th>Expected value</th><th>Provenance</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

function extraTable(ref: ItemScore[], extra: ExtraItem[], c: CaseSpec | undefined, ctx: RunCtx): string {
  if (!ref.length && !extra.length) return "";
  const rows = [
    ...ref.map((i) => ({ key: i.key, desc: i.description, kind: "reference", expected: i.expected, tol: i.tolerance, value: i.computed.value, m: i.computed, result: i.computed.pass ? "matches" : "differs" })),
    ...extra.map(({ item, match }) => ({
      key: item.key,
      desc: item.description,
      kind: item.trap ? "trap" : "optional",
      expected: item.value,
      tol: (item.exact ? "exact" : (item.tolerance ?? 0)) as number | "exact",
      value: match.value,
      m: match,
      result: item.trap ? (match.pass ? (match.via === "comparison" ? "found only in a comparison run" : "found in a main step") : "not computed") : match.pass ? "computed, within tolerance" : match.value === null ? "not computed" : "computed, outside tolerance",
    })),
  ];
  const body = rows.map((r) => `<tr><td><code>${esc(r.key)}</code><span class="sub">${esc(r.desc)}</span></td><td data-label="Kind" class="nw">${r.kind}</td><td class="num" data-label="Paper value">${num(r.expected)}</td><td class="num" data-label="Closest logged value">${num(r.value)}${r.m.node ? `<span class="sub"><a href="#e${r.m.entry}">${esc(r.m.node)}</a> ${esc(ctx.nodes.find((n) => n.id === r.m.node)?.tool ?? "")}</span>` : ""}</td><td class="num" data-label="Tolerance">${tolText(r.tol)}</td><td data-label="Outcome">${esc(r.result)}</td><td data-label="Expected value" class="small">${esc(sourceText(c, r.key))}</td></tr>`);
  return `<h3>Values that are not scored</h3>
<ul class="small">
<li>A <b>trap</b> value is the result of a wrong method, for example an unpaired test on paired data. A trap value in a main step means that the run used the wrong method. A trap value in a comparison run is correct, because the record keeps the scientist's choice.</li>
<li>An <b>optional</b> value is a second result of the same method. The run can compute it or not.</li>
<li>A <b>reference</b> value comes from a different program version or a check run by the benchmark authors. It is shown for comparison.</li>
</ul>
<div class="table-wrap"><table class="stack items"><thead><tr><th>Item</th><th>Kind</th><th class="num">Paper value</th><th class="num">Closest logged value</th><th class="num">Tolerance</th><th>Outcome</th><th>Expected value</th></tr></thead><tbody>${body.join("")}</tbody></table></div>`;
}

function checksHtml(ctx: RunCtx, paper: Paper | undefined): string {
  const { entries, san } = ctx;
  const findings = entries.filter((e) => e.kind === "finding");
  const shown = new Set(((entries.filter((e) => e.kind === "assistant" && e.data.final === true).at(-1)?.data.findings as string[] | undefined) ?? []).map(String));
  const fRows = findings.map((f) => `<tr><td data-label="Severity"><span class="tag sev-${esc(String(f.data.severity))}">${esc(String(f.data.severity))}</span></td><td data-label="From">${f.data.source === "referee" ? "referee model" : `rule<span class="sub">${esc(String(f.data.check ?? ""))}</span>`}</td><td data-label="Finding">${esc(san(String(f.data.message ?? "")))}</td><td data-label="With the answer">${shown.has(String(f.data.fid)) ? "yes" : "no"}</td></tr>`);
  const fHtml = findings.length
    ? `<p>The review recorded ${plural(findings.length, "finding")}. A rule finding comes from a fixed check in the harness. A referee finding comes from a second model that reads the record. The harness shows the findings to the scientist with the final answer. The record does not mark a finding as fixed, so a finding from an early review round can apply to a draft that the agent then corrected.</p><div class="table-wrap"><table class="stack"><thead><tr><th>Severity</th><th>From</th><th>Finding</th><th>With the answer</th></tr></thead><tbody>${fRows.join("")}</tbody></table></div>`
    : `<p>The review recorded no findings.</p>`;
  const checks = entries.filter((e) => e.kind === "claim_check");
  const last = checks.at(-1);
  const claims = (last?.data.claims as { text: string; value: number | null; label: string }[] | undefined) ?? [];
  const notMeasured = claims.filter((c) => c.label !== "measured");
  const LABEL: Record<string, string> = { unsourced: "no source in the record", inferred: "inferred from logged numbers", literature: "cited from the literature" };
  const cHtml = last
    ? `<p>The last claim check read ${plural(claims.length, "number")} in the answer. ${plural(claims.filter((c) => c.label === "measured").length, "number")} match a logged result. ${plural(Number(last.data.unsourced ?? 0), "number")} have no source in the record.</p>${notMeasured.length ? details(`Numbers that do not match a logged result (${notMeasured.length})`, `<ul class="small">${notMeasured.map((c) => `<li><b>${esc(LABEL[c.label] ?? c.label)}</b>: ${esc(short(san(c.text), 220))}</li>`).join("")}</ul>`) : ""}`
    : `<p>No claim check is recorded.</p>`;
  const devs = entries.filter((e) => e.kind === "deviation").flatMap((e) => (e.data.deviations as Parameters<typeof deviationText>[0][]) ?? []);
  const dHtml = devs.length ? `<ul>${devs.map((v) => `<li>${esc(deviationText(v, ctx))}</li>`).join("")}</ul>` : `<p>The agent did not ask for a value that differs from the scientist's choices.</p>`;
  const failed = entries.filter((e) => e.kind === "tool_result" && e.data.ok === false).length;
  const rows = dataRows(paper, ctx.nodes);
  const dRows = rows.map((r) => {
    const listed = !r.sha ? "file not found or too large to hash" : !r.listed ? "fetch.sh lists no hash for this file" : r.listed === r.sha ? "same as the hash in fetch.sh" : "DIFFERS from the hash in fetch.sh";
    return `<tr><td data-label="File"><code>${esc(san(r.path))}</code><span class="sub">${sizeText(r.size)}</span></td><td data-label="SHA-256"><code>${sha8(r.sha)}</code></td><td data-label="Fetched data">${esc(listed)}</td><td data-label="Steps with this hash">${r.steps.length ? esc(r.steps.join(", ")) : "none"}</td></tr>`;
  });
  const allOk = rows.length > 0 && rows.every((r) => r.sha && r.steps.length && (!r.listed || r.listed === r.sha));
  const someListed = rows.some((r) => r.listed);
  const verdict = !rows.length
    ? "<p>The benchmark lists no data files for this paper.</p>"
    : allOk
      ? `<p>Each data file has the same SHA-256 hash now as at the time of the step that read it.${someListed ? " Where fetch.sh lists a hash, the file also has that hash." : ""} The run did not change the data.</p>`
      : `<p>Not every data file has a match. See the table. A file without a matching step can be an input that the tool reads from a folder, which the record does not hash.</p>`;
  return `<h3>Review findings</h3>${fHtml}
<h3>Numbers in the answer</h3>${cHtml}
<h3>Deviations</h3>${dHtml}
<h3>Failed tool calls</h3><p>${failed ? `${plural(failed, "tool call")} failed. The agent then tried again or used another tool. The transcript shows each failure.` : "No tool call failed."}</p>
<h3>Data integrity</h3>${verdict}<div class="table-wrap"><table class="stack"><thead><tr><th>File</th><th>SHA-256</th><th>Fetched data</th><th>Steps with this hash</th></tr></thead><tbody>${dRows.join("")}</tbody></table></div>
<p class="small muted">SHA-256 is a cryptographic hash. The table shows the first 12 characters.</p>`;
}

function repeatHtml(paper: Paper | undefined, id: string, ctx: RunCtx): string {
  const fetch = paper ? join(paper.dir, "fetch.sh") : "";
  const envVar = fetch && existsSync(fetch) ? /\$\{(\w+):-/.exec(readFileSync(fetch, "utf8"))?.[1] : undefined;
  const model = ctx.run.model;
  const main = ctx.nodes.filter((n) => !n.sensitivityOf);
  const steps = main.map((n) => {
    const lines = stepLines(ctx.adapters, n).map(ctx.san);
    const recorded = n.manualRoute && !lines.some((l) => l.includes(ctx.san(n.manualRoute))) ? `<p class="small">Route recorded in the step:</p><pre>${esc(ctx.san(n.manualRoute))}</pre>` : "";
    return `<li><p><code>${esc(n.tool)}</code> <span class="muted">(step ${esc(n.id)})</span></p><pre>${esc(lines.join("\n"))}</pre>${recorded}<p class="small muted">${esc(FIDELITY[n.fidelity] ?? "")}</p></li>`;
  });
  return `<p>Get the data. The script downloads the files and checks their SHA-256 hashes where it lists them.</p>
<div class="cmd"><pre>${envVar ? `${esc(envVar)}={data} ` : ""}bash bench/papers/${esc(id)}/fetch.sh</pre></div>
<p>Run the same case with Cuvette. The benchmark gives the same answers from <code>bench/papers/${esc(id)}/bench.yaml</code>.</p>
<div class="cmd"><pre>cuvette bench papers --papers ${esc(id)} --models ${esc(model)}</pre></div>
<p>Repeat each step by hand in the program. The harness records a manual route for each step. Steps that are comparison runs are left out.</p>
${steps.length ? `<ol class="routes">${steps.join("")}</ol>` : "<p>The run has no steps.</p>"}`;
}

function factsHtml(ctx: RunCtx, recordHref: string | undefined): string {
  const { run, entries } = ctx;
  const s = entries.find((e) => e.kind === "session")?.data ?? {};
  const m = run.metrics;
  const model = String(s.model ?? run.model);
  const cost = run.model.startsWith("claude") && m ? `$${costUsd(model, { inputTokens: m.inputTokens, outputTokens: m.outputTokens, cacheRead: m.cacheRead, cacheWrite: m.cacheWrite }).toFixed(2)} at list price, from the token counts` : "none (local model)";
  const adapters = ((s.adapters as { name: string; version: string; programVersion?: string }[]) ?? []).map((a) => `${a.name} ${a.version}${a.programVersion ? `, program ${a.programVersion}` : ""}`);
  const start = entries[0]?.ts ?? "";
  const rows: [string, string][] = [
    ["Model", `${esc(model)}${s.provider ? ` <span class="sub">through ${esc(String(s.provider))}</span>` : ""}`],
    ["Date", esc(start.replace("T", " ").replace(/\.\d+Z$/, " UTC"))],
    ["Status", esc(run.status)],
    ["Time", `${Math.round(run.durationS)} s`],
    ["Requests", m ? String(m.requests) : "-"],
    ["Tokens", m ? `${m.inputTokens} input, ${m.outputTokens} output, ${m.cacheRead} cache read, ${m.cacheWrite} cache write` : "-"],
    ["Cost estimate", esc(cost)],
    ["Tool calls", m ? `${m.toolCalls} (${m.failedToolCalls} failed)` : "-"],
    ["Adapters", esc(adapters.join("; ") || "-")],
    ["Session", `<code>${esc(run.session ?? "-")}</code>`],
  ];
  const hashes = ctx.nodes.map((n) => `<tr><td data-label="Step">${esc(n.id)}${n.sensitivityOf ? " <span class=\"sub\">comparison</span>" : ""}</td><td data-label="Tool"><code>${esc(n.tool)}</code></td><td data-label="Program version">${esc(n.programVersion || "-")}</td><td data-label="Code hash"><code>${sha8(n.codeHash)}</code></td></tr>`);
  return `<div class="table-wrap"><table class="kv facts-table">${rows.map(([k, v]) => `<tr><td class="k">${k}</td><td>${v}</td></tr>`).join("")}</table></div>
${hashes.length ? details(`Code hash of each step (${hashes.length})`, `<div class="table-wrap"><table class="stack"><thead><tr><th>Step</th><th>Tool</th><th>Program version</th><th>Code hash</th></tr></thead><tbody>${hashes.join("")}</tbody></table></div><p class="small muted">The code hash covers the adapter name, the adapter version, the tool and its map entry.</p>`) : ""}
${recordHref ? `<p><a class="button" href="${esc(recordHref)}" download>Download the session record</a> <span class="small muted">JSON Lines, gzip. Paths are replaced with {data}, {work} and similar names.</span></p>` : ""}`;
}

function compareHtml(runs: RunCtx[], c: CaseSpec | undefined): string {
  if (runs.length < 2) return "";
  const keys = [...new Set(runs.flatMap((r) => r.run.items.filter((i) => !i.reference).map((i) => i.key)))];
  const head = runs.map((r) => `<th>${esc(modelLabel(r.run.model))}</th>`).join("");
  const rows = keys.map((k) => {
    const first = runs.map((r) => r.run.items.find((i) => i.key === k)).find(Boolean)!;
    const cells = runs.map((r) => {
      const i = r.run.items.find((x) => x.key === k);
      if (!i) return `<td data-label="${esc(modelLabel(r.run.model))}">-</td>`;
      return `<td data-label="${esc(modelLabel(r.run.model))}">${resultCell(i)} ${num(i.computed.value)}<span class="sub">answer: ${i.reported.pass === null ? "not asked" : i.reported.pass ? "pass" : "fail"}</span></td>`;
    });
    return `<tr><td><code>${esc(k)}</code></td><td class="num" data-label="Paper value">${num(first.expected)}</td>${cells.join("")}</tr>`;
  });
  const sum = runs.map((r) => {
    const s = r.run.items.filter((i) => !i.reference);
    return `${esc(modelLabel(r.run.model))}: ${s.filter((i) => i.computed.pass).length}/${s.length} computed, ${s.filter((i) => i.reported.pass).length}/${s.filter((i) => i.inAnswer).length} in the answer, ${Math.round(r.run.durationS)} s, status ${esc(r.run.status)}`;
  });
  void c;
  return `<ul>${sum.map((x) => `<li>${x}</li>`).join("")}</ul><div class="table-wrap"><table class="stack"><thead><tr><th>Item</th><th class="num">Paper value</th>${head}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

// ---------------------------------------------------------------- pages

const CSS = `
.crumbs{font-size:14px;color:var(--muted);margin:0 0 12px}
.crumbs a{color:var(--muted)}
.toc{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:14px;margin:8px 0 0;padding:0;list-style:none}
.toc li{margin:0}
.meta-line{color:var(--muted);font-size:15px;margin:0 0 16px}
.cite{margin:0 0 8px;overflow-wrap:anywhere}
main li,main p{overflow-wrap:anywhere}
.small a,td a{overflow-wrap:anywhere}
.sub{display:block;overflow-wrap:anywhere;color:var(--muted);font-size:13px}
.chat{margin:12px 0 16px}
.bubble{background:var(--panel);border:1px solid var(--rule);border-radius:12px 12px 12px 3px;padding:12px 14px;max-width:46em;overflow-wrap:anywhere}
.bubble .who{display:block;margin-bottom:4px}
.who{font:600 12px/1 var(--mono);letter-spacing:.04em;text-transform:uppercase;color:var(--accent)}
blockquote{margin:8px 0 16px;padding:4px 0 4px 14px;border-left:3px solid var(--rule);color:var(--ink)}
.timeline{border-left:2px solid var(--rule);margin:12px 0 8px 4px;padding-left:14px}
.ev{margin:0 0 12px;overflow-wrap:anywhere;min-width:0}
.ev p{margin:0 0 6px}
.ev.step,.ev.qcard,.ev.plan,.ev.setup{background:var(--panel);border:1px solid var(--rule);border-radius:6px;padding:10px 12px}
.ev.step.cmp{border-style:dashed}
.ev.qcard{border-left:3px solid var(--accent)}
.ev.held,.ev.dev{border-left:3px solid var(--warn);padding:4px 0 4px 10px}
.ev .answer{border-top:1px solid var(--rule);margin-top:8px;padding-top:8px}
.ev ol,.ev ul{margin:4px 0 4px}
.step-head{margin:0 0 6px}
.plain{list-style:none;padding:0}
.plain li{margin:0 0 6px}
.st{font:11px/1 var(--mono);color:var(--muted);margin-right:4px}
.md{overflow-wrap:anywhere}
.md h3,.md h4,.md h5,.md h6{font-size:16px;margin:14px 0 6px}
.md table{font-size:14px}
.answer-box{border:1px solid var(--rule);border-radius:6px;padding:4px 16px 8px;margin:12px 0}
.scroll{overflow-x:auto;max-width:100%}
pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}
details{margin:6px 0}
summary{cursor:pointer}
details pre{margin-top:6px}
.tag.ok{color:var(--ok)}
.tag.bad,.bad-text{color:var(--bad)}
.tag.sev-error{color:var(--bad)}
.tag.sev-warning{color:var(--warn)}
table.kv td.k{white-space:nowrap;color:var(--muted);font-size:14px;width:1%}
table.kv td{overflow-wrap:anywhere}
table.items td{overflow-wrap:anywhere}
table.items td:first-child{min-width:9em}
table.items td:first-child code{overflow-wrap:normal;word-break:normal}
.nw{white-space:nowrap}
.routes>li{margin-bottom:14px}
.routes pre{font-size:13px}
.figure img{display:block;max-width:100%;height:auto;border:1px solid var(--rule);border-radius:4px;background:#fff}
.tabs{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 12px}
.tabs a,.tabs span{font-size:14px;padding:5px 10px;border:1px solid var(--rule);border-radius:4px;text-decoration:none}
.tabs span{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.result-sum{font:600 15px/1.4 var(--mono)}
@media (max-width:640px){
.timeline{padding-left:10px;margin-left:0}
table.kv td.k{white-space:normal;width:auto}
table.kv,table.kv tbody,table.kv tr,table.kv td{display:block;width:100%}
table.kv td{border:0;padding:2px 0}
table.kv tr{border-bottom:1px solid var(--rule);padding:6px 0}
table.index td:first-child .sub{display:block}
table.stack thead{display:none}
}
`;

const VARS = `:root{--ok:#1d6b3a;--bad:#a3261b;--warn:#8a5a00}
@media (prefers-color-scheme:dark){:root{--ok:#7fd49c;--bad:#ff9d93;--warn:#f0c560}}`;

function pageShell(title: string, description: string, body: string, current: "index" | "case"): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="color-scheme" content="light dark">
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="case.css">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
</head>
<body>
<header class="site-header">
  <div class="wrap wide">
    <a class="wordmark" href="../">cuvette</a>
    <nav class="site-nav" aria-label="Main">
      <a href="../install.html">Install</a>
      <a href="../adapters.html">Adapters</a>
      <a href="../benchmark.html">Benchmark</a>
      <a href="index.html"${current === "index" ? ' aria-current="page"' : ""}>Papers</a>
      <a href="https://github.com/elparko/cuvette">GitHub</a>
    </nav>
  </div>
</header>
<main class="wrap wide">
${body}
</main>
<footer class="site-footer">
  <div class="wrap wide">
    <span>Cuvette. Early development.</span>
    <span>No cookies. No trackers. <a href="https://github.com/elparko/cuvette">GitHub</a></span>
  </div>
</footer>
<script src="../site.js" defer></script>
</body>
</html>
`;
}

function paperTitle(paper: Paper | undefined, id: string): string {
  const f = paper ? join(paper.dir, "paper.md") : "";
  const line = f && existsSync(f) ? readFileSync(f, "utf8").split("\n").find((l) => l.startsWith("# ")) : undefined;
  return line ? line.slice(2).trim() : id;
}

function scoreLine(r: PaperRun | undefined): string {
  if (!r) return "not run";
  const s = r.items.filter((i) => !i.reference);
  const bad = r.status !== "answer" ? `, ${r.status}` : "";
  if (!s.length) return `no scored items, ${r.items.filter((i) => i.computed.pass).length}/${r.items.length} reference values match${bad}`;
  return `${s.filter((i) => i.computed.pass).length}/${s.length} computed, ${s.filter((i) => i.reported.pass).length}/${s.filter((i) => i.inAnswer).length} in the answer${bad}`;
}

export const pageName = (id: string, model: string, main: string) => (model === main ? `${id}.html` : `${id}.${slug(modelLabel(model))}.html`);

function casePage(id: string, paper: Paper | undefined, c: CaseSpec | undefined, ctx: RunCtx, all: RunCtx[], mainModel: string): string {
  const { run, entries, san } = ctx;
  const title = paperTitle(paper, id);
  const user = entries.find((e) => e.kind === "user");
  const message = san(String(user?.data.text ?? (paper?.prompt ?? "")).trim());
  const final = entries.filter((e) => e.kind === "assistant" && e.data.final === true).at(-1);
  const full = String(final?.data.text ?? run.answer ?? "");
  const answer = modelAnswer(full);
  const tail = full.slice(answer.length).trim();
  const scored = run.items.filter((i) => !i.reference);
  const ref = run.items.filter((i) => i.reference);
  const isMain = run.model === mainModel;
  const tabs = all.length > 1 ? `<div class="tabs">${all.map((r) => (r === ctx ? `<span>${esc(modelLabel(r.run.model))} run</span>` : `<a href="${esc(pageName(id, r.run.model, mainModel))}">${esc(modelLabel(r.run.model))} run</a>`)).join("")}</div>` : "";
  const unmatched = c && paper ? caseGaps(paper, c) : [];
  const sections: string[] = [];
  sections.push(`<p class="crumbs"><a href="../benchmark.html">Benchmark</a> / <a href="index.html">Papers</a> / ${esc(c?.short ?? id)}</p>
<h1>${esc(title)}</h1>
<p class="meta-line">${esc(c?.field ?? "")}${c ? ` · ${esc(c.kind)} · ${esc(c.program)}` : ""}</p>
<div class="notice"><p><strong>How to read this page.</strong> The benchmark plays the scientist. It gave the scientist's answers automatically, from the paper's methods, through an answers file. The run is one sample: another run can give different steps and numbers.${isMain ? "" : ` This page shows the ${esc(modelLabel(run.model))} run. <a href="${esc(pageName(id, mainModel, mainModel))}">The main page</a> shows the ${esc(modelLabel(mainModel))} run.`}</p></div>
<p class="result-sum">${esc(modelLabel(run.model))}: ${esc(scoreLine(run))}</p>
<ul class="toc"><li><a href="#paper">The paper</a></li><li><a href="#instruction">The instruction</a></li><li><a href="#session">The session</a></li><li><a href="#answer">The final answer</a></li><li><a href="#results">Results</a></li><li><a href="#checks">Checks</a></li><li><a href="#repeat">How to repeat it</a></li><li><a href="#figure">Figure</a></li><li><a href="#facts">Run facts</a></li>${all.length > 1 ? '<li><a href="#compare">Both models</a></li>' : ""}</ul>`);
  sections.push(`<h2 id="paper">The paper</h2>${c ? `${citationHtml(c)}<h3>What it measured</h3><p>${esc(c.measured)}</p><h3>Data</h3><p>${esc(c.data.source)}${c.data.size ? `. Size: ${esc(c.data.size)}` : ""}.</p><p>License: ${esc(c.data.license)}</p>${c.data.url ? `<p class="small"><a href="${esc(c.data.url)}">Data source</a></p>` : ""}` : `<p class="muted">No case description for this paper yet.</p>`}`);
  sections.push(`<h2 id="instruction">The instruction</h2>
<p>The benchmark sent this message as the scientist. The file paths point to the fetched data.</p>
<div class="chat"><div class="bubble"><span class="who">Scientist</span>${esc(message)}</div></div>
${c ? `<p>The same request in the words of the paper's method:</p><blockquote>${esc(c.instruction)}</blockquote>${c.instruction_basis ? `<p class="small muted">Basis: ${esc(c.instruction_basis)}</p>` : ""}` : ""}`);
  sections.push(`<h2 id="session">The session</h2>${tabs}
<p>This is the session as the scientist sees it, in order. Decision cards show the answer that the benchmark gave and the source of that answer in the paper. Each step shows the program, its version, the input file hash and the outputs. Click a line to see more.</p>
${transcriptHtml(ctx, c, answer)}`);
  sections.push(`<h2 id="answer">The final answer</h2><p>The model wrote this answer. The harness shows it to the scientist after the review.</p>${answer ? `<div class="answer-box md">${renderMarkdown(san(answer))}</div>` : `<p class="muted">The run gave no final answer.</p>`}${tail ? details("The harness adds the settings and the step results that the answer does not mention", pre(san(tail))) : ""}`);
  sections.push(`<h2 id="results">Results</h2>
<p>Computed: a number in the session record is within the tolerance of the paper value. In the answer: the final answer states the value, and the claim check links it to a logged result. Each item links to the step and the log entry that hold the value.</p>
${scored.length ? itemsTable(scored, ctx, c) : `<p class="muted">This paper has no scored items.</p>`}
${extraTable(ref, ctx.extra, c, ctx)}`);
  sections.push(`<h2 id="checks">Checks</h2>${checksHtml(ctx, paper)}`);
  sections.push(`<h2 id="repeat">How to repeat it</h2>${repeatHtml(paper, id, ctx)}`);
  sections.push(`<h2 id="figure">Figure</h2>${ctx.figure ? `<figure class="figure"><img src="img/${esc(ctx.figure)}" alt="Paper-style figure for ${esc(c?.short ?? id)}, from the ${esc(modelLabel(run.model))} run" loading="lazy"><figcaption>The figure script of the benchmark draws the values of this run in the style of the paper.</figcaption></figure>` : `<p class="muted">No figure for this run.</p>`}`);
  sections.push(`<h2 id="facts">Run facts</h2>${factsHtml(ctx, ctx.recordFile ? `records/${ctx.recordFile}` : undefined)}`);
  if (all.length > 1) sections.push(`<h2 id="compare">Both models</h2><p>Each model did one run with the same message and the same answers file.</p>${compareHtml(all, c)}`);
  if (unmatched.length) sections.push(`<p class="small muted">The case description has no entry for: ${esc(unmatched.join(", "))}.</p>`);
  return pageShell(`${c?.short ?? id}: case`, `How Cuvette reproduced ${c?.short ?? id}: the request, the decisions, each step and the results.`, sections.join("\n"), "case");
}

function indexPage(rows: { id: string; c?: CaseSpec; title: string; runs: Map<string, PaperRun> }[], models: string[], mainModel: string): string {
  const fieldIdx = (f: string | undefined) => (f && FIELD_ORDER.includes(f) ? FIELD_ORDER.indexOf(f) : FIELD_ORDER.length);
  const sorted = [...rows].sort((a, b) => fieldIdx(a.c?.field) - fieldIdx(b.c?.field) || (a.c?.short ?? a.id).localeCompare(b.c?.short ?? b.id));
  const body = sorted.map((r) => {
    const cells = models.map((m) => `<td data-label="${esc(modelLabel(m))}">${r.runs.has(m) ? `<a href="${esc(pageName(r.id, m, mainModel))}">${esc(scoreLine(r.runs.get(m)))}</a>` : "not run"}</td>`);
    return `<tr><td data-label="Field">${esc(r.c?.field ?? "-")}</td><td><a href="${esc(r.id)}.html">${esc(r.c?.short ?? r.id)}</a><span class="sub">${esc(short(r.title, 140))}</span></td><td data-label="Kind">${esc(r.c?.kind ?? "-")}</td><td data-label="Program">${esc(r.c?.program ?? "-")}</td>${cells.join("")}<td data-label="Page"><a href="${esc(r.id)}.html">case page</a></td></tr>`;
  });
  const research = rows.filter((r) => r.c?.kind === "research paper").length;
  const tutorial = rows.filter((r) => r.c?.kind === "tool tutorial or test suite").length;
  return pageShell(
    "Benchmark Papers",
    "One page for each benchmark paper: the request, the decisions, each step, and the results of Cuvette with full provenance.",
    `<p class="crumbs"><a href="../benchmark.html">Benchmark</a> / Papers</p>
<h1>Benchmark papers</h1>
<p class="lede">Each page shows one paper as a case. A scientist gives Cuvette the paper's data and a request from the paper's method. Cuvette runs the program, asks the scientist for each method decision, and records each step.</p>
<div class="notice"><p><strong>How to read these pages.</strong> The benchmark plays the scientist. It gives the answers to the decision cards automatically, from the paper's methods. Each model did one run for each paper. One run is a sample.</p></div>
<p>${rows.length} papers: ${plural(research, "research paper")} and ${plural(tutorial, "tool tutorial or test suite", "tool tutorials or test suites")}. Each cell gives the number of values that the run computed within the tolerance, and the number that the final answer states correctly.</p>
<div class="table-wrap"><table class="stack index"><thead><tr><th>Field</th><th>Paper</th><th>Kind</th><th>Program</th>${models.map((m) => `<th>${esc(modelLabel(m))}</th>`).join("")}<th>Link</th></tr></thead><tbody>${body.join("")}</tbody></table></div>`,
    "index",
  );
}

// ---------------------------------------------------------------- build

export interface CasesOptions {
  results: string[];
  out: string;
  papersDir?: string;
  python?: string;
  style?: string;
  figures?: boolean;
  log?: (line: string) => void;
}

export interface CasesInfo {
  index: string;
  pages: string[];
  records: string[];
  problems: string[];
}

function extraItems(paper: Paper | undefined, record: AnalysisRecord | undefined): ExtraItem[] {
  if (!paper || !record) return [];
  return paper.items.filter((i) => i.trap || i.optional).map((item) => ({ item, match: scoreComputed(item, record) }));
}

export function buildCases(opts: CasesOptions): CasesInfo {
  const log = opts.log ?? (() => {});
  const papersDir = opts.papersDir ?? PAPERS_DIR;
  const python = opts.python ?? (existsSync(SCIENCE_PYTHON) ? SCIENCE_PYTHON : "python3");
  const result = mergeResults(opts.results);
  const root = resolve(opts.out);
  const outDir = join(root, "papers");
  for (const d of ["img", "records"]) mkdirSync(join(outDir, d), { recursive: true });
  writeFileSync(join(outDir, "case.css"), `${VARS}\n${CSS}`);
  if (opts.style) copyFileSync(opts.style, join(root, "style.css"));
  const problems: string[] = [];
  const latest = new Map<string, PaperRun>();
  for (const r of result.runs) if (r.status !== "skipped") latest.set(`${r.paper}\u0000${r.model}`, r);
  const models = result.models.filter((m) => [...latest.values()].some((r) => r.model === m));
  const mainModel = models.find((m) => m.startsWith("claude")) ?? models[0] ?? "claude";
  models.sort((a, b) => Number(b === mainModel) - Number(a === mainModel));
  const ids = [...new Set([...paperIds(papersDir), ...[...latest.values()].map((r) => r.paper)])];
  const pages: string[] = [];
  const records: string[] = [];
  const rows: Parameters<typeof indexPage>[0] = [];
  for (const id of ids) {
    let paper: Paper | undefined;
    let c: CaseSpec | undefined;
    try {
      paper = loadPaper(id, papersDir);
    } catch (e) {
      problems.push((e as Error).message);
    }
    try {
      c = loadCase(id, papersDir);
      if (!c) problems.push(`${id}: no case.yaml`);
    } catch (e) {
      problems.push((e as Error).message);
    }
    const runs = new Map(models.flatMap((m) => (latest.has(`${id}\u0000${m}`) ? [[m, latest.get(`${id}\u0000${m}`)!] as [string, PaperRun]] : [])));
    rows.push({ id, c, title: paperTitle(paper, id), runs });
    const ctxs: RunCtx[] = [];
    for (const run of runs.values()) {
      const entries = readEntries(run.dir);
      if (!entries.length) problems.push(`${id} ${run.model}: no session record at ${run.dir}`);
      const record = entries.length && run.dir ? new AnalysisRecord(run.dir, run.session ?? "case") : undefined;
      const nodes = entries.filter((e) => e.kind === "node").map((e) => e.data as unknown as Node);
      const adapters = loadAdapters(entries);
      const san = makeSanitizer(run);
      const ctx: RunCtx = { run, entries, record, nodes, san, labels: labelMap(entries, adapters, c), adapters, extra: extraItems(paper, record) };
      if (entries.length) {
        const file = `${id}-${slug(modelLabel(run.model))}.jsonl.gz`;
        writeFileSync(join(outDir, "records", file), gzipSync(sanitizedLog(entries, san)));
        ctx.recordFile = file;
        records.push(file);
      }
      if (opts.figures !== false && paper && run.items.length) ctx.figure = figureFor(run, paper.dir, join(outDir, "img"), python, log);
      ctxs.push(ctx);
    }
    if (!ctxs.length) continue;
    ctxs.sort((a, b) => Number(b.run.model === mainModel) - Number(a.run.model === mainModel));
    for (const ctx of ctxs) {
      const name = pageName(id, ctx.run.model, mainModel);
      writeFileSync(join(outDir, name), ctx.san(casePage(id, paper, c, ctx, ctxs, ctxs.some((x) => x.run.model === mainModel) ? mainModel : ctxs[0].run.model)));
      pages.push(name);
    }
    log(`${id}: ${ctxs.length} pages`);
  }
  const index = join(outDir, "index.html");
  writeFileSync(index, indexPage(rows.filter((r) => r.runs.size), models, mainModel));
  return { index, pages, records, problems };
}
