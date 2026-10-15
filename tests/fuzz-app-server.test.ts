import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { startApp, type AppHandle } from "../src/server/app.ts";
import { FakeSession } from "../src/ui/fake-session.ts";
import { Rng, runs } from "./fuzz-rng.ts";
import { withinMs } from "./timing.ts";

const home = mkdtempSync(join(tmpdir(), "cuvette-fuzz-app-home-"));
const outside = mkdtempSync(join(tmpdir(), "cuvette-fuzz-app-outside-"));
const oldHome = process.env.CUVETTE_HOME;
const errors: unknown[] = [];
const logged: string[] = [];
const onError = (e: unknown) => errors.push(e);
const realWrite = { out: process.stdout.write, err: process.stderr.write };

let app: AppHandle;
let session: FakeSession;

beforeAll(async () => {
  process.env.CUVETTE_HOME = home;
  process.on("unhandledRejection", onError);
  process.on("uncaughtException", onError);
  for (const k of ["out", "err"] as const) {
    const stream = k === "out" ? process.stdout : process.stderr;
    stream.write = ((chunk: unknown, ...rest: unknown[]) => {
      logged.push(String(chunk));
      return (realWrite[k] as (...a: unknown[]) => boolean).call(stream, chunk, ...rest);
    }) as never;
  }
  writeFileSync(join(outside, "secret.txt"), "outside secret");
  session = new FakeSession();
  writeFileSync(join(session.cwd, "inside.txt"), "inside text");
  mkdirSync(session.workDir, { recursive: true });
  symlinkSync(outside, join(session.cwd, "link"));
  app = await startApp({ session, env: { ANTHROPIC_API_KEY: "sk-ant-test-0000000000000000000000" } });
});

