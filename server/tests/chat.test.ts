import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HOST_KEY, OPENAI_MODEL, SONNET, addAccount, balanceOf, call, chatBody, chunk, heldStream, heldTotal, holdsOf, makeEnv, makeOpenAiEnv, mockFetch, openAiBody, post, sseResponse,
} from "./helpers.ts";

afterEach(() => vi.unstubAllGlobals());

const COST = (1000 * 1 + 200 * 0.1 + 50 * 4) / 1e6;
const USAGE = { prompt_tokens: 1200, completion_tokens: 50, prompt_tokens_details: { cached_tokens: 200 } };

function streamText(usage: object | null = USAGE): string {
  return chunk({ choices: [{ delta: { content: "Hi" } }] }) + chunk({ choices: [{ delta: {}, finish_reason: "stop" }] }) + (usage ? chunk({ choices: [], usage }) : "") + chunk("[DONE]");
}

function reserveFor(body: Record<string, unknown>, max: number): number {
  return ((Math.ceil(new TextEncoder().encode(JSON.stringify(body)).length / 2) * 1 + max * 4) / 1e6);
}

describe("chat completions routing", () => {
  it("sends the request to the base URL of the model with the upstream name and the host key", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const calls = mockFetch(() => sseResponse(streamText()));
    const { res, settled } = await call(env, "/v1/chat/completions?x=1", post(acct.token, openAiBody(), { "x-api-key": "client", cookie: "a=b", "anthropic-beta": "x" }));
    expect(res.status).toBe(200);
    await res.text();
    await settled();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://llm.example.test/v1/chat/completions");
    expect(calls[0]!.headers.get("authorization")).toBe(`Bearer ${HOST_KEY}`);
    expect(calls[0]!.headers.get("x-api-key")).toBeNull();
    expect(calls[0]!.headers.get("cookie")).toBeNull();
    expect(calls[0]!.headers.get("anthropic-beta")).toBeNull();
    expect(JSON.parse(calls[0]!.body).model).toBe("vendor/real-model");
  });

  it("routes an anthropic model on /v1/messages and an openai model on /v1/chat/completions in one deployment", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const calls = mockFetch(() => sseResponse(streamText()));
    const a = await call(env, "/v1/chat/completions", post(acct.token, openAiBody()));
    await a.res.text();
    await a.settled();
    mockFetch((c) => {
      calls.push(c);
      return new Response(JSON.stringify({ model: SONNET, usage: { input_tokens: 1, output_tokens: 1 } }), { headers: { "content-type": "application/json" } });
    });
    const b = await call(env, "/v1/messages", post(acct.token, chatBody({ stream: false })));
    await b.res.text();
    await b.settled();
    expect(calls.map((c) => c.url)).toEqual(["https://llm.example.test/v1/chat/completions", "https://api.anthropic.com/v1/messages"]);
    expect(calls[1]!.headers.get("x-api-key")).toBe("sk-ant-test-key");
  });

  it("uses the base URL and key of a replaced default model without a code change", async () => {
    const entry = { ...JSON.parse(JSON.stringify({ x: 1 })), kind: "openai", base_url: "http://10.0.0.5:8000/v1", key_secret_name: "VLLM_KEY", upstream_model: "meta/llama", price: { input: 0, output: 0 }, max_output_tokens: 4000 };
    const env = makeEnv({ UPSTREAMS: { [SONNET]: entry }, VLLM_KEY: "vllm-secret" } as any);
    const acct = await addAccount(env, 5);
    const calls = mockFetch(() => sseResponse(streamText()));
    const { res, settled } = await call(env, "/v1/chat/completions", post(acct.token, openAiBody({ model: SONNET })));
    await res.text();
    await settled();
    expect(calls[0]!.url).toBe("http://10.0.0.5:8000/v1/chat/completions");
    expect(calls[0]!.headers.get("authorization")).toBe("Bearer vllm-secret");
    expect(balanceOf(env, acct.id)).toBe(5);
  });

  it("answers 503 and takes no credit when the secret of the model is not set", async () => {
    const env = makeEnv({ UPSTREAMS: JSON.stringify({ m: { kind: "openai", base_url: "https://h.test/v1", key_secret_name: "NOT_SET", upstream_model: "u", price: { input: 1, output: 1 }, max_output_tokens: 100 } }) });
    const acct = await addAccount(env, 5);
    const calls = mockFetch(() => new Response("{}"));
    const { res } = await call(env, "/v1/chat/completions", post(acct.token, openAiBody({ model: "m" })));
    expect(res.status).toBe(503);
    expect(calls).toHaveLength(0);
    expect(balanceOf(env, acct.id)).toBe(5);
  });
});

