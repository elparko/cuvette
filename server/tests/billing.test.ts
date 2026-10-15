import { afterEach, describe, expect, it, vi } from "vitest";
import { DAY, addAccount, addTopup, balanceOf, call, event, hmac, makeEnv, post, send, sendRaw, stripeMock, topupsOf, type TestEnv } from "./helpers.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const NOW = new Date("2026-10-01T12:00:00Z");
const sec = (ms: number) => Math.floor(ms / 1000);
const form = (body: string) => new URLSearchParams(body);
const json = (res: Response) => res.json() as Promise<any>;
const acc = (env: TestEnv, id: string) => env.fake.row<any>("SELECT * FROM accounts WHERE id = ?", id);

function freeze(): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
}

describe("POST /v1/checkout", () => {
  const customerRoute = { "POST /customers": () => ({ id: "cus_new" }) };

  it("creates one Stripe customer with the account id as idempotency key, then a subscription session with a trial", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    env.fake.sqlite.prepare("INSERT INTO identities (provider, subject, account_id, email) VALUES ('google', 's1', ?, 'ada@x.test')").run(a.id);
    const calls = stripeMock({ ...customerRoute, "POST /checkout/sessions": () => ({ id: "cs_1", url: "https://checkout.stripe.com/c/cs_1" }) });
    const { res } = await call(env, "/v1/checkout", post(a.token, { plan: "standard", interval: "month" }));
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ url: "https://checkout.stripe.com/c/cs_1" });
    expect(calls).toHaveLength(2);
    expect(calls[0]!.url).toBe("https://api.stripe.com/v1/customers");
    expect(calls[0]!.headers.get("idempotency-key")).toBe(a.id);
    expect(calls[0]!.headers.get("authorization")).toBe("Bearer sk_test_123");
    expect(form(calls[0]!.body).get("metadata[account_id]")).toBe(a.id);
    expect(form(calls[0]!.body).get("email")).toBe("ada@x.test");
    const f = form(calls[1]!.body);
    expect(calls[1]!.headers.get("content-type")).toBe("application/x-www-form-urlencoded");
    expect(f.get("mode")).toBe("subscription");
    expect(f.get("customer")).toBe("cus_new");
    expect(f.get("client_reference_id")).toBe(a.id);
    expect(f.get("line_items[0][price]")).toBe("price_standard_m");
    expect(f.get("line_items[0][quantity]")).toBe("1");
    expect(f.get("subscription_data[trial_period_days]")).toBe("7");
    expect(f.get("payment_method_collection")).toBe("always");
    expect(f.get("payment_method_types[0]")).toBe("card");
    expect(f.get("metadata[trial]")).toBe("1");
    expect(f.get("success_url")).toBe("https://cuvette.test/account?checkout=done");
    expect(f.get("cancel_url")).toBe("https://cuvette.test/account?checkout=cancelled");
    expect(acc(env, a.id).stripe_customer_id).toBe("cus_new");
  });

  it("uses the yearly price and gives no trial for a plan other than Standard", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1" });
    const calls = stripeMock({ "POST /checkout/sessions": () => ({ url: "https://checkout.stripe.com/x" }) });
    await call(env, "/v1/checkout", post(a.token, { plan: "lab", interval: "year" }));
    const f = form(calls[0]!.body);
    expect(f.get("line_items[0][price]")).toBe("price_lab_y");
    expect(f.get("subscription_data[trial_period_days]")).toBeNull();
    expect(f.get("payment_method_collection")).toBeNull();
    expect(f.get("metadata[trial]")).toBeNull();
    expect(f.get("customer")).toBe("cus_1");
  });

  it("gives a trial on the yearly Standard price too", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1" });
    const calls = stripeMock({ "POST /checkout/sessions": () => ({ url: "https://checkout.stripe.com/x" }) });
    await call(env, "/v1/checkout", post(a.token, { plan: "standard", interval: "year" }));
    expect(form(calls[0]!.body).get("line_items[0][price]")).toBe("price_standard_y");
    expect(form(calls[0]!.body).get("subscription_data[trial_period_days]")).toBe("7");
  });

  it("gives no trial to an account with an earlier subscription", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1", subscription: "sub_old", subStatus: "canceled" });
    const calls = stripeMock({ "POST /checkout/sessions": () => ({ url: "https://checkout.stripe.com/x" }) });
    const { res } = await call(env, "/v1/checkout", post(a.token, { plan: "standard", interval: "month" }));
    expect(res.status).toBe(200);
    expect(form(calls[0]!.body).get("subscription_data[trial_period_days]")).toBeNull();
  });

  for (const subStatus of ["active", "trialing", "past_due"]) {
    it(`answers 409 already_subscribed for the status ${subStatus}`, async () => {
      const env = makeEnv();
      const a = await addAccount(env, 5, { subStatus, customer: "cus_1", subscription: "sub_1" });
      const calls = stripeMock({});
      const { res } = await call(env, "/v1/checkout", post(a.token, { plan: "lab", interval: "month" }));
      expect(res.status).toBe(409);
      const body = await json(res);
      expect(body.type).toBe("error");
      expect(body.error.type).toBe("already_subscribed");
      expect(calls).toHaveLength(0);
    });
  }

  for (const subStatus of ["none", "canceled", "unpaid"]) {
    it(`allows a new subscription for the status ${subStatus}`, async () => {
      const env = makeEnv();
      const a = await addAccount(env, 0, { plan: "none", subStatus, customer: "cus_1" });
      stripeMock({ "POST /checkout/sessions": () => ({ url: "https://checkout.stripe.com/x" }) });
      expect((await call(env, "/v1/checkout", post(a.token, { plan: "basic", interval: "month" }))).res.status).toBe(200);
    });
  }

  it("creates a payment session for a top-up from the price in the config", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1" });
    const calls = stripeMock({ "POST /checkout/sessions": () => ({ url: "https://checkout.stripe.com/topup" }) });
    const { res } = await call(env, "/v1/checkout", post(a.token, { topup: true, amount_usd: 1, price: "price_cheap" }));
    expect(res.status).toBe(200);
    const f = form(calls[0]!.body);
    expect(f.get("mode")).toBe("payment");
    expect(f.get("line_items[0][price]")).toBe("price_topup");
    expect(f.get("metadata[kind]")).toBe("topup");
    expect(f.get("client_reference_id")).toBe(a.id);
    expect(calls[0]!.body).not.toContain("price_cheap");
    expect(calls[0]!.body).not.toContain("unit_amount");
  });

  it("allows a top-up for an account with an active subscription", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5, { customer: "cus_1", subscription: "sub_1" });
    stripeMock({ "POST /checkout/sessions": () => ({ url: "https://checkout.stripe.com/topup" }) });
    expect((await call(env, "/v1/checkout", post(a.token, { topup: true }))).res.status).toBe(200);
  });

  it("rejects a body without a known plan and interval", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1" });
    const calls = stripeMock({});
    for (const body of [{}, { plan: "gold", interval: "month" }, { plan: "basic" }, { plan: "basic", interval: "week" }, { plan: "constructor", interval: "month" }, { plan: 5, interval: "month" }, { topup: "yes" }, "nope"]) {
      expect((await call(env, "/v1/checkout", post(a.token, body as any))).res.status, JSON.stringify(body)).toBe(400);
    }
    expect(calls).toHaveLength(0);
  });

  it("keeps one customer when two checkouts start at the same time", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    stripeMock({ "POST /customers": () => ({ id: "cus_same" }), "POST /checkout/sessions": () => ({ url: "https://checkout.stripe.com/x" }) });
    const results = await Promise.all([call(env, "/v1/checkout", post(a.token, { topup: true })), call(env, "/v1/checkout", post(a.token, { plan: "basic", interval: "month" }))]);
    expect(results.map((r) => r.res.status)).toEqual([200, 200]);
    expect(acc(env, a.id).stripe_customer_id).toBe("cus_same");
  });

  it("requires a token and answers 502 when Stripe fails", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1" });
    stripeMock({ "POST /checkout/sessions": () => new Response("{}", { status: 500 }) });
    expect((await call(env, "/v1/checkout", post(undefined, { topup: true }))).res.status).toBe(401);
    const { res } = await call(env, "/v1/checkout", post(a.token, { topup: true }));
    expect(res.status).toBe(502);
    expect((await json(res)).error.type).toBe("api_error");
  });

  it("answers 502 when Stripe sends no URL", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1" });
    stripeMock({ "POST /checkout/sessions": () => ({ id: "cs" }) });
    expect((await call(env, "/v1/checkout", post(a.token, { topup: true }))).res.status).toBe(502);
  });
});

