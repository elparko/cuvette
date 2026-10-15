import { cpSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { afterEach, beforeEach, expect, test } from "vitest";
import { saveAccess } from "../src/adapters/access.ts";
import { applyInstall, prepareAdd } from "../src/adapters/install.ts";
import { CATALOG_DIR, loadAdapter } from "../src/adapters/manifest.ts";
import { isRecordName } from "../src/core/places.ts";
import { Session, cleanText } from "../src/core/session.ts";
import { genericTools } from "../src/tools/generic.ts";
import type { Message, StepResult, ToolOutput } from "../src/core/types.ts";
import { FakeProvider, type FakeStep } from "../src/providers/fake.ts";
import { checkText } from "../src/core/ste.ts";

type Bad = FakeStep & { stopReason?: StepResult["stopReason"]; parseError?: string; note?: string };

class ScriptedProvider extends FakeProvider {
  private n = 0;
  constructor(private bad: Bad[]) {
    super(bad);
  }
  async step(req: Parameters<FakeProvider["step"]>[0]): Promise<StepResult> {
    const b = this.bad[this.n++] ?? { text: "done" };
    const res = await super.step(req);
    if (b.stopReason) res.stopReason = b.stopReason;
    if (b.note) res.note = b.note;
    if (b.parseError) for (const p of res.message.parts) if (p.type === "tool_call") p.parseError = b.parseError;
    return res;
  }
}

const windows = process.platform === "win32";
let session: Session | undefined;
let home = "";
let work = "";
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cuvette-misbehave-home-"));
  work = mkdtempSync(join(tmpdir(), "cuvette-misbehave-work-"));
  process.env.CUVETTE_HOME = home;
  process.env.CUVETTE_STAGING = join(work, "staging");
});
afterEach(async () => {
  await session?.close();
  session = undefined;
  rmSync(home, { recursive: true, force: true });
  rmSync(work, { recursive: true, force: true });
});

async function start(steps: Bad[], settings: Record<string, unknown> = {}, cwd = mkdtempSync(join(work, "proj-"))) {
  const provider = new ScriptedProvider(steps);
  session = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false, askWaits: false, permissionMode: "bypass", ...settings } });
  return { provider, cwd, session };
}

const call = (name: string, args: unknown): Bad => ({ calls: [{ name, args }] });

function texts(p: FakeProvider): string[] {
  const msgs: Message[] = p.requests.at(-1)!.messages;
  return msgs.flatMap((m) => m.parts).flatMap((x) => (x.type === "tool_result" ? [x.text] : []));
}

function lastUserText(p: FakeProvider, request: number): string {
  return p.requests[request]!.messages.at(-1)!.parts.map((x) => (x.type === "text" ? x.text : "")).join("");
}

function notices(s: Session): string[] {
  return s.record.entries(["notice"]).map((e) => String(e.data.text));
}

function results(s: Session) {
  return s.record.entries(["tool_result"]).map((e) => e.data as { tool: string; ok: boolean; error?: string; text?: string });
}

function addTool(s: Session, name: string, run: () => ToolOutput) {
  (s["tools"] as Map<string, unknown>).set(name, { name, description: "Test tool.", inputSchema: { type: "object", properties: {} }, source: "adapter", adapter: "lab", readOnly: true, permission: "allow", execute: async () => run() });
  s["useTools"]([name]);
}

async function until(check: () => boolean, ms = 30000) {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error("the condition did not become true");
    await new Promise((r) => setTimeout(r, 20));
  }
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

test("a tool that does not exist: the error lists the valid tool names", async () => {
  const { provider, session: s } = await start([call("no_such_tool", {}), { text: "ok" }]);
  await s.send("go");
  expect(texts(provider)[0]).toMatch(/^ERROR: no tool named no_such_tool\. Use only these tools: .*read_file.*list_dir.*run_script/);
  expect(results(s).map((r) => r.ok)).toEqual([false]);
  expect(s.record.entries(["tool_call"]).map((e) => e.data.tool)).toEqual(["no_such_tool"]);
  expect(s.endedBy).toBe("answer");
});

test("a wrong type for an argument gives an error that names the argument and the type", async () => {
  const { provider, session: s } = await start([call("read_file", { path: 42 }), call("read_file", { path: ".", max_bytes: "lots" }), { text: "ok" }]);
  await s.send("go");
  const t = texts(provider);
  expect(t[0]).toContain("path must be of type string");
  expect(t[1]).toContain("max_bytes must be of type integer");
  expect(results(s).map((r) => r.ok)).toEqual([false, false]);
});

test("a harness tool checks the type of its arguments too", async () => {
  const { provider, session: s } = await start([
    call("ask_scientist", { question: { a: 1 } }),
    call("ask_scientist", { question: "Which?", options: "a" }),
    call("load_skill", { name: { a: 1 } }),
    call("plan", { steps: "abc" }),
    { text: "ok" },
  ]);
  await s.send("go");
  const t = texts(provider);
  expect(t[0]).toContain("question must be of type string");
  expect(t[1]).toContain("options must be of type array");
  expect(t[2]).toContain("name must be of type string");
  expect(t[3]).toContain("steps must be a list. Each item is an object with step and status.");
  expect(s.questions.open()).toHaveLength(0);
});

test("a missing required argument gives an error that names it", async () => {
  const { provider, session: s } = await start([call("read_file", {}), call("read_file", null), call("read_file", [1, 2]), call("read_file", "path"), { text: "ok" }]);
  await s.send("go");
  expect(texts(provider)).toEqual(Array(4).fill("ERROR: missing required arguments: path"));
});

test("an unknown extra argument gives an error that lists the valid arguments", async () => {
  const { provider, session: s } = await start([call("read_file", { path: ".", bogus: 1 }), { text: "ok" }]);
  await s.send("go");
  expect(texts(provider)[0]).toContain("unknown argument bogus. The arguments of this tool are: path, max_bytes. Leave out the others.");
});

test("tool input that is not valid JSON gives an error and the tool does not run", async () => {
  const { provider, session: s } = await start([{ ...call("read_file", {}), parseError: "Unexpected token } in JSON at position 9" }, { text: "ok" }]);
  await s.send("go");
  expect(texts(provider)[0]).toBe("ERROR: the arguments are not valid JSON: Unexpected token } in JSON at position 9");
  expect(results(s).map((r) => r.ok)).toEqual([false]);
  expect(s.record.nodes()).toEqual([]);
});

test("the same failing call ten times: the third call gets the stop text and the next request has no tools", async () => {
  const fail = call("read_file", { path: "missing.txt" });
  const { provider, session: s } = await start([...Array.from({ length: 10 }, () => fail), { text: "I could not read the file." }]);
  const answer = await s.send("go");
  const t = texts(provider);
  expect(t[0]).toContain("is not a file");
  expect(t[1]).toContain("is not a file");
  for (const x of t.slice(2)) expect(x).toBe("ERROR: you called read_file with the same input three times in a row. Stop. Give your final answer now, from the results you have.");
  expect(notices(s).filter((n) => n === "The agent called read_file with the same input three times. The harness asks for the final answer.")).toHaveLength(8);
  expect(provider.requests[2]!.tools.length).toBeGreaterThan(0);
  expect(provider.requests[3]!.tools).toEqual([]);
  expect(answer).toBe("I could not read the file.");
  expect(s.endedBy).toBe("answer");
});

const STOP_TEXT = "ERROR: you called poll with the same input three times in a row. Stop. Give your final answer now, from the results you have.";

function pollTool(s: Session, results: (n: number) => ToolOutput) {
  let n = 0;
  addTool(s, "poll", () => results(n++));
  return () => n;
}

test("three identical calls with a changing result do not trigger the loop guard", async () => {
  const { provider, session: s } = await start([...Array.from({ length: 5 }, () => call("poll", {})), { text: "The job is done." }]);
  const ran = pollTool(s, (n) => ({ ok: true, summary: `Job status: running ${n * 20} percent.` }));
  const answer = await s.send("go");
  expect(ran()).toBe(5);
  expect(texts(provider).every((x) => !x.includes("three times"))).toBe(true);
  expect(notices(s).some((x) => x.includes("three times"))).toBe(false);
  expect(provider.requests.at(-1)!.tools.length).toBeGreaterThan(0);
  expect(answer).toBe("The job is done.");
});

