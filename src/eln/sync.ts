import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DecisionField } from "../core/decisions.ts";
import type { Entry } from "../core/types.ts";
import { baseUrl, type ElabEntity, type Elabftw } from "./elabftw.ts";
import { collect, exportEln, mimeOf, type ElnSource } from "./export.ts";

export interface Attachment {
  name: string;
  data: Buffer;
  mime: string;
  sha256: string;
}

export interface PushPlan {
  title: string;
  server: string;
  experiment?: number;
  version: number;
  section: string;
  tags: string[];
  attachments: Attachment[];
  hash: string;
  display: Record<string, unknown>;
}

interface Prior {
  experiment: number;
  version: number;
  sent: Record<string, string>;
}

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

function prior(entries: Entry[], server: string): Prior | undefined {
  for (const e of [...entries].reverse()) {
    if (e.data.server !== server) continue;
    if (e.kind === "eln_push") return { experiment: Number(e.data.experiment), version: Number(e.data.version), sent: (e.data.attachments as Record<string, string>) ?? {} };
    if (e.kind === "eln_link") return { experiment: Number(e.data.experiment), version: 0, sent: {} };
  }
  return undefined;
}

function kb(n: number): string {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
}

export function planPush(src: ElnSource, serverUrl: string): PushPlan {
  const server = baseUrl(serverUrl);
  const c = collect(src);
  const before = prior(src.record.entries(["eln_push", "eln_link"]), server);
  const version = (before?.version ?? 0) + 1;
  const eln = join(src.dir, "exports", `${c.id}.eln`);
  exportEln(src, eln, c);
  const named = [
    { name: `${c.id}.eln`, data: readFileSync(eln) },
    ...["trail.html", "protocol.md", "log.jsonl"].map((n) => ({ name: n, data: c.files.find((f) => f.path === n)!.data })),
  ];
  const attachments: Attachment[] = [];
  for (const f of named) {
    const s = sha(f.data);
    const old = before?.sent[f.name];
    if (Object.values(before?.sent ?? {}).includes(s)) continue;
    const dot = f.name.lastIndexOf(".");
    const name = old ? `${f.name.slice(0, dot)}-v${version}${f.name.slice(dot)}` : f.name;
    attachments.push({ name, data: f.data, mime: mimeOf(f.name), sha256: s });
  }
  const tags = c.keywords;
  const section = `<h1>Version ${version}, ${new Date().toISOString()}</h1>\n${c.bodyHtml}\n`;
  const hash = sha(JSON.stringify({ title: c.title, body: c.bodyHtml, tags, files: attachments.map((a) => [a.name, a.sha256]) }));
  const action = before ? `update experiment ${before.experiment} (adds version section ${version})` : "create a new experiment";
  return {
    title: c.title,
    server,
    experiment: before?.experiment,
    version,
    section,
    tags,
    attachments,
    hash,
    display: {
      server,
      action,
      title: c.title,
      tags: tags.join(", "),
      sends: [`the experiment text (question, answer, decisions, steps, findings)`, ...attachments.map((a) => `${a.name} (${kb(a.data.length)})`)].join("; "),
      includes: "figures and tables that steps produced; the full session log",
      not_sent: "input data files",
      content_hash: hash.slice(0, 16),
    },
  };
}

export async function runPush(plan: PushPlan, client: Elabftw): Promise<{ experiment: number; created: boolean; attachments: Record<string, string> }> {
  let id = plan.experiment;
  const created = id === undefined;
  if (id === undefined) {
    id = await client.createExperiment({ title: plan.title, body: plan.section });
    await client.addTags(id, plan.tags);
  } else await client.appendBody(id, plan.section);
  const attachments: Record<string, string> = {};
  for (const a of plan.attachments) {
    await client.upload(id, a.name, a.data, a.mime, `guided-analysis version ${plan.version}`);
    attachments[a.name] = a.sha256;
  }
  return { experiment: id, created, attachments };
}

export interface Proposal {
  key: string;
  label: string;
  value: unknown;
  from: string;
  field: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function fits(f: DecisionField, v: unknown): boolean {
  if (f.kind === "int" || f.kind === "float") {
    const n = Number(v);
    return Number.isFinite(n) && (f.kind === "float" || Number.isInteger(n)) && (f.lo === undefined || n >= f.lo) && (f.hi === undefined || n <= f.hi);
  }
  if (f.kind === "choice" && f.choices.length) return f.choices.some((c) => c === v || String(c) === String(v).trim());
  if (f.kind === "bool") return typeof v === "boolean" || ["true", "false", "yes", "no", "y", "n", "1", "0"].includes(String(v).trim().toLowerCase());
  return true;
}

export function proposeSetup(fields: DecisionField[], entities: { entity: ElabEntity; label: string }[]): Proposal[] {
  const out = new Map<string, Proposal>();
  for (const { entity, label } of entities) {
    for (const [name, extra] of Object.entries(entity.metadata.extra_fields ?? {})) {
      let v = extra?.value;
      if (Array.isArray(v)) v = v.length === 1 ? v[0] : undefined;
      if (v === undefined || v === null || v === "") continue;
      const n = norm(name);
      const f = fields.find((x) => x.owner !== "fixed" && (norm(x.key) === n || norm(x.label) === n));
      if (f && !out.has(f.key) && fits(f, v)) out.set(f.key, { key: f.key, label: f.label, value: v, from: label, field: name });
    }
  }
  return [...out.values()];
}

export async function readLink(client: Elabftw, id: number): Promise<{ experiment: ElabEntity; items: ElabEntity[] }> {
  const experiment = await client.readEntity("experiments", id);
  const links = await client.listItemLinks(id);
  const items: ElabEntity[] = [];
  for (const l of links) items.push(await client.readEntity("items", l.entityid));
  return { experiment, items };
}

export function describeLink(experiment: ElabEntity, items: ElabEntity[], proposals: Proposal[]): string {
  const lines = [`Experiment ${experiment.id}: ${experiment.title}`];
  if (experiment.tags) lines.push(`Tags: ${experiment.tags}`);
  const plain = experiment.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (plain) lines.push(`Text: ${plain.slice(0, 300)}`);
  lines.push(items.length ? "Linked items:" : "Linked items: none");
  for (const i of items) lines.push(`- ${i.id}: ${i.title}`);
  lines.push(proposals.length ? "Proposed setup values (not applied until you confirm):" : "No custom field matches a setup decision.");
  for (const p of proposals) lines.push(`- ${p.label} = ${String(p.value)}  (field "${p.field}" of ${p.from})`);
  return lines.join("\n");
}
