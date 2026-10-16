import { ensureHome } from "../core/atomic.ts";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, renameSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { checkAdapter, type Report } from "../onboarding/checker.ts";
import { auditLines, estimateReview, runReview, type Audit, type LintSummary } from "./audit.ts";
import { codeTools } from "./access.ts";
import { CATALOG_DIR, cuvetteHome, loadAdapter, type Manifest } from "./manifest.ts";
import { fetchIndex, findEntry, trustedRegistry, type RegistryEntry } from "./registry.ts";
import { adapterTrust, codeFilesIn, fileHash, forgetInstalled, hashFolder, licenseOf, listFiles, networkFilesIn, readInstalled, saveInstalled, TRUST_DETAIL, TRUST_NAME, userAdapterDir, type InstalledEntry, type SourceKind, type TrustLevel } from "./source.ts";

const exec = promisify(execFile);
const MAX_FILES = 3000;
const MAX_BYTES = 60_000_000;
const NAME = /^[a-z0-9][a-z0-9-]*$/;

export interface Card {
  name: string;
  title: string;
  version: string;
  source: string;
  trust: TrustLevel;
  program: string;
  commands: string[];
  code: string[];
  agentCode: string[];
  network: "yes" | "possible" | "no";
  networkWhy: string;
  tools: string[];
  decisions: string[];
  license: string;
  authors: string[];
  citations: string[];
  lint: { ok: boolean; errors: string[]; warnings: string[]; tests: string };
  replaces?: string;
  audit?: Audit;
}

export interface Changes {
  from: string;
  to: string;
  added: string[];
  removed: string[];
  changed: string[];
  toolsAdded: string[];
  toolsRemoved: string[];
  permissions: string[];
  edited: boolean;
}

export interface InstallPlan {
  id: string;
  mode: "add" | "update";
  name: string;
  work: string;
  dir: string;
  entry: InstalledEntry;
  card: Card;
  changes?: Changes;
  refused?: string;
  upToDate?: boolean;
  lint: LintSummary;
  review?: { text: string };
}

export interface PrepareOpts {
  runTests?: boolean;
  registry?: string;
}

const plans = new Map<string, InstallPlan>();

export const getInstallPlan = (id: string) => plans.get(id);

export function stagingRoot(): string {
  const root = process.env.CUVETTE_STAGING || join(tmpdir(), `cuvette-staging-${process.getuid?.() ?? "user"}`);
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const st = lstatSync(root);
  if (!st.isDirectory() || (process.getuid && st.uid !== process.getuid())) throw new Error(`The staging folder ${root} is not a folder that your user account owns. Cuvette did not use it.`);
  if (process.platform !== "win32" && (st.mode & 0o077) !== 0) chmodSync(root, 0o700);
  return root;
}

