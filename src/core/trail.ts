import { checklistHtml, checklistMarkdown, recordChecklist } from "./checklist.ts";
import { pilotText, validationRows } from "./pilot.ts";
import { deviationHtml } from "./freeze.ts";
import { approvedPlan, planMarkdown, questionsOf } from "./plan.ts";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, isAbsolute, join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import type { LoadedAdapter, MapEntry } from "../adapters/manifest.ts";
import { testsMarkdown, testsTable } from "./testcount.ts";
import { referencesHtml, referencesMarkdown, sessionCitations, type CitationStyle } from "./citations.ts";
import { roleInRecord, stepNumbers } from "./housekeeping.ts";
import type { AnalysisRecord } from "./record.ts";
import type { Entry, Node } from "./types.ts";

export type TrailIcon = "setup" | "step" | "decision" | "question" | "deviation" | "finding" | "note";

export interface TrailLine {
  n: number;
  step?: number;
  entry: number;
  icon: TrailIcon;
  line: string;
  stale: boolean;
  group: number;
  badges: string[];
  tool?: string;
  failed?: boolean;
  request?: boolean;
  answer?: boolean;
  details?: Record<string, unknown>;
  technical?: Record<string, unknown>;
}

export interface TrailGroup {
  id: number;
  request?: TrailLine;
  lines: TrailLine[];
}

const IMAGE_CAP = 3 * 1024 * 1024;
const MIME: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".tif": "image/tiff", ".tiff": "image/tiff",
};

export function show(v: unknown): string {
  if (v === undefined || v === null) return "none";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function plainText(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*\|?[-:| ]+\|[-:| ]*$/gm, "")
    .replace(/^\s*[-*]\s+/gm, "");
}

export function shortReason(error: unknown): string {
  const lines = show(error).split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "no reason given";
  const traceback = lines.some((l) => l.startsWith("Traceback") || /^File "/.test(l));
  const pick = traceback ? lines[lines.length - 1] : lines[0];
  return clip(pick.replace(/^(Error executing tool \S+?: )+/, ""), 160);
}

export interface RouteParts {
  menu: string;
  steps: string[];
  macro: string[];
  warnings: string[];
}

export function parseRoute(text: string): RouteParts {
  const out: RouteParts = { menu: "", steps: [], macro: [], warnings: [] };
  let inMacro = false;
  show(text).split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    if (!out.menu && i === 0 && !/^\d+\.\s/.test(line)) {
      out.menu = line;
      return;
    }
    if (/^macro\b.*:$/i.test(line)) {
      inMacro = true;
      return;
    }
    if (inMacro) out.macro.push(raw.replace(/^ {2}/, ""));
    else if (/^warning:/i.test(line)) out.warnings.push(line);
    else out.steps.push(line.replace(/^(\d+\.|-)\s+/, ""));
  });
  return out;
}

function clip(s: string, max = 300): string {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > max ? one.slice(0, max - 1) + "…" : one;
}

export function getPath(obj: unknown, path: string): unknown {
  let cur: any = obj;
  for (const k of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = cur[k];
  }
  return cur;
}

export function fillTemplate(text: string, args: Record<string, unknown>): string {
  return text.replace(/\{([\w.]+)\}/g, (m, k: string) => {
    const v = getPath(args, k);
    return v === undefined ? m : show(v);
  });
}

export interface RouteText {
  route: string;
  steps: string[];
  params: string[];
  warnings: string[];
  fidelity: string;
  difference: string;
}

export function describeRoute(me: MapEntry, args: Record<string, unknown>): RouteText {
  const params: string[] = [];
  const warnings: string[] = [];
  for (const p of me.params) {
    const v = getPath(args, p.arg);
    if (v === undefined) continue;
    params.push(`${p.label} = ${show(v)}`);
    if (p.ui_default !== undefined && show(p.ui_default) !== show(v))
      warnings.push(`Warning: If you keep the default ${show(p.ui_default)}, you get a different result.`);
  }
  return {
    route: me.route,
    steps: me.steps.map((s) => fillTemplate(s, args)),
    params,
    warnings,
    fidelity: me.fidelity,
    difference: me.difference,
  };
}

function routeString(r: RouteText): string {
  return [r.route, ...r.steps.map((s, i) => `${i + 1}. ${s}`), ...r.params, ...r.warnings].filter(Boolean).join("\n");
}

