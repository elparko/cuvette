import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { Manifest, type LoadedAdapter } from "../src/adapters/manifest.ts";
import { Session } from "../src/core/session.ts";
import { compareValue, describeResult, formatDistance, selfTestFor, selfTestOf, warningCard, type SelfTestRuntime } from "../src/core/selftest.ts";
import { trustFolder } from "../src/core/trust.ts";
import { FakeProvider } from "../src/providers/fake.ts";

const oldHome = process.env.CUVETTE_HOME;
let session: Session | undefined;

beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-selftest-home-"));
});
afterEach(async () => {
  await session?.close();
  session = undefined;
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
});

function manifest(o: { version?: string; expected?: number; source?: string; selfTest?: boolean } = {}) {
  return Manifest.parse({
    adapter: { name: "fake", version: o.version ?? "1.0.0" },
    program: { name: "Fake program", version: "2" },
    connection: { kind: "cli" },
    tests: [
      {
        id: "known",
        self_test: o.selfTest ?? true,
        source: o.source ?? "Student 1908, Biometrika 6:1",
        calls: [{ tool: "t_test", args: { data: "x" } }],
        expect: [
          { path: "metrics.statistic", label: "the t statistic", approx: o.expected ?? -4.0621, abs: 0.0001 },
          { path: "metrics.df", equals: 9 },
        ],
      },
    ],
  });
}

function fakeAdapter(o: Parameters<typeof manifest>[0] = {}): LoadedAdapter {
  const m = manifest(o);
  return { manifest: m, root: "/nowhere", name: "fake", standardsText: () => "", skills: () => [], mapEntry: () => undefined, linksFor: () => ({}), module: async () => ({}) };
}

function fakeRuntime(result: { statistic: number; df?: number } | { error: string }, programVersion = "2") {
  const calls = { n: 0 };
  const rt: SelfTestRuntime = {
    programVersion,
    tools: async () => [
      {
        name: "t_test",
        description: "",
        inputSchema: {},
        source: "adapter" as const,
        execute: async () => {
          calls.n++;
          return "error" in result ? { ok: false, error: result.error } : { ok: true, metrics: { statistic: result.statistic, df: result.df ?? 9 } };
        },
      },
    ],
  };
  return { rt, calls };
}

describe("compareValue", () => {
  const e = { path: "metrics.statistic", label: "the t statistic", approx: -4.0621, rel: 1e-6, abs: 0.0001 };

  test("a value inside the tolerance matches", () => {
    expect(compareValue(e, -4.0621)).toBeUndefined();
    expect(compareValue(e, -4.06215)).toBeUndefined();
  });

  test("a value outside the tolerance gives the distance and the label", () => {
    const miss = compareValue(e, -4.0651)!;
    expect(miss.label).toBe("the t statistic");
    expect(miss.by).toBeCloseTo(0.003, 10);
  });

  test("the relative tolerance applies if it is larger than the absolute one", () => {
    const loose = { path: "x", approx: 1000, rel: 0.01, abs: 0 };
    expect(compareValue(loose, 1009)).toBeUndefined();
    expect(compareValue(loose, 1011)?.by).toBeCloseTo(11, 10);
  });

  test("the label is the path if the test gives none", () => {
    expect(compareValue({ path: "metrics.p", approx: 0.5, rel: 0, abs: 0.01 }, 0.6)?.label).toBe("metrics.p");
  });

  test("equals, min, max and text checks", () => {
    expect(compareValue({ path: "metrics.df", equals: 9, rel: 0, abs: 0 }, 9)).toBeUndefined();
    expect(compareValue({ path: "metrics.df", equals: 9, rel: 0, abs: 0 }, 10)?.by).toBe(1);
    expect(compareValue({ path: "p", max: 0.01, rel: 0, abs: 0 }, 0.05)?.by).toBeCloseTo(0.04, 10);
    expect(compareValue({ path: "p", min: 1, rel: 0, abs: 0 }, 0.5)?.by).toBe(0.5);
    expect(compareValue({ path: "text", contains: "abc", rel: 0, abs: 0 }, "xyz")?.by).toBeUndefined();
    expect(compareValue({ path: "metrics.v", approx: 1, rel: 0, abs: 0 }, undefined)?.text).toMatch(/expected a number/);
  });
});

describe("messages", () => {
  test("distance has two significant digits", () => {
    expect(formatDistance(0.0029999999)).toBe("0.003");
    expect(formatDistance(12.3456)).toBe("12");
    expect(formatDistance(0.0123456)).toBe("0.012");
  });

  test("a pass, a fail and an error", () => {
    expect(describeResult("pass", [])).toBe("Passes");
    expect(describeResult("fail", [{ label: "the t statistic", by: 0.003, text: "" }])).toBe("Fails by 0.003 on the t statistic");
    expect(describeResult("fail", [{ label: "the t statistic", by: 0.003, text: "" }, { label: "the p value", by: 1, text: "" }])).toBe("Fails by 0.003 on the t statistic. Also fails on the p value");
    expect(describeResult("fail", [{ label: "the text", text: "expected to contain abc" }])).toBe("Fails on the text: expected to contain abc");
    expect(describeResult("error", [], "the tool failed")).toBe("Could not run: the tool failed");
  });
});

