import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { Message, StepRequest, ToolSchema } from "../src/core/types.ts";
import { ProviderError } from "../src/core/types.ts";
import { ClaudeProvider } from "../src/providers/claude.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { CLAUDE_MODELS, listModels, makeProvider } from "../src/providers/index.ts";
import { ThinkSplitter, extractTextToolCall, splitThink } from "../src/providers/text.ts";

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const tools: ToolSchema[] = [
  { name: "add", description: "Add two numbers", inputSchema: { type: "object", properties: { a: { type: "number" }, b: { type: "number" } }, required: ["a", "b"] } },
  { name: "mul", description: "Multiply", inputSchema: { type: "object", properties: {} } },
];
const user = (text: string): Message => ({ role: "user", parts: [{ type: "text", text }] });
const req = (messages: Message[], extra: Partial<StepRequest> = {}): StepRequest => ({ system: "SYS", messages, tools, ...extra });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function fakeClient(responses: any[]) {
  const calls: { api: string; params: any; opts: any }[] = [];
  const handlers: Record<string, ((d: string) => void)[]> = {};
  const make = (api: string) => (params: any, opts: any) => {
    calls.push({ api, params, opts });
    const r = responses.shift();
    const stream = {
      on(ev: string, fn: (d: string) => void) {
        (handlers[ev] ??= []).push(fn);
        return stream;
      },
      async finalMessage() {
        if (r instanceof Error) throw r;
        for (const b of r.content) {
          if (b.type === "text") handlers.text?.forEach((f) => f(b.text));
          if (b.type === "thinking") handlers.thinking?.forEach((f) => f(b.thinking));
        }
        return r;
      },
    };
    return stream;
  };
  const client = {
    messages: { stream: make("stream"), create: async (params: any, opts: any) => (calls.push({ api: "create", params, opts }), responses.shift()), countTokens: async (p: any) => (calls.push({ api: "count", params: p, opts: undefined }), { input_tokens: 42 }) },
    beta: { messages: { stream: make("beta") } },
  };
  return { client, calls };
}

const claudeMsg = (content: any[], stop = "end_turn", extra: any = {}) => ({
  content,
  stop_reason: stop,
  usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 3, cache_creation_input_tokens: 2 },
  ...extra,
});

