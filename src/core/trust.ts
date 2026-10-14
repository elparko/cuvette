import { createHash } from "node:crypto";
import { closeSync, constants, existsSync, fstatSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, readlinkSync, readSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { CATALOG_DIR, cuvetteHome } from "../adapters/manifest.ts";
import { plainText } from "./plain.ts";

export const PROJECT_DIRS = [".ga", ".cuvette"];
export const LAB_FILE = "LAB.md";
export const SETTINGS_FILES = ["settings.json", "settings.local.json"];
export const SAFE_KEYS = new Set(["animations", "input_keys", "openImages", "databook_paper", "databook_author"]);
export const MODEL_KEYS = ["think", "numCtx", "effort"];
export const TRUST_TITLE = "Trust this folder?";
export const TRUST_OPTIONS = [
  { value: "trust", label: "Trust this folder" },
  { value: "once", label: "Trust once (this session)" },
  { value: "no", label: "Do not trust (the session runs with user settings only)" },
];
const LISTED = new Set(["node_modules", ".venv", ".git"]);
const MAX_FILES = 2000;
const MAX_LISTED = 200_000;

export type TrustChoice = "trust" | "once" | "no";

export interface FolderScan {
  folder: string;
  files: Record<string, string>;
  hash: string;
  layers: Record<string, unknown>[];
  keys: string[];
  values: Record<string, unknown>;
  hooks: string[];
  adapters: { name: string; replaces?: string }[];
  methods: string[];
  linked: string[];
  incomplete: string[];
  bypass: boolean;
  lab?: string;
  labBig?: number;
  labProblem?: string;
}

export interface TrustEntry {
  path: string;
  hash: string;
  files: Record<string, string>;
  keys: string[];
  hooks: string[];
  adapters: string[];
  trusted: string;
}

export type TrustState = "none" | "trusted" | "once" | "new" | "changed";

export interface TrustStatus {
  state: TrustState;
  scan: FolderScan;
  changes: string[];
}

export function folderKey(folder: string): string {
  const p = resolve(folder);
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

function parse(path: string): Record<string, unknown> {
  try {
    const text = readFileSync(path, "utf8");
    if (!text.trim()) return {};
    const s = JSON.parse(text);
    if (!s || typeof s !== "object" || Array.isArray(s)) return {};
    if (typeof s.permissions === "string") {
      const { permissions, ...rest } = s;
      return { ...rest, permissionMode: permissions };
    }
    return s;
  } catch (e) {
    throw new Error(`settings file ${path} is not valid JSON: ${(e as Error).message}`);
  }
}

interface WalkState {
  files: Record<string, string>;
  count: number;
  incomplete: string[];
  linked: string[];
}

function readHash(p: string): string {
  try {
    return sha(readFileSync(p));
  } catch (e) {
    return `unreadable:${(e as NodeJS.ErrnoException).code ?? "error"}`;
  }
}

function linkHash(p: string): string {
  let target = "unreadable";
  try {
    target = readlinkSync(p);
  } catch {}
  let content = "dangling";
  try {
    content = statSync(p).isFile() ? readHash(p) : "folder";
  } catch {}
  return sha(`link:${target}:${content}`);
}

function listing(dir: string, key: string, st: WalkState): void {
  const h = createHash("sha256");
  let n = 0;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop()!;
    let names: string[] = [];
    try {
      names = readdirSync(d).sort();
    } catch {}
    for (const name of names) {
      const p = join(d, name);
      let l;
      try {
        l = lstatSync(p);
      } catch {
        continue;
      }
      if (++n > MAX_LISTED) {
        st.incomplete.push(`too many files in ${relative(key, dir)}`);
        st.files[`(listing) ${relative(key, dir)}`] = "too many files";
        return;
      }
      h.update(`${relative(key, p)}\0${l.size}\0${l.mtimeMs}\0${l.isSymbolicLink() ? "link" : ""}\n`);
      if (l.isDirectory()) stack.push(p);
    }
  }
  st.files[`(listing) ${relative(key, dir)}`] = h.digest("hex");
}

function walk(dir: string, key: string, st: WalkState, found: string[]): void {
  let names: string[] = [];
  try {
    names = readdirSync(dir).sort();
  } catch {
    st.files[`(unreadable folder) ${relative(key, dir)}`] = "unreadable";
    return;
  }
  for (const name of names) {
    const p = join(dir, name);
    const r = relative(key, p);
    let l;
    try {
      l = lstatSync(p);
    } catch {
      continue;
    }
    if (l.isSymbolicLink()) {
      st.files[`(link) ${r}`] = linkHash(p);
      let folder = false;
      try {
        folder = statSync(p).isDirectory();
      } catch {}
      if (folder) st.linked.push(r);
      continue;
    }
    if (l.isDirectory()) {
      if (LISTED.has(name)) listing(p, key, st);
      else walk(p, key, st, found);
      continue;
    }
    if (st.count >= MAX_FILES) {
      if (!st.incomplete.length) st.incomplete.push("too many files to check");
      continue;
    }
    st.count++;
    found.push(p);
    st.files[r] = readHash(p);
  }
}

export function projectSettingFiles(folder: string): { path: string; layer: Record<string, unknown> }[] {
  return PROJECT_DIRS.flatMap((d) => SETTINGS_FILES.map((f) => join(folder, d, f))).filter((p) => existsSync(p)).map((path) => ({ path, layer: parse(path) }));
}

export function projectSettings(folder: string): Record<string, unknown>[] {
  return projectSettingFiles(folder).map((f) => f.layer);
}

export function projectAdapterDirs(folder: string): string[] {
  return [...PROJECT_DIRS].reverse().map((d) => join(folder, d, "adapters"));
}

const quote = (a: string) => (/^[\w@%+=:,./-]+$/.test(a) ? a : `"${a.replace(/(["\\$`])/g, "\\$1")}"`);

