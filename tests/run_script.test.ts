import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, truncateSync, writeFileSync } from "node:fs";
import { genericTools } from "../src/tools/generic.ts";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import type { Args, ToolContext, ToolOutput } from "../src/core/types.ts";
import { describeLimits, fingerprint, guardCommand, linuxWrap, recordFolders, runScriptTool, scriptPython, withoutBootFrames, writeSteps } from "../src/tools/run_script.ts";
import { setBlindPolicy } from "../src/adapters/blind.ts";
import { blindPolicyFor } from "../src/bench/papers-blind.ts";
import { loadPaper, paperIds } from "../src/bench/papers-spec.ts";

const root = mkdtempSync(join(tmpdir(), "cuvette-script-"));
let n = 0;

function setup(callTool: (name: string, args: Args) => Promise<ToolOutput> = async () => ({ ok: true }), network = false, heldBack?: () => string[]) {
  const dirs = { workDir: join(root, `work${++n}`), sessionDir: join(root, `session${n}`), heldBack };
  mkdirSync(dirs.workDir, { recursive: true });
  const tool = runScriptTool(dirs, { network });
  const run = (code: string, extra: Args = {}, signal: AbortSignal = new AbortController().signal) => {
    const ctx: ToolContext = { session: "s", callId: "c", workDir: dirs.workDir, sessionDir: dirs.sessionDir, signal, log: () => { throw new Error("no log"); }, callTool };
    return tool.execute({ purpose: "Test", does: "Runs a test.", code, ...extra }, ctx);
  };
  return { tool, run, dirs };
}

test("tool shape and plain limits text", () => {
  const { tool } = setup();
  expect(tool).toMatchObject({ name: "run_script", permission: "ask" });
  expect(tool.description).toContain("ga_api");
  expect(describeLimits(false)).toMatch(/network/);
  expect(describeLimits(true)).toMatch(/can use the network/);
});

test("Linux and Windows limits: the notice names the key file and bubblewrap", () => {
  expect(describeLimits(false, "off", "linux")).toMatch(/Install bubblewrap \(bwrap\).*also the saved key file.*network is not blocked/);
  expect(describeLimits(false, "bwrap", "linux")).toMatch(/bubblewrap sandbox.*not the saved key file.*cannot use the network/);
  expect(describeLimits(true, "unshare", "linux")).toMatch(/read of the saved key file fails.*can remove this limit.*can use the network/);
  expect(describeLimits(false, "off", "win32")).toMatch(/Windows.*also the saved key file/);
  expect(describeLimits(false, "on", "darwin")).toMatch(/not the saved key file/);
});

test("Linux wrap: bubblewrap covers the key file and blocks the network; unshare covers it with a bind mount", () => {
  const cred = join(root, "credentials.json");
  writeFileSync(cred, "{}");
  const work = join(root, "linux-work");
  mkdirSync(work, { recursive: true });
  const argv = ["python3", "-c", "pass"];
  const b = linuxWrap("bwrap", argv, { network: false, writable: [work, join(root, "missing")], cred });
  expect(b.slice(0, 3)).toEqual(["bwrap", "--ro-bind", "/"]);
  expect(b.join(" ")).toContain(`--ro-bind /dev/null ${cred}`);
  expect(b.join(" ")).toContain(`--bind ${work} ${work}`);
  expect(b.join(" ")).not.toContain("missing");
  expect(b).toContain("--unshare-net");
  expect(b.slice(-3)).toEqual(argv);
  expect(linuxWrap("bwrap", argv, { network: true, writable: [], cred })).not.toContain("--unshare-net");
  const u = linuxWrap("unshare", argv, { network: false, writable: [], cred });
  expect(u.slice(0, 4)).toEqual(["unshare", "-rmn", "sh", "-c"]);
  expect(u[4]).toContain('mount --bind /dev/null "$1"');
  expect(u.slice(5)).toEqual(["sh", realpathSync(cred), ...argv]);
  expect(linuxWrap("unshare", argv, { network: true, writable: [], cred: join(root, "none.json") })).toEqual(["unshare", "-rm", ...argv]);
  expect(linuxWrap("off", argv, { network: false, writable: [], cred })).toEqual(argv);
});

