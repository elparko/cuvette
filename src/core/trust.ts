import { createHash } from "node:crypto";
import { harnessWrite } from "./harness-writes.ts";
import { closeSync, constants, existsSync, fstatSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, readlinkSync, readSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { CATALOG_DIR, cuvetteHome } from "../adapters/manifest.ts";
import { plainText } from "./plain.ts";
import { outputRoot } from "./places.ts";

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
const LISTED = new Set(["node_modules", ".venv"]);
const CACHE_NAMES = new Set([".pytest_cache"]);
const skipped = (dir: string, name: string) => CACHE_NAMES.has(name) || (name === ".cache" && basename(dir) === "node_modules");
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
  bigScripts?: string[];
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
  root: string;
  top: string;
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

function scriptHash(p: string): string {
  try {
    const st = statSync(p);
    if (st.size > SCRIPT_SIZE_CAP) return sha(`large:${st.size}:${st.mtimeMs}`);
  } catch {}
  return readHash(p);
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

function leavesRoot(p: string, root: string): boolean {
  try {
    const real = realpathSync(p);
    const rel = relative(root, real);
    return statSync(real).isDirectory() && (rel.startsWith("..") || isAbsolute(rel));
  } catch {
    return false;
  }
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
      if (skipped(d, name)) continue;
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
      if (l.isSymbolicLink() && leavesRoot(p, st.root)) st.linked.push(relative(key, p));
      h.update(`${relative(key, p)}\0${l.size}\0${l.mtimeMs}\0${l.isSymbolicLink() ? linkHash(p) : ""}\n`);
      if (l.isDirectory()) stack.push(p);
    }
  }
  st.files[`(listing) ${relative(key, dir)}`] = h.digest("hex");
}

