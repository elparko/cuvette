import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { open } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";
import { decodeText, delimiterOf, parseCsv } from "./results.ts";

export interface CheckOption {
  value: string;
  label: string;
}

export interface CheckItem {
  id: string;
  check: string;
  level: "ask" | "note";
  text: string;
  column?: string;
  rows?: number[];
  files?: string[];
  question?: string;
  options?: CheckOption[];
  recommendation?: string;
}

export interface DataCheck {
  source: string;
  kind: "table" | "files";
  size: string;
  items: CheckItem[];
  groups?: { column: string; sizes: [string, number][] };
  units?: [string, string][];
}

export interface Table {
  columns: string[];
  rows: string[][];
  encoding?: string;
  ragged?: number[];
}

const MISSING = new Set(["", "na", "n/a", "nan", "null", "none", "-", "—", "#n/a", "?", "."]);
const NUM = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;
const COMMA = /^[-+]?\d+,\d+$/;
const ID_NAME = /^(sample|sample ?id|id|subject|subject ?id|patient|patient ?id|animal|animal ?id|mouse|mouse ?id|donor|donor ?id|specimen|well|image|file|field|name)$/;
const GROUP_NAME = /(group|treatment|condition|genotype|arm|cohort|drug|strain|sex|class|status)/i;
const UNIT_IN_NAME = /\(([^()]+)\)\s*$|\[([^\[\]]+)\]\s*$|[ _](mm|cm|um|µm|nm|mg|g|kg|ug|µg|ng|ml|ul|µl|mM|uM|µM|nM|s|sec|min|h|hr|px|pixels|percent|pct|%)$/i;

export const isMissing = (v: string) => MISSING.has(v.trim().toLowerCase());
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const quote = (s: string) => `'${s}'`;
const listOf = (xs: string[], max = 4) => (xs.length > max ? `${xs.slice(0, max).join(", ")} and ${xs.length - max} more` : xs.join(", "));
const normName = (s: string) => s.trim().toLowerCase().replace(/[_\s]+/g, " ");

export function readCsvTable(path: string): Table {
  const { text, encoding } = decodeText(readFileSync(path));
  const delim = delimiterOf(text, path);
  const grid = parseCsv(text.endsWith("\n") ? text : `${text}\n`, delim).filter((r) => r.some((c) => c.trim() !== ""));
  const [head = [], ...rows] = grid;
  const ragged = rows.flatMap((r, i) => (r.slice(head.length).some((c) => c.trim() !== "") ? [i] : []));
  return { columns: head.map((h) => h.trim()), rows: rows.map((r) => head.map((_, i) => r[i] ?? "")), ...(encoding === "utf-8" ? {} : { encoding }), ...(ragged.length ? { ragged } : {}) };
}

type Kind = "num" | "comma" | "astext" | "text" | "missing";

