import { accessSync, constants, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { harnessWrite } from "./harness-writes.ts";
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { cuvetteHome } from "../adapters/manifest.ts";

export const COPY_LIMIT_BYTES = 20 * 1024 * 1024;
export const PROJECT_MARK = "{project}";

export interface Place {
  id: string;
  recordDir: string;
  outDir: string;
  project: string;
  title: string;
  created: string;
  legacy: boolean;
  fallback: boolean;
}

interface Meta {
  id: string;
  title: string;
  created: string;
  fromProject?: string;
  project?: string;
  fallback?: boolean;
}

export interface IndexRow {
  id: string;
  project: string;
  folder: string;
  title: string;
  date: string;
  name?: string;
  custom?: string;
  description?: string;
}

const README = "This folder holds one Cuvette analysis session: results, figures, scripts, exports, and the record in .record.\nTo continue the session, run \"cuvette open .\" in this folder.\nTo read it without Cuvette, open index.html in a browser.\n";

export const isRecordName = (name: string) => name.toLowerCase() === ".record";

export function indexPath(): string {
  return join(cuvetteHome(), "sessions-index.json");
}

const text = (v: unknown) => (typeof v === "string" ? v : undefined);

function parseIndex(json: string): { rows: IndexRow[]; dropped: number } {
  const data: unknown = JSON.parse(json);
  if (!Array.isArray(data)) throw new Error("the session index is not a list");
  const rows = data.flatMap((r): IndexRow[] => {
    if (!r || typeof r !== "object" || typeof r.id !== "string" || !r.id || typeof r.folder !== "string" || !r.folder) return [];
    return [{ ...r, id: r.id, project: text(r.project) ?? "", folder: r.folder, title: text(r.title) ?? "", date: text(r.date) ?? "", name: text(r.name), custom: text(r.custom), description: text(r.description) }];
  });
  return { rows, dropped: data.length - rows.length };
}

export function indexRows(json: string): IndexRow[] {
  return parseIndex(json).rows;
}

export function readIndex(path = indexPath()): IndexRow[] {
  try {
    return indexRows(readFileSync(path, "utf8"));
  } catch {
    return [];
  }
}

// The write keeps a damaged index next to the new one. Then no row of the damaged file goes away.
function writeIndex(rows: IndexRow[]): void {
  const path = indexPath();
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) {
    let damaged = true;
    try {
      damaged = parseIndex(readFileSync(path, "utf8")).dropped > 0;
    } catch {}
    if (damaged) renameSync(path, `${path}.damaged-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}`);
  }
  const tmp = `${path}.${process.pid}.tmp`;
  harnessWrite(path, () => {
    writeFileSync(tmp, JSON.stringify(rows, null, 1));
    renameSync(tmp, path);
  });
}

const LOCK_WAIT_MS = 10_000;
const LOCK_STALE_MS = 15_000;

