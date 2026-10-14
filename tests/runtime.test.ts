import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import type { Tool, ToolContext } from "../src/core/types.ts";
import { loadAdapter, Manifest } from "../src/adapters/manifest.ts";
import { locate } from "../src/adapters/locate.ts";
import { startAdapter, type AdapterRuntime } from "../src/adapters/runtime.ts";

const root = mkdtempSync(join(tmpdir(), "cuvette-runtime-"));
const dirs = { workDir: join(root, "work"), sessionDir: join(root, "session") };

export function ctx(signal: AbortSignal = new AbortController().signal): ToolContext {
  return { session: "s", callId: "c", workDir: dirs.workDir, sessionDir: dirs.sessionDir, signal, log: () => { throw new Error("no log"); }, callTool: async () => ({ ok: true }) };
}

let rt: AdapterRuntime;
let tools: Record<string, Tool>;
const run = (name: string, args: Record<string, unknown> = {}, signal?: AbortSignal) => tools[name].execute(args, ctx(signal));

beforeAll(async () => {
  rt = await startAdapter(loadAdapter("tests/fixtures/fake-mcp"), dirs);
  tools = Object.fromEntries((await rt.tools()).map((t) => [t.name, t]));
}, 60000);

afterAll(async () => {
  await rt?.close();
});

test("tools carry the adapter fields", () => {
  expect(Object.keys(tools).sort()).toEqual(["add", "crash", "echo", "fail", "image_content", "make_image", "reject", "slow", "spin", "structured", "table"]);
  expect(tools.echo).toMatchObject({ source: "adapter", adapter: "fake-mcp", remoteName: "echo", readOnly: true, title: "Echo" });
  expect(tools.echo.permission).toBeUndefined();
  expect(tools.add.permission).toBe("ask");
  expect(tools.add.readOnly).toBeUndefined();
  expect((tools.add.inputSchema as { properties: object }).properties).toHaveProperty("a");
  expect(rt.running).toBe(true);
  expect(rt.instructions).toBe("Use echo to repeat text.");
  expect(existsSync(join(dirs.sessionDir, "adapter-fake-mcp.log"))).toBe(true);
});

test("plain text result uses the map summary", async () => {
  const r = await run("echo", { text: "hi" });
  expect(r).toMatchObject({ ok: true, text: "echo: hi", summary: "Echoed text." });
});

test("JSON text result fills ok, summary, metrics, route and fidelity", async () => {
  const r = await run("add", { a: 3, b: 4 });
  expect(r).toMatchObject({ ok: true, summary: "3 + 4 = 7", metrics: { sum: 7 }, manualRoute: "Calculator: 3 + 4", fidelity: "exact" });
});

test("structured content wins and keeps only numeric metrics", async () => {
  const r = await run("structured", { n: 4 });
  expect(r.data).toMatchObject({ value: 8 });
  expect(r.metrics).toEqual({ doubled: 8 });
});

test("table and manualRoute are read", async () => {
  const r = await run("table");
  expect(r.table).toEqual({ columns: ["x", "y"], rows: [[1, 2], [3, 4]], n_rows: 2, path: undefined });
  expect(r).toMatchObject({ manualRoute: "Open the table", fidelity: "close" });
});

test("ok false in the JSON and isError both fail", async () => {
  expect(await run("reject")).toMatchObject({ ok: false, error: "the data is empty" });
  expect(await run("fail")).toMatchObject({ ok: false, error: "it failed on purpose" });
});

test("a path in the JSON becomes an image output", async () => {
  const r = await run("make_image", { width: 5, height: 3 });
  const path = join(dirs.workDir, "fake-5x3.png");
  expect(r.outputs).toEqual([{ path, kind: "image", name: "fake-5x3.png" }]);
});

test("image content is saved as a PNG file", async () => {
  const r = await run("image_content");
  expect(r.images).toHaveLength(1);
  expect(readFileSync(r.images![0]).subarray(1, 4).toString()).toBe("PNG");
  expect(r.outputs?.[0].kind).toBe("image");
  expect(r.text).toBe("an image");
});

test("cancel stops a call that obeys cancel and keeps the process", async () => {
  const p = run("slow", { seconds: 30 });
  await new Promise((r) => setTimeout(r, 500));
  const t0 = Date.now();
  await rt.cancel();
  const r = await p;
  expect(r.ok).toBe(false);
  expect(r.error).toMatch(/cancelled/);
  expect(Date.now() - t0).toBeLessThan(4000);
  expect(rt.running).toBe(true);
  expect((await run("echo", { text: "again" })).ok).toBe(true);
});

