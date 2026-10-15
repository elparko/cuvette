import { afterEach, describe, expect, it, vi } from "vitest";
import { SCHEMA, addAccount, call, makeEnv, mockFetch, post, sha256Hex } from "./helpers.ts";
import { readFileSync } from "node:fs";

afterEach(() => vi.unstubAllGlobals());

describe("account create and auth", () => {
  it("creates an account and stores only the token hash", async () => {
    const env = makeEnv();
    const { res } = await call(env, "/v1/accounts", { method: "POST" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { account_id: string; token: string };
    expect(body.token).toMatch(/^cuv_[A-Za-z0-9_-]{43}$/);
    const row = env.fake.row<{ id: string; token_hash: string; balance_usd: number }>("SELECT * FROM accounts");
    expect(row.id).toBe(body.account_id);
    expect(row.token_hash).toBe(await sha256Hex(body.token));
    expect(row.token_hash).not.toContain(body.token);
    expect(row.balance_usd).toBe(0);
  });

  it("gives each account a different token", async () => {
    const env = makeEnv();
    const a = (await (await call(env, "/v1/accounts", { method: "POST" })).res.json()) as { token: string };
    const b = (await (await call(env, "/v1/accounts", { method: "POST" })).res.json()) as { token: string };
    expect(a.token).not.toBe(b.token);
  });

  it("returns the balance for a valid token", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 12.5);
    const { res } = await call(env, "/v1/account", { headers: { authorization: `Bearer ${acct.token}` } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ account_id: acct.id, balance_usd: 12.5 });
  });

  it("rejects a missing, malformed or unknown token with 401", async () => {
    const env = makeEnv();
    await addAccount(env, 1);
    const unknown = `cuv_${"A".repeat(43)}`;
    const cases: Record<string, string>[] = [{}, { authorization: "Bearer nope" }, { authorization: `Bearer ${unknown}` }, { authorization: unknown }];
    for (const headers of cases) {
      const { res } = await call(env, "/v1/account", { headers });
      expect(res.status).toBe(401);
      expect(((await res.json()) as any).error.type).toBe("authentication_error");
    }
  });

  it("rejects a wrong method and an unknown route", async () => {
    const env = makeEnv();
    expect((await call(env, "/v1/account", { method: "POST" })).res.status).toBe(405);
    expect((await call(env, "/v1/models")).res.status).toBe(404);
    expect((await call(env, "/v1/messages/count_tokens", post("x", {}))).res.status).toBe(404);
  });

  it("limits account creation to five an hour for each address", async () => {
    const env = makeEnv();
    const headers = { "cf-connecting-ip": "203.0.113.9" };
    for (let i = 0; i < 5; i++) expect((await call(env, "/v1/accounts", { method: "POST", headers })).res.status).toBe(201);
    const sixth = (await call(env, "/v1/accounts", { method: "POST", headers })).res;
    expect(sixth.status).toBe(429);
    expect(((await sixth.json()) as any).error.type).toBe("too_many_requests");
    expect((await call(env, "/v1/accounts", { method: "POST", headers: { "cf-connecting-ip": "203.0.113.10" } })).res.status).toBe(201);
    expect(env.fake.rows("SELECT * FROM accounts")).toHaveLength(6);
    expect(JSON.stringify(env.fake.rows("SELECT * FROM signups"))).not.toContain("203.0.113.9");
  });
});

describe("checkout", () => {
  it("creates a Stripe session with form encoding", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 0);
    const calls = mockFetch(() => new Response(JSON.stringify({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" })));
    const { res } = await call(env, "/v1/checkout", post(acct.token, { amount_usd: 25 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_1" });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.stripe.com/v1/checkout/sessions");
    expect(calls[0]!.headers.get("authorization")).toBe("Bearer sk_test_123");
    expect(calls[0]!.headers.get("content-type")).toBe("application/x-www-form-urlencoded");
    const form = new URLSearchParams(calls[0]!.body);
    expect(form.get("mode")).toBe("payment");
    expect(form.get("client_reference_id")).toBe(acct.id);
    expect(form.get("line_items[0][price_data][unit_amount]")).toBe("2500");
    expect(form.get("line_items[0][price_data][currency]")).toBe("usd");
    expect(form.get("success_url")).toMatch(/^https:\/\/cuvette\.test\//);
  });

  it("rejects an amount that is not 10, 25 or 50", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 0);
    const calls = mockFetch(() => new Response("{}"));
    for (const amount_usd of [5, 30, "10", undefined]) {
      expect((await call(env, "/v1/checkout", post(acct.token, { amount_usd }))).res.status).toBe(400);
    }
    expect(calls).toHaveLength(0);
  });

  it("requires a token", async () => {
    expect((await call(makeEnv(), "/v1/checkout", post(undefined, { amount_usd: 10 }))).res.status).toBe(401);
  });
});

describe("schema", () => {
  it("keeps the migration the same as schema.sql", () => {
    expect(readFileSync(new URL("../migrations/0001_init.sql", import.meta.url), "utf8")).toBe(SCHEMA);
  });
});
