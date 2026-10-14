import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir, tmpdir } from "node:os";
import { basename, delimiter, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { addOldEnv } from "../core/old-names.ts";
import type { Args, OutputFile, Tool, ToolContext, ToolOutput } from "../core/types.ts";
import { cuvetteHome } from "../adapters/manifest.ts";
import { agentRules, BLIND_REASON, blindPolicy, canonical, sandboxDenials, sandboxReadRules } from "../adapters/blind.ts";
import { PLAIN_DOES, PLAIN_PURPOSE } from "./generic.ts";
import { outputRules } from "../core/results.ts";
import { cap, EXIT_GRACE_MS, fileKind, killAll, listFiles, runProcess, tail, uniqueDir, validateArgs, withoutSecrets, type Dirs } from "../adapters/kinds/common.ts";
import { credentialsPath } from "../core/credentials.ts";

export function scriptPython(): string {
  if (process.env.CUVETTE_PYTHON) return process.env.CUVETTE_PYTHON;
  const rel = process.platform === "win32" ? ["envs", "science", "Scripts", "python.exe"] : ["envs", "science", "bin", "python"];
  for (const home of [cuvetteHome(), join(homedir(), ".cuvette"), join(homedir(), ".guided-analysis")]) if (existsSync(join(home, ...rel))) return join(home, ...rel);
  return process.platform === "win32" ? "python" : "python3";
}

const CUVETTE_API = `import csv
import json
import os

_to_parent = os.fdopen(3, "w", buffering=1, encoding="utf-8")
_from_parent = os.fdopen(4, "r", encoding="utf-8")
_work = os.environ.get("WORK_DIR") or os.environ.get("CUVETTE_WORK_DIR") or os.getcwd()
_out = os.environ.get("OUTPUT_DIR") or _work

try:
    import ga_figures

    ga_figures.install()
except Exception:
    pass


class ToolError(RuntimeError):
    def __init__(self, message, output=None):
        super().__init__(message)
        self.output = output or {}


def call(tool, **args):
    _to_parent.write(json.dumps({"tool": tool, "args": args}, default=str) + "\\n")
    _to_parent.flush()
    line = _from_parent.readline()
    if not line:
        raise ToolError("the harness closed the tool channel")
    reply = json.loads(line)
    if not reply.get("ok"):
        raise ToolError(reply.get("error") or "the tool failed", reply)
    return reply


def _unique(name, ext, folder=None):
    folder = folder or _out
    os.makedirs(folder, exist_ok=True)
    stem = os.path.splitext(os.path.basename(name))[0]
    path = os.path.join(folder, stem + ext)
    n = 1
    while os.path.exists(path):
        n += 1
        path = os.path.join(folder, "%s-%d%s" % (stem, n, ext))
    return path


def save_table(name, rows, columns=None):
    path = _unique(name, ".csv")
    if hasattr(rows, "to_csv"):
        rows.to_csv(path, index=False)
        return path
    if isinstance(rows, dict):
        columns = list(rows.keys())
        rows = list(zip(*rows.values()))
    elif rows and isinstance(rows[0], dict):
        columns = columns or list(rows[0].keys())
        rows = [[r.get(c) for c in columns] for r in rows]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if columns:
            w.writerow(columns)
        w.writerows(rows)
    return path


def save_figure(name, fig=None, dpi=300):
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    path = _unique(name, ".png", os.path.join(_out, "figures"))
    (fig or plt.gcf()).savefig(path, dpi=dpi, bbox_inches="tight")
    return path


def _redirect(file, mode):
    if not isinstance(file, (str, bytes, os.PathLike)):
        return file
    p = os.fsdecode(file)
    if os.path.isabs(p):
        return file
    if any(c in mode for c in "wax+"):
        target = os.path.join(_work, p)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        return target
    if not os.path.exists(p) and os.path.exists(os.path.join(_work, p)):
        return os.path.join(_work, p)
    return file


def _install():
    import builtins
    import io

    real = builtins.open

    def ga_open(file, mode="r", *args, **kwargs):
        return real(_redirect(file, mode), mode, *args, **kwargs)

    builtins.open = ga_open
    io.open = ga_open


_install()
`;
import { ROOT } from "../root.ts";

const FIGURES_PY = readFileSync(join(ROOT, "src/adapters/kinds/ga_figures.py"), "utf8");

const STYLE_FILE = readFileSync(join(ROOT, "src/adapters/kinds/cuvette.mplstyle"), "utf8");

// A Python traceback starts with the frames of BOOT and runpy. They are the same each time and hide the line of the script.
export function withoutBootFrames(stderr: string): string {
  const out: string[] = [];
  let skip = false;
  for (const line of stderr.split("\n")) {
    if (/^\s*File "(<string>|<frozen runpy>)", line \d+/.test(line)) skip = true;
    else if (/^\s*File "/.test(line) || !/^\s{4}/.test(line)) skip = false;
    if (!skip) out.push(line);
  }
  return out.join("\n");
}

const BOOT = "import sys,runpy;d,s=sys.argv[1:3];sys.path.insert(0,d);import ga_api;sys.argv=[s];runpy.run_path(s,init_globals={k:getattr(ga_api,k) for k in ('call','save_table','save_figure','ToolError')},run_name='__main__')";

export type SandboxState = "unknown" | "on" | "bwrap" | "unshare" | "off";
let sandbox: SandboxState = "unknown";
let probing: Promise<void> | undefined;

async function works(argv: string[]): Promise<boolean> {
  return (await runProcess(argv, { timeoutMs: 10_000 })).code === 0;
}

function probeSandbox(): Promise<void> {
  probing ??= (async () => {
    if (process.platform === "darwin") sandbox = (await works(["/usr/bin/sandbox-exec", "-p", "(version 1)(allow default)", "/usr/bin/true"])) ? "on" : "off";
    else if (process.platform === "linux") sandbox = (await works(["bwrap", "--ro-bind", "/", "/", "--dev", "/dev", "--proc", "/proc", "--unshare-net", "--", "true"])) ? "bwrap" : (await works(["unshare", "-rmn", "true"])) ? "unshare" : "off";
    else sandbox = "off";
  })();
  return probing;
}

export function describeLimits(network: boolean, state: SandboxState = sandbox, platform: NodeJS.Platform = process.platform): string {
  const net = network ? "The script can use the network." : "The script cannot use the network.";
  const open = `The script can read and write any file that your user account can, also the saved key file. ${network ? net : "The network is not blocked."}`;
  const limited = `It can read files on this computer, but not the saved key file. It can write only in the project folder, in the session folder and in temporary folders. It cannot change the record of a session or the .cuvette and .ga folders of the project. ${net}`;
  if (platform === "darwin") return state === "off" ? `The operating system sandbox is not available. ${open}` : `The script runs in an operating system sandbox. ${limited}`;
  if (platform === "linux") {
    if (state === "bwrap") return `The script runs in a bubblewrap sandbox. ${limited}`;
    if (state === "unshare") return `The script runs in a Linux namespace. A normal read of the saved key file fails, but a script can remove this limit. It can read and write the other files that your user account can. Install bubblewrap (bwrap) for a stronger limit. ${net}`;
    return `No sandbox tool works here. Install bubblewrap (bwrap) to limit the script. ${open}`;
  }
  return `The script runs as your user account. The operating system does not limit it on Windows. ${open}`;
}

export function linuxWrap(state: SandboxState, argv: string[], o: { network: boolean; writable: string[]; cred: string; held?: string[]; steps?: WriteStep[] }): string[] {
  const hide = existsSync(o.cred) ? [...new Set([o.cred, realpathSync(o.cred)])] : [];
  if (state === "bwrap") {
    const binds = [...new Set(o.writable.filter((p) => existsSync(p)))].flatMap((p) => ["--bind", p, p]);
    const held = [...new Set((o.held ?? []).filter((p) => existsSync(p)).flatMap((p) => [p, realpathSync(p)]))].flatMap((p) => (statSync(p).isDirectory() ? ["--tmpfs", p] : ["--ro-bind", "/dev/null", p]));
    const locks = bwrapLocks(o.steps ?? []);
    return ["bwrap", "--ro-bind", "/", "/", "--dev", "/dev", "--proc", "/proc", ...binds, ...locks, ...hide.flatMap((p) => ["--ro-bind", "/dev/null", p]), ...held, ...(o.network ? [] : ["--unshare-net"]), "--die-with-parent", "--", ...argv];
  }
  if (state === "unshare") {
    const flags = o.network ? "-rm" : "-rmn";
    if (!hide.length) return ["unshare", flags, ...argv];
    const cover = 'mount --bind /dev/null "$1" || { echo "Cuvette could not hide the saved key file. The script did not run." >&2; exit 97; }; shift; exec "$@"';
    return ["unshare", flags, "sh", "-c", cover, "sh", hide.at(-1)!, ...argv];
  }
  return argv;
}

export interface WriteStep {
  path: string;
  allow: boolean;
  fixed?: boolean;
}

const within = (p: string, root: string) => {
  const rel = relative(root, p);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
};

function realish(p: string): string {
  const rest: string[] = [];
  let at = p;
  while (!existsSync(at) && dirname(at) !== at) {
    rest.unshift(basename(at));
    at = dirname(at);
  }
  return join(existsSync(at) ? realpathSync.native(at) : at, ...rest);
}

const both = (paths: string[]) => [...new Set(paths.flatMap((p) => [p, realish(p)]))];

function folderNames(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true }).slice(0, 5000).filter((e) => e.isDirectory()).map((e) => join(dir, e.name));
  } catch {
    return [];
  }
}