describe("the manifest", () => {
  test("a self-test needs a source", () => {
    expect(() => manifest({ source: " " })).toThrow(/needs a source/);
  });

  test("only one test can be the self-test", () => {
    const raw = { adapter: { name: "x" }, program: { name: "x" }, connection: { kind: "cli" }, tests: [1, 2].map((i) => ({ id: `t${i}`, self_test: true, source: "s", calls: [], expect: [{ path: "a", equals: 1 }] })) };
    expect(() => Manifest.parse(raw)).toThrow(/only one test/);
  });

  test("selfTestOf finds the flagged test", () => {
    expect(selfTestOf(fakeAdapter())?.id).toBe("known");
    expect(selfTestOf(fakeAdapter({ selfTest: false }))).toBeUndefined();
  });
});

describe("selfTestFor", () => {
  test("a right number passes", async () => {
    const { rt } = fakeRuntime({ statistic: -4.0621 });
    const done = await selfTestFor(fakeAdapter(), rt);
    expect(done!.cached).toBe(false);
    expect(done!.result).toMatchObject({ status: "pass", message: "Passes", test: "known", source: "Student 1908, Biometrika 6:1" });
  });

  test("a wrong number fails and the message names the amount and the value", async () => {
    const { rt } = fakeRuntime({ statistic: -4.0651 });
    const done = await selfTestFor(fakeAdapter(), rt);
    expect(done!.result.status).toBe("fail");
    expect(done!.result.message).toBe("Fails by 0.003 on the t statistic");
  });

  test("a tool error is an error, and the result is not kept", async () => {
    const { rt, calls } = fakeRuntime({ error: "package not found" });
    const first = await selfTestFor(fakeAdapter(), rt);
    expect(first!.result.status).toBe("error");
    expect(first!.result.message).toContain("package not found");
    await selfTestFor(fakeAdapter(), rt);
    expect(calls.n).toBe(2);
  });

  test("the second call uses the saved result and does not run the tool", async () => {
    const { rt, calls } = fakeRuntime({ statistic: -4.0651 });
    await selfTestFor(fakeAdapter(), rt);
    const again = await selfTestFor(fakeAdapter(), rt);
    expect(calls.n).toBe(1);
    expect(again!.cached).toBe(true);
    expect(again!.result.message).toBe("Fails by 0.003 on the t statistic");
    const file = JSON.parse(readFileSync(join(process.env.CUVETTE_HOME!, "cache", "self-tests.json"), "utf8"));
    expect(Object.keys(file)).toHaveLength(1);
  });

  test("force runs the test again", async () => {
    const { rt, calls } = fakeRuntime({ statistic: -4.0621 });
    await selfTestFor(fakeAdapter(), rt);
    await selfTestFor(fakeAdapter(), rt, { force: true });
    expect(calls.n).toBe(2);
  });

  test("a new program version runs the test again", async () => {
    const before = fakeRuntime({ statistic: -4.0621 }, "2");
    await selfTestFor(fakeAdapter(), before.rt);
    const after = fakeRuntime({ statistic: -4.0651 }, "3");
    const done = await selfTestFor(fakeAdapter(), after.rt);
    expect(after.calls.n).toBe(1);
    expect(done).toMatchObject({ cached: false, result: { status: "fail" } });
  });

  test("a new adapter version or a changed expected value runs the test again", async () => {
    const { rt, calls } = fakeRuntime({ statistic: -4.0621 });
    await selfTestFor(fakeAdapter(), rt);
    await selfTestFor(fakeAdapter({ version: "1.1.0" }), rt);
    await selfTestFor(fakeAdapter({ expected: -4.0 }), rt);
    expect(calls.n).toBe(3);
  });

  test("an adapter with no self-test gives nothing", async () => {
    const { rt, calls } = fakeRuntime({ statistic: 0 });
    expect(await selfTestFor(fakeAdapter({ selfTest: false }), rt)).toBeUndefined();
    expect(calls.n).toBe(0);
  });
});

test("the warning card offers continue and stop", async () => {
  const { rt } = fakeRuntime({ statistic: -4.0651 });
  const { result } = (await selfTestFor(fakeAdapter(), rt))!;
  const card = warningCard("fake", result);
  expect(card.title).toBe("Self-test failed: fake");
  expect(card.text).toContain("Fails by 0.003 on the t statistic");
  expect(card.options.map((o) => o.value)).toEqual(["continue", "stop"]);
  expect(card.evidence).toContain("Student 1908");
});

