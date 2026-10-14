import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { dropThinking, elideOld, estimateTokens, headText, pointerText, recentStart, summarizeOld, summaryMessage } from "../src/core/compaction.ts";
import { Session } from "../src/core/session.ts";
import type { Message } from "../src/core/types.ts";
import { FakeProvider } from "../src/providers/fake.ts";

const request = (text: string): Message => ({ role: "user", parts: [{ type: "text", text }] });
const call = (id: string): Message => ({ role: "assistant", parts: [{ type: "tool_call", id, name: "read_file", args: { path: `${id}.csv` } }] });
const result = (id: string, text: string): Message => ({ role: "user", parts: [{ type: "tool_result", callId: id, name: "read_file", text }] });

function oneLongTurn(n: number, size = 4000): Message[] {
  const out: Message[] = [request("Measure the cells in each file.")];
  for (let i = 1; i <= n; i++) out.push(call(`c${i}`), result(`c${i}`, `file ${i} mean 12.${i}\n${"row\n".repeat(size / 4)}`));
  return out;
}

test("the recent window starts at an assistant message and keeps at least the last two", () => {
  const h = oneLongTurn(6);
  expect(recentStart(h, 10)).toBe(9);
  expect(h[recentStart(h, 10)]!.role).toBe("assistant");
  expect(recentStart(h, 1_000_000)).toBe(1);
});