function noRoute(f: unknown): boolean {
  return f === "code_only" || f === "none";
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function nodeFor(record: AnalysisRecord, e: Entry): Node | undefined {
  const id = e.node ?? (typeof e.data.node === "string" ? e.data.node : undefined);
  if (id) return record.node(id);
  return record.nodes().find((n) => n.entry === e.id);
}

function decisionLine(d: Record<string, unknown>): string {
  const who = d.by ? ` by ${show(d.by)}` : "";
  const why = d.reason ? `. Reason: ${show(d.reason)}` : "";
  return `Decision ${show(d.key)}: ${show(d.old)} changed to ${show(d.new)}${who}${why}`;
}

function setupLine(d: Record<string, unknown>): string {
  const values = asRecord(d.values);
  const n = Object.keys(values).length;
  const parts = Object.entries(values).slice(0, 4).map(([k, v]) => `${k} = ${show(v)}`);
  return `Setup: ${n} setting${n === 1 ? "" : "s"}${parts.length ? ` (${parts.join(", ")}${n > 4 ? ", ..." : ""})` : ""}`;
}

interface Built {
  icon: TrailIcon;
  line: string;
  stale?: boolean;
  badges?: string[];
  tool?: string;
  failed?: boolean;
  request?: boolean;
  answer?: boolean;
  details?: Record<string, unknown>;
  technical?: Record<string, unknown>;
}

function stepBuilt(record: AnalysisRecord, e: Entry, node: Node | undefined, adapters: LoadedAdapter[] | undefined, stale: Set<string>, compare: Map<string, string>): Built {
  const d = e.data;
  const tool = show(d.tool ?? node?.tool);
  const adapterName = show(d.adapter ?? node?.adapter);
  const args = asRecord(d.effectiveArgs ?? node?.args);
  const isStale = !!node && stale.has(node.id);
  const plain = typeof args.does === "string" && args.does.trim() ? `${typeof args.purpose === "string" ? `${args.purpose.trim().replace(/\.$/, "")}: ` : ""}${args.does.trim()}` : "";
  let line = clip(plain || show(d.summary || node?.summary || `Ran ${tool}`));
  const failed = d.ok === false;
  if (failed) line = `Failed: ${shortReason(d.error ?? d.text ?? line)}`;

  const adapter = adapters?.find((a) => a.name === adapterName);
  const me = adapter?.mapEntry(tool, args);
  const fidelity = d.fidelity ?? node?.fidelity ?? me?.fidelity;
  const badges: string[] = [];
  if (node && compare.has(node.id)) badges.push("comparison run");
  if (isStale) badges.push("out of date");
  if (noRoute(fidelity)) badges.push("no manual route");

  const given = show(d.manualRoute ?? node?.manualRoute ?? "");
  const manualRoute = given && given !== "none" ? given : me ? routeString(describeRoute(me, args)) : "";
  const result = asRecord(node?.result);
  const table = d.table ?? result.table;
  const outputs = (node?.outputs ?? []).map((o) => ({ name: o.name ?? basename(o.path), kind: o.kind, sha: o.sha }));
  const shas = new Set<string>();
  for (const s of (d.images as string[] | undefined) ?? []) shas.add(s);
  for (const o of node?.outputs ?? []) if (o.kind === "image" && o.sha) shas.add(o.sha);

  const details: Record<string, unknown> = {};
  if (manualRoute) details.manualRoute = manualRoute;
  if (fidelity) details.fidelity = fidelity;
  details.settings = args;
  if (node && Object.keys(node.decisions).length) details.decisions = node.decisions;
  if (outputs.length) details.outputs = outputs;
  if (result.metrics) details.metrics = result.metrics;
  if (table) details.table = table;
  if (shas.size) details.images = [...shas];
  if (failed && (d.error || d.text)) details.error = d.error ?? d.text;
  if (node && compare.has(node.id)) details.comparisonOf = compare.get(node.id);

  const technical: Record<string, unknown> = {
    tool,
    adapter: adapterName,
    args: node?.args ?? args,
    inputHashes: node?.inputHashes ?? [],
    outputHashes: outputs.map((o) => o.sha).filter(Boolean),
    codeHash: node?.codeHash,
    adapterVersion: node?.adapterVersion,
    programVersion: node?.programVersion,
    durationS: d.durationS,
    model: node?.model,
    node: node?.id,
    entry: e.id,
  };
  return { icon: "step", line, stale: isStale, badges, failed, tool, details, technical };
}

function build(record: AnalysisRecord, e: Entry, adapters: LoadedAdapter[] | undefined, stale: Set<string>, joined: Set<string>, compare: Map<string, string>): Built | undefined {
  const d = e.data;
  const tech = (extra: Record<string, unknown> = {}) => ({ entry: e.id, kind: e.kind, ts: e.ts, ...extra });
  switch (e.kind) {
    case "adapter":
      return { icon: "setup", line: `Loaded the adapter ${show(d.name)} ${show(d.version ?? "")}${d.reason ? `: ${clip(String(d.reason))}` : ""}`, details: { programVersion: d.programVersion, status: d.status, programFound: d.programFound, tools: d.tools, notices: d.notices }, technical: tech() };
    case "program":
      return d.ok === false ? undefined : { icon: "setup", line: `Programs: ${clip(show(d.text))}`, details: { action: d.action, adapter: d.adapter, via: d.via }, technical: tech({ command: d.command, paths: d.paths, path: d.path }) };
    case "setup":
      return { icon: "setup", line: setupLine(d), details: { values: d.values, profile: d.profile, how: d.how, defaultsAccepted: d.defaultsAccepted }, technical: tech() };
    case "sensitivity": {
      const opts = (d.options as { value: unknown; ok: boolean; metrics: Record<string, number>; node?: string }[] | undefined) ?? [];
      const said = [...((d.depends as string[]) ?? []), ...((d.holds as string[]) ?? [])].join(" ");
      return {
        icon: "decision",
        line: `Compared ${opts.length} options for ${show(d.decisionKey)}${said ? `: ${clip(said)}` : ""}`,
        badges: ["comparison run"],
        details: { table: d.table, options: opts.map((o) => ({ value: o.value, ok: o.ok, metrics: o.metrics, node: o.node })) },
        technical: tech(),
      };
    }
    case "tool_result": {
      if (d.sensitivityOf) {
        const node = nodeFor(record, e);
        if (node) joined.add(node.id);
        return undefined;
      }
      const node = nodeFor(record, e);
      if (node) joined.add(node.id);
      if (roleInRecord(d.ok === false ? record.entries() : [], e) === "housekeeping") return undefined;
      return stepBuilt(record, e, node, adapters, stale, compare);
    }
    case "node": {
      if (joined.has(e.data.id as string) || e.data.sensitivityOf) return undefined;
      const hasResult = record.entries(["tool_result"]).some((r) => nodeFor(record, r)?.id === e.data.id);
      if (hasResult) return undefined;
      return stepBuilt(record, e, e.data as unknown as Node, adapters, stale, compare);
    }
    case "decision":
      return { icon: "decision", line: decisionLine(d), details: { reason: d.reason, staleNodes: d.staleNodes }, technical: tech() };
    case "owner_change":
      return { icon: "decision", line: `Owner of ${show(d.key)} changed from ${show(d.old)} to ${show(d.new)}${d.by ? ` by ${show(d.by)}` : ""}`, technical: tech() };
    case "question":
      return { icon: "question", line: `Question: ${clip(show(d.title || d.text))}`, details: { text: d.text, options: d.options, evidence: d.evidence, recommendation: d.recommendation }, technical: tech({ qid: d.qid }) };
    case "answer":
      if (d.withdrawn) return { icon: "question", line: `Question ${show(d.qid)} closed with no answer: ${clip(show(d.note))}`, technical: tech() };
      return { icon: "question", line: `Answer to ${show(d.qid)}: ${clip(show(d.value))}${d.by ? ` (by ${show(d.by)})` : ""}`, details: { note: d.note }, technical: tech() };
    case "deviation": {
      const devs = (d.deviations as Record<string, unknown>[] | undefined) ?? [];
      const what = devs.map((x) => (x.overwritten ? `${show(x.arg)}: asked for ${show(x.requested ?? x.used)}, ran with the recorded ${show(x.setup)}` : `${show(x.arg)} used ${show(x.used)}, setup ${show(x.setup)}`)).join("; ");
      return { icon: "deviation", line: `Deviation in ${show(d.tool)}: ${clip(what || "values differ from the setup")}`, details: { deviations: devs }, technical: tech({ callId: d.callId }) };
    }
    case "blocked":
      return { icon: "deviation", line: `Blocked ${show(d.tool)}: ${clip(show(d.reason))}`, details: { reason: d.reason, qid: d.qid }, technical: tech({ callId: d.callId }) };
    case "finding":
      return { icon: "finding", line: `Finding (${show(d.severity)}): ${clip(show(d.message))}`, details: { check: d.check, nodes: d.nodes, entries: d.entries }, technical: tech({ fid: d.fid, source: d.source }) };
    case "finding_resolution":
      return { icon: "finding", line: `Finding ${show(d.fid)} ${show(d.action)}${d.reason ? `: ${clip(show(d.reason))}` : ""}`, technical: tech() };
    case "note":
      return { icon: "note", line: clip(show(d.text)), technical: tech() };
    case "plan_frozen":
      return { icon: "setup", line: `Plan frozen. SHA-256 ${show(d.hash).slice(0, 12)}`, details: { hash: d.hash, version: d.version }, technical: tech() };
    case "plan_deviation":
      return { icon: "deviation", line: `Plan deviation: ${clip(show(d.what))}${d.to !== undefined ? ` (${show(d.from ?? "none")} to ${show(d.to)})` : ""}. Reason: ${clip(show(d.reason || "No reason given"))}`, badges: d.afterResult ? ["Changed after the result was seen"] : undefined, technical: tech() };
    case "plan_approved":
      return { icon: "setup", line: `Confirmed: version ${show(d.version)} of the proposed analysis`, details: { text: d.text, mode: d.mode, answers: d.answers }, technical: tech() };
    case "plan":
      if (d.action === "updated") return { icon: "decision", line: `Plan changed to version ${show(d.version)}. Reason: ${clip(show(d.reason || "none given"))}`, details: { text: d.text }, technical: tech() };
      if (d.action === "pilot_changed") return { icon: "decision", line: `The proposed analysis changed to version ${show(d.version)} before the pilot confirmation. Reason: ${clip(show(d.reason || "none given"))}`, details: { text: d.text }, technical: tech() };
      if (d.action === "change_requested") return { icon: "note", line: `You asked to change the plan: ${clip(show(d.text))}`, technical: tech() };
      if (d.action === "cancelled") return { icon: "note", line: "You cancelled the plan. No step ran.", technical: tech() };
      return undefined;
    case "pilot_run":
      return { icon: "note", line: `Demonstration on ${show(d.sample)}: ${clip(Object.entries((d.values as Record<string, unknown>) ?? {}).map(([k, v]) => `${k} ${show(v)}`).join(", "))}`, badges: ["pilot"], details: { values: d.values, comparison: d.comparison, check: d.check, images: d.images }, technical: tech() };
    case "pilot_approved":
      return { icon: "setup", line: `You confirmed the demonstration on ${show(d.sample)}`, technical: tech() };
    case "pilot_rejected":
      return { icon: "note", line: `Demonstration on ${show(d.sample)} not confirmed: ${clip(show(d.reason))}`, technical: tech() };
    case "clarify":
      return d.action === "answered" ? { icon: "question", line: `Questions: ${((d.answers as string[]) ?? []).length} answered${((d.skipped as string[]) ?? []).length ? `, ${((d.skipped as string[]) ?? []).length} not asked because the request answers them` : ""}`, details: { found: d.found, answers: d.answers, skipped: d.skipped }, technical: tech() } : undefined;
    case "validation":
      return { icon: "decision", line: `Validation against the reference: ${clip(((d.summary as string[]) ?? [])[1] ?? "")}`, details: { summary: d.summary, plot: d.plot }, technical: tech() };
    case "notice":
      return d.plan ? { icon: "deviation", line: clip(show(d.text)), technical: tech() } : undefined;
    case "rewind":
      return { icon: "note", line: `Returned to an earlier point: ${show(d.point)}. ${((d.nodes as string[]) ?? []).length} results marked rewound.`, details: { point: d.point, upTo: d.upTo, nodes: d.nodes }, technical: tech() };
    case "fork":
      return { icon: "note", line: `Branch "${show(d.name)}" of the session ${show((d.parent as { title?: string; id?: string })?.title || (d.parent as { id?: string })?.id)}`, details: { parent: d.parent, upTo: d.upTo }, technical: tech() };
    case "branch":
      return { icon: "note", line: `New branch "${show((d.child as { name?: string })?.name)}" in ${show((d.child as { folder?: string })?.folder)}`, details: { child: d.child, upTo: d.upTo }, technical: tech() };
    case "method":
      return { icon: "setup", line: d.action === "saved" ? `Saved as the method ${show(d.name)}` : `Started from the method ${show(d.name)}`, details: { path: d.path }, technical: tech() };
    case "user":
      if (d.during) return { icon: "note", line: `You wrote while the agent worked (after step ${show(d.afterStep ?? 0)}): ${clip(show(d.text))}`, technical: tech({ typedAt: d.typedAt, afterTool: d.afterTool, now: d.now }) };
      return { icon: "note", line: `You asked: ${clip(show(d.text))}`, request: true, details: { text: d.text }, technical: tech() };
    case "assistant":
      return d.final ? { icon: "note", line: clip(plainText(show(d.text))), answer: true, details: { text: d.text }, technical: tech() } : undefined;
    default:
      return undefined;
  }
}

export function trail(record: AnalysisRecord, level: 1 | 2 | 3 = 1, adapters?: LoadedAdapter[]): TrailLine[] {
  const stale = record.stale();
  const joined = new Set<string>();
  const compare = record.comparisons();
  const steps = stepNumbers(record.nodes());
  const out: TrailLine[] = [];
  let group = 0;
  for (const e of record.entries()) {
    const b = build(record, e, adapters, stale, joined, compare);
    if (!b) continue;
    if (b.request) group++;
    const t: TrailLine = { n: out.length + 1, entry: e.id, icon: b.icon, line: b.line, stale: !!b.stale, group, badges: [...(b.badges ?? []), ...(record.setAside(e.id) ? ["rewound"] : [])] };
    const node = b.icon === "step" && !b.failed ? (b.technical?.node as string | undefined) ?? (e.kind === "node" ? String(e.data.id) : undefined) : undefined;
    if (node && steps.has(node)) t.step = steps.get(node);
    if (b.tool) t.tool = b.tool;
    if (b.failed) t.failed = true;
    if (b.request) t.request = true;
    if (b.answer) t.answer = true;
    if (level >= 2 && b.details) t.details = b.details;
    if (level >= 3 && b.technical) t.technical = b.technical;
    out.push(t);
  }
  return out;
}

export function groupTrail(lines: TrailLine[]): TrailGroup[] {
  const groups = new Map<number, TrailGroup>();
  for (const l of lines) {
    const g = groups.get(l.group) ?? { id: l.group, lines: [] };
    groups.set(l.group, g);
    if (l.request) g.request = l;
    else g.lines.push(l);
  }
  return [...groups.values()].filter((g) => g.request || g.lines.length).sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------- shared export helpers

interface Meta {
  id: string;
  adapters: string;
  model: string;
  date: string;
  setup: Record<string, unknown>;
}

function meta(record: AnalysisRecord): Meta {
  const all = record.entries();
  const s = record.entries(["session"])[0];
  const list = [...((s?.data.adapters as { name: string; version?: string; programVersion?: string }[] | undefined) ?? []), ...record.entries(["adapter"]).map((e) => e.data as { name: string; version?: string; programVersion?: string })];
  const setups = record.entries(["setup"]);
  return {
    id: all[0]?.session ?? "",
    adapters: list.map((a) => `${a.name}${a.version ? " " + a.version : ""}${a.programVersion ? " (program " + a.programVersion + ")" : ""}`).join(", ") || "none",
    model: show(s?.data.model ?? "unknown"),
    date: (all[0]?.ts ?? new Date().toISOString()).slice(0, 10),
    setup: Object.assign({}, ...setups.map((x) => asRecord(x.data.values))),
  };
}

export function writeOut(path: string, text: string): string {
  writeFileSync(path, text);
  return path;
}

// ---------------------------------------------------------------- html

const ICONS: Record<TrailIcon, { sym: string; path: string; label: string }> = {
  setup: { sym: "⚙", label: "Setup", path: "M12 8a4 4 0 100 8 4 4 0 000-8zm0-6l1.5 3 3.2-.9.9 3.2 3 1.5-1.5 3 1.5 3-3 1.5-.9 3.2-3.2-.9L12 22l-1.5-3-3.2.9-.9-3.2-3-1.5 1.5-3-1.5-3 3-1.5.9-3.2 3.2.9z" },
  step: { sym: "▶", label: "Step", path: "M7 4l13 8-13 8z" },
  decision: { sym: "◆", label: "Decision", path: "M12 2l10 10-10 10L2 12z" },
  question: { sym: "?", label: "Question", path: "M12 2a10 10 0 100 20 10 10 0 000-20zm-1 14h2v2h-2zm1-10a3 3 0 013 3c0 2-3 2-3 4h-2c0-3 3-3 3-4a1 1 0 00-2 0H9a3 3 0 013-3z" },
  deviation: { sym: "!", label: "Deviation", path: "M12 2L1 21h22zm1 15h-2v-2h2zm0-4h-2V9h2z" },
  finding: { sym: "⚑", label: "Finding", path: "M5 2v20h2v-8h11l-2-5 2-5H7V2z" },
  note: { sym: "✎", label: "Note", path: "M4 4h16v12H8l-4 4z" },
};

export function esc(s: unknown): string {
  return show(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function iconSvg(icon: TrailIcon): string {
  const i = ICONS[icon];
  return `<svg class="ic ic-${icon}" viewBox="0 0 24 24" role="img" aria-label="${i.label}"><title>${i.label}</title><path d="${i.path}"/></svg>`;
}

export function dataUri(record: AnalysisRecord, sha: string): string | undefined {
  const p = record.blobPath(sha);
  if (!p) return undefined;
  const mime = MIME[extname(p).toLowerCase()];
  if (!mime || statSync(p).size > IMAGE_CAP) return undefined;
  return `data:${mime};base64,${readFileSync(p).toString("base64")}`;
}

// With linkFrom, the page links each image file relative to that folder. Without it, the page holds each image as base64.
export interface HtmlImages {
  linkFrom?: string;
}

function linkTo(from: string, path: string): string {
  const rel = relative(from, path);
  return isAbsolute(rel) ? pathToFileURL(path).href : rel.split(sep).map(encodeURIComponent).join("/");
}

function htmlTable(t: Record<string, unknown>): string {
  const cols = (t.columns as unknown[] | undefined) ?? [];
  const rows = (t.rows as unknown[][] | undefined) ?? [];
  const more = typeof t.n_rows === "number" && t.n_rows > rows.length ? `<p class="muted">Showing ${rows.length} of ${t.n_rows} rows.</p>` : "";
  return `<div class="scroll"><table><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>${more}`;
}

function htmlValue(v: unknown): string {
  if (v && typeof v === "object") return `<pre>${esc(JSON.stringify(v, null, 2))}</pre>`;
  return `<span>${esc(v)}</span>`;
}

function htmlDl(obj: Record<string, unknown>): string {
  const rows = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return `<dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${htmlValue(v)}</dd>`).join("")}</dl>`;
}

function inlineMd(src: string): string {
  return esc(src)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:]|$)/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
}

function tableCells(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      i++;
      out.push(`<pre>${esc(code.join("\n"))}</pre>`);
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = Math.min(h[1].length + 2, 6);
      out.push(`<h${level}>${inlineMd(h[2])}</h${level}>`);
      i++;
      continue;
    }
    if (/^\s*\|/.test(line) && /^\s*\|?[-:| ]+\|[-:| ]*$/.test(lines[i + 1] ?? "")) {
      const head = tableCells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(tableCells(lines[i++]));
      out.push(`<div class="scroll"><table><thead><tr>${head.map((c) => `<th>${inlineMd(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inlineMd(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    const list = /^\s*([-*]|\d+\.)\s+/.exec(line);
    if (list) {
      const ordered = /\d/.test(list[1]);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.map((t) => `<li>${inlineMd(t)}</li>`).join("")}</${tag}>`);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*([-*]|\d+\.)\s+|\s*\|)/.test(lines[i])) para.push(lines[i++]);
    if (!para.length) para.push(lines[i++]);
    out.push(`<p>${inlineMd(para.join(" "))}</p>`);
  }
  return out.join("\n");
}

