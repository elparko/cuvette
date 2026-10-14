import { describe, expect, test } from "vitest";
import type { Entry, Question } from "../src/core/types.ts";
import { cardFromEvent, checkLines, sheetRows, clarifyOpen, clarifyProgress, closesCard, permissionView, planInit, planReduce, planResolve, planTitle, pushCard, settingLabel, settingQuestion, setupRequest, type Card, type PlanCard } from "../src/ui/cards.ts";
import { routeMessage, nextQueued } from "../src/ui/messages.ts";
import { settingEditor } from "../src/ui/config.ts";
import { failureText, problemOf } from "../src/ui/commands.ts";
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

describe("the permission card for a command", () => {
  const card = (args: Record<string, unknown>) => permissionView({ t: "permission", rid: "r1", tool: "run_command", args, touches: "files" });

  test("shows the whole command in the card, with each argument that holds a space or a quote in quotes", () => {
    const v = card({ purpose: "Count", does: "Counts lines.", argv: ["wc", "-l", "my file.csv", 'say "hi"', ""] });
    expect(v.args).toEqual(['Command: wc -l "my file.csv" "say \\"hi\\"" ""']);
    expect(v.code).toBeUndefined();
  });

  test("does not cut a long command, and does not hide the end of it", () => {
    const tail = "rm -rf /tmp/zzz";
    const v = card({ purpose: "Run", does: "Runs it.", argv: ["sh", "-c", `${"x".repeat(2000)}; ${tail}`] });
    expect(v.args).toHaveLength(1);
    expect(v.args[0]!.endsWith(`${tail}"`)).toBe(true);
    expect(v.args[0]!.length).toBeGreaterThan(2000);
  });

  test("writes out a line break, a control code and a text direction control, so that the card shows what runs", () => {
    const v = card({ purpose: "Print", does: "Prints.", argv: ["echo", "a\nb", "esc\u001b[31m", "cr\rx", "ev\u202eil", "bell\u0007", "c1\u009b2J"] });
    const text = v.args[0]!;
    expect(text).toContain("a\\nb");
    expect(text).toContain("esc\\u001b[31m");
    expect(text).toContain("cr\\rx");
    expect(text).toContain("ev\\u202eil");
    expect(text).toContain("bell\\u0007");
    expect(text).toContain("c1\\x9b2J");
    expect(text).not.toMatch(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e]/);
  });

  test("keeps Unicode text and emoji as they are", () => {
    const v = card({ purpose: "Print", does: "Prints.", argv: ["echo", "héllo 日本語 😀"] });
    expect(v.args).toEqual(['Command: echo "héllo 日本語 😀"']);
  });

  test("another long value is cut at 1000 characters with the number of characters that it left out", () => {
    const v = card({ purpose: "Ask", does: "Asks.", argv: ["true"], query: `${"😀".repeat(900)}` });
    const line = v.args.find((a) => a.startsWith("query = "))!;
    expect(line).toMatch(/\.\.\. \(\d+ more characters\)$/);
    expect(line).not.toMatch(/[\ud800-\udbff]\.\.\./);
  });

  test("script code keeps its line breaks and shows control codes written out", () => {
    const v = permissionView({ t: "permission", rid: "r1", tool: "run_script", args: { purpose: "Run", does: "Runs.", code: "a = 1\n\tb = 2\nprint('\u001b[2J')" }, touches: "files" });
    expect(v.code).toBe("a = 1\n\tb = 2\nprint('\\x1b[2J')");
  });
});