test("elision shortens only old bulky tool output, keeps its first lines, and does not change the input", () => {
  const h = oneLongTurn(6);
  const before = JSON.stringify(h);
  const { messages, elided } = elideOld(h, 10);
  expect(elided).toBe(4);
  expect(JSON.stringify(h)).toBe(before);
  const first = messages[2]!.parts[0] as { text: string; callId: string };
  expect(first.callId).toBe("c1");
  expect(first.text).toMatch(/^file 1 mean 12\.1\n/);
  expect(first.text).toMatch(/\[Older tool output shortened: \d+ lines, \d+ characters\. The record keeps the full output\./);
  expect(first.text.length).toBeLessThan(700);
  expect(messages.slice(9)).toEqual(h.slice(9));
  expect(messages[0]).toBe(h[0]);
  expect(elideOld(messages, 10).elided).toBe(0);
  expect(estimateTokens(messages)).toBeLessThan(estimateTokens(h) / 2);
});

test("the estimate counts the tool schemas", () => {
  const tools = [{ name: "read_file", description: "x".repeat(3500), inputSchema: {} }];
  expect(estimateTokens([], "", tools) - estimateTokens([])).toBeGreaterThanOrEqual(1000);
});

test("summarizing inside one turn keeps the request and the recent window, and pairs each call with its result", async () => {
  const h = oneLongTurn(6);
  const provider = new FakeProvider({ steps: [], complete: "## Question\nMeasure the cells." });
  const res = await summarizeOld(h, provider, 10, undefined, h[0]);
  expect(res).not.toBeNull();
  expect(res!.request).toBe(h[0]);
  expect(res!.kept).toEqual(h.slice(9));
  expect(res!.kept[0]!.role).toBe("assistant");
  const next = [summaryMessage(res!.summary), res!.request!, ...res!.kept];
  const callIds = next.flatMap((m) => m.parts.flatMap((p) => (p.type === "tool_call" ? [p.id] : [])));
  const resultIds = next.flatMap((m) => m.parts.flatMap((p) => (p.type === "tool_result" ? [p.callId] : [])));
  expect(callIds).toEqual(resultIds);
});

test("a second summary updates the first one", async () => {
  const h = [summaryMessage("## Question\nOld question."), ...oneLongTurn(6)];
  let input = "";
  const provider = new FakeProvider({ steps: [], complete: "new" });
  (provider as { complete: (s: string, t: string) => Promise<string> }).complete = async (_s, text) => ((input = text), "new");
  await summarizeOld(h, provider, 10, undefined, h[1]);
  expect(input).toMatch(/^Previous summary:\n## Question\nOld question\.\n\nOlder messages:\n/);
  expect(input).not.toContain("Measure the cells in each file.");
});

test("a second summary does not get the folders or the plan of the first summary: the session adds them again", async () => {
  for (const tail of ["\n## Folders\nFolders of this session. The project folder is /p.", "\n## Current plan\n1. [todo] Count\n## Folders\nFolders of this session. The project folder is /p."]) {
    const h = [summaryMessage(`## Question\nOld question.${tail}`), ...oneLongTurn(6)];
    let input = "";
    const provider = new FakeProvider({ steps: [], complete: "new" });
    (provider as { complete: (s: string, t: string) => Promise<string> }).complete = async (_s, text) => ((input = text), "new");
    await summarizeOld(h, provider, 10, undefined, h[1]);
    expect(input).toMatch(/^Previous summary:\n## Question\nOld question\.\n\nOlder messages:\n/);
  }
});

test("nothing to summarize when the history is only the request and the recent window", async () => {
  const provider = new FakeProvider({ steps: [], complete: "x" });
  const h = oneLongTurn(2);
  expect(await summarizeOld(h, provider, 10, undefined, h[0])).toBeNull();
  const one = [request("hello")];
  expect(await summarizeOld(one, provider, 10, undefined, one[0])).toBeNull();
});

test("a long single turn on a small window first shortens old output, then summarizes, and never sends more than the window", async () => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-compact-"));
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-compact-proj-"));
  const files = Array.from({ length: 14 }, (_, i) => {
    const f = join(cwd, `plate${i + 1}.csv`);
    writeFileSync(f, `well,value\n${Array.from({ length: 400 }, (_, j) => `A${j},${(j * 1.37 + i).toFixed(2)}`).join("\n")}\n`);
    return f;
  });
  let n = 0;
  const provider = new FakeProvider({ steps: () => (n < files.length ? { calls: [{ name: "read_file", args: { path: files[n++] } }] } : { text: "All plates read." }), complete: "## Question\nRead each plate." });
  const session = await Session.create({ adapters: [], provider, cwd, settings: { phi_check: false } as never });
  session.decisions.applySetup({});
  const base = estimateTokens([request("Read each plate file.")], provider.requests[0]?.system ?? "", []);
  provider.info.contextWindow = 12_000 + base;
  await session.send("Read each plate file.");
  const notices = session.record.entries(["notice"]).filter((e) => e.data.elided);
  const compactions = session.record.entries(["compaction"]);
  expect(notices.length).toBeGreaterThan(0);
  expect(compactions.length).toBeGreaterThan(0);
  expect(notices[0]!.id).toBeLessThan(compactions[0]!.id);
  expect(String(compactions[0]!.data.summary)).toMatch(/^\[Summary of the earlier part of this session\]\n## Question/);
  expect(String(compactions[0]!.data.summary)).not.toContain("## Folders");
  for (const r of provider.requests) expect(r.messages.flatMap((m) => m.parts).filter((p) => p.type === "text" && p.text.includes("Folders of this session")).length).toBe(1);
  const last = provider.requests.at(-1)!;
  const sent = last.messages[1]!.parts[0] as { text: string };
  expect(sent.text).toMatch(/^\[Notes from the harness\]\n- [\s\S]*\n\nRead each plate file\.$/);
  for (const r of provider.requests) expect(estimateTokens(r.messages, r.system, r.tools)).toBeLessThan(provider.info.contextWindow);
  expect(session.record.messages().length).toBe(session["history"].length);
  await session.close();
});

test("only the request of the current turn stays; it stays in the recent window if it is there", async () => {
  const h = [request("First question."), call("c1"), result("c1", "x".repeat(4000)), { role: "assistant", parts: [{ type: "text", text: "a".repeat(400) }] } as Message, request("Second question."), call("c2"), result("c2", "y")];
  const provider = new FakeProvider({ steps: [], complete: "s" });
  const res = await summarizeOld(h, provider, 10, undefined, h[4]);
  expect(res!.request).toBeUndefined();
  expect(res!.kept[0]).toBe(h[3]);
  expect((await summarizeOld(h, provider, 10, undefined, h[0]))!.request).toBe(h[0]);
});

test("after an edit, the thinking blocks after it go, so Claude does not refuse the history", async () => {
  const h = oneLongTurn(6).map((m) => (m.role === "assistant" ? { ...m, raw: [{ type: "thinking", thinking: "t", signature: "s" }], parts: [{ type: "thinking", text: "t" }, ...m.parts] } : m)) as Message[];
  const { messages } = elideOld(h, 10);
  const thinkingAt = (list: Message[]) => list.flatMap((m, i) => (m.role === "assistant" && (m.raw || m.parts.some((p) => p.type === "thinking")) ? [i] : []));
  expect(thinkingAt(messages)).toEqual([1]);
  expect(messages[3]!.parts.some((p) => p.type === "tool_call")).toBe(true);
  expect(thinkingAt(elideOld(oneLongTurn(2), 10).messages)).toEqual([]);
  const res = await summarizeOld(h, new FakeProvider({ steps: [], complete: "s" }), 10, undefined, h[0]);
  expect(thinkingAt(res!.kept)).toEqual([]);
  expect(dropThinking(h, 5)[3]).toBe(h[3]);
});

test("the summary input fits the window of a small model and keeps the newest messages", async () => {
  const provider = new FakeProvider({ steps: [], complete: "s" });
  let input = "";
  provider.complete = (async (_s: string, text: string) => ((input = text), "s")) as never;
  const h = oneLongTurn(40, 4000);
  h.push({ role: "assistant", parts: [{ type: "text", text: "last" }] }, request("next"), { role: "assistant", parts: [{ type: "text", text: "end" }] });
  await summarizeOld(h, provider, 8000, undefined, h[0]);
  expect(input.length).toBeLessThan(8000 * 3.5);
  expect(input).toMatch(/left out the first \d+ characters/);
  expect(input).toMatch(/file 3\d mean/);
  expect(input).not.toMatch(/file 1 mean/);
});

test("a failed summary does not stop the turn", async () => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-compact-"));
  const provider = new FakeProvider([{ text: "one" }, { text: "two" }]);
  provider.complete = async () => {
    throw new Error("network down.");
  };
  const session = await Session.create({ adapters: [], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-compact-proj-")), settings: { guidance: false, phi_check: false } as never });
  await session.send("first");
  await session.send("second");
  await session.compact();
  expect(session.record.entries(["notice"]).some((e) => /could not summarize the older messages: network down\./.test(String(e.data.text)))).toBe(true);
  expect(session.record.entries(["compaction"])).toHaveLength(0);
  await session.close();
});

test("elision keeps a result that a recent pointer needs, and an old pointer gets the shortened text of its result", () => {
  const h = oneLongTurn(6);
  const recent = h.length - 1;
  h[recent] = result("c6", pointerText("c1"));
  h.splice(4, 1, result("c2", pointerText("c1")));
  const { messages } = elideOld(h, 10);
  expect((messages[2]!.parts[0] as { text: string }).text).toBe((h[2]!.parts[0] as { text: string }).text);
  const h2 = oneLongTurn(6);
  h2.splice(4, 1, result("c2", pointerText("c1")));
  const out = elideOld(h2, 10).messages;
  const c1 = (out[2]!.parts[0] as { text: string }).text;
  expect(c1).toContain("[Older tool output shortened:");
  expect((out[4]!.parts[0] as { text: string }).text).toBe(c1);
});

test("a kept pointer gets the full text of a result that the summary removes", async () => {
  const h = oneLongTurn(6);
  h[h.length - 1] = result("c6", pointerText("c1"));
  const r = await summarizeOld(h, new FakeProvider({ steps: [], complete: "sum" }), 10);
  const texts = r!.kept.flatMap((m) => m.parts).filter((p) => p.type === "tool_result").map((p) => (p as { text: string }).text);
  expect(texts.at(-1)).toBe((h[2]!.parts[0] as { text: string }).text);
});

test("a shortened output does not keep half of an emoji", () => {
  const lone = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
  expect(headText("a😀", 2)).toBe("a");
  for (const pad of ["", "x"]) {
    const h: Message[] = [request("q")];
    for (let i = 1; i <= 6; i++) h.push(call(`c${i}`), result(`c${i}`, pad + "😀".repeat(2000)));
    const { messages, elided } = elideOld(h, 10);
    expect(elided).toBeGreaterThan(0);
    for (const m of messages) for (const p of m.parts) if (p.type === "tool_result") expect(lone.test(p.text)).toBe(false);
  }
});

test("an empty summary does not replace the older messages", async () => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-compact-"));
  const provider = new FakeProvider([{ text: "one" }, { text: "two" }]);
  provider.complete = async () => "  ";
  const session = await Session.create({ adapters: [], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-compact-proj-")), settings: { guidance: false, phi_check: false } as never });
  await session.send("first");
  await session.send("second");
  const before = session["history"].length;
  expect(await session.compact()).toBe(false);
  expect(session["history"]).toHaveLength(before);
  expect(session.record.entries(["compaction"])).toHaveLength(0);
  await session.close();
});

test("at each cut point, every kept tool result has its call before it in the kept messages", async () => {
  const h: Message[] = [request("Measure.")];
  for (let i = 1; i <= 12; i++) {
    h.push({ role: "assistant", parts: [{ type: "text", text: `step ${i}` }, { type: "tool_call", id: `a${i}`, name: "read_file", args: {} }, { type: "tool_call", id: `b${i}`, name: "read_file", args: {} }] });
    h.push({ role: "user", parts: [{ type: "tool_result", callId: `a${i}`, name: "read_file", text: "x".repeat(i * 300) }, { type: "tool_result", callId: `b${i}`, name: "read_file", text: "y" }] });
    if (i % 4 === 0) h.push({ role: "user", parts: [{ type: "text", text: "a note" }] });
  }
  const provider = new FakeProvider({ steps: [], complete: "sum" });
  for (const win of [10, 500, 1000, 2000, 4000, 8000]) {
    const res = await summarizeOld(h, provider, win, undefined, h[0]);
    if (!res) continue;
    expect(res.kept[0]!.role).toBe("assistant");
    const calls = new Set<string>();
    for (const m of res.kept)
      for (const p of m.parts) {
        if (p.type === "tool_call") calls.add(p.id);
        if (p.type === "tool_result") expect(calls.has(p.callId)).toBe(true);
      }
  }
});

test("a second summary does not carry the old plan statuses into the new summary input", async () => {
  const h = [summaryMessage("## Question\nOld question.\n## Current plan\n1. [todo] Segment"), ...oneLongTurn(6)];
  let input = "";
  const provider = new FakeProvider({ steps: [], complete: "new" });
  (provider as { complete: (s: string, t: string) => Promise<string> }).complete = async (_s, text) => ((input = text), "new");
  await summarizeOld(h, provider, 10, undefined, h[1]);
  expect(input).toContain("Old question.");
  expect(input).not.toContain("[todo] Segment");
});

test("a summary of earlier turns holds the folders, the decisions, and the plan with its metrics and exclusions, and a second summary does not repeat them", async () => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-compact-"));
  const provider = new FakeProvider({ steps: (m) => ({ text: `answer ${m.length}` }), complete: "## Question\nCount the cells." });
  const session = await Session.create({ adapters: [], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-compact-proj-")), settings: { phi_check: false } as never });
  session.decisions.applySetup({});
  session["plan"] = {
    restatement: "You want: the red cells in each well.",
    definitions: [{ measure: "Red cell", definition: "A nucleus with a red signal above 120." }],
    exclusions: [{ what: "Cells on the edge of the image.", effect: "About 5% fewer cells." }],
    steps: [{ step: "Count the red cells", status: "todo" }],
  } as never;
  const compact = async () => {
    provider.info.contextWindow = 100;
    const done = await session.compact();
    provider.info.contextWindow = 1_000_000;
    return done;
  };
  for (const text of ["first", "second", "third"]) await session.send(text);
  expect(await compact()).toBe(true);
  for (const text of ["fourth", "fifth", "sixth"]) await session.send(text);
  expect(await compact()).toBe(true);
  const summary = String(session.record.entries(["compaction"]).at(-1)!.data.summary);
  expect(summary).toContain("A nucleus with a red signal above 120.");
  expect(summary).toContain("Cells on the edge of the image. Effect: About 5% fewer cells.");
  expect(summary).toContain("Count the red cells");
  expect(summary).toContain(`## Decisions\n${session.decisions.brief()}`);
  for (const head of ["Current plan", "Decisions", "Folders"]) expect(summary.split(`\n## ${head}\n`)).toHaveLength(2);
  await session.close();
});

test("a plan and decisions that the kept request already holds are not written again in the summary", async () => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-compact-"));
  const provider = new FakeProvider({ steps: (m) => ({ text: `answer ${m.length}` }), complete: "## Question\nx" });
  const session = await Session.create({ adapters: [], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-compact-proj-")), settings: { phi_check: false } as never });
  session.decisions.applySetup({});
  await session.send("first");
  const request = session["history"][0]!;
  const text = (request.parts[0] as { text: string }).text;
  expect(text).toContain(session.decisions.brief());
  const facts = session["summaryFacts"](request);
  expect(facts).not.toContain("## Decisions");
  expect(facts).not.toContain("## Folders");
  expect(session["summaryFacts"]()).toContain("## Folders");
  await session.close();
});

test("a tool result that quotes the shortening mark in its middle is still shortened", () => {
  const h = oneLongTurn(6);
  h[2] = result("c1", `${"row\n".repeat(600)}[Older tool output shortened: 3 lines, 9 characters. The record keeps the full output.]\n${"row\n".repeat(600)}`);
  const { messages, elided } = elideOld(h, 10);
  expect(elided).toBe(4);
  expect((messages[2]!.parts[0] as { text: string }).text.length).toBeLessThan(700);
});