function hookLines(layers: Record<string, unknown>[]): string[] {
  const out: string[] = [];
  for (const l of layers) {
    const hooks = l.hooks;
    if (!hooks || typeof hooks !== "object") continue;
    for (const [event, list] of Object.entries(hooks as Record<string, unknown>))
      for (const h of Array.isArray(list) ? list : []) {
        const cmd = Array.isArray(h?.command) ? h.command.map(String).map(quote).join(" ") : JSON.stringify(h?.command ?? h);
        out.push(`${event}${h?.matcher ? ` (${h.matcher})` : ""}: ${cmd}`);
      }
  }
  return out;
}

function shadows(name: string): string | undefined {
  if (existsSync(join(CATALOG_DIR, name, "adapter.yaml"))) return `the catalog adapter ${name}`;
  if (existsSync(join(cuvetteHome(), "adapters", name, "adapter.yaml"))) return `your adapter ${name}`;
  return undefined;
}

function safeNames(dir: string): string[] {
  try {
    return readdirSync(dir).sort();
  } catch {
    return [];
  }
}

const LAB_HIDDEN = "[\\x00-\\x08\\x0b-\\x1f\\x7f-\\x9f\\u2028\\u2029\\p{Default_Ignorable_Code_Point}]";
const LAB_ESCAPE_LOOKALIKE = "x[0-9a-f]{2}|u[0-9a-f]{4}|u\\{[0-9A-F]{5,6}\\}";
const LAB_CONTROL = new RegExp(`(?<!\\\\)(\\\\+)(?=${LAB_ESCAPE_LOOKALIKE}|${LAB_HIDDEN})|${LAB_HIDDEN}`, "gu");

// The trust card and the system prompt use this one text, so the scientist reads what the model gets.
// A backslash in front of text that looks like one of these escapes is doubled, so two different texts never show the same.
export function labDisplayText(text: string): string {
  return text.replace(LAB_CONTROL, (c, run?: string) => {
    if (run !== undefined) return run + run;
    const n = c.codePointAt(0)!;
    return n < 256 ? `\\x${n.toString(16).padStart(2, "0")}` : n < 0x10000 ? `\\u${n.toString(16).padStart(4, "0")}` : `\\u{${n.toString(16).toUpperCase()}}`;
  });
}

export const LAB_MAX_BYTES = 64 * 1024;
export const LAB_CARD_LINES = 60;
export const LAB_CARD_CHARS = 8000;