test("stdout, stderr, exit code and a traceback", async () => {
  const { run } = setup();
  const ok = await run("print(2+2)\nimport sys\nprint('warn', file=sys.stderr)");
  expect(ok.ok).toBe(true);
  expect(ok.text).toContain("4");
  expect(ok.text).toContain("[stderr]");
  const bad = await run("x = 1\nraise ValueError('nope')");
  expect(bad.ok).toBe(false);
  expect(bad.error).toMatch(/exited with code 1/);
  expect(bad.error).toContain("ValueError: nope");
  expect(bad.error).toContain("script.py");
});

test("new files in the work folder are outputs; save_table writes a CSV", async () => {
  const { run, dirs } = setup();
  const r = await run("from ga_api import save_table\nopen('note.txt','w').write('x')\nsave_table('t', [{'a': 1, 'b': 2}, {'a': 3, 'b': 4}])\nsave_table('t', {'a': [1], 'b': [2]})");
  expect(r.ok).toBe(true);
  expect(r.outputs!.map((o) => `${o.kind}:${o.name}`).sort()).toEqual(["file:note.txt", "table:t-2.csv", "table:t.csv"]);
  expect(readFileSync(join(dirs.workDir, "t.csv"), "utf8").replace(/\r/g, "")).toBe("a,b\n1,2\n3,4\n");
  expect(r.outputs!.some((o) => o.name === "ga_api.py" || o.name === "script.py")).toBe(false);
});

test("call sends a tool call to the parent and returns the result", async () => {
  const seen: [string, Args][] = [];
  const { run } = setup(async (name, args) => {
    seen.push([name, args]);
    if (name === "bad") return { ok: false, error: "blocked by a decision" };
    return { ok: true, metrics: { total: (args.a as number) + 1 }, data: { echo: args } };
  });
  const r = await run([
    "from ga_api import call, ToolError",
    "r = call('add_one', a=41, label='x')",
    "print(r['metrics']['total'], r['data']['echo']['label'])",
    "try:",
    "    call('bad')",
    "except ToolError as e:",
    "    print('caught', e)",
    "try:",
    "    call('run_script', code='1')",
    "except ToolError as e:",
    "    print('caught', e)",
  ].join("\n"));
  expect(r.ok).toBe(true);
  expect(r.text).toContain("42 x");
  expect(r.text).toContain("caught blocked by a decision");
  expect(r.text).toContain("caught run_script cannot call itself");
  expect(seen).toEqual([["add_one", { a: 41, label: "x" }], ["bad", {}]]);
});

test("timeout kills the script", async () => {
  const { run } = setup();
  const t0 = Date.now();
  const r = await run("import time\ntime.sleep(60)", { timeout_s: 1 });
  expect(r).toMatchObject({ ok: false, error: "the script timed out after 1 s" });
  expect(Date.now() - t0).toBeLessThan(8000);
});

test("abort signal stops the script", async () => {
  const { run } = setup();
  const ac = new AbortController();
  setTimeout(() => ac.abort(), 500);
  expect(await run("import time\ntime.sleep(60)", {}, ac.signal)).toMatchObject({ ok: false, error: "the script was cancelled" });
});

test("output is capped at 50 kB", async () => {
  const { run } = setup();
  const r = await run("print('x' * 200000)");
  expect(r.text!.length).toBeLessThan(51_000 + 2_000);
});

test("rejects an empty code argument", async () => {
  const { run } = setup();
  expect((await run("")).ok).toBe(false);
});

test("Linux wrap: bubblewrap covers a reference that is held back for a blind test", () => {
  const ref = join(root, "hand-counts.csv");
  writeFileSync(ref, "sample,count\nA,41\n");
  const b = linuxWrap("bwrap", ["python3"], { network: false, writable: [], cred: join(root, "none.json"), held: [ref, join(root, "gone.csv")] });
  expect(b.join(" ")).toContain(`--ro-bind /dev/null ${ref}`);
  expect(b.join(" ")).not.toContain("gone.csv");
});

const sandboxed = process.platform === "darwin";