describe("claude", () => {
  test("request shape: adaptive thinking, effort, cache control, no tool_choice", async () => {
    const { client, calls } = fakeClient([claudeMsg([{ type: "text", text: "hi" }])]);
    const p = new ClaudeProvider("claude-opus-5-5", { client });
    const deltas: string[] = [];
    const ac = new AbortController();
    const r = await p.step(req([user("hello")], { signal: ac.signal, onDelta: (d) => deltas.push(d.text) }));
    const { api, params, opts } = calls[0];
    expect(api).toBe("beta");
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.max_tokens).toBe(64000);
    expect(params.thinking).toEqual({ type: "adaptive", display: "summarized" });
    expect(JSON.stringify(params)).not.toContain("budget_tokens");
    expect(JSON.stringify(params)).not.toContain("disabled");
    expect(params.tool_choice).toBeUndefined();
    expect(params.output_config).toEqual({ effort: "high" });
    expect(params.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(params.fallbacks).toBe("default");
    expect(params.system).toEqual([{ type: "text", text: "SYS", cache_control: { type: "ephemeral" } }]);
    expect(params.tools[0].cache_control).toBeUndefined();
    expect(params.tools[1].cache_control).toEqual({ type: "ephemeral" });
    expect(params.tools[0].input_schema).toEqual(tools[0].inputSchema);
    expect(opts.signal).toBe(ac.signal);
    expect(deltas).toEqual(["hi"]);
    expect(r.usage).toEqual({ inputTokens: 10, outputTokens: 5, cacheRead: 3, cacheWrite: 2 });
    expect(r.stopReason).toBe("end");
    expect(r.message).toMatchObject({ provider: "claude", model: "claude-opus-5-5" });
  });

  test("haiku defaults to medium effort; setting overrides", async () => {
    const a = fakeClient([claudeMsg([{ type: "text", text: "x" }])]);
    await new ClaudeProvider("claude-haiku-5-5", { client: a.client }).step(req([user("q")]));
    expect(a.calls[0].params.output_config.effort).toBe("medium");
    const b = fakeClient([claudeMsg([{ type: "text", text: "x" }])]);
    await new ClaudeProvider("claude-opus-5-5", { client: b.client, effort: "max" }).step(req([user("q")]));
    expect(b.calls[0].params.output_config.effort).toBe("max");
  });

  test("echoes raw content when provider and model match, drops thinking otherwise", async () => {
    const thinking = { type: "thinking", thinking: "hmm", signature: "SIG" };
    const use = { type: "tool_use", id: "toolu_1", name: "add", input: { a: 1, b: 2 } };
    const { client, calls } = fakeClient([claudeMsg([thinking, { type: "text", text: "calling" }, use], "tool_use"), claudeMsg([{ type: "text", text: "ok" }])]);
    const p = new ClaudeProvider("claude-opus-5-5", { client });
    const first = await p.step(req([user("go")]));
    expect(first.stopReason).toBe("tool_use");
    expect(first.message.parts).toEqual([
      { type: "thinking", text: "hmm" },
      { type: "text", text: "calling" },
      { type: "tool_call", id: "toolu_1", name: "add", args: { a: 1, b: 2 } },
    ]);
    const history: Message[] = [
      user("go"),
      first.message,
      { role: "user", parts: [{ type: "tool_result", callId: "toolu_1", name: "add", text: "3" }] },
    ];
    await p.step(req(history));
    expect(calls[1].params.messages[1]).toEqual({ role: "assistant", content: [thinking, { type: "text", text: "calling" }, use] });

    const other = new ClaudeProvider("claude-sonnet-5-5", { client: fakeClient([claudeMsg([{ type: "text", text: "z" }])]).client });
    const native: any[] = other.toNative(history);
    expect(native[1].content).toEqual([{ type: "text", text: "calling" }, { type: "tool_use", id: "toolu_1", name: "add", input: { a: 1, b: 2 } }]);
  });

  test("groups all tool results in one user message with images and is_error", () => {
    dirImg();
    const p = new ClaudeProvider("claude-opus-5-5", { client: {} });
    const history: Message[] = [
      user("go"),
      { role: "assistant", parts: [{ type: "tool_call", id: "a", name: "add", args: {} }, { type: "tool_call", id: "b", name: "mul", args: {} }] },
      {
        role: "user",
        parts: [
          { type: "tool_result", callId: "a", name: "add", text: "plot", images: [imgPath] },
          { type: "tool_result", callId: "b", name: "mul", text: "boom", isError: true },
        ],
      },
    ];
    const native: any[] = p.toNative(history);
    expect(native).toHaveLength(3);
    const content = native[2].content;
    expect(content).toHaveLength(2);
    expect(content[0].tool_use_id).toBe("a");
    expect(content[0].content[1]).toMatchObject({ type: "image", source: { type: "base64", media_type: "image/png" } });
    expect(content[1]).toMatchObject({ tool_use_id: "b", is_error: true, content: "boom" });
  });

  test("an error result with images sends text only", () => {
    dirImg();
    const p = new ClaudeProvider("claude-opus-5-5", { client: {} });
    const native: any[] = p.toNative([
      user("go"),
      { role: "assistant", parts: [{ type: "tool_call", id: "a", name: "run", args: {} }] },
      { role: "user", parts: [{ type: "tool_result", callId: "a", name: "run", text: "failed", images: [imgPath], isError: true }] },
    ]);
    const block = native[2].content[0];
    expect(block.is_error).toBe(true);
    expect(typeof block.content).toBe("string");
    expect(block.content).toContain("left out of an error result");
  });

  test("image limits: 4 per result, 50 per conversation", () => {
    dirImg();
    const p = new ClaudeProvider("claude-opus-5-5", { client: {} });
    const msgs: Message[] = [];
    for (let i = 0; i < 13; i++)
      msgs.push({ role: "user", parts: [{ type: "tool_result", callId: `c${i}`, name: "t", text: "x", images: Array(6).fill(imgPath) }] });
    const native: any[] = p.toNative(msgs);
    const counts = native.map((m) => m.content[0].content.filter((b: any) => b?.type === "image").length);
    expect(counts.slice(0, 12)).toEqual(Array(12).fill(4));
    expect(counts[12]).toBe(2);
    expect(native[0].content[0].content[0].text).toContain("not attached");
  });

  test("refusal returns a declined text part and drops tool calls from raw", async () => {
    const { client } = fakeClient([claudeMsg([{ type: "tool_use", id: "t", name: "add", input: {} }], "refusal", { stop_details: { category: "cyber" } })]);
    const r = await new ClaudeProvider("claude-opus-5-5", { client }).step(req([user("x")]));
    expect(r.stopReason).toBe("refusal");
    expect(r.message.parts).toEqual([{ type: "text", text: "The model declined this request (category: cyber)." }]);
    expect(r.note).toContain("declined");
  });

  test("drops fallback params after a 400 about them and retries once", async () => {
    const bad = new Anthropic.BadRequestError(400, { error: { message: "unknown field fallbacks" } } as any, "unknown field fallbacks", new Headers());
    const { client, calls } = fakeClient([bad, claudeMsg([{ type: "text", text: "ok" }]), claudeMsg([{ type: "text", text: "again" }])]);
    const p = new ClaudeProvider("claude-opus-5-5", { client });
    await p.step(req([user("x")]));
    expect(calls.map((c) => c.api)).toEqual(["beta", "stream"]);
    expect(calls[1].params.fallbacks).toBeUndefined();
    expect(calls[1].params.betas).toBeUndefined();
    await p.step(req([user("y")]));
    expect(calls[2].api).toBe("stream");
  });

  test("maps SDK errors to ProviderError", async () => {
    const auth = new Anthropic.AuthenticationError(401, {} as any, "nope", new Headers());
    const rate = new Anthropic.RateLimitError(429, {} as any, "slow", new Headers());
    const srv = new Anthropic.InternalServerError(503, {} as any, "down", new Headers());
    const conn = new Anthropic.APIConnectionError({ message: "x" });
    const msgs: string[] = [];
    for (const e of [auth, rate, srv, conn]) {
      const { client } = fakeClient([e]);
      await new ClaudeProvider("claude-opus-5-5", { client, retries: 0 }).step(req([user("x")])).catch((err) => {
        expect(err).toBeInstanceOf(ProviderError);
        msgs.push(err.message);
      });
    }
    expect(msgs[0]).toMatch(/^No valid Claude credentials. Type \/key to add your API key, set ANTHROPIC_API_KEY, or run `ant auth login`. The API said:/);
    expect(msgs[1]).toMatch(/rate limit/i);
    expect(msgs[2]).toMatch(/503/);
    expect(msgs[3]).toMatch(/Cannot reach/);
  });

  test("complete and countTokens", async () => {
    const { client, calls } = fakeClient([claudeMsg([{ type: "thinking", thinking: "t", signature: "s" }, { type: "text", text: "answer" }])]);
    const p = new ClaudeProvider("claude-opus-5-5", { client });
    expect(await p.complete("S", "Q")).toBe("answer");
    expect(calls[0].params.tools).toBeUndefined();
    expect(calls[0].params.thinking).toEqual({ type: "adaptive", display: "summarized" });
    expect(await p.countTokens!({ system: "S", messages: [user("q")], tools })).toBe(42);
  });

  test("makeProvider claude uses default model and info", async () => {
    const p = await makeProvider("claude", { client: {} });
    expect(p.info).toEqual({ provider: "claude", model: "claude-opus-5-5", contextWindow: 1_000_000, vision: true, small: false, local: false });
    expect((await makeProvider("claude:claude-haiku-5-5", { client: {} })).info.model).toBe("claude-haiku-5-5");
  });
});

