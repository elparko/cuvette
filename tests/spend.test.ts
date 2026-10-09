import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { budgetProblem, costUsd, dollars, entryCost, monthStart, promptTokens, recordSpend, spendFile, totalSpend, usageLong, usageShort, usageSummary } from "../src/core/spend.ts";
import { Session } from "../src/core/session.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { WebView } from "../src/server/app-view.ts";
import { runTui } from "../src/tui/app.tsx";
import { makeHarness, sleep, until } from "../src/tui/testing.ts";
import { commands, type CommandCtx } from "../src/ui/commands.ts";
import { FakeSession } from "../src/ui/fake-session.ts";
import { usageFields } from "../src/ui/messages.ts";

afterEach(() => {
  delete process.env.GA_BUDGET_USD;
});

test("cost uses the model's prices", () => {
  expect(costUsd("claude-opus-5-5", { inputTokens: 1e6, outputTokens: 1e6, cacheRead: 1e6, cacheWrite: 1e6 })).toBeCloseTo(4 + 20 + 0.2 + 5, 6);
  expect(costUsd("claude-haiku-5-5", { inputTokens: 1e6, outputTokens: 1e6 })).toBeCloseTo(0.6, 6);
  expect(costUsd("unknown-model", { inputTokens: 1e6, outputTokens: 0 })).toBe(10);
});

test("the ledger adds up and the budget stops further requests", () => {
  expect(spendFile()).not.toContain(".guided-analysis/spend.jsonl");
  const before = totalSpend();
  recordSpend("claude-opus-5-5", { inputTokens: 500_000, outputTokens: 0 });
  expect(totalSpend() - before).toBeCloseTo(2, 6);
  expect(readFileSync(spendFile(), "utf8")).toContain('"model":"claude-opus-5-5"');
  process.env.GA_BUDGET_USD = String(before + 5);
  expect(budgetProblem()).toBeUndefined();
  recordSpend("claude-opus-5-5", { inputTokens: 1_000_000, outputTokens: 0 });
  expect(budgetProblem()).toMatch(/budget of \$.* is used up/);
});

test("the budget counts from the first day of this month", () => {
  expect(monthStart(new Date(2026, 9, 8, 15))).toBe(new Date(2026, 9, 1).toISOString());
  const file = process.env.GA_SPEND_FILE;
  process.env.GA_SPEND_FILE = join(mkdtempSync(join(tmpdir(), "ga-spend-")), "spend.jsonl");
  try {
    const lastMonth = new Date(new Date(monthStart()).getTime() - 86400000).toISOString();
    writeFileSync(spendFile(), JSON.stringify({ t: lastMonth, model: "claude-opus-5-5", usd: 500 }) + "\n");
    recordSpend("claude-opus-5-5", { inputTokens: 1_000_000, outputTokens: 0 });
    process.env.GA_BUDGET_USD = "10";
    expect(totalSpend(monthStart())).toBeCloseTo(4, 6);
    expect(budgetProblem()).toBeUndefined();
  } finally {
    process.env.GA_SPEND_FILE = file;
  }
});

const opus = { model: "claude-opus-5-5", provider: "claude", contextWindow: 1_000_000, local: false };
const turnEntries = [
  { kind: "user", data: { text: "Count the cells in plate 1" } },
  { kind: "usage", data: { inputTokens: 100_000, outputTokens: 1_000, cacheRead: 0, cacheWrite: 0, model: "claude-opus-5-5", provider: "claude", local: false } },
  { kind: "user", data: { text: "a steer", during: true } },
  { kind: "usage", data: { inputTokens: 2_000, outputTokens: 500, cacheRead: 100_000, cacheWrite: 0, model: "claude-opus-5-5", provider: "claude", local: false } },
  { kind: "user", data: { text: "Make a plot" } },
  { kind: "usage", data: { inputTokens: 1_000, outputTokens: 2_000, cacheRead: 150_000, cacheWrite: 10_000, model: "claude-opus-5-5", provider: "claude", local: false } },
];

test("the session spend comes from the token counts and the price table", () => {
  const u = usageSummary(turnEntries, opus, 163_000);
  expect(u.turns.map((t) => [t.turn, t.steps])).toEqual([[1, 2], [2, 1]]);
  expect(u.turns[0]!.usd).toBeCloseTo((102_000 * 4 + 1_500 * 20 + 100_000 * 0.2) / 1e6, 9);
  expect(u.usd).toBeCloseTo(0.458 + (1_000 * 4 + 2_000 * 20 + 150_000 * 0.2 + 10_000 * 5) / 1e6, 9);
  expect(u.percent).toBeCloseTo(16.3, 6);
  expect(usageShort(u)).toBe("$0.58 · context 16%");
  expect(usageLong(u)).toBe("$0.58 this session · context 163k of 1000k tokens (16%)");
  expect(promptTokens(turnEntries[5]!.data)).toBe(163_000);
});