export function recordFolders(dirs: Dirs): string[] {
  const found = [dirs.sessionDir];
  const own = join(dirs.workDir, ".record");
  const bases = [dirs.workDir, ...(dirs.projectDir ? [dirs.projectDir] : []), ...(existsSync(own) ? folderNames(dirname(dirs.workDir)) : [])];
  for (const base of bases) {
    const rec = join(base, ".record");
    if (existsSync(join(rec, "log.jsonl")) || existsSync(join(rec, "meta.json"))) found.push(rec);
  }
  return both(found);
}

const OPEN_PARTS = ["adapters", "methods", "skills"];
const SETTINGS_NAMES = ["settings.json", "settings.local.json"];

export interface SettingsScope {
  locked: string[];
  open: string[];
  files: string[];
}

export function settingsScope(dirs: Dirs): SettingsScope {
  const out: SettingsScope = { locked: [], open: [], files: [] };
  const project = dirs.projectDir ? realish(dirs.projectDir) : undefined;
  const homes = [...new Set([cuvetteHome(), join(homedir(), ".cuvette"), join(homedir(), ".guided-analysis")].map(realish))];
  const inside = (h: string) => !!project && within(h, project);
  for (const home of homes) {
    const parts = OPEN_PARTS.map((n) => join(home, n));
    out.locked.push(...parts);
    out.open.push(...parts);
  }
  for (const home of homes.filter((h) => inside(h) || h === realish(cuvetteHome()))) {
    let index: string[] = [];
    try {
      index = readdirSync(home).filter((f) => f.startsWith("sessions-index.json")).map((f) => join(home, f));
    } catch {}
    const files = [...SETTINGS_NAMES.map((f) => join(home, f)), join(home, "sessions-index.json"), ...index];
    out.locked.push(...files, ...(inside(home) ? [join(home, "sessions")] : []));
    out.files.push(...files);
  }
  if (!dirs.projectDir) return out;
  for (const name of [".cuvette", ".ga"]) {
    const dir = join(dirs.projectDir, name);
    if (homes.filter(inside).some((h) => within(h, realish(dir)))) {
      const files = SETTINGS_NAMES.map((f) => join(dir, f));
      out.locked.push(...files);
      out.files.push(...files);
      continue;
    }
    out.locked.push(dir);
    out.files.push(...SETTINGS_NAMES.map((f) => join(dir, f)));
    out.open.push(...OPEN_PARTS.map((n) => join(dir, n)));
  }
  return out;
}

