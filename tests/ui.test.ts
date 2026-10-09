import { describe, expect, test } from "vitest";
import type { Entry, Question } from "../src/core/types.ts";
import { cardFromEvent, clarifyOpen, clarifyProgress, closesCard, permissionView, planInit, planReduce, planResolve, planTitle, pushCard, settingLabel, settingQuestion, type Card, type PlanCard } from "../src/ui/cards.ts";
import { routeMessage, nextQueued } from "../src/ui/messages.ts";
import { settingEditor } from "../src/ui/config.ts";
import { FakeSession } from "../src/ui/fake-session.ts";

const q = (qid: string): Question => ({ qid, session: "s", decisionKey: "k", title: "T", text: "x", options: [{ value: 1, label: "one" }], evidence: "", status: "open", created: "" });
const entry = (kind: string, data: Record<string, unknown>) => ({ id: 1, kind, data, ts: "" }) as unknown as Entry;
const plan = (more: Partial<PlanCard> = {}): PlanCard => ({ t: "plan", stage: "plan", version: 1, text: "Steps", update: false, qids: [], programs: [], mode: "watch", ...more });

describe("card queue", () => {
  test("a plan card takes in its own questions and replaces an older plan", () => {
    let list: Card[] = [{ t: "question", q: q("q1") }, plan({ version: 1 })];
    list = pushCard(list, plan({ version: 2, qids: ["q1"] }));
    expect(list.map((c) => c.t)).toEqual(["plan"]);
    expect(pushCard(list, { t: "question", q: q("q1") })).toBe(list);
  });
  test("the key card goes first and only once", () => {
    const list = pushCard(pushCard([{ t: "config" }], { t: "key" }), { t: "key" });
    expect(list.map((c) => c.t)).toEqual(["key", "config"]);
  });
  test("bus events make cards and record entries close them", () => {
    const c = cardFromEvent({ type: "permission", rid: "r1", tool: "run_script", args: { purpose: "Count cells", code: "print(1)" }, touches: "files" })!;
    expect(c.t).toBe("permission");
    expect(closesCard(entry("permission", { rid: "r1" }), c)).toBe(true);
    expect(closesCard(entry("permission", { rid: "r2" }), c)).toBe(false);
    expect(closesCard(entry("plan", { action: "cancelled" }), plan())).toBe(true);
    expect(closesCard(entry("plan", { action: "updated" }), plan())).toBe(false);
  });
  test("the permission view hides the code from the arguments", () => {
    const v = permissionView({ t: "permission", rid: "r1", tool: "run_script", args: { purpose: "Count cells", does: "Opens 3 images.", code: "print(1)", timeout: 60 }, touches: "files" });
    expect(v).toMatchObject({ title: "Permission needed: run_script", purpose: "Count cells", does: "Opens 3 images.", code: "print(1)", args: ["timeout = 60"], always: true });
  });
});