test("a changing metric or a changing data field is a changing result, and a changing time field is not", async () => {
  const changing = await start([...Array.from({ length: 4 }, () => call("poll", {})), { text: "ok" }]);
  pollTool(changing.session, (n) => ({ ok: true, summary: "Status.", metrics: { done: n } }));
  await changing.session.send("go");
  expect(texts(changing.provider).every((x) => !x.includes("three times"))).toBe(true);
  await changing.session.close();
  const timed = await start([...Array.from({ length: 4 }, () => call("poll", {})), { text: "ok" }]);
  pollTool(timed.session, (n) => ({ ok: true, summary: "Status.", metrics: { done: 3 }, data: { duration_s: 1 + n, started: "t" } }));
  await timed.session.send("go");
  expect(texts(timed.provider)[2]).toBe(STOP_TEXT);
});

test("three identical calls with identical results stop with the same text as before", async () => {
  const { provider, session: s } = await start([...Array.from({ length: 6 }, () => call("poll", {})), { text: "The job is still running." }]);
  const ran = pollTool(s, () => ({ ok: true, summary: "Job status: running 40 percent." }));
  const answer = await s.send("go");
  const t = texts(provider);
  expect(t[0]).toContain("running 40 percent");
  expect(t[1]).toContain("running 40 percent");
  expect(t[2]).toBe(STOP_TEXT);
  expect(ran()).toBe(3);
  expect(notices(s).filter((n) => n === "The agent called poll with the same input three times. The harness asks for the final answer.")).toHaveLength(4);
  expect(provider.requests[3]!.tools).toEqual([]);
  expect(answer).toBe("The job is still running.");
});

test("three failing identical calls stop before the third call runs", async () => {
  const { provider, session: s } = await start([...Array.from({ length: 4 }, () => call("poll", {})), { text: "The job failed." }]);
  const ran = pollTool(s, (n) => ({ ok: false, error: `The job failed with code ${n}.` }));
  await s.send("go");
  const t = texts(provider);
  expect(t[0]).toContain("code 0");
  expect(t[1]).toContain("code 1");
  expect(t[2]).toBe(STOP_TEXT);
  expect(ran()).toBe(2);
});

test("a different call, or a failure between the calls, resets the count", async () => {
  const { provider, session: s } = await start([call("poll", {}), call("poll", {}), call("poll", { id: 2 }), call("poll", {}), call("poll", {}), call("poll", {}), { text: "ok" }]);
  let n = 0;
  addTool(s, "poll", () => (n++ === 5 ? { ok: false, error: "The server did not answer." } : { ok: true, summary: "Job status: running." }));
  await s.send("go");
  const t = texts(provider);
  expect(t).toHaveLength(6);
  expect(t.every((x) => !x.includes("three times"))).toBe(true);
  expect(n).toBe(6);
});

test("three identical run_script calls with identical output stop, also though each run has a new folder", async () => {
  const code = { purpose: "Test", does: "Prints a number.", code: "print(2 + 2)" };
  const { provider, session: s } = await start([call("run_script", code), call("run_script", code), call("run_script", code), { text: "The answer is 4." }]);
  await s.send("go");
  const t = texts(provider);
  expect(t[0]).toContain("4");
  expect(t[2]).toBe("ERROR: you called run_script with the same input three times in a row. Stop. Give your final answer now, from the results you have.");
});

test("three identical run_script calls with a changing output do not stop", async () => {
  const code = { purpose: "Test", does: "Prints the time.", code: "import time\nprint(time.time_ns())" };
  const { provider, session: s } = await start([call("run_script", code), call("run_script", code), call("run_script", code), { text: "ok" }]);
  await s.send("go");
  expect(texts(provider).every((x) => !x.includes("three times"))).toBe(true);
});

test("calls that change each time do not trigger the loop guard: the step limit ends the turn", async () => {
  const steps = Array.from({ length: 30 }, (_, i) => call("read_file", { path: `missing-${i % 2}.txt` }));
  const { provider, session: s } = await start(steps, { maxSteps: 6 });
  const answer = await s.send("go");
  expect(provider.requests).toHaveLength(6);
  expect(answer).toBe("");
  expect(s.endedBy).toBe("max_steps");
  expect(s.busy).toBe(false);
  expect(s.record.entries(["notice"]).filter((e) => e.data.warn).map((e) => e.data.text)).toEqual(['Paused after 6 steps. Type "continue" to go on.']);
});

test("an empty reply gets two nudges. After that the scientist sees a notice, not a blank answer", async () => {
  const { provider, session: s } = await start([{}, {}, {}, { text: "never reached" }]);
  const answer = await s.send("go");
  expect(provider.requests).toHaveLength(3);
  expect(answer).toBe("");
  expect(s.endedBy).toBe("error");
  expect(notices(s).at(-1)).toBe('The model gave no answer. Its last replies had no text and no tool call. Type "continue" to ask again, or choose another model.');
  expect(s.record.entries(["assistant"]).filter((e) => e.data.final)).toEqual([]);
  expect(lastUserText(provider, 1)).toContain("Your last reply was empty.");
});

test("a reply with only thinking is handled like an empty reply", async () => {
  const { provider, session: s } = await start([{ thinking: "hmm" }, { thinking: "hmm" }, { thinking: "hmm" }, { text: "never reached" }]);
  expect(await s.send("go")).toBe("");
  expect(provider.requests).toHaveLength(3);
  expect(s.record.entries(["thinking"]).length).toBe(3);
  expect(s.endedBy).toBe("error");
  expect(notices(s).at(-1)).toMatch(/^The model gave no answer\./);
});

test("an empty reply after one nudge can still recover", async () => {
  const { session: s } = await start([{}, { text: "Here is the answer." }]);
  expect(await s.send("go")).toBe("Here is the answer.");
  expect(s.endedBy).toBe("answer");
});

test("a reply that the output limit cut gets a note that tells the model to do the step again, shorter", async () => {
  const { provider, session: s } = await start([{ text: "First I will", stopReason: "max_tokens" }, { text: "The count is done." }]);
  expect(await s.send("go")).toBe("The count is done.");
  expect(lastUserText(provider, 1)).toContain("The output limit stopped your last reply before its end. If it had a tool call, that call did not run.");
  expect(s.record.entries(["assistant"]).map((e) => e.data.final)).toEqual([false, true]);
});

test("a tool call that the output limit cut in the middle does not run and the error says why", async () => {
  const { provider, session: s } = await start([
    { ...call("write_file", {}), parseError: 'The output limit cut the arguments before their end: {"name":"a.txt","text":"abc', stopReason: "max_tokens" },
    { text: "ok" },
  ]);
  await s.send("go");
  expect(texts(provider)[0]).toMatch(/^ERROR: the arguments are not valid JSON: The output limit cut the arguments before their end/);
  expect(results(s).map((r) => r.ok)).toEqual([false]);
  expect(readdirSync(s.workDir)).not.toContain("a.txt");
});

test("a refusal ends the turn with the text of the refusal and one request", async () => {
  const text = "The model declined this request (category: cyber).";
  const { provider, session: s } = await start([{ text, stopReason: "refusal", note: text }]);
  expect(await s.send("go")).toBe(text);
  expect(provider.requests).toHaveLength(1);
  expect(s.endedBy).toBe("answer");
  expect(notices(s)).toContain(text);
});

test("a reply with text and a tool call is not the final answer: the call runs and the next reply is the answer", async () => {
  const { provider, session: s } = await start([{ text: "The answer is 5.", calls: [{ name: "note", args: { text: "n" } }] }, { text: "The checked answer." }]);
  expect(await s.send("go")).toBe("The checked answer.");
  expect(provider.requests).toHaveLength(2);
  expect(s.record.entries(["assistant"]).map((e) => [e.data.text, e.data.final])).toEqual([["The answer is 5.", false], ["The checked answer.", true]]);
});