function withIndexLock<T>(fn: () => T): T {
  const dir = `${indexPath()}.lock`;
  mkdirSync(dirname(dir), { recursive: true });
  const start = Date.now();
  let held = false;
  while (!held) {
    try {
      mkdirSync(dir);
      held = true;
    } catch {
      try {
        if (Date.now() - statSync(dir).mtimeMs > LOCK_STALE_MS) rmSync(dir, { recursive: true, force: true });
      } catch {}
      if (Date.now() - start > LOCK_WAIT_MS) break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  try {
    return fn();
  } finally {
    if (held) rmSync(dir, { recursive: true, force: true });
  }
}

export function saveIndexRow(p: Place, named?: { title: string; description: string }): void {
  if (p.legacy) return;
  withIndexLock(() => {
    const all = readIndex();
    const old = all.find((r) => r.id === p.id);
    const row: IndexRow = { ...old, id: p.id, project: p.project, folder: p.outDir, title: p.title, date: p.created, name: named?.title ?? old?.name, custom: old?.custom, description: named?.description ?? old?.description };
    writeIndex([...all.filter((r) => r.id !== p.id), row]);
  });
}

export function cutText(s: string, n: number): string {
  const t = s.slice(0, n);
  return /[\ud800-\udbff]$/.test(t) ? t.slice(0, -1) : t;
}

export function renameIndexRow(id: string, custom: string): boolean {
  return withIndexLock(() => {
    const rows = readIndex();
    const row = rows.find((r) => r.id === id);
    if (!row) return false;
    row.custom = cutText(custom.replace(/\s+/g, " ").trim(), 60) || undefined;
    writeIndex(rows);
    return true;
  });
}

export function removeIndexRow(id: string): boolean {
  return withIndexLock(() => {
    const rows = readIndex();
    if (!rows.some((r) => r.id === id)) return false;
    writeIndex(rows.filter((r) => r.id !== id));
    return true;
  });
}

export function slug(text: string, max = 40): string {
  const stop = new Set(["a", "an", "the", "can", "could", "we", "you", "i", "me", "my", "please", "to", "of", "in", "on", "for", "these", "this", "that", "is", "are", "do", "with", "and", "want", "would", "like", "us", "our", "let", "lets"]);
  const words = text.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, " ").split(/[\s_]+/).filter((w) => w && !stop.has(w));
  let out = "";
  for (const w of words) {
    if (out && (out + "-" + w).length > max) break;
    out = out ? `${out}-${w}` : w.slice(0, max);
  }
  return out;
}

function writable(dir: string): boolean {
  try {
    accessSync(dir, constants.W_OK);
    const probe = join(dir, `.cuvette-probe-${process.pid}`);
    writeFileSync(probe, "");
    rmSync(probe);
    return true;
  } catch {
    return false;
  }
}

function inGitRepo(dir: string): boolean {
  for (let d = resolve(dir); ; d = dirname(d)) {
    if (existsSync(join(d, ".git"))) return true;
    if (dirname(d) === d) return false;
  }
}

export function inProject(p: Place): boolean {
  return !p.legacy && !outside(p.outDir, p.project);
}

export function outputRoot(project: string, outputFolder: string): string {
  const v = outputFolder.trim().replace(/^~(?=[\\/]|$)/, homedir());
  return isAbsolute(v) ? v : join(project, v);
}

function writeMeta(p: Place): void {
  const meta: Meta = { id: p.id, title: p.title, created: p.created, ...(p.fallback ? { fallback: true } : {}), ...(inProject(p) ? { fromProject: relative(p.project, p.outDir).split(sep).join("/") } : { project: p.project }) };
  writeFileSync(join(p.recordDir, "meta.json"), JSON.stringify(meta, null, 1));
}

export function newPlace(project: string, outputFolder: string, id: string): Place {
  const created = new Date().toISOString();
  let root = outputRoot(project, outputFolder);
  let fallback = false;
  try {
    mkdirSync(root, { recursive: true });
  } catch {}
  if (!existsSync(root) || !writable(root)) {
    root = join(cuvetteHome(), "projects", slug(basename(project)) || "project");
    fallback = true;
  }
  const outDir = join(root, `.new-${id}`);
  const p: Place = { id, recordDir: join(outDir, ".record"), outDir, project, title: "", created, legacy: false, fallback };
  mkdirSync(p.recordDir, { recursive: true });
  if (inProject(p) && inGitRepo(project) && !existsSync(join(root, ".gitignore"))) writeFileSync(join(root, ".gitignore"), ".record/\n");
  writeMeta(p);
  saveIndexRow(p);
  return p;
}

export function legacyPlace(id: string, project: string): Place {
  const recordDir = join(cuvetteHome(), "sessions", id);
  return { id, recordDir, outDir: join(recordDir, "work"), project, title: "", created: "", legacy: true, fallback: false };
}

export function provisional(p: Place): boolean {
  return !p.legacy && basename(p.outDir).startsWith(".new-");
}

export function discardPlace(p: Place): void {
  if (!provisional(p)) return;
  if (!existsSync(p.outDir)) return;
  try {
    if (readdirSync(p.outDir).some((n) => n !== ".record")) return;
    rmSync(p.outDir, { recursive: true, force: true });
  } catch {}
  if (!existsSync(p.outDir)) removeIndexRow(p.id);
}

const dayOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function branchPlace(parent: Place, name: string, id: string): Place {
  if (parent.legacy) throw new Error("This session uses the old folder layout. A branch needs a session folder.");
  const d = new Date();
  const base = `${dayOf(d)}-${slug(name) || id}`;
  let dir = base;
  for (let i = 2; existsSync(join(dirname(parent.outDir), dir)); i++) dir = `${base}-${i}`;
  const outDir = join(dirname(parent.outDir), dir);
  const p: Place = { id, recordDir: join(outDir, ".record"), outDir, project: parent.project, title: name, created: d.toISOString(), legacy: false, fallback: parent.fallback };
  mkdirSync(p.recordDir, { recursive: true });
  writeMeta(p);
  writeFileSync(join(outDir, "README.txt"), README);
  saveIndexRow(p, { title: name, description: `Branch of ${parent.title || parent.id}` });
  return p;
}

export function titlePlace(p: Place, request: string, keepOldName: boolean): Place {
  const title = request.trim().split("\n")[0]!.slice(0, 120);
  const base = `${dayOf(p.created ? new Date(p.created) : new Date())}-${slug(title) || p.id}`;
  let name = base;
  for (let i = 2; existsSync(join(dirname(p.outDir), name)); i++) name = `${base}-${i}`;
  const outDir = join(dirname(p.outDir), name);
  renameSync(p.outDir, outDir);
  if (keepOldName) {
    try {
      symlinkSync(name, p.outDir);
    } catch {}
  }
  const next: Place = { ...p, outDir, recordDir: join(outDir, ".record"), title };
  writeMeta(next);
  writeFileSync(join(outDir, "README.txt"), README);
  saveIndexRow(next);
  return next;
}

export function placeAt(recordDir: string): Place | undefined {
  const metaPath = join(recordDir, "meta.json");
  if (!existsSync(metaPath)) return undefined;
  let m: Meta;
  try {
    m = JSON.parse(readFileSync(metaPath, "utf8"));
  } catch {
    return undefined;
  }
  if (!m || typeof m !== "object" || typeof m.id !== "string") return undefined;
  const outDir = dirname(recordDir);
  const project = typeof m.project === "string" ? m.project : (typeof m.fromProject === "string" && m.fromProject ? resolve(outDir, ...m.fromProject.split("/").map(() => "..")) : dirname(dirname(outDir)));
  return { id: m.id, recordDir, outDir, project, title: typeof m.title === "string" ? m.title : "", created: typeof m.created === "string" ? m.created : "", legacy: false, fallback: !!m.fallback };
}

function sessionsIn(folder: string): Place[] {
  if (!existsSync(folder) || !statSync(folder).isDirectory()) return [];
  return readdirSync(folder)
    .filter((d) => !lstatSync(join(folder, d)).isSymbolicLink())
    .map((d) => placeAt(join(folder, d, ".record")))
    .filter((p): p is Place => !!p);
}

function findUp(start: string, outputFolder: string): Place | undefined {
  for (let d = start; ; d = dirname(d)) {
    if (basename(d) === ".record") {
      const p = placeAt(d);
      if (p) return p;
    }
    const here = placeAt(join(d, ".record"));
    if (here) return here;
    const latest = d === start ? sessionsIn(outputRoot(d, outputFolder)).filter((p) => resolve(p.project) === resolve(d)).sort((a, b) => b.created.localeCompare(a.created))[0] : undefined;
    if (latest) return latest;
    if (dirname(d) === d) return undefined;
  }
}

function inIndex(project: string): Place | undefined {
  const rows = readIndex().filter((r) => r.project && resolve(r.project) === resolve(project)).sort((a, b) => b.date.localeCompare(a.date));
  for (const r of rows) {
    const p = placeAt(join(r.folder, ".record"));
    if (p && p.project && resolve(p.project) === resolve(project)) return p;
  }
  return undefined;
}

export function findPlace(ref: string, opts: { cwd?: string; outputFolder?: string } = {}): Place | undefined {
  const cwd = opts.cwd ?? process.cwd();
  const path = resolve(cwd, ref.replace(/^~(?=\/|$)/, process.env.HOME ?? "~"));
  if (ref.includes("/") || ref === "." || ref === ".." || isAbsolute(ref) || (existsSync(path) && statSync(path).isDirectory())) {
    if (!existsSync(path)) return undefined;
    if (existsSync(join(path, "log.jsonl")) && !existsSync(join(path, "meta.json"))) return { ...legacyPlace(basename(path), cwd), recordDir: path, outDir: join(path, "work") };
    const p = findUp(path, opts.outputFolder ?? "cuvette") ?? inIndex(path);
    if (p) saveIndexRow(p);
    return p;
  }
  const row = readIndex().find((r) => r.id === ref);
  if (row) {
    const p = placeAt(join(row.folder, ".record"));
    if (p) return p;
  }
  if (existsSync(join(cuvetteHome(), "sessions", ref, "log.jsonl"))) return legacyPlace(ref, cwd);
  return undefined;
}

export interface Listed extends IndexRow {
  moved: boolean;
  legacy: boolean;
}

export function listPlaces(): Listed[] {
  const rows: Listed[] = readIndex().map((r) => ({ ...r, moved: !existsSync(join(r.folder, ".record", "log.jsonl")) && !existsSync(join(r.folder, ".record", "meta.json")), legacy: false }));
  const old = join(cuvetteHome(), "sessions");
  if (existsSync(old)) {
    for (const id of readdirSync(old)) {
      if (rows.some((r) => r.id === id) || !existsSync(join(old, id, "log.jsonl"))) continue;
      rows.push({ id, project: "", folder: join(old, id), title: "", date: "", moved: false, legacy: true });
    }
  }
  return rows.sort((a, b) => (a.date || a.id).localeCompare(b.date || b.id));
}

export function portable(v: unknown, root: string | undefined): unknown {
  if (!root) return v;
  if (typeof v === "string") {
    if (!isAbsolute(v) || v.length > 4096 || v.includes("\n")) return v;
    const rel = relative(root, v);
    if (rel === "") return PROJECT_MARK;
    if (rel.startsWith("..") || isAbsolute(rel)) return v;
    return `${PROJECT_MARK}/${rel.split(sep).join("/")}`;
  }
  if (Array.isArray(v)) return v.map((x) => portable(x, root));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, portable(x, root)]));
  return v;
}

export function local(v: unknown, root: string | undefined): unknown {
  if (!root) return v;
  if (typeof v === "string") {
    if (v === PROJECT_MARK) return root;
    return v.startsWith(`${PROJECT_MARK}/`) ? join(root, ...v.slice(PROJECT_MARK.length + 1).split("/")) : v;
  }
  if (Array.isArray(v)) return v.map((x) => local(x, root));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, local(x, root)]));
  return v;
}

export function outside(path: string, project: string): boolean {
  const rel = relative(project, path);
  return rel.startsWith("..") || isAbsolute(rel);
}
