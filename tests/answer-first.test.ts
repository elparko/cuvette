import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { Session } from "../src/core/session.ts";
import { Mapper } from "../src/ui/items.ts";
import { WebView } from "../src/server/app-view.ts";
import { runTui } from "../src/tui/app.tsx";
import { makeHarness, until } from "../src/tui/testing.ts";
import { FakeProvider, type FakeScript } from "../src/providers/fake.ts";

const LAB = join(__dirname, "fixtures/lab");
const COUNT = { name: "count", args: { input: "/data/a.tif", method: "Otsu", min_size: 5 } };
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

function gatedReferee(reply: string, order: string[]) {
  const provider = new FakeProvider({ steps: [], complete: reply });
  let release!: () => void;
  provider.completeGate = new Promise<void>((resolve) => (release = resolve));
  const complete = provider.complete.bind(provider);
  const marks = { started: false, replied: false };
  provider.complete = async (...args) => {
    marks.started = true;
    order.push("referee_start");
    const text = await complete(...args);
    marks.replied = true;
    order.push("referee_reply");
    return text;
  };
  return { provider, marks, release };
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

test("the answer is in the record and on the bus while the referee gate is closed, and the review notes follow", async () => {
  const order: string[] = [];
  const { provider, marks, release } = gatedReferee(WARNING, order);
  const s = await start([{ calls: [COUNT] }, SHORT_ANSWER], provider);
  track(s, order);
  const turn = s.send("Count the particles in a.tif");
  await until(() => order.includes("referee_start"));
  expect(order).toEqual(["answer", "answer_ready", "referee_start"]);
  expect(marks.replied).toBe(false);
  expect(s.busy).toBe(true);
  expect(s.findings.list()).toEqual([]);
  release();
  const answer = await turn;
  expect(order).toEqual(["answer", "answer_ready", "referee_start", "referee_reply", "finding", "review", "idle"]);
  expect(answer).toContain(NOT_MENTIONED);
  expect(s.findings.list().map((f) => f.message)).toEqual(["The sample is small."]);
  const review = s.record.entries(["review"]).at(-1)!.data;
  const final = s.record.entries(["assistant"]).filter((e) => e.data.final).at(-1)!;
  expect(review).toMatchObject({ answer: final.id, state: "done", findings: ["f1"] });
});

test("answerReadyMs is set before the review and turnMs is set after it", async () => {
  const order: string[] = [];
  const { provider, release } = gatedReferee(WARNING, order);
  const s = await start([{ calls: [COUNT] }, SHORT_ANSWER], provider);
  const turn = s.send("Count the particles in a.tif");
  await until(() => order.includes("referee_start"));
  expect(s.answerReadyMs).toBeGreaterThanOrEqual(0);
  expect(s.turnMs).toBeUndefined();
  release();
  await turn;
  const ready = s.record.entries(["answer_ready"]);
  expect(ready).toHaveLength(1);
  expect(ready[0]!.data.elapsedMs).toBe(s.answerReadyMs);
  expect(typeof ready[0]!.data.at).toBe("string");
  expect(s.turnMs!).toBeGreaterThanOrEqual(s.answerReadyMs!);
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
  const { provider, release } = gatedReferee(ERROR, order);
  const s = await start([{ calls: [COUNT] }, SHORT_ANSWER, { text: "Counting finished (step 1). The count has no control." }], provider);
  track(s, order);
  const turn = s.send("Count the particles in a.tif");
  await until(() => order.includes("referee_start"));
  expect(order).toEqual(["answer", "answer_ready", "referee_start"]);
  release();
  const answer = await turn;
  expect(order.slice(0, 8)).toEqual(["answer", "answer_ready", "referee_start", "referee_reply", "finding", "review", "review_found_problems", "referee_start"]);
  expect(order.filter((x) => x === "corrected_answer")).toHaveLength(1);
  expect(order.indexOf("corrected_answer")).toBeGreaterThan(order.indexOf("review_found_problems"));
  const finals = s.record.entries(["assistant"]).filter((e) => e.data.final);
  expect(finals).toHaveLength(2);
  expect(String(finals[0]!.data.text)).toContain("Counting finished (step 1).");
  expect(finals[0]!.data.corrects).toBeUndefined();
  expect(finals[1]!.data.corrects).toBe(finals[0]!.id);
  expect(finals[1]!.data.findings).toBeUndefined();
  expect(answer).toContain("The count has no control.");
  expect(s.record.entries(["answer_ready"])).toHaveLength(1);
  const reviews = s.record.entries(["review"]);
  expect(reviews[0]!.data).toMatchObject({ answer: finals[0]!.id, state: "done", corrected: true, findings: ["f1"] });
  expect(reviews.at(-1)!.data.answer).toBe(finals[1]!.id);
  const items = new Mapper(s as never).map(finals[1]!);
  expect(items.map((i) => i.t)).toEqual(["line", "assistant"]);
  expect(items[0]).toMatchObject({ text: expect.stringContaining("Corrected answer") });
});

describe("a correction that stops keeps the first answer with its review", () => {
  const stops: { name: string; settings?: Record<string, unknown>; arm: (s: Session, provider: FakeProvider) => void; third: { calls: (typeof COUNT)[] } | { text: string } }[] = [
    {
      name: "budget stop",
      arm: (s) => {
        s.bus.on((e) => {
          if (e.type === "entry" && e.entry.kind === "notice" && /Review found/.test(String(e.entry.data.text))) (s as unknown as { budgetGate: () => Promise<boolean> }).budgetGate = async () => false;
        });
      },
      third: { text: "never" },
    },
    {
      name: "Esc between tools",
      arm: (s, provider) => {
        const step = provider.step.bind(provider);
        provider.step = async (req) => {
          const r = await step(req);
          if (provider.requests.length === 3) s.interrupt();
          return r;
        };
      },
      third: { calls: [COUNT] },
    },
    {
      name: "plan cancel",
      arm: (s, provider) => {
        const step = provider.step.bind(provider);
        provider.step = async (req) => {
          const r = await step(req);
          if (provider.requests.length === 3) (s as unknown as { stopTurn: boolean }).stopTurn = true;
          return r;
        };
      },
      third: { calls: [COUNT] },
    },
    { name: "step limit", settings: { maxSteps: 3 }, arm: () => {}, third: { calls: [COUNT] } },
  ];
  for (const stop of stops) {
    test(stop.name, async () => {
      const order: string[] = [];
      const { provider, release } = gatedReferee(ERROR, order);
      release();
      session = await Session.create({ adapters: [LAB], provider: new FakeProvider([{ calls: [COUNT] }, SHORT_ANSWER, stop.third]), refereeProvider: provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: stop.settings });
      const s = session;
      s.decisions.applySetup({ method: "Otsu" });
      stop.arm(s, (s as unknown as { provider: FakeProvider }).provider);
      const answer = await s.send("Count the particles in a.tif");
      expect(answer).toContain(NOT_MENTIONED);
      const finals = s.record.entries(["assistant"]).filter((e) => e.data.final);
      expect(finals).toHaveLength(1);
      const review = s.record.entries(["review"]).filter((e) => e.data.answer === finals[0]!.id);
      expect(review).toHaveLength(1);
      expect(review[0]!.data.findings).toHaveLength(1);
      expect(s.findings.list().map((f) => f.message)).toEqual(["The count has no control to compare with."]);
      expect(s.record.entries(["notice"]).some((e) => /The first answer stays/.test(String(e.data.text)))).toBe(true);
      expect(s.reviewState).toBe("done");
    });
  }
});

test("a message sent while the review runs waits until the review entry", async () => {
  const order: string[] = [];
  const { provider, release } = gatedReferee(WARNING, order);
  const s = await start([{ calls: [COUNT] }, SHORT_ANSWER], provider);
  track(s, order);
  s.bus.on((e) => {
    if (e.type === "entry" && e.entry.kind === "user") order.push("user");
  });
  const turn = s.send("Count the particles in a.tif");
  await until(() => order.includes("referee_start"));
  s.steer("Next step");
  await expect(s.send("Other step")).rejects.toThrow(/agent is busy/);
  release();
  await turn;
  expect(order.filter((x) => x === "user")).toHaveLength(1);
  expect(order.indexOf("answer")).toBeLessThan(order.indexOf("review"));
  expect(order.at(-1)).toBe("idle");
  expect(s.takeSteered()).toEqual(["Next step"]);
});

test("Esc during the referee keeps the answer and marks the review as stopped", async () => {
  const order: string[] = [];
  const { provider, marks } = gatedReferee(ERROR, order);
  const s = await start([{ calls: [COUNT] }, SHORT_ANSWER], provider);
  track(s, order);
  const complete = provider.complete.bind(provider);
  provider.complete = (...args) => {
    const pending = complete(...args);
    s.interrupt();
    return pending;
  };
  const answer = await s.send("Count the particles in a.tif");
  expect(marks.replied).toBe(false);
  expect(order).toEqual(["answer", "answer_ready", "referee_start", "review", "idle"]);
  expect(answer).toContain(NOT_MENTIONED);
  expect(s.record.entries(["assistant"]).filter((e) => e.data.final)).toHaveLength(1);
  expect(s.record.entries(["review"]).at(-1)!.data.state).toBe("stopped");
  expect(s.reviewState).toBe("stopped");
  expect(s.record.entries(["notice"]).some((e) => /the scientist stopped the turn/.test(String(e.data.text)))).toBe(true);
  expect(s.endedBy).toBe("answer");
  const line = new Mapper(s as never).map(s.record.entries(["review"]).at(-1)!);
  expect(line[0]).toMatchObject({ text: expect.stringContaining("Review stopped") });
});

test("a referee that throws gives review state failed and the answer stays", async () => {
  const order: string[] = [];
  const { provider } = gatedReferee(WARNING, order);
  provider.complete = async () => {
    throw new Error("referee down");
  };
  const s = await start([{ calls: [COUNT] }, SHORT_ANSWER], provider);
  const answer = await s.send("Count the particles in a.tif");
  expect(answer).toContain(NOT_MENTIONED);
  expect(s.endedBy).toBe("answer");
  expect(s.reviewState).toBe("failed");
  expect(s.record.entries(["review"]).at(-1)!.data.state).toBe("failed");
});

test("the terminal app shows the answer while the referee gate is closed", async () => {
  const order: string[] = [];
  const { provider, marks, release } = gatedReferee(WARNING, order);
  const s = await start([{ calls: [COUNT] }, SHORT_ANSWER], provider);
  const h = makeHarness();
  const done = runTui(s as never, { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {}, firstMessage: "Count the particles in a.tif" });
  try {
    await until(() => h.all().includes(NOT_MENTIONED), 15000);
    expect(marks.replied).toBe(false);
    expect(h.all()).not.toContain("The sample is small.");
    release();
    await until(() => h.all().includes("The sample is small."), 15000);
    expect(marks.replied).toBe(true);
  } finally {
    h.type("\x03");
    h.type("\x03");
    await Promise.race([done, until(() => false, 500).catch(() => {})]);
  }
});

test("the web view sends the answer while the referee gate is closed and the review notes after it", async () => {
  const order: string[] = [];
  const { provider, marks, release } = gatedReferee(WARNING, order);
  const s = await start([{ calls: [COUNT] }, SHORT_ANSWER], provider);
  const sent: string[] = [];
  view = new WebView(s as never, { token: "t", env: {}, url: (p) => p, quit: async () => {} });
  view.attach({ writeHead() {}, write: (d: string) => sent.push(d), on() {}, end() {} } as never);
  const turn = s.send("Count the particles in a.tif");
  await until(() => sent.some((m) => m.includes(NOT_MENTIONED)));
  expect(marks.replied).toBe(false);
  expect(sent.some((m) => m.includes("The sample is small."))).toBe(false);
  release();
  await turn;
  expect(sent.some((m) => m.includes("The sample is small."))).toBe(true);
});