test("a model that asks for another step after each answer stops at the step limit", async () => {
  const steps = Array.from({ length: 20 }, (_, i) => ({ text: `Answer ${i}.`, calls: [{ name: "note", args: { text: `n${i}` } }] }));
  const { provider, session: s } = await start(steps, { maxSteps: 5 });
  await s.send("go");
  expect(provider.requests).toHaveLength(5);
  expect(s.endedBy).toBe("max_steps");
});

test("a question with no options is a free-text question", async () => {
  const { provider, session: s } = await start([call("ask_scientist", { question: "Which cells?", options: [] }), { text: "ok" }]);
  await s.send("go");
  const q = s.questions.open();
  expect(q).toHaveLength(1);
  expect(q[0]!.options).toEqual([]);
  expect(texts(provider)[0]).toContain("is waiting for the scientist");
});

test("a question with 50 options gets an error that names the limit and the way out", async () => {
  const options = Array.from({ length: 50 }, (_, i) => `option ${i}`);
  const { provider, session: s } = await start([call("ask_scientist", { question: "Which?", options }), { text: "ok" }]);
  await s.send("go");
  expect(texts(provider)[0]).toContain("You gave 50 options. The limit is 12. Group the options, or give no options so that the scientist types the answer.");
  expect(s.questions.open()).toHaveLength(0);
});

test("duplicate and empty options become one list of different options", async () => {
  const { session: s } = await start([call("ask_scientist", { question: "Which?", options: ["a", "a", " b ", "", "a"] }), { text: "ok" }]);
  await s.send("go");
  expect(s.questions.open()[0]!.options.map((o) => o.value)).toEqual(["a", "b"]);
});

test("numbers as options and as the recommendation are still accepted", async () => {
  const { session: s } = await start([call("ask_scientist", { question: "How many groups?", options: [2, 3, 4], recommendation: 3 }), { text: "ok" }]);
  await s.send("go");
  const q = s.questions.open()[0]!;
  expect(q.options.map((o) => o.value)).toEqual(["2", "3", "4"]);
  expect(q.recommendation?.value).toBe("3");
});

test("markdown and HTML in a question stay as plain text in the record", async () => {
  const question = "<script>alert(1)</script> **bold** [x](javascript:alert(1)) <img src=x onerror=1>";
  const { session: s } = await start([call("ask_scientist", { question, options: ["<b>x</b>", "`y`"] }), { text: "ok" }]);
  await s.send("go");
  const q = s.questions.open()[0]!;
  expect(q.text).toBe(question);
  expect(q.options.map((o) => o.label)).toEqual(["<b>x</b>", "`y`"]);
});

test("a very long question or option gets an error with the limit, and a long title is cut", async () => {
  const { provider, session: s } = await start([
    call("ask_scientist", { question: "Q".repeat(200000) }),
    call("ask_scientist", { question: "Which?", options: ["x".repeat(5000)] }),
    call("ask_scientist", { question: "   " }),
    call("ask_scientist", { question: "T".repeat(1500) }),
    { text: "ok" },
  ]);
  await s.send("go");
  const t = texts(provider);
  expect(t[0]).toContain("The question has 200000 characters. The limit is 2000. Ask a shorter question.");
  expect(t[1]).toContain("An option has 5000 characters. The limit is 200.");
  expect(t[2]).toContain("The question is empty.");
  const q = s.questions.open();
  expect(q).toHaveLength(1);
  expect(q[0]!.title).toHaveLength(80);
});

test("a question in the same reply as other tools: the other tools run after the answer", async () => {
  const { provider, session: s } = await start(
    [{ calls: [{ name: "ask_scientist", args: { question: "Which?", options: ["a", "b"] } }, { name: "note", args: { text: "after the answer" } }, { name: "read_file", args: { path: "missing.txt" } }] }, { text: "ok" }],
    { askWaits: true },
  );
  const run = s.send("go");
  await until(() => s.questions.open().length === 1);
  expect(s.record.entries(["note"])).toEqual([]);
  s.answer(s.questions.open()[0]!.qid, "b");
  await run;
  const t = texts(provider);
  expect(t[0]).toContain("The scientist answered: b");
  expect(t[1]).toContain("Note saved.");
  expect(t[2]).toContain("is not a file");
  expect(s.record.entries(["note"]).map((e) => e.data.text)).toEqual(["after the answer"]);
});

test("two read tools run together: one fails, one hangs, and Esc ends the turn with both results", async () => {
  const { provider, session: s } = await start([{ calls: [{ name: "read_file", args: { path: "missing.txt" } }, { name: "load_skill", args: { name: "x" } }] }, { text: "never reached" }]);
  s.abandonMs = 50;
  let started = false;
  (s["tools"] as Map<string, unknown>).set("load_skill", {
    name: "load_skill",
    description: "Hangs.",
    inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    source: "harness",
    readOnly: true,
    permission: "allow",
    execute: () => ((started = true), new Promise<ToolOutput>(() => {})),
  });
  const run = s.send("go");
  await until(() => started);
  s.interrupt();
  await run;
  expect(s.busy).toBe(false);
  expect(s.endedBy).toBe("stopped");
  expect(provider.requests).toHaveLength(1);
  const done = results(s);
  expect(done.find((r) => r.tool === "read_file")!.error).toContain("is not a file");
  expect(done.find((r) => r.tool === "load_skill")!.error).toBe("interrupted: the scientist stopped this tool. The tool did not stop within 0.05 s, so Cuvette stopped waiting for it");
  expect(notices(s)).toContain("Stopped. The results so far are kept.");
});

test("a result of 100 MB is cut to the limit and the harness stays fast", async () => {
  const { provider, session: s } = await start([call("big", {}), { text: "ok" }]);
  addTool(s, "big", () => ({ ok: true, summary: "Ran.", text: "ab cd ".repeat(Math.floor(100e6 / 6)) }));
  const t0 = Date.now();
  await s.send("go");
  const text = texts(provider)[0]!;
  expect(text.length).toBeLessThan(21000);
  expect(text).toMatch(/\[The harness cut \d+ characters\. Write long output to a file and read it in parts\.\]$/);
  expect(String(results(s)[0]!.text).length).toBe(4000);
  expect(Date.now() - t0).toBeLessThan(30000);
});

test("one line of 5 MB is cut too", async () => {
  const { provider, session: s } = await start([call("big", {}), { text: "ok" }]);
  addTool(s, "big", () => ({ ok: true, summary: "Ran.", text: "x".repeat(5e6) }));
  await s.send("go");
  expect(texts(provider)[0]!.length).toBeLessThan(21000);
});

