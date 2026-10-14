interface Item {
  w: string;
  num?: number;
}

const NUMBER = /^[-+]?(?:\d+(?:[.,]\d+)?|\.\d+)$/;
const FILLER = new Set(["to", "is", "as", "the", "set", "=", "at"]);
const ON = new Set(["on", "true", "yes", "enable", "enabled"]);
const OFF = new Set(["off", "false", "no", "disable", "disabled"]);

function items(text: string): Item[] {
  const out: Item[] = [];
  for (const raw of text.toLowerCase().split(/\s+|(=)/).filter(Boolean)) {
    const token = raw.replace(/^[("'[]+/, "").replace(/[)"'\],;:!?]+$/, "").replace(/\.$/, "");
    if (NUMBER.test(token)) out.push({ w: token, num: Number(token.replace(",", ".")) });
    else for (const w of raw.split(/[^\p{L}\p{N}]+/u).filter(Boolean)) out.push({ w });
    if (raw === "=") out.push({ w: "=" });
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

function near(words: Item[], [b, e]: [number, number], ok: (it: Item) => boolean, after: number, before: number): boolean {
  for (let i = e + 1; i <= Math.min(words.length - 1, e + after); i++) if (ok(words[i]!)) return true;
  for (let i = Math.max(0, b - before); i < b; i++) if (ok(words[i]!)) return true;
  return false;
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
  if (typeof value === "number") return spots.some((s) => near(words, s, (it) => it.num === value, 4, 2));
  if (typeof value === "boolean") return spots.some((s) => boolNamed(words, s, value));
  const choice = (field.choices ?? []).find((c) => String(c !== null && typeof c === "object" && "value" in c ? (c as { value: unknown }).value : c) === String(value));
  const names = [String(value), ...(choice !== null && typeof choice === "object" && "label" in choice ? [String((choice as { label: unknown }).label)] : [])];
  return names.some((n) => find(words, n).length > 0);
}