function readLab(path: string): { bytes?: Buffer; big?: number; problem?: string } {
  let fd: number | undefined;
  try {
    fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
    const st = fstatSync(fd);
    if (!st.isFile()) return {};
    if (st.size > LAB_MAX_BYTES) return { big: st.size };
    const buf = Buffer.alloc(st.size);
    let n = 0;
    while (n < buf.length) {
      const got = readSync(fd, buf, n, buf.length - n, n);
      if (!got) break;
      n += got;
    }
    return { bytes: buf.subarray(0, n) };
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    return code === "ENOENT" || code === "ELOOP" || code === "ENOTDIR" ? {} : { problem: (e as Error).message };
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

export const labLong = (s: FolderScan) => !!s.lab && (s.lab.split("\n").length > LAB_CARD_LINES || s.lab.length > LAB_CARD_CHARS);

export function scanFolder(folder: string): FolderScan {
  const key = folderKey(folder);
  const { bytes: labBytes, big: labBig, problem: labProblem } = readLab(join(key, LAB_FILE));
  const lab = labBytes ? labDisplayText(labBytes.toString("utf8").replace(/\r\n?/g, "\n").trim()) : "";
  if (!PROJECT_DIRS.some((d) => existsSync(join(key, d))) && !lab && !labBig && !labProblem) return { folder: key, files: {}, hash: "", layers: [], keys: [], values: {}, hooks: [], adapters: [], methods: [], linked: [], incomplete: [], bypass: false };
  const files: Record<string, string> = {};
  const paths: string[] = [];
  const methods: string[] = [];
  const linked: string[] = [];
  const incomplete: string[] = [];
  for (const d of PROJECT_DIRS) {
    for (const f of SETTINGS_FILES) if (existsSync(join(key, d, f))) paths.push(join(key, d, f));
    for (const part of ["adapters", "methods", "skills"]) {
      const dir = join(key, d, part);
      const st = lstatSync(dir, { throwIfNoEntry: false });
      if (!st) continue;
      if (st.isSymbolicLink()) {
        linked.push(relative(key, dir));
        continue;
      }
      if (!st.isDirectory()) continue;
      const found: string[] = [];
      const state: WalkState = { files, count: 0, incomplete, linked };
      walk(dir, key, state, found);
      if (part === "methods") methods.push(...found.filter((f) => f.endsWith(".json")).map((f) => basename(f, ".json")));
    }
  }
  if (labBytes) files[LAB_FILE] = sha(labBytes);
  else if (labBig) files[LAB_FILE] = sha(`too large ${labBig}`);
  for (const p of paths) files[relative(key, p)] = readHash(p);
  for (const l of linked) files[`(linked folder) ${l}`] = linkHash(join(key, l));
  const layers = projectSettings(key);
  const values: Record<string, unknown> = {};
  for (const l of layers) Object.assign(values, l);
  const keys = Object.keys(values).filter((k) => !SAFE_KEYS.has(k));
  const adapters: FolderScan["adapters"] = [];
  for (const dir of projectAdapterDirs(key))
    if (existsSync(dir) && !lstatSync(dir).isSymbolicLink())
      for (const n of safeNames(dir))
        if (existsSync(join(dir, n, "adapter.yaml")) && !adapters.some((a) => a.name === n)) adapters.push({ name: n, replaces: shadows(n) });
  const hash = sha(Object.entries(files).map(([p, h]) => `${p}\0${h}\n`).join(""));
  return { folder: key, files, hash, layers, keys, values, hooks: hookLines(layers), adapters, methods, linked, incomplete: [...new Set(incomplete)], bypass: values.permissionMode === "bypass", ...(lab ? { lab } : {}), ...(labBig ? { labBig } : {}), ...(labProblem ? { labProblem } : {}) };
}

export const needsTrust = (s: FolderScan) => s.keys.length > 0 || s.hooks.length > 0 || s.adapters.length > 0 || s.methods.length > 0 || !!s.lab || !!s.labBig;

function userFile(): string {
  return join(cuvetteHome(), "settings.json");
}

function readUser(): Record<string, unknown> {
  try {
    const v = JSON.parse(readFileSync(userFile(), "utf8"));
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export function trustedFolders(): TrustEntry[] {
  const list = readUser().trusted_folders;
  return Array.isArray(list) ? (list.filter((e) => e && typeof e.path === "string") as TrustEntry[]) : [];
}

export function assertUserFileSound(): void {
  const text = existsSync(userFile()) ? readFileSync(userFile(), "utf8") : "";
  if (text.trim()) {
    let v: unknown;
    try {
      v = JSON.parse(text);
    } catch (e) {
      throw new Error(`settings file ${userFile()} is not valid JSON: ${(e as Error).message}. Cuvette did not change it. Correct the file, then try again.`);
    }
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error(`settings file ${userFile()} must hold one JSON object, in braces { }. Cuvette did not change it. Correct the file, then try again.`);
  }
}

function writeTrusted(list: TrustEntry[]): void {
  assertUserFileSound();
  const data = readUser();
  if (list.length) data.trusted_folders = list;
  else delete data.trusted_folders;
  mkdirSync(dirname(userFile()), { recursive: true });
  writeFileSync(userFile(), JSON.stringify(data, null, 2) + "\n");
}

const once = new Map<string, number>();

export function trustOnce(folder: string): void {
  const k = folderKey(folder);
  once.set(k, (once.get(k) ?? 0) + 1);
}

export function endTrustOnce(folder: string): void {
  const k = folderKey(folder);
  const n = (once.get(k) ?? 0) - 1;
  if (n > 0) once.set(k, n);
  else once.delete(k);
}

export function trustFolder(folder: string): TrustEntry {
  const s = scanFolder(folder);
  const refused = untrustable(s);
  if (refused) throw new Error(refused);
  const entry: TrustEntry = { path: s.folder, hash: s.hash, files: s.files, keys: s.keys, hooks: s.hooks, adapters: s.adapters.map((a) => a.name), trusted: new Date().toISOString() };
  writeTrusted([...trustedFolders().filter((e) => e.path !== s.folder), entry]);
  return entry;
}

export function untrustFolder(folder: string): boolean {
  const k = folderKey(folder);
  const list = trustedFolders();
  const rest = list.filter((e) => e.path !== k && e.path !== resolve(folder));
  once.delete(k);
  if (rest.length !== list.length) writeTrusted(rest);
  return rest.length !== list.length;
}

function changesSince(e: TrustEntry, s: FolderScan): string[] {
  const out: string[] = [];
  for (const k of s.keys) if (!e.keys?.includes(k)) out.push(`new settings key: ${k}`);
  for (const h of s.hooks) if (!e.hooks?.includes(h)) out.push(`new hook: ${h}`);
  for (const a of s.adapters) if (!e.adapters?.includes(a.name)) out.push(`new adapter: ${a.name}`);
  for (const [p, h] of Object.entries(s.files)) if (!e.files?.[p]) out.push(`new file: ${p}`);
  else if (e.files[p] !== h) out.push(`changed file: ${p}`);
  for (const p of Object.keys(e.files ?? {})) if (!(p in s.files)) out.push(`removed file: ${p}`);
  return out;
}

export function trustStatus(folder: string): TrustStatus {
  const scan = scanFolder(folder);
  if (scan.linked.length || scan.incomplete.length) return { state: "changed", scan, changes: [...scan.linked.map((p) => `The project cannot be trusted while it has a linked folder: ${p}. Replace the link with a copy of the folder.`), ...scan.incomplete.map((r) => `${r}. Cuvette cannot check the folder, so it does not trust it.`)] };
  if (!needsTrust(scan)) return { state: "none", scan, changes: [] };
  if (once.has(scan.folder)) return { state: "once", scan, changes: [] };
  const e = trustedFolders().find((x) => x.path === scan.folder);
  if (!e) return { state: "new", scan, changes: [] };
  if (e.hash === scan.hash) return { state: "trusted", scan, changes: [] };
  return { state: "changed", scan, changes: changesSince(e, scan) };
}

export function untrustable(scan: FolderScan): string | undefined {
  const reasons = [...scan.linked.map((p) => `the linked folder ${p}`), ...scan.incomplete];
  return reasons.length ? `Cuvette cannot trust this folder: ${reasons.join("; ")}. Remove the link or the extra files, then try again.` : undefined;
}

export function folderTrusted(folder: string): boolean {
  const s = trustStatus(folder).state;
  return s === "trusted" || s === "once";
}

export function safeOnly(layer: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(layer).filter(([k]) => SAFE_KEYS.has(k)));
}

export function afterProjectWrite(folder: string, before: TrustState): void {
  if (before === "trusted" || before === "none") {
    const s = scanFolder(folder);
    if (needsTrust(s)) trustFolder(folder);
  }
}

const shellQuote = (p: string) => (/^[\w@%+=:,./-]+$/.test(p) ? p : `"${p.replace(/(["\\$`])/g, "\\$1")}"`);

