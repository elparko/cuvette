import { columnInfo, idColumn, isMissing, median, toNumber, unitOf, type Table } from "./datacheck.ts";

export const METHOD_DATA_CHECK = "method_data";
export const METHOD_DATA_TITLE = "the data differs from the method";

export interface ColumnSummary {
  name: string;
  type: "number" | "text";
  unit?: string;
  median?: number;
  min?: number;
  max?: number;
  missing: number;
  groups?: [string, number][];
}

export interface DataSummary {
  source: string;
  rows: number;
  columns: ColumnSummary[];
}

export interface DataDifference {
  id: string;
  kind: "unit" | "missing_column" | "new_column" | "renamed" | "order" | "type" | "range" | "missing_values" | "new_group" | "missing_group" | "group_sizes";
  column?: string;
  text: string;
}

const UNIT_FACTORS: { factor: number; big: string; small: string }[] = [
  { factor: 10, big: "centimeters", small: "millimeters" },
  { factor: 60, big: "minutes", small: "seconds" },
  { factor: 100, big: "a fraction", small: "percent" },
  { factor: 1000, big: "kilograms", small: "grams" },
  { factor: 3600, big: "hours", small: "seconds" },
  { factor: 1e6, big: "grams", small: "micrograms" },
];
const FACTOR_WINDOW = 1.25;
const RANGE_SPANS = 2;
const MISSING_SHARE = 0.2;
const GROUP_SIZE_FACTOR = 3;
const RENAME_FACTOR = 2;
const MAX_GROUPS = 12;

const same = (s: string) => s.trim().toLowerCase().replace(/[_\s]+/g, " ");
const quote = (s: string) => `'${s}'`;
const num = (n: number) => n.toLocaleString("en-US", { maximumSignificantDigits: 4 });
const percent = (n: number) => `${Math.round(n * 100)}%`;
const list = (xs: string[]) => (xs.length > 4 ? `${xs.slice(0, 4).join(", ")} and ${xs.length - 4} more` : xs.join(", "));

export function summarizeTable(t: Table, source: string): DataSummary {
  const info = columnInfo(t);
  const id = idColumn(t);
  const columns = info.map((c, i): ColumnSummary => {
    const raw = t.rows.map((r) => r[i] ?? "");
    const base = { name: c.name, missing: c.kinds.missing.length, ...(unitOf(c.name) ? { unit: unitOf(c.name) } : {}) };
    if (c.numeric) {
      const values = raw.filter((v) => !isMissing(v)).flatMap((v) => toNumber(v) ?? []);
      if (!values.length) return { ...base, type: "number" };
      return { ...base, type: "number", median: median(values), min: Math.min(...values), max: Math.max(...values) };
    }
    const counts = new Map<string, [string, number]>();
    for (const v of raw.filter((x) => !isMissing(x))) {
      const k = v.trim().toLowerCase();
      counts.set(k, [counts.get(k)?.[0] ?? v.trim(), (counts.get(k)?.[1] ?? 0) + 1]);
    }
    const groups = [...counts.values()].sort((a, b) => a[0].localeCompare(b[0]));
    return { ...base, type: "text", ...(i !== id && groups.length >= 2 && groups.length <= MAX_GROUPS && groups.length <= t.rows.length * 0.5 ? { groups } : {}) };
  });
  return { source, rows: t.rows.length, columns };
}

function unitChange(a: ColumnSummary, b: ColumnSummary): string | undefined {
  if (a.median === undefined || b.median === undefined || !a.median || !b.median || a.median * b.median < 0) return undefined;
  const ratio = Math.abs(b.median / a.median);
  const hit = UNIT_FACTORS.find((f) => ratio / f.factor < FACTOR_WINDOW && ratio / f.factor > 1 / FACTOR_WINDOW) ?? UNIT_FACTORS.find((f) => ratio * f.factor < FACTOR_WINDOW && ratio * f.factor > 1 / FACTOR_WINDOW);
  if (!hit) return undefined;
  const larger = ratio > 1;
  return `Column ${quote(b.name)} has a median of ${num(b.median)}. Before, the median was ${num(a.median)}. The values are about ${hit.factor} times ${larger ? "larger" : "smaller"}. The unit may be ${larger ? `${hit.small}, not ${hit.big}` : `${hit.big}, not ${hit.small}`}.`;
}

function renamed(a: ColumnSummary, b: ColumnSummary): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "number") {
    if (a.median === undefined || b.median === undefined) return false;
    if (a.median === 0 || b.median === 0) return a.median === b.median;
    const r = b.median / a.median;
    return r > 1 / RENAME_FACTOR && r < RENAME_FACTOR;
  }
  const names = new Set((a.groups ?? []).map(([g]) => same(g)));
  return (b.groups ?? []).some(([g]) => names.has(same(g)));
}

