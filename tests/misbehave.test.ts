import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { afterEach, beforeEach, expect, test } from "vitest";
import { saveAccess } from "../src/adapters/access.ts";
import { applyInstall, prepareAdd } from "../src/adapters/install.ts";
import { CATALOG_DIR } from "../src/adapters/manifest.ts";
import { Session, cleanText } from "../src/core/session.ts";
import type { Message, StepResult, ToolOutput } from "../src/core/types.ts";
import { FakeProvider, type FakeStep } from "../src/providers/fake.ts";

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
  for (const x of t.slice(0, 3)) expect(x).toBe("ERROR: This path is a link that leads outside the folders of this analysis. Ask the scientist for the real path of the data.");
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
  expect(session.record.entries(["assistant"]).filter((e) => e.data.final)).toHaveLength(1);
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
