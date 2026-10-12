import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { attachHeadless } from "../src/core/headless.ts";
import { AFTER_RESULT, NO_DEVIATIONS, NO_REASON, deviationMarkdown, deviations, frozenPlan, planChanges, planHash } from "../src/core/freeze.ts";
import { planMarkdown, type AnalysisPlan } from "../src/core/plan.ts";
import { AnalysisRecord } from "../src/core/record.ts";
import { Session } from "../src/core/session.ts";
import { FakeProvider } from "../src/providers/fake.ts";

let session: Session | undefined;
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-freeze-"));
});
afterEach(async () => {
  await session?.close();
  session = undefined;
});

const LAB = join(__dirname, "fixtures/lab");
const CLARIFY = { calls: [{ name: "inspect_data", args: { path: LAB } }, { name: "clarify", args: { found: "I see one image." } }] };
const PLAN = {
  question: "How does a blur change a.tif?",
  data: { files: ["/data/a.tif"], row: "One image.", replicate: "One image.", n: "1 image." },
  programs: [{ part: "Image work", adapter: "lab", why: "It has the blur.", alternatives: ["imagej"] }],
  steps: [{ step: "Blur the image", method: "Gaussian blur", tool: "blur", decisions: [{ key: "method", label: "Threshold method", recommendation: "Otsu" }] }],
  outputs: ["The blurred image"],
  checks: [{ check: "The image opens.", if_fails: "Stop and tell the scientist." }],
  out_of_scope: ["Particle counts"],
};
const blur = { name: "blur", args: { input: "/data/a.tif", sigma: 2 } };
const change = { name: "plan", args: { steps: [{ step: "Blur the image", method: "Median filter" }], reason: "The median filter keeps edges." } };

async function start(script: ConstructorParameters<typeof FakeProvider>[0], opts: { headless?: boolean } = {}) {
  const provider = new FakeProvider(script);
  session = await Session.create({
    adapters: [LAB],
    provider,
    cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")),
    interactive: !opts.headless,
    ...(opts.headless ? { settings: { headless: true, planFirst: true } } : {}),
  });
  if (opts.headless) attachHeadless(session, { answers: {}, allow: new Set(["all"]) });
  session.decisions.applySetup({});
  session.bus.on((e) => {
    if (e.type === "plan") setTimeout(() => session!.respondPlan({ action: "approve" }), 0);
  });
  return session;
}

test("the plan hash is the same for the same plan and does not depend on key order", () => {
  const a = { steps: [{ step: "Blur", status: "todo", method: "Gaussian" }], question: "q" } as AnalysisPlan;
  const b = { question: "q", steps: [{ method: "Gaussian", status: "todo", step: "Blur" }] } as AnalysisPlan;
  expect(planHash(a)).toBe(planHash(b));
  expect(planHash(a)).toMatch(/^[0-9a-f]{64}$/);
  expect(planHash({ ...a, question: "other" })).not.toBe(planHash(a));
});

test("approval writes one freeze entry with the hash of the approved plan", async () => {
  const s = await start([CLARIFY, { calls: [blur] }, { calls: [{ name: "plan", args: PLAN }] }, { calls: [blur] }, { text: "Blurred." }, { text: "Blurred." }]);
  await s.send("Blur a.tif");
  const frozen = s.record.entries(["plan_frozen"]);
  const approved = s.record.entries(["plan_approved"]);
  expect(frozen).toHaveLength(1);
  expect(frozen[0]!.data.hash).toBe(planHash(approved[0]!.data.plan as AnalysisPlan));
  expect(frozen[0]!.refs).toEqual([approved[0]!.id]);
  expect(frozenPlan(s.record)!.hash).toBe(frozen[0]!.data.hash);
});

test("a session with no change after the freeze says None", async () => {
  const s = await start([CLARIFY, { calls: [blur] }, { calls: [{ name: "plan", args: PLAN }] }, { calls: [blur] }, { text: "Blurred." }, { text: "Blurred." }]);
  await s.send("Blur a.tif");
  expect(deviations(s.record)).toEqual([]);
  expect(deviationMarkdown(s.record)).toContain(NO_DEVIATIONS);
  expect(planMarkdown(s.record)).toContain(NO_DEVIATIONS);
});