describe("wrong route for the kind", () => {
  it("answers 400 for an anthropic model on /v1/chat/completions", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const calls = mockFetch(() => new Response("{}"));
    const { res } = await call(env, "/v1/chat/completions", post(acct.token, openAiBody({ model: SONNET })));
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).error.message).toContain("/v1/messages");
    expect(calls).toHaveLength(0);
    expect(balanceOf(env, acct.id)).toBe(5);
    expect(holdsOf(env, acct.id)).toBe(0);
  });

  it("answers 400 for an openai model on /v1/messages and on count_tokens", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const calls = mockFetch(() => new Response("{}"));
    for (const path of ["/v1/messages", "/v1/messages/count_tokens"]) {
      const { res } = await call(env, path, post(acct.token, chatBody({ model: OPENAI_MODEL })));
      expect(res.status, path).toBe(400);
      expect(((await res.json()) as any).error.message).toContain("/v1/chat/completions");
    }
    expect(calls).toHaveLength(0);
    expect(balanceOf(env, acct.id)).toBe(5);
  });
});

describe("chat completions usage", () => {
  it("reads the usage chunk of a stream and refunds the difference", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const body = openAiBody();
    const held = heldStream();
    mockFetch(() => held.response);
    const { res, settled } = await call(env, "/v1/chat/completions", post(acct.token, body));
    expect(balanceOf(env, acct.id)).toBe(5);
    expect(heldTotal(env, acct.id)).toBeCloseTo(reserveFor(body, 1000), 9);
    expect(holdsOf(env, acct.id)).toBe(1);
    held.push(streamText());
    held.end();
    const text = await res.text();
    await settled();
    expect(text).toBe(streamText());
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - COST, 9);
    expect(holdsOf(env, acct.id)).toBe(0);
    const row = env.fake.row("SELECT * FROM usage");
    expect(row).toMatchObject({ account_id: acct.id, model: OPENAI_MODEL, status: "ok", input_tokens: 1000, output_tokens: 50, cache_read_tokens: 200 });
    expect(row.cost_usd).toBeCloseTo(COST, 9);
  });

  it("reads usage across chunk edges", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    for (const size of [1, 7, 100000]) {
      mockFetch(() => sseResponse(streamText(), size));
      const before = balanceOf(env, acct.id);
      const { res, settled } = await call(env, "/v1/chat/completions", post(acct.token, openAiBody()));
      await res.text();
      await settled();
      expect(before - balanceOf(env, acct.id)).toBeCloseTo(COST, 9);
    }
  });

  it("charges a stream from the usage chunk when the client stops at the end marker", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const held = heldStream();
    mockFetch(() => held.response);
    const { res, settled } = await call(env, "/v1/chat/completions", post(acct.token, openAiBody()));
    held.push(streamText());
    const reader = res.body!.getReader();
    await reader.read();
    await reader.cancel();
    await settled();
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - COST, 9);
    expect(env.fake.row("SELECT status FROM usage").status).toBe("ok");
  });

  it("charges a non-stream response from the usage object at the list price", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const json = JSON.stringify({ id: "c1", model: "vendor/real-model", choices: [{ message: { role: "assistant", content: "ok" } }], usage: USAGE });
    mockFetch(() => new Response(json, { headers: { "content-type": "application/json" } }));
    const { res, settled } = await call(env, "/v1/chat/completions", post(acct.token, openAiBody({ stream: false })));
    expect(await res.text()).toBe(json);
    await settled();
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - COST, 9);
    expect(holdsOf(env, acct.id)).toBe(0);
    expect(env.fake.row("SELECT model, status FROM usage")).toEqual({ model: OPENAI_MODEL, status: "ok" });
  });

  it("keeps the reservation when a stream ends with no usage chunk", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const body = openAiBody();
    mockFetch(() => sseResponse(streamText(null)));
    const { res, settled } = await call(env, "/v1/chat/completions", post(acct.token, body));
    await res.text();
    await settled();
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - reserveFor(body, 1000), 9);
    expect(holdsOf(env, acct.id)).toBe(0);
    expect(env.fake.row("SELECT status, cost_usd FROM usage").status).toBe("cut");
  });

  it("answers an upstream 429 with the own overloaded error and keeps retry-after", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    mockFetch(() => new Response('{"error":{"message":"slow down vendor/real-model"}}', { status: 429, headers: { "content-type": "application/json", "retry-after": "7" } }));
    const { res } = await call(env, "/v1/chat/completions", post(acct.token, openAiBody()));
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBe("7");
    expect(await res.json()).toEqual({ type: "error", error: { type: "overloaded", message: "The model service is busy. Try again in a short time." } });
  });

  it("refunds the full hold when the stream fails before the first chunk", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const broken = new ReadableStream<Uint8Array>({
      pull(c) {
        c.error(new TypeError("connection reset"));
      },
    });
    mockFetch(() => new Response(broken, { headers: { "content-type": "text/event-stream" } }));
    const { res, settled } = await call(env, "/v1/chat/completions", post(acct.token, openAiBody()));
    await res.text().catch(() => undefined);
    await settled();
    expect(balanceOf(env, acct.id)).toBe(5);
    expect(holdsOf(env, acct.id)).toBe(0);
    expect(env.fake.row("SELECT status, cost_usd FROM usage")).toEqual({ status: "error", cost_usd: 0 });
  });

  it("refunds the full hold when the stream closes with no chunk", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    mockFetch(() => sseResponse(""));
    const { res, settled } = await call(env, "/v1/chat/completions", post(acct.token, openAiBody()));
    await res.text();
    await settled();
    expect(balanceOf(env, acct.id)).toBe(5);
    expect(env.fake.row("SELECT status FROM usage").status).toBe("error");
  });

  it("keeps the reservation when the client aborts before the first chunk", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const body = openAiBody();
    const held = heldStream();
    mockFetch(() => held.response);
    const { res, settled } = await call(env, "/v1/chat/completions", post(acct.token, body));
    await res.body!.cancel();
    await settled();
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - reserveFor(body, 1000), 9);
    expect(env.fake.row("SELECT status FROM usage").status).toBe("cut");
  });

  it("keeps the reservation when a non-stream response has no usage", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const body = openAiBody({ stream: false });
    mockFetch(() => new Response(JSON.stringify({ choices: [] }), { headers: { "content-type": "application/json" } }));
    const { res, settled } = await call(env, "/v1/chat/completions", post(acct.token, body));
    await res.text();
    await settled();
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - reserveFor(body, 1000), 9);
    expect(env.fake.row("SELECT status FROM usage").status).toBe("cut");
  });

  it("keeps the reservation when the client aborts before the usage chunk", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const body = openAiBody();
    const held = heldStream();
    mockFetch(() => held.response);
    const { res, settled } = await call(env, "/v1/chat/completions", post(acct.token, body));
    held.push(chunk({ choices: [{ delta: { content: "Hi" } }] }));
    const reader = res.body!.getReader();
    await reader.read();
    await reader.cancel();
    await settled();
    expect(held.state.cancelled).toBe(true);
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - reserveFor(body, 1000), 9);
    expect(holdsOf(env, acct.id)).toBe(0);
  });

  it("refunds in full when the host returns an HTTP error and hides a host key problem", async () => {
    for (const [status, text, expected] of [[500, '{"error":{"message":"boom"}}', 500], [401, '{"error":{"message":"bad key sk-host"}}', 503], [402, "pay", 503], [429, '{"error":{"code":"insufficient_quota"}}', 503], [400, '{"error":{"code":"billing_hard_limit_reached"}}', 503], [429, '{"error":{"message":"slow down"}}', 503], [529, '{"error":{"message":"slow down"}}', 503]] as const) {
      const env = makeOpenAiEnv();
      const acct = await addAccount(env, 5);
      mockFetch(() => new Response(text, { status, headers: { "content-type": "application/json" } }));
      const { res } = await call(env, "/v1/chat/completions", post(acct.token, openAiBody()));
      expect(res.status).toBe(expected);
      if (expected === 503) expect(await res.text()).not.toMatch(/sk-host|slow down|insufficient_quota|billing_hard_limit/);
      expect(balanceOf(env, acct.id)).toBe(5);
      expect(holdsOf(env, acct.id)).toBe(0);
      expect(env.fake.row("SELECT status, cost_usd FROM usage")).toEqual({ status: "rejected", cost_usd: 0 });
    }
  });

  it("maps an OpenAI 429 with insufficient_quota to the operator error and a plain 429 to overloaded", async () => {
    for (const stream of [true, false]) {
      for (const [text, type] of [['{"error":{"code":"insufficient_quota"}}', "api_error"], ['{"error":{"message":"slow down"}}', "overloaded"]] as const) {
        const env = makeOpenAiEnv();
        const acct = await addAccount(env, 5);
        mockFetch(() => new Response(text, { status: 429, headers: { "content-type": "application/json" } }));
        const { res } = await call(env, "/v1/chat/completions", post(acct.token, openAiBody({ stream })));
        expect(res.status).toBe(503);
        expect((await res.json() as any).error.type).toBe(type);
      }
    }
  });

  it("refunds in full and answers 502 when the host cannot be reached", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    mockFetch(() => {
      throw new TypeError("network down");
    });
    const { res } = await call(env, "/v1/chat/completions", post(acct.token, openAiBody()));
    expect(res.status).toBe(502);
    expect(balanceOf(env, acct.id)).toBe(5);
  });
});

