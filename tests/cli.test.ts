import { spawn, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer, type Server } from "node:http";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { TSX_CLI } from "../src/adapters/kinds/common.ts";

const CUVETTE = join(__dirname, "..", "bin/cuvette.js");
let root = "";
let project = "";
let data = "";

function home(settings?: Record<string, unknown>): string {
  const h = mkdtempSync(join(root, "home-"));
  cpSync(join(__dirname, "fixtures", "drive"), join(h, "adapters", "drivefix"), { recursive: true });
  if (settings) writeFileSync(join(h, "settings.json"), JSON.stringify(settings));
  return h;
}

function cli(h: string, args: string[], cwd = project) {
  const r = spawnSync("node", [CUVETTE, ...args], { cwd, env: { ...process.env, CUVETTE_HOME: h, CUVETTE_NO_OPEN: "1", ANTHROPIC_API_KEY: "", TMPDIR: root }, encoding: "utf8", timeout: 60_000 });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

function fake(name: string, script: unknown): string {
  const p = join(root, `${name}.json`);
  writeFileSync(p, JSON.stringify(script));
  return `fake:${p}`;
}

const headless = (h: string, model: string) => cli(h, ["-p", "Give the mean of x", "--adapter", "drivefix", "--model", model, "--trust-folder", "--output", "json"]);

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "cuvette-cli-"));
  project = join(root, "project");
  mkdirSync(project);
  data = join(project, "a.csv");
  writeFileSync(data, "x,y\n1,10\n2,20\n3,30\n4,40\n");
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

test("a run with an answer exits 0, and its script, flow and replay give the same numbers", () => {
  const h = home();
  const model = fake("answer", [{ calls: [{ name: "mean_of", args: { path: data, column: "x" } }] }, { calls: [{ name: "count_rows", args: { path: data } }] }, { text: "The mean of x is 2.5 over 4 rows." }]);
  const run = headless(h, model);
  expect(run.code, run.err).toBe(0);
  const out = JSON.parse(run.out);
  expect(out.stop).toBe("answer");
  const script = cli(h, ["export", out.session, "--format", "script"]).out.trim();
  expect(script).toMatch(/replay\.mts$/);
  const ran = spawnSync("node", [TSX_CLI, script], { cwd: mkdtempSync(join(root, "cwd-")), env: { ...process.env, CUVETTE_HOME: h, TMPDIR: root }, encoding: "utf8" });
  expect(ran.status, ran.stderr).toBe(0);
  expect(ran.stdout).toBe('Step 1 mean_of: {"mean":2.5}\nStep 2 count_rows: {"n_rows":4}\n');
  const flow = cli(h, ["export", out.session, "--format", "flow"]).out.trim();
  expect(JSON.parse(readFileSync(flow, "utf8")).inputs).toEqual({ input_1: data });
  const same = cli(h, ["replay", flow, "--input", `input_1=${data}`, "--session", out.session]);
  expect(same.code, same.err).toBe(0);
  expect(same.out).toBe("● mean_of same\n● count_rows same\n");
  const other = join(root, "b.csv");
  writeFileSync(other, "x,y\n1,1\n5,2\n");
  const diff = cli(h, ["replay", flow, "--input", `input_1=${other}`, "--session", out.session]);
  expect(diff.code).toBe(1);
  expect(diff.out).toBe("● mean_of differs: mean: was 2.5, now 3\n● count_rows differs: n_rows: was 4, now 2\n");
  const alone = cli(h, ["replay", flow, "--input", `input_1=${other}`]);
  expect(alone.code).toBe(0);
  expect(alone.out).toContain('● mean_of ran, no original to compare: {"mean":3}');
  const missing = cli(h, ["replay", flow]);
  expect(missing.code).toBe(1);
  expect(missing.err).toContain("no input given for input_1");
});

test("a headless run with a question the harness answered gives assumptions apart from the answer", () => {
  const h = home();
  const model = fake("assume", [{ calls: [{ name: "ask_scientist", args: { question: "Which column?", options: ["x", "y"], recommendation: "x" } }] }, { calls: [{ name: "mean_of", args: { path: data, column: "x" } }] }, { text: "The mean of x is 2.5.\n\nWaits for you:\n- Confirm the units.\n" }]);
  const json = JSON.parse(headless(h, model).out);
  expect(json.answer).not.toContain("Waits for you");
  expect(json.assumptions).toContain("Which column?: used x.");
  const text = cli(h, ["-p", "Give the mean of x", "--adapter", "drivefix", "--model", fake("assume2", [{ calls: [{ name: "ask_scientist", args: { question: "Which column?", options: ["x", "y"], recommendation: "x" } }] }, { calls: [{ name: "mean_of", args: { path: data, column: "x" } }] }, { text: "The mean of x is 2.5.\n\nWaits for you:\n- Confirm the units.\n" }]), "--trust-folder"]);
  expect(text.out).toMatch(/The mean of x is 2\.5\.[\s\S]*Assumed because no answer was given:[\s\S]*Which column\?: used x\./);
  expect(text.out).not.toContain("Waits for you");
});