export function withoutCredentials(address: string): string {
  return address.replace(/^([a-z][a-z0-9+.-]*:\/\/)([^@/?#]*)@/i, (_, scheme: string, user: string) => (/^https?:/i.test(scheme) ? scheme : `${scheme}${user.split(":")[0]}@`));
}

const hideUserInfo = (text: string) => text.replace(/([a-z][a-z0-9+.-]*:\/\/)[^@\s/?#]*@/gi, "$1");

function sweepStaging(): void {
  const root = stagingRoot();
  if (!existsSync(root)) return;
  for (const d of readdirSync(root)) {
    if (!d.startsWith("adapter-")) continue;
    const p = join(root, d);
    if (Date.now() - statSync(p).mtimeMs > 86_400_000) rmSync(p, { recursive: true, force: true });
  }
}

export function discardPlan(id: string): void {
  const p = plans.get(id);
  if (!p) return;
  rmSync(p.work, { recursive: true, force: true });
  plans.delete(id);
}

export function classify(source: string): SourceKind {
  if (/^(https?|ssh|git|file):\/\//i.test(source) || /^git@[^:]+:/.test(source) || /\.git(#|$)/.test(source)) return "git";
  if (/\.zip$/i.test(source)) return "zip";
  if (existsSync(source) && statSync(source).isDirectory()) return "folder";
  return "registry";
}

async function git(args: string[], cwd?: string): Promise<string> {
  const base = ["-c", "core.hooksPath=/dev/null", "-c", "protocol.ext.allow=never", "-c", "core.fsmonitor=false"];
  try {
    const r = await exec("git", [...base, ...args], { cwd, timeout: 300_000, maxBuffer: 20_000_000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
    return r.stdout.trim();
  } catch (e) {
    const err = e as Error & { stderr?: string };
    throw new Error(`git ${args.find((a) => !a.startsWith("-") && a !== "core.hooksPath=/dev/null") ?? ""} failed: ${hideUserInfo((err.stderr ?? err.message).trim().split("\n").slice(-2).join(" "))}`);
  }
}

function within(base: string, sub: string, label: string): string {
  if (sub.split(/[\\/]/).includes("..") || isAbsolute(sub)) throw new Error(`The folder name ${sub} is not allowed.`);
  const p = join(base, sub);
  if (!existsSync(p)) return p;
  const rel = relative(realpathSync(base), realpathSync(p));
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error(`The folder ${sub} in ${label} goes outside it through a symbolic link. Cuvette does not install it.`);
  return p;
}

function findRoot(base: string, sub: string | undefined, label: string): string {
  const start = sub ? within(base, sub, label) : base;
  if (existsSync(join(start, "adapter.yaml"))) return start;
  const found: string[] = [];
  const walk = (d: string, depth: number) => {
    for (const n of readdirSync(d)) {
      if (n.startsWith(".") || n === "node_modules") continue;
      const p = join(d, n);
      if (!lstatSync(p).isDirectory()) continue;
      if (existsSync(join(p, "adapter.yaml"))) found.push(p);
      else if (depth < 2) walk(p, depth + 1);
    }
  };
  if (existsSync(start)) walk(start, 1);
  if (found.length === 1) return found[0]!;
  if (!found.length) throw new Error(`No adapter.yaml in ${label}. An adapter folder must hold adapter.yaml.`);
  throw new Error(`${label} holds ${found.length} adapters: ${found.map((f) => f.slice(base.length + 1)).join(", ")}. Name one: ADDRESS#REF:FOLDER.`);
}

function copyClean(from: string, to: string): void {
  let files = 0;
  let bytes = 0;
  const walk = (d: string, rel: string) => {
    for (const n of readdirSync(d)) {
      if (n === ".git") continue;
      const p = join(d, n);
      const st = lstatSync(p);
      const r = rel ? `${rel}/${n}` : n;
      if (st.isSymbolicLink()) throw new Error(`The source holds a symbolic link: ${r}. Cuvette does not install symbolic links.`);
      if (st.isDirectory()) {
        mkdirSync(join(to, r), { recursive: true });
        walk(p, r);
      } else if (st.isFile()) {
        files++;
        bytes += st.size;
        if (files > MAX_FILES || bytes > MAX_BYTES) throw new Error(`The source is too large: more than ${MAX_FILES} files or ${MAX_BYTES / 1e6} MB.`);
        cpSync(p, join(to, r));
      }
    }
  };
  mkdirSync(to, { recursive: true });
  walk(from, "");
}

// unzip writes symbolic links and fills the disk before copyClean can refuse them. Read the list of the zip first.
export async function checkZip(abs: string): Promise<void> {
  const list = await exec("unzip", ["-Z", "--", abs], { timeout: 60_000, maxBuffer: 50_000_000 }).catch((e: Error) => {
    throw new Error(`The zip file did not open: ${e.message.split("\n")[0]}`);
  });
  let files = 0;
  let bytes = 0;
  for (const line of list.stdout.split("\n")) {
    const m = /^(\S)\S*\s+\d+\.\d+\s+\S+\s+(\d+)\s+\S+\s+\S+\s+\S+\s+\S+\s(.*)$/.exec(line);
    if (!m) continue;
    const [, type, size, name] = m as unknown as [string, string, string, string];
    if (type === "l") throw new Error(`The zip file holds a symbolic link: ${name}. Cuvette does not install symbolic links.`);
    if (name.startsWith("/") || name.split(/[\\/]/).includes("..")) throw new Error(`The zip file holds a path that goes outside its folder: ${name}. Cuvette does not install it.`);
    if (type !== "d") files++;
    bytes += Number(size);
  }
  if (files > MAX_FILES || bytes > MAX_BYTES) throw new Error(`The zip file is too large when it opens: more than ${MAX_FILES} files or ${MAX_BYTES / 1e6} MB.`);
}

interface Staged {
  work: string;
  dir: string;
  kind: SourceKind;
  source: string;
  commit?: string;
  version?: string;
  registry?: string;
  checked?: boolean;
  expected?: string;
}

async function cloneAt(url: string, ref: string | undefined, into: string): Promise<string> {
  if (ref && (!/^[\w./@^~+-]+$/.test(ref) || ref.startsWith("-"))) throw new Error(`The ref ${ref} is not allowed.`);
  await git(["clone", "--quiet", "--no-tags", "-c", "core.autocrlf=false", "--", url, into]);
  if (ref) await git(["-C", into, "checkout", "--quiet", "--detach", ref]);
  return git(["-C", into, "rev-parse", "HEAD"]);
}

async function stage(source: string, opts: PrepareOpts): Promise<Staged> {
  sweepStaging();
  mkdirSync(stagingRoot(), { recursive: true });
  const work = mkdtempSync(join(stagingRoot(), "adapter-"));
  const kind = classify(source);
  try {
    const dir = join(work, "adapter");
    if (kind === "folder") {
      const abs = resolve(source);
      copyClean(findRoot(abs, undefined, source), dir);
      return { work, dir, kind, source: abs };
    }
    if (kind === "zip") {
      const abs = resolve(source);
      if (!existsSync(abs)) throw new Error(`No file ${abs}.`);
      await checkZip(abs);
      const out = join(work, "unzipped");
      mkdirSync(out);
      await exec("unzip", ["-q", "-o", "--", abs, "-d", out], { timeout: 120_000 }).catch((e: Error) => {
        throw new Error(`The zip file did not open: ${e.message.split("\n")[0]}`);
      });
      copyClean(findRoot(out, undefined, source), dir);
      return { work, dir, kind, source: abs };
    }
    if (kind === "git") {
      const hash = source.indexOf("#");
      const url = hash < 0 ? source : source.slice(0, hash);
      const [ref, sub] = hash < 0 ? [undefined, undefined] : source.slice(hash + 1).split(":");
      const repo = join(work, "repo");
      const commit = await cloneAt(url, ref || undefined, repo);
      copyClean(findRoot(repo, sub || undefined, withoutCredentials(url)), dir);
      return { work, dir, kind, source: withoutCredentials(source), commit };
    }
    const [name, version] = source.split("@");
    if (!NAME.test(name!)) throw new Error(`"${source}" is not a git address, a folder, a zip file or an adapter name.`);
    const index = await fetchIndex(opts.registry);
    const entry = findEntry(index, name!, version);
    if (!entry) throw new Error(`The registry ${index.registry} has no adapter ${source}. Names there: ${[...new Set(index.adapters.map((a) => a.name))].slice(0, 12).join(", ") || "none"}.`);
    return stageEntry(entry, index.registry, work);
  } catch (e) {
    rmSync(work, { recursive: true, force: true });
    throw e;
  }
}

async function stageEntry(entry: RegistryEntry, registry: string, work: string): Promise<Staged> {
  if (entry.path.split(/[\\/]/).includes("..") || isAbsolute(entry.path)) throw new Error(`The registry entry ${entry.name} has a path that is not allowed.`);
  if (/^https?:/i.test(registry) && !/^(https:\/\/|ssh:\/\/|git@)/i.test(String(entry.git))) throw new Error(`The registry entry ${entry.name} has the address ${entry.git}. An online registry must give an https or ssh address.`);
  const repo = join(work, "repo");
  const commit = await cloneAt(entry.git, entry.commit, repo);
  if (commit !== entry.commit) throw new Error(`The registry commit ${entry.commit} did not resolve to itself.`);
  const dir = join(work, "adapter");
  copyClean(within(repo, entry.path, entry.name), dir);
  if (hashFolder(dir) !== entry.sha256) throw new Error(`The files of ${entry.name} do not match the SHA-256 in the registry index. Cuvette did not install them.`);
  return { work, dir, kind: "registry", source: `${entry.name}@${entry.version}`, commit, version: entry.version, registry, checked: entry.trust === "checked" && trustedRegistry(registry), expected: entry.sha256 };
}

function commandsOf(m: Manifest): string[] {
  const all = [m.connection.command[0], m.connection.interpreter[0], m.locate.version_command[0], ...m.tools.map((t) => t.command[0])].filter((x): x is string => !!x);
  return [...new Set(all)];
}

function needsProgram(m: Manifest): string {
  const l = m.locate;
  const needs = l.env || l.paths.length || l.which.length;
  return needs ? `needs ${m.program.name}${m.program.tested_versions.length ? ` (tested with ${m.program.tested_versions.join(", ")})` : ""} on this computer` : "needs no program on this computer";
}

function summaryOf(r: Report): LintSummary {
  return { ok: r.ok, errors: r.errors, warnings: r.warnings };
}

function buildCard(dir: string, m: Manifest, r: Report, ctx: { source: string; trust: TrustLevel; ran: boolean; ranNote?: string }): Card {
  const code = codeFilesIn(dir, m);
  const declared = m.connection.network || m.connection.kind === "http";
  const netFiles = networkFilesIn(dir, code);
  const tests = r.tests ? (r.tests.every((t) => t.ok || t.skipped) ? `pass (${r.tests.filter((t) => !t.skipped).length} ran)` : `fail (${r.tests.filter((t) => !t.ok && !t.skipped).length} failed)`) : ctx.ranNote ?? "not run";
  return {
    name: m.adapter.name,
    title: m.adapter.title || m.program.name,
    version: m.adapter.version,
    source: ctx.source,
    trust: ctx.trust,
    program: needsProgram(m),
    commands: commandsOf(m),
    code,
    agentCode: codeTools(m),
    network: declared ? "yes" : netFiles.length ? "possible" : "no",
    networkWhy: declared ? "the manifest allows the network" : netFiles.length ? `the code mentions network calls: ${netFiles.join(", ")}` : "",
    tools: m.tools.map((t) => t.name),
    decisions: m.decisions.map((d) => `${d.key} (${d.label})`),
    license: licenseOf(dir),
    authors: m.adapter.authors,
    citations: [...m.program.citation.map((c) => c.text), ...m.citations.map((c) => `${c.text} (${c.tool})`)],
    lint: { ok: r.ok, errors: r.errors, warnings: r.warnings, tests },
    replaces: existsSync(join(CATALOG_DIR, m.adapter.name, "adapter.yaml")) ? m.adapter.name : undefined,
  };
}

export function cardLines(c: Card): string[] {
  const list = (items: string[], n = 8) => (items.length > n ? `${items.slice(0, n).join("; ")}; and ${items.length - n} more` : items.join("; "));
  const out = [
    `Adapter: ${c.name} ${c.version} (${c.title}).`,
    `Source: ${c.source}.`,
    `Trust: ${TRUST_NAME[c.trust]}. ${TRUST_DETAIL[c.trust]}`,
    ...(c.trust === "unlisted" ? ["WARNING: Read the files in the folder before you use this adapter."] : []),
    `Program: ${c.program}.`,
    c.commands.length ? `Commands that Cuvette starts: ${c.commands.join(", ")}.` : "Commands that Cuvette starts: none.",
    c.code.length ? `Code that runs on this computer: ${c.code.length} file${c.code.length === 1 ? "" : "s"}: ${list(c.code, 10)}. Cuvette runs it with your user permissions.` : "Code that runs on this computer: none.",
    c.agentCode.length ? `Code that the agent writes: tools ${c.agentCode.join(", ")}. You can block them in Programs.` : "",
    c.network === "no" ? "Network: no." : c.network === "yes" ? `Network: yes, ${c.networkWhy}.` : `Network: possible, ${c.networkWhy}.`,
    c.decisions.length ? `Decisions that it adds: ${c.decisions.length}: ${list(c.decisions)}.` : "Decisions that it adds: none.",
    `Tools: ${c.tools.length}.`,
    `License: ${c.license}.`,
    c.citations.length ? `Citations: ${c.citations.length}: ${list(c.citations, 4)}.` : "Citations: none.",
    `Check: ${c.lint.ok ? "passes" : "fails"} with ${c.lint.errors.length} error${c.lint.errors.length === 1 ? "" : "s"} and ${c.lint.warnings.length} warning${c.lint.warnings.length === 1 ? "" : "s"}.`,
    ...c.lint.errors.slice(0, 6).map((e) => `  error: ${e}`),
    ...c.lint.warnings.slice(0, 4).map((w) => `  warning: ${w}`),
    `Known-answer tests: ${c.lint.tests}.`,
  ];
  if (c.replaces) out.push(`NOTE: The built-in catalog has an adapter named ${c.replaces}. This copy takes its place in your sessions, and the Reviewed label does not apply to it.`);
  if (c.audit) out.push(...auditLines(c.audit));
  return out.filter(Boolean);
}

function toolNames(m: Manifest | undefined): string[] {
  return m ? m.tools.map((t) => t.name) : [];
}

function tryManifest(dir: string): Manifest | undefined {
  try {
    return loadAdapter(dir).manifest;
  } catch {
    return undefined;
  }
}

function diff(oldDir: string, newDir: string, entry: InstalledEntry, next: InstalledEntry): Changes {
  const hashes = (d: string) => new Map(listFiles(d).map((f) => [f, fileHash(join(d, f))]));
  const a = hashes(oldDir);
  const b = hashes(newDir);
  const added = [...b.keys()].filter((f) => !a.has(f));
  const removed = [...a.keys()].filter((f) => !b.has(f));
  const changed = [...b.keys()].filter((f) => a.has(f) && a.get(f) !== b.get(f));
  const om = tryManifest(oldDir);
  const nm = tryManifest(newDir);
  const permissions: string[] = [];
  if (nm) {
    const was = om ? om.connection.network || om.connection.kind === "http" : false;
    if ((nm.connection.network || nm.connection.kind === "http") && !was) permissions.push("It now uses the network.");
    const oldCode = new Set(om ? codeFilesIn(oldDir, om) : []);
    const code = codeFilesIn(newDir, nm).filter((f) => !oldCode.has(f) || changed.includes(f));
    if (code.length) permissions.push(`New or changed code: ${code.join(", ")}.`);
    const oldCmds = new Set(om ? commandsOf(om) : []);
    const cmds = commandsOf(nm).filter((c) => !oldCmds.has(c));
    if (cmds.length) permissions.push(`It starts new commands: ${cmds.join(", ")}.`);
    if (om && om.program.name !== nm.program.name) permissions.push(`It uses a different program: ${om.program.name} became ${nm.program.name}.`);
    const oldDec = new Set(om?.decisions.map((d) => d.key) ?? []);
    const dec = nm.decisions.map((d) => d.key).filter((k) => !oldDec.has(k));
    if (dec.length) permissions.push(`New decisions: ${dec.join(", ")}.`);
    const oldAgent = new Set(om ? codeTools(om) : []);
    const agent = codeTools(nm).filter((t) => !oldAgent.has(t));
    if (agent.length) permissions.push(`New tools that run code the agent writes: ${agent.join(", ")}.`);
  }
  const on = new Set(toolNames(om));
  const nn = new Set(toolNames(nm));
  return {
    from: `${entry.version}${entry.commit ? ` (${entry.commit.slice(0, 8)})` : ""}`,
    to: `${next.version}${next.commit ? ` (${next.commit.slice(0, 8)})` : ""}`,
    added,
    removed,
    changed,
    toolsAdded: [...nn].filter((t) => !on.has(t)),
    toolsRemoved: [...on].filter((t) => !nn.has(t)),
    permissions,
    edited: hashFolder(oldDir) !== entry.sha256,
  };
}

export function changeLines(c: Changes): string[] {
  const files = (label: string, f: string[]) => (f.length ? [`${label}: ${f.slice(0, 12).join(", ")}${f.length > 12 ? `, and ${f.length - 12} more` : ""}.`] : []);
  return [
    `Update: ${c.from} to ${c.to}.`,
    ...files("Files added", c.added),
    ...files("Files removed", c.removed),
    ...files("Files changed", c.changed),
    ...(c.toolsAdded.length ? [`New tools: ${c.toolsAdded.join(", ")}.`] : []),
    ...(c.toolsRemoved.length ? [`Tools removed: ${c.toolsRemoved.join(", ")}.`] : []),
    ...(c.permissions.length ? c.permissions.map((p) => `New permission: ${p}`) : ["New permissions: none."]),
    ...(c.edited ? ["WARNING: You changed the installed files after the install. The update replaces your changes."] : []),
  ];
}

async function assemble(mode: "add" | "update", st: Staged, opts: PrepareOpts, old?: InstalledEntry): Promise<InstallPlan> {
  const id = randomBytes(6).toString("hex");
  const trust: TrustLevel = st.checked ? "checked" : "unlisted";
  const shipped = codeFilesIn(st.dir, tryManifest(st.dir));
  const runTests = !!opts.runTests && !shipped.length;
  const ranNote = opts.runTests && shipped.length ? "not run: the adapter ships code. After the install, run cuvette adapter check NAME --run-tests" : undefined;
  const report = await checkAdapter(st.dir, runTests ? { runTests: true } : { static: true });
  const m = tryManifest(st.dir);
  const sha256 = hashFolder(st.dir);
  const name = m?.adapter.name ?? "unknown";
  const entry: InstalledEntry = { name, kind: st.kind, source: st.source, version: st.version ?? m?.adapter.version ?? "", commit: st.commit, registry: st.registry, sha256, installed_on: new Date().toISOString(), checked: st.checked };
  const lint = summaryOf(report);
  const card: Card = m
    ? buildCard(st.dir, m, report, { source: describe(st), trust, ran: runTests, ranNote })
    : { name, title: "", version: "", source: describe(st), trust, program: "unknown", commands: [], code: codeFilesIn(st.dir), agentCode: [], network: "no", networkWhy: "", tools: [], decisions: [], license: licenseOf(st.dir), authors: [], citations: [], lint: { ok: false, errors: report.errors, warnings: report.warnings, tests: "not run" } };
  const plan: InstallPlan = { id, mode, name, work: st.work, dir: st.dir, entry, card, lint };
  if (!report.ok) plan.refused = `The check found ${report.errors.length} error${report.errors.length === 1 ? "" : "s"}. Cuvette did not ${mode === "add" ? "install" : "update"} ${name}. Correct them and try again.`;
  else if (!NAME.test(name)) plan.refused = `The adapter name ${name} is not allowed.`;
  else if (mode === "add") {
    if (readInstalled()[name]) plan.refused = `${name} is already installed. Use cuvette adapter update ${name}.`;
    else if (existsSync(userAdapterDir(name))) plan.refused = `The folder ${userAdapterDir(name)} exists, and Cuvette did not install it. Move it away first.`;
  } else if (old && name !== old.name) plan.refused = `The new files hold the adapter ${name}, not ${old.name}. Cuvette did not update.`;
  if (!plan.refused && m) plan.review = { text: estimateReview(st.dir, lint).text };
  plans.set(id, plan);
  return plan;
}

function describe(st: Staged): string {
  if (st.kind === "git") return `git ${st.source}, pinned to commit ${st.commit}`;
  if (st.kind === "registry") return `the registry ${withoutCredentials(st.registry ?? "")}, version ${st.version}, commit ${st.commit?.slice(0, 12)}`;
  return `${st.kind} ${st.source}`;
}

export async function prepareAdd(source: string, opts: PrepareOpts = {}): Promise<InstallPlan> {
  return assemble("add", await stage(source, opts), opts);
}

export async function prepareUpdate(name: string, opts: PrepareOpts = {}): Promise<InstallPlan> {
  const old = readInstalled()[name];
  if (!old) throw new Error(`${name} was not installed with cuvette adapter add. Cuvette updates only those adapters.`);
  const oldDir = userAdapterDir(name);
  if (!existsSync(oldDir)) throw new Error(`The folder ${oldDir} is missing. Install ${name} again.`);
  const source = old.kind === "registry" ? name : old.source;
  const st = await stage(source, { ...opts, registry: old.registry ?? opts.registry });
  const plan = await assemble("update", st, opts, old);
  plan.changes = diff(oldDir, st.dir, old, plan.entry);
  if (!plan.refused && plan.entry.sha256 === old.sha256) {
    plan.upToDate = true;
    plan.refused = undefined;
  }
  return plan;
}

export function installLines(p: InstallPlan): string[] {
  return [...cardLines(p.card), ...(p.changes ? ["", ...changeLines(p.changes)] : [])];
}

export async function reviewPlan(id: string, opts: { model?: string; provider?: import("../core/types.ts").Provider } = {}): Promise<InstallPlan> {
  const p = plans.get(id);
  if (!p) throw new Error("This install plan is gone. Start again.");
  p.card.audit = await runReview(p.dir, p.lint, opts);
  p.review = undefined;
  return p;
}

export function applyInstall(id: string, opts: { confirmed: boolean }): { ok: boolean; text: string } {
  const p = plans.get(id);
  if (!p) return { ok: false, text: "This install plan is gone. Start again." };
  if (p.refused) return { ok: false, text: p.refused };
  if (!opts.confirmed) return { ok: false, text: "Nothing installed. The install needs your confirmation." };
  const target = userAdapterDir(p.name);
  if (p.mode === "add" && existsSync(target)) return { ok: false, text: `The folder ${target} exists. Nothing installed.` };
  ensureHome();
  mkdirSync(join(cuvetteHome(), "adapters"), { recursive: true });
  const fresh = `${target}.new-${p.id}`;
  rmSync(fresh, { recursive: true, force: true });
  try {
    copyClean(p.dir, fresh);
  } catch (e) {
    rmSync(fresh, { recursive: true, force: true });
    return { ok: false, text: `The staged files changed after the card: ${(e as Error).message} Nothing installed. Start again.` };
  }
  if (hashFolder(fresh) !== p.entry.sha256) {
    rmSync(fresh, { recursive: true, force: true });
    return { ok: false, text: "The staged files changed after the card. Nothing installed. Start again." };
  }
  const old = `${target}.old-${p.id}`;
  const hadOld = existsSync(target);
  const failed = (e: unknown) => ({ ok: false, text: `Nothing installed: ${(e as Error).message}${hadOld ? " The old files stay in place." : ""}` });
  if (hadOld) {
    try {
      renameSync(target, old);
    } catch (e) {
      rmSync(fresh, { recursive: true, force: true });
      return failed(e);
    }
  }
  try {
    renameSync(fresh, target);
  } catch (e) {
    if (hadOld) renameSync(old, target);
    rmSync(fresh, { recursive: true, force: true });
    return failed(e);
  }
  try {
    saveInstalled(p.entry);
  } catch (e) {
    rmSync(target, { recursive: true, force: true });
    if (hadOld) renameSync(old, target);
    return failed(e);
  }
  rmSync(old, { recursive: true, force: true });
  const code = p.card.code.length && p.card.trust === "unlisted";
  discardPlan(p.id);
  return { ok: true, text: `${p.mode === "add" ? "Installed" : "Updated"} ${p.name} ${p.entry.version} (${TRUST_NAME[p.card.trust]}) in ${target}.${p.entry.commit ? ` Commit ${p.entry.commit}.` : ""} SHA-256 ${p.entry.sha256.slice(0, 16)}.${code ? " It ships code. Cuvette asks once more before it first runs." : ""}` };
}

export function removeLines(name: string): string[] {
  return [`Cuvette deletes the folder ${userAdapterDir(name)} and its entry in the installed-adapters index.`, "The programs that the adapter used stay on this computer.", "This cannot be undone. Install the adapter again to get it back."];
}

export function removeInstalled(name: string): { ok: boolean; text: string } {
  if (!readInstalled()[name]) return { ok: false, text: `${name} was not installed with cuvette adapter add. Cuvette removes only those adapters.` };
  const dir = userAdapterDir(name);
  const base = resolve(cuvetteHome(), "adapters");
  if (resolve(dir) === base || !(resolve(dir) + sep).startsWith(base + sep)) return { ok: false, text: "Refused: the folder is outside the adapter folder." };
  rmSync(dir, { recursive: true, force: true });
  forgetInstalled(name);
  return { ok: true, text: `Removed ${name}.` };
}

export interface InstalledRow {
  name: string;
  version: string;
  trust: string;
  source: string;
  commit: string;
  sha256: string;
  state: string;
}

export function installedRows(): InstalledRow[] {
  return Object.values(readInstalled()).map((e) => {
    const dir = userAdapterDir(e.name);
    const here = existsSync(dir);
    const changed = here && hashFolder(dir) !== e.sha256;
    return { name: e.name, version: e.version, trust: changed || !e.checked || !trustedRegistry(e.registry) ? TRUST_NAME.unlisted : TRUST_NAME.checked, source: e.kind === "registry" ? `registry ${withoutCredentials(e.registry ?? "")}`.trim() : `${e.kind} ${withoutCredentials(e.source)}`, commit: e.commit ?? "", sha256: e.sha256, state: !here ? "missing" : changed ? "changed after install" : "as installed" };
  });
}

export async function inspectDir(dir: string): Promise<{ card: Card; lint: LintSummary }> {
  const report = await checkAdapter(dir, { static: true });
  const m = tryManifest(dir);
  const trust = adapterTrust(dir).level;
  if (!m) throw new Error(`No valid adapter.yaml in ${dir}: ${report.errors[0] ?? "unknown error"}`);
  return { card: buildCard(dir, m, report, { source: `folder ${dir}`, trust, ran: false }), lint: summaryOf(report) };
}
