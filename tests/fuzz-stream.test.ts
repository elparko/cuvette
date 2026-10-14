import Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { Message, StepRequest, StepResult, ToolSchema } from "../src/core/types.ts";
import { ProviderError } from "../src/core/types.ts";
import { ClaudeProvider } from "../src/providers/claude.ts";
import { OllamaProvider } from "../src/providers/ollama.ts";
import { OpenAIProvider } from "../src/providers/openai.ts";
import { ThinkSplitter } from "../src/providers/text.ts";
import { Rng, runs } from "./fuzz-rng.ts";

const tools: ToolSchema[] = [{ name: "add", description: "Add", inputSchema: { type: "object", properties: {} } }];
const user: Message = { role: "user", parts: [{ type: "text", text: "q" }] };
const ALPHABET = ["a", "b", " ", "\n", "é", "日", "😀", "𝒳", '"', "\\", "{", "}", "<", "data:", "[DONE]", "\r"];
const enc = new TextEncoder();

afterEach(() => vi.unstubAllGlobals());

function body(bytes: Uint8Array, cuts: number[]): ReadableStream<Uint8Array> {
  const points = [...new Set([0, ...cuts.filter((c) => c > 0 && c < bytes.length), bytes.length])].sort((a, b) => a - b);
  return new ReadableStream({
    start(c) {
      for (let i = 0; i + 1 < points.length; i++) c.enqueue(bytes.slice(points[i], points[i + 1]));
      c.close();
    },
  });
}

function pieces(rng: Rng, s: string, max: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; ) {
    const n = rng.int(1, max);
    out.push(s.slice(i, i + n));
    i += n;
  }
  return out;
}

function cutsFor(rng: Rng, length: number): number[] {
  const mode = rng.int(0, 2);
  if (mode === 0) return Array.from({ length: rng.int(1, 4) }, () => rng.int(1, Math.max(1, length - 1)));
  if (mode === 1) return Array.from({ length: length - 1 }, (_, i) => i + 1);
  return Array.from({ length: length - 1 }, (_, i) => i + 1).filter(() => rng.bool(0.3));
}

interface Seen {
  result?: StepResult;
  error?: unknown;
  text: string;
  thinking: string;
}

async function run(make: () => OpenAIProvider | OllamaProvider, stub: (bytes: Uint8Array, cuts: number[]) => void, bytes: Uint8Array, cuts: number[]): Promise<Seen> {
  stub(bytes, cuts);
  const seen: Seen = { text: "", thinking: "" };
  try {
    seen.result = await make().step({
      system: "S",
      messages: [user],
      tools,
      onDelta: (d) => {
        if (d.type === "text") seen.text += d.text;
        else seen.thinking += d.text;
      },
    });
  } catch (e) {
    seen.error = e;
  }
  return seen;
}

function same(a: Seen, b: Seen): void {
  expect(b.error === undefined).toBe(a.error === undefined);
  if (a.error) expect((b.error as Error).message).toBe((a.error as Error).message);
  expect(b.result).toEqual(a.result);
  expect(b.text).toBe(a.text);
  expect(b.thinking).toBe(a.thinking);
}

interface Plan {
  text: string;
  calls: { id: string; name: string; args: string }[];
}

function plan(rng: Rng): Plan {
  const calls = Array.from({ length: rng.int(0, 2) }, (_, i) => ({
    id: `c${i}`,
    name: "add",
    args: JSON.stringify({ a: rng.int(0, 99), s: rng.string(ALPHABET, 0, 6) }),
  }));
  return { text: calls.length ? "" : rng.string(ALPHABET.filter((c) => c !== "{"), 0, 24), calls };
}

const garbageOpenAI = ["", ": keep-alive", "event: message", "id: 4", "retry: 10", "garbage", "data: {not json", "data:", "data: 5", "data: []", 'data: "x"', "data: {}", 'data: {"choices":[]}', 'data: {"type":"mystery"}'];

