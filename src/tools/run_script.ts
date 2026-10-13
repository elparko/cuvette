import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { addOldEnv } from "../core/old-names.ts";
import type { Args, OutputFile, Tool, ToolContext, ToolOutput } from "../core/types.ts";
import { cuvetteHome } from "../adapters/manifest.ts";
import { agentRules, BLIND_REASON, blindPolicy, canonical, sandboxDenials, sandboxReadRules } from "../adapters/blind.ts";
import { PLAIN_DOES, PLAIN_PURPOSE } from "./generic.ts";
import { outputRules } from "../core/results.ts";
import { cap, EXIT_GRACE_MS, fileKind, killTree, listFiles, runProcess, tail, uniqueDir, validateArgs, withoutSecrets, type Dirs } from "../adapters/kinds/common.ts";
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
  const limited = `It can read files on this computer, but not the saved key file. It can write only in the project folder, in the session folder and in temporary folders. ${net}`;
  if (platform === "darwin") return state === "off" ? `The operating system sandbox is not available. ${open}` : `The script runs in an operating system sandbox. ${limited}`;
  if (platform === "linux") {
    if (state === "bwrap") return `The script runs in a bubblewrap sandbox. ${limited}`;
    if (state === "unshare") return `The script runs in a Linux namespace. A normal read of the saved key file fails, but a script can remove this limit. It can read and write the other files that your user account can. Install bubblewrap (bwrap) for a stronger limit. ${net}`;
    return `No sandbox tool works here. Install bubblewrap (bwrap) to limit the script. ${open}`;
  }
  return `The script runs as your user account. The operating system does not limit it on Windows. ${open}`;
}

export function linuxWrap(state: SandboxState, argv: string[], o: { network: boolean; writable: string[]; cred: string; held?: string[] }): string[] {
  const hide = existsSync(o.cred) ? [...new Set([o.cred, realpathSync(o.cred)])] : [];
  if (state === "bwrap") {
    const binds = [...new Set(o.writable.filter((p) => existsSync(p)))].flatMap((p) => ["--bind", p, p]);
    const held = [...new Set((o.held ?? []).filter((p) => existsSync(p)).flatMap((p) => [p, realpathSync(p)]))].flatMap((p) => (statSync(p).isDirectory() ? ["--tmpfs", p] : ["--ro-bind", "/dev/null", p]));
    return ["bwrap", "--ro-bind", "/", "/", "--dev", "/dev", "--proc", "/proc", ...binds, ...hide.flatMap((p) => ["--ro-bind", "/dev/null", p]), ...held, ...(o.network ? [] : ["--unshare-net"]), "--die-with-parent", "--", ...argv];
  }
  if (state === "unshare") {
    const flags = o.network ? "-rm" : "-rmn";
    if (!hide.length) return ["unshare", flags, ...argv];
    const cover = 'mount --bind /dev/null "$1" || { echo "Cuvette could not hide the saved key file. The script did not run." >&2; exit 97; }; shift; exec "$@"';
    return ["unshare", flags, "sh", "-c", cover, "sh", hide.at(-1)!, ...argv];
  }
  return argv;
}

function sbString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// A reference that is held back for a blind test is not readable in the sandbox, also when no blind benchmark policy is active.
export function heldReadRules(held: string[]): string {
  const paths = [...new Set(held.flatMap((p) => [p, canonical(p)]))];
  return paths.length ? `(deny file-read-data ${paths.map((p) => `(subpath ${sbString(p)})`).join("")})` : "";
}

function wrap(argv: string[], workDir: string, network: boolean, project?: string, held: string[] = []): string[] {
  if (process.platform === "linux") return linuxWrap(sandbox, argv, { network, cred: credentialsPath(), held, writable: [workDir, ...(project && !blindPolicy() ? [project] : []), tmpdir(), "/tmp", "/var/tmp", "/dev/shm"] });
  if (sandbox !== "on") return argv;
  const blind = blindPolicy();
  if (process.platform === "darwin") {
    const real = realpathSync(workDir);
    const extra = project && !blind && existsSync(project) ? [project, realpathSync(project)] : [];
    const subs = [real, workDir, ...extra, "/private/var/folders", "/private/tmp", "/dev"].map((p) => `(subpath ${sbString(p)})`).join("");
    const cred = credentialsPath();
    const credPaths = [cred, ...(existsSync(cred) ? [realpathSync(cred)] : [])];
    const secrets = `(deny file-read* file-write* ${credPaths.map((p) => `(literal ${sbString(p)})`).join("")})`;
    const profile = `(version 1)(allow default)${network ? "" : "(deny network*)"}(deny file-write*)(allow file-write* ${subs})${secrets}${blind ? sandboxReadRules(agentRules(blind)) : ""}${heldReadRules(held)}`;
    return ["/usr/bin/sandbox-exec", "-p", profile, ...argv];
  }
  return argv;
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
      const argv = wrap([python, "-I", "-c", BOOT, scriptDir, script], dirs.workDir, opts.network, dirs.projectDir, dirs.heldBack?.() ?? []);

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
      child.stdout!.on("data", (d: Buffer) => { if (stdout.length < 50_000) stdout += d.toString("utf8"); });
      child.stderr!.on("data", (d: Buffer) => { if (stderr.length < 50_000) stderr += d.toString("utf8"); });
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
        killTree(child.pid);
      }, timeoutS * 1000);
      const onAbort = () => {
        aborted = true;
        killTree(child.pid);
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
      for (const path of sandboxDenials(`${stdout}\n${stderr}`)) ctx.log("blocked", { callId: ctx.callId, tool: "run_script", path, reason: BLIND_REASON, by: "sandbox" });
      const text = cap(stdout, 50_000) + (stderr.trim() ? `\n[stderr]\n${cap(stderr, 50_000)}` : "");
      const base = { text, outputs, images: images.length ? images : undefined, fidelity: "code_only" as const, manualRoute: `Run the Python code in ${script}`, data: { script, duration_s: (Date.now() - started) / 1000 } };
      if (aborted) return { ok: false, error: "the script was cancelled", ...base };
      if (timedOut) return { ok: false, error: `the script timed out after ${timeoutS} s`, ...base };
      if (code !== 0) return { ok: false, error: `the script exited with code ${code}: ${tail(withoutBootFrames(stderr).trim(), 2000)}`, ...base };
      return { ok: true, summary: `The script ran in ${project} and wrote ${outputs.length} new file(s) to ${dirs.workDir}.`, ...base };
    },
  };
}

