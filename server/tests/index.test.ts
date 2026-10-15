import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { loadPlans } from "../src/plans.ts";
import { SCHEMA, addAccount, call, makeEnv, mockFetch, post } from "./helpers.ts";

afterEach(() => vi.unstubAllGlobals());

const json = (res: Response) => res.json() as Promise<any>;

const ROUTES: [string, string][] = [
  ["POST", "/v1/stripe/webhook"],
  ["GET", "/v1/auth/start?provider=google&port=5000"],
  ["GET", "/v1/auth/callback/google?code=x&state=y"],
  ["POST", "/v1/auth/token"],
  ["POST", "/v1/auth/link"],
  ["POST", "/v1/auth/logout"],
  ["GET", "/v1/account"],
  ["GET", "/v1/usage"],
  ["GET", "/v1/devices"],
  ["DELETE", "/v1/devices/dev_1"],
  ["POST", "/v1/checkout"],
  ["POST", "/v1/plan"],
  ["POST", "/v1/billing/portal"],
  ["POST", "/v1/messages"],
  ["POST", "/v1/messages/count_tokens"],
  ["POST", "/v1/chat/completions"],
  ["GET", "/v1/models"],
  ["GET", "/v1/admin/costs"],
];

describe("hosted mode switch", () => {
  const off = { type: "error", error: { type: "hosted_off", message: "Cuvette hosted is not open yet." } };

  for (const [method, path] of ROUTES) {
    for (const value of [undefined, "false", "", "0", "TRUE", "yes", "1"]) {
      it(`answers 503 hosted_off for ${method} ${path} when HOSTED_ENABLED is ${JSON.stringify(value)}`, async () => {
        const env = makeEnv({ HOSTED_ENABLED: value });
        const calls = mockFetch(() => new Response("{}"));
        const a = await addAccount(env, 100);
        const { res } = await call(env, path, { method, headers: { authorization: `Bearer ${a.token}`, "content-type": "application/json" }, body: method === "GET" || method === "DELETE" ? undefined : "{}" });
        expect(res.status).toBe(503);
        expect(await json(res)).toEqual(off);
        expect(calls).toHaveLength(0);
      });
    }
  }

  it("answers GET /v1/pricing while hosted mode is off", async () => {
    for (const value of [undefined, "false"]) {
      const { res } = await call(makeEnv({ HOSTED_ENABLED: value }), "/v1/pricing");
      expect(res.status).toBe(200);
      expect((await json(res)).plans).toHaveLength(4);
    }
  });

  it("answers 503 for other methods on the pricing route while hosted mode is off", async () => {
    const { res } = await call(makeEnv({ HOSTED_ENABLED: "false" }), "/v1/pricing", { method: "POST" });
    expect(res.status).toBe(503);
  });

  it("does not write to the database while hosted mode is off", async () => {
    const env = makeEnv({ HOSTED_ENABLED: "false" });
    await call(env, "/v1/auth/start?provider=google&port=5000&challenge=" + "A".repeat(43) + "&state=" + "a".repeat(20));
    await call(env, "/v1/auth/token", post(undefined, { code: "x", verifier: "y" }));
    expect(env.fake.rows("SELECT * FROM auth_states")).toHaveLength(0);
    expect(env.fake.rows("SELECT * FROM auth_token_calls")).toHaveLength(0);
  });

  it("serves the routes when HOSTED_ENABLED is true", async () => {
    const env = makeEnv({ HOSTED_ENABLED: "true" });
    expect((await call(env, "/v1/account")).res.status).toBe(401);
    expect((await call(env, "/v1/models")).res.status).toBe(401);
  });

  it("is off in wrangler.toml", () => {
    const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
    expect(toml).toMatch(/^HOSTED_ENABLED = "false"$/m);
  });
});

