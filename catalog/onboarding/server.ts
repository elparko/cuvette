import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { cuvetteHome } from "../../src/adapters/manifest.ts";
import { checkAdapter } from "../../src/onboarding/checker.ts";

const CAP = 200_000;

interface Ran {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  missing: boolean;
}

function run(cmd: string, args: string[], timeoutMs: number): Promise<Ran> {
  return new Promise((done) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let missing = false;
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    const add = (cur: string, d: Buffer) => (cur.length < CAP ? cur + d.toString("utf8") : cur);
    child.stdout.on("data", (d: Buffer) => (stdout = add(stdout, d)));
    child.stderr.on("data", (d: Buffer) => (stderr = add(stderr, d)));
    child.on("error", () => {
      missing = true;
      clearTimeout(timer);
      done({ code: null, stdout, stderr, timedOut, missing });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      done({ code, stdout: stdout.slice(0, CAP), stderr: stderr.slice(0, CAP), timedOut, missing });
    });
  });
}

type Out = { ok: boolean; error?: string; summary?: string; data?: unknown; text?: string };

function reply(o: Out) {
  return { content: [{ type: "text" as const, text: JSON.stringify(o) }], isError: !o.ok };
}

const fail = (error: string) => reply({ ok: false, error });

async function whichAll(name: string): Promise<string[]> {
  const r = process.platform === "win32" ? await run("where", [name], 5000) : await run("which", ["-a", name], 5000);
  return r.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function installFolders(name: string): string[] {
  const home = homedir();
  const bases: string[] =
    process.platform === "darwin"
      ? ["/Applications", join(home, "Applications"), "/opt/homebrew/bin", "/opt/homebrew/opt", "/opt/homebrew/Caskroom", "/usr/local/bin", "/usr/local/opt", "/opt"]
      : process.platform === "win32"
        ? [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Programs"), "C:\\"].filter((x): x is string => !!x)
        : ["/opt", "/usr/local", "/usr/share", "/usr/lib", join(home, ".local", "bin"), join(home, "opt"), "/snap"];
  const needle = name.toLowerCase();
  const found: string[] = [];
  for (const base of bases) {
    if (!existsSync(base)) continue;
    let names: string[] = [];
    try {
      names = readdirSync(base);
    } catch {
      continue;
    }
    for (const n of names) if (n.toLowerCase().includes(needle)) found.push(join(base, n));
  }
  return found.slice(0, 40);
}

const PY_PROBE = `
import importlib.util, sys
name = sys.argv[1]
try:
    spec = importlib.util.find_spec(name)
except Exception:
    spec = None
version = ""
if spec:
    try:
        import importlib.metadata as md
        version = md.version(name.split(".")[0])
    except Exception:
        pass
print((spec.origin or "namespace") + "\\t" + version if spec else "")
`;

const PY_API = `
import importlib, inspect, json, sys
mod = importlib.import_module(sys.argv[1])
names = getattr(mod, "__all__", None) or [n for n in dir(mod) if not n.startswith("_")]
out = []
for n in names[:400]:
    try:
        obj = getattr(mod, n)
    except Exception:
        continue
    if inspect.ismodule(obj):
        kind = "module"
    elif inspect.isclass(obj):
        kind = "class"
    elif callable(obj):
        kind = "function"
    else:
        continue
    try:
        sig = str(inspect.signature(obj))
    except Exception:
        sig = "(...)"
    doc = (inspect.getdoc(obj) or "").strip().split("\\n")[0][:200]
    out.append({"name": n, "kind": kind, "signature": sig, "doc": doc})
print(json.dumps({"module": sys.argv[1], "version": getattr(mod, "__version__", ""), "members": out}))
`;

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|pre|br|section|article)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function draftBase(name?: string): string | undefined {
  if (process.env.CUVETTE_DRAFT_DIR) return resolve(process.env.CUVETTE_DRAFT_DIR);
  if (name && /^[a-z0-9][a-z0-9-]*$/.test(name)) return join(cuvetteHome(), "adapters", name);
  return undefined;
}

function inside(base: string, target: string): boolean {
  const rel = relative(base, target);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function realAncestor(p: string): string {
  let cur = p;
  while (!existsSync(cur)) cur = dirname(cur);
  return realpathSync(cur);
}

function safeTarget(base: string, rel: string): string | undefined {
  if (!rel || isAbsolute(rel)) return undefined;
  const target = resolve(base, rel);
  if (!inside(base, target)) return undefined;
  if (!inside(realAncestor(base), realAncestor(target))) return undefined;
  return target;
}

const HELP_FLAGS = new Set(["--help", "-h", "help", "-help", "/?"]);
const SAFE_WORD = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;

const server = new McpServer({ name: "onboarding", version: "0.1.0" });
const readOnly = { readOnlyHint: true };

server.registerTool(
  "probe_program",
  {
    description: "Find a program on this computer: paths, version, install folders, and a Python import check.",
    inputSchema: { name: z.string().describe("Program or package name, such as pandoc or scanpy") },
    annotations: readOnly,
  },
  async ({ name }) => {
    if (!/^[A-Za-z0-9_][A-Za-z0-9_. -]*$/.test(name)) return fail("the name has characters that a program name does not use");
    const paths = await whichAll(name.replace(/ /g, ""));
    let version: { flag: string; output: string } | undefined;
    if (paths.length) {
      for (const flag of ["--version", "-v", "-version"]) {
        const r = await run(paths[0], [flag], 8000);
        const text = `${r.stdout}\n${r.stderr}`.trim();
        if (!r.missing && !r.timedOut && text && r.code === 0) {
          version = { flag, output: text.slice(0, 2000) };
          break;
        }
      }
    }
    const folders = installFolders(name);
    const modName = name.replace(/[-\s]/g, "_");
    const py = await run("python3", ["-c", PY_PROBE, modName], 15000);
    const [origin, pyVersion] = py.stdout.trim().split("\t");
    const python = origin ? { importable: true, origin, version: pyVersion ?? "" } : { importable: false };
    const found = paths.length > 0 || folders.length > 0 || python.importable;
    return reply({
      ok: true,
      summary: found
        ? `${name}: ${paths.length ? `on PATH at ${paths[0]}` : "not on PATH"}${version ? `, version output from ${version.flag}` : ""}${python.importable ? ", importable in Python" : ""}`
        : `${name}: not found on PATH, in install folders, or as a Python module`,
      data: { name, platform: process.platform, which: paths, version, install_folders: folders, python },
    });
  },
);

server.registerTool(
  "read_help",
  {
    description:
      "Run a command with a help flag and return its text. Give argv as the command, any subcommand names, and optionally the help flag at the end. If you leave the flag out, the tool tries --help, -h and help. Time limit 20 s.",
    inputSchema: { argv: z.array(z.string()).min(1).describe('For example ["pandoc","--help"] or ["git","commit"]') },
    annotations: readOnly,
  },
  async ({ argv }) => {
    const hasFlag = HELP_FLAGS.has(argv[argv.length - 1]);
    const words = hasFlag ? argv.slice(0, -1) : argv;
    if (!words.length) return fail("argv must start with the command name");
    if (!words.slice(1).every((w) => SAFE_WORD.test(w))) return fail("only the command, subcommand names and one help flag are allowed");
    const attempts = hasFlag ? [argv[argv.length - 1]] : ["--help", "-h", "help"];
    let last: Ran | undefined;
    for (const flag of attempts) {
      const args = flag === "help" && !hasFlag ? [...words.slice(1), "help"] : [...words.slice(1), flag];
      const r = await run(words[0], args, 20000);
      last = r;
      if (r.missing) return fail(`the command "${words[0]}" was not found`);
      const text = `${r.stdout}${r.stdout && r.stderr ? "\n" : ""}${r.stderr}`.trim();
      if (text && !r.timedOut && text.length > 20) {
        return reply({ ok: true, summary: `help text from \`${[words[0], ...args].join(" ")}\``, text: text.slice(0, CAP), data: { command: [words[0], ...args], exit_code: r.code } });
      }
    }
    return fail(last?.timedOut ? "the command did not finish in 20 s" : "the command printed no help text");
  },
);

server.registerTool(
  "python_api",
  {
    description: "List the public functions, classes and submodules of a Python module with signatures and the first line of each docstring.",
    inputSchema: {
      module: z.string().regex(/^[A-Za-z_][\w.]*$/).describe("Python module name, such as scanpy or skimage.filters"),
      interpreter: z.string().optional().describe("Path to a Python interpreter. Default python3."),
    },
    annotations: readOnly,
  },
  async ({ module, interpreter }) => {
    const r = await run(interpreter || "python3", ["-c", PY_API, module], 60000);
    if (r.missing) return fail(`the interpreter "${interpreter || "python3"}" was not found`);
    if (r.code !== 0) return fail(r.timedOut ? "the import did not finish in 60 s" : r.stderr.trim().split("\n").slice(-3).join("\n"));
    let data: { members: unknown[] };
    try {
      data = JSON.parse(r.stdout.trim().split("\n").pop() ?? "");
    } catch {
      return fail("the inspector printed no JSON");
    }
    return reply({ ok: true, summary: `${module}: ${data.members.length} public members`, data });
  },
);

server.registerTool(
  "fetch_url",
  {
    description: "Fetch a web page and return its text with the HTML tags removed. Limit 200 kB.",
    inputSchema: { url: z.string().url().describe("Web address that starts with http or https") },
    annotations: readOnly,
  },
  async ({ url }) => {
    if (!/^https?:\/\//i.test(url)) return fail("only http and https addresses are allowed");
    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { "user-agent": "cuvette-onboarding" }, redirect: "follow" });
    } catch (err) {
      return fail(`the request failed: ${(err as Error).message}`);
    }
    if (!res.ok) return fail(`the server answered HTTP ${res.status}`);
    const type = res.headers.get("content-type") ?? "";
    const body = await res.text();
    const text = /html|xml/i.test(type) || /^\s*<(!doctype|html)/i.test(body) ? stripHtml(body) : body;
    return reply({ ok: true, summary: `${url}: ${Math.min(text.length, CAP)} characters${text.length > CAP ? " (cut)" : ""}`, text: text.slice(0, CAP), data: { url: res.url, content_type: type, truncated: text.length > CAP } });
  },
);