let imgPath = "";
function dirImg() {
  if (imgPath) return;
  const d = mkdtempSync(join(tmpdir(), "cuvette-img-"));
  imgPath = join(d, "a.png");
  writeFileSync(imgPath, PNG);
}

function ndjson(lines: unknown[], chunkSize = 17): Response {
  const body = lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
  const enc = new TextEncoder().encode(body);
  const stream = new ReadableStream({
    start(c) {
      for (let i = 0; i < enc.length; i += chunkSize) c.enqueue(enc.slice(i, i + chunkSize));
      c.close();
    },
  });
  return new Response(stream, { status: 200 });
}

const showBody = (caps: string[], size = "8.2B", ctx = 40960) => ({
  capabilities: caps,
  details: { parameter_size: size },
  model_info: { "qwen3.context_length": ctx },
});
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });

function stubOllama(chat: (body: any, n: number) => Response, show = showBody(["completion", "tools", "thinking"])) {
  const seen: { url: string; body: any }[] = [];
  let n = 0;
  vi.stubGlobal("fetch", async (url: string, init: any) => {
    const body = init?.body ? JSON.parse(init.body) : undefined;
    seen.push({ url, body });
    if (url.endsWith("/api/show")) return json(show);
    if (url.endsWith("/api/chat")) return chat(body, n++);
    if (url.endsWith("/api/tags")) return json({ models: [{ name: "qwen3:8b", details: { parameter_size: "8.2B", context_length: 40960 }, capabilities: ["tools"] }, { name: "gemma:2b", details: { parameter_size: "2B" }, capabilities: ["completion"] }] });
    return new Response("nope", { status: 404 });
  });
  return seen;
}

