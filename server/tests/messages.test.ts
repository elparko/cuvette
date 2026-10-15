import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SONNET, addAccount, addHold, balanceOf, call, chatBody, heldStream, heldTotal, holdsOf, makeEnv, messageDelta, messageStart, messageStop, mockFetch, post, reserveFor, sse, sseResponse, textDelta,
} from "./helpers.ts";

afterEach(() => vi.unstubAllGlobals());

const FULL_USAGE = { input_tokens: 100, cache_read_input_tokens: 1000, cache_creation_input_tokens: 700, cache_creation: { ephemeral_5m_input_tokens: 400, ephemeral_1h_input_tokens: 300 }, output_tokens: 1 };
const SONNET_COST = (100 * 2 + 200 * 10 + 1000 * 0.2 + 400 * 2.5 + 300 * 4) / 1e6;

function streamText(model = SONNET): string {
  return sse([messageStart(model, FULL_USAGE), textDelta("Hi"), textDelta(" there"), messageDelta({ output_tokens: 200 }), messageStop()]);
}

describe("credit check", () => {
  it("answers 402 in the Anthropic error shape when the balance is zero", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 0);
    const calls = mockFetch(() => new Response("{}"));
    const { res } = await call(env, "/v1/messages", post(acct.token, chatBody()));
    expect(res.status).toBe(402);
    const body = (await res.json()) as any;
    expect(body.type).toBe("error");
    expect(body.error.type).toBe("allowance_used_up");
    expect(typeof body.error.message).toBe("string");
    expect(calls).toHaveLength(0);
    expect(holdsOf(env, acct.id)).toBe(0);
  });

  it("answers 402 when the balance is below the reservation", async () => {
    const env = makeEnv();
    const body = chatBody();
    const acct = await addAccount(env, reserveFor(body, 2, 10) - 0.0001);
    const calls = mockFetch(() => new Response("{}"));
    expect((await call(env, "/v1/messages", post(acct.token, body))).res.status).toBe(402);
    expect(calls).toHaveLength(0);
  });

  it("answers 401 without a token", async () => {
    const env = makeEnv();
    expect((await call(env, "/v1/messages", post(undefined, chatBody()))).res.status).toBe(401);
  });
});