test("an abort signal cancels the call", async () => {
  const ac = new AbortController();
  const p = run("slow", { seconds: 30 }, ac.signal);
  await new Promise((r) => setTimeout(r, 300));
  ac.abort();
  expect(await p).toMatchObject({ ok: false, error: "the call was cancelled" });
});

test("cancel kills a process that does not answer, and the next call restarts it", async () => {
  const p = run("spin", { seconds: 60 });
  await new Promise((r) => setTimeout(r, 500));
  const t0 = Date.now();
  await rt.cancel();
  expect(Date.now() - t0).toBeLessThan(6000);
  expect((await p).ok).toBe(false);
  expect(rt.running).toBe(false);
  expect((await run("echo", { text: "back" })).text).toBe("echo: back");
  expect(rt.running).toBe(true);
}, 30000);

test("a crash gives a readable error and the next call restarts", async () => {
  const r = await run("crash");
  expect(r.ok).toBe(false);
  expect(r.error).toMatch(/^the adapter process stopped: /);
  expect(r.error).toMatch(/crashing on purpose|exit code 1/);
  expect((await run("echo", { text: "up" })).ok).toBe(true);
}, 30000);

test("close ends the process", async () => {
  const other = await startAdapter(loadAdapter("tests/fixtures/fake-mcp"), { workDir: join(root, "w2"), sessionDir: join(root, "s2") });
  expect(other.running).toBe(true);
  await other.close();
  expect(other.running).toBe(false);
});

function manifest(locateSection: Record<string, unknown>, version = ""): Manifest {
  return Manifest.parse({ adapter: { name: "x" }, program: { name: "x", version }, connection: { kind: "cli" }, locate: locateSection });
}

test("locate: env var, paths with ~ and globs, then which", async () => {
  const bin = join(root, "bin");
  mkdirSync(join(bin, "tool-1.2"), { recursive: true });
  mkdirSync(join(bin, "tool-1.10"), { recursive: true });
  const exe = join(bin, "tool-1.10", "prog");
  writeFileSync(exe, "#!/bin/sh\necho 'prog version 1.10.3'\n");
  chmodSync(exe, 0o755);
  writeFileSync(join(bin, "tool-1.2", "prog"), "x");
  process.env.CUVETTE_TEST_PROG = exe;
  process.env.CUVETTE_TEST_ROOT = bin;

  const a = await locate(manifest({ env: "CUVETTE_TEST_PROG", paths: ["/nonexistent"], version_command: ["{program_path}"], version_pattern: "version ([\\d.]+)" }, "0"));
  expect(a).toMatchObject({ path: exe, version: process.platform === "win32" ? "0" : "1.10.3" });
  expect(a.how).toContain("CUVETTE_TEST_PROG");

  const b = await locate(manifest({ env: "CUVETTE_UNSET_VAR", paths: ["/nonexistent/x", "{env:CUVETTE_TEST_ROOT}/tool-*/prog"] }, "9.9"));
  expect(b).toMatchObject({ path: exe, version: "9.9" });

  const home = await locate(manifest({ paths: ["~/definitely-not-here-*"] }));
  expect(home.path).toBeUndefined();

  const c = await locate(manifest({ which: ["nope-not-a-program", "sh"] }, "2"));
  expect(c.path).toMatch(/sh(\.exe)?$/i);
  expect(c.version).toBe("2");

  const d = await locate(manifest({ which: ["nope-not-a-program"], version_command: ["{program_path}", "-v"] }, "fallback"));
  expect(d).toMatchObject({ path: undefined, version: "fallback" });
});

test("locate: the version command runs in the temporary folder, so a blind run that denies the repository does not stop it", async () => {
  if (process.platform === "win32") return;
  const r = await locate(manifest({ which: ["sh"], version_command: ["{program_path}", "-c", "echo cwd $(pwd -P)"], version_pattern: "cwd (\\S+)", identity: "cwd /" }));
  const { realpathSync } = await import("node:fs");
  expect(r.version).toBe(realpathSync(tmpdir()));
});

function slowPythonAdapter(delayS: number): string {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-slowpy-"));
  const exe = join(dir, "python");
  writeFileSync(exe, `#!/bin/sh\ncase "$1" in -W) sleep ${delayS}; echo "openpyxl 9.9";; esac\n`);
  chmodSync(exe, 0o755);
  writeFileSync(
    join(dir, "adapter.yaml"),
    [
      "adapter: { name: slowpy }",
      'program: { name: openpyxl, version: "from the manifest" }',
      'connection: { kind: python, interpreter: ["{program_path}"] }',
      "locate:",
      `  paths: [${JSON.stringify(exe)}]`,
      '  version_command: ["{program_path}", "-W", "ignore", "-c", "print(1)"]',
      "  version_pattern: 'openpyxl (\\S+)'",
      "  identity: 'openpyxl \\d'",
    ].join("\n"),
  );
  return dir;
}

