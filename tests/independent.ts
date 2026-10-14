import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { locate } from "../src/adapters/locate.ts";
import { loadAdapter } from "../src/adapters/manifest.ts";
import { startAdapter } from "../src/adapters/runtime.ts";
import { runProcess } from "../src/adapters/kinds/common.ts";
import type { Args, Tool, ToolContext, ToolOutput } from "../src/core/types.ts";

export const CATALOG = resolve(import.meta.dirname, "../catalog");

export const live = !!process.env.CUVETTE_LIVE;

export async function programOf(name: string): Promise<string | undefined> {
  if (!live) return undefined;
  const found = await locate(loadAdapter(join(CATALOG, name)).manifest);
  return found.path && existsSync(found.path) ? found.path : undefined;
}

export type Result = Omit<ToolOutput, "data" | "metrics" | "table" | "outputs"> & {
  data: Record<string, any>;
  metrics: Record<string, any>;
  table: { path: string; columns: string[]; rows: any[][] };
  outputs: { path: string }[];
};

export interface OpenAdapter {
  run(tool: string, args?: Args): Promise<Result>;
  close(): Promise<void>;
}

export async function openAdapter(name: string): Promise<OpenAdapter> {
  const root = mkdtempSync(join(tmpdir(), `cuvette-independent-${name}-`));
  const dirs = { workDir: join(root, "work"), sessionDir: join(root, "session") };
  const rt = await startAdapter(loadAdapter(join(CATALOG, name)), dirs);
  const tools: Record<string, Tool> = Object.fromEntries((await rt.tools()).map((t) => [t.name, t]));
  const ctx = (): ToolContext => ({
    session: "s",
    callId: "c",
    workDir: dirs.workDir,
    sessionDir: dirs.sessionDir,
    signal: new AbortController().signal,
    log: () => {
      throw new Error("no log");
    },
    callTool: async () => ({ ok: true }),
  });
  return {
    run: async (tool, args = {}) => {
      const out = await tools[tool].execute(args, ctx());
      if (!out.ok) throw new Error(`${tool} failed: ${out.error}`);
      return out as Result;
    },
    close: async () => {
      await rt.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

export async function scriptOut(argv: string[], cwd?: string): Promise<string> {
  const r = await runProcess(argv, { cwd, timeoutMs: 600_000, env: { ...process.env, PYTHONWARNINGS: "ignore", PYTHONNOUSERSITE: "1", R_LIBS_USER: process.env.CUVETTE_R_LIBS ?? process.env.R_LIBS_USER ?? join(process.env.HOME ?? "", ".cuvette", "R-library") } as Record<string, string> });
  if (r.code !== 0) throw new Error(`${argv[0]} exited with ${r.code}: ${r.stderr.slice(-600)}`);
  return r.stdout;
}

export async function rJson<T>(rscript: string, code: string, cwd?: string): Promise<T> {
  const out = await scriptOut([rscript, "--vanilla", "-e", `cat(jsonlite::toJSON(local({${code}}), auto_unbox = TRUE, digits = NA))`], cwd);
  return JSON.parse(out) as T;
}

export async function pyJson<T>(python: string, code: string, cwd?: string): Promise<T> {
  const out = await scriptOut([python, "-I", "-c", `import json\n${code}`], cwd);
  return JSON.parse(out.trim().split("\n").at(-1)!) as T;
}
