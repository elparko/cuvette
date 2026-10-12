import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { cuvetteHome } from "./manifest.ts";

export const DEFAULT_REGISTRY = "https://raw.githubusercontent.com/elparko/cuvette-adapters/main/index.json";

export interface RegistryEntry {
  name: string;
  version: string;
  description?: string;
  program: string;
  field: string;
  file_types: string[];
  author: string;
  license: string;
  trust: "checked";
  lint: { ok: boolean; errors: number; warnings: number };
  tests: { ran: number; passed: number; failed: number };
  needs: { network: boolean; code: boolean; programs: string[] };
  citations: string[];
  path: string;
  git: string;
  commit: string;
  sha256: string;
}

export interface RegistryIndex {
  registry: string;
  generated: string;
  adapters: RegistryEntry[];
}

export class RegistryError extends Error {}

export function trustedRegistry(url: string | undefined): boolean {
  if (!url) return false;
  const extra = (process.env.CUVETTE_TRUSTED_REGISTRIES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return url === DEFAULT_REGISTRY || extra.includes(url);
}

export function registryUrl(): string {
  const file = join(cuvetteHome(), "settings.json");
  try {
    if (existsSync(file)) {
      const v = JSON.parse(readFileSync(file, "utf8")).adapter_registry;
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  } catch {}
  return DEFAULT_REGISTRY;
}

export async function fetchIndex(url = registryUrl()): Promise<RegistryIndex> {
  const unreachable = (why: string) => new RegistryError(`The adapter registry at ${url} is not reachable: ${why}. Check the network, or set adapter_registry to another address.`);
  let text: string;
  if (/^https?:\/\//i.test(url)) {
    if (/^http:/i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//i.test(url)) throw new RegistryError(`The adapter registry at ${url} uses plain http. Use an https address. Plain http is allowed only for localhost.`);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw unreachable(`HTTP ${res.status}`);
      text = await res.text();
    } catch (e) {
      throw e instanceof RegistryError ? e : unreachable(((e as Error).cause as Error | undefined)?.message ?? (e as Error).message);
    }
  } else {
    const path = url.startsWith("file://") ? fileURLToPath(url) : url;
    if (!existsSync(path)) throw unreachable("no such file");
    text = readFileSync(path, "utf8");
  }
  try {
    const j = JSON.parse(text);
    if (!Array.isArray(j.adapters)) throw new Error("no adapters list");
    return { registry: url, generated: String(j.generated ?? ""), adapters: j.adapters };
  } catch (e) {
    throw new RegistryError(`The adapter registry at ${url} gave an index that Cuvette cannot read: ${(e as Error).message}.`);
  }
}

const parts = (v: string) => v.split(/[.+-]/).map((x) => Number(x) || 0);

function newer(a: string, b: string): boolean {
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
}

export function findEntry(index: RegistryIndex, name: string, version?: string): RegistryEntry | undefined {
  const all = index.adapters.filter((a) => a.name === name && (!version || a.version === version));
  return all.reduce<RegistryEntry | undefined>((best, a) => (!best || newer(a.version, best.version) ? a : best), undefined);
}
