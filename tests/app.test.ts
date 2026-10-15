import { chmodSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { APP_CLOSE_LIMIT_MS, startApp, type AppHandle } from "../src/server/app.ts";
import { cardHtml, decisionsHtml, itemHtml, resultsHtml, runHtml, sessionsHtml, sheetHtml, splitRuns, WEB_CARDS, type Slot } from "../src/server/app-html.ts";
import type { Item } from "../src/ui/items.ts";
import { WebView } from "../src/server/app-view.ts";
import { KEY_ANT_LOGIN, planInit, sheetRows, type Card } from "../src/ui/cards.ts";
import { CARDS, COMMANDS } from "../src/ui/parity.ts";
import { FakeSession } from "../src/ui/fake-session.ts";
import { until } from "../src/tui/testing.ts";
import type { Question } from "../src/core/types.ts";
import { claudeKey } from "../src/core/credentials.ts";

const home = mkdtempSync(join(tmpdir(), "cuvette-app-home-"));
const oldHome = process.env.CUVETTE_HOME;
beforeAll(() => {
  process.env.CUVETTE_HOME = home;
});
afterAll(() => {
  process.env.CUVETTE_HOME = oldHome;
});

const env = { ANTHROPIC_API_KEY: "sk-ant-test-0000000000000000000000" };

function client(app: AppHandle) {
  const base = `http://127.0.0.1:${app.port}`;
  return {
    base,
    get: (p: string) => fetch(`${base}/${p}${p.includes("?") ? "&" : "?"}t=${app.token}`),
    post: (p: string, body: unknown) => fetch(`${base}/${p}`, { method: "POST", headers: { "content-type": "application/json", "x-token": app.token }, body: JSON.stringify(body) }),
  };
}

async function events(app: AppHandle): Promise<{ msgs: any[]; close(): void }> {
  const msgs: any[] = [];
  const ac = new AbortController();
  const res = await fetch(`http://127.0.0.1:${app.port}/events?t=${app.token}`, { signal: ac.signal });
  const reader = res.body!.getReader();
  let buf = "";
  void (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += new TextDecoder().decode(value);
        let i;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, i);
          buf = buf.slice(i + 2);
          if (chunk.startsWith("data: ")) msgs.push(JSON.parse(chunk.slice(6)));
        }
      }
    } catch {}
  })();
  return { msgs, close: () => ac.abort() };
}

