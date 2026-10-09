import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import type { Citation, LoadedAdapter } from "../adapters/manifest.ts";
import type { AnalysisRecord } from "./record.ts";
import type { Node } from "./types.ts";

export type CitationStyle = "apa" | "vancouver";
export const CITATION_STYLES: CitationStyle[] = ["apa", "vancouver"];
export type CitationKind = Citation["kind"];
export type CitationGroup = "used" | "comparison" | "out_of_date";

export interface Bib {
  type: string;
  key: string;
  fields: Record<string, string>;
}

export interface Person {
  family: string;
  given: string;
  literal?: boolean;
}

export interface Ref {
  id: string;
  key: string;
  kind: CitationKind;
  text: string;
  doi: string;
  url: string;
  bibtex: string;
  bib?: Bib;
  group: CitationGroup;
  program: string;
  adapter: string;
  tools: string[];
  steps: string[];
}

export interface SessionCitations {
  used: Ref[];
  comparison: Ref[];
  outOfDate: Ref[];
  notRun: string[];
}

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

// ---------------------------------------------------------------- BibTeX reading

function readValue(s: string, i: number): [string, number] {
  if (s[i] === "{") {
    let depth = 0;
    const start = i + 1;
    for (; i < s.length; i++) {
      if (s[i] === "\\") {
        i++;
        continue;
      }
      if (s[i] === "{") depth++;
      else if (s[i] === "}" && --depth === 0) return [s.slice(start, i), i + 1];
    }
    return [s.slice(start), s.length];
  }
  if (s[i] === '"') {
    let depth = 0;
    const start = i + 1;
    for (i++; i < s.length; i++) {
      if (s[i] === "{") depth++;
      else if (s[i] === "}") depth--;
      else if (s[i] === '"' && depth === 0) return [s.slice(start, i), i + 1];
    }
    return [s.slice(start), s.length];
  }
  const m = /^[^,}\s]+/.exec(s.slice(i));
  return [m?.[0] ?? "", i + (m?.[0].length ?? 0)];
}

export function parseBibtex(src: string): Bib[] {
  const out: Bib[] = [];
  const re = /@(\w+)\s*\{\s*([^,\s]*)\s*,/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const type = m[1]!.toLowerCase();
    if (type === "comment" || type === "string" || type === "preamble") continue;
    const fields: Record<string, string> = {};
    let i = re.lastIndex;
    for (;;) {
      const f = /^\s*,?\s*([A-Za-z][\w-]*)\s*=\s*/.exec(src.slice(i));
      if (!f) break;
      i += f[0].length;
      const [v, next] = readValue(src, i);
      fields[f[1]!.toLowerCase()] = v.replace(/\s+/g, " ").trim();
      i = next;
      while (/[\s,]/.test(src[i] ?? "")) i++;
      if (src[i] === "}") break;
    }
    re.lastIndex = i;
    out.push({ type, key: m[2]!, fields });
  }
  return out;
}

const ACCENT: Record<string, string> = { "`": "̀", "'": "́", "^": "̂", "~": "̃", "=": "̄", u: "̆", ".": "̇", '"': "̈", H: "̋", v: "̌", c: "̧", k: "̨" };
const LETTER: Record<string, string> = { o: "ø", O: "Ø", l: "ł", L: "Ł", ss: "ß", aa: "å", AA: "Å", ae: "æ", AE: "Æ", oe: "œ", OE: "Œ", i: "ı" };

