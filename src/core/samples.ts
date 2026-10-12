import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { channelOf, isMissing, splitName, type Table } from "./datacheck.ts";
import { parseCsv } from "./results.ts";

export const SAMPLE_COLUMNS = ["sample", "group", "unit", "batch", "path"] as const;
export type SampleColumn = (typeof SAMPLE_COLUMNS)[number];
export type SampleRow = Record<SampleColumn, string>;

export interface SampleSheet {
  source: string;
  rows: SampleRow[];
  from: string;
  same?: string[];
}

export interface DesignIssue {
  id: string;
  check: "pseudoreplication" | "confounding" | "unbalanced" | "too_few" | "blocks";
  level: "warn" | "ask";
  text: string;
  question?: string;
  options?: { value: string; label: string }[];
  recommendation?: string;
}

const UNIT = /^(set|animal|mouse|mice|rat|donor|patient|subject|culture|replicate|rep|biorep|experiment|exp|litter|pig|dog|fish|plant|individual|n)[\s_-]*\d+[a-z]?$/i;
const BATCH = /^(plate|slide|run|day|batch|chip|lane|session|cassette|block)[\s_-]*\w+$/i;
const DATE = /(?<!\d)(20\d\d)[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])(?!\d)/;
const UNIT_COL = /^(set|animal|mouse|donor|patient|subject|culture|replicate|biological replicate|experiment|litter|individual)( ?id)?$/i;
const BATCH_COL = /^(batch|plate|date|day|run|slide|chip|lane|session|imaging date|experiment date)( ?id)?$/i;
const ID_COL = /^(sample|sample ?id|id|subject|subject ?id|patient|patient ?id|animal|animal ?id|mouse|mouse ?id|donor|specimen|well|image|file|field|name)$/i;
const GROUP_COL = /(group|treatment|condition|genotype|arm|cohort|drug|strain)/i;

