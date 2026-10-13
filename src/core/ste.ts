import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type SteRule = "sentence-length" | "passive" | "filler" | "word" | "phrase" | "modal";

export interface SteIssue {
  rule: SteRule;
  sentence: number;
  line: number;
  message: string;
}

export interface Sentence {
  text: string;
  line: number;
}

export const INSTRUCTION_LIMIT = 20;
export const DESCRIPTION_LIMIT = 25;

const FILLER = [
  "leverage", "leverages", "leveraged", "leveraging", "synergy", "synergies", "holistic", "holistically", "seamless", "seamlessly",
  "robust", "robustly", "delve", "delves", "elevate", "elevates", "unlock", "unlocks", "empower", "empowers", "streamline", "streamlines",
  "streamlined", "ecosystem", "paradigm", "best-in-class", "game-changing", "deep dive", "circle back", "north star", "first-class",
  "purpose-built", "battle-tested", "blazing fast", "powerful", "comprehensive", "cutting-edge", "world-class", "enterprise-grade",
  "production-ready", "practicably", "pain point", "pain points",
];

const WORDS: Record<string, string> = {
  utilize: "use", utilizes: "uses", utilized: "used", utilizing: "use",
  initiate: "start", initiates: "starts", commence: "start", commences: "starts",
  terminate: "stop", terminates: "stops", halt: "stop", halts: "stops",
  perform: "do", performs: "does", performed: "did", performing: "do",
  "carry out": "do", "carries out": "does", "carried out": "did",
  ensure: "make sure", ensures: "makes sure",
  display: "show", displays: "shows", displayed: "shown",
  indicate: "show", indicates: "shows", indicated: "shown",
  eliminate: "remove", eliminates: "removes", eliminated: "removed",
  rectify: "correct", rectifies: "corrects",
  approximately: "about",
  "prior to": "before",
  "subsequent to": "after", subsequently: "after",
  "in the event of": "if",
  "provided that": "if",
  "in order to": "to",
  remediate: "fix", remediates: "fixes",
  "kick off": "start", "kicks off": "starts",
  "reach out": "ask",
  deprecate: "delete", deprecated: "deleted",
};

const PHRASES = ["e.g.", "i.e.", "etc.", "and/or", "as well as", "in terms of"];