describe("reservation and refund", () => {
  it("holds the reservation while the stream runs and debits only the real cost after", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const body = chatBody();
    const held = heldStream();
    mockFetch(() => held.response);
    const { res, settled } = await call(env, "/v1/messages", post(acct.token, body));
    expect(res.status).toBe(200);
    const reserve = reserveFor(body, 2, 10);
    expect(balanceOf(env, acct.id)).toBe(5);
    expect(heldTotal(env, acct.id)).toBeCloseTo(reserve, 9);
    expect(holdsOf(env, acct.id)).toBe(1);
    const reader = res.body!.getReader();
    const pending = (async () => {
      while (!(await reader.read()).done);
    })();
    held.push(streamText());
    held.end();
    await pending;
    await settled();
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - SONNET_COST, 9);
    expect(holdsOf(env, acct.id)).toBe(0);
    const row = env.fake.row("SELECT * FROM usage");
    expect(row).toMatchObject({ account_id: acct.id, model: SONNET, status: "ok", input_tokens: 100, output_tokens: 200, cache_read_tokens: 1000, cache_write_5m_tokens: 400, cache_write_1h_tokens: 300 });
    expect(row.cost_usd).toBeCloseTo(SONNET_COST, 9);
    expect(env.fake.rows("SELECT * FROM usage")).toHaveLength(1);
  });

  it("charges a non-stream response from its usage object at the list price", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const json = JSON.stringify({ id: "msg_1", model: SONNET, content: [{ type: "text", text: "ok" }], usage: { input_tokens: 100, output_tokens: 200, cache_read_input_tokens: 1000, cache_creation: { ephemeral_5m_input_tokens: 400, ephemeral_1h_input_tokens: 300 } } });
    mockFetch(() => new Response(json, { headers: { "content-type": "application/json" } }));
    const { res, settled } = await call(env, "/v1/messages", post(acct.token, chatBody({ stream: false })));
    expect(await res.text()).toBe(json);
    await settled();
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - SONNET_COST, 9);
    expect(holdsOf(env, acct.id)).toBe(0);
  });

  it("prices by the model that answered, not the model that was asked", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const body = chatBody({ model: "claude-opus-5-5" });
    mockFetch(() => sseResponse(sse([messageStart("claude-haiku-5-5", { input_tokens: 1000 }), messageDelta({ output_tokens: 2000 })])));
    const { res, settled } = await call(env, "/v1/messages", post(acct.token, body));
    await res.text();
    await settled();
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - ((1000 * 0.1 + 2000 * 0.5) / 1e6), 9);
    expect(env.fake.row("SELECT model FROM usage").model).toBe("claude-haiku-5-5");
  });

  it("charges the most expensive price when the answering model is not in the table", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    mockFetch(() => sseResponse(sse([messageStart("claude-new-9", { input_tokens: 1000 }), messageDelta({ output_tokens: 1000 })])));
    const { res, settled } = await call(env, "/v1/messages", post(acct.token, chatBody()));
    await res.text();
    await settled();
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - ((1000 * 10 + 1000 * 50) / 1e6), 9);
  });

  it("replaces an upstream 429 or 529 with the own overloaded error, keeps retry-after, and refunds the hold", async () => {
    const OWN = { type: "error", error: { type: "overloaded", message: "The model service is busy. Try again in a short time." } };
    for (const status of [429, 529]) {
      const env = makeEnv();
      const acct = await addAccount(env, 5);
      const err = JSON.stringify({ type: "error", error: { type: "rate_limit_error", message: "org sk-ant-org limit" } });
      mockFetch(() => new Response(err, { status, headers: { "content-type": "application/json", "retry-after": "3", "request-id": "req_up" } }));
      const { res } = await call(env, "/v1/messages", post(acct.token, chatBody()));
      expect(res.status).toBe(503);
      expect(res.headers.get("retry-after")).toBe("3");
      expect(res.headers.get("request-id")).toBeNull();
      expect(await res.json()).toEqual(OWN);
      expect(balanceOf(env, acct.id)).toBe(5);
      expect(holdsOf(env, acct.id)).toBe(0);
      expect(env.fake.row("SELECT cost_usd, status FROM usage")).toEqual({ cost_usd: 0, status: "rejected" });
    }
  });

  it("sends no retry-after when the upstream sends none", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    mockFetch(() => new Response("upstream text", { status: 529 }));
    const { res } = await call(env, "/v1/messages", post(acct.token, chatBody()));
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBeNull();
    expect(await res.text()).not.toContain("upstream text");
  });

  it("refunds the hold in full when the upstream returns another HTTP error", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const err = JSON.stringify({ type: "error", error: { type: "api_error", message: "boom" } });
    mockFetch(() => new Response(err, { status: 500, headers: { "content-type": "application/json" } }));
    const { res } = await call(env, "/v1/messages", post(acct.token, chatBody()));
    expect(res.status).toBe(500);
    expect(await res.text()).toBe(err);
    expect(balanceOf(env, acct.id)).toBe(5);
    expect(holdsOf(env, acct.id)).toBe(0);
    expect(env.fake.row("SELECT cost_usd, status FROM usage")).toEqual({ cost_usd: 0, status: "rejected" });
  });

  it("hides an upstream key problem or upstream credit problem from the user", async () => {
    for (const [status, message] of [[401, "invalid x-api-key"], [403, "forbidden"], [400, "Your credit balance is too low"], [400, "You have reached your specified API usage limits. You will regain access on 2026-11-01."]] as const) {
      const env = makeEnv();
      const acct = await addAccount(env, 5);
      mockFetch(() => new Response(JSON.stringify({ type: "error", error: { type: "x", message } }), { status }));
      const { res } = await call(env, "/v1/messages", post(acct.token, chatBody()));
      expect(res.status).toBe(503);
      expect(JSON.stringify(await res.json())).not.toContain(message);
      expect(balanceOf(env, acct.id)).toBe(5);
    }
  });

  it("passes other 400 errors from the upstream through", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    mockFetch(() => new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "bad field" } }), { status: 400 }));
    const { res } = await call(env, "/v1/messages", post(acct.token, chatBody()));
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).error.message).toBe("bad field");
    expect(balanceOf(env, acct.id)).toBe(5);
  });

  it("refunds in full and answers 502 when the upstream cannot be reached", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    mockFetch(() => {
      throw new TypeError("network down");
    });
    const { res } = await call(env, "/v1/messages", post(acct.token, chatBody()));
    expect(res.status).toBe(502);
    expect(balanceOf(env, acct.id)).toBe(5);
    expect(holdsOf(env, acct.id)).toBe(0);
  });

  it("clamps max_tokens to 64000 before it forwards and reserves", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const body = chatBody({ max_tokens: 500000 });
    const held = heldStream();
    const calls = mockFetch(() => held.response);
    const { res } = await call(env, "/v1/messages", post(acct.token, body));
    expect(JSON.parse(calls[0]!.body).max_tokens).toBe(64000);
    expect(heldTotal(env, acct.id)).toBeCloseTo(reserveFor(body, 2, 10), 9);
    await res.body!.cancel();
  });
});