describe("in a session", () => {
  function labCwd(expected: number, tool = "count"): string {
    const cwd = mkdtempSync(join(tmpdir(), "cuvette-selftest-cwd-"));
    const dir = join(cwd, ".cuvette", "adapters", "lab");
    mkdirSync(dir, { recursive: true });
    const yaml = readFileSync(join(__dirname, "fixtures/lab/adapter.yaml"), "utf8");
    const test = `tests:
  - id: otsu
    self_test: true
    source: "Fixture count for the Otsu method"
    calls:
      - { tool: ${tool}, args: { input: "/data/a.lab", method: Otsu } }
    expect:
      - { path: metrics.count, label: "the object count", approx: ${expected}, abs: 0.0001 }
`;
    writeFileSync(join(dir, "adapter.yaml"), `${yaml}${test}`);
    symlinkSync(join(__dirname, "fixtures/lab/server.ts"), join(dir, "server.ts"));
    trustFolder(cwd);
    return cwd;
  }

  async function start(cwd: string, askWaits = true): Promise<Session> {
    const s = await Session.create({ adapters: [], provider: new FakeProvider([]), cwd, settings: { askWaits } });
    s.decisions.applySetup({});
    s.setOwner("adapter", "agent");
    return s;
  }

  async function nextCard(s: Session) {
    for (let i = 0; i < 200; i++) {
      const q = s.questions.open().find((x) => x.title.startsWith("Self-test failed"));
      if (q) return q;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error("no card");
  }

  test("a right number loads the adapter and writes the result to the record", async () => {
    session = await start(labCwd(41));
    const r = await session.useAdapter("lab", "it counts");
    expect(r.ok).toBe(true);
    expect(session.record.entries(["self_test"]).map((e) => e.data)).toMatchObject([{ adapter: "lab", status: "pass", cached: false, test: "otsu" }]);
    expect(session.questions.open()).toHaveLength(0);
  });

  test("a test that cannot run is a note and does not stop the adapter", async () => {
    session = await start(labCwd(41, "no_such_tool"));
    expect((await session.useAdapter("lab", "it counts")).ok).toBe(true);
    expect(session.record.entries(["self_test"])[0]!.data).toMatchObject({ status: "error" });
    expect(session.record.entries(["notice"]).at(-1)!.data.text).toContain("did not run");
    expect(session.questions.open()).toHaveLength(0);
  });

  test("the next session uses the saved result", async () => {
    const cwd = labCwd(41);
    session = await start(cwd);
    await session.useAdapter("lab", "it counts");
    await session.close();
    session = await start(cwd);
    await session.useAdapter("lab", "it counts");
    expect(session.record.entries(["self_test"]).at(-1)!.data).toMatchObject({ status: "pass", cached: true });
  });

  test("a wrong number shows a card before the adapter loads, and continue loads it", async () => {
    session = await start(labCwd(41.003));
    const loading = session.useAdapter("lab", "it counts");
    const q = await nextCard(session);
    expect(q.text).toContain("Fails by 0.003 on the object count");
    expect(session.adapters).toHaveLength(0);
    await session.answer(q.qid, "continue");
    expect((await loading).ok).toBe(true);
    expect(session.adapters.map((a) => a.name)).toEqual(["lab"]);
    expect(session.record.entries(["self_test"])[0]!.data).toMatchObject({ status: "fail" });
    expect(session.record.entries(["notice"]).at(-1)!.data.text).toContain("continued");
  });

  test("stop leaves the adapter unloaded", async () => {
    session = await start(labCwd(41.003));
    const loading = session.useAdapter("lab", "it counts");
    const q = await nextCard(session);
    await session.answer(q.qid, "stop");
    const r = await loading;
    expect(r.ok).toBe(false);
    expect(r.error).toContain("stopped it");
    expect(session.adapters).toHaveLength(0);
    expect(session.allTools().some((t) => t.name === "count")).toBe(false);
  });

  test("with no wait, the call is blocked and a later call follows the answer", async () => {
    session = await start(labCwd(41.003), false);
    const first = await session.useAdapter("lab", "it counts");
    expect(first.error).toMatch(/^BLOCKED: the self-test of lab failed/);
    const q = await nextCard(session);
    await session.answer(q.qid, "continue");
    expect((await session.useAdapter("lab", "it counts")).ok).toBe(true);
    expect(session.questions.open()).toHaveLength(0);
  });

  test("CUVETTE_SELF_TEST=0 skips the test", async () => {
    process.env.CUVETTE_SELF_TEST = "0";
    try {
      session = await start(labCwd(41.003));
      expect((await session.useAdapter("lab", "it counts")).ok).toBe(true);
      expect(session.record.entries(["self_test"])).toHaveLength(0);
    } finally {
      delete process.env.CUVETTE_SELF_TEST;
    }
  });
});
