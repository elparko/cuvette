import { afterEach, describe, expect, it, vi } from "vitest";
import { PRICES } from "../src/pricing.ts";
import { DAY, OPENAI_MODEL, addAccount, addTopup, addUsage, call, makeEnv, makeOpenAiEnv, type TestEnv } from "./helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const NOW = new Date("2026-10-01T12:00:00Z");
const HOUR = 3_600_000;
const json = (res: Response) => res.json() as Promise<any>;
const get = (env: TestEnv, token: string, path: string) => call(env, path, { headers: { authorization: `Bearer ${token}` } });
const ALL = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-1"];

describe("GET /v1/account", () => {
  it("returns the fields of the contract for an account with a plan", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const env = makeEnv();
    const resets = NOW.getTime() + 20 * DAY;
    const end = NOW.getTime() + 25 * DAY;
    const a = await addAccount(env, 9.5, { plan: "standard", interval: "year", granted: 15, resetsAt: resets, periodEnd: end });
    env.fake.sqlite.prepare("INSERT INTO identities (provider, subject, account_id, email) VALUES ('google', 'g1', ?, 'ada@x.test'), ('orcid', 'o1', ?, NULL)").run(a.id, a.id);
    addTopup(env, a.id, 2.25);
    addTopup(env, a.id, 1.5);
    addTopup(env, a.id, 99, NOW.getTime() - 1);
    const { res } = await get(env, a.token, "/v1/account");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Object.keys(body).sort()).toEqual(
      ["account_id", "allowance_remaining_usd", "allowance_usd", "analyses_left_estimate", "identities", "interval", "mean_cost_per_analysis_usd", "models", "period_end", "plan", "resets_at", "sub_status", "topup_remaining_usd"].sort(),
    );
    expect(body).toEqual({
      account_id: a.id,
      identities: [{ provider: "google", email: "ada@x.test" }, { provider: "orcid", email: null }],
      plan: "standard",
      interval: "year",
      sub_status: "active",
      period_end: new Date(end).toISOString(),
      allowance_usd: 15,
      allowance_remaining_usd: 9.5,
      topup_remaining_usd: 3.75,
      analyses_left_estimate: Math.floor(13.25 / 0.62),
      mean_cost_per_analysis_usd: 0.62,
      resets_at: new Date(resets).toISOString(),
      models: ALL,
    });
  });

  it("returns the neutral values for an account with no plan", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    const body = await json((await get(env, a.token, "/v1/account")).res);
    expect(body).toEqual({
      account_id: a.id,
      identities: [],
      plan: "none",
      interval: null,
      sub_status: "none",
      period_end: null,
      allowance_usd: 0,
      allowance_remaining_usd: 0,
      topup_remaining_usd: 0,
      analyses_left_estimate: 0,
      mean_cost_per_analysis_usd: 0.62,
      resets_at: null,
      models: [],
    });
  });

  it("lists every model for an account that has only top-ups", async () => {
    const env = makeOpenAiEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    addTopup(env, a.id, 3.1);
    const body = await json((await get(env, a.token, "/v1/account")).res);
    expect(body.plan).toBe("none");
    expect(body.topup_remaining_usd).toBe(3.1);
    expect(body.models).toEqual([...ALL, OPENAI_MODEL]);
    expect(body.analyses_left_estimate).toBe(Math.floor(3.1 / 0.62));
  });

  it("lists the models of the plan", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 7, { plan: "basic", granted: 7 });
    expect((await json((await get(env, a.token, "/v1/account")).res)).models).toEqual(["claude-sonnet-5-5", "claude-haiku-5-5"]);
  });

  it("shows an allowance of 0 when it does not count", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 9, { plan: "standard", subStatus: "unpaid", granted: 15 });
    const body = await json((await get(env, a.token, "/v1/account")).res);
    expect(body.allowance_remaining_usd).toBe(0);
    expect(body.sub_status).toBe("unpaid");
    expect(body.analyses_left_estimate).toBe(0);
  });

  it("shows a negative allowance as 0", async () => {
    const env = makeEnv();
    const a = await addAccount(env, -0.5);
    expect((await json((await get(env, a.token, "/v1/account")).res)).allowance_remaining_usd).toBe(0);
  });

  it("shows only the identities of the account", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 1);
    const b = await addAccount(env, 1);
    env.fake.sqlite.prepare("INSERT INTO identities (provider, subject, account_id, email) VALUES ('google', 'g1', ?, 'a@x.test'), ('github', 'h1', ?, 'b@x.test')").run(a.id, b.id);
    expect((await json((await get(env, a.token, "/v1/account")).res)).identities).toEqual([{ provider: "google", email: "a@x.test" }]);
  });

  it("does not return the token hash, the customer id or the subscription id", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5, { customer: "cus_secret", subscription: "sub_secret" });
    const text = await (await get(env, a.token, "/v1/account")).res.text();
    for (const hidden of ["cus_secret", "sub_secret", "token_hash", "stripe"]) expect(text).not.toContain(hidden);
  });

  describe("analyses_left_estimate", () => {
    const session = (env: TestEnv, id: string, account: string, cost: number, at = new Date(), requests = 1) => {
      for (let i = 0; i < requests; i++) addUsage(env, account, cost / requests, new Date(at.getTime() + i), id);
    };

    it("uses 0.62 dollars for fewer than three sessions", async () => {
      const env = makeEnv();
      const a = await addAccount(env, 12.4);
      session(env, "s1", a.id, 5);
      session(env, "s2", a.id, 5);
      const body = await json((await get(env, a.token, "/v1/account")).res);
      expect(body.mean_cost_per_analysis_usd).toBe(0.62);
      expect(body.analyses_left_estimate).toBe(20);
    });

    it("uses the mean cost of the sessions from three on", async () => {
      const env = makeEnv();
      const a = await addAccount(env, 9);
      session(env, "s1", a.id, 1, new Date(), 3);
      session(env, "s2", a.id, 2);
      session(env, "s3", a.id, 3);
      const body = await json((await get(env, a.token, "/v1/account")).res);
      expect(body.mean_cost_per_analysis_usd).toBe(2);
      expect(body.analyses_left_estimate).toBe(4);
    });

    it("uses the last 20 sessions only", async () => {
      const env = makeEnv();
      const a = await addAccount(env, 30);
      for (let i = 0; i < 5; i++) session(env, `old${i}`, a.id, 100, new Date(NOW.getTime() - 10 * DAY + i));
      for (let i = 0; i < 20; i++) session(env, `new${i}`, a.id, 1, new Date(NOW.getTime() - HOUR + i));
      const body = await json((await get(env, a.token, "/v1/account")).res);
      expect(body.mean_cost_per_analysis_usd).toBe(1);
      expect(body.analyses_left_estimate).toBe(30);
    });

    it("ignores rows with no session id and rows that cost nothing because the request failed", async () => {
      const env = makeEnv();
      const a = await addAccount(env, 10);
      addUsage(env, a.id, 50);
      addUsage(env, a.id, 50);
      addUsage(env, a.id, 50);
      for (let i = 0; i < 3; i++) env.fake.sqlite.prepare("INSERT INTO usage (request_id, account_id, session_id, model, status, cost_usd, at) VALUES (?, ?, 'sf', 'm', 'rejected', 0, ?)").run(`r${i}`, a.id, new Date().toISOString());
      expect((await json((await get(env, a.token, "/v1/account")).res)).mean_cost_per_analysis_usd).toBe(0.62);
    });

    it("uses the sessions of the account only", async () => {
      const env = makeEnv();
      const a = await addAccount(env, 10);
      const b = await addAccount(env, 10);
      for (let i = 0; i < 4; i++) session(env, `s${i}`, b.id, 10);
      expect((await json((await get(env, a.token, "/v1/account")).res)).mean_cost_per_analysis_usd).toBe(0.62);
    });

    it("uses 0.62 dollars when the mean cost is 0", async () => {
      const env = makeEnv();
      const a = await addAccount(env, 6.2);
      for (let i = 0; i < 4; i++) session(env, `s${i}`, a.id, 0);
      const body = await json((await get(env, a.token, "/v1/account")).res);
      expect(body.mean_cost_per_analysis_usd).toBe(0.62);
      expect(body.analyses_left_estimate).toBe(10);
    });
  });
});