test("binary data in a result does not go to the model", async () => {
  const { provider, session: s } = await start([call("bin", {}), { text: "ok" }]);
  addTool(s, "bin", () => ({ ok: true, summary: "Ran.", text: Buffer.from(Array.from({ length: 5000 }, (_, i) => (i * 37) % 256)).toString("utf8") }));
  await s.send("go");
  expect(texts(provider)[0]).toMatch(/^\[binary output, \d+ characters\. The harness did not send it to the model\.\]$/);
  expect(String(results(s)[0]!.text)).toMatch(/^\[binary output/);
});

test("terminal escape codes in a result and in an error are removed before the model and the record see them", async () => {
  const { provider, session: s } = await start([call("ansi", {}), call("ansi_fail", {}), { text: "ok" }]);
  addTool(s, "ansi", () => ({ ok: true, summary: "\x1b[32mdone\x1b[0m", text: "\x1b[31mred\x1b[0m \x1b]0;new title\x07\x1b]52;c;aGk=\x1b\\ \x1b[2Jtable\tcell\r\nnext" }));
  addTool(s, "ansi_fail", () => ({ ok: false, error: "\x1b[1;31mTraceback\x1b[0m\x07 failed" }));
  await s.send("go");
  const t = texts(provider);
  expect(t[0]).toContain("red  table\tcell\r\nnext");
  expect(t[1]).toContain("Traceback failed");
  for (const r of results(s)) expect(JSON.stringify(r)).not.toMatch(/\\u001b|\\u0007/);
  expect(cleanText("plain text\nwith a tab\t")).toBe("plain text\nwith a tab\t");
});

test("the model cannot read a file outside the folders of the analysis", async () => {
  const outside = mkdtempSync(join(work, "outside-"));
  writeFileSync(join(outside, "secret.txt"), "TOP SECRET");
  const { provider, session: s } = await start([call("read_file", { path: join(outside, "secret.txt") }), call("read_file", { path: "../../../../../../../../../../etc/hosts" }), call("list_dir", { path: outside }), { text: "ok" }]);
  await s.send("go");
  for (const x of texts(provider)) expect(x).toBe("ERROR: This path is outside the folders of this analysis. Ask the scientist where the data is, or use a path from the request.");
});

test.skipIf(windows)("a link inside the project folder that leads outside is refused for a file and for a folder", async () => {
  const outside = mkdtempSync(join(work, "outside-"));
  writeFileSync(join(outside, "secret.txt"), "TOP SECRET");
  const cwd = mkdtempSync(join(work, "proj-"));
  symlinkSync(outside, join(cwd, "link"));
  symlinkSync(join(outside, "secret.txt"), join(cwd, "linkfile.txt"));
  writeFileSync(join(cwd, "plain.txt"), "plain data");
  const { provider, session: s } = await start([call("read_file", { path: "link/secret.txt" }), call("read_file", { path: "linkfile.txt" }), call("list_dir", { path: "link" }), call("read_file", { path: "plain.txt" }), { text: "ok" }], {}, cwd);
  await s.send("go");
  const t = texts(provider);
  for (const x of t.slice(0, 3)) expect(x).toBe("ERROR: This path is a link that leads outside the folders of this analysis. Ask the scientist to name the real folder in the request. A folder that the request names is allowed.");
  expect(t[3]).toContain("plain data");
});

test.skipIf(windows)("a link to a folder that the scientist names in the request is allowed", async () => {
  const outside = mkdtempSync(join(work, "outside-"));
  writeFileSync(join(outside, "data.txt"), "lab data");
  const cwd = mkdtempSync(join(work, "proj-"));
  symlinkSync(outside, join(cwd, "link"));
  const { provider, session: s } = await start([call("read_file", { path: "link/data.txt" }), { text: "ok" }], {}, cwd);
  await s.send(`The data is in ${outside}`);
  expect(texts(provider)[0]).toContain("lab data");
});

test("the saved credentials file is not readable, also through a link", async () => {
  const key = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789";
  writeFileSync(join(home, "credentials.json"), JSON.stringify({ anthropic_api_key: key }));
  const cwd = mkdtempSync(join(work, "proj-"));
  const steps: Bad[] = [call("read_file", { path: join(home, "credentials.json") })];
  if (!windows) {
    symlinkSync(join(home, "credentials.json"), join(cwd, "creds.txt"));
    steps.push(call("read_file", { path: "creds.txt" }));
  }
  const { provider, session: s } = await start([...steps, { text: "ok" }], {}, cwd);
  await s.send("go");
  const t = texts(provider);
  expect(t[0]).toContain("holds the saved API keys. The agent cannot read it.");
  if (!windows) expect(t[1]).toMatch(/link that leads outside|holds the saved API keys/);
  expect(JSON.stringify(provider.requests.at(-1)!.messages)).not.toContain(key);
});

const HOME_TEXT = /^ERROR: This path is in the Cuvette home folder or in the record of another session\. The agent cannot read it\. Ask the scientist to name the folder in the request\.$/;

function otherSessions(cwd: string) {
  const record = join(cwd, "cuvette", "2026-10-13-other", ".record");
  mkdirSync(record, { recursive: true });
  writeFileSync(join(record, "log.jsonl"), '{"id":1,"kind":"user"}\n');
  writeFileSync(join(record, "meta.json"), "{}");
  writeFileSync(join(home, "sessions-index.json"), "[]");
  mkdirSync(join(home, "projects", "other", "run"), { recursive: true });
  writeFileSync(join(home, "projects", "other", "run", "results.csv"), "a\n1\n");
  return record;
}

test("the model cannot list the Cuvette home folder or read the session index, another record or the output of another project", async () => {
  const cwd = mkdtempSync(join(work, "proj-"));
  const record = otherSessions(cwd);
  const steps: Bad[] = [{ text: "Ready." }];
  const { provider, session: s } = await start(steps, {}, cwd);
  await s.send("go");
  steps.push(
    call("list_dir", { path: home }),
    call("read_file", { path: join(home, "sessions-index.json") }),
    call("read_file", { path: join(record, "log.jsonl") }),
    call("list_dir", { path: record }),
    call("list_dir", { path: join(home, "projects", "other") }),
    call("read_file", { path: join(home, "projects", "other", "run", "results.csv") }),
    { text: "ok" },
  );
  await s.send("look");
  const t = texts(provider);
  expect(t).toHaveLength(6);
  for (const x of t) expect(x).toMatch(HOME_TEXT);
});

test("the model reads the work and output files of its own session and the files of the project", async () => {
  const cwd = mkdtempSync(join(work, "proj-"));
  otherSessions(cwd);
  writeFileSync(join(cwd, "data.csv"), "id,value\n1,5\n");
  const steps: Bad[] = [{ text: "Ready." }];
  const { provider, session: s } = await start(steps, {}, cwd);
  await s.send("go");
  writeFileSync(join(s.workDir, "result.csv"), "mean\n3.5\n");
  mkdirSync(join(s.workDir, "tables"));
  writeFileSync(join(s.workDir, "tables", "t1.csv"), "x\n9\n");
  steps.push(call("read_file", { path: join(s.workDir, "result.csv") }), call("list_dir", { path: join(s.workDir, "tables") }), call("read_file", { path: "data.csv" }), call("list_dir", { path: s.workDir }), call("read_file", { path: "cuvette/2026-10-13-other/notes.txt" }), { text: "ok" });
  writeFileSync(join(cwd, "cuvette", "2026-10-13-other", "notes.txt"), "notes of the other session");
  await s.send("look");
  const t = texts(provider);
  expect(t[0]).toContain("3.5");
  expect(t[1]).toContain("t1.csv");
  expect(t[2]).toContain("1,5");
  expect(t[3]).toContain("result.csv");
  expect(t[4]).toContain("notes of the other session");
});

test("a folder that the scientist names in the request is readable, also in the Cuvette home folder", async () => {
  const cwd = mkdtempSync(join(work, "proj-"));
  const record = otherSessions(cwd);
  const folder = join(home, "projects", "other", "run");
  const steps: Bad[] = [call("read_file", { path: join(folder, "results.csv") }), call("read_file", { path: join(record, "log.jsonl") }), call("read_file", { path: join(home, "sessions-index.json") }), { text: "ok" }];
  const { provider, session: s } = await start(steps, {}, cwd);
  await s.send(`Compare with ${folder} and ${record}`);
  const t = texts(provider);
  expect(t[0]).toContain("1");
  expect(t[1]).toContain('"kind":"user"');
  expect(t[2]).toMatch(HOME_TEXT);
});

test("a session folder that the request names opens only that folder, not the sessions folder", async () => {
  const cwd = mkdtempSync(join(work, "proj-"));
  for (const id of ["x", "y"]) {
    mkdirSync(join(home, "sessions", id), { recursive: true });
    writeFileSync(join(home, "sessions", id, "log.jsonl"), `{"id":"${id}"}\n`);
  }
  const named = join(home, "sessions", "x");
  const { provider, session: s } = await start([call("read_file", { path: join(named, "log.jsonl") }), call("read_file", { path: join(home, "sessions", "y", "log.jsonl") }), call("list_dir", { path: join(home, "sessions") }), { text: "ok" }], {}, cwd);
  await s.send(`Look at ${named}`);
  const t = texts(provider);
  expect(t[0]).toContain('"id":"x"');
  expect(t[1]).toMatch(HOME_TEXT);
  expect(t[2]).toMatch(HOME_TEXT);
});

test.skipIf(windows)("a link in the project folder that leads into the Cuvette home folder is refused", async () => {
  const cwd = mkdtempSync(join(work, "proj-"));
  otherSessions(cwd);
  symlinkSync(home, join(cwd, "homelink"));
  const { provider, session: s } = await start([call("list_dir", { path: "homelink" }), call("read_file", { path: "homelink/sessions-index.json" }), { text: "ok" }], {}, cwd);
  await s.send("go");
  for (const x of texts(provider)) expect(x).toMatch(HOME_TEXT);
});

test("a skill of an adapter in the Cuvette home folder is read through load_skill", async () => {
  const root = join(home, "adapters", "astropy");
  cpSync(join(CATALOG_DIR, "astropy"), root, { recursive: true });
  const adapter = loadAdapter(root);
  const skill = adapter.skills()[0]!;
  const provider = new ScriptedProvider([call("load_skill", { name: skill.name }), call("read_file", { path: join(home, "adapters", "other-adapter", "x.md") }), { text: "ok" }]);
  session = await Session.create({ adapters: [root], provider, cwd: mkdtempSync(join(work, "proj-")), settings: { guidance: false, askWaits: false, permissionMode: "bypass" } });
  await session.send("go");
  const t = texts(provider);
  expect(t[0]).toContain(readFileSync(skill.path, "utf8").slice(0, 40));
  expect(t[1]).toMatch(HOME_TEXT);
});

test("the name of a record folder is compared in lower case", () => {
  expect([".record", ".RECORD", ".Record"].every(isRecordName)).toBe(true);
  expect([".records", "record", ".recor"].some(isRecordName)).toBe(false);
});

test("a case variant of .record does not open the record of another session", async () => {
  const cwd = mkdtempSync(join(work, "proj-"));
  const record = otherSessions(cwd);
  const variant = join(record, "..", ".RECORD");
  const sensitive = !existsSync(join(variant, "log.jsonl"));
  const { provider, session: s } = await start([call("read_file", { path: join(variant, "log.jsonl") }), call("list_dir", { path: variant }), { text: "ok" }], {}, cwd);
  await s.send("go");
  if (sensitive) return;
  for (const x of texts(provider)) expect(x).toMatch(HOME_TEXT);
});

test("inspect_data refuses the session index, the output of another project and the record of another session", async () => {
  const cwd = mkdtempSync(join(work, "proj-"));
  const record = otherSessions(cwd);
  writeFileSync(join(cwd, "data.csv"), "id,value\n1,5\n");
  const { provider, session: s } = await start([call("inspect_data", { path: join(home, "sessions-index.json") }), call("inspect_data", { path: join(home, "projects", "other") }), call("inspect_data", { path: record }), call("inspect_data", { path: "data.csv" }), { text: "ok" }], {}, cwd);
  await s.send("go");
  const t = texts(provider);
  for (const x of t.slice(0, 3)) expect(x).toMatch(HOME_TEXT);
  expect(t[3]).not.toMatch(HOME_TEXT);
  expect(t[3]).toContain("value");
});

test("a project that is the Cuvette home folder, or inside it, stays readable, and the private parts stay refused", async () => {
  for (const inside of [false, true]) {
    const cwd = inside ? join(home, "work", "proj") : home;
    mkdirSync(cwd, { recursive: true });
    writeFileSync(join(cwd, "data.csv"), "id,value\n1,5\n");
    mkdirSync(join(home, "sessions", "old-1"), { recursive: true });
    writeFileSync(join(home, "sessions", "old-1", "log.jsonl"), '{"id":1}\n');
    writeFileSync(join(home, "sessions-index.json"), "[]");
    const { provider, session: s } = await start([call("read_file", { path: "data.csv" }), call("list_dir", { path: "." }), call("read_file", { path: join(home, "sessions-index.json") }), call("read_file", { path: join(home, "sessions", "old-1", "log.jsonl") }), { text: "ok" }], {}, cwd);
    await s.send("go");
    const t = texts(provider);
    expect(t[0]).toContain("1,5");
    expect(t[1]).toContain("data.csv");
    expect(t[2]).toMatch(HOME_TEXT);
    expect(t[3]).toMatch(HOME_TEXT);
    await s.close();
    session = undefined;
  }
});

test("the model cannot write to the record folder or to the settings folder of the project", async () => {
  const cwd = mkdtempSync(join(work, "proj-"));
  const steps: Bad[] = [{ text: "Ready." }];
  const { provider, session: s } = await start(steps, {}, cwd);
  await s.send("go");
  const recordLog = join(s.record.dir, "log.jsonl");
  const before = readFileSync(recordLog, "utf8");
  steps.push(
    call("write_file", { name: recordLog, text: "evil" }),
    call("write_file", { name: ".record/new.txt", text: "evil" }),
    call("write_file", { name: join(cwd, ".cuvette", "settings.json"), text: '{"permissions":"bypass"}' }),
    call("write_file", { name: join(cwd, ".ga", "adapters", "x.txt"), text: "evil" }),
    call("write_file", { name: join(cwd, "result.txt"), text: "fine" }),
    { text: "ok" },
  );
  await s.send("write the files");
  const t = texts(provider);
  for (const x of t.slice(0, 4)) expect(x).toMatch(/belongs to the record or to the settings of Cuvette\. The agent cannot write there\./);
  expect(t[4]).toContain("Wrote 4 bytes");
  expect(existsSync(join(cwd, ".cuvette"))).toBe(false);
  expect(existsSync(join(cwd, ".ga"))).toBe(false);
  expect(readFileSync(recordLog, "utf8").startsWith(before)).toBe(true);
  expect(readFileSync(join(cwd, "result.txt"), "utf8")).toBe("fine");
});

test("use_adapter for an adapter that does not exist names the way to find the right one", async () => {
  const { provider, session: s } = await start([call("use_adapter", { name: "no-such-adapter", reason: "test" }), { text: "ok" }]);
  await s.send("go");
  expect(texts(provider)[0]).toMatch(/Call list_adapters to see the names\./);
});

test("use_adapter for an adapter that is turned off gives the way to turn it on", async () => {
  saveAccess("openbabel", { off: true });
  const { provider, session: s } = await start([call("use_adapter", { name: "openbabel", reason: "test" }), { text: "ok" }]);
  await s.send("go");
  expect(texts(provider)[0]).toContain("the adapter openbabel is turned off in Programs. Turn it on with /programs or cuvette programs enable openbabel");
  expect(s.adapters).toEqual([]);
});

test("use_adapter for an Unlisted adapter with code that nobody confirmed does not load it and asks the scientist", async () => {
  const src = join(work, "obtest-src");
  cpSync(join(CATALOG_DIR, "openbabel"), src, { recursive: true });
  const file = join(src, "adapter.yaml");
  const manifest = parse(readFileSync(file, "utf8"));
  manifest.adapter.name = "obtest";
  writeFileSync(file, stringify(manifest));
  applyInstall((await prepareAdd(src)).id, { confirmed: true });
  const { provider, session: s } = await start([call("use_adapter", { name: "obtest", reason: "test" }), { text: "ok" }]);
  s.setOwner("adapter", "agent");
  await s.send("go");
  expect(texts(provider)[0]).toMatch(/BLOCKED: obtest is Unlisted and ships code/);
  expect(s.adapters).toEqual([]);
  expect(s.questions.open().map((q) => q.title)).toContain("Run the code of obtest?");
});

const script = (code: string, timeout_s = 1) => call("run_script", { purpose: "Test", does: "Test.", code, timeout_s });

test("a script with an infinite loop stops at the timeout and the model gets the reason", async () => {
  const { provider, session: s } = await start([script("while True:\n    pass\n"), { text: "ok" }]);
  await s.send("go");
  expect(texts(provider)[0]).toContain("the script timed out after 1 s");
  expect(s.endedBy).toBe("answer");
});

test("a script with a huge output sends only the start of it to the model", async () => {
  const { provider, session: s } = await start([script("import sys\nfor i in range(3000000):\n    sys.stdout.write('x' * 100 + '\\n')\n", 60), { text: "ok" }]);
  await s.send("go");
  expect(texts(provider)[0]!.length).toBeLessThan(21000);
});

test.skipIf(windows)("a script that starts many processes, also in new sessions, leaves none after the timeout", async () => {
  const code = [
    "import subprocess, os, time",
    "same = [subprocess.Popen(['sleep', '300']) for i in range(5)]",
    "apart = [subprocess.Popen(['sleep', '300'], start_new_session=True) for i in range(5)]",
    "open(os.environ['WORK_DIR'] + '/pids.txt', 'w').write(' '.join(str(p.pid) for p in same + apart))",
    "time.sleep(120)",
  ].join("\n");
  const { provider, session: s } = await start([script(code), { text: "ok" }]);
  await s.send("go");
  expect(texts(provider)[0]).toContain("the script timed out after 1 s");
  const pids = readFileSync(join(s.workDir, "pids.txt"), "utf8").split(" ").map(Number);
  expect(pids).toHaveLength(10);
  try {
    await until(() => pids.every((p) => !alive(p)), 20000);
  } finally {
    for (const p of pids) if (alive(p)) process.kill(p, "SIGKILL");
  }
});

test("an answer with numbers that no step made gets one revision and then ends", async () => {
  const provider = new FakeProvider((messages) => ({ text: `There are ${messages.length * 111} cells.` }));
  const cwd = mkdtempSync(join(work, "proj-"));
  session = await Session.create({ adapters: [], provider, cwd, settings: { permissionMode: "bypass", askWaits: false } });
  const answer = await session.send("How many cells?");
  expect(provider.requests.length).toBeLessThanOrEqual(3);
  expect(session.endedBy).toBe("answer");
  expect(answer).toMatch(/cells\./);
  const finals = session.record.entries(["assistant"]).filter((e) => e.data.final);
  expect(finals).toHaveLength(2);
  expect(finals[1]!.data.corrects).toBe(finals[0]!.id);
});

test("a model that gives an empty reply to the revision request keeps the first answer", async () => {
  const provider = new ScriptedProvider([{ text: "There are 999 cells." }, {}, {}, {}]);
  const cwd = mkdtempSync(join(work, "proj-"));
  session = await Session.create({ adapters: [], provider, cwd, settings: { permissionMode: "bypass", askWaits: false } });
  const answer = await session.send("How many cells?");
  expect(answer).toContain("999");
  expect(session.endedBy).toBe("answer");
  expect(session.busy).toBe(false);
});

const GUARD_TEXT = /belongs to the record or to the settings of Cuvette\. The agent cannot write there\./;

test("write_file works in a new place and in a legacy place, and refuses the record in both", async () => {
  for (const legacy of [false, true]) {
    const cwd = mkdtempSync(join(work, "proj-"));
    const steps: Bad[] = [{ text: "Ready." }];
    const provider = new ScriptedProvider(steps);
    session = await Session.create({ adapters: [], provider, cwd, home: legacy, settings: { guidance: false, askWaits: false, permissionMode: "bypass" } });
    const s = session;
    await s.send("go");
    const log = join(s.record.dir, "log.jsonl");
    steps.push(
      call("write_file", { name: "notes/a.txt", text: "fine" }),
      call("write_file", { name: log, text: "evil" }),
      call("write_file", { name: join(s.record.dir, "meta.json"), text: "evil" }),
      call("write_file", { name: join(s.record.dir, "blobs", "x"), text: "evil" }),
      call("write_file", { name: join(s.workDir, ".RECORD", "log.jsonl"), text: "evil" }),
      { text: "ok" },
    );
    const before = readFileSync(log, "utf8");
    await s.send("write");
    const t = texts(provider);
    expect(t[0]).toContain("Wrote 4 bytes");
    expect(readFileSync(join(s.workDir, "notes", "a.txt"), "utf8")).toBe("fine");
    if (legacy) expect(t.slice(1, 4).every((x) => GUARD_TEXT.test(x))).toBe(true);
    else for (const x of t.slice(1, 5)) expect(x).toMatch(GUARD_TEXT);
    expect(readFileSync(log, "utf8").startsWith(before)).toBe(true);
    await s.close();
    session = undefined;
  }
});

test.skipIf(windows)("a link to the record file does not open the record for writing", async () => {
  const cwd = mkdtempSync(join(work, "proj-"));
  const steps: Bad[] = [{ text: "Ready." }];
  const { provider, session: s } = await start(steps, {}, cwd);
  await s.send("go");
  const log = join(s.record.dir, "log.jsonl");
  symlinkSync(log, join(cwd, "shortcut.txt"));
  symlinkSync(s.record.dir, join(cwd, "shortdir"));
  steps.push(call("write_file", { name: join(cwd, "shortcut.txt"), text: "evil" }), call("write_file", { name: join(cwd, "shortdir", "log.jsonl"), text: "evil" }), { text: "ok" });
  const before = readFileSync(log, "utf8");
  await s.send("write");
  for (const x of texts(provider).slice(0, 2)) expect(x).not.toContain("Wrote");
  expect(readFileSync(log, "utf8").startsWith(before)).toBe(true);
  expect(readFileSync(log, "utf8")).not.toBe("evil");
});

test("when the output falls back to a folder under .cuvette, the name check uses only the part under the session folder", async () => {
  const project = mkdtempSync(join(work, "home-"));
  const workDir = join(project, ".cuvette", "projects", "p", ".new-1");
  const sessionDir = join(workDir, ".record");
  mkdirSync(sessionDir, { recursive: true });
  const write = genericTools({ workDir, sessionDir, projectDir: project }).find((t) => t.name === "write_file")!;
  const ctx = { session: "s", callId: "c", workDir, sessionDir, signal: new AbortController().signal, log: () => ({}) as never, callTool: async () => ({ ok: true }) };
  expect(await write.execute({ name: "a.txt", text: "fine" }, ctx)).toMatchObject({ ok: true });
  expect(await write.execute({ name: join(workDir, "figures", "b.txt"), text: "fine" }, ctx)).toMatchObject({ ok: true });
  expect(await write.execute({ name: join(workDir, ".cuvette", "settings.json"), text: "{}" }, ctx)).toMatchObject({ ok: true });
  expect(await write.execute({ name: join(sessionDir, "log.jsonl"), text: "evil" }, ctx)).toMatchObject({ ok: false });
  expect(readFileSync(join(workDir, "a.txt"), "utf8")).toBe("fine");
  const outside = await write.execute({ name: join(project, ".cuvette", "settings.json"), text: "{}" }, ctx);
  expect(outside.ok).toBe(false);
  expect(existsSync(join(project, ".cuvette", "settings.json"))).toBe(false);
});

test("a tool that returns after Esc and the abandon time adds no record entry and no second result, and the next turn gets a note", async () => {
  const steps: Bad[] = [call("slow", {}), { text: "never reached" }];
  const { provider, session: s } = await start(steps);
  s.abandonMs = 50;
  let release: () => void = () => {};
  let started = false;
  let lateCall: ToolOutput | undefined;
  (s["tools"] as Map<string, unknown>).set("slow", {
    name: "slow",
    description: "Slow.",
    inputSchema: { type: "object", properties: {} },
    source: "adapter",
    adapter: "lab",
    readOnly: true,
    permission: "allow",
    execute: async (_a: unknown, ctx: { log: (k: string, d: Record<string, unknown>) => unknown; callTool: (n: string, a: Record<string, unknown>) => Promise<ToolOutput> }) => {
      started = true;
      await new Promise<void>((r) => (release = r));
      ctx.log("note", { text: "late entry" });
      lateCall = await ctx.callTool("note", { text: "late call" });
      return { ok: true, summary: "late result", text: "late" };
    },
  });
  s["useTools"](["slow"]);
  const run = s.send("go");
  await until(() => started);
  s.interrupt();
  await run;
  expect(s.record.entries(["notice"]).filter((e) => e.data.warn && /^The tool slow did not stop [\d.]+ s after you pressed Esc\. Cuvette stopped waiting for it\./.test(String(e.data.text)))).toHaveLength(1);
  const before = s.record.entries().length;
  release();
  await until(() => lateCall !== undefined);
  expect(lateCall).toMatchObject({ ok: false });
  expect(s.record.entries().length).toBe(before);
  expect(s.record.entries(["note"])).toEqual([]);
  expect(results(s).filter((r) => r.tool === "slow")).toHaveLength(1);
  steps.length = 0;
  steps.push({ text: "Next." });
  await s.send("again");
  expect(provider.requests.at(-1)!.messages.flatMap((m) => m.parts).map((x) => (x.type === "text" ? x.text : "")).join("\n")).toContain("The tool slow did not stop after the scientist pressed Esc.");
});

test.skipIf(windows)("Esc during a script that started processes in new sessions leaves none", async () => {
  const code = [
    "import subprocess, os, time",
    "apart = [subprocess.Popen(['sleep', '300'], start_new_session=True) for i in range(5)]",
    "open(os.environ['WORK_DIR'] + '/pids.txt', 'w').write(' '.join(str(p.pid) for p in apart))",
    "time.sleep(120)",
  ].join("\n");
  const { session: s } = await start([script(code, 100), { text: "ok" }]);
  const run = s.send("go");
  let pids: number[] = [];
  await until(() => {
    try {
      pids = readFileSync(join(s.workDir, "pids.txt"), "utf8").split(" ").map(Number);
      return pids.length === 5 && pids.every((p) => p > 0);
    } catch {
      return false;
    }
  });
  s.interrupt();
  await run;
  try {
    await until(() => pids.every((p) => !alive(p)), 20000);
  } finally {
    for (const p of pids) if (alive(p)) process.kill(p, "SIGKILL");
  }
});

test("an empty reply that the output limit caused names the output limit", async () => {
  const { session: s } = await start([{ stopReason: "max_tokens" }, { stopReason: "max_tokens" }, { stopReason: "max_tokens" }]);
  expect(await s.send("go")).toBe("");
  expect(notices(s).at(-1)).toBe('The output limit of the model cut its reply before any text or tool call. Type "continue" to ask again with a smaller step, or raise the output limit of the model.');
});

test("a recommendation of 0 is kept", async () => {
  const { session: s } = await start([call("ask_scientist", { question: "How many outliers?", options: [0, 1, 2], recommendation: 0 }), { text: "ok" }]);
  await s.send("go");
  expect(s.questions.open()[0]!.recommendation?.value).toBe("0");
});

test("cleanText accepts a value that is not a string, and the cells of a table and the data are cleaned", async () => {
  expect(cleanText(42)).toBe("42");
  expect(cleanText(undefined)).toBe("undefined");
  const { provider, session: s } = await start([call("tab", {}), { text: "ok" }]);
  addTool(s, "tab", () => ({ ok: true, summary: "Ran.", table: { columns: ["a\x1b[31m"], rows: [["x\x1b[2Jy"]], n_rows: 1 } as never, data: { label: "\x1b]0;t\x07ok", list: ["\x07z"] } }));
  await s.send("go");
  expect(JSON.stringify(provider.requests.at(-1)!.messages)).not.toMatch(/\\u001b|\\u0007/);
  expect(JSON.stringify(provider.requests.at(-1)!.messages)).toContain("xy");
  expect(JSON.stringify(s.record.entries(["tool_result"]))).not.toMatch(/\\u001b|\\u0007/);
});

test("a nested call that runs when the outer call is abandoned records no result of its own", async () => {
  const { session: s } = await start([call("outer", {}), { text: "never reached" }]);
  s.abandonMs = 50;
  let innerStarted = false;
  const tools = s["tools"] as Map<string, unknown>;
  const base = { description: "Test.", inputSchema: { type: "object", properties: {} }, source: "adapter", adapter: "lab", readOnly: true, permission: "allow" };
  tools.set("inner", { ...base, name: "inner", execute: () => ((innerStarted = true), new Promise<ToolOutput>(() => {})) });
  tools.set("outer", { ...base, name: "outer", execute: (_a: unknown, ctx: { callTool: (n: string, a: Record<string, unknown>) => Promise<ToolOutput> }) => ctx.callTool("inner", {}) });
  s["useTools"](["outer", "inner"]);
  const run = s.send("go");
  await until(() => innerStarted);
  s.interrupt();
  await run;
  await new Promise((r) => setTimeout(r, 300));
  const done = s.record.entries(["tool_result"]).map((e) => ({ id: String(e.data.callId), error: String(e.data.error) }));
  expect(done.map((d) => d.id).sort()).toEqual(["call_1", "call_1.1"]);
  expect(done.find((d) => d.id === "call_1.1")!.error).toBe("the call was stopped");
});

test("a state tool that returns late after Esc writes nothing to the record", async () => {
  const provider = new FakeProvider([{ calls: [{ name: "count", args: { input: "x", method: "Default" } }] }, { text: "done" }]);
  const cwd = mkdtempSync(join(work, "proj-"));
  session = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider, cwd, mode: "follow", settings: { guidance: false } });
  const s = session;
  s.abandonMs = 50;
  s.decisions.applySetup({});
  s.decisions.change("method", "Default");
  let release: () => void = () => {};
  let started = false;
  let lateLog = false;
  const tools = s["tools"] as Map<string, { execute: unknown }>;
  tools.set("state", {
    ...(tools.get("state") as object),
    execute: async (_a: unknown, ctx: { log: (k: string, d: Record<string, unknown>) => unknown }) => {
      started = true;
      await new Promise<void>((r) => (release = r));
      ctx.log("note", { text: "late state" });
      lateLog = true;
      return { ok: true, data: {} };
    },
  } as never);
  s.bus.on((e) => {
    if (e.type === "instruction") setTimeout(() => s.followDone(e.step, "I got count = 64"), 0);
  });
  const run = s.send("count");
  await until(() => started);
  s.interrupt();
  await run.catch(() => {});
  const before = s.record.entries().length;
  release();
  await until(() => lateLog);
  expect(s.record.entries(["note"]).filter((e) => e.data.text === "late state")).toEqual([]);
  expect(s.record.entries().length).toBe(before);
});

