import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PassThrough } from "node:stream";
import { describe, expect, test } from "vitest";
import { keyStream, partialTail } from "../src/tui/key-stream.ts";
import { sleep, Term } from "../src/tui/testing.ts";

describe("partialTail", () => {
  test.each([
    ["abc", 0],
    ["\x1b", 1],
    ["ab\x1b", 1],
    ["\x1b\x1b", 2],
    ["\x1b[", 2],
    ["x\x1b[127;3", 7],
    ["\x1b[127;3u", 0],
    ["\x1b\x7f", 0],
    ["\x1bb", 0],
    ["\x1bO", 2],
    ["\x1b\x1b[1;3", 6],
  ])("%j keeps %i characters", (s, n) => expect(partialTail(s)).toBe(n));
});

function fakeTty() {
  const real = new PassThrough() as unknown as NodeJS.ReadStream & { setRawMode(on: boolean): unknown };
  Object.assign(real, { isTTY: true, setRawMode: () => real, ref: () => real, unref: () => real });
  return real;
}

function collect(out: NodeJS.ReadStream) {
  const got: string[] = [];
  out.setEncoding("utf8");
  out.on("readable", () => {
    let c;
    while ((c = out.read()) !== null) got.push(c);
  });
  return got;
}

describe("keyStream", () => {
  test("joins a key sequence split across chunks, and logs each chunk", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cuvette-keylog-"));
    const real = fakeTty();
    const out = keyStream(real, join(dir, "keys.log"));
    const got = collect(out);
    (out as unknown as { setRawMode(on: boolean): void }).setRawMode(true);
    real.write("ab\x1b");
    await sleep(25);
    real.write("[127;");
    await sleep(25);
    real.write("3u");
    await sleep(10);
    expect(got).toEqual(["ab", "\x1b[127;3u"]);
    const log = readFileSync(join(dir, "keys.log"), "utf8").trim().split("\n");
    expect(log.map((l) => JSON.parse(l.split(" ").slice(2).join(" ")))).toEqual(["ab\x1b", "[127;", "3u"]);
    rmSync(dir, { recursive: true });
  });

  test("a lone ESC goes on after the wait", async () => {
    const real = fakeTty();
    const out = keyStream(real, undefined, 20);
    const got = collect(out);
    (out as unknown as { setRawMode(on: boolean): void }).setRawMode(true);
    real.write("\x1b");
    await sleep(5);
    expect(got).toEqual([]);
    await sleep(40);
    expect(got).toEqual(["\x1b"]);
  });
});

const ROOT = resolve(import.meta.dirname, "..");
const hasPython = spawnSync("python3", ["-c", "import pty"]).status === 0 && process.platform !== "win32";

const RELAY = `
import os, pty, sys, json, time, select, struct, fcntl, termios
answer = sys.argv[1]
pid, fd = pty.fork()
if pid == 0:
    os.execvp(sys.argv[2], sys.argv[2:])
fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", 50, 100, 0, 0))
buf = b""
while True:
    r, _, _ = select.select([0, fd], [], [])
    if fd in r:
        try:
            d = os.read(fd, 65536)
        except OSError:
            break
        if not d:
            break
        if answer and b"\\x1b[?u" in d:
            os.write(fd, answer.encode())
        os.write(1, d)
    if 0 in r:
        d = os.read(0, 65536)
        if not d:
            break
        buf += d
        while b"\\n" in buf:
            line, buf = buf.split(b"\\n", 1)
            m = json.loads(line)
            if m.get("gap"):
                for ch in m["d"]:
                    os.write(fd, ch.encode())
                    time.sleep(m["gap"] / 1000)
            else:
                os.write(fd, m["d"].encode())
os.kill(pid, 9)
`;

