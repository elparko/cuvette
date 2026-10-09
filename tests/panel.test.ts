import { spawn } from "node:child_process";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { existsSync, mkdtempSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { Session } from "../src/core/session.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { startWindow } from "../src/server/window.ts";

let session: Session | undefined;
const closers: (() => void)[] = [];
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-panel-"));
});
afterEach(async () => {
  while (closers.length) closers.pop()!();
  await session?.close();
  session = undefined;
});

async function open(provider: FakeProvider, extra: Record<string, unknown> = {}) {
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false }, ...extra });
  session.decisions.applySetup({});
  session.decisions.change("method", "Default");
  const w = await startWindow(session, { port: 0 });
  closers.push(w.close);
  const u = new URL(w.url);
  const token = u.searchParams.get("t")!;
  const get = async (path: string) => (await fetch(`${u.origin}${path}${path.includes("?") ? "&" : "?"}t=${token}`)).json() as Promise<any>;
  const post = (path: string, body: unknown) => fetch(`${u.origin}${path}?t=${token}`, { method: "POST", body: JSON.stringify(body) });
  return { u, token, get, post };
}

async function until<T>(fn: () => Promise<T | undefined | false>, tries = 300): Promise<T> {
  for (let i = 0; i < tries; i++) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("timed out");
}

