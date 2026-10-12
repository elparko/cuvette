import { CHECKLIST_COLUMNS, checklistHtml, checklistMarkdown, checklistRows, recordChecklist } from "../core/checklist.ts";
import { pilotText } from "../core/pilot.ts";
import { deviationHtml } from "../core/freeze.ts";
import { approvedPlan, planMarkdown } from "../core/plan.ts";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { userInfo } from "node:os";
import { basename, extname, join } from "node:path";
import type { LoadedAdapter } from "../adapters/manifest.ts";
import type { DecisionField } from "../core/decisions.ts";
import { exportProtocol, mainNodes, setupValues, stepLines } from "../core/exports.ts";
import type { AnalysisRecord } from "../core/record.ts";
import { exportHtml, show } from "../core/trail.ts";
import { allRefs, sessionCitations, toBibtex, type CitationStyle } from "../core/citations.ts";
import type { Finding } from "../core/types.ts";
import { zip, type ZipFile } from "./zip.ts";

export interface ElnSource {
  dir: string;
  record: AnalysisRecord;
  adapters: LoadedAdapter[];
  decisions: { fields(): DecisionField[] };
  findings: { list(): Finding[] };
  citationStyle?(): CitationStyle;
}

export interface ElnFile {
  path: string;
  data: Buffer;
  mime: string;
  sha256: string;
  description?: string;
}

export interface ElnStep {
  folder: string;
  name: string;
  files: ElnFile[];
}

export interface ElnContent {
  id: string;
  title: string;
  question: string;
  answer: string;
  settings: string;
  created: string;
  modified: string;
  keywords: string[];
  files: ElnFile[];
  steps: ElnStep[];
  decisionRows: { key: string; label: string; value: string; owner: string; setBy: string }[];
  findings: Finding[];
  logSha256: string;
  bodyHtml: string;
}

const MIME: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".tif": "image/tiff", ".tiff": "image/tiff",
  ".svg": "image/svg+xml", ".csv": "text/csv", ".tsv": "text/tab-separated-values", ".txt": "text/plain", ".md": "text/markdown",
  ".html": "text/html", ".json": "application/json", ".jsonl": "application/x-ndjson", ".pdf": "application/pdf", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".eln": "application/vnd.eln+zip",
};

export const mimeOf = (name: string) => MIME[extname(name).toLowerCase()] ?? "application/octet-stream";
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "step";

export function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function file(path: string, data: Buffer | string, description?: string): ElnFile {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return { path, data: buf, mime: mimeOf(path), sha256: sha(buf), description };
}

function csv(rows: string[][]): string {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return rows.map((r) => r.map(cell).join(",")).join("\n") + "\n";
}

function setBy(record: AnalysisRecord): Record<string, string> {
  const by: Record<string, string> = {};
  for (const e of record.entries(["setup", "decision"])) {
    if (e.kind === "setup") {
      const defaults = new Set((e.data.defaultsAccepted as string[] | undefined) ?? []);
      for (const k of Object.keys((e.data.values as object) ?? {})) by[k] = defaults.has(k) ? "default" : "scientist (setup)";
    } else by[String(e.data.key)] = String(e.data.by ?? "human");
  }
  return by;
}

function findingsMd(list: Finding[]): string {
  if (!list.length) return "# Review findings\n\nThe review recorded no findings.\n";
  return ["# Review findings", "", ...list.map((f) => `- ${f.fid} [${f.severity}] ${f.check}: ${f.message} (${f.status})`), ""].join("\n");
}

