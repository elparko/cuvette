import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPlans } from "../src/plans.ts";
import { NO_TOKENS, expireHolds, reserve, settle } from "../src/money.ts";
import { DAY, SONNET, TEST_PLANS, addAccount, addHold, addTopup, addUsage, balanceOf, call, chatBody, heldStream, heldTotal, holdsOf, makeEnv, mockFetch, post, reserveFor, messageDelta, messageStart, sse, topupsOf, type TestEnv } from "./helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const NOW = new Date("2026-10-01T12:00:00Z");
const HOUR = 3_600_000;
const json = (res: Response) => res.json() as Promise<any>;
const acc = (env: TestEnv, id: string) => env.fake.row<any>("SELECT * FROM accounts WHERE id = ?", id);
const ISO = (ms: number) => new Date(ms).toISOString();

function freeze(): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
}

function jsonUpstream(input: number, output: number, model = SONNET) {
  return mockFetch(() => new Response(JSON.stringify({ model, content: [], usage: { input_tokens: input, output_tokens: output } }), { headers: { "content-type": "application/json" } }));
}

async function ask(env: TestEnv, token: string, over: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  const r = await call(env, "/v1/messages", post(token, chatBody({ stream: false, ...over }), headers));
  await r.res.text();
  await r.settled();
  return r.res;
}

const COST = (1000 * 2 + 1000 * 10) / 1e6;

describe("reservation statement", () => {
  const plans = loadPlans(JSON.stringify(TEST_PLANS));
  const account = (env: TestEnv, id: string) => acc(env, id);
  const hold = (amount: number) => ({ requestId: crypto.randomUUID(), amount, model: SONNET, sessionId: null });

  it("inserts a hold when the allowance covers the amount and not when it does not", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 1);
    expect(await reserve(env, plans, account(env, a.id), hold(1))).toBe(true);
    expect(holdsOf(env, a.id)).toBe(1);
    expect(await reserve(env, plans, account(env, a.id), hold(0.0001))).toBe(false);
    expect(holdsOf(env, a.id)).toBe(1);
  });

  it("does not change the allowance", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 1);
    await reserve(env, plans, account(env, a.id), hold(0.5));
    expect(balanceOf(env, a.id)).toBe(1);
  });

  it("counts the live holds of the account and no hold of another account", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 1);
    const b = await addAccount(env, 1);
    addHold(env, a.id, 0.7);
    expect(await reserve(env, plans, account(env, a.id), hold(0.4))).toBe(false);
    expect(await reserve(env, plans, account(env, a.id), hold(0.3))).toBe(true);
    expect(await reserve(env, plans, account(env, b.id), hold(1))).toBe(true);
  });

  it("does not count a hold that is 15 minutes old", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 1);
    addHold(env, a.id, 0.9, Date.now() - 15 * 60_000 - 1);
    expect(await reserve(env, plans, account(env, a.id), hold(1))).toBe(true);
  });

  it("refuses at the fifth live hold even when the allowance is large", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 100);
    for (let i = 0; i < 4; i++) expect(await reserve(env, plans, account(env, a.id), hold(0.01))).toBe(true);
    expect(await reserve(env, plans, account(env, a.id), hold(0.01))).toBe(false);
  });

  it("refuses a suspended account in the statement", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 100, { suspended: 1 });
    expect(await reserve(env, plans, account(env, a.id), hold(0.01))).toBe(false);
  });

  it("counts top-ups that have not expired and nothing else", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    addTopup(env, a.id, 5, Date.now() - 1000);
    addTopup(env, a.id, 0, Date.now() + DAY);
    expect(await reserve(env, plans, account(env, a.id), hold(0.5))).toBe(false);
    addTopup(env, a.id, 0.6, Date.now() + DAY);
    expect(await reserve(env, plans, account(env, a.id), hold(0.5))).toBe(true);
  });

  it("adds the allowance and the top-ups", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0.4);
    addTopup(env, a.id, 0.4);
    expect(await reserve(env, plans, account(env, a.id), hold(0.8))).toBe(true);
    expect(await reserve(env, plans, account(env, a.id), hold(0.01))).toBe(false);
  });

  for (const status of ["canceled", "unpaid", "none"]) {
    it(`does not count the allowance for the status ${status}`, async () => {
      const env = makeEnv();
      const a = await addAccount(env, 10, { subStatus: status });
      expect(await reserve(env, plans, account(env, a.id), hold(0.01))).toBe(false);
    });
  }

  for (const status of ["active", "trialing", "past_due"]) {
    it(`counts the allowance for the status ${status}`, async () => {
      const env = makeEnv();
      const a = await addAccount(env, 10, { subStatus: status });
      expect(await reserve(env, plans, account(env, a.id), hold(0.01))).toBe(true);
    });
  }

  it("does not count an allowance whose reset time has passed", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 10, { resetsAt: Date.now() - 1 });
    expect(await reserve(env, plans, account(env, a.id), hold(0.01))).toBe(false);
  });

  it("does not count a negative allowance", async () => {
    const env = makeEnv();
    const a = await addAccount(env, -1);
    addTopup(env, a.id, 0.5);
    expect(await reserve(env, plans, account(env, a.id), hold(0.5))).toBe(true);
    expect(await reserve(env, plans, account(env, a.id), hold(0.01))).toBe(false);
  });

  it("applies the five-hour limit of 30 percent of the plan allowance", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 100, { plan: "standard", granted: 15 });
    addUsage(env, a.id, 4.4);
    expect(await reserve(env, plans, account(env, a.id), hold(0.1))).toBe(true);
    expect(await reserve(env, plans, account(env, a.id), hold(0.01))).toBe(false);
  });
});