const show = (v: unknown) => {
  const t = labDisplayText(typeof v === "string" ? v : JSON.stringify(v));
  return t.length > 200 ? t.slice(0, 199) + "…" : t;
};

export function folderLines(s: FolderScan, trusted = false): string[] {
  const out: string[] = [];
  if (s.keys.length) out.push("Settings that would change:", ...s.keys.map((k) => `  ${labDisplayText(k)}: ${show(s.values[k])}`));
  out.push(s.bypass ? "Bypass permissions: ON. Tool calls would run with no permission card." : "Bypass permissions: not set.");
  if (s.hooks.length) out.push("Hooks (each command runs on this computer):", ...s.hooks.map((h) => `  ${labDisplayText(h)}`));
  if (s.adapters.length) out.push("Adapters (their code runs on this computer):", ...s.adapters.map((a) => `  ${labDisplayText(a.name)}${a.replaces ? `: replaces ${labDisplayText(a.replaces)}` : ""}`));
  if (s.methods.length) out.push("Methods (they fill in the questions and settings of a new session):", ...s.methods.map((m) => `  ${labDisplayText(m)}`));
  const labPath = labDisplayText(join(s.folder, LAB_FILE));
  if (s.labBig) out.push(`LAB.md is too large (${s.labBig} bytes, the limit is ${LAB_MAX_BYTES}). Cuvette does not read it. Read the file at ${labPath}.`);
  if (s.labProblem) out.push(`LAB.md could not be read: ${labDisplayText(s.labProblem)}. Cuvette ignores it.`);
  if (s.lab && labLong(s)) out.push(`Lab rules in LAB.md: ${s.lab.split("\n").length} lines, ${s.lab.length} characters. This is too long to show here. Read the file at ${labPath}.${trusted ? "" : ` Then run: cuvette trust add ${labDisplayText(shellQuote(s.folder))}`}`);
  else if (s.lab) out.push("Lab rules in LAB.md (they go into the instructions of the agent):", ...s.lab.split("\n").map((l) => `  ${l}`));
  return out.map(plainText);
}