describe("POST /v1/billing/portal", () => {
  it("returns a portal address for the customer of the account", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5, { customer: "cus_9" });
    const calls = stripeMock({ "POST /billing_portal/sessions": () => ({ url: "https://billing.stripe.com/p/session" }) });
    const { res } = await call(env, "/v1/billing/portal", post(a.token, {}));
    expect(await json(res)).toEqual({ url: "https://billing.stripe.com/p/session" });
    const f = form(calls[0]!.body);
    expect(f.get("customer")).toBe("cus_9");
    expect(f.get("return_url")).toBe("https://cuvette.test/account");
  });

  it("makes a customer first when the account has none", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    const calls = stripeMock({ "POST /customers": () => ({ id: "cus_n" }), "POST /billing_portal/sessions": () => ({ url: "https://billing.stripe.com/p/x" }) });
    expect((await call(env, "/v1/billing/portal", post(a.token, {}))).res.status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(form(calls[1]!.body).get("customer")).toBe("cus_n");
  });

  it("answers 502 when Stripe fails and 401 without a token", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 5, { customer: "cus_9" });
    stripeMock({ "POST /billing_portal/sessions": () => new Response("{}", { status: 400 }) });
    expect((await call(env, "/v1/billing/portal", post(a.token, {}))).res.status).toBe(502);
    expect((await call(env, "/v1/billing/portal", post(undefined, {}))).res.status).toBe(401);
  });
});

describe("POST /v1/plan", () => {
  const sub = (over: Record<string, unknown> = {}) => ({ id: "sub_1", schedule: null, items: { data: [{ id: "si_1", price: { id: "price_standard_m" } }] }, ...over });
  const schedule = (id = "sched_1", price = "price_standard_m") => ({ id, phases: [{ start_date: 1000, end_date: sec(NOW.getTime() + 10 * DAY), items: [{ price, quantity: 1 }] }] });
  const standard = (env: TestEnv, over: Record<string, unknown> = {}) => addAccount(env, 9, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1", ...over });

  it("upgrades now with an invoice for the proration and changes nothing in the database", async () => {
    freeze();
    const env = makeEnv();
    const a = await standard(env);
    const calls = stripeMock({ "GET /subscriptions/sub_1": () => sub(), "POST /subscriptions/sub_1": () => ({}) });
    const { res } = await call(env, "/v1/plan", post(a.token, { plan: "lab", interval: "month" }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toBe("changed");
    expect(body.effective_at).toBe(NOW.toISOString());
    const f = form(calls[1]!.body);
    expect(f.get("items[0][id]")).toBe("si_1");
    expect(f.get("items[0][price]")).toBe("price_lab_m");
    expect(f.get("proration_behavior")).toBe("always_invoice");
    expect(f.get("payment_behavior")).toBe("error_if_incomplete");
    expect(acc(env, a.id).plan).toBe("standard");
    expect(balanceOf(env, a.id)).toBe(9);
  });

  it("treats a change from monthly to yearly on the same plan as an upgrade", async () => {
    const env = makeEnv();
    const a = await standard(env);
    const calls = stripeMock({ "GET /subscriptions/sub_1": () => sub(), "POST /subscriptions/sub_1": () => ({}) });
    const body = await json((await call(env, "/v1/plan", post(a.token, { plan: "standard", interval: "year" }))).res);
    expect(body.status).toBe("changed");
    expect(form(calls[1]!.body).get("items[0][price]")).toBe("price_standard_y");
  });

  it("releases a schedule before it upgrades", async () => {
    const env = makeEnv();
    const a = await standard(env);
    const calls = stripeMock({
      "GET /subscriptions/sub_1": () => sub({ schedule: "sched_9" }),
      "POST /subscription_schedules/sched_9/release": () => ({}),
      "POST /subscriptions/sub_1": () => ({}),
    });
    expect((await call(env, "/v1/plan", post(a.token, { plan: "lab", interval: "month" }))).res.status).toBe(200);
    expect(calls.map((c) => c.url.replace("https://api.stripe.com/v1", ""))).toEqual(["/subscriptions/sub_1", "/subscription_schedules/sched_9/release", "/subscriptions/sub_1"]);
  });

  it("schedules a downgrade at the period end with no credit", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 40, { plan: "lab", granted: 46, customer: "cus_1", subscription: "sub_1" });
    const calls = stripeMock({
      "GET /subscriptions/sub_1": () => sub({ items: { data: [{ id: "si_1", price: { id: "price_lab_m" } }] } }),
      "POST /subscription_schedules": () => schedule("sched_1", "price_lab_m"),
      "POST /subscription_schedules/sched_1": () => ({}),
    });
    const { res } = await call(env, "/v1/plan", post(a.token, { plan: "standard", interval: "month" }));
    const body = await json(res);
    expect(body).toEqual({ status: "scheduled", effective_at: new Date(sec(NOW.getTime() + 10 * DAY) * 1000).toISOString() });
    expect(form(calls[1]!.body).get("from_subscription")).toBe("sub_1");
    const f = form(calls[2]!.body);
    expect(f.get("end_behavior")).toBe("release");
    expect(f.get("proration_behavior")).toBe("none");
    expect(f.get("phases[0][items][0][price]")).toBe("price_lab_m");
    expect(f.get("phases[0][start_date]")).toBe("1000");
    expect(f.get("phases[0][end_date]")).toBe(String(sec(NOW.getTime() + 10 * DAY)));
    expect(f.get("phases[1][items][0][price]")).toBe("price_standard_m");
    expect(acc(env, a.id).plan).toBe("lab");
    expect(balanceOf(env, a.id)).toBe(40);
  });

  it("changes the next phase of a schedule that exists already", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 40, { plan: "lab", granted: 46, customer: "cus_1", subscription: "sub_1" });
    const calls = stripeMock({
      "GET /subscriptions/sub_1": () => sub({ schedule: { id: "sched_7" } }),
      "GET /subscription_schedules/sched_7": () => schedule("sched_7", "price_lab_m"),
      "POST /subscription_schedules/sched_7": () => ({}),
    });
    const { res } = await call(env, "/v1/plan", post(a.token, { plan: "basic", interval: "month" }));
    expect((await json(res)).status).toBe("scheduled");
    expect(calls.some((c) => c.url.endsWith("/subscription_schedules") && c.init.method === "POST")).toBe(false);
    expect(form(calls[2]!.body).get("phases[1][items][0][price]")).toBe("price_basic_m");
  });

  it("schedules a change from yearly to monthly on the same plan", async () => {
    const env = makeEnv();
    const a = await standard(env, { interval: "year" });
    stripeMock({
      "GET /subscriptions/sub_1": () => sub(),
      "POST /subscription_schedules": () => schedule(),
      "POST /subscription_schedules/sched_1": () => ({}),
    });
    expect((await json((await call(env, "/v1/plan", post(a.token, { plan: "standard", interval: "month" }))).res)).status).toBe("scheduled");
  });

  it("rejects the plan the account has now, an unknown plan, and a bad interval", async () => {
    const env = makeEnv();
    const a = await standard(env);
    const calls = stripeMock({});
    for (const body of [{ plan: "standard", interval: "month" }, { plan: "gold", interval: "month" }, { plan: "lab", interval: "day" }, {}, "x"]) {
      expect((await call(env, "/v1/plan", post(a.token, body as any))).res.status, JSON.stringify(body)).toBe(400);
    }
    expect(calls).toHaveLength(0);
  });

  it("answers 403 no_plan for an account with no subscription or with a past due subscription", async () => {
    const env = makeEnv();
    const none = await addAccount(env, 0, { plan: "none" });
    const late = await standard(env, { subStatus: "past_due" });
    stripeMock({});
    for (const t of [none.token, late.token]) {
      const { res } = await call(env, "/v1/plan", post(t, { plan: "lab", interval: "month" }));
      expect(res.status).toBe(403);
      expect((await json(res)).error.type).toBe("no_plan");
    }
  });

  it("answers 409 during a trial", async () => {
    const env = makeEnv();
    const a = await standard(env, { subStatus: "trialing" });
    const calls = stripeMock({});
    const { res } = await call(env, "/v1/plan", post(a.token, { plan: "lab", interval: "month" }));
    expect(res.status).toBe(409);
    expect((await json(res)).error.type).toBe("trial_in_progress");
    expect(calls).toHaveLength(0);
  });

  it("answers 502 when Stripe refuses the change", async () => {
    const env = makeEnv();
    const a = await standard(env);
    stripeMock({ "GET /subscriptions/sub_1": () => sub(), "POST /subscriptions/sub_1": () => new Response(JSON.stringify({ error: { code: "card_declined" } }), { status: 402 }) });
    const { res } = await call(env, "/v1/plan", post(a.token, { plan: "lab", interval: "month" }));
    expect(res.status).toBe(502);
    expect(acc(env, a.id).plan).toBe("standard");
  });
});

