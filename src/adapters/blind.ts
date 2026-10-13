import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export interface BlindPolicy {
  allow: string[];
  deny: string[];
  hide: string[];
  sandbox: "on" | "off";
}

type Rules = Pick<BlindPolicy, "allow" | "deny">;

export const BLIND_REASON = "blind mode";
export const DRIVE_ROOT = process.env.CUVETTE_DRIVE_ROOT || "";

let active: BlindPolicy | undefined;

function probe(): "on" | "off" {
  if (process.platform !== "darwin") return "off";
  const r = spawnSync("/usr/bin/sandbox-exec", ["-p", "(version 1)(allow default)", "/usr/bin/true"], { timeout: 10_000 });
  return r.status === 0 ? "on" : "off";
}

export function setBlindPolicy(p: { allow: string[]; deny: string[]; hide?: string[] } | undefined): BlindPolicy | undefined {
  active = p ? { allow: unique(p.allow), deny: unique(p.deny), hide: unique(p.hide ?? []), sandbox: probe() } : undefined;
  return active;
}

export function installRoot(path: string): string[] {
  const tools = DRIVE_ROOT && join(DRIVE_ROOT, "tools");
  return [path, canonical(path)].map((p) => {
    const rel = tools && relative(tools, p);
    if (rel && !rel.startsWith("..") && !isAbsolute(rel)) return join(tools, rel.split(sep)[0]);
    const env = /^(.*\/envs\/[^/]+)\/bin\//.exec(p);
    if (env) return env[1];
    const bin = /^(.*)\/bin\/[^/]+$/.exec(p);
    return bin ? bin[1] : dirname(p);
  });
}

export function allowAdapter(root: string, programPath?: string): BlindPolicy | undefined {
  if (!active) return undefined;
  active = { ...active, allow: unique([...active.allow, root, ...(programPath ? installRoot(programPath) : [])]), hide: unique([...active.hide, root]) };
  return active;
}

export function agentRules(p: Rules & { hide?: string[] }): Rules {
  return { allow: p.allow, deny: [...p.deny, ...(p.hide ?? [])] };
}

export function blindPolicy(): BlindPolicy | undefined {
  return active;
}

function unique(paths: string[]): string[] {
  return [...new Set(paths.filter(Boolean).flatMap((p) => [resolve(p), canonical(p)]))];
}

export function canonical(p: string): string {
  const abs = resolve(p.replace(/^~(?=\/|$)/, homedir()));
  let head = abs;
  const rest: string[] = [];
  while (!existsSync(head)) {
    const up = dirname(head);
    if (up === head) return abs;
    rest.unshift(basename(head));
    head = up;
  }
  try {
    return join(realpathSync.native(head), ...rest);
  } catch {
    return abs;
  }
}

function under(root: string, p: string): boolean {
  const rel = relative(root, p);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function nearest(path: string, policy: Rules): "allow" | "deny" | undefined {
  let best: { len: number; kind: "allow" | "deny" } | undefined;
  for (const [kind, roots] of [["allow", policy.allow], ["deny", policy.deny]] as const)
    for (const r of roots) {
      if (!under(r, path)) continue;
      if (!best || r.length > best.len || (r.length === best.len && kind === "deny")) best = { len: r.length, kind };
    }
  return best?.kind;
}

export function decide(p: string, policy: Rules): "allow" | "deny" | undefined {
  const real = nearest(canonical(p), policy);
  return nearest(resolve(p), policy) === "deny" ? "deny" : real;
}

const TOKEN = /(?:^|(?<=[\s"'`=(,[{:]))(?:~\/|\/)[^\s"'`,;()[\]{}<>|*?]+/g;

export function pathsIn(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") {
    const s = v.trim();
    if (/^(?:~\/|\/)[^\n]*$/.test(s) && s.length > 1) out.push(s);
    else for (const t of s.match(TOKEN) ?? []) if (t.length > 1) out.push(t.replace(/[.:]+$/, ""));
  } else if (Array.isArray(v)) v.forEach((x) => pathsIn(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => pathsIn(x, out));
  return [...new Set(out.map((p) => resolve(p.replace(/^~(?=\/)/, homedir()))))];
}

export function blindCheck(tool: { name: string; source: string }, args: unknown, policy = active): { path: string; message: string } | undefined {
  if (!policy) return undefined;
  const generic = tool.source === "generic";
  const rules = agentRules(policy);
  for (const p of pathsIn(args)) {
    const d = decide(p, rules);
    if (d === "deny" || (generic && d !== "allow"))
      return { path: p, message: `Blind benchmark: ${p} is outside the folders of this run. Use the data folder named in the request and the session work folder.` };
  }
  return undefined;
}

function sb(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function sandboxReadRules(policy: Rules | undefined = active): string {
  if (!policy) return "";
  const rules = [
    ...policy.deny.map((p) => ({ p, kind: "deny" })),
    ...policy.allow.filter((a) => policy.deny.some((d) => d.length < a.length && under(d, a))).map((p) => ({ p, kind: "allow" })),
  ].sort((a, b) => a.p.length - b.p.length || (a.kind === "deny" ? 1 : -1));
  return rules.map((r) => `(${r.kind} file-read-data (subpath ${sb(r.p)}))`).join("");
}

export function blindArgv(argv: string[], policy = active): string[] {
  if (!policy || policy.sandbox !== "on" || !argv.length || basename(argv[0]) === "sandbox-exec") return argv;
  return ["/usr/bin/sandbox-exec", "-p", `(version 1)(allow default)${sandboxReadRules(policy)}`, ...argv];
}

export function sandboxDenials(text: string, policy: Rules | undefined = active && agentRules(active)): string[] {
  if (!policy || !/Operation not permitted|PermissionError|Permission denied/.test(text)) return [];
  return pathsIn(text).filter((p) => decide(p, policy) === "deny");
}
