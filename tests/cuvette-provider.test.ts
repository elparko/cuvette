import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cuvetteToken, saveCuvetteToken } from "../src/core/credentials.ts";
import { isCloud } from "../src/core/phi.ts";
import { CUVETTE_MARKUP, costUsd, entryCost, modelPrice, readSpend, spendFile } from "../src/core/spend.ts";
import type { Message, StepRequest } from "../src/core/types.ts";
import { ProviderError, usesAnthropicApi, usesAnthropicSpec } from "../src/core/types.ts";
import { ClaudeProvider } from "../src/providers/claude.ts";
import { CUVETTE_MODEL, listModels, makeProvider } from "../src/providers/index.ts";

const user = (text: string): Message => ({ role: "user", parts: [{ type: "text", text }] });
const req = (extra: Partial<StepRequest> = {}): StepRequest => ({ system: "SYS", messages: [user("hello")], tools: [], ...extra });
const TOKEN = "cuv_testtoken";

function sse(model: string, input: number, output: number): Response {
  const ev = (name: string, data: object) => `event: ${name}\ndata: ${JSON.stringify({ type: name, ...data })}\n\n`;
  const body = [
    ev("message_start", { message: { id: "m1", type: "message", role: "assistant", model, content: [], stop_reason: null, usage: { input_tokens: input, output_tokens: 1 } } }),
    ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } }),
    ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: "hi" } }),
    ev("content_block_stop", { index: 0 }),
    ev("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: output } }),
    ev("message_stop", {}),
  ].join("");
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

const errorResponse = (status: number, type: string, message: string) =>
  new Response(JSON.stringify({ type: "error", error: { type, message } }), { status, headers: { "content-type": "application/json" } });

let calls: { url: string; headers: Headers }[];
function mockFetch(...responses: Response[]) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url instanceof Request ? url.url : url), headers: new Headers(init?.headers) });
      return responses.shift() ?? errorResponse(500, "api_error", "no response");
    }),
  );
}

const oldHome = process.env.CUVETTE_HOME;
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-prov-"));
  process.env.CUVETTE_SPEND_FILE = join(process.env.CUVETTE_HOME, "spend.jsonl");
  vi.stubEnv("CUVETTE_TOKEN", "");
  vi.stubEnv("CUVETTE_INFERENCE_URL", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "");
  vi.stubEnv("ANTHROPIC_BASE_URL", "");
  vi.stubEnv("ANTHROPIC_WORKSPACE_ID", "");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
});

describe("the cuvette model spec", () => {
  test("cuvette and cuvette:<model> make a hosted Claude provider", async () => {
    const a = await makeProvider("cuvette");
    expect(a).toBeInstanceOf(ClaudeProvider);
    expect(a.info).toEqual({ provider: "cuvette", model: "claude-opus-5-5", contextWindow: 1_000_000, vision: true, small: false, local: false });
    const b = await makeProvider("cuvette:claude-haiku-5-5");
    expect(b.info).toMatchObject({ provider: "cuvette", model: "claude-haiku-5-5" });
  });

  test("the model list has the hosted entry", async () => {
    expect((await listModels()).find((m) => m.spec === "cuvette")).toEqual(CUVETTE_MODEL);
    expect(CUVETTE_MODEL.label).toBe("Cuvette hosted (pay as you go)");
  });

  test("the provider check covers claude and cuvette only", () => {
    expect(usesAnthropicApi("claude")).toBe(true);
    expect(usesAnthropicApi("cuvette")).toBe(true);
    expect(usesAnthropicApi("ollama")).toBe(false);
    expect(usesAnthropicApi(undefined)).toBe(false);
    expect(usesAnthropicSpec("cuvette:claude-haiku-5-5")).toBe(true);
    expect(usesAnthropicSpec("claude")).toBe(true);
    expect(usesAnthropicSpec("claudette")).toBe(false);
    expect(usesAnthropicSpec("ollama:qwen3:8b")).toBe(false);
  });

  test("the cloud data rules apply to the hosted provider", async () => {
    expect(isCloud((await makeProvider("cuvette")).info)).toBe(true);
  });
});