function openaiFrames(rng: Rng, p: Plan, opts: { garbage?: boolean; usage?: boolean; stop?: number }): string {
  const frames: string[] = [];
  const add = (j: unknown) => frames.push(`data: ${JSON.stringify(j)}`);
  add({ choices: [{ index: 0, delta: { role: "assistant", content: "" } }] });
  for (const t of pieces(rng, p.text, 5)) {
    if (opts.garbage && rng.bool(0.3)) frames.push(rng.pick(garbageOpenAI));
    add({ choices: [{ index: 0, delta: { content: t } }] });
  }
  p.calls.forEach((c, index) => {
    add({ choices: [{ index: 0, delta: { tool_calls: [{ index, id: c.id, type: "function", function: { name: c.name, arguments: "" } }] } }] });
    for (const a of pieces(rng, c.args, rng.bool() ? 1 : 6)) {
      if (opts.garbage && rng.bool(0.2)) frames.push(rng.pick(garbageOpenAI));
      add({ choices: [{ index: 0, delta: { tool_calls: [{ index, function: { arguments: a } }] } }] });
    }
  });
  for (let i = 0; i < (opts.stop ?? 1); i++) add({ choices: [{ index: 0, delta: {}, finish_reason: p.calls.length ? "tool_calls" : "stop" }] });
  if (opts.usage !== false) add({ choices: [], usage: { prompt_tokens: 11, completion_tokens: 7 } });
  if (opts.stop !== 0 || rng.bool()) frames.push("data: [DONE]");
  return frames.join(rng.bool() ? "\n\n" : "\r\n\r\n") + "\n\n";
}

function openaiProvider() {
  return new OpenAIProvider("http://localhost:1234/v1", "m", { retries: 0, sleep: async () => {} });
}

function stubFetch(bytes: Uint8Array, cuts: number[], type = "text/event-stream") {
  vi.stubGlobal("fetch", async () => new Response(body(bytes, cuts), { status: 200, headers: { "content-type": type } }));
}

function expectPlan(seen: Seen, p: Plan, trim = true) {
  expect(seen.error).toBeUndefined();
  const parts = seen.result!.message.parts;
  const text = parts.filter((x) => x.type === "text").map((x: any) => x.text).join("");
  expect(text).toBe(trim ? p.text.trim() : p.text.trim() ? p.text : "");
  expect(seen.text).toBe(p.text);
  const calls = parts.filter((x) => x.type === "tool_call") as any[];
  expect(calls.map((c) => c.args)).toEqual(p.calls.map((c) => JSON.parse(c.args)));
  expect(calls.map((c) => c.id)).toEqual(p.calls.map((c) => c.id));
}

