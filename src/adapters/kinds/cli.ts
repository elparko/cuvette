import { basename } from "node:path";
import type { ToolDef } from "../manifest.ts";
import { buildOutput, childEnv, commandLine, defTool, expand, inflight, integrityError, makeRuntime, processFailure, renderArgv, runProcess, scopeFor, type CallDir, type KindContext } from "./common.ts";
import type { AdapterRuntime } from "../runtime.ts";
import { guardCommand } from "../../tools/run_script.ts";
import type { Args, ToolContext, ToolOutput } from "../../core/types.ts";

export async function runArgv(c: KindContext, def: ToolDef, args: Args, call: CallDir, argv: string[], signal: AbortSignal, extraEnv: Record<string, string> = {}, route = commandLine(argv)): Promise<ToolOutput> {
  const conn = c.adapter.manifest.connection;
  const cwd = conn.cwd ? expand(conn.cwd, c.ph) : call.dir;
  const outEnv: Record<string, string> = {};
  for (const [k, p] of Object.entries(call.outputs)) outEnv[`CUVETTE_OUTPUT_${k.toUpperCase().replace(/\W/g, "_")}`] = p;
  const env = childEnv(c, { ...outEnv, CUVETTE_CALL_DIR: call.dir, ...extraEnv });
  const guarded = await guardCommand(argv, c.dirs, { cwd, env, adapterRoot: c.adapter.root });
  const r = await runProcess(guarded.argv, { cwd, env, signal, timeoutMs: conn.call_timeout_s * 1000 });
  const changed = guarded.changed();
  if (changed.length) return { ok: false, error: integrityError("program", changed), manualRoute: route };
  const failure = processFailure(r, basename(argv[0] ?? "the program"), conn.call_timeout_s);
  if (failure) return { ok: false, error: failure, text: r.stdout.slice(0, 4000), manualRoute: route };
  return buildOutput({ adapter: c.adapter, def, args, call, stdout: r.stdout, route });
}

export function startCli(c: KindContext): AdapterRuntime {
  const live = inflight();
  const tools = c.adapter.manifest.tools.map((def) =>
    defTool(c, def, ({ args, ctx, call }: { args: Args; ctx: ToolContext; call: CallDir }) => {
      const argv = renderArgv(def.command, scopeFor(c, def, args, call));
      if (!argv.length) return Promise.resolve({ ok: false, error: "the tool has no command" });
      return live.track(ctx.signal, (signal) => runArgv(c, def, args, call, argv, signal));
    }),
  );
  return makeRuntime(c, { tools: () => tools, cancel: () => live.cancel(), close: () => live.cancel() });
}