describe("webhook signature", () => {
  const topupSession = (account: string, over: Record<string, unknown> = {}) => ({ id: "cs_1", mode: "payment", payment_status: "paid", currency: "usd", client_reference_id: account, payment_intent: "pi_1", metadata: { kind: "topup" }, ...over });

  it("accepts a good signature", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    const res = await send(env, event("checkout.session.completed", topupSession(a.id)));
    expect(res.status).toBe(200);
    expect(topupsOf(env, a.id)).toBe(8);
  });

  it("accepts any v1 value that matches", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    const body = JSON.stringify(event("checkout.session.completed", topupSession(a.id)));
    const ts = Math.floor(Date.now() / 1000);
    const good = await hmac("whsec_test", `${ts}.${body}`);
    const res = await sendRaw(env, body, `t=${ts},v1=${"0".repeat(64)},v0=abc,v1=${good}`);
    expect(res.status).toBe(200);
    expect(topupsOf(env, a.id)).toBe(8);
  });

  it("rejects a wrong secret, a changed body, an old time, and a missing or broken header", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    const body = JSON.stringify(event("checkout.session.completed", topupSession(a.id)));
    const ts = Math.floor(Date.now() / 1000);
    expect((await sendRaw(env, body, undefined, "whsec_other")).status).toBe(400);
    expect((await sendRaw(env, body.replace("pi_1", "pi_2"), `t=${ts},v1=${await hmac("whsec_test", `${ts}.${body}`)}`)).status).toBe(400);
    expect((await sendRaw(env, body, undefined, "whsec_test", ts - 400)).status).toBe(400);
    expect((await sendRaw(env, body, null)).status).toBe(400);
    expect((await sendRaw(env, body, "garbage")).status).toBe(400);
    expect((await sendRaw(env, body, `t=${ts}`)).status).toBe(400);
    expect((await sendRaw(env, body, `t=${ts},v1=zz`)).status).toBe(400);
    expect(topupsOf(env, a.id)).toBe(0);
    expect(env.fake.rows("SELECT * FROM stripe_events")).toHaveLength(0);
  });

  it("rejects a body that is not JSON or has no event id", async () => {
    const env = makeEnv();
    expect((await sendRaw(env, "not json")).status).toBe(400);
    expect((await sendRaw(env, JSON.stringify({ type: "invoice.paid" }))).status).toBe(400);
    expect((await sendRaw(env, JSON.stringify({ id: 5, type: "invoice.paid" }))).status).toBe(400);
    expect((await sendRaw(env, "null")).status).toBe(400);
  });

  it("answers 200 and ignores an event type that the server does not use", async () => {
    const env = makeEnv();
    const res = await send(env, event("customer.created", { id: "cus_1" }));
    expect(res.status).toBe(200);
    expect((await json(res)).ignored).toBe(true);
    expect(env.fake.rows("SELECT * FROM stripe_events")).toHaveLength(0);
  });
});

describe("webhook: top-up", () => {
  const session = (account: string, over: Record<string, unknown> = {}) => ({ id: "cs_1", mode: "payment", payment_status: "paid", currency: "usd", client_reference_id: account, payment_intent: "pi_1", metadata: { kind: "topup" }, ...over });

  it("adds a top-up of the allowance in the config with a 12 month expiry", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    const e = event("checkout.session.completed", session(a.id));
    expect((await send(env, e)).status).toBe(200);
    expect(env.fake.row("SELECT * FROM topups")).toEqual({ id: "tu_cs_1", account_id: a.id, remaining_usd: 8, expires_at: Date.parse("2027-10-01T12:00:00Z"), stripe_payment_intent: "pi_1" });
    expect(env.fake.row("SELECT * FROM stripe_events")).toEqual({ event_id: e.id });
  });

  it("ignores a duplicate event id", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    const e = event("checkout.session.completed", session(a.id));
    expect((await send(env, e)).status).toBe(200);
    const again = await send(env, e);
    expect(again.status).toBe(200);
    expect((await json(again)).duplicate).toBe(true);
    expect(topupsOf(env, a.id)).toBe(8);
    expect(env.fake.rows("SELECT * FROM topups")).toHaveLength(1);
  });

  it("adds the top-up once when the same event arrives twice at the same time", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    const e = event("checkout.session.completed", session(a.id));
    const results = await Promise.all([send(env, e), send(env, e)]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(topupsOf(env, a.id)).toBe(8);
  });

  it("adds nothing for a second event of the same session", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    await send(env, event("checkout.session.completed", session(a.id)));
    await send(env, event("checkout.session.async_payment_succeeded", session(a.id)));
    expect(topupsOf(env, a.id)).toBe(8);
  });

  it("waits for an unpaid session and adds the top-up on async_payment_succeeded", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    const unpaid = await send(env, event("checkout.session.completed", session(a.id, { payment_status: "unpaid" })));
    expect((await json(unpaid)).ignored).toBe(true);
    expect(topupsOf(env, a.id)).toBe(0);
    await send(env, event("checkout.session.async_payment_succeeded", session(a.id)));
    expect(topupsOf(env, a.id)).toBe(8);
  });

  it("ignores a session that is not a paid USD top-up of a known account", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    const cases = [
      session(a.id, { metadata: {} }),
      session(a.id, { metadata: { kind: "plan" } }),
      session(a.id, { currency: "eur" }),
      session(a.id, { payment_status: "no_payment_required" }),
      session("acc_unknown"),
      session(a.id, { client_reference_id: undefined }),
      session(a.id, { id: undefined }),
      session(a.id, { mode: "setup" }),
    ];
    for (const c of cases) expect((await json(await send(env, event("checkout.session.completed", c)))).ignored, JSON.stringify(c)).toBe(true);
    expect(env.fake.rows("SELECT * FROM topups")).toHaveLength(0);
  });

  it("keeps each top-up as its own row", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    await send(env, event("checkout.session.completed", session(a.id, { id: "cs_a", payment_intent: "pi_a" })));
    await send(env, event("checkout.session.completed", session(a.id, { id: "cs_b", payment_intent: "pi_b" })));
    expect(env.fake.rows("SELECT * FROM topups")).toHaveLength(2);
    expect(topupsOf(env, a.id)).toBe(16);
  });

  it("records no event when the effect fails", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none" });
    env.fake.sqlite.exec("DROP INDEX topups_payment_intent; DROP TABLE topups;");
    const res = await send(env, event("checkout.session.completed", session(a.id)));
    expect(res.status).toBe(500);
    expect(env.fake.rows("SELECT * FROM stripe_events")).toHaveLength(0);
  });
});