export function writeSteps(dirs: Dirs, opts: { adapterRoot?: string } = {}): WriteStep[] {
  const scope = settingsScope(dirs);
  const own = [dirs.workDir, ...(dirs.outputDir ? [dirs.outputDir] : [])];
  const locked = both([...recordFolders(dirs), ...scope.locked]).filter((p) => !both(own).includes(p));
  const keep = both(own);
  const steps: WriteStep[] = locked.map((path) => ({ path, allow: false }));
  const reopened = keep.filter((k) => locked.some((p) => within(k, p)));
  steps.push(...reopened.map((path) => ({ path, allow: true })));
  if (reopened.length) steps.push(...locked.filter((p) => reopened.some((k) => within(p, k))).map((path) => ({ path, allow: false })));
  if (opts.adapterRoot) {
    const own = both([opts.adapterRoot]);
    if (own.some((r) => both(scope.open.filter((o) => basename(o) === "adapters")).some((o) => within(r, o) && relative(o, r) !== ""))) steps.push(...own.map((path) => ({ path, allow: true })));
  }
  const top = dirs.projectDir ? both([dirs.projectDir]) : [];
  const fixed = new Set([...keep, ...both(scope.open)]);
  for (const l of locked) {
    const root = top.find((t) => within(l, t));
    for (let at = dirname(l); ; at = dirname(at)) {
      fixed.add(at);
      if (!root || at === root || dirname(at) === at) break;
    }
  }
  steps.push(...[...fixed].map((path) => ({ path, allow: false, fixed: true })));
  return steps;
}

