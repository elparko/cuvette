import { afterEach, describe, expect, it, vi } from "vitest";
import { SONNET, addAccount, balanceOf, call, chatBody, makeEnv, mockFetch, post } from "./helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const answer = () => new Response(JSON.stringify({ input_tokens: 42 }), { headers: { "content-type": "application/json", "request-id": "req_1" } });
const countBody = (extra: Record<string, unknown> = {}) => ({ model: SONNET, messages: [{ role: "user", content: "hello" }], system: "Be brief.", tools: [{ name: "a", input_schema: { type: "object" } }], ...extra });

describe("POST /v1/messages/count_tokens", () => {
  it("forwards the body and returns the answer with no charge and no usage row", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const calls = mockFetch(answer);
    const body = countBody();
    const { res, settled } = await call(env, "/v1/messages/count_tokens?beta=true", post(acct.token, body, { "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01, evil-1", "x-api-key": "client" }));
    await settled();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ input_tokens: 42 });
    expect(res.headers.get("request-id")).toBe("req_1");
    expect(calls[0]!.url).toBe("https://api.anthropic.com/v1/messages/count_tokens?beta=true");
    expect(calls[0]!.headers.get("x-api-key")).toBe("sk-ant-test-key");
    expect(calls[0]!.headers.get("anthropic-beta")).toBe("server-side-fallback-2026-07-01");
    expect(calls[0]!.headers.get("authorization")).toBeNull();
    expect(JSON.parse(calls[0]!.body)).toEqual(body);
    expect(balanceOf(env, acct.id)).toBe(5);
    expect(env.fake.rows("SELECT * FROM usage")).toHaveLength(0);
    expect(env.fake.rows("SELECT * FROM holds")).toHaveLength(0);
  });

  it("works with a balance of zero", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 0);
    mockFetch(answer);
    expect((await call(env, "/v1/messages/count_tokens", post(acct.token, countBody()))).res.status).toBe(200);
  });

  it("replaces the model name with the upstream name", async () => {
    const env = makeEnv({ UPSTREAMS: JSON.stringify({ alias: { kind: "anthropic", base_url: "https://proxy.test/v1", key_secret_name: "ANTHROPIC_API_KEY", upstream_model: "claude-real-1", price: { input: 1, output: 1 }, max_output_tokens: 100 } }) });
    const acct = await addAccount(env, 0);
    const calls = mockFetch(answer);
    await call(env, "/v1/messages/count_tokens", post(acct.token, countBody({ model: "alias" })));
    expect(calls[0]!.url).toBe("https://proxy.test/v1/messages/count_tokens");
    expect(JSON.parse(calls[0]!.body).model).toBe("claude-real-1");
  });

  it("answers 401 without a token", async () => {
    const calls = mockFetch(answer);
    expect((await call(makeEnv(), "/v1/messages/count_tokens", post(undefined, countBody()))).res.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  const reject: [string, Record<string, unknown>][] = [
    ["an unknown field", { frobnicate: 1 }],
    ["top_p", { top_p: 0.5 }],
    ["a model that is not in the table", { model: "nope" }],
    ["no messages", { messages: [] }],
    ["a server tool", { tools: [{ type: "bash_20250124", name: "bash" }] }],
    ["max_tokens that is not an integer", { max_tokens: 2.5 }],
    ["system that is not text or a list", { system: 5 }],
  ];
  for (const [name, change] of reject) {
    it(`rejects ${name} with 400`, async () => {
      const env = makeEnv();
      const acct = await addAccount(env, 5);
      const calls = mockFetch(answer);
      const { res } = await call(env, "/v1/messages/count_tokens", post(acct.token, { ...countBody(), ...change }));
      expect(res.status).toBe(400);
      expect(calls).toHaveLength(0);
    });
  }

  it("hides an upstream key problem and passes other errors through", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    mockFetch(() => new Response('{"error":{"message":"invalid x-api-key"}}', { status: 401 }));
    const hidden = await call(env, "/v1/messages/count_tokens", post(acct.token, countBody()));
    expect(hidden.res.status).toBe(503);
    expect(await hidden.res.text()).not.toContain("x-api-key");
    mockFetch(() => new Response('{"error":{"message":"bad field"}}', { status: 400 }));
    const passed = await call(env, "/v1/messages/count_tokens", post(acct.token, countBody()));
    expect(passed.res.status).toBe(400);
    expect(await passed.res.text()).toContain("bad field");
  });

  it("answers 502 when the upstream cannot be reached", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    mockFetch(() => {
      throw new TypeError("down");
    });
    expect((await call(env, "/v1/messages/count_tokens", post(acct.token, countBody()))).res.status).toBe(502);
  });
});

describe("count_tokens limit", () => {
  it("allows 60 calls a minute for each account and answers 429 for the 61st", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T12:00:10Z"));
    const env = makeEnv();
    const a = await addAccount(env, 0);
    const b = await addAccount(env, 0);
    const calls = mockFetch(answer);
    for (let i = 0; i < 60; i++) expect((await call(env, "/v1/messages/count_tokens", post(a.token, countBody()))).res.status).toBe(200);
    const over = await call(env, "/v1/messages/count_tokens", post(a.token, countBody()));
    expect(over.res.status).toBe(429);
    expect(over.res.headers.get("retry-after")).toBe("60");
    expect(((await over.res.json()) as any).error.type).toBe("too_many_requests");
    expect(calls).toHaveLength(60);
    expect((await call(env, "/v1/messages/count_tokens", post(b.token, countBody()))).res.status).toBe(200);
    vi.setSystemTime(new Date("2026-10-01T12:01:00Z"));
    expect((await call(env, "/v1/messages/count_tokens", post(a.token, countBody()))).res.status).toBe(200);
    expect(env.fake.rows("SELECT * FROM count_tokens_calls WHERE account_id = ?", a.id)).toHaveLength(1);
  });

  it("does not use the limit for /v1/messages", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    mockFetch(() => new Response(JSON.stringify({ usage: { input_tokens: 1, output_tokens: 1 } }), { headers: { "content-type": "application/json" } }));
    const { res } = await call(env, "/v1/messages", post(acct.token, chatBody({ stream: false })));
    expect(res.status).toBe(200);
    expect(env.fake.rows("SELECT * FROM count_tokens_calls")).toHaveLength(0);
  });
});