const IMPERATIVE = /^(?:use|run|add|set|call|give|make|write|do|don't|never|always|remove|put|say|check|open|type|install|load|ask|keep|start|stop|read|see|pick|choose|save|change|fix|press|enter|show|send|copy|move|delete|find|test|go|let|tell|note|look|leave|turn|name|list|report|state|split|end|count|measure|compare|plot|export|approve|confirm|select|click|include|exclude|avoid|apply|follow|create|describe|define|explain|mark|expand|prefer|pin|link|cite|answer|repeat|wait|try|edit)\b/i;

const BE = "(?:am|is|are|was|were|be|been|being)";
const IRREGULAR = "done|made|given|taken|shown|seen|known|written|built|sent|kept|held|found|chosen|drawn|broken|hidden|lost|paid|told|brought|taught|meant|understood|sold|spent|begun|driven|run|thrown|grown|stored|split|cut|read|set|put";
const NOT_PARTICIPLE = new Set(["red", "bed", "need", "watershed", "embedded", "feed", "seed", "speed", "shed", "hundred", "embed", "wed", "interested", "supposed", "concerned", "related", "complicated", "experienced", "detailed", "advanced", "limited", "sophisticated", "tired", "bored", "excited", "dedicated", "unrelated", "worried", "pleased", "colored", "shaped", "based", "named", "sized"]);
const PASSIVE = new RegExp(`\\b${BE}\\s+(?:(?:not|also|only|now|then|still|always|never|already|often|usually|automatically)\\s+)?(\\w+ed|${IRREGULAR})\\b`, "gi");

const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (t: string) => new RegExp(`(^|[^A-Za-z0-9-])${esc(t)}(?![A-Za-z0-9-])`, "i");
const FILLER_RE = FILLER.map((w) => [w, wordRe(w)] as const);
const WORD_RE = Object.entries(WORDS).map(([w, r]) => [w, r, wordRe(w)] as const);
const PHRASE_RE = PHRASES.map((p) => [p, new RegExp(`(^|[^A-Za-z])${esc(p)}${/[A-Za-z]$/.test(p) ? "(?![A-Za-z])" : ""}`, "i")] as const);
const MODAL = /\b(should|shall|might|may)\b(?!\s+\d)/i;

// Each pattern stops at the next opening mark. A line with many "<" and no ">" then takes linear time, not quadratic time.
function clean(line: string): string {
  return line
    .replace(/`[^`]*`/g, "X")
    .replace(/!\[[^[\]]*\]\([^()]*\)/g, "")
    .replace(/\[([^[\]]*)\]\([^()]*\)/g, "$1")
    .replace(/<[^<>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, "X")
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1");
}

const ABBREV = /\b(?:e\.g|i\.e|etc|vs|approx|Fig|fig|No|no|Dr|Mr|Ms|St|al|cf)\.$/;

function splitSentences(text: string | [string, number][], line: number, out: Sentence[]) {
  const words = typeof text === "string" ? text.split(/\s+/).filter(Boolean).map((w) => [w, line] as [string, number]) : text;
  let cur: string[] = [];
  let at = line;
  for (let i = 0; i < words.length; i++) {
    const [w, l] = words[i]!;
    if (!cur.length) at = l;
    cur.push(w);
    const next = words[i + 1]?.[0];
    if (/[.!?]["')\]]*$/.test(w) && !ABBREV.test(w) && (!next || /^["'(\[]?[A-Z0-9]/.test(next) || /^[a-z]\w*_\w/.test(next))) {
      out.push({ text: cur.join(" "), line: at });
      cur = [];
    }
  }
  if (cur.length) out.push({ text: cur.join(" "), line: at });
}

export function sentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  let para: [string, number][] = [];
  let fence = false;
  const flush = () => {
    if (para.length) splitSentences(para, para[0]![1], out);
    para = [];
  };
  const add = (t: string, line: number) => {
    for (const w of clean(t).split(/\s+/)) if (w) para.push([w, line]);
  };
  text.split(/\r?\n/).forEach((raw, i) => {
    const l = raw.trim();
    if (/^(```|~~~)/.test(l)) {
      flush();
      fence = !fence;
      return;
    }
    if (fence) return;
    if (!l || /^#{1,6}\s/.test(l) || l.startsWith("|") || /^[-*_]{3,}$/.test(l) || l.startsWith("<!--") || (/^\s{4,}\S/.test(raw) && !para.length)) {
      flush();
      return;
    }
    const item = /^(?:[-*+]|\d+[.)])\s+(.*)$/.exec(l);
    if (item) {
      flush();
      add(item[1]!.replace(/^\[[ x]\]\s*/, ""), i + 1);
      return;
    }
    add(l, i + 1);
  });
  flush();
  return out.filter((s) => countWords(s.text) > 0);
}