afterAll(async () => {
  await app.close();
  process.off("unhandledRejection", onError);
  process.off("uncaughtException", onError);
  process.stdout.write = realWrite.out;
  process.stderr.write = realWrite.err;
  process.env.CUVETTE_HOME = oldHome;
  rmSync(home, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
  rmSync(session.dir, { recursive: true, force: true });
});

interface Reply {
  status: number;
  head: string;
  body: string;
  closed: boolean;
}

function raw(data: string | Buffer, o: { wait?: number; then?: (write: (d: string | Buffer) => void) => void } = {}): Promise<Reply> {
  return new Promise((done) => {
    let out = "";
    let closed = false;
    const s = connect(app.port, "127.0.0.1", () => {
      s.write(data);
      o.then?.((d) => s.write(d));
    });
    const finish = () => {
      const i = out.indexOf("\r\n\r\n");
      const head = i < 0 ? out : out.slice(0, i);
      done({ status: Number(/^HTTP\/1\.1 (\d+)/.exec(head)?.[1] ?? 0), head, body: i < 0 ? "" : out.slice(i + 4), closed });
    };
    s.on("data", (c) => (out += c.toString("latin1")));
    s.on("close", () => {
      closed = true;
      finish();
    });
    s.on("error", () => {});
    setTimeout(() => {
      if (!closed) {
        s.destroy();
      }
    }, o.wait ?? 4000);
  });
}

const HOST = () => `Host: 127.0.0.1:${app.port}\r\n`;
const get = (target: string, extra = "") => raw(`GET ${target} HTTP/1.1\r\n${HOST()}${extra}Connection: close\r\n\r\n`);
const withToken = (target: string) => `${target}${target.includes("?") ? "&" : "?"}t=${app.token}`;
const alive = async () => expect((await get(withToken("/api/state"))).status).toBe(200);

function sseCount(): number {
  return (session.bus as unknown as { listeners: Set<unknown> }).listeners.size;
}

describe("the app server under bad requests", () => {
  test("a request target that the URL parser rejects gets status 400 and does not crash", async () => {
    for (const target of ["//", "http://[", "http://", "//[::1"]) {
      const r = await get(target);
      expect([400, 401, 403]).toContain(r.status);
    }
    await alive();
    expect(errors).toEqual([]);
  });

  test("a terminal session refuses to open another session with status 409 and does not crash", async () => {
    const terminal = new FakeSession();
    const other = await startApp({ session: terminal, env: { ANTHROPIC_API_KEY: "sk-ant-test-0000000000000000000000" } });
    try {
      const r = await fetch(`http://127.0.0.1:${other.port}/api/open?t=${other.token}`, { method: "POST", body: JSON.stringify({ folder: tmpdir() }) });
      expect(r.status).toBe(409);
      await new Promise((d) => setTimeout(d, 200));
      expect(errors).toEqual([]);
    } finally {
      await other.close();
      rmSync(terminal.dir, { recursive: true, force: true });
    }
  });

  test("a body that is too large gets status 413, a bad body gets status 400", async () => {
    const post = (body: string, type = "application/json") => raw(`POST /api/mode?t=${app.token} HTTP/1.1\r\n${HOST()}Content-Type: ${type}\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`);
    expect((await post("x".repeat(300 * 1024))).status).toBe(413);
    for (const body of ["{", "null", "[]", "5", '"text"', "{\"mode\":"]) {
      const r = await post(body);
      expect(r.status).toBe(400);
      expect(r.body).not.toMatch(/\bat .*\.(ts|js):\d+/);
    }
    expect((await post("{\"mode\":\"nope\"}", "text/plain")).status).toBe(400);
    expect((await post("{\"mode\":\"watch\"}", "text/plain")).status).toBe(200);
    await alive();
  });

  test("a body that stops in the middle does not crash the server", async () => {
    const r = await raw(`POST /api/mode?t=${app.token} HTTP/1.1\r\n${HOST()}Content-Length: 100\r\n\r\n{"mode":`, { wait: 300 });
    expect(r.status === 0 || r.status === 400).toBe(true);
    const c = await raw(`POST /api/mode?t=${app.token} HTTP/1.1\r\n${HOST()}Transfer-Encoding: chunked\r\n\r\n5\r\n{"mod`, { wait: 300 });
    expect(c.status === 0 || c.status === 400).toBe(true);
    await alive();
    expect(errors).toEqual([]);
  });

  test("a wrong host, a wrong origin or a wrong token gets status 403 or 401", async () => {
    expect((await raw(`GET /api/state?t=${app.token} HTTP/1.1\r\nHost: evil.example\r\nConnection: close\r\n\r\n`)).status).toBe(403);
    expect((await raw(`GET /api/state?t=${app.token} HTTP/1.1\r\nHost: 127.0.0.1:1\r\nConnection: close\r\n\r\n`)).status).toBe(403);
    expect((await get(withToken("/api/state"), "Origin: http://evil.example\r\n")).status).toBe(403);
    expect((await get("/api/state")).status).toBe(401);
    expect((await get("/api/state?t=")).status).toBe(401);
    expect((await get("/api/state", `X-Token: ${app.token}\r\n`)).status).toBe(200);
    expect((await get("/api/state", `X-Token: ${app.token}\r\nX-Token: ${app.token}\r\n`)).status).toBe(401);
    expect((await get(`/api/state?t=wrong&t=${app.token}`)).status).toBe(401);
    expect((await get(`/api/state/;t=${app.token}`)).status).toBe(401);
    expect((await get(`/api/state#t=${app.token}`)).status).toBe(401);
  });

  test("error pages and log lines never hold the token", async () => {
    const targets = ["/", "/api/state?t=bad", "//", "/api/nope", "/api/file?p=%00", "/graph/x", "/assets/..%2f..%2fx"];
    for (const t of targets) {
      for (const h of [withToken(t), t]) {
        const r = await get(h);
        expect(r.head + r.body.replaceAll(app.token, "")).not.toContain(app.token);
        if (r.status >= 400) expect(r.body).not.toContain(app.token);
      }
    }
    expect(logged.filter((l) => l.includes(app.token))).toEqual([]);
  });

  test("a path never leaves the allowed folders", async () => {
    const inside = join(session.cwd, "inside.txt");
    const ok = await get(withToken(`/api/file?p=${encodeURIComponent(inside)}`));
    expect(ok.status).toBe(200);
    expect(ok.body).toContain("inside text");
    const escapes = [
      join(outside, "secret.txt"),
      join(session.cwd, "link", "secret.txt"),
      join(session.cwd, "..", outside.split("/").pop()!, "secret.txt"),
      join(session.cwd, "inside.txt\u0000/../../secret"),
      `${session.cwd}/../../../../etc/passwd`,
      "/etc/passwd",
      join(home, "credentials.json"),
    ];
    for (const e of escapes) {
      for (const p of [encodeURIComponent(e), encodeURIComponent(encodeURIComponent(e))]) {
        const r = await get(withToken(`/api/file?p=${p}`));
        expect(r.status, e).toBe(404);
        expect(r.body).not.toContain("outside secret");
      }
    }
    for (const a of ["/assets/../index.html", "/assets/%2e%2e/package.json", "/assets/..%2fpackage.json", "/assets/%252e%252e/package.json", "/assets//etc/passwd", "/assets/\u0000", "/assets/%00.js"]) {
      const r = await get(a);
      expect(r.status, a).not.toBe(200);
    }
    const posted = await raw(`POST /api/reveal?t=${app.token} HTTP/1.1\r\n${HOST()}Content-Length: 40\r\nConnection: close\r\n\r\n${JSON.stringify({ path: "/etc/passwd" }).padEnd(40)}`);
    expect(posted.status).toBe(404);
  });
});

describe("the app server under random requests", () => {
  const METHODS = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH", "TRACE", "BREW", "get"];
  const SEGMENTS = ["api", "state", "events", "graph", "assets", "file", "tab", "open", "send", "..", ".", "%2e%2e", "%2f", "%252f", "%00", "\u0000", "a".repeat(3000), "%", "%zz", "~", "\\", "?", "#", "settings.json", "programs.json", "sessions", "dirs", "suggest", "thumb", "act", "close", "doctor", "firststart", "setting", "reveal"];
  const HEADERS = ["Content-Type: application/json", "Content-Type: text/plain", "Content-Type: ÿ", `X-Token: x`, "Origin: null", "Origin: http://127.0.0.1", "Accept: text/event-stream", "Range: bytes=0-", "Expect: 100-continue", "Cookie: a=b", "X-Forwarded-Host: evil", "If-None-Match: *", "Accept-Encoding: gzip"];
  const BODIES = ["", "{", "{}", "null", "[]", '{"text":"hi"}', '{"mode":"watch"}', '{"folder":"/nonexistent"}', '{"id":"x"}', '{"path":"/etc/passwd"}', '{"name":"claude_key","value":"x"}', '{"job":"x"}', '{"install":"x","source":"x"}', "\u0000\u0000", "x".repeat(70000), '{"a":'.repeat(2000), '{"id":1,"fields":{"f:a":[1,2]},"act":"answer","value":"9e9"}'];

  test("random methods, paths, headers and bodies never crash, hang or give status 500", async () => {
    const rng = new Rng(7);
    const unsafe = new Set(["close", "act", "open", "setting", "firststart", "reveal"]);
    const jobs: Promise<void>[] = [];
    let n = 0;
    for (let i = 0; i < runs(300); i++) {
      const path = "/" + Array.from({ length: rng.int(0, 5) }, () => rng.pick(SEGMENTS)).join("/");
      if (path.split("/").some((s) => unsafe.has(s))) continue;
      const query = rng.bool(0.7) ? `${rng.bool(0.9) ? "?t=" + app.token : "?t=nope"}${rng.bool(0.5) ? "&p=" + rng.pick(["/", "..", "%00", "~", "/etc", "x".repeat(200)]) : ""}${rng.bool(0.2) ? "&" + rng.string("%=&;ab", 1, 8) : ""}` : "";
      const body = rng.pick(BODIES);
      const extra = Array.from({ length: rng.int(0, 3) }, () => rng.pick(HEADERS) + "\r\n").join("");
      const host = rng.bool(0.9) ? HOST() : rng.pick(["Host: evil\r\n", "", "Host: 127.0.0.1\r\n"]);
      const method = rng.pick(METHODS);
      const cut = rng.bool(0.15);
      const text = `${method} ${path}${query} HTTP/1.1\r\n${host}${extra}Content-Length: ${Buffer.byteLength(body) + (cut ? 50 : 0)}\r\nConnection: close\r\n\r\n${body}`;
      jobs.push(
        raw(text, { wait: cut ? 400 : 4000 }).then((r) => {
          n++;
          if (r.status === 0 && !cut) return;
          expect(r.status, text.slice(0, 200)).not.toBe(500);
          if (r.status >= 400) expect(r.head + r.body).not.toContain(app.token);
          expect(r.body, text.slice(0, 200)).not.toMatch(/\n\s+at .*(\.ts|\.js):\d+/);
        }),
      );
      if (jobs.length >= 25) await Promise.all(jobs.splice(0));
    }
    await Promise.all(jobs);
    expect(n).toBeGreaterThan(100);
    expect(errors).toEqual([]);
    await alive();
  });

  test("many parallel requests all end", async () => {
    const targets = ["/api/state", "/api/commands", "/api/tab?name=analysis", "/api/dirs?p=/", "/api/sessions.json", "/nope"];
    const all: Reply[] = [];
    for (let round = 0; round < runs(1); round++) all.push(...(await Promise.all(Array.from({ length: 150 }, (_, i) => get(withToken(targets[i % targets.length]!))))));
    expect(all.filter((r) => !(r.status > 0 && r.closed)).map((r) => r.head.slice(0, 80))).toEqual([]);
    expect(all.filter((r) => r.status >= 500)).toEqual([]);
  });
});

describe("the event stream", () => {
  test("200 streams that open and close leave no listener behind", async () => {
    const before = sseCount();
    for (let round = 0; round < 4; round++) {
      const sockets = await Promise.all(
        Array.from({ length: 50 }, () => new Promise<ReturnType<typeof connect>>((done) => {
          const s = connect(app.port, "127.0.0.1", () => {
            s.write(`GET /events?t=${app.token} HTTP/1.1\r\n${HOST()}\r\n`);
            s.once("data", () => done(s));
          });
          s.on("error", () => {});
        })),
      );
      for (const s of sockets) s.destroy();
      await new Promise((d) => setTimeout(d, 100));
      session.bus.emit({ type: "delta", kind: "text", text: "x" });
    }
    await new Promise((d) => setTimeout(d, 200));
    expect(sseCount()).toBe(before);
    expect(errors).toEqual([]);
    await alive();
  });

  test("a client that never reads does not block other clients and the server drops it", async () => {
    const slow = connect(app.port, "127.0.0.1", () => slow.write(`GET /events?t=${app.token} HTTP/1.1\r\n${HOST()}\r\n`));
    let closed = false;
    slow.on("error", () => {});
    slow.on("close", () => (closed = true));
    slow.pause();
    await new Promise((d) => setTimeout(d, 100));
    const big = "y".repeat(200_000);
    for (let i = 0; i < 150; i++) session.bus.emit({ type: "delta", kind: "text", text: big });
    const t = performance.now();
    const r = await get(withToken("/api/state"));
    expect(r.status).toBe(200);
    withinMs(performance.now() - t, 2000);
    slow.resume();
    for (let i = 0; i < 40 && !closed; i++) await new Promise((d) => setTimeout(d, 50));
    expect(closed).toBe(true);
    await alive();
  });
});

describe("the app server with wrongly typed JSON", () => {
  const ROUTES = ["open", "firststart", "firststart/claude", "firststart/local", "doctor", "setting", "setting/reset", "setting/remove", "adapters/plan", "adapters/review", "adapters/drop", "programs/plan", "programs/run", "programs/stop", "choose-folder", "session-rename", "session-remove", "session-reveal", "reveal", "send", "stop", "mode", "act"];
  const KEYS = ["text", "now", "mode", "id", "folder", "adapter", "sample", "name", "value", "scope", "confirm", "key", "model", "source", "install", "action", "path", "confirmed", "job", "fields", "act", "plan", "qid", "fid", "start", "all", "json", "body"];
  const VALUES: unknown[] = [null, 0, -1, 1.5, "", "x", "../..", "/nonexistent/x", [], {}, [1, "a"], { a: 1 }, { "f:a": [1] }, false, "9".repeat(5000), "\u0000", "\ud800", { a: { b: { c: [] } } }, "__proto__", { __proto__: { polluted: 1 } }];

  test("every route answers a typed body with a clear status and no stack trace", async () => {
    const home2 = mkdtempSync(join(tmpdir(), "cuvette-fuzz-app-home2-"));
    const oldHomeDir = process.env.HOME;
    process.env.HOME = home2;
    const fake = new FakeSession();
    const other = await startApp({
      session: fake,
      env: { ANTHROPIC_API_KEY: "sk-ant-test-0000000000000000000000" },
      checkKey: async () => ({ ok: false, text: "mock" }),
      doctor: async () => [],
      fetch: (async () => new Response("{}", { status: 500 })) as typeof fetch,
      makeSession: async () => new FakeSession(),
    });
    try {
      const rng = new Rng(11);
      const bad: string[] = [];
      for (let i = 0; i < runs(400); i++) {
        const route = rng.pick(ROUTES);
        const body: Record<string, unknown> = {};
        for (let k = rng.int(0, 5); k > 0; k--) body[rng.pick(KEYS)] = rng.pick(VALUES);
        const r = await fetch(`http://127.0.0.1:${other.port}/api/${route}`, { method: "POST", headers: { "x-token": other.token, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
        const text = await r.text();
        if ((r.status >= 500 && r.status !== 501) ||/\n\s+at .*(\.ts|\.js):\d+/.test(text) || text.includes(other.token)) bad.push(`${route} ${JSON.stringify(body).slice(0, 120)} -> ${r.status} ${text.slice(0, 120)}`);
      }
      expect(bad).toEqual([]);
      expect(errors).toEqual([]);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      expect((await fetch(`http://127.0.0.1:${other.port}/api/state`, { headers: { "x-token": other.token } })).status).toBe(200);
    } finally {
      await other.close();
      process.env.HOME = oldHomeDir;
      rmSync(home2, { recursive: true, force: true });
      rmSync(fake.dir, { recursive: true, force: true });
    }
  });
});

describe("the step graph routes", () => {
  test("the graph routes in the app answer a bad body with status 400 or 413", async () => {
    const post = (body: string) => raw(`POST /graph/api/send?t=${app.token} HTTP/1.1\r\n${HOST()}Content-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`);
    for (const body of ["null", "[]", "{", "7"]) {
      const r = await post(body);
      expect(r.status, body).toBe(400);
      expect(r.body).not.toContain("Cannot read");
    }
    expect((await post("x".repeat(100 * 1024))).status).toBe(413);
    await alive();
  });

  test("the stand-alone graph window gets status 400 for a bad request target and status 413 for a large body", async () => {
    const { startWindow } = await import("../src/server/window.ts");
    const w = await startWindow(session as never);
    const port = Number(new URL(w.url).port);
    const token = new URL(w.url).searchParams.get("t")!;
    const send = (data: string) =>
      new Promise<string>((done) => {
        let out = "";
        const s = connect(port, "127.0.0.1", () => s.write(data));
        s.on("data", (c) => (out += c));
        s.on("close", () => done(out));
        s.on("error", () => done(out));
        setTimeout(() => s.destroy(), 3000);
      });
    try {
      expect(await send(`GET // HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`)).toMatch(/^HTTP\/1.1 400/);
      const big = "x".repeat(70 * 1024);
      expect(await send(`POST /api/send?t=${token} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nContent-Length: ${big.length}\r\nConnection: close\r\n\r\n${big}`)).toMatch(/^HTTP\/1.1 413/);
      expect(await send(`POST /api/send?t=${token} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nContent-Length: 4\r\nConnection: close\r\n\r\nnull`)).toMatch(/^HTTP\/1.1 400/);
      expect(errors).toEqual([]);
    } finally {
      w.close();
    }
  });
});

describe("files that the app serves", () => {
  test("a broken image, a folder, an empty file and a file without read access get a clear status", async () => {
    const dir = session.cwd;
    writeFileSync(join(dir, "broken.png"), "not a png");
    writeFileSync(join(dir, "empty.png"), "");
    writeFileSync(join(dir, "closed.txt"), "closed");
    mkdirSync(join(dir, "folder.png"), { recursive: true });
    chmodSync(join(dir, "closed.txt"), 0);
    const file = (name: string, q = "") => get(withToken(`/api/file?p=${encodeURIComponent(join(dir, name))}${q}`));
    try {
      for (const [name, q] of [["broken.png", "&w=100"], ["empty.png", "&w=100"], ["broken.png", "&w=1e9"], ["broken.png", "&w=-5"], ["broken.png", "&download=1"], ["folder.png", ""], ["folder.png", "&w=100"], ["closed.txt", ""], ["nothing.png", "&w=100"]] as const) {
        const r = await file(name, q);
        expect(r.status, name + q).toBeLessThan(500);
        expect(r.closed).toBe(true);
        expect(r.body).not.toMatch(/\n\s+at .*(\.ts|\.js):\d+/);
        expect(r.body).not.toContain(dir);
      }
    } finally {
      chmodSync(join(dir, "closed.txt"), 0o644);
    }
    await alive();
    expect(errors).toEqual([]);
  });
});

describe("the app server while sessions open and close", () => {
  test("parallel open, close, send and stream requests never crash the server", async () => {
    const folder = mkdtempSync(join(tmpdir(), "cuvette-fuzz-app-folder-"));
    const made: FakeSession[] = [];
    const other = await startApp({
      env: { ANTHROPIC_API_KEY: "sk-ant-test-0000000000000000000000" },
      makeSession: async () => {
        await new Promise((d) => setTimeout(d, 5));
        const s = new FakeSession();
        made.push(s);
        return s;
      },
    });
    const base = `http://127.0.0.1:${other.port}`;
    const call = (path: string, body?: unknown) => fetch(`${base}${path}`, { method: body === undefined ? "GET" : "POST", headers: { "x-token": other.token }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) }).then(async (r) => ({ status: r.status, text: await r.text() }));
    try {
      const rng = new Rng(23);
      const ops: (() => Promise<{ status: number; text: string }>)[] = [
        () => call("/api/open", { folder }),
        () => call("/api/open", { folder: folder + "/" }),
        () => call("/api/close", {}),
        () => call("/api/send", { text: "hello" }),
        () => call("/api/stop", {}),
        () => call("/api/mode", { mode: "plan" }),
        () => call("/api/state"),
        () => call("/api/tab?name=analysis"),
        () => call("/api/tab?name=results"),
        () => call("/api/tab?name=decisions"),
        () => call("/api/tab?name=record"),
        () => call("/api/act", { id: 1, act: "answer", value: "0" }),
        async () => {
          const ac = new AbortController();
          const r = await fetch(`${base}/events`, { headers: { "x-token": other.token }, signal: ac.signal });
          const reader = r.body!.getReader();
          await reader.read();
          ac.abort();
          return { status: r.status, text: "" };
        },
      ];
      const bad: string[] = [];
      for (let round = 0; round < runs(40); round++) {
        const batch = Array.from({ length: rng.int(2, 8) }, () => rng.pick(ops)());
        for (const r of await Promise.allSettled(batch)) {
          if (r.status === "rejected") {
            if (!/abort/i.test(String(r.reason))) bad.push(String(r.reason));
          } else if (r.value.status >= 500 || /\n\s+at .*(\.ts|\.js):\d+/.test(r.value.text)) bad.push(`${r.value.status} ${r.value.text.slice(0, 100)}`);
        }
        await new Promise((d) => setTimeout(d, rng.int(0, 15)));
      }
      expect(bad).toEqual([]);
      expect(errors).toEqual([]);
      expect((await call("/api/state")).status).toBe(200);
    } finally {
      await other.close();
      for (const s of made) rmSync(s.dir, { recursive: true, force: true });
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
