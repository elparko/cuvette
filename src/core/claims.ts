import type { AnalysisRecord } from "./record.ts";
import type { Claim } from "./types.ts";

interface Found {
  start: number;
  end: number;
  value: number;
  step: number;
  percent: boolean;
  small: boolean;
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
  /[\w.-]*\.(?:pdb|cif|mmcif|fasta|fa|faa|fna|fcs|tif|tiff|png|jpe?g|gif|csv|tsv|xlsx?|mzml|mzxml|imzml|ibd|vcf|bcf|bed|bam|sam|cram|fastq|fq|fif|edf|fits?|phy|nex|nwk|tree|json|xml|ya?ml|txt|h5ad|h5|zarr|nii|gz|zip|cppipe|ijm|py|r|ipynb)\b/gi,
  /\b\d[A-Z][A-Z0-9]{2}\b/g,
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

function mask(text: string): string {
  let out = text;
  for (const re of MASKS) out = out.replace(re, (m) => " ".repeat(m.length));
  return out;
}

function inTableCell(text: string, at: number): boolean {
  const line = text.slice(text.lastIndexOf("\n", at - 1) + 1, (text.indexOf("\n", at) + 1 || text.length + 1) - 1);
  if (!/^\s*\|.*\|\s*$/.test(line)) return false;
  const lines = text.split("\n");
  const i = text.slice(0, at).split("\n").length - 1;
  return !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "");
}

export function extractNumbers(text: string, opts: { small?: boolean } = {}): Found[] {
  const masked = mask(text);
  const hasCitation = (s: Span) => CITATION.test(s.text);
  const spans = splitSentences(text);
  const out: Found[] = [];
  for (const m of masked.matchAll(NUMBER)) {
    const start = m.index!;
    let end = start + m[0].length;
    const mantissa = m[1].replace(/,/g, "");
    const dec = mantissa.includes(".") ? mantissa.length - mantissa.indexOf(".") - 1 : 0;
    const expText = m[2] ?? m[3] ?? m[4] ?? (m[5] ? [...m[5]].map((c) => SUPERSCRIPT[c]).join("") : undefined);
    const exp = Number((expText ?? "0").replace("−", "-"));
    let value = Number(`${mantissa}e${exp}`);
    const step = Number(`1e${exp - dec}`);
    const percent = Boolean(m[6]);
    const before = masked.slice(0, start);
    const sign = before.match(/(^|[\s(=<>≤≥*_`~[:|])([-−+])$/);
    let from = start;
    if (sign) {
      from = start - 1;
      if (sign[2] !== "+") value = -value;
    }
    const plain = dec === 0 && expText === undefined && !percent;
    const attached = /^[A-Za-zµ°]/.test(masked.slice(end));
    const small = plain && Math.abs(value) <= 10 && !attached;
    if (small && !opts.small && !inTableCell(text, start)) continue;
    if (LABEL_BEFORE.test(before)) continue;
    if (THRESHOLD_BEFORE.test(before)) continue;
    if (percent && /^\s*(?:confidence|CI\b)/i.test(masked.slice(end))) continue;
    const sentence = spans.find((s) => start >= s.start && start < s.end);
    if (plain && value >= 1900 && value <= 2100 && sentence && hasCitation(sentence)) continue;
    if (percent) end = start + m[0].length;
    out.push({ start: from, end, value, step, percent, small });
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
  return Math.abs(shown - logged) <= Math.max(0.005 * Math.abs(logged), step / 2) + 1e-12;
}

function variants(f: Found): { value: number; step: number }[] {
  const base = [{ value: f.value, step: f.step }];
  if (f.percent) base.push({ value: f.value / 100, step: f.step / 100 });
  return base;
}

function matchesAny(f: Found, values: number[], allowed?: Set<number>): number | undefined {
  let best: number | undefined;
  let bestDiff = Infinity;
  for (const v of variants(f)) {
    values.forEach((logged, i) => {
      if (allowed && !allowed.has(i)) return;
      if (!near(v.value, v.step, logged)) return;
      const diff = Math.abs(v.value - logged) / (Math.abs(logged) || 1);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    });
  }
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

function inputValues(record: AnalysisRecord): number[] {
  const out: number[] = [];
  for (const e of record.entries(["user", "setup", "session", "tool_call"])) {
    if (e.kind === "user") leaves(String(e.data.text ?? ""), out);
    else if (e.kind === "setup") leaves(e.data.values, out);
    else if (e.kind === "tool_call") {
      if (!FREE_TEXT_TOOLS.has(String(e.data.tool))) leaves(e.data.args, out);
    }
    else for (const a of (e.data.adapters ?? []) as { version?: string; programVersion?: string }[]) {
      versionParts(a.version, out);
      versionParts(a.programVersion, out);
    }
  }
  return out;
}

export function checkAnswer(text: string, record: AnalysisRecord): Claim[] {
  const nodes = record.nodes?.() ?? [];
  const comparison = new Set(nodes.filter((n) => n.sensitivityOf).map((n) => n.id));
  const stale = record.stale?.() ?? new Set<string>();
  const order = new Map(nodes.map((n, i) => [n.id, i]));
  const rank = (id: string) => Number(comparison.has(id)) * 2 + Number(stale.has(id));
  const logged = record.numbers().sort((a, b) => rank(a.node) - rank(b.node) || (order.get(b.node) ?? 0) - (order.get(a.node) ?? 0));
  const loggedValues = logged.map((n) => n.value);
  const plain = new Set(logged.flatMap((n, i) => (comparison.has(n.node) || stale.has(n.node) ? [] : [i])));
  const inputs = inputValues(record);
  const found = extractNumbers(text, { small: true });
  const claims: Claim[] = [];
  for (const s of splitSentences(text)) {
    const cited = CITATION.test(s.text);
    const hedged = HEDGE.test(s.text);
    const own = found.filter((f) => f.start >= s.start && f.start < s.end);
    const sentenceText = s.text.length > 300 ? s.text.slice(0, 297) + "..." : s.text;
    const hits = own.map((f) => ({ f, i: matchesAny(f, loggedValues, f.small ? plain : undefined) }));
    const anyMatched = hits.some((h) => h.i !== undefined && !h.f.small);
    const before = claims.length;
    for (const { f, i } of hits) {
      if (f.small && i === undefined) continue;
      if (i !== undefined) {
        claims.push({ text: sentenceText, value: f.value, label: "measured", node: logged[i].node });
        continue;
      }
      if (matchesAny(f, inputs) !== undefined) continue;
      const label = cited ? "literature" : hedged && !anyMatched ? "inferred" : "unsourced";
      claims.push({ text: sentenceText, value: f.value, label });
    }
    if (claims.length === before && (cited || hedged)) {
      claims.push({ text: sentenceText, value: null, label: cited ? "literature" : "inferred" });
    }
  }
  const last = record.entries(["assistant"]).at(-1);
  const answerEntry = last && last.data.text === text ? last.id : undefined;
  const unsourced = claims.filter((c) => c.label === "unsourced").length;
  record.append("claim_check", { answerEntry, claims, unsourced });
  return claims;
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