test("a script stops with exit code 1 at a failed step", () => {
  const h = home();
  const model = fake("answer2", [{ calls: [{ name: "mean_of", args: { path: data, column: "x" } }] }, { text: "The mean of x is 2.5." }]);
  const out = JSON.parse(headless(h, model).out);
  const script = cli(h, ["export", out.session, "--format", "script"]).out.trim();
  writeFileSync(script, readFileSync(script, "utf8").replace(`"column": "x"`, `"column": "nope"`));
  const ran = spawnSync("node", [TSX_CLI, script], { cwd: mkdtempSync(join(root, "cwd-")), env: { ...process.env, CUVETTE_HOME: h, TMPDIR: root }, encoding: "utf8" });
  expect(ran.status).toBe(1);
  expect(ran.stdout).toContain("Step 1 mean_of: failed: no column nope");
});

test("headless: the step limit and a model error exit 1, with the reason in the JSON", () => {
  const loop = headless(home({ maxSteps: 2 }), fake("loop", Array.from({ length: 5 }, (_, i) => ({ calls: [{ name: "count_rows", args: { path: data, n: i } }] }))));
  expect(loop.code).toBe(1);
  expect(JSON.parse(loop.out).stop).toBe("max_steps");
  const broken = headless(home(), fake("broken", {}));
  expect(broken.code).toBe(1);
  expect(JSON.parse(broken.out).stop).toBe("error");
});

test("run-step exits 0 on a good step and 1 on a failed step, a missing tool or bad JSON", () => {
  const h = home();
  const good = cli(h, ["run-step", "drivefix", "mean_of", JSON.stringify({ path: data, column: "y" })]);
  expect(good.code, good.err).toBe(0);
  expect(JSON.parse(good.out).metrics).toEqual({ mean: 25 });
  const failed = cli(h, ["run-step", "drivefix", "mean_of", JSON.stringify({ path: data, column: "z" })]);
  expect(failed.code).toBe(1);
  expect(JSON.parse(failed.out).error).toContain("no column z");
  const tool = cli(h, ["run-step", "drivefix", "nope", "{}"]);
  expect(tool.code).toBe(1);
  expect(JSON.parse(tool.out).error).toBe('no tool "nope" in adapter "drivefix"');
  const json = cli(h, ["run-step", "drivefix", "mean_of", "{bad"]);
  expect(json.code).toBe(1);
  expect(json.err).toContain("not valid JSON");
  const adapter = cli(h, ["run-step", "nosuch", "mean_of", "{}"]);
  expect(adapter.code).toBe(1);
  expect(adapter.err).toContain('no adapter named "nosuch"');
});

test("run-step and replay do not start an adapter that is turned off in Programs", () => {
  const h = home({ programs: { drivefix: { off: true } } });
  const r = cli(h, ["run-step", "drivefix", "mean_of", JSON.stringify({ path: data, column: "y" })]);
  expect(r.code).toBe(1);
  expect(r.err).toContain("turned off in Programs");
});

test("bench checks its arguments before any model call", () => {
  const h = home();
  const runs = cli(h, ["bench", "papers", "--models", "fake:x", "--runs", "two"]);
  expect(runs.code).toBe(1);
  expect(runs.err).toContain('--runs must be a whole number of 1 or more, not "two"');
  expect(cli(h, ["bench", "papers", "--models", "fake:x", "--runs", "0"]).code).toBe(1);
  const guidance = cli(h, ["bench", "--model", "fake:x", "--guidance", "maybe"]);
  expect(guidance.code).toBe(1);
  expect(guidance.err).toContain('--guidance must be on, off or both, not "maybe"');
  const scenario = cli(h, ["bench", "no-such-scenario", "--model", "fake:x"]);
  expect(scenario.code).toBe(1);
  expect(scenario.err).toContain("No scenario no-such-scenario.");
  expect(cli(h, ["bench", "papers"]).code).toBe(1);
  expect(cli(h, ["bench", "compare", "--results", "a.json"]).code).toBe(1);
  expect(cli(h, ["bench", "site", "--results", "a.json"]).code).toBe(1);
});

