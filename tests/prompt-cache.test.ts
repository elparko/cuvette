import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { Session } from "../src/core/session.ts";
import { ClaudeProvider } from "../src/providers/claude.ts";

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