test.skipIf(!sandboxed)("macOS sandbox: a reference that is held back for a blind test is not readable, also with no blind policy", async () => {
  setBlindPolicy(undefined);
  const ref = join(root, "held-counts.csv");
  writeFileSync(ref, "sample,count\nA,41\n");
  let held = [ref];
  const { run } = setup(undefined, false, () => held);
  const r = await run(`import glob\nfor p in glob.glob(${JSON.stringify(join(root, "held-*.csv"))}):\n    print(open(p).read())`);
  expect(r.ok).toBe(false);
  expect(r.text).not.toContain("A,41");
  expect(r.error).toMatch(/PermissionError|Operation not permitted/);
  held = [];
  const after = await run(`print(open(${JSON.stringify(ref)}).read())`);
  expect(after.ok).toBe(true);
  expect(after.text).toContain("A,41");
});

test.skipIf(!sandboxed)("macOS sandbox: blocks a write outside the work folder", async () => {
  const { run } = setup();
  const outside = join(homedir(), `.ga-sandbox-test-${process.pid}.txt`);
  const r = await run(`open(${JSON.stringify(outside)}, 'w').write('x')`);
  expect(existsSync(outside)).toBe(false);
  expect(r.ok).toBe(false);
  expect(r.error).toMatch(/PermissionError|Operation not permitted/);
  const inside = await run("open('inside.txt', 'w').write('x')\nimport tempfile\nopen(tempfile.gettempdir() + '/cuvette-ok.txt', 'w').write('x')");
  expect(inside.ok).toBe(true);
});

test.skipIf(!sandboxed)("macOS sandbox: blocks a read of the saved API keys and gives the script no key variables", async () => {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "cuvette-script-home-")));
  const old = process.env.CUVETTE_HOME;
  process.env.CUVETTE_HOME = home;
  process.env.ANTHROPIC_API_KEY_TEST_ONLY = "sk-ant-secret";
  try {
    writeFileSync(join(home, "credentials.json"), '{"anthropic_api_key":"sk-ant-secret"}');
    const { run } = setup();
    const r = await run(`import os\nprint(os.environ.get('ANTHROPIC_API_KEY_TEST_ONLY'))\nprint(open(${JSON.stringify(join(home, "credentials.json"))}).read())`);
    expect(r.ok).toBe(false);
    expect(r.text).toContain("None");
    expect(r.text).not.toContain("sk-ant-secret");
    expect(r.error).toMatch(/PermissionError|Operation not permitted/);
  } finally {
    delete process.env.ANTHROPIC_API_KEY_TEST_ONLY;
    if (old === undefined) delete process.env.CUVETTE_HOME;
    else process.env.CUVETTE_HOME = old;
  }
});

test.skipIf(!sandboxed)("macOS sandbox: blocks a socket connect unless network is on", async () => {
  const server = createServer((s) => s.end("hi"));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  const code = `import socket\ns = socket.create_connection(('127.0.0.1', ${port}), timeout=3)\nprint('connected', s.recv(2))`;
  try {
    const blocked = await setup().run(code);
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toMatch(/PermissionError|Operation not permitted/);
    const open = await setup(undefined, true).run(code);
    expect(open.ok).toBe(true);
    expect(open.text).toContain("connected");
  } finally {
    server.close();
  }
});

const science = scriptPython();
const hasScience = science.includes(join("envs", "science"));

test.skipIf(!hasScience || !sandboxed)("the script environment has the statistics packages and works in blind mode", async () => {
  const { run, dirs } = setup();
  const paper = loadPaper(paperIds().find((id) => id.startsWith("kasurinen"))!);
  setBlindPolicy(blindPolicyFor({ paper, runDir: join(dirs.workDir, ".."), scratch: join(root, "scratch"), home: join(homedir(), ".cuvette"), adapterRoots: [], programs: [] }));
  try {
    const r = await run([
      "import numpy, pandas, scipy, statsmodels, lifelines",
      "from lifelines import CoxPHFitter",
      "df = pandas.DataFrame({'t': [5, 6, 6, 2, 4, 4, 8, 9], 'e': [1, 0, 1, 1, 1, 0, 0, 1], 'x': [0, 0, 1, 1, 0, 1, 0, 1]})",
      "c = CoxPHFitter().fit(df, 't', 'e')",
      "print('ok', lifelines.__version__, statsmodels.__version__, round(float(c.params_['x']), 3))",
    ].join("\n"));
    expect(r.ok, r.error).toBe(true);
    expect(r.text).toMatch(/ok 0\.30\.3 0\.15\.0 /);
  } finally {
    setBlindPolicy(undefined);
  }
}, 120000);

