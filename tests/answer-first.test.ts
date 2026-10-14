import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { Session } from "../src/core/session.ts";
import { Mapper } from "../src/ui/items.ts";
import { WebView } from "../src/server/app-view.ts";
import { runTui } from "../src/tui/app.tsx";
import { makeHarness, until } from "../src/tui/testing.ts";
import { FakeProvider, type FakeScript } from "../src/providers/fake.ts";

const LAB = join(__dirname, "fixtures/lab");
const COUNT = { name: "count", args: { input: "/data/a.tif", method: "Otsu", min_size: 5 } };
const REFEREE_MS = 1500;
const NOT_MENTIONED = "Step results that the answer does not mention";
const WARNING = JSON.stringify({ severity: "warning", message: "The sample is small." });
const ERROR = JSON.stringify({ severity: "error", message: "The count has no control to compare with." });
const SHORT_ANSWER = { text: "Counting finished (step 1)." };

let session: Session | undefined;
let view: WebView | undefined;
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-first-"));
});
afterEach(async () => {
  view?.close();
  view = undefined;
  await session?.close();
  session = undefined;
});

function delayedReferee(reply: string, order: string[], ms = REFEREE_MS) {
  const provider = new FakeProvider({ steps: [], complete: reply, completeDelayMs: ms });
  const complete = provider.complete.bind(provider);
  const marks = { started: 0, replied: 0 };
  provider.complete = async (...args) => {
    marks.started = Date.now();
    order.push("referee_start");
    const text = await complete(...args);
    marks.replied = Date.now();
    order.push("referee_reply");
    return text;
  };
  return { provider, marks };
}

