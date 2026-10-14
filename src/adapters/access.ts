import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { noteHarnessWrite } from "../core/harness-writes.ts";
import { dirname, join } from "node:path";
import { folderTrusted, projectSettingFiles } from "../core/trust.ts";
import { cuvetteHome, type LoadedAdapter, type Manifest } from "./manifest.ts";

export interface Access {
  off?: boolean;
  path?: string;
  network?: boolean;
  code?: boolean;
}

export const accessFile = () => join(cuvetteHome(), "settings.json");

function readJson(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, "utf8");
  if (!text.trim()) return {};
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch (e) {
    throw new Error(`settings file ${path} is not valid JSON: ${(e as Error).message}`);
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error(`settings file ${path} must hold one JSON object, in braces { }`);
  return v as Record<string, unknown>;
}

function programsIn(path: string): Record<string, Access> {
  let data: Record<string, unknown>;
  try {
    data = readJson(path);
  } catch {
    return {};
  }
  return data.programs && typeof data.programs === "object" ? (data.programs as Record<string, Access>) : {};
}

export function accessAll(cwd = process.cwd()): Record<string, Access> {
  const out: Record<string, Access> = {};
  const project = folderTrusted(cwd) ? projectSettingFiles(cwd).map((f) => f.path) : [];
  for (const f of [accessFile(), ...project])
    for (const [name, a] of Object.entries(programsIn(f))) out[name] = { ...out[name], ...a };
  return out;
}

export function accessOf(name: string, cwd = process.cwd()): Access {
  return accessAll(cwd)[name] ?? {};
}

export function saveAccess(name: string, change: Partial<Record<keyof Access, unknown>>): Access {
  const file = accessFile();
  const data = readJson(file);
  const all = (data.programs && typeof data.programs === "object" ? data.programs : {}) as Record<string, Record<string, unknown>>;
  const next: Record<string, unknown> = { ...all[name], ...change };
  for (const k of Object.keys(next)) if (next[k] === undefined || next[k] === "" || next[k] === null) delete next[k];
  if (Object.keys(next).length) all[name] = next;
  else delete all[name];
  if (Object.keys(all).length) data.programs = all;
  else delete data.programs;
  mkdirSync(dirname(file), { recursive: true });
  noteHarnessWrite();
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  noteHarnessWrite();
  return next as Access;
}

export function isCodeTool(name: string, params: object = {}): boolean {
  return /^run_(macro|script|code)$/.test(name) || "code" in params;
}

export function codeTools(m: Manifest): string[] {
  return m.tools.filter((t) => isCodeTool(t.name, t.params)).map((t) => t.name);
}

export const networkControl = (m: Manifest) => m.connection.kind === "http";

export function usable(a: LoadedAdapter, cwd = process.cwd()): LoadedAdapter {
  const acc = accessOf(a.name, cwd);
  if (acc.off) throw new Error(`the adapter ${a.name} is turned off in Programs. Turn it on with /programs or cuvette programs enable ${a.name}`);
  if (acc.network === undefined) return a;
  return { ...a, manifest: { ...a.manifest, connection: { ...a.manifest.connection, network: acc.network } } };
}

export function blocksCode(name: string, cwd = process.cwd()): boolean {
  return accessOf(name, cwd).code === false;
}