test("a relative path means the same file in list_dir, read_file, run_script and run_command", async () => {
  const project = mkdtempSync(join(tmpdir(), "cuvette-project-"));
  mkdirSync(join(project, "LDL", "Set 1"), { recursive: true });
  writeFileSync(join(project, "LDL", "Set 1", "20X_CH1.txt"), "red cells");
  const workDir = join(root, `work${++n}`);
  mkdirSync(workDir, { recursive: true });
  const dirs = { workDir, sessionDir: join(root, `session${n}`), projectDir: project };
  const generic = Object.fromEntries(genericTools(dirs).map((t) => [t.name, t]));
  const ctx: ToolContext = { session: "s", callId: "c", workDir, sessionDir: dirs.sessionDir, signal: new AbortController().signal, log: () => ({}) as never, callTool: async () => ({ ok: true }) };
  const rel = "LDL/Set 1";
  const listed = await generic.list_dir!.execute({ path: rel }, ctx);
  expect(listed.summary).toBe(`1 entries in ${join(project, rel)}.`);
  expect((await generic.read_file!.execute({ path: `${rel}/20X_CH1.txt` }, ctx)).text).toBe("red cells");
  const r = await runScriptTool(dirs, { network: false }).execute({
    purpose: "Read one image file",
    does: "Lists the Set 1 folder, reads one file and saves a note.",
    code: "import os\nprint(os.path.abspath('LDL/Set 1'))\nprint(os.listdir('LDL/Set 1'))\nprint(open('LDL/Set 1/20X_CH1.txt').read())\nopen('note.txt', 'w').write('x')\nprint(open('note.txt').read())\nprint(os.environ['PROJECT_DIR'], os.environ['WORK_DIR'], os.environ['CUVETTE_PROJECT_DIR'])",
  }, ctx);
  expect(r.ok).toBe(true);
  const [abs, names, text, note, env] = r.text!.trim().split("\n");
  expect(realpathSync(abs!)).toBe(realpathSync(join(project, rel)));
  expect(names).toBe("['20X_CH1.txt']");
  expect(text).toBe("red cells");
  expect(note).toBe("x");
  expect(env).toBe(`${project} ${workDir} ${project}`);
  expect(existsSync(join(workDir, "note.txt"))).toBe(true);
  expect(existsSync(join(project, "note.txt"))).toBe(false);
  expect(r.summary).toBe(`The script ran in ${project} and wrote 1 new file(s) to ${workDir}.`);
  const cmd = await generic.run_command!.execute({ purpose: "List Set 1", does: "Lists the Set 1 folder.", argv: [process.execPath, "-e", "console.log(require('fs').readdirSync('LDL/Set 1').join())"] }, ctx);
  expect(cmd.text!.trim()).toBe("20X_CH1.txt");
  expect(cmd.summary).toBe(`Ran ${process.execPath} in ${project}; exit code 0.`);
});

test("purpose and does are required", async () => {
  const { tool, dirs } = setup();
  const ctx: ToolContext = { session: "s", callId: "c", workDir: dirs.workDir, sessionDir: dirs.sessionDir, signal: new AbortController().signal, log: () => ({}) as never, callTool: async () => ({ ok: true }) };
  expect(tool.inputSchema.required).toEqual(["purpose", "does", "code"]);
  expect((await tool.execute({ code: "print(1)" }, ctx)).ok).toBe(false);
  expect(tool.description).toContain("not the code");
});

test("save_table and save_figure work without an import", async () => {
  const { run, dirs } = setup();
  const r = await run("save_table('counts', [{'condition': 'LDL', 'n': 2}])");
  expect(r.ok).toBe(true);
  expect(readFileSync(join(dirs.workDir, "counts.csv"), "utf8")).toContain("condition,n");
});

test("a script error shows the frames of the script, not the frames of the harness start code", async () => {
  const { run } = setup();
  const r = await run("def f():\n    raise ValueError('bad column name')\nf()\n");
  expect(r.ok).toBe(false);
  expect(r.error).toMatch(/^the script exited with code 1: Traceback \(most recent call last\):\n  File ".*script\.py", line 3, in <module>/);
  expect(r.error).toContain("ValueError: bad column name");
  expect(r.error).not.toContain("<frozen runpy>");
  expect(r.error).not.toContain("import sys,runpy");
  const trace = 'Traceback (most recent call last):\n  File "<string>", line 1, in <module>\n    import sys,runpy\n    ~~~^^^\n  File "<frozen runpy>", line 88, in _run_code\n  File "/w/script.py", line 1, in <module>\n    1/0\nZeroDivisionError: division by zero';
  expect(withoutBootFrames(trace)).toBe('Traceback (most recent call last):\n  File "/w/script.py", line 1, in <module>\n    1/0\nZeroDivisionError: division by zero');
});