test("a method change after the first result is listed with the mark", async () => {
  const s = await start([CLARIFY, { calls: [blur] }, { calls: [{ name: "plan", args: PLAN }] }, { calls: [blur] }, { calls: [change] }, { text: "Blurred." }, { text: "Blurred." }]);
  await s.send("Blur a.tif");
  const list = deviations(s.record);
  expect(list).toHaveLength(1);
  expect(list[0]).toMatchObject({ kind: "method", from: "Gaussian blur", to: "Median filter", reason: "The median filter keeps edges.", afterResult: true });
  const md = planMarkdown(s.record).join("\n");
  expect(md).toContain("Method of step Blur the image: Gaussian blur to Median filter. Reason: The median filter keeps edges.");
  expect(md).toContain(AFTER_RESULT);
  expect(md).not.toContain(NO_DEVIATIONS);
});

test("a method change before any result has no mark", async () => {
  const s = await start([CLARIFY, { calls: [blur] }, { calls: [{ name: "plan", args: PLAN }] }, { calls: [change] }, { calls: [blur] }, { text: "Blurred." }, { text: "Blurred." }]);
  await s.send("Blur a.tif");
  const list = deviations(s.record);
  expect(list).toHaveLength(1);
  expect(list[0]!.afterResult).toBe(false);
  expect(planMarkdown(s.record).join("\n")).not.toContain(AFTER_RESULT);
});

test("a decision change after the freeze asks for a reason and writes the answer", async () => {
  const s = await start([CLARIFY, { calls: [blur] }, { calls: [{ name: "plan", args: PLAN }] }, { calls: [blur] }, { text: "Blurred." }, { text: "Blurred." }]);
  await s.send("Blur a.tif");
  s.setDecision("min_size", 8);
  const q = s.questions.open().find((x) => x.title === "Why did the plan change?")!;
  expect(q).toBeDefined();
  expect(deviations(s.record)[0]).toMatchObject({ kind: "setting", what: "Smallest particle", from: "5", to: "8", reason: NO_REASON, afterResult: true });
  await s.answer(q.qid, "Small particles are noise.");
  await vi.waitFor(() => expect(deviations(s.record)[0]!.reason).toBe("Small particles are noise."));
});

test("in headless mode a change without a reason gets No reason given and no question", async () => {
  const s = await start([CLARIFY, { calls: [blur] }, { calls: [{ name: "plan", args: PLAN }] }, { calls: [blur] }, { text: "Blurred." }, { text: "Blurred." }], { headless: true });
  await s.send("Blur a.tif");
  s.setDecision("min_size", 8);
  expect(s.questions.open().filter((x) => x.title === "Why did the plan change?")).toEqual([]);
  expect(deviations(s.record)[0]!.reason).toBe(NO_REASON);
});

test("a record without a freeze loads and shows no deviation section", () => {
  const r = new AnalysisRecord(mkdtempSync(join(tmpdir(), "cuvette-old-")), "s1");
  r.append("plan_approved", { version: 1, text: "Question: q", plan: { steps: [] } });
  expect(frozenPlan(r)).toBeUndefined();
  expect(deviations(r)).toEqual([]);
  expect(deviationMarkdown(r)).toEqual([]);
  expect(planMarkdown(r).join("\n")).not.toContain("Deviations from the plan");
});

test("a rewind to before the freeze sets the freeze and its deviations aside", () => {
  const r = new AnalysisRecord(mkdtempSync(join(tmpdir(), "cuvette-rew-")), "s1");
  r.append("user", { text: "go" });
  r.append("plan_frozen", { hash: "h", version: 1, plan: { steps: [] } });
  r.append("plan_deviation", { kind: "step", what: "Added step: x", reason: "r", afterResult: false });
  expect(deviations(r)).toHaveLength(1);
  r.append("rewind", { upTo: 1 });
  expect(frozenPlan(r)).toBeUndefined();
  expect(deviations(r)).toEqual([]);
});

test("planChanges lists steps, methods, exclusions and definitions but not a status change", () => {
  const from = { steps: [{ step: "A", status: "todo", method: "t test" }, { step: "B", status: "todo" }], exclusions: [{ what: "Sample 3" }] } as AnalysisPlan;
  const to = { steps: [{ step: "A", status: "done", method: "Mann-Whitney" }, { step: "C", status: "todo" }], exclusions: [], definitions: [{ measure: "positive", definition: "above 50" }] } as AnalysisPlan;
  expect(planChanges(from, to).map((c) => c.what)).toEqual(["Method of step A", "Added step: C", "Removed step: B", "Removed exclusion: Sample 3", "Definition of positive"]);
  expect(planChanges(from, { ...from, steps: from.steps.map((s) => ({ ...s, status: "done" })) })).toEqual([]);
});
