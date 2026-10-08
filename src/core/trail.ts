import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import type { LoadedAdapter, MapEntry } from "../adapters/manifest.ts";
import type { AnalysisRecord } from "./record.ts";
import type { Entry, Node } from "./types.ts";

export type TrailIcon = "setup" | "step" | "decision" | "question" | "deviation" | "finding" | "note";

export interface TrailLine {
  n: number;
  entry: number;
  icon: TrailIcon;
  line: string;
  stale: boolean;
  details?: Record<string, unknown>;
  technical?: Record<string, unknown>;
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
  details?: Record<string, unknown>;
  technical?: Record<string, unknown>;
}

function stepBuilt(record: AnalysisRecord, e: Entry, node: Node | undefined, adapters: LoadedAdapter[] | undefined, stale: Set<string>): Built {
  const d = e.data;
  const tool = show(d.tool ?? node?.tool);
  const adapterName = show(d.adapter ?? node?.adapter);
  const args = asRecord(d.effectiveArgs ?? node?.args);
  const isStale = !!node && stale.has(node.id);
  let line = clip(show(d.summary || node?.summary || `Ran ${tool}`));
  if (d.ok === false) line = `Failed: ${clip(show(d.error ?? line))}`;

  const adapter = adapters?.find((a) => a.name === adapterName);
  const me = adapter?.mapEntry(tool, args);
  const fidelity = d.fidelity ?? node?.fidelity ?? me?.fidelity;
  if (noRoute(fidelity)) line += " (no manual route)";
  if (isStale) line += " (out of date)";

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
  if (d.ok === false && d.error) details.error = d.error;

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
  return { icon: "step", line, stale: isStale, details, technical };
}

const HARNESS_TOOLS = new Set(["ask_scientist", "load_skill", "find_tools", "note", "plan", "task", "propose_lab_rule", "read_file", "list_dir"]);

function build(record: AnalysisRecord, e: Entry, adapters: LoadedAdapter[] | undefined, stale: Set<string>, joined: Set<string>): Built | undefined {
  const d = e.data;
  const tech = (extra: Record<string, unknown> = {}) => ({ entry: e.id, kind: e.kind, ts: e.ts, ...extra });
  switch (e.kind) {
    case "setup":
      return { icon: "setup", line: setupLine(d), details: { values: d.values, profile: d.profile, how: d.how, defaultsAccepted: d.defaultsAccepted }, technical: tech() };
    case "sensitivity": {
      const opts = (d.options as { value: unknown; ok: boolean; metrics: Record<string, number>; node?: string }[] | undefined) ?? [];
      const said = [...((d.depends as string[]) ?? []), ...((d.holds as string[]) ?? [])].join(" ");
      return {
        icon: "decision",
        line: `Compared ${opts.length} options for ${show(d.decisionKey)}${said ? `: ${clip(said)}` : ""}`,
        details: { table: d.table, options: opts.map((o) => ({ value: o.value, ok: o.ok, metrics: o.metrics, node: o.node })) },
        technical: tech(),
      };
    }
    case "tool_result": {
      if (!d.adapter && HARNESS_TOOLS.has(String(d.tool))) return undefined;
      if (d.sensitivityOf) {
        const node = nodeFor(record, e);
        if (node) joined.add(node.id);
        return undefined;
      }
      const node = nodeFor(record, e);
      if (node) joined.add(node.id);
      return stepBuilt(record, e, node, adapters, stale);
    }
    case "node": {
      if (joined.has(e.data.id as string) || e.data.sensitivityOf) return undefined;
      const hasResult = record.entries(["tool_result"]).some((r) => nodeFor(record, r)?.id === e.data.id);
      if (hasResult) return undefined;
      return stepBuilt(record, e, e.data as unknown as Node, adapters, stale);
    }
    case "decision":
      return { icon: "decision", line: decisionLine(d), details: { reason: d.reason, staleNodes: d.staleNodes }, technical: tech() };
    case "owner_change":
      return { icon: "decision", line: `Owner of ${show(d.key)} changed from ${show(d.old)} to ${show(d.new)}${d.by ? ` by ${show(d.by)}` : ""}`, technical: tech() };
    case "question":
      return { icon: "question", line: `Question: ${clip(show(d.title || d.text))}`, details: { text: d.text, options: d.options, evidence: d.evidence, recommendation: d.recommendation }, technical: tech({ qid: d.qid }) };
    case "answer":
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
    case "user":
      return { icon: "note", line: `You: ${clip(show(d.text))}`, technical: tech() };
    case "assistant":
      return d.final ? { icon: "note", line: clip(plainText(show(d.text))), details: { text: d.text }, technical: tech() } : undefined;
    default:
      return undefined;
  }
}