describe("concurrent requests", () => {
  it("lets exactly the number of requests in that the allowance can hold", async () => {
    const env = makeEnv();
    const body = chatBody();
    const a = await addAccount(env, reserveFor(body, 2, 10) * 2.5);
    const streams = Array.from({ length: 6 }, () => heldStream());
    let n = 0;
    mockFetch(() => streams[n++]!.response);
    const results = await Promise.all(Array.from({ length: 6 }, () => call(env, "/v1/messages", post(a.token, body))));
    const statuses = results.map((r) => r.res.status).sort();
    expect(statuses).toEqual([200, 200, 402, 402, 402, 402]);
    expect(holdsOf(env, a.id)).toBe(2);
    expect(heldTotal(env, a.id)).toBeCloseTo(reserveFor(body, 2, 10) * 2, 9);
    for (const r of results) if (r.res.status === 200) await r.res.body!.cancel();
  });

  it("lets at most four requests run at the same time", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 100);
    const streams = Array.from({ length: 8 }, () => heldStream());
    let n = 0;
    mockFetch(() => streams[n++]!.response);
    const results = await Promise.all(Array.from({ length: 8 }, () => call(env, "/v1/messages", post(a.token, chatBody()))));
    const ok = results.filter((r) => r.res.status === 200);
    const busy = results.filter((r) => r.res.status === 429);
    expect(ok).toHaveLength(4);
    expect(busy).toHaveLength(4);
    expect((await json(busy[0]!.res)).error.type).toBe("too_many_requests");
    expect(holdsOf(env, a.id)).toBe(4);
    for (const r of ok) await r.res.body!.cancel();
  });

  it("counts the live holds of other requests against the five-hour limit", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 100, { plan: "standard", granted: 15 });
    const body = chatBody({ model: "claude-fable-5-1", max_tokens: 64000 });
    const r1 = reserveFor(body, 10, 50);
    const count = Math.floor(4.5 / r1);
    expect(count).toBe(1);
    const streams = Array.from({ length: 4 }, () => heldStream());
    let n = 0;
    mockFetch(() => streams[n++]!.response);
    const results = await Promise.all(Array.from({ length: 4 }, () => call(env, "/v1/messages", post(a.token, body))));
    expect(results.filter((r) => r.res.status === 200)).toHaveLength(count);
    expect(results.filter((r) => r.res.status === 429)).toHaveLength(4 - count);
    for (const r of results) if (r.res.status === 200) await r.res.body!.cancel();
  });
});

