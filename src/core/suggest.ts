import { closeSync, openSync, readdirSync, readSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { matches, type AdapterSummary } from "../adapters/catalog.ts";

export interface Suggestion {
  adapter: string;
  program: string;
  label: string;
  count: number;
  reason: string;
  headline: string;
  table: boolean;
}

export interface Suggestions {
  scanned: number;
  matches: Suggestion[];
}

const TABLE_TYPES = [".csv", ".tsv", ".txt", ".xlsx", ".xls", ".xlsm"];
const TABLE_ADAPTER = "tables";
const MAX_FILES = 400;
const MAX_DEPTH = 2;
const HEADER_BYTES = 16;

interface Seen {
  name: string;
  header: string;
}

function header(path: string): string {
  let fd: number | undefined;
  try {
    fd = openSync(path, "r");
    const buf = Buffer.alloc(HEADER_BYTES);
    return buf.subarray(0, readSync(fd, buf, 0, HEADER_BYTES, 0)).toString("hex");
  } catch {
    return "";
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function scan(folder: string): Seen[] {
  const out: Seen[] = [];
  const walk = (dir: string, depth: number) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (depth > 0 && entries.some((e) => e.name === ".record" && e.isDirectory())) return;
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      if (out.length >= MAX_FILES) return;
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      const p = join(dir, e.name);
      const target = e.isSymbolicLink() ? statSync(p, { throwIfNoEntry: false }) : e;
      if (target?.isFile()) out.push({ name: e.name.toLowerCase(), header: header(p) });
      else if (target?.isDirectory() && depth < MAX_DEPTH) walk(p, depth + 1);
    }
  };
  walk(folder, 0);
  return out;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function reasonText(byType: Map<string, number>, byHeader: number, capped: boolean): string {
  const least = capped ? "at least " : "";
  const parts = [...byType].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${least}${n} ${t} ${n === 1 ? "file" : "files"}`);
  if (byHeader) parts.push(`${least}${plural(byHeader, "file")} with a matching header`);
  return parts.join(", ");
}

function labelOf(a: AdapterSummary): string {
  return a.fileLabel || (a.field ? `${a.field} files` : "data files");
}

export function suggestPrograms(folder: string, list: AdapterSummary[]): Suggestions {
  const files = scan(folder);
  const capped = files.length >= MAX_FILES;
  const found: (Suggestion & { score: number; rank: number; priority: number; ready: boolean })[] = [];
  const allTypes = [...new Set([...TABLE_TYPES, ...list.filter((a) => !a.problem).flatMap((a) => a.fileTypes.map((t) => t.toLowerCase()))])];
  const claimed = new Set(files.filter((f) => allTypes.some((t) => matches(t, f.name))).map((f) => f.name));
  for (const a of list) {
    if (a.problem) continue;
    const types = a.fileTypes.map((t) => t.toLowerCase());
    const byType = new Map<string, number>();
    let byHeader = 0;
    let score = 0;
    let rank = 0;
    let count = 0;
    for (const f of files) {
      const i = types.findIndex((t) => !TABLE_TYPES.includes(t) && matches(t, f.name));
      const magic = (i >= 0 || !claimed.has(f.name)) && a.fileMagic.some((m) => f.header.startsWith(m.toLowerCase()));
      if (i < 0 && !magic) continue;
      count++;
      score += magic && i >= 0 ? 1.5 : 1;
      if (i >= 0) {
        byType.set(types[i], (byType.get(types[i]) ?? 0) + 1);
        rank += i;
      } else byHeader++;
    }
    if (!count) continue;
    const label = labelOf(a);
    found.push({ adapter: a.name, program: a.program, label, count, reason: reasonText(byType, byHeader, capped), headline: `These look like ${label}. Use ${a.program}?`, table: false, score, rank: rank / count, priority: a.filePriority, ready: a.found === "yes" });
  }
  found.sort((x, y) => y.score - x.score || y.priority - x.priority || Number(y.ready) - Number(x.ready) || x.rank - y.rank || x.adapter.localeCompare(y.adapter));
  const specific: Suggestion[] = found.map(({ score, rank, priority, ready, ...s }) => s);
  if (specific.length || !files.length) return { scanned: files.length, matches: specific };

  const tables = list.find((a) => a.name === TABLE_ADAPTER && !a.problem);
  if (!tables) return { scanned: files.length, matches: [] };
  const byType = new Map<string, number>();
  for (const f of files) {
    const ext = extname(f.name);
    if (TABLE_TYPES.includes(ext)) byType.set(ext, (byType.get(ext) ?? 0) + 1);
  }
  const count = [...byType.values()].reduce((s, n) => s + n, 0);
  const headline = count ? `These look like table files. Use the table route?` : `No program matches these files. Use the table route?`;
  return {
    scanned: files.length,
    matches: [{ adapter: tables.name, program: tables.program, label: "table files", count, reason: count ? reasonText(byType, 0, capped) : "no program lists these file types", headline, table: true }],
  };
}

export function suggestLines(s: Suggestions): string[] {
  if (!s.scanned || !s.matches.length) return [];
  const [best, ...rest] = s.matches;
  const lines = [`${best.headline} (${best.reason})`];
  if (rest.length) lines.push(`Other matches: ${rest.slice(0, 4).map((m) => `${m.program} (${m.reason})`).join("; ")}.`);
  return lines;
}
