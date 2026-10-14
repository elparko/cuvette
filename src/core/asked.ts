interface Item {
  w: string;
  num?: number;
  stop?: boolean;
}

interface Field {
  key: string;
  label: string;
  choices?: unknown[];
}

const NUMBER = /^[-+]?(?:\d+(?:[.,]\d+)?|\.\d+)$/;
const THOUSANDS = /^[-+]?\d+,\d{3}$/;
const FILLER = new Set(["to", "is", "as", "the", "set", "=", "at"]);
const ON = new Set(["on", "true", "yes", "enable", "enabled"]);
const OFF = new Set(["off", "false", "no", "disable", "disabled"]);
const NEGATION = new Set(["not", "never", "without", "avoid", "except", "unless", "neither", "nor", "cannot", "dont", "doesnt", "didnt", "cant", "wont", "isnt", "arent", "shouldnt", "wouldnt", "mustnt"]);
const CLAUSE_END = new Set(["but", "however", "though", "although", "while"]);
const CONNECT = new Set(["for", "as", "of", "on", "in"]);
const OWN = 1;
const OTHER = 2;
const AFTER = 4;
const BEFORE = 2;
const AFTER_TEXT = 6;
const BEFORE_TEXT = 3;

function items(text: string): Item[] {
  const out: Item[] = [];
  for (const raw of text.toLowerCase().replace(/n['’]t\b/g, " not").split(/\s+|(=)/).filter(Boolean)) {
    const size = out.length;
    const token = raw.replace(/^[("'[]+/, "").replace(/[)"'\],;:!?]+$/, "").replace(/\.$/, "");
    if (NUMBER.test(token) && !THOUSANDS.test(token)) out.push({ w: token, num: Number(token.replace(",", ".")) });
    else for (const w of raw.split(/[^\p{L}\p{N}]+/u).filter(Boolean)) out.push({ w });
    if (raw === "=") out.push({ w: "=" });
    if (out.length > size && /[.,;!?][)"'\]]*$/.test(raw)) out.at(-1)!.stop = true;
    if (out.length > size && CLAUSE_END.has(out[size]!.w) && size > 0) out[size - 1]!.stop = true;
  }
  return out;
}

function find(words: Item[], name: string): [number, number][] {
  const parts = name.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!parts.length) return [];
  const hits: [number, number][] = [];
  for (let i = 0; i + parts.length <= words.length; i++) if (parts.every((p, k) => words[i + k]!.w === p && words[i + k]!.num === undefined)) hits.push([i, i + parts.length - 1]);
  return hits;
}

interface Layout {
  own: [number, number][];
  inName: number[];
  negated: boolean[];
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
  const negated: boolean[] = [];
  let neg = false;
  for (let i = 0; i < n; i++) {
    negated.push(neg);
    if (NEGATION.has(words[i]!.w) && !named[i]) neg = true;
    if (words[i]!.stop) neg = false;
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
  return { own: kept.filter((s) => s.mask === OWN).map((s) => [s.b, s.e]), inName, negated, prevEnd, prevMask, nextBegin, nextMask };
}

function joined(words: Item[], from: number, to: number, connect = true): boolean {
  for (let i = from; i <= to; i++) if (!FILLER.has(words[i]!.w) && !(connect && CONNECT.has(words[i]!.w))) return false;
  return true;
}

function tied(l: Layout, words: Item[], from: number, to: number, after: number, before: number): boolean {
  if (l.negated[from]) return false;
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
  if (i < words.length && yes.has(words[i]!.w)) return !l.negated[i];
  let j = b - 1;
  if (j >= 0 && FILLER.has(words[j]!.w)) j--;
  const word = j >= 0 ? words[j]!.w : "";
  if (word === "enable" || word === "disable") return (on ? word === "enable" : word === "disable") && !l.negated[j];
  return yes.has(word) && j >= 1 && words[j - 1]!.w === "turn" && !l.negated[j - 1];
}

export function namesValue(request: string, field: Field, value: unknown, others: Field[] = []): boolean {
  const words = items(request);
  const l = layout(words, field, others.filter((o) => o.key !== field.key));
  if (!l.own.length) return false;
  if (typeof value === "number") return words.some((it, i) => it.num === value && tied(l, words, i, i, AFTER, BEFORE));
  if (typeof value === "boolean") return l.own.some((s) => boolNamed(words, l, s, value));
  const choice = (field.choices ?? []).find((c) => String(c !== null && typeof c === "object" && "value" in c ? (c as { value: unknown }).value : c) === String(value));
  const names = [String(value), ...(choice !== null && typeof choice === "object" && "label" in choice ? [String((choice as { label: unknown }).label)] : [])];
  return names.some((n) => find(words, n).some(([b, e]) => l.inName[e + 1]! - l.inName[b]! === 0 && tied(l, words, b, e, AFTER_TEXT, BEFORE_TEXT)));
}