function imageFigures(record: AnalysisRecord, shas: string[], img: HtmlImages): string {
  const shown = [...new Set(shas)].filter((sha) => !/\.tiff?$/i.test(record.blobPath(sha) ?? ""));
  const figs = shown.slice(0, 6).map((sha) => {
    const p = img.linkFrom ? record.blobPath(sha) : undefined;
    const uri = p && MIME[extname(p).toLowerCase()] ? linkTo(img.linkFrom!, p) : dataUri(record, sha);
    return uri ? `<img src="${esc(uri)}" alt="Result image ${esc(sha.slice(0, 8))}">` : `<p class="muted">Image ${esc(sha.slice(0, 12))} is not embedded.</p>`;
  });
  return figs.length ? `<figure>${figs.join("")}</figure>` : "";
}

function htmlRoute(text: string): string {
  const r = parseRoute(text);
  const steps = r.steps.length ? `<ol class="route">${r.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : "";
  const warn = r.warnings.map((w) => `<p class="warn">${esc(w)}</p>`).join("");
  const macro = r.macro.length ? `<h5>Macro text</h5><pre>${esc(r.macro.join("\n"))}</pre>` : "";
  return `${r.menu ? `<p class="menu">${esc(r.menu)}</p>` : ""}${steps}${warn}${macro}`;
}

const DETAIL_ORDER = ["manualRoute", "settings", "decisions", "metrics", "table", "outputs", "error"];

function htmlDetails(d: Record<string, unknown>): string {
  const parts: string[] = [];
  const keys = [...DETAIL_ORDER.filter((k) => k in d), ...Object.keys(d).filter((k) => !DETAIL_ORDER.includes(k))];
  for (const k of keys) {
    const v = d[k];
    if (v === undefined || v === null || v === "" || k === "images" || k === "text") continue;
    if (k === "settings" && !Object.keys(asRecord(v)).length) continue;
    if (k === "manualRoute") parts.push(`<h4>Manual route</h4>${htmlRoute(show(v))}`);
    else if (k === "table") parts.push(`<h4>Table</h4>${htmlTable(asRecord(v))}`);
    else if (k === "error") parts.push(`<h4>Full error</h4><pre class="error">${esc(v)}</pre>`);
    else if (k === "outputs") {
      const rows = (v as { name: string; kind: string; sha?: string }[]).map((o) => `<li>${esc(o.name)} <span class="muted">${esc(o.kind)} ${esc(o.sha ? o.sha.slice(0, 12) : "")}</span></li>`);
      parts.push(`<h4>Outputs</h4><ul>${rows.join("")}</ul>`);
    } else if (v && typeof v === "object" && !Array.isArray(v) && Object.values(v).every((x) => x === null || typeof x !== "object")) {
      parts.push(`<h4>${esc(k[0].toUpperCase() + k.slice(1))}</h4>${htmlDl(v as Record<string, unknown>)}`);
    } else parts.push(`<h4>${esc(k[0].toUpperCase() + k.slice(1))}</h4>${htmlValue(v)}`);
  }
  return parts.join("");
}

interface SettingRow {
  key: string;
  label: string;
  value: unknown;
  was?: unknown;
  by: string;
}

function settingRows(record: AnalysisRecord, labels: Map<string, string>): SettingRow[] {
  const rows = new Map<string, SettingRow>();
  const how = (d: Record<string, unknown>) => (d.how ? `setup (${show(d.how)})` : "setup");
  for (const e of record.entries(["setup", "decision"])) {
    if (e.kind === "setup") {
      for (const [k, v] of Object.entries(asRecord(e.data.values))) rows.set(k, { key: k, label: labels.get(k) ?? k, value: v, by: how(e.data) });
    } else {
      const k = show(e.data.key);
      const prev = rows.get(k);
      rows.set(k, { key: k, label: labels.get(k) ?? k, value: e.data.new, was: prev && prev.value !== e.data.new ? (prev.was ?? prev.value) : prev?.was, by: show(e.data.by ?? "unknown") });
    }
  }
  return [...rows.values()];
}

const CSS = `
:root{--bg:#fff;--fg:#1c1c1e;--muted:#5f5f68;--line:#d8d8de;--card:#f6f6f8;--accent:#4a2e6e;--warn:#9a5b00;--bad:#a12626;--ok:#1d7a45}
@media (prefers-color-scheme:dark){:root{--bg:#141416;--fg:#ececf0;--muted:#a0a0ab;--line:#34343b;--card:#1d1d21;--accent:#b79be0;--warn:#e0a84a;--bad:#ee7a7a;--ok:#5fd28a}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:860px;margin:0 auto;padding:16px}
h1{font-size:1.5rem;margin:.5rem 0 .25rem}
h2{font-size:1.15rem;margin:2rem 0 .5rem;padding-top:.75rem;border-top:2px solid var(--line)}
h2 .tag{font-weight:400;font-size:.8rem}
h3,h4,h5{margin:1rem 0 .25rem}
h4,h5{font-size:.78rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.meta{color:var(--muted);margin:0 0 1rem;font-size:.9rem}
.meta b{color:var(--fg);font-weight:600}
.question{font-size:1.05rem;margin:.25rem 0 1rem}
table{border-collapse:collapse;width:100%;font-size:.9rem}
th,td{border:1px solid var(--line);padding:4px 8px;text-align:left;vertical-align:top}
th{background:var(--card)}
td.changed{border-left:4px solid var(--warn)}
.scroll{overflow-x:auto}
article.step{border:1px solid var(--line);border-left:5px solid var(--accent);border-radius:8px;margin:8px 0;padding:8px 12px;background:var(--card);break-inside:avoid}
article.failed{border-left-color:var(--bad)}
article.stale{border-left-style:dotted;border-left-color:var(--warn);background:repeating-linear-gradient(135deg,var(--card) 0 8px,var(--bg) 8px 10px)}
article.comparison{border-style:dashed;border-left-style:dashed}
article.kind-deviation,article.kind-finding{border-left-color:var(--warn)}
.head{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap}
.head .n{color:var(--muted);min-width:2ch;text-align:right}
.head .t{flex:1;min-width:12ch;overflow-wrap:anywhere}
.ic{width:18px;height:18px;flex:none;margin-top:3px;fill:var(--accent)}
.ic-deviation,.ic-finding{fill:var(--warn)}
.failed .ic{fill:var(--bad)}
.badge{font-size:.72rem;padding:0 6px;border-radius:4px;border:1px solid var(--muted);color:var(--muted);white-space:nowrap}
.badge.stale{border:1px dotted var(--warn);color:var(--warn)}
.badge.comparison{border-style:dashed}
.badge.failed{border-color:var(--bad);color:var(--bad);font-weight:600}
.reason{margin:.25rem 0 0 2.4rem;color:var(--bad);font-size:.9rem}
details{margin:6px 0 0 2.4rem}
details details{margin-left:0}
summary{cursor:pointer;color:var(--muted);font-size:.85rem}
.body{padding:4px 0 6px}
pre{background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:8px;overflow-x:auto;white-space:pre-wrap;word-break:break-word;font-size:.82rem;margin:.25rem 0}
pre.error{border-color:var(--bad)}
ol.route{margin:.25rem 0;padding-left:1.4rem}
.menu{font-weight:600;margin:.25rem 0}
.warn{color:var(--warn);margin:.25rem 0}
dl{margin:0;display:grid;grid-template-columns:max-content 1fr;gap:2px 12px;font-size:.9rem}
dt{color:var(--muted)}dd{margin:0;overflow-wrap:anywhere}
figure{margin:6px 0 0 2.4rem;display:flex;flex-wrap:wrap;gap:8px}
img{max-width:100%;max-height:320px;height:auto;border:1px solid var(--line);border-radius:6px;display:block}
.answer{border:2px solid var(--accent);border-radius:8px;padding:4px 14px 8px;margin:12px 0;background:var(--bg)}
.answer h3,.answer h4,.answer h5{text-transform:none;letter-spacing:0;font-size:1rem;color:var(--fg)}
.answer>.label{font-size:.78rem;text-transform:uppercase;letter-spacing:.04em;color:var(--accent);margin:.5rem 0 0}
code{font-family:ui-monospace,Menlo,monospace;font-size:.88em;background:var(--card);padding:0 3px;border-radius:3px}
pre code{background:none;padding:0}
.muted{color:var(--muted);font-size:.85rem}
@media print{:root{--bg:#fff;--fg:#000;--card:#fff;--muted:#444;--line:#999}body{font-size:11pt}main{max-width:none;padding:0}article.step,.answer{break-inside:avoid}h2{break-after:avoid}details::details-content{content-visibility:visible;display:block}img{max-height:220px}}
`;

function badgeHtml(label: string): string {
  const cls = label === "out of date" ? "stale" : label === "comparison run" ? "comparison" : label === "failed" ? "failed" : "";
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

function stepHtml(record: AnalysisRecord, t: TrailLine, img: HtmlImages): string {
  const d = t.details ?? {};
  const classes = ["step", `kind-${t.icon}`, t.failed ? "failed" : "", t.stale ? "stale" : "", t.badges.includes("comparison run") ? "comparison" : ""].filter(Boolean).join(" ");
  const badges = [...(t.failed ? ["failed"] : []), ...t.badges].map(badgeHtml).join(" ");
  const body = htmlDetails(d);
  const tech = t.technical ? `<details><summary>Technical record</summary><div class="body">${htmlDl(t.technical)}</div></details>` : "";
  const more = body ? `<details><summary>${t.failed ? "Full error and details" : "Route, settings and details"}</summary><div class="body">${body}</div></details>` : "";
  return `<article class="${classes}" id="s${t.n}"><div class="head">${iconSvg(t.icon)}<span class="n">${t.step ? `Step ${t.step}` : ""}</span><span class="t">${esc(t.line)}</span>${badges}</div>${imageFigures(record, (d.images as string[] | undefined) ?? [], img)}${more}${tech}</article>`;
}

function imgTag(path: string, alt: string, img: HtmlImages): string {
  if (!existsSync(path) || !/\.(png|jpe?g)$/i.test(path) || (!img.linkFrom && statSync(path).size > 5_000_000)) return `<p class="muted">${esc(path)}</p>`;
  const type = /\.png$/i.test(path) ? "image/png" : "image/jpeg";
  const src = img.linkFrom ? linkTo(img.linkFrom, path) : `data:${type};base64,${readFileSync(path).toString("base64")}`;
  return `<figure><img alt="${esc(alt)}" src="${esc(src)}"><figcaption>${esc(basename(path))}</figcaption></figure>`;
}

function planHtml(record: AnalysisRecord, img: HtmlImages): string {
  const p = approvedPlan(record);
  if (!p) return "";
  const pre = (t: string) => `<pre style="white-space:pre-wrap;font:inherit">${esc(t)}</pre>`;
  const q = questionsOf(record, p.entry);
  const questions = q.length ? `<h3>Questions</h3>${pre(q.join("\n"))}` : "";
  const pilot = p.pilot ? `<h3>Demonstration on a sample: ${esc(p.pilot.sample)}</h3>${pre(pilotText(p.pilot))}${p.pilot.images.map((i) => imgTag(i, `QC image of ${p.pilot!.sample}`, img)).join("")}` : "";
  const updates = p.updates.length ? `<h3>Changes after confirmation</h3><ul>${p.updates.map((u) => `<li>Version ${esc(u.version)}: ${esc(u.reason || "no reason given")}</li>`).join("")}</ul>` : "";
  const v = validationRows(record);
  const validation = v
    ? `<h3>Validation against the reference</h3><ul>${v.summary.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><div class="scroll"><table><thead><tr>${v.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${v.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${v.plot ? `${imgTag(v.plot, "Bland-Altman plot", img)}<p class="muted">Bland-Altman plot. Each dot is one sample: the mean of the two values (across) against the agent minus the reference (up). The dark line is the mean difference. The dashed lines are the mean plus and minus 1.96 SD. The gray dot is the pilot sample.</p>` : ""}`
    : "";
  return `<section class="plan" id="plan"><h2>Proposed analysis (version ${esc(p.version)}, confirmed ${esc(p.ts.slice(0, 16).replace("T", " "))})</h2>${questions}<h3>Proposed metrics</h3>${pre(p.text)}${pilot}<h3>Confirmed</h3><p>The scientist confirmed version ${esc(p.version)}.</p>${updates}${validation}${deviationHtml(record, "h3")}</section>`;
}

function testsHtml(record: AnalysisRecord): string {
  const t = testsTable(record);
  if (!t) return "";
  return `<h3>Tests in this session</h3><div class="scroll"><table><thead><tr>${t.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function checklistSection(record: AnalysisRecord): string {
  const c = recordChecklist(record);
  return c ? `<section id="checklist">${checklistHtml(c, esc)}</section>` : "";
}

export const TRAIL_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";

export function exportHtml(record: AnalysisRecord, adapters: LoadedAdapter[], path: string, style: CitationStyle = "apa"): string {
  return writeOut(path, trailHtml(record, adapters, style));
}

export function trailHtml(record: AnalysisRecord, adapters: LoadedAdapter[], style: CitationStyle = "apa", img: HtmlImages = {}): string {
  const m = meta(record);
  const labels = new Map<string, string>();
  for (const a of adapters) for (const d of a.manifest.decisions) labels.set(d.key, d.label);
  const lines = trail(record, 3, adapters);
  const groups = groupTrail(lines);
  const settings = settingRows(record, labels);
  const question = show(settings.find((r) => r.key === "question")?.value ?? "");
  const firstAsk = lines.find((l) => l.request);
  const title = question && question !== "none" ? question : firstAsk ? show(firstAsk.details?.text) : "";
  const hasAsks = groups.some((g) => g.request);
  const settingRowsHtml = settings
    .filter((r) => r.key !== "question")
    .map((r) => `<tr><td>${esc(r.label)}</td><td${r.was !== undefined ? ' class="changed"' : ""}>${esc(r.value)}${r.was !== undefined ? ` <span class="muted">(was ${esc(r.was)})</span>` : ""}</td><td>${esc(r.by)}</td></tr>`)
    .join("");
  const sections = groups.map((g) => {
    const heading = g.request ? `You asked: ${show(g.request.details?.text ?? g.request.line)}` : hasAsks ? "Before the first request" : "Steps";
    const steps = g.lines.filter((l) => !l.answer).map((l) => stepHtml(record, l, img)).join("\n");
    const answers = g.lines.filter((l) => l.answer).map((l) => `<div class="answer"><p class="label">Answer</p>${renderMarkdown(show(l.details?.text ?? l.line))}</div>`).join("\n");
    return `<section id="g${g.id}"><h2>${esc(heading)}</h2>\n${steps}\n${answers}</section>`;
  });
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${img.linkFrom ? TRAIL_CSP.replace("img-src data:", "img-src data: 'self' file:") : TRAIL_CSP}">
<title>Analysis trail ${esc(m.id)}</title><style>${CSS}</style></head>
<body><main>
<h1>Analysis trail</h1>
${title ? `<p class="question"><b>Question</b> ${esc(title)}</p>` : ""}
<p class="meta"><b>Session</b> ${esc(m.id)} &middot; <b>Adapters</b> ${esc(m.adapters)} &middot; <b>Model</b> ${esc(m.model)} &middot; <b>Date</b> ${esc(m.date)}</p>
${planHtml(record, img)}
${settingRowsHtml ? `<h3>Settings</h3><div class="scroll"><table><thead><tr><th>Decision</th><th>Value</th><th>Set by</th></tr></thead><tbody>${settingRowsHtml}</tbody></table></div>` : ""}
${testsHtml(record)}
${sections.join("\n")}
${checklistSection(record)}
<section id="cite">${referencesHtml(sessionCitations(record, adapters, stepNumbers(record.nodes())), style)}</section>
</main></body></html>
`;
  return html;
}

// ---------------------------------------------------------------- markdown

function mdCell(v: unknown): string {
  return show(v).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function mdTable(t: Record<string, unknown>): string[] {
  const cols = ((t.columns as unknown[]) ?? []).map(mdCell);
  if (!cols.length) return [];
  const rows = ((t.rows as unknown[][]) ?? []).map((r) => `| ${r.map(mdCell).join(" | ")} |`);
  return [`| ${cols.join(" | ")} |`, `| ${cols.map(() => "---").join(" | ")} |`, ...rows];
}

function mdDetails(record: AnalysisRecord, d: Record<string, unknown>): string[] {
  const out: string[] = [];
  const add = (label: string, body: string) => out.push(`   - ${label}: ${body}`);
  if (d.manualRoute) {
    out.push("   - Manual route:");
    for (const l of show(d.manualRoute).split("\n")) out.push(`     - ${l}`);
  }
  if (d.fidelity) add("Route match", show(d.fidelity));
  if (d.settings && Object.keys(asRecord(d.settings)).length) add("Settings", Object.entries(asRecord(d.settings)).map(([k, v]) => `${k} = ${show(v)}`).join(", "));
  if (d.decisions) add("Decisions applied", Object.entries(asRecord(d.decisions)).map(([k, v]) => `${k} = ${show(v)}`).join(", "));
  if (d.outputs) add("Outputs", (d.outputs as { name: string; sha?: string }[]).map((o) => `${o.name}${o.sha ? ` (${o.sha.slice(0, 12)})` : ""}`).join(", "));
  if (d.metrics) add("Metrics", Object.entries(asRecord(d.metrics)).map(([k, v]) => `${k} = ${show(v)}`).join(", "));
  if (d.error) add("Error", show(d.error));
  if (d.table) {
    out.push("", ...mdTable(asRecord(d.table)).map((l) => `   ${l}`), "");
  }
  for (const sha of (d.images as string[] | undefined) ?? []) {
    const p = record.blobPath(sha);
    if (p) out.push("", `   ![Result image](<${p}>)`, "");
  }
  const rest = Object.entries(d).filter(([k, v]) => !["values", "manualRoute", "fidelity", "settings", "decisions", "outputs", "metrics", "error", "table", "images"].includes(k) && v !== undefined && v !== null && v !== "");
  for (const [k, v] of rest) add(k, typeof v === "object" ? "`" + JSON.stringify(v) + "`" : show(v));
  return out;
}

function markdownText(record: AnalysisRecord, adapters: LoadedAdapter[], style: CitationStyle = "apa"): string {
  const m = meta(record);
  const labels = new Map<string, string>();
  for (const a of adapters) for (const d of a.manifest.decisions) labels.set(d.key, d.label);
  const lines = [
    "# Analysis trail",
    "",
    `- Session: ${m.id}`,
    `- Adapters: ${m.adapters}`,
    `- Model: ${m.model}`,
    `- Date: ${m.date}`,
    "",
    ...planMarkdown(record),
  ];
  const setup = Object.entries(m.setup);
  if (setup.length) {
    lines.push("## Setup values", "", "| Decision | Value |", "| --- | --- |");
    for (const [k, v] of setup) lines.push(`| ${mdCell(labels.get(k) ?? k)} | ${mdCell(v)} |`);
    lines.push("");
  }
  lines.push(...testsMarkdown(record));
  lines.push("## Steps", "");
  for (const t of trail(record, 2, adapters)) {
    lines.push(`${t.n}. ${t.line.replace(/\n/g, " ")}${t.badges.map((b) => ` [${b}]`).join("")}`);
    if (t.details) lines.push(...mdDetails(record, t.details));
  }
  const checklist = recordChecklist(record);
  if (checklist) lines.push("", ...checklistMarkdown(checklist));
  lines.push("", ...referencesMarkdown(sessionCitations(record, adapters, stepNumbers(record.nodes())), style));
  return lines.join("\n") + "\n";
}

export function exportMarkdown(record: AnalysisRecord, adapters: LoadedAdapter[], path: string, style: CitationStyle = "apa"): string {
  return writeOut(path, markdownText(record, adapters, style));
}

export function exportJsonl(record: AnalysisRecord, path: string): string {
  return writeOut(path, record.entries().map((e) => JSON.stringify(e)).join("\n") + "\n");
}

// ---------------------------------------------------------------- pdf

function runs(cmd: string, args: string[]): boolean {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "pipe"] });
  return !r.error && r.status === 0;
}

function which(cmd: string): boolean {
  return runs(process.platform === "win32" ? "where" : "which", [cmd]);
}

function printWithChrome(chrome: string, profile: string, html: string, out: string): boolean {
  rmSync(out, { force: true });
  spawnSync(chrome, ["--headless", "--disable-gpu", `--user-data-dir=${profile}`, "--no-pdf-header-footer", `--print-to-pdf=${out}`, html], {
    timeout: 30000,
    stdio: "ignore",
  });
  return existsSync(out);
}

export function findPandoc(): string | undefined {
  return ["pandoc", "/opt/homebrew/bin/pandoc"].find((p) => runs(p, ["--version"]));
}

const ENGINES = ["wkhtmltopdf", "weasyprint", "tectonic", "xelatex", "pdflatex"];
const CHROMES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "google-chrome", "chromium", "chrome",
];

export function findChrome(): string | undefined {
  return CHROMES.find((c) => (c.startsWith("/") ? existsSync(c) : which(c)));
}

export function exportPdf(record: AnalysisRecord, adapters: LoadedAdapter[], path: string, style: CitationStyle = "apa"): string {
  const pandoc = findPandoc();
  if (!pandoc) throw new Error("PDF export needs pandoc. Install pandoc, then try again.");
  const tmp = mkdtempSync(join(tmpdir(), "cuvette-pdf-"));
  try {
    const md = join(tmp, "trail.md");
    writeFileSync(md, markdownText(record, adapters, style));
    for (const engine of ENGINES) {
      if (!runs(engine, ["--version"])) continue;
      if (runs(pandoc, [md, "-o", path, `--pdf-engine=${engine}`])) return path;
    }
    const chrome = findChrome();
    if (chrome) {
      const html = join(tmp, "trail.html");
      const css = join(tmp, "trail.css");
      writeFileSync(css, "body{font:11pt/1.4 sans-serif;max-width:none;margin:1.5cm}table{border-collapse:collapse}td,th{border:1px solid #999;padding:3px 6px}img{max-width:100%}");
      if (runs(pandoc, [md, "-s", "--embed-resources", "-c", css, "-o", html, "--metadata", "title=Analysis trail"]) &&
        printWithChrome(chrome, join(tmp, "profile"), html, path)) return path;
    }
    throw new Error("PDF export found no working PDF engine. Install one of: wkhtmltopdf, weasyprint, tectonic, xelatex, pdflatex. Or export HTML and print it from a browser.");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
