import { existsSync, renameSync, symlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const OLD = "GA_";
const NEW = "CUVETTE_";

export const OLD_PROJECT_DIR = ".ga";

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
