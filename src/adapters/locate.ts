import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join, sep } from "node:path";
import type { Manifest } from "./manifest.ts";
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
    return s.isFile() || s.isDirectory();
  } catch {
    return false;
  }
}

export function which(name: string, pathVar = process.env.PATH ?? ""): string | undefined {
  const exts = process.platform === "win32" ? ["", ...(process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").map((e) => e.toLowerCase())] : [""];
  for (const dir of pathVar.split(delimiter).filter(Boolean)) {
    for (const ext of exts) {
      const p = join(dir, name + ext);
      try {
        if (statSync(p).isFile()) return p;
      } catch {}
    }
  }
  return undefined;
}

async function versionOf(m: Manifest, path: string | undefined): Promise<string> {
  const l = m.locate;
  const fallback = m.program.version;
  if (!l.version_command.length) return fallback;
  const uses = l.version_command.some((a) => a.includes("{program_path}"));
  if (uses && !path) return fallback;
  const argv = l.version_command.map((a) => a.replaceAll("{program_path}", path ?? ""));
  const r = await runProcess(argv, { timeoutMs: 10_000 });
  const text = `${r.stdout}\n${r.stderr}`;
  if (l.version_pattern) {
    const hit = new RegExp(l.version_pattern).exec(text);
    return hit?.[1] ?? fallback;
  }
  return text.trim().split(/\r?\n/)[0] || fallback;
}

export function findProgram(manifest: Manifest): { path?: string; how: string } {
  const l = manifest.locate;
  let path: string | undefined;
  let how = "not found";
  const fromEnv = l.env ? process.env[l.env] : undefined;
  if (fromEnv && isFileOrBundle(expandPath(fromEnv))) {
    path = expandPath(fromEnv);
    how = `environment variable ${l.env}`;
  }
  if (!path) {
    for (const p of l.paths) {
      const hit = globMatches(expandPath(p)).find(isFileOrBundle);
      if (hit) {
        path = hit;
        how = `path ${p}`;
        break;
      }
    }
  }
  if (!path) {
    for (const name of l.which) {
      const hit = which(name);
      if (hit) {
        path = hit;
        how = `PATH search for ${name}`;
        break;
      }
    }
  }
  return { path, how };
}

export async function locate(manifest: Manifest): Promise<Located> {
  const { path, how } = findProgram(manifest);
  return { path, version: await versionOf(manifest, path), how };
}
