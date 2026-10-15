import type { AnalysisPlan } from "./plan.ts";
import type { AnalysisRecord } from "./record.ts";
import { outOfDateNodes } from "./status.ts";
import type { Claim } from "./types.ts";

interface Found {
  start: number;
  end: number;
  value: number;
  step: number;
  percent: boolean;
  small: boolean;
  signed: boolean;
  unit?: string;
  fold: boolean;
}

interface Span {
  start: number;
  end: number;
  text: string;
}

const NUMBER =
  /(?<![\w.])(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+)(?:\s?[eE]([-+−]?\d+)|\s?[x×·⋅*]\s?10(?:\^\(?\{?([-+−]?\d+)\}?\)?|([-+−]\d+)|([⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)))?(\s?%|\s(?:per ?cent|percent)\b)?/g;

const SUPERSCRIPT: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+" };

const MASKS: RegExp[] = [
  /^[ \t]*(?:[-*•][ \t]+)?\d+[.)](?=\s)/gm,
  /https?:\/\/\S+/g,
  /10\.\d{4,9}\/\S+/g,
  /\bPMID:?\s*\d+/gi,
  /\bPMC\d+/g,
  /\[\d+(?:\s*[,–-]\s*\d+)*\]/g,
  /\b\d{4}-\d{2}-\d{2}(?=\b|_)/g,
  /\b\d{1,2}h\d{1,2}m\d{1,2}s\b/g,
  /(?<![\w.])\d+:\d+(?:;O\d*)?(?![\d.])/g,
  /(?<![\w.])v?\d+\.\d+\.\d+(?:[.-][A-Za-z0-9]+)*/g,
  /\b(?:WGS|NAD|ETRS|GDA|SIRGAS)\s?\d+|\bEPSG:?\s?\d+|\bUTM zone \d+[NS]?/gi,
  /(?<![\w.-])[\w.-]*\.(?:pdb|cif|mmcif|fasta|fa|faa|fna|fcs|tif|tiff|png|jpe?g|gif|csv|tsv|xlsx?|mzml|mzxml|imzml|ibd|vcf|bcf|bed|bam|sam|cram|fastq|fq|fif|edf|fits?|phy|nex|nwk|tree|json|xml|ya?ml|txt|h5ad|h5|zarr|nii|gz|zip|cppipe|ijm|py|r|ipynb)\b/gi,
  /\b\d[A-Z][A-Z0-9]{2}\b/g,
  /\b[A-Za-z][A-Za-z0-9]*-\d+(?!\d|[.,]\d)/g,
  /\bet al\.?,?\s*\(?(?:19|20)\d\d[a-z]?\)?/g,
  /\([A-Z][A-Za-z'-]+(?:\s+et al\.?|\s+(?:and|&)\s+[A-Z][A-Za-z'-]+)?,?\s+(?:19|20)\d\d[a-z]?(?:[;,][^)]*)?\)/g,
];

