import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { cuvetteHome } from "../adapters/manifest.ts";
import { folderKey } from "./trust.ts";
import { usesAnthropicApi, type Message, type ModelInfo, type Part } from "./types.ts";

export type PhiKind = "name" | "birth_date" | "mrn" | "ssn" | "phone" | "email" | "address" | "zip";
export type PhiAction = "send" | "mask" | "local" | "stop";

export interface PhiHit {
  kind: PhiKind;
  value: string;
  where: string;
  column?: string;
  line?: number;
  row?: number;
}

export interface PhiShown {
  kind: PhiKind;
  label: string;
  masked: string;
  where: string;
}

export const KIND_LABEL: Record<PhiKind, string> = {
  name: "Name",
  birth_date: "Date of birth",
  mrn: "Medical record number",
  ssn: "Social Security number",
  phone: "Phone number",
  email: "Email address",
  address: "Street address",
  zip: "ZIP code with a date",
};

const PLACEHOLDER: Record<PhiKind, string> = {
  name: "NAME",
  birth_date: "DATE OF BIRTH",
  mrn: "MRN",
  ssn: "SSN",
  phone: "PHONE",
  email: "EMAIL",
  address: "ADDRESS",
  zip: "ZIP",
};

const MONTH = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\\.?";
const DATE = `(?:\\d{1,2}[/.-]\\d{1,2}[/.-](?:\\d{4}|\\d{2})|\\d{4}-\\d{1,2}-\\d{1,2}|${MONTH}\\s+\\d{1,2},?\\s+\\d{4}|\\d{1,2}[\\s-]${MONTH}[\\s-]\\d{4})`;
const DATE_RE = new RegExp(`(?<![\\d/.-])${DATE}(?![\\d/])`, "i");
const NAME = "[A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)?";
const FULL = `${NAME}(?:\\s+[A-Z]\\.?)?\\s+${NAME}`;
const STATES = "AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY";
const STREET = "Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace|Ter|Circle|Cir|Highway|Hwy|Parkway|Pkwy";

const NOT_NAMES = new Set(
  "The This That These Those Patient Patients Group Groups Control Controls Study Table Figure Fig Day Days Week Weeks Month Male Female Case Cases Subject Subjects Sample Samples Data Total Mean Median Healthy Normal Baseline Visit Treatment Placebo Drug Dose Health Questionnaire Hospital Clinic Center Centre University Medical Department Unit Score Test Model Method Methods Results Result Analysis Summary Note Notes Report Record Number Type Status Name Age Sex Date Time Year Years Line Cell Cells Gene Genes Protein Image Images Plate Well Batch Run Series Set Level Phase Stage Grade Class Index Value Values Unknown None New Old High Low Left Right Upper Lower North South East West Saint General Royal National American British European Western Eastern".split(" "),
);

interface Rule {
  kind: PhiKind;
  re: RegExp;
  check?: (value: string, line: string) => boolean;
}

const looksLikeName = (v: string) => !v.split(/[\s,]+/).some((w) => NOT_NAMES.has(w.replace(/\.$/, "")));