test.skipIf(windows)("a link in the work folder to the settings folder or to the record of another session does not open them", async () => {
  const cwd = mkdtempSync(join(work, "proj-"));
  mkdirSync(join(cwd, ".cuvette"));
  const steps: Bad[] = [{ text: "Ready." }];
  const { provider, session: s } = await start(steps, {}, cwd);
  await s.send("go");
  const other = join(cwd, "cuvette", "2026-01-01-other", ".record");
  mkdirSync(other, { recursive: true });
  writeFileSync(join(other, "log.jsonl"), "{}\n");
  symlinkSync(join(cwd, ".cuvette"), join(s.workDir, "to-settings"));
  symlinkSync(other, join(s.workDir, "to-other"));
  steps.push(
    call("write_file", { name: join(s.workDir, "to-settings", "settings.json"), text: "{}" }),
    call("write_file", { name: join(s.workDir, "to-other", "log.jsonl"), text: "evil" }),
    call("write_file", { name: join(s.workDir, "to-other", "new.txt"), text: "evil" }),
    { text: "ok" },
  );
  await s.send("write");
  for (const x of texts(provider).slice(0, 3)) expect(x).toMatch(GUARD_TEXT);
  expect(existsSync(join(cwd, ".cuvette", "settings.json"))).toBe(false);
  expect(readFileSync(join(other, "log.jsonl"), "utf8")).toBe("{}\n");
  expect(existsSync(join(other, "new.txt"))).toBe(false);
});