describe("ollama", () => {
  test("reads /api/show, caps context, streams NDJSON, accumulates tool calls", async () => {
    const seen = stubOllama(() =>
      ndjson([
        { message: { role: "assistant", content: "<thi" } },
        { message: { role: "assistant", content: "nk>plan it</think>Hel" } },
        { message: { role: "assistant", content: "lo" } },
        { message: { role: "assistant", content: "", tool_calls: [{ function: { name: "add", arguments: { a: 1, b: 2 } } }] } },
        { done: true, done_reason: "stop", prompt_eval_count: 11, eval_count: 7, message: { role: "assistant", content: "" } },
      ]),
    );
    const p = await makeProvider("ollama:qwen3:8b");
    expect(p.info).toEqual({ provider: "ollama", model: "qwen3:8b", contextWindow: 32768, vision: false, small: true, local: true });
    const deltas: string[] = [];
    const history: Message[] = [user("add"), { role: "assistant", parts: [{ type: "tool_call", id: "call_4", name: "add", args: {} }] }];
    const r = await p.step(req(history, { onDelta: (d) => deltas.push(`${d.type}:${d.text}`) }));
    const chat = seen.find((s) => s.url.endsWith("/api/chat"))!.body;
    expect(chat.stream).toBe(true);
    expect(chat.options.num_ctx).toBe(32768);
    expect(chat.options.num_predict).toBe(8192);
    expect(chat.think).toBe(false);
    expect(chat.messages[0]).toEqual({ role: "system", content: "SYS" });
    expect(chat.tools[0]).toEqual({ type: "function", function: { name: "add", description: "Add two numbers", parameters: tools[0].inputSchema } });
    expect(r.message.parts).toEqual([
      { type: "thinking", text: "plan it" },
      { type: "text", text: "Hello" },
      { type: "tool_call", id: "call_5", name: "add", args: { a: 1, b: 2 } },
    ]);
    expect(deltas.join("|")).toContain("thinking:plan it");
    expect(deltas.filter((d) => d.startsWith("text:")).join("").replace(/text:/g, "")).toBe("Hello");
    expect(r.stopReason).toBe("tool_use");
    expect(r.usage).toEqual({ inputTokens: 11, outputTokens: 7 });
  });

  test("a reply that repeats the same text is stopped and cut before the repeat", async () => {
    const para = "The standard error of the estimate is 1.55 milliseconds, which is small. The confidence interval gives a range of plausible values for the true change per day. The mixed model accounts for individual differences in how people react to sleep loss, which matters for the reading of the results. ";
    const chunks = ["The slope is 10.47 ms per day (se 1.546).\n\n", ...Array.from({ length: 40 }, () => para + "\n\n")];
    const seen = stubOllama(() => ndjson([...chunks.map((c) => ({ message: { content: c } })), { done: true, done_reason: "length", eval_count: 8192 }]));
    const p = await makeProvider("ollama:qwen3:8b");
    const r = await p.step(req([user("fit")]));
    const text = (r.message.parts.find((x) => x.type === "text") as { text: string }).text;
    expect(text.startsWith("The slope is 10.47 ms per day (se 1.546).")).toBe(true);
    expect(text.split("The standard error").length - 1).toBeLessThanOrEqual(2);
    expect(r.note).toMatch(/repeated the same text/);
    expect(seen.filter((x) => x.url.endsWith("/api/chat"))).toHaveLength(1);
  });

  test("a review reply that repeats itself is stopped as well", async () => {
    const finding = '{"check": "referee", "message": "The answer does not report the Leiden resolution (0.7) in the cluster count statement, and it does not report the number of neighbors (10)."},\n';
    stubOllama(() => ndjson([{ message: { content: "[\n" } }, ...Array.from({ length: 40 }, () => ({ message: { content: finding } })), { done: true }]));
    const p = await makeProvider("ollama:qwen3:8b");
    const out = await p.complete("SYS", "review");
    expect(out.split("Leiden resolution").length - 1).toBeLessThanOrEqual(3);
  });

  test("a long reply without a repeat is kept whole", async () => {
    const chunks = Array.from({ length: 60 }, (_, i) => `Line ${i}: the value of item ${i} is ${i * 7.31} units, from step n${i}. `);
    stubOllama(() => ndjson([...chunks.map((c) => ({ message: { content: c } })), { done: true }]));
    const p = await makeProvider("ollama:qwen3:8b");
    const r = await p.step(req([user("x")]));
    expect((r.message.parts[0] as { text: string }).text).toBe(chunks.join("").trim());
    expect(r.note).toBeUndefined();
  });

  test("a model without native tools gets prompted tool calls", async () => {
    const seen = stubOllama(
      () =>
        ndjson([
          { message: { role: "assistant", content: 'I will add them.\n<tool_call>{"name": "add", "arguments": {"a": 1, "b": 2}}</tool_call>' } },
          { done: true, done_reason: "stop", prompt_eval_count: 5, eval_count: 9, message: { role: "assistant", content: "" } },
        ]),
      showBody(["completion"]),
    );
    const p = await makeProvider("ollama:medgemma:4b");
    const history: Message[] = [
      user("add"),
      { role: "assistant", parts: [{ type: "tool_call", id: "call_1", name: "add", args: { a: 5, b: 1 } }] },
      { role: "user", parts: [{ type: "tool_result", callId: "call_1", name: "add", text: "6" }] },
    ];
    const r = await p.step(req(history));
    const chat = seen.find((s) => s.url.endsWith("/api/chat"))!.body;
    expect(chat.tools).toBeUndefined();
    expect(chat.messages[0].content).toMatch(/^SYS\n\n# Tools\n/);
    expect(chat.messages[0].content).toContain("- add: Add two numbers");
    expect(chat.messages[2]).toEqual({ role: "assistant", content: '<tool_call>{"name":"add","arguments":{"a":5,"b":1}}</tool_call>' });
    expect(chat.messages[3]).toEqual({ role: "user", content: '<tool_result name="add">\n6\n</tool_result>' });
    expect(chat.messages.some((m: any) => m.role === "tool")).toBe(false);
    expect(r.message.parts).toEqual([
      { type: "text", text: "I will add them." },
      { type: "tool_call", id: "call_2", name: "add", args: { a: 1, b: 2 } },
    ]);
    expect(r.note).toBeUndefined();
  });

  test("numCtx option, model context smaller than default, and large-model small flag", async () => {
    stubOllama(() => json({}), showBody(["tools"], "70B", 131072));
    expect((await makeProvider("ollama:big", { numCtx: 100000 })).info).toMatchObject({ contextWindow: 100000, small: false });
    stubOllama(() => json({}), showBody(["tools"], "8B", 8192));
    expect((await makeProvider("ollama:m")).info.contextWindow).toBe(8192);
  });

  test("retries without think when the server rejects it", async () => {
    const seen = stubOllama((body, n) => (n === 0 ? json({ error: '"x" does not support thinking' }, 400) : ndjson([{ message: { content: "ok" } }, { done: true }])));
    const p = await makeProvider("ollama:x");
    const r = await p.step(req([user("q")]));
    const chats = seen.filter((s) => s.url.endsWith("/api/chat"));
    expect(chats).toHaveLength(2);
    expect(chats[0].body.think).toBe(false);
    expect("think" in chats[1].body).toBe(false);
    expect(r.message.parts).toEqual([{ type: "text", text: "ok" }]);
  });

  test("complete streams the reply, so the 300 s wait for response headers does not apply", async () => {
    const seen = stubOllama(() => ndjson([{ message: { content: "<think>x</think>Fin" } }, { message: { content: "dings." } }, { done: true }]));
    const p = await makeProvider("ollama:x");
    expect(await p.complete("S", "Q")).toBe("Findings.");
    const chat = seen.find((s) => s.url.endsWith("/api/chat"))!.body;
    expect(chat.stream).toBe(true);
    expect(chat.options.num_predict).toBe(8192);
  });

  test("converts a tool call written as JSON text", async () => {
    stubOllama(() => ndjson([{ message: { content: 'Sure.\n```json\n{"name": "add", "arguments": {"a": 2, "b": 3}}\n```' } }, { done: true }]));
    const p = await makeProvider("ollama:x");
    const r = await p.step(req([user("q")]));
    expect(r.message.parts).toEqual([
      { type: "text", text: "Sure." },
      { type: "tool_call", id: "call_1", name: "add", args: { a: 2, b: 3 } },
    ]);
    expect(r.note).toBe("converted a tool call written as text");
    expect(r.stopReason).toBe("tool_use");
  });

  test("tool results use role tool; images only for vision models", async () => {
    dirImg();
    const hist: Message[] = [
      user("q"),
      { role: "assistant", parts: [{ type: "text", text: "t" }, { type: "tool_call", id: "call_1", name: "add", args: { a: 1 } }] },
      { role: "user", parts: [{ type: "tool_result", callId: "call_1", name: "add", text: "fig", images: [imgPath] }] },
    ];
    stubOllama(() => json({}), showBody(["tools"]));
    const text: any[] = (await makeProvider("ollama:t") as any).toNative("S", hist);
    expect(text[2].tool_calls).toEqual([{ function: { name: "add", arguments: { a: 1 } } }]);
    expect(text[3]).toEqual({ role: "tool", tool_name: "add", content: "fig\n(image not shown to this model)" });
    expect(text).toHaveLength(4);
    stubOllama(() => json({}), showBody(["tools", "vision"]));
    const vis: any[] = (await makeProvider("ollama:v") as any).toNative("S", hist);
    expect(vis[3].role).toBe("tool");
    expect(vis[4].images).toHaveLength(1);
  });

  test("unreachable server gives a plain error", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    await expect(makeProvider("ollama:x")).rejects.toThrow(/Cannot reach Ollama/);
  });

  test("retries network errors, reports each wait, then gives a result", async () => {
    stubOllama((_, n) => {
      if (n < 2) throw new TypeError("fetch failed");
      return ndjson([{ message: { content: "ok" } }, { done: true }]);
    });
    const events: unknown[] = [];
    const p = await makeProvider("ollama:x", { sleep: async () => {} });
    const r = await p.step(req([user("x")], { onRetry: (e) => events.push(e) }));
    expect(r.message.parts).toEqual([{ type: "text", text: "ok" }]);
    expect(events).toMatchObject([
      { attempt: 1, of: 3, reason: "network error" },
      { attempt: 2, of: 3, reason: "network error" },
    ]);
  });

  test("a 400 reply is not retried", async () => {
    const seen = stubOllama(() => json({ error: "bad input" }, 400));
    const events: unknown[] = [];
    const p = await makeProvider("ollama:x", { sleep: async () => {} });
    const err = await p.step(req([user("x")], { onRetry: (e) => events.push(e) })).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.transient).toBe(false);
    expect(seen.filter((s) => s.url.endsWith("/api/chat"))).toHaveLength(1);
    expect(events).toEqual([]);
  });

  test("a server that keeps failing gives a transient error after the last try", async () => {
    const seen = stubOllama(() => json({ error: "busy" }, 503));
    const p = await makeProvider("ollama:x", { sleep: async () => {} });
    const err = await p.step(req([user("x")])).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.transient).toBe(true);
    expect(seen.filter((s) => s.url.endsWith("/api/chat"))).toHaveLength(4);
  });

  test("OLLAMA_HOST overrides the address", async () => {
    vi.stubEnv("OLLAMA_HOST", "10.0.0.5:9999");
    const seen = stubOllama(() => json({}));
    await makeProvider("ollama:x");
    expect(seen[0].url).toBe("http://10.0.0.5:9999/api/show");
  });

  test("listModels lists Claude and Ollama, and skips Ollama when it is down", async () => {
    stubOllama(() => json({}));
    const list = await listModels();
    expect(list.slice(0, CLAUDE_MODELS.length)).toEqual(CLAUDE_MODELS);
    expect(list.find((m) => m.spec === "ollama:qwen3:8b")).toMatchObject({ local: true, tools: true });
    expect(list.find((m) => m.spec === "ollama:gemma:2b")!.tools).toBe(false);
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("refused");
    });
    expect(await listModels()).toEqual(CLAUDE_MODELS);
  });
});

