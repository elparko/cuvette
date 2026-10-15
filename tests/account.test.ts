import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  AccountError,
  accountLines,
  analysesText,
  billingUrl,
  changePlan,
  checkoutUrl,
  getAccount,
  getDevices,
  getPricing,
  getUsage,
  getUsageCsv,
  hostedError,
  logout,
  meterFraction,
  resetText,
  revokeDevice,
  waitText,
  type AccountInfo,
} from "../src/core/account.ts";
import { credentialsPath, cuvetteToken, cuvetteUrl, keyVersion, removeCuvetteToken, saveClaudeKey, saveCuvetteToken } from "../src/core/credentials.ts";
import { chooseCuvette, savedModel } from "../src/core/firststart.ts";

const oldHome = process.env.CUVETTE_HOME;
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-acc-"));
  vi.stubEnv("CUVETTE_TOKEN", "");
  vi.stubEnv("CUVETTE_INFERENCE_URL", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
});

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const ACCOUNT: AccountInfo = {
  account_id: "acc_1",
  identities: [{ provider: "google", email: "a@b.c" }],
  plan: "standard",
  interval: "month",
  sub_status: "active",
  period_end: "2026-11-14T00:00:00Z",
  allowance_usd: 15,
  allowance_remaining_usd: 6,
  topup_remaining_usd: 2.5,
  analyses_left_estimate: 9,
  mean_cost_per_analysis_usd: 0.62,
  resets_at: "2026-11-01T00:00:00Z",
  models: ["claude-sonnet-5-5"],
};

function stub(...responses: Response[]) {
  const calls: { url: string; method: string; auth: string | null; body: unknown }[] = [];
  const fn = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? "GET", auth: new Headers(init?.headers).get("authorization"), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return responses.shift() ?? json(500, {});
  }) as unknown as typeof fetch;
  return { fn, calls };
}

describe("the token", () => {
  test("save, read and remove, next to the other credentials", () => {
    expect(cuvetteToken({})).toEqual({ from: "none" });
    saveClaudeKey("sk-ant-api03-abcdefghijklmnop-WXYZ");
    const v = keyVersion();
    expect(saveCuvetteToken("cuv_abc")).toBe(credentialsPath());
    expect(keyVersion()).toBe(v + 1);
    expect(cuvetteToken({})).toEqual({ token: "cuv_abc", from: "file" });
    if (process.platform !== "win32") expect(statSync(credentialsPath()).mode & 0o777).toBe(0o600);
    expect(removeCuvetteToken()).toBe(true);
    expect(cuvetteToken({})).toEqual({ from: "none" });
    expect(removeCuvetteToken()).toBe(false);
  });

  test("the shell variable wins over the saved token", () => {
    saveCuvetteToken("cuv_file");
    expect(cuvetteToken({ CUVETTE_TOKEN: "cuv_env" })).toEqual({ token: "cuv_env", from: "env" });
  });

  test("the server address has a default and an override", () => {
    expect(cuvetteUrl({})).toBe("https://api.cuvette.ai");
    expect(cuvetteUrl({ CUVETTE_INFERENCE_URL: "http://localhost:8787//" })).toBe("http://localhost:8787");
  });
});