test.skipIf(windows)("a hard link to the record file is refused", async () => {
  const cwd = mkdtempSync(join(work, "proj-"));
  const steps: Bad[] = [{ text: "Ready." }];
  const { provider, session: s } = await start(steps, {}, cwd);
  await s.send("go");
  const log = join(s.record.dir, "log.jsonl");
  linkSync(log, join(s.workDir, "hard.txt"));
  steps.push(call("write_file", { name: "hard.txt", text: "evil" }), { text: "ok" });
  const before = readFileSync(log, "utf8");
  await s.send("write");
  expect(texts(provider)[0]).toContain("has more than one hard link");
  expect(readFileSync(log, "utf8").startsWith(before)).toBe(true);
});

test("a folder named .record or .ga deeper in the project is a normal folder", async () => {
  const cwd = mkdtempSync(join(work, "proj-"));
  const { provider, session: s } = await start([call("write_file", { name: join(cwd, "data", ".ga", "a.txt"), text: "fine" }), call("write_file", { name: "x/.record/b.txt", text: "fine" }), call("write_file", { name: join(cwd, ".ga", "a.txt"), text: "evil" }), { text: "ok" }], {}, cwd);
  await s.send("go");
  const t = texts(provider);
  expect(t[0]).toContain("Wrote 4 bytes");
  expect(t[1]).toContain("Wrote 4 bytes");
  expect(t[2]).toMatch(GUARD_TEXT);
});