describe("live hold limit", () => {
  it("answers 429 for a fifth request and frees a slot when one ends", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 50);
    const streams = [heldStream(), heldStream(), heldStream(), heldStream()];
    let n = 0;
    const calls = mockFetch(() => streams[n++]!.response);
    const first: { res: Response; settled: () => Promise<void> }[] = [];
    for (let i = 0; i < 4; i++) first.push(await call(env, "/v1/messages", post(acct.token, chatBody())));
    expect(first.map((f) => f.res.status)).toEqual([200, 200, 200, 200]);
    expect(holdsOf(env, acct.id)).toBe(4);
    const balance = balanceOf(env, acct.id);
    const fifth = await call(env, "/v1/messages", post(acct.token, chatBody()));
    expect(fifth.res.status).toBe(429);
    expect(((await fifth.res.json()) as any).error.type).toBe("too_many_requests");
    expect(balanceOf(env, acct.id)).toBe(balance);
    expect(calls).toHaveLength(4);
    await first[0]!.res.body!.cancel();
    await first[0]!.settled();
    expect(holdsOf(env, acct.id)).toBe(3);
    streams[1]!.push(streamText());
    streams[1]!.end();
    await first[1]!.res.text();
    mockFetch(() => sseResponse(streamText()));
    const again = await call(env, "/v1/messages", post(acct.token, chatBody()));
    expect(again.res.status).toBe(200);
    await again.res.text();
    for (const f of first.slice(2)) await f.res.body!.cancel();
  });
});

describe("stream pass-through", () => {
  it("sends the upstream bytes unchanged and reads usage across chunk edges", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const text = streamText();
    for (const size of [1, 3, 7, 64, 100000]) {
      mockFetch(() => sseResponse(text, size));
      const before = balanceOf(env, acct.id);
      const { res, settled } = await call(env, "/v1/messages", post(acct.token, chatBody()));
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("text/event-stream");
      expect(await res.text()).toBe(text);
      await settled();
      expect(before - balanceOf(env, acct.id)).toBeCloseTo(SONNET_COST, 9);
    }
  });

  it("reads CRLF line ends", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    mockFetch(() => sseResponse(streamText().replace(/\n/g, "\r\n"), 11));
    const { res, settled } = await call(env, "/v1/messages", post(acct.token, chatBody()));
    await res.text();
    await settled();
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - SONNET_COST, 9);
  });

  it("forwards the key, version, filtered beta header and the beta query", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const calls = mockFetch(() => sseResponse(streamText()));
    const { res, settled } = await call(
      env,
      "/v1/messages?beta=true&x=1",
      post(acct.token, chatBody(), { "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01, evil-beta-1", "x-api-key": "client-key", cookie: "a=b" }),
    );
    await res.text();
    await settled();
    expect(calls[0]!.url).toBe("https://api.anthropic.com/v1/messages?beta=true");
    expect(calls[0]!.headers.get("x-api-key")).toBe("sk-ant-test-key");
    expect(calls[0]!.headers.get("anthropic-version")).toBe("2023-06-01");
    expect(calls[0]!.headers.get("anthropic-beta")).toBe("server-side-fallback-2026-07-01");
    expect(calls[0]!.headers.get("authorization")).toBeNull();
    expect(calls[0]!.headers.get("cookie")).toBeNull();
  });
});

describe("beta filter", () => {
  it("drops every beta value that is not on the list", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const calls = mockFetch(() => sseResponse(streamText()));
    const run = async (beta: string | undefined, path = "/v1/messages") => {
      const { res, settled } = await call(env, path, post(acct.token, chatBody(), beta === undefined ? {} : { "anthropic-beta": beta }));
      await res.text();
      await settled();
    };
    await run("code-execution-2025-05-22,mcp-client-2025-04-04");
    await run(undefined);
    await run("server-side-fallback-2026-07-01");
    expect(calls.map((c) => c.headers.get("anthropic-beta"))).toEqual([null, null, "server-side-fallback-2026-07-01"]);
    expect(calls.map((c) => c.url)).toEqual(Array(3).fill("https://api.anthropic.com/v1/messages"));
    expect(calls[1]!.headers.get("anthropic-version")).toBe("2023-06-01");
  });
});

