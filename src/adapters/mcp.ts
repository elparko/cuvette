import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { addOldEnv } from "../core/old-names.ts";
import type { Args, OutputFile, Tool, ToolContext, ToolOutput } from "../core/types.ts";
import type { LoadedAdapter } from "./manifest.ts";
import { cap, decorate, envAllowed, expand, failSummary, inflight, makeRuntime, killWithChildren, makeSummary, outputFile, readFields, safeName, tail, uniqueFile, withoutSecrets, type KindContext } from "./kinds/common.ts";
import type { AdapterRuntime } from "./runtime.ts";
import { blindArgv } from "./blind.ts";

interface McpContent {
  type: string;
  text?: string;
  data?: string;
  mimeType?: string;
}

interface McpResult {
  content?: McpContent[];
  structuredContent?: unknown;
  isError?: boolean;
}

const RESULT_CAP = 16 * 1024 * 1024;

const IMAGE_EXT: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/gif": ".gif", "image/webp": ".webp" };

export function convertResult(res: McpResult, tool: string, args: Args, adapter: LoadedAdapter | undefined, workDir: string): ToolOutput {
  const content = res.content ?? [];
  let text = content.filter((p) => p.type === "text").map((p) => p.text ?? "").join("\n");
  const notes: string[] = [];
  if (text.length > RESULT_CAP) {
    text = text.slice(0, RESULT_CAP);
    notes.push("[The tool result is cut at 16 MB.]");
  }
  const images: string[] = [];
  let imageBytes = 0;
  const files: OutputFile[] = [];
  for (const part of content) {
    if (part.type !== "image" || !part.data) continue;
    const size = Math.floor(part.data.length * 0.75);
    if (imageBytes + size > RESULT_CAP) {
      notes.push("[The images in the tool result are more than 16 MB. Cuvette did not save this image.]");
      continue;
    }
    imageBytes += size;
    const ext = IMAGE_EXT[(part.mimeType ?? "image/png").toLowerCase()] ?? ".png";
    const path = uniqueFile(workDir, `${safeName(tool)}-image`, ext);
    writeFileSync(path, Buffer.from(part.data, "base64"));
    images.push(path);
    files.push(outputFile(path));
  }
  let structured = res.structuredContent;
  if (structured !== undefined && JSON.stringify(structured).length > RESULT_CAP) {
    structured = undefined;
    notes.push("[The structured content of the tool result is more than 16 MB. Cuvette did not use it.]");
  }
  if (res.isError) {
    if (notes.length) text = `${text}\n${notes.join("\n")}`.trim();
    return { ok: false, error: text || "the tool reported an error", text, images: images.length ? images : undefined, outputs: files.length ? files : undefined };
  }
  let data: unknown = structured;
  if (data === undefined && /^\s*[[{]/.test(text)) {
    try {
      data = JSON.parse(text);
    } catch {}
  }
  const f = readFields(data, { scanPaths: true });
  const outputs = new Map<string, OutputFile>(files.map((o) => [o.path, o]));
  for (const o of f.outputs ?? []) if (!outputs.has(o.path)) outputs.set(o.path, o);
  const entry = adapter?.mapEntry(tool, args);
  const out: ToolOutput = { ok: f.ok !== false };
  out.text = [cap(text || (data !== undefined ? JSON.stringify(data) : ""), 20000), ...notes].join("\n").trim();
  if (data !== undefined) out.data = data;
  if (f.error) out.error = f.error;
  else if (!out.ok) out.error = f.summary ?? "the tool reported a failure";
  if (f.metrics) out.metrics = f.metrics;
  if (f.table) out.table = f.table;
  if (outputs.size) out.outputs = [...outputs.values()];
  if (images.length) out.images = images;
  if (f.manualRoute) out.manualRoute = f.manualRoute;
  const fidelity = f.fidelity ?? entry?.fidelity;
  if (fidelity) out.fidelity = fidelity;
  out.summary = !out.ok ? failSummary(tool, out.error) : f.summary ?? makeSummary(entry, tool, args, { metrics: f.metrics, data, table: f.table });
  return out;
}

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms).unref());

