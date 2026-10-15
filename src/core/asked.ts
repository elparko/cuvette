interface Item {
  w: string;
  num?: number;
  head?: boolean;
  tail?: boolean;
  br?: boolean;
  ce?: "," | "x";
  nl?: boolean;
  free?: boolean;
  clause: number;
}

interface Field {
  key: string;
  label: string;
  choices?: unknown[];
}

const NUMBER = /^[-+]?(?:\d+(?:[.,]\d+)?|\.\d+)$/;
const FILLER = new Set(["to", "is", "as", "the", "set", "=", "at"]);
const LEAD = new Set(["use", "set", "with", "using", "take", "run", "apply", "make", "give", "want", "need", "please", "try", "and", "or", "of", "about", "around", "to", "is", "as", "the", "a", "an", "at", "=", "for", "by", "from", "than"]);
const SKIP = new Set([...FILLER, "of", "about", "around", "roughly", "equal", "equals", "be", "value", "a", "an", "than"]);
const THOUSANDS = /(?<![\d.,])([1-9]\d{0,2})((?:[, \u00a0\u202f]\d{3})+)(?!\d)/g;
const ON = new Set(["on", "true", "yes", "enable", "enabled"]);
const OFF = new Set(["off", "false", "no", "disable", "disabled"]);
const NEGATION = new Set(["not", "never", "without", "except", "avoid", "unless", "neither", "nor", "cannot", "dont", "doesnt", "didnt", "cant", "wont", "isnt", "arent", "shouldnt", "wouldnt", "mustnt"]);
const CONNECT = new Set(["for", "as", "of", "on", "in"]);
const TAIL = new Set([")", '"', "'", "]", ",", ";", ":", "!", "?", "."]);
const CLAUSE_END = /[,;.!?][)"'\]]*$/;
const BOUNDARY = new Set(["and", "but", "so", "then", "because", "since", "while", "instead"]);
const AFTER_WORD = new Set(["to", "as", "of", "at", "is", "="]);
const FILLER_WORDS = new Set([...FILLER, "want", "need", "like", "i", "do", "we", "you", "please"]);
const RETRY_LEAD = new Set(["use", "to", "instead", "rather", "set", "="]);
const REASK = new Set(["use", "set", "take", "apply", "run", "try", "make"]);
const OWN = 1;
const OTHER = 2;
const AFTER = 4;
const AFTER_TEXT = 6;
const BEFORE_TEXT = 3;
const REACH = 5;
const REACH_FILLER = 7;

function trimEnd(s: string): string {
  let n = s.length;
  while (n > 0 && TAIL.has(s[n - 1]!)) n--;
  return s.slice(0, n);
}

