import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import type { LoadedAdapter } from "../adapters/manifest.ts";
import { checkText, type SteIssue } from "../core/ste.ts";

export type Severity = "error" | "warning";

export interface Finding {
  rule: string;
  severity: Severity;
  where: string;
  message: string;
}

export interface LintTool {
  name: string;
  description: string;
  params: Record<string, Record<string, unknown>>;
  required: string[];
  batch?: boolean;
  returns?: "values" | "text";
  source: "manifest" | "module" | "server";
}

export interface KnownValue {
  value: number;
  source: string;
  adapters?: string[];
}

export interface LintInput {
  adapter: LoadedAdapter;
  raw: Record<string, any>;
  tools: LintTool[];
  toolsKnown: boolean;
  benchmark?: KnownValue[];
}

export const DESCRIPTION_LIMIT = 600;

export const RULES: Record<string, { severity: Severity; rule: string }> = {
  field: { severity: "error", rule: "adapter.field names the science field." },
  "file-types": { severity: "error", rule: "adapter.file_types lists the input file types, or [] if the adapter reads no local files." },
  "locate-identity": { severity: "error", rule: "A locate block that searches for a program has a version_command and an identity pattern that its output must match, so that a different program at the same path is not taken." },
  "install-hint": { severity: "error", rule: "program.install says how to install the program, if the adapter needs one." },
  "program-citation": { severity: "error", rule: "program.citation has at least one reference with a doi or a url, so that each output can cite the program." },
  "method-citation": { severity: "warning", rule: "A tool whose description names a published method, such as Benjamini-Hochberg or Otsu, cites the method in its citations." },
  "tool-description": { severity: "error", rule: "Each tool has a description." },
  "tool-description-length": { severity: "warning", rule: `A tool description has ${DESCRIPTION_LIMIT} characters or fewer.` },
  "tool-description-plain": { severity: "warning", rule: "The first sentence of a tool description has no code: no backticks, calls, dotted names or snake_case words." },
  "arg-description": { severity: "error", rule: "Each required argument has a description. An optional argument without one is a warning." },
  "arg-schema": { severity: "error", rule: "Each argument schema has only JSON Schema keys with values. An unquoted comma in a YAML flow map cuts the description and leaves a key with no value." },
  "arg-units": { severity: "warning", rule: "Each numeric argument names its unit, or says that it is a count, a fraction or unitless." },
  "array-min-items": { severity: "warning", rule: "A required list argument sets minItems, so an empty list fails at once." },
  "batch-flag": { severity: "error", rule: "A tool that can take a folder, a file pattern or a list of files declares batch: true (it always processes many files) or batch: false (one file, or the harness detects the folder at run time)." },
  "summary-template": { severity: "warning", rule: "Each tool has a summary template in the map, or its code writes a summary." },
  "manual-route": { severity: "error", rule: "Each map entry gives a manual route, or a code_only entry says in difference why there is none." },
  "error-text": { severity: "warning", rule: "Each error message names the cause and the argument or file. No bare raise, no empty or generic text." },
  "blinding-number": { severity: "error", rule: "No number in the text that the model sees equals a known-answer value or a benchmark value." },
  "decision-type": { severity: "error", rule: "Each decision has choices or an explicit kind." },
  "decision-default": { severity: "error", rule: "Each decision has a default, or the scientist owns it, so the harness asks." },
  "decision-help": { severity: "error", rule: "Each decision has a plain help text." },
  "text-style": { severity: "warning", rule: "Descriptions, decision help, STANDARDS.md and skills follow ASD-STE100: short sentences, active voice, approved words, must for a requirement." },
  "advice-limits": { severity: "warning", rule: 'A description does not give advice as an absolute ("Use X for Y", "for every") without the cases where it is wrong.' },
  "approval-code": { severity: "error", rule: "A tool that runs code that the model writes sets approval: true." },
  "fail-without-error": { severity: "warning", rule: "A result with ok false also has an error text." },
  "sensitivity-compare": { severity: "error", rule: "Each sensitivity compare entry is a full result path, such as metrics.n_objects." },
  "kat-exact": { severity: "warning", rule: "Each known-answer test pins at least one value with equals or approx. A test that reads only tools with returns: text (or listed in text_tools) can pin the exact text with contains." },
  "kat-failure-path": { severity: "warning", rule: "At least one known-answer test calls a tool with bad input and expects ok: false." },
  "kat-gui": { severity: "error", rule: "A known-answer test runs headless, or it is marked gui: true so that test loops skip it. A macro or screen adapter states gui on each test." },
  "kat-present": { severity: "error", rule: "The adapter has known-answer tests." },
  "kat-coverage": { severity: "warning", rule: "Each tool is called in at least one known-answer test." },
  "kat-data-license": { severity: "error", rule: "data/SOURCES.md lists each test data file with its source and license. A license that is not confirmed is a warning. A file that a test fetches is not in the repository: its row needs a source, and its fetch script checks a SHA-256 sum." },
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const BENCH_PAPERS = join(ROOT, "bench", "papers");

const CODE_EXT = new Set([".py", ".r", ".ts", ".groovy", ".ijm", ".sh", ".js", ".mjs", ".java"]);
const SKIP_DIRS = new Set(["data", "evidence", "node_modules", ".venv", "__pycache__", "panel"]);

function add(out: Finding[], rule: string, where: string, message: string, severity: Severity = RULES[rule].severity) {
  out.push({ rule, severity, where, message });
}

export function firstSentence(text: string): string {
  return (text.trim().split(/(?<=[.!?])\s/)[0] ?? "").trim();
}

function codeFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string, depth: number) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      let s;
      try {
        s = statSync(p);
      } catch {
        continue;
      }
      if (s.isDirectory()) {
        if (depth < 3 && !SKIP_DIRS.has(n) && !n.startsWith(".")) walk(p, depth + 1);
      } else if (CODE_EXT.has(extname(n).toLowerCase()) && s.size < 2_000_000) out.push(p);
    }
  };
  walk(root, 0);
  return out;
}