const hasPython = spawnSync("python3", ["-c", "import pty"]).status === 0 && process.platform !== "win32";

// Runs the command in a pseudo-terminal. Each step waits for a pattern in the output, then sends the text.
const DRIVE = `
import os, pty, sys, json, time, select, re, signal
steps = json.loads(sys.argv[1])
pid, fd = pty.fork()
if pid == 0:
    os.execvp(sys.argv[2], sys.argv[2:])
buf = b""
def read(sec):
    global buf
    end = time.time() + sec
    while time.time() < end:
        r, _, _ = select.select([fd], [], [], 0.05)
        if r:
            try:
                d = os.read(fd, 65536)
            except OSError:
                return False
            if not d:
                return False
            buf += d
    return True
for pat, send in steps:
    end = time.time() + 20
    while not re.search(pat, buf.decode("utf8", "replace")) and time.time() < end:
        if not read(0.1):
            break
    try:
        os.write(fd, send.encode())
    except OSError:
        break
read(1.5)
code = None
for _ in range(50):
    p, st = os.waitpid(pid, os.WNOHANG)
    if p:
        code = os.waitstatus_to_exitcode(st)
        break
    read(0.1)
if code is None:
    os.kill(pid, signal.SIGKILL)
    os.waitpid(pid, 0)
sys.stdout.write(json.dumps({"code": code, "out": buf.decode("utf8", "replace")}))
`;

let dirs: string[] = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

function ptyHome() {
  const h = mkdtempSync(join(tmpdir(), "cuvette-cli-"));
  dirs.push(h);
  mkdirSync(join(h, "proj"));
  return h;
}

function cleanEnv(h: string, extra: Record<string, string> = {}) {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !k.startsWith("ANTHROPIC") && k !== "NO_COLOR" && k !== "FORCE_COLOR") env[k] = v;
  return { ...env, CUVETTE_HOME: join(h, "cv"), HOME: h, OLLAMA_HOST: "http://127.0.0.1:1", CUVETTE_NO_OPEN: "1", TERM: "xterm-256color", ...extra };
}

function drive(steps: [string, string][], env: Record<string, string>, cwd: string, args: string[] = []): Promise<{ code: number | null; out: string }> {
  return new Promise((done) => {
    const p = spawn("python3", ["-I", "-c", DRIVE, JSON.stringify(steps), process.execPath, CUVETTE, ...args], { cwd, env });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("close", () => done(JSON.parse(out)));
  });
}

test("the terminal app with piped input stops with a clear message and makes no session", () => {
  const h = ptyHome();
  const r = spawnSync(process.execPath, [CUVETTE], { cwd: join(h, "proj"), env: cleanEnv(h, { ANTHROPIC_API_KEY: "sk-ant-test" }), input: "hello\n", encoding: "utf8", timeout: 30_000 });
  expect(r.status).toBe(1);
  expect(r.stderr).toContain('cuvette -p "<request>"');
  expect(r.stderr).not.toContain("Raw mode");
  expect(spawnSync("ls", [join(h, "proj")], { encoding: "utf8" }).stdout).not.toContain("cuvette");
}, 40_000);

test.skipIf(!hasPython)("the terminal app with TERM=dumb stops with a clear message and prints no cursor codes", async () => {
  const h = ptyHome();
  const r = await drive([], cleanEnv(h, { ANTHROPIC_API_KEY: "sk-ant-test", TERM: "dumb" }), join(h, "proj"));
  expect(r.code).toBe(1);
  expect(r.out).toContain("TERM=dumb");
  expect(r.out).toContain("cuvette app");
  expect(r.out).toContain("cuvette -p");
  expect(r.out).not.toContain("\x1b[");
  expect(spawnSync("ls", [join(h, "proj")], { encoding: "utf8" }).stdout).not.toContain("cuvette");
}, 40_000);

test("cuvette app with a file in place of a folder stops with a clear message", () => {
  const h = ptyHome();
  const file = join(h, "data.csv");
  writeFileSync(file, "x\n1\n");
  const r = spawnSync(process.execPath, [CUVETTE, "app", file, "--no-open"], { cwd: h, env: cleanEnv(h, { ANTHROPIC_API_KEY: "sk-ant-test" }), encoding: "utf8", timeout: 30_000 });
  expect(r.status).toBe(1);
  expect(r.stderr).toContain(`${file} is not a folder.`);
  expect(r.stdout).not.toContain("Cuvette app:");
}, 40_000);