describe("account requests", () => {
  test("status reads the account with the device token", async () => {
    saveCuvetteToken("cuv_abc");
    const s = stub(json(200, ACCOUNT));
    expect(await getAccount({ fetch: s.fn })).toEqual(ACCOUNT);
    expect(s.calls).toEqual([{ url: "https://api.cuvette.ai/v1/account", method: "GET", auth: "Bearer cuv_abc", body: undefined }]);
  });

  test("the server address comes from CUVETTE_INFERENCE_URL", async () => {
    saveCuvetteToken("cuv_abc");
    const s = stub(json(200, ACCOUNT));
    await getAccount({ fetch: s.fn, env: { CUVETTE_INFERENCE_URL: "http://localhost:9" } });
    expect(s.calls[0]!.url).toBe("http://localhost:9/v1/account");
  });

  test("without a token no request goes out", async () => {
    const s = stub();
    await expect(getAccount({ fetch: s.fn })).rejects.toThrow("You are not signed in to Cuvette. Run `cuvette account login`");
    expect(s.calls).toHaveLength(0);
  });

  test("the usage request asks for json with a range, and the export asks for csv", async () => {
    saveCuvetteToken("cuv_abc");
    const report = { rows: [], sessions: [] };
    const s = stub(json(200, report), new Response("at,model\n", { status: 200, headers: { "content-type": "text/csv" } }));
    expect(await getUsage({ fetch: s.fn }, { from: "2026-10-01T00:00:00Z", to: "2026-10-14T00:00:00Z" })).toEqual(report);
    expect(await getUsageCsv({ fetch: s.fn }, {})).toBe("at,model\n");
    expect(s.calls[0]!.url).toBe("https://api.cuvette.ai/v1/usage?from=2026-10-01T00%3A00%3A00Z&to=2026-10-14T00%3A00%3A00Z&format=json");
    expect(s.calls[1]!.url).toBe("https://api.cuvette.ai/v1/usage?format=csv");
  });

  test("the price list needs no token", async () => {
    const s = stub(json(200, { plans: [], topup: { price_usd: 10, allowance_usd: 8 }, model_prices_per_million: {}, records: [], never_stored: [] }));
    expect((await getPricing({ fetch: s.fn })).topup.price_usd).toBe(10);
    expect(s.calls[0]).toMatchObject({ url: "https://api.cuvette.ai/v1/pricing", auth: null });
  });

  test("devices: list and revoke", async () => {
    saveCuvetteToken("cuv_abc");
    const s = stub(json(200, { devices: [{ id: "dev_1", name: "Mac (app)", created_at: "x", last_used_at: null, current: true }] }), new Response(null, { status: 204 }));
    expect((await getDevices({ fetch: s.fn }))[0]!.id).toBe("dev_1");
    await revokeDevice({ fetch: s.fn }, "dev_2");
    expect(s.calls[1]).toMatchObject({ url: "https://api.cuvette.ai/v1/devices/dev_2", method: "DELETE" });
  });

  test("checkout: a plan, a top-up and the billing page", async () => {
    saveCuvetteToken("cuv_abc");
    const s = stub(json(200, { url: "https://checkout.stripe.com/a" }), json(200, { url: "https://checkout.stripe.com/b" }), json(200, { url: "https://billing.stripe.com/c" }));
    expect(await checkoutUrl({ plan: "standard", interval: "year" }, { fetch: s.fn })).toBe("https://checkout.stripe.com/a");
    expect(await checkoutUrl({ topup: true }, { fetch: s.fn })).toBe("https://checkout.stripe.com/b");
    expect(await billingUrl({ fetch: s.fn })).toBe("https://billing.stripe.com/c");
    expect(s.calls.map((c) => c.body)).toEqual([{ plan: "standard", interval: "year" }, { topup: true }, undefined]);
    expect(s.calls.map((c) => c.url.replace("https://api.cuvette.ai", ""))).toEqual(["/v1/checkout", "/v1/checkout", "/v1/billing/portal"]);
  });

  test("an unknown plan never reaches the server", async () => {
    saveCuvetteToken("cuv_abc");
    const s = stub();
    await expect(checkoutUrl({ plan: "gold", interval: "month" }, { fetch: s.fn })).rejects.toBeInstanceOf(AccountError);
    await expect(changePlan("gold", "month", { fetch: s.fn })).rejects.toBeInstanceOf(AccountError);
    expect(s.calls).toHaveLength(0);
  });

  test("a plan change returns the status", async () => {
    saveCuvetteToken("cuv_abc");
    const s = stub(json(200, { status: "scheduled", effective_at: "2026-11-14T00:00:00Z" }));
    expect(await changePlan("basic", "month", { fetch: s.fn })).toEqual({ status: "scheduled", effective_at: "2026-11-14T00:00:00Z" });
    expect(s.calls[0]).toMatchObject({ url: "https://api.cuvette.ai/v1/plan", method: "POST", body: { plan: "basic", interval: "month" } });
  });

  test("sign out revokes the device and removes the token", async () => {
    saveCuvetteToken("cuv_abc");
    const s = stub(new Response(null, { status: 204 }));
    expect(await logout({ fetch: s.fn })).toEqual({ revoked: true });
    expect(s.calls[0]).toMatchObject({ url: "https://api.cuvette.ai/v1/auth/logout", method: "POST", auth: "Bearer cuv_abc" });
    expect(cuvetteToken({}).from).toBe("none");
  });

  test("sign out removes the token even if the server is down", async () => {
    saveCuvetteToken("cuv_abc");
    const down = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    expect(await logout({ fetch: down })).toEqual({ revoked: false });
    expect(cuvetteToken({}).from).toBe("none");
  });

  test("a network failure has its own text", async () => {
    saveCuvetteToken("cuv_abc");
    const down = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    await expect(getAccount({ fetch: down })).rejects.toThrow("Cannot reach the Cuvette server");
  });
});