test("quick start: a Python adapter starts before its version command ends, and the next start uses the saved version", async () => {
  if (process.platform === "win32") return;
  const home = process.env.CUVETTE_HOME;
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-home-"));
  try {
    const a = loadAdapter(slowPythonAdapter(3));
    const dirs = { workDir: mkdtempSync(join(tmpdir(), "w-")), sessionDir: mkdtempSync(join(tmpdir(), "s-")) };
    const t0 = Date.now();
    const rt = await startAdapter(a, dirs, { quick: true });
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(rt.programVersion).toBe("from the manifest");
    const f = await rt.checked;
    expect(f).toMatchObject({ version: "9.9", identified: true });
    expect(rt.programVersion).toBe("9.9");
    await rt.close();

    const again = await startAdapter(a, dirs, { quick: true });
    expect(again.programVersion).toBe("9.9");
    await again.checked;
    await again.close();

    const slow = await startAdapter(a, dirs);
    expect(slow.checked).toBeUndefined();
    expect(slow.programVersion).toBe("9.9");
    await slow.close();
  } finally {
    process.env.CUVETTE_HOME = home;
  }
});

test("locate: a version command that runs longer than the time limit gives the manifest version and a reason", async () => {
  if (process.platform === "win32") return;
  const a = loadAdapter(slowPythonAdapter(3));
  const r = await locate(a.manifest, a.root, undefined, 300);
  expect(r).toMatchObject({ version: "from the manifest", timedOut: true });
  expect(r.path).toBe(join(a.root, "python"));
  expect(r.how).toContain("longer than 0.3 s");
});

function napPythonAdapter(delayS: number): string {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-nappy-"));
  const exe = join(dir, "python");
  writeFileSync(exe, `#!/bin/sh\ncase "$1" in -W) sleep ${delayS}; echo "openpyxl 9.9";; *) exec python3 "$@";; esac\n`);
  chmodSync(exe, 0o755);
  writeFileSync(join(dir, "napmod.py"), "import os, time\n\ndef nap(seconds=0):\n    time.sleep(seconds)\n    return {'pid': os.getpid()}\n");
  writeFileSync(
    join(dir, "adapter.yaml"),
    [
      "adapter: { name: nappy }",
      'program: { name: openpyxl, version: "from the manifest" }',
      'connection: { kind: python, interpreter: ["{program_path}"] }',
      "locate:",
      `  paths: [${JSON.stringify(exe)}]`,
      '  version_command: ["{program_path}", "-W", "ignore", "-c", "print(1)"]',
      "  version_pattern: 'openpyxl (\\S+)'",
      "  identity: 'openpyxl \\d'",
      "tools:",
      "  - name: nap",
      "    description: Wait.",
      '    function: "napmod:nap"',
      "    params: { seconds: { type: number } }",
    ].join("\n"),
  );
  return dir;
}

test("quick start: a stop while the version command runs ends the call at once, and the next call runs", async () => {
  if (process.platform === "win32") return;
  const home = process.env.CUVETTE_HOME;
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-home-"));
  try {
    const a = loadAdapter(napPythonAdapter(2));
    const d = { workDir: mkdtempSync(join(tmpdir(), "w-")), sessionDir: mkdtempSync(join(tmpdir(), "s-")) };
    const rt = await startAdapter(a, d, { quick: true });
    const nap = (await rt.tools()).find((t) => t.name === "nap")!;
    const stop = new AbortController();
    setTimeout(() => stop.abort(), 100);
    const t0 = Date.now();
    const out = await nap.execute({ seconds: 5 }, { ...ctx(stop.signal), workDir: d.workDir, sessionDir: d.sessionDir });
    expect(Date.now() - t0).toBeLessThan(4000);
    expect(out.ok).toBe(false);
    await rt.checked;
    const next = await nap.execute({ seconds: 0 }, { ...ctx(), workDir: d.workDir, sessionDir: d.sessionDir });
    expect(next.ok).toBe(true);
    const first = nap.execute({ seconds: 8 }, { ...ctx(), workDir: d.workDir, sessionDir: d.sessionDir });
    const queued = new AbortController();
    setTimeout(() => queued.abort(), 100);
    const t1 = Date.now();
    const second = await nap.execute({ seconds: 0 }, { ...ctx(queued.signal), workDir: d.workDir, sessionDir: d.sessionDir });
    expect(Date.now() - t1).toBeLessThan(5000);
    expect(second.ok).toBe(false);
    expect((await first).ok).toBe(true);
    await rt.close();
  } finally {
    process.env.CUVETTE_HOME = home;
  }
}, 30000);

