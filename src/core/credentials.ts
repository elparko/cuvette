import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gaHome } from "../adapters/manifest.ts";

let version = 0;

export function credentialsPath(): string {
  return join(gaHome(), "credentials.json");
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
  mkdirSync(gaHome(), { recursive: true });
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
  "This key belongs to no workspace, so the API needs a workspace ID with each request. Create a key inside a workspace at platform.claude.com, or save the workspace ID with `ga key workspace <id>` (in the app: /key workspace <id>).";

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

export function keyVersion(): number {
  return version;
}

export function maskKey(key: string): string {
  return key.length > 14 ? `${key.slice(0, 7)}…${key.slice(-4)}` : "…";
}

export function keyProblem(key: string): string | undefined {
  const k = key.trim();
  if (!k) return "The key is empty.";
  if (/\s/.test(k)) return "The key has a space in it.";
  if (!k.startsWith("sk-ant-")) return "A Claude API key starts with sk-ant-.";
  return undefined;
}