function needsProgram(a: LoadedAdapter): boolean {
  const m = a.manifest;
  const loc = m.locate;
  if (loc.env || loc.paths.length || loc.which.length) return true;
  const start = (m.connection.command.length ? m.connection.command : m.connection.interpreter)[0];
  if (start === "{node}") return false;
  if (m.connection.kind === "files" || m.connection.kind === "screen") return false;
  if (m.connection.kind === "http") return false;
  return true;
}

export const PUBLISHED_METHODS: [RegExp, string][] = [
  [/\bBenjamini\b|\bHochberg\b|\bfdr_b[hy]\b/i, "Benjamini-Hochberg"],
  [/\bHolm\b/, "Holm"],
  [/\bKaplan[- ]Meier\b|\bsurvival curve\b/i, "Kaplan-Meier"],
  [/\bCox (model|regression|proportional)/i, "Cox regression"],
  [/\bOtsu\b/i, "Otsu"],
  [/\brolling[- ]ball\b/i, "rolling ball"],
  [/\bLeiden\b/, "Leiden"],
  [/\bUMAP (embedding|projection)\b/i, "UMAP"],
  [/\bt-SNE\b/i, "t-SNE"],
  [/\bLipinski\b|\brule of five\b/i, "Lipinski rule of five"],
  [/\bESOL\b|\blog solubility\b/i, "ESOL"],
  [/\bModelFinder\b/, "ModelFinder"],
  [/\bUFBoot|\bultrafast bootstrap\b/i, "UFBoot"],
  [/\bPERMANOVA\b|\badonis2?\b/i, "PERMANOVA"],
  [/\bbetadisper\b/, "betadisper"],
  [/\bNMDS\b/, "NMDS"],
  [/\blogicle\b|\bhyperlog\b/i, "logicle"],
  [/\bSatterthwaite\b|\bKenward\b/i, "Satterthwaite"],
  [/\bindependent component analysis\b/i, "independent component analysis"],
  [/\btarget-decoy\b/i, "target-decoy"],
  [/\bWelch\b/, "Welch"],
  [/\bTukey\b|\bGames-Howell\b/i, "Tukey"],
  [/\bMann-Whitney\b|\bWilcoxon\b/i, "Wilcoxon"],
  [/\bMAFFT\b/, "MAFFT"],
  [/\bshrunken centroids\b/i, "spatial shrunken centroids"],
  [/\bShannon\b|\bSimpson\b/, "Shannon or Simpson diversity"],
  [/\bCostes\b|\bManders\b/, "Costes or Manders colocalization"],
  [/\bQCP\b|\bquaternion\b/i, "QCP superposition"],
  [/\bSExtractor\b/i, "SExtractor"],
];