describe("OpenAI stream parser", () => {
  test("every split of a valid stream gives the same result", async () => {
    for (let seed = 1; seed <= runs(6); seed++) {
      const rng = new Rng(seed);
      const p = plan(rng);
      const bytes = enc.encode(openaiFrames(rng, p, {}));
      const whole = await run(openaiProvider, (b, c) => stubFetch(b, c), bytes, []);
      expectPlan(whole, p);
      for (let at = 1; at < bytes.length; at++) same(whole, await run(openaiProvider, (b, c) => stubFetch(b, c), bytes, [at]));
    }
  });

  test("random splits and one-byte pieces give the same result", async () => {
    for (let seed = 100; seed < 100 + runs(40); seed++) {
      const rng = new Rng(seed);
      const p = plan(rng);
      const bytes = enc.encode(openaiFrames(rng, p, { garbage: rng.bool() }));
      const whole = await run(openaiProvider, (b, c) => stubFetch(b, c), bytes, []);
      for (let k = 0; k < 4; k++) same(whole, await run(openaiProvider, (b, c) => stubFetch(b, c), bytes, cutsFor(rng, bytes.length)));
    }
  });

  test("garbage lines, a missing usage block and a repeated stop event do not change the reply", async () => {
    for (let seed = 200; seed < 200 + runs(40); seed++) {
      const rng = new Rng(seed);
      const p = plan(rng);
      const bytes = enc.encode(openaiFrames(rng, p, { garbage: true, usage: rng.bool(), stop: rng.int(1, 3) }));
      const seen = await run(openaiProvider, (b, c) => stubFetch(b, c), bytes, cutsFor(rng, bytes.length));
      expectPlan(seen, p);
    }
  });

  test("a stream with no finish reason and no end marker gives a clear error that can be tried again", async () => {
    for (let seed = 300; seed < 300 + runs(20); seed++) {
      const rng = new Rng(seed);
      const p = plan(rng);
      const full = openaiFrames(rng, p, { usage: false });
      const cutAt = full.indexOf('"finish_reason"');
      const bytes = enc.encode(full.slice(0, cutAt - rng.int(0, 12)));
      const seen = await run(openaiProvider, (b, c) => stubFetch(b, c), bytes, cutsFor(rng, bytes.length));
      expect(seen.error).toBeInstanceOf(ProviderError);
      expect((seen.error as ProviderError).transient).toBe(true);
      expect((seen.error as Error).message).toMatch(/stopped during the reply/);
    }
  });

  test("a stream that ends in the middle of a line gives an error or the whole reply", async () => {
    for (let seed = 400; seed < 400 + runs(30); seed++) {
      const rng = new Rng(seed);
      const p = plan(rng);
      const full = enc.encode(openaiFrames(rng, p, {}));
      const bytes = full.slice(0, rng.int(0, full.length));
      const seen = await run(openaiProvider, (b, c) => stubFetch(b, c), bytes, cutsFor(rng, bytes.length + 1));
      if (seen.error) expect(seen.error).toBeInstanceOf(ProviderError);
      else expect(seen.result!.message.role).toBe("assistant");
    }
  });

  test("a lone surrogate split across two chunks joins into one character", async () => {
    const emoji = "😀";
    const frames = [emoji.slice(0, 1), emoji.slice(1)].map((c) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}`);
    const text = `${frames.join("\n\n")}\n\ndata: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`;
    const bytes = enc.encode(text);
    expect(text).toContain("\\ud83d");
    for (let at = 1; at < bytes.length; at++) {
      const seen = await run(openaiProvider, (b, c) => stubFetch(b, c), bytes, [at]);
      expect(seen.text).toBe(emoji);
      expect(seen.result!.message.parts).toEqual([{ type: "text", text: emoji }]);
    }
  });

  test("a data line that holds JSON null does not stop the reply with a wrong error", async () => {
    const lines = ["data: null", 'data: {"choices":[{"delta":{"content":"ok"}}]}', 'data: {"choices":[{"delta":{"tool_calls":[null]}}]}', 'data: {"choices":[{"delta":{"tool_calls":{}}}]}', 'data: {"choices":[null]}', 'data: {"choices":[{"delta":{"content":"!"},"finish_reason":"stop"}]}', "data: [DONE]"];
    const seen = await run(openaiProvider, (b, c) => stubFetch(b, c), enc.encode(lines.join("\n\n") + "\n\n"), []);
    expect(seen.error).toBeUndefined();
    expect(seen.text).toBe("ok!");
  });

  test("an answer that is not a stream is read as one JSON object, and a damaged one gives an error", async () => {
    for (let seed = 500; seed < 500 + runs(20); seed++) {
      const rng = new Rng(seed);
      const text = rng.string(ALPHABET.filter((c) => c !== "{" && c !== "<"), 1, 20);
      const json = JSON.stringify({ choices: [{ message: { content: text }, finish_reason: "stop" }], usage: { prompt_tokens: 3, completion_tokens: 2 } });
      const whole = await run(openaiProvider, (b, c) => stubFetch(b, c, "application/json"), enc.encode(json), []);
      expect(whole.result!.message.parts).toEqual(text.trim() ? [{ type: "text", text: text.trim() }] : []);
      const bytes = enc.encode(json);
      same(whole, await run(openaiProvider, (b, c) => stubFetch(b, c, "application/json"), bytes, cutsFor(rng, bytes.length)));
      const broken = await run(openaiProvider, (b, c) => stubFetch(b, c, "application/json"), bytes.slice(0, rng.int(1, bytes.length - 1)), []);
      expect(broken.error).toBeInstanceOf(ProviderError);
    }
  });
});

function ollamaProvider() {
  return new OllamaProvider("m", { capabilities: ["tools"], paramSize: 8, contextLength: null }, { retries: 0, sleep: async () => {}, numCtx: 100000 });
}

function ollamaLines(rng: Rng, p: Plan, opts: { garbage?: boolean; done?: boolean; usage?: boolean }): string {
  const lines: string[] = [];
  const add = (j: unknown) => lines.push(JSON.stringify(j));
  for (const t of pieces(rng, p.text, 5)) {
    if (opts.garbage && rng.bool(0.3)) lines.push(rng.pick(["", "   ", "garbage", "{not json", "[1,2]", "5", "null", '{"unknown":1}', '{"message":null}', '{"message":{"content":5}}']));
    add({ model: "m", message: { role: "assistant", content: t }, done: false });
  }
  for (const c of p.calls) add({ message: { role: "assistant", content: "", tool_calls: [{ function: { name: c.name, arguments: JSON.parse(c.args) } }] }, done: false });
  if (opts.done !== false) add({ message: { role: "assistant", content: "" }, done: true, done_reason: "stop", ...(opts.usage === false ? {} : { prompt_eval_count: 9, eval_count: 4 }) });
  return lines.join("\n") + (rng.bool() ? "\n" : "");
}

function stubOllama(bytes: Uint8Array, cuts: number[]) {
  vi.stubGlobal("fetch", async () => new Response(body(bytes, cuts), { status: 200, headers: { "content-type": "application/x-ndjson" } }));
}

describe("Ollama stream parser", () => {
  test("every split of a valid stream gives the same result", async () => {
    for (let seed = 1; seed <= runs(6); seed++) {
      const rng = new Rng(seed);
      const p = plan(rng);
      const bytes = enc.encode(ollamaLines(rng, p, {}));
      const whole = await run(ollamaProvider, stubOllama, bytes, []);
      expectPlan({ ...whole, text: whole.text }, { ...p, calls: p.calls.map((c) => ({ ...c, id: "call_" + (p.calls.indexOf(c) + 1) })) });
      for (let at = 1; at < bytes.length; at++) same(whole, await run(ollamaProvider, stubOllama, bytes, [at]));
    }
  });

  test("random splits, garbage lines and a missing usage block do not change the reply", async () => {
    for (let seed = 100; seed < 100 + runs(40); seed++) {
      const rng = new Rng(seed);
      const p = plan(rng);
      const bytes = enc.encode(ollamaLines(rng, p, { garbage: true, usage: rng.bool() }));
      const whole = await run(ollamaProvider, stubOllama, bytes, []);
      expect(whole.error).toBeUndefined();
      expect(whole.text).toBe(p.text);
      same(whole, await run(ollamaProvider, stubOllama, bytes, cutsFor(rng, bytes.length)));
    }
  });

  test("a stream with no done line gives a clear error that can be tried again", async () => {
    for (let seed = 300; seed < 300 + runs(20); seed++) {
      const rng = new Rng(seed);
      const bytes = enc.encode(ollamaLines(rng, plan(rng), { done: false }) + (rng.bool() ? '\n{"message":{"content":"par' : ""));
      const seen = await run(ollamaProvider, stubOllama, bytes, cutsFor(rng, bytes.length));
      expect(seen.error).toBeInstanceOf(ProviderError);
      expect((seen.error as ProviderError).transient).toBe(true);
      expect((seen.error as Error).message).toMatch(/stopped before the end/);
    }
  });

  test("a partial last line after the done line does not lose the reply", async () => {
    const rng = new Rng(7);
    const p = { text: "hello", calls: [] };
    const bytes = enc.encode(ollamaLines(rng, p, {}).trimEnd() + '\n{"message":{"con');
    const seen = await run(ollamaProvider, stubOllama, bytes, [5, 40]);
    expect(seen.text).toBe("hello");
    expect(seen.result!.usage).toEqual({ inputTokens: 9, outputTokens: 4 });
  });

  test("a tool call that is null or not a list does not stop the reply with a wrong error", async () => {
    const lines = [{ message: { content: "ok", tool_calls: [null] } }, { message: { tool_calls: {} } }, { message: { tool_calls: 5 } }, { done: true, done_reason: "stop" }];
    const seen = await run(ollamaProvider, stubOllama, enc.encode(lines.map((l) => JSON.stringify(l)).join("\n")), []);
    expect(seen.error).toBeUndefined();
    expect(seen.text).toBe("ok");
  });
});

function claudeProvider(bytes: Uint8Array, cuts: number[]) {
  const fetchImpl = async () => new Response(body(bytes, cuts), { status: 200, headers: { "content-type": "text/event-stream", "request-id": "r" } });
  const client = new Anthropic({ apiKey: "k", baseURL: "http://localhost:9", fetch: fetchImpl as any, maxRetries: 0 });
  return new ClaudeProvider("claude-opus-5-5", { client, retries: 0, sleep: async () => {} });
}

function claudeEvents(rng: Rng, p: Plan, opts: { usage?: boolean; extra?: boolean; stop?: number; messageStop?: boolean }): string {
  const out: string[] = [];
  const ev = (type: string, data: object) => out.push(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n`);
  const usage = opts.usage === false ? undefined : { input_tokens: 12, output_tokens: 1 };
  ev("message_start", { message: { id: "m", type: "message", role: "assistant", model: "x", content: [], stop_reason: null, stop_sequence: null, ...(usage ? { usage } : { usage: {} }) } });
  let index = 0;
  if (p.text) {
    ev("content_block_start", { index, content_block: { type: "text", text: "" } });
    for (const t of pieces(rng, p.text, 5)) {
      if (opts.extra && rng.bool(0.3)) ev(rng.pick(["ping", "mystery_event"]), { x: 1 });
      ev("content_block_delta", { index, delta: { type: "text_delta", text: t } });
    }
    ev("content_block_stop", { index });
    index++;
  }
  for (const c of p.calls) {
    ev("content_block_start", { index, content_block: { type: "tool_use", id: c.id, name: c.name, input: {} } });
    for (const a of pieces(rng, c.args, rng.bool() ? 1 : 6)) ev("content_block_delta", { index, delta: { type: "input_json_delta", partial_json: a } });
    ev("content_block_stop", { index });
    index++;
  }
  for (let i = 0; i < (opts.stop ?? 1); i++) ev("message_delta", { delta: { stop_reason: p.calls.length ? "tool_use" : "end_turn", stop_sequence: null }, usage: { output_tokens: 5 } });
  if (opts.messageStop !== false) for (let i = 0; i < (opts.stop ?? 1); i++) ev("message_stop", {});
  return out.join("\n") + "\n";
}

async function claudeRun(bytes: Uint8Array, cuts: number[]): Promise<Seen> {
  const seen: Seen = { text: "", thinking: "" };
  try {
    seen.result = await claudeProvider(bytes, cuts).step({ system: "S", messages: [user], tools, onDelta: (d) => { if (d.type === "text") seen.text += d.text; } } as StepRequest);
  } catch (e) {
    seen.error = e;
  }
  return seen;
}

describe("Claude stream events", () => {
  test("every split of a valid stream gives the same result", async () => {
    for (let seed = 1; seed <= runs(4); seed++) {
      const rng = new Rng(seed);
      const p = plan(rng);
      const bytes = enc.encode(claudeEvents(rng, p, {}));
      const whole = await claudeRun(bytes, []);
      expect(whole.error).toBeUndefined();
      expectPlan(whole, p, false);
      for (let at = 1; at < bytes.length; at += 3) same(whole, await claudeRun(bytes, [at]));
    }
  });

  test("random splits, ping and unknown events, a missing usage block and a repeated stop event do not change the reply", async () => {
    for (let seed = 100; seed < 100 + runs(25); seed++) {
      const rng = new Rng(seed);
      const p = plan(rng);
      const bytes = enc.encode(claudeEvents(rng, p, { extra: true, usage: rng.bool(), stop: rng.int(1, 2) }));
      const seen = await claudeRun(bytes, cutsFor(rng, bytes.length));
      expect(seen.error).toBeUndefined();
      expectPlan(seen, p, false);
    }
  });

  test("a stream that ends before the stop event gives an error and no hang", async () => {
    for (let seed = 300; seed < 300 + runs(20); seed++) {
      const rng = new Rng(seed);
      const full = claudeEvents(rng, plan(rng), {});
      const bytes = enc.encode(full.slice(0, rng.int(0, full.indexOf("event: message_delta"))));
      const seen = await claudeRun(bytes, cutsFor(rng, bytes.length + 1));
      expect(seen.error).toBeInstanceOf(ProviderError);
      expect((seen.error as ProviderError).transient).toBe(true);
    }
  });

  test("a stream with message_delta but no message_stop is not accepted as a whole reply", async () => {
    const rng = new Rng(9);
    const bytes = enc.encode(claudeEvents(rng, { text: "abc", calls: [] }, { messageStop: false }));
    const seen = await claudeRun(bytes, []);
    expect(seen.error).toBeInstanceOf(ProviderError);
  });
});

describe("think tag splitter", () => {
  test("any split of the input gives the same text and thinking", () => {
    const words = ["<think>", "</think>", "<thi", "nk>", "</", "a", "b ", "😀", "<", ">", "\n"];
    for (let seed = 1; seed <= runs(300); seed++) {
      const rng = new Rng(seed);
      const input = rng.string(words, 0, 14);
      const collect = (parts: string[]) => {
        const out = { text: "", thinking: "" };
        const sp = new ThinkSplitter((k, s) => (out[k] += s));
        for (const x of parts) sp.push(x);
        sp.end();
        return out;
      };
      expect(collect(pieces(rng, input, 4))).toEqual(collect([input]));
    }
  });
});