server.registerTool(
  "list_files",
  {
    description: "List the files in a folder with sizes. Folders end with /.",
    inputSchema: { path: z.string().describe("Absolute path of the folder") },
    annotations: readOnly,
  },
  async ({ path }) => {
    let names: string[];
    try {
      names = readdirSync(path);
    } catch (err) {
      return fail((err as Error).message);
    }
    const entries = names.slice(0, 500).map((n) => {
      try {
        const s = statSync(join(path, n));
        return s.isDirectory() ? { name: `${n}/` } : { name: n, bytes: s.size };
      } catch {
        return { name: n };
      }
    });
    return reply({ ok: true, summary: `${names.length} entries in ${path}`, data: { path, entries, truncated: names.length > 500 } });
  },
);

server.registerTool(
  "read_file",
  {
    description: "Read a text file. Limit 200 kB.",
    inputSchema: { path: z.string().describe("Absolute path of the text file") },
    annotations: readOnly,
  },
  async ({ path }) => {
    let buf: Buffer;
    try {
      buf = readFileSync(path);
    } catch (err) {
      return fail((err as Error).message);
    }
    if (buf.subarray(0, 4096).includes(0)) return fail("the file is binary");
    return reply({ ok: true, summary: `${path}: ${buf.length} bytes${buf.length > CAP ? " (cut)" : ""}`, text: buf.subarray(0, CAP).toString("utf8"), data: { truncated: buf.length > CAP } });
  },
);

