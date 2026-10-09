import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import type { Args, OutputFile, Tool, ToolContext, ToolOutput } from "../core/types.ts";
import { cuvetteHome } from "../adapters/manifest.ts";
import { agentRules, BLIND_REASON, blindPolicy, sandboxDenials, sandboxReadRules } from "../adapters/blind.ts";
import { PLAIN_DOES, PLAIN_PURPOSE } from "./generic.ts";
import { outputRules } from "../core/results.ts";
import { cap, fileKind, killTree, listFiles, runProcess, tail, uniqueDir, validateArgs, type Dirs } from "../adapters/kinds/common.ts";

export function scriptPython(): string {
  if (process.env.CUVETTE_PYTHON) return process.env.CUVETTE_PYTHON;
  const rel = process.platform === "win32" ? ["envs", "science", "Scripts", "python.exe"] : ["envs", "science", "bin", "python"];
  for (const home of [cuvetteHome(), join(homedir(), ".cuvette")]) if (existsSync(join(home, ...rel))) return join(home, ...rel);
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

const FIGURES_PY = readFileSync(fileURLToPath(new URL("../adapters/kinds/ga_figures.py", import.meta.url)), "utf8");

const BOOT = "import sys,runpy;d,s=sys.argv[1:3];sys.path.insert(0,d);import ga_api;sys.argv=[s];runpy.run_path(s,init_globals={k:getattr(ga_api,k) for k in ('call','save_table','save_figure','ToolError')},run_name='__main__')";

type SandboxState = "unknown" | "on" | "off";
let sandbox: SandboxState = "unknown";
let probing: Promise<void> | undefined;

function probeSandbox(): Promise<void> {
  probing ??= (async () => {
    const argv = process.platform === "darwin" ? ["/usr/bin/sandbox-exec", "-p", "(version 1)(allow default)", "/usr/bin/true"] : process.platform === "linux" ? ["unshare", "-rn", "true"] : undefined;
    if (!argv) {
      sandbox = "off";
      return;
    }
    const r = await runProcess(argv, { timeoutMs: 10_000 });
    sandbox = r.code === 0 ? "on" : "off";
  })();
  return probing;
}

export function describeLimits(network: boolean): string {
  const net = network ? "The script can use the network." : "The script cannot use the network.";
  if (process.platform === "darwin") {
    if (sandbox === "off") return `The operating system sandbox is not available. The script can read and write any file that your user account can. ${network ? "The script can use the network." : "The network is not blocked."}`;
    return `The script runs in an operating system sandbox. It can read files on this computer. It can write only in the project folder, in the session folder and in temporary folders. ${net}`;
  }
  if (process.platform === "linux") {
    const files = "The script can read and write any file that your user account can.";
    if (network) return `${files} ${net}`;
    return sandbox === "off" ? `${files} The network is not blocked, because the sandbox tool (unshare) does not work here.` : `${files} ${net}`;
  }
  return `The script runs as your user account. The operating system does not limit it on Windows. It can read and write any file that your user account can. ${network ? net : "The network is not blocked."}`;
}

function sbString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function wrap(argv: string[], workDir: string, network: boolean, project?: string): string[] {
  if (sandbox !== "on") return argv;
  const blind = blindPolicy();
  if (process.platform === "darwin") {
    const real = realpathSync(workDir);
    const extra = project && !blind && existsSync(project) ? [project, realpathSync(project)] : [];
    const subs = [real, workDir, ...extra, "/private/var/folders", "/private/tmp", "/dev"].map((p) => `(subpath ${sbString(p)})`).join("");
    const profile = `(version 1)(allow default)${network ? "" : "(deny network*)"}(deny file-write*)(allow file-write* ${subs})${blind ? sandboxReadRules(agentRules(blind)) : ""}`;
    return ["/usr/bin/sandbox-exec", "-p", profile, ...argv];
  }
  if (process.platform === "linux" && !network) return ["unshare", "-rn", ...argv];
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

const SECRET = /key|token|secret|password|credential/i;

function scriptEnv(dirs: Dirs, project: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !SECRET.test(k)) env[k] = v;
  const folders = { PROJECT_DIR: project, WORK_DIR: dirs.workDir, SESSION_DIR: dirs.sessionDir, OUTPUT_DIR: dirs.outputDir ?? dirs.workDir };
  for (const [k, v] of Object.entries(folders)) env[k] = env[`CUVETTE_${k}`] = v;
  if (dirs.figureFormats !== undefined) env.CUVETTE_FIGURE_FORMATS = dirs.figureFormats;
  return { ...env, MPLBACKEND: "Agg", MPLCONFIGDIR: join(tmpdir(), "cuvette-mpl"), PYTHONIOENCODING: "utf-8" };
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
      `The script runs in the project folder ${project}, so a relative path reads from there, the same as in list_dir and read_file. ` +
      `A relative path that the script opens for writing goes to the session folder ${dirs.workDir}; new files there are returned. Write to another place in the project folder only if the scientist names it, with an absolute path. ` +
      "os.environ['PROJECT_DIR'], os.environ['WORK_DIR'] and os.environ['OUTPUT_DIR'] give the folders. Do not search the home folder, / or /Volumes for files: use the paths from earlier results or ask the scientist. " +
      "Give purpose and does in plain language: the scientist sees them, not the code. " +
      "Use `from ga_api import call, save_table, save_figure`. `call(tool, **args)` runs another tool and returns its result as a dict. " +
      "`save_table(name, rows)` writes a CSV. `save_figure(name)` writes the current figure to the figures folder. " +
      outputRules({ output: dirs.outputDir ?? dirs.workDir, figureFormats: dirs.figureFormats ?? "png,svg", xlsx: dirs.xlsx ?? true }) + " " +
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
      const before = snapshot(dirs.workDir, scriptDir);
      const python = scriptPython();
      const argv = wrap([python, "-I", "-c", BOOT, scriptDir, script], dirs.workDir, opts.network, dirs.projectDir);

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
        child.on("close", (c) => done(c));
      });
      clearTimeout(timer);
      ctx.signal.removeEventListener("abort", onAbort);
      await Promise.allSettled(handling);
      replies.destroy();

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
      if (code !== 0) return { ok: false, error: `the script exited with code ${code}: ${tail(stderr.trim(), 2000)}`, ...base };
      return { ok: true, summary: `The script ran in ${project} and wrote ${outputs.length} new file(s) to ${dirs.workDir}.`, ...base };
    },
  };
}