function table(head: string[], rows: string[][]): string {
  const th = head.map((h) => `<th>${esc(h)}</th>`).join("");
  const tr = rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

export function collect(src: ElnSource): ElnContent {
  const { record, adapters } = src;
  const exp = join(src.dir, "exports");
  mkdirSync(exp, { recursive: true });
  const entries = record.entries();
  const id = entries[0]?.session ?? "session";
  const values = setupValues(record);
  const question = show(values.question ?? record.entries(["user"])[0]?.data.text ?? "");
  const finals = record.entries(["assistant"]).filter((e) => e.data.final);
  const last = finals.at(-1);
  const answer = String(last?.data.text ?? "");
  const by = setBy(record);
  const fields = src.decisions.fields();
  const decisionRows = fields
    .filter((f) => f.set)
    .map((f) => ({ key: f.key, label: f.label, value: show(f.value), owner: f.owner, setBy: by[f.key] ?? "setup" }));
  const settings = decisionRows.filter((r) => r.key !== "question").map((r) => `${r.label} ${r.value}`).join(" · ");
  const findings = src.findings.list();
  const style = src.citationStyle?.() ?? "apa";
  const protocolPath = exportProtocol(record, adapters, join(exp, "protocol.md"), style);
  const trailPath = exportHtml(record, adapters, join(exp, "trail.html"), style);
  const refs = allRefs(sessionCitations(record, adapters));
  const logBuf = readFileSync(join(record.dir, "log.jsonl"));
  const plan = planMarkdown(record);
  const checklist = recordChecklist(record);
  const files: ElnFile[] = [
    ...(plan.length ? [file("plan.md", `${plan.join("\n").replace(/^## /, "# ")}\n`, "The confirmed analysis, with its pilot, that the scientist confirmed before the analysis")] : []),
    file("question.md", `# Question\n\n${question || "No question was recorded."}\n`),
    file("answer.md", `# Final answer\n\n${answer || "No final answer was recorded."}\n${settings ? `\nSettings: ${settings}\n` : ""}`),
    file("protocol.md", readFileSync(protocolPath), "Protocol with the manual route for each step"),
    file("trail.html", readFileSync(trailPath), "Audit trail"),
    file("decisions.csv", csv([["key", "label", "value", "owner", "set_by"], ...decisionRows.map((r) => [r.key, r.label, r.value, r.owner, r.setBy])]), "Each decision and who set it"),
    file("findings.md", findingsMd(findings), "Review findings"),
    ...(checklist
      ? [
          file("checklist.md", `${checklistMarkdown(checklist).join("\n").replace(/^## /, "# ")}\n`, `Reporting checklist ${checklist.guideline.name}, filled from the record`),
          file("checklist.csv", csv([CHECKLIST_COLUMNS, ...checklistRows(checklist)]), "Reporting checklist as a table"),
        ]
      : []),
    ...(record.nodes().some((n) => n.adapter) ? [file("references.bib", toBibtex(refs), "BibTeX references for the programs and methods that ran")] : []),
    file("log.jsonl", logBuf, "The append-only session log"),
  ];
  const steps: ElnStep[] = mainNodes(record).map((n, i) => {
    const folder = `steps/${String(i + 1).padStart(2, "0")}-${slug(n.tool)}`;
    const md = [
      `# Step ${i + 1}: ${n.summary || n.tool}`,
      "",
      `Tool: ${n.tool} (${n.adapter} ${n.adapterVersion}, program ${n.programVersion || "unknown"})`,
      `Time: ${n.ts}`,
      `Settings: ${JSON.stringify(n.args)}`,
      "",
      ...stepLines(adapters, n),
      "",
    ].join("\n");
    const stepFiles = [file(`${folder}/step.md`, md, "Step description and manual route")];
    const used = new Set<string>(["step.md"]);
    for (const o of n.outputs) {
      const p = o.sha ? record.blobPath(o.sha) : existsSync(o.path) ? o.path : undefined;
      if (!p) continue;
      let name = basename(o.name || o.path);
      if (used.has(name)) name = `${o.sha?.slice(0, 8) ?? used.size}-${name}`;
      used.add(name);
      stepFiles.push(file(`${folder}/${name}`, readFileSync(p), o.kind === "image" ? "Figure" : o.kind === "table" ? "Table" : "Output file"));
    }
    return { folder, name: `Step ${i + 1}: ${n.summary || n.tool}`, files: stepFiles };
  });
  const adapterNames = [...new Set(record.nodes().map((n) => n.adapter))];
  const approved = approvedPlan(record);
  const html = [
    ...(approved ? [`<h2>Proposed analysis, confirmed (version ${approved.version})</h2><h3>Proposed metrics</h3><pre>${esc(approved.text)}</pre>${approved.pilot ? `<h3>Demonstration on a sample</h3><pre>${esc(pilotText(approved.pilot))}</pre>` : ""}${deviationHtml(record, "h2")}`] : []),
    `<h2>Question</h2><p>${esc(question)}</p>`,
    `<h2>Final answer</h2><p>${esc(answer).replace(/\n/g, "<br>")}</p>`,
    `<h2>Decisions</h2>${decisionRows.length ? table(["Decision", "Value", "Owner", "Set by"], decisionRows.map((r) => [r.label, r.value, r.owner, r.setBy])) : "<p>No setup values were recorded.</p>"}`,
    `<h2>Steps</h2>${steps.length ? `<ol>${mainNodes(record).map((n, i) => `<li><b>${esc(n.summary || n.tool)}</b><br>${esc(stepLines(adapters, n).join(" "))}</li>`).join("")}</ol>` : "<p>No steps were recorded.</p>"}`,
    ...(checklist ? [checklistHtml(checklist, esc)] : []),
    `<h2>Review findings</h2>${findings.length ? `<ul>${findings.map((f) => `<li>[${esc(f.severity)}] ${esc(f.message)} (${esc(f.status)})</li>`).join("")}</ul>` : "<p>No findings.</p>"}`,
    `<p>Log SHA-256: <code>${sha(logBuf)}</code></p>`,
  ].join("\n");
  const title = `Cuvette session ${id}${question ? `: ${question.replace(/\s+/g, " ").slice(0, 80)}` : ""}`;
  return {
    id, title, question, answer, settings,
    created: entries[0]?.ts ?? new Date().toISOString(),
    modified: entries.at(-1)?.ts ?? new Date().toISOString(),
    keywords: ["cuvette", ...adapterNames],
    files, steps, decisionRows, findings, logSha256: sha(logBuf), bodyHtml: html,
  };
}

function person(): { id: string; name: string } {
  let name = "scientist";
  try {
    name = userInfo().username || name;
  } catch {}
  return { id: `#person-${slug(name)}`, name };
}

function fileNode(f: ElnFile, author: string, date: string): Record<string, unknown> {
  return {
    "@id": `./analysis/${f.path}`,
    "@type": "File",
    name: basename(f.path),
    encodingFormat: f.mime,
    contentSize: String(f.data.length),
    sha256: f.sha256,
    dateCreated: date,
    author: { "@id": author },
    ...(f.description ? { description: f.description } : {}),
  };
}

export function buildElnFiles(c: ElnContent): ZipFile[] {
  const me = person();
  const top = `${c.id}/`;
  const ref = (p: string) => ({ "@id": p });
  const stepFolders = c.steps.map((s) => ({ "@id": `./analysis/${s.folder}/`, "@type": "Dataset", name: s.name, author: ref(me.id), dateCreated: c.created, hasPart: s.files.map((f) => ref(`./analysis/${f.path}`)) }));
  const decisionNodes = c.decisionRows.map((r) => ({ "@id": `#decision-${r.key}`, "@type": "PropertyValue", name: r.label, propertyID: r.key, value: r.value, description: `Owner ${r.owner}. Set by ${r.setBy}.` }));
  const graph: Record<string, unknown>[] = [
    {
      "@id": "ro-crate-metadata.json",
      "@type": "CreativeWork",
      about: ref("./"),
      conformsTo: ref("https://w3id.org/ro/crate/1.2"),
      dateCreated: new Date().toISOString(),
      sdPublisher: ref("#cuvette"),
    },
    { "@id": "#cuvette", "@type": "Organization", name: "Cuvette" },
    {
      "@id": "./",
      "@type": "Dataset",
      name: c.title,
      description: `Export of the Cuvette session ${c.id}.`,
      datePublished: new Date().toISOString(),
      author: ref(me.id),
      hasPart: [ref("./analysis/")],
    },
    { "@id": me.id, "@type": "Person", name: me.name },
    {
      "@id": "./analysis/",
      "@type": "Dataset",
      name: c.title,
      author: ref(me.id),
      dateCreated: c.created,
      dateModified: c.modified,
      keywords: c.keywords.join(", "),
      text: [c.question && `Question: ${c.question}`, c.answer && `Answer: ${c.answer}`].filter(Boolean).join("\n\n"),
      variableMeasured: decisionNodes.map((d) => ref(d["@id"] as string)),
      hasPart: [...c.files.map((f) => ref(`./analysis/${f.path}`)), ...stepFolders.map((s) => ref(s["@id"]))],
    },
    ...decisionNodes,
    ...c.files.map((f) => fileNode(f, me.id, c.created)),
    ...stepFolders,
    ...c.steps.flatMap((s) => s.files.map((f) => fileNode(f, me.id, c.created))),
  ];
  const meta = { "@context": "https://w3id.org/ro/crate/1.2/context", "@graph": graph };
  const dirs = ["analysis/", ...c.steps.map((s) => `analysis/${s.folder}/`)];
  return [
    { name: top, data: Buffer.alloc(0) },
    { name: `${top}ro-crate-metadata.json`, data: Buffer.from(JSON.stringify(meta, null, 2) + "\n") },
    ...dirs.map((d) => ({ name: top + d, data: Buffer.alloc(0) })),
    ...[...c.files, ...c.steps.flatMap((s) => s.files)].map((f) => ({ name: `${top}analysis/${f.path}`, data: f.data })),
  ];
}

export function exportEln(src: ElnSource, path: string, content = collect(src)): string {
  writeFileSync(path, zip(buildElnFiles(content)));
  return path;
}