describe("GET /v1/usage", () => {
  const range = (from: string, to: string, extra = "") => `/v1/usage?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${extra}`;

  function seed(env: TestEnv, id: string) {
    env.fake.sqlite
      .prepare("INSERT INTO usage (request_id, account_id, session_id, model, status, input_tokens, output_tokens, cache_read_tokens, cache_write_5m_tokens, cache_write_1h_tokens, cost_usd, topup_cost_usd, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run("r1", id, "sess-a", "claude-sonnet-5-5", "ok", 100, 200, 1000, 400, 300, 0.5, 0, "2026-09-30T10:00:00.000Z");
    env.fake.sqlite
      .prepare("INSERT INTO usage (request_id, account_id, session_id, model, status, input_tokens, output_tokens, cache_read_tokens, cache_write_5m_tokens, cache_write_1h_tokens, cost_usd, topup_cost_usd, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run("r2", id, "sess-a", "claude-haiku-5-5", "cut", 10, 20, 0, 0, 0, 0.25, 0.1, "2026-09-30T11:00:00.000Z");
    env.fake.sqlite
      .prepare("INSERT INTO usage (request_id, account_id, session_id, model, status, input_tokens, output_tokens, cache_read_tokens, cache_write_5m_tokens, cache_write_1h_tokens, cost_usd, topup_cost_usd, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run("r3", id, null, "claude-sonnet-5-5", "ok", 1, 2, 0, 0, 0, 0.125, 0.125, "2026-09-30T12:00:00.000Z");
    env.fake.sqlite
      .prepare("INSERT INTO usage (request_id, account_id, session_id, model, status, input_tokens, output_tokens, cache_read_tokens, cache_write_5m_tokens, cache_write_1h_tokens, cost_usd, topup_cost_usd, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run("r4", id, "sess-b", "claude-sonnet-5-5", "ok", 5, 5, 0, 0, 0, 0.0625, 0, "2026-09-29T09:00:00.000Z");
    env.fake.sqlite.prepare("INSERT INTO usage (request_id, account_id, session_id, model, status, cost_usd, at) VALUES ('r5', ?, 'sess-a', 'm', 'rejected', 0, '2026-09-30T13:00:00.000Z')").run(id);
  }

  it("returns the rows and the sessions of the contract", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    seed(env, a.id);
    const { res } = await get(env, a.token, range("2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await json(res);
    expect(body.rows).toEqual([
      { at: "2026-09-29T09:00:00.000Z", session_id: "sess-b", model: "claude-sonnet-5-5", input_tokens: 5, output_tokens: 5, cache_write_tokens: 0, cache_read_tokens: 0, cost_usd: 0.0625, paid_from: "allowance" },
      { at: "2026-09-30T10:00:00.000Z", session_id: "sess-a", model: "claude-sonnet-5-5", input_tokens: 100, output_tokens: 200, cache_write_tokens: 700, cache_read_tokens: 1000, cost_usd: 0.5, paid_from: "allowance" },
      { at: "2026-09-30T11:00:00.000Z", session_id: "sess-a", model: "claude-haiku-5-5", input_tokens: 10, output_tokens: 20, cache_write_tokens: 0, cache_read_tokens: 0, cost_usd: 0.25, paid_from: "topup" },
      { at: "2026-09-30T12:00:00.000Z", session_id: null, model: "claude-sonnet-5-5", input_tokens: 1, output_tokens: 2, cache_write_tokens: 0, cache_read_tokens: 0, cost_usd: 0.125, paid_from: "topup" },
    ]);
    expect(body.sessions).toEqual([
      { session_id: "sess-b", started_at: "2026-09-29T09:00:00.000Z", requests: 1, cost_usd: 0.0625 },
      { session_id: "sess-a", started_at: "2026-09-30T10:00:00.000Z", requests: 2, cost_usd: 0.75 },
    ]);
  });

  it("takes the start and excludes the end", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    seed(env, a.id);
    const body = await json((await get(env, a.token, range("2026-09-30T10:00:00.000Z", "2026-09-30T12:00:00.000Z"))).res);
    expect(body.rows.map((r: any) => r.at)).toEqual(["2026-09-30T10:00:00.000Z", "2026-09-30T11:00:00.000Z"]);
  });

  it("returns the rows of the account only", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    const b = await addAccount(env, 5);
    seed(env, a.id);
    const body = await json((await get(env, b.token, range("2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z"))).res);
    expect(body).toEqual({ rows: [], sessions: [] });
  });

  it("uses the last 30 days when from and to are missing", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const env = makeEnv();
    const a = await addAccount(env, 5);
    addUsage(env, a.id, 1, new Date(NOW.getTime() - 29 * DAY));
    addUsage(env, a.id, 2, new Date(NOW.getTime() - 31 * DAY));
    const body = await json((await get(env, a.token, "/v1/usage")).res);
    expect(body.rows.map((r: any) => r.cost_usd)).toEqual([1]);
  });

  it("accepts a range of 90 days and rejects a longer one", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    expect((await get(env, a.token, range("2026-07-03T00:00:00Z", "2026-10-01T00:00:00Z"))).res.status).toBe(200);
    const long = await get(env, a.token, range("2026-07-02T23:59:59Z", "2026-10-01T00:00:00Z"));
    expect(long.res.status).toBe(400);
    expect((await json(long.res)).error.type).toBe("invalid_request_error");
    expect((await get(env, a.token, "/v1/usage?from=2026-01-01T00:00:00Z&to=2026-10-01T00:00:00Z")).res.status).toBe(400);
  });

  it("rejects dates that are not valid and a range that is not forward", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    for (const q of ["from=yesterday&to=2026-10-01T00:00:00Z", "from=2026-09-01T00:00:00Z&to=never", "from=2026-10-01T00:00:00Z&to=2026-09-01T00:00:00Z", "from=2026-10-01T00:00:00Z&to=2026-10-01T00:00:00Z", "from=&to="]) {
      expect((await get(env, a.token, `/v1/usage?${q}`)).res.status, q).toBe(400);
    }
  });

  it("returns a CSV file with a header row and one line for each request", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    seed(env, a.id);
    const { res } = await get(env, a.token, range("2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z", "&format=csv"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    const lines = (await res.text()).split("\r\n");
    expect(lines[0]).toBe("at,session_id,model,input_tokens,output_tokens,cache_write_tokens,cache_read_tokens,cost_usd,paid_from");
    expect(lines[1]).toBe("2026-09-29T09:00:00.000Z,sess-b,claude-sonnet-5-5,5,5,0,0,0.0625,allowance");
    expect(lines[4]).toBe("2026-09-30T12:00:00.000Z,,claude-sonnet-5-5,1,2,0,0,0.125,topup");
    expect(lines).toHaveLength(6);
    expect(lines[5]).toBe("");
  });

  it("quotes a CSV value that has a comma or a quote", async () => {
    const env = makeEnv({ UPSTREAMS: JSON.stringify({ 'my,"model"': { kind: "openai", base_url: "https://h.test/v1", key_secret_name: "K", upstream_model: "u", price: { input: 1, output: 1 }, max_output_tokens: 10 } }) });
    const a = await addAccount(env, 5);
    addUsage(env, a.id, 1, new Date("2026-09-30T10:00:00Z"), null, 0, 'my,"model"');
    const text = await (await get(env, a.token, range("2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z", "&format=csv"))).res.text();
    expect(text.split("\r\n")[1]).toContain('"my,""model"""');
  });

  it("rejects an unknown format and needs a token", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    expect((await get(env, a.token, "/v1/usage?format=xml")).res.status).toBe(400);
    expect((await call(env, "/v1/usage")).res.status).toBe(401);
    expect((await get(env, a.token, "/v1/usage?format=json")).res.status).toBe(200);
  });

  it("shows the list price cost and not a changed cost", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    addUsage(env, a.id, 0.012, new Date("2026-09-30T10:00:00Z"));
    const body = await json((await get(env, a.token, range("2026-09-01T00:00:00Z", "2026-10-01T00:00:00Z"))).res);
    expect(body.rows[0].cost_usd).toBe(0.012);
  });
});