const dateOf = (s: string) => {
  const m = DATE.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function sheetFromFiles(rels: string[], source: string): SampleSheet {
  const fields = new Map<string, { dirs: string[]; field: string; files: string[] }>();
  for (const rel of rels) {
    const { dirs, stem } = splitName(rel);
    const { field } = channelOf(stem);
    const k = [...dirs, field].join("/");
    const f = fields.get(k) ?? { dirs, field, files: [] };
    f.files.push(rel);
    fields.set(k, f);
  }
  const list = [...fields.values()];
  const depth = Math.max(0, ...list.map((f) => f.dirs.length));
  const level = (i: number) => list.map((f) => f.dirs[i] ?? "");
  const distinct = (i: number) => new Set(level(i));
  const same: string[] = [];
  let group = -1;
  let unit = -1;
  let batch = -1;
  for (let i = 0; i < depth; i++) {
    const vals = [...distinct(i)];
    if (vals.length === 1) {
      if (vals[0]) same.push(vals[0]);
      continue;
    }
    if (unit < 0 && vals.every((v) => UNIT.test(v))) unit = i;
    else if (batch < 0 && vals.every((v) => BATCH.test(v) || dateOf(v))) batch = i;
    else if (group < 0 && vals.length <= 20) group = i;
  }
  const unitFromStem = (stem: string) => {
    const m = /^(.*?\d+[a-z]?)(?=[\s_-]+\w)/i.exec(stem);
    return m && UNIT.test(m[1]!.trim()) ? m[1]!.trim() : undefined;
  };
  const groupFromStem = (stem: string) => stem.split(/[_\-\s]+/)[0] ?? "";
  const stemGroups = new Set(list.map((f) => groupFromStem(f.field)));
  const useStemGroup = group < 0 && stemGroups.size >= 2 && stemGroups.size <= 12 && stemGroups.size < list.length && [...stemGroups].every((g) => !UNIT.test(g) && !/^\d+$/.test(g));
  const rows: SampleRow[] = list.map((f) => {
    const g = group >= 0 ? f.dirs[group]! : useStemGroup ? groupFromStem(f.field) : "";
    const u = unit >= 0 ? f.dirs[unit]! : (unitFromStem(f.field) ?? "");
    const b = batch >= 0 ? (dateOf(f.dirs[batch]!) ?? f.dirs[batch]!) : (dateOf(f.files[0]!) ?? "");
    const path = f.files.length === 1 ? f.files[0]! : `${[...f.dirs, f.field].join("/")}*`;
    return { sample: f.field, group: g, unit: u, batch: b, path };
  });
  const unique = (f: (r: SampleRow) => string) => new Set(rows.map(f)).size === rows.length;
  const name = [(r: SampleRow) => r.sample, (r: SampleRow) => [r.group, r.sample].filter(Boolean).join(" "), (r: SampleRow) => [r.group, r.sample.includes(r.unit) ? "" : r.unit, r.sample].filter(Boolean).join(" ")].find(unique);
  if (name) for (const r of rows) r.sample = name(r);
  const how = [group >= 0 ? `group from folder level ${group + 1}` : useStemGroup ? "group from the first part of the file name" : "", unit >= 0 ? `unit from folder level ${unit + 1}` : rows.some((r) => r.unit) ? "unit from the start of the file name" : "", batch >= 0 ? `batch from folder level ${batch + 1}` : rows.some((r) => r.batch) ? "batch from a date in the name" : ""].filter(Boolean);
  return { source, rows, from: `the folder and file names${how.length ? ` (${how.join("; ")})` : ""}`, same };
}

export function sheetFromTable(t: Table, source: string): SampleSheet | undefined {
  const find = (re: RegExp, skip: number[] = []) => t.columns.findIndex((c, i) => !skip.includes(i) && re.test(c.trim()));
  const id = find(ID_COL);
  const unit = find(UNIT_COL);
  const group = find(GROUP_COL, [id, unit]);
  const batch = find(BATCH_COL, [id, unit, group]);
  if (group < 0 && unit < 0) return undefined;
  const key = id >= 0 ? id : unit;
  const by = new Map<string, number[]>();
  t.rows.forEach((r, i) => {
    const k = key >= 0 ? (r[key] ?? "").trim() : `row ${i + 2}`;
    if (isMissing(k)) return;
    const list = by.get(k);
    if (list) list.push(i);
    else by.set(k, [i]);
  });
  const rows: SampleRow[] = [...by.entries()].map(([k, idx]) => {
    const r = t.rows[idx[0]!]!;
    const span = idx.length === 1 ? `row ${idx[0]! + 2}` : `rows ${idx.map((i) => i + 2).join(", ")}`;
    return { sample: k, group: group >= 0 ? (r[group] ?? "").trim() : "", unit: unit >= 0 ? (r[unit] ?? "").trim() : k, batch: batch >= 0 ? (r[batch] ?? "").trim() : "", path: `${basename(source)} ${span}` };
  });
  const used = [id >= 0 ? `sample from '${t.columns[id]}'` : "", group >= 0 ? `group from '${t.columns[group]}'` : "", unit >= 0 ? `unit from '${t.columns[unit]}'` : "", batch >= 0 ? `batch from '${t.columns[batch]}'` : ""].filter(Boolean);
  return { source, rows, from: `the table columns (${used.join("; ")})` };
}

// ---------------------------------------------------------------- csv and edits

const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function sheetCsv(rows: SampleRow[]): string {
  return [SAMPLE_COLUMNS.join(","), ...rows.map((r) => SAMPLE_COLUMNS.map((c) => cell(r[c] ?? "")).join(","))].join("\n") + "\n";
}

export function writeSheet(path: string, rows: SampleRow[]): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, sheetCsv(rows));
}

export function readSheet(path: string): SampleRow[] {
  const text = readFileSync(path, "utf8").replace(/^﻿/, "");
  const [head = [], ...rest] = parseCsv(text.endsWith("\n") ? text : `${text}\n`, text.split("\n", 1)[0]!.includes(";") && !text.split("\n", 1)[0]!.includes(",") ? ";" : ",").filter((r) => r.some((c) => c.trim()));
  const idx = SAMPLE_COLUMNS.map((c) => head.findIndex((h) => h.trim().toLowerCase().startsWith(c)));
  if (idx[0]! < 0) throw new Error("samples.csv has no column named sample.");
  return rest.map((r) => Object.fromEntries(SAMPLE_COLUMNS.map((c, i) => [c, idx[i]! >= 0 ? (r[idx[i]!] ?? "").trim() : ""])) as SampleRow);
}

