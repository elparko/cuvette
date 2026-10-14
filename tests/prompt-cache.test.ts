import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { Session } from "../src/core/session.ts";
import { ClaudeProvider } from "../src/providers/claude.ts";
import { FakeProvider } from "../src/providers/fake.ts";

const hang = vi.hoisted(() => ({ on: false }));
vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return { ...real, opendir: ((...args: Parameters<typeof real.opendir>) => (hang.on ? new Promise(() => {}) : real.opendir(...args))) as typeof real.opendir };
});

let sessions: Session[] = [];
afterEach(async () => {
  for (const s of sessions) await s.close();
  sessions = [];
});

function captureClient(calls: any[]) {
  const stream = (params: any) => {
    calls.push(params);
    const s: any = { on: () => s, finalMessage: async () => ({ content: [{ type: "text", text: "done" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }) };
    return s;
  };
  return { messages: { stream, create: async () => ({ content: [{ type: "text", text: "[]" }], usage: {} }) }, beta: { messages: { stream } } };
}

async function firstRequest(home: string, adapters: string[]) {
  process.env.CUVETTE_HOME = home;
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-cache-proj-"));
  writeFileSync(join(cwd, "data.csv"), "group,value\na,1\nb,2\n");
  const calls: any[] = [];
  const provider = new ClaudeProvider("claude-haiku-5-5", { client: captureClient(calls) });
  const s = await Session.create({ adapters, provider, cwd, settings: { headless: true, referee: "none", defaultAdapters: [] } });
  sessions.push(s);
  await s.send("Compare the groups in data.csv");
  return { cwd, workDir: s.dirs().workDir, outputDir: s.outputDir, params: calls[0] };
}

// The cache prefix of a request is the tools, then the system prompt. The last cache breakpoint of that prefix is on the system prompt.
const prefix = (p: any) => JSON.stringify({ tools: p.tools, system: p.system });

test.each([
  ["an adapter", [join(__dirname, "fixtures/lab")]],
  ["no adapter (pick)", []],
])("two new sessions in different folders send the same tools and system prompt, with %s", async (_name, adapters) => {
  const a = await firstRequest(mkdtempSync(join(tmpdir(), "cuvette-cache-home-")), adapters);
  const b = await firstRequest(mkdtempSync(join(tmpdir(), "cuvette-cache-home-")), adapters);
  expect(a.cwd).not.toBe(b.cwd);
  expect(a.workDir).not.toBe(b.workDir);
  expect(prefix(a.params)).toBe(prefix(b.params));
  for (const r of [a, b]) {
    const pre = prefix(r.params);
    expect(pre).not.toContain(r.cwd);
    expect(pre).not.toContain(r.workDir);
    const first = JSON.stringify(r.params.messages[0]);
    expect(first).toContain(`The project folder is ${r.cwd}.`);
    expect(first).toContain(`The session folder is ${r.workDir}.`);
    expect(first).toContain(`The output folder is ${r.outputDir}.`);
  }
  expect(a.params.system[0].cache_control).toBeTruthy();
  expect(a.params.tools.at(-1).cache_control).toBeTruthy();
});

test("the folders stay in the first message only; a second turn does not repeat them", async () => {
  const home = mkdtempSync(join(tmpdir(), "cuvette-cache-home-"));
  process.env.CUVETTE_HOME = home;
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-cache-proj-"));
  const calls: any[] = [];
  const s = await Session.create({ adapters: [join(__dirname, "fixtures/lab")], provider: new ClaudeProvider("claude-haiku-5-5", { client: captureClient(calls) }), cwd, settings: { headless: true, referee: "none", defaultAdapters: [] } });
  sessions.push(s);
  await s.send("Count the particles");
  await s.send("And again");
  const last = calls.at(-1);
  expect(prefix(last)).toBe(prefix(calls[0]));
  const texts = last.messages.filter((m: any) => m.role === "user").map((m: any) => JSON.stringify(m.content));
  expect(texts.filter((t: string) => t.includes("The project folder is")).length).toBe(1);
});

type Msgs = { role: string; parts: { type: string; text?: string }[] }[];
const userTexts = (msgs: Msgs) => msgs.filter((m) => m.role === "user").flatMap((m) => m.parts.flatMap((p) => (p.type === "text" ? [p.text ?? ""] : [])));
const noteCount = (msgs: Msgs) => userTexts(msgs).filter((t) => t.includes("Folders of this session.")).length;

async function fakeSession(provider: FakeProvider, cwd = mkdtempSync(join(tmpdir(), "cuvette-note-proj-"))) {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-note-home-"));
  const s = await Session.create({ adapters: [], provider, cwd, settings: { guidance: false, referee: "none", defaultAdapters: [] } });
  sessions.push(s);
  return s;
}

test("a folder name with spaces, Unicode and a long path goes into the note unchanged", async () => {
  const deep = join(mkdtempSync(join(tmpdir(), "cuvette-note-proj-")), "My Data ρ ü 日本", ...Array.from({ length: 12 }, (_, i) => `level ${i} of a long path`));
  mkdirSync(deep, { recursive: true });
  const p = new FakeProvider([{ text: "ok" }]);
  const s = await fakeSession(p, deep);
  await s.send("Hello");
  const first = userTexts(p.requests[0]!.messages)[0]!;
  expect(first).toContain(`The project folder is ${deep}.`);
  expect(first).toContain(`The session folder is ${s.dirs().workDir}.`);
  expect(p.requests[0]!.system).not.toContain(deep);
});

test("a send that fails keeps the note in the history: the next send does not add a second note", async () => {
  const p = new FakeProvider([{ text: "ok" }]);
  const real = p.step.bind(p);
  let fail = true;
  p.step = async (req) => {
    if (fail) {
      fail = false;
      throw new Error("network down");
    }
    return real(req);
  };
  const s = await fakeSession(p);
  expect(await s.send("First")).toBe("");
  expect(s.endedBy).toBe("error");
  await s.send("Second");
  expect(noteCount(p.requests.at(-1)!.messages)).toBe(1);
});

test("a rewind to before the first message sends the note again; a rewind to a later point does not", async () => {
  const p = new FakeProvider([{ text: "one" }, { text: "two" }, { text: "three" }, { text: "four" }]);
  const s = await fakeSession(p);
  await s.send("First");
  await s.send("Second");
  s.rewind(2);
  await s.send("Second again");
  expect(noteCount(p.requests.at(-1)!.messages)).toBe(1);
  s.rewind(1);
  expect(s.history).toEqual([]);
  await s.send("First again");
  expect(noteCount(p.requests.at(-1)!.messages)).toBe(1);
  expect(userTexts(p.requests.at(-1)!.messages)[0]).toContain(`The project folder is ${s.cwd}.`);
});

test("a resumed session sends the note again once, in its first new message", async () => {
  const p = new FakeProvider([{ text: "one" }]);
  const s = await fakeSession(p);
  await s.send("First");
  const folder = s.place.outDir;
  await s.close();
  sessions = sessions.filter((x) => x !== s);
  const q = new FakeProvider([{ text: "two" }, { text: "three" }]);
  const r = await Session.resume(folder, { provider: q });
  sessions.push(r);
  await r.send("Second");
  await r.send("Third");
  const texts = userTexts(q.requests.at(-1)!.messages);
  expect(noteCount(q.requests.at(-1)!.messages)).toBe(2);
  expect(texts.find((t) => t.endsWith("Second"))).toContain("Folders of this session.");
  expect(texts.find((t) => t.endsWith("Third"))).not.toContain("Folders of this session.");
  expect(texts.filter((t) => t.includes("The harness listed the project folder")).length).toBe(1);
});

test("the first message lists the project folder; a later turn does not list it again", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-note-proj-"));
  writeFileSync(join(cwd, "data.csv"), "group,value\na,1\n");
  mkdirSync(join(cwd, "raw"));
  const p = new FakeProvider([{ text: "one" }, { text: "two" }]);
  const s = await fakeSession(p, cwd);
  await s.send("First");
  await s.send("Second");
  const [first, second] = userTexts(p.requests.at(-1)!.messages);
  expect(first).toContain("The harness listed the project folder at the start");
  expect(first).toContain("  - data.csv  16");
  expect(first).toContain("  d raw");
  expect(first!.indexOf("Folders of this session.")).toBeLessThan(first!.indexOf("The harness listed the project folder"));
  expect(second).not.toContain("The harness listed the project folder");
  expect(p.requests[0]!.system).not.toContain("data.csv");
});

test("the folder list stops at 50 entries and names list_dir for the rest", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-note-proj-"));
  for (let i = 0; i < 60; i++) writeFileSync(join(cwd, `f${i}.txt`), "x");
  const p = new FakeProvider([{ text: "one" }]);
  const s = await fakeSession(p, cwd);
  await s.send("First");
  const first = userTexts(p.requests[0]!.messages)[0]!;
  expect(first.match(/^ {2}[-d] /gm)!.length).toBe(50);
  expect(first).toContain("The list shows 50 entries, sorted by name. More entries exist. Call list_dir to see all.");
});

