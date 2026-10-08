import { closeSync, existsSync, mkdirSync, openSync, readSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { Args, Tool, ToolContext, ToolOutput } from "../core/types.ts";
import { cap, commandLine, outputFile, processFailure, runProcess, validateArgs, type Dirs } from "../adapters/kinds/common.ts";
import { takeScreenshot } from "../adapters/kinds/screen.ts";

function insideWorkDir(workDir: string, name: string): string | undefined {
  const target = resolve(workDir, name);
  const rel = relative(workDir, target);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) return undefined;
  mkdirSync(dirname(target), { recursive: true });
  const real = relative(realpathSync(workDir), realpathSync(dirname(target)));
  if (real.startsWith("..") || isAbsolute(real)) return undefined;
  return target;
}

export function genericTools(dirs: Dirs): Tool[] {
  const make = (t: Omit<Tool, "source" | "execute"> & { run(a: Args, ctx: ToolContext): Promise<ToolOutput> | ToolOutput }): Tool => {
    const { run, ...rest } = t;
    return {
      ...rest,
      source: "generic",
      async execute(raw, ctx) {
        const v = validateArgs(rest.inputSchema, raw);
        if (v.error) return { ok: false, error: v.error, fidelity: "none" };
        try {
          return { fidelity: "none", ...(await run(v.args, ctx)) };
        } catch (e) {
          return { ok: false, error: (e as Error).message, fidelity: "none" };
        }
      },
    };
  };
  return [
    make({
      name: "run_command",
      title: "Run a command",
      description: "Run a program with an argument list. There is no shell. The scientist must approve each call.",
      permission: "ask",
      inputSchema: {
        type: "object",
        properties: {
          argv: { type: "array", items: { type: "string" }, minItems: 1 },
          cwd: { type: "string" },
          timeout_s: { type: "number", minimum: 1, maximum: 3600, default: 60 },
        },
        required: ["argv"],
        additionalProperties: false,
      },
      async run(a, ctx) {
        const argv = a.argv as string[];
        const route = commandLine(argv);
        const r = await runProcess(argv, { cwd: a.cwd ? resolve(String(a.cwd)) : dirs.workDir, signal: ctx.signal, timeoutMs: Number(a.timeout_s) * 1000 });
        const text = cap([r.stdout, r.stderr && `[stderr]\n${r.stderr}`].filter(Boolean).join("\n"), 20000);
        const failure = processFailure(r, argv[0], Number(a.timeout_s));
        return failure ? { ok: false, error: failure, text, manualRoute: route } : { ok: true, text, summary: `Ran ${argv[0]}; exit code 0.`, manualRoute: route };
      },
    }),
    make({
      name: "read_file",
      title: "Read a file",
      description: "Read the start of a text file.",
      readOnly: true,
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" }, max_bytes: { type: "integer", minimum: 1, maximum: 1_000_000, default: 20000 } },
        required: ["path"],
        additionalProperties: false,
      },
      run(a) {
        const path = resolve(String(a.path));
        if (!existsSync(path) || !statSync(path).isFile()) return { ok: false, error: `${path} is not a file` };
        const size = statSync(path).size;
        const fd = openSync(path, "r");
        const buf = Buffer.alloc(Math.min(size, Number(a.max_bytes)));
        try {
          readSync(fd, buf, 0, buf.length, 0);
        } finally {
          closeSync(fd);
        }
        if (buf.includes(0)) return { ok: true, summary: `${path} is a binary file (${size} bytes).`, text: "[binary file]", data: { size, binary: true } };
        return { ok: true, summary: `Read ${buf.length} of ${size} bytes from ${path}.`, text: buf.toString("utf8"), data: { size, truncated: buf.length < size } };
      },
    }),
    make({
      name: "list_dir",
      title: "List a folder",
      description: "List the files and folders in a folder.",
      readOnly: true,
      inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false },
      run(a) {
        const path = resolve(String(a.path));
        if (!existsSync(path) || !statSync(path).isDirectory()) return { ok: false, error: `${path} is not a folder` };
        const entries = readdirSync(path, { withFileTypes: true }).map((e) => ({ name: e.name, kind: e.isDirectory() ? "folder" : "file", size: e.isFile() ? statSync(resolve(path, e.name)).size : undefined }));
        return { ok: true, summary: `${entries.length} entries in ${path}.`, data: { entries }, text: entries.map((e) => `${e.kind === "folder" ? "d" : "-"} ${e.name}${e.size === undefined ? "" : `  ${e.size}`}`).join("\n") };
      },
    }),
    make({
      name: "write_file",
      title: "Write a file",
      description: "Write a text file in the session work folder. Paths outside the work folder are refused.",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string", minLength: 1 }, text: { type: "string" } },
        required: ["name", "text"],
        additionalProperties: false,
      },
      run(a) {
        const target = insideWorkDir(dirs.workDir, String(a.name));
        if (!target) return { ok: false, error: "the path is outside the session work folder" };
        writeFileSync(target, String(a.text));
        return { ok: true, summary: `Wrote ${Buffer.byteLength(String(a.text))} bytes to ${target}.`, outputs: [outputFile(target)] };
      },
    }),
    make({
      name: "screenshot",
      title: "Take a screenshot",
      description: "Save a PNG of the whole screen.",
      readOnly: true,
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      async run(_a, ctx) {
        const env: Record<string, string> = {};
        for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
        const out = await takeScreenshot(dirs, env, ctx.signal);
        return { ...out, fidelity: "none" };
      },
    }),
  ];
}