function layout() {
  const project = realpathSync(mkdtempSync(join(tmpdir(), "cuvette-guard-")));
  const out = join(project, "cuvette", "2026-10-14-mine");
  const other = join(project, "cuvette", "2026-10-13-other");
  const dirs = { workDir: out, sessionDir: join(out, ".record"), projectDir: project };
  for (const d of [out, other]) {
    mkdirSync(join(d, ".record"), { recursive: true });
    writeFileSync(join(d, ".record", "log.jsonl"), '{"id":1}\n');
    writeFileSync(join(d, ".record", "meta.json"), "{}");
  }
  mkdirSync(join(project, ".cuvette"));
  writeFileSync(join(project, ".cuvette", "settings.json"), '{"permissions":"ask"}');
  mkdirSync(join(project, "data", ".record"), { recursive: true });
  return { project, out, other, dirs, ownLog: join(out, ".record", "log.jsonl"), otherLog: join(other, ".record", "log.jsonl"), settings: join(project, ".cuvette", "settings.json") };
}

test("write steps lock the records and the settings folders, and keep the work folder open", () => {
  const l = layout();
  const steps = writeSteps(l.dirs);
  const locked = steps.filter((x) => !x.allow && !x.fixed).map((x) => x.path);
  expect(locked).toEqual(expect.arrayContaining([join(l.out, ".record"), join(l.other, ".record"), join(l.project, ".cuvette")]));
  expect(locked).not.toContain(l.out);
  expect(locked).not.toContain(join(l.project, "data", ".record"));
  expect(steps.some((x) => x.allow)).toBe(false);
  expect(steps.filter((x) => x.fixed).map((x) => x.path)).toEqual(expect.arrayContaining([l.out, join(l.project, "cuvette"), l.project]));
  expect(recordFolders(l.dirs)).toContain(join(l.other, ".record"));
});

test("write steps open a work folder that is inside the record folder, and lock the record folders inside it again", () => {
  const record = realpathSync(mkdtempSync(join(tmpdir(), "cuvette-legacy-")));
  const work = join(record, "work");
  mkdirSync(join(work, ".record"), { recursive: true });
  writeFileSync(join(work, ".record", "meta.json"), "{}");
  const steps = writeSteps({ workDir: work, sessionDir: record });
  expect(steps.filter((x) => !x.fixed).map((x) => [x.allow, x.path])).toEqual([[false, record], [false, join(work, ".record")], [true, work], [false, join(work, ".record")]]);
});

test("Linux wrap: bubblewrap mounts a locked folder read-only after the writable folders", () => {
  const l = layout();
  const b = linuxWrap("bwrap", ["true"], { network: false, writable: [l.out, l.project], cred: join(l.project, "none.json"), steps: writeSteps(l.dirs) }).join(" ");
  expect(b.indexOf(`--bind ${l.project} ${l.project}`)).toBeGreaterThan(-1);
  expect(b.indexOf(`--ro-bind ${join(l.project, ".cuvette")} ${join(l.project, ".cuvette")}`)).toBeGreaterThan(b.indexOf(`--bind ${l.project} ${l.project}`));
  expect(b).toContain(`--ro-bind ${join(l.other, ".record")} ${join(l.other, ".record")}`);
});

test("the check after the script finds a change of the settings or of the old part of the log", () => {
  const l = layout();
  const quiet = fingerprint(l.dirs, true);
  appendFileSync(l.ownLog, '{"id":2}\n');
  expect(quiet.changed()).toEqual([]);
  writeFileSync(join(l.project, "data", "results.csv"), "a\n1\n");
  expect(quiet.changed()).toEqual([]);

  const settings = fingerprint(l.dirs, true);
  writeFileSync(l.settings, '{"permissions":"bypass"}');
  writeFileSync(join(l.project, ".cuvette", "hooks.json"), "{}");
  expect(settings.changed().sort()).toEqual([join(l.project, ".cuvette", "hooks.json"), l.settings].sort());
  writeFileSync(l.settings, '{"permissions":"ask"}');
  rmSync(join(l.project, ".cuvette", "hooks.json"));
  expect(settings.changed()).toEqual([]);

  const log = fingerprint(l.dirs, true);
  writeFileSync(l.ownLog, '{"id":9}\n{"id":2}\n');
  expect(log.changed()).toEqual([l.ownLog]);
  const short = fingerprint(l.dirs, true);
  truncateSync(l.ownLog, 3);
  expect(short.changed()).toEqual([l.ownLog]);
  expect(fingerprint(l.dirs, false).changed()).toEqual([]);
});