export function latex(s: string): string {
  return s
    .replace(/\{?\\([`'^~="uvHck.])\s*\{?(\\?[A-Za-z])\}?\}?/g, (_, a: string, ch: string) => (ch.startsWith("\\") ? (LETTER[ch.slice(1)] ?? ch.slice(1)) : ch) + ACCENT[a]!)
    .replace(/\{?\\(ss|aa|AA|ae|AE|oe|OE|o|O|l|L)\b\s*\}?/g, (_, w: string) => LETTER[w]!)
    .replace(/\\&/g, "&")
    .replace(/\\%/g, "%")
    .replace(/\\_/g, "_")
    .replace(/\\textendash\s*|--/g, "–")
    .replace(/~/g, " ")
    .replace(/[{}]/g, "")
    .replace(/&amp;/g, "&")
    .normalize("NFC")
    .trim();
}

function splitTop(s: string, sep: RegExp): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  const words = s.split(/(\s+|\{|\})/);
  for (const w of words) {
    if (w === "{") depth++;
    if (w === "}") depth--;
    if (depth === 0 && sep.test(w)) {
      out.push(cur.trim());
      cur = "";
    } else cur += w;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function people(field: string | undefined): Person[] {
  if (!field) return [];
  return splitTop(field, /^and$/).map((raw) => {
    if (/^\{.*\}$/.test(raw) && !raw.slice(1, -1).includes("{")) return { family: latex(raw), given: "", literal: true };
    let depth = 0;
    let comma = -1;
    for (let i = 0; i < raw.length && comma < 0; i++) {
      if (raw[i] === "{") depth++;
      else if (raw[i] === "}") depth--;
      else if (raw[i] === "," && depth === 0) comma = i;
    }
    if (comma >= 0) return { family: latex(raw.slice(0, comma)), given: latex(raw.slice(comma + 1)) };
    const ws = raw.split(/\s+/);
    const at = ws.findIndex((w, i) => i > 0 && /^[a-z]/.test(w) && i < ws.length - 1);
    const cut = at > 0 ? at : ws.length - 1;
    return { family: latex(ws.slice(cut).join(" ")), given: latex(ws.slice(0, cut).join(" ")) };
  });
}

// ---------------------------------------------------------------- formatting

function initials(given: string, dots: boolean): string {
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((g) =>
      g
        .split("-")
        .map((p) => (p.replace(/\./g, "")[0] ?? "").toUpperCase() + (dots ? "." : ""))
        .join(dots ? "-" : ""),
    )
    .join(dots ? " " : "");
}

const f = (r: Ref, k: string) => (r.bib ? latex(r.bib.fields[k] ?? "") : "");
const year = (r: Ref) => f(r, "year") || /\((\d{4})[a-z]?\)/.exec(r.text)?.[1] || /\b(1[89]\d\d|20\d\d)\b/.exec(r.text)?.[1] || "n.d.";
const end = (s: string) => (/[.?!]$/.test(s) ? s : `${s}.`);
const doiUrl = (doi: string) => `https://doi.org/${doi}`;
const pages = (p: string) => p.replace(/\s*[-–]+\s*/g, "–");

const isOthers = (p: Person) => !p.given && p.family.toLowerCase() === "others";

function apaAuthors(all: Person[]): string {
  const one = (p: Person) => (p.literal || !p.given ? p.family : `${p.family}, ${initials(p.given, true)}`);
  const list = all.filter((p) => !isOthers(p));
  if (all.length && isOthers(all.at(-1)!)) return `${list.map(one).join(", ")}, et al.`;
  if (all.some(isOthers)) return `${list.slice(0, -1).map(one).join(", ")}, . . . ${one(list.at(-1)!)}`;
  if (list.length > 20) return `${list.slice(0, 19).map(one).join(", ")}, . . . ${one(list.at(-1)!)}`;
  if (list.length <= 1) return list.map(one).join("");
  if (list.length === 2) return `${one(list[0]!)}, & ${one(list[1]!)}`;
  return `${list.slice(0, -1).map(one).join(", ")}, & ${one(list.at(-1)!)}`;
}

function vancouverAuthors(all: Person[]): string {
  const one = (p: Person) => (p.literal || !p.given ? p.family : `${p.family} ${initials(p.given, false)}`);
  const list = all.filter((p) => !isOthers(p));
  if (list.length <= 6 && list.length < all.length) return `${list.map(one).join(", ")}, et al`;
  return list.length > 6 ? `${list.slice(0, 6).map(one).join(", ")}, et al` : list.map(one).join(", ");
}

const SOFTWARE = new Set(["software", "manual", "misc", "online", "electronic"]);

function apa(r: Ref): string {
  if (!r.bib) return r.text + (r.doi && !r.text.includes(r.doi) ? ` ${doiUrl(r.doi)}` : !r.doi && r.url && !r.text.includes(r.url) ? ` ${r.url}` : "");
  const who = apaAuthors(people(r.bib.fields.author));
  const title = f(r, "title");
  const link = r.doi ? doiUrl(r.doi) : r.url;
  const head = `${who ? `${end(who)} ` : ""}(${year(r)}). `;
  const t = r.bib.type;
  if (t === "article") {
    const vol = f(r, "volume");
    const num = f(r, "number");
    const pg = f(r, "pages");
    const where = [f(r, "journal") + (vol ? `, ${vol}${num ? `(${num})` : ""}` : ""), pg ? pages(pg) : ""].filter(Boolean).join(", ");
    return `${head}${end(title)} ${end(where)}${link ? ` ${link}` : ""}`;
  }
  if (t === "inproceedings" || t === "incollection") {
    const pg = f(r, "pages");
    return `${head}${end(title)} In ${f(r, "booktitle")}${pg ? ` (pp. ${pages(pg)})` : ""}.${link ? ` ${link}` : ""}`;
  }
  const version = f(r, "version");
  const pub = f(r, "publisher") || f(r, "organization") || f(r, "howpublished") || f(r, "institution");
  const label = SOFTWARE.has(t) && r.kind === "program" && !/arxiv/i.test(pub) ? " [Computer software]" : "";
  return `${head}${title}${version ? ` (Version ${version})` : ""}${label}.${pub && pub !== who.replace(/\.$/, "") ? ` ${end(pub)}` : ""}${link ? ` ${link}` : ""}`;
}

function vancouver(r: Ref): string {
  if (!r.bib) return r.text + (r.doi && !r.text.includes(r.doi) ? ` doi:${r.doi}` : !r.doi && r.url && !r.text.includes(r.url) ? ` Available from: ${r.url}` : "");
  const who = vancouverAuthors(people(r.bib.fields.author));
  const title = f(r, "title");
  const head = who ? `${end(who)} ` : "";
  const tail = r.doi ? ` doi:${r.doi}` : r.url ? ` Available from: ${r.url}` : "";
  const t = r.bib.type;
  if (t === "article") {
    const vol = f(r, "volume");
    const num = f(r, "number");
    const pg = f(r, "pages");
    return `${head}${end(title)} ${f(r, "journal")}. ${year(r)}${vol ? `;${vol}${num ? `(${num})` : ""}` : ""}${pg ? `:${pages(pg).replace("–", "-")}` : ""}.${tail}`;
  }
  if (t === "inproceedings" || t === "incollection") {
    const pg = f(r, "pages");
    return `${head}${end(title)} In: ${f(r, "booktitle")}; ${year(r)}${pg ? `. p. ${pages(pg).replace("–", "-")}` : ""}.${tail}`;
  }
  const version = f(r, "version");
  const pub = f(r, "publisher") || f(r, "organization") || f(r, "howpublished") || f(r, "institution");
  const medium = r.kind === "program" ? " [software]" : r.kind === "dataset" ? " [dataset]" : "";
  return `${head}${title}${medium}.${version ? ` Version ${version}.` : ""}${pub ? ` ${pub};` : ""} ${year(r)}.${tail}`;
}

export function formatRef(r: Ref, style: CitationStyle = "apa"): string {
  return style === "vancouver" ? vancouver(r) : apa(r);
}

export function authorYear(r: Ref): string {
  const list = people(r.bib?.fields.author);
  let name: string;
  const many = list.some(isOthers);
  if (list.length) name = list.length === 1 && !many ? list[0]!.family : list.length === 2 && !many ? `${list[0]!.family} & ${list[1]!.family}` : `${list[0]!.family} et al.`;
  else name = /^([^,(]+?)(?:,|\s\(|\.\s)/.exec(r.text)?.[1]?.trim() || r.program || r.text.slice(0, 30);
  return `${name}, ${year(r)}`;
}

export class Markers {
  private order: string[] = [];
  constructor(public style: CitationStyle) {}
  cite(refs: Ref[]): string {
    if (!refs.length) return "";
    if (this.style === "apa") return ` (${refs.map(authorYear).join("; ")})`;
    const ns = refs.map((r) => {
      let i = this.order.indexOf(r.id);
      if (i < 0) i = this.order.push(r.id) - 1;
      return i + 1;
    });
    return ` [${[...new Set(ns)].sort((a, b) => a - b).join(", ")}]`;
  }
  list(all: Ref[]): Ref[] {
    if (this.style === "apa") return [...all].sort((a, b) => authorYear(a).localeCompare(authorYear(b)));
    const seen = this.order.map((id) => all.find((r) => r.id === id)).filter((r): r is Ref => !!r);
    return [...seen, ...all.filter((r) => !this.order.includes(r.id))];
  }
}

// ---------------------------------------------------------------- BibTeX and RIS output

function makeKey(r: Ref): string {
  const first = people(r.bib?.fields.author)[0]?.family ?? /^([^,(.]+)/.exec(r.text)?.[1] ?? r.program ?? "ref";
  const word = (f(r, "title") || r.text.replace(/^.*?\)\.\s*/, "")).split(/\s+/).find((w) => w.length > 3 && !/^(the|a|an|with|from|for)$/i.test(w)) ?? "";
  return `${first}${year(r)}${word}`.normalize("NFD").replace(/[^A-Za-z0-9]/g, "").toLowerCase() || "ref";
}

function bibValue(v: string): string {
  return `{${v.replace(/[{}]/g, "")}}`;
}

export function toBibtex(refs: Ref[]): string {
  return (
    refs
      .map((r) => {
        if (r.bibtex.trim() && r.bib) return r.bibtex.trim().replace(/^@(\w+)\s*\{\s*[^,\s]*\s*,/, `@$1{${r.key},`);
        const fields: [string, string][] = [["title", r.text]];
        if (r.doi) fields.push(["doi", r.doi]);
        if (r.url) fields.push(["url", r.url]);
        fields.push(["note", "Formatted reference from the adapter. Check the fields before use."]);
        return `@misc{${r.key},\n${fields.map(([k, v]) => `  ${k.padEnd(5)} = ${bibValue(v)}`).join(",\n")}\n}`;
      })
      .join("\n\n") + "\n"
  );
}

const RIS_TYPE: Record<string, string> = { article: "JOUR", inproceedings: "CPAPER", incollection: "CHAP", book: "BOOK", software: "COMP", manual: "COMP", misc: "GEN", phdthesis: "THES", techreport: "RPRT", online: "ELEC" };

export function toRis(refs: Ref[]): string {
  const out: string[] = [];
  for (const r of refs) {
    const ty = r.kind === "dataset" ? "DATA" : r.bib ? (RIS_TYPE[r.bib.type] ?? "GEN") : "GEN";
    out.push(`TY  - ${ty === "GEN" && r.kind === "program" ? "COMP" : ty}`);
    if (r.bib) {
      for (const p of people(r.bib.fields.author).filter((p) => !isOthers(p))) out.push(`AU  - ${p.literal || !p.given ? p.family : `${p.family}, ${p.given}`}`);
      out.push(`TI  - ${f(r, "title")}`);
      const container = f(r, "journal") || f(r, "booktitle");
      if (container) out.push(`${r.bib.type === "article" ? "JO" : "T2"}  - ${container}`);
      out.push(`PY  - ${year(r)}`);
      if (f(r, "volume")) out.push(`VL  - ${f(r, "volume")}`);
      if (f(r, "number")) out.push(`IS  - ${f(r, "number")}`);
      const pg = f(r, "pages").split(/\s*[-–]+\s*/);
      if (pg[0]) out.push(`SP  - ${pg[0]}`);
      if (pg[1]) out.push(`EP  - ${pg[1]}`);
      const pub = f(r, "publisher") || f(r, "organization");
      if (pub) out.push(`PB  - ${pub}`);
      if (f(r, "version")) out.push(`ET  - ${f(r, "version")}`);
    } else {
      out.push(`TI  - ${r.text}`);
      if (year(r) !== "n.d.") out.push(`PY  - ${year(r)}`);
    }
    if (r.doi) out.push(`DO  - ${r.doi}`);
    if (r.url) out.push(`UR  - ${r.url}`);
    else if (r.doi) out.push(`UR  - ${doiUrl(r.doi)}`);
    out.push(`N1  - ${r.kind}${r.program ? `: ${r.program}` : ""}`, "ER  - ", "");
  }
  return out.join("\n");
}

// ---------------------------------------------------------------- references from citations

export function refOf(c: Citation, program = "", adapter = ""): Ref {
  const bib = c.bibtex.trim() ? parseBibtex(c.bibtex)[0] : undefined;
  const doi = (c.doi || bib?.fields.doi || "").replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim();
  const url = c.url || (!doi ? (bib?.fields.url ?? "") : "");
  const id = doi ? `doi:${doi.toLowerCase()}` : url ? `url:${url.toLowerCase()}` : `text:${c.text.toLowerCase().replace(/\s+/g, " ")}`;
  const r: Ref = { id, key: "", kind: c.kind, text: c.text.trim(), doi, url, bibtex: c.bibtex, bib, group: "used", program, adapter, tools: [], steps: [] };
  r.key = bib?.key || makeKey(r);
  return r;
}

export function cuvetteRef(version?: string): Ref {
  const p = join(ROOT, "CITATION.cff");
  const cff = existsSync(p) ? (parseYaml(readFileSync(p, "utf8")) as Record<string, any>) : {};
  const v = version ?? String(cff.version ?? "");
  const authors = ((cff.authors as { "family-names"?: string; "given-names"?: string; name?: string }[]) ?? []).map((a) => (a.name ? `{${a.name}}` : `${a["family-names"]}, ${a["given-names"]}`));
  const url = String(cff.url ?? cff["repository-code"] ?? "");
  const yr = String(cff["date-released"] ?? "").slice(0, 4) || "2026";
  const bibtex = `@software{smith2026cuvette,\n  author  = {${authors.join(" and ") || "Smith, Parker"}},\n  title   = {${cff.title ?? "Cuvette"}},\n  version = {${v}},\n  year    = {${yr}},\n  url     = {${url}}${cff.doi ? `,\n  doi     = {${cff.doi}}` : ""}\n}`;
  return refOf({ text: `Smith, P. (${yr}). Cuvette (Version ${v}) [Computer software]. ${url}`, doi: String(cff.doi ?? ""), url, bibtex, kind: "program", when: {} }, "Cuvette", "");
}

// ---------------------------------------------------------------- which citations apply

const isSet = (v: unknown) => v !== undefined && v !== null && v !== "" && v !== false && v !== 0 && v !== "none" && !(Array.isArray(v) && !v.length);

export function toolCitations(a: LoadedAdapter, tool: string, args: Record<string, unknown> = {}, decisions: Record<string, unknown> = {}): Citation[] {
  const def = a.manifest.tools.find((t) => t.name === tool);
  const links = a.linksFor(tool);
  const value = (k: string) => args[k] ?? (links[k] ? decisions[links[k]!] : undefined) ?? def?.params[k]?.default;
  const all = [...(def?.citations ?? []), ...a.manifest.citations.filter((c) => c.tool === tool)];
  return all.filter((c) =>
    Object.entries(c.when).every(([k, want]) => {
      const have = value(k);
      if (want === "set") return isSet(have);
      return have !== undefined && have !== null && (Array.isArray(want) ? want : [want]).some((w) => String(w) === String(have));
    }),
  );
}

export function programCitations(a: LoadedAdapter): Ref[] {
  const p = a.manifest.program;
  if (!p.citation.length) return [refOf({ text: `${p.name}${p.version ? ` (Version ${p.version})` : ""} [Computer software].${p.homepage ? ` ${p.homepage}` : ""}`, doi: "", url: p.homepage, bibtex: "", kind: "program", when: {} }, p.name, a.name)];
  return p.citation.map((c) => refOf(c, p.name, a.name));
}

export interface NodeCitations {
  program: Ref[];
  methods: Ref[];
}

export function nodeCitations(adapters: LoadedAdapter[], n: Pick<Node, "adapter" | "tool" | "args"> & { decisions?: Record<string, unknown> }): NodeCitations {
  const a = adapters.find((x) => x.name === n.adapter);
  if (!a) return { program: [], methods: [] };
  return { program: programCitations(a), methods: toolCitations(a, n.tool, n.args ?? {}, n.decisions ?? {}).map((c) => refOf(c, a.manifest.program.name, a.name)) };
}

const RANK: Record<CitationGroup, number> = { used: 0, comparison: 1, out_of_date: 2 };

export function sessionCitations(record: AnalysisRecord, adapters: LoadedAdapter[], steps?: Map<string, number>): SessionCitations {
  const comparisons = record.comparisons();
  const stale = record.stale();
  const programs = new Map<string, Ref>();
  const methods = new Map<string, Ref>();
  const ran = new Set<string>();
  const put = (into: Map<string, Ref>, r: Ref, group: CitationGroup, n: Node) => {
    const old = into.get(r.id) ?? programs.get(r.id) ?? methods.get(r.id);
    const ref = old ?? r;
    if (!old) {
      ref.group = group;
      into.set(r.id, ref);
    } else if (RANK[group] < RANK[ref.group]) ref.group = group;
    if (!ref.tools.includes(n.tool)) ref.tools.push(n.tool);
    const step = steps?.get(n.id);
    const label = step !== undefined ? `step ${step}` : comparisons.has(n.id) ? "comparison run" : n.id;
    if (!ref.steps.includes(label)) ref.steps.push(label);
  };
  for (const n of record.nodes()) {
    if (!n.adapter) continue;
    ran.add(n.adapter);
    const group: CitationGroup = comparisons.has(n.id) ? "comparison" : stale.has(n.id) ? "out_of_date" : "used";
    const c = nodeCitations(adapters, n);
    for (const r of c.program) put(programs, r, group, n);
    for (const r of c.methods) put(methods, r, group, n);
  }
  const all = [...programs.values(), cuvetteRef(), ...methods.values()];
  const keys = new Set<string>();
  for (const r of all) {
    let k = r.key;
    for (let i = 1; keys.has(k); i++) k = `${r.key}${String.fromCharCode(96 + i)}`;
    r.key = k;
    keys.add(k);
  }
  const loaded = [...new Set(record.entries(["adapter"]).map((e) => String(e.data.name ?? "")))].filter((x) => x && !ran.has(x));
  return {
    used: all.filter((r) => r.group === "used"),
    comparison: all.filter((r) => r.group === "comparison"),
    outOfDate: all.filter((r) => r.group === "out_of_date"),
    notRun: loaded,
  };
}

export function allRefs(c: SessionCitations): Ref[] {
  return [...c.used, ...c.comparison, ...c.outOfDate];
}

// ---------------------------------------------------------------- text for people

export function citationStyle(v: unknown): CitationStyle {
  return String(v ?? "").toLowerCase() === "vancouver" ? "vancouver" : "apa";
}

const KIND_LABEL: Record<CitationKind, string> = { program: "program", method: "method", model: "model", dataset: "data" };

function usedFor(r: Ref): string {
  if (r.program === "Cuvette" && !r.adapter) return "Cuvette";
  if (r.kind === "program") return r.program;
  return `${KIND_LABEL[r.kind]}, ${r.tools.join(", ")}`;
}

export function citeText(c: SessionCitations, style: CitationStyle): string {
  const lines: string[] = [];
  const block = (title: string, refs: Ref[], startAt = 1) => {
    if (!refs.length) return;
    lines.push(title, "");
    refs.forEach((r, i) => lines.push(`${style === "vancouver" ? `${startAt + i}.` : "-"} ${formatRef(r, style)}`, `   For: ${usedFor(r)}${r.steps.length ? ` (${r.steps.join(", ")})` : ""}`));
    lines.push("");
  };
  const used = style === "apa" ? [...c.used].sort((a, b) => authorYear(a).localeCompare(authorYear(b))) : c.used;
  block("Cite these in your methods:", used);
  block("Used in a comparison only. Cite these only if you report the comparison:", c.comparison, used.length + 1);
  block("Used only in steps that are out of date. Do not cite these unless you report those steps:", c.outOfDate, used.length + c.comparison.length + 1);
  if (c.notRun.length) lines.push(`Loaded, but no step ran: ${c.notRun.join(", ")}. These are not cited.`, "");
  lines.push(`Style: ${style === "apa" ? "APA" : "Vancouver"}. Change it: /cite vancouver, /cite apa, or the setting citation_style.`);
  lines.push("Save the list: /cite bibtex, /cite ris or /cite text. Each command writes a file in the session output folder.");
  return lines.join("\n").trim();
}

export function citeList(c: SessionCitations, style: CitationStyle): string {
  const lines: string[] = [];
  const used = style === "apa" ? [...c.used].sort((a, b) => authorYear(a).localeCompare(authorYear(b))) : c.used;
  let n = 0;
  const put = (refs: Ref[]) => refs.forEach((r) => lines.push(style === "vancouver" ? `${++n}. ${formatRef(r, style)}` : formatRef(r, style)));
  lines.push("References", "");
  put(used);
  if (c.comparison.length) {
    lines.push("", "Used in a comparison", "");
    put(c.comparison);
  }
  if (c.outOfDate.length) {
    lines.push("", "Used only in steps that are out of date", "");
    put(c.outOfDate);
  }
  return lines.join("\n") + "\n";
}

export function howToCite(a: { manifest: { program: { citation: Citation[]; name: string } }; name: string }, style: CitationStyle = "apa"): string[] {
  return a.manifest.program.citation.map((c) => formatRef(refOf(c, a.manifest.program.name, a.name), style));
}

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const linkify = (s: string) =>
  escHtml(s)
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;)])/g, '<a href="$1">$1</a>')
    .replace(/\bdoi:(10\.[^\s<]+[^\s<.,;)])/g, '<a href="https://doi.org/$1">doi:$1</a>');

function ordered(refs: Ref[], style: CitationStyle): Ref[] {
  return style === "apa" ? [...refs].sort((a, b) => authorYear(a).localeCompare(authorYear(b))) : refs;
}

export function referencesHtml(c: SessionCitations, style: CitationStyle, heading = "h2"): string {
  const tag = style === "vancouver" ? "ol" : "ul";
  let start = 1;
  const list = (refs: Ref[]) => {
    const html = `<${tag} class="refs"${tag === "ol" && start > 1 ? ` start="${start}"` : ""}>${ordered(refs, style).map((r) => `<li>${linkify(formatRef(r, style))}</li>`).join("")}</${tag}>`;
    start += refs.length;
    return html;
  };
  const sub = heading.replace(/\d/, (d) => String(Number(d) + 1));
  const parts = [`<${heading} id="references">References</${heading}>`, `<p class="muted">Cite these programs and methods in your methods section. Style: ${style === "apa" ? "APA" : "Vancouver"}.</p>`, list(c.used)];
  if (c.comparison.length) parts.push(`<${sub}>Used in a comparison</${sub}>`, `<p class="muted">These ran only in comparison runs. Cite them only if you report the comparison.</p>`, list(c.comparison));
  if (c.outOfDate.length) parts.push(`<${sub}>Used only in steps that are out of date</${sub}>`, list(c.outOfDate));
  return parts.join("\n");
}

export function referencesMarkdown(c: SessionCitations, style: CitationStyle): string[] {
  const lines: string[] = ["## References", ""];
  let n = 0;
  const put = (refs: Ref[]) => {
    for (const r of ordered(refs, style)) lines.push(`${style === "vancouver" ? `${++n}.` : "-"} ${formatRef(r, style)}`);
    lines.push("");
  };
  put(c.used);
  if (c.comparison.length) {
    lines.push("### Used in a comparison", "", "These ran only in comparison runs. Cite them only if you report the comparison.", "");
    put(c.comparison);
  }
  if (c.outOfDate.length) {
    lines.push("### Used only in steps that are out of date", "");
    put(c.outOfDate);
  }
  return lines;
}