describe("five-hour limit", () => {
  const standard = (env: TestEnv, over: Parameters<typeof addAccount>[2] = {}) => addAccount(env, 50, { plan: "standard", granted: 15, ...over });
  const R = reserveFor(chatBody(), 2, 10);

  it("answers 429 rate_limited with the seconds until enough usage leaves the window", async () => {
    freeze();
    const env = makeEnv();
    const a = await standard(env);
    addUsage(env, a.id, 2.0, new Date(NOW.getTime() - 4 * HOUR));
    addUsage(env, a.id, 2.5, new Date(NOW.getTime() - 1 * HOUR));
    const calls = mockFetch(() => new Response("{}"));
    const { res } = await call(env, "/v1/messages", post(a.token, chatBody()));
    expect(res.status).toBe(429);
    const body = await json(res);
    expect(body.type).toBe("error");
    expect(body.error.type).toBe("rate_limited");
    expect(body.error.retry_after).toBe(3600);
    expect(res.headers.get("retry-after")).toBe("3600");
    expect(typeof body.error.message).toBe("string");
    expect(calls).toHaveLength(0);
    expect(holdsOf(env, a.id)).toBe(0);
  });

  it("waits for a second row when the first one is too small", async () => {
    freeze();
    const env = makeEnv();
    const a = await standard(env);
    addUsage(env, a.id, 0.001, new Date(NOW.getTime() - 4 * HOUR));
    addUsage(env, a.id, 2.5, new Date(NOW.getTime() - 3 * HOUR));
    addUsage(env, a.id, 2.0, new Date(NOW.getTime() - 1 * HOUR));
    const { res } = await call(env, "/v1/messages", post(a.token, chatBody()));
    expect((await json(res)).error.retry_after).toBe(2 * 3600);
  });

  it("lets the request in once the usage leaves the window", async () => {
    freeze();
    const env = makeEnv();
    const a = await standard(env);
    addUsage(env, a.id, 4.5, new Date(NOW.getTime() - 2 * HOUR));
    jsonUpstream(10, 10);
    expect((await ask(env, a.token)).status).toBe(429);
    vi.setSystemTime(new Date(NOW.getTime() + 3 * HOUR + 1000));
    expect((await ask(env, a.token)).status).toBe(200);
  });

  it("does not count usage that is older than five hours", async () => {
    freeze();
    const env = makeEnv();
    const a = await standard(env);
    addUsage(env, a.id, 100, new Date(NOW.getTime() - 5 * HOUR - 1000));
    jsonUpstream(10, 10);
    expect((await ask(env, a.token)).status).toBe(200);
  });

  it("does not count the usage of another account", async () => {
    freeze();
    const env = makeEnv();
    const a = await standard(env);
    const b = await standard(env);
    addUsage(env, b.id, 4.5, new Date(NOW.getTime() - HOUR));
    jsonUpstream(10, 10);
    expect((await ask(env, a.token)).status).toBe(200);
  });

  it("counts a live hold", async () => {
    const env = makeEnv();
    const a = await standard(env);
    addHold(env, a.id, 4.495, Date.now() - 60_000);
    const { res } = await call(env, "/v1/messages", post(a.token, chatBody()));
    expect(res.status).toBe(429);
    expect((await json(res)).error.type).toBe("rate_limited");
  });

  it("counts a hold that is 15 minutes old as usage, because the server debits it in full", async () => {
    const env = makeEnv();
    const a = await standard(env);
    addHold(env, a.id, 4.495, Date.now() - 16 * 60_000, "old");
    const { res } = await call(env, "/v1/messages", post(a.token, chatBody()));
    expect(res.status).toBe(429);
    expect(env.fake.row<any>("SELECT status, cost_usd FROM usage WHERE request_id = 'old'")).toEqual({ status: "expired", cost_usd: 4.495 });
    const small = await standard(env);
    addHold(env, small.id, 0.01, Date.now() - 16 * 60_000);
    jsonUpstream(10, 10);
    expect((await ask(env, small.token)).status).toBe(200);
  });

  it("uses the floor of 3 dollars for a small plan", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 7, { plan: "basic", granted: 7 });
    addUsage(env, a.id, 2.99, new Date(NOW.getTime() - HOUR));
    const { res } = await call(env, "/v1/messages", post(a.token, chatBody()));
    expect(res.status).toBe(429);
    const b = await addAccount(env, 7, { plan: "basic", granted: 7 });
    addUsage(env, b.id, 2.98, new Date(NOW.getTime() - HOUR));
    jsonUpstream(10, 10);
    expect((await ask(env, b.token)).status).toBe(200);
  });

  it("uses 30 percent of the allowance for a large plan", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 118, { plan: "lab_plus", granted: 118 });
    addUsage(env, a.id, 35.39, new Date(NOW.getTime() - HOUR));
    expect((await call(env, "/v1/messages", post(a.token, chatBody()))).res.status).toBe(429);
    const b = await addAccount(env, 118, { plan: "lab_plus", granted: 118 });
    addUsage(env, b.id, 35.3, new Date(NOW.getTime() - HOUR));
    jsonUpstream(10, 10);
    expect((await ask(env, b.token)).status).toBe(200);
  });

  it("uses the floor for an account with only top-ups", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    addTopup(env, a.id, 50);
    addUsage(env, a.id, 2.995, new Date(NOW.getTime() - HOUR));
    expect((await call(env, "/v1/messages", post(a.token, chatBody()))).res.status).toBe(429);
  });

  it("counts usage that was paid from top-ups", async () => {
    freeze();
    const env = makeEnv();
    const a = await standard(env);
    addUsage(env, a.id, 4.5, new Date(NOW.getTime() - HOUR), null, 4.5);
    expect((await call(env, "/v1/messages", post(a.token, chatBody()))).res.status).toBe(429);
  });

  it("answers 400 when one request alone is above the limit", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    addTopup(env, a.id, 50);
    const { res } = await call(env, "/v1/messages", post(a.token, chatBody({ model: "claude-fable-5-1", max_tokens: 64000 })));
    expect(res.status).toBe(400);
    expect((await json(res)).error.type).toBe("invalid_request_error");
    expect(holdsOf(env, a.id)).toBe(0);
  });

  it("answers 402 and not 429 when the allowance is the first problem", async () => {
    freeze();
    const env = makeEnv();
    const a = await standard(env);
    env.fake.sqlite.prepare("UPDATE accounts SET allowance_remaining_usd = 0.001 WHERE id = ?").run(a.id);
    addUsage(env, a.id, 4.5, new Date(NOW.getTime() - HOUR));
    const { res } = await call(env, "/v1/messages", post(a.token, chatBody()));
    expect(res.status).toBe(402);
    expect(R).toBeGreaterThan(0.001);
  });
});