export function trustText(t: TrustStatus): string {
  return t.state === "changed"
    ? `The Cuvette files in ${t.scan.folder} changed after you trusted this folder. Cuvette ignores them until you trust the folder again.`
    : `The folder ${t.scan.folder} has its own Cuvette settings, hooks, adapters or lab rules (LAB.md). They can run programs on this computer or change the instructions of the agent. Cuvette ignores them until you trust the folder.`;
}

export function trustEvidence(t: TrustStatus): string {
  const lines = folderLines(t.scan);
  if (t.changes.length) lines.push("Changes since you trusted the folder:", ...t.changes.map((c) => `  ${labDisplayText(c)}`));
  return lines.join("\n");
}

export function untrustedNotice(t: TrustStatus): string {
  return `Cuvette ignored the settings, hooks and adapters in ${t.scan.folder}: the folder is not trusted${t.state === "changed" ? " since its files changed" : ""}. Use --trust-folder, or cuvette trust add ${shellQuote(t.scan.folder)}.${t.scan.lab ? " Cuvette also ignored LAB.md." : ""}`;
}

export function stateLabel(t: TrustStatus): string {
  return t.state === "none" ? "no folder settings" : t.state === "trusted" ? "trusted" : t.state === "once" ? "trust once" : t.state === "changed" ? "not trusted (files changed)" : "not trusted";
}

export function checkoutModelOptions(checkout: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const l of projectSettings(checkout)) for (const k of MODEL_KEYS) if (k in l) out[k] = l[k];
  return out;
}