describe("error texts", () => {
  const body = (type: string, extra: object = {}) => ({ type: "error", error: { type, message: "x", ...extra } });

  test("each error type of the contract has a text", () => {
    expect(hostedError(401, body("authentication_error"))!.text).toContain("Sign in again");
    expect(hostedError(403, body("model_not_in_plan"))!.text).toBe("Your plan does not include this model. Choose another model, or choose a larger plan.");
    expect(hostedError(403, body("account_suspended"))!.text).toContain("suspended");
    expect(hostedError(403, body("no_plan"))!.text).toContain("no plan");
    expect(hostedError(409, body("already_subscribed"))!.text).toContain("already have a plan");
    expect(hostedError(429, body("too_many_requests"))).toMatchObject({ transient: true, text: expect.stringContaining("busy") });
  });

  test("402 shows the reset time", () => {
    const e = hostedError(402, body("allowance_used_up", { resets_at: "2026-11-01T00:00:00Z" }))!;
    expect(e.text).toBe(`Your allowance is used up. It resets on ${resetText("2026-11-01T00:00:00Z")}. Buy a top-up, or choose a larger plan.`);
    expect(e.text).toMatch(/2026/);
    expect(hostedError(402, body("allowance_used_up"))!.text).toBe("Your allowance is used up. Buy a top-up, or choose a larger plan.");
  });

  test("429 rate_limited shows the wait time and does not retry", () => {
    const e = hostedError(429, body("rate_limited", { retry_after: 1800 }))!;
    expect(e).toEqual({ type: "rate_limited", text: "You reached the limit for five hours. Wait 30 minutes and retry.", transient: false });
    expect(hostedError(429, body("rate_limited"), "90")!.text).toContain("Wait 2 minutes");
    expect(hostedError(429, body("rate_limited"))!.text).toContain("Wait a few minutes");
  });

  test("the wait text counts seconds, minutes and hours", () => {
    expect([1, 45, 60, 61, 3599, 3600, 7300].map(waitText)).toEqual(["1 second", "45 seconds", "1 minute", "2 minutes", "60 minutes", "1 hour", "3 hours"]);
  });

  test("an unknown error type has no text of its own", () => {
    expect(hostedError(500, body("api_error"))).toBeUndefined();
    expect(hostedError(404, undefined)).toBeUndefined();
  });

  test("a request error uses the text for its type", async () => {
    saveCuvetteToken("cuv_abc");
    const s = stub(json(402, { type: "error", error: { type: "allowance_used_up", message: "x", resets_at: "2026-11-01T00:00:00Z" } }));
    await expect(getAccount({ fetch: s.fn })).rejects.toThrow("Your allowance is used up. It resets on");
    const s2 = stub(json(409, { type: "error", error: { type: "already_subscribed", message: "x" } }));
    await expect(checkoutUrl({ plan: "lab", interval: "month" }, { fetch: s2.fn })).rejects.toThrow("already have a plan");
    const s3 = stub(json(502, {}));
    await expect(getAccount({ fetch: s3.fn })).rejects.toThrow("The Cuvette server returned HTTP 502.");
  });
});

describe("account text", () => {
  test("the meter counts the used part of the allowance", () => {
    expect(meterFraction(ACCOUNT)).toBeCloseTo(0.6, 6);
    expect(meterFraction({ allowance_usd: 0, allowance_remaining_usd: 0 })).toBe(1);
    expect(meterFraction({ allowance_usd: 10, allowance_remaining_usd: -1 })).toBe(1);
  });

  test("analyses left", () => {
    expect(analysesText(9)).toBe("about 9 analyses left");
    expect(analysesText(1)).toBe("about 1 analysis left");
  });

  test("status lines show dollars", () => {
    const lines = accountLines(ACCOUNT).join("\n");
    expect(lines).toContain("google (a@b.c)");
    expect(lines).toContain("Allowance: $6.00 of $15.00 left.");
    expect(lines).toContain("Top-up: $2.50 left.");
    expect(lines).toContain("about 9 analyses left (an analysis costs $0.62 on average).");
  });
});

describe("setup", () => {
  const home = () => mkdtempSync(join(tmpdir(), "cuvette-acc-cwd-"));

  test("choosing Cuvette without a sign-in changes nothing", async () => {
    const cwd = home();
    const r = await chooseCuvette({ cwd, env: process.env });
    expect(r).toEqual({ ok: false, text: expect.stringContaining("not signed in") });
    expect(savedModel({ cwd, env: {} })).toBe("claude");
  });

  test("choosing Cuvette after a sign-in sets the model", async () => {
    saveCuvetteToken("cuv_new");
    const cwd = home();
    expect((await chooseCuvette({ cwd, env: process.env })).ok).toBe(true);
    expect(savedModel({ cwd, env: {} })).toBe("cuvette");
  });

  test("a sign-in keeps the model if a Claude key exists and the caller asks for that", async () => {
    saveCuvetteToken("cuv_new");
    saveClaudeKey("sk-ant-api03-abcdefghijklmnop-WXYZ");
    const cwd = home();
    const r = await chooseCuvette({ cwd, env: process.env }, { onlyIfNoKey: true });
    expect(r.ok).toBe(true);
    expect(savedModel({ cwd, env: {} })).toBe("claude");
  });
});