describe("the hosted request", () => {
  test("goes to the Cuvette server with the account token only", async () => {
    saveCuvetteToken(TOKEN);
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-own-key");
    vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "own-auth-token");
    vi.stubEnv("ANTHROPIC_WORKSPACE_ID", "wrkspc_own");
    mockFetch(sse("claude-opus-5-5", 100, 50));
    const p = await makeProvider("cuvette");
    const deltas: string[] = [];
    const r = await p.step(req({ onDelta: (d) => deltas.push(d.text) }));
    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]!.url);
    expect(url.origin).toBe("https://api.cuvette.ai");
    expect(url.pathname).toBe("/v1/messages");
    expect(calls[0]!.headers.get("authorization")).toBe(`Bearer ${TOKEN}`);
    expect(calls[0]!.headers.get("x-api-key")).toBeNull();
    expect(calls[0]!.headers.get("anthropic-workspace-id")).toBeNull();
    expect(deltas).toEqual(["hi"]);
    expect(r.usage).toMatchObject({ inputTokens: 100, outputTokens: 50 });
    expect(r.message).toMatchObject({ provider: "cuvette", model: "claude-opus-5-5" });
  });

  test("CUVETTE_INFERENCE_URL changes the server and CUVETTE_TOKEN wins over the file", async () => {
    saveCuvetteToken(TOKEN);
    vi.stubEnv("CUVETTE_TOKEN", "cuv_fromenv");
    vi.stubEnv("CUVETTE_INFERENCE_URL", "http://localhost:8787/");
    mockFetch(sse("claude-opus-5-5", 1, 1));
    await (await makeProvider("cuvette")).step(req());
    expect(calls[0]!.url.startsWith("http://localhost:8787/v1/messages")).toBe(true);
    expect(calls[0]!.headers.get("authorization")).toBe("Bearer cuv_fromenv");
  });

  test("without a token it stops before any request and never sends the own token", async () => {
    vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "own-auth-token");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-own-key");
    mockFetch(sse("claude-opus-5-5", 1, 1));
    const p = await makeProvider("cuvette");
    const err = await p.step(req()).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.message).toContain("cuvette account create");
    expect(calls).toHaveLength(0);
  });

  test("a new token rebuilds the client", async () => {
    mockFetch(sse("claude-opus-5-5", 1, 1), sse("claude-opus-5-5", 1, 1));
    const p = await makeProvider("cuvette");
    saveCuvetteToken("cuv_first");
    await p.step(req());
    saveCuvetteToken("cuv_second");
    await p.step(req());
    expect(calls.map((c) => c.headers.get("authorization"))).toEqual(["Bearer cuv_first", "Bearer cuv_second"]);
    expect(cuvetteToken({}).token).toBe("cuv_second");
  });

  test("the own-key provider is unchanged", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-own-key");
    saveCuvetteToken(TOKEN);
    mockFetch(sse("claude-opus-5-5", 1, 1));
    await (await makeProvider("claude")).step(req());
    expect(new URL(calls[0]!.url).origin).toBe("https://api.anthropic.com");
    expect(calls[0]!.headers.get("x-api-key")).toBe("sk-ant-own-key");
    expect(calls[0]!.headers.get("authorization")).toBeNull();
  });
});

describe("error messages", () => {
  const fail = async (status: number, type: string, message: string, spec = "cuvette") => {
    saveCuvetteToken(TOKEN);
    mockFetch(errorResponse(status, type, message));
    const p = await makeProvider(spec, { retries: 0 });
    return (await p.step(req()).catch((e) => e)) as ProviderError;
  };

  test("402 tells the user to buy credit", async () => {
    const e = await fail(402, "insufficient_credit", "No credit.");
    expect(e).toBeInstanceOf(ProviderError);
    expect(e.message).toBe("Your Cuvette credit is used up. Run `cuvette account buy`, or open Settings and buy credit.");
  });

  test("401 tells the user to check the account", async () => {
    const e = await fail(401, "authentication_error", "invalid x-api-key");
    expect(e.message).toBe("Your Cuvette account token is not valid. Run `cuvette account status`.");
    expect(e.message).not.toContain("ANTHROPIC_API_KEY");
  });

  test("429 too_many_requests has its own message and can retry", async () => {
    const e = await fail(429, "too_many_requests", "Four requests run.");
    expect(e.message).toContain("busy");
    expect(e.transient).toBe(true);
  });

  test("a 429 from Anthropic keeps the rate limit message", async () => {
    const e = await fail(429, "rate_limit_error", "slow down");
    expect(e.message).toContain("rate limit");
  });

  test("the own-key provider keeps its messages for 401", async () => {
    const e = await fail(401, "authentication_error", "invalid x-api-key", "claude");
    expect(e.message).toContain("No valid Claude credentials");
  });

  test("complete() maps 402 too", async () => {
    saveCuvetteToken(TOKEN);
    mockFetch(errorResponse(402, "insufficient_credit", "No credit."));
    const p = await makeProvider("cuvette", { retries: 0 });
    await expect(p.complete!("SYS", "text")).rejects.toThrow(/credit is used up/);
  });
});

describe("spend", () => {
  test("the markup is 1.25 and applies to cuvette only", () => {
    expect(CUVETTE_MARKUP).toBe(1.25);
    const u = { inputTokens: 1e6, outputTokens: 1e6, cacheRead: 0, cacheWrite: 0 };
    expect(costUsd("claude-opus-5-5", u)).toBeCloseTo(24, 6);
    expect(costUsd("claude-opus-5-5", u, "claude")).toBeCloseTo(24, 6);
    expect(costUsd("claude-opus-5-5", u, "cuvette")).toBeCloseTo(30, 6);
  });

  test("entry cost reads the provider tag", () => {
    const d = { model: "claude-opus-5-5", inputTokens: 1e6, outputTokens: 0, cacheRead: 0, cacheWrite: 0 };
    expect(entryCost({ ...d, provider: "claude" })).toBeCloseTo(4, 6);
    expect(entryCost({ ...d, provider: "cuvette" })).toBeCloseTo(5, 6);
    expect(entryCost({ ...d, provider: "ollama" })).toBeUndefined();
  });

  test("the price shown for a hosted model includes the markup", () => {
    expect(modelPrice("claude:claude-opus-5-5")).toEqual({ input: 4, output: 20 });
    expect(modelPrice("cuvette:claude-opus-5-5")).toEqual({ input: 5, output: 25 });
  });

  test("a hosted step records the marked-up cost with the provider tag", async () => {
    saveCuvetteToken(TOKEN);
    writeFileSync(spendFile(), "");
    mockFetch(sse("claude-opus-5-5", 100_000, 10_000));
    await (await makeProvider("cuvette")).step(req());
    const rows = readSpend() as unknown as { provider: string; model: string; usd: number }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ provider: "cuvette", model: "claude-opus-5-5" });
    expect(rows[0]!.usd).toBeCloseTo(((100_000 * 4 + 10_000 * 20) / 1e6) * 1.25, 6);
    expect(readFileSync(spendFile(), "utf8")).toContain('"provider":"cuvette"');
  });
});