describe("openai", () => {
  test("chat completions with tool calls, bad JSON, reasoning, auth header", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    let seen: any;
    vi.stubGlobal("fetch", async (url: string, init: any) => {
      seen = { url, headers: init.headers, body: JSON.parse(init.body) };
      return json({
        choices: [
          {
            finish_reason: "tool_calls",
            message: {
              content: "ok",
              reasoning_content: "think",
              tool_calls: [
                { id: "c1", type: "function", function: { name: "add", arguments: '{"a":1,"b":2}' } },
                { id: "c2", type: "function", function: { name: "mul", arguments: "{bad" } },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 9, completion_tokens: 4 },
      });
    });
    const p = await makeProvider("openai:http://localhost:1234/v1/|my-model");
    const hist: Message[] = [user("q"), { role: "assistant", parts: [{ type: "tool_call", id: "x", name: "add", args: { a: 1 } }] }, { role: "user", parts: [{ type: "tool_result", callId: "x", name: "add", text: "1" }] }];
    const r = await p.step(req(hist));
    expect(seen.url).toBe("http://localhost:1234/v1/chat/completions");
    expect(seen.headers.authorization).toBe("Bearer sk-test");
    expect(seen.body.model).toBe("my-model");
    expect(seen.body.messages[2].tool_calls[0].function.arguments).toBe('{"a":1}');
    expect(seen.body.messages[3]).toEqual({ role: "tool", tool_call_id: "x", content: "1" });
    expect(r.message.parts[0]).toEqual({ type: "thinking", text: "think" });
    expect(r.message.parts[2]).toEqual({ type: "tool_call", id: "c1", name: "add", args: { a: 1, b: 2 } });
    expect((r.message.parts[3] as any).parseError).toContain("not valid JSON");
    expect(r.usage).toEqual({ inputTokens: 9, outputTokens: 4 });
    expect(r.stopReason).toBe("tool_use");
  });

  test("retries network errors, reports each wait, then gives a result", async () => {
    let n = 0;
    vi.stubGlobal("fetch", async () => {
      if (n++ < 2) throw new TypeError("fetch failed");
      return json({ choices: [{ message: { content: "ok" } }] });
    });
    const events: unknown[] = [];
    const p = await makeProvider("openai:http://localhost:1234/v1|m", { sleep: async () => {} });
    const r = await p.step(req([user("x")], { onRetry: (e) => events.push(e) }));
    expect(r.message.parts).toEqual([{ type: "text", text: "ok" }]);
    expect(events).toMatchObject([
      { attempt: 1, of: 3, reason: "network error" },
      { attempt: 2, of: 3, reason: "network error" },
    ]);
  });

  test("a 400 reply is not retried", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", async () => {
      calls++;
      return json({ error: { message: "bad input" } }, 400);
    });
    const events: unknown[] = [];
    const p = await makeProvider("openai:http://localhost:1234/v1|m", { sleep: async () => {} });
    const err = await p.step(req([user("x")], { onRetry: (e) => events.push(e) })).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.transient).toBe(false);
    expect(calls).toBe(1);
    expect(events).toEqual([]);
  });

  test("rejects a malformed spec", async () => {
    await expect(makeProvider("openai:http://x")).rejects.toThrow(ProviderError);
    await expect(makeProvider("bogus")).rejects.toThrow(/Unknown model spec/);
  });
});

