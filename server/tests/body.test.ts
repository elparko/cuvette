import { afterEach, describe, expect, it, vi } from "vitest";
import { SONNET, addAccount, balanceOf, call, chatBody, inFlightOf, makeEnv, messageDelta, messageStart, mockFetch, post, sse, sseResponse } from "./helpers.ts";

afterEach(() => vi.unstubAllGlobals());

const reject: [string, Record<string, unknown>][] = [
  ["mcp_servers", { mcp_servers: [{ type: "url", url: "https://x.test", name: "x" }] }],
  ["container", { container: "abc" }],
  ["service_tier", { service_tier: "priority" }],
  ["speed", { speed: "fast" }],
  ["betas in the body", { betas: ["x"] }],
  ["an unknown field", { frobnicate: true }],
  ["top_p", { top_p: 0.5 }],
  ["web_search tool", { tools: [{ type: "web_search_20250305", name: "web_search" }] }],
  ["web_fetch tool", { tools: [{ type: "web_fetch_20250910", name: "web_fetch" }] }],
  ["code_execution tool", { tools: [{ type: "code_execution_20250522", name: "code_execution" }] }],
  ["computer tool", { tools: [{ type: "computer_20250124", name: "computer", display_width_px: 1, display_height_px: 1 }] }],
  ["bash tool", { tools: [{ type: "bash_20250124", name: "bash" }] }],
  ["text_editor tool", { tools: [{ type: "text_editor_20250124", name: "str_replace_editor" }] }],
  ["a server tool after a custom tool", { tools: [{ name: "a", input_schema: {} }, { type: "bash_20250124", name: "bash" }] }],
  ["a tool that is not an object", { tools: ["bash"] }],
  ["tools that are not a list", { tools: { name: "a" } }],
  ["a model that is not in the price table", { model: "claude-3-opus" }],
  ["a model that is not a string", { model: 5 }],
  ["no messages", { messages: [] }],
  ["no max_tokens", { max_tokens: undefined }],
  ["max_tokens that is not an integer", { max_tokens: 10.5 }],
  ["stream that is not a boolean", { stream: "yes" }],
  ["fallbacks other than default", { fallbacks: "claude-fable-5-1" }],
];

describe("body allowlist", () => {
  for (const [name, change] of reject) {
    it(`rejects ${name} with 400 and takes no credit`, async () => {
      const env = makeEnv();
      const acct = await addAccount(env, 5);
      const calls = mockFetch(() => new Response("{}"));
      const { res } = await call(env, "/v1/messages", post(acct.token, { ...chatBody(), ...change }));
      expect(res.status).toBe(400);
      expect(((await res.json()) as any).error.type).toBe("invalid_request_error");
      expect(calls).toHaveLength(0);
      expect(balanceOf(env, acct.id)).toBe(5);
      expect(inFlightOf(env, acct.id)).toBe(0);
    });
  }

  it("rejects a body that is not JSON or not an object", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    mockFetch(() => new Response("{}"));
    for (const body of ["not json", "[]", "null", "5"]) expect((await call(env, "/v1/messages", post(acct.token, body))).res.status).toBe(400);
  });

  it("accepts every field that the app sends", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const calls = mockFetch(() => sseResponse(sse([messageStart(SONNET, { input_tokens: 1 }), messageDelta({ output_tokens: 1 })])));
    const body = chatBody({
      system: [{ type: "text", text: "You help.", cache_control: { type: "ephemeral" } }],
      thinking: { type: "adaptive", display: "summarized" },
      output_config: { effort: "high" },
      fallbacks: "default",
      tool_choice: { type: "auto" },
      metadata: { user_id: "u" },
      tools: [{ name: "read", description: "Read.", input_schema: { type: "object", properties: {} }, cache_control: { type: "ephemeral" } }, { type: "custom", name: "write", input_schema: { type: "object" } }],
    });
    const { res, settled } = await call(env, "/v1/messages?beta=true", post(acct.token, body, { "anthropic-beta": "server-side-fallback-2026-07-01" }));
    expect(res.status).toBe(200);
    await res.text();
    await settled();
    expect(JSON.parse(calls[0]!.body)).toEqual(body);
  });
});
