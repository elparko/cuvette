import { spawn } from "node:child_process";
import { existsSync, mkdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import type { Args, OutputFile, Tool, ToolContext, ToolOutput } from "../core/types.ts";
import { gaHome } from "../adapters/manifest.ts";
import { cap, fileKind, killTree, listFiles, runProcess, tail, uniqueDir, validateArgs, type Dirs } from "../adapters/kinds/common.ts";

export function scriptPython(): string {
  if (process.env.GA_PYTHON) return process.env.GA_PYTHON;
  const rel = process.platform === "win32" ? ["envs", "science", "Scripts", "python.exe"] : ["envs", "science", "bin", "python"];
  for (const home of [gaHome(), join(homedir(), ".guided-analysis")]) if (existsSync(join(home, ...rel))) return join(home, ...rel);
  return process.platform === "win32" ? "python" : "python3";
}

const GA_API = `import csv
import json
import os

_to_parent = os.fdopen(3, "w", buffering=1, encoding="utf-8")
_from_parent = os.fdopen(4, "r", encoding="utf-8")
_work = os.environ.get("GA_WORK_DIR", os.getcwd())


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


def _unique(name, ext):
    stem = os.path.splitext(os.path.basename(name))[0]
    path = os.path.join(_work, stem + ext)
    n = 1
    while os.path.exists(path):
        n += 1
        path = os.path.join(_work, "%s-%d%s" % (stem, n, ext))
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


def save_figure(name, fig=None, dpi=150):
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    path = _unique(name, ".png")
    (fig or plt.gcf()).savefig(path, dpi=dpi, bbox_inches="tight")
    return path
`;

const BOOT = "import sys,runpy;d,s=sys.argv[1:3];sys.path.insert(0,d);sys.argv=[s];runpy.run_path(s,run_name='__main__')";

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
    return `The script runs in an operating system sandbox. It can read files on this computer. It can write only in the session work folder and in temporary folders. ${net}`;
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

function wrap(argv: string[], workDir: string, network: boolean): string[] {
  if (sandbox !== "on") return argv;
  if (process.platform === "darwin") {
    const real = realpathSync(workDir);
    const subs = [real, workDir, "/private/var/folders", "/private/tmp", "/dev"].map((p) => `(subpath ${sbString(p)})`).join("");
    const profile = `(version 1)(allow default)${network ? "" : "(deny network*)"}(deny file-write*)(allow file-write* ${subs})`;
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

function scriptEnv(dirs: Dirs): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !SECRET.test(k)) env[k] = v;
  return { ...env, GA_WORK_DIR: dirs.workDir, GA_SESSION_DIR: dirs.sessionDir, MPLBACKEND: "Agg", MPLCONFIGDIR: join(tmpdir(), "ga-mpl"), PYTHONIOENCODING: "utf-8" };
}

export function runScriptTool(dirs: Dirs, opts: { network: boolean }): Tool {
  void probeSandbox();
  const schema = {
    type: "object",
    properties: {
      code: { type: "string", minLength: 1, description: "Python 3 code." },
      timeout_s: { type: "number", minimum: 1, maximum: 3600, default: 120 },
    },
    required: ["code"],
    additionalProperties: false,
  };
  return {
    name: "run_script",
    title: "Run a Python script",
    description:
      "Run Python 3 code for statistics and plots. The work folder is the working directory; new files there are returned. " +
      "Use `from ga_api import call, save_table, save_figure`. `call(tool, **args)` runs another tool and returns its result as a dict. " +
      "`save_table(name, rows)` writes a CSV. `save_figure(name)` writes a PNG of the current figure. " +
      (scriptPython().includes("science") ? "numpy, pandas, scipy, statsmodels, scikit-learn and matplotlib are installed. " : "Only the standard library is sure to exist; use csv and statistics. ") +
      describeLimits(opts.network),
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
      writeFileSync(join(scriptDir, "ga_api.py"), GA_API);
      const before = snapshot(dirs.workDir, scriptDir);
      const python = scriptPython();
      const argv = wrap([python, "-I", "-c", BOOT, scriptDir, script], dirs.workDir, opts.network);

      const child = spawn(argv[0], argv.slice(1), {
        cwd: dirs.workDir,
        env: scriptEnv(dirs),
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
      const text = cap(stdout, 50_000) + (stderr.trim() ? `\n[stderr]\n${cap(stderr, 50_000)}` : "");
      const base = { text, outputs, images: images.length ? images : undefined, fidelity: "code_only" as const, manualRoute: `Run the Python code in ${script}`, data: { script, duration_s: (Date.now() - started) / 1000 } };
      if (aborted) return { ok: false, error: "the script was cancelled", ...base };
      if (timedOut) return { ok: false, error: `the script timed out after ${timeoutS} s`, ...base };
      if (code !== 0) return { ok: false, error: `the script exited with code ${code}: ${tail(stderr.trim(), 2000)}`, ...base };
      return { ok: true, summary: `The script finished and wrote ${outputs.length} new file(s).`, ...base };
    },
  };
}