function sbString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// A reference that is held back for a blind test is not readable in the sandbox, also when no blind benchmark policy is active.
export function heldReadRules(held: string[]): string {
  const paths = [...new Set(held.flatMap((p) => [p, canonical(p)]))];
  return paths.length ? `(deny file-read-data ${paths.map((p) => `(subpath ${sbString(p)})`).join("")})` : "";
}

export function writeRules(steps: WriteStep[]): string {
  return steps.map((x) => (x.fixed ? `(deny file-write-unlink (literal ${sbString(x.path)}))` : `(${x.allow ? "allow" : "deny"} file-write* (subpath ${sbString(x.path)}))`)).join("");
}

function bwrapLocks(steps: WriteStep[]): string[] {
  return steps.filter((x) => !x.fixed).flatMap((x) => (existsSync(x.path) ? [x.allow ? "--bind" : "--ro-bind", x.path, x.path] : []));
}

function programExists(cmd: string | undefined, cwd: string, env: Record<string, string | undefined>): boolean {
  if (!cmd) return false;
  if (isAbsolute(cmd) || cmd.includes("/")) return existsSync(resolve(cwd, cmd));
  return (env.PATH ?? "").split(delimiter).some((d) => d && existsSync(resolve(cwd, d, cmd)));
}

export function bwrapCommand(argv: string[], steps: WriteStep[]): string[] {
  return ["bwrap", "--bind", "/", "/", "--dev-bind", "/dev", "/dev", "--proc", "/proc", ...bwrapLocks(steps), "--die-with-parent", "--", ...argv];
}

export async function guardCommand(argv: string[], dirs: Dirs, o: { cwd?: string; env?: Record<string, string | undefined>; adapterRoot?: string } = {}): Promise<{ argv: string[]; changed(): string[] }> {
  await probeSandbox();
  const steps = writeSteps(dirs, { adapterRoot: o.adapterRoot });
  const guard = fingerprint(dirs, true);
  if (!programExists(argv[0], o.cwd ?? process.cwd(), o.env ?? process.env)) return { argv, changed: guard.changed };
  const blind = blindPolicy();
  if (process.platform === "darwin" && sandbox === "on") return { argv: ["/usr/bin/sandbox-exec", "-p", `(version 1)(allow default)${writeRules(steps)}${blind ? sandboxReadRules(agentRules(blind)) : ""}`, ...argv], changed: guard.changed };
  if (process.platform === "linux" && sandbox === "bwrap") return { argv: bwrapCommand(argv, steps), changed: guard.changed };
  return { argv, changed: guard.changed };
}