describe("chat completions body", () => {
  it("forces include_usage on a stream and keeps other stream options", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const calls = mockFetch(() => sseResponse(streamText()));
    for (const stream_options of [undefined, { include_usage: false }, { include_obfuscation: false }]) {
      const { res, settled } = await call(env, "/v1/chat/completions", post(acct.token, openAiBody({ stream_options })));
      await res.text();
      await settled();
    }
    expect(calls.map((c) => JSON.parse(c.body).stream_options)).toEqual([{ include_usage: true }, { include_usage: true }, { include_obfuscation: false, include_usage: true }]);
  });

  it("does not add stream_options to a request that does not stream", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const calls = mockFetch(() => new Response(JSON.stringify({ usage: USAGE }), { headers: { "content-type": "application/json" } }));
    const { res, settled } = await call(env, "/v1/chat/completions", post(acct.token, openAiBody({ stream: undefined })));
    await res.text();
    await settled();
    expect("stream_options" in JSON.parse(calls[0]!.body)).toBe(false);
  });

  it("accepts every allowed field and forwards it", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const calls = mockFetch(() => sseResponse(streamText()));
    const body = openAiBody({
      tools: [{ type: "function", function: { name: "read", parameters: { type: "object" } } }],
      tool_choice: "auto",
      max_completion_tokens: 500,
      temperature: 0.2,
      top_p: 0.9,
      stop: ["END"],
      response_format: { type: "json_object" },
      stream_options: { include_usage: true },
    });
    const { res, settled } = await call(env, "/v1/chat/completions", post(acct.token, body));
    expect(res.status).toBe(200);
    await res.text();
    await settled();
    expect(JSON.parse(calls[0]!.body)).toEqual({ ...body, model: "vendor/real-model" });
  });

  it("clamps the token limits to max_output_tokens and reserves for the larger one", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const body = openAiBody({ max_tokens: 500000, max_completion_tokens: 100 });
    const held = heldStream();
    const calls = mockFetch(() => held.response);
    const { res } = await call(env, "/v1/chat/completions", post(acct.token, body));
    expect(JSON.parse(calls[0]!.body)).toMatchObject({ max_tokens: 8000, max_completion_tokens: 100 });
    expect(heldTotal(env, acct.id)).toBeCloseTo(reserveFor(body, 8000), 9);
    await res.body!.cancel();
  });

  it("sets max_tokens to the limit of the model when the client sends none", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const body = openAiBody({ max_tokens: undefined });
    const held = heldStream();
    const calls = mockFetch(() => held.response);
    const { res } = await call(env, "/v1/chat/completions", post(acct.token, body));
    expect(JSON.parse(calls[0]!.body).max_tokens).toBe(8000);
    expect(heldTotal(env, acct.id)).toBeCloseTo(reserveFor(body, 8000), 9);
    await res.body!.cancel();
  });

  const reject: [string, Record<string, unknown>][] = [
    ["n", { n: 4 }],
    ["system", { system: "x" }],
    ["frequency_penalty", { frequency_penalty: 1 }],
    ["an unknown field", { frobnicate: true }],
    ["a model that is not in the table", { model: "nope" }],
    ["a model that is not a string", { model: 5 }],
    ["no messages", { messages: [] }],
    ["messages that are not a list", { messages: "hi" }],
    ["stream that is not a boolean", { stream: "yes" }],
    ["max_tokens that is not an integer", { max_tokens: 1.5 }],
    ["max_completion_tokens of zero", { max_completion_tokens: 0 }],
    ["a temperature that is not a number", { temperature: "hot" }],
    ["top_p that is not a number", { top_p: null }],
    ["a stop that is not text", { stop: [1] }],
    ["a response_format that is not an object", { response_format: "json" }],
    ["stream_options that is not an object", { stream_options: true }],
    ["tools that are not a list", { tools: {} }],
    ["a tool that is not an object", { tools: ["a"] }],
    ["a tool with another type", { tools: [{ type: "web_search_preview" }] }],
  ];
  for (const [name, change] of reject) {
    it(`rejects ${name} with 400 and takes no credit`, async () => {
      const env = makeOpenAiEnv();
      const acct = await addAccount(env, 5);
      const calls = mockFetch(() => new Response("{}"));
      const { res } = await call(env, "/v1/chat/completions", post(acct.token, { ...openAiBody(), ...change }));
      expect(res.status).toBe(400);
      expect(((await res.json()) as any).error.type).toBe("invalid_request_error");
      expect(calls).toHaveLength(0);
      expect(balanceOf(env, acct.id)).toBe(5);
      expect(holdsOf(env, acct.id)).toBe(0);
    });
  }

  it("rejects a body that is not JSON or not an object", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    mockFetch(() => new Response("{}"));
    for (const body of ["not json", "[]", "null", "5"]) expect((await call(env, "/v1/chat/completions", post(acct.token, body))).res.status).toBe(400);
  });
});