function items(text: string): Item[] {
  const out: Item[] = [];
  const merged = text.replace(THOUSANDS, (_, a: string, b: string) => a + b.replace(/\D/g, ""));
  for (const line of merged.toLowerCase().replace(/n['\u2019]t\b/g, " not").split(/\r?\n/)) {
    let first = true;
    for (const raw of line.split(/\s+|(=)/).filter(Boolean)) {
      const size = out.length;
      const token = trimEnd(raw.replace(/^[("'[]+/, ""));
      if (NUMBER.test(token)) out.push({ w: token, num: Number(token.replace(",", ".")), head: true, tail: true, clause: 0 });
      else {
        const parts = raw.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
        parts.forEach((w, k) => out.push({ w, head: k === 0, tail: k === parts.length - 1, clause: 0 }));
      }
      if (raw === "=") out.push({ w: "=", head: true, tail: true, clause: 0 });
      if (out.length > size) {
        if (first) out[size]!.nl = true;
        if (BOUNDARY.has(trimEnd(raw))) out[size]!.br = true;
      }
      if (out.length > size && CLAUSE_END.test(raw)) out.at(-1)!.ce = /[;.!?][)"'\]]*$/.test(raw) ? "x" : ",";
      first = false;
    }
  }
  return out;
}

function find(words: Item[], name: string): [number, number][] {
  const parts = name.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!parts.length) return [];
  const hits: [number, number][] = [];
  for (let i = 0; i + parts.length <= words.length; i++) if (words[i]!.head && words[i + parts.length - 1]!.tail && parts.every((p, k) => words[i + k]!.w === p && words[i + k]!.num === undefined)) hits.push([i, i + parts.length - 1]);
  return hits;
}

interface Layout {
  own: [number, number][];
  inName: number[];
  named: boolean[];
  starts: number[];
  prevEnd: number[];
  prevMask: number[];
  nextBegin: number[];
  nextMask: number[];
}

function layout(words: Item[], field: Field, others: Field[]): Layout {
  const n = words.length;
  const spots: { b: number; e: number; mask: number }[] = [];
  for (const f of [field, ...others]) for (const s of [...find(words, f.key), ...find(words, f.label)]) spots.push({ b: s[0], e: s[1], mask: f === field ? OWN : OTHER });
  spots.sort((x, y) => x.b - y.b || y.e - x.e);
  const kept: typeof spots = [];
  let before = -1;
  let group = -1;
  let groupEnd = -1;
  let groupMax = -1;
  for (const s of spots) {
    if (s.b !== group) {
      before = Math.max(before, groupMax);
      group = s.b;
      groupEnd = s.e;
    }
    groupMax = Math.max(groupMax, s.e);
    if (before >= s.e || groupEnd > s.e) continue;
    kept.push(s);
  }
  const ends = new Array<number>(n).fill(0);
  const begins = new Array<number>(n).fill(0);
  const mark = new Array<number>(n + 1).fill(0);
  for (const s of kept) {
    ends[s.e]! |= s.mask;
    begins[s.b]! |= s.mask;
    mark[s.b]!++;
    mark[s.e + 1]!--;
  }
  const inName = new Array<number>(n + 1).fill(0);
  const named: boolean[] = [];
  let depth = 0;
  for (let i = 0; i < n; i++) {
    depth += mark[i]!;
    named.push(depth > 0);
    inName[i + 1] = inName[i]! + (depth > 0 ? 1 : 0);
  }
  const prevEnd: number[] = [];
  const prevMask: number[] = [];
  let lastEnd = -1;
  let lastMask = 0;
  for (let i = 0; i < n; i++) {
    prevEnd.push(lastEnd);
    prevMask.push(lastMask);
    if (ends[i]) {
      lastEnd = i;
      lastMask = ends[i]!;
    }
  }
  const nextBegin = new Array<number>(n).fill(-1);
  const nextMask = new Array<number>(n).fill(0);
  let nextAt = -1;
  let nextBits = 0;
  for (let i = n - 1; i >= 0; i--) {
    nextBegin[i] = nextAt;
    nextMask[i] = nextBits;
    if (begins[i]) {
      nextAt = i;
      nextBits = begins[i]!;
    }
  }
  return { own: kept.filter((s) => s.mask === OWN).map((s) => [s.b, s.e]), inName, named, starts: begins, prevEnd, prevMask, nextBegin, nextMask };
}

function joined(words: Item[], from: number, to: number, connect = true): boolean {
  for (let i = from; i <= to; i++) if (!FILLER.has(words[i]!.w) && !(connect && CONNECT.has(words[i]!.w))) return false;
  return true;
}

function negWord(words: Item[], k: number, no: boolean): boolean {
  const w = words[k]!.w;
  const before = words[k - 1]?.w;
  return NEGATION.has(w) || (no && w === "no") || (w === "of" && before === "instead") || (w === "than" && (before === "rather" || before === "other"));
}

function assignClauses(words: Item[], l: Layout): void {
  let clause = 0;
  let soft = false;
  let inter = false;
  for (let i = 0; i < words.length; i++) {
    const it = words[i]!;
    if (it.nl) {
      clause++;
      soft = false;
      inter = false;
    }
    if (it.br && !((it.w === "and") && l.starts[i + 1])) {
      clause++;
      soft = false;
      inter = false;
    }
    it.clause = clause;
    if (inter) it.free = true;
    if (it.ce === "x" || (it.ce === "," && !soft && !negWord(words, i, true))) {
      clause++;
      soft = false;
      inter = false;
    } else if (it.ce === ",") {
      if (!soft) inter = true;
      else inter = false;
      soft = true;
    }
  }
}

function negatedVerb(l: Layout, words: Item[], k: number, no: boolean): boolean {
  for (let j = k - 1; j >= 0 && j >= k - 4 && words[j]!.clause === words[k]!.clause; j--) {
    if (negWord(words, j, no) && !l.named[j]) return true;
    if (!FILLER_WORDS.has(words[j]!.w)) return false;
  }
  return false;
}

function negatedAt(l: Layout, words: Item[], i: number, no: boolean): boolean {
  let cost = 0;
  let chain = false;
  let fillerOnly = true;
  for (let k = i - 1; k >= 0 && words[k]!.clause === words[i]!.clause; k--) {
    const it = words[k]!;
    if (negWord(words, k, no) && !l.named[k]) return true;
    if (l.named[k] && (chain || l.named[k + 1])) continue;
    if ((it.w === "and" || it.w === "or") && l.starts[k + 1]) {
      chain = true;
      continue;
    }
    if (REASK.has(it.w) && negatedVerb(l, words, k, no)) return true;
    if (!FILLER_WORDS.has(it.w)) fillerOnly = false;
    if (!it.free && ++cost > (fillerOnly ? REACH_FILLER : REACH)) return false;
  }
  return false;
}

function reasked(words: Item[], i: number): boolean {
  let cs = i;
  while (cs > 0 && words[cs - 1]!.clause === words[i]!.clause) cs--;
  return REASK.has(words[cs]!.w) && i - cs <= 4 && words[i + 1]?.w !== "for";
}

function retryFits(words: Item[], l: Layout, from: number, i: number): boolean {
  for (let j = from; j < i; j++) if (words[j]!.ce === "x" || (j > from && l.starts[j]! & OTHER)) return false;
  if (!RETRY_LEAD.has(words[i - 1]?.w ?? "")) return false;
  const next = words[i + 1];
  if (!next) return true;
  if (words[i]!.ce !== undefined) return true;
  return next.clause === words[i]!.clause && l.starts[i + 1] === OWN;
}

function numberNamed(words: Item[], l: Layout, [b, e]: [number, number], value: number): boolean {
  const same = (i: number) => words[i]!.num === value && !negatedAt(l, words, i, true);
  let limit = e + AFTER;
  let skip = SKIP;
  let retry = false;
  let first = e;
  for (let i = e + 1; i <= Math.min(words.length - 1, limit); i++) {
    const it = words[i]!;
    if (l.starts[i]! & OTHER) return false;
    if (it.num !== undefined) {
      const here = it.clause === words[e]!.clause || AFTER_WORD.has(words[i - 1]!.w);
      if (retry ? !reasked(words, i) || !retryFits(words, l, first, i) : !here) return false;
      if (!negatedAt(l, words, i, true)) return same(i);
      first = i;
      limit = i + 10;
      skip = new Set([...SKIP, ...LEAD]);
      retry = true;
      continue;
    }
    if (!skip.has(it.w) && !l.named[i] && words[i + 1]?.num !== undefined) return false;
  }
  for (let i = Math.max(0, b - 2); i < b; i++) {
    const it = words[i]!;
    if (it.num === undefined || it.clause !== words[b]!.clause) continue;
    const lead = words[i - 1];
    if (lead !== undefined && !LEAD.has(lead.w)) continue;
    const prev = l.prevEnd[i]!;
    if (prev >= 0 && i - prev <= AFTER && !joined(words, i + 1, b - 1)) return false;
    return same(i);
  }
  return false;
}

function tied(l: Layout, words: Item[], from: number, to: number, after: number, before: number): boolean {
  if (negatedAt(l, words, from, true)) return false;
  const prev = l.prevEnd[from]!;
  if (prev >= 0 && joined(words, prev + 1, from - 1, false)) return l.prevMask[from] === OWN;
  const next = l.nextBegin[to]!;
  const nextOwn = next >= 0 && l.nextMask[to] === OWN;
  if (nextOwn && joined(words, to + 1, next - 1)) return true;
  if (prev >= 0 && from - prev <= after) return l.prevMask[from] === OWN;
  return nextOwn && next - to <= before;
}

function boolNamed(words: Item[], l: Layout, [b, e]: [number, number], on: boolean): boolean {
  const yes = on ? ON : OFF;
  let i = e + 1;
  if (i < words.length && FILLER.has(words[i]!.w)) i++;
  if (i < words.length && yes.has(words[i]!.w)) return !negatedAt(l, words, i, false);
  let j = b - 1;
  if (j >= 0 && FILLER.has(words[j]!.w)) j--;
  const word = j >= 0 ? words[j]!.w : "";
  if (word === "enable" || word === "disable") return (on ? word === "enable" : word === "disable") && !negatedAt(l, words, j, false);
  return yes.has(word) && j >= 1 && words[j - 1]!.w === "turn" && !negatedAt(l, words, j - 1, false);
}

export function namesValue(request: string, field: Field, value: unknown, others: Field[] = []): boolean {
  const words = items(request);
  const l = layout(words, field, others.filter((o) => o.key !== field.key));
  if (!l.own.length) return false;
  assignClauses(words, l);
  if (typeof value === "number") return l.own.some((sp) => numberNamed(words, l, sp, value));
  if (typeof value === "boolean") return l.own.some((s) => boolNamed(words, l, s, value));
  const choice = (field.choices ?? []).find((c) => String(c !== null && typeof c === "object" && "value" in c ? (c as { value: unknown }).value : c) === String(value));
  const names = [String(value), ...(choice !== null && typeof choice === "object" && "label" in choice ? [String((choice as { label: unknown }).label)] : [])];
  return names.some((n) => find(words, n).some(([b, e]) => l.inName[e + 1]! - l.inName[b]! === 0 && tied(l, words, b, e, AFTER_TEXT, BEFORE_TEXT)));
}