async function start(script: FakeScript, referee: FakeProvider) {
  session = await Session.create({ adapters: [LAB], provider: new FakeProvider(script), refereeProvider: referee, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")) });
  session.decisions.applySetup({ method: "Otsu" });
  return session;
}

function track(s: Session, order: string[], times: Record<string, number> = {}) {
  const mark = (name: string) => {
    order.push(name);
    times[name] ??= Date.now();
  };
  s.bus.on((e) => {
    if (e.type === "status" && e.state === "idle") mark("idle");
    if (e.type !== "entry") return;
    const { kind, data } = e.entry;
    if (kind === "assistant" && data.final) mark(data.corrects ? "corrected_answer" : "answer");
    else if (kind === "answer_ready" || kind === "finding" || kind === "review") mark(kind);
    else if (kind === "notice" && /Review found/.test(String(data.text))) mark("review_found_problems");
  });
  return times;
}

test("the answer is in the record and on the bus before the referee reply, and the review notes follow", async () => {
  const order: string[] = [];
  const { provider } = delayedReferee(WARNING, order);
  const s = await start([{ calls: [COUNT] }, SHORT_ANSWER], provider);
  const times = track(s, order);
  const answer = await s.send("Count the particles in a.tif");
  expect(order).toEqual(["answer", "answer_ready", "referee_start", "referee_reply", "finding", "review", "idle"]);
  expect(times.idle! - times.answer!).toBeGreaterThanOrEqual(1000);
  expect(answer).toContain(NOT_MENTIONED);
  expect(s.findings.list().map((f) => f.message)).toEqual(["The sample is small."]);
  const review = s.record.entries(["review"]).at(-1)!.data;
  const final = s.record.entries(["assistant"]).filter((e) => e.data.final).at(-1)!;
  expect(review).toMatchObject({ answer: final.id, state: "done", findings: ["f1"] });
});

test("answerReadyMs is the time of the answer and turnMs includes the review", async () => {
  const order: string[] = [];
  const { provider } = delayedReferee(WARNING, order);
  const s = await start([{ calls: [COUNT] }, SHORT_ANSWER], provider);
  await s.send("Count the particles in a.tif");
  const ready = s.record.entries(["answer_ready"]);
  expect(ready).toHaveLength(1);
  expect(ready[0]!.data.elapsedMs).toBe(s.answerReadyMs);
  expect(typeof ready[0]!.data.at).toBe("string");
  expect(s.turnMs! - s.answerReadyMs!).toBeGreaterThanOrEqual(1000);
  expect(s.turnMs! - s.answerReadyMs!).toBeLessThan(REFEREE_MS * 10);
});

test("a turn without guidance records the time of the answer too", async () => {
  session = await Session.create({ adapters: [], provider: new FakeProvider([{ text: "Hello." }]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { guidance: false, referee: "none" } });
  await session.send("Hi");
  expect(session.answerReadyMs).toBeGreaterThanOrEqual(0);
  expect(session.turnMs).toBeGreaterThanOrEqual(session.answerReadyMs!);
  expect(session.record.entries(["answer_ready"])).toHaveLength(1);
});

test("a turn that ends with no answer has no answerReadyMs", async () => {
  session = await Session.create({ adapters: [], provider: new FakeProvider([{ text: "" }, { text: "" }, { text: "" }, { text: "" }]), cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { referee: "none" } });
  await session.send("Hi");
  expect(session.answerReadyMs).toBeUndefined();
  expect(session.turnMs).toBeGreaterThanOrEqual(0);
});

test("a referee error starts one correction after the first answer was shown, and the first answer stays", async () => {
  const order: string[] = [];
  const { provider } = delayedReferee(ERROR, order);
  const s = await start([{ calls: [COUNT] }, SHORT_ANSWER, { text: "Counting finished (step 1). The count has no control." }], provider);
  const times = track(s, order);
  const answer = await s.send("Count the particles in a.tif");
  expect(order.slice(0, 6)).toEqual(["answer", "answer_ready", "referee_start", "referee_reply", "review_found_problems", "referee_start"]);
  expect(order.filter((x) => x === "corrected_answer")).toHaveLength(1);
  expect(order.indexOf("corrected_answer")).toBeGreaterThan(order.indexOf("review_found_problems"));
  expect(times.review_found_problems! - times.answer!).toBeGreaterThanOrEqual(1000);
  const finals = s.record.entries(["assistant"]).filter((e) => e.data.final);
  expect(finals).toHaveLength(2);
  expect(String(finals[0]!.data.text)).toContain("Counting finished (step 1).");
  expect(finals[0]!.data.corrects).toBeUndefined();
  expect(finals[1]!.data.corrects).toBe(finals[0]!.id);
  expect(answer).toContain("The count has no control.");
  expect(s.record.entries(["answer_ready"])).toHaveLength(1);
  const items = new Mapper(s as never).map(finals[1]!);
  expect(items.map((i) => i.t)).toEqual(["line", "assistant"]);
  expect(items[0]).toMatchObject({ text: expect.stringContaining("Corrected answer") });
});

test("the turn stays busy until the review ends, so nothing starts from the answer", async () => {
  const order: string[] = [];
  const { provider } = delayedReferee(WARNING, order);
  const s = await start([{ calls: [COUNT] }, SHORT_ANSWER], provider);
  const seen: { busy: boolean; next: string }[] = [];
  s.bus.on((e) => {
    if (e.type === "entry" && e.entry.kind === "assistant" && e.entry.data.final) {
      const probe = s.send("Next step").then(
        () => "started",
        (err: Error) => err.message,
      );
      void probe.then((next) => seen.push({ busy: s.busy, next }));
    }
  });
  await s.send("Count the particles in a.tif");
  await until(() => seen.length === 1);
  expect(seen[0]!.next).toMatch(/agent is busy/);
  expect(order.indexOf("referee_reply")).toBeGreaterThan(-1);
  expect(s.busy).toBe(false);
});

test("Esc during the referee keeps the answer and marks the review as stopped", async () => {
  const order: string[] = [];
  const { provider, marks } = delayedReferee(ERROR, order);
  const s = await start([{ calls: [COUNT] }, SHORT_ANSWER], provider);
  track(s, order);
  const complete = provider.complete.bind(provider);
  provider.complete = (...args) => {
    const pending = complete(...args);
    s.interrupt();
    return pending;
  };
  const answer = await s.send("Count the particles in a.tif");
  expect(marks.replied).toBe(0);
  expect(order).toEqual(["answer", "answer_ready", "referee_start", "review", "idle"]);
  expect(answer).toContain(NOT_MENTIONED);
  expect(s.record.entries(["assistant"]).filter((e) => e.data.final)).toHaveLength(1);
  expect(s.record.entries(["review"]).at(-1)!.data.state).toBe("stopped");
  expect(s.record.entries(["notice"]).some((e) => /the scientist stopped the turn/.test(String(e.data.text)))).toBe(true);
  expect(s.endedBy).toBe("answer");
  const line = new Mapper(s as never).map(s.record.entries(["review"]).at(-1)!);
  expect(line[0]).toMatchObject({ text: expect.stringContaining("Review stopped") });
});

test("the terminal app shows the answer before the referee reply", async () => {
  const order: string[] = [];
  const { provider, marks } = delayedReferee(WARNING, order);
  const s = await start([{ calls: [COUNT] }, SHORT_ANSWER], provider);
  const h = makeHarness();
  const done = runTui(s as never, { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {}, firstMessage: "Count the particles in a.tif" });
  try {
    await until(() => h.all().includes(NOT_MENTIONED), 15000);
    const seen = Date.now();
    expect(marks.replied).toBe(0);
    await until(() => h.all().includes("The sample is small."), 15000);
    expect(marks.replied - seen).toBeGreaterThanOrEqual(1000);
  } finally {
    h.type("\x03");
    h.type("\x03");
    await Promise.race([done, until(() => false, 500).catch(() => {})]);
  }
});

test("the web view sends the answer before the referee reply and the review notes after it", async () => {
  const order: string[] = [];
  const { provider, marks } = delayedReferee(WARNING, order);
  const s = await start([{ calls: [COUNT] }, SHORT_ANSWER], provider);
  const sent: { at: number; text: string }[] = [];
  view = new WebView(s as never, { token: "t", env: {}, url: (p) => p, quit: async () => {} });
  view.attach({ writeHead() {}, write: (d: string) => sent.push({ at: Date.now(), text: d }), on() {}, end() {} } as never);
  await s.send("Count the particles in a.tif");
  const answer = sent.find((m) => m.text.includes(NOT_MENTIONED));
  const note = sent.find((m) => m.text.includes("The sample is small."));
  expect(answer).toBeDefined();
  expect(note).toBeDefined();
  expect(marks.replied - answer!.at).toBeGreaterThanOrEqual(1000);
  expect(note!.at).toBeGreaterThanOrEqual(marks.replied);
});