function wrap(argv: string[], workDir: string, network: boolean, project?: string, held: string[] = [], steps: WriteStep[] = []): string[] {
  if (process.platform === "linux") return linuxWrap(sandbox, argv, { network, cred: credentialsPath(), held, steps, writable: [workDir, ...(project && !blindPolicy() ? [project] : []), tmpdir(), "/tmp", "/var/tmp", "/dev/shm"] });
  if (sandbox !== "on") return argv;
  const blind = blindPolicy();
  if (process.platform === "darwin") {
    const real = realpathSync.native(workDir);
    const extra = project && !blind && existsSync(project) ? [project, realpathSync.native(project)] : [];
    const subs = [real, workDir, ...extra, "/private/var/folders", "/private/tmp", "/dev"].map((p) => `(subpath ${sbString(p)})`).join("");
    const cred = credentialsPath();
    const credPaths = [cred, ...(existsSync(cred) ? [realpathSync.native(cred)] : [])];
    const secrets = `(deny file-read* file-write* ${credPaths.map((p) => `(literal ${sbString(p)})`).join("")})`;
    const profile = `(version 1)(allow default)${network ? "" : "(deny network*)"}(deny file-write*)(allow file-write* ${subs})${writeRules(steps)}${secrets}${blind ? sandboxReadRules(agentRules(blind)) : ""}${heldReadRules(held)}`;
    return ["/usr/bin/sandbox-exec", "-p", profile, ...argv];
  }
  return argv;
}

function hashBytes(path: string, from = 0, limit = Infinity): string {
  const h = createHash("sha256");
  const buf = Buffer.alloc(1 << 20);
  const fd = openSync(path, "r");
  try {
    for (let done = 0; done < limit; ) {
      const n = readSync(fd, buf, 0, Math.min(buf.length, limit - done), from + done);
      if (!n) break;
      h.update(buf.subarray(0, n));
      done += n;
    }
  } finally {
    closeSync(fd);
  }
  return h.digest("hex");
}

function fileHash(path: string): string {
  try {
    return hashBytes(path);
  } catch {
    return "";
  }
}

export function fingerprint(dirs: Dirs, withLog: boolean): { changed(): string[] } {
  const scope = settingsScope(dirs);
  const settingsNow = () => {
    const out = new Map<string, string>();
    for (const p of scope.files) out.set(p, fileHash(p));
    return out;
  };
  const settings = settingsNow();
  const logPath = () => join(dirs.sessionDir, "log.jsonl");
  const logSize = withLog && existsSync(logPath()) ? statSync(logPath()).size : 0;
  const logHash = logSize ? hashBytes(logPath(), 0, logSize) : "";
  return {
    changed() {
      const out: string[] = [];
      const now = settingsNow();
      for (const p of new Set([...settings.keys(), ...now.keys()])) if (settings.get(p) !== now.get(p)) out.push(p);
      const log = logPath();
      if (logSize) {
        if (!existsSync(log) || statSync(log).size < logSize || hashBytes(log, 0, logSize) !== logHash) out.push(log);
      }
      return out;
    },
  };
}

function snapshot(dir: string, skip: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of listFiles(dir)) {
    if (p.startsWith(skip)) continue;
    const s = statSync(p);
    m.set(p, `${s.size}:${s.mtimeMs}`);
  }
  return m;
}