const CODE_LIKE: [RegExp, string][] = [
  [/`/, "backticks"],
  [/\b[A-Za-z_]\w*\(/, "a function call"],
  [/\b[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*\b(?<!\be\.g)(?<!\bi\.e)/, "a dotted code name"],
  [/(^|\s)--?[a-z][\w-]*/, "a command-line flag"],
];

function codeLike(sentence: string, argNames: Set<string>): string | undefined {
  const s = sentence.replace(/https?:\/\/\S+/g, "").replace(/\b\S+\.(csv|tsv|xlsx|fits|fif|bam|vcf|tif|tiff|png|jpg|mzml|imzml|h5ad|fasta|fastq|json|txt|rds|pdb)\b/gi, "");
  for (const [re, what] of CODE_LIKE) if (re.test(s)) return what;
  const snake = [...s.matchAll(/\b[a-z][a-z0-9]*_[a-z0-9_]+\b/g)].map((x) => x[0]).filter((w) => !argNames.has(w));
  if (snake.length) return `the code word "${snake[0]}"`;
  return undefined;
}

const UNIT_WORDS = new RegExp(
  [
    "ppm", "ppb", "\\bda\\b", "dalton", "kda", "m/z", "\\bth\\b", "seconds?", "\\bs\\b", "\\bms\\b", "minutes?", "\\bmin\\b", "hours?", "days?", "weeks?", "years?",
    "\\bhz\\b", "khz", "pixels?", "\\bpx\\b", "voxels?", "µm", "\\bum\\b", "\\bnm\\b", "\\bmm\\b", "\\bcm\\b", "\\bm\\b", "microns?", "meters?", "metres?", "degrees?", "°", "radians?",
    "%", "percent", "fraction", "proportion", "ratio", "probability", "p[- ]?values?", "significance", "z[- ]?scores?", "standard deviations?", "\\bsd\\b", "\\bsds\\b",
    "fold", "log2?", "counts?", "number of", "how many", "reads?", "events?", "cells?", "genes?", "samples?", "molecules?", "atoms?", "frames?", "bins?", "iterations?",
    "threads?", "cores?", "index", "seed", "rank", "unitless", "no unit", "dimensionless", "same units?", "units? of", "\\bunits?\\b", "tesla", "\\bt/m\\b", "\\bft\\b",
    "volts?", "µv", "\\buv\\b", "celsius", "kelvin", "\\bbp\\b", "bases?", "\\bkb\\b", "phred", "quality", "intensit(y|ies)", "gray levels?", "grey levels?", "bootstraps?",
    "replicates?", "permutations?", "times?", "points?", "peaks?", "features?", "clusters?", "neighbou?rs?", "components?", "pcs\\b", "dimensions?", "rows?", "columns?",
    "mass", "\\bmz\\b", "charge", "resolution", "weight", "scale", "factor", "multiplier", "between 0 and 1", "0 to 1", "0-1", "\\bfdr\\b", "q[- ]?values?", "alpha",
    "ångström", "angstrom", "\\bå\\b", "nanoseconds?", "\\bns\\b", "\\bps\\b", "kcal", "kj", "arcsec", "arcseconds?", "magnitudes?", "jansky", "\\bmjy\\b", "\\bpc\\b",
    "lines?", "residues?", "sequences?", "sites?", "taxa", "species", "objects?", "nuclei", "spots?", "words?", "characters?", "bytes?", "\\bmb\\b", "\\bgb\\b",
  ].join("|"),
  "i",
);
const UNIT_NAME = /(_|^)(ppm|da|s|sec|ms|min|hz|px|um|nm|mm|pct|percent|frac|fraction|deg|bp|kb|n|count|counts|seed|index|alpha|fdr|sigma|ratio|mz)$|^n_|^min_count|^max_count/i;

function numericKind(schema: Record<string, unknown>): string | undefined {
  const t = schema.type;
  const types = Array.isArray(t) ? t : [t];
  if (types.includes("number")) return "number";
  if (types.includes("integer")) return "integer";
  const items = schema.items as Record<string, unknown> | undefined;
  if (types.includes("array") && items && ["number", "integer"].includes(String(items.type))) return "list of numbers";
  return undefined;
}

const BATCH_NAME = /^(folder|dir|directory|paths|files|inputs|images|samples|pattern|glob|file_pattern|input_dir|input_folder|image_folder|images_folder)$|_(folder|dir|paths|files|glob|pattern)$/i;
const BATCH_TEXT = /\b(every|each|all) (files?|images?|samples?) (in|of) (a|the|one) (folder|directory)\b|\bglob\b/i;

function looksBatch(t: LintTool): string | undefined {
  for (const [name, schema] of Object.entries(t.params)) {
    const items = schema.items as Record<string, unknown> | undefined;
    if (BATCH_NAME.test(name)) return `the argument "${name}"`;
    if (schema.type === "array" && items?.type === "string" && /path|file|image|sample|input/i.test(name)) return `the list argument "${name}"`;
  }
  if (BATCH_TEXT.test(t.description)) return "the description";
  return undefined;
}

const GENERIC = /^\s*(error|failed|failure|not found|invalid|invalid (input|value|argument)|unknown error|bad input|something went wrong|no (data|result|results|file)|[\w-]+ (failed|not found|error))[.:!]?\s*$/i;
const STREAM = /(stderr|stdout|err|output|proc\.\w+|result\.\w+)/;

export function scanErrors(text: string, file: string): Finding[] {
  const out: Finding[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const where = `${file}:${i + 1}`;
    const l = line.trim();
    if (l.startsWith("#") || l.startsWith("//")) return;
    if (/^raise\s+[A-Za-z_][\w.]*(\(\s*\))?\s*$/.test(l) && !/^raise\s*$/.test(l)) {
      add(out, "error-text", where, "a raise with no message. Say what is wrong and name the argument or the file.");
      return;
    }
    if (/\bthrow new \w*Error\(\s*\)/.test(l) || /\bstop\(\s*\)/.test(l)) {
      add(out, "error-text", where, "an error with no message. Say what is wrong and name the argument or the file.");
      return;
    }
    const call = /\b(raise\s+[\w.]+|throw new \w*Error|stop|sys\.exit|fail|abort|die)\s*\(\s*(['"])(.*?)\2\s*\)/.exec(l);
    if (call && GENERIC.test(call[3])) {
      add(out, "error-text", where, `the message "${call[3]}" does not say why or for which input. Add the cause and the argument or file name.`);
      return;
    }
    const field = /["']?error["']?\s*[:=]\s*(['"])(.*?)\1\s*[,}]/.exec(l);
    if (field && GENERIC.test(field[2])) {
      add(out, "error-text", where, `the error text "${field[2]}" does not say why or for which input. Add the cause and the argument or file name.`);
      return;
    }
    const tail = /(['"])[^'"]*\b(failed|error)\s*:\s*\1\s*\+\s*([\w.]+)/i.exec(l) ?? /f(['"])[^'"]*\b(failed|error)\s*:\s*\{([\w.]+)[^}]*\}\s*\1/i.exec(l);
    if (tail && STREAM.test(tail[3]) && !/\bor\b|\|\||\?\?/.test(l.slice(tail.index + tail[0].length - tail[3].length - 2))) {
      add(out, "error-text", where, `the reason comes only from ${tail[3]}, which can be empty. Add the exit code and the input name when it is empty.`);
      return;
    }
    if (/\b_?fail\(\s*str\(\s*\w+\s*\)\s*\)|\bfail\(\s*conditionMessage\(\s*\w+\s*\)\s*\)/.test(l)) {
      add(out, "error-text", where, "the library message goes to the model with no context. Add the step and the input, such as \"cannot read <file>: \" before it.");
      return;
    }
    if (/not found or not public|can be private/i.test(l)) {
      add(out, "error-text", where, "the message gives two possible causes. A small model picks the wrong one and stops. Test for each cause and name the one that happened.");
      return;
    }
    if (/["']ok["']\s*:\s*(False|false|FALSE)\b/.test(l) && !/error/.test(l) && /[{(]/.test(l) && /[})]\s*,?\s*$/.test(l)) {
      add(out, "fail-without-error", where, 'a result with ok false has no "error" text. Say why the step failed.');
    }
  });
  return out;
}

interface TextPiece {
  where: string;
  text: string;
}

function visibleText(a: LoadedAdapter, tools: LintTool[]): TextPiece[] {
  const m = a.manifest;
  const out: TextPiece[] = [];
  const push = (where: string, text: unknown) => {
    if (typeof text === "string" && text) out.push({ where, text });
    else if (typeof text === "number") out.push({ where, text: String(text) });
  };
  push("adapter.description", m.adapter.description);
  push("standards", m.standards);
  const std = join(a.root, "STANDARDS.md");
  if (existsSync(std)) readFileSync(std, "utf8").split(/\r?\n/).forEach((l, i) => push(`STANDARDS.md:${i + 1}`, l));
  for (const s of a.skills()) readFileSync(s.path, "utf8").split(/\r?\n/).forEach((l, i) => push(`skills/${relative(join(a.root, "skills"), s.path).split(sep).join("/")}:${i + 1}`, l));
  for (const t of tools) {
    push(`tool "${t.name}" description`, t.description);
    for (const [p, schema] of Object.entries(t.params)) {
      push(`tool "${t.name}", argument "${p}" description`, schema.description);
      if (schema.default !== undefined) push(`tool "${t.name}", argument "${p}" default`, typeof schema.default === "object" ? JSON.stringify(schema.default) : schema.default);
      if (schema.examples !== undefined) push(`tool "${t.name}", argument "${p}" examples`, JSON.stringify(schema.examples));
    }
  }
  for (const d of m.decisions) {
    push(`decision "${d.key}" label`, d.label);
    push(`decision "${d.key}" help`, d.help);
  }
  for (const e of m.map) {
    push(`map "${e.tool}" route`, e.route);
    for (const s of e.steps) push(`map "${e.tool}" steps`, s);
    push(`map "${e.tool}" difference`, e.difference);
    push(`map "${e.tool}" summary`, e.summary);
    for (const p of e.params) push(`map "${e.tool}" param note`, p.note);
  }
  for (const c of m.checks) {
    push(`check "${c.id}" description`, c.description);
    push(`check "${c.id}" text`, c.text);
    push(`check "${c.id}" message`, c.rule?.message);
  }
  return out;
}

const STOP = new Set([1.96, 2.58, 1.645, 3.14, 3.1416, 3.14159, 2.718, 255, 256, 360, 180, 1024, 2048, 4096, 8192, 65535, 65536, 0.999, 4326, 3857]);

function sigDigits(s: string): number {
  const digits = s.replace(/^[-+]/, "").replace(".", "").replace(/^0+/, "");
  const trimmed = s.includes(".") ? digits : digits.replace(/0+$/, "");
  return trimmed.length;
}

export function numbersIn(text: string): { raw: string; value: number; decimals: number }[] {
  const out: { raw: string; value: number; decimals: number }[] = [];
  const clean = text.replace(/https?:\/\/\S+/g, " ").replace(/\b(v|version\s*)\d+(\.\d+)+\b/gi, " ").replace(/\b\d+\.\d+\.\d+\b/g, " ");
  for (const x of clean.matchAll(/(?<![\w.])-?\d[\d,]*(?:\.\d+)?(?![\w.]*\d)/g)) {
    const raw = x[0].replace(/,(?=\d{3}\b)/g, "");
    if (/,/.test(raw)) continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
    if (sigDigits(raw) < 3) continue;
    if (decimals === 0 && value >= 1900 && value <= 2100) continue;
    if (STOP.has(Math.abs(value))) continue;
    out.push({ raw, value, decimals });
  }
  return out;
}

function sameNumber(n: { value: number; decimals: number }, v: number): boolean {
  if (Math.abs(n.value - v) <= 1e-9 * Math.max(1, Math.abs(v))) return true;
  if (n.decimals === 0 && !Number.isInteger(v)) return false;
  const f = 10 ** n.decimals;
  return Math.round(v * f) / f === n.value && Math.abs(v) >= 10 ** -n.decimals;
}

export function katValues(a: LoadedAdapter): KnownValue[] {
  const out: KnownValue[] = [];
  for (const t of a.manifest.tests)
    for (const e of t.expect) {
      for (const v of [e.equals, e.approx]) if (typeof v === "number") out.push({ value: v, source: `known-answer test "${t.id}" (${e.path})` });
    }
  return out;
}

export function benchmarkValues(dir = BENCH_PAPERS): KnownValue[] {
  if (!existsSync(dir)) return [];
  const out: KnownValue[] = [];
  for (const paper of readdirSync(dir)) {
    let adapters: string[] | undefined;
    try {
      const b = parseYaml(readFileSync(join(dir, paper, "bench.yaml"), "utf8"));
      if (Array.isArray(b?.adapters)) adapters = b.adapters.map(String);
    } catch {
      adapters = undefined;
    }
    for (const [file, key] of [["expected.yaml", "expected"], ["bench.yaml", "items"]] as const) {
      const p = join(dir, paper, file);
      if (!existsSync(p)) continue;
      let doc: Record<string, unknown>;
      try {
        doc = parseYaml(readFileSync(p, "utf8")) ?? {};
      } catch {
        continue;
      }
      const list = Array.isArray(doc[key]) ? (doc[key] as Record<string, unknown>[]) : [];
      for (const item of list) if (typeof item?.value === "number") out.push({ value: item.value, source: `benchmark ${paper} (${String(item.description ?? item.key ?? "")})`, adapters });
    }
  }
  return out;
}

function testDataFiles(a: LoadedAdapter, fetched = false): string[] {
  const files = new Set<string>();
  for (const t of a.manifest.tests) {
    if (!!t.fetch !== fetched) continue;
    for (const d of t.data) files.add(d.replace(/^\.\//, ""));
    const failure = t.expect.some((e) => e.path === "ok" && e.equals === false);
    const text = JSON.stringify(t.calls);
    for (const x of text.matchAll(/\{adapter_dir\}\/(data\/[^"{}*?\s]+)/g)) {
      const f = x[1].replace(/\/$/, "");
      if (!(failure && !existsSync(join(a.root, f)))) files.add(f);
    }
  }
  return [...files].filter((f) => f.startsWith("data/"));
}

export function readSources(text: string): { file: string; source: string; license: string }[] {
  const rows: { file: string; source: string; license: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    if (cells.length < 3 || /^-+$/.test(cells[0].replace(/[: ]/g, "")) || /^file$/i.test(cells[0])) continue;
    rows.push({ file: cells[0].replace(/`/g, "").replace(/^data\//, ""), source: cells[1], license: cells[2] });
  }
  return rows;
}