function kindOf(raw: string): Kind {
  const v = raw.trim();
  if (isMissing(v)) return "missing";
  if (NUM.test(v)) return raw !== v ? "astext" : "num";
  if (/^'[-+]?\d/.test(v) && NUM.test(v.slice(1))) return "astext";
  if (COMMA.test(v)) return "comma";
  return "text";
}

export function toNumber(raw: string): number | undefined {
  const v = raw.trim().replace(/^'/, "");
  if (NUM.test(v)) return Number(v);
  if (COMMA.test(v)) return Number(v.replace(",", "."));
  return undefined;
}

interface ColInfo {
  name: string;
  kinds: Record<Kind, number[]>;
  numeric: boolean;
}

const infoCache = new WeakMap<Table, ColInfo[]>();

export function columnInfo(t: Table): ColInfo[] {
  const hit = infoCache.get(t);
  if (hit) return hit;
  const info = t.columns.map((name, c) => {
    const kinds: Record<Kind, number[]> = { num: [], comma: [], astext: [], text: [], missing: [] };
    t.rows.forEach((r, i) => kinds[kindOf(r[c] ?? "")].push(i));
    const numberLike = kinds.num.length + kinds.comma.length + kinds.astext.length;
    const filled = t.rows.length - kinds.missing.length;
    return { name, kinds, numeric: numberLike >= 2 && numberLike / Math.max(1, filled) >= 0.6 };
  });
  infoCache.set(t, info);
  return info;
}

export function idColumn(t: Table): number {
  return t.columns.findIndex((c) => ID_NAME.test(normName(c)));
}

export function groupColumn(t: Table, cols: ColInfo[], skip: number): number {
  const fits = (c: number, share: number) => {
    if (c === skip || cols[c]!.numeric) return false;
    const vals = new Set(t.rows.map((r) => (r[c] ?? "").trim().toLowerCase()).filter((v) => !isMissing(v)));
    return vals.size >= 2 && vals.size <= 12 && vals.size <= t.rows.length * share;
  };
  const named = t.columns.findIndex((c, i) => GROUP_NAME.test(c) && fits(i, 0.75));
  return named >= 0 ? named : t.columns.findIndex((_, i) => fits(i, 0.5));
}

const STAT_WORD = /^(mean|median|sd|sem|se|std|stdev|min|max|minimum|maximum|avg|average|total|sum|count|n|cv|iqr|range|raw|norm|normalized|corrected|ratio|log|log2|log10)$/i;
const UNIT_FAMILIES: [string, string[]][] = [
  ["length", ["nm", "um", "mm", "cm", "m", "km"]],
  ["mass", ["pg", "ng", "ug", "mg", "g", "kg"]],
  ["volume", ["nl", "ul", "ml", "dl", "l"]],
  ["time", ["ms", "s", "sec", "min", "h", "hr", "hrs", "hour", "hours", "d", "day", "days", "wk", "week", "weeks"]],
  ["percent", ["%", "percent", "pct"]],
];

const MOLAR = /^[pnum]?M$/;

function unitKey(u: string): string {
  const k = u.trim().replace(/[µμ]/g, "u");
  return MOLAR.test(k) ? k : k.toLowerCase();
}

export function unitFamily(u: string): string | undefined {
  const k = unitKey(u);
  if (MOLAR.test(k)) return "concentration";
  return UNIT_FAMILIES.find(([, us]) => us.includes(k))?.[0];
}

export function unitOf(column: string): string | undefined {
  const m = UNIT_IN_NAME.exec(column.trim());
  return m ? (m[1] ?? m[2] ?? m[3])!.trim() : undefined;
}

const fileRow = (i: number) => i + 2;

export function median(xs: number[]): number {
  const s = Float64Array.from(xs).sort();
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function extremes(values: number[]): number[] {
  if (values.length < 5) return [];
  const med = median(values);
  const mad = median(values.map((v) => Math.abs(v - med)));
  if (mad === 0) return [];
  return values.flatMap((v, i) => (Math.abs((0.6745 * (v - med)) / mad) > 3.5 ? [i] : []));
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toPrecision(4))));

export function checkTable(t: Table, source: string): DataCheck {
  const items: CheckItem[] = [];
  const cols = columnInfo(t);
  const n = t.rows.length;
  const id = idColumn(t);
  const group = groupColumn(t, cols, id);
  const key = (r: string[]) => r.map((x) => x.trim()).join("\u0001");
  const nameCount = new Map<string, number>();
  for (const c of t.columns) nameCount.set(c, (nameCount.get(c) ?? 0) + 1);
  for (const c of cols) if ((nameCount.get(c.name) ?? 0) > 1) c.name = `${c.name || "(no name)"} (column ${cols.indexOf(c) + 1})`;
  const at = (c: ColInfo) => cols.indexOf(c);

  if (t.ragged?.length) {
    const rows = t.ragged.map(fileRow);
    const lead = `${plural(rows.length, "row")} ${rows.length === 1 ? "has" : "have"} more cells than the header (${rows.length === 1 ? "row" : "rows"} ${listOf(rows.map(String), 6)})`;
    items.push({ id: "ragged_rows", check: "ragged_rows", level: "ask", rows, text: `${lead}. The harness does not read the extra cells. A decimal comma in a comma-separated file can cause this.`, question: `${lead}. A decimal comma in a comma-separated file can cause this. Continue without the extra cells, or stop?`, options: [{ value: "continue", label: "Continue without the extra cells" }, { value: "stop", label: "Stop. I correct the file" }], recommendation: "stop" });
  }
  const dupNames = [...nameCount].filter(([, k]) => k > 1).map(([c]) => c);
  if (dupNames.length) items.push({ id: "duplicate_columns", check: "duplicate_columns", level: "note", text: `${dupNames.length === 1 ? "The column name" : "The column names"} ${dupNames.map((c) => quote(c || "(no name)")).join(", ")} ${dupNames.length === 1 ? "is" : "are"} on more than one column. A step that finds a column by its name can read the wrong column.` });
  if (t.encoding) items.push({ id: "encoding", check: "encoding", level: "note", text: `The file uses the ${t.encoding.toUpperCase()} text encoding, not UTF-8. The harness reads it as ${t.encoding.toUpperCase()}. Other programs can show letters such as µ incorrectly.` });

  const commas = cols.filter((c) => c.numeric && c.kinds.comma.length);
  const ambiguous = commas.filter((c) => c.kinds.comma.every((i) => /,\d{3}$/.test(t.rows[i]![at(c)]!.trim())));
  for (const c of ambiguous) {
    const ex = t.rows[c.kinds.comma[0]!]![at(c)]!.trim();
    items.push({ id: `comma:${c.name}`, check: "decimal_comma", level: "ask", column: c.name, rows: c.kinds.comma.map(fileRow), text: `Column ${quote(c.name)} has ${plural(c.kinds.comma.length, "value")} like ${ex}. The comma can be a decimal mark or a thousands mark.`, question: `Column ${quote(c.name)} has values like ${ex}. Is the comma a decimal mark (${ex.replace(",", ".")}) or a thousands mark (${ex.replace(",", "")})?`, options: [{ value: "decimal", label: `Decimal mark: ${ex} is ${ex.replace(",", ".")}` }, { value: "thousands", label: `Thousands mark: ${ex} is ${ex.replace(",", "")}` }, { value: "stop", label: "Stop. I correct the file" }] });
  }
  const clear = commas.filter((c) => !ambiguous.includes(c));
  if (clear.length) {
    const ex = t.rows[clear[0]!.kinds.comma[0]!]![at(clear[0]!)]!.trim();
    items.push({ id: "comma", check: "decimal_comma", level: "note", text: `${clear.length === 1 ? `Column ${quote(clear[0]!.name)} uses` : `Columns ${clear.map((c) => quote(c.name)).join(", ")} use`} a decimal comma (for example ${ex}). The harness reads ${ex} as ${ex.replace(",", ".")}.` });
  }

  for (const c of cols) {
    if (!c.numeric) continue;
    if (c.kinds.text.length) {
      const col = at(c);
      const ex = [...new Set(c.kinds.text.map((i) => t.rows[i]![col]!.trim()))];
      items.push({ id: `mixed:${c.name}`, check: "mixed_type", level: "ask", column: c.name, rows: c.kinds.text.map(fileRow), text: `Column ${quote(c.name)} has numbers and ${plural(c.kinds.text.length, "text value")} (${listOf(ex.map(quote), 3)}, in ${c.kinds.text.length === 1 ? "row" : "rows"} ${listOf(c.kinds.text.map((i) => String(fileRow(i))))}).`, question: `Column ${quote(c.name)} has numbers and ${plural(c.kinds.text.length, "text value")} (${listOf(ex.map(quote), 3)}). Treat the text as no value, or stop?`, options: [{ value: "missing", label: "Treat the text as no value" }, { value: "stop", label: "Stop. I correct the file" }], recommendation: "missing" });
    }
    if (c.kinds.astext.length) items.push({ id: `astext:${c.name}`, check: "number_as_text", level: "note", column: c.name, rows: c.kinds.astext.map(fileRow), text: `Column ${quote(c.name)} has ${plural(c.kinds.astext.length, "number")} stored as text (with spaces or a leading '). The harness reads them as numbers.` });
  }

  for (const [ci, c] of cols.entries()) {
    const miss = c.kinds.missing;
    if (!miss.length) continue;
    if (miss.length === n) {
      items.push({ id: `empty:${c.name}`, check: "empty_column", level: "note", column: c.name, text: `Column ${quote(c.name || `number ${ci + 1}`)} is empty. The harness does not use it.` });
      continue;
    }
    if (!c.numeric && ci !== id && ci !== group) {
      items.push({ id: `missing:${c.name}`, check: "missing", level: "note", column: c.name, rows: miss.map(fileRow), text: `Column ${quote(c.name)} has ${plural(miss.length, "empty cell")}. It is a text column, so no row is left out because of it.` });
      continue;
    }
    const rows = miss.map(fileRow);
    const lead = `${plural(miss.length, "row")} ${miss.length === 1 ? "has" : "have"} no value for ${quote(c.name)}`;
    items.push({ id: `missing:${c.name}`, check: "missing", level: "ask", column: c.name, rows, text: `${lead} (${miss.length === 1 ? "row" : "rows"} ${listOf(rows.map(String), 6)}).`, question: `${lead}. Leave them out, or stop?`, options: [{ value: "leave_out", label: `Leave out the ${plural(miss.length, "row")}` }, { value: "stop", label: "Stop. I fill in the values" }], recommendation: "leave_out" });
  }

  const seen = new Set<string>();
  const copies: number[] = [];
  t.rows.forEach((r, i) => {
    const k = key(r);
    if (seen.has(k)) copies.push(i);
    else seen.add(k);
  });
  const copySet = new Set(copies);
  if (copies.length && t.columns.length >= 2) {
    const rows = copies.map(fileRow);
    items.push({ id: "duplicate_rows", check: "duplicate_rows", level: "ask", rows, text: `${plural(copies.length, "row")} ${copies.length === 1 ? "is an exact copy" : "are exact copies"} of another row (${copies.length === 1 ? "row" : "rows"} ${listOf(rows.map(String), 6)}).`, question: `${plural(copies.length, "row")} ${copies.length === 1 ? "is an exact copy" : "are exact copies"} of another row (${listOf(rows.map(String), 6)}). Remove the copies, or keep them?`, options: [{ value: "remove", label: "Remove the copies" }, { value: "keep", label: "Keep them: they are real repeats" }, { value: "stop", label: "Stop. I correct the file" }], recommendation: "remove" });
  }

  if (id >= 0) {
    const where = new Map<string, number[]>();
    t.rows.forEach((r, i) => {
      if (copySet.has(i)) return;
      const v = (r[id] ?? "").trim();
      if (isMissing(v)) return;
      const list = where.get(v);
      if (list) list.push(i);
      else where.set(v, [i]);
    });
    const dups = [...where.entries()].filter(([, rows]) => rows.length > 1);
    if (dups.length) {
      const name = t.columns[id]!;
      const other = t.columns.findIndex((_, c) => c !== id && c !== group && !cols[c]!.numeric && dups.every(([, rows]) => new Set(rows.map((i) => t.rows[i]![c]!.trim())).size === rows.length));
      const otherNum = other < 0 ? t.columns.findIndex((col, c) => c !== id && /^(time|day|week|visit|timepoint|hour|session|repeat|replicate)\b/i.test(col) && dups.every(([, rows]) => new Set(rows.map((i) => t.rows[i]![c]!.trim())).size === rows.length)) : -1;
      const by = other >= 0 ? other : otherNum;
      if (by >= 0) items.push({ id: `repeated:${name}`, check: "repeated_ids", level: "note", column: name, text: `${plural(dups.length, "value")} of ${quote(name)} ${dups.length === 1 ? "is" : "are"} on more than one row, one row for each ${quote(t.columns[by]!)}. These are repeated measures of one ${name.toLowerCase()}. Count each ${name.toLowerCase()} once as n.` });
      else {
        const ex = dups.slice(0, 3).map(([v, rows]) => `${v} (rows ${rows.map((i) => fileRow(i)).join(", ")})`);
        items.push({ id: `duplicate_ids:${name}`, check: "duplicate_ids", level: "ask", column: name, rows: dups.flatMap(([, rows]) => rows.map(fileRow)), text: `${plural(dups.length, "ID")} in ${quote(name)} ${dups.length === 1 ? "is" : "are"} on more than one row: ${listOf(ex, 3)}.`, question: `${plural(dups.length, "ID")} in ${quote(name)} ${dups.length === 1 ? "is" : "are"} on more than one row: ${listOf(ex, 3)}. Repeated measures, or an error?`, options: [{ value: "repeated", label: "Repeated measures: count each ID once as n" }, { value: "first", label: "An error: keep the first row of each ID" }, { value: "stop", label: "Stop. I correct the file" }] });
      }
    }
  }

  let groups: DataCheck["groups"];
  if (group >= 0) {
    const name = t.columns[group]!;
    const labels = t.rows.map((r) => (r[group] ?? "").trim()).filter((v) => !isMissing(v));
    const spell = new Map<string, Set<string>>();
    for (const r of t.rows) {
      const raw = r[group] ?? "";
      if (isMissing(raw)) continue;
      const k = raw.trim().toLowerCase().replace(/\s+/g, " ");
      spell.set(k, (spell.get(k) ?? new Set()).add(raw));
    }
    for (const [k, s] of spell) {
      if (s.size < 2) continue;
      const forms = [...s].map((x) => quote(x));
      items.push({ id: `labels:${name}:${k}`, check: "group_labels", level: "ask", column: name, text: `In ${quote(name)}, the labels ${forms.join(" and ")} differ only in capitals or spaces.`, question: `In ${quote(name)}, the labels ${forms.join(" and ")} differ only in capitals or spaces. Join them as one group?`, options: [{ value: "join", label: "Join them as one group" }, { value: "keep", label: "Keep them apart" }], recommendation: "join" });
    }
    const unitCol = id >= 0 ? id : -1;
    const count = new Map<string, Set<string>>();
    t.rows.forEach((r, i) => {
      const g = (r[group] ?? "").trim();
      if (isMissing(g)) return;
      const u = unitCol >= 0 ? (r[unitCol] ?? "").trim() : "";
      count.set(g, (count.get(g) ?? new Set()).add(u && !isMissing(u) ? `id\u0001${u}` : `row\u0001${i}`));
    });
    groups = { column: name, sizes: [...count.entries()].map(([g, s]) => [g, s.size]) };
    const numCols = cols.flatMap((c, i) => (c.numeric && i !== id ? [i] : []));
    for (const g of new Set(labels)) {
      const rows = t.rows.filter((r) => (r[group] ?? "").trim() === g);
      if (numCols.length && rows.every((r) => numCols.every((c) => toNumber(r[c] ?? "") === undefined))) items.push({ id: `empty_group:${g}`, check: "empty_group", level: "note", column: name, text: `Group ${quote(g)} has ${plural(rows.length, "row")}, but no numbers. It cannot be analysed.` });
    }
  }

  for (const [ci, c] of cols.entries()) {
    if (!c.numeric || ci === id) continue;
    const parts = new Map<string, number[]>();
    t.rows.forEach((r, i) => {
      if (toNumber(r[ci] ?? "") === undefined) return;
      const g = group >= 0 ? (r[group] ?? "").trim() : "";
      const list = parts.get(g);
      if (list) list.push(i);
      else parts.set(g, [i]);
    });
    const big = [...parts.values()].every((rows) => rows.length >= 5);
    const sets = group >= 0 && big ? [...parts.values()] : [[...parts.values()].flat()];
    const hits = sets.flatMap((rows) => extremes(rows.map((i) => toNumber(t.rows[i]![ci]!)!)).map((k) => rows[k]!)).sort((a, b) => a - b);
    if (!hits.length) continue;
    const vals = hits.map((i) => `row ${fileRow(i)}: ${t.rows[i]![ci]!.trim()}`);
    items.push({ id: `extreme:${c.name}`, check: "extreme_values", level: "note", column: c.name, rows: hits.map(fileRow), text: `Column ${quote(c.name)} has ${plural(hits.length, "extreme value")} (${listOf(vals, 3)}). Rule: a modified z-score above 3.5 (from the median and the median absolute deviation${sets.length > 1 ? `, in each group of ${quote(t.columns[group]!)}` : ""}). The values stay in the data. Nothing is removed.` });
  }

  const units = t.columns.flatMap((c) => {
    const u = unitOf(c);
    return u && (unitFamily(u) || !STAT_WORD.test(u)) ? [[c, u] as [string, string]] : [];
  });
  const base = (c: string) => c.replace(UNIT_IN_NAME, "").trim().toLowerCase();
  const byBase = new Map<string, [string, string][]>();
  for (const u of units) byBase.set(base(u[0]), [...(byBase.get(base(u[0])) ?? []), u]);
  for (const [b, us] of byBase) {
    if (us.length < 2 || new Set(us.map((u) => unitKey(u[1]))).size < 2) continue;
    const fams = new Set(us.map((u) => unitFamily(u[1])));
    if (fams.size > 1 && !fams.has(undefined)) continue;
    items.push({ id: `units:${b}`, check: "mixed_units", level: "ask", text: `The columns ${us.map((u) => quote(u[0])).join(" and ")} give one measure in different units.`, question: `The columns ${us.map((u) => quote(u[0])).join(" and ")} give one measure in different units. Are they two different measures?`, options: [{ value: "different", label: "Yes, two different measures" }, { value: "stop", label: "No. Stop, I correct the file" }] });
  }
  return { source, kind: "table", size: `${plural(n, "row")}, ${plural(t.columns.length, "column")}`, items, groups, units };
}

// ---------------------------------------------------------------- file sets

const DATA_EXT = new Set([".tif", ".tiff", ".png", ".jpg", ".jpeg", ".bmp", ".czi", ".nd2", ".lif", ".lsm", ".oib", ".oif", ".ims", ".vsi", ".svs", ".ndpi", ".fcs", ".imzml", ".ibd", ".mzml", ".raw", ".d", ".fastq", ".gz", ".bam", ".csv", ".tsv", ".txt", ".xlsx", ".dcm", ".nii", ".edf", ".fif", ".abf", ".wav", ".h5", ".hdf5", ".zarr"]);
export const CHANNEL = /^(c\d{1,2}|ch\d{1,2}|w\d|dapi|hoechst|gfp|egfp|yfp|rfp|mcherry|fitc|tritc|cy3|cy5|cy7|red|green|blue|farred|brightfield|bf|phase|dic|merge|merged|overlay|composite)$/i;

export interface FileInfo {
  rel: string;
  size: number;
  bits?: number;
  width?: number;
  height?: number;
}

export function listDataFiles(root: string, max = 5000, depth = 5, skip: string[] = []): string[] {
  const out: string[] = [];
  let seen = 0;
  const walk = (dir: string, d: number) => {
    if (out.length >= max || d > depth || seen > max * 4) return;
    let names: string[];
    try {
      names = readdirSync(dir).sort();
    } catch {
      return;
    }
    for (const name of names) {
      if (++seen > max * 4) return;
      if (name.startsWith(".") || /^(thumbs\.db|desktop\.ini)$/i.test(name)) continue;
      const p = join(dir, name);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (!skip.includes(p)) walk(p, d + 1);
      }
      else if (DATA_EXT.has(extname(name).toLowerCase())) out.push(relative(root, p).split(sep).join("/"));
      if (out.length >= max) return;
    }
  };
  walk(root, 0);
  return out;
}