describe("client abort", () => {
  it("keeps the input charge and the full output reservation", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const body = chatBody();
    const held = heldStream();
    mockFetch(() => held.response);
    const { res, settled } = await call(env, "/v1/messages", post(acct.token, body));
    held.push(sse([messageStart(SONNET, { input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: 1 }), textDelta("Hi")]));
    const reader = res.body!.getReader();
    await reader.read();
    await reader.cancel();
    await settled();
    expect(held.state.cancelled).toBe(true);
    const expected = ((100 * 2 + 1000 * 0.2) / 1e6) + (1000 * 10) / 1e6;
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - expected, 9);
    expect(holdsOf(env, acct.id)).toBe(0);
    expect(env.fake.row("SELECT status, input_tokens FROM usage")).toEqual({ status: "cut", input_tokens: 100 });
  });

  it("keeps the whole reservation when the client aborts before the first event", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const body = chatBody();
    const held = heldStream();
    mockFetch(() => held.response);
    const { res, settled } = await call(env, "/v1/messages", post(acct.token, body));
    await res.body!.cancel();
    await settled();
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - reserveFor(body, 2, 10), 9);
    expect(holdsOf(env, acct.id)).toBe(0);
  });

  it("refunds the full hold when the stream fails before message_start", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const broken = new ReadableStream<Uint8Array>({
      pull(c) {
        c.error(new TypeError("connection reset"));
      },
    });
    mockFetch(() => new Response(broken, { headers: { "content-type": "text/event-stream" } }));
    const { res, settled } = await call(env, "/v1/messages", post(acct.token, chatBody()));
    await res.text().catch(() => undefined);
    await settled();
    expect(balanceOf(env, acct.id)).toBe(5);
    expect(holdsOf(env, acct.id)).toBe(0);
    expect(env.fake.row("SELECT status, cost_usd FROM usage")).toEqual({ status: "error", cost_usd: 0 });
  });

  it("refunds the full hold when the stream ends with an error event and no message_start", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    mockFetch(() => sseResponse(sse([["error", { type: "error", error: { type: "overloaded_error", message: "busy" } }]])));
    const { res, settled } = await call(env, "/v1/messages", post(acct.token, chatBody()));
    await res.text();
    await settled();
    expect(balanceOf(env, acct.id)).toBe(5);
    expect(env.fake.row("SELECT status, cost_usd FROM usage")).toEqual({ status: "error", cost_usd: 0 });
  });

  it("refunds the full hold when the stream closes with no event at all", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    mockFetch(() => sseResponse(""));
    const { res, settled } = await call(env, "/v1/messages", post(acct.token, chatBody()));
    await res.text();
    await settled();
    expect(balanceOf(env, acct.id)).toBe(5);
    expect(env.fake.row("SELECT status FROM usage").status).toBe("error");
  });

  it("treats an upstream failure in the middle of a stream like an abort", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const bytes = new TextEncoder().encode(sse([messageStart(SONNET, { input_tokens: 100 })]));
    const broken = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes);
      },
      pull(c) {
        c.error(new TypeError("connection reset"));
      },
    });
    mockFetch(() => new Response(broken, { headers: { "content-type": "text/event-stream" } }));
    const { res, settled } = await call(env, "/v1/messages", post(acct.token, chatBody()));
    await res.text().catch(() => undefined);
    await settled();
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - ((100 * 2) / 1e6) - ((1000 * 10) / 1e6), 9);
    expect(holdsOf(env, acct.id)).toBe(0);
  });
});