const CITATION =
  /10\.\d{4,9}\/\S+|\bPMID\b|\bPMC\d+|\bet al\b|\[\d+(?:\s*[,–-]\s*\d+)*\]|\([A-Z][A-Za-z'-]+,?\s+(?:19|20)\d\d[a-z]?\)/;

const HEDGE =
  /\b(?:suggest(?:s|ed|ing)?|likely|may|might|could|consistent with|indicat(?:es|ed|ing)|probabl[ye]|possibly|perhaps|appears?|seems?)\b/i;

const LABEL_BEFORE =
  /\b(?:steps?|figs?\.?|figures?|tables?|sections?|nodes?|panels?|rounds?|stages?|phases?|items?|no\.?|#)\s*$/i;

const THRESHOLD_BEFORE =
  /(?:\b[pq]\s*(?:<|≤|<=)|\b(?:alpha|threshold|cut-?off|FDR|significance level)\s*(?:of|at|=|<|≤)?|α\s*(?:=|<|≤)?)\s*$/i;

const YEAR_BEFORE =
  /(?:\b(?:in|since|from|until|during|between|through|years?|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)|\b(?:19|20)\d\d\s*(?:,|and|or|to|–|-))\s*$/i;

const YEAR_AFTER = /^(?:\s*$|\s*[,.;:)–-]|\s+(?:and|or|to|through|until)\b|\s+[A-Z])/;

const UNITS: Record<string, [string, number]> = {
  ng: ["mass", 1e-9], ug: ["mass", 1e-6], mg: ["mass", 1e-3], g: ["mass", 1], kg: ["mass", 1e3],
  nl: ["volume", 1e-9], ul: ["volume", 1e-6], ml: ["volume", 1e-3], l: ["volume", 1],
  nm: ["length", 1e-9], um: ["length", 1e-6], mm: ["length", 1e-3], cm: ["length", 1e-2],
  us: ["time", 1e-6], ms: ["time", 1e-3], s: ["time", 1], min: ["time", 60], h: ["time", 3600],
  pct: ["percent", 1],
};

const UNIT_AFTER = /^\s?(ng|[µμu]g|mg|kg|g|nl|[µμu]l|ml|nm|[µμu]m|mm|cm|[µμu]s|ms|seconds?|secs?|s|minutes?|mins?|hours?|hrs?|h)\b/i;
const UNIT_KEY = /_(ng|ug|mg|g|kg|nl|ul|ml|nm|um|mm|cm|us|ms|s|sec|min|hr|hours|pct|percent)$/i;
const FOLD_AFTER = /^\s?-?\s?fold\b/i;
const NEAR = 60;
const DOWN =
  /\b(?:decreas\w*|lower\w*|reduc\w*|down-?regulat\w*|declin\w*|fell|falls?|dropp?\w*|less|fewer|loss|lost|shorter|smaller|slower)\b/i;

function unitName(u: string): string {
  const x = u.toLowerCase().replace(/^[µμ]/, "u");
  if (/^sec/.test(x) || x === "second") return "s";
  if (/^min/.test(x)) return "min";
  if (/^h(ou)?rs?$|^hour/.test(x)) return "h";
  return x === "percent" ? "pct" : x;
}

export function keyUnit(path: string): string | undefined {
  const key = (path.split(".").pop() ?? "").replace(/(\[\d+\])+$/, "");
  const m = UNIT_KEY.exec(key);
  return m ? unitName(m[1]!) : undefined;
}

function mask(text: string): string {
  let out = text;
  for (const re of MASKS) out = out.replace(re, (m) => " ".repeat(m.length));
  return out;
}

// The numbers come in text order, so the function keeps the result for the last line.
function inTableCell(text: string, at: number, last: { from: number; end: number; cell: boolean }): boolean {
  if (at >= last.from && at < last.end) return last.cell;
  const from = text.lastIndexOf("\n", at - 1) + 1;
  const end = text.indexOf("\n", at);
  const line = text.slice(from, end < 0 ? text.length : end);
  const after = end < 0 ? -1 : text.indexOf("\n", end + 1);
  const cell = /^\s*\|.*\|\s*$/.test(line) && (end < 0 || !/^\s*\|[\s:|-]+\|\s*$/.test(text.slice(end + 1, after < 0 ? text.length : after)));
  Object.assign(last, { from, end: end < 0 ? text.length + 1 : end, cell });
  return cell;
}

export function extractNumbers(text: string, opts: { small?: boolean } = {}): Found[] {
  const masked = mask(text);
  const hasCitation = (s: Span) => CITATION.test(s.text);
  const spans = splitSentences(text);
  const out: Found[] = [];
  let si = 0;
  const line = { from: 0, end: -1, cell: false };
  for (const m of masked.matchAll(NUMBER)) {
    const start = m.index!;
    let end = start + m[0].length;
    const mantissa = m[1].replace(/,/g, "");
    const dec = mantissa.includes(".") ? mantissa.length - mantissa.indexOf(".") - 1 : 0;
    const expText = m[2] ?? m[3] ?? m[4] ?? (m[5] ? [...m[5]].map((c) => SUPERSCRIPT[c]).join("") : undefined);
    const exp = Number((expText ?? "0").replace("−", "-"));
    let value = Number(`${mantissa}e${exp}`);
    if (!Number.isFinite(value)) continue;
    const step = Number(`1e${exp - dec}`);
    const percent = Boolean(m[6]);
    const before = masked.slice(Math.max(0, start - 80), start);
    const sign = before.match(/(^|[\s(=<>≤≥*_`~[:|])([-−+])$/);
    let from = start;
    const signed = !!sign;
    if (sign) {
      from = start - 1;
      if (sign[2] !== "+") value = -value;
    }
    const plain = dec === 0 && expText === undefined && !percent;
    const attached = /^[A-Za-zµ°]/.test(masked.slice(end));
    const small = plain && Math.abs(value) <= 10 && !attached;
    if (small && !opts.small && !inTableCell(text, start, line)) continue;
    if (LABEL_BEFORE.test(before)) continue;
    if (THRESHOLD_BEFORE.test(before)) continue;
    if (percent && /^\s*(?:confidence|CI\b)/i.test(masked.slice(end))) continue;
    while (si < spans.length && spans[si]!.end <= start) si++;
    const sentence = spans[si] && start >= spans[si]!.start ? spans[si] : undefined;
    if (plain && value >= 1900 && value <= 2100 && ((sentence && hasCitation(sentence)) || (YEAR_BEFORE.test(before) && YEAR_AFTER.test(masked.slice(end, end + 40))))) continue;
    if (percent) end = start + m[0].length;
    const after = masked.slice(end);
    const unit = percent ? undefined : UNIT_AFTER.exec(after)?.[1];
    out.push({ start: from, end, value, step, percent, small, signed, unit: unit ? unitName(unit) : undefined, fold: !percent && FOLD_AFTER.test(after) });
  }
  return out;
}

export function splitSentences(text: string): Span[] {
  const out: Span[] = [];
  const re = /[^\n]+?(?:[.!?](?=\s|$)(?<!\bet al\.)(?<!\bvs\.)(?<!\bFig\.)|(?=\n)|$)/g;
  for (const m of text.matchAll(re)) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const t = raw.trim();
    if (!t) continue;
    out.push({ start: m.index! + lead, end: m.index! + lead + t.length, text: t });
  }
  return out;
}

function near(shown: number, step: number, logged: number): boolean {
  return Math.abs(shown - logged) <= Math.max(0.005 * Math.abs(logged), step / 2) * (1 + 1e-9);
}

interface Target {
  value: number;
  unit?: string;
  log?: boolean;
  ratio?: boolean;
  fraction?: boolean;
}

export function target(path: string, value: number): Target {
  const key = (path.split(".").pop() ?? "").replace(/(\[\d+\])+$/, "");
  return { value, unit: keyUnit(path), log: /log/i.test(key), ratio: /ratio|fold|(^|_)fc($|_)/i.test(key) && !/log/i.test(key), fraction: /(^|_)(frac|fraction|proportion)(_|$)/i.test(key) && Math.abs(value) <= 1 };
}

// A logged number matches in its own unit: mg against a key that ends in _g, a fraction against a key in _pct.
// A number with no sign near a word such as lower or decrease also matches the negative logged value.
// N-fold also matches log2(N) in a key with "log" in its name. Near a decrease word it matches -log2(N) there, and 1/N in a ratio or fold key.
function variants(f: Found, t: Target, down: boolean): { value: number; step: number }[] {
  const from = f.unit ? UNITS[f.unit] : undefined;
  const to = t.unit ? UNITS[t.unit] : undefined;
  const otherUnit = !!from && !!to && from[0] === to[0] && f.unit !== t.unit;
  const base = otherUnit || (f.percent && t.fraction) ? [] : [{ value: f.value, step: f.step }];
  if (f.percent) base.push({ value: f.value / 100, step: f.step / 100 });
  if (otherUnit) base.push({ value: (f.value * from![1]) / to![1], step: (f.step * from![1]) / to![1] });
  if (t.unit === "pct" && !f.percent && !f.unit && Math.abs(f.value) <= 1) base.push({ value: f.value * 100, step: f.step * 100 });
  if (f.fold && f.value > 0) {
    const log = { value: Math.log2(f.value), step: f.step / (f.value * Math.LN2) };
    if (t.log) base.push(log);
    if (t.log && down && !f.signed) base.push({ value: -log.value, step: log.step });
    if (t.ratio && down && !f.signed) base.push({ value: 1 / f.value, step: f.step / f.value ** 2 });
  }
  if (down && !f.signed) for (const v of [...base]) if (v.value > 0) base.push({ value: -v.value, step: v.step });
  return base;
}

function matchesAny(f: Found, targets: Target[], allowed?: Set<number>, down = false): number | undefined {
  let best: number | undefined;
  let bestDiff = Infinity;
  targets.forEach((t, i) => {
    if (allowed && !allowed.has(i)) return;
    for (const v of variants(f, t, down)) {
      if (!near(v.value, v.step, t.value)) continue;
      const diff = Math.abs(v.value - t.value) / (Math.abs(t.value) || 1);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
  });
  return best;
}

function leaves(x: unknown, out: number[]): void {
  if (typeof x === "number" && Number.isFinite(x)) out.push(x);
  else if (typeof x === "string") for (const f of extractNumbers(x)) out.push(f.value, ...(f.percent ? [f.value / 100] : []));
  else if (Array.isArray(x)) for (const y of x) leaves(y, out);
  else if (x && typeof x === "object") for (const y of Object.values(x)) leaves(y, out);
}

const FREE_TEXT_TOOLS = new Set(["run_script", "calculate", "note", "plan", "write_file", "run_command", "ask_scientist", "propose_change"]);

function versionParts(v: unknown, out: number[]): void {
  const parts = String(v ?? "").match(/\d+/g)?.map(Number) ?? [];
  if (parts.length > 1) out.push(Number(`${parts[0]}.${parts[1]}`));
  out.push(...parts);
}

function inputValues(record: AnalysisRecord): Target[] {
  const out: number[] = [];
  for (const e of record.entries(["user", "setup", "session", "tool_call", "decision", "plan_approved"])) {
    if (e.kind === "user") leaves(String(e.data.text ?? ""), out);
    else if (e.kind === "setup") leaves(e.data.values, out);
    else if (e.kind === "tool_call") {
      if (!FREE_TEXT_TOOLS.has(String(e.data.tool))) leaves(e.data.args, out);
    }
    else if (e.kind === "decision") {
      if (e.data.by !== "agent") leaves(e.data.new, out);
    }
    else if (e.kind === "plan_approved") {
      const plan = (e.data.plan ?? {}) as Partial<AnalysisPlan>;
      leaves([plan.steps?.map((s) => s.decisions?.map((d) => d.value)), plan.data?.n, plan.definitions, plan.exclusions], out);
    }
    else for (const a of (e.data.adapters ?? []) as { version?: string; programVersion?: string }[]) {
      versionParts(a.version, out);
      versionParts(a.programVersion, out);
    }
  }
  return out.map((value) => ({ value }));
}

const COUNT_AFTER =
  /^[ \t]*(?:rows?|columns?|samples?|subjects?|observations?|animals?|mice|rats?|patients?|participants?|replicates?|measurements?|records?|data points?|images?|files?|fields?|channels?)\b|^[ \t]*(?:per group|in each group|in total|total)\b/i;
const COUNT_BEFORE = /(?:\b[nN][ \t]*=|\b(?:sample size|group size|total of|all)[ \t]*(?:of|=|:|is)?)[ \t]*$/i;

function knownCounts(record: AnalysisRecord): Target[] {
  const out: number[] = [];
  for (const e of record.entries(["data_check", "inspection"])) {
    if (e.kind === "inspection") {
      leaves(String(e.data.summary ?? ""), out);
      continue;
    }
    leaves(String(e.data.size ?? ""), out);
    const sizes = ((e.data.groups as { sizes?: [string, number][] } | null)?.sizes ?? []).map(([, n]) => n);
    out.push(...sizes, sizes.reduce((a, b) => a + b, 0));
  }
  return out.filter((v) => Number.isInteger(v) && v > 0).map((value) => ({ value }));
}

function countContext(text: string, f: Found): boolean {
  if (f.percent || f.unit || f.step !== 1 || f.value < 0) return false;
  return COUNT_AFTER.test(text.slice(f.end, f.end + 40)) || COUNT_BEFORE.test(text.slice(Math.max(0, f.start - 40), f.start));
}

// A design constant is a conventional value next to its cue word: "80% power", "power of 0.8", "95% CI", "alpha = 0.05".
// The power is 80% only, because the system prompt asks for it. Another power, or "power 80" with no percent sign, is still a claim.
// A number next to a power cue matches only a logged key with "power" in its name, or a number in script output text.
const DESIGN: { values: number[]; before: RegExp; after: RegExp }[] = [
  { values: [0.8], before: /\bpower[ \t]*(?:of|=|:)?[ \t]*$/i, after: /^[ \t]*(?:statistical[ \t]+)?power\b/i },
  { values: [0.9, 0.95, 0.99], before: /\b(?:confidence[ \t]+level|level[ \t]+of[ \t]+confidence)[ \t]*(?:of|=|:)?[ \t]*$/i, after: /^[ \t]*(?:confidence|CIs?\b)/i },
  { values: [0.001, 0.01, 0.05, 0.1], before: /(?:\b(?:alpha|significance[ \t]+level|level[ \t]+of[ \t]+significance)|α)[ \t]*(?:of|=|:|at)?[ \t]*$/i, after: /^[ \t]*(?:significance[ \t]+level|level[ \t]+of[ \t]+significance)\b/i },
];

function cued(text: string, f: Found, d: (typeof DESIGN)[number]): boolean {
  return d.before.test(text.slice(Math.max(0, f.start - 40), f.start)) || d.after.test(text.slice(f.end, f.end + 40));
}

function designConstant(text: string, f: Found): boolean {
  const v = f.percent ? f.value / 100 : f.value;
  return DESIGN.some((d) => d.values.some((x) => Math.abs(x - v) < 1e-9) && cued(text, f, d));
}

export function checkAnswer(text: string, record: AnalysisRecord, opts: { log?: boolean } = {}): Claim[] {
  const nodes = record.nodes?.() ?? [];
  const comparison = new Set(nodes.filter((n) => n.sensitivityOf).map((n) => n.id));
  const stale = outOfDateNodes(record);
  const order = new Map(nodes.map((n, i) => [n.id, i]));
  const rank = (id: string) => Number(comparison.has(id)) * 2 + Number(stale.has(id));
  const logged = record.numbers().sort((a, b) => rank(a.node) - rank(b.node) || (order.get(b.node) ?? 0) - (order.get(a.node) ?? 0));
  const targets = logged.map((n) => target(n.path, n.value));
  const plain = new Set(logged.flatMap((n, i) => (comparison.has(n.node) || stale.has(n.node) ? [] : [i])));
  const power = new Set(logged.flatMap((n, i) => (/power|^stdout$|^file:/i.test(n.path) ? [i] : [])));
  const inputs = inputValues(record);
  const counts = knownCounts(record);
  const found = extractNumbers(text, { small: true });
  const claims: Claim[] = [];
  let fi = 0;
  for (const s of splitSentences(text)) {
    const cited = CITATION.test(s.text);
    const hedged = HEDGE.test(s.text);
    while (fi < found.length && found[fi]!.start < s.start) fi++;
    const own: Found[] = [];
    for (let k = fi; k < found.length && found[k]!.start < s.end; k++) own.push(found[k]!);
    const sentenceText = s.text.length > 300 ? s.text.slice(0, 297) + "..." : s.text;
    const hits = own.map((f) => ({ f, i: matchesAny(f, targets, cued(text, f, DESIGN[0]!) ? (f.small ? new Set([...power].filter((i) => plain.has(i))) : power) : f.small ? plain : undefined, DOWN.test(text.slice(Math.max(s.start, f.start - NEAR), Math.min(s.end, f.end + NEAR)))) }));
    const anyMatched = hits.some((h) => h.i !== undefined && !h.f.small);
    const before = claims.length;
    for (const { f, i } of hits) {
      if (f.small && i === undefined) continue;
      if (i !== undefined) {
        claims.push({ text: sentenceText, value: f.value, label: "measured", node: logged[i].node });
        continue;
      }
      if (matchesAny(f, inputs) !== undefined) continue;
      if (designConstant(text, f)) continue;
      if (countContext(text, f) && matchesAny(f, counts) !== undefined) continue;
      const label = cited ? "literature" : hedged && !anyMatched ? "inferred" : "unsourced";
      claims.push({ text: sentenceText, value: f.value, label });
    }
    if (claims.length === before && (cited || hedged)) {
      claims.push({ text: sentenceText, value: null, label: cited ? "literature" : "inferred" });
    }
  }
  if (opts.log === false) return claims;
  const last = record.entries(["assistant"]).at(-1);
  logClaimCheck(record, claims, last && last.data.text === text ? last.id : undefined);
  return claims;
}

export function logClaimCheck(record: AnalysisRecord, claims: Claim[], answerEntry: number | undefined): void {
  const unsourced = claims.filter((c) => c.label === "unsourced").length;
  const lastCheck = record.entries?.(["claim_check"]).at(-1)?.data;
  const same = lastCheck && lastCheck.answerEntry === answerEntry && lastCheck.unsourced === unsourced && JSON.stringify(lastCheck.claims) === JSON.stringify(claims);
  if (!same) record.append("claim_check", { answerEntry, claims, unsourced });
}

export function annotate(text: string, claims: Claim[]): string {
  const bad = claims.filter((c) => c.label === "unsourced" && c.value !== null);
  if (!bad.length) return text;
  const taken = new Set<number>();
  const marks: number[] = [];
  const found = extractNumbers(text);
  for (const c of bad) {
    const i = found.findIndex((f, k) => !taken.has(k) && f.value === c.value && c.text.includes(text.slice(f.start, f.end).trim()));
    if (i < 0) continue;
    taken.add(i);
    marks.push(found[i].end);
  }
  let out = text;
  for (const pos of marks.sort((a, b) => b - a)) out = out.slice(0, pos) + " [no source]" + out.slice(pos);
  if (!marks.length) return text;
  return `${out}\n\nNumbers marked [no source] do not match any logged tool result.`;
}