export function applyEdit(rows: SampleRow[], text: string): { rows: SampleRow[]; said: string } | { error: string } {
  const t = text.trim();
  const cols = SAMPLE_COLUMNS.join("|");
  const one = new RegExp(`^(\\d+)(?:\\s*-\\s*(\\d+))?\\s+(${cols})\\s+(.*)$`, "i").exec(t);
  if (one) {
    const a = Number(one[1]);
    const b = Number(one[2] ?? one[1]);
    const col = one[3]!.toLowerCase() as SampleColumn;
    if (a < 1 || b > rows.length || a > b) return { error: `Use a row number from 1 to ${rows.length}.` };
    const next = rows.map((r, i) => (i + 1 >= a && i + 1 <= b ? { ...r, [col]: one[4]!.trim() } : r));
    return { rows: next, said: `${a === b ? `Row ${a}` : `Rows ${a} to ${b}`}: ${col} is now ${one[4]!.trim() || "empty"}.` };
  }
  const all = new RegExp(`^(${cols})\\s+(.+?)\\s*=\\s*(.*)$`, "i").exec(t);
  if (all) {
    const col = all[1]!.toLowerCase() as SampleColumn;
    const hits = rows.filter((r) => r[col] === all[2]!.trim()).length;
    if (!hits) return { error: `No row has ${col} ${all[2]!.trim()}.` };
    return { rows: rows.map((r) => (r[col] === all[2]!.trim() ? { ...r, [col]: all[3]!.trim() } : r)), said: `${plural(hits, "row")}: ${col} ${all[2]!.trim()} is now ${all[3]!.trim() || "empty"}.` };
  }
  return { error: "Type: row column value (for example: 3 group Ceramide), or: column old = new (for example: group Cer = Ceramide)." };
}

export function sheetTable(rows: SampleRow[], max = 12): string {
  const head = ["#", "sample", "group", "unit", "batch", "path"];
  const short = (p: string) => (p.length > 40 ? `…${p.slice(-39)}` : p);
  const body = rows.slice(0, max).map((r, i) => [String(i + 1), r.sample, r.group, r.unit, r.batch, short(r.path)]);
  const w = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i]!.length)));
  const line = (r: string[]) => r.map((c, i) => c.padEnd(w[i]!)).join("  ").trimEnd();
  return [line(head), ...body.map(line), ...(rows.length > max ? [`… ${plural(rows.length - max, "more row")}. All rows are in samples.csv.`] : [])].join("\n");
}

export function groupSummary(rows: SampleRow[]): string {
  const groups = new Map<string, SampleRow[]>();
  for (const r of rows) {
    const g = r.group || "(no group)";
    const list = groups.get(g);
    if (list) list.push(r);
    else groups.set(g, [r]);
  }
  const units = (rs: SampleRow[]) => new Set(rs.map((r) => r.unit).filter(Boolean)).size;
  const word = unitWord(rows) ?? "unit";
  return [...groups.entries()].map(([g, rs]) => (units(rs) ? `${g}: ${plural(units(rs), word)}, ${plural(rs.length, "sample")}` : `${g}: ${plural(rs.length, "sample")}`)).join("; ");
}

// ---------------------------------------------------------------- design checks

export function unitWord(rows: SampleRow[]): string | undefined {
  const words = rows.map((r) => /^([a-z]+)/i.exec(r.unit)?.[1]).filter((w): w is string => !!w);
  return words.length && new Set(words.map((w) => w.toLowerCase())).size === 1 ? words[0] : undefined;
}

export function nLevel(rows: SampleRow[], n: string | undefined): "unit" | "sample" | undefined {
  if (!n) return undefined;
  const t = n.toLowerCase();
  const w = unitWord(rows);
  if (w && new RegExp(`\\b${w.toLowerCase()}s?\\b`).test(t)) return "unit";
  if (/\b(animal|mouse|mice|rat|donor|patient|subject|culture|biological|experiment|independent)\b/.test(t)) return "unit";
  if (/\b(field|image|cell|well|spot|file|technical|row|pixel|nucleus|nuclei)s?\b/.test(t)) return "sample";
  return undefined;
}

export function minPossibleP(n1: number, n2: number): number {
  let c = 1;
  for (let i = 1; i <= n1; i++) c = (c * (n2 + i)) / i;
  return 2 / c;
}

