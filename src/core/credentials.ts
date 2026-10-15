import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { cuvetteHome } from "../adapters/manifest.ts";
import { keyFormatProblem } from "./keyhelp.ts";

let version = 0;

export function credentialsPath(): string {
  return join(cuvetteHome(), "credentials.json");
}

let known: { path: string; at: number; stat: import("node:fs").BigIntStats; real: string } | undefined;

function credentialsInfo() {
  const path = credentialsPath();
  if (known && known.path === path && Date.now() - known.at < 250) return known;
  try {
    known = { path, at: Date.now(), stat: statSync(path, { bigint: true }), real: realpathSync(path) };
    return known;
  } catch {
    known = undefined;
    return undefined;
  }
}

export function isCredentialsFile(path: string): boolean {
  const cred = credentialsInfo();
  if (!cred) {
    try {
      return realpathSync(path) === resolve(credentialsPath());
    } catch {
      return resolve(path) === resolve(credentialsPath());
    }
  }
  if (resolve(path) === cred.real || resolve(path) === resolve(cred.path)) return true;
  try {
    const a = statSync(path, { bigint: true });
    return a.ino !== 0n && a.dev === cred.stat.dev && a.ino === cred.stat.ino;
  } catch {
    return resolve(path) === cred.real || resolve(path) === resolve(cred.path);
  }
}

const SECRET_FOLDERS = new Set([".ssh", ".aws", ".gnupg", ".kube", ".azure", ".docker", "keychains"]);
const SECRET_NAMES = /^(id_(rsa|dsa|ecdsa|ed25519)(\.pub)?|\.netrc|_netrc|\.git-credentials|\.npmrc|\.pypirc|\.env(\..+)?|.+\.(pem|p12|pfx|kdbx))$/i;

export function isSecretFile(path: string): boolean {
  if (isCredentialsFile(path)) return true;
  const parts = resolve(path).split(/[\\/]/);
  return parts.slice(0, -1).some((d) => SECRET_FOLDERS.has(d.toLowerCase())) || SECRET_NAMES.test(parts.at(-1) ?? "");
}

export const KEY_REMOVED = "[API key removed]";

const KEY_PATTERNS = [
  /\bsk-ant-[A-Za-z0-9_-]{16,}/g,
  /\bsk-(?:proj-|svcacct-|admin-)?(?=[A-Za-z_-]*\d)[A-Za-z0-9_-]{32,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/g,
  /\bhf_[A-Za-z0-9]{30,}/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
  /\b\d{1,6}-[a-f0-9]{80,}\b/g,
];

const SECRET_NAME = /key|token|secret|password|passwd|credential/i;

function knownSecrets(env: Record<string, string | undefined>): string[] {
  const secret = (v: unknown): v is string => typeof v === "string" && v.length >= 16 && !/\s|^[/~.]|:\/\//.test(v);
  const out = new Set<string>(Object.entries(readFile()).filter(([k, v]) => /_key$|token|secret/i.test(k) && secret(v)).map(([, v]) => v));
  for (const [k, v] of Object.entries(env)) if (SECRET_NAME.test(k) && secret(v)) out.add(v);
  return [...out].sort((a, b) => b.length - a.length);
}

export function hideKeys(text: string, env: Record<string, string | undefined> = process.env): { text: string; found: number } {
  let found = 0;
  let out = text;
  for (const s of knownSecrets(env)) {
    const parts = out.split(s);
    found += parts.length - 1;
    out = parts.join(KEY_REMOVED);
  }
  for (const re of KEY_PATTERNS)
    out = out.replace(re, () => {
      found++;
      return KEY_REMOVED;
    });
  return { text: out, found };
}

function readAll(): Record<string, unknown> {
  try {
    const v = JSON.parse(readFileSync(credentialsPath(), "utf8"));
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

function readFile(): Record<string, string> {
  return Object.fromEntries(Object.entries(readAll()).filter(([, x]) => typeof x === "string")) as Record<string, string>;
}

export function savedClaudeKey(): string | undefined {
  return readFile().anthropic_api_key || undefined;
}

export function claudeKey(env: Record<string, string | undefined> = process.env): { key?: string; from: "env" | "file" | "none" } {
  if (env.ANTHROPIC_API_KEY) return { key: env.ANTHROPIC_API_KEY, from: "env" };
  const k = savedClaudeKey();
  return k ? { key: k, from: "file" } : { from: "none" };
}

export const ENV_KEY_WARNING = "This shell also has ANTHROPIC_API_KEY. Cuvette uses that one first.";

export function antLogin(env: Record<string, string | undefined> = process.env): boolean {
  const root = env.ANTHROPIC_CONFIG_DIR || (process.platform === "win32" ? (env.APPDATA ? join(env.APPDATA, "Anthropic") : env.USERPROFILE ? join(env.USERPROFILE, "AppData", "Roaming", "Anthropic") : "") : env.XDG_CONFIG_HOME ? join(env.XDG_CONFIG_HOME, "anthropic") : env.HOME ? join(env.HOME, ".config", "anthropic") : "");
  if (!root) return false;
  let profile = env.ANTHROPIC_PROFILE;
  if (!profile) {
    try {
      profile = readFileSync(join(root, "active_config"), "utf8").trim();
    } catch {}
  }
  profile ||= "default";
  return /^[\w.-]+$/.test(profile) && existsSync(join(root, "credentials", `${profile}.json`));
}

function write(values: Record<string, unknown>): string {
  mkdirSync(cuvetteHome(), { recursive: true });
  const path = credentialsPath();
  const tmp = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(values, null, 1) + "\n", { mode: 0o600 });
    chmodSync(tmp, 0o600);
    renameSync(tmp, path);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
  version++;
  return path;
}

export function saveClaudeKey(key: string): string {
  return write({ ...readAll(), anthropic_api_key: key });
}

export function claudeWorkspace(env: Record<string, string | undefined> = process.env): string | undefined {
  return env.ANTHROPIC_WORKSPACE_ID || readFile().anthropic_workspace_id || undefined;
}

export function saveClaudeWorkspace(id: string): string {
  const rest = readAll();
  if (id) rest.anthropic_workspace_id = id;
  else delete rest.anthropic_workspace_id;
  return write(rest);
}

export const WORKSPACE_HELP =
  "This key belongs to no workspace, so the API needs a workspace ID with each request. Create a key inside a workspace at platform.claude.com, or save the workspace ID with `cuvette key workspace <id>` (in the app: /key workspace <id>).";

export function removeClaudeKey(): boolean {
  const path = credentialsPath();
  if (!existsSync(path)) return false;
  const rest = readAll();
  if (!rest.anthropic_api_key) return false;
  delete rest.anthropic_api_key;
  if (Object.keys(rest).length) write(rest);
  else {
    rmSync(path);
    version++;
  }
  return true;
}

export function elabftwConfig(): { url: string; key: string } | undefined {
  const f = readFile();
  return f.elabftw_url && f.elabftw_api_key ? { url: f.elabftw_url, key: f.elabftw_api_key } : undefined;
}

export function saveElabftw(url: string, key: string): string {
  return write({ ...readAll(), elabftw_url: url, elabftw_api_key: key });
}

export function removeElabftw(): boolean {
  const rest = readAll();
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

export function noClaudeCredentials(env: Record<string, string | undefined> = process.env): boolean {
  return claudeKey(env).from === "none" && !antLogin(env);
}