type ReadAt = (pos: number, len: number) => Promise<Buffer>;

async function headerInfo(readAt: ReadAt): Promise<{ bits?: number; width?: number; height?: number }> {
  const head = await readAt(0, 32);
  if (head.length >= 26 && head.readUInt32BE(0) === 0x89504e47) return { width: head.readUInt32BE(16), height: head.readUInt32BE(20), bits: head[24] };
  const le = head.toString("latin1", 0, 2) === "II";
  if (!le && head.toString("latin1", 0, 2) !== "MM") return {};
  const u16 = (b: Buffer, o: number) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
  const u32 = (b: Buffer, o: number) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
  if (u16(head, 2) !== 42) return {};
  const ifd = u32(head, 4);
  const count = u16(await readAt(ifd, 2), 0);
  const tags = await readAt(ifd + 2, count * 12);
  const out: { bits?: number; width?: number; height?: number } = {};
  for (let i = 0; i + 12 <= tags.length; i += 12) {
    const tag = u16(tags, i);
    const type = u16(tags, i + 2);
    const n = u32(tags, i + 4);
    const val = type === 3 ? u16(tags, i + 8) : u32(tags, i + 8);
    if (tag === 256) out.width = val;
    else if (tag === 257) out.height = val;
    else if (tag === 258) out.bits = n * 2 <= 4 ? u16(tags, i + 8) : u16(await readAt(u32(tags, i + 8), 2), 0);
  }
  return out;
}

