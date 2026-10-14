import { closeSync, constants, existsSync, fstatSync, ftruncateSync, lstatSync, mkdirSync, openSync, readSync, readdirSync, realpathSync, statSync, writeSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import type { Args, Tool, ToolContext, ToolOutput } from "../core/types.ts";
import { cap, commandLine, integrityError, integrityReason, outputFile, processFailure, runProcess, validateArgs, withoutSecrets, type Dirs } from "../adapters/kinds/common.ts";
import { takeScreenshot } from "../adapters/kinds/screen.ts";
import { isCredentialsFile } from "../core/credentials.ts";
import { writeRefusalReason } from "../core/refusals.ts";
import { guardCommand } from "./run_script.ts";

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

const GUARDED_NAMES = new Set([".cuvette", ".ga"]);

function realish(p: string): string {
  const at = existingAncestor(p);
  return resolve(realpathSync.native(at), relative(at, p));
}

function inRecordFolder(p: string): boolean {
  for (let at = dirname(p); dirname(at) !== at; at = dirname(at))
    if (basename(at).toLowerCase() === ".record" && (existsSync(resolve(at, "log.jsonl")) || existsSync(resolve(at, "meta.json")))) return true;
  return false;
}

function guarded(target: string, dirs: Dirs): boolean {
  const inside = (root: string, p: string) => p === root || below(root, p);
  const record = realish(dirs.sessionDir);
  const work = realish(dirs.workDir);
  const legacy = below(record, work);
  for (const t of [realish(target), resolve(target)]) {
    if (inside(record, t) && !(legacy && inside(work, t))) return true;
    if (inRecordFolder(t)) return true;
  }
  for (const [t, w, project] of [[realish(target), work, dirs.projectDir && realish(dirs.projectDir)], [resolve(target), resolve(dirs.workDir), dirs.projectDir && resolve(dirs.projectDir)]] as const) {
    if (below(w, t) || !project || !below(project, t)) continue;
    const parts = relative(project, t).split(/[\\/]/);
    if (GUARDED_NAMES.has(parts[0]!.toLowerCase()) || (parts.length === 1 && parts[0]!.toLowerCase() === "lab.md")) return true;
  }
  return false;
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
      description: `Run a program with an argument list. There is no shell. The scientist must approve each call. The program runs in the project folder unless you give cwd; a relative cwd starts there. Give purpose and does in plain language: the scientist sees them, not the command.`,
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
        const env = withoutSecrets();
        const guarded = await guardCommand(argv, dirs, { cwd, env });
        const r = await runProcess(guarded.argv, { cwd, env, signal: ctx.signal, timeoutMs: Number(a.timeout_s) * 1000 });
        const changed = guarded.changed();
        if (changed.length) {
          for (const path of changed) ctx.log("blocked", { callId: ctx.callId, tool: "run_command", path, reason: integrityReason("command", path), by: "integrity check" });
          return { ok: false, error: integrityError("command", changed), manualRoute: route };
        }
        const text = cap([r.stdout, r.stderr && `[stderr]\n${r.stderr}`].filter(Boolean).join("\n"), 20000);
        const failure = processFailure(r, argv[0], Number(a.timeout_s));
        return failure ? { ok: false, error: failure, text, manualRoute: route } : { ok: true, text, summary: `Ran ${argv[0]} in ${cwd}; exit code 0.`, manualRoute: route };
      },
    }),
    make({
      name: "read_file",
      title: "Read a file",
      description: "Read the start of a text file. A relative path starts in the project folder.",
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
      description: "List the files and folders in a folder. A relative path starts in the project folder.",
      readOnly: true,
      inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false },
      run(a) {
        const path = here(String(a.path));
        if (!existsSync(path) || !statSync(path).isDirectory()) return { ok: false, error: `${path} is not a folder` };
        const entries = readdirSync(path, { withFileTypes: true }).map((e) => {
          const st = e.isSymbolicLink() ? statSync(resolve(path, e.name), { throwIfNoEntry: false }) : undefined;
          const folder = st ? st.isDirectory() : e.isDirectory();
          return { name: e.name, kind: folder ? "folder" : "file", size: st ? (st.isFile() ? st.size : undefined) : e.isFile() ? statSync(resolve(path, e.name)).size : undefined };
        });
        return { ok: true, summary: `${entries.length} entries in ${path}.`, data: { entries }, text: entries.map((e) => `${e.kind === "folder" ? "d" : "-"} ${e.name}${e.size === undefined ? "" : `  ${e.size}`}`).join("\n") };
      },
    }),
    make({
      name: "write_file",
      title: "Write a file",
      description: "Write a text file. A relative name goes to the session folder. An absolute path in the project folder is also allowed, for a place that the scientist names. Other paths are refused.",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string", minLength: 1 }, text: { type: "string" } },
        required: ["name", "text"],
        additionalProperties: false,
      },
      run(a, ctx) {
        const name = String(a.name);
        const asked = resolve(dirs.workDir, name);
        if (guarded(asked, dirs)) {
          ctx.log("blocked", { callId: ctx.callId, tool: "write_file", path: asked, reason: writeRefusalReason(asked, basename(asked).toLowerCase() === "lab.md"), by: "write rule" });
          return { ok: false, error: `the path ${asked} belongs to the record or to the settings of Cuvette. The agent cannot write there. Write the file in the session folder ${dirs.workDir}.` };
        }
        const target = insideWorkDir(dirs.workDir, name) ?? (dirs.projectDir && isAbsolute(name) ? insideWorkDir(dirs.projectDir, name) : undefined);
        if (!target) return { ok: false, error: `the path is outside the session folder ${dirs.workDir} and the project folder ${project}` };
        const fd = openSync(target, constants.O_WRONLY | constants.O_CREAT | (constants.O_NOFOLLOW ?? 0), 0o666);
        try {
          const st = fstatSync(fd);
          if (!st.isFile()) return { ok: false, error: `${target} is not a file` };
          if (st.nlink > 1) return { ok: false, error: `the file ${target} has more than one hard link. The agent cannot write to it. Write a new file in the session folder ${dirs.workDir}.` };
          ftruncateSync(fd, 0);
          writeSync(fd, String(a.text));
        } finally {
          closeSync(fd);
        }
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
