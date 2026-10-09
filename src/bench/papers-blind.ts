import { existsSync, statSync } from "node:fs";
import { homedir, tmpdir, userInfo } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { agentRules, BLIND_REASON, decide, installRoot, T7_ROOT, pathsIn, sandboxDenials, type BlindPolicy } from "../adapters/blind.ts";
import { locate } from "../adapters/locate.ts";
import { adapterDirs, loadAdapter } from "../adapters/manifest.ts";
import type { Entry, Node } from "../core/types.ts";
import { finalClaims } from "./papers-score.ts";
import { dataRoot, fillPrompt, PAPERS_DIR, resolveData, type Paper } from "./papers-spec.ts";

export { T7_ROOT };
export const REPO_DIR = resolve(PAPERS_DIR, "../..");
const SYSTEM = ["/usr", "/bin", "/sbin", "/opt", "/Library", "/System", "/Applications", "/etc", "/private/etc", "/dev"];

export interface RunBlind {
  cwd: string;
  allow: string[];
  deny: string[];
  hide?: string[];
  sandbox: BlindPolicy["sandbox"];
}

export interface LeakCheck {
  read: string[];
  outside: string[];
  blocked: number;
  unsourced: number;
  literature: number;
}

export function referenceRoot(): string {
  return resolve(dataRoot(), "..", "reference");
}

export function harnessHomes(current: string): string[] {
  return [...new Set([current, join(homedir(), ".cuvette"), join(homedir(), ".cuvette")])];
}

function mainCheckout(repo: string): string[] {
  const i = repo.indexOf(`${sep}.claude${sep}worktrees${sep}`);
  return i > 0 ? [repo.slice(0, i)] : [];
}

export function dataFolders(paper: Paper): string[] {
  const root = dataRoot();
  const named = [...paper.data.map(resolveData), ...pathsIn(fillPrompt(paper.prompt))];
  const out = new Set<string>([join(root, paper.id)]);
  for (const p of named) {
    const rel = relative(root, p);
    if (rel && !rel.startsWith("..") && !isAbsolute(rel)) out.add(join(root, rel.split(sep)[0]));
    else if (isAbsolute(p)) out.add(existsSync(p) && statSync(p).isDirectory() ? p : dirname(p));
  }
  return [...out];
}

export async function adapterPaths(paper: Paper): Promise<{ roots: string[]; programs: string[] }> {
  const known = adapterDirs();
  const roots = paper.adapters.map((a) => (existsSync(a) ? resolve(a) : known[a])).filter((r): r is string => !!r);
  const programs: string[] = [];
  for (const r of roots) {
    try {
      const found = await locate(loadAdapter(r).manifest, r);
      if (found.path) programs.push(...installRoot(found.path));
    } catch {}
  }
  return { roots, programs };
}

export function blindPolicyFor(opts: {
  paper: Paper;
  runDir: string;
  scratch: string;
  home: string;
  adapterRoots: string[];
  programs: string[];
  papersDir?: string;
  resultsDir?: string;
}): { allow: string[]; deny: string[]; hide: string[] } {
  const homes = harnessHomes(opts.home);
  const scratchParent = dirname(opts.scratch);
  const t7 = existsSync(T7_ROOT) ? [join(T7_ROOT, "tools"), join(T7_ROOT, "reference")] : [];
  const claudeTmp = join("/private/tmp", `claude-${userInfo().uid}`);
  const allow = [
    ...dataFolders(opts.paper),
    opts.runDir,
    ...opts.adapterRoots,
    ...opts.programs,
    ...homes.flatMap((h) => ["envs", "adapters", "R-library"].map((d) => join(h, d))),
    join(T7_ROOT, "tools", "R-library"),
    join(REPO_DIR, "src", "adapters"),
    join(REPO_DIR, "src", "tools", "inspect_data.py"),
    ...[REPO_DIR, ...mainCheckout(REPO_DIR)].flatMap((r) => ["node_modules", "package.json", "tsconfig.json"].map((f) => join(r, f))),
    ...SYSTEM,
    tmpdir(),
  ];
  const deny = [
    REPO_DIR,
    ...mainCheckout(REPO_DIR),
    opts.papersDir ?? PAPERS_DIR,
    ...(opts.resultsDir ? [opts.resultsDir] : []),
    /bench-runs$/.test(scratchParent) ? scratchParent : opts.scratch,
    ...t7,
    referenceRoot(),
    ...homes,
    join(homedir(), ".claude"),
    ...(existsSync(claudeTmp) ? [claudeTmp] : []),
  ];
  return { allow, deny, hide: opts.adapterRoots };
}

function readPaths(e: Entry, cwd: string): string[] {
  const args = (e.data.args ?? {}) as Record<string, unknown>;
  const rel = ["path", "folder", "cwd"].map((k) => args[k]).filter((v): v is string => typeof v === "string" && v.length > 0 && !v.startsWith("/") && !v.startsWith("~"));
  return [...pathsIn(args), ...rel.map((v) => resolve(cwd, v))];
}

export function leakCheck(record: { entries(kinds?: Entry["kind"][]): Entry[]; nodes(): Node[] }, policy: Pick<BlindPolicy, "allow" | "deny"> & { hide?: string[] }): LeakCheck {
  const rules = agentRules(policy);
  const cwd = String(record.entries(["session"])[0]?.data.cwd ?? "/");
  const named = [...record.entries(["tool_call"]).flatMap((e) => readPaths(e, cwd)), ...record.nodes().flatMap((n) => pathsIn(n.args))];
  const read = [...new Set(named)].filter((p) => existsSync(p) || p.split("/").filter(Boolean).length >= 2).sort();
  const events = record.entries(["blocked"]).filter((e) => e.data.reason === BLIND_REASON).length;
  const childDenials = record
    .entries(["tool_result"])
    .filter((e) => e.data.tool !== "run_script")
    .reduce((a, e) => a + sandboxDenials(`${e.data.text ?? ""}\n${e.data.error ?? ""}`, rules).length, 0);
  const claims = finalClaims(record)?.claims ?? [];
  return {
    read,
    outside: read.filter((p) => decide(p, rules) !== "allow"),
    blocked: events + childDenials,
    unsourced: claims.filter((c) => c.label === "unsourced").length,
    literature: claims.filter((c) => c.label === "literature").length,
  };
}

export const BLIND_NOTE =
  "Blind mode: the file tools of the agent read only the allow list (the data folder of the paper, the folder of the run, program folders, system and temporary folders). Child processes cannot read the repository, the results, past benchmark runs, the reference folder or the harness home. Only the adapter processes can read the adapter folders. The session cwd is the work folder of the run.";