describe("chat completions credit and limits", () => {
  it("answers 401 without a token and 402 without credit", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 0);
    const calls = mockFetch(() => new Response("{}"));
    expect((await call(env, "/v1/chat/completions", post(undefined, openAiBody()))).res.status).toBe(401);
    const { res } = await call(env, "/v1/chat/completions", post(acct.token, openAiBody()));
    expect(res.status).toBe(402);
    expect(((await res.json()) as any).error.type).toBe("allowance_used_up");
    expect(calls).toHaveLength(0);
  });

  it("shares the limit of four running requests with /v1/messages", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 50);
    const streams = [heldStream(), heldStream(), heldStream(), heldStream()];
    let n = 0;
    mockFetch(() => streams[n++]!.response);
    const first = [];
    for (const path of ["/v1/chat/completions", "/v1/messages", "/v1/chat/completions", "/v1/messages"]) {
      first.push(await call(env, path, post(acct.token, path === "/v1/messages" ? chatBody() : openAiBody())));
    }
    expect(first.map((f) => f.res.status)).toEqual([200, 200, 200, 200]);
    expect(holdsOf(env, acct.id)).toBe(4);
    expect((await call(env, "/v1/chat/completions", post(acct.token, openAiBody()))).res.status).toBe(429);
    expect((await call(env, "/v1/messages", post(acct.token, chatBody()))).res.status).toBe(429);
    for (const f of first) await f.res.body!.cancel();
  });
});

