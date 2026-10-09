import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, delimiter, dirname, join, sep } from "node:path";
import { adapterDirs, type Manifest } from "./manifest.ts";
import { runProcess } from "./kinds/common.ts";

export interface Located {
  path?: string;
  version: string;
  how: string;
}

function expandPath(p: string): string {
  let out = p.replace(/\{env:([^{}]+)\}/g, (_, n: string) => process.env[n] ?? "");
  if (out === "~" || out.startsWith("~/") || out.startsWith("~\\")) out = homedir() + out.slice(1);
  return out;
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

async function versionRun(m: Manifest, path: string | undefined, adapterDir: string): Promise<{ text?: string; timedOut: boolean }> {
  const l = m.locate;
  if (!l.version_command.length) return { timedOut: false };
  const uses = l.version_command.some((a) => a.includes("{program_path}"));
  if (uses && !path) return { timedOut: false };
  const argv = l.version_command.map((a) => a.replaceAll("{program_path}", path ?? "").replaceAll("{adapter_dir}", adapterDir));
  const r = await runProcess(argv, { timeoutMs: VERSION_TIMEOUT_MS });
  return { text: `${r.stdout}\n${r.stderr}`, timedOut: r.timedOut };
}

async function versionText(m: Manifest, path: string | undefined, adapterDir: string): Promise<string | undefined> {
  return (await versionRun(m, path, adapterDir)).text;
}

function versionFrom(m: Manifest, text: string | undefined): string {
  const fallback = m.program.version;
  if (text === undefined) return fallback;
  if (m.locate.version_pattern) return new RegExp(m.locate.version_pattern).exec(text)?.[1] ?? fallback;
  return text.trim().split(/\r?\n/)[0] || fallback;
}

export function candidates(manifest: Manifest): { path: string; how: string }[] {
  const l = manifest.locate;
  const out: { path: string; how: string }[] = [];
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

export function findProgram(manifest: Manifest): { path?: string; how: string } {
  return candidates(manifest)[0] ?? { how: "not found" };
}

export async function locate(manifest: Manifest, dir = ""): Promise<Located> {
  const l = manifest.locate;
  const adapterDir = dir || (l.version_command.some((a) => a.includes("{adapter_dir}")) ? (adapterDirs()[manifest.adapter.name] ?? "") : "");
  if (!l.identity || !l.version_command.length) {
    const { path, how } = findProgram(manifest);
    return { path, version: versionFrom(manifest, await versionText(manifest, path, adapterDir)), how };
  }
  const id = new RegExp(l.identity);
  const list: { path?: string; how: string }[] = l.version_command.some((a) => a.includes("{program_path}")) ? candidates(manifest) : [findProgram(manifest)];
  const rejected: string[] = [];
  const seen = new Set<string>();
  let slow: { path?: string; how: string } | undefined;
  for (const c of list) {
    if (c.path && seen.has(c.path)) continue;
    if (c.path) seen.add(c.path);
    const r = await versionRun(manifest, c.path, adapterDir).catch(() => ({ text: undefined, timedOut: false }));
    if (r.text !== undefined && id.test(r.text)) return { path: c.path, version: versionFrom(manifest, r.text), how: c.how };
    if (r.timedOut) slow ??= c;
    else rejected.push(c.path ?? c.how);
  }
  if (slow) return { path: slow.path, version: manifest.program.version, how: `${slow.how}; identity not checked: the version command ran longer than ${VERSION_TIMEOUT_MS / 1000} s` };
  const why = rejected.length ? `; ${rejected.join(", ")} did not identify as ${manifest.program.name} (the version output has no match for ${l.identity})` : "";
  return { path: undefined, version: manifest.program.version, how: `not found${why}` };
}