describe("holds table", () => {
  const age = (env: ReturnType<typeof makeEnv>, minutes: number) => env.fake.sqlite.prepare("UPDATE holds SET started_at = started_at - ?").run(minutes * 60_000);

  it("writes one row at the start of a request and deletes it at settle", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const held = heldStream();
    mockFetch(() => held.response);
    const { res, settled } = await call(env, "/v1/messages", post(acct.token, chatBody()));
    const rows = env.fake.rows<{ request_id: string; account_id: string; started_at: number }>("SELECT * FROM holds");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.account_id).toBe(acct.id);
    expect(Math.abs(rows[0]!.started_at - Date.now())).toBeLessThan(5000);
    held.push(streamText());
    held.end();
    await res.text();
    await settled();
    expect(env.fake.rows("SELECT * FROM holds")).toHaveLength(0);
  });

  it("ignores rows that are 15 minutes old or older when it counts toward the limit of four", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 50);
    const streams = [heldStream(), heldStream(), heldStream(), heldStream(), heldStream()];
    let n = 0;
    mockFetch(() => streams[n++]!.response);
    const first = [];
    for (let i = 0; i < 4; i++) first.push(await call(env, "/v1/messages", post(acct.token, chatBody())));
    expect((await call(env, "/v1/messages", post(acct.token, chatBody()))).res.status).toBe(429);
    age(env, 14);
    expect((await call(env, "/v1/messages", post(acct.token, chatBody()))).res.status).toBe(429);
    age(env, 2);
    const fifth = await call(env, "/v1/messages", post(acct.token, chatBody()));
    expect(fifth.res.status).toBe(200);
    expect(holdsOf(env, acct.id)).toBe(1);
    for (const f of [...first, fifth]) await f.res.body!.cancel();
  });

  it("does not count the rows of another account", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 50);
    const b = await addAccount(env, 50);
    const streams = [heldStream(), heldStream(), heldStream(), heldStream(), heldStream()];
    let n = 0;
    mockFetch(() => streams[n++]!.response);
    const held = [];
    for (let i = 0; i < 4; i++) held.push(await call(env, "/v1/messages", post(a.token, chatBody())));
    const other = await call(env, "/v1/messages", post(b.token, chatBody()));
    expect(other.res.status).toBe(200);
    for (const f of [...held, other]) await f.res.body!.cancel();
  });

  it("answers 429 and not 402 when the account is both busy and short of allowance", async () => {
    const env = makeEnv();
    const body = chatBody();
    const acct = await addAccount(env, reserveFor(body, 2, 10) * 4.5);
    const streams = [heldStream(), heldStream(), heldStream(), heldStream()];
    let n = 0;
    mockFetch(() => streams[n++]!.response);
    const first = [];
    for (let i = 0; i < 4; i++) first.push(await call(env, "/v1/messages", post(acct.token, body)));
    expect((await call(env, "/v1/messages", post(acct.token, body))).res.status).toBe(429);
    for (const f of first) await f.res.body!.cancel();
  });

  it("keeps the reservation and writes status expired when the row is older than 15 minutes at settle", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const body = chatBody();
    const held = heldStream();
    mockFetch(() => held.response);
    const { res, settled } = await call(env, "/v1/messages", post(acct.token, body));
    age(env, 16);
    held.push(streamText());
    held.end();
    await res.text();
    await settled();
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - reserveFor(body, 2, 10), 9);
    expect(env.fake.row("SELECT status, cost_usd FROM usage")).toMatchObject({ status: "expired" });
    expect(env.fake.row("SELECT cost_usd FROM usage").cost_usd).toBeCloseTo(reserveFor(body, 2, 10), 9);
    expect(env.fake.rows("SELECT * FROM holds")).toHaveLength(0);
  });

  it("charges nothing at settle when the hold is already gone", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const body = chatBody();
    const held = heldStream();
    mockFetch(() => held.response);
    const { res, settled } = await call(env, "/v1/messages", post(acct.token, body));
    env.fake.sqlite.prepare("DELETE FROM holds").run();
    held.push(streamText());
    held.end();
    await res.text();
    await settled();
    expect(balanceOf(env, acct.id)).toBe(5);
    expect(env.fake.rows("SELECT * FROM usage")).toHaveLength(0);
  });

  it("keeps the reservation of an expired row when the upstream fails", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    const body = chatBody();
    mockFetch(() => {
      age(env, 16);
      return new Response("{}", { status: 529 });
    });
    await call(env, "/v1/messages", post(acct.token, body));
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - reserveFor(body, 2, 10), 9);
  });

  it("debits an expired hold in full and removes it when a new request starts", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    addHold(env, acct.id, 0.5, Date.now() - 20 * 60_000, "old");
    mockFetch(() => sseResponse(streamText()));
    const { res, settled } = await call(env, "/v1/messages", post(acct.token, chatBody()));
    await res.text();
    await settled();
    expect(env.fake.rows("SELECT * FROM holds")).toHaveLength(0);
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - 0.5 - SONNET_COST, 9);
    expect(env.fake.row("SELECT status, cost_usd, model FROM usage WHERE request_id = 'old'")).toEqual({ status: "expired", cost_usd: 0.5, model: SONNET });
  });

  it("stays usable after a Worker stop left four old holds", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 5);
    for (let i = 0; i < 4; i++) addHold(env, acct.id, 0.1, Date.now() - 20 * 60_000, `stale${i}`);
    mockFetch(() => sseResponse(streamText()));
    const { res, settled } = await call(env, "/v1/messages", post(acct.token, chatBody()));
    expect(res.status).toBe(200);
    await res.text();
    await settled();
    expect(balanceOf(env, acct.id)).toBeCloseTo(5 - 0.4 - SONNET_COST, 9);
  });
});
