import { afterEach, describe, expect, test } from "vitest";
import { FakeSession } from "../src/ui/fake-session.ts";
import { ntfyNotifier, setWindowUrl } from "../src/server/notify.ts";
import { startWindow, tokenOk } from "../src/server/window.ts";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, request as httpRequest } from "node:http";
import type { AddressInfo } from "node:net";

const closers: (() => void)[] = [];
afterEach(() => {
  while (closers.length) closers.pop()!();
});

async function open() {
  const s = new FakeSession({ delayMs: 0 });
  const w = await startWindow(s, { port: 0 });
  closers.push(w.close);
  const u = new URL(w.url);
  return { s, w, base: u.origin, token: u.searchParams.get("t")! };
}

async function runToQuestion(s: FakeSession) {
  const run = s.send("go");
  await new Promise<void>((resolve) => {
    const off = s.bus.on((e) => {
      if (e.type === "permission") {
        off();
        s.respondPermission(e.rid, true);
        resolve();
      }
    });
  });
  while (s.questions.open().length === 0) await new Promise((r) => setTimeout(r, 10));
  return { run };
}

describe("window server", () => {
  test("a request for always allow on a tool in the no-always set is a single allow", async () => {
    const { s, base, token } = await open();
    const calls: unknown[][] = [];
    s.respondPermission = (...a: unknown[]) => void calls.push(a);
    for (const [rid, tool] of [["r1", "run_command"], ["r2", "run_script"]]) s.bus.emit({ type: "permission", rid, tool, args: {}, touches: "files" });
    const post = (rid: string) => fetch(`${base}/api/permission?t=${token}`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ rid, ok: true, always: true }) });
    expect((await post("r1")).status).toBe(200);
    expect((await post("r2")).status).toBe(200);
    expect(calls).toEqual([["r1", true, "", false], ["r2", true, "", true]]);
  });

  test("a call that Cuvette blocked does not show as a failed call with the text for the model", async () => {
    const { s, base, token } = await open();
    s.record.append("tool_call", { callId: "a", tool: "read_file", args: { path: "/home/.cuvette/settings.json" } });
    s.record.append("blocked", { callId: "a", tool: "read_file", reason: "The agent tried to use X. Cuvette blocked it.", by: "path rule" });
    s.record.append("tool_result", { callId: "a", tool: "read_file", ok: false, error: "This path is in the Cuvette home folder. Ask the scientist to name the folder in the request." });
    s.record.append("tool_result", { callId: "b", tool: "list_dir", ok: false, error: "X is not a folder" });
    const state = await (await fetch(`${base}/api/state?t=${token}`)).json();
    expect(state.failed.map((f: { tool: string }) => f.tool)).toEqual(["list_dir"]);
  });

  test("serves one self-contained page with the token", async () => {
    const { w, base, token } = await open();
    expect(w.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/\?t=.{20,}$/);
    const res = await fetch(w.url);
    const html = await res.text();
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(html).toContain(JSON.stringify(token));
    expect(html).toContain("prefers-color-scheme: dark");
    expect(html).not.toMatch(/(src|href)="https?:/);
    expect((await fetch(base + "/")).status).toBe(401);
    expect((await fetch(base + "/api/state?t=wrong")).status).toBe(401);
  });

  test("rejects a foreign Host header", async () => {
    const { base, token } = await open();
    const status = await new Promise<number>((resolve, reject) => {
      const req = httpRequest(`${base}/api/state?t=${token}`, { headers: { host: "evil.example" } }, (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      });
      req.on("error", reject);
      req.end();
    });
    expect(status).toBe(403);
  });

  test("state holds nodes, edges, stale marks, trail, questions and decisions", async () => {
    const { s, base, token } = await open();
    await runToQuestion(s);
    const q = s.questions.open()[0]!;
    const state = await (await fetch(`${base}/api/state?t=${token}`)).json();
    expect(state.nodes.map((n: { id: string }) => n.id)).toEqual(["n1", "n2"]);
    expect(state.edges).toEqual([["n1", "n2"]]);
    expect(state.questions[0].qid).toBe(q.qid);
    expect(state.decisions.map((d: { key: string }) => d.key)).toContain("tolerance_ppm");
    expect(state.trail.length).toBeGreaterThan(0);
    s.setDecision("normalization", "RMS");
    const after = await (await fetch(`${base}/api/state?t=${token}`)).json();
    expect(after.stale).toContain("n2");
  });

  test("POST /api/answer answers an open question", async () => {
    const { s, base, token } = await open();
    void runToQuestion(s);
    while (s.questions.open().length === 0) await new Promise((r) => setTimeout(r, 10));
    const q = s.questions.open()[0]!;
    const bad = await fetch(`${base}/api/answer?t=${token}`, { method: "POST", body: JSON.stringify({ qid: "zz", value: 1 }) });
    expect(bad.status).toBe(404);
    const ok = await fetch(`${base}/api/answer?t=${token}`, { method: "POST", body: JSON.stringify({ qid: q.qid, value: 0.8 }) });
    expect(ok.status).toBe(200);
    expect(s.record.entries(["answer"])[0]!.data.value).toBe(0.8);
    const noToken = await fetch(`${base}/api/answer`, { method: "POST", body: "{}" });
    expect(noToken.status).toBe(401);
  });

  test("serves blobs by hash and nothing else", async () => {
    const { s, base, token } = await open();
    const sha = s.record.putBlob(Buffer.from("png-bytes"), ".png");
    const res = await fetch(`${base}/api/blob/${sha}?t=${token}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(await res.text()).toBe("png-bytes");
    expect((await fetch(`${base}/api/blob/..%2F..%2Fetc%2Fpasswd?t=${token}`)).status).toBe(404);
    expect((await fetch(`${base}/api/blob/${"0".repeat(64)}?t=${token}`)).status).toBe(404);
  });

  test("streams bus events over SSE", async () => {
    const { s, base, token } = await open();
    const res = await fetch(`${base}/events?t=${token}`);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    const reader = res.body!.getReader();
    await reader.read();
    s.record.append("note", { text: "hello window" });
    const chunk = new TextDecoder().decode((await reader.read()).value);
    expect(chunk).toContain('"type":"entry"');
    expect(chunk).toContain("hello window");
    await reader.cancel();
  });
});

describe("ntfy notifier", () => {
  test("posts the question title and the window URL", async () => {
    const got: { body: string; title?: string; click?: string }[] = [];
    const srv = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        got.push({ body, title: req.headers.title as string, click: req.headers.click as string });
        res.end("ok");
      });
    });
    await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
    closers.push(() => srv.close());
    const topic = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/my-topic`;
    const q = { qid: "q1", title: "Which cutoff?", text: "Pick one." } as never;
    setWindowUrl(undefined);
    await ntfyNotifier(topic)(q);
    expect(got[0]!.body).toBe("Which cutoff?\nPick one.");
    expect(got[0]!.click).toBeUndefined();
    setWindowUrl("http://127.0.0.1:9/?t=abc");
    await ntfyNotifier(topic)(q);
    expect(got[1]!.body).toContain("http://127.0.0.1:9/?t=abc");
    expect(got[1]!.click).toBe("http://127.0.0.1:9/?t=abc");
    setWindowUrl(undefined);
  });

  test("does not throw when the topic is unreachable", async () => {
    await expect(ntfyNotifier("http://127.0.0.1:1/x")({ title: "t", text: "" } as never)).resolves.toBeUndefined();
  });
});

