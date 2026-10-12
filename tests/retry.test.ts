import Anthropic from "@anthropic-ai/sdk";
import { expect, test } from "vitest";
import type { Message, StepRequest } from "../src/core/types.ts";
import { ProviderError } from "../src/core/types.ts";
import { ClaudeProvider } from "../src/providers/claude.ts";
import { retryReason, waitMs, withRetry } from "../src/providers/retry.ts";

const user = (text: string): Message => ({ role: "user", parts: [{ type: "text", text }] });
const req = (extra: Partial<StepRequest> = {}): StepRequest => ({ system: "SYS", messages: [user("x")], tools: [], ...extra });
const ok = { content: [{ type: "text", text: "fine" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
const rate = (headers = new Headers()) => new Anthropic.RateLimitError(429, {} as any, "slow", headers);
const down = (status: number) => new Anthropic.APIError(status, {} as any, "down", new Headers());

function clientOf(responses: any[]) {
  const calls: unknown[] = [];
  const stream = (params: unknown) => {
    calls.push(params);
    const r = responses.shift();
    const s = {
      on: () => s,
      finalMessage: async () => {
        if (r instanceof Error) throw r;
        return r;
      },
    };
    return s;
  };
  return { client: { messages: { stream }, beta: { messages: { stream } } }, calls };
}

test("a provider that fails twice then succeeds gives one result and two retry events", async () => {
  const { client, calls } = clientOf([new Anthropic.APIConnectionError({ message: "x" }), down(529), ok]);
  const waits: number[] = [];
  const events: unknown[] = [];
  const p = new ClaudeProvider("claude-opus-5-5", { client, sleep: async (ms) => void waits.push(ms) });
  const res = await p.step(req({ onRetry: (r) => events.push(r) }));
  expect(res.message.parts).toEqual([{ type: "text", text: "fine" }]);
  expect(calls).toHaveLength(3);
  expect(events).toMatchObject([
    { attempt: 1, of: 3, reason: "network error" },
    { attempt: 2, of: 3, reason: "server error (529)" },
  ]);
  expect(waits).toHaveLength(2);
});

test("a provider that always fails stops after three retries with a transient error", async () => {
  const { client, calls } = clientOf([down(503), down(503), down(503), down(503), ok]);
  const events: unknown[] = [];
  const p = new ClaudeProvider("claude-opus-5-5", { client, sleep: async () => {} });
  const err = await p.step(req({ onRetry: (r) => events.push(r) })).catch((e) => e);
  expect(err).toBeInstanceOf(ProviderError);
  expect(err.transient).toBe(true);
  expect(calls).toHaveLength(4);
  expect(events).toHaveLength(3);
});

test("the retry-after header sets the wait", async () => {
  const { client } = clientOf([rate(new Headers({ "retry-after": "20" })), ok]);
  const waits: number[] = [];
  const p = new ClaudeProvider("claude-opus-5-5", { client, sleep: async (ms) => void waits.push(ms) });
  await p.step(req());
  expect(waits).toEqual([20_000]);
});

test("an error that a retry cannot fix is not retried", async () => {
  const { client, calls } = clientOf([new Anthropic.BadRequestError(400, {} as any, "bad", new Headers()), ok]);
  const p = new ClaudeProvider("claude-opus-5-5", { client, sleep: async () => {} });
  const err = await p.step(req()).catch((e) => e);
  expect(err.transient).toBe(false);
  expect(calls).toHaveLength(1);
});

test("a stop signal ends the wait", async () => {
  const { client } = clientOf([down(500), ok]);
  const ctl = new AbortController();
  const p = new ClaudeProvider("claude-opus-5-5", { client, sleep: async () => { ctl.abort(); throw new Error("interrupted"); } });
  await expect(p.step(req({ signal: ctl.signal }))).rejects.toBeDefined();
});

test("the wait grows with each attempt and stays below the cap", () => {
  const first = waitMs(1, undefined, () => 0.5);
  const third = waitMs(3, undefined, () => 0.5);
  expect(first).toBe(750);
  expect(third).toBe(3000);
  expect(waitMs(1, rate(new Headers({ "retry-after": "9999" })))).toBe(120_000);
});

test("retryReason names the network errors and skips the others", () => {
  expect(retryReason(new Error("fetch failed"))).toBe("network error");
  expect(retryReason(Object.assign(new Error("x"), { code: "ECONNRESET" }))).toBe("network error");
  expect(retryReason(new Error("bad input"))).toBeUndefined();
  expect(retryReason(new Anthropic.APIUserAbortError())).toBeUndefined();
});

test("retryReason reads the HTTP status of a plain error", () => {
  expect(retryReason(Object.assign(new Error("slow"), { status: 429 }))).toBe("rate limit");
  expect(retryReason(Object.assign(new Error("down"), { status: 503 }))).toBe("server error (503)");
  expect(retryReason(Object.assign(new Error("bad"), { status: 400 }))).toBeUndefined();
});

test("withRetry returns the first success without a wait", async () => {
  let slept = 0;
  expect(await withRetry(async () => 7, { sleep: async () => void slept++ })).toBe(7);
  expect(slept).toBe(0);
});