function scriptEnv(dirs: Dirs, project: string): Record<string, string> {
  const env = withoutSecrets();
  const folders = { PROJECT_DIR: project, WORK_DIR: dirs.workDir, SESSION_DIR: dirs.sessionDir, OUTPUT_DIR: dirs.outputDir ?? dirs.workDir };
  for (const [k, v] of Object.entries(folders)) env[k] = env[`CUVETTE_${k}`] = v;
  if (dirs.figureFormats !== undefined) env.CUVETTE_FIGURE_FORMATS = dirs.figureFormats;
  return addOldEnv({ ...env, MPLBACKEND: "Agg", MPLCONFIGDIR: join(tmpdir(), "cuvette-mpl"), PYTHONIOENCODING: "utf-8" });
}

export function runScriptTool(dirs: Dirs, opts: { network: boolean }): Tool {
  void probeSandbox();
  const project = dirs.projectDir ?? process.cwd();
  const schema = {
    type: "object",
    properties: {
      purpose: { type: "string", minLength: 1, maxLength: 160, description: PLAIN_PURPOSE },
      does: { type: "string", minLength: 1, maxLength: 600, description: PLAIN_DOES },
      code: { type: "string", minLength: 1, description: "Python 3 code." },
      timeout_s: { type: "number", minimum: 1, maximum: 3600, default: 120 },
    },
    required: ["purpose", "does", "code"],
    additionalProperties: false,
  };
  return {
    name: "run_script",
    title: "Run a Python script",
    get description() {
      return "Run Python 3 code for statistics and plots. " +
      "The script runs in the project folder, so a relative path reads from there, the same as in list_dir and read_file. " +
      "A relative path that the script opens for writing goes to the session folder; new files there are returned. Write to another place in the project folder only if the scientist names it, with an absolute path. " +
      "os.environ['PROJECT_DIR'], os.environ['WORK_DIR'] and os.environ['OUTPUT_DIR'] give the folders. Do not search the home folder, / or /Volumes for files: use the paths from earlier results or ask the scientist. " +
      "Give purpose and does in plain language: the scientist sees them, not the code. " +
      "Use `from ga_api import call, save_table, save_figure`. `call(tool, **args)` runs another tool and returns its result as a dict. " +
      "`save_table(name, rows)` writes a CSV. `save_figure(name)` writes the current figure to the figures folder. " +
      outputRules({ figureFormats: dirs.figureFormats ?? "png,svg", xlsx: dirs.xlsx ?? true }) + " " +
      (scriptPython().includes("science") ? "numpy, pandas, scipy, statsmodels, scikit-learn and matplotlib are installed. " : "Only the standard library is sure to exist; use csv and statistics. ") +
      describeLimits(opts.network);
    },
    inputSchema: schema,
    source: "harness",
    permission: "ask",
    async execute(raw: Args, ctx: ToolContext): Promise<ToolOutput> {
      const v = validateArgs(schema, raw);
      if (v.error) return { ok: false, error: v.error };
      await probeSandbox();
      const timeoutS = Number(v.args.timeout_s);
      mkdirSync(dirs.workDir, { recursive: true });
      const scriptDir = uniqueDir(dirs.workDir, "script");
      const script = join(scriptDir, "script.py");
      writeFileSync(script, String(v.args.code));
      writeFileSync(join(scriptDir, "ga_api.py"), CUVETTE_API);
      writeFileSync(join(scriptDir, "ga_figures.py"), FIGURES_PY);
      writeFileSync(join(scriptDir, "cuvette.mplstyle"), STYLE_FILE);
      const before = snapshot(dirs.workDir, scriptDir);
      const python = scriptPython();
      const argv = wrap([python, "-I", "-c", BOOT, scriptDir, script], dirs.workDir, opts.network, dirs.projectDir, dirs.heldBack?.() ?? [], writeSteps(dirs));
      const guard = fingerprint(dirs, true);

      const child = spawn(argv[0], argv.slice(1), {
        cwd: existsSync(project) ? project : dirs.workDir,
        env: scriptEnv(dirs, project),
        stdio: ["ignore", "pipe", "pipe", "pipe", "pipe"],
        detached: process.platform !== "win32",
        windowsHide: true,
      });
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      let aborted = false;
      child.stdout!.setEncoding("utf8").on("data", (d: string) => { if (stdout.length < 50_000) stdout += d; });
      child.stderr!.setEncoding("utf8").on("data", (d: string) => { if (stderr.length < 50_000) stderr += d; });
      const requests = child.stdio[3] as Readable;
      const replies = child.stdio[4] as Writable;
      replies.on("error", () => {});
      requests.on("error", () => {});
      const handling: Promise<void>[] = [];
      createInterface({ input: requests }).on("line", (line) => {
        handling.push((async () => {
          let reply: Record<string, unknown>;
          try {
            const req = JSON.parse(line) as { tool?: string; args?: Args };
            if (typeof req.tool !== "string") throw new Error("the request has no tool name");
            if (req.tool === "run_script") throw new Error("run_script cannot call itself");
            const out = await ctx.callTool(req.tool, req.args ?? {});
            const { images: _images, ...rest } = out;
            reply = { ...rest };
          } catch (e) {
            reply = { ok: false, error: (e as Error).message };
          }
          replies.write(`${JSON.stringify(reply)}\n`);
        })());
      });
      const timer = setTimeout(() => {
        timedOut = true;
        void killAll(child.pid);
      }, timeoutS * 1000);
      const onAbort = () => {
        aborted = true;
        void killAll(child.pid);
      };
      if (ctx.signal.aborted) onAbort();
      else ctx.signal.addEventListener("abort", onAbort, { once: true });

      const started = Date.now();
      const code = await new Promise<number | null>((done) => {
        child.on("error", (e) => {
          stderr += `cannot start ${argv[0]}: ${e.message}`;
          done(null);
        });
        child.on("exit", (c) => {
          setTimeout(() => {
            child.stdout!.destroy();
            child.stderr!.destroy();
            requests.destroy();
            done(c);
          }, EXIT_GRACE_MS).unref();
        });
        child.on("close", (c) => done(c));
      });
      clearTimeout(timer);
      ctx.signal.removeEventListener("abort", onAbort);
      replies.destroy();
      if (!timedOut && !aborted) await Promise.allSettled(handling);

      const after = snapshot(dirs.workDir, scriptDir);
      const outputs: OutputFile[] = [];
      const images: string[] = [];
      for (const [p, sig] of after) {
        if (before.get(p) === sig) continue;
        const kind = fileKind(p);
        outputs.push({ path: p, kind, name: basename(p) });
        if (/\.(png|jpe?g)$/i.test(p)) images.push(p);
      }
      const changed = guard.changed();
      for (const path of changed) ctx.log("blocked", { callId: ctx.callId, tool: "run_script", path, reason: "The script changed the record or the settings of Cuvette.", by: "integrity check" });
      for (const path of sandboxDenials(`${stdout}\n${stderr}`)) ctx.log("blocked", { callId: ctx.callId, tool: "run_script", path, reason: BLIND_REASON, by: "sandbox" });
      const text = cap(stdout, 50_000) + (stderr.trim() ? `\n[stderr]\n${cap(stderr, 50_000)}` : "");
      const base = { text, outputs, images: images.length ? images : undefined, fidelity: "code_only" as const, manualRoute: `Run the Python code in ${script}`, data: { script, duration_s: (Date.now() - started) / 1000 } };
      if (changed.length) return { ok: false, error: `the script changed the record or the settings of Cuvette: ${changed.join(", ")}. A script must not write there. Check these files.`, ...base };
      if (aborted) return { ok: false, error: "the script was cancelled", ...base };
      if (timedOut) return { ok: false, error: `the script timed out after ${timeoutS} s`, ...base };
      if (code !== 0) return { ok: false, error: `the script exited with code ${code}: ${tail(withoutBootFrames(stderr).trim(), 2000)}`, ...base };
      return { ok: true, summary: `The script ran in ${project} and wrote ${outputs.length} new file(s) to ${dirs.workDir}.`, ...base };
    },
  };
}