export function designChecks(rows: SampleRow[], opts: { n?: string; test?: string } = {}): DesignIssue[] {
  const out: DesignIssue[] = [];
  const groups = new Map<string, SampleRow[]>();
  for (const r of rows) {
    if (!r.group) continue;
    const list = groups.get(r.group);
    if (list) list.push(r);
    else groups.set(r.group, [r]);
  }
  const unitsIn = (rs: SampleRow[]) => new Set(rs.map((r) => r.unit).filter(Boolean));
  const word = unitWord(rows) ?? "unit";
  const level = nLevel(rows, opts.n);
  const hasUnits = rows.some((r) => r.unit);
  const counts = [...groups.entries()].map(([g, rs]) => ({ g, units: hasUnits ? unitsIn(rs).size : rs.length, samples: rs.length }));
  const many = hasUnits && counts.some((c) => c.samples > c.units);

  if (many) {
    const per = counts.map((c) => `${c.g} ${c.units} (${plural(c.samples, "sample")})`).join(", ");
    if (level === "sample")
      out.push({ id: "pseudoreplication", check: "pseudoreplication", level: "ask", text: `You count each sample as n, but the samples come from fewer ${word}s: ${per}. Samples of one ${word} are not independent. A test with them as n is pseudoreplication.`, question: `You count each sample (for example each field) as n. The samples of one ${word} are not independent: ${per}. Count ${word}s as n?`, options: [{ value: "unit", label: `Count ${word}s as n: use the mean of each ${word}` }, { value: "sample", label: "Keep each sample as n. I give the reason in the methods" }], recommendation: "unit" });
    else
      out.push({ id: "pseudoreplication", check: "pseudoreplication", level: "warn", text: `${level === "unit" ? `n is the ${word}.` : `n is not set yet. The sheet has several samples for each ${word}.`} n per group: ${per}. The test must use the ${word}s as n (the mean of each ${word}, or a mixed model with ${word} as the group), not the samples.` });
  }

  const batched = rows.filter((r) => r.group && r.batch);
  if (groups.size >= 2 && batched.length) {
    const byBatch = new Map<string, Set<string>>();
    for (const r of batched) byBatch.set(r.batch, (byBatch.get(r.batch) ?? new Set()).add(r.group));
    const byGroup = new Map<string, Set<string>>();
    for (const r of batched) byGroup.set(r.group, (byGroup.get(r.group) ?? new Set()).add(r.batch));
    if (byBatch.size >= 2 && [...byBatch.values()].every((s) => s.size === 1)) {
      const map = [...byGroup.entries()].map(([g, b]) => `${g}: ${[...b].join(", ")}`).join("; ");
      out.push({ id: "confounding", check: "confounding", level: "ask", text: `Each batch has only one group (${map}). The group effect and the batch effect cannot be separated.`, question: `Each batch has only one group (${map}). The group difference can come from the batch. Continue and report this as a limit, or stop?`, options: [{ value: "continue", label: "Continue. Report it as a limit" }, { value: "batch", label: "The batch column is wrong. I correct the sheet" }, { value: "stop", label: "Stop" }], recommendation: "continue" });
    }
  }

  if (hasUnits && groups.size >= 2) {
    const labels = [...groups.values()].map((rs) => [...unitsIn(rs)].sort().join("|"));
    if (labels.every((l) => l === labels[0]) && unitsIn(rows).size >= 2)
      out.push({ id: "blocks", check: "blocks", level: "warn", text: `Each ${word} (${[...unitsIn(rows)].sort().join(", ")}) has every group. If one ${word} is one experiment, the ${word}s are blocks: a paired test, or a model with ${word} as a block, uses this.` });
  }

  if (counts.length >= 2) {
    const ns = counts.map((c) => c.units);
    const lo = Math.min(...ns);
    const hi = Math.max(...ns);
    if (lo > 0 && (hi >= 2 * lo || hi - lo >= 3)) out.push({ id: "unbalanced", check: "unbalanced", level: "warn", text: `The groups are not balanced: ${counts.map((c) => `${c.g} n = ${c.units}`).join(", ")}. A test that assumes equal variances is less safe. Welch's test or a model is safer.` });
    const one = counts.filter((c) => c.units < 2);
    if (one.length)
      out.push({ id: "too_few", check: "too_few", level: "ask", text: `${one.map((c) => c.g).join(", ")} ${one.length === 1 ? "has" : "have"} only one ${hasUnits ? word : "sample"}. No test can estimate the spread with n = 1.`, question: `${one.map((c) => c.g).join(", ")} ${one.length === 1 ? "has" : "have"} n = 1. No test can estimate the spread. Show the results without a test, or stop?`, options: [{ value: "descriptive", label: "Show the results without a test" }, { value: "stop", label: "Stop. I add data" }], recommendation: "descriptive" });
    else if (lo < 3) out.push({ id: "too_few", check: "too_few", level: "warn", text: `The smallest group has n = ${lo}. With fewer than 3 ${word}s in a group, a test has very little power. Report the values and the effect size.` });
    const rank = /mann|whitney|wilcoxon|rank/i.test(opts.test ?? "");
    if (rank && lo >= 2) {
      const [a, b] = [...ns].sort((x, y) => x - y);
      const p = minPossibleP(a!, b!);
      if (p > 0.05) out.push({ id: "too_few_rank", check: "too_few", level: "warn", text: `With n = ${a} and n = ${b}, the smallest possible two-sided p of the Mann-Whitney test is ${p.toPrecision(2)}. The test cannot reach p < 0.05.` });
    }
  }
  return out;
}