export function trail(record: AnalysisRecord, level: 1 | 2 | 3 = 1, adapters?: LoadedAdapter[]): TrailLine[] {
  const stale = record.stale();
  const joined = new Set<string>();
  const out: TrailLine[] = [];
  for (const e of record.entries()) {
    const b = build(record, e, adapters, stale, joined);
    if (!b) continue;
    const t: TrailLine = { n: out.length + 1, entry: e.id, icon: b.icon, line: b.line, stale: !!b.stale };
    if (level >= 2 && b.details) t.details = b.details;
    if (level >= 3 && b.technical) t.technical = b.technical;
    out.push(t);
  }
  return out;
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
  const list = (s?.data.adapters as { name: string; version?: string; programVersion?: string }[] | undefined) ?? [];
  const setups = record.entries(["setup"]);
  return {
    id: all[0]?.session ?? "",
    adapters: list.map((a) => `${a.name}${a.version ? " " + a.version : ""}${a.programVersion ? " (program " + a.programVersion + ")" : ""}`).join(", ") || "none",
    model: show(s?.data.model ?? "unknown"),
    date: (all[0]?.ts ?? new Date().toISOString()).slice(0, 10),
    setup: asRecord(setups[setups.length - 1]?.data.values),
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

function esc(s: unknown): string {
  return show(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function iconSvg(icon: TrailIcon): string {
  const i = ICONS[icon];
  return `<svg class="ic ic-${icon}" viewBox="0 0 24 24" role="img" aria-label="${i.label}"><title>${i.label}</title><path d="${i.path}"/></svg>`;
}

function dataUri(record: AnalysisRecord, sha: string): string | undefined {
  const p = record.blobPath(sha);
  if (!p) return undefined;
  const mime = MIME[extname(p).toLowerCase()];
  if (!mime || statSync(p).size > IMAGE_CAP) return undefined;
  return `data:${mime};base64,${readFileSync(p).toString("base64")}`;
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

function htmlDetails(record: AnalysisRecord, d: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(d)) {
    if (v === undefined || v === null || v === "") continue;
    if (k === "manualRoute") parts.push(`<h4>Manual route</h4><pre class="route">${esc(v)}</pre>`);
    else if (k === "table") parts.push(`<h4>Table</h4>${htmlTable(asRecord(v))}`);
    else if (k === "images") {
      const imgs = (v as string[]).map((sha) => {
        const uri = dataUri(record, sha);
        return uri ? `<img src="${uri}" alt="Result image ${esc(sha.slice(0, 8))}">` : `<p class="muted">Image ${esc(sha.slice(0, 12))} is not embedded.</p>`;
      });
      parts.push(`<h4>Images</h4>${imgs.join("")}`);
    } else if (k === "outputs") {
      const rows = (v as { name: string; kind: string; sha?: string }[]).map((o) => `<li>${esc(o.name)} <span class="muted">${esc(o.kind)} ${esc(o.sha ? o.sha.slice(0, 12) : "")}</span></li>`);
      parts.push(`<h4>Outputs</h4><ul>${rows.join("")}</ul>`);
    } else parts.push(`<h4>${esc(k[0].toUpperCase() + k.slice(1))}</h4>${htmlValue(v)}`);
  }
  return parts.join("");
}

const CSS = `
:root{--bg:#fff;--fg:#1c1c1e;--muted:#6b6b72;--line:#d8d8de;--card:#f6f6f8;--accent:#4a2e6e;--warn:#9a5b00;--bad:#a12626}
@media (prefers-color-scheme:dark){:root{--bg:#141416;--fg:#ececf0;--muted:#9a9aa5;--line:#34343b;--card:#1d1d21;--accent:#b79be0;--warn:#e0a84a;--bad:#ee7a7a}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:860px;margin:0 auto;padding:16px}
h1{font-size:1.5rem;margin:.5rem 0}
h2{font-size:1.1rem;margin:1.5rem 0 .5rem}
h4{font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin:1rem 0 .25rem}
.meta{color:var(--muted);margin:0 0 1rem;font-size:.9rem}
.meta b{color:var(--fg);font-weight:600}
table{border-collapse:collapse;width:100%;font-size:.9rem}
th,td{border:1px solid var(--line);padding:4px 8px;text-align:left;vertical-align:top}
th{background:var(--card)}
.scroll{overflow-x:auto}
details{border:1px solid var(--line);border-radius:8px;margin:6px 0;background:var(--card)}
details details{background:var(--bg);margin:10px 0 0}
summary{cursor:pointer;padding:8px 10px;display:flex;gap:8px;align-items:flex-start;list-style:none}
summary::-webkit-details-marker{display:none}
summary .n{color:var(--muted);min-width:2ch;text-align:right}
summary .t{flex:1;overflow-wrap:anywhere}
.ic{width:18px;height:18px;flex:none;margin-top:3px;fill:var(--accent)}
.ic-deviation,.ic-finding{fill:var(--warn)}
.stale .t{color:var(--muted)}
.body{padding:0 12px 10px}
pre{background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:8px;overflow-x:auto;white-space:pre-wrap;word-break:break-word;font-size:.85rem;margin:.25rem 0}
dl{margin:0;display:grid;grid-template-columns:max-content 1fr;gap:2px 12px;font-size:.9rem}
dt{color:var(--muted)}dd{margin:0;overflow-wrap:anywhere}
img{max-width:100%;height:auto;border:1px solid var(--line);border-radius:6px;margin:4px 0;display:block}
.muted{color:var(--muted);font-size:.85rem}
@media print{:root{--bg:#fff;--fg:#000;--card:#fff;--muted:#444;--line:#999}body{font-size:11pt}details{break-inside:avoid;border-color:#999}summary{display:block}main{max-width:none;padding:0}}
`;

export function exportHtml(record: AnalysisRecord, adapters: LoadedAdapter[], path: string): string {
  const m = meta(record);
  const labels = new Map<string, string>();
  for (const a of adapters) for (const d of a.manifest.decisions) labels.set(d.key, d.label);
  const setupRows = Object.entries(m.setup)
    .map(([k, v]) => `<tr><td>${esc(labels.get(k) ?? k)}</td><td>${esc(v)}</td></tr>`)
    .join("");
  const items = trail(record, 3, adapters).map((t) => {
    const detail = t.details ? htmlDetails(record, t.details) : "";
    const tech = t.technical ? `<details><summary><span class="t">Technical record</span></summary><div class="body">${htmlDl(t.technical)}</div></details>` : "";
    return `<details class="${t.stale ? "stale" : ""}" id="s${t.n}"><summary>${iconSvg(t.icon)}<span class="n">${t.n}.</span><span class="t">${esc(t.line)}</span></summary><div class="body">${detail}${tech}</div></details>`;
  });
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Analysis trail ${esc(m.id)}</title><style>${CSS}</style></head>
<body><main>
<h1>Analysis trail</h1>
<p class="meta"><b>Session</b> ${esc(m.id)} &middot; <b>Adapters</b> ${esc(m.adapters)} &middot; <b>Model</b> ${esc(m.model)} &middot; <b>Date</b> ${esc(m.date)}</p>
${setupRows ? `<h2>Setup values</h2><div class="scroll"><table><thead><tr><th>Decision</th><th>Value</th></tr></thead><tbody>${setupRows}</tbody></table></div>` : ""}
<h2>Steps</h2>
${items.join("\n")}
</main></body></html>
`;
  return writeOut(path, html);
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
    if (p) out.push("", `   ![Result image](${p})`, "");
  }
  const rest = Object.entries(d).filter(([k, v]) => !["values", "manualRoute", "fidelity", "settings", "decisions", "outputs", "metrics", "error", "table", "images"].includes(k) && v !== undefined && v !== null && v !== "");
  for (const [k, v] of rest) add(k, typeof v === "object" ? "`" + JSON.stringify(v) + "`" : show(v));
  return out;
}

function markdownText(record: AnalysisRecord, adapters: LoadedAdapter[]): string {
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
  ];
  const setup = Object.entries(m.setup);
  if (setup.length) {
    lines.push("## Setup values", "", "| Decision | Value |", "| --- | --- |");
    for (const [k, v] of setup) lines.push(`| ${mdCell(labels.get(k) ?? k)} | ${mdCell(v)} |`);
    lines.push("");
  }
  lines.push("## Steps", "");
  for (const t of trail(record, 2, adapters)) {
    lines.push(`${t.n}. ${t.line.replace(/\n/g, " ")}`);
    if (t.details) lines.push(...mdDetails(record, t.details));
  }
  return lines.join("\n") + "\n";
}

export function exportMarkdown(record: AnalysisRecord, adapters: LoadedAdapter[], path: string): string {
  return writeOut(path, markdownText(record, adapters));
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

function findPandoc(): string | undefined {
  return ["pandoc", "/opt/homebrew/bin/pandoc"].find((p) => runs(p, ["--version"]));
}

const ENGINES = ["wkhtmltopdf", "weasyprint", "tectonic", "xelatex", "pdflatex"];
const CHROMES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "google-chrome", "chromium", "chrome",
];

export function exportPdf(record: AnalysisRecord, adapters: LoadedAdapter[], path: string): string {
  const pandoc = findPandoc();
  if (!pandoc) throw new Error("PDF export needs pandoc. Install pandoc, then try again.");
  const tmp = mkdtempSync(join(tmpdir(), "ga-pdf-"));
  try {
    const md = join(tmp, "trail.md");
    writeFileSync(md, markdownText(record, adapters));
    for (const engine of ENGINES) {
      if (!runs(engine, ["--version"])) continue;
      if (runs(pandoc, [md, "-o", path, `--pdf-engine=${engine}`])) return path;
    }
    const chrome = CHROMES.find((c) => (c.startsWith("/") ? existsSync(c) : which(c)));
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