describe("402 allowance_used_up", () => {
  it("includes the reset date for a plan", async () => {
    const env = makeEnv();
    const resetsAt = Date.now() + 5 * DAY;
    const a = await addAccount(env, 0, { plan: "standard", granted: 15, resetsAt });
    const { res } = await call(env, "/v1/messages", post(a.token, chatBody()));
    expect(res.status).toBe(402);
    const body = await json(res);
    expect(body).toEqual({ type: "error", error: { type: "allowance_used_up", message: expect.any(String), resets_at: ISO(resetsAt) } });
  });

  it("sends resets_at as null for an account with no plan", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    addTopup(env, a.id, 0.0001);
    const { res } = await call(env, "/v1/messages", post(a.token, chatBody()));
    expect(res.status).toBe(402);
    expect((await json(res)).error.resets_at).toBeNull();
  });
});

describe("plan checks", () => {
  const body = (model: string) => chatBody({ model, stream: false });
  const run = async (env: TestEnv, token: string, model: string) => {
    jsonUpstream(10, 10, model);
    const r = await call(env, "/v1/messages", post(token, body(model)));
    await r.res.clone().text();
    await r.settled();
    return r.res;
  };

  it("lets Basic use Sonnet and Haiku and answers 403 model_not_in_plan for the others", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 7, { plan: "basic", granted: 7 });
    expect((await run(env, a.token, "claude-sonnet-5-5")).status).toBe(200);
    expect((await run(env, a.token, "claude-haiku-5-5")).status).toBe(200);
    for (const model of ["claude-opus-5-5", "claude-fable-5-1"]) {
      const res = await run(env, a.token, model);
      expect(res.status).toBe(403);
      const b = await json(res);
      expect(b.type).toBe("error");
      expect(b.error.type).toBe("model_not_in_plan");
      expect(b.error.message).toContain(model);
    }
    expect(env.fake.rows("SELECT * FROM usage")).toHaveLength(2);
    expect(holdsOf(env, a.id)).toBe(0);
  });

  it("lets Standard, Lab and Lab Plus use every model", async () => {
    for (const plan of ["standard", "lab", "lab_plus"]) {
      const env = makeEnv();
      const a = await addAccount(env, 7, { plan, granted: 15 });
      for (const model of ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5", "claude-fable-5-1"]) expect((await run(env, a.token, model)).status, `${plan} ${model}`).toBe(200);
    }
  });

  it("answers 403 no_plan for an account with no plan and no top-up", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    const calls = mockFetch(() => new Response("{}"));
    const { res } = await call(env, "/v1/messages", post(a.token, body(SONNET)));
    expect(res.status).toBe(403);
    expect((await json(res)).error.type).toBe("no_plan");
    expect(calls).toHaveLength(0);
  });

  it("lets an account with only top-ups use every model", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    addTopup(env, a.id, 5);
    expect((await run(env, a.token, "claude-opus-5-5")).status).toBe(200);
  });

  it("lets an account that canceled its plan use its top-ups", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", subStatus: "canceled" });
    addTopup(env, a.id, 5);
    expect((await run(env, a.token, SONNET)).status).toBe(200);
  });

  it("answers 403 no_plan when the only top-up has expired", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    addTopup(env, a.id, 5, Date.now() - 1);
    expect((await run(env, a.token, SONNET)).status).toBe(403);
  });

  it("answers 403 account_suspended before any other check", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 100, { suspended: 1 });
    const calls = mockFetch(() => new Response("{}"));
    const { res } = await call(env, "/v1/messages", post(a.token, body(SONNET)));
    expect(res.status).toBe(403);
    expect((await json(res)).error.type).toBe("account_suspended");
    expect(calls).toHaveLength(0);
  });

  it("answers 403 for a suspended account on chat completions and count_tokens too", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 100, { suspended: 1 });
    mockFetch(() => new Response("{}"));
    const count = await call(env, "/v1/messages/count_tokens", post(a.token, { model: SONNET, messages: [{ role: "user", content: "x" }] }));
    expect(count.res.status).toBe(403);
    expect((await json(count.res)).error.type).toBe("account_suspended");
  });

  it("applies the model list to count_tokens", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 7, { plan: "basic", granted: 7 });
    const calls = mockFetch(() => new Response(JSON.stringify({ input_tokens: 3 })));
    const denied = await call(env, "/v1/messages/count_tokens", post(a.token, { model: "claude-opus-5-5", messages: [{ role: "user", content: "x" }] }));
    expect(denied.res.status).toBe(403);
    expect(calls).toHaveLength(0);
    const ok = await call(env, "/v1/messages/count_tokens", post(a.token, { model: SONNET, messages: [{ role: "user", content: "x" }] }));
    expect(ok.res.status).toBe(200);
    const none = await addAccount(env, 0, { plan: "none" });
    const nope = await call(env, "/v1/messages/count_tokens", post(none.token, { model: SONNET, messages: [{ role: "user", content: "x" }] }));
    expect(nope.res.status).toBe(403);
    expect((await json(nope.res)).error.type).toBe("no_plan");
  });

  it("checks the plan before the reservation, so a missing model gives 403 and not 402", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "basic", granted: 7 });
    const { res } = await call(env, "/v1/messages", post(a.token, body("claude-opus-5-5")));
    expect(res.status).toBe(403);
  });

  it("uses the model list of a plan that the config changes", async () => {
    const plans = JSON.parse(JSON.stringify(TEST_PLANS));
    plans.plans.basic.models = ["claude-haiku-5-5"];
    const env = makeEnv({ PLANS: JSON.stringify(plans) });
    const a = await addAccount(env, 7, { plan: "basic", granted: 7 });
    expect((await call(env, "/v1/messages", post(a.token, body(SONNET)))).res.status).toBe(403);
  });
});