function startApp(answer: string) {
  const home = mkdtempSync(join(tmpdir(), "cuvette-pty-"));
  const p = spawn("python3", ["-I", "-c", RELAY, answer, process.execPath, join(ROOT, "bin/cuvette.js"), "--model", "fake:"], {
    cwd: home,
    env: { ...process.env, CUVETTE_HOME: join(home, "home"), TERM: "xterm-256color", NO_COLOR: "1", CUVETTE_KEYLOG: "" },
  });
  const term = new Term(100, 50);
  let raw = "";
  let tail = "";
  p.stdout.setEncoding("utf8");
  p.stdout.on("data", (d: string) => {
    raw += d;
    const s = tail + d;
    const n = partialTail(s);
    tail = s.slice(s.length - n);
    term.write(s.slice(0, s.length - n));
  });
  const rows = () => Array.from({ length: 50 }, (_, i) => term.row(i));
  return {
    send: (d: string, gap = 0) => p.stdin.write(JSON.stringify({ d, gap }) + "\n"),
    rows,
    raw: () => raw,
    async wait(cond: (rows: string[]) => boolean, what: string, ms = 4000) {
      const end = Date.now() + ms;
      while (!cond(rows())) {
        if (Date.now() > end) throw new Error(`${what}: timeout. Screen:\n${rows().join("\n")}`);
        await sleep(20);
      }
    },
    stop() {
      p.kill();
      rmSync(home, { recursive: true, force: true });
    },
  };
}

const inputLine = (rows: string[]) => (rows.find((r) => r.startsWith("│ > ")) ?? "").replace(/^│ > /, "").replace(/\s*│$/, "").trimEnd();
const PLACEHOLDER = "Ask for an analysis step";

const CASES: [string, string, string, string][] = [
  ["Option+Backspace, legacy", "\x1b\x7f", "", "hello"],
  ["Option+Backspace, kitty", "\x1b[127;3u", "", "hello"],
  ["Ctrl+W, legacy", "\x17", "", "hello"],
  ["Ctrl+W, kitty", "\x1b[119;5u", "", "hello"],
  ["Cmd+Backspace as Ctrl+U", "\x15", "", PLACEHOLDER],
  ["Cmd+Backspace, kitty", "\x1b[127;9u", "", PLACEHOLDER],
  ["Option+Left, legacy", "\x1bb", "X", "hello Xworld"],
  ["Option+Left, xterm", "\x1b[1;3D", "X", "hello Xworld"],
];

describe.skipIf(!hasPython)("the real app in a pseudo-terminal", () => {
  for (const kitty of [false, true])
    for (const gap of [0, 25])
      test(`${kitty ? "kitty protocol on" : "no kitty answer"}, ${gap ? `one byte every ${gap} ms` : "one write for each key"}`, async () => {
        const app = startApp(kitty ? "\x1b[?0u" : "");
        try {
          await app.wait((r) => r.some((x) => x.includes("Setup: your choices")), "setup card", 20000);
          if (!kitty) expect(app.raw()).not.toContain("\x1b[>1u");
          for (let i = 0; ; i++) {
            app.send("\r");
            await sleep(300);
            app.send("Q");
            try {
              await app.wait((r) => r.some((x) => x.includes("asking?: Q")), "setup field", 1000);
              break;
            } catch (e) {
              if (i === 4) throw e;
            }
          }
          app.send("\x7fDoes Z");
          await app.wait((r) => r.some((x) => x.includes("asking?: Does Z")), "typed in the setup field");
          app.send("\x1b\x7f", gap);
          app.send("Y differ?");
          await app.wait((r) => r.some((x) => /asking\?: Does Y differ\?\s*│$/.test(x)), "Option+Backspace in the setup field");
          app.send("\x1b[27u");
          await app.wait((r) => !r.some((x) => x.startsWith("│     Does")), "field closed");
          app.send("\x1b[27u");
          await app.wait((r) => inputLine(r).startsWith(PLACEHOLDER), "card closed");
          for (const [name, seq, after, want] of CASES) {
            app.send("hello world");
            await app.wait((r) => inputLine(r) === "hello world", `${name}: typed`);
            app.send(seq, gap);
            if (after) app.send(after);
            await app.wait((r) => (want === PLACEHOLDER ? inputLine(r).startsWith(PLACEHOLDER) : inputLine(r) === want), `${name}: ${JSON.stringify(seq)}`);
            app.send("\x05\x15");
            await app.wait((r) => inputLine(r).startsWith(PLACEHOLDER), `${name}: cleared`);
          }
        } finally {
          app.stop();
        }
      }, 60000);
});
