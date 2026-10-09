import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { CATALOG_DIR, gaHome } from "../adapters/manifest.ts";

export const PROJECT_DIRS = [".ga", ".cuvette"];
export const SETTINGS_FILES = ["settings.json", "settings.local.json"];
export const SAFE_KEYS = new Set(["animations", "input_keys", "openImages", "databook_paper", "databook_author"]);
export const MODEL_KEYS = ["think", "numCtx", "effort"];
export const TRUST_TITLE = "Trust this folder?";
export const TRUST_OPTIONS = [
  { value: "trust", label: "Trust this folder" },
  { value: "once", label: "Trust once (this session)" },
  { value: "no", label: "Do not trust (the session runs with user settings only)" },
];
const SKIP = new Set(["node_modules", "__pycache__", ".venv", ".git"]);
const MAX_FILES = 2000;

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
  bypass: boolean;
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
    const s = JSON.parse(readFileSync(path, "utf8"));
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

function walk(dir: string, out: string[]): void {
  if (out.length >= MAX_FILES) return;
  for (const name of readdirSync(dir).sort()) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const st = lstatSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
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
  if (existsSync(join(gaHome(), "adapters", name, "adapter.yaml"))) return `your adapter ${name}`;
  return undefined;
}

export function scanFolder(folder: string): FolderScan {
  const key = folderKey(folder);
  if (!PROJECT_DIRS.some((d) => existsSync(join(key, d)))) return { folder: key, files: {}, hash: "", layers: [], keys: [], values: {}, hooks: [], adapters: [], methods: [], bypass: false };
  const files: Record<string, string> = {};
  const paths: string[] = [];
  const methods: string[] = [];
  for (const d of PROJECT_DIRS) {
    for (const f of SETTINGS_FILES) if (existsSync(join(key, d, f))) paths.push(join(key, d, f));
    const a = join(key, d, "adapters");
    if (existsSync(a) && lstatSync(a).isDirectory()) walk(a, paths);
    const m = join(key, d, "methods");
    if (!existsSync(m) || !lstatSync(m).isDirectory()) continue;
    const found: string[] = [];
    walk(m, found);
    paths.push(...found);
    methods.push(...found.filter((f) => f.endsWith(".json")).map((f) => basename(f, ".json")));
  }
  for (const p of paths) files[relative(key, p)] = sha(readFileSync(p));
  const layers = projectSettings(key);
  const values: Record<string, unknown> = {};
  for (const l of layers) Object.assign(values, l);
  const keys = Object.keys(values).filter((k) => !SAFE_KEYS.has(k));
  const adapters: FolderScan["adapters"] = [];
  for (const dir of projectAdapterDirs(key))
    if (existsSync(dir))
      for (const n of readdirSync(dir).sort())
        if (existsSync(join(dir, n, "adapter.yaml")) && !adapters.some((a) => a.name === n)) adapters.push({ name: n, replaces: shadows(n) });
  const hash = sha(Object.entries(files).map(([p, h]) => `${p}\0${h}\n`).join(""));
  return { folder: key, files, hash, layers, keys, values, hooks: hookLines(layers), adapters, methods, bypass: values.permissionMode === "bypass" };
}

export const needsTrust = (s: FolderScan) => s.keys.length > 0 || s.hooks.length > 0 || s.adapters.length > 0 || s.methods.length > 0;

function userFile(): string {
  return join(gaHome(), "settings.json");
}

function readUser(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(userFile(), "utf8"));
  } catch {
    return {};
  }
}

export function trustedFolders(): TrustEntry[] {
  const list = readUser().trusted_folders;
  return Array.isArray(list) ? (list.filter((e) => e && typeof e.path === "string") as TrustEntry[]) : [];
}

function writeTrusted(list: TrustEntry[]): void {
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
  if (!needsTrust(scan)) return { state: "none", scan, changes: [] };
  if (once.has(scan.folder)) return { state: "once", scan, changes: [] };
  const e = trustedFolders().find((x) => x.path === scan.folder);
  if (!e) return { state: "new", scan, changes: [] };
  if (e.hash === scan.hash) return { state: "trusted", scan, changes: [] };
  return { state: "changed", scan, changes: changesSince(e, scan) };
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

const show = (v: unknown) => {
  const t = typeof v === "string" ? v : JSON.stringify(v);
  return t.length > 200 ? t.slice(0, 199) + "…" : t;
};

export function folderLines(s: FolderScan): string[] {
  const out: string[] = [];
  if (s.keys.length) out.push("Settings that would change:", ...s.keys.map((k) => `  ${k}: ${show(s.values[k])}`));
  out.push(s.bypass ? "Bypass permissions: ON. Tool calls would run with no permission card." : "Bypass permissions: not set.");
  if (s.hooks.length) out.push("Hooks (each command runs on this computer):", ...s.hooks.map((h) => `  ${h}`));
  if (s.adapters.length) out.push("Adapters (their code runs on this computer):", ...s.adapters.map((a) => `  ${a.name}${a.replaces ? `: replaces ${a.replaces}` : ""}`));
  if (s.methods.length) out.push("Methods (they fill in the questions and settings of a new session):", ...s.methods.map((m) => `  ${m}`));
  return out;
}

export function trustText(t: TrustStatus): string {
  return t.state === "changed"
    ? `The Cuvette files in ${t.scan.folder} changed after you trusted this folder. Cuvette ignores them until you trust the folder again.`
    : `The folder ${t.scan.folder} has its own Cuvette settings, hooks or adapters. They can run programs on this computer. Cuvette ignores them until you trust the folder.`;
}

export function trustEvidence(t: TrustStatus): string {
  const lines = folderLines(t.scan);
  if (t.changes.length) lines.push("Changes since you trusted the folder:", ...t.changes.map((c) => `  ${c}`));
  return lines.join("\n");
}

export function untrustedNotice(t: TrustStatus): string {
  return `Cuvette ignored the settings, hooks and adapters in ${t.scan.folder}: the folder is not trusted${t.state === "changed" ? " since its files changed" : ""}. Use --trust-folder, or ga trust add ${t.scan.folder}.`;
}

export function stateLabel(t: TrustStatus): string {
  return t.state === "none" ? "no folder settings" : t.state === "trusted" ? "trusted" : t.state === "once" ? "trust once" : t.state === "changed" ? "not trusted (files changed)" : "not trusted";
}

export function checkoutModelOptions(checkout: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const l of projectSettings(checkout)) for (const k of MODEL_KEYS) if (k in l) out[k] = l[k];
  return out;
}