function warmPythonAdapter(importS: number, interpreter = 'exec python3 "$@"'): string {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-warmpy-"));
  const exe = join(dir, "python");
  writeFileSync(exe, `#!/bin/sh\ncase "$1" in -W) echo "openpyxl 9.9";; *) ${interpreter};; esac\n`);
  chmodSync(exe, 0o755);
  writeFileSync(
    join(dir, "warmmod.py"),
    `import os, time\nwith open(${JSON.stringify(join(dir, "imported"))}, "w") as f:\n    f.write(str(os.getpid()))\ntime.sleep(${importS})\n\ndef pid():\n    return {'pid': os.getpid()}\n`,
  );
  writeFileSync(
    join(dir, "adapter.yaml"),
    [
      "adapter: { name: warmpy }",
      'program: { name: openpyxl, version: "from the manifest" }',
      'connection: { kind: python, interpreter: ["{program_path}"], startup_timeout_s: 10 }',
      "locate:",
      `  paths: [${JSON.stringify(exe)}]`,
      '  version_command: ["{program_path}", "-W", "ignore", "-c", "print(1)"]',
      "  version_pattern: 'openpyxl (\\S+)'",
      "  identity: 'openpyxl \\d'",
      "tools:",
      "  - name: pid",
      "    description: Give the process ID.",
      '    function: "warmmod:pid"',
    ].join("\n"),
  );
  return dir;
}

async function until(check: () => boolean, ms = 10_000) {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error("time limit");
    await new Promise((r) => setTimeout(r, 20));
  }
}

const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

async function quickStart(dir: string) {
  const home = process.env.CUVETTE_HOME;
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-home-"));
  const d = { workDir: mkdtempSync(join(tmpdir(), "w-")), sessionDir: mkdtempSync(join(tmpdir(), "s-")) };
  const rt = await startAdapter(loadAdapter(dir), d, { quick: true });
  await rt.checked;
  if (home === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = home;
  const tool = (await rt.tools()).find((t) => t.name === "pid")!;
  return { rt, call: () => tool.execute({}, { ...ctx(), workDir: d.workDir, sessionDir: d.sessionDir }) };
}

test("warm: the worker starts and imports the adapter modules before the first call, and the call uses that worker", async () => {
  if (process.platform === "win32") return;
  const dir = warmPythonAdapter(3);
  const { rt, call } = await quickStart(dir);
  const t0 = Date.now();
  rt.warm!(true);
  expect(Date.now() - t0).toBeLessThan(1000);
  await until(() => existsSync(join(dir, "imported")));
  await new Promise((r) => setTimeout(r, 3500));
  const t1 = Date.now();
  const out = await call();
  expect(Date.now() - t1).toBeLessThan(1500);
  expect(out.ok).toBe(true);
  expect((out.data as { pid: number }).pid).toBe(Number(readFileSync(join(dir, "imported"), "utf8")));
  await rt.close();
}, 20000);

test("warm: a failed start shows at the first call, and the next call tries again", async () => {
  if (process.platform === "win32") return;
  const { rt, call } = await quickStart(warmPythonAdapter(0, "echo broken interpreter >&2; exit 3"));
  rt.warm!(true);
  await new Promise((r) => setTimeout(r, 500));
  const first = await call();
  expect(first.ok).toBe(false);
  expect(first.error).toMatch(/exit code 3/);
  const second = await call();
  expect(second.ok).toBe(false);
  await rt.close();
}, 20000);

test("warm: a close while the worker imports the modules stops the worker", async () => {
  if (process.platform === "win32") return;
  const dir = warmPythonAdapter(5);
  const { rt } = await quickStart(dir);
  rt.warm!(true);
  await until(() => existsSync(join(dir, "imported")));
  const pid = Number(readFileSync(join(dir, "imported"), "utf8"));
  const t0 = Date.now();
  await rt.close();
  expect(Date.now() - t0).toBeLessThan(1000);
  await until(() => !alive(pid), 3000);
}, 20000);

test("warm: a close before the worker starts starts no worker", async () => {
  if (process.platform === "win32") return;
  const dir = warmPythonAdapter(0);
  const { rt } = await quickStart(dir);
  await rt.close();
  rt.warm!(true);
  await new Promise((r) => setTimeout(r, 500));
  expect(existsSync(join(dir, "imported"))).toBe(false);
}, 20000);
