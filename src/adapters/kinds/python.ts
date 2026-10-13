import { type ChildProcess, spawn } from "node:child_process";
import { createWriteStream, type WriteStream } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import type { Args, OutputFile, ToolContext, ToolOutput } from "../../core/types.ts";
import type { AdapterRuntime } from "../runtime.ts";
import { expand, childEnv, collectOutputs, defTool, failSummary, inflight, killTree, makeRuntime, outputFile, readFields, makeSummary, samePath, tail, type CallDir, type KindContext } from "./common.ts";
import type { ToolDef } from "../manifest.ts";
import { blindArgv } from "../blind.ts";
import { ROOT } from "../../root.ts";

const WORKER = join(ROOT, "src/adapters/kinds/python_worker.py");

interface Reply {
  id?: number;
  ready?: boolean;
  ok?: boolean;
  result?: unknown;
  files?: string[];
  metrics?: Record<string, number>;
  error?: string;
  traceback?: string;
}

export function pyLiteral(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(pyLiteral).join(", ")}]`;
  const o = v as Record<string, unknown>;
  if (Object.keys(o).length === 1 && typeof o.handle === "string") return o.handle;
  return `{${Object.entries(o).map(([k, x]) => `${JSON.stringify(k)}: ${pyLiteral(x)}`).join(", ")}}`;
}

export function pythonLine(fn: string, args: Args): string {
  const [mod, attr] = fn.split(":");
  const call = Object.entries(args).map(([k, v]) => `${k}=${pyLiteral(v)}`).join(", ");
  return `${mod.replace(/\.py$/, "")}.${attr}(${call})`;
}

export function startPython(c: KindContext): AdapterRuntime {
  const conn = c.adapter.manifest.connection;
  const live = inflight();
  const logPath = join(c.dirs.sessionDir, `adapter-${c.adapter.name}.log`);
  let log: WriteStream | undefined;
  let child: ChildProcess | undefined;
  let stderrTail = "";
  let nextId = 1;
  let queue: Promise<unknown> = Promise.resolve();
  const waiting = new Map<number, (r: Reply) => void>();
  let ready: Promise<void> | undefined;

  const interpreter = (): string[] => {
    const given = conn.interpreter.map((a) => expand(a, c.ph));
    return given.length ? given : [process.platform === "win32" ? "python" : "python3"];
  };

  const stopped = (reason: string) => {
    for (const [id, fn] of waiting) fn({ id, ok: false, error: `the adapter process stopped: ${reason}` });
    waiting.clear();
    child = undefined;
    ready = undefined;
  };

  const spawnWorker = (): Promise<void> => {
    log ??= createWriteStream(logPath, { flags: "a" }).on("error", () => undefined);
    stderrTail = "";
    const argv = blindArgv([...interpreter(), "-u", WORKER, c.adapter.root]);
    const p = spawn(argv[0], argv.slice(1), {
      cwd: c.dirs.workDir,
      env: childEnv(c, { PYTHONIOENCODING: "utf-8", MPLBACKEND: "Agg" }),
      stdio: ["pipe", "pipe", "pipe"],
      detached: process.platform !== "win32",
      windowsHide: true,
    });
    child = p;
    p.stderr?.on("data", (d: Buffer) => {
      log?.write(d);
      stderrTail = tail(stderrTail + d.toString("utf8"), 2000);
    });
    p.stdin?.on("error", () => {});
    return new Promise((ok, fail) => {
      let started = false;
      p.on("error", (e) => {
        if (child === p) stopped(e.message);
        if (!started) fail(new Error(`cannot start ${argv[0]}: ${e.message}`));
      });
      p.on("close", (code, sig) => {
        if (child !== p) return;
        const reason = `${sig ? `signal ${sig}` : `exit code ${code}`}${stderrTail.trim() ? `: ${tail(stderrTail.trim(), 600)}` : ""}`;
        stopped(reason);
        if (!started) fail(new Error(`the adapter process stopped: ${reason}`));
      });
      createInterface({ input: p.stdout! }).on("line", (line) => {
        let msg: Reply;
        try {
          msg = JSON.parse(line);
        } catch {
          return;
        }
        if (msg.ready) {
          started = true;
          ok();
        } else if (msg.id !== undefined) {
          waiting.get(msg.id)?.(msg);
          waiting.delete(msg.id);
        }
      });
      setTimeout(() => {
        if (!started) {
          killTree(p.pid);
          fail(new Error(`the Python worker did not start within ${conn.startup_timeout_s} s`));
        }
      }, conn.startup_timeout_s * 1000).unref();
    });
  };

  const ensure = async () => {
    await c.ready;
    if (!child) {
      ready = spawnWorker();
      ready.catch(() => {});
    }
    await ready;
  };

  const request = (fn: string, args: Args, outDir: string, signal: AbortSignal): Promise<Reply> => {
    const run = async (): Promise<Reply> => {
      await ensure();
      const id = nextId++;
      const reply = new Promise<Reply>((done) => waiting.set(id, done));
      const timeout = setTimeout(() => {
        waiting.get(id)?.({ id, ok: false, error: `the call timed out after ${conn.call_timeout_s} s` });
        killTree(child?.pid);
      }, conn.call_timeout_s * 1000);
      const abort = () => {
        if (process.platform === "win32") return killTree(child?.pid);
        child?.kill("SIGINT");
        setTimeout(() => {
          if (waiting.has(id)) killTree(child?.pid);
        }, 3000).unref();
      };
      signal.addEventListener("abort", abort, { once: true });
      child!.stdin!.write(`${JSON.stringify({ id, function: fn, args, out_dir: outDir })}\n`);
      try {
        return await reply;
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener("abort", abort);
      }
    };
    const next = queue.then(run, run);
    queue = next.catch(() => {});
    return next;
  };

  const toOutput = (def: ToolDef, args: Args, call: CallDir, reply: Reply, route: string): ToolOutput => {
    if (!reply.ok) {
      return { ok: false, error: reply.error ?? "the call failed", text: reply.traceback, manualRoute: route };
    }
    const files: OutputFile[] = collectOutputs(call, def);
    const f = readFields(reply.result, { scanPaths: true, inferMetrics: true });
    const outputs = new Map<string, OutputFile>(files.map((o) => [samePath(o.path), o]));
    for (const o of (reply.files ?? []).map((p) => outputFile(p))) outputs.set(samePath(o.path), o);
    for (const o of f.outputs ?? []) if (!outputs.has(samePath(o.path))) outputs.set(samePath(o.path), o);
    const metrics = { ...(f.metrics ?? {}), ...(reply.metrics ?? {}) };
    const entry = c.adapter.mapEntry(def.name, args);
    const out: ToolOutput = {
      ok: f.ok !== false,
      data: reply.result,
      text: typeof reply.result === "string" ? reply.result : JSON.stringify(reply.result),
      manualRoute: f.manualRoute ?? route,
      outputs: outputs.size ? [...outputs.values()] : undefined,
      metrics: Object.keys(metrics).length ? metrics : undefined,
      table: f.table,
      fidelity: f.fidelity ?? entry?.fidelity ?? "exact",
    };
    if (f.error) out.error = f.error;
    else if (!out.ok) out.error = f.summary ?? "the tool reported a failure";
    out.summary = !out.ok
      ? failSummary(def.title || def.name, out.error)
      : entry?.summary || !f.summary ? makeSummary(entry, def.title || def.name, args, { metrics: out.metrics, data: reply.result, table: out.table }) : f.summary;
    return out;
  };

  const tools = c.adapter.manifest.tools.map((def) =>
    defTool(c, def, async ({ args, ctx, call }: { args: Args; ctx: ToolContext; call: CallDir }) => {
      if (!def.function.includes(":")) return { ok: false, error: `function must look like "module:name", got "${def.function}"` };
      const route = pythonLine(def.function, args);
      const reply = await live.track(ctx.signal, (signal) => request(def.function, args, call.dir, signal));
      return toOutput(def, args, call, reply, route);
    }),
  );

  return makeRuntime(c, {
    tools: () => tools,
    running: () => true,
    cancel: () => live.cancel(),
    close: async () => {
      live.cancel();
      if (child) {
        try {
          child.stdin?.end();
        } catch {}
        const p = child;
        child = undefined;
        setTimeout(() => killTree(p.pid), 500).unref();
      }
      log?.end();
    },
  });
}
