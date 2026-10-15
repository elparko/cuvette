import { afterEach, describe, expect, it, vi } from "vitest";
import { addAccount, balanceOf, call, makeEnv, mockFetch, type TestEnv } from "./helpers.ts";

afterEach(() => vi.unstubAllGlobals());

const SECRET = "whsec_test";
const enc = new TextEncoder();

async function hmac(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(text)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function session(account: string, over: Record<string, unknown> = {}): string {
  return JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: { id: "cs_test_1", payment_status: "paid", currency: "usd", amount_total: 2500, client_reference_id: account, ...over } } });
}

async function send(env: TestEnv, body: string, header?: string | null, secret = SECRET, ts = Math.floor(Date.now() / 1000)) {
  const sig = header === undefined ? `t=${ts},v1=${await hmac(secret, `${ts}.${body}`)}` : header;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (sig !== null) headers["stripe-signature"] = sig;
  return (await call(env, "/v1/stripe/webhook", { method: "POST", headers, body })).res;
}

describe("webhook signature", () => {
  it("adds the amount to the balance for a good signature", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 1);
    const res = await send(env, session(acct.id));
    expect(res.status).toBe(200);
    expect(balanceOf(env, acct.id)).toBe(26);
    expect(env.fake.row("SELECT * FROM payments")).toMatchObject({ session_id: "cs_test_1", account_id: acct.id, amount_usd: 25 });
  });

  it("accepts any v1 value that matches", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 0);
    const body = session(acct.id);
    const ts = Math.floor(Date.now() / 1000);
    const good = await hmac(SECRET, `${ts}.${body}`);
    const res = await send(env, body, `t=${ts},v1=${"0".repeat(64)},v0=abc,v1=${good}`);
    expect(res.status).toBe(200);
    expect(balanceOf(env, acct.id)).toBe(25);
  });

  it("rejects a signature from the wrong secret", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 0);
    const res = await send(env, session(acct.id), undefined, "whsec_other");
    expect(res.status).toBe(400);
    expect(balanceOf(env, acct.id)).toBe(0);
    expect(env.fake.rows("SELECT * FROM payments")).toHaveLength(0);
  });

  it("rejects a body that changed after signing", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 0);
    const ts = Math.floor(Date.now() / 1000);
    const signed = session(acct.id, { amount_total: 1000 });
    const header = `t=${ts},v1=${await hmac(SECRET, `${ts}.${signed}`)}`;
    const res = await send(env, session(acct.id, { amount_total: 5000 }), header);
    expect(res.status).toBe(400);
    expect(balanceOf(env, acct.id)).toBe(0);
  });

  it("rejects a missing or malformed header", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 0);
    for (const header of [null, "", "garbage", "t=abc,v1=00", `t=${Math.floor(Date.now() / 1000)}`, `t=${Math.floor(Date.now() / 1000)},v1=zz`]) {
      expect((await send(env, session(acct.id), header)).status).toBe(400);
    }
    expect(balanceOf(env, acct.id)).toBe(0);
  });

  it("rejects a timestamp that is older or newer than 300 seconds", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 0);
    const now = Math.floor(Date.now() / 1000);
    expect((await send(env, session(acct.id), undefined, SECRET, now - 400)).status).toBe(400);
    expect((await send(env, session(acct.id), undefined, SECRET, now + 400)).status).toBe(400);
    expect(balanceOf(env, acct.id)).toBe(0);
    expect((await send(env, session(acct.id), undefined, SECRET, now - 200)).status).toBe(200);
    expect(balanceOf(env, acct.id)).toBe(25);
  });
});

describe("webhook payment checks", () => {
  it("credits each of the three allowed amounts", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 0);
    let n = 0;
    for (const cents of [1000, 2500, 5000]) await send(env, session(acct.id, { id: `cs_${n++}`, amount_total: cents }));
    expect(balanceOf(env, acct.id)).toBe(85);
  });

  it("ignores an amount that is not allowed", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 0);
    for (const [i, amount_total] of [100, 999, 3000, 100000, 2500.5, "2500abc"].entries()) {
      const res = await send(env, session(acct.id, { id: `cs_${i}`, amount_total }));
      expect(res.status).toBe(200);
    }
    expect(balanceOf(env, acct.id)).toBe(0);
    expect(env.fake.rows("SELECT * FROM payments")).toHaveLength(0);
  });

  it("ignores a currency that is not usd and a session that is not paid", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 0);
    expect((await send(env, session(acct.id, { id: "cs_a", currency: "eur" }))).status).toBe(200);
    expect((await send(env, session(acct.id, { id: "cs_b", payment_status: "unpaid" }))).status).toBe(200);
    expect(balanceOf(env, acct.id)).toBe(0);
  });

  it("ignores an account that does not exist", async () => {
    const env = makeEnv();
    const res = await send(env, session("missing"));
    expect(res.status).toBe(200);
    expect(env.fake.rows("SELECT * FROM payments")).toHaveLength(0);
  });

  it("ignores an event of another type", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 0);
    expect((await send(env, JSON.stringify({ id: "evt_2", type: "charge.refunded", data: { object: {} } }))).status).toBe(200);
    expect(balanceOf(env, acct.id)).toBe(0);
  });

  it("adds the credit once when Stripe sends the same session again", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 0);
    const first = await send(env, session(acct.id));
    const second = await send(env, session(acct.id));
    const third = await send(env, session(acct.id, {}).replace("evt_1", "evt_9"));
    expect([first.status, second.status, third.status]).toEqual([200, 200, 200]);
    expect(((await second.json()) as any).duplicate).toBe(true);
    expect(balanceOf(env, acct.id)).toBe(25);
    expect(env.fake.rows("SELECT * FROM payments")).toHaveLength(1);
  });

  it("does not call Stripe or Anthropic", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 0);
    const calls = mockFetch(() => new Response("{}"));
    await send(env, session(acct.id));
    expect(calls).toHaveLength(0);
  });
});