describe.skipIf(!hasPython)("first start and the terminal app in a pseudo-terminal", () => {
  let ollama: Server;
  let url = "";
  beforeAll(async () => {
    ollama = createServer((_, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ models: [{ name: "qwen3:8b" }, { name: "llama3.1:8b" }] }));
    });
    await new Promise<void>((ok) => ollama.listen(0, "127.0.0.1", ok));
    url = `http://127.0.0.1:${(ollama.address() as { port: number }).port}`;
  });
  afterAll(() => new Promise<void>((ok) => ollama.close(() => ok())));

  test("Ctrl+C at the first question ends the line and exits with 130", async () => {
    const h = ptyHome();
    const r = await drive([["Type 1 or 2", "\x03"]], cleanEnv(h), join(h, "proj"));
    expect(r.code).toBe(130);
    expect(r.out).toMatch(/Type 1 or 2: \^C\r?\n/);
  }, 40_000);

  test("an empty key does not use a try, and a model number out of the list asks again", async () => {
    const h = ptyHome();
    const key = await drive([["Type 1 or 2", "1\r"], ["Paste", "\r"], ["Paste(.|\\n)*Paste", "\x03"]], cleanEnv(h), join(h, "proj"));
    expect(key.out).not.toContain("The key is empty");
    expect(key.out.match(/Paste your Claude API key/g)).toHaveLength(2);
    const h2 = ptyHome();
    const r = await drive([["Type 1 or 2", "2\r"], ["Type a number", "9\r"], ["from 1 to 2", "2\r"], ["sample analysis", "\x03"]], cleanEnv(h2, { OLLAMA_HOST: url }), join(h2, "proj"));
    expect(r.out).toContain("Type a number from 1 to 2");
    expect(r.out).toContain("Saved the model ollama:llama3.1:8b.");
    expect(r.out).not.toContain("ollama:9");
  }, 60_000);

  test("NO_COLOR gives a terminal app with no color codes", async () => {
    const h = ptyHome();
    const r = await drive([["Ask for an analysis step", "\x03\x03"]], cleanEnv(h, { NO_COLOR: "1" }), join(h, "proj"), ["--model", "fake:"]);
    expect(r.out).toContain("Ask for an analysis step");
    expect(r.out).not.toMatch(/\x1b\[(3|4|9|10)\dm/);
  }, 40_000);
});

test("NO_COLOR does not give FORCE_COLOR to child processes", () => {
  const h = ptyHome();
  const show = 'data:text/javascript,process.on("exit",()=>console.error("FORCE_COLOR="+process.env.FORCE_COLOR))';
  const r = spawnSync(process.execPath, ["--import", show, CUVETTE, "--version"], { env: cleanEnv(h, { NO_COLOR: "1" }), encoding: "utf8", timeout: 30_000 });
  expect(r.status).toBe(0);
  expect(r.stderr).toContain("FORCE_COLOR=undefined");
}, 40_000);

test("headless text output shows model text without control codes", () => {
  const h = home();
  const model = fake("evil", [{ calls: [{ name: "mean_of", args: { path: data, column: "x" } }] }, { text: "Result\x1b]52;c;U1RDT1BZ\x07 \x1b[8mHIDDEN\x1b[0m done‮" }, { text: "Result\x1b]52;c;U1RDT1BZ\x07 \x1b[8mHIDDEN\x1b[0m done‮" }, { text: "Result\x1b]52;c;U1RDT1BZ\x07 \x1b[8mHIDDEN\x1b[0m done‮" }]);
  const r = cli(h, ["-p", "Give the mean of x", "--adapter", "drivefix", "--model", model, "--trust-folder"]);
  expect(r.out).toContain("Result");
  expect(r.out).toContain("HIDDEN");
  expect(r.out).not.toMatch(/\x1b|\x07|‮|U1RDT1BZ/);
  expect(r.err).not.toMatch(/\x1b|‮/);
});

test("headless text output keeps the rest of an answer after a stray control introducer", () => {
  const h = home();
  const text = "Start\u009d52 middle text \u0090 still here End";
  const model = fake("stray", [{ calls: [{ name: "mean_of", args: { path: data, column: "x" } }] }, { text }, { text }, { text }]);
  const r = cli(h, ["-p", "Give the mean of x", "--adapter", "drivefix", "--model", model, "--trust-folder"]);
  expect(r.out).toContain("middle text");
  expect(r.out).toContain("End");
});

test("the help line for cuvette status names the --adapter option", () => {
  const r = cli(home(), ["--help"]);
  expect(r.out).toMatch(/cuvette status \[session\] \[--adapter <folder>\]/);
});