test.skipIf(windows)("killAll stops the group first and kills a child in a new session and removes its exit handler", async () => {
  const { spawn } = await import("node:child_process");
  const { killAll } = await import("../src/adapters/kinds/common.ts");
  const parent = spawn("python3", ["-c", "import subprocess, time\np = subprocess.Popen(['sleep','300'], start_new_session=True)\nprint(p.pid, flush=True)\nsame = subprocess.Popen(['sleep','300'])\nprint(same.pid, flush=True)\ntime.sleep(300)"], { detached: true, stdio: ["ignore", "pipe", "ignore"] });
  let out = "";
  parent.stdout.on("data", (d) => (out += d));
  await until(() => out.trim().split("\n").length === 2);
  const pids = [parent.pid!, ...out.trim().split("\n").map(Number)];
  const handlers = process.listenerCount("exit");
  try {
    await killAll(parent.pid);
    await until(() => pids.every((p) => !alive(p)), 20000);
    expect(process.listenerCount("exit")).toBeLessThanOrEqual(handlers + 1);
  } finally {
    for (const p of pids) if (alive(p)) process.kill(p, "SIGKILL");
  }
});

test.skipIf(windows)("many killAll calls at once add at most one exit handler", async () => {
  const { killAll } = await import("../src/adapters/kinds/common.ts");
  await killAll(2147483000);
  const handlers = process.listenerCount("exit");
  await Promise.all(Array.from({ length: 15 }, (_, i) => killAll(2147482000 + i)));
  expect(process.listenerCount("exit")).toBe(handlers);
});