server.registerTool(
  "write_adapter_file",
  {
    description: "Write a file inside the draft adapter folder. Paths outside the folder are refused. When adapter.yaml exists, the reply has the adapter checklist errors (lint), so that you can fix them at once.",
    inputSchema: {
      rel_path: z.string().describe("Path inside the draft folder, such as adapter.yaml or skills/analysis.md"),
      content: z.string().describe("The full text of the file."),
      name: z.string().optional().describe("Adapter name. Needed only if no draft folder is set."),
    },
  },
  async ({ rel_path, content, name }) => {
    const base = draftBase(name);
    if (!base) return fail("no draft folder is set. Give the adapter name");
    const target = safeTarget(base, rel_path);
    if (!target) return fail(`"${rel_path}" is outside the draft folder ${base}`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    if (!existsSync(join(base, "adapter.yaml"))) return reply({ ok: true, summary: `wrote ${rel_path} (${content.length} characters)`, data: { path: target } });
    const report = await checkAdapter(base);
    const lint = { errors: report.errors, warnings: report.warnings.length };
    const note = report.errors.length ? `. The draft has ${report.errors.length} checklist error(s). Fix each one before you finish:\n${report.errors.join("\n")}` : ". The draft has no checklist errors";
    return reply({ ok: true, summary: `wrote ${rel_path} (${content.length} characters)${note}`, data: { path: target, lint } });
  },
);

server.registerTool(
  "check_adapter",
  {
    description: "Run the adapter checker: the checklist rules (lint) and the headless known-answer tests. Without a name, it checks the draft folder.",
    inputSchema: { name: z.string().optional().describe("Adapter name or folder. Leave it out to check the draft folder.") },
  },
  async ({ name }) => {
    const draft = process.env.CUVETTE_DRAFT_DIR;
    const useDraft = draft && existsSync(join(draft, "adapter.yaml")) && (!name || name === basename(draft));
    const target = useDraft ? draft : name;
    if (!target) return fail("give an adapter name, or write adapter.yaml in the draft folder first");
    const report = await checkAdapter(target, { runTests: true });
    const passed = report.tests?.filter((t) => t.ok).length ?? 0;
    return reply({
      ok: report.ok,
      error: report.ok ? undefined : `Fix each error, then call check_adapter again:\n${report.errors.join("\n")}`,
      summary: `${report.errors.length} errors, ${report.warnings.length} warnings, ${passed} of ${report.tests?.length ?? 0} tests passed`,
      data: report,
    });
  },
);

server.registerTool(
  "record_demonstration",
  {
    description: "Save the scientist's macro recorder output or description of the steps as evidence in the draft folder.",
    inputSchema: { text: z.string().min(1).describe("The macro recorder output, or the steps that the scientist did, in order"), name: z.string().optional().describe("Adapter name. Needed only if no draft folder is set.") },
  },
  async ({ text, name }) => {
    const base = draftBase(name);
    if (!base) return fail("no draft folder is set. Give the adapter name");
    const dir = join(base, "evidence");
    mkdirSync(dir, { recursive: true });
    const n = readdirSync(dir).filter((f) => /^demonstration-\d+\.txt$/.test(f)).length + 1;
    const file = join(dir, `demonstration-${n}.txt`);
    writeFileSync(file, text);
    return reply({ ok: true, summary: `saved evidence/demonstration-${n}.txt`, data: { path: file } });
  },
);

await server.connect(new StdioServerTransport());