const TEXT_RULES: Rule[] = [
  { kind: "ssn", re: /(?<![\d-])(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}(?![\d-])/g },
  { kind: "phone", re: /(?<![\d.\-/])(?:\+?1[\s.-])?(?:\([2-9]\d{2}\)\s?|[2-9]\d{2}[-.])\d{3}[-.]\d{4}(?![\d.\-/]?\d)/g },
  { kind: "email", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b/g },
  { kind: "birth_date", re: new RegExp(`\\b(?:DOB|D\\.O\\.B\\.?|date of birth|birth ?date|born(?: on)?)\\s*[:#=-]?\\s*(${DATE})`, "gi") },
  { kind: "mrn", re: /\b(?:MRN|MR#|MR No\.?|medical record (?:number|no\.?|#))\s*[:#=]?\s*([A-Za-z]{0,3}-?\d{4,12})\b/gi },
  { kind: "name", re: new RegExp(`\\b(?:[Pp]atient(?:\\s+[Nn]ame)?|PATIENT(?: NAME)?|[Pp]t\\.?|[Nn]ame|NAME|[Ss]ubject [Nn]ame|[Ff]ull [Nn]ame)\\s*[:=]\\s*(${FULL}|${NAME},\\s*${NAME})`, "g"), check: looksLikeName },
  { kind: "name", re: new RegExp(`\\b(?:Mr|Mrs|Ms|Miss)\\.?\\s+(${NAME}(?:\\s+${NAME})?)`, "g"), check: looksLikeName },
  { kind: "name", re: new RegExp(`\\b(${FULL})\\s*,?\\s+(?:is\\s+|was\\s+)?an?\\s+\\d{1,3}[- ](?:year|yr|y/?o)`, "g"), check: looksLikeName },
  { kind: "name", re: new RegExp(`\\b(${FULL})\\s+(?:was\\s+|is\\s+)?(?:admitted|diagnosed|discharged|presented|presents|underwent|complained|complains)\\b`, "g"), check: looksLikeName },
  { kind: "address", re: new RegExp(`\\b\\d{1,6}\\s+(?:[NSEW]\\.?\\s+)?(?:[A-Z][a-z]+\\.?\\s+){1,3}(?:${STREET})\\b\\.?`, "g") },
  { kind: "address", re: new RegExp(`\\b[A-Z][a-z]+(?:\\s[A-Z][a-z]+)?,\\s*(?:${STATES})\\s+\\d{5}(?:-\\d{4})?\\b`, "g") },
  { kind: "zip", re: /\b(?:ZIP|zip(?:\s*code)?|Zip(?:\s*code)?|postal code)\s*[:#=]?\s*(\d{5}(?:-\d{4})?)\b/g, check: (_v, line) => DATE_RE.test(line) },
];

const STAFF = /\b(contact|author|authors|investigator|maintainer|corresponding|reporting|copyright|institution|affiliation|study person|submitter|creator|owner|support|help|mailing list|send email|questions|bugs?|feedback|licen[cs]e|developer|curator|publisher|editor)\b/i;
const PERSONAL = /\b(emergency|next of kin|guardian|caregiver|patient|pt)\b/i;
const STAFF_KINDS = new Set<PhiKind>(["name", "email", "address", "phone"]);
const QUICK = /\d{3}|@|[A-Z][a-z]+[\s,]+[A-Z]|\b(?:DOB|MRN|MR#|born|birth|record|zip|postal)\b/i;

function staffLine(lines: string[], i: number): boolean {
  if (PERSONAL.test(lines[i]!)) return false;
  for (let j = Math.max(0, i - 6); j <= i; j++) {
    const l = lines[j]!.slice(0, 4000);
    if (STAFF.test(l) && !PERSONAL.test(l)) return true;
  }
  return false;
}

export function scanText(text: string, where: string): PhiHit[] {
  const out: PhiHit[] = [];
  const lines = text.split("\n");
  lines.forEach((full, i) => {
    const line = full.length > 4000 ? full.slice(0, 4000) : full;
    if (!QUICK.test(line)) return;
    let staff: boolean | undefined;
    for (const r of TEXT_RULES) {
      r.re.lastIndex = 0;
      for (const m of line.matchAll(r.re)) {
        const value = (m[1] ?? m[0]).trim().replace(/[.,]$/, "");
        if (r.check && !r.check(value, line)) continue;
        if (STAFF_KINDS.has(r.kind) && (staff ??= staffLine(lines, i))) continue;
        out.push({ kind: r.kind, value, where, line: i + 1 });
      }
    }
  });
  return out;
}

function columnKind(name: string): PhiKind | undefined {
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (/\b(ssn|social security( number| no)?)\b/.test(n)) return "ssn";
  if (/\bmrn\b|^(medical record( number| no| num)?|mr (number|no)|med rec( no| number)?|chart (number|no)|hospital (number|no))$/.test(n)) return "mrn";
  if (/\b(dob|date of birth|birth ?date|birthday)\b/.test(n)) return "birth_date";
  if (/\be ?mail\b/.test(n)) return "email";
  if (/\b(phone|telephone|fax|cellphone|cell phone|mobile (phone|number)|contact number)\b/.test(n)) return "phone";
  if (/\b(street|address|addr)\b/.test(n) && !/\b(ip|mac|well|memory|web)\b/.test(n)) return "address";
  if (/\b(zip|zipcode|zip code|postal code|postcode)\b/.test(n)) return "zip";
  if (/^(patient|patient name|pt name|name|full name|first name|last name|given name|family name|surname|forename)$/.test(n) || /\b(patient|pt|first|last|full|given|family) name\b/.test(n)) return "name";
  return undefined;
}

const PERSON = new RegExp(`^(?:${FULL}|${NAME},\\s*${NAME}(?:\\s+[A-Z]\\.?)?)$`);
const WORD = new RegExp(`^${NAME}$`);

function valueFits(kind: PhiKind, column: string, v: string): boolean {
  switch (kind) {
    case "ssn":
      return /^\d{3}-?\d{2}-?\d{4}$/.test(v);
    case "mrn":
      return /^[A-Za-z]{0,3}-?\d{4,12}$/.test(v);
    case "birth_date":
      return DATE_RE.test(v);
    case "email":
      return /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(v);
    case "phone":
      return (v.match(/\d/g)?.length ?? 0) >= 7 && /^[\d\s()+.-]+$/.test(v);
    case "address":
      return /\d/.test(v) && /[A-Za-z]{3}/.test(v) && /\s/.test(v.trim());
    case "zip":
      return /^\d{5}(-\d{4})?$/.test(v);
    case "name": {
      const n = column.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!looksLikeName(v)) return false;
      if (n === "name" || n === "patient" || n === "full name" || n === "patient name" || n === "pt name") return PERSON.test(v);
      return WORD.test(v) || PERSON.test(v);
    }
  }
}

export function scanTable(columns: string[], rows: unknown[][], where: string, firstLine?: number): PhiHit[] {
  const out: PhiHit[] = [];
  const cell = (r: unknown[], j: number) => (r[j] === null || r[j] === undefined ? "" : String(r[j]).trim());
  const hasDate = columns.some((_, j) => {
    const vals = rows.map((r) => cell(r, j)).filter(Boolean);
    return vals.length > 0 && vals.filter((v) => DATE_RE.test(v)).length * 2 >= vals.length;
  });
  columns.forEach((col, j) => {
    const kind = columnKind(String(col ?? ""));
    if (!kind || (kind === "zip" && !hasDate)) return;
    const vals = rows.map((r, i) => ({ v: cell(r, j), i })).filter((x) => x.v);
    if (!vals.length) return;
    const fit = vals.filter((x) => valueFits(kind, String(col), x.v));
    if (fit.length * 2 < vals.length) return;
    const seen = new Set<string>();
    for (const x of fit) {
      if (seen.has(x.v)) continue;
      seen.add(x.v);
      out.push({ kind, value: x.v, where, column: String(col), ...(firstLine ? { line: firstLine + x.i } : { row: x.i + 1 }) });
    }
  });
  return out;
}

function splitRow(line: string, d: string): string[] {
  if (!line.includes('"')) return line.split(d);
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === d && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function delimited(text: string): { columns: string[]; rows: string[][]; first: number } | undefined {
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  const start = lines.findIndex((l) => l.trim() && !l.startsWith("#"));
  if (start < 0) return undefined;
  const head = lines[start]!;
  const d = ["\t", ",", ";", "|"].find((c) => head.split(c).length >= 2);
  if (!d) return undefined;
  const columns = splitRow(head, d).map((c) => c.trim().replace(/^"|"$/g, ""));
  const rows: string[][] = [];
  for (const l of lines.slice(start + 1)) {
    const r = splitRow(l, d);
    if (!l.trim() || Math.abs(r.length - columns.length) > 1) break;
    rows.push(r);
  }
  if (!rows.length) return undefined;
  return { columns, rows, first: start + 2 };
}

function tablesIn(v: unknown, out: { columns: string[]; rows: unknown[][] }[] = [], depth = 0): typeof out {
  if (!v || typeof v !== "object" || depth > 6) return out;
  if (Array.isArray(v)) {
    v.forEach((x) => tablesIn(x, out, depth + 1));
    return out;
  }
  const o = v as Record<string, unknown>;
  if (Array.isArray(o.columns) && Array.isArray(o.rows) && o.columns.every((c) => typeof c === "string")) {
    const cols = o.columns as string[];
    const rows = (o.rows as unknown[]).map((r) => (Array.isArray(r) ? r : r && typeof r === "object" ? cols.map((c) => (r as Record<string, unknown>)[c]) : [r]));
    out.push({ columns: cols, rows });
  }
  for (const x of Object.values(o)) tablesIn(x, out, depth + 1);
  return out;
}

export function scanContent(text: string, where: string): PhiHit[] {
  const hits = scanText(text, where);
  const t = text.trimStart();
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      for (const tb of tablesIn(JSON.parse(text))) hits.push(...scanTable(tb.columns, tb.rows, where));
      return dedupe(hits);
    } catch {}
  }
  const tb = delimited(text);
  if (tb) hits.push(...scanTable(tb.columns, tb.rows, where, tb.first));
  return dedupe(hits);
}

function dedupe(hits: PhiHit[]): PhiHit[] {
  const seen = new Set<string>();
  return hits.filter((h) => {
    const k = `${h.kind}\0${h.value}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const PATH_KEYS = ["path", "file", "input", "table", "data", "source", "csv"];

function callPaths(messages: Message[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of messages)
    for (const p of m.parts)
      if (p.type === "tool_call") {
        const a = (p.args ?? {}) as Record<string, unknown>;
        const path = PATH_KEYS.map((k) => a[k]).find((v): v is string => typeof v === "string" && v.length < 1024);
        out.set(p.id, path ?? p.name);
      }
  return out;
}

export function scanMessages(fresh: Message[], all: Message[]): PhiHit[] {
  const paths = callPaths(all);
  const hits: PhiHit[] = [];
  for (const m of fresh) {
    if (m.role !== "user") continue;
    for (const p of m.parts) {
      if (p.type === "text") hits.push(...scanContent(p.text, "your message"));
      else if (p.type === "tool_result") hits.push(...scanContent(p.text, paths.get(p.callId) ?? p.name));
    }
  }
  return dedupe(hits);
}

export function maskShown(v: string): string {
  return v
    .split(/(\s+)/)
    .map((w) => (/^\s+$/.test(w) ? w : w.slice(0, 1) + w.slice(1).replace(/[A-Za-z0-9]/g, "*")))
    .join("");
}

export function whereText(h: Pick<PhiHit, "where" | "column" | "line" | "row">): string {
  return [h.where, h.column ? `column ${h.column}` : "", h.line ? `line ${h.line}` : h.row ? `row ${h.row}` : ""].filter(Boolean).join(", ");
}

export function shownHits(hits: PhiHit[]): PhiShown[] {
  return hits.map((h) => ({ kind: h.kind, label: KIND_LABEL[h.kind], masked: maskShown(h.value), where: whereText(h) }));
}

export function groupHits(hits: PhiHit[]): PhiShown[] {
  const groups = new Map<string, PhiHit[]>();
  for (const h of hits) {
    const k = `${h.kind}\0${h.where}\0${h.column ?? ""}`;
    groups.set(k, [...(groups.get(k) ?? []), h]);
  }
  return [...groups.values()].map((g) => {
    const first = g[0]!;
    const masked = g.slice(0, 2).map((h) => maskShown(h.value)).join(", ") + (g.length > 2 ? ` and ${g.length - 2} more` : "");
    const at = (h: PhiHit) => h.line ?? h.row ?? 0;
    const lo = Math.min(...g.map(at));
    const hi = Math.max(...g.map(at));
    const unit = first.line ? "line" : "row";
    const span = !lo ? "" : lo === hi ? `${unit} ${lo}` : `${unit}s ${lo} to ${hi}`;
    return { kind: first.kind, label: KIND_LABEL[first.kind], masked, where: [first.where, first.column ? `column ${first.column}` : "", span].filter(Boolean).join(", ") };
  });
}

export class Masker {
  map = new Map<string, string>();
  private counts = new Map<PhiKind, number>();

  add(hits: PhiHit[]): void {
    for (const h of hits) {
      if (this.map.has(h.value)) continue;
      const n = (this.counts.get(h.kind) ?? 0) + 1;
      this.counts.set(h.kind, n);
      this.map.set(h.value, `[${PLACEHOLDER[h.kind]} ${n}]`);
    }
  }

  text(s: string): string {
    if (!this.map.size) return s;
    const keys = [...this.map.keys()].sort((a, b) => b.length - a.length);
    const re = new RegExp(`(?<![A-Za-z0-9])(?:${keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![A-Za-z0-9])`, "g");
    return s.replace(re, (m) => this.map.get(m) ?? m);
  }

  message(m: Message): Message {
    if (!this.map.size || m.role !== "user") return m;
    const parts = m.parts.map((p): Part => (p.type === "text" ? { ...p, text: this.text(p.text) } : p.type === "tool_result" ? { ...p, text: this.text(p.text) } : p));
    return { ...m, parts };
  }
}

export const NOT_SENT = "[Not sent to the model: the scientist stopped it, because it can contain patient identifiers.]";

export function withheld(m: Message): Message {
  if (m.role !== "user") return m;
  return { ...m, parts: m.parts.map((p): Part => (p.type === "text" ? { ...p, text: NOT_SENT } : p.type === "tool_result" ? { ...p, text: NOT_SENT, images: undefined } : p)) };
}

export function isLocal(info: Pick<ModelInfo, "provider"> & { local?: boolean }): boolean {
  return info.local ?? info.provider === "ollama";
}

export function isCloud(info: Pick<ModelInfo, "provider"> & { local?: boolean }): boolean {
  return info.local === false || (info.local === undefined && usesAnthropicApi(info.provider));
}

export function localUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]" || h.endsWith(".local") || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h);
  } catch {
    return false;
  }
}

export const NO_PHI_KEY = "no_patient_data_folders";

function userFile(): string {
  return join(cuvetteHome(), "settings.json");
}

function readUser(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(userFile(), "utf8"));
  } catch {
    return {};
  }
}

export function noPatientDataFolders(): string[] {
  const v = readUser()[NO_PHI_KEY];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function folderHasNoPatientData(folder: string): boolean {
  return noPatientDataFolders().includes(folderKey(folder));
}

export function setFolderNoPatientData(folder: string, on: boolean): void {
  const k = folderKey(folder);
  const data = readUser();
  const list = noPatientDataFolders().filter((x) => x !== k);
  if (on) list.push(k);
  if (list.length) data[NO_PHI_KEY] = list;
  else delete data[NO_PHI_KEY];
  mkdirSync(dirname(userFile()), { recursive: true });
  writeFileSync(userFile(), JSON.stringify(data, null, 2) + "\n");
}

export const phiOn = (v: unknown) => v !== false && v !== "off";