const sandboxWorks = process.platform === "darwin" && spawnSync("/usr/bin/sandbox-exec", ["-p", "(version 1)(allow default)", "/usr/bin/true"]).status === 0;

test.skipIf(!sandboxWorks)("a script cannot write the record or the settings, and the record stays the same", async () => {
  const l = layout();
  const logged: string[] = [];
  const tool = runScriptTool(l.dirs, { network: false });
  const run = (code: string) =>
    tool.execute({ purpose: "Test", does: "Runs a test.", code }, { session: "s", callId: "c", workDir: l.out, sessionDir: l.dirs.sessionDir, signal: new AbortController().signal, log: (k) => (logged.push(k), {} as never), callTool: async () => ({ ok: true }) });
  const before = [l.ownLog, l.otherLog, l.settings, join(l.out, ".record", "meta.json")].map((p) => readFileSync(p, "utf8"));
  const attempts: [string, string][] = [
    ["own log", `open(${JSON.stringify(l.ownLog)}, 'a').write('{"id":99}\\n')`],
    ["own log rewrite", `open(${JSON.stringify(l.ownLog)}, 'w').write('')`],
    ["other log", `open(${JSON.stringify(l.otherLog)}, 'a').write('x')`],
    ["settings", `open(${JSON.stringify(l.settings)}, 'w').write('{"permissions":"bypass"}')`],
    ["new hook", `open(${JSON.stringify(join(l.project, ".ga", "hooks.json"))}, 'w').write('{}')`],
    ["new settings folder", `import os\nos.makedirs(${JSON.stringify(join(l.project, ".ga", "adapters"))})`],
  ];
  for (const [name, code] of attempts) {
    const r = await run(code);
    expect(r.ok, name).toBe(false);
    expect(r.error, name).toMatch(/Operation not permitted|PermissionError|exited with code 1/);
  }
  expect([l.ownLog, l.otherLog, l.settings, join(l.out, ".record", "meta.json")].map((p) => readFileSync(p, "utf8"))).toEqual(before);
  expect(existsSync(join(l.project, ".ga"))).toBe(false);
  expect(logged).toEqual([]);
});

test.skipIf(!sandboxWorks)("a script still writes its results in the work folder, the project folder and folders named .record or .ga deeper in the tree", async () => {
  const l = layout();
  const tool = runScriptTool(l.dirs, { network: false });
  const code = [
    "import os",
    `p = ${JSON.stringify(l.project)}`,
    "for rel in ['results.csv', 'data/table.csv', 'output/fit.txt', 'data/.record/note.txt', 'data/.ga/note.txt', 'cuvette/2026-10-14-mine/extra.txt', 'cuvette/2026-10-14-mine/sub/a.txt']:",
    "    os.makedirs(os.path.dirname(os.path.join(p, rel)), exist_ok=True)",
    "    open(os.path.join(p, rel), 'w').write('ok')",
    "open('relative.txt', 'w').write('ok')",
    "print('done')",
  ].join("\n");
  const r = await tool.execute({ purpose: "Test", does: "Runs a test.", code }, { session: "s", callId: "c", workDir: l.out, sessionDir: l.dirs.sessionDir, signal: new AbortController().signal, log: () => { throw new Error("no log"); }, callTool: async () => ({ ok: true }) });
  expect(r.error).toBeUndefined();
  expect(r.ok).toBe(true);
  for (const rel of ["results.csv", "data/table.csv", "output/fit.txt", "data/.record/note.txt", "data/.ga/note.txt", "cuvette/2026-10-14-mine/extra.txt", "cuvette/2026-10-14-mine/sub/a.txt"]) expect(existsSync(join(l.project, rel)), rel).toBe(true);
  expect(readFileSync(l.ownLog, "utf8")).toBe('{"id":1}\n');
});


