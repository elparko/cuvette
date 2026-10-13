import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { encodePng } from "../bench/png.ts";
import { readCsvTable } from "./datacheck.ts";

export interface Sheet {
  name: string;
  columns: string[];
  rows: unknown[][];
}

export interface Reference {
  path: string;
  sheet?: string;
  sample_column?: string;
  columns?: string[];
  mode: "compare" | "blind";
}

export interface Candidate {
  path: string;
  sheet?: string;
  columns: string[];
  matched: string[];
}

function unzip(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error("not a zip file");
  let p = buf.readUInt32LE(end + 16);
  for (let i = buf.readUInt16LE(end + 10); i > 0; i--) {
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nlen).toString("utf8");
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + csize);
    out.set(name, method === 8 ? inflateRawSync(raw) : Buffer.from(raw));
    p += 46 + nlen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return out;
}

const unxml = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

function xlsxSheets(path: string): Sheet[] {
  const files = unzip(readFileSync(path));
  const text = (n: string) => files.get(n)?.toString("utf8") ?? "";
  const shared = [...text("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => unxml([...m[1]!.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
  const rels = new Map([...text("xl/_rels/workbook.xml.rels").matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1]!, m[2]!.replace(/^\/?xl\//, "")]));
  const sheets: Sheet[] = [];
  for (const m of text("xl/workbook.xml").matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const xml = text(`xl/${rels.get(m[2]!) ?? ""}`);
    const grid: unknown[][] = [];
    for (const row of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells: unknown[] = [];
      let col = -1;
      for (const c of row[1]!.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = /\br="([A-Z]+)\d*"/.exec(c[1]!)?.[1];
        col = ref ? colIndex(ref) : col + 1;
        const type = /\bt="(\w+)"/.exec(c[1]!)?.[1];
        const v = /<v>([\s\S]*?)<\/v>/.exec(c[2] ?? "")?.[1];
        const inline = /<t[^>]*>([\s\S]*?)<\/t>/.exec(c[2] ?? "")?.[1];
        cells[col] = type === "s" ? shared[Number(v)] : type === "inlineStr" ? unxml(inline ?? "") : type === "str" ? unxml(v ?? "") : v === undefined || type === "e" ? null : Number(v);
      }
      grid.push(cells);
    }
    const [head = [], ...rows] = grid;
    sheets.push({ name: unxml(m[1]!), columns: head.map((x) => String(x ?? "")), rows });
  }
  return sheets;
}

export function readTable(path: string): Sheet[] {
  const ext = extname(path).toLowerCase();
  if (ext === ".xlsx") return xlsxSheets(path);
  const t = readCsvTable(path);
  const num = (raw: string) => {
    const v = raw.trim();
    if (v !== "" && Number.isFinite(Number(v))) return Number(v);
    return /^[-+]?\d+,\d+$/.test(v) && !/,\d{3}$/.test(v) ? Number(v.replace(",", ".")) : v;
  };
  return [{ name: basename(path), columns: t.columns, rows: t.rows.map((r) => r.map(num)) }];
}

export const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

// A folder listing and a table read stay until the folder or the file changes.
// Without this, each request reads the parent folder again, and a parent folder with many files makes each turn take seconds.
const listings = new Map<string, { mtime: number; files: string[]; dirs: string[] }>();
const tables = new Map<string, { mtime: number; size: number; sheets: { name: string; columns: string[]; hay: string[] }[] }>();

function listing(dir: string): { files: string[]; dirs: string[] } {
  let mtime: number;
  try {
    const st = statSync(dir);
    if (!st.isDirectory()) return { files: [], dirs: [] };
    mtime = st.mtimeMs;
  } catch {
    listings.delete(dir);
    return { files: [], dirs: [] };
  }
  const hit = listings.get(dir);
  if (hit && hit.mtime === mtime) return hit;
  const files: string[] = [];
  const dirs: string[] = [];
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {}
  for (const n of names) {
    if (n.startsWith(".") || n === "node_modules") continue;
    const p = join(dir, n);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) dirs.push(p);
    else if (st.isFile() && /\.(xlsx|csv|tsv)$/i.test(n) && st.size < 20_000_000) files.push(p);
  }
  const out = { mtime, files, dirs };
  listings.set(dir, out);
  return out;
}

function filesIn(dir: string, depth: number): string[] {
  const l = listing(dir);
  return depth > 0 ? [...l.files, ...l.dirs.flatMap((d) => filesIn(d, depth - 1))] : l.files;
}

function tableHay(f: string): { name: string; columns: string[]; hay: string[] }[] {
  const st = statSync(f);
  const hit = tables.get(f);
  if (hit && hit.mtime === st.mtimeMs && hit.size === st.size) return hit.sheets;
  const sheets = readTable(f).map((s) => ({ name: s.name, columns: s.columns, hay: [s.name, basename(f), ...s.columns, ...s.rows.map((r) => r[0])].map(norm).filter(Boolean) }));
  tables.set(f, { mtime: st.mtimeMs, size: st.size, sheets });
  return sheets;
}

export function findReferences(dirs: string[], names: string[], skip: string[] = []): Candidate[] {
  const wanted = [...new Set(names.map(norm).filter((n) => n.length >= 3))];
  if (!wanted.length) return [];
  const seen = new Set(skip);
  const out: (Candidate & { score: number })[] = [];
  for (const [i, dir] of dirs.entries())
    for (const f of filesIn(dir, i === 0 ? 1 : 0)) {
      if (seen.has(f)) continue;
      seen.add(f);
      let sheets: ReturnType<typeof tableHay>;
      try {
        sheets = tableHay(f);
      } catch {
        tables.delete(f);
        continue;
      }
      for (const s of sheets) {
        const matched = wanted.filter((w) => s.hay.some((h) => h.includes(w) || (h.length >= 3 && w.includes(h))));
        if (matched.length) out.push({ path: f, sheet: s.name, columns: s.columns.filter(Boolean), matched, score: matched.length });
      }
    }
  return out.sort((a, b) => b.score - a.score).slice(0, 3).map(({ score: _s, ...c }) => c);
}

export function describeCandidate(c: Candidate): string {
  const cols = c.columns.slice(0, 6).join(", ");
  return `${basename(c.path)}${c.sheet && c.sheet !== basename(c.path) ? ` (sheet ${c.sheet}: ${cols})` : ` (columns ${cols})`}`;
}

export function referenceValues(ref: Reference, sample: string): Record<string, number> | undefined {
  const sheets = readTable(ref.path);
  const s = sheets.find((x) => !ref.sheet || x.name === ref.sheet) ?? sheets[0];
  if (!s) return undefined;
  const key = ref.sample_column ? s.columns.indexOf(ref.sample_column) : 0;
  const want = norm(sample);
  if (!want) return undefined;
  const at = (r: unknown[]) => norm(r[Math.max(0, key)]);
  const near = s.rows.filter((r) => {
    const v = at(r);
    return v && (want.includes(v) || v.includes(want));
  });
  const gap = (r: unknown[]) => Math.abs(at(r).length - want.length);
  const best = Math.min(...near.map(gap));
  const closest = near.filter((r) => gap(r) === best);
  const row = s.rows.find((r) => at(r) === want) ?? (closest.length === 1 ? closest[0] : undefined);
  if (!row) return undefined;
  const cols = ref.columns?.length ? ref.columns : s.columns.filter((_, i) => i !== key);
  const out: Record<string, number> = {};
  for (const c of cols) {
    const v = Number(row[s.columns.indexOf(c)]);
    if (s.columns.includes(c) && Number.isFinite(v)) out[c] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(4))));

export function compareLine(measure: string, ours: number, ref: number, refColumn: string): string {
  const pct = ref ? ` (${Math.round((ours / ref) * 100)}% of the reference)` : "";
  return `${measure}: the agent got ${fmt(ours)}; the reference "${refColumn}" says ${fmt(ref)}${pct}.`;
}

export interface Pair {
  sample: string;
  ours: number;
  ref: number;
  pilot: boolean;
}

export interface Agreement {
  n: number;
  meanDiff: number;
  meanPercent: number;
  r: number | null;
  sdDiff: number;
}

export function agreement(pairs: Pair[]): Agreement {
  const n = pairs.length;
  const diffs = pairs.map((p) => p.ours - p.ref);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const meanDiff = mean(diffs);
  const sdDiff = n > 1 ? Math.sqrt(diffs.reduce((a, d) => a + (d - meanDiff) ** 2, 0) / (n - 1)) : 0;
  const pcts = pairs.filter((p) => p.ref).map((p) => ((p.ours - p.ref) / p.ref) * 100);
  const mx = mean(pairs.map((p) => p.ours));
  const my = mean(pairs.map((p) => p.ref));
  const sxy = pairs.reduce((a, p) => a + (p.ours - mx) * (p.ref - my), 0);
  const sxx = pairs.reduce((a, p) => a + (p.ours - mx) ** 2, 0);
  const syy = pairs.reduce((a, p) => a + (p.ref - my) ** 2, 0);
  const r = n > 2 && sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
  return { n, meanDiff, meanPercent: pcts.length ? mean(pcts) : NaN, r, sdDiff };
}

export function agreementText(label: string, a: Agreement): string {
  const pct = Number.isFinite(a.meanPercent) ? ` (${fmt(a.meanPercent)}%)` : "";
  return `${label}: ${a.n} samples. Mean difference (agent minus reference) ${fmt(a.meanDiff)}${pct}. Correlation r = ${a.r === null ? "not defined" : fmt(a.r)}.`;
}

export function blandAltmanPng(pairs: Pair[], path: string): string {
  const W = 480;
  const H = 360;
  const px = new Uint8Array(W * H).fill(255);
  const set = (x: number, y: number, v = 0) => {
    if (x >= 0 && x < W && y >= 0 && y < H) px[Math.round(y) * W + Math.round(x)] = v;
  };
  const means = pairs.map((p) => (p.ours + p.ref) / 2);
  const diffs = pairs.map((p) => p.ours - p.ref);
  const a = agreement(pairs);
  const lo = Math.min(...diffs, a.meanDiff - 1.96 * a.sdDiff) - 1e-9;
  const hi = Math.max(...diffs, a.meanDiff + 1.96 * a.sdDiff) + 1e-9;
  const xlo = Math.min(...means);
  const xhi = Math.max(...means) + 1e-9;
  const L = 50;
  const T = 20;
  const sx = (v: number) => L + ((v - xlo) / (xhi - xlo || 1)) * (W - L - 20);
  const sy = (v: number) => H - 40 - ((v - lo) / (hi - lo || 1)) * (H - 40 - T);
  for (let x = L; x < W - 10; x++) set(x, H - 40);
  for (let y = T; y <= H - 40; y++) set(L, y);
  for (const [v, dash] of [[a.meanDiff, 1], [a.meanDiff + 1.96 * a.sdDiff, 6], [a.meanDiff - 1.96 * a.sdDiff, 6], [0, 2]] as const)
    for (let x = L; x < W - 10; x++) if (Math.floor(x / dash) % 2 === 0 || dash === 1) set(x, sy(v), dash === 2 ? 170 : 90);
  pairs.forEach((p, i) => {
    const cx = sx(means[i]!);
    const cy = sy(diffs[i]!);
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) if (dx * dx + dy * dy <= 9) set(cx + dx, cy + dy, p.pilot ? 120 : 0);
  });
  writeFileSync(path, encodePng({ width: W, height: H, pixels: px }));
  return path;
}
