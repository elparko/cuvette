import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Args, ToolContext } from "../../core/types.ts";
import type { AdapterRuntime } from "../runtime.ts";
import { runArgv } from "./cli.ts";
import { commandLine, defTool, expand, inflight, makeRuntime, renderArgv, scopeFor, scalar, type CallDir, type KindContext } from "./common.ts";

export function startScript(c: KindContext): AdapterRuntime {
  const live = inflight();
  const conn = c.adapter.manifest.connection;
  const tools = c.adapter.manifest.tools.map((def) =>
    defTool(c, def, ({ args, ctx, call }: { args: Args; ctx: ToolContext; call: CallDir }) => {
      const interpreter = conn.interpreter.flatMap((a) => renderArgv([a], scopeFor(c, def, args, call)));
      if (!interpreter.length) return Promise.resolve({ ok: false, error: "connection.interpreter is empty" });
      if (!def.script) return Promise.resolve({ ok: false, error: "the tool has no script" });
      const script = resolve(c.adapter.root, expand(def.script, c.ph));
      const params = join(call.dir, ".params.json");
      writeFileSync(params, JSON.stringify(args));
      const argv = [...interpreter, script, params];
      const route = `${commandLine([...interpreter, script, "params.json"])}  # params.json: ${scalar(args)}`;
      return live.track(ctx.signal, (signal) => runArgv(c, def, args, call, argv, signal, { GA_PARAMS: params }, route));
    }),
  );
  return makeRuntime(c, { tools: () => tools, cancel: () => live.cancel(), close: () => live.cancel() });
}