describe("secrets", () => {
  it("never shows a key in any response", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 5);
    const bodies: Response[] = [];
    const seen: string[] = [];
    const run = async (path: string, init: RequestInit) => {
      const { res, settled } = await call(env, path, init);
      seen.push(`${res.status} ${[...res.headers].join(";")} ${await res.text()}`);
      await settled();
      bodies.push(res);
    };
    const leaky = (status: number) => () => new Response(JSON.stringify({ error: { message: `key ${HOST_KEY} sk-ant-test-key` } }), { status, headers: { "content-type": "application/json" } });
    for (const status of [401, 403, 402]) {
      mockFetch(leaky(status));
      await run("/v1/chat/completions", post(acct.token, openAiBody()));
      if (status === 402) continue;
      await run("/v1/messages", post(acct.token, chatBody()));
      await run("/v1/messages/count_tokens", post(acct.token, chatBody()));
    }
    mockFetch(() => sseResponse(streamText()));
    await run("/v1/chat/completions", post(acct.token, openAiBody()));
    await run("/v1/models", { headers: { authorization: `Bearer ${acct.token}` } });
    await run("/v1/account", { headers: { authorization: `Bearer ${acct.token}` } });
    await run("/v1/chat/completions", post(acct.token, "not json"));
    const all = seen.join("\n");
    expect(seen.length).toBeGreaterThan(10);
    expect(all).not.toContain(HOST_KEY);
    expect(all).not.toContain("sk-ant-test-key");
    expect(all).not.toContain("HOST_API_KEY");
    expect(all).not.toContain("llm.example.test");
  });
});