describe("spend order", () => {
  const row = (env: TestEnv) => env.fake.row<any>("SELECT * FROM usage");
  const topup = (env: TestEnv, id: string) => env.fake.row<any>("SELECT remaining_usd FROM topups WHERE id = ?", id).remaining_usd;

  it("spends the allowance first and leaves the top-ups alone", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    const t = addTopup(env, a.id, 3, Date.now() + DAY, "t1");
    jsonUpstream(1000, 1000);
    await ask(env, a.token);
    expect(balanceOf(env, a.id)).toBeCloseTo(5 - COST, 9);
    expect(topup(env, t)).toBe(3);
    expect(row(env)).toMatchObject({ topup_cost_usd: 0 });
    expect(row(env).cost_usd).toBeCloseTo(COST, 9);
  });

  it("spends the rest from top-ups, oldest expiry first, when the allowance is not enough", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0.005);
    const late = addTopup(env, a.id, 1, Date.now() + 90 * DAY, "late");
    const soon = addTopup(env, a.id, 0.004, Date.now() + 10 * DAY, "soon");
    const middle = addTopup(env, a.id, 1, Date.now() + 50 * DAY, "middle");
    jsonUpstream(1000, 1000);
    await ask(env, a.token);
    expect(balanceOf(env, a.id)).toBe(0);
    expect(topup(env, soon)).toBe(0);
    expect(topup(env, middle)).toBeCloseTo(1 - (COST - 0.005 - 0.004), 9);
    expect(topup(env, late)).toBe(1);
    expect(row(env).topup_cost_usd).toBeCloseTo(COST - 0.005, 9);
  });

  it("spends a whole request from a top-up when the allowance does not count", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 9, { subStatus: "canceled" });
    const t = addTopup(env, a.id, 1, Date.now() + DAY, "t1");
    jsonUpstream(1000, 1000);
    await ask(env, a.token);
    expect(balanceOf(env, a.id)).toBe(9);
    expect(topup(env, t)).toBeCloseTo(1 - COST, 9);
    expect(row(env).topup_cost_usd).toBeCloseTo(COST, 9);
  });

  it("does not use an expired top-up and does not use a top-up with nothing left", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0.011);
    const expired = addTopup(env, a.id, 5, Date.now() - 1, "old");
    const live = addTopup(env, a.id, 1, Date.now() + DAY, "live");
    jsonUpstream(1000, 1000);
    await ask(env, a.token);
    expect(topup(env, expired)).toBe(5);
    expect(topup(env, live)).toBeCloseTo(1 - (COST - 0.011), 9);
  });

  it("lets the allowance go below 0 by one request and then refuses", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0.011);
    jsonUpstream(1000, 1000);
    expect((await ask(env, a.token)).status).toBe(200);
    expect(balanceOf(env, a.id)).toBeCloseTo(0.011 - COST, 9);
    expect(balanceOf(env, a.id)).toBeLessThan(0);
    const next = await call(env, "/v1/messages", post(a.token, chatBody()));
    expect(next.res.status).toBe(402);
  });

  it("puts the shortfall on the allowance when the top-ups run out", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0.011);
    const t = addTopup(env, a.id, 0.0005, Date.now() + DAY, "t1");
    jsonUpstream(1000, 1000);
    await ask(env, a.token);
    expect(topup(env, t)).toBe(0);
    expect(balanceOf(env, a.id)).toBeCloseTo(0.011 - (COST - 0.0005), 9);
    expect(row(env).topup_cost_usd).toBeCloseTo(0.0005, 9);
  });

  it("debits the full amount of a hold that expired, in the same order", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 1);
    const t = addTopup(env, a.id, 5, Date.now() + DAY, "t1");
    addHold(env, a.id, 2, Date.now() - 20 * 60_000, "old");
    jsonUpstream(10, 10);
    await ask(env, a.token);
    expect(topup(env, t)).toBeCloseTo(4 - (10 * 2 + 10 * 10) / 1e6, 9);
    expect(env.fake.row<any>("SELECT cost_usd, topup_cost_usd, status FROM usage WHERE request_id = 'old'")).toEqual({ cost_usd: 2, topup_cost_usd: 1, status: "expired" });
    expect(env.fake.rows("SELECT * FROM holds")).toHaveLength(0);
  });

  it("debits an expired hold once when two requests start at the same time", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    addHold(env, a.id, 2, Date.now() - 20 * 60_000, "old");
    jsonUpstream(1000, 1000);
    await Promise.all([ask(env, a.token), ask(env, a.token)]);
    expect(balanceOf(env, a.id)).toBeCloseTo(5 - 2 - 2 * COST, 9);
    expect(env.fake.rows("SELECT * FROM usage WHERE request_id = 'old'")).toHaveLength(1);
  });

  it("debits a stream that runs longer than 15 minutes once, when a new request expires its hold first", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    const held = heldStream();
    mockFetch(() => held.response);
    const first = await call(env, "/v1/messages", post(a.token, chatBody()));
    env.fake.sqlite.prepare("UPDATE holds SET started_at = started_at - ?").run(16 * 60_000);
    jsonUpstream(10, 10);
    await ask(env, a.token);
    expect(balanceOf(env, a.id)).toBeCloseTo(5 - reserveFor(chatBody(), 2, 10) - (10 * 2 + 10 * 10) / 1e6, 9);
    held.push(sse([messageStart(SONNET, { input_tokens: 100 }), messageDelta({ output_tokens: 50 })]));
    held.end();
    await first.res.text();
    await first.settled();
    expect(balanceOf(env, a.id)).toBeCloseTo(5 - reserveFor(chatBody(), 2, 10) - (10 * 2 + 10 * 10) / 1e6, 9);
    expect(env.fake.rows("SELECT status FROM usage ORDER BY id")).toEqual([{ status: "expired" }, { status: "ok" }]);
    expect(env.fake.rows("SELECT * FROM holds")).toHaveLength(0);
  });

  it("debits from top-ups once for a stream that settles after its hold expired", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    const t = addTopup(env, a.id, 5, Date.now() + DAY, "t1");
    const held = heldStream();
    mockFetch(() => held.response);
    const first = await call(env, "/v1/messages", post(a.token, chatBody()));
    env.fake.sqlite.prepare("UPDATE holds SET started_at = started_at - ?").run(16 * 60_000);
    jsonUpstream(10, 10);
    await ask(env, a.token);
    held.push(sse([messageStart(SONNET, { input_tokens: 100 }), messageDelta({ output_tokens: 50 })]));
    held.end();
    await first.res.text();
    await first.settled();
    expect(topup(env, t)).toBeCloseTo(5 - reserveFor(chatBody(), 2, 10) - (10 * 2 + 10 * 10) / 1e6, 9);
  });

  it("debits an expired hold once when two expireHolds calls run at the same time", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    addHold(env, a.id, 2, Date.now() - 20 * 60_000, "old");
    const found = await Promise.all([expireHolds(env, a.id, Date.now()), expireHolds(env, a.id, Date.now())]);
    expect(found.filter(Boolean)).toHaveLength(1);
    expect(balanceOf(env, a.id)).toBe(3);
    expect(env.fake.rows("SELECT * FROM usage WHERE request_id = 'old'")).toHaveLength(1);
    expect(env.fake.rows("SELECT * FROM holds")).toHaveLength(0);
  });

  it("settles many expired holds in batches of at most 40 statements and debits each hold once", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 100);
    for (let i = 0; i < 25; i++) addHold(env, a.id, 1, Date.now() - 20 * 60_000, `old${i}`);
    const sizes: number[] = [];
    const batch = env.DB.batch.bind(env.DB);
    env.DB.batch = (async (statements: any[]) => {
      sizes.push(statements.length);
      return batch(statements);
    }) as typeof env.DB.batch;
    expect(await expireHolds(env, a.id, Date.now())).toBe(true);
    expect(sizes).toEqual([40, 40, 20]);
    expect(balanceOf(env, a.id)).toBe(75);
    expect(env.fake.rows("SELECT * FROM usage")).toHaveLength(25);
    expect(env.fake.rows("SELECT * FROM holds")).toHaveLength(0);
  });

  it("handles an expired hold at settle: it keeps the full amount and the status expired", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    const held = heldStream();
    mockFetch(() => held.response);
    const { res, settled } = await call(env, "/v1/messages", post(a.token, chatBody()));
    env.fake.sqlite.prepare("UPDATE holds SET started_at = started_at - ?").run(16 * 60_000);
    held.push("event: message_stop\ndata: {}\n\n");
    held.end();
    await res.text();
    await settled();
    expect(row(env).status).toBe("expired");
    expect(balanceOf(env, a.id)).toBeCloseTo(5 - reserveFor(chatBody(), 2, 10), 9);
  });

  it("writes the session id from the header on the hold and on the usage row", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    const held = heldStream();
    mockFetch(() => held.response);
    const { res, settled } = await call(env, "/v1/messages", post(a.token, chatBody(), { "x-cuvette-session": "sess-1.A_b:c" }));
    expect(env.fake.row<any>("SELECT session_id FROM holds").session_id).toBe("sess-1.A_b:c");
    await res.body!.cancel();
    await settled();
    expect(row(env).session_id).toBe("sess-1.A_b:c");
  });

  it("ignores a session id with other characters or more than 64 characters", async () => {
    for (const id of ["a b", "x".repeat(65), "=cmd|' /C calc'!A0", "a,b", "é"]) {
      const env = makeEnv();
      const a = await addAccount(env, 5);
      jsonUpstream(10, 10);
      await ask(env, a.token, {}, { "x-cuvette-session": id });
      expect(row(env).session_id, id).toBeNull();
    }
  });
});