describe("webhook: checkout.session.completed for a subscription", () => {
  const session = (account: string, over: Record<string, unknown> = {}) => ({ id: "cs_s", mode: "subscription", client_reference_id: account, customer: "cus_1", subscription: "sub_1", setup_intent: "seti_1", metadata: { trial: "1" }, ...over });
  const setupIntent = (fingerprint: string | null) => () => ({ payment_method: { id: "pm_1", card: fingerprint ? { fingerprint } : {} } });
  const endTrial = () => ({ id: "sub_1" });

  it("saves the subscription id and records the card fingerprint of a trial", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1" });
    const calls = stripeMock({ "GET /setup_intents/seti_1": setupIntent("fp_new"), "POST /subscriptions/sub_1": endTrial });
    const e = event("checkout.session.completed", session(a.id));
    expect((await send(env, e)).status).toBe(200);
    expect(acc(env, a.id).stripe_subscription_id).toBe("sub_1");
    expect(env.fake.row("SELECT * FROM card_trials")).toEqual({ fingerprint: "fp_new", account_id: a.id });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.stripe.com/v1/setup_intents/seti_1?expand%5B%5D=payment_method");
  });

  it("ends the trial now when another account used the card for a trial", async () => {
    const env = makeEnv();
    const other = await addAccount(env, 0, { plan: "none" });
    env.fake.sqlite.prepare("INSERT INTO card_trials (fingerprint, account_id) VALUES ('fp_used', ?)").run(other.id);
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1" });
    const calls = stripeMock({ "GET /setup_intents/seti_1": setupIntent("fp_used"), "POST /subscriptions/sub_1": endTrial });
    const e = event("checkout.session.completed", session(a.id));
    expect((await send(env, e)).status).toBe(200);
    const end = calls.find((c) => c.init.method === "POST")!;
    expect(end.url).toBe("https://api.stripe.com/v1/subscriptions/sub_1");
    expect(form(end.body).get("trial_end")).toBe("now");
    expect(end.headers.get("idempotency-key")).toBe(`${e.id}:trial_end`);
    expect(env.fake.rows("SELECT * FROM card_trials")).toHaveLength(1);
    expect(env.fake.row<any>("SELECT account_id FROM card_trials").account_id).toBe(other.id);
    expect(acc(env, a.id).stripe_subscription_id).toBe("sub_1");
  });

  it("does not end the trial a second time for the same account and card", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1" });
    env.fake.sqlite.prepare("INSERT INTO card_trials (fingerprint, account_id) VALUES ('fp_mine', ?)").run(a.id);
    const calls = stripeMock({ "GET /setup_intents/seti_1": setupIntent("fp_mine") });
    expect((await send(env, event("checkout.session.completed", session(a.id)))).status).toBe(200);
    expect(calls.filter((c) => c.init.method === "POST")).toHaveLength(0);
  });

  it("ends the trial now when the card has no fingerprint", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1" });
    const calls = stripeMock({ "GET /setup_intents/seti_1": setupIntent(null), "POST /subscriptions/sub_1": endTrial });
    await send(env, event("checkout.session.completed", session(a.id)));
    expect(calls.filter((c) => c.init.method === "POST")).toHaveLength(1);
    expect(env.fake.rows("SELECT * FROM card_trials")).toHaveLength(0);
  });

  it("reads the fingerprint from the subscription when the session has no setup intent", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1" });
    const calls = stripeMock({ "GET /subscriptions/sub_1": () => ({ default_payment_method: { card: { fingerprint: "fp_sub" } } }) });
    await send(env, event("checkout.session.completed", session(a.id, { setup_intent: null })));
    expect(calls[0]!.url).toContain("expand%5B%5D=default_payment_method");
    expect(env.fake.row<any>("SELECT fingerprint FROM card_trials").fingerprint).toBe("fp_sub");
  });

  it("makes no card check for a subscription with no trial", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1" });
    const calls = stripeMock({});
    await send(env, event("checkout.session.completed", session(a.id, { metadata: {} })));
    expect(calls).toHaveLength(0);
    expect(acc(env, a.id).stripe_subscription_id).toBe("sub_1");
  });

  it("asks Stripe nothing and changes nothing for a duplicate event", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1" });
    const calls = stripeMock({ "GET /setup_intents/seti_1": setupIntent("fp_new") });
    const e = event("checkout.session.completed", session(a.id));
    await send(env, e);
    await send(env, e);
    expect(calls).toHaveLength(1);
  });

  it("answers 500 so that Stripe tries again when the card check fails", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1" });
    stripeMock({ "GET /setup_intents/seti_1": () => new Response("{}", { status: 500 }) });
    const e = event("checkout.session.completed", session(a.id));
    expect((await send(env, e)).status).toBe(500);
    expect(env.fake.rows("SELECT * FROM stripe_events")).toHaveLength(0);
    expect(acc(env, a.id).stripe_subscription_id).toBeNull();
  });

  describe("a second subscription", () => {
    const second = (account: string, over: Record<string, unknown> = {}) => session(account, { id: "cs_2", subscription: "sub_2", setup_intent: null, metadata: {}, ...over });
    const secondRoutes = (amountPaid: number) => ({
      "GET /subscriptions/sub_2": () => ({ id: "sub_2", latest_invoice: { id: "in_2", amount_paid: amountPaid, payment_intent: "pi_2" } }),
      "DELETE /subscriptions/sub_2": () => ({ id: "sub_2", status: "canceled" }),
      "POST /refunds": () => ({ id: "re_1" }),
    });

    it("cancels the new subscription at once, refunds its payment, and keeps the stored subscription", async () => {
      const env = makeEnv();
      const a = await addAccount(env, 9, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1" });
      const calls = stripeMock(secondRoutes(2000));
      const e = event("checkout.session.completed", second(a.id));
      expect((await send(env, e)).status).toBe(200);
      const cancel = calls.find((c) => c.init.method === "DELETE")!;
      expect(cancel.url).toBe("https://api.stripe.com/v1/subscriptions/sub_2");
      expect(cancel.headers.get("idempotency-key")).toBe(`${e.id}:cancel`);
      const refund = calls.find((c) => c.url.endsWith("/refunds"))!;
      expect(form(refund.body).get("payment_intent")).toBe("pi_2");
      expect(refund.headers.get("idempotency-key")).toBe(`${e.id}:refund`);
      expect(acc(env, a.id)).toMatchObject({ stripe_subscription_id: "sub_1", plan: "standard", allowance_remaining_usd: 9 });
      expect(env.fake.row("SELECT event_id FROM stripe_events")).toEqual({ event_id: e.id });
    });

    it("cancels the new subscription of a trial and refunds nothing when it paid nothing", async () => {
      const env = makeEnv();
      const a = await addAccount(env, 9, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1", subStatus: "trialing" });
      const calls = stripeMock(secondRoutes(0));
      await send(env, event("checkout.session.completed", second(a.id)));
      expect(calls.some((c) => c.init.method === "DELETE")).toBe(true);
      expect(calls.some((c) => c.url.endsWith("/refunds"))).toBe(false);
      expect(env.fake.rows("SELECT * FROM card_trials")).toHaveLength(0);
      expect(acc(env, a.id).stripe_subscription_id).toBe("sub_1");
    });

    it("refunds the charge when the invoice has a charge and no payment intent", async () => {
      const env = makeEnv();
      const a = await addAccount(env, 9, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1" });
      const calls = stripeMock({ ...secondRoutes(2000), "GET /subscriptions/sub_2": () => ({ latest_invoice: { id: "in_2", amount_paid: 2000, charge: "ch_2" } }) });
      await send(env, event("checkout.session.completed", second(a.id)));
      expect(form(calls.find((c) => c.url.endsWith("/refunds"))!.body).get("charge")).toBe("ch_2");
    });

    it("answers 500 so that Stripe tries again when the refund fails", async () => {
      const env = makeEnv();
      const a = await addAccount(env, 9, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1" });
      stripeMock({ ...secondRoutes(2000), "POST /refunds": () => new Response("{}", { status: 500 }) });
      expect((await send(env, event("checkout.session.completed", second(a.id)))).status).toBe(500);
      expect(env.fake.rows("SELECT * FROM stripe_events")).toHaveLength(0);
    });

    it("keeps the same subscription when Stripe sends the event again for the stored id", async () => {
      const env = makeEnv();
      const a = await addAccount(env, 9, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1" });
      const calls = stripeMock({});
      await send(env, event("checkout.session.completed", second(a.id, { subscription: "sub_1" })));
      expect(calls).toHaveLength(0);
      expect(acc(env, a.id).stripe_subscription_id).toBe("sub_1");
    });

    it("takes the new subscription when the stored one is canceled", async () => {
      const env = makeEnv();
      const a = await addAccount(env, 0, { plan: "none", customer: "cus_1", subscription: "sub_old", subStatus: "canceled" });
      const calls = stripeMock({});
      await send(env, event("checkout.session.completed", second(a.id)));
      expect(calls).toHaveLength(0);
      expect(acc(env, a.id).stripe_subscription_id).toBe("sub_2");
    });
  });

  it("finds the account by customer when the reference is missing", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1" });
    stripeMock({});
    await send(env, event("checkout.session.completed", session(a.id, { client_reference_id: null, metadata: {} })));
    expect(acc(env, a.id).stripe_subscription_id).toBe("sub_1");
  });
});

describe("webhook: invoice.paid", () => {
  const period = (days: number) => sec(NOW.getTime() + days * DAY);
  const line = (price: string, amount = 2000, end = period(40)) => ({ amount, price: { id: price }, period: { start: sec(NOW.getTime()), end } });
  const invoice = (over: Record<string, unknown> = {}) => ({ id: "in_1", customer: "cus_1", subscription: "sub_1", billing_reason: "subscription_create", amount_paid: 2000, total: 2000, lines: { data: [line("price_standard_m")] }, ...over });
  const fresh = async (env: TestEnv, over: Parameters<typeof addAccount>[2] = {}) => addAccount(env, 0, { plan: "none", customer: "cus_1", ...over });

  it("starts a paid subscription: plan, period, full allowance and reset date", async () => {
    freeze();
    const env = makeEnv();
    const a = await fresh(env);
    expect((await send(env, event("invoice.paid", invoice()))).status).toBe(200);
    expect(acc(env, a.id)).toMatchObject({
      plan: "standard",
      plan_interval: "month",
      sub_status: "active",
      stripe_subscription_id: "sub_1",
      allowance_remaining_usd: 15,
      allowance_granted_usd: 15,
      allowance_resets_at: Date.parse("2026-11-01T12:00:00Z"),
      period_end: period(40) * 1000,
    });
  });

  it("starts a trial with the trial allowance when nothing was paid", async () => {
    freeze();
    const env = makeEnv();
    const a = await fresh(env);
    await send(env, event("invoice.paid", invoice({ amount_paid: 0, total: 0, lines: { data: [line("price_standard_m", 0, period(7))] } })));
    expect(acc(env, a.id)).toMatchObject({ plan: "standard", sub_status: "trialing", allowance_remaining_usd: 2, allowance_granted_usd: 2, period_end: period(7) * 1000, allowance_resets_at: period(7) * 1000 });
  });

  it("reads the yearly interval and gives the monthly allowance", async () => {
    freeze();
    const env = makeEnv();
    const a = await fresh(env);
    await send(env, event("invoice.paid", invoice({ amount_paid: 60000, lines: { data: [line("price_lab_y", 60000, period(365))] } })));
    expect(acc(env, a.id)).toMatchObject({ plan: "lab", plan_interval: "year", allowance_remaining_usd: 46, allowance_resets_at: Date.parse("2026-11-01T12:00:00Z"), period_end: period(365) * 1000 });
  });

  it("resets the allowance at a cycle with no carry-over", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 11, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1", periodEnd: NOW.getTime() - 1000, resetsAt: NOW.getTime() - 1000, subStatus: "past_due" });
    await send(env, event("invoice.paid", invoice({ billing_reason: "subscription_cycle" })));
    expect(acc(env, a.id)).toMatchObject({ plan: "standard", sub_status: "active", allowance_remaining_usd: 15, period_end: period(40) * 1000, allowance_resets_at: Date.parse("2026-11-01T12:00:00Z") });
  });

  it("changes the plan at a cycle after a scheduled downgrade", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 3, { plan: "lab", granted: 46, customer: "cus_1", subscription: "sub_1", periodEnd: NOW.getTime() - 1000 });
    await send(env, event("invoice.paid", invoice({ billing_reason: "subscription_cycle", lines: { data: [line("price_basic_m", 1000)] } })));
    expect(acc(env, a.id)).toMatchObject({ plan: "basic", allowance_remaining_usd: 7, allowance_granted_usd: 7 });
  });

  it("takes the plan from the line price and not from the order of events", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 3, { plan: "lab", granted: 46, customer: "cus_1", subscription: "sub_1" });
    const newer = invoice({ billing_reason: "subscription_cycle", lines: { data: [line("price_standard_m", 2000, period(70))] } });
    await send(env, event("customer.subscription.updated", { id: "sub_1", customer: "cus_1", status: "active", current_period_end: period(70) }));
    await send(env, event("invoice.paid", newer));
    expect(acc(env, a.id).plan).toBe("standard");
  });

  it("chooses the charge line and not the credit line of a plan change", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 4, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1" });
    const lines = { data: [line("price_standard_m", -1200), line("price_lab_m", 4200)] };
    await send(env, event("invoice.paid", invoice({ billing_reason: "subscription_update", total: 3000, amount_paid: 3000, lines })));
    expect(acc(env, a.id).plan).toBe("lab");
  });

  it("adds the difference of the allowances at an upgrade and keeps the reset date", async () => {
    freeze();
    const env = makeEnv();
    const keep = NOW.getTime() + 10 * DAY;
    const a = await addAccount(env, 4, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1", resetsAt: keep });
    await send(env, event("invoice.paid", invoice({ billing_reason: "subscription_update", total: 3000, amount_paid: 3000, lines: { data: [line("price_lab_m", 3000, period(41))] } })));
    const added = 31 * (10 / 30);
    expect(acc(env, a.id)).toMatchObject({ plan: "lab", allowance_resets_at: keep, period_end: period(41) * 1000 });
    expect(acc(env, a.id).allowance_remaining_usd).toBeCloseTo(4 + added, 6);
    expect(acc(env, a.id).allowance_granted_usd).toBeCloseTo(15 + added, 6);
  });

  it("scales the added allowance by the share of the period that is left", async () => {
    freeze();
    const env = makeEnv();
    const end = NOW.getTime() + DAY;
    const a = await addAccount(env, 4, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1", resetsAt: end });
    const start = Date.parse("2026-09-02T12:00:00Z");
    await send(env, event("invoice.paid", invoice({ billing_reason: "subscription_update", total: 100, amount_paid: 100, period_start: sec(start), period_end: sec(end), lines: { data: [line("price_lab_m", 100, sec(end))] } })));
    const added = 31 / 30;
    expect(acc(env, a.id).allowance_remaining_usd).toBeCloseTo(4 + added, 6);
    expect(acc(env, a.id).allowance_granted_usd).toBeCloseTo(15 + added, 6);
    expect(acc(env, a.id).allowance_remaining_usd).toBeLessThan(5.5);
  });

  it("scales the added allowance when the invoice period starts at the change and not at the cycle", async () => {
    freeze();
    const env = makeEnv();
    const end = NOW.getTime() + DAY;
    const a = await addAccount(env, 4, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1", resetsAt: end });
    await send(env, event("invoice.paid", invoice({ billing_reason: "subscription_update", total: 100, amount_paid: 100, period_start: sec(NOW.getTime()), period_end: sec(end), lines: { data: [line("price_lab_m", 100, sec(end))] } })));
    expect(acc(env, a.id).allowance_remaining_usd).toBeCloseTo(4 + 31 / 30, 6);
  });

  it("scales the added allowance when the invoice has no period of its own", async () => {
    freeze();
    const env = makeEnv();
    const end = NOW.getTime() + 15 * DAY;
    const a = await addAccount(env, 4, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1", resetsAt: end });
    await send(env, event("invoice.paid", invoice({ billing_reason: "subscription_update", total: 1500, amount_paid: 1500, lines: { data: [line("price_lab_m", 1500, sec(end))] } })));
    const share = (end - NOW.getTime()) / (end - Date.parse("2026-09-16T12:00:00Z"));
    expect(acc(env, a.id).allowance_remaining_usd).toBeCloseTo(4 + 31 * share, 6);
  });

  it("scales the added allowance of a yearly plan by the time left in the monthly window, late in the window", async () => {
    freeze();
    const env = makeEnv();
    const resets = Date.parse("2026-10-04T12:00:00Z");
    const end = Date.parse("2027-02-04T12:00:00Z");
    const a = await addAccount(env, 4, { plan: "standard", interval: "year", granted: 15, customer: "cus_1", subscription: "sub_1", resetsAt: resets, periodEnd: end });
    await send(env, event("invoice.paid", invoice({ billing_reason: "subscription_update", total: 9000, amount_paid: 9000, lines: { data: [line("price_lab_y", 9000, sec(end))] } })));
    expect(acc(env, a.id).allowance_remaining_usd).toBeCloseTo(4 + 31 * (3 / 30), 6);
    expect(acc(env, a.id).allowance_granted_usd).toBeCloseTo(15 + 31 * (3 / 30), 6);
    expect(acc(env, a.id).allowance_resets_at).toBe(resets);
  });

  it("scales the added allowance of a yearly plan by the time left in the monthly window, early in the year", async () => {
    freeze();
    const env = makeEnv();
    const resets = Date.parse("2026-10-30T12:00:00Z");
    const end = Date.parse("2027-09-30T12:00:00Z");
    const a = await addAccount(env, 4, { plan: "standard", interval: "year", granted: 15, customer: "cus_1", subscription: "sub_1", resetsAt: resets, periodEnd: end });
    await send(env, event("invoice.paid", invoice({ billing_reason: "subscription_update", total: 40000, amount_paid: 40000, lines: { data: [line("price_lab_y", 40000, sec(end))] } })));
    expect(acc(env, a.id).allowance_remaining_usd).toBeCloseTo(4 + 31 * (29 / 30), 6);
  });

  it("pays the difference of a trial that ended early", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 1.5, { plan: "standard", granted: 2, customer: "cus_1", subscription: "sub_1", subStatus: "trialing", resetsAt: NOW.getTime() + 6 * DAY, periodEnd: NOW.getTime() + 6 * DAY });
    await send(env, event("invoice.paid", invoice({ billing_reason: "subscription_update", total: 2000, amount_paid: 2000, lines: { data: [line("price_standard_m", 2000, period(31))] } })));
    expect(acc(env, a.id)).toMatchObject({ plan: "standard", allowance_remaining_usd: 1.5 + 13, allowance_granted_usd: 15, allowance_resets_at: Date.parse("2026-11-01T12:00:00Z"), period_end: period(31) * 1000 });
  });

  it("scales a second upgrade by the window that the first upgrade started", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 1.5, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1", resetsAt: NOW.getTime() - DAY, periodEnd: NOW.getTime() + 15 * DAY });
    await send(env, event("invoice.paid", invoice({ billing_reason: "subscription_update", total: 4600, amount_paid: 4600, lines: { data: [line("price_lab_m", 4600, period(15))] } })));
    expect(acc(env, a.id)).toMatchObject({ plan: "lab", allowance_granted_usd: 46, allowance_resets_at: period(15) * 1000, allowance_window_start: NOW.getTime() });
    vi.setSystemTime(new Date(NOW.getTime() + 5 * DAY));
    await send(env, event("invoice.paid", invoice({ billing_reason: "subscription_update", total: 7200, amount_paid: 7200, lines: { data: [line("price_labplus_m", 7200, period(15))] } })));
    expect(acc(env, a.id).allowance_granted_usd).toBeCloseTo(46 + 72 * (10 / 15), 6);
    expect(acc(env, a.id).allowance_resets_at).toBe(period(15) * 1000);
    expect(acc(env, a.id).allowance_window_start).toBe(NOW.getTime());
  });

  it("changes the plan but adds nothing when an update invoice has no charge", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 1.5, { plan: "standard", granted: 2, customer: "cus_1", subscription: "sub_1", subStatus: "trialing" });
    await send(env, event("invoice.paid", invoice({ billing_reason: "subscription_update", total: 0, amount_paid: 0, lines: { data: [line("price_lab_m", 0, period(7))] } })));
    expect(acc(env, a.id)).toMatchObject({ plan: "lab", allowance_remaining_usd: 1.5, allowance_granted_usd: 2, sub_status: "trialing" });
  });

  it("changes the plan when the interval changes and keeps the allowance", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 9, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1" });
    await send(env, event("invoice.paid", invoice({ billing_reason: "subscription_update", total: 18000, amount_paid: 18000, lines: { data: [line("price_standard_y", 20000, period(365))] } })));
    expect(acc(env, a.id)).toMatchObject({ plan: "standard", plan_interval: "year", allowance_remaining_usd: 9, allowance_granted_usd: 15 });
  });

  describe("an invoice for another subscription", () => {
    const account = (env: TestEnv, over: Parameters<typeof addAccount>[2] = {}) => addAccount(env, 9, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1", ...over });

    for (const reason of ["subscription_create", "subscription_cycle", "subscription_update"]) {
      it(`ignores ${reason} while the account has a live subscription with another id`, async () => {
        freeze();
        const env = makeEnv();
        const a = await account(env);
        const before = acc(env, a.id);
        const res = await send(env, event("invoice.paid", invoice({ billing_reason: reason, subscription: "sub_2", total: 6000, amount_paid: 6000, lines: { data: [line("price_lab_m", 6000, period(31))] } })));
        expect((await json(res)).ignored).toBe(true);
        expect(acc(env, a.id)).toEqual(before);
        expect(env.fake.rows("SELECT * FROM stripe_events")).toHaveLength(0);
      });
    }

    it("reads the subscription from the parent in the newer invoice shape", async () => {
      freeze();
      const env = makeEnv();
      const a = await account(env);
      const before = acc(env, a.id);
      const res = await send(env, event("invoice.paid", invoice({ subscription: undefined, parent: { subscription_details: { subscription: "sub_2" } }, billing_reason: "subscription_cycle", lines: { data: [line("price_lab_m", 6000, period(31))] } })));
      expect((await json(res)).ignored).toBe(true);
      expect(acc(env, a.id)).toEqual(before);
    });

    it("accepts the invoice of the stored subscription", async () => {
      freeze();
      const env = makeEnv();
      const a = await account(env);
      await send(env, event("invoice.paid", invoice({ billing_reason: "subscription_cycle", subscription: "sub_1", lines: { data: [line("price_standard_m", 2000, period(31))] } })));
      expect(acc(env, a.id).allowance_remaining_usd).toBe(15);
    });

    it("accepts the first invoice of a new subscription when the stored one is canceled", async () => {
      freeze();
      const env = makeEnv();
      const a = await account(env, { subStatus: "canceled", plan: "none" });
      await send(env, event("invoice.paid", invoice({ subscription: "sub_2" })));
      expect(acc(env, a.id)).toMatchObject({ plan: "standard", sub_status: "active", stripe_subscription_id: "sub_2" });
    });
  });

  for (const reason of ["manual", "subscription_threshold", "upcoming", "quote_accept", "automatic_pending_invoice_item_invoice", undefined, 5]) {
    it(`ignores the billing reason ${String(reason)}`, async () => {
      const env = makeEnv();
      const a = await fresh(env);
      const res = await send(env, event("invoice.paid", invoice({ billing_reason: reason })));
      expect((await json(res)).ignored).toBe(true);
      expect(acc(env, a.id)).toMatchObject({ plan: "none", allowance_remaining_usd: 0 });
      expect(env.fake.rows("SELECT * FROM stripe_events")).toHaveLength(0);
    });
  }

  it("ignores an invoice for a price that the config does not know, an unknown customer, or a line with no period", async () => {
    const env = makeEnv();
    const a = await fresh(env);
    const cases = [
      invoice({ lines: { data: [line("price_unknown")] } }),
      invoice({ customer: "cus_other" }),
      invoice({ lines: { data: [] } }),
      invoice({ lines: undefined }),
      invoice({ lines: { data: [{ amount: 1, price: { id: "price_standard_m" } }] } }),
    ];
    for (const c of cases) expect((await json(await send(env, event("invoice.paid", c)))).ignored).toBe(true);
    expect(acc(env, a.id).plan).toBe("none");
  });

  it("ignores an older cycle invoice that arrives late", async () => {
    freeze();
    const env = makeEnv();
    const a = await addAccount(env, 3, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1", periodEnd: NOW.getTime() + 60 * DAY });
    const res = await send(env, event("invoice.paid", invoice({ billing_reason: "subscription_cycle", lines: { data: [line("price_standard_m", 2000, period(30))] } })));
    expect((await json(res)).ignored).toBe(true);
    expect(balanceOf(env, a.id)).toBe(3);
  });

  it("reads the newer shape of the invoice object", async () => {
    freeze();
    const env = makeEnv();
    const a = await fresh(env);
    const shaped = {
      id: "in_9",
      customer: "cus_1",
      billing_reason: "subscription_create",
      amount_paid: 2000,
      total: 2000,
      parent: { subscription_details: { subscription: "sub_new" } },
      lines: { data: [{ amount: 2000, pricing: { price_details: { price: "price_standard_m" } }, period: { end: period(40) } }] },
    };
    await send(env, event("invoice.paid", shaped));
    expect(acc(env, a.id)).toMatchObject({ plan: "standard", stripe_subscription_id: "sub_new", allowance_remaining_usd: 15 });
  });

  it("applies a duplicate event once", async () => {
    freeze();
    const env = makeEnv();
    const a = await fresh(env);
    const e = event("invoice.paid", invoice());
    await send(env, e);
    env.fake.sqlite.prepare("UPDATE accounts SET allowance_remaining_usd = 4 WHERE id = ?").run(a.id);
    const again = await send(env, e);
    expect((await json(again)).duplicate).toBe(true);
    expect(balanceOf(env, a.id)).toBe(4);
  });
});