test("the token check compares the full value", () => {
  expect(tokenOk("abc", "abc")).toBe(true);
  expect(tokenOk("abd", "abc")).toBe(false);
  expect(tokenOk("ab", "abc")).toBe(false);
  expect(tokenOk(undefined, "abc")).toBe(false);
  expect(tokenOk(["abc"], "abc")).toBe(false);
});

test("the window server sandboxes blobs, refuses a foreign origin and survives a missing blob file", async () => {
  const s = new FakeSession({ delayMs: 0 });
  const w = await startWindow(s, { port: 0 });
  closers.push(w.close);
  const u = new URL(w.url);
  const token = u.searchParams.get("t")!;
  const src = join(mkdtempSync(join(tmpdir(), "cuvette-hard-")), "fig.svg");
  writeFileSync(src, "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");
  const sha = s.record.putBlob(src, ".svg");
  const res = await fetch(`${u.origin}/api/blob/${sha}?t=${token}`);
  expect(res.status).toBe(200);
  expect(res.headers.get("content-security-policy")).toBe("sandbox");
  expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  await res.text();
  expect((await fetch(`${u.origin}/api/state?t=${token}`, { headers: { origin: "http://evil.example" } })).status).toBe(403);
  const { rmSync } = await import("node:fs");
  rmSync(s.record.blobPath(sha)!);
  const gone = await fetch(`${u.origin}/api/blob/${sha}?t=${token}`);
  expect(gone.status).toBe(404);
  const state = await fetch(`${u.origin}/api/state?t=${token}`);
  expect(state.status).toBe(200);
  expect(state.headers.get("referrer-policy")).toBe("no-referrer");
  const page = await fetch(`${u.origin}/?t=${token}`);
  expect(page.headers.get("referrer-policy")).toBe("no-referrer");
  await Promise.all([state.text(), page.text()]);
});