const HEAD_BYTES = 4096;

async function readInfo(path: string, image: boolean): Promise<{ size: number; bits?: number; width?: number; height?: number }> {
  const fh = await open(path, "r");
  try {
    const size = (await fh.stat()).size;
    if (!image) return { size };
    const head = Buffer.alloc(Math.min(HEAD_BYTES, size));
    await fh.read(head, 0, head.length, 0);
    const info = await headerInfo(async (pos, len) => {
      if (pos + len <= head.length) return head.subarray(pos, pos + len);
      const b = Buffer.alloc(len);
      const { bytesRead } = await fh.read(b, 0, len, pos);
      return b.subarray(0, bytesRead);
    }).catch(() => ({}));
    return { size, ...info };
  } finally {
    await fh.close();
  }
}

export async function imageInfo(path: string): Promise<{ bits?: number; width?: number; height?: number }> {
  try {
    const { size: _, ...info } = await readInfo(path, true);
    return info;
  } catch {
    return {};
  }
}

const FILE_READS = 8;

export async function fileInfos(root: string, rels: string[]): Promise<FileInfo[]> {
  const out: FileInfo[] = new Array(rels.length);
  let next = 0;
  const worker = async () => {
    for (let i = next++; i < rels.length; i = next++) out[i] = { rel: rels[i]!, ...(await readInfo(join(root, rels[i]!), /\.(tiff?|png)$/i.test(rels[i]!))) };
  };
  await Promise.all(Array.from({ length: Math.min(FILE_READS, rels.length) }, worker));
  return out;
}

