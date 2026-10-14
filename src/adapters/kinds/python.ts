import { type ChildProcess, spawn } from "node:child_process";
import { createWriteStream, type WriteStream } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import type { Args, OutputFile, ToolContext, ToolOutput } from "../../core/types.ts";
import type { AdapterRuntime } from "../runtime.ts";
import { expand, childEnv, collectOutputs, defTool, failSummary, inflight, killTree, makeRuntime, outputFile, readFields, makeSummary, samePath, tail, type CallDir, type KindContext } from "./common.ts";
import type { ToolDef } from "../manifest.ts";
import { blindArgv, blindPolicy } from "../blind.ts";
import { fingerprint, guardCommand, logFingerprint } from "../../tools/run_script.ts";
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

export function interruptTarget(pid: number | undefined, platform: NodeJS.Platform = process.platform, kill: (pid: number, signal: NodeJS.Signals) => unknown = process.kill): boolean {
  if (!pid || platform === "win32") return false;
  try {
    kill(-pid, "SIGINT");
  } catch {
    try {
      kill(pid, "SIGINT");
    } catch {
      return false;
    }
  }
  return true;
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
  let spawnedWith = "";
  let profile = "";
  let logBase: { changed(): string[] } | undefined;
  let closed = false;
  let generation = 0;
  let warming: { error?: unknown } | undefined;
  let preloading: Promise<unknown> | undefined;

  const interpreter = (): string[] => {
    const given = conn.interpreter.map((a) => expand(a, c.ph));
    return given.length ? given : [process.platform === "win32" ? "python" : "python3"];
  };

  const stopped = (reason: string) => {
    for (const [id, fn] of waiting) fn({ id, ok: false, error: `the adapter process stopped: ${reason}` });
    waiting.clear();
    child = undefined;
    ready = undefined;
    preloading = undefined;
    generation++;
  };

  // The sandbox profile is built when the worker starts. A new record folder or a blind policy needs a new worker.
  const profileKey = () => JSON.stringify([c.dirs.workDir, c.dirs.sessionDir, c.dirs.projectDir ?? "", blindPolicy() ?? null]);

  const spawnWorker = async (): Promise<void> => {
    const mine = generation;
    log ??= createWriteStream(logPath, { flags: "a" }).on("error", () => undefined);
    stderrTail = "";
    spawnedWith = JSON.stringify(interpreter());
    profile = profileKey();
    const env = childEnv(c, { PYTHONIOENCODING: "utf-8", MPLBACKEND: "Agg" });
    const guarded = await guardCommand([...interpreter(), "-u", WORKER, c.adapter.root], c.dirs, { cwd: c.dirs.workDir, env, adapterRoot: c.adapter.root });
    if (closed || mine !== generation) throw new Error("the adapter process stopped before it started");
    logBase = logFingerprint(c.dirs);
    const argv = blindArgv(guarded.argv);
    const p = spawn(argv[0], argv.slice(1), {
      cwd: c.dirs.workDir,
      env,
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
      let startTimer: NodeJS.Timeout | undefined;
      p.on("error", (e) => {
        clearTimeout(startTimer);
        if (child === p) stopped(e.message);
        if (!started) fail(new Error(`cannot start ${argv[0]}: ${e.message}`));
      });
      p.on("close", (code, sig) => {
        clearTimeout(startTimer);
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
        if (!msg || typeof msg !== "object") return;
        if (msg.ready) {
          started = true;
          clearTimeout(startTimer);
          ok();
        } else if (msg.id !== undefined) {
          waiting.get(msg.id)?.(msg);
          waiting.delete(msg.id);
        }
      });
      startTimer = setTimeout(() => {
        if (!started) {
          killTree(p.pid);
          fail(new Error(`the Python worker did not start within ${conn.startup_timeout_s} s`));
        }
      }, conn.startup_timeout_s * 1000).unref();
    });
  };

  const spawnOnce = () => {
    if (closed) throw new Error("the adapter is closed");
    if (!ready) {
      const r = spawnWorker();
      ready = r;
      r.catch(() => {
        if (ready === r && !child) ready = undefined;
      });
    }
    return ready!;
  };

  // A worker that started before the version command ends starts again if the command found another interpreter.
  const ensure = async () => {
    const w = warming;
    warming = undefined;
    await c.ready;
    if (w?.error && !child && spawnedWith === JSON.stringify(interpreter())) throw w.error;
    if (ready && spawnedWith !== JSON.stringify(interpreter())) {
      const old = child;
      stopped("the version command found another interpreter");
      killTree(old?.pid);
    }
    if (child && profile !== profileKey()) {
      const old = child;
      stopped("the record folder or the blind policy changed");
      killTree(old.pid);
    }
    await spawnOnce();
  };

  const modules = [...new Set(c.adapter.manifest.tools.filter((d) => d.function.includes(":")).map((d) => d.function.split(":")[0]!.replace(/\.py$/, "")))];

  // The first call finds a started worker with the modules of the adapter imported. A failed start shows at the first call.
  const warm = (load: boolean) => {
    if (closed || ready || warming) return;
    const w: { error?: unknown } = {};
    warming = w;
    const started = (async () => {
      if (!c.programPath) await c.ready;
      await spawnOnce();
      if (load && modules.length) await send({ preload: modules });
    })();
    started.catch((e) => {
      if (!closed) w.error = e;
    });
    const settled = started.then(() => undefined, () => undefined);
    preloading = settled;
    settled.then(() => {
      if (preloading === settled) preloading = undefined;
    });
  };

  const send = (msg: Record<string, unknown>): Promise<Reply> => {
    const id = nextId++;
    const reply = new Promise<Reply>((done) => waiting.set(id, done));
    child!.stdin!.write(`${JSON.stringify({ id, ...msg })}\n`);
    return reply;
  };

  const request = (fn: string, args: Args, outDir: string, signal: AbortSignal): Promise<Reply> => {
    const cut = { ok: false, error: "interrupted: the scientist stopped this call before it started" };
    const late = { ok: false, error: `the call timed out after ${conn.call_timeout_s} s` };
    const cancelled = new Promise<void>((r) => (signal.aborted ? r() : signal.addEventListener("abort", () => r(), { once: true })));
    // A worker that timed out leaves at once. The next call then starts a new worker and does not write to the worker that stops.
    const drop = (reason: string) => {
      const p = child;
      stopped(reason);
      killTree(p?.pid);
    };
    const run = async (): Promise<Reply> => {
      if (signal.aborted) return cut;
      const started = ensure();
      started.catch(() => {});
      await Promise.race([started, cancelled]);
      if (signal.aborted) return cut;
      // The call waits for the import of the adapter modules. The import has the start time limit, and the call time limit starts after it.
      if (preloading) {
        let over = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const limit = new Promise<void>((r) => (timer = setTimeout(() => ((over = true), r()), conn.startup_timeout_s * 1000)));
        await Promise.race([preloading, cancelled, limit]);
        clearTimeout(timer);
        if (signal.aborted) return cut;
        if (over) {
          drop("the import of the adapter modules did not end");
          return { ok: false, error: `the import of the adapter modules did not end within ${conn.startup_timeout_s} s` };
        }
      }
      const guard = fingerprint(c.dirs, false);
      const id = nextId;
      const reply = send({ function: fn, args, out_dir: outDir });
      const timeout = setTimeout(() => {
        waiting.get(id)?.({ id, ...late });
        drop("the call timed out");
      }, conn.call_timeout_s * 1000);
      const abort = () => {
        if (process.platform === "win32") return killTree(child?.pid);
        interruptTarget(child?.pid);
        setTimeout(() => {
          if (waiting.has(id)) killTree(child?.pid);
        }, 3000).unref();
      };
      signal.addEventListener("abort", abort, { once: true });
      try {
        const r = await reply;
        const changed = [...guard.changed(), ...(logBase?.changed() ?? [])];
        if (!changed.length) logBase = logFingerprint(c.dirs);
        if (changed.length) return { ok: false, error: `the program changed the record or the settings of Cuvette: ${changed.join(", ")}. A program must not write there. Check these files.` };
        return r;
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener("abort", abort);
      }
    };
    // A stopped call leaves the queue at once. The next call still waits for the call before it.
    const before = queue;
    const next = Promise.race([before, cancelled]).then(run);
    queue = Promise.all([before, next]).then(() => undefined, () => undefined);
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
    const metrics: Record<string, number> = { ...(f.metrics ?? {}) };
    for (const [k, v] of Object.entries(reply.metrics ?? {})) if (typeof v === "number" && Number.isFinite(v)) metrics[k] = v;
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
    warm,
    close: async () => {
      closed = true;
      live.cancel();
      for (const [id, fn] of waiting) fn({ id, ok: false, error: "the adapter closed" });
      waiting.clear();
      if (child) {
        try {
          child.stdin?.end();
        } catch {}
        const p = child;
        child = undefined;
        await new Promise<void>((done) => {
          if (p.exitCode !== null || p.signalCode !== null) return done();
          const timer = setTimeout(() => {
            killTree(p.pid);
            const last = setTimeout(done, 1000);
            p.once("close", () => (clearTimeout(last), done()));
          }, 500);
          p.once("close", () => (clearTimeout(timer), done()));
        });
      }
      log?.end();
    },
  });
}