export async function startMcp(c: KindContext): Promise<AdapterRuntime> {
  const conn = c.adapter.manifest.connection;
  const live = inflight();
  const overrides = new Map(c.adapter.manifest.tools.map((d) => [d.name, d]));
  const log = (d: Buffer) => {
    try {
      appendFileSync(join(c.dirs.sessionDir, `adapter-${c.adapter.name}.log`), d);
    } catch {}
  };
  let client: Client | undefined;
  let transport: StdioClientTransport | StreamableHTTPClientTransport | undefined;
  let stderrTail = "";
  let exitInfo = "";
  let stopReason = "";
  let instructions = "";
  let toolCache: Tool[] | undefined;
  let closing = false;

  const reason = () => stopReason || exitInfo || tail(stderrTail.trim(), 600) || "no reason given";

  const connect = async (): Promise<Client> => {
    stderrTail = "";
    exitInfo = "";
    stopReason = "";
    let t: StdioClientTransport | StreamableHTTPClientTransport;
    if (conn.transport === "http") {
      const headers = Object.fromEntries(Object.entries(conn.headers).map(([k, v]) => [k, expand(v, c.ph)]));
      t = new StreamableHTTPClientTransport(new URL(expand(conn.url, c.ph)), { requestInit: { headers } });
    } else {
      const ok = envAllowed(c.adapter.manifest);
      const argv = blindArgv(conn.command.map((a) => expand(a, c.ph, ok)));
      if (!argv.length) throw new Error("connection.command is empty");
      const env = withoutSecrets(process.env);
      for (const [k, v] of Object.entries(conn.env)) env[k] = expand(v, c.ph, ok);
      Object.assign(env, { CUVETTE_WORK_DIR: c.dirs.workDir, CUVETTE_SESSION_DIR: c.dirs.sessionDir, CUVETTE_ADAPTER_DIR: c.adapter.root, CUVETTE_PROGRAM_PATH: c.programPath ?? "" });
      addOldEnv(env);
      log(Buffer.alloc(0));
      t = new StdioClientTransport({ command: argv[0], args: argv.slice(1), env, cwd: conn.cwd ? expand(conn.cwd, c.ph) : c.adapter.root, stderr: "pipe" });
      t.stderr?.on("data", (d: Buffer) => {
        log(d);
        stderrTail = tail(stderrTail + d.toString("utf8"), 2000);
      });
    }
    const cl = new Client({ name: "cuvette", version: "0.1.0" });
    cl.onclose = () => {
      if (client === cl) {
        client = undefined;
        transport = undefined;
        if (!closing) stopReason = exitInfo || tail(stderrTail.trim(), 600) || "the connection closed";
      }
    };
    try {
      await cl.connect(t, { timeout: conn.startup_timeout_s * 1000 });
    } catch (e) {
      await t.close().catch(() => {});
      throw new Error(`the adapter process stopped: ${tail(stderrTail.trim(), 600) || (e as Error).message}`);
    }
    const proc = (t as unknown as { _process?: { on(ev: string, fn: (...a: unknown[]) => void): void } })._process;
    proc?.on("exit", (code, sig) => {
      exitInfo = sig ? `killed by signal ${sig}` : `exit code ${code}`;
      const extra = tail(stderrTail.trim(), 600);
      if (extra) exitInfo += `: ${extra}`;
    });
    client = cl;
    transport = t;
    instructions = cl.getInstructions() ?? "";
    return cl;
  };

  const current = async () => client ?? connect();

  const kill = async () => {
    const t = transport;
    client = undefined;
    transport = undefined;
    stopReason = "the harness stopped the process after a cancel";
    await killWithChildren((t as StdioClientTransport | undefined)?.pid ?? undefined);
    await t?.close().catch(() => {});
  };

  const listAll = async (): Promise<Tool[]> => {
    const cl = await current();
    const out: Tool[] = [];
    let cursor: string | undefined;
    do {
      const page = await cl.listTools(cursor ? { cursor } : undefined);
      for (const t of page.tools) {
        const o = overrides.get(t.name);
        const tool = decorate(c, { read_only: o?.read_only === true, approval: o?.approval === true }, {
          name: t.name,
          title: t.title ?? t.annotations?.title ?? (o?.title || undefined),
          description: t.description ?? o?.description ?? "",
          inputSchema: t.inputSchema as Record<string, unknown>,
          execute: (args, ctx) => run(t.name, args, ctx),
        });
        if (!tool.readOnly) delete tool.readOnly;
        out.push(tool);
      }
      cursor = page.nextCursor;
    } while (cursor);
    return out;
  };

  const run = async (name: string, args: Args, ctx: ToolContext): Promise<ToolOutput> => {
    let cl: Client;
    try {
      cl = await current();
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
    try {
      const res = await live.track(ctx.signal, (signal) => cl.callTool({ name, arguments: args }, undefined, { signal, timeout: conn.call_timeout_s * 1000 }));
      return convertResult(res as McpResult, name, args, c.adapter, c.dirs.workDir);
    } catch (e) {
      const err = e as Error & { code?: number };
      if (ctx.signal.aborted || err.name === "AbortError" || /abort/i.test(err.message)) return { ok: false, error: "the call was cancelled" };
      if (err.code === -32001) return { ok: false, error: `the call timed out after ${conn.call_timeout_s} s` };
      if (err.code === -32000 || client !== cl) {
        await sleep(50);
        return { ok: false, error: `the adapter process stopped: ${reason()}` };
      }
      return { ok: false, error: err.message };
    }
  };

  await connect();
  toolCache = await listAll();

  return makeRuntime(c, {
    instructions: instructions || c.adapter.manifest.adapter.description,
    tools: async () => {
      if (!client) toolCache = await listAll();
      return toolCache ?? [];
    },
    running: () => client !== undefined,
    async cancel() {
      if (!live.busy) return;
      live.cancel();
      const cl = client;
      if (!cl) return;
      const alive = await Promise.race([cl.ping({ timeout: 3000 }).then(() => true, () => false), sleep(3000).then(() => false)]);
      if (!alive) await kill();
    },
    async close() {
      closing = true;
      live.cancel();
      const t = transport;
      client = undefined;
      transport = undefined;
      await t?.close().catch(() => {});
    },
  });
}
