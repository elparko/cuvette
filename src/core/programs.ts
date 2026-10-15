import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir, uptime } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline";
import { accessAll, accessFile, codeTools, networkControl, saveAccess, type Access } from "../adapters/access.ts";
import { DRIVE_ROOT } from "../adapters/blind.ts";
import { withoutSecrets } from "../adapters/kinds/common.ts";
import { CUSTOM_HOW, findProgram, locate, type Located } from "../adapters/locate.ts";
import { adapterDirs, cuvetteHome, loadAdapter, type Manifest } from "../adapters/manifest.ts";
import { applyInstall, getInstallPlan, installLines as installCardLines, prepareUpdate, removeInstalled, removeLines, type InstallPlan } from "../adapters/install.ts";
import { adapterTrust, confirmCode, TRUST_NAME, type InstalledEntry, type TrustLevel } from "../adapters/source.ts";
import { defaultFind, defaultRun, ENVS, envNameIn, envPython, importCheck, older, PROGRAM_INSTALL, q, R_PACKAGES, rInstallCommand, rLibrary, uvCommand, versionParts, type Run } from "./doctor.ts";
import { readIndex } from "./places.ts";
import { ageText } from "./sessions.ts";
import { howToCite } from "./citations.ts";

export type State = "installed" | "custom" | "found" | "missing" | "old" | "none";
export type Action = "install" | "update" | "remove" | "path" | "enable" | "disable" | "network-on" | "network-off" | "code-on" | "code-off" | "approve" | "check" | "adapter-add" | "adapter-update" | "adapter-remove" | "trust-code";
export type Via = "terminal" | "app" | "command line";

export const ACTIONS: Action[] = ["install", "update", "remove", "path", "enable", "disable", "network-on", "network-off", "code-on", "code-off", "approve", "check", "adapter-update", "adapter-remove", "trust-code"];

export interface Install {
  kind: "uv" | "r" | "brew" | "link" | "manual";
  command?: string;
  update?: string;
  link?: string;
  text?: string;
  needs?: string;
  dir?: string;
}

export interface Owned {
  kind: "folder" | "packages";
  paths: string[];
  shared: string[];
}

export interface ProgramRow {
  name: string;
  program: string;
  field: string;
  root: string;
  adapterStatus: string;
  state: State;
  version: string;
  tested: string[];
  path?: string;
  how: string;
  detail: string;
  owned?: Owned;
  size?: number;
  lastUsed?: number;
  access: Access;
  network?: boolean;
  code?: boolean;
  codeTools: string[];
  install?: Install;
  cite?: string;
  trust: TrustLevel;
  trustDetail: string;
  installed?: InstalledEntry;
  codePending: boolean;
  codeFiles: string[];
}

export interface Plan {
  action: Action;
  name: string;
  program?: string;
  title: string;
  lines: string[];
  command?: string;
  link?: string;
  runs: boolean;
  confirm?: string;
  danger?: boolean;
  refused?: string;
  paths?: string[];
  size?: number;
  customPath?: string;
  installId?: string;
  review?: string;
}

export interface ProgramsOpts {
  cwd?: string;
  home?: string;
  env?: Record<string, string | undefined>;
  quick?: boolean;
  only?: string[];
  adapters?: Record<string, { manifest: Manifest; root: string }>;
  locate?: (m: Manifest, root: string, custom?: string) => Promise<Located>;
  run?: Run;
  find?: (name: string) => string | undefined;
  size?: (paths: string[]) => Promise<number | undefined>;
  lastUsed?: () => Map<string, number>;
}

export interface RunOpts extends ProgramsOpts {
  confirmed?: boolean;
  via: Via;
  by?: string;
  exec?: (command: string, onLine: (line: string) => void, signal?: AbortSignal) => Promise<number | null>;
  signal?: AbortSignal;
  remove?: (path: string) => void;
  approve?: (root: string, by: string) => Promise<unknown>;
  onLine?: (line: string) => void;
  record?: { append(kind: "program", data: Record<string, unknown>): unknown };
}

const tilde = (p: string) => (p.startsWith(homedir() + "/") ? "~" + p.slice(homedir().length) : p);

function real(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
}

function under(root: string, p: string): string | undefined {
  const r = relative(real(root), real(p));
  return !r || r.startsWith("..") || isAbsolute(r) ? undefined : r;
}

function manifests(opts: ProgramsOpts): Record<string, { manifest: Manifest; root: string }> {
  if (opts.adapters) return opts.adapters;
  const out: Record<string, { manifest: Manifest; root: string }> = {};
  for (const [name, root] of Object.entries(adapterDirs(opts.cwd))) {
    try {
      out[name] = { manifest: loadAdapter(root).manifest, root };
    } catch {}
  }
  return out;
}

