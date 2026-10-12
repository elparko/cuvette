import { closeSync, existsSync, lstatSync, mkdirSync, openSync, readSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import type { Args, Tool, ToolContext, ToolOutput } from "../core/types.ts";
import { cap, commandLine, outputFile, processFailure, runProcess, validateArgs, withoutSecrets, type Dirs } from "../adapters/kinds/common.ts";
import { takeScreenshot } from "../adapters/kinds/screen.ts";
import { isCredentialsFile } from "../core/credentials.ts";

const below = (root: string, p: string) => {
  const rel = relative(root, p);
  return !!rel && rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel);
};

function existingAncestor(p: string): string {
  let at = p;
  while (!existsSync(at) && dirname(at) !== at) at = dirname(at);
  return at;
}

function isLink(p: string): boolean {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

export function insideWorkDir(workDir: string, name: string): string | undefined {
  const target = resolve(workDir, name);
  if (!below(workDir, target)) return undefined;
  mkdirSync(workDir, { recursive: true });
  const root = realpathSync(workDir);
  const inRoot = (p: string) => p === root || below(root, p);
  if (!inRoot(realpathSync(existingAncestor(dirname(target))))) return undefined;
  mkdirSync(dirname(target), { recursive: true });
  if (!inRoot(realpathSync(dirname(target))) || isLink(target)) return undefined;
  return target;
}

export function projectPath(projectDir: string, p: string): string {
  return resolve(projectDir, p.replace(/^~(?=[\\/]|$)/, homedir()));
}

export const PLAIN_PURPOSE = "One short line for the scientist: why this runs. Example: Find the ImageJ install.";
export const PLAIN_DOES =
  "One or two plain sentences for a scientist that say what the code does, step by step. Use no code terms: no function, library, variable or flag names. Example: Opens 24 images, finds the nuclei with Otsu thresholding, counts them per image and saves a table (counts.csv).";

export function genericTools(dirs: Dirs): Tool[] {
  const project = dirs.projectDir ?? process.cwd();
  const here = (p: string) => projectPath(project, p);
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
      description: `Run a program with an argument list. There is no shell. The scientist must approve each call. The program runs in the project folder ${project} unless you give cwd; a relative cwd starts there. Give purpose and does in plain language: the scientist sees them, not the command.`,
      permission: "ask",
      inputSchema: {
        type: "object",
        properties: {
          purpose: { type: "string", minLength: 1, maxLength: 160, description: PLAIN_PURPOSE },
          does: { type: "string", minLength: 1, maxLength: 600, description: PLAIN_DOES },
          argv: { type: "array", items: { type: "string" }, minItems: 1 },
          cwd: { type: "string" },
          timeout_s: { type: "number", minimum: 1, maximum: 3600, default: 60 },
        },
        required: ["purpose", "does", "argv"],
        additionalProperties: false,
      },
      async run(a, ctx) {
        const argv = a.argv as string[];
        const route = commandLine(argv);
        const cwd = a.cwd ? here(String(a.cwd)) : project;
        const r = await runProcess(argv, { cwd, env: withoutSecrets(), signal: ctx.signal, timeoutMs: Number(a.timeout_s) * 1000 });
        const text = cap([r.stdout, r.stderr && `[stderr]\n${r.stderr}`].filter(Boolean).join("\n"), 20000);
        const failure = processFailure(r, argv[0], Number(a.timeout_s));
        return failure ? { ok: false, error: failure, text, manualRoute: route } : { ok: true, text, summary: `Ran ${argv[0]} in ${cwd}; exit code 0.`, manualRoute: route };
      },
    }),
    make({
      name: "read_file",
      title: "Read a file",
      description: `Read the start of a text file. A relative path starts in the project folder ${project}.`,
      readOnly: true,
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" }, max_bytes: { type: "integer", minimum: 1, maximum: 1_000_000, default: 20000 } },
        required: ["path"],
        additionalProperties: false,
      },
      run(a) {
        const path = here(String(a.path));
        if (!existsSync(path) || !statSync(path).isFile()) return { ok: false, error: `${path} is not a file` };
        if (isCredentialsFile(path)) return { ok: false, error: `${path} holds the saved API keys. The agent cannot read it.` };
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
      description: `List the files and folders in a folder. A relative path starts in the project folder ${project}.`,
      readOnly: true,
      inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false },
      run(a) {
        const path = here(String(a.path));
        if (!existsSync(path) || !statSync(path).isDirectory()) return { ok: false, error: `${path} is not a folder` };
        const entries = readdirSync(path, { withFileTypes: true }).map((e) => ({ name: e.name, kind: e.isDirectory() ? "folder" : "file", size: e.isFile() ? statSync(resolve(path, e.name)).size : undefined }));
        return { ok: true, summary: `${entries.length} entries in ${path}.`, data: { entries }, text: entries.map((e) => `${e.kind === "folder" ? "d" : "-"} ${e.name}${e.size === undefined ? "" : `  ${e.size}`}`).join("\n") };
      },
    }),
    make({
      name: "write_file",
      title: "Write a file",
      description: `Write a text file. A relative name goes to the session folder ${dirs.workDir}. An absolute path in the project folder ${project} is also allowed, for a place that the scientist names. Other paths are refused.`,
      inputSchema: {
        type: "object",
        properties: { name: { type: "string", minLength: 1 }, text: { type: "string" } },
        required: ["name", "text"],
        additionalProperties: false,
      },
      run(a) {
        const name = String(a.name);
        const target = insideWorkDir(dirs.workDir, name) ?? (dirs.projectDir && isAbsolute(name) ? insideWorkDir(dirs.projectDir, name) : undefined);
        if (!target) return { ok: false, error: `the path is outside the session folder ${dirs.workDir} and the project folder ${project}` };
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