describe("allowance reset", () => {
  const yearly = (env: TestEnv, over: Parameters<typeof addAccount>[2] = {}, remaining = 3) =>
    addAccount(env, remaining, { plan: "standard", interval: "year", granted: 15, resetsAt: NOW.getTime() - HOUR, periodEnd: Date.parse("2027-04-01T11:00:00Z"), ...over });

  it("sets the allowance to the plan allowance with no carry-over and moves the date one month", async () => {
    freeze();
    const env = makeEnv();
    const a = await yearly(env, {}, 9);
    jsonUpstream(1000, 1000);
    await ask(env, a.token);
    expect(balanceOf(env, a.id)).toBeCloseTo(15 - COST, 9);
    expect(acc(env, a.id).allowance_resets_at).toBe(Date.parse("2026-11-01T11:00:00Z"));
    expect(acc(env, a.id).allowance_granted_usd).toBe(15);
  });

  it("does not move the date past the period end", async () => {
    freeze();
    const env = makeEnv();
    const end = NOW.getTime() + 10 * DAY;
    const a = await yearly(env, { periodEnd: end });
    jsonUpstream(10, 10);
    await ask(env, a.token);
    expect(acc(env, a.id).allowance_resets_at).toBe(end);
    expect(balanceOf(env, a.id)).toBeGreaterThan(14.9);
  });

  it("gives one allowance and moves the date past now when the account was idle for months", async () => {
    freeze();
    const env = makeEnv();
    const a = await yearly(env, { resetsAt: Date.parse("2026-06-15T12:00:00Z"), periodEnd: Date.parse("2027-04-15T12:00:00Z") });
    jsonUpstream(10, 10);
    await ask(env, a.token);
    expect(balanceOf(env, a.id)).toBeGreaterThan(14.9);
    expect(balanceOf(env, a.id)).toBeLessThanOrEqual(15);
    expect(acc(env, a.id).allowance_resets_at).toBe(Date.parse("2026-10-15T12:00:00Z"));
  });

  it("keeps the day of the month when a month is shorter", async () => {
    freeze();
    const env = makeEnv();
    const a = await yearly(env, { resetsAt: Date.parse("2026-08-31T12:00:00Z"), periodEnd: Date.parse("2027-08-31T12:00:00Z") });
    jsonUpstream(10, 10);
    await ask(env, a.token);
    expect(acc(env, a.id).allowance_resets_at).toBe(Date.parse("2026-10-31T12:00:00Z"));
  });

  it("resets a monthly plan whose renewal is paid and whose date has passed", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 2, { plan: "standard", granted: 15, resetsAt: NOW.getTime() - HOUR, periodEnd: NOW.getTime() + 20 * DAY });
    jsonUpstream(10, 10);
    await ask(env, a.token);
    expect(balanceOf(env, a.id)).toBeGreaterThan(14.9);
  });

  it("does not reset a plan whose period has ended and whose renewal is not paid", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 3, { plan: "standard", granted: 15, resetsAt: NOW.getTime() - HOUR, periodEnd: NOW.getTime() - 1000 });
    const { res } = await call(env, "/v1/messages", post(a.token, chatBody()));
    expect(res.status).toBe(402);
    expect(balanceOf(env, a.id)).toBe(3);
    expect(acc(env, a.id).allowance_resets_at).toBe(NOW.getTime() - HOUR);
  });

  for (const subStatus of ["past_due", "canceled", "unpaid"]) {
    it(`does not reset for the status ${subStatus}`, async () => {
      freeze();
      const env = makeEnv();
      const a = await yearly(env, { subStatus });
      const { res } = await call(env, "/v1/messages", post(a.token, chatBody()));
      expect(res.status).toBe(402);
      expect(balanceOf(env, a.id)).toBe(3);
    });
  }

  it("resets for the status trialing", async () => {
    freeze();
    const env = makeEnv();
    const a = await yearly(env, { subStatus: "trialing" });
    jsonUpstream(10, 10);
    await ask(env, a.token);
    expect(balanceOf(env, a.id)).toBeGreaterThan(14.9);
  });

  it("does not reset before the date", async () => {
    freeze();
    const env = makeEnv();
    const a = await yearly(env, { resetsAt: NOW.getTime() + HOUR });
    jsonUpstream(1000, 1000);
    await ask(env, a.token);
    expect(balanceOf(env, a.id)).toBeCloseTo(3 - COST, 9);
  });

  it("does not reset an account with no plan", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    addTopup(env, a.id, 1);
    jsonUpstream(10, 10);
    await ask(env, a.token);
    expect(balanceOf(env, a.id)).toBe(0);
    expect(acc(env, a.id).allowance_resets_at).toBeNull();
  });

  it("resets once when two requests start at the same time", async () => {
    freeze();
    const env = makeEnv();
    const a = await yearly(env);
    jsonUpstream(1000, 1000);
    await Promise.all([ask(env, a.token), ask(env, a.token), ask(env, a.token)]);
    expect(balanceOf(env, a.id)).toBeCloseTo(15 - 3 * COST, 9);
  });

  it("resets when the account is read", async () => {
    freeze();
    const env = makeEnv();
    const a = await yearly(env);
    const info = await json((await call(env, "/v1/account", { headers: { authorization: `Bearer ${a.token}` } })).res);
    expect(info.allowance_remaining_usd).toBe(15);
    expect(info.resets_at).toBe("2026-11-01T11:00:00.000Z");
  });

  it("leaves a hold in place and counts it after the reset", async () => {
    freeze();
    const env = makeEnv();
    const a = await yearly(env);
    addHold(env, a.id, 2, NOW.getTime() - 60_000, "keep");
    jsonUpstream(10, 10);
    const res = await ask(env, a.token);
    expect(res.status).toBe(200);
    expect(heldTotal(env, a.id)).toBe(2);
    expect(balanceOf(env, a.id)).toBeGreaterThan(14.9);
  });

  it("uses the allowance of the plan in the config, not the granted value", async () => {
    freeze();
    const env = makeEnv();
    const a = await yearly(env, { granted: 2 });
    jsonUpstream(10, 10);
    await ask(env, a.token);
    expect(acc(env, a.id).allowance_granted_usd).toBe(15);
  });

  it("leaves the top-ups alone", async () => {
    freeze();
    const env = makeEnv();
    const a = await yearly(env);
    addTopup(env, a.id, 4);
    jsonUpstream(10, 10);
    await ask(env, a.token);
    expect(topupsOf(env, a.id)).toBe(4);
  });
});