describe("fake", () => {
  test("scripted steps, recording, exhaustion, complete", async () => {
    const p = new FakeProvider([{ text: "a", calls: [{ name: "add", args: { a: 1 } }] }, { thinking: "t", text: "b" }]);
    const r1 = await p.step(req([user("x")]));
    expect(r1.stopReason).toBe("tool_use");
    expect(r1.message.parts[1]).toEqual({ type: "tool_call", id: "call_1", name: "add", args: { a: 1 } });
    expect((await p.step(req([user("y")]))).message.parts).toEqual([{ type: "thinking", text: "t" }, { type: "text", text: "b" }]);
    const r3 = await p.step(req([user("z")]));
    expect(r3.message.parts).toEqual([{ type: "text", text: "done" }]);
    expect(p.requests).toHaveLength(3);
    expect(p.requests[0]).toMatchObject({ system: "SYS", tools });
    expect(await p.complete()).toBe("No findings.");
  });

  test("function script and file spec", async () => {
    const p = new FakeProvider((messages) => ({ text: `n=${messages.length}` }));
    expect((await p.step(req([user("x")]))).message.parts).toEqual([{ type: "text", text: "n=1" }]);
    const f = join(mkdtempSync(join(tmpdir(), "cuvette-fake-")), "s.json");
    writeFileSync(f, JSON.stringify({ steps: [{ text: "from file" }], complete: "custom" }));
    const q = await makeProvider(`fake:${f}`);
    expect((await q.step(req([user("x")]))).message.parts).toEqual([{ type: "text", text: "from file" }]);
    expect(await q.complete("s", "t")).toBe("custom");
  });
});