describe("webhook: subscription changes", () => {
  const sub = (over: Record<string, unknown> = {}) => ({ id: "sub_1", customer: "cus_1", status: "active", current_period_end: sec(NOW.getTime() + 20 * DAY), ...over });
  const account = (env: TestEnv, over: Parameters<typeof addAccount>[2] = {}) => addAccount(env, 9, { plan: "standard", granted: 15, customer: "cus_1", subscription: "sub_1", ...over });

  it("ignores an update or a deletion for a subscription id that is not the stored one", async () => {
    const env = makeEnv();
    const a = await account(env);
    const before = acc(env, a.id);
    for (const [type, status] of [["customer.subscription.updated", "canceled"], ["customer.subscription.updated", "unpaid"], ["customer.subscription.deleted", "canceled"]] as const) {
      const res = await send(env, event(type, sub({ id: "sub_2", status })));
      expect((await json(res)).ignored).toBe(true);
    }
    expect(acc(env, a.id)).toEqual(before);
    expect(env.fake.rows("SELECT * FROM stripe_events")).toHaveLength(0);
  });

  it("copies the status and the period end", async () => {
    const env = makeEnv();
    const a = await account(env, { subStatus: "trialing" });
    await send(env, event("customer.subscription.updated", sub()));
    expect(acc(env, a.id)).toMatchObject({ sub_status: "active", period_end: sec(NOW.getTime() + 20 * DAY) * 1000, plan: "standard", allowance_remaining_usd: 9 });
  });

  it("reads the period end from the item in the newer shape", async () => {
    const env = makeEnv();
    const a = await account(env);
    await send(env, event("customer.subscription.updated", sub({ current_period_end: undefined, items: { data: [{ current_period_end: sec(NOW.getTime() + 33 * DAY) }] } })));
    expect(acc(env, a.id).period_end).toBe(sec(NOW.getTime() + 33 * DAY) * 1000);
  });

  it("keeps the allowance when the subscription is past due", async () => {
    const env = makeEnv();
    const a = await account(env);
    await send(env, event("customer.subscription.updated", sub({ status: "past_due" })));
    expect(acc(env, a.id)).toMatchObject({ sub_status: "past_due", allowance_remaining_usd: 9, plan: "standard" });
  });

  it("sets the allowance to 0 when the status is unpaid", async () => {
    const env = makeEnv();
    const a = await account(env);
    await send(env, event("customer.subscription.updated", sub({ status: "unpaid" })));
    expect(acc(env, a.id)).toMatchObject({ sub_status: "unpaid", allowance_remaining_usd: 0, plan: "standard" });
  });

  it("sets the allowance to 0 and the plan to none when the status is canceled", async () => {
    const env = makeEnv();
    const a = await account(env);
    await send(env, event("customer.subscription.updated", sub({ status: "canceled" })));
    expect(acc(env, a.id)).toMatchObject({ sub_status: "canceled", allowance_remaining_usd: 0, plan: "none", plan_interval: null });
  });

  it("ends the plan when the subscription is deleted", async () => {
    const env = makeEnv();
    const a = await account(env);
    const topup = addTopup(env, a.id, 5);
    await send(env, event("customer.subscription.deleted", sub({ status: "canceled" })));
    expect(acc(env, a.id)).toMatchObject({ sub_status: "canceled", allowance_remaining_usd: 0, plan: "none" });
    expect(env.fake.row<any>("SELECT remaining_usd FROM topups WHERE id = ?", topup).remaining_usd).toBe(5);
  });

  it("treats a deleted event as canceled even when the status field says otherwise", async () => {
    const env = makeEnv();
    const a = await account(env);
    await send(env, event("customer.subscription.deleted", sub({ status: "active" })));
    expect(acc(env, a.id).sub_status).toBe("canceled");
  });

  it("maps the other Stripe statuses", async () => {
    for (const [from, to] of [["incomplete", "none"], ["incomplete_expired", "none"], ["paused", "unpaid"]] as const) {
      const env = makeEnv();
      const a = await account(env);
      await send(env, event("customer.subscription.updated", sub({ status: from })));
      expect(acc(env, a.id).sub_status, from).toBe(to);
    }
  });

  it("ignores a status that is not known and an event of another subscription", async () => {
    const env = makeEnv();
    const a = await account(env);
    expect((await json(await send(env, event("customer.subscription.updated", sub({ status: "mystery" }))))).ignored).toBe(true);
    expect((await json(await send(env, event("customer.subscription.deleted", sub({ id: "sub_old", status: "canceled" }))))).ignored).toBe(true);
    expect((await json(await send(env, event("customer.subscription.updated", sub({ customer: "cus_x" }))))).ignored).toBe(true);
    expect(acc(env, a.id)).toMatchObject({ sub_status: "active", plan: "standard", allowance_remaining_usd: 9 });
  });

  it("takes the first subscription id when the account has none", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 0, { plan: "none", customer: "cus_1" });
    await send(env, event("customer.subscription.updated", sub()));
    expect(acc(env, a.id).stripe_subscription_id).toBe("sub_1");
  });

  it("applies a duplicate event once", async () => {
    const env = makeEnv();
    const a = await account(env);
    const e = event("customer.subscription.updated", sub({ status: "unpaid" }));
    await send(env, e);
    env.fake.sqlite.prepare("UPDATE accounts SET allowance_remaining_usd = 6 WHERE id = ?").run(a.id);
    await send(env, e);
    expect(balanceOf(env, a.id)).toBe(6);
  });

  it("sets past_due on a failed payment only for a subscription that runs", async () => {
    const env = makeEnv();
    const a = await account(env);
    const none = await addAccount(env, 0, { plan: "none", customer: "cus_none" });
    await send(env, event("invoice.payment_failed", { id: "in_f", customer: "cus_1" }));
    await send(env, event("invoice.payment_failed", { id: "in_g", customer: "cus_none" }));
    expect(acc(env, a.id)).toMatchObject({ sub_status: "past_due", allowance_remaining_usd: 9, plan: "standard" });
    expect(acc(env, none.id).sub_status).toBe("none");
  });

  it("lets requests continue while the subscription is past due", async () => {
    const env = makeEnv();
    const a = await account(env);
    await send(env, event("invoice.payment_failed", { id: "in_f", customer: "cus_1" }));
    stripeMock({});
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ model: "claude-sonnet-5-5", usage: { input_tokens: 5, output_tokens: 5 } }), { headers: { "content-type": "application/json" } })));
    const { res, settled } = await call(env, "/v1/messages", post(a.token, { model: "claude-sonnet-5-5", max_tokens: 100, messages: [{ role: "user", content: "hi" }] }));
    await settled();
    expect(res.status).toBe(200);
  });
});