function installPlaces(all: Manifest[], home: string): string[] {
  const out = new Set<string>();
  for (const m of all)
    for (const p of m.locate.paths) {
      const a = /^~\/\.cuvette\/([^/*]+)\//.exec(p)?.[1];
      if (a && a !== "envs") out.add(join(home, a));
      const b = DRIVE_ROOT && new RegExp(`^${DRIVE_ROOT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/tools/([^/*]+)/`).exec(p)?.[1];
      if (b && b !== "R-library") out.add(join(DRIVE_ROOT, "tools", b));
    }
  return [...out];
}

export function ownedFolder(path: string, home: string, places: string[]): string | undefined {
  const env = under(join(home, "envs"), path);
  if (env) return join(home, "envs", env.split(sep)[0]!);
  return places.find((d) => existsSync(d) && under(d, path) !== undefined);
}

export function ownedLibrary(lib: string, home: string): boolean {
  return [join(home, "R-library"), ...(DRIVE_ROOT ? [join(DRIVE_ROOT, "tools", "R-library")] : [])].some((d) => real(d) === real(lib));
}

async function duSize(paths: string[]): Promise<number | undefined> {
  const have = paths.filter((p) => existsSync(p));
  if (!have.length) return undefined;
  const r = await defaultRun(["du", "-sk", ...have], 120_000);
  const kb = r.stdout.split("\n").map((l) => Number(l.split(/\s+/)[0])).filter((n) => Number.isFinite(n));
  return kb.length ? kb.reduce((a, b) => a + b, 0) * 1024 : undefined;
}

export function lastUsedMap(home = cuvetteHome()): Map<string, number> {
  const logs = new Set<string>();
  try {
    for (const r of readIndex(join(home, "sessions-index.json"))) logs.add(join(r.folder, ".record", "log.jsonl"));
  } catch {}
  const dir = join(home, "sessions");
  if (existsSync(dir)) for (const id of readdirSync(dir)) logs.add(join(dir, id, "log.jsonl"));
  const out = new Map<string, number>();
  const seen = (name: unknown, t: number) => {
    if (typeof name === "string" && t > (out.get(name) ?? 0)) out.set(name, t);
  };
  for (const log of logs) {
    let text = "";
    try {
      text = readFileSync(log, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      if (!line.includes('"kind":"adapter"') && !line.includes('"kind":"session"')) continue;
      try {
        const e = JSON.parse(line);
        const t = Date.parse(e.ts) || 0;
        if (e.kind === "adapter") seen(e.data?.name, t);
        else if (e.kind === "session") for (const a of (e.data?.adapters ?? []) as { name?: string }[]) seen(a.name, t);
      } catch {}
    }
  }
  return out;
}

function installFor(name: string, m: Manifest, home: string, lib: string, find: (n: string) => string | undefined): Install | undefined {
  const env = envNameIn(m);
  if (env && ENVS[env]) {
    const py = envPython(home, env);
    return { kind: "uv", dir: join(home, "envs", env), command: uvCommand(home, env), update: `uv pip install --python ${q(py)} --upgrade ${ENVS[env]!.packages.map(q).join(" ")}`, link: m.program.homepage || undefined, needs: find("uv") ? undefined : "uv" };
  }
  const r = R_PACKAGES[name];
  if (r) {
    const cmd = rInstallCommand(lib, r);
    return { kind: "r", dir: lib, command: cmd, update: cmd, link: m.program.homepage || undefined, needs: find("Rscript") ? undefined : "R" };
  }
  const fix = PROGRAM_INSTALL[name];
  if (fix?.command?.startsWith("brew ")) return { kind: "brew", command: fix.command, update: fix.command.replace(/^brew install/, "brew upgrade"), link: fix.link, needs: find("brew") ? undefined : "Homebrew" };
  if (fix?.link) return { kind: "link", link: fix.link };
  if (m.program.install.trim()) return { kind: "manual", text: m.program.install.trim().replace(/\s+/g, " "), link: m.program.homepage || undefined };
  if (m.program.homepage) return { kind: "link", link: m.program.homepage };
  return undefined;
}

async function rVersions(run: Run, rscript: string | undefined, lib: string, pkgs: string[]): Promise<Map<string, string>> {
  if (!rscript || !pkgs.length) return new Map();
  const code = `.libPaths(c(${JSON.stringify(lib)}, .libPaths())); for (p in c(${pkgs.map((x) => `"${x}"`).join(", ")})) cat(p, if (requireNamespace(p, quietly = TRUE)) as.character(packageVersion(p)) else "-", "\\n")`;
  const out = await run([rscript, "-e", code], 120_000);
  return new Map(out.stdout.split("\n").map((l) => l.trim().split(/\s+/) as [string, string]).filter((x) => x.length === 2 && x[1] !== "-"));
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k]!);
    }
  }));
  return out;
}

export async function listPrograms(opts: ProgramsOpts = {}): Promise<ProgramRow[]> {
  const home = opts.home ?? cuvetteHome();
  const env = opts.env ?? process.env;
  const run = opts.run ?? defaultRun;
  const find = opts.find ?? defaultFind(env);
  const all = manifests(opts);
  const places = installPlaces(Object.values(all).map((x) => x.manifest), home);
  const lib = rLibrary(env);
  const access = accessAll(opts.cwd);
  const used = (opts.lastUsed ?? (() => lastUsedMap(home)))();
  const sizeOf = opts.size ?? duSize;
  const names = Object.keys(all).filter((n) => !opts.only || opts.only.includes(n)).sort();
  const rNames = names.filter((n) => R_PACKAGES[n]);
  const rPkgs = [...new Set(rNames.flatMap((n) => [...(R_PACKAGES[n]!.cran ?? []), ...(R_PACKAGES[n]!.bioc ?? [])]))];
  const rHave = opts.quick ? new Map<string, string>() : await rVersions(run, find("Rscript"), lib, rPkgs);
  const envUsers = new Map<string, string[]>();
  for (const [n, a] of Object.entries(all)) {
    const e = envNameIn(a.manifest);
    if (e) envUsers.set(e, [...(envUsers.get(e) ?? []), n]);
  }

  const rows = await pool(names, 6, async (name): Promise<ProgramRow> => {
    const { manifest: m, root } = all[name]!;
    const acc = access[name] ?? {};
    const l = m.locate;
    const checks = Boolean(l.env || l.paths.length || l.which.length || acc.path);
    const located: Located = !checks ? { version: "", how: "" } : opts.quick ? { ...findProgram(m, acc.path), version: "" } : await (opts.locate ?? ((mm, r, c) => locate(mm, r, c)))(m, root, acc.path).catch(() => ({ path: undefined, version: "", how: "not found" }));
    let version = located.version;
    if (located.path && !version) version = /ij-(\d[\w.]*)\.jar$/.exec(located.path)?.[1] ?? "";
    const tested = m.program.tested_versions.filter((t) => versionParts(t).length);
    const lowest = [...tested].sort((a, b) => (older(a, b) ? -1 : 1))[0];
    const envName = envNameIn(m);
    const rPk = R_PACKAGES[name] ? [...(R_PACKAGES[name]!.cran ?? []), ...(R_PACKAGES[name]!.bioc ?? [])] : [];
    let state: State;
    let detail = "";
    if (!checks) {
      state = "none";
      detail = "This adapter needs no program on this computer.";
    } else if (!located.path) {
      state = "missing";
      detail = `${m.program.name} was not found${located.how && located.how !== "not found" ? `: ${located.how.replace(/^not found;\s*/, "")}` : "."}`;
    } else {
      state = located.how === CUSTOM_HOW ? "custom" : opts.quick ? "found" : "installed";
      if (!opts.quick && envName && ENVS[envName] && located.path.startsWith(join(home, "envs"))) {
        const r = await importCheck(run, located.path, ENVS[envName]!.modules);
        if (!r.ok) {
          state = "missing";
          detail = r.runs ? `The environment ${envName} lacks these packages: ${r.missing.join(", ")}.` : `The environment ${envName} has no working Python.`;
        }
      }
      if (!opts.quick && rPk.length) {
        const missing = rPk.filter((p) => !rHave.has(p));
        if (missing.length) {
          state = "missing";
          detail = `These R packages are missing: ${missing.join(", ")} (library ${tilde(lib)}).`;
        } else version = rPk.map((p) => `${p} ${rHave.get(p)}`).join(", ");
      }
      if (state !== "missing" && lowest && version && !rPk.length && older(version, lowest)) {
        state = "old";
        detail = `${m.program.name} ${version} is older than the tested version ${lowest}.`;
      }
      if (!detail) detail = rPk.length ? `R packages ${version} in ${tilde(lib)}, R at ${tilde(located.path)}.` : `${m.program.name}${version ? ` ${version}` : ""} at ${tilde(located.path)}${state === "custom" ? " (custom path)" : ""}.`;
    }
    if (acc.path && state !== "custom") detail += ` The custom path ${tilde(acc.path)} does not hold ${m.program.name}.`;

    let owned: Owned | undefined;
    if (rPk.length && ownedLibrary(lib, home)) {
      const others = new Set(Object.entries(R_PACKAGES).filter(([n]) => n !== name && all[n]).flatMap(([, p]) => [...(p.cran ?? []), ...(p.bioc ?? [])]));
      const paths = rPk.filter((p) => !others.has(p)).map((p) => join(lib, p)).filter((p) => existsSync(p));
      if (paths.length) owned = { kind: "packages", paths, shared: rPk.filter((p) => others.has(p)) };
    } else if (envName && existsSync(join(home, "envs", envName))) owned = { kind: "folder", paths: [join(home, "envs", envName)], shared: (envUsers.get(envName) ?? []).filter((n) => n !== name) };
    else if (located.path) {
      const dir = ownedFolder(located.path, home, places);
      if (dir) owned = { kind: "folder", paths: [dir], shared: [] };
    }

    const trust = adapterTrust(root);
    return {
      name,
      trust: trust.level,
      trustDetail: trust.detail,
      installed: trust.entry,
      codePending: !trust.codeConfirmed,
      codeFiles: trust.codeFiles,
      program: m.program.name,
      field: m.adapter.field || "other",
      root,
      adapterStatus: m.adapter.status,
      state,
      version,
      tested,
      path: located.path,
      how: located.how,
      detail,
      owned,
      size: owned && !opts.quick ? await sizeOf(owned.paths) : undefined,
      lastUsed: used.get(name),
      access: acc,
      network: networkControl(m) ? (acc.network ?? m.connection.network) : undefined,
      code: codeTools(m).length ? acc.code !== false : undefined,
      codeTools: codeTools(m),
      install: installFor(name, m, home, lib, find),
      cite: howToCite({ manifest: m, name }).join(" ") || undefined,
    };
  });
  return rows.sort((a, b) => a.field.localeCompare(b.field) || a.name.localeCompare(b.name));
}

