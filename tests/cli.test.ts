import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");
const CLI = join(ROOT, "bin/cuvette.js");
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

function home() {
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
    const p = spawn("python3", ["-I", "-c", DRIVE, JSON.stringify(steps), process.execPath, CLI, ...args], { cwd, env });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("close", () => done(JSON.parse(out)));
  });
}

test("the terminal app with piped input stops with a clear message and makes no session", () => {
  const h = home();
  const r = spawnSync(process.execPath, [CLI], { cwd: join(h, "proj"), env: cleanEnv(h, { ANTHROPIC_API_KEY: "sk-ant-test" }), input: "hello\n", encoding: "utf8", timeout: 30_000 });
  expect(r.status).toBe(1);
  expect(r.stderr).toContain('cuvette -p "<request>"');
  expect(r.stderr).not.toContain("Raw mode");
  expect(spawnSync("ls", [join(h, "proj")], { encoding: "utf8" }).stdout).not.toContain("cuvette");
}, 40_000);

test("cuvette app with a file in place of a folder stops with a clear message", () => {
  const h = home();
  const file = join(h, "data.csv");
  writeFileSync(file, "x\n1\n");
  const r = spawnSync(process.execPath, [CLI, "app", file, "--no-open"], { cwd: h, env: cleanEnv(h, { ANTHROPIC_API_KEY: "sk-ant-test" }), encoding: "utf8", timeout: 30_000 });
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
    const h = home();
    const r = await drive([["Type 1 or 2", "\x03"]], cleanEnv(h), join(h, "proj"));
    expect(r.code).toBe(130);
    expect(r.out).toMatch(/Type 1 or 2: \^C\r?\n/);
  }, 40_000);

  test("an empty key does not use a try, and a model number out of the list asks again", async () => {
    const h = home();
    const key = await drive([["Type 1 or 2", "1\r"], ["Paste", "\r"], ["Paste(.|\\n)*Paste", "\x03"]], cleanEnv(h), join(h, "proj"));
    expect(key.out).not.toContain("The key is empty");
    expect(key.out.match(/Paste your Claude API key/g)).toHaveLength(2);
    const h2 = home();
    const r = await drive([["Type 1 or 2", "2\r"], ["Type a number", "9\r"], ["from 1 to 2", "2\r"], ["sample analysis", "\x03"]], cleanEnv(h2, { OLLAMA_HOST: url }), join(h2, "proj"));
    expect(r.out).toContain("Type a number from 1 to 2");
    expect(r.out).toContain("Saved the model ollama:llama3.1:8b.");
    expect(r.out).not.toContain("ollama:9");
  }, 60_000);

  test("NO_COLOR gives a terminal app with no color codes", async () => {
    const h = home();
    const r = await drive([["Ask for an analysis step", "\x03\x03"]], cleanEnv(h, { NO_COLOR: "1" }), join(h, "proj"), ["--model", "fake:"]);
    expect(r.out).toContain("Ask for an analysis step");
    expect(r.out).not.toMatch(/\x1b\[(3|4|9|10)\dm/);
  }, 40_000);
});