export function countWords(s: string): number {
  return s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

export function isInstruction(s: string): boolean {
  return IMPERATIVE.test(s.replace(/^["'(\[]+/, "").replace(/^(?:then|first|next|also|now|to \w+[^,]*,)\s+/i, ""));
}

export function checkSentence(s: string, n = 1, line = 1): SteIssue[] {
  const out: SteIssue[] = [];
  const add = (rule: SteRule, message: string) => out.push({ rule, sentence: n, line, message: `Sentence ${n} ${message}` });
  const words = countWords(s);
  const limit = isInstruction(s) ? INSTRUCTION_LIMIT : DESCRIPTION_LIMIT;
  if (words > limit) add("sentence-length", `has ${words} words. The limit is ${limit}${limit === INSTRUCTION_LIMIT ? " for an instruction" : ""}.`);
  for (const m of s.matchAll(PASSIVE)) {
    if (NOT_PARTICIPLE.has(m[1]!.toLowerCase())) continue;
    add("passive", `uses the passive voice: "${m[0]}". Use the active voice.`);
    break;
  }
  for (const [w, re] of FILLER_RE) if (re.test(s)) add("filler", `uses "${w}". Say what the thing does.`);
  for (const [w, r, re] of WORD_RE) {
    if (!re.test(s)) continue;
    if (w === "display" && /\bthe display\b/i.test(s)) continue;
    add("word", `uses "${w}". Use "${r}".`);
  }
  for (const [p, re] of PHRASE_RE) if (re.test(s)) add("phrase", `uses "${p}". Write it out, or use a list.`);
  const modal = MODAL.exec(s);
  if (modal) add("modal", `uses "${modal[1]}". Use "must" for a requirement, or "can" for a possibility.`);
  return out;
}

export function checkText(text: string): SteIssue[] {
  return sentences(text).flatMap((s, i) => checkSentence(s.text, i + 1, s.line));
}

export function countByRule(issues: { rule: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of issues) out[i.rule] = (out[i.rule] ?? 0) + 1;
  return out;
}

export function summary(issues: SteIssue[], max = 4): string {
  const shown = issues.slice(0, max).map((i) => i.message).join(" ");
  return issues.length > max ? `${shown} (${issues.length - max} more.)` : shown;
}

export const STE_PROMPT = `How to write
Write every message, question, plan, metric definition, answer, summary, purpose and does text in Simplified Technical English (ASD-STE100):
- One idea per sentence. Instructions: 20 words or fewer. Descriptions: 25 words or fewer.
- Use the active voice: "The test compares the groups", not "the groups are compared".
- Use "must" for a requirement and "can" for a possibility. Do not use "should", "may" or "might".
- Use simple approved words: use, start, stop, do, show, make sure, about, before, after, if.
- No filler or marketing words: robust, comprehensive, powerful, seamless, leverage.
- Do not write "e.g.", "i.e.", "etc." or "and/or". Write the full words.
- Expand each acronym the first time you use it.
- Keep technical terms, units, numbers and names of programs as they are.
- Use a numbered list for a procedure with more than one step.`;

export const STE_PROMPT_SMALL = `- Write short sentences: 20 words or fewer. Use the active voice and simple words.
- Use "must" for a requirement. Do not write "should", "may", "e.g." or "etc.".`;

const UI_DIRS = ["src/ui", "src/tui", "src/server", "src/ui-web"];
const DATED = /^(handoff|status|release)-|\d{4}-\d{2}-\d{2}/;

export interface TextIssue extends SteIssue {
  file: string;
}

export function docFiles(root: string): string[] {
  const out = existsSync(join(root, "README.md")) ? ["README.md"] : [];
  const docs = join(root, "docs");
  if (existsSync(docs)) for (const f of readdirSync(docs).sort()) if (f.endsWith(".md") && !DATED.test(f)) out.push(`docs/${f}`);
  return out;
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

const STRING = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;

export function uiStrings(code: string): Sentence[] {
  const out: Sentence[] = [];
  let seen = 0;
  let lines = 1;
  const lineAt = (i: number) => {
    for (let k = code.indexOf("\n", seen); k >= 0 && k < i; k = code.indexOf("\n", k + 1)) lines++;
    seen = Math.max(seen, i);
    return lines;
  };
  for (const m of code.matchAll(STRING)) {
    const raw = (m[1] ?? m[2] ?? m[3] ?? "").replace(/\$\{[^}]*\}/g, "X");
    const base = lineAt(m.index!);
    const pieces = /<[a-zA-Z/][^>]*>/.test(raw) ? [...raw.matchAll(/>([^<>{}]+)</g)].map((x) => x[1]!) : [raw];
    for (const p of pieces) {
      const t = p.replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
      if (!/^["(]?[A-Z]/.test(t) || countWords(t) < 4 || !/[a-z]{2,}\s+[a-z]{2,}/.test(t)) continue;
      if (/[{};=]|=>|\(\)|\w\.\w+\(|^[A-Z_]+$/.test(t)) continue;
      const before = out.length;
      splitSentences(t, base, out);
      for (let i = before; i < out.length; i++) out[i]!.line = base;
    }
  }
  return out;
}

export function lintRepo(root: string): { files: number; issues: TextIssue[] } {
  const issues: TextIssue[] = [];
  let files = 0;
  const take = (file: string, list: Sentence[]) => {
    files++;
    list.forEach((s, i) => issues.push(...checkSentence(s.text, i + 1, s.line).map((x) => ({ ...x, file }))));
  };
  for (const f of docFiles(root)) take(f, sentences(readFileSync(join(root, f), "utf8")));
  for (const d of UI_DIRS) for (const p of walk(join(root, d))) take(relative(root, p), uiStrings(readFileSync(p, "utf8")));
  return { files, issues };
}

export function lintReport(root: string, opts: { verbose?: boolean; github?: boolean } = {}): string {
  const { files, issues } = lintRepo(root);
  const lines = [`Text lint (ASD-STE100): ${issues.length} issues in ${files} files.`];
  for (const [rule, n] of Object.entries(countByRule(issues)).sort((a, b) => b[1] - a[1])) lines.push(`  ${rule.padEnd(16)}${n}`);
  const byFile = countByRule(issues.map((i) => ({ rule: i.file })));
  lines.push("Files with the most issues:");
  for (const [f, n] of Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 10)) lines.push(`  ${String(n).padStart(4)}  ${f}`);
  if (opts.verbose) for (const i of issues) lines.push(`${i.file}:${i.line}: [${i.rule}] ${i.message}`);
  if (opts.github) lines.push(`::warning title=Text lint::${issues.length} ASD-STE100 issues in ${files} files. Run npm run lint:text -- --verbose to see each one.`);
  return lines.join("\n");
}