describe("GET /v1/pricing", () => {
  it("answers without a token", async () => {
    const env = makeEnv();
    const { res } = await call(env, "/v1/pricing");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("max-age");
  });

  it("returns the plans, the top-up, the model prices and the records", async () => {
    const env = makeEnv();
    const body = await json((await call(env, "/v1/pricing")).res);
    expect(Object.keys(body).sort()).toEqual(["model_prices_per_million", "never_stored", "plans", "records", "topup"]);
    expect(body.plans).toEqual([
      { id: "basic", price_usd_month: 10, price_usd_year: 100, allowance_usd: 7, models: ["claude-sonnet-5-5", "claude-haiku-5-5"] },
      { id: "standard", price_usd_month: 20, price_usd_year: 200, allowance_usd: 15, models: ALL },
      { id: "lab", price_usd_month: 60, price_usd_year: 600, allowance_usd: 46, models: ALL },
      { id: "lab_plus", price_usd_month: 150, price_usd_year: 1500, allowance_usd: 118, models: ALL },
    ]);
    expect(body.topup).toEqual({ price_usd: 10, allowance_usd: 8 });
    expect(body.records).toEqual(["token counts", "model", "time", "session id"]);
    expect(body.never_stored).toEqual(["prompts", "images", "results"]);
    for (const [model, p] of Object.entries(PRICES)) {
      expect(body.model_prices_per_million[model]).toEqual({ input: p.input, output: p.output, cache_write_5m: p.cacheWrite5m, cache_write_1h: p.cacheWrite1h, cache_read: p.cacheRead });
    }
  });

  it("lists the models of an extra host in the prices and in the plans for every model", async () => {
    const env = makeOpenAiEnv();
    const body = await json((await call(env, "/v1/pricing")).res);
    expect(body.model_prices_per_million[OPENAI_MODEL]).toEqual({ input: 1, output: 4, cache_write_5m: 0, cache_write_1h: 0, cache_read: 0.1 });
    expect(body.plans[1].models).toContain(OPENAI_MODEL);
    expect(body.plans[0].models).not.toContain(OPENAI_MODEL);
  });

  it("does not show a Stripe id, a host address or a key", async () => {
    const env = makeOpenAiEnv();
    const text = await (await call(env, "/v1/pricing")).res.text();
    for (const hidden of ["price_standard", "price_topup", "llm.example.test", "vendor/real-model", "HOST_API_KEY", "sk_test", "whsec", "stripe"]) expect(text).not.toContain(hidden);
  });

  it("answers while hosted mode is off", async () => {
    const env = makeEnv({ HOSTED_ENABLED: "false" });
    expect((await call(env, "/v1/pricing")).res.status).toBe(200);
  });

  it("answers 500 without details when the config is not valid", async () => {
    const env = makeEnv({ PLANS: "{nope" });
    const { res } = await call(env, "/v1/pricing");
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("PLANS");
  });
});

