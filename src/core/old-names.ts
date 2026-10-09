import { existsSync, renameSync, symlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join, sep } from "node:path";

const OLD = "GA_";
const NEW = "CUVETTE_";

export function readOldEnv(env: NodeJS.ProcessEnv = process.env) {
  for (const [k, v] of Object.entries(env)) {
    const name = NEW + k.slice(OLD.length);
    if (k.startsWith(OLD) && v !== undefined && env[name] === undefined) env[name] = v;
  }
}

export function addOldEnv<T extends Record<string, string | undefined>>(env: T): T {
  for (const [k, v] of Object.entries(env)) if (k.startsWith(NEW)) (env as Record<string, string | undefined>)[OLD + k.slice(NEW.length)] = v;
  return env;
}

export function moveOldHome(home = homedir()): string | undefined {
  const now = join(home, ".cuvette");
  const old = join(home, ".guided-analysis");
  if (existsSync(now) || !existsSync(old)) return;
  renameSync(old, now);
  try {
    symlinkSync(now, old, "junction");
    return `Moved ${old} to ${now}. The old path is a link to the new folder.`;
  } catch {
    return `Moved ${old} to ${now}.`;
  }
}

export function homeFolder(home = homedir()): string {
  const now = join(home, ".cuvette");
  const old = join(home, ".guided-analysis");
  return !existsSync(now) && existsSync(old) ? old : now;
}

export function oldHomePath(p: string, home = homedir()): string {
  const now = join(home, ".cuvette");
  if (p !== now && !p.startsWith(now + sep)) return p;
  const old = join(home, ".guided-analysis") + p.slice(now.length);
  return !existsSync(p) && existsSync(old) ? old : p;
}