export function splitName(rel: string): { dirs: string[]; stem: string; ext: string } {
  const parts = rel.split("/");
  const name = parts.pop()!;
  const ext = extname(name);
  return { dirs: parts, stem: name.slice(0, name.length - ext.length), ext: ext.toLowerCase() };
}

export function channelOf(stem: string): { channel?: string; field: string } {
  const toks = stem.split(/([_\-\s.]+)/);
  for (let i = toks.length - 1; i >= 0; i -= 2) {
    if (CHANNEL.test(toks[i]!)) {
      const rest = [...toks.slice(0, Math.max(0, i - 1)), ...toks.slice(i + 1)].join("");
      return { channel: toks[i]!.toLowerCase(), field: rest };
    }
  }
  return { field: stem };
}

const sizeText = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b >= 1e3 ? `${Math.round(b / 1e3)} KB` : `${b} bytes`);

export function checkFiles(files: FileInfo[], source: string): DataCheck {
  const items: CheckItem[] = [];
  const parsed = files.map((f) => ({ f, ...splitName(f.rel), ...channelOf(splitName(f.rel).stem) }));
  const folders = new Set(parsed.map((p) => p.dirs.join("/")));

  const channels = new Map<string, number>();
  const fields = new Map<string, Set<string>>();
  for (const p of parsed) {
    if (!p.channel) continue;
    channels.set(p.channel, (channels.get(p.channel) ?? 0) + 1);
    const k = [...p.dirs, p.field].join("/");
    fields.set(k, (fields.get(k) ?? new Set()).add(p.channel));
  }
  if (channels.size >= 2) {
    const want = [...channels.entries()].filter(([, n]) => n >= fields.size / 2).map(([c]) => c);
    const byLack = new Map<string, { chans: string[]; lack: string[] }>();
    for (const c of want) {
      const lack = [...fields.entries()].filter(([, s]) => !s.has(c)).map(([k]) => k);
      if (!lack.length) continue;
      const g = byLack.get(lack.join("\n")) ?? { chans: [], lack };
      g.chans.push(c);
      byLack.set(lack.join("\n"), g);
    }
    for (const { chans, lack } of byLack.values()) {
      const names = chans.map(quote);
      const what = names.length === 1 ? `no ${names[0]} image` : `no ${listOf(names, names.length).replace(/, ([^,]*)$/, " and $1")} images`;
      const lead = `${plural(lack.length, "field")} ${lack.length === 1 ? "has" : "have"} ${what}`;
      items.push({ id: `channel:${chans.join("+")}`, check: "missing_channel", level: "ask", files: lack, text: `${lead}: ${listOf(lack, 3)}.`, question: `${lead} (${listOf(lack, 3)}). Leave ${lack.length === 1 ? "this field" : "these fields"} out, or stop?`, options: [{ value: "leave_out", label: `Leave out the ${plural(lack.length, "field")}` }, { value: "stop", label: "Stop. I add the missing images" }], recommendation: "leave_out" });
    }
  }

  const spell = new Map<string, Map<string, number>>();
  for (const p of parsed) {
    const toks = new Set([...p.dirs.flatMap((d) => d.split(/[_\-\s.]+/)), ...p.stem.split(/[_\-\s.]+/)]);
    for (const t of toks) {
      if (!/[a-z]/i.test(t)) continue;
      const m = spell.get(t.toLowerCase()) ?? new Map<string, number>();
      m.set(t, (m.get(t) ?? 0) + 1);
      spell.set(t.toLowerCase(), m);
    }
  }
  for (const [k, m] of spell) {
    if (m.size < 2) continue;
    const forms = [...m.entries()].sort((a, b) => b[1] - a[1]);
    items.push({ id: `names:${k}`, check: "inconsistent_names", level: "note", text: `The names spell one part in ${m.size} ways: ${forms.map(([f, n]) => `${quote(f)} (${plural(n, "file")})`).join(" and ")}. The harness treats them as the same. Match file names without case.` });
  }

  const bucket = new Map<string, typeof parsed>();
  for (const p of parsed) {
    const k = `${p.ext}|${p.channel ?? ""}`;
    const list = bucket.get(k);
    if (list) list.push(p);
    else bucket.set(k, [p]);
  }
  const empty = parsed.filter((p) => p.f.size === 0).map((p) => p.f.rel);
  if (empty.length) items.push({ id: "empty_files", check: "empty_files", level: "note", files: empty, text: `${plural(empty.length, "file")} ${empty.length === 1 ? "is" : "are"} empty (0 bytes): ${listOf(empty, 3)}. The harness leaves ${empty.length === 1 ? "it" : "them"} out.` });
  for (const [k, ps] of bucket) {
    const sized = ps.filter((p) => p.f.size > 0);
    if (sized.length < 3) continue;
    const med = median(sized.map((p) => p.f.size));
    const odd = sized.filter((p) => p.f.size < med / 2 || p.f.size > med * 2);
    if (odd.length && odd.length <= sized.length / 3) items.push({ id: `size:${k}`, check: "file_size", level: "note", files: odd.map((p) => p.f.rel), text: `${plural(odd.length, "file")} ${odd.length === 1 ? "differs" : "differ"} much in size from the others (median ${sizeText(med)}): ${listOf(odd.map((p) => `${p.f.rel} (${sizeText(p.f.size)})`), 3)}. ${odd.length === 1 ? "It" : "They"} can be cut short or have another image size.` });
    const dims = new Map<string, string[]>();
    for (const p of ps) {
      if (!p.f.width || !p.f.height) continue;
      const k = `${p.f.width} x ${p.f.height}`;
      const list = dims.get(k);
      if (list) list.push(p.f.rel);
      else dims.set(k, [p.f.rel]);
    }
    if (dims.size > 1) {
      const sorted = [...dims.entries()].sort((a, b) => b[1].length - a[1].length);
      items.push({ id: `dims:${k}`, check: "image_size", level: "note", files: sorted.slice(1).flatMap(([, f]) => f), text: `The images have ${dims.size} sizes: ${sorted.map(([d, f]) => `${d} pixels (${plural(f.length, "file")})`).join(", ")}. Areas in pixels are not comparable between sizes.` });
    }
  }

  const bits = new Map<number, string[]>();
  for (const p of parsed) {
    if (!p.f.bits) continue;
    const list = bits.get(p.f.bits);
    if (list) list.push(p.f.rel);
    else bits.set(p.f.bits, [p.f.rel]);
  }
  if (bits.size > 1) {
    const sorted = [...bits.entries()].sort((a, b) => b[1].length - a[1].length);
    const few = sorted.slice(1).flatMap(([, f]) => f);
    const lead = `The images have different bit depths: ${sorted.map(([b, f]) => `${plural(f.length, "image")} ${b}-bit`).join(", ")}`;
    items.push({ id: "bit_depth", check: "bit_depth", level: "ask", files: few, text: `${lead} (${listOf(few, 3)}). Intensities of different bit depths are not on one scale.`, question: `${lead}. Intensities of different bit depths are not on one scale. Leave out the ${plural(few.length, "image")} with the less common depth, or stop?`, options: [{ value: "leave_out", label: `Leave out the ${plural(few.length, "image")} (${listOf(few, 2)})` }, { value: "continue", label: "Continue. Do not compare intensities between bit depths" }, { value: "stop", label: "Stop. I check the images" }], recommendation: "leave_out" });
  }
  const size = `${plural(files.length, "file")} in ${plural(folders.size, "folder")}${channels.size >= 2 ? `, ${plural(channels.size, "channel")} (${[...channels.keys()].join(", ")})` : ""}`;
  return { source, kind: "files", size, items };
}

// ---------------------------------------------------------------- text

export function dataCheckText(c: DataCheck): string {
  const out = [`Data check of ${basename(c.source) || c.source}: ${c.size}.`];
  const ask = c.items.filter((i) => i.level === "ask");
  const note = c.items.filter((i) => i.level === "note");
  if (ask.length) out.push("Problems found in the data:", ...ask.map((i) => `- ${i.text}`));
  if (note.length) out.push(ask.length ? "Also found:" : "Found:", ...note.map((i) => `- ${i.text}`));
  if (c.groups) out.push(`Groups in ${quote(c.groups.column)}: ${c.groups.sizes.map(([g, n]) => `${g} ${n}`).join(", ")}.`);
  if (c.units?.length) out.push(`Units in the column names: ${c.units.map(([col, u]) => `${col.replace(UNIT_IN_NAME, "").trim() || col} (${u})`).join(", ")}.`);
  if (!c.items.length) out.push(c.kind === "table" ? "No missing values, copies, mixed columns or extreme values." : "No missing channels, name problems or odd files.");
  return out.join("\n");
}

export function existsTable(p: string): boolean {
  return /\.(csv|tsv)$/i.test(p) && existsSync(p) && statSync(p).isFile() && statSync(p).size < 20e6;
}