function gitFolder(git: string, key: string, st: WalkState, found: string[]): void {
  const config = join(git, "config");
  if (existsSync(config)) st.files[relative(key, config)] = readHash(config);
  const hooks = join(git, "hooks");
  const l = lstatSync(hooks, { throwIfNoEntry: false });
  if (l?.isSymbolicLink()) {
    st.files[`(link) ${relative(key, hooks)}`] = linkHash(hooks);
    if (statSync(hooks, { throwIfNoEntry: false })?.isDirectory()) st.linked.push(relative(key, hooks));
  } else if (l?.isDirectory()) walk(hooks, key, st, []);
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
    if (skipped(dir, name)) continue;
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
      if (name === ".git" && dir !== st.top) gitFolder(p, key, st, found);
      else if (LISTED.has(name)) listing(p, key, st);
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

const LAUNCHER = /^(sh|bash|zsh|dash|ksh|fish|python[\d.]*|node|nodejs|ruby|perl|php|deno|bun|tsx|Rscript|pwsh|powershell|env|uv|npx|pnpx|bunx|npm|pnpm|yarn|cmd|exec|time|nice|xargs|source)(\.exe)?$/i;
const RUN_AFTER = /^(uv|npm|pnpm|yarn|bun)(\.exe)?$/i;
const DENY_EXT = /\.(log|json|txt|csv|tsv|db|sqlite|out|md|png|jpg|pdf|xlsx|parquet)$/i;
const SCRIPT_EXT = /\.(js|mjs|cjs|ts|py|sh|bash|zsh|rb|pl|r|ps1|bat|cmd)$/i;
const FOLDER_EXT = /\.(js|mjs|cjs|ts|py|sh)$/i;
const VOLATILE_DIR = /^(logs?|state|caches?|\.cache|tmp|temp|__pycache__)$/i;
const SKIPPED_DIR = /^(node_modules|\.venv|\.record)$/i;
const FOLDER_FILE_LIMIT = 50;
const SCRIPT_FOLDER_LIMIT = 200;
const SCRIPT_SIZE_CAP = 2 * 1024 * 1024;

function moduleFiles(name: string): string[] {
  const parts = name.split(".");
  const base = parts.join("/");
  const parents = parts.slice(0, -1).map((_, i) => `${parts.slice(0, i + 1).join("/")}/__init__.py`);
  return [...parents, `${base}.py`, `${base}/__init__.py`, `${base}/__main__.py`];
}

interface Token {
  word: string;
  allowed: boolean;
  module?: boolean;
  base: string[];
}

function segments(text: string): string[][] {
  return text.split(/[;&|()`\n]+/).map((seg) => seg.split(/["'\s]+/).filter(Boolean)).filter((w) => w.length);
}

function tokens(argv: string[], key: string): Token[] {
  const out: Token[] = [];
  const bases = [key];
  const walk = (words: string[]) => {
    let allowed = true;
    let afterLauncher = "";
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      if (allowed && /^\w+=/.test(w) && !afterLauncher) {
        for (const part of w.slice(w.indexOf("=") + 1).split(/[=:]/)) if (part) out.push({ word: part, allowed: false, base: [...bases] });
        continue;
      }
      if (w === "cd" || w === "pushd") {
        const next = words[i + 1];
        if (next) bases.push(resolve(bases.at(-1)!, next));
        i++;
        continue;
      }
      if (w === "-m" && afterLauncher && words[i + 1]) {
        for (const f of moduleFiles(words[i + 1]!)) out.push({ word: f, allowed: true, base: [...bases] });
        i++;
        continue;
      }
      if (/^\/[ck]$/i.test(w) || (w === "run" && RUN_AFTER.test(afterLauncher))) continue;
      const opt = w.startsWith("-");
      for (const part of [...(opt ? [] : [w]), ...w.split(/[=:]/)]) if (part && !part.startsWith("-")) out.push({ word: part, allowed: allowed && !opt && part === w, base: [...bases] });
      if (opt) continue;
      if (LAUNCHER.test(basename(w))) {
        afterLauncher = basename(w);
        continue;
      }
      allowed = false;
      afterLauncher = "";
    }
  };
  walk(argv);
  argv.forEach((a, i) => {
    if (i === 0 || !/[\s;&|()`"']/.test(a)) return;
    for (const seg of segments(a)) walk(seg);
  });
  return out;
}

function namedFiles(script: string, key: string, skip: (rel: string) => boolean): string[] {
  let text = "";
  try {
    text = statSync(script).size < 256 * 1024 ? readFileSync(script, "utf8") : "";
  } catch {}
  const out: string[] = [];
  for (const m of text.matchAll(/[\w./-]+\.(?:js|mjs|cjs|ts|py|sh)\b/g)) {
    const path = resolve(dirname(script), m[0]);
    const rel = relative(key, path);
    if (path === script || rel.startsWith("..") || isAbsolute(rel) || skip(rel)) continue;
    try {
      if (statSync(path).isFile()) out.push(path);
    } catch {}
  }
  return out;
}

const WALK_ENTRIES = 5000;
const WALK_DEPTH = 8;
const GLOB_CAP = 500;
const MANIFEST = /(^|[\\/])(package(-lock)?\.json|pyproject\.toml|requirements\.txt)$/i;
const NODE_EXT = [".js", ".mjs", ".cjs", ".ts"];

interface Walk {
  files: string[];
  count: number;
  exceeded: boolean;
  outside: string[];
  inLinks: string[];
}

function isExec(p: string): boolean {
  try {
    return process.platform !== "win32" && (statSync(p).mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

function escapes(p: string, realKey: string): boolean {
  try {
    const rel = relative(realKey, realpathSync(p));
    return rel.startsWith("..") || isAbsolute(rel);
  } catch {
    return true;
  }
}

function walkFiles(dir: string, skip: (rel: string) => boolean, key: string, realKey: string): Walk {
  const out: Walk = { files: [], count: 0, exceeded: false, outside: [], inLinks: [] };
  let entries = 0;
  const visit = (d: string, depth: number) => {
    let names: string[];
    try {
      names = readdirSync(d).sort();
    } catch {
      return;
    }
    for (const name of names) {
      if (out.exceeded) return;
      const p = join(d, name);
      if (name.startsWith(".") || SKIPPED_DIR.test(name) || VOLATILE_DIR.test(name) || skip(relative(key, p))) continue;
      if (++entries > WALK_ENTRIES) {
        out.exceeded = true;
        return;
      }
      let l;
      try {
        l = lstatSync(p);
      } catch {
        continue;
      }
      if (l.isSymbolicLink()) {
        if (escapes(p, realKey)) out.outside.push(relative(key, p));
        else out.inLinks.push(p);
        continue;
      }
      if (l.isDirectory()) {
        if (depth >= WALK_DEPTH) out.exceeded = true;
        else visit(p, depth + 1);
      } else {
        out.count++;
        out.files.push(p);
      }
    }
  };
  visit(dir, 0);
  return out;
}

const scriptLike = (f: string) => SCRIPT_EXT.test(f) || MANIFEST.test(f) || (!/\.[^./\\]+$/.test(f) && isExec(f));

function codeFolder(dir: string, skip: (rel: string) => boolean, key: string, realKey: string): string[] | undefined {
  try {
    if (readdirSync(dir).includes("node_modules")) return undefined;
  } catch {
    return undefined;
  }
  const r = walkFiles(dir, skip, key, realKey);
  if (r.exceeded || r.count > FOLDER_FILE_LIMIT) return undefined;
  return r.files.filter((f) => FOLDER_EXT.test(f) || MANIFEST.test(f));
}

function globRegex(pattern: string): RegExp {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]!;
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        re += ".*";
        i++;
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else if (c === "{") re += "(?:";
    else if (c === "}") re += ")";
    else if (c === ",") re += pattern.slice(0, i).split("{").length > pattern.slice(0, i).split("}").length ? "|" : ",";
    else if (c === "[" || c === "]") re += c;
    else re += c.replace(/[.+^$()|\\]/g, "\\$&");
  }
  try {
    return new RegExp(`^${re}$`);
  } catch {
    return /^$/;
  }
}

const hasGlob = (w: string) => /[*?[\]{}]/.test(w);
const DYNAMIC = /\$\(|`|\beval\b|\b(source|\.)\s+["']?\$|(^|[\s;&|])["']?\$\{?\w/;

function userOutputFolder(): string | undefined {
  try {
    const v = JSON.parse(readFileSync(join(cuvetteHome(), "settings.json"), "utf8"))?.output_folder;
    return typeof v === "string" && v.trim() ? v : undefined;
  } catch {
    return undefined;
  }
}

export interface HookScan {
  files: string[];
  large: string[];
  linked: string[];
  incomplete: string[];
  linkText: Record<string, string>;
}

export function hookScriptScan(folder: string, layers?: Record<string, unknown>[]): HookScan {
  const key = folderKey(folder);
  const found = new Set<string>();
  const result: HookScan = { files: [], large: [], linked: [], incomplete: [], linkText: {} };
  try {
    layers ??= projectSettings(key);
  } catch {
    return result;
  }
  let realKey = key;
  try {
    realKey = realpathSync(key);
  } catch {}
  const commands: string[][] = [];
  for (const l of layers) {
    const hooks = l.hooks;
    if (!hooks || typeof hooks !== "object") continue;
    for (const list of Object.values(hooks as Record<string, unknown>))
      for (const h of Array.isArray(list) ? list : []) if (Array.isArray(h?.command)) commands.push(h.command.map(String));
  }
  const all = commands.map((c) => ({ argv: c, tokens: tokens(c, key), dynamic: DYNAMIC.test(c.join(" ")) }));
  const named: string[] = [];
  for (const c of all) for (const t of c.tokens) for (const b of t.base) named.push(resolve(b, t.word.replace(/[*?[\]{}].*$/, "")));
  const roots = [resolve(key, "cuvette")];
  const userRoots: string[] = [];
  const userValue = userOutputFolder();
  if (userValue && !isAbsolute(userValue) && !userValue.split(/[\\/]/).includes("..") && resolve(key, userValue) !== key) {
    const root = resolve(key, userValue);
    if (!named.some((n) => n === root || n.startsWith(root + sep))) userRoots.push(root);
  }
  const namedSet = new Set(named);
  const skip = (rel: string) => {
    const abs = resolve(key, rel);
    const parts = rel.split(sep);
    if (parts.some((part) => SKIPPED_DIR.test(part))) return true;
    if (parts[0] === ".git" && parts[1] !== "hooks") return true;
    if (roots.some((r) => abs === r || abs.startsWith(r + sep))) return true;
    return !namedSet.has(abs) && userRoots.some((r) => abs === r || abs.startsWith(r + sep));
  };
  const own = (d: string) => d !== key && !skip(relative(key, d));
  const link = (rel: string, real: string) => {
    result.linked.push(rel);
    result.linkText[rel] = real;
  };
  const addFolder = (path: string, rel: string) => {
    const r = walkFiles(path, skip, key, realKey);
    for (const o of r.outside) result.linked.push(o);
    if (r.exceeded) {
      result.incomplete.push(`Too many files in the script folder ${rel}`);
      return;
    }
    if (r.count > SCRIPT_FOLDER_LIMIT) result.large.push(rel.split(sep).join("/"));
    for (const f of r.files.filter(scriptLike).slice(0, SCRIPT_FOLDER_LIMIT)) found.add(f);
  };
  const addFile = (path: string) => {
    found.add(path);
    if (!FOLDER_EXT.test(path)) return;
    const d = dirname(path);
    for (const f of own(d) ? codeFolder(d, skip, key, realKey) ?? [] : namedFiles(path, key, skip)) found.add(f);
  };
  const consider = (path: string, t: Token, glob = false) => {
    const rel = relative(key, path);
    if (rel === "" || rel.startsWith("..") || isAbsolute(rel) || skip(rel)) return;
    let real: string;
    try {
      real = realpathSync(path);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ELOOP") link(rel, "loop");
      return;
    }
    const inside = relative(realKey, real);
    if (inside.startsWith("..") || isAbsolute(inside)) return link(rel, real);
    let st;
    try {
      st = statSync(path);
    } catch {
      return;
    }
    if (st.isFile()) {
      if (!t.allowed && !glob && (DENY_EXT.test(path) && !MANIFEST.test(path) || st.size === 0 || rel.split(sep).some((part) => VOLATILE_DIR.test(part)))) return;
      if (glob && DENY_EXT.test(path) && !MANIFEST.test(path)) return;
      addFile(path);
    } else if (st.isDirectory() && own(path)) addFolder(path, rel);
  };
  for (const c of all) {
    for (const t of c.tokens) {
      for (const base of t.base) {
        const path = resolve(base, t.word);
        if (hasGlob(t.word)) {
          const rel = relative(key, path);
          if (rel.startsWith("..") || isAbsolute(rel)) continue;
          const prefix = resolve(base, t.word.split(/[/\\]/).filter((_, i, a) => !a.slice(0, i + 1).some(hasGlob)).join("/"));
          const re = globRegex(relative(key, path).split(sep).join("/"));
          let matches = 0;
          const w = walkFiles(prefix, skip, key, realKey);
          if (w.exceeded) result.incomplete.push(`Too many files in the script folder ${relative(key, prefix) || "."}`);
          for (const o of w.outside) {
            if (!re.test(o.split(sep).join("/"))) continue;
            result.linked.push(o);
            try {
              result.linkText[o] = realpathSync(resolve(key, o));
            } catch {
              result.linkText[o] = "unreadable";
            }
          }
          for (const f of [...w.files, ...w.inLinks]) {
            if (matches >= GLOB_CAP) break;
            if (re.test(relative(key, f).split(sep).join("/"))) {
              matches++;
              consider(f, t, true);
            }
          }
          if ((!matches || c.dynamic) && prefix !== key && existsSync(prefix)) consider(prefix, t);
          continue;
        }
        let target = path;
        if (!existsSync(target)) {
          const ext = NODE_EXT.find((e) => existsSync(path + e));
          if (ext) target = path + ext;
        }
        consider(target, t);
      }
    }
  }
  result.files = [...found];
  result.large = [...new Set(result.large)];
  result.linked = [...new Set(result.linked)];
  return result;
}

export function hookScripts(folder: string, layers?: Record<string, unknown>[]): string[] {
  return hookScriptScan(folder, layers).files;
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
// The function doubles a backslash in front of text that looks like one of these escapes. Then two different texts never show the same.
export function labDisplayText(text: string): string {
  return text.replace(LAB_CONTROL, (c, run?: string) => {
    if (run !== undefined) return run + run;
    const n = c.codePointAt(0)!;
    return n < 256 ? `\\x${n.toString(16).padStart(2, "0")}` : n < 0x10000 ? `\\u${n.toString(16).padStart(4, "0")}` : `\\u{${n.toString(16).toUpperCase()}}`;
  });
}

export function oneLine(text: string): string {
  const t = labDisplayText(text);
  return t.includes("\n") || t.includes("\\") || t.startsWith('"') ? `"${t.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"` : t;
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
      const state: WalkState = { root: realpathSync(dir), top: dir, files, count: 0, incomplete, linked };
      walk(dir, key, state, found);
      if (part === "methods") methods.push(...found.filter((f) => f.endsWith(".json")).map((f) => basename(f, ".json")));
    }
  }
  if (labBytes) files[LAB_FILE] = sha(labBytes);
  else if (labBig) files[LAB_FILE] = sha(`too large ${labBig}`);
  for (const p of paths) files[relative(key, p)] = readHash(p);
  for (const l of linked) files[`(linked folder) ${l}`] = linkHash(join(key, l));
  const layers = projectSettings(key);
  const scripts = hookScriptScan(key, layers);
  for (const p of scripts.files) files[`(hook script) ${relative(key, p).split(sep).join("/")}`] = scriptHash(p);
  for (const f of scripts.large) files[`(large script folder) ${f}`] = "large";
  for (const [rel, real] of Object.entries(scripts.linkText)) files[`(linked script) ${rel}`] = sha(`link:${real}`);
  linked.push(...scripts.linked);
  incomplete.push(...scripts.incomplete);
  const values: Record<string, unknown> = {};
  for (const l of layers) Object.assign(values, l);
  const keys = Object.keys(values).filter((k) => !SAFE_KEYS.has(k));
  const adapters: FolderScan["adapters"] = [];
  for (const dir of projectAdapterDirs(key))
    if (existsSync(dir) && !lstatSync(dir).isSymbolicLink())
      for (const n of safeNames(dir))
        if (existsSync(join(dir, n, "adapter.yaml")) && !adapters.some((a) => a.name === n)) adapters.push({ name: n, replaces: shadows(n) });
  const hash = sha(Object.entries(files).map(([p, h]) => `${p}\0${h}\n`).join(""));
  return { folder: key, files, hash, layers, keys, values, hooks: hookLines(layers), adapters, methods, linked, incomplete: [...new Set(incomplete)], ...(scripts.large.length ? { bigScripts: scripts.large } : {}), bypass: values.permissionMode === "bypass", ...(lab ? { lab } : {}), ...(labBig ? { labBig } : {}), ...(labProblem ? { labProblem } : {}) };
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
  harnessWrite(userFile(), () => writeFileSync(userFile(), JSON.stringify(data, null, 2) + "\n"));
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
  for (const k of s.keys) if (!e.keys?.includes(k)) out.push(`new settings key: ${oneLine(k)}`);
  for (const h of s.hooks) if (!e.hooks?.includes(h)) out.push(`new hook: ${oneLine(h)}`);
  for (const a of s.adapters) if (!e.adapters?.includes(a.name)) out.push(`new adapter: ${oneLine(a.name)}`);
  for (const [p, h] of Object.entries(s.files)) if (!e.files?.[p]) out.push(`new file: ${oneLine(p)}`);
  else if (e.files[p] !== h) out.push(`changed file: ${oneLine(p)}`);
  for (const p of Object.keys(e.files ?? {})) if (!(p in s.files)) out.push(`removed file: ${oneLine(p)}`);
  return out;
}

export function trustStatus(folder: string): TrustStatus {
  const scan = scanFolder(folder);
  if (scan.linked.length || scan.incomplete.length) return { state: "changed", scan, changes: [...scan.linked.map((p) => `The project cannot be trusted while it has a linked folder: ${oneLine(p)}. Replace the link with a copy of the folder.`), ...scan.incomplete.map((r) => `${oneLine(r)}. Cuvette cannot check the folder, so it does not trust it.`)] };
  if (!needsTrust(scan)) return { state: "none", scan, changes: [] };
  if (once.has(scan.folder)) return { state: "once", scan, changes: [] };
  const e = trustedFolders().find((x) => x.path === scan.folder);
  if (!e) return { state: "new", scan, changes: [] };
  if (e.hash === scan.hash) return { state: "trusted", scan, changes: [] };
  return { state: "changed", scan, changes: changesSince(e, scan) };
}

export const cannotTrust = (s: FolderScan) => s.linked.length > 0 || s.incomplete.length > 0;

function blockers(s: FolderScan): { why: string; fix: string } {
  const why = [...s.linked.map((p) => `a linked folder (${oneLine(p)})`), ...s.incomplete.map(oneLine)].join("; ");
  const fix = [s.linked.length ? "Replace each link with a copy of the folder." : "", s.incomplete.length ? "Remove the extra files." : ""].filter(Boolean).join(" ");
  return { why, fix };
}

export function untrustable(scan: FolderScan): string | undefined {
  const reasons = [...scan.linked.map((p) => `the linked folder ${oneLine(p)}`), ...scan.incomplete.map(oneLine)];
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

const show = (v: unknown) => oneLine(typeof v === "string" ? v : JSON.stringify(v));

export function folderLines(s: FolderScan, trusted = false): string[] {
  const out: string[] = [];
  if (s.keys.length) out.push("Settings that would change:", ...s.keys.map((k) => `  ${oneLine(k)}: ${show(s.values[k])}`));
  out.push(s.bypass ? "Bypass permissions: ON. Tool calls would run with no permission card." : "Bypass permissions: not set.");
  if (s.hooks.length) out.push("Hooks (each command runs on this computer):", ...s.hooks.map((h) => `  ${oneLine(h)}`));
  if (s.adapters.length) out.push("Adapters (their code runs on this computer):", ...s.adapters.map((a) => `  ${oneLine(a.name)}${a.replaces ? `: replaces ${oneLine(a.replaces)}` : ""}`));
  if (s.bigScripts?.length) out.push("The script folder is large. Cuvette hashes only the script files in it:", ...s.bigScripts.map((f) => `  ${oneLine(f)}`));
  if (s.methods.length) out.push("Methods (they fill in the questions and settings of a new session):", ...s.methods.map((m) => `  ${oneLine(m)}`));
  const labPath = oneLine(join(s.folder, LAB_FILE));
  if (s.labBig) out.push(`LAB.md is too large (${s.labBig} bytes, the limit is ${LAB_MAX_BYTES}). Cuvette does not read it. Read the file at ${labPath}.`);
  if (s.labProblem) out.push(`Cuvette cannot read LAB.md: ${oneLine(s.labProblem)}. Cuvette ignores it. Fix the file, then start the session again.`);
  if (s.lab && labLong(s)) out.push(`Lab rules in LAB.md: ${s.lab.split("\n").length} lines, ${s.lab.length} characters. This is too long to show here. Read the file at ${labPath}.${trusted ? "" : ` Then run in a terminal: cuvette trust add ${labDisplayText(shellQuote(s.folder))}. Then start the session again.`}`);
  else if (s.lab) out.push("Lab rules in LAB.md (they go into the instructions of the agent):", ...s.lab.split("\n").map((l) => `  ${l}`));
  return out.map(plainText);
}

export function longLabRefusal(s: FolderScan): string {
  return `Cuvette gives no one-step trust to a LAB.md that is too long for the card. Read the file at ${oneLine(join(s.folder, LAB_FILE))}. Then run in a terminal: cuvette trust add ${labDisplayText(shellQuote(s.folder))}. Then start the session again.`;
}

export function trustText(t: TrustStatus): string {
  if (cannotTrust(t.scan)) {
    const { why, fix } = blockers(t.scan);
    return `Cuvette cannot trust the folder ${t.scan.folder}: it has ${why}. Cuvette ignores the Cuvette files in this folder. ${fix} Then start the session again.`;
  }
  return t.state === "changed"
    ? `The Cuvette files in ${oneLine(t.scan.folder)} changed after you trusted this folder. Cuvette ignores them until you trust the folder again.`
    : `The folder ${oneLine(t.scan.folder)} has its own Cuvette settings, hooks, adapters or lab rules (LAB.md). They can run programs on this computer or change the instructions of the agent. Cuvette ignores them until you trust the folder.`;
}

export function trustEvidence(t: TrustStatus): string {
  const lines = folderLines(t.scan);
  if (t.changes.length && !cannotTrust(t.scan)) lines.push("Changes since you trusted the folder:", ...t.changes.map((c) => `  ${c}`));
  return lines.join("\n");
}

export function untrustedNotice(t: TrustStatus): string {
  if (cannotTrust(t.scan)) {
    const { why, fix } = blockers(t.scan);
    return `Cuvette ignored the settings, hooks and adapters in ${oneLine(t.scan.folder)}: the folder has ${why}, so Cuvette cannot trust it. ${fix} Then start the session again.${t.scan.lab ? " Cuvette also ignored LAB.md." : ""}`;
  }
  return `Cuvette ignored the settings, hooks and adapters in ${oneLine(t.scan.folder)}: the folder is not trusted${t.state === "changed" ? " since its files changed" : ""}. Use --trust-folder, or cuvette trust add ${labDisplayText(shellQuote(t.scan.folder))}.${t.scan.lab ? " Cuvette also ignored LAB.md." : ""}`;
}

export function stateLabel(t: TrustStatus): string {
  if (cannotTrust(t.scan)) return "cannot be trusted";
  return t.state === "none" ? "no folder settings" : t.state === "trusted" ? "trusted" : t.state === "once" ? "trust once" : t.state === "changed" ? "not trusted (files changed)" : "not trusted";
}

export function checkoutModelOptions(checkout: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const l of projectSettings(checkout)) for (const k of MODEL_KEYS) if (k in l) out[k] = l[k];
  return out;
}