export function sizeText(bytes?: number): string {
  if (bytes === undefined) return "";
  const units = ["bytes", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return i === 0 ? `${v} bytes` : `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export function lastUseText(t?: number, now = Date.now()): string {
  return t ? ageText(now - t) : "never";
}

export const STATE_LABEL: Record<State, string> = { installed: "installed", custom: "custom path", found: "found", missing: "missing", old: "old version", none: "no program" };

export function stateText(r: ProgramRow): string {
  if (r.access.off) return `off · ${STATE_LABEL[r.state]}`;
  return STATE_LABEL[r.state];
}

export function originText(r: ProgramRow): string {
  if (r.state === "none") return "";
  if (r.owned) return "Cuvette";
  return r.path ? "Installed outside Cuvette" : "";
}

export function accessText(r: ProgramRow): string {
  return [r.access.off ? "off" : "on", r.network === undefined ? "" : r.network ? "network" : "no network", r.code === undefined ? "" : r.code ? "runs its code" : "no own code"].filter(Boolean).join(", ");
}

export function availableActions(r: ProgramRow): Action[] {
  const out: Action[] = [];
  if (r.state === "missing" && r.install) out.push("install");
  if ((r.state === "installed" || r.state === "old" || r.state === "custom" || r.state === "found") && r.install && (r.owned || r.install.kind === "brew" || r.install.kind === "link" || r.install.kind === "manual")) out.push("update");
  if (r.owned) out.push("remove");
  if (r.state !== "none") out.push("path");
  out.push(r.access.off ? "enable" : "disable");
  if (r.network !== undefined) out.push(r.network ? "network-off" : "network-on");
  if (r.code !== undefined) out.push(r.code ? "code-off" : "code-on");
  if (r.adapterStatus === "draft") out.push("approve");
  if (r.installed) out.push("adapter-update", "adapter-remove");
  if (r.codePending) out.push("trust-code");
  out.push("check");
  return out;
}

export const ACTION_LABEL: Record<Action, string> = {
  install: "Install",
  update: "Update",
  remove: "Remove",
  path: "Set path",
  enable: "Turn on",
  disable: "Turn off",
  "network-on": "Allow the network",
  "network-off": "Block the network",
  "code-on": "Allow its own code",
  "code-off": "Block its own code",
  approve: "Approve",
  check: "Check again",
  "adapter-add": "Add an adapter",
  "adapter-update": "Update the adapter",
  "adapter-remove": "Remove the adapter",
  "trust-code": "Allow its code to run",
};

const windowsInstallText = (program: string, link?: string) => `Cuvette cannot run the install command on Windows. Nothing changes. ${link ? `Download ${program} from this link, then choose Check again: ${link}` : `Install ${program} yourself, then choose Check again.`}`;

function installLines(r: ProgramRow, i: Install, update: boolean, canRun: boolean): Partial<Plan> {
  const verb = update ? "Update" : "Install";
  const tested = r.tested.length ? `The adapter is tested with ${r.program} ${r.tested.join(", ")}.` : "";
  const cmd = update ? i.update ?? i.command : i.command;
  if (!canRun && (i.kind === "uv" || i.kind === "r" || i.kind === "brew")) return { refused: windowsInstallText(r.program, i.link), link: i.link, runs: false, lines: [] };
  if (i.kind === "uv" || i.kind === "r") {
    if (i.needs) return { refused: `${i.needs} is not installed. Install ${i.needs} first: ${i.needs === "uv" ? "brew install uv" : "brew install r"}.`, command: i.needs === "uv" ? "brew install uv" : "brew install r", runs: false };
    const where = i.kind === "uv" ? `the Python environment ${tilde(i.dir!)}` : `the R library ${tilde(i.dir!)}`;
    return { command: cmd, link: i.link, runs: true, confirm: verb, lines: [`Cuvette runs the command below. It ${update ? "updates the packages in" : "installs the packages into"} ${where}. Nothing else on this computer changes.`, tested].filter(Boolean) };
  }
  if (i.kind === "brew") {
    if (i.needs) return { refused: "Homebrew is not installed. Install the program from the link, or install Homebrew from https://brew.sh first.", command: cmd, link: i.link, runs: false };
    return { command: cmd, link: i.link, runs: true, confirm: "Run Homebrew", lines: [`Cuvette runs Homebrew with the command below. Homebrew ${update ? "updates" : "installs"} ${r.program} for every user of this computer. Cuvette does not remove it later.`, tested, i.link ? "Or download it yourself from the link." : ""].filter(Boolean) };
  }
  if (i.kind === "link") return { link: i.link, runs: false, lines: [`Download ${r.program} from the link and install it. Then choose Check again.`, tested].filter(Boolean) };
  return { link: i.link, runs: false, lines: [i.text!, "Then choose Check again.", tested].filter(Boolean) };
}

export async function planAction(r: ProgramRow, action: Action, opts: { path?: string; by?: string; locate?: ProgramsOpts["locate"]; manifest?: Manifest; exec?: RunOpts["exec"] } = {}): Promise<Plan> {
  const base: Plan = { action, name: r.name, program: r.program, title: `${ACTION_LABEL[action]}: ${r.program} (${r.name})`, lines: [], runs: true };
  const refuse = (why: string, more: Partial<Plan> = {}): Plan => ({ ...base, ...more, runs: false, refused: why });
  switch (action) {
    case "install":
    case "update": {
      if (!r.install) return refuse(`The adapter ${r.name} gives no install command for ${r.program}.`);
      if (action === "install" && (r.state === "installed" || r.state === "custom" || r.state === "found")) return refuse(`${r.program} is already installed. Choose Update.`);
      if (action === "update" && r.state === "missing") return refuse(`${r.program} is not installed. Choose Install.`);
      return { ...base, lines: [], ...installLines(r, r.install, action === "update", process.platform !== "win32" || !!opts.exec) };
    }
    case "remove": {
      if (!r.owned) return refuse(r.path ? `Installed outside Cuvette: ${tilde(r.path)}. Cuvette removes only what it installed.` : `Nothing to remove: ${r.program} is not installed.`);
      const lines = [`${r.owned.kind === "packages" ? "Cuvette deletes these R packages" : "Cuvette deletes this folder"}: ${r.owned.paths.map(tilde).join(", ")}`, `Size: ${sizeText(r.size) || "unknown"}.`];
      if (r.owned.shared.length) lines.push(r.owned.kind === "packages" ? `These packages stay, because other adapters use them: ${r.owned.shared.join(", ")}.` : `These adapters use the same environment and stop working too: ${r.owned.shared.join(", ")}.`);
      lines.push("This cannot be undone. Install it again to get it back.");
      return { ...base, lines, confirm: "Delete", danger: true, paths: r.owned.paths, size: r.size };
    }
    case "path": {
      const raw = (opts.path ?? "").trim();
      if (!raw) {
        if (!r.access.path) return refuse("Type the path of the program, or of the folder that holds it.");
        return { ...base, title: `Remove the custom path: ${r.program}`, lines: [`Cuvette forgets the path ${tilde(r.access.path)} and looks in the usual places again.`, `The setting is in ${tilde(accessFile())}.`], confirm: "Remove the path", customPath: "" };
      }
      const abs = resolve(raw.replace(/^~(?=\/|$)/, homedir()));
      if (!existsSync(abs)) return refuse(`There is no file or folder at ${tilde(abs)}.`);
      if (!opts.manifest) return refuse("The adapter did not load.");
      const m = opts.manifest;
      const bare = { ...m, locate: { ...m.locate, env: "", paths: [], which: [] } };
      const found = await (opts.locate ?? ((mm, root, c) => locate(mm, root, c)))(bare, r.root, abs).catch((e: Error) => ({ path: undefined, version: "", how: e.message }));
      if (!found.path) return refuse(`${tilde(abs)} is not ${r.program}${found.how && found.how !== "not found" ? `: ${found.how.replace(/^not found;\s*/, "")}` : "."}`);
      return { ...base, lines: [`Found ${r.program}${found.version ? ` ${found.version}` : ""} at ${tilde(found.path)}.`, `Cuvette saves the path in ${tilde(accessFile())}. A session uses it when it loads ${r.name}.`], confirm: "Save the path", customPath: abs };
    }
    case "enable":
      if (!r.access.off) return refuse(`${r.name} is already on.`);
      return { ...base, lines: [`list_adapters offers ${r.name} again, and a session can load it.`], confirm: "Turn on" };
    case "disable":
      if (r.access.off) return refuse(`${r.name} is already off.`);
      return { ...base, lines: [`list_adapters does not offer ${r.name}, and no session can load it.`, "A session that runs now keeps it until the session ends.", "The program stays on this computer."], confirm: "Turn off" };
    case "network-on":
    case "network-off":
      if (r.network === undefined) return refuse(`The adapter ${r.name} does not control network use.`);
      return { ...base, lines: [action === "network-on" ? `The tools of ${r.name} can send requests to the network.` : `The tools of ${r.name} cannot send requests to the network.`, "This applies when a session loads the adapter."], confirm: action === "network-on" ? "Allow" : "Block" };
    case "code-on":
    case "code-off":
      if (r.code === undefined) return refuse(`The adapter ${r.name} has no tool that runs code that the agent writes.`);
      return { ...base, lines: [action === "code-on" ? `The agent can use ${r.codeTools.join(", ")} again. Each call still asks for permission.` : `A session that loads ${r.name} does not get these tools: ${r.codeTools.join(", ")}. The agent uses only the fixed tools of the adapter.`, "This applies when a session loads the adapter."], confirm: action === "code-on" ? "Allow" : "Block" };
    case "approve": {
      if (r.adapterStatus !== "draft") return refuse(`${r.name} is ${r.adapterStatus}, not a draft.`);
      const today = new Date().toISOString().slice(0, 10);
      return { ...base, lines: ["Cuvette checks the adapter for errors.", `Then it writes status: approved, approved_by: ${opts.by ?? "you"} and approved_on: ${today} in ${tilde(join(r.root, "adapter.yaml"))}.`, "Approve only an adapter that you checked: its tools, its standards and its tests."], confirm: "Approve" };
    }
    case "adapter-update": {
      if (!r.installed) return refuse(`${r.name} was not installed with cuvette adapter add.`);
      try {
        const p = await prepareUpdate(r.name);
        return planFromInstall(p, base);
      } catch (e) {
        return refuse((e as Error).message);
      }
    }
    case "adapter-remove":
      if (!r.installed) return refuse(`${r.name} was not installed with cuvette adapter add.`);
      return { ...base, title: `Remove the adapter: ${r.name}`, lines: removeLines(r.name), confirm: "Remove", danger: true };
    case "trust-code":
      if (!r.codePending) return refuse(`${r.name} needs no confirmation.`);
      return { ...base, title: `Allow the code of ${r.name} to run`, lines: [`${r.name} is Unlisted: nobody reviewed or checked it.`, `Cuvette runs this code with your user permissions: ${r.codeFiles.join(", ")}.`, "Allow it only if you read every one of these files.", "The permission ends when the files change."], confirm: "Allow", danger: true };
    case "adapter-add":
      return refuse("Use Add an adapter.");
    case "check":
      return { ...base, title: `Check again: ${r.program} (${r.name})`, lines: [`Cuvette looks for ${r.program} and checks its version.`] };
  }
}

const EXIT_GRACE_MS = 500;

export function defaultExec(command: string, onLine: (line: string) => void, signal?: AbortSignal): Promise<number | null> {
  const PATH = [process.env.PATH, "/opt/homebrew/bin", "/usr/local/bin", join(homedir(), ".local/bin")].join(":");
  return new Promise((done) => {
    if (signal?.aborted) return done(null);
    const child = spawn("/bin/sh", ["-c", command], { env: { ...withoutSecrets(), PATH, HOMEBREW_NO_AUTO_UPDATE: "1" }, stdio: ["ignore", "pipe", "pipe"], detached: !!signal });
    for (const s of [child.stdout, child.stderr]) createInterface({ input: s }).on("line", onLine);
    const kill = (sig: NodeJS.Signals) => {
      try {
        process.kill(-child.pid!, sig);
      } catch {}
    };
    const forced = () => kill("SIGKILL");
    let hard: NodeJS.Timeout | undefined;
    let grace: NodeJS.Timeout | undefined;
    let ended = false;
    const end = (code: number | null) => {
      if (ended) return;
      ended = true;
      signal?.removeEventListener("abort", stop);
      process.removeListener("exit", forced);
      clearTimeout(hard);
      clearTimeout(grace);
      child.stdout.destroy();
      child.stderr.destroy();
      done(code);
    };
    function stop() {
      kill("SIGTERM");
      process.once("exit", forced);
      hard = setTimeout(forced, 5000);
      hard.unref();
    }
    signal?.addEventListener("abort", stop, { once: true });
    child.on("error", (e) => (onLine(e.message), end(null)));
    child.on("exit", (code) => {
      grace = setTimeout(() => end(code), EXIT_GRACE_MS);
    });
    child.on("close", end);
  });
}

const NEEDS_PASSWORD = /a terminal is required to read the password|a password is required|no tty present|askpass|^\s*password:/im;

// One install or update of a program at a time, also across processes: the app, the terminal and cuvette programs.
function runFiles(home: string, plan: Plan): string[] {
  // Homebrew allows one install at a time, so two Homebrew commands for two programs cannot run together.
  const keys = [plan.name, ...(plan.command ? [createHash("sha256").update(plan.command).digest("hex").slice(0, 16)] : []), ...(/(^|[\s;&|])brew\s/.test(plan.command ?? "") ? ["homebrew"] : [])];
  return keys.map((k) => join(home, "programs-running", k.replace(/[^\w.-]/g, "_") + ".json"));
}

export function runningText(home: string, plan: Plan): string | undefined {
  for (const f of runFiles(home, plan)) {
    let other: { pid?: number; action?: string; name?: string; started?: string } = {};
    try {
      other = JSON.parse(readFileSync(f, "utf8"));
    } catch {
      continue;
    }
    if (!other || typeof other !== "object") continue;
    // After a restart of the computer, a new process can have the process ID of a lock file from before the restart.
    const beforeBoot = Date.parse(other.started ?? "") < Date.now() - uptime() * 1000 - 60_000;
    if (other.pid && !beforeBoot && pidAlive(other.pid)) return `${other.name ?? plan.name}: an ${other.action === "update" ? "update" : "install"} runs now. Wait for it to end, or stop it. Nothing changed.`;
  }
  return undefined;
}

function claimRun(home: string, plan: Plan): { release: () => void } | { busy: string } {
  const busy = runningText(home, plan);
  if (busy) return { busy };
  const keys = runFiles(home, plan);
  mkdirSync(join(home, "programs-running"), { recursive: true });
  const mine = JSON.stringify({ pid: process.pid, action: plan.action, name: plan.name, started: new Date().toISOString() });
  const made: string[] = [];
  for (const f of keys) {
    try {
      writeFileSync(f, mine, { flag: "wx" });
    } catch {
      const busy = runningText(home, plan);
      if (!busy) rmSync(f, { force: true });
      try {
        if (busy) throw new Error(busy);
        writeFileSync(f, mine, { flag: "wx" });
      } catch {
        for (const m of made) rmSync(m, { force: true });
        return { busy: busy ?? `${plan.name}: an install runs now. Wait for it to end, or stop it. Nothing changed.` };
      }
    }
    made.push(f);
  }
  return {
    release: () => {
      for (const f of keys) {
        try {
          if (JSON.parse(readFileSync(f, "utf8"))?.pid === process.pid) rmSync(f, { force: true });
        } catch {}
      }
    },
  };
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

export function logFile(home = cuvetteHome()): string {
  return join(home, "programs-log.jsonl");
}

export function readLog(home = cuvetteHome()): Record<string, unknown>[] {
  if (!existsSync(logFile(home))) return [];
  return readFileSync(logFile(home), "utf8").split("\n").filter(Boolean).map((l) => {
    try {
      const v = JSON.parse(l);
      return v && typeof v === "object" && !Array.isArray(v) ? v : {};
    } catch {
      return {};
    }
  });
}

function writeLog(home: string, data: Record<string, unknown>): void {
  mkdirSync(home, { recursive: true });
  appendFileSync(logFile(home), JSON.stringify({ ts: new Date().toISOString(), ...data }) + "\n");
}

export async function runAction(plan: Plan, opts: RunOpts): Promise<{ ok: boolean; text: string; rows?: ProgramRow[] }> {
  const home = opts.home ?? cuvetteHome();
  const say = opts.onLine ?? (() => {});
  if (plan.refused) return { ok: false, text: plan.refused };
  if (plan.action === "check") {
    const rows = await listPrograms({ ...opts, only: [plan.name] });
    return { ok: true, text: rows[0] ? `${rows[0].program}: ${stateText(rows[0])}. ${rows[0].detail}` : `No adapter ${plan.name}.`, rows };
  }
  if (!plan.runs) return { ok: false, text: plan.link ? `Cuvette does not install ${plan.name}. Download it: ${plan.link}` : `Cuvette does not run this. ${plan.lines.join(" ")}` };
  if (plan.confirm && !opts.confirmed) return { ok: false, text: "Nothing changed. This action needs your confirmation." };
  const done = (ok: boolean, text: string, extra: Record<string, unknown> = {}) => {
    const data = { action: plan.action, adapter: plan.name, ok, text, via: opts.via, ...extra };
    writeLog(home, data);
    opts.record?.append("program", data);
    return { ok, text };
  };
  switch (plan.action) {
    case "install":
    case "update": {
      if (process.platform === "win32" && !opts.exec) return { ok: false, text: windowsInstallText(plan.program ?? plan.name, plan.link) };
      const claim = claimRun(home, plan);
      if ("busy" in claim) return { ok: false, text: claim.busy };
      try {
        say(`$ ${plan.command}`);
        const tail: string[] = [];
        const code = await (opts.exec ?? defaultExec)(plan.command!, (l) => (tail.push(l), tail.length > 200 && tail.shift(), say(l)), opts.signal);
        const verb = plan.action === "install" ? "install" : "update";
        if (opts.signal?.aborted && code !== 0) return done(false, `You stopped the ${verb}. Part of ${plan.name} can be on this computer. Choose ${plan.action === "install" ? "Install" : "Update"} again to finish it.`, { command: plan.command, code, stopped: true });
        if (code !== 0 && NEEDS_PASSWORD.test(tail.join("\n"))) return done(false, `The command asks for your password, and Cuvette cannot type it. Run the command in Terminal, then choose Check again: ${plan.command}`, { command: plan.command, code, password: true });
        return done(code === 0, code === 0 ? `${plan.action === "install" ? "Installed" : "Updated"} ${plan.name}.` : `The command stopped with exit code ${code}. Nothing else changed.`, { command: plan.command, code });
      } finally {
        claim.release();
      }
    }
    case "remove": {
      const busy = runningText(home, plan);
      if (busy) return { ok: false, text: busy };
      const places = installPlaces(Object.values(manifests(opts)).map((x) => x.manifest), home);
      const lib = rLibrary(opts.env ?? process.env);
      for (const p of plan.paths ?? []) {
        const ok = ownedFolder(p, home, places) === p || (ownedLibrary(lib, home) && under(lib, p) !== undefined && !under(lib, p)!.includes(sep));
        if (!ok) return done(false, `Refused: ${tilde(p)} is outside the folders that Cuvette installs into. Nothing was deleted.`, { paths: plan.paths });
      }
      for (const p of plan.paths ?? []) {
        say(`Deleting ${tilde(p)}`);
        (opts.remove ?? ((x: string) => rmSync(x, { recursive: true })))(p);
      }
      return done(true, `Removed ${plan.name}: ${sizeText(plan.size) || "the files"} deleted.`, { paths: plan.paths, size: plan.size });
    }
    case "path":
      saveAccess(plan.name, { path: plan.customPath || undefined });
      return done(true, plan.customPath ? `${plan.name} now uses ${tilde(plan.customPath)}.` : `${plan.name} no longer uses a custom path.`, { path: plan.customPath || null });
    case "enable":
    case "disable": {
      saveAccess(plan.name, { off: plan.action === "disable" ? true : undefined });
      const still = !!accessAll(opts.cwd)[plan.name]?.off !== (plan.action === "disable");
      return done(true, `${plan.name} is now ${plan.action === "disable" ? "off" : "on"}.${still ? " A project setting in .cuvette/settings.json still wins in this folder." : ""}`, { off: plan.action === "disable" });
    }
    case "network-on":
    case "network-off":
      saveAccess(plan.name, { network: plan.action === "network-on" });
      return done(true, `${plan.name}: network ${plan.action === "network-on" ? "allowed" : "blocked"}.`, { network: plan.action === "network-on" });
    case "code-on":
    case "code-off":
      saveAccess(plan.name, { code: plan.action === "code-on" ? undefined : false });
      return done(true, `${plan.name}: its own code is ${plan.action === "code-on" ? "allowed" : "blocked"}.`, { code: plan.action === "code-on" });
    case "adapter-add":
    case "adapter-update": {
      const r = applyInstall(plan.installId ?? "", { confirmed: true });
      return done(r.ok, r.text);
    }
    case "adapter-remove": {
      const r = removeInstalled(plan.name);
      return done(r.ok, r.text);
    }
    case "trust-code": {
      const root = manifests(opts)[plan.name]?.root;
      if (!root) return done(false, `No adapter ${plan.name}.`);
      confirmCode(root);
      return done(true, `${plan.name}: the code can run. The permission ends when the files change.`);
    }
    case "approve": {
      const root = manifests(opts)[plan.name]?.root;
      if (!root) return done(false, `No adapter ${plan.name}.`);
      const by = opts.by ?? process.env.USER ?? "scientist";
      try {
        await (opts.approve ?? (async (r: string, b: string) => (await import("../onboarding/checker.ts")).approveAdapter(r, b)))(root, by);
      } catch (e) {
        return done(false, `Not approved: ${(e as Error).message}`);
      }
      return done(true, `Approved ${plan.name} (by ${by}).`, { by });
    }
  }
  return { ok: false, text: "Unknown action." };
}

export function programsTable(rows: ProgramRow[], now = Date.now()): string {
  const head = ["Adapter", "Program", "Status", "Version", "Size", "Last use", "Installed by", "Adapter status", "Trust", "Access"];
  const body = rows.map((r) => [r.name, r.program, stateText(r), r.version.length > 24 ? r.version.slice(0, 23) + "…" : r.version, sizeText(r.size), lastUseText(r.lastUsed, now), originText(r) === "Installed outside Cuvette" ? "outside Cuvette" : originText(r), r.adapterStatus, TRUST_NAME[r.trust], accessText(r)]);
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i]!.length)));
  const fmt = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i]!)).join("  ").trimEnd();
  const out = ["  " + fmt(head), "  " + fmt(widths.map((w) => "-".repeat(w)))];
  let field = "";
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]!.field !== field) {
      field = rows[i]!.field;
      out.push(field.charAt(0).toUpperCase() + field.slice(1));
    }
    out.push("  " + fmt(body[i]!));
  }
  return out.join("\n");
}

export function planText(p: Plan): string {
  const out = [p.title];
  if (p.refused) out.push(p.refused);
  out.push(...p.lines);
  if (p.command) out.push(`Command: ${p.command}`);
  if (p.link) out.push(`Link: ${p.link}`);
  return out.join("\n");
}

export function planFromInstall(p: InstallPlan, base?: Plan): Plan {
  const add = p.mode === "add";
  const verb = add ? "Add" : "Update";
  return {
    ...(base ?? { action: add ? "adapter-add" : "adapter-update", name: p.name, runs: true, lines: [] }),
    title: `${verb} the adapter: ${p.name}`,
    lines: installCardLines(p),
    runs: !p.refused && !p.upToDate,
    refused: p.upToDate ? `${p.name} is up to date.` : p.refused,
    confirm: add ? "Install" : "Update",
    danger: p.card.trust === "unlisted",
    installId: p.id,
    review: p.review ? `Ask Claude to review the files (${p.review.text})` : undefined,
  };
}

export function planByInstall(id: string): Plan | undefined {
  const p = getInstallPlan(id);
  return p ? planFromInstall(p) : undefined;
}

export function isProgramAction(a: string): a is Action {
  return (ACTIONS as string[]).includes(a);
}