export function compareChecks(before: DataSummary, after: DataSummary): DataDifference[] {
  const out: DataDifference[] = [];
  const old = new Map(before.columns.map((c, i) => [same(c.name), { c, i }]));
  const now = new Map(after.columns.map((c, i) => [same(c.name), { c, i }]));
  const lost = [...old].filter(([k]) => !now.has(k));
  const gained = [...now].filter(([k]) => !old.has(k));

  const pairs: { a: ColumnSummary; b: ColumnSummary }[] = [...old].flatMap(([k, { c }]) => (now.has(k) ? [{ a: c, b: now.get(k)!.c }] : []));
  const lostLeft = new Set(lost.map(([k]) => k));
  const gainedLeft = new Set(gained.map(([k]) => k));
  for (const [k, { c, i }] of lost) {
    const hit = gained.find(([g, x]) => gainedLeft.has(g) && x.i === i && renamed(c, x.c));
    if (!hit) continue;
    lostLeft.delete(k);
    gainedLeft.delete(hit[0]);
    out.push({ id: `renamed:${c.name}`, kind: "renamed", column: hit[1].c.name, text: `Column ${quote(hit[1].c.name)} is at the position of column ${quote(c.name)} before, and the values are similar. The column may have a new name. The method looks for ${quote(c.name)}.` });
  }
  for (const [k, { c }] of lost.filter(([k]) => lostLeft.has(k))) out.push({ id: `missing_column:${k}`, kind: "missing_column", column: c.name, text: `Column ${quote(c.name)} was in the data before. It is not in the new data.` });
  for (const [k, { c }] of gained.filter(([k]) => gainedLeft.has(k))) out.push({ id: `new_column:${k}`, kind: "new_column", column: c.name, text: `Column ${quote(c.name)} is new. It was not in the data before.` });

  const order = (m: Map<string, unknown>, other: Map<string, unknown>) => [...m.keys()].filter((k) => other.has(k)).join("\u0001");
  if (pairs.length > 1 && order(old, now) !== order(now, old)) out.push({ id: "order", kind: "order", text: `The columns are in a different order. Before: ${list(before.columns.map((c) => c.name))}. Now: ${list(after.columns.map((c) => c.name))}. A step that uses the position of a column can read the wrong column.` });

  for (const { a, b } of pairs) {
    const col = b.name;
    const key = same(col);
    if (a.type !== b.type) {
      out.push({ id: `type:${key}`, kind: "type", column: col, text: `Column ${quote(col)} has ${b.type === "number" ? "numbers" : "text"} now. Before, it had ${a.type === "number" ? "numbers" : "text"}.` });
      continue;
    }
    if (a.type === "number") {
      const unit = unitChange(a, b);
      if (unit) out.push({ id: `unit:${key}`, kind: "unit", column: col, text: unit });
      else if (a.min !== undefined && a.max !== undefined && b.min !== undefined && b.max !== undefined) {
        const span = a.max - a.min;
        if (span > 0 && (b.max > a.max + RANGE_SPANS * span || b.min < a.min - RANGE_SPANS * span)) out.push({ id: `range:${key}`, kind: "range", column: col, text: `Column ${quote(col)} has values from ${num(b.min)} to ${num(b.max)}. Before, the values were from ${num(a.min)} to ${num(a.max)}. The new range is far outside the old range.` });
      }
    }
    const was = before.rows ? a.missing / before.rows : 0;
    const is = after.rows ? b.missing / after.rows : 0;
    if (Math.abs(is - was) >= MISSING_SHARE) out.push({ id: `missing_values:${key}`, kind: "missing_values", column: col, text: `Column ${quote(col)} has ${percent(is)} missing values. Before, it had ${percent(was)}.` });
    if (a.groups && b.groups) {
      const x = new Map(a.groups.map(([g, n]) => [same(g), n]));
      const y = new Map(b.groups.map(([g, n]) => [same(g), n]));
      const added = b.groups.map(([g]) => g).filter((g) => !x.has(same(g)));
      const gone = a.groups.map(([g]) => g).filter((g) => !y.has(same(g)));
      if (added.length) out.push({ id: `new_group:${key}`, kind: "new_group", column: col, text: `Column ${quote(col)} has ${added.length === 1 ? "a new group" : "new groups"}: ${list(added.map(quote))}. The method has not seen ${added.length === 1 ? "it" : "them"} before.` });
      if (gone.length) out.push({ id: `missing_group:${key}`, kind: "missing_group", column: col, text: `Column ${quote(col)} has no ${gone.length === 1 ? "group" : "groups"} ${list(gone.map(quote))} now. ${gone.length === 1 ? "It was" : "They were"} in the data before.` });
      const total = (m: Map<string, number>) => [...m.values()].reduce((s, n) => s + n, 0) || 1;
      const skewed = [...x].filter(([g, n]) => {
        const m = y.get(g);
        if (m === undefined) return false;
        const r = m / total(y) / (n / total(x));
        return r >= GROUP_SIZE_FACTOR || r <= 1 / GROUP_SIZE_FACTOR;
      });
      if (skewed.length) out.push({ id: `group_sizes:${key}`, kind: "group_sizes", column: col, text: `The group sizes in column ${quote(col)} are very different. ${skewed.map(([g, n]) => `${g}: ${n} before, ${y.get(g)} now`).join("; ")}.` });
    }
  }
  const rank = (d: DataDifference) => ["unit", "type", "missing_column", "renamed", "order"].indexOf(d.kind);
  return out.sort((p, q) => (rank(p) < 0 ? 99 : rank(p)) - (rank(q) < 0 ? 99 : rank(q)));
}

export function matchSummary(saved: DataSummary[], now: DataSummary): DataSummary | undefined {
  const base = (s: string) => s.split("/").pop()!.toLowerCase();
  const byName = saved.find((s) => base(s.source) === base(now.source));
  if (byName) return byName;
  const names = new Set(now.columns.map((c) => same(c.name)));
  const overlap = (s: DataSummary) => s.columns.filter((c) => names.has(same(c.name))).length / Math.max(1, Math.max(s.columns.length, now.columns.length));
  return [...saved].sort((a, b) => overlap(b) - overlap(a)).find((s) => overlap(s) >= 0.5);
}