describe("webhook: refunds and disputes", () => {
  it("sets the remaining value of the refunded top-up to 0 and leaves other top-ups", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 9, { customer: "cus_1", subscription: "sub_1" });
    const refunded = addTopup(env, a.id, 6, Date.now() + DAY, "tu_a", "pi_a");
    const other = addTopup(env, a.id, 8, Date.now() + DAY, "tu_b", "pi_b");
    await send(env, event("charge.refunded", { id: "ch_1", refunded: true, payment_intent: "pi_a", customer: "cus_1" }));
    expect(env.fake.row<any>("SELECT remaining_usd FROM topups WHERE id = ?", refunded).remaining_usd).toBe(0);
    expect(env.fake.row<any>("SELECT remaining_usd FROM topups WHERE id = ?", other).remaining_usd).toBe(8);
    expect(balanceOf(env, a.id)).toBe(9);
  });

  it("sets the allowance to 0 when a subscription charge is refunded", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 9, { customer: "cus_1", subscription: "sub_1" });
    const topup = addTopup(env, a.id, 8, Date.now() + DAY, "tu_b", "pi_b");
    await send(env, event("charge.refunded", { id: "ch_2", refunded: true, payment_intent: "pi_sub", invoice: "in_1", customer: "cus_1" }));
    expect(balanceOf(env, a.id)).toBe(0);
    expect(env.fake.row<any>("SELECT remaining_usd FROM topups WHERE id = ?", topup).remaining_usd).toBe(8);
  });

  it("ignores a partial refund, an unknown charge, and a charge with no invoice", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 9, { customer: "cus_1", subscription: "sub_1" });
    addTopup(env, a.id, 8, Date.now() + DAY, "tu_b", "pi_b");
    expect((await json(await send(env, event("charge.refunded", { id: "c", refunded: false, payment_intent: "pi_b", customer: "cus_1", invoice: "in_1" })))).ignored).toBe(true);
    expect((await json(await send(env, event("charge.refunded", { id: "c", refunded: true, payment_intent: "pi_zzz", customer: "cus_1" })))).ignored).toBe(true);
    expect((await json(await send(env, event("charge.refunded", { id: "c", refunded: true, payment_intent: "pi_zzz", customer: "cus_x", invoice: "in_1" })))).ignored).toBe(true);
    expect(balanceOf(env, a.id)).toBe(9);
    expect(topupsOf(env, a.id)).toBe(8);
  });

  it("applies a duplicate refund once", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 9, { customer: "cus_1", subscription: "sub_1" });
    const e = event("charge.refunded", { id: "ch_2", refunded: true, invoice: "in_1", customer: "cus_1" });
    await send(env, e);
    env.fake.sqlite.prepare("UPDATE accounts SET allowance_remaining_usd = 5 WHERE id = ?").run(a.id);
    await send(env, e);
    expect(balanceOf(env, a.id)).toBe(5);
  });

  it("suspends the account of a disputed top-up", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 9, { customer: "cus_1", subscription: "sub_1" });
    addTopup(env, a.id, 8, Date.now() + DAY, "tu_b", "pi_b");
    const calls = stripeMock({});
    await send(env, event("charge.dispute.created", { id: "dp_1", charge: "ch_1", payment_intent: "pi_b" }));
    expect(acc(env, a.id).suspended).toBe(1);
    expect(calls).toHaveLength(0);
  });

  it("finds the account of a disputed subscription charge through the charge", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 9, { customer: "cus_1", subscription: "sub_1" });
    const calls = stripeMock({ "GET /charges/ch_7": () => ({ id: "ch_7", customer: "cus_1" }) });
    await send(env, event("charge.dispute.created", { id: "dp_2", charge: "ch_7", payment_intent: "pi_sub" }));
    expect(calls).toHaveLength(1);
    expect(acc(env, a.id).suspended).toBe(1);
  });

  it("refuses requests with 403 account_suspended after a dispute", async () => {
    const env = makeEnv();
    const a = await addAccount(env, 9, { customer: "cus_1", subscription: "sub_1" });
    stripeMock({ "GET /charges/ch_7": () => ({ id: "ch_7", customer: "cus_1" }) });
    await send(env, event("charge.dispute.created", { id: "dp_2", charge: "ch_7" }));
    const { res } = await call(env, "/v1/messages", post(a.token, { model: "claude-sonnet-5-5", max_tokens: 100, messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(403);
    expect((await json(res)).error.type).toBe("account_suspended");
  });

  it("ignores a dispute for an unknown charge", async () => {
    const env = makeEnv();
    await addAccount(env, 9, { customer: "cus_1" });
    stripeMock({ "GET /charges/ch_x": () => ({ id: "ch_x", customer: "cus_unknown" }) });
    expect((await json(await send(env, event("charge.dispute.created", { id: "dp", charge: "ch_x" })))).ignored).toBe(true);
    expect((await json(await send(env, event("charge.dispute.created", { id: "dp" })))).ignored).toBe(true);
  });
});