describe("the proposed analysis card", () => {
  test("the questions card takes in its questions and closes when they are answered", () => {
    let list: Card[] = [{ t: "question", q: q("q1") }];
    const c = cardFromEvent({ type: "clarify", found: "I see 6 groups.", qids: ["q1", "q2"], skipped: [] })!;
    list = pushCard(list, c);
    expect(list.map((x) => x.t)).toEqual(["clarify"]);
    expect(pushCard(list, { t: "question", q: q("q2") })).toBe(list);
    expect(clarifyProgress(c as never, [q("q2")])).toBe("Question 2 of 2");
    expect(clarifyOpen(c as never, [q("q2"), q("q9")]).map((x) => x.qid)).toEqual(["q2"]);
    expect(closesCard(entry("clarify", { action: "asked" }), c)).toBe(false);
    expect(closesCard(entry("clarify", { action: "answered" }), c)).toBe(true);
  });
  test("the metrics card: a number picks a metric or a setting; a setting gets a new value", () => {
    const card = plan({
      definitions: [{ measure: "n", definition: "one Set" }],
      settings: [
        { index: 0, step: 1, label: "cell model", value: "cyto3", by: "default", options: ["cyto3", "nuclei"] },
        { index: 1, step: 2, label: "min size", value: 300, by: "agent" },
      ],
    });
    expect(planTitle(card)).toBe("Proposed metrics, version 1");
    let st = planResolve(card, planInit(card), []);
    expect(st.step).toBe("actions");
    expect(planReduce(card, st, { a: "item", n: 1 }).state.step).toBe("definition");
    st = planReduce(card, st, { a: "item", n: 2 }).state;
    expect(st).toMatchObject({ step: "setting", setIndex: 0 });
    expect(settingQuestion(card, st)!.options.map((o) => o.label)).toEqual(["cyto3", "nuclei"]);
    expect(planReduce(card, st, { a: "setValue", value: "nuclei" }).respond).toEqual({ action: "set", index: 0, value: "nuclei" });
    st = planReduce(card, planResolve(card, planInit(card), []), { a: "item", n: 3 }).state;
    expect(settingQuestion(card, st)).toBeUndefined();
    expect(settingLabel(card, st)).toBe("New value for min size (now: 300, agent):");
    expect(planReduce(card, st, { a: "details" }).state.details).toBe(true);
    expect(planTitle(plan({ stage: "pilot" }))).toBe("Demonstration on a sample");
  });
  test("reference, then run the pilot with the chosen reference", () => {
    const card = plan({ restatement: "count cells", pilot: "Set 1", reference: { question: "Use it?", candidates: [{ path: "/a.xlsx", sheet: "S", columns: ["n"], label: "a" }] } });
    let st = planInit(card);
    st = planResolve(card, st, []);
    expect(st.step).toBe("reference");
    st = planReduce(card, st, { a: "reference", value: "blind" }).state;
    expect(st.step).toBe("actions");
    st = planReduce(card, st, { a: "mode", mode: "follow" }).state;
    expect(planReduce(card, st, { a: "run" }).respond).toEqual({ action: "pilot", mode: "follow", reference: { mode: "blind", path: "/a.xlsx", sheet: "S" } });
  });
  test("open decisions come before the actions", () => {
    const card = plan({ qids: ["q1"] });
    const st = planInit(card);
    expect(planResolve(card, st, [q("q1")]).step).toBe("decisions");
    expect(planResolve(card, planReduce(card, st, { a: "later", qid: "q1" }).state, [q("q1")]).step).toBe("actions");
  });
  test("a changed definition and a program switch become change requests", () => {
    const card = plan({ definitions: [{ measure: "positive cell", definition: "1 red pixel" }], programs: [{ part: "Stats", adapter: "biostats", alternatives: ["lme4"] }] });
    let st = planReduce(card, planInit(card), { a: "definition", index: 0 }).state;
    expect(planReduce(card, st, { a: "define", text: "5 red pixels" }).respond).toEqual({ action: "change", text: "Change the definition of positive cell to: 5 red pixels", definition: { measure: "positive cell", old: "1 red pixel", new: "5 red pixels" } });
    st = planReduce(card, planInit(card), { a: "programs" }).state;
    expect(st.step).toBe("program");
    expect(planReduce(card, st, { a: "program", index: 0 }).respond).toEqual({ action: "change", text: "Use lme4 for Stats, not biostats." });
  });
  test("the pilot result: confirm, another sample, or change", () => {
    const card = plan({ stage: "pilot" });
    const st = planInit(card);
    expect(planReduce(card, st, { a: "pilot", value: "confirm" }).respond).toEqual({ action: "confirm" });
    expect(planReduce(card, st, { a: "pilot", value: "another" }).respond).toEqual({ action: "another" });
    const ch = planReduce(card, st, { a: "pilot", value: "change" }).state;
    expect(ch.step).toBe("change");
    expect(planReduce(card, ch, { a: "changeText", text: "" }).state.step).toBe("decisions");
  });
});

describe("messages during a turn", () => {
  test("idle sends, busy steers after the step, ! sends now, queue setting queues", () => {
    const s = new FakeSession();
    expect(routeMessage(s, " hi ", false)).toEqual({ t: "send", text: "hi" });
    expect(routeMessage(s, "more", true)).toMatchObject({ t: "steer", text: "more", now: false });
    expect(routeMessage(s, "!stop", true)).toMatchObject({ t: "steer", text: "stop", now: true });
    expect(routeMessage(s, "x", true, true)).toMatchObject({ t: "steer", now: true });
    s.settings.messages = "queue";
    expect(routeMessage(s, "later", true)).toEqual({ t: "queue", text: "later" });
    expect(nextQueued(s, ["a"]).next).toBe("more");
  });
});

describe("settings", () => {
  test("a locked row gives a message, a key row opens the key card", () => {
    const def = { name: "model", group: "Model", label: "Model", help: "", scopes: ["session" as const], lockedInTurn: true, choices: () => ["a", "b"] };
    expect(settingEditor({ def, value: "a", source: "default", locked: true })).toMatchObject({ t: "message" });
    expect(settingEditor({ def, value: "b", source: "default", locked: false })).toMatchObject({ t: "value", options: ["a", "b"], sel: 1 });
    expect(settingEditor({ def: { ...def, edit: "key" }, value: "", source: "", locked: false })).toEqual({ t: "edit", card: "key" });
  });
});