describe("the text of a command error", () => {
  test("a program error shows the message on one line, with no double period and no cut emoji", () => {
    const text = failureText("status", new TypeError(`Bad value.\nSecond line ${"😀".repeat(150)}`));
    expect(text).not.toContain("\n");
    expect(text).not.toContain("..");
    expect(text).toMatch(/^\/status failed\. Cuvette hit a program error: TypeError: Bad value\. Second line (😀)+…\. The full error is in the session record\./);
    expect(text).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/);
    expect(failureText("status", new TypeError("Short message."))).toContain("TypeError: Short message. The full error");
  });

  test("a folder that is read-only says which path failed, what the cause can be and what to do", () => {
    const text = problemOf(Object.assign(new Error("EACCES: permission denied"), { code: "EACCES", path: "/data/run/trail.html" }));
    expect(text).toBe("Cuvette cannot write to /data/run/trail.html. The folder has read-only access, or you have no permission to write in it. Fix the permission, then type the command again.");
    expect(problemOf(Object.assign(new Error("x"), { code: "ENOSPC" }))).toBe("The disk is full. Free some space, then type the command again.");
  });
});

describe("the data check and the sample sheet on the questions card", () => {
  test("the clarify event carries the data check and the design notes", () => {
    const check = ["Data check of Ox-LDL: 35 files in 6 folders.", "Problems found in the data:", ...Array.from({ length: 20 }, (_, i) => `- problem ${i + 1}`)].join("\n");
    const c = cardFromEvent({ type: "clarify", found: "I see 2 groups.", qids: ["q1"], skipped: [], check, notes: ["n is the Set."] }) as Extract<Card, { t: "clarify" }>;
    expect(c.notes).toEqual(["n is the Set."]);
    expect(checkLines(c, 1)).toEqual(["Data check of Ox-LDL: 35 files in 6 folders."]);
    const lines = checkLines(c, 5);
    expect(lines).toHaveLength(5);
    expect(lines.at(-1)).toBe("… 18 more lines. Type /samples check to see all.");
  });
  test("the edited cells of the sample sheet come back as rows", () => {
    const sheet = { ...q("q3"), title: "Sample sheet", table: { columns: ["sample", "group", "unit", "batch", "path"], rows: [["a", "Cer", "Set 1", "", "a.tif"], ["b", "Ctrl", "Set 2", "", "b.tif"]] } };
    expect(sheetRows({ "cell:0:1": " Ceramide ", "cell:1:3": "Day 2" }, sheet)).toEqual([["a", "Ceramide", "Set 1", "", "a.tif"], ["b", "Ctrl", "Set 2", "Day 2", "b.tif"]]);
    expect(sheetRows({}, q("q4"))).toBeUndefined();
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

describe("the program choice", () => {
  test("the program is a pre-filled item in the proposed metrics; a number opens it, and another program becomes a change request", async () => {
    const { planText } = await import("../src/core/plan.ts");
    const text = planText({ steps: [{ step: "Compare", status: "todo", decisions: [{ label: "Test", value: "Welch t test", by: "agent" }] }], programs: [{ part: "Statistics", adapter: "biostats", program: "SciPy", why: "It runs the t test." }] }, { view: "compact", numbered: true });
    expect(text).toContain("[1] Test: Welch t test (agent)");
    expect(text).toContain("Programs\n[2] Statistics: SciPy through biostats (agent). It runs the t test.");
    const card = plan({ settings: [{ index: 0, step: 1, label: "Test", value: "Welch t test", by: "agent" }], programs: [{ part: "Statistics", adapter: "biostats", program: "SciPy", why: "It runs the t test.", alternatives: ["r-stats"] }] });
    const { itemCount, programQuestion } = await import("../src/ui/cards.ts");
    expect(itemCount(card)).toBe(2);
    const st = planReduce(card, planInit(card), { a: "item", n: 2 }).state;
    expect(st.step).toBe("useprogram");
    const pq = programQuestion(card, st)!;
    expect(pq.options.map((o) => o.label)).toEqual(["Keep SciPy through biostats", "Use r-stats"]);
    expect(pq.recommendation?.value).toBe("biostats");
    expect(planReduce(card, st, { a: "useProgram", value: "biostats" }).state.step).toBe("actions");
    expect(planReduce(card, st, { a: "useProgram", value: "r-stats" }).respond).toEqual({ action: "change", text: "Use r-stats for Statistics, not biostats." });
  });

  test("Enter accepts the recommendation or the default; with neither, the card says what is needed and the cursor stays on the first option", async () => {
    const { answerLine, questionCursor, questionEnter, questionNeed, setupValues } = await import("../src/ui/cards.ts");
    const opts = [{ value: "a", label: "A" }, { value: "b", label: "B" }];
    const base = { ...q("q1"), options: opts };
    expect(questionCursor({ ...base, recommendation: { value: "b", reason: "" } })).toBe(1);
    expect(questionCursor({ ...base, default: "b" })).toBe(1);
    expect(questionCursor({ ...base, recommendation: { value: "b", reason: "" } }, "a")).toBe(0);
    expect(questionEnter({ ...base, recommendation: { value: "b", reason: "" } }, 1)).toEqual({ value: "b" });
    expect(questionEnter({ ...base, options: [], recommendation: { value: "lab", reason: "" } }, 0)).toEqual({ value: "lab" });
    expect(questionEnter({ ...base, options: [], default: 5 }, 0)).toEqual({ value: 5 });
    expect(questionEnter({ ...base, options: [], title: "Program (adapter)" }, 0)).toEqual({ type: "Program (adapter) needs your answer. Type it here." });
    expect(questionCursor(base)).toBe(0);
    expect(questionNeed({ ...base, title: "Color" })).toBe("There is no recommendation for Color. Choose one of the options.");
    expect(questionNeed({ ...base, recommendation: { value: "a", reason: "" } })).toBeUndefined();
    expect(questionNeed({ ...base, title: "Which test do you want to use to compare the endocardium with the epi..." })).toBe("There is no recommendation. Choose one of the options.");
    expect(questionEnter({ ...base, options: [], title: "Which dose?" }, 0)).toEqual({ type: "This question needs your answer. Type it here." });
    expect(answerLine({ qid: "q1", title: "Which test do you want to use...", options: [{ value: "t", label: "t test" }] }, "t")).toBe("Which test do you want to use…: t test · /change q1");
    const fields = [{ key: "adapter", label: "Program (adapter)", kind: "text", owner: "agent" as const, value: undefined, set: false }, { key: "alpha", label: "Alpha", kind: "float", owner: "human" as const, value: undefined, set: false, default: 0.05 }];
    expect(setupValues(fields, { t: "setup", profiles: [] })).toEqual({ alpha: 0.05 });
  });
});

describe("question sequence and /change in the shared layer", () => {
  test("one question at a time with a count; answers move forward; Back and Next move inside the answered ones; Esc leaves", async () => {
    const { SEQ_START, seqView, seqAnswered, seqBack, seqNext, seqProgress, seqPending, seqLeave, canGoBack, reopenQuestions } = await import("../src/ui/cards.ts");
    const cards: Card[] = [{ t: "question", q: q("q1") }, { t: "question", q: q("q2") }, { t: "question", q: q("q3") }];
    let seq = SEQ_START;
    let v = seqView(seq, seqPending(cards))!;
    expect([v.q.qid, seqProgress(v), v.changing]).toEqual(["q1", "Question 1 of 3", false]);
    expect(canGoBack(seq)).toBe(false);
    seq = seqAnswered(seq, v.q, 1);
    v = seqView(seq, seqPending(cards.slice(1)))!;
    expect([v.q.qid, seqProgress(v)]).toEqual(["q2", "Question 2 of 3"]);
    seq = seqBack(seq);
    v = seqView(seq, seqPending(cards.slice(1)))!;
    expect([v.q.qid, seqProgress(v), v.changing, v.current]).toEqual(["q1", "Question 1 of 3", true, 1]);
    expect(canGoBack(seq)).toBe(false);
    seq = seqAnswered(seq, v.q, 2);
    expect(seq).toEqual({ done: [{ q: q("q1"), value: 2 }], back: -1 });
    expect(seqNext(seqBack(seq))).toEqual(seq);
    expect(seqLeave([plan(), ...cards]).map((c) => c.t)).toEqual(["plan"]);
    expect(reopenQuestions([], [q("q2"), q("q3")]).map((c) => (c as { q: { qid: string } }).q.qid)).toEqual(["q2", "q3"]);
  });

  test("/change rows are newest first; a decision change is logged with its out-of-date steps; after a demonstration the card asks to run it again", async () => {
    const { changeRows, changeCard, findChange, respondQuestion, changePicker } = await import("../src/ui/cards.ts");
    const s = new FakeSession({ delayMs: 0 });
    s.decisions.applySetup({ question: "Do cells eat more?" });
    s.askMany([{ ...q("q1"), title: "One n", decisionKey: "", options: [{ value: "set", label: "one Set" }, { value: "field", label: "one field" }] }]);
    await s.answer("q1", "set");
    s.record.append("pilot_run", { sample: "control/field1" });
    const rows = changeRows(s);
    expect(rows[0]).toMatchObject({ id: "q1", label: "One n", value: "one Set", kind: "question", note: "The demonstration used the old value. Run it again?", rerun: "control/field1" });
    expect(rows.slice(1).every((r) => r.kind === "decision")).toBe(true);
    expect(rows.length).toBeGreaterThan(1);
    expect(findChange(rows, "one n")?.id).toBe("q1");
    const picker = changePicker(rows);
    expect(picker.t === "question" && picker.q.options[0]!.label).toBe("One n: one Set");
    const r1 = await respondQuestion(s, picker as never, "q1");
    expect(r1.next).toEqual(changeCard(rows[0]!));
    const r2 = await respondQuestion(s, r1.next as never, "field");
    expect(r2.line).toBe("One n is now one field.");
    expect(s.record.entries(["answer"]).at(-1)!.data).toMatchObject({ qid: "q1", value: "field", changed: true, old: "set" });
    expect(r2.next && r2.next.t === "question" && r2.next.q.text).toBe("You changed One n. The demonstration used the old value. Run it again?");
    await respondQuestion(s, r2.next as never, "yes");
    expect(s.sent.at(-1)).toBe("The scientist changed One n. Run the demonstration again on control/field1 with the new value, then call pilot_result.");
    const dec = rows.find((r) => r.kind === "decision")!;
    const r3 = await respondQuestion(s, changeCard(dec) as never, "something new");
    expect(r3.line!.startsWith(`${dec.label} is now something new.`)).toBe(true);
    expect(s.record.entries(["decision"]).at(-1)!.data).toMatchObject({ key: dec.key, new: "something new", reason: "changed with /change" });
  });
});

describe("the setup card question", () => {
  test("starts the analysis only before the first request", () => {
    const s = new FakeSession({ delayMs: 0 });
    expect(setupRequest(s, { question: "  Is drug 2 better?  " })).toBe("Is drug 2 better?");
    expect(setupRequest(s, { question: "" })).toBeUndefined();
    s.record.append("user", { text: "Count the cells." });
    expect(setupRequest(s, { question: "Is drug 2 better?" })).toBeUndefined();
  });
});

describe("decision rows and question titles", () => {
  test("an empty value is not set, and a value from the scientist is set by you", async () => {
    const { decisionRows } = await import("../src/ui/commands.ts");
    const s = new FakeSession();
    s.decisions.applySetup({ question: "", alpha: 0.01 });
    const rows = Object.fromEntries(decisionRows(s).map((r) => [r[0], r[3]]));
    expect(rows.question).toBe("not set");
    expect(rows.alpha).toBe("you (setup)");
    expect(rows.min_auc).toBe("default");
  });

  test("a clipped title gives the full question as the title and no repeated text", async () => {
    const { questionHead } = await import("../src/ui/cards.ts");
    const long = "x".repeat(90) + "?";
    expect(questionHead({ title: long.slice(0, 77) + "...", text: long })).toEqual({ title: long, text: "" });
    expect(questionHead({ title: "Which test?", text: "Which test?" })).toEqual({ title: "Which test?", text: "" });
    expect(questionHead({ title: "Which test?", text: "Choose one." })).toEqual({ title: "Which test?", text: "Choose one." });
  });
});