describe("atomic settle", () => {
  const tokens = { input: 1000, output: 1000, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 };

  it("debits once when two settles for the same hold run at the same time", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    const t = addTopup(env, a.id, 5);
    addHold(env, a.id, 1, Date.now(), "r1");
    await Promise.all([settle(env, "r1", 0.25, SONNET, "ok", tokens), settle(env, "r1", 0.25, SONNET, "ok", tokens)]);
    expect(balanceOf(env, a.id)).toBe(4.75);
    expect(topupsOf(env, a.id)).toBe(5);
    expect(env.fake.rows("SELECT * FROM usage WHERE request_id = 'r1'")).toHaveLength(1);
    expect(env.fake.rows("SELECT * FROM holds")).toHaveLength(0);
    expect(t).toBeTruthy();
  });

  it("debits nothing when expireHolds already settled the hold that settle read", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    addHold(env, a.id, 2, Date.now() - 20 * 60_000, "old");
    await Promise.all([expireHolds(env, a.id, Date.now()), settle(env, "old", 0.5, SONNET, "ok", tokens)]);
    expect(balanceOf(env, a.id)).toBe(3);
    expect(env.fake.rows("SELECT * FROM usage WHERE request_id = 'old'")).toHaveLength(1);
  });

  it("debits the top-up once when a second settle runs after the first", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    addTopup(env, a.id, 5);
    addHold(env, a.id, 1, Date.now(), "r2");
    await settle(env, "r2", 0.25, SONNET, "ok", tokens);
    await settle(env, "r2", 0.25, SONNET, "ok", tokens);
    expect(topupsOf(env, a.id)).toBe(4.75);
  });

  it("keeps the hold when the debit fails", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    addHold(env, a.id, 1, Date.now(), "r3");
    env.fake.sqlite.exec("CREATE TRIGGER fail_usage BEFORE INSERT ON usage BEGIN SELECT RAISE(ABORT, 'stop'); END");
    await expect(settle(env, "r3", 0.25, SONNET, "ok", tokens)).rejects.toThrow();
    expect(env.fake.rows("SELECT * FROM holds WHERE request_id = 'r3'")).toHaveLength(1);
    expect(balanceOf(env, a.id)).toBe(5);
  });

  it("keeps the hold of expireHolds when the debit fails", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    addHold(env, a.id, 2, Date.now() - 20 * 60_000, "old");
    env.fake.sqlite.exec("CREATE TRIGGER fail_usage BEFORE INSERT ON usage BEGIN SELECT RAISE(ABORT, 'stop'); END");
    await expect(expireHolds(env, a.id, Date.now())).rejects.toThrow();
    expect(env.fake.rows("SELECT * FROM holds")).toHaveLength(1);
    expect(NO_TOKENS.input).toBe(0);
  });
});