let app: AppHandle | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("the app server", () => {
  test("binds to 127.0.0.1 and needs the token, the right host and the right origin", async () => {
    app = await startApp({ session: new FakeSession(), env });
    const c = client(app);
    expect(app.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/\?t=/);
    expect((await fetch(`${c.base}/`)).status).toBe(401);
    const wrong = await fetch(`${c.base}/?t=wrong`);
    expect(wrong.status).toBe(401);
    expect(wrong.headers.get("content-type")).toContain("text/html");
    expect(await wrong.text()).toContain("Use the link that <code>cuvette app</code> shows in the terminal.");
    expect(await (await fetch(`${c.base}/api/state?t=wrong`)).json()).toEqual({ error: "missing or wrong token" });
    const page = await c.get("");
    expect(page.status).toBe(200);
    expect(page.headers.get("access-control-allow-origin")).toBeNull();
    const html = await page.text();
    expect(html).toContain("<title>Cuvette</title>");
    expect(html).not.toMatch(/https?:\/\/(127\.0\.0\.1|localhost)/);
    expect((await fetch(`${c.base}/events`)).status).toBe(401);
    const evil = await fetch(`${c.base}/api/send`, { method: "POST", headers: { "x-token": app.token, origin: "http://evil.example" }, body: "{}" });
    expect(evil.status).toBe(403);
    const status = await new Promise<number>((done) => {
      const req = httpRequest(`${c.base}/?t=${app!.token}`, { headers: { host: "evil.example" } }, (res) => done(res.statusCode ?? 0));
      req.end();
    });
    expect(status).toBe(403);
  });

  test("a full turn: message, permission card, decision card, steps and answer", async () => {
    const s = new FakeSession({ delayMs: 1 });
    app = await startApp({ session: s, env });
    const c = client(app);
    const ev = await events(app);
    await until(() => ev.msgs.some((m) => m.t === "reset"));
    expect((await c.post("api/send", { text: "compare endo and epi" })).status).toBe(200);
    await until(() => ev.msgs.some((m) => m.t === "cards" && m.html.includes("Permission needed: run_script")));
    const perm = ev.msgs.filter((m) => m.t === "cards").at(-1)!.html as string;
    expect(perm).toContain("AUC per feature");
    expect(perm).toContain("Show the code");
    const id = Number(/data-card="(\d+)" data-type="permission"/.exec(perm)![1]);
    expect((await c.post("api/act", { id, act: "allow", fields: {} })).status).toBe(200);
    await until(() => ev.msgs.some((m) => m.t === "cards" && m.html.includes("Your decision: Which AUC cutoff")));
    const q = ev.msgs.filter((m) => m.t === "cards").at(-1)!.html as string;
    expect(q).toContain("0.7 (14 features) (recommended)");
    const qid = Number(/data-card="(\d+)" data-type="question"/.exec(q)![1]);
    await c.post("api/act", { id: qid, act: "answer", value: "1", fields: {} });
    await until(() => s.sent.length === 1 && ev.msgs.some((m) => m.t === "status" && m.state === "idle" && ev.msgs.some((x) => x.t === "append" && x.html.includes("14 features differ"))));
    const all = ev.msgs.filter((m) => m.t === "append").map((m) => m.html).join("");
    expect(all).toContain("Step 3");
    expect(all).toContain("api/file?p=");
    expect(all).toMatch(/<details class="line .*house/);
    const tab = await (await c.get("api/tab?name=record")).text();
    expect(tab).toContain("Read 90 of 90 bytes.");
    expect(all).toContain(`<pre class="wrap">Cutoff  Features`);
    ev.close();
  });

  test("a message during a turn goes in after the step, or now", async () => {
    const s = new FakeSession({ delayMs: 1 });
    app = await startApp({ session: s, env });
    const c = client(app);
    const ev = await events(app);
    await c.post("api/send", { text: "go" });
    await until(() => ev.msgs.some((m) => m.t === "cards" && m.html.includes("Permission needed")));
    await c.post("api/send", { text: "use RMS", now: false });
    await c.post("api/send", { text: "stop now", now: true });
    expect(s.steered.map((x) => [x.text, x.now])).toEqual([["use RMS", false], ["stop now", true]]);
    const stopped = await (await c.post("api/stop", {})).json();
    expect(stopped.dropped).toEqual(["use RMS", "stop now"]);
    expect(s.interrupts).toBeGreaterThan(0);
    await until(() => ev.msgs.some((m) => m.t === "append" && m.html.includes("The agent did not read these 2 messages") && String(m.html).includes("back in the input box")));
    ev.close();
  });

  test("/quit in the app shows a line when the terminal owns the session", async () => {
    const s = new FakeSession({ delayMs: 1 });
    app = await startApp({ session: s, env });
    const c = client(app);
    const ev = await events(app);
    await c.post("api/send", { text: "/quit" });
    await until(() => ev.msgs.some((m) => m.t === "append" && String(m.html).includes("This session belongs to the terminal. Type /quit there to leave.")));
    ev.close();
  });

  test("Stop keeps the streamed text and removes the open question card from the conversation", async () => {
    const s = new FakeSession({ delayMs: 100 });
    app = await startApp({ session: s, env });
    const c = client(app);
    const ev = await events(app);
    await c.post("api/send", { text: "go" });
    await until(() => ev.msgs.some((m) => m.t === "live" && m.text));
    await c.post("api/stop", {});
    await until(() => ev.msgs.some((m) => m.t === "status" && m.state === "idle"));
    await until(() => ev.msgs.some((m) => m.t === "append" && m.html.includes("not complete")));
    const all = ev.msgs.filter((m) => m.t === "append").map((m) => m.html).join("");
    expect(all).toMatch(/<div class="msg agent">.*I will/s);
    expect(all).toContain("Stopped. The reply above is not complete.");

    const q = new FakeSession({ delayMs: 1 });
    await app.close();
    app = await startApp({ session: q, env });
    const c2 = client(app);
    const ev2 = await events(app);
    await c2.post("api/send", { text: "go" });
    await until(() => ev2.msgs.some((m) => m.t === "cards" && m.html.includes("Permission needed")));
    const perm = ev2.msgs.filter((m) => m.t === "cards").at(-1)!.html as string;
    await c2.post("api/act", { id: Number(/data-card="(\d+)" data-type="permission"/.exec(perm)![1]), act: "allow", fields: {} });
    await until(() => ev2.msgs.some((m) => m.t === "cards" && m.html.includes('data-type="question"')));
    await c2.post("api/stop", {});
    await until(() => ev2.msgs.some((m) => m.t === "status" && m.state === "idle"));
    await until(() => !(ev2.msgs.filter((m) => m.t === "cards").at(-1)!.html as string).includes('data-type="question"'));
    expect(q.questions.open().length).toBe(1);
    ev.close();
    ev2.close();
  });

  test("files outside the session are not served", async () => {
    const s = new FakeSession();
    app = await startApp({ session: s, env });
    const c = client(app);
    expect((await c.get(`api/file?p=${encodeURIComponent("/etc/passwd")}`)).status).toBe(404);
    const sha = s.record.putBlob(Buffer.from("x"), ".txt");
    const ok = await c.get(`api/file?p=${encodeURIComponent(s.record.blobPath(sha)!)}&download=1`);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-disposition")).toContain("attachment");
  });

  test("a download of a file with a Unicode name works, and the app keeps running", async () => {
    const s = new FakeSession();
    app = await startApp({ session: s, env });
    const c = client(app);
    mkdirSync(s.workDir, { recursive: true });
    const f = join(s.workDir, "结果 é.csv");
    writeFileSync(f, "a,b\n1,2\n");
    const r = await c.get(`api/file?p=${encodeURIComponent(f)}&download=1`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-disposition")).toBe(`attachment; filename="__ _.csv"; filename*=UTF-8''%E7%BB%93%E6%9E%9C%20%C3%A9.csv`);
    expect(await r.text()).toBe("a,b\n1,2\n");
    expect((await c.get("api/state")).status).toBe(200);
  });

  test.skipIf(process.platform === "win32" || process.getuid?.() === 0)("a folder that the user cannot read gives a clear error in the folder list, the suggestion and the open", async () => {
    let made = 0;
    app = await startApp({ env, start: home, makeSession: async () => (made++, new FakeSession()) });
    const c = client(app);
    const locked = join(home, "locked");
    mkdirSync(locked, { recursive: true });
    chmodSync(locked, 0o000);
    try {
      for (const r of [await c.get(`api/dirs?p=${encodeURIComponent(locked)}`), await c.get(`api/suggest?p=${encodeURIComponent(locked)}`), await c.post("api/open", { folder: locked })]) {
        expect(r.status).toBe(403);
        expect((await r.json()).error).toBe(`Cuvette cannot read the folder ${locked}. Give your user read access to it, or choose another folder.`);
      }
      expect(made).toBe(0);
    } finally {
      chmodSync(locked, 0o755);
    }
  });

  test.skipIf(process.platform === "win32")("the folder list shows folder names without text-direction characters, and keeps the real names for navigation", async () => {
    app = await startApp({ env, start: home, makeSession: async () => new FakeSession() });
    const c = client(app);
    const parent = join(home, "bidi-list");
    const real = "plates\u202egpj.exe\u200f";
    mkdirSync(join(parent, real), { recursive: true });
    const d = await (await c.get(`api/dirs?p=${encodeURIComponent(parent)}`)).json();
    expect(d.dirs).toEqual([real]);
    expect(d.shown).toEqual(["platesgpj.exe"]);
    const inner = await (await c.get(`api/dirs?p=${encodeURIComponent(join(parent, d.dirs[0]))}`)).json();
    expect(inner.path).toBe(join(parent, real));
    expect(inner.parentShown).toBe(parent);
    expect(inner.shown).toEqual([]);
  });

  test("an empty folder gives no program suggestion, and /help in the app lists the keys of the app", async () => {
    const s = new FakeSession();
    app = await startApp({ session: s, env });
    const c = client(app);
    const empty = join(home, "empty");
    mkdirSync(empty, { recursive: true });
    expect(await (await c.get(`api/suggest?p=${encodeURIComponent(empty)}`)).json()).toEqual({ scanned: 0, matches: [] });
    const ev = await events(app);
    await c.post("api/send", { text: "/help" });
    await until(() => ev.msgs.some((m) => m.t === "append" && String(m.html).includes("Keys in the message box")));
    const html = ev.msgs.filter((m) => m.t === "append").map((m) => String(m.html)).join("");
    expect(html).toContain("Shift+Enter: new line");
    expect(html).not.toContain("Ctrl+C twice quits");
    ev.close();
  });

  test("with no session the app shows the start page and the folder list", async () => {
    app = await startApp({ env, start: home, makeSession: async () => new FakeSession() });
    const c = client(app);
    const st = await (await c.get("api/state")).json();
    expect(st.session).toBeNull();
    expect(st.setup).toBe(false);
    const dirs = await (await c.get(`api/dirs?p=${encodeURIComponent(home)}`)).json();
    expect(dirs.path).toBe(home);
    expect((await c.post("api/send", { text: "hi" })).status).toBe(409);
    expect((await c.post("api/open", { folder: home })).status).toBe(200);
    for (let i = 0; i < 1000 && (await (await c.get("api/state")).json()).session === null; i++) await new Promise((r) => setTimeout(r, 30));
    expect((await (await c.get("api/state")).json()).session).not.toBeNull();
  });

  test("the start page gets a program suggestion for a folder and opens with the chosen program", async () => {
    const picked: (string | undefined)[] = [];
    app = await startApp({ env, start: home, makeSession: async (o) => (picked.push(o.adapter), new FakeSession()) });
    const c = client(app);
    const data = join(home, "flow-data");
    mkdirSync(data, { recursive: true });
    writeFileSync(join(data, "a.fcs"), "FCS3.1");
    const r = await (await c.get(`api/suggest?p=${encodeURIComponent(data)}`)).json();
    expect(r.matches[0].adapter).toBe("flowkit");
    expect((await c.get(`api/suggest?p=${encodeURIComponent(join(home, "nowhere"))}`)).status).toBe(404);
    expect((await c.post("api/open", { folder: data, adapter: "flowkit" })).status).toBe(200);
    for (let i = 0; i < 1000 && !picked.length; i++) await new Promise((r) => setTimeout(r, 30));
    expect(picked).toEqual(["flowkit"]);
  });

  test("first start with no key and a Claude model asks for setup", async () => {
    app = await startApp({ env: {}, model: "claude", start: home, makeSession: async () => new FakeSession() });
    const st = await (await client(app).get("api/state")).json();
    expect(st.setup).toBe(claudeKey({}).from === "none");
  });

  test("after the user leaves setup, the state says not setup, also while the session opens", async () => {
    let finish: () => void = () => {};
    const gate = new Promise<void>((r) => (finish = r));
    app = await startApp({ env: {}, model: "claude", start: home, makeSession: async () => (await gate, new FakeSession()) });
    const c = client(app);
    const needs = claudeKey({}).from === "none";
    expect((await (await c.get("api/state")).json()).setup).toBe(needs);
    expect((await c.post("api/leave-setup", {})).status).toBe(200);
    expect((await c.post("api/open", { folder: home })).status).toBe(200);
    for (let i = 0; i < 1000 && !(await (await c.get("api/state")).json()).opening; i++) await new Promise((r) => setTimeout(r, 30));
    const st = await (await c.get("api/state")).json();
    expect(st.opening).toBe(true);
    expect(st.setup).toBe(false);
    finish();
  });

  const withoutKey = () => {
    const keep = process.env.CUVETTE_HOME;
    process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-app-nokey-"));
    return () => {
      process.env.CUVETTE_HOME = keep;
    };
  };

  test("setup comes back after the session closes with no key", async () => {
    const restore = withoutKey();
    try {
      app = await startApp({ env: {}, model: "claude", start: home, makeSession: async () => new FakeSession() });
      const c = client(app);
      const state = async () => (await (await c.get("api/state")).json());
      expect(claudeKey({}).from).toBe("none");
      await c.post("api/leave-setup", {});
      await c.post("api/open", { folder: home });
      for (let i = 0; i < 300 && !(await state()).session; i++) await new Promise((r) => setTimeout(r, 20));
      expect((await state()).setup).toBe(false);
      await c.post("api/close", {});
      expect((await state()).setup).toBe(true);
    } finally {
      restore();
    }
  });

  test("opening another session after leaving setup does not bring setup back while it opens", async () => {
    const restore = withoutKey();
    try {
      let slow = false;
      app = await startApp({
        env: {},
        model: "claude",
        start: home,
        makeSession: async () => {
          if (slow) await new Promise((r) => setTimeout(r, 300));
          return new FakeSession();
        },
      });
      const c = client(app);
      const state = async () => (await (await c.get("api/state")).json());
      await c.post("api/leave-setup", {});
      await c.post("api/open", { folder: home });
      for (let i = 0; i < 300 && !(await state()).session; i++) await new Promise((r) => setTimeout(r, 20));
      slow = true;
      const other = join(home, "other-folder");
      mkdirSync(other, { recursive: true });
      await c.post("api/open", { folder: other });
      const mid = await state();
      expect(mid.opening).toBe(true);
      expect(mid.setup).toBe(false);
    } finally {
      restore();
    }
  });

  test("the first-start answer has the ant auth login line, and the CLI waits longer than the install stop", async () => {
    app = await startApp({ env: {}, model: "claude", start: home, makeSession: async () => new FakeSession() });
    const fs = await (await client(app).post("api/firststart", {})).json();
    expect(fs.keyAntLogin).toBe(KEY_ANT_LOGIN);
    expect(APP_CLOSE_LIMIT_MS).toBeGreaterThan(6000);
  });

  test("the setup page uses the first-start choices and the doctor checks", async () => {
    const doctor = async () => [
      { id: "node", group: "Needed to start" as const, name: "Node", status: "ok" as const, detail: "version 24" },
      { id: "claude-key", group: "Needed to start" as const, name: "Claude API key", status: "ok" as const, detail: "saved" },
      { id: "java", group: "Tools" as const, name: "Java", status: "missing" as const, detail: "ImageJ needs it.", fix: { command: "brew install --cask temurin" } },
    ];
    const noOllama = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    app = await startApp({ env: {}, model: "claude", start: home, doctor, fetch: noOllama, checkKey: async () => ({ ok: false, text: "The key was refused." }), makeSession: async () => new FakeSession() });
    const c = client(app);
    const fs = await (await c.post("api/firststart", {})).json();
    expect(fs.choices.map((x: { id: string }) => x.id)).toEqual(["claude", "local"]);
    expect(fs.ollama.reachable).toBe(false);
    const bad = await c.post("api/firststart/claude", { key: "sk-ant-api03-" + "x".repeat(90) });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toContain("refused");
    const html = await (await c.post("api/doctor", {})).text();
    expect(html).toContain("Cuvette can start");
    expect(html).toContain("brew install --cask temurin");
    expect(html).not.toContain("Claude API key");
    expect(await (await c.post("api/doctor", { all: true })).text()).toContain("Claude API key");
  });

  test("settings change through the same registry and record events", async () => {
    const s = new FakeSession();
    app = await startApp({ session: s, env });
    const c = client(app);
    const html = await (await c.get("api/settings")).text();
    expect(html).toContain('data-setting="mode"');
    const r = await c.post("api/setting", { name: "mode", value: "follow", scope: "session" });
    expect(r.status).toBe(200);
    expect(s.mode).toBe("follow");
    expect(s.record.entries(["setting"]).at(-1)!.data).toMatchObject({ name: "mode", new: "follow", scope: "session" });
  });
});

test("a refused answer opens the question card again with the reason", async () => {
  const s = new FakeSession();
  s.answer = async () => {
    throw new Error("Answer must be a number.");
  };
  const view = new WebView(s, { token: "t", env, url: (p) => p, quit: async () => {} });
  const q: Question = { qid: "q5", session: s.id, decisionKey: "k", title: "Cutoff?", text: "", options: [{ value: 1, label: "1" }], evidence: "", status: "open", created: "" };
  view.openCard({ t: "question", q });
  const id = view.slots.find((x) => x.card.t === "question")!.id;
  await view.act(id, { act: "other", fields: { other: "abc" } });
  expect(view.cardsHtml()).toContain("Answer must be a number. Try again.");
  view.close();
});

describe("question sequence and /change in the app", () => {
  const mk = (s: FakeSession, qid: string, title: string, rec = 2): Question => ({ qid, session: s.id, decisionKey: "", title, text: "", options: [{ value: 1, label: "one" }, { value: 2, label: "two" }, { value: 3, label: "three" }], recommendation: { value: rec, reason: "r" }, evidence: "", status: "open", created: "" });
  const setup = () => {
    const s = new FakeSession();
    const view = new WebView(s, { token: "t", env, url: (p) => p, quit: async () => {} });
    const qs = [mk(s, "q1", "First"), mk(s, "q2", "Second"), mk(s, "q3", "Third")];
    s.askMany(qs);
    return { s, view };
  };
  const first = (view: WebView) => view.slots.find((x) => x.card.t === "question")!.id;

  test("shows one question at a time with progress and the recommendation pre-selected", async () => {
    const { s, view } = setup();
    let html = view.cardsHtml();
    expect(html).toContain("Question 1 of 3");
    expect(html).toContain("Your decision: First");
    expect(html).not.toContain("Your decision: Second");
    expect(html).toMatch(/btn primary" data-act="answer" data-value="1" data-qid="q1">two \(recommended\)/);
    expect(html).not.toContain('data-act="back"');
    await view.act(first(view), { act: "recommend", fields: {} });
    html = view.cardsHtml();
    expect(html).toContain("Question 2 of 3");
    expect(html).toContain("Your decision: Second");
    expect(html).toContain('data-act="back"');
    expect(s.questions.open().map((q) => q.qid)).toEqual(["q2", "q3"]);
    view.close();
  });

  test("Back reopens the earlier answer, Next goes forward, and a changed answer is recorded as a change", async () => {
    const { s, view } = setup();
    await view.act(first(view), { act: "answer", value: "0", fields: {} });
    await view.act(first(view), { act: "recommend", fields: {} });
    await view.act(first(view), { act: "back", fields: {} });
    let html = view.cardsHtml();
    expect(html).toContain("Question 2 of 3");
    expect(html).toContain("Your decision: Second");
    expect(html).toContain('data-act="next"');
    await view.act(first(view), { act: "back", fields: {} });
    html = view.cardsHtml();
    expect(html).toContain("Question 1 of 3");
    expect(html).toMatch(/btn primary" data-act="answer" data-value="0" data-qid="q1">one/);
    expect(html).not.toContain('data-act="back"');
    await view.act(first(view), { act: "next", fields: {} });
    expect(view.cardsHtml()).toContain("Your decision: Second");
    await view.act(first(view), { act: "back", fields: {} });
    await view.act(first(view), { act: "answer", value: "2", fields: {} });
    expect(s.record.entries(["answer"]).at(-1)!.data).toMatchObject({ qid: "q1", value: 3, changed: true, old: 1 });
    expect(view.cardsHtml()).toContain("Question 2 of 3");
    await view.act(first(view), { act: "next", fields: {} });
    expect(view.cardsHtml()).toContain("Question 3 of 3");
    expect(view.cardsHtml()).toContain("Your decision: Third");
    view.close();
  });

  test("two windows: an answer for a question that the other window left with Back does not change the earlier answer", async () => {
    const { s, view } = setup();
    await view.act(first(view), { act: "answer", value: "0", qid: "q1", fields: {} });
    expect(view.cardsHtml()).toContain('data-qid="q2"');
    await view.act(first(view), { act: "back", fields: {} });
    await view.act(first(view), { act: "answer", value: "2", qid: "q2", fields: {} });
    expect(s.record.entries(["answer"]).map((e) => e.data.qid)).toEqual(["q1"]);
    expect(view.cardsHtml()).toContain("The question changed in another window.");
    expect(view.cardsHtml()).toContain("Your decision: First");
    view.close();
  });

  test("two windows: the second answer to the same card does not answer the next question", async () => {
    const { s, view } = setup();
    const id = first(view);
    expect(await view.act(id, { act: "answer", value: "0", qid: "q1", fields: {} })).toEqual({ ok: true });
    expect(await view.act(id, { act: "answer", value: "0", qid: "q1", fields: {} })).toEqual({ ok: false, error: "This card is no longer open." });
    expect(s.record.entries(["answer"]).map((e) => e.data.qid)).toEqual(["q1"]);
    view.close();
  });

  test("the app page sends the arrow keys to Back and Next and Change buttons to /change", async () => {
    app = await startApp({ session: new FakeSession(), env });
    const html = await (await client(app).get("?ui=old")).text();
    expect(html).toContain('e.key === "ArrowLeft" && nav("back")');
    expect(html).toContain('e.key === "ArrowRight" && nav("next")');
    expect(html).toContain('send("/change " + chg.dataset.change');
  });

  test("the Change button is on the answer line and /change opens a card that works", async () => {
    const s = new FakeSession();
    const view = new WebView(s, { token: "t", env, url: (p) => p, quit: async () => {} });
    s.askMany([{ ...mk(s, "q1", "Which cutoff?"), decisionKey: "min_auc" }]);
    await view.act(first(view), { act: "answer", value: "0", fields: {} });
    expect(view.recordHtml()).toContain('data-change="q1"');
    await view.runCommand("/change q1");
    const html = view.cardsHtml();
    expect(html).toContain("Change: Which cutoff?");
    expect(html).toMatch(/btn primary" data-act="answer" data-value="0">one/);
    expect(html).toContain("Cancel");
    await view.act(first(view), { act: "answer", value: "2", fields: {} });
    expect(view.slots.length).toBe(0);
    expect(view.recordHtml()).toContain("Which cutoff? is now three.");
    expect(s.decisions.fields().find((f) => f.key === "min_auc")?.value ?? 3).toBe(3);
    view.close();
  });

  test("the Decisions tab has a Change button on each row", () => {
    const s = new FakeSession();
    const rows = s.decisions.fields().filter((f) => f.owner !== "fixed");
    const html = decisionsHtml({ token: "t", session: s }, rows.map((f) => [f.key, f.label, f.owner, "default"]));
    for (const f of rows) expect(html).toContain(`data-change="${f.key}"`);
  });
});

describe("parity of the browser app with the terminal", () => {
  test("the browser renders every card type", () => {
    expect(Object.keys(WEB_CARDS).sort()).toEqual([...CARDS].sort());
  });

  test("every command runs in the browser view", async () => {
    const s = new FakeSession();
    const view = new WebView(s, { token: "t", env, url: (p) => `http://127.0.0.1:1/${p}`, quit: async () => {} });
    const args: Record<string, string> = { databook: "html", export: "md", owner: "alpha human", change: "alpha 0.01", answer: "q9 1", mode: "watch", open: "1", eln: "status", key: "status", pilot: "", plan: "" };
    const skip = new Set(["quit", "panel"]);
    for (const name of COMMANDS) {
      if (skip.has(name)) continue;
      await view.runCommand(`/${name} ${args[name] ?? ""}`.trim());
    }
    const text = view.recordHtml();
    expect(text).not.toContain("Unknown command");
    expect(text).not.toMatch(/\/[a-z]+ failed:/);
    view.close();
  });
});

describe("card rendering", () => {
  const s = new FakeSession();
  const ctx = { token: "tok", session: s, busy: false };
  const q: Question = { qid: "q1", session: s.id, decisionKey: "min_auc", title: "Which cutoff?", text: "Choose.", options: [{ value: 0.7, label: "0.7" }, { value: 0.8, label: "0.8" }], recommendation: { value: 0.8, reason: "Lab rule." }, evidence: "", status: "open", created: "" };
  const slot = (card: Card): Slot => ({ id: 7, card, plan: card.t === "plan" ? planInit(card) : undefined });

  test("a long question with a clipped title shows the full question once", () => {
    const long = "Which statistical test do you want to use to compare the endocardium with the epicardium samples in this study?";
    const html = cardHtml(ctx, slot({ t: "question", q: { ...q, title: long.slice(0, 77) + "...", text: long } }));
    expect(html).toContain(`<h3>Your decision: ${long}</h3>`);
    expect(html).not.toContain(`<p>${long}</p>`);
    expect(cardHtml(ctx, slot({ t: "question", q })).match(/Choose\./g)).toHaveLength(1);
  });

  test("the key card tells a user of ant auth login to sign in there", () => {
    expect(cardHtml(ctx, slot({ t: "key" }))).toContain("If you use ant auth login, sign in there. Cuvette reads that login.");
  });

  test("the Decisions tab shows an empty value as not set", () => {
    const html = decisionsHtml(ctx, [["alpha", "", "human", "not set"], ["min_auc", "0.7", "human", "human"]]);
    expect(html).toContain("Not set");
    expect(html).toContain("Set by: you");
    expect(html).not.toContain("Set by: not set");
  });

  test("the proposed metrics: numbered metrics and settings, details, demonstration, programs and actions", () => {
    const card: Card = { t: "plan", stage: "plan", version: 2, text: "You want: count cells\n\nMetrics\n[1] positive cell: 1 red pixel\n\nSteps\n1. Count\n   [2] Threshold: 40 (default)", details: "Data\n- 36 fields", settings: [{ index: 0, step: 1, label: "Threshold", value: 40, by: "default", options: ["30", "40", "50"] }], update: false, qids: [], programs: [{ part: "Stats", adapter: "biostats", alternatives: ["lme4"] }], mode: "watch", restatement: "count cells", definitions: [{ measure: "positive cell", definition: "1 red pixel" }], pilot: "Set 1" };
    const sl = slot(card);
    const html = cardHtml(ctx, sl);
    expect(html).toContain("Proposed metrics, version 2");
    expect(html).toContain("<h4>Metrics</h4>");
    expect(html).toContain("Run the demonstration on Set 1");
    expect(html).toContain("Change a program");
    expect(html).toContain('class="num"');
    expect(html).toContain("Show the details");
    sl.plan = { ...sl.plan!, details: true };
    expect(cardHtml(ctx, sl)).toContain("36 fields");
    sl.plan = { ...sl.plan!, step: "setting", setIndex: 0 };
    const set = cardHtml(ctx, sl);
    expect(set).toContain("Threshold");
    expect(set).toContain("&quot;setValue&quot;");
  });

  test("the demonstration asks to confirm, change or try another sample, and lists the settings", () => {
    const html = cardHtml(ctx, slot({ t: "plan", stage: "pilot", version: 1, text: "Pilot sample: Set 1", update: false, qids: [], programs: [], mode: "watch", images: ["/tmp/qc.png"], settings: [{ index: 0, step: 1, label: "Threshold", value: 40 }] }));
    expect(html).toContain("Demonstration on a sample");
    expect(html).toContain("Confirm and run all");
    expect(html).toContain("Try another sample");
    expect(html).toContain("api/file?p=%2Ftmp%2Fqc.png");
    expect(html).toContain("Threshold: <strong>40</strong>");
  });

  test("the questions card asks one question at a time and can skip", () => {
    const s2 = new FakeSession();
    const q2: Question = { ...q, qid: "c1", title: "What counts as one cell?" };
    s2.clarify("I see 6 groups and 139 fields.", [q2]);
    const html = cardHtml({ token: "t", session: s2 }, slot({ t: "clarify", found: "I see 6 groups and 139 fields.", qids: ["c1"], skipped: [] }));
    expect(html).toContain("Questions");
    expect(html).toContain("I see 6 groups");
    expect(html).toContain("Question 1 of 1");
    expect(html).toContain('data-act="skip" data-qid="c1"');
  });

  test("the questions card shows the data check, the design notes and the sample sheet as an editable table", async () => {
    const s3 = new FakeSession();
    const table = { columns: ["sample", "group", "unit", "batch", "path"], rows: [["Ceramide Set 1_01", "Ceramide", "Set 1", "", "Ox-LDL/Ceramide/Set 1/Set 1_01*"], ["Control Set 1_01", "Control", "Set 1", "", "Ox-LDL/Control/Set 1/Set 1_01*"]] };
    const sheet: Question = { ...q, qid: "c2", title: "Sample sheet", text: "The agent made this sample sheet.", options: [{ value: "accept", label: "The sheet is correct" }, { value: "reload", label: "Read samples.csv again (I edited it)" }], table };
    const check = "Data check of Ox-LDL: 35 files in 6 folders.\nProblems found in the data:\n- 1 field has no 'red' image: Control/Set 3/Set 3_02.";
    s3.clarify("I see 2 groups.", [sheet], [], { check, notes: ["n is the Set. n per group: Ceramide 3, Control 3."] });
    const card: Card = { t: "clarify", found: "I see 2 groups.", qids: ["c2"], skipped: [], check, notes: ["n is the Set. n per group: Ceramide 3, Control 3."] };
    const html = cardHtml({ token: "t", session: s3 }, slot(card));
    expect(html).toContain("<summary>Data check</summary>");
    expect(html).toContain("1 field has no &#39;red&#39; image");
    expect(html).toContain("<h4>Design notes</h4>");
    expect(html).toContain('name="cell:0:1" value="Ceramide"');
    expect(html).toContain('data-act="sheet" data-qid="c2"');
    expect(html).not.toContain('class="evidence"');
    const view = new WebView(s3, { token: "t", env, url: (p) => p, quit: async () => {} });
    view.openCard(card);
    const id = view.slots.find((x) => x.card.t === "clarify")!.id;
    await view.act(id, { act: "sheet", qid: "c2", fields: { "cell:1:3": "Day 2" } });
    const ans = s3.record.entries(["answer"]).at(-1)!.data;
    expect(ans.value).toEqual({ rows: [table.rows[0], ["Control Set 1_01", "Control", "Set 1", "Day 2", "Ox-LDL/Control/Set 1/Set 1_01*"]] });
    view.close();
  });

  test("a question card, a disk search card and a setup card", () => {
    expect(cardHtml(ctx, slot({ t: "question", q }))).toContain("0.8 (recommended)");
    const search = cardHtml(ctx, slot({ t: "permission", rid: "r1", tool: "broad_search", args: {}, touches: "The agent wants to search /Volumes.", search: { root: "/Volumes", purpose: "find the images" } }));
    expect(search).toContain("Search outside the project");
    expect(search).not.toContain("Always allow");
    const setup = cardHtml(ctx, slot({ t: "setup", profiles: [] }));
    expect(setup).toContain("Save setup and start");
    expect(setup).toContain('name="f:normalization"');
    expect(setup).toContain("Show more settings");
  });

  test("text is escaped", () => {
    const html = cardHtml(ctx, slot({ t: "question", q: { ...q, title: "<script>x</script>" } }));
    expect(html).not.toContain("<script>x");
    expect(html).toContain("&lt;script&gt;");
  });
});

test("the sessions list shows the title, the sentence, the folder, the age and the status", () => {
  const html = sessionsHtml([{ id: "s1", cwd: "/lab/sleep", used: Date.now() - 120000, ask: "Compare the drugs", name: "Extra sleep, drug 2 vs drug 1", description: "Paired t test on 10 patients; drug 2 gave 1.58 h more.", status: "answered", figure: "/lab/sleep/cuvette/x/figures/a.png" }], "tok");
  expect(html).toContain("Extra sleep, drug 2 vs drug 1");
  expect(html).toContain("Paired t test on 10 patients");
  expect(html).toContain(">sleep</span> · 2 min ago");
  expect(html).toContain('class="sstatus answered"');
  expect(html).toContain("api/thumb?id=s1&t=tok");
  expect(html).toContain("data-session-search");
  expect(html).toContain('data-open-session="s1"');
});

test("the Analysis tab has a status line with the reason and the rerun button; the step and the Decisions tab show the before and after table", async () => {
  const s = new FakeSession();
  const base = { entry: 1, adapter: "msi", adapterVersion: "1.0", programVersion: "2.0", tool: "find_peaks", args: {}, codeHash: "c", inputHashes: [], outputs: [], parents: [], model: "fake", manualRoute: "", fidelity: "none" as const };
  const n1 = s.record.addNode({ ...base, decisions: { tolerance_ppm: 5 }, result: { ok: true, metrics: { peaks: 120 } }, summary: "Found 120 peaks." });
  app = await startApp({ session: s, env });
  const c = client(app);
  expect(await (await c.get("api/tab?name=analysis")).text()).toContain("<strong>Status:</strong> The step is up to date.");
  s.setDecision("tolerance_ppm", 10, "changed by the scientist");
  const analysis = await (await c.get("api/tab?name=analysis")).text();
  expect(analysis).toContain("<strong>Status:</strong> 1 of 1 step is out of date.");
  expect(analysis).toContain("Step 1: The decision &quot;Mass tolerance (ppm)&quot; changed after this step ran.");
  expect(analysis).toContain('data-rerun="1"');
  expect(analysis).toContain("Run the out-of-date steps again");
  const n2 = s.record.addNode({ ...base, decisions: { tolerance_ppm: 10 }, result: { ok: true, metrics: { peaks: 131 } }, summary: "Found 131 peaks." });
  s.record.append("rerun", { old: n1.id, node: n2.id, oldStep: 1, step: 2, tool: "find_peaks", reasons: ['The decision "Mass tolerance (ppm)" changed after this step ran.'], rows: [{ name: "peaks", before: 120, after: 131, change: 11 }], changed: 1, unchanged: 0 });
  const after = await (await c.get("api/tab?name=analysis")).text();
  expect(after).toContain("replaced by step 2");
  expect(after).toContain("Before and after: step 2 repeats step 1.");
  expect(after).toContain(">+11 (+9.2%)<");
  expect(after).toContain("<strong>Status:</strong> The step is up to date.");
  const decisions = await (await c.get("api/tab?name=decisions")).text();
  expect(decisions).toContain("Changes after a step ran again");
  expect(decisions).toContain(">131<");
});

test("the Results tab builds the tables from the record when results.xlsx is gone, and skips a broken link", async () => {
  const s = new FakeSession();
  const base = { entry: 1, adapter: "msi", adapterVersion: "1.0", programVersion: "2.0", tool: "find_peaks", args: {}, codeHash: "c", inputHashes: [], outputs: [], parents: [], model: "fake", manualRoute: "", fidelity: "none" as const };
  s.record.addNode({ ...base, decisions: {}, result: { ok: true, metrics: { peaks: 120 } }, summary: "Found 120 peaks." });
  mkdirSync(s.workDir, { recursive: true });
  writeFileSync(join(s.workDir, "keep.csv"), "a\n1\n");
  symlinkSync(join(s.workDir, "none.csv"), join(s.workDir, "broken.csv"));
  app = await startApp({ session: s, env });
  const res = await client(app).get("api/tab?name=results");
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toContain("keep.csv");
  expect(html).not.toContain("broken.csv");
  expect(html).not.toContain("No results");
  expect(html).toContain("<summary>Summary");
});

test("a message over 256 KB gets a plain error, and a message of 100 KB goes through", async () => {
  const s = new FakeSession();
  app = await startApp({ session: s, env });
  const c = client(app);
  const big = await c.post("api/send", { text: "x".repeat(300 * 1024) });
  expect(big.status).toBe(413);
  expect((await big.json()).error).toBe("The message is too long. The limit is 256 KB. Save the text in a file in the data folder instead.");
  expect((await c.post("api/send", { text: "y".repeat(100 * 1024) })).status).toBe(200);
});

test("the Analysis tab names a failed call that has no step", async () => {
  const s = new FakeSession();
  const base = { entry: 1, adapter: "msi", adapterVersion: "1.0", programVersion: "2.0", tool: "find_peaks", args: {}, codeHash: "c", inputHashes: [], outputs: [], parents: [], model: "fake", manualRoute: "", fidelity: "none" as const };
  s.record.addNode({ ...base, decisions: {}, result: { ok: true, metrics: { peaks: 120 } }, summary: "Found 120 peaks." });
  s.record.append("tool_result", { callId: "x1", tool: "boom", ok: false, error: "exit code 3" });
  app = await startApp({ session: s, env });
  const html = await (await client(app).get("api/tab?name=analysis")).text();
  expect(html).toContain("1 call failed: boom. See the Record tab.");
});

test("the Analysis tab names a failed call when there is no step, and leaves out a blocked call", async () => {
  const s = new FakeSession();
  s.record.append("tool_result", { callId: "x1", tool: "boom", ok: false, error: "exit code 3" });
  s.record.append("blocked", { callId: "x2", tool: "read_file" });
  s.record.append("tool_result", { callId: "x2", tool: "read_file", ok: false, error: "held back" });
  app = await startApp({ session: s, env });
  const html = await (await client(app).get("api/tab?name=analysis")).text();
  expect(html).toContain("No steps yet.");
  expect(html).toContain("1 call failed: boom. See the Record tab.");
  expect(html).not.toContain("read_file");
});

test("the view streams the thinking text, and a tool call clears it", () => {
  const s = new FakeSession();
  const view = new WebView(s, { token: "t", env, url: (p) => p, quit: async () => {} });
  const sent: any[] = [];
  view.attach({ writeHead() {}, write: (d: string) => sent.push(JSON.parse(d.slice(6))), on() {}, end() {} } as never);
  s.bus.emit({ type: "delta", kind: "thinking", text: "The data are paired, " });
  s.bus.emit({ type: "delta", kind: "thinking", text: "so a paired test fits." });
  expect(sent.filter((m) => m.t === "think").map((m) => m.text).join("")).toBe("The data are paired, so a paired test fits.");
  expect(view.snapshot().think).toBe("The data are paired, so a paired test fits.");
  s.record.append("tool_call", { tool: "run_script", args: {} });
  expect(sent.at(-1)).toEqual({ t: "think", reset: true });
  expect(view.snapshot().think).toBe("");
  view.close();
});

test("a retry clears the streamed text of the failed try", () => {
  const s = new FakeSession();
  const view = new WebView(s, { token: "t", env, url: (p) => p, quit: async () => {} });
  const sent: any[] = [];
  view.attach({ writeHead() {}, write: (d: string) => sent.push(JSON.parse(d.slice(6))), on() {}, end() {} } as never);
  s.bus.emit({ type: "delta", kind: "text", text: "The mean is" });
  s.bus.emit({ type: "delta", kind: "thinking", text: "first try" });
  s.bus.emit({ type: "delta_reset" });
  expect(sent.slice(-2)).toEqual([{ t: "live", reset: true }, { t: "think", reset: true }]);
  expect(view.snapshot().live).toBe("");
  expect(view.snapshot().think).toBe("");
  view.close();
});

test("the definitions under a final answer fold into a Definitions toggle", async () => {
  const { itemHtml } = await import("../src/server/app-html.ts");
  const html = itemHtml({ token: "t", session: new FakeSession() as never }, { key: "a", t: "assistant", text: "Drug 2 is better.\n\nDefinitions, from the confirmed analysis:\n- n: One patient." } as never);
  expect(html).toContain("<p>Drug 2 is better.</p>");
  expect(html).toContain('<details class="defs"><summary>Definitions</summary><ul><li>n: One patient.</li></ul></details>');
});

test("a status line keeps its text and its short path in one element, so the flex row does not split the sentence", async () => {
  const { itemHtml } = await import("../src/server/app-html.ts");
  const html = itemHtml({ token: "t", session: new FakeSession() as never }, { key: "l", t: "line", sym: "•", text: "This session saves its results in /very/long/folder/name/that/goes/on/and/on/results-2026-10-12-compare-groups." } as never);
  expect(html).toMatch(/<span class="sym"[^>]*>•<\/span> <span class="ltext">This session saves its results in <span class="path"[^>]*>.*<\/span>\.<\/span><\/div>$/);
  const withChange = itemHtml({ token: "t", session: new FakeSession() as never }, { key: "c", t: "line", sym: "•", text: "Test: t test", change: "test" } as never);
  expect(withChange).toMatch(/<span class="ltext">Test: t test<\/span> <button[^>]*data-change="test"/);
  expect(withChange).toContain('aria-label="Change the answer: Test"');
});

test("an answer line for a saved sample sheet names the change count, not the raw value", async () => {
  const { answerLine } = await import("../src/ui/cards.ts");
  const q = { qid: "q3", title: "Sample sheet", options: [{ value: "accept", label: "The sheet is correct" }] };
  expect(answerLine(q, { changes: [] })).toBe("Sample sheet: saved with no change · /change q3");
  expect(answerLine(q, { changes: [{ row: 1 }, { row: 2 }] })).toBe("Sample sheet: saved with 2 changes · /change q3");
  expect(answerLine(q, "accept")).toBe("Sample sheet: The sheet is correct · /change q3");
});

test("a question card with the question as its title does not repeat the question", () => {
  const s = new FakeSession();
  const q: Question = { qid: "q9", session: s.id, decisionKey: "", title: "Which test?", text: "Which test?", options: [{ value: "t", label: "t test" }], evidence: "", status: "open", created: "" };
  const html = cardHtml({ token: "t", session: s }, { id: 1, card: { t: "question", q } });
  expect(html).toContain("<h3>Your decision: Which test?</h3>");
  expect(html).not.toContain("<p>Which test?</p>");
  const long = cardHtml({ token: "t", session: s }, { id: 2, card: { t: "question", q: { ...q, title: "Which...", text: "Which test do you want?" } } });
  expect(long).toContain("<h3>Your decision: Which test do you want?</h3>");
  expect(long).not.toContain("<p>Which test do you want?</p>");
});

test("the status message names the current model, so the header follows a model change", () => {
  const s = new FakeSession();
  const view = new WebView(s, { token: "t", env, url: (p) => p, quit: async () => {} });
  expect(view.statusMsg().model).toBe(s.model.model);
  view.close();
});

test("a failed script step shows the last line of the traceback, and the full error in a closed box", () => {
  const ctx = { token: "t", session: new FakeSession() as never };
  const error = 'the script exited with code 1: Traceback (most recent call last):\n  File "/x/script.py", line 1, in <module>\n    raise ValueError("bad column name")\nValueError: bad column name';
  const html = itemHtml(ctx, { key: "s", t: "step", ok: false, tool: "run_script", purpose: "Compute the test", summary: "Runs the test.", error, outputs: [{ n: 1, path: "/r/blobs/" + "a".repeat(64) + ".png", kind: "image" }] } as never);
  expect(html).toContain('<span class="summary">the script exited with code 1: ValueError: bad column name</span>');
  expect(html).toContain('<details class="errmore"><summary>Error details</summary><pre>  File &quot;/x/script.py&quot;');
  expect(html).toContain('alt="Figure from Compute the test: the script exited with code 1: ValueError: bad column name"');
  expect(html).not.toContain('alt="aaaa');
  const ok = itemHtml(ctx, { key: "o", t: "step", ok: true, tool: "run_script", summary: "Wrote 2 files.", outputs: [] } as never);
  expect(ok).toContain('<span class="summary">Wrote 2 files.</span>');
  expect(ok).not.toContain("errmore");
});

test("the results tab shows the images in the session folder and opens a PDF or an HTML file in a new tab", () => {
  const s = new FakeSession();
  const out = mkdtempSync(join(tmpdir(), "cuvette-results-"));
  for (const f of ["fig.png", "report.pdf", "report.html", "stats.xlsx"]) writeFileSync(join(out, f), "x");
  const html = resultsHtml({ token: "t", session: s as never }, out, undefined);
  const files = html.slice(html.indexOf("<h4>Files</h4>"));
  expect(files).toMatch(/<div class="images"><button type="button" class="thumb"[^>]*title="fig\.png"/);
  for (const f of ["fig.png", "report.pdf", "report.html"]) expect(files).toContain(`aria-label="Open ${f} in a new tab">Open</a>`);
  expect(files).not.toContain('aria-label="Open stats.xlsx');
});

describe("repeated steps", () => {
  const ctx = { token: "tok", session: new FakeSession(), busy: false };
  const step = (n: number, tool: string, file: string, ok = true): Item => ({ key: `s${n}`, t: "step", n, ok, tool, summary: `${n * 10} cells`, error: ok ? undefined : "no image", settings: "cell diameter 0 · flow threshold 0.4", route: `cellpose_tools.${tool}(path="${file}")`, outputs: [], why: `Segment cells: ${file}` });
  const said = (text: string): Item => ({ key: text, t: "assistant", text });
  const dim = (k: string): Item => ({ key: k, t: "line", sym: "·", text: "Read 1 file", dim: true });

  test("a run is a series of steps with only dim lines between them, and the last run stays open", () => {
    const items = [said("Start."), step(1, "segment_cells", "a.tif"), dim("d1"), step(2, "segment_cells", "b.tif"), said("Now the stats."), step(3, "stats", "x")];
    const { done, open } = splitRuns(items);
    expect(done).toEqual([items[0], [items[1], items[2], items[3]], items[4]]);
    expect(open).toEqual([items[5]]);
    expect(splitRuns([step(4, "stats", "y"), said("Done.")], open).done[0]).toEqual([items[5], step(4, "stats", "y")]);
  });

  test("three or more steps of one tool show as one row with a progress bar and the steps inside", () => {
    const run = [step(1, "segment_cells", "a.tif"), step(2, "measure", "a.tif"), step(3, "segment_cells", "b.tif"), step(4, "segment_cells", "c.tif", false)];
    const html = runHtml(ctx, run, false);
    expect(html.match(/class="steprun/g)).toHaveLength(1);
    expect(html.indexOf("steprun")).toBeLessThan(html.indexOf("Step 2"));
    expect(html).toContain('<span class="badge">3 steps</span> <span class="summary">Segment cells: 3 done, 1 with an error</span>');
    expect(html).toContain('<progress max="3" value="2"');
    expect(html).toContain("Last: c.tif");
    expect(html).toContain('data-run="s1"');
    expect(html.match(/class="step /g)).toHaveLength(4);
    const live = runHtml(ctx, run, true);
    expect(live).toContain('class="runbar" role="progressbar"');
    expect(live).toContain("Now: c.tif");
    expect(runHtml(ctx, run.slice(0, 3), false)).not.toContain("steprun");
    expect(runHtml(ctx, [1, 2, 3].map((n) => step(n, "segment_cells", `${n}.tif`)), false)).toContain('<span class="badge">Steps 1 to 3</span>');
  });

  test("steps of one tool with different purposes do not group", () => {
    const script = (n: number, why: string): Item => ({ ...(step(n, "run_script", "x") as Extract<Item, { t: "step" }>), why });
    const html = runHtml(ctx, [script(1, "Join the tables"), script(2, "Plot the counts"), script(3, "Check the thresholds")], false);
    expect(html).not.toContain("steprun");
  });

  test("the settings of a step are in a fold, not in the flow", () => {
    const html = itemHtml(ctx, step(5, "segment_cells", "a.tif"));
    expect(html).toMatch(/<details class="callinfo"><summary>Settings<\/summary><div class="dim small">cellpose_tools\.segment_cells/);
  });
});

describe("agent message markdown", () => {
  const ctx = { token: "t", session: new FakeSession() } as never;

  test("an agent message shows headings, lists, links and a table", () => {
    const text = "## Result\n\n**Counts:**\n- one *n* is a Set\n  - nested\n\n1. first\n2. second\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\nSee [the paper](https://example.com).";
    const html = itemHtml(ctx, { t: "assistant", text } as Item);
    for (const part of ["<h4>Result</h4>", "<strong>Counts:</strong>", "<em>n</em>", "<ul><li>nested</li></ul>", "<ol><li>first</li><li>second</li></ol>", "<th role=\"columnheader\">A</th>", '<a href="https://example.com"']) expect(html).toContain(part);
  });
});

describe("sample sheet card", () => {
  test("a long sheet shows the first 200 rows, and saving keeps the other rows", () => {
    const rows = Array.from({ length: 500 }, (_, i) => [`s${i}`, i % 2 ? "ctrl" : "drug", `m${i % 10}`, "", `f${i}.tif`]);
    const q = { qid: "q1", title: "Sample sheet", text: "Is it correct?", table: { columns: ["sample", "group", "unit", "batch", "path"], rows } } as unknown as Question;
    const html = sheetHtml(q);
    expect(html.match(/<tr><td>/g)).toHaveLength(200);
    expect(html).toContain("the first 200 of 500 rows");
    const saved = sheetRows({ "cell:0:1": "Ceramide" }, q)!;
    expect(saved).toHaveLength(500);
    expect(saved[0]![1]).toBe("Ceramide");
    expect(saved[499]).toEqual(rows[499]);
  });
});