describe("routes", () => {
  it("answers 401 without a token on each route that needs one", async () => {
    const env = makeEnv();
    const needs = ["/v1/auth/link", "/v1/auth/logout", "/v1/account", "/v1/usage", "/v1/devices", "/v1/checkout", "/v1/plan", "/v1/billing/portal", "/v1/messages", "/v1/messages/count_tokens", "/v1/chat/completions", "/v1/models"];
    for (const path of ROUTES.filter(([, p]) => needs.includes(p.split("?")[0]!))) {
      const { res } = await call(env, path[1], { method: path[0] });
      expect(res.status, path[1]).toBe(401);
      expect((await json(res)).error.type).toBe("authentication_error");
    }
    expect((await call(env, "/v1/devices/dev_1", { method: "DELETE" })).res.status).toBe(401);
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

  it("has no route to make an account with no sign-in", async () => {
    for (const hosted of ["true", "false"]) {
      const env = makeEnv({ HOSTED_ENABLED: hosted });
      const { res } = await call(env, "/v1/accounts", { method: "POST" });
      expect(res.status).toBe(404);
      expect(env.fake.rows("SELECT * FROM accounts")).toHaveLength(0);
    }
  });

  it("answers 404 for an unknown route, also when hosted mode is off", async () => {
    expect((await call(makeEnv(), "/v1/nothing")).res.status).toBe(404);
    expect((await call(makeEnv({ HOSTED_ENABLED: "false" }), "/v1/nothing")).res.status).toBe(404);
    expect((await call(makeEnv(), "/")).res.status).toBe(404);
    expect((await call(makeEnv(), "/v1/devices/")).res.status).toBe(404);
    expect((await call(makeEnv(), "/v1/devices/a%20b", { method: "DELETE" })).res.status).toBe(404);
    expect((await call(makeEnv(), "/v1/auth/callback/google/extra")).res.status).toBe(404);
  });

  it("answers 405 with an allow header for a wrong method", async () => {
    const env = makeEnv();
    const cases: [string, string, string][] = [
      ["POST", "/v1/account", "GET"],
      ["GET", "/v1/checkout", "POST"],
      ["POST", "/v1/models", "GET"],
      ["GET", "/v1/messages/count_tokens", "POST"],
      ["GET", "/v1/chat/completions", "POST"],
      ["POST", "/v1/pricing", "GET"],
      ["GET", "/v1/auth/token", "POST"],
      ["POST", "/v1/usage", "GET"],
      ["PUT", "/v1/devices/dev_1", "DELETE"],
      ["POST", "/v1/devices", "GET"],
      ["GET", "/v1/plan", "POST"],
      ["GET", "/v1/stripe/webhook", "POST"],
    ];
    for (const [method, path, allow] of cases) {
      const { res } = await call(env, path, { method });
      expect(res.status, `${method} ${path}`).toBe(405);
      expect(res.headers.get("allow")).toBe(allow);
    }
  });

  it("answers 500 without details when an error occurs", async () => {
    const env = makeEnv({ PLANS: "{nope" });
    const a = await addAccount(env, 5);
    const { res } = await call(env, "/v1/account", { headers: { authorization: `Bearer ${a.token}` } });
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("PLANS");
    expect(text).not.toContain("JSON");
  });
});

describe("config files", () => {
  it("has no MARKUP variable in wrangler.toml or in the source", () => {
    const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
    expect(toml).not.toMatch(/^MARKUP\b/m);
    for (const f of readdirSync(new URL("../src/", import.meta.url))) expect(readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8"), f).not.toMatch(/MARKUP|markup/);
  });

  it("has a PLANS value in wrangler.toml that the server reads", () => {
    const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
    const raw = /^PLANS = '''([\s\S]*?)'''$/m.exec(toml)?.[1];
    expect(raw).toBeTruthy();
    const cfg = loadPlans(raw);
    expect([...cfg.plans.keys()]).toEqual(["basic", "standard", "lab", "lab_plus"]);
    const allowance = Object.fromEntries([...cfg.plans.values()].map((p) => [p.id, p.allowanceUsd]));
    expect(allowance).toEqual({ basic: 7, standard: 15, lab: 46, lab_plus: 118 });
    const monthly = Object.fromEntries([...cfg.plans.values()].map((p) => [p.id, [p.priceUsdMonth, p.priceUsdYear]]));
    expect(monthly).toEqual({ basic: [10, 100], standard: [20, 200], lab: [60, 600], lab_plus: [150, 1500] });
    expect(cfg.topup).toMatchObject({ priceUsd: 10, allowanceUsd: 8 });
    expect(cfg.trial).toEqual({ plan: "standard", days: 7, allowanceUsd: 2 });
    expect(cfg.plans.get("basic")!.models).toEqual(["claude-sonnet-5-5", "claude-haiku-5-5"]);
  });
});

describe("schema", () => {
  it("keeps schema.sql the same as the migrations in order", () => {
    const dir = new URL("../migrations/", import.meta.url);
    const joined = readdirSync(dir).sort().map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n");
    expect(joined).toBe(SCHEMA);
  });

  it("has the tables of the money model and none of the old ones", () => {
    const env = makeEnv();
    const names = env.fake.rows<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").map((r) => r.name).sort();
    expect(names).toEqual(["accounts", "auth_codes", "auth_links", "auth_states", "auth_token_calls", "card_trials", "count_tokens_calls", "devices", "holds", "identities", "stripe_events", "topups", "usage"].sort());
  });

  it("has the columns of the contract on accounts and holds", () => {
    const env = makeEnv();
    const cols = (table: string) => env.fake.rows<{ name: string }>(`SELECT name FROM pragma_table_info('${table}')`).map((r) => r.name);
    expect(cols("accounts")).toEqual(expect.arrayContaining(["id", "created_at", "plan", "sub_status", "stripe_customer_id", "stripe_subscription_id", "allowance_remaining_usd", "allowance_resets_at", "period_end", "suspended"]));
    expect(cols("accounts")).not.toContain("token_hash");
    expect(cols("accounts")).not.toContain("balance_usd");
    expect(cols("devices")).toEqual(["id", "account_id", "token_hash", "name", "created_at", "last_used_at"]);
    expect(cols("identities")).toEqual(["provider", "subject", "account_id", "email"]);
    expect(cols("holds")).toEqual(expect.arrayContaining(["request_id", "account_id", "amount_usd", "started_at"]));
    expect(cols("usage")).toEqual(expect.arrayContaining(["session_id", "account_id", "model", "cost_usd"]));
    expect(cols("stripe_events")).toEqual(["event_id"]);
    expect(cols("card_trials")).toEqual(["fingerprint", "account_id"]);
  });

  it("keeps a (provider, subject) in one account", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0);
    const b = await addAccount(env, 0);
    const add = (id: string) => env.fake.sqlite.prepare("INSERT INTO identities (provider, subject, account_id, email) VALUES ('google', 's', ?, NULL)").run(id);
    add(a.id);
    expect(() => add(b.id)).toThrow();
  });

  it("keeps a top-up payment intent unique", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0);
    const add = () => env.fake.sqlite.prepare("INSERT INTO topups (id, account_id, remaining_usd, expires_at, stripe_payment_intent) VALUES (?, ?, 1, 1, 'pi_1')").run(crypto.randomUUID(), a.id);
    add();
    expect(() => add()).toThrow();
  });
});