describe("text helpers", () => {
  test("splitThink and splitter", () => {
    expect(splitThink("<think>a</think>b")).toEqual({ text: "b", thinking: "a" });
    const out: string[] = [];
    const s = new ThinkSplitter((k, t) => out.push(`${k}:${t}`));
    for (const c of "<th|ink>x</thi|nk>y".split("|")) s.push(c);
    s.end();
    expect(out.join("")).toBe("thinking:xtext:y");
  });

  test("extractTextToolCall ignores unknown tools", () => {
    expect(extractTextToolCall('{"name":"nope","arguments":{}}', ["add"])).toBeNull();
    expect(extractTextToolCall('{"name":"add","parameters":{"a":1}}', ["add"])).toMatchObject({ name: "add", args: { a: 1 } });
  });
});

describe.skipIf(!process.env.CUVETTE_LIVE)("live ollama", () => {
  const addTool: ToolSchema = {
    name: "add",
    description: "Add two integers and return the sum",
    inputSchema: { type: "object", properties: { a: { type: "integer" }, b: { type: "integer" } }, required: ["a", "b"] },
  };

  test("qwen3:8b calls the tool", async () => {
    const t0 = Date.now();
    const p = await makeProvider("ollama:qwen3:8b");
    const t1 = Date.now();
    const r = await p.step({ system: "You are a calculator. Use the add tool for every sum.", messages: [user("What is 17 + 25?")], tools: [addTool] });
    const t2 = Date.now();
    console.log(`live: create ${t1 - t0} ms, step ${t2 - t1} ms`, JSON.stringify(r.message.parts), r.usage);
    const call = r.message.parts.find((x) => x.type === "tool_call") as any;
    expect(call?.name).toBe("add");
    expect(Number(call.args.a) + Number(call.args.b)).toBe(42);
    const hist: Message[] = [user("What is 17 + 25?"), r.message, { role: "user", parts: [{ type: "tool_result", callId: call.id, name: "add", text: "42" }] }];
    const t3 = Date.now();
    const r2 = await p.step({ system: "You are a calculator. Use the add tool for every sum.", messages: hist, tools: [addTool] });
    console.log(`live: second step ${Date.now() - t3} ms`, JSON.stringify(r2.message.parts));
    expect(JSON.stringify(r2.message.parts)).toContain("42");
  }, 300000);

  test("listModels sees local models", async () => {
    const list = await listModels();
    expect(list.some((m) => m.spec === "ollama:qwen3:8b")).toBe(true);
  });
});