const UNCONFIRMED = /\b(unknown|not confirmed|unconfirmed|unclear|to check|check before|tbd|todo)\b/i;

function lintData(a: LoadedAdapter, out: Finding[]) {
  const fetchedFiles = testDataFiles(a, true);
  const files = testDataFiles(a).filter((f) => !fetchedFiles.includes(f));
  for (const script of new Set(a.manifest.tests.map((t) => t.fetch).filter(Boolean))) {
    const p = join(a.root, script);
    if (!existsSync(p)) add(out, "kat-data-license", script, "the fetch script does not exist. Write it: it downloads the file, checks its SHA-256 sum and stops on a mismatch.");
    else if (!/sha256|shasum/i.test(readFileSync(p, "utf8"))) add(out, "kat-data-license", script, "the fetch script does not check a SHA-256 sum. Compare the download with a fixed sum and stop on a mismatch.", "warning");
  }
  const all = [...files, ...fetchedFiles];
  if (!all.length) return;
  const note = join(a.root, "data", "SOURCES.md");
  if (!existsSync(note)) {
    add(out, "kat-data-license", "data/SOURCES.md", `the tests read ${all.length} data file(s) but data/SOURCES.md does not exist. Write a table | File | Source | License | with one row for each file or folder. For a made-up file write the script that makes it and "synthetic".`);
    return;
  }
  const rows = readSources(readFileSync(note, "utf8"));
  for (const f of all) {
    const rel = f.replace(/^data\//, "");
    const row = rows.find((r) => r.file && (rel === r.file || rel.startsWith(r.file.replace(/\/?$/, "/")) || (r.file.includes("*") && new RegExp(`^${r.file.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")}$`).test(rel))));
    if (!row) add(out, "kat-data-license", "data/SOURCES.md", `the test data file ${f} has no row. Add its source and license.`);
    else if (fetchedFiles.includes(f)) {
      if (!row.source) add(out, "kat-data-license", "data/SOURCES.md", `the row for ${row.file} has no source. A fetched file needs the address that the fetch script downloads.`);
    }
    else if (!row.license || !row.source) add(out, "kat-data-license", "data/SOURCES.md", `the row for ${row.file} has no ${row.source ? "license" : "source"}.`);
    else if (UNCONFIRMED.test(row.license)) add(out, "kat-data-license", "data/SOURCES.md", `the license of ${row.file} is not confirmed ("${row.license}"). Confirm it before the adapter is public, or replace the file with public or synthetic data.`, "warning");
  }
}

function toolCode(a: LoadedAdapter, tool: string): string {
  const m = a.manifest;
  const def = m.tools.find((t) => t.name === tool);
  const read = (p: string) => (existsSync(p) && statSync(p).isFile() ? readFileSync(p, "utf8") : "");
  if (def?.function) {
    const [mod] = def.function.split(":");
    return read(join(a.root, `${mod.replace(/\./g, "/")}.py`));
  }
  if (def?.script) return read(join(a.root, def.script));
  if (def?.command.length) {
    const scripts = def.command.filter((c) => c.includes("{adapter_dir}/")).map((c) => read(join(a.root, c.replace(/^.*\{adapter_dir\}\//, ""))));
    if (scripts.some(Boolean)) return scripts.join("\n");
    return "";
  }
  return codeFiles(a.root).map(read).join("\n");
}

function proseText(a: LoadedAdapter, tools: LintTool[]): { where: string; text: string; file: boolean }[] {
  const m = a.manifest;
  const out: { where: string; text: string; file: boolean }[] = [];
  const push = (where: string, text: unknown, file = false) => {
    if (typeof text === "string" && text.trim()) out.push({ where, text, file });
  };
  const unfront = (t: string) => t.replace(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/, (_, b: string) => b.split(/\r?\n/).join("\n\n") + "\n\n");
  push("adapter.description", m.adapter.description);
  push("standards", m.standards);
  const std = join(a.root, "STANDARDS.md");
  if (existsSync(std)) push("STANDARDS.md", readFileSync(std, "utf8"), true);
  for (const s of a.skills()) push(`skills/${relative(join(a.root, "skills"), s.path).split(sep).join("/")}`, unfront(readFileSync(s.path, "utf8")), true);
  for (const t of tools) {
    push(`tool "${t.name}" description`, t.description);
    for (const [p, schema] of Object.entries(t.params)) push(`tool "${t.name}", argument "${p}" description`, schema.description);
  }
  for (const d of m.decisions) push(`decision "${d.key}" help`, d.help);
  return out;
}

function steMessage(issues: SteIssue[], file: boolean): string {
  const shown = issues.slice(0, 3).map((i) => (file ? `line ${i.line}: ${i.message.replace(/^Sentence \d+ /, "")}` : i.message));
  const more = issues.length > 3 ? ` ${issues.length - 3} more.` : "";
  return `${issues.length} text rule problem${issues.length === 1 ? "" : "s"}. ${shown.join(" ")}${more}`;
}

export function lint(input: LintInput): Finding[] {
  const { adapter: a, raw, tools } = input;
  const m = a.manifest;
  const out: Finding[] = [];

  if (!m.adapter.field.trim()) add(out, "field", "adapter.field", 'the field is empty. Add the science field, such as "statistics". list_adapters shows it, and the model picks an adapter by it.');
  if (raw?.adapter?.file_types === undefined) add(out, "file-types", "adapter.file_types", 'file_types is missing. List the input file endings, main type first, such as [".csv", ".tsv"]. Write [] only if the adapter reads no local files.');
  const loc = m.locate;
  if (loc.env || loc.paths.length || loc.which.length) {
    if (!loc.version_command.length || !loc.identity.trim())
      add(out, "locate-identity", "locate", `the locate block finds a file by name only. A different program can have the same name (on macOS, FileInfo also matches leptonica's fileinfo). Add a version_command and an identity: a regular expression that the output must match and that names the program, such as "${m.program.name.split(/[ ,]/)[0]} \\d".`);
    else {
      try {
        new RegExp(loc.identity);
      } catch (err) {
        add(out, "locate-identity", "locate.identity", `the identity is not a valid regular expression: ${(err as Error).message}`);
      }
      if (/^[\\d\s.()+*?\[\]S-]*$/.test(loc.identity)) add(out, "locate-identity", "locate.identity", "the identity has no program name. Put a word from the program's own version output in it.");
    }
  }
  if (needsProgram(a) && !m.program.citation.some((c) => c.doi.trim() || c.url.trim()))
    add(out, "program-citation", "program.citation", m.program.citation.length ? "no citation has a doi or a url. Add the DOI of the paper that the program asks users to cite, or the web address of the program if it has no paper." : `there is no citation. Add the reference that the authors of ${m.program.name} ask for, with text and doi. Look on the program website, in citation("Package") for an R package, or in CITATION.cff.`);
  if (needsProgram(a) && !m.program.install.trim()) add(out, "install-hint", "program.install", "the adapter needs a program, but program.install is empty. Write the install command in one or two sentences, with the environment the adapter looks in.");

  const usedInTests = new Set(m.tests.flatMap((t) => t.calls.map((c) => c.tool)));
  for (const t of tools) {
    const where = `tool "${t.name}"`;
    const args = new Set(Object.keys(t.params));
    if (!t.description.trim()) add(out, "tool-description", where, "the description is empty. Say in one plain sentence what the tool does and what it returns.");
    else {
      if (t.description.length > DESCRIPTION_LIMIT) add(out, "tool-description-length", where, `the description has ${t.description.length} characters (limit ${DESCRIPTION_LIMIT}). Move detail to the argument descriptions or a skill.`);
      const code = codeLike(firstSentence(t.description), args);
      if (code) add(out, "tool-description-plain", where, `the first sentence has ${code}. The session shows the first sentence to the model when it picks a tool. Say what the tool does in plain words.`);
    }
    for (const [p, schema] of Object.entries(t.params)) {
      const desc = typeof schema.description === "string" ? schema.description.trim() : "";
      const isReq = t.required.includes(p);
      if (!desc) {
        if (!schema.enum && !(schema.const !== undefined))
          add(out, "arg-description", `${where}, argument "${p}"`, `${isReq ? "the required" : "the"} argument has no description. Say what it is, its unit and its default.`, isReq ? "error" : "warning");
        else if (isReq) add(out, "arg-description", `${where}, argument "${p}"`, "the required argument has no description. Say what each choice means.");
      }
      for (const [k, v] of Object.entries(schema))
        if (v === null || v === undefined)
          add(out, "arg-schema", `${where}, argument "${p}"`, `the schema has the key "${k}" with no value. A comma in an unquoted description cut it: the model sees only "${desc}". Put the description in quotes.`);
      const num = numericKind(schema);
      if (num && !UNIT_WORDS.test(desc) && !UNIT_NAME.test(p))
        add(out, "arg-units", `${where}, argument "${p}"`, `the ${num} has no unit in its description. Name the unit (ppm, s, pixels), or say that it is a count, a fraction or unitless.`);
      if (isReq && schema.type === "array" && schema.minItems === undefined)
        add(out, "array-min-items", `${where}, argument "${p}"`, "a required list has no minItems. Set minItems: 1, so that an empty list fails with a message and does not give an empty result.");
    }
    for (const r of t.required) if (!(r in t.params) && t.source !== "manifest") add(out, "arg-description", `${where}, argument "${r}"`, "the required argument is not in the schema.");
    for (const [what, text] of [["description", t.description], ...Object.entries(t.params).map(([p, s]) => [`argument "${p}"`, typeof s.description === "string" ? s.description : ""])]) {
      const absolute = /\b(use|pass|set)\s+[\w"'.-]+\s+for\s+(an?\s+|the\s+)?[\w-]+|\bfor every\b|\bfor each\b[^.]*\byou report\b/i.exec(text);
      if (absolute && !/\b(only|not|unless|except|never|but)\b/i.test(text))
        add(out, "advice-limits", `${where}, ${what}`, `"${absolute[0]}" reads as a rule for all cases. A small model applies it everywhere. Say when it is wrong, such as "only for X; keep Y for Z".`);
    }
    const def = m.tools.find((d) => d.name === t.name);
    const method = PUBLISHED_METHODS.find(([re]) => re.test(t.description));
    if (method && !def?.citations.length && !m.citations.some((c) => c.tool === t.name))
      add(out, "method-citation", where, `the description names ${method[1]}, a published method, but the tool cites nothing. Add citations with the text and doi of the method paper${t.source === "manifest" ? "" : " to the top-level citations list, with tool set to this tool name"}.`);
    if (t.source === "manifest" && def && !def.approval && /^(run_(script|code|python|r|macro|user_tool)|exec\w*|eval\w*|(create|edit|delete)_tool)$/.test(t.name))
      add(out, "approval-code", where, "the tool runs code from the model but approval is false. Set approval: true.");
    const batchWhy = looksBatch(t);
    if (batchWhy && t.batch === undefined) {
      if (t.source === "manifest") add(out, "batch-flag", where, `${batchWhy} suggests many files. Set batch: true if every call processes many files: the pilot gate then holds it until the scientist approves a one-sample pilot. Set batch: false if it takes one file, or one file or a folder: the harness detects a folder or 3 or more paths at run time.`);
      else add(out, "batch-flag", where, `${batchWhy} suggests many files. If one call processes many files, add the tool to batch_tools.`, "warning");
    }
    const entries = m.map.filter((e) => e.tool === t.name);
    if (entries.length && !entries.some((e) => e.summary) && !/\bsummary\b/.test(toolCode(a, t.name)))
      add(out, "summary-template", where, 'no summary template and the code writes no summary, so the step shows "<tool> finished." Add summary to the map entry, such as "{metrics.n_objects} objects at threshold {metrics.threshold}".');
    if (m.tests.length && !usedInTests.has(t.name)) add(out, "kat-coverage", where, "no known-answer test calls this tool. Add one, so that the tests and the drive test cover it.");
  }

  for (const e of m.map) {
    if (e.fidelity === "code_only" && !e.route.trim() && !e.difference.trim())
      add(out, "manual-route", `map entry for "${e.tool}"`, "a code_only entry has no route and no difference. Give the code line or command that repeats the step, or say in difference why there is no manual route.");
  }

  for (const f of codeFiles(a.root)) out.push(...scanErrors(readFileSync(f, "utf8"), relative(a.root, f).split(sep).join("/")));

  const known = [...katValues(a), ...(input.benchmark ?? []).filter((k) => !k.adapters?.length || k.adapters.includes(a.name))];
  if (known.length) {
    for (const piece of visibleText(a, tools)) {
      for (const n of numbersIn(piece.text)) {
        const hit = known.find((k) => sameNumber(n, k.value));
        if (hit) add(out, "blinding-number", piece.where, `the number ${n.raw} equals the value of ${hit.source}. A model can copy it into an answer. Remove it, or use a made-up example number.`);
      }
    }
  }

  const rawDecisions: Record<string, any>[] = Array.isArray(raw?.decisions) ? raw.decisions : [];
  for (const d of m.decisions) {
    const where = `decision "${d.key}"`;
    const r = rawDecisions.find((x) => x?.key === d.key) ?? {};
    if (!d.choices.length && r.kind === undefined) add(out, "decision-type", where, "the decision has no choices and no kind. Add choices, or kind: float, int, bool or text.");
    if (d.default === undefined && d.owner === "agent") add(out, "decision-default", where, "the agent owns the decision but it has no default. Add the default from the program docs, or set owner: human so that the harness asks.");
    if (!d.help.trim()) add(out, "decision-help", where, "the help text is empty. Write one or two plain sentences: what the choice changes, and when to pick each option.");
    for (const c of d.sensitivity?.compare ?? [])
      if (!/^(metrics|data|table|summary|outputs)\b/.test(c)) add(out, "sensitivity-compare", where, `the sensitivity compare entry "${c}" is not a result path. Write it as metrics.${c} or data.${c}.`);
  }

  const rawTests: Record<string, any>[] = Array.isArray(raw?.tests) ? raw.tests : [];
  if (m.connection.kind === "screen" || m.connection.kind === "macro")
    for (const t of m.tests)
      if (rawTests.find((r) => r?.id === t.id)?.gui === undefined)
        add(out, "kat-gui", `test "${t.id}"`, `a ${m.connection.kind} adapter can open a program window. Set gui: true if the test opens a window or takes the focus (default test runs skip it; --gui runs it), or gui: false if you checked that it runs headless.`);
  if (!m.tests.length) add(out, "kat-present", "tests", "the adapter has no known-answer tests. Add at least one test on small public or synthetic data with a number from a trusted source.");
  const textTools = new Set([...tools.filter((t) => t.returns === "text").map((t) => t.name), ...m.text_tools]);
  const readsText = (t: (typeof m.tests)[number], path: string) => {
    const saved = /^saved\.([^.]+)/.exec(path);
    const call = saved ? t.calls.find((c) => c.save_as === saved[1]) : t.calls[t.calls.length - 1];
    return !!call && textTools.has(call.tool);
  };
  for (const t of m.tests) {
    if (t.expect.some((e) => e.path === "ok" && e.equals === false)) continue;
    if (t.expect.some((e) => e.contains !== undefined) && t.expect.every((e) => e.path === "ok" || readsText(t, e.path))) continue;
    if (t.expect.length && !t.expect.some((e) => (e.equals !== undefined && e.path !== "ok") || e.approx !== undefined))
      add(out, "kat-exact", `test "${t.id}"`, "the test pins no value: it checks only ok, a range or a text. Add equals or approx for a number from a trusted source.");
  }
  if (m.tests.length && !m.tests.some((t) => t.expect.some((e) => e.path === "ok" && e.equals === false)))
    add(out, "kat-failure-path", "tests", "no test expects a failure. Add one with bad input (an empty list, a pattern that matches no file, a missing column) and expect ok: false and a contains on error.");
  for (const piece of proseText(a, tools)) {
    const issues = checkText(piece.text);
    if (issues.length) add(out, "text-style", piece.where, steMessage(issues, piece.file));
  }
  lintData(a, out);
  return out;
}