describe("panel routes", () => {
  test("send puts entries in the feed and the cursor skips old ones", async () => {
    const p = await open(new FakeProvider([{ text: "Hello from the agent." }]));
    const res = await p.post("/api/send", { text: "hi" });
    expect(res.status).toBe(200);
    const feed = await until(async () => {
      const f = await p.get("/api/feed?since=0");
      return f.entries.some((e: any) => e.kind === "assistant") && !f.busy ? f : undefined;
    });
    expect(feed.entries.find((e: any) => e.kind === "user").text).toBe("hi");
    expect(feed.entries.find((e: any) => e.kind === "assistant").text).toBe("Hello from the agent.");
    expect(feed.mode).toBe("watch");
    const again = await p.get(`/api/feed?since=${feed.next}`);
    expect(again.entries).toEqual([]);
    expect(again.next).toBe(feed.next);
    expect((await p.post("/api/send", { text: "  " })).status).toBe(400);
  });

  test("send while busy returns 409", async () => {
    const p = await open(new FakeProvider([{ calls: [{ name: "count", args: { input: "x", method: "Default" } }] }, { text: "ok" }]), { settings: { guidance: false, permissions: { count: "ask" } } });
    await p.post("/api/send", { text: "count" });
    await until(async () => (await p.get("/api/feed")).pendingPermissions.length > 0);
    expect((await p.post("/api/send", { text: "again" })).status).toBe(409);
    const { pendingPermissions } = await p.get("/api/feed");
    await p.post("/api/permission", { rid: pendingPermissions[0].rid, ok: false });
    await until(async () => !(await p.get("/api/feed")).busy);
  });

  test("permission round trip", async () => {
    const p = await open(new FakeProvider([{ calls: [{ name: "count", args: { input: "x", method: "Default" } }] }, { text: "ok" }]), { settings: { guidance: false, permissions: { count: "ask" } } });
    await p.post("/api/send", { text: "count" });
    const feed = await until(async () => {
      const f = await p.get("/api/feed");
      return f.pendingPermissions.length ? f : undefined;
    });
    const perm = feed.pendingPermissions[0];
    expect(perm.tool).toBe("count");
    expect((await p.post("/api/permission", { rid: "nope", ok: true })).status).toBe(404);
    expect((await p.post("/api/permission", { rid: perm.rid, ok: true, note: "go" })).status).toBe(200);
    const done = await until(async () => {
      const f = await p.get("/api/feed?since=0");
      return !f.busy && f.entries.some((e: any) => e.kind === "assistant") ? f : undefined;
    });
    expect(done.pendingPermissions).toEqual([]);
    expect(done.entries.some((e: any) => e.kind === "tool_result" && e.tool === "count")).toBe(true);
    expect(done.entries.some((e: any) => e.kind === "permission" && /allowed/.test(e.text))).toBe(true);
  });

  test("follow round trip and mode change", async () => {
    const p = await open(new FakeProvider([{ calls: [{ name: "count", args: { input: "/data/a.tif", method: "Default" } }] }, { text: "done" }]), { mode: "follow" });
    expect((await p.post("/api/mode", { mode: "bogus" })).status).toBe(400);
    expect((await p.get("/api/feed")).mode).toBe("follow");
    await p.post("/api/send", { text: "count" });
    const feed = await until(async () => {
      const f = await p.get("/api/feed");
      return f.pendingFollow.length ? f : undefined;
    });
    expect(feed.pendingFollow[0].text).toMatch(/Analyze > Count/);
    expect((await p.post("/api/follow", { step: 99 })).status).toBe(404);
    expect((await p.post("/api/follow", { step: feed.pendingFollow[0].step, note: "count = 64" })).status).toBe(200);
    const done = await until(async () => {
      const f = await p.get("/api/feed?since=0");
      return !f.busy && f.entries.some((e: any) => e.kind === "assistant") ? f : undefined;
    });
    expect(done.pendingFollow).toEqual([]);
    expect(done.entries.some((e: any) => e.kind === "follow_step" && e.status === "done")).toBe(true);
    expect((await p.post("/api/mode", { mode: "teach" })).status).toBe(200);
    expect((await p.get("/api/feed")).mode).toBe("teach");
  });

  test("the panel page and every panel route need the token", async () => {
    const p = await open(new FakeProvider([{ text: "x" }]));
    const html = await (await fetch(`${p.u.origin}/panel?t=${p.token}`)).text();
    expect(html).toContain(JSON.stringify(p.token));
    expect(html).toContain("prefers-color-scheme: dark");
    expect(html).not.toMatch(/(src|href)="https?:/);
    for (const path of ["/panel", "/api/feed"]) expect((await fetch(p.u.origin + path)).status).toBe(401);
    for (const path of ["/api/send", "/api/permission", "/api/follow", "/api/mode", "/api/stop"]) {
      expect((await fetch(p.u.origin + path, { method: "POST", body: "{}" })).status).toBe(401);
    }
    expect((await p.post("/api/stop", {})).status).toBe(200);
  });
});

const smilePython = [process.env.SMILE_MSI_PYTHON, join(homedir(), "Code/SMILE-MSI/.venv/bin/python")].find((x) => x && existsSync(x));

describe("panel.py", () => {
  test.skipIf(!process.env.CUVETTE_LIVE || !smilePython)("starts in SMILE MSI and polls the feed", async () => {
    const p = await open(new FakeProvider([{ text: "x" }]));
    const hits: string[] = [];
    const proxy = createServer(async (req, res) => {
      hits.push(req.url ?? "");
      try {
        const up = await fetch(p.u.origin + req.url);
        res.writeHead(up.status, { "content-type": "application/json" });
        res.end(await up.text());
      } catch {
        res.destroy();
      }
    });
    await new Promise<void>((r) => proxy.listen(0, "127.0.0.1", r));
    closers.push(() => {
      proxy.close();
      proxy.closeAllConnections();
    });
    const panelUrl = `http://127.0.0.1:${(proxy.address() as AddressInfo).port}/panel?t=${p.token}`;
    const child = spawn(smilePython!, [join(__dirname, "../catalog/smile-msi/panel/panel.py"), panelUrl], {
      env: { ...process.env, QT_QPA_PLATFORM: "offscreen" },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let err = "";
    child.stderr.on("data", (c) => (err += c));
    closers.push(() => child.kill());
    await until(async () => (hits.filter((h) => h.startsWith("/api/feed")).length >= 2 ? true : undefined), 3000);
    expect(err).not.toContain("Traceback");
  }, 90000);
});
