import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, delimiter, dirname, join, sep } from "node:path";
import { oldHomePath } from "../core/old-names.ts";
import { accessOf } from "./access.ts";
import { adapterDirs, cuvetteHome, type Manifest } from "./manifest.ts";
import { runProcess } from "./kinds/common.ts";

export interface Located {
  path?: string;
  version: string;
  how: string;
  identified?: boolean;
  measured?: boolean;
  timedOut?: boolean;
}

function expandPath(p: string): string {
  let out = p.replace(/\{env:([^{}]+)\}/g, (_, n: string) => process.env[n] ?? "");
  if (out === "~" || out.startsWith("~/") || out.startsWith("~\\")) out = homedir() + out.slice(1);
  return oldHomePath(out);
}

function globMatches(pattern: string): string[] {
  if (!pattern.includes("*")) return existsSync(pattern) ? [pattern] : [];
  const parts = pattern.split(/[\\/]/);
  let bases = [parts[0] === "" ? sep : parts[0].endsWith(":") ? parts[0] + sep : parts[0]];
  for (const part of parts.slice(1)) {
    const next: string[] = [];
    for (const base of bases) {
      if (!part.includes("*")) {
        const p = join(base, part);
        if (existsSync(p)) next.push(p);
        continue;
      }
      const re = new RegExp(`^${part.split("*").map((x) => x.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
      let names: string[] = [];
      try {
        names = readdirSync(base);
      } catch {}
      for (const n of names.filter((x) => re.test(x))) next.push(join(base, n));
    }
    bases = next;
  }
  return bases.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
}

function isFileOrBundle(p: string): boolean {
  try {
    const s = statSync(p);
    return (s.isFile() || s.isDirectory()) && exactCase(p);
  } catch {
    return false;
  }
}

function exactCase(p: string): boolean {
  if (process.platform !== "darwin") return true;
  try {
    return readdirSync(dirname(p)).includes(basename(p));
  } catch {
    return true;
  }
}

export function which(name: string, pathVar = process.env.PATH ?? ""): string | undefined {
  const exts = process.platform === "win32" ? ["", ...(process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").map((e) => e.toLowerCase())] : [""];
  for (const dir of pathVar.split(delimiter).filter(Boolean)) {
    for (const ext of exts) {
      const p = join(dir, name + ext);
      try {
        if (statSync(p).isFile() && exactCase(p)) return p;
      } catch {}
    }
  }
  return undefined;
}

const VERSION_TIMEOUT_MS = 30_000;
export const START_VERSION_TIMEOUT_MS = 5_000;

async function versionRun(m: Manifest, path: string | undefined, adapterDir: string, timeoutMs = VERSION_TIMEOUT_MS): Promise<{ text?: string; timedOut: boolean }> {
  const l = m.locate;
  if (!l.version_command.length) return { timedOut: false };
  const uses = l.version_command.some((a) => a.includes("{program_path}"));
  if (uses && !path) return { timedOut: false };
  const argv = l.version_command.map((a) => a.replaceAll("{program_path}", path ?? "").replaceAll("{adapter_dir}", adapterDir));
  const r = await runProcess(argv, { timeoutMs, cwd: tmpdir() });
  return { text: `${r.stdout}\n${r.stderr}`, timedOut: r.timedOut };
}

function versionCacheFile(): string {
  return join(cuvetteHome(), "cache", "program-versions.json");
}

function readVersions(): Record<string, { version: string; mtimeMs: number; size: number }> {
  try {
    return JSON.parse(readFileSync(versionCacheFile(), "utf8"));
  } catch {
    return {};
  }
}

function versionKey(m: Manifest, path: string): string {
  return `${m.adapter.name}\n${path}\n${m.locate.version_command.join(" ")}`;
}

export function cachedVersion(m: Manifest, path: string | undefined): string | undefined {
  if (!path) return undefined;
  const hit = readVersions()[versionKey(m, path)];
  const st = statSync(path, { throwIfNoEntry: false });
  return hit && st && st.mtimeMs === hit.mtimeMs && st.size === hit.size ? hit.version : undefined;
}

export function saveVersion(m: Manifest, path: string, version: string): void {
  try {
    const st = statSync(path);
    const file = versionCacheFile();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(`${file}.${process.pid}.tmp`, JSON.stringify({ ...readVersions(), [versionKey(m, path)]: { version, mtimeMs: st.mtimeMs, size: st.size } }));
    renameSync(`${file}.${process.pid}.tmp`, file);
  } catch {}
}

// The path and version that a session uses before the version command ends: the last checked version, or the version in the manifest.
export function quickLocate(manifest: Manifest, custom = accessOf(manifest.adapter.name).path): Located & { cached: boolean } {
  const usesPath = manifest.locate.version_command.some((a) => a.includes("{program_path}"));
  const list = usesPath ? candidates(manifest, custom) : [findProgram(manifest, custom)];
  for (const c of list) {
    const cached = cachedVersion(manifest, c.path);
    if (cached !== undefined) return { path: c.path, version: cached, how: c.how, cached: true };
  }
  return { path: list[0]?.path, version: manifest.program.version, how: list[0]?.how ?? "not found", cached: false };
}

function versionRead(m: Manifest, text: string | undefined): string | undefined {
  if (text === undefined) return undefined;
  if (m.locate.version_pattern) return new RegExp(m.locate.version_pattern).exec(text)?.[1];
  return text.trim().split(/\r?\n/)[0] || undefined;
}

function versionFrom(m: Manifest, text: string | undefined): string {
  return versionRead(m, text) ?? m.program.version;
}

export const CUSTOM_HOW = "custom path in settings";

export function customPaths(manifest: Manifest, raw: string): string[] {
  const p = expandPath(raw);
  if (!existsSync(p)) return [];
  const out: string[] = [];
  if (statSync(p).isDirectory()) {
    for (const pat of manifest.locate.paths) {
      const parts = pat.split(/[\\/]/);
      for (let k = 1; k < parts.length; k++) out.push(...globMatches(join(p, ...parts.slice(k))).filter(isFileOrBundle));
    }
    for (const name of manifest.locate.which) for (const c of [join(p, name), join(p, "bin", name)]) if (existsSync(c) && statSync(c).isFile()) out.push(c);
  }
  out.push(p);
  return [...new Set(out)];
}

export function candidates(manifest: Manifest, custom = accessOf(manifest.adapter.name).path): { path: string; how: string }[] {
  const l = manifest.locate;
  const out: { path: string; how: string }[] = [];
  if (custom) for (const p of customPaths(manifest, custom)) out.push({ path: p, how: CUSTOM_HOW });
  const fromEnv = l.env ? process.env[l.env] : undefined;
  if (fromEnv && isFileOrBundle(expandPath(fromEnv))) out.push({ path: expandPath(fromEnv), how: `environment variable ${l.env}` });
  for (const p of l.paths) {
    const hit = globMatches(expandPath(p)).find(isFileOrBundle);
    if (hit) out.push({ path: hit, how: `path ${p}` });
  }
  for (const name of l.which) {
    const hit = which(name);
    if (hit) out.push({ path: hit, how: `PATH search for ${name}` });
  }
  return out;
}

export function findProgram(manifest: Manifest, custom?: string): { path?: string; how: string } {
  return candidates(manifest, custom ?? accessOf(manifest.adapter.name).path)[0] ?? { how: "not found" };
}

export async function locate(manifest: Manifest, dir = "", custom?: string, timeoutMs = VERSION_TIMEOUT_MS): Promise<Located> {
  const l = manifest.locate;
  const adapterDir = dir || (l.version_command.some((a) => a.includes("{adapter_dir}")) ? (adapterDirs()[manifest.adapter.name] ?? "") : "");
  if (!l.identity || !l.version_command.length) {
    const { path, how } = findProgram(manifest, custom);
    const r = await versionRun(manifest, path, adapterDir, timeoutMs);
    const read = r.timedOut ? undefined : versionRead(manifest, r.text);
    return { path, version: versionFrom(manifest, r.text), how, ...(r.timedOut ? { timedOut: true } : {}), ...(path && read !== undefined ? { measured: true } : {}) };
  }
  const id = new RegExp(l.identity);
  const list: { path?: string; how: string }[] = l.version_command.some((a) => a.includes("{program_path}")) ? candidates(manifest, custom ?? accessOf(manifest.adapter.name).path) : [findProgram(manifest, custom)];
  const rejected: string[] = [];
  const seen = new Set<string>();
  let slow: { path?: string; how: string } | undefined;
  for (const c of list) {
    if (c.path && seen.has(c.path)) continue;
    if (c.path) seen.add(c.path);
    const r = await versionRun(manifest, c.path, adapterDir, timeoutMs).catch(() => ({ text: undefined, timedOut: false }));
    if (r.text !== undefined && id.test(r.text)) return { path: c.path, version: versionFrom(manifest, r.text), how: c.how, identified: true, ...(versionRead(manifest, r.text) !== undefined ? { measured: true } : {}) };
    if (r.timedOut) slow ??= c;
    else rejected.push(c.path ?? c.how);
  }
  if (slow) return { path: slow.path, version: manifest.program.version, how: `${slow.how}; identity not checked: the version command ran longer than ${timeoutMs / 1000} s`, timedOut: true };
  const why = rejected.length ? `; ${rejected.join(", ")} did not identify as ${manifest.program.name} (the version output has no match for ${l.identity})` : "";
  return { path: undefined, version: manifest.program.version, how: `not found${why}` };
}