test("a local model shows local, $0, and an unknown model has no price", () => {
  const local = [{ kind: "user", data: { text: "hi" } }, { kind: "usage", data: { inputTokens: 9_000, outputTokens: 300, model: "qwen3:8b", provider: "ollama", local: true } }];
  const u = usageSummary(local, { model: "qwen3:8b", provider: "ollama", contextWindow: 32768, local: true }, 9_300);
  expect(usageShort(u)).toBe("local, $0 · context 28%");
  expect(entryCost({ model: "gpt-x", provider: "openai", local: false, inputTokens: 5 })).toBeUndefined();
  expect(entryCost({ model: "claude-haiku-5-5", inputTokens: 1e6 })).toBeCloseTo(0.1, 9);
  expect(usageShort(usageSummary([{ kind: "usage", data: { model: "gpt-x", provider: "openai", local: false } }], { model: "gpt-x", provider: "openai", contextWindow: 1000, local: false }, 3))).toBe("price not known · context <1%");
  expect(dollars(0.004)).toBe("<$0.01");
});

test("/usage prints a row for each turn and the total", async () => {
  const s = new FakeSession();
  s.usage = () => usageSummary(turnEntries, opus, 163_000);
  const printed: { text: string; title?: string }[] = [];
  const ctx = { session: s, print: (text: string, title?: string) => printed.push({ text, title }), notice: () => {}, error: () => {} } as unknown as CommandCtx;
  await commands.find((c) => c.name === "usage")!.run([], ctx);
  const { text, title } = printed[0]!;
  expect(title).toBe("Usage");
  const lines = text.split("\n");
  expect(lines[0]).toMatch(/^Turn\s+Request\s+Model steps\s+Input\s+Output\s+Cache read\s+Cache write\s+Cost$/);
  expect(lines[2]).toMatch(/^1\s+Count the cells in plate 1\s+2\s+102k\s+1.5k\s+100k\s+0\s+\$0.46$/);
  expect(lines[3]).toMatch(/^2\s+Make a plot\s+1\s+1.0k\s+2.0k\s+150k\s+10.0k\s+\$0.12$/);
  expect(lines[4]).toMatch(/^Total\s+3\s+103k/);
  expect(text).toContain("List prices for claude-opus-5-5");
  expect(text).toMatch(/more than 70% of the window/);
});

test("the session warns once at 80 percent context fill, and again only after a compaction", async () => {
  process.env.GA_HOME = mkdtempSync(join(tmpdir(), "ga-ctx-"));
  const provider = new FakeProvider([{ text: "one" }, { text: "one" }, { text: "two" }, { text: "two" }]);
  provider.info.contextWindow = 60;
  const session = await Session.create({ adapters: [], provider, cwd: mkdtempSync(join(tmpdir(), "ga-ctx-proj-")), settings: { guidance: false } });
  await session.send("hello");
  await session.send("again");
  const warnings = session.record.entries(["notice"]).filter((e) => e.data.warn);
  expect(session.record.entries(["compaction"])).toHaveLength(1);
  expect(warnings).toHaveLength(2);
  expect(warnings[1]!.id).toBeGreaterThan(session.record.entries(["compaction"])[0]!.id);
  expect(String(warnings[0]!.data.text)).toMatch(/^The context is \d+% full: .* of 60 tokens\. Before each step, the harness summarizes the older messages if its estimate is more than 70%\./);
  const u = session.usage();
  expect(u.steps).toBe(2);
  expect(u.percent).toBeGreaterThan(80);
  expect(usageShort(u)).toMatch(/^price not known · context \d+%$/);
  expect(session.record.entries(["usage"])[0]!.data).toMatchObject({ provider: "fake", local: false });
  await session.close();
});

test("the terminal status line and the app header show the spend and the context fill", async () => {
  const s = new FakeSession();
  s.usage = () => usageSummary(turnEntries, opus, 163_000);
  expect(usageFields(s)).toEqual({ usage: "$0.58 · context 16%", usageLong: "$0.58 this session · context 163k of 1000k tokens (16%)" });
  const view = new WebView(s, { token: "t", env: {}, url: (p) => p, quit: async () => {} });
  expect(view.statusMsg()).toMatchObject({ usage: "$0.58 · context 16%" });
  view.close();
  for (const hints of ["full", "short", "off"]) {
    s.settings.footer_hints = hints;
    const h = makeHarness();
    const done = runTui(s, { stdin: h.stdin, stdout: h.stdout, autoSetup: false, env: {} });
    if (hints === "off") {
      await sleep(400);
      expect(h.all()).not.toContain("context 16%");
    } else await until(() => h.all().includes(hints === "short" ? "watch · fake-model · $0.58 · context 16%" : "fake-model · $0.58 · context 16%"));
    h.type("\x03");
    await sleep(20);
    h.type("\x03");
    await Promise.race([done, sleep(500)]);
  }
});