test.skipIf(!sandboxWorks)("a script cannot rename the work folder or a parent folder, and the record stays the same", async () => {
  const l = layout();
  const tool = runScriptTool(l.dirs, { network: false });
  const run = (code: string) => tool.execute({ purpose: "Test", does: "Runs a test.", code }, { session: "s", callId: "c", workDir: l.out, sessionDir: l.dirs.sessionDir, signal: new AbortController().signal, log: () => ({}) as never, callTool: async () => ({ ok: true }) });
  const before = readFileSync(l.ownLog, "utf8");
  for (const [name, from] of [["work folder", l.out], ["output root", join(l.project, "cuvette")], ["project folder", l.project]] as const) {
    const r = await run(`import os\nos.rename(${JSON.stringify(from)}, ${JSON.stringify(from + "-moved")})`);
    expect(r.ok, name).toBe(false);
    expect(existsSync(from), name).toBe(true);
    expect(existsSync(from + "-moved"), name).toBe(false);
  }
  expect(readFileSync(l.ownLog, "utf8")).toBe(before);
  const fine = await run("import os\nw = os.environ['WORK_DIR']\nopen(w + '/kept.txt', 'w').write('x')\nos.makedirs(w + '/sub', exist_ok=True)\nos.rename(w + '/kept.txt', w + '/sub/kept.txt')");
  expect(fine.error).toBeUndefined();
  expect(existsSync(join(l.out, "sub", "kept.txt"))).toBe(true);
});

test.skipIf(!sandboxWorks)("a script reports a change of the log even if the sandbox is on", async () => {
  const l = layout();
  const guard = fingerprint(l.dirs, true);
  writeFileSync(l.ownLog, "x");
  expect(guard.changed()).toEqual([l.ownLog]);
});

test.skipIf(!sandboxWorks)("write steps lock a settings folder that does not exist yet under a linked project path", () => {
  const l = layout();
  const link = join(realpathSync(mkdtempSync(join(tmpdir(), "cuvette-link-"))), "proj");
  symlinkSync(l.project, link);
  const steps = writeSteps({ ...l.dirs, projectDir: link });
  const locked = steps.filter((x) => !x.allow && !x.fixed).map((x) => x.path);
  expect(locked).toContain(join(l.project, ".ga"));
  expect(locked).toContain(join(link, ".ga"));
});

test.skipIf(!sandboxWorks)("run_command writes results in the project folder, and cannot write the record or the settings", async () => {
  const l = layout();
  const tool = genericTools(l.dirs).find((t) => t.name === "run_command")!;
  const logged: string[] = [];
  const run = (argv: string[]) => tool.execute({ purpose: "Test", does: "Runs a test.", argv }, { session: "s", callId: "c", workDir: l.out, sessionDir: l.dirs.sessionDir, signal: new AbortController().signal, log: (k) => (logged.push(k), {} as never), callTool: async () => ({ ok: true }) });
  const good = await run(["/bin/sh", "-c", `echo ok > ${JSON.stringify(join(l.project, "data", "result.txt"))} && echo ok > ${JSON.stringify(join(l.project, "data", ".record", "n.txt"))}`]);
  expect(good.error).toBeUndefined();
  expect(readFileSync(join(l.project, "data", "result.txt"), "utf8")).toBe("ok\n");
  const before = [l.ownLog, l.otherLog, l.settings].map((p) => readFileSync(p, "utf8"));
  for (const target of [l.ownLog, l.otherLog, l.settings, join(l.project, ".ga", "hooks.json")]) {
    const bad = await run(["/bin/sh", "-c", `echo x >> ${JSON.stringify(target)}`]);
    expect(bad.ok, target).toBe(false);
  }
  expect([l.ownLog, l.otherLog, l.settings].map((p) => readFileSync(p, "utf8"))).toEqual(before);
  expect(existsSync(join(l.project, ".ga"))).toBe(false);
  expect(logged).toEqual([]);
});

test("the command guard reports a change of the settings when no sandbox protects them", async () => {
  const l = layout();
  const g = await guardCommand(["true"], l.dirs);
  writeFileSync(l.settings, '{"permissions":"bypass"}');
  expect(g.changed()).toEqual([l.settings]);
});
