interface Item {
  w: string;
  num?: number;
  not?: boolean;
  clause: number;
}

const NUMBER = /^[-+]?(?:\d+(?:[.,]\d+)?|\.\d+)$/;
const FILLER = new Set(["to", "is", "as", "the", "set", "=", "at"]);
const LEAD = new Set(["use", "set", "with", "using", "take", "run", "apply", "make", "give", "want", "need", "please", "try", "and", "or", "of", "about", "around", "to", "is", "as", "the", "a", "an", "at", "=", "for", "by", "from", "than"]);
const SKIP = new Set([...FILLER, "of", "about", "around", "roughly", "equal", "equals", "be", "value", "a", "an", "than"]);
const THOUSANDS = /(?<![\d.,])([1-9]\d{0,2})((?:[, \u00a0\u202f]\d{3})+)(?!\d)/g;
const ON = new Set(["on", "true", "yes", "enable", "enabled"]);
const OFF = new Set(["off", "false", "no", "disable", "disabled"]);

const TAIL = new Set([")", '"', "'", "]", ",", ";", ":", "!", "?", "."]);
const CLAUSE_END = /[,;.!?:][)"'\]]*$/;

function trimEnd(s: string): string {
  let n = s.length;
  while (n > 0 && TAIL.has(s[n - 1]!)) n--;
  return s.slice(0, n);
}

function negates(out: Item[], k: number): boolean {
  const w = out[k]!.w;
  const before = out[k - 1]?.w;
  return w === "not" || w === "no" || w === "never" || w === "without" || w === "except" || (w === "of" && before === "instead") || (w === "than" && (before === "rather" || before === "other")) || (w === "t" && !!before?.endsWith("n"));
}

function items(text: string): Item[] {
  const out: Item[] = [];
  const merged = text.replace(THOUSANDS, (_, a: string, b: string) => a + b.replace(/\D/g, ""));
  let clause = 0;
  for (const line of merged.toLowerCase().split(/\r?\n/)) {
    clause++;
    for (const raw of line.split(/\s+|(=)/).filter(Boolean)) {
      if (raw === "and" || raw === "but") clause++;
      const token = trimEnd(raw.replace(/^[("'[]+/, ""));
      if (NUMBER.test(token)) out.push({ w: token, num: Number(token.replace(",", ".")), clause });
      else for (const w of raw.split(/[^\p{L}\p{N}]+/u).filter(Boolean)) out.push({ w, clause });
      if (raw === "=") out.push({ w: "=", clause });
      if (CLAUSE_END.test(raw)) clause++;
    }
  }
  for (let i = 0; i < out.length; i++) {
    if (out[i]!.num === undefined) continue;
    for (let k = i - 1; k >= 0 && out[k]!.clause === out[i]!.clause; k--) if (negates(out, k)) out[i]!.not = true;
  }
  return out;
}

function numberNamed(words: Item[], [b, e]: [number, number], value: number): boolean {
  const same = (it: Item) => it.num === value && !it.not;
  let limit = e + 4;
  let skip = SKIP;
  for (let i = e + 1; i <= Math.min(words.length - 1, limit); i++) {
    const it = words[i]!;
    if (it.num !== undefined) {
      if (!it.not) return same(it);
      limit = i + 10;
      skip = new Set([...SKIP, ...LEAD]);
      continue;
    }
    if (!skip.has(it.w) && words[i + 1]?.num !== undefined) return false;
  }
  for (let i = Math.max(0, b - 2); i < b; i++) {
    const it = words[i]!;
    if (it.num === undefined) continue;
    const lead = words[i - 1];
    if (lead === undefined || LEAD.has(lead.w)) return same(it);
  }
  return false;
}

function find(words: Item[], name: string): [number, number][] {
  const parts = name.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!parts.length) return [];
  const hits: [number, number][] = [];
  for (let i = 0; i + parts.length <= words.length; i++) if (parts.every((p, k) => words[i + k]!.w === p && words[i + k]!.num === undefined)) hits.push([i, i + parts.length - 1]);
  return hits;
}

function boolNamed(words: Item[], [b, e]: [number, number], on: boolean): boolean {
  const yes = on ? ON : OFF;
  let i = e + 1;
  if (i < words.length && FILLER.has(words[i]!.w)) i++;
  if (i < words.length && yes.has(words[i]!.w)) return true;
  let j = b - 1;
  if (j >= 0 && FILLER.has(words[j]!.w)) j--;
  const word = j >= 0 ? words[j]!.w : "";
  return (word === "enable" || word === "disable") ? (on ? word === "enable" : word === "disable") : (yes.has(word) && j >= 1 && words[j - 1]!.w === "turn");
}

export function namesValue(request: string, field: { key: string; label: string; choices?: unknown[] }, value: unknown): boolean {
  const words = items(request);
  const spots = [...find(words, field.key), ...find(words, field.label)];
  if (!spots.length) return false;
  if (typeof value === "number") return spots.some((s) => numberNamed(words, s, value));
  if (typeof value === "boolean") return spots.some((s) => boolNamed(words, s, value));
  const choice = (field.choices ?? []).find((c) => String(c !== null && typeof c === "object" && "value" in c ? (c as { value: unknown }).value : c) === String(value));
  const names = [String(value), ...(choice !== null && typeof choice === "object" && "label" in choice ? [String((choice as { label: unknown }).label)] : [])];
  return names.some((n) => find(words, n).length > 0);
}
