import { mkdtempSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { startApp, type AppHandle } from "../src/server/app.ts";
import { cardHtml, sessionsHtml, WEB_CARDS, type Slot } from "../src/server/app-html.ts";
import { WebView } from "../src/server/app-view.ts";
import { planInit, type Card } from "../src/ui/cards.ts";
import { CARDS, COMMANDS } from "../src/ui/parity.ts";
import { FakeSession } from "../src/ui/fake-session.ts";
import { until } from "../src/tui/testing.ts";
import type { Question } from "../src/core/types.ts";
import { claudeKey } from "../src/core/credentials.ts";

const home = mkdtempSync(join(tmpdir(), "ga-app-home-"));
const oldHome = process.env.GA_HOME;
beforeAll(() => {
  process.env.GA_HOME = home;
});
afterAll(() => {
  process.env.GA_HOME = oldHome;
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
    expect((await fetch(`${c.base}/?t=wrong`)).status).toBe(401);
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
    await c.post("api/stop", {});
    expect(s.interrupts).toBeGreaterThan(0);
    ev.close();
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
    for (let i = 0; i < 100 && (await (await c.get("api/state")).json()).session === null; i++) await new Promise((r) => setTimeout(r, 30));
    expect((await (await c.get("api/state")).json()).session).not.toBeNull();
  });

  test("first start with no key and a Claude model asks for setup", async () => {
    app = await startApp({ env: {}, model: "claude", start: home, makeSession: async () => new FakeSession() });
    const st = await (await client(app).get("api/state")).json();
    expect(st.setup).toBe(claudeKey({}).from === "none");
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
    const check = "Data check of Ox-LDL: 35 files in 6 folders.\nQuestions for you:\n- 1 field has no 'red' image: Control/Set 3/Set 3_02.";
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