test("the folder list is sorted, so the first entries by name are in it", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-note-proj-"));
  for (let i = 119; i >= 0; i--) writeFileSync(join(cwd, `f${String(i).padStart(3, "0")}.txt`), "x");
  const p = new FakeProvider([{ text: "one" }]);
  const s = await fakeSession(p, cwd);
  await s.send("First");
  const names = [...userTexts(p.requests[0]!.messages)[0]!.matchAll(/^ {2}- (\S+)/gm)].map((m) => m[1]);
  expect(names[0]).toBe("f000.txt");
  expect(names).toEqual(names.map((_, i) => `f${String(i).padStart(3, "0")}.txt`));
});

test("the folder list shows a link to a folder as a folder", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-note-proj-"));
  mkdirSync(join(cwd, "real"));
  symlinkSync(join(cwd, "real"), join(cwd, "linkdir"));
  const p = new FakeProvider([{ text: "one" }]);
  const s = await fakeSession(p, cwd);
  await s.send("First");
  expect(userTexts(p.requests[0]!.messages)[0]).toContain("  d linkdir\n");
});

test("a folder list that takes too long is left out and the first message goes on", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-note-proj-"));
  writeFileSync(join(cwd, "data.csv"), "x");
  const p = new FakeProvider([{ text: "one" }]);
  const s = await fakeSession(p, cwd);
  s.folderListMs = 1;
  hang.on = true;
  try {
    await s.send("First");
  } finally {
    hang.on = false;
  }
  const first = userTexts(p.requests[0]!.messages)[0]!;
  expect(first).toContain("Folders of this session.");
  expect(first).not.toContain("The harness listed the project folder");
});