test("write_file on a folder gives the error of a folder and writes nothing", async () => {
  const project = mkdtempSync(join(work, "p-"));
  const workDir = join(project, "out");
  const sessionDir = join(workDir, ".record");
  mkdirSync(join(workDir, "sub"), { recursive: true });
  mkdirSync(sessionDir);
  const write = genericTools({ workDir, sessionDir, projectDir: project }).find((t) => t.name === "write_file")!;
  const ctx = { session: "s", callId: "c", workDir, sessionDir, signal: new AbortController().signal, log: () => ({}) as never, callTool: async () => ({ ok: true }) };
  const r = await write.execute({ name: "sub", text: "x" }, ctx);
  expect(r.ok).toBe(false);
  expect(r.error).toMatch(/EISDIR|is not a file/);
  expect(await write.execute({ name: "new.txt", text: "first long text" }, ctx)).toMatchObject({ ok: true });
  expect(await write.execute({ name: "new.txt", text: "short" }, ctx)).toMatchObject({ ok: true });
  expect(readFileSync(join(workDir, "new.txt"), "utf8")).toBe("short");
});


const blockedBy = (s: Session, by: string) => s.record.entries(["blocked"]).filter((e) => e.data.by === by).map((e) => String(e.data.reason));

test("a read of a private path tells the scientist what Cuvette blocked and how to allow it", async () => {
  const { session: s } = await start([call("read_file", { path: join(home, "settings.json") }), { text: "ok" }]);
  writeFileSync(join(home, "settings.json"), "{}");
  await s.send("go");
  const reasons = blockedBy(s, "path rule");
  expect(reasons).toHaveLength(1);
  expect(reasons[0]).toBe(`The agent tried to use ${join(home, "settings.json")}. This path is in the Cuvette home folder or in the record of another session. Cuvette blocked it. To allow it, write the folder in your next message.`);
  expect(checkText(reasons[0]!.replace(/\S*[\\/]\S*/g, "X"))).toEqual([]);
});

test.skipIf(windows)("a read through a link that leads outside tells the scientist to write the real folder", async () => {
  const outside = mkdtempSync(join(work, "outside-"));
  writeFileSync(join(outside, "secret.txt"), "TOP SECRET");
  const cwd = mkdtempSync(join(work, "proj-"));
  symlinkSync(outside, join(cwd, "link"));
  const { session: s } = await start([call("list_dir", { path: "link" }), { text: "ok" }], {}, cwd);
  await s.send("go");
  const reasons = blockedBy(s, "path rule");
  expect(reasons).toHaveLength(1);
  expect(reasons[0]).toContain("This path is a link that leads outside the folders of this analysis. Cuvette blocked it. To allow it, write the real folder in your next message.");
});

test("a refused path in a very long name stays short in the notice", async () => {
  const long = join(home, "sessions", `${"é😀".repeat(400)}.txt`);
  const { session: s } = await start([call("read_file", { path: long }), { text: "ok" }]);
  await s.send("go");
  const [reason] = blockedBy(s, "path rule");
  expect(reason!.length).toBeLessThan(500);
  expect(reason).toContain("Cuvette blocked it.");
  expect(reason).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/);
});

test("a write to the record, the settings or LAB.md tells the scientist which file Cuvette protects", async () => {
  const cwd = mkdtempSync(join(work, "proj-"));
  const { session: s } = await start([
    call("write_file", { name: join(cwd, ".cuvette", "settings.json"), text: "{}" }),
    call("write_file", { name: join(cwd, "LAB.md"), text: "Use a t test." }),
    { text: "ok" },
  ], {}, cwd);
  await s.send("go");
  const reasons = blockedBy(s, "write rule");
  expect(reasons).toEqual([
    `The agent tried to write ${join(cwd, ".cuvette", "settings.json")}. This path belongs to the record or to the settings of Cuvette. Cuvette blocked it. Nothing changed.`,
    `The agent tried to write ${join(cwd, "LAB.md")}. This file holds the lab rules. Cuvette blocked it. To change a rule, edit the file yourself.`,
  ]);
  expect(existsSync(join(cwd, "LAB.md"))).toBe(false);
});

test("the notice names the path that Cuvette refused, also when the allowed path comes first", async () => {
  const cwd = mkdtempSync(join(work, "proj-"));
  const secret = join(home, "sessions");
  mkdirSync(secret, { recursive: true });
  const { session: s } = await start([call("run_command", { purpose: "p", does: "d", argv: ["ls"], path: cwd, cwd: secret }), call("list_dir", { path: cwd }), { text: "ok" }], {}, cwd);
  await s.send("go");
  const entries = s.record.entries(["blocked"]).filter((e) => e.data.by === "path rule");
  expect(entries).toHaveLength(1);
  expect(entries[0]!.data.path).toBe(secret);
  expect(String(entries[0]!.data.reason)).toContain(`The agent tried to use ${secret}.`);
  expect(String(entries[0]!.data.reason)).not.toContain(cwd);
});

test("the refusal text writes out a control code and a line break in a path", async () => {
  const { pathRefusalReason, writeRefusalReason } = await import("../src/core/refusals.ts");
  const hidden = /[\u0000-\u001f\u007f-\u009f\u2028\u202a-\u202e]/;
  for (const text of [pathRefusalReason("private", "/a/\u001b[2J\u202e/b\nc"), pathRefusalReason("link", "/a/\u0007/b"), writeRefusalReason("/a/\u2028b", false)]) expect(text).not.toMatch(hidden);
  expect(pathRefusalReason("private", "/a/\u202e/b\nc")).toContain(String.raw`"/a/\\u202e/b\nc"`);
});