describe("GET /v1/admin/costs", () => {
  const costs = (env: TestEnv, token?: string) => call(env, "/v1/admin/costs", { headers: token === undefined ? {} : { authorization: `Bearer ${token}` } });

  it("answers 401 without the admin secret, with a wrong one, or when none is set", async () => {
    const env = makeEnv();
    expect((await costs(env)).res.status).toBe(401);
    expect((await costs(env, "wrong")).res.status).toBe(401);
    expect((await costs(env, "admin-secret-valu")).res.status).toBe(401);
    expect((await costs(env, "admin-secret-value-")).res.status).toBe(401);
    const none = makeEnv({ ADMIN_SECRET: undefined });
    expect((await costs(none, "")).res.status).toBe(401);
    expect((await costs(none, "undefined")).res.status).toBe(401);
  });

  it("does not accept a device token", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5);
    expect((await costs(env, a.token)).res.status).toBe(401);
  });

  it("returns the mean cost for each session and for each plan over 30 days", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const env = makeEnv();
    const std = await addAccount(env, 5, { plan: "standard" });
    const std2 = await addAccount(env, 5, { plan: "standard" });
    const lab = await addAccount(env, 5, { plan: "lab" });
    const recent = new Date(NOW.getTime() - DAY);
    addUsage(env, std.id, 1, recent, "a");
    addUsage(env, std.id, 1, recent, "a");
    addUsage(env, std.id, 4, recent, "b");
    addUsage(env, std2.id, 3, recent, "a");
    addUsage(env, lab.id, 10, recent, "a");
    addUsage(env, lab.id, 500, new Date(NOW.getTime() - 40 * DAY), "old");
    addUsage(env, lab.id, 500, recent, null);
    const { res } = await costs(env, "admin-secret-value");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.since).toBe(new Date(NOW.getTime() - 30 * DAY).toISOString());
    expect(body.sessions).toBe(4);
    expect(body.mean_cost_per_session_usd).toBe(4.75);
    expect(body.plans).toEqual([
      { plan: "lab", accounts: 1, sessions: 1, mean_cost_per_session_usd: 10 },
      { plan: "standard", accounts: 2, sessions: 3, mean_cost_per_session_usd: 3 },
    ]);
  });

  it("returns 0 when there are no sessions", async () => {
    const env = makeEnv();
    const body = await json((await costs(env, "admin-secret-value")).res);
    expect(body).toMatchObject({ sessions: 0, mean_cost_per_session_usd: 0, plans: [] });
  });
});
