import { createServer } from "node:net";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import type { Args, ToolContext, ToolOutput } from "../src/core/types.ts";
import { describeLimits, runScriptTool, scriptPython } from "../src/tools/run_script.ts";
import { setBlindPolicy } from "../src/adapters/blind.ts";
import { blindPolicyFor } from "../src/bench/papers-blind.ts";
import { loadPaper, paperIds } from "../src/bench/papers-spec.ts";

const root = mkdtempSync(join(tmpdir(), "ga-script-"));
let n = 0;

function setup(callTool: (name: string, args: Args) => Promise<ToolOutput> = async () => ({ ok: true }), network = false) {
  const dirs = { workDir: join(root, `work${++n}`), sessionDir: join(root, `session${n}`) };
  mkdirSync(dirs.workDir, { recursive: true });
  const tool = runScriptTool(dirs, { network });
  const run = (code: string, extra: Args = {}, signal: AbortSignal = new AbortController().signal) => {
    const ctx: ToolContext = { session: "s", callId: "c", workDir: dirs.workDir, sessionDir: dirs.sessionDir, signal, log: () => { throw new Error("no log"); }, callTool };
    return tool.execute({ code, ...extra }, ctx);
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

const sandboxed = process.platform === "darwin";

test.skipIf(!sandboxed)("macOS sandbox: blocks a write outside the work folder", async () => {
  const { run } = setup();
  const outside = join(homedir(), `.ga-sandbox-test-${process.pid}.txt`);
  const r = await run(`open(${JSON.stringify(outside)}, 'w').write('x')`);
  expect(existsSync(outside)).toBe(false);
  expect(r.ok).toBe(false);
  expect(r.error).toMatch(/PermissionError|Operation not permitted/);
  const inside = await run("open('inside.txt', 'w').write('x')\nimport tempfile\nopen(tempfile.gettempdir() + '/ga-ok.txt', 'w').write('x')");
  expect(inside.ok).toBe(true);
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
  setBlindPolicy(blindPolicyFor({ paper, runDir: join(dirs.workDir, ".."), scratch: join(root, "scratch"), home: join(homedir(), ".guided-analysis"), adapterRoots: [], programs: [] }));
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
