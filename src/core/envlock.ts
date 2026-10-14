import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import { cuvetteHome } from "../adapters/manifest.ts";
import { which } from "../adapters/locate.ts";
import { runProcess } from "../adapters/kinds/common.ts";

export interface Package {
  name: string;
  version: string;
}

export type EnvKind = "python" | "r" | "program";

export interface EnvTarget {
  kind: EnvKind;
  path: string;
  program?: string;
  version?: string;
}

export interface EnvLock {
  hash: string;
  kind: EnvKind;
  path: string;
  language: string;
  packages: Package[];
}

interface Cached {
  stamps: Record<string, number>;
  lock: EnvLock;
}

const TIMEOUT_MS = 30_000;

const PY = `import sys, json, importlib.metadata as m
seen = {}
for d in m.distributions():
    n = d.metadata["Name"]
    if n and n.lower() not in seen:
        seen[n.lower()] = [n, d.version]
watch = [p for p in sys.path if p.endswith(("site-packages", "dist-packages"))]
print(json.dumps({"language": "Python " + sys.version.split()[0], "watch": watch, "packages": sorted(seen.values(), key=lambda x: x[0].lower())}))`;

const R = `ip <- installed.packages(); ip <- ip[!duplicated(ip[, "Package"]), , drop = FALSE]
cat("LANG\\tR ", as.character(getRversion()), "\\n", sep = "")
for (p in .libPaths()) cat("LIB\\t", p, "\\n", sep = "")
cat(paste0("PKG\\t", ip[, "Package"], "\\t", ip[, "Version"], "\\n"), sep = "")`;

const memory = new Map<string, Cached>();
const scanning = new Map<string, Promise<EnvLock | undefined>>();

function cacheFile(): string {
  return join(cuvetteHome(), "cache", "env-locks.json");
}

function readDisk(): Record<string, Cached> {
  try {
    return JSON.parse(readFileSync(cacheFile(), "utf8"));
  } catch {
    return {};
  }
}

function writeDisk(key: string, c: Cached): void {
  try {
    mkdirSync(dirname(cacheFile()), { recursive: true });
    writeFileSync(cacheFile(), JSON.stringify({ ...readDisk(), [key]: c }));
  } catch {}
}

function mtime(p: string): number | undefined {
  try {
    return statSync(p).mtimeMs;
  } catch {
    return undefined;
  }
}

function fresh(c: Cached): boolean {
  return Object.entries(c.stamps).every(([p, t]) => mtime(p) === t);
}

export function lockHash(l: Omit<EnvLock, "hash" | "path">): string {
  return createHash("sha256").update(JSON.stringify({ kind: l.kind, language: l.language, packages: l.packages })).digest("hex");
}

export function envTarget(o: { kind: string; interpreter: string[]; programPath?: string; program: string; programVersion: string }): EnvTarget {
  const first = o.interpreter[0] ?? "";
  const resolve = (p: string) => (isAbsolute(p) ? p : (which(p) ?? p));
  const name = basename(first).toLowerCase();
  if (o.kind === "python") return { kind: "python", path: resolve(first || (process.platform === "win32" ? "python" : "python3")) };
  if (o.kind === "script" && /^rscript(\.exe)?$/.test(name)) return { kind: "r", path: resolve(first) };
  if (o.kind === "script" && /^python[\d.]*(\.exe)?$/.test(name)) return { kind: "python", path: resolve(first) };
  return { kind: "program", path: o.programPath ?? "", program: o.program, version: o.programVersion };
}

function parsePython(out: string): { language: string; watch: string[]; packages: Package[] } | undefined {
  const line = out.trim().split(/\r?\n/).reverse().find((l) => l.startsWith("{"));
  if (!line) return undefined;
  const j = JSON.parse(line) as { language: string; watch: string[]; packages: [string, string][] };
  return { language: j.language, watch: j.watch ?? [], packages: j.packages.map(([name, version]) => ({ name, version })) };
}

function parseR(out: string): { language: string; watch: string[]; packages: Package[] } | undefined {
  let language = "";
  const watch: string[] = [];
  const packages: Package[] = [];
  for (const l of out.split(/\r?\n/)) {
    const [tag, a, b] = l.split("\t");
    if (tag === "LANG") language = a ?? "";
    else if (tag === "LIB" && a) watch.push(a);
    else if (tag === "PKG" && a) packages.push({ name: a, version: b ?? "" });
  }
  if (!language) return undefined;
  packages.sort((x, y) => x.name.toLowerCase().localeCompare(y.name.toLowerCase()));
  return { language, watch, packages };
}

export async function captureEnv(t: EnvTarget): Promise<EnvLock | undefined> {
  if (t.kind === "program") {
    const packages = t.program ? [{ name: t.program, version: t.version ?? "" }] : [];
    const base = { kind: t.kind, language: "", packages };
    return { hash: lockHash(base), path: t.path, ...base };
  }
  if (!t.path || !existsSync(t.path)) return undefined;
  const key = `${t.kind}:${t.path}`;
  const hit = memory.get(key) ?? readDisk()[key];
  if (hit && fresh(hit)) {
    memory.set(key, hit);
    return hit.lock;
  }
  let run = scanning.get(key);
  if (!run) {
    run = scan(t, key).finally(() => scanning.delete(key));
    scanning.set(key, run);
  }
  return run;
}

async function scan(t: EnvTarget, key: string): Promise<EnvLock | undefined> {
  const argv = t.kind === "python" ? [t.path, "-c", PY] : [t.path, "--vanilla", "-e", R];
  const r = await runProcess(argv, { cwd: dirname(t.path), timeoutMs: TIMEOUT_MS });
  let got: ReturnType<typeof parsePython>;
  try {
    got = t.kind === "python" ? parsePython(r.stdout) : parseR(r.stdout);
  } catch {
    got = undefined;
  }
  if (!got) return undefined;
  const base = { kind: t.kind, language: got.language, packages: got.packages };
  const lock: EnvLock = { hash: lockHash(base), path: t.path, ...base };
  const stamps: Record<string, number> = {};
  for (const p of [t.path, ...got.watch]) {
    const m = mtime(p);
    if (m !== undefined) stamps[p] = m;
  }
  const c = { stamps, lock };
  memory.set(key, c);
  writeDisk(key, c);
  return lock;
}

export function clearEnvCache(): void {
  memory.clear();
}

export function packageChanges(before: EnvLock, after: EnvLock): string[] {
  const old = new Map(before.packages.map((p) => [p.name.toLowerCase(), p]));
  const now = new Map(after.packages.map((p) => [p.name.toLowerCase(), p]));
  const out: string[] = [];
  if (before.language !== after.language) out.push(`${before.language || "the language"} to ${after.language}`);
  for (const [k, p] of now) {
    const o = old.get(k);
    if (!o) out.push(`${p.name} ${p.version} added`);
    else if (o.version !== p.version) out.push(`${p.name} ${o.version} to ${p.version}`);
  }
  for (const [k, p] of old) if (!now.has(k)) out.push(`${p.name} ${p.version} removed`);
  return out;
}

export function requirementsText(l: EnvLock): string {
  return l.packages.map((p) => `${p.name}==${p.version}`).join("\n") + "\n";
}

export function renvLock(l: EnvLock): string {
  const version = l.language.replace(/^R\s+/, "");
  const packages = Object.fromEntries(l.packages.map((p) => [p.name, { Package: p.name, Version: p.version }]));
  return JSON.stringify({ R: { Version: version, Repositories: [] }, Packages: packages }, null, 2) + "\n";
}
