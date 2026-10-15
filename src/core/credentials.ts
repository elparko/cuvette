import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cuvetteHome } from "../adapters/manifest.ts";
import { keyFormatProblem } from "./keyhelp.ts";

let version = 0;

export function credentialsPath(): string {
  return join(cuvetteHome(), "credentials.json");
}

function readFile(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(credentialsPath(), "utf8"));
  } catch {
    return {};
  }
}

export function savedClaudeKey(): string | undefined {
  return readFile().anthropic_api_key || undefined;
}

export function claudeKey(env: Record<string, string | undefined> = process.env): { key?: string; from: "env" | "file" | "none" } {
  if (env.ANTHROPIC_API_KEY) return { key: env.ANTHROPIC_API_KEY, from: "env" };
  const k = savedClaudeKey();
  return k ? { key: k, from: "file" } : { from: "none" };
}

function write(values: Record<string, string>): string {
  mkdirSync(cuvetteHome(), { recursive: true });
  const path = credentialsPath();
  writeFileSync(path, JSON.stringify(values, null, 1) + "\n", { mode: 0o600 });
  chmodSync(path, 0o600);
  version++;
  return path;
}

export function saveClaudeKey(key: string): string {
  return write({ ...readFile(), anthropic_api_key: key });
}

export function claudeWorkspace(env: Record<string, string | undefined> = process.env): string | undefined {
  return env.ANTHROPIC_WORKSPACE_ID || readFile().anthropic_workspace_id || undefined;
}

export function saveClaudeWorkspace(id: string): string {
  const rest = readFile();
  if (id) rest.anthropic_workspace_id = id;
  else delete rest.anthropic_workspace_id;
  return write(rest);
}

export const WORKSPACE_HELP =
  "This key belongs to no workspace, so the API needs a workspace ID with each request. Create a key inside a workspace at platform.claude.com, or save the workspace ID with `cuvette key workspace <id>` (in the app: /key workspace <id>).";

export function removeClaudeKey(): boolean {
  const path = credentialsPath();
  if (!existsSync(path)) return false;
  const rest = readFile();
  delete rest.anthropic_api_key;
  if (Object.keys(rest).length) writeFileSync(path, JSON.stringify(rest, null, 1) + "\n", { mode: 0o600 });
  else rmSync(path);
  version++;
  return true;
}

export function cuvetteToken(env: Record<string, string | undefined> = process.env): { token?: string; from: "env" | "file" | "none" } {
  if (env.CUVETTE_TOKEN) return { token: env.CUVETTE_TOKEN, from: "env" };
  const t = readFile().cuvette_token;
  return t ? { token: t, from: "file" } : { from: "none" };
}

export function saveCuvetteToken(token: string): string {
  return write({ ...readFile(), cuvette_token: token });
}

export function removeCuvetteToken(): boolean {
  const rest = readFile();
  if (!rest.cuvette_token) return false;
  delete rest.cuvette_token;
  write(rest);
  return true;
}

export const CUVETTE_URL = "https://api.cuvette.ai";

export function cuvetteUrl(env: Record<string, string | undefined> = process.env): string {
  return (env.CUVETTE_INFERENCE_URL || CUVETTE_URL).replace(/\/+$/, "");
}

export function elabftwConfig(): { url: string; key: string } | undefined {
  const f = readFile();
  return f.elabftw_url && f.elabftw_api_key ? { url: f.elabftw_url, key: f.elabftw_api_key } : undefined;
}

export function saveElabftw(url: string, key: string): string {
  return write({ ...readFile(), elabftw_url: url, elabftw_api_key: key });
}

export function removeElabftw(): boolean {
  const rest = readFile();
  if (!rest.elabftw_url && !rest.elabftw_api_key) return false;
  delete rest.elabftw_url;
  delete rest.elabftw_api_key;
  write(rest);
  return true;
}

export function elabftwProblem(url: string, key: string): string | undefined {
  if (!key.trim()) return "The API key is empty.";
  if (/\s/.test(key.trim())) return "The API key has a space in it.";
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return "The URL is not valid. Use the form https://elab.example.org.";
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  if (u.protocol !== "https:" && !(u.protocol === "http:" && local)) return "The URL must start with https://. Plain http is allowed only for localhost.";
  return undefined;
}

export function keyVersion(): number {
  return version;
}

export function maskKey(key: string): string {
  return key.length > 14 ? `${key.slice(0, 7)}…${key.slice(-4)}` : "…";
}

export function keyProblem(key: string): string | undefined {
  return keyFormatProblem(key);
}
