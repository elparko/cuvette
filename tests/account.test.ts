import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { accountStatus, AccountError, balanceText, checkoutUrl, createAccount } from "../src/core/account.ts";
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

describe("account create", () => {
  test("posts without auth and saves the token", async () => {
    const s = stub(json(201, { account_id: "acc_1", token: "cuv_new" }));
    const r = await createAccount({ fetch: s.fn });
    expect(r.accountId).toBe("acc_1");
    expect(s.calls).toEqual([{ url: "https://api.cuvette.ai/v1/accounts", method: "POST", auth: null, body: undefined }]);
    expect(cuvetteToken({}).token).toBe("cuv_new");
  });

  test("a rate limit shows a clear message and saves nothing", async () => {
    const s = stub(json(429, { type: "error", error: { type: "too_many_requests", message: "x" } }));
    await expect(createAccount({ fetch: s.fn })).rejects.toThrow(/busy/);
    expect(cuvetteToken({}).from).toBe("none");
  });

  test("a network failure shows a clear message", async () => {
    const fn = (async () => {
      throw new Error("fetch failed");
    }) as unknown as typeof fetch;
    await expect(createAccount({ fetch: fn })).rejects.toThrow("Cannot reach the Cuvette server");
  });
});

describe("account status", () => {
  test("sends the bearer token and reads the balance", async () => {
    saveCuvetteToken("cuv_abc");
    const s = stub(json(200, { account_id: "acc_1", balance_usd: 7.5 }));
    expect(await accountStatus({ fetch: s.fn })).toEqual({ accountId: "acc_1", balanceUsd: 7.5 });
    expect(s.calls[0]).toMatchObject({ url: "https://api.cuvette.ai/v1/account", method: "GET", auth: "Bearer cuv_abc" });
    expect(balanceText(7.5)).toBe("$7.50");
  });

  test("uses the address from the environment", async () => {
    saveCuvetteToken("cuv_abc");
    const s = stub(json(200, { account_id: "a", balance_usd: 0 }));
    await accountStatus({ fetch: s.fn, env: { CUVETTE_INFERENCE_URL: "http://localhost:9" } });
    expect(s.calls[0]!.url).toBe("http://localhost:9/v1/account");
  });

  test("no token means no request", async () => {
    const s = stub();
    await expect(accountStatus({ fetch: s.fn })).rejects.toThrow("cuvette account create");
    expect(s.calls).toHaveLength(0);
  });

  test("401 shows the token message", async () => {
    saveCuvetteToken("cuv_bad");
    const s = stub(json(401, {}));
    await expect(accountStatus({ fetch: s.fn })).rejects.toThrow("Your Cuvette account token is not valid. Run `cuvette account status`.");
  });
});

describe("account buy", () => {
  test("posts the amount and returns the checkout address", async () => {
    saveCuvetteToken("cuv_abc");
    const s = stub(json(200, { url: "https://checkout.stripe.com/c/pay/x" }));
    expect(await checkoutUrl(25, { fetch: s.fn })).toBe("https://checkout.stripe.com/c/pay/x");
    expect(s.calls[0]).toMatchObject({ url: "https://api.cuvette.ai/v1/checkout", method: "POST", auth: "Bearer cuv_abc", body: { amount_usd: 25 } });
  });

  test("only 10, 25 and 50 are allowed", async () => {
    saveCuvetteToken("cuv_abc");
    const s = stub();
    await expect(checkoutUrl(5, { fetch: s.fn })).rejects.toBeInstanceOf(AccountError);
    expect(s.calls).toHaveLength(0);
  });
});

describe("setup", () => {
  test("choosing Cuvette makes the account, reads the balance and sets the model", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "cuvette-acc-cwd-"));
    const s = stub(json(201, { account_id: "acc_1", token: "cuv_new" }), json(200, { account_id: "acc_1", balance_usd: 0 }));
    const r = await chooseCuvette({ cwd, env: process.env, fetch: s.fn });
    expect(r).toMatchObject({ ok: true, balanceUsd: 0 });
    expect(s.calls.map((c) => c.url)).toEqual(["https://api.cuvette.ai/v1/accounts", "https://api.cuvette.ai/v1/account"]);
    expect(cuvetteToken({}).token).toBe("cuv_new");
    expect(savedModel({ cwd, env: {} })).toBe("cuvette");
  });

  test("an existing token is reused", async () => {
    saveCuvetteToken("cuv_old");
    const cwd = mkdtempSync(join(tmpdir(), "cuvette-acc-cwd-"));
    const s = stub(json(200, { account_id: "acc_1", balance_usd: 3 }));
    await chooseCuvette({ cwd, env: process.env, fetch: s.fn });
    expect(s.calls).toHaveLength(1);
    expect(cuvetteToken({}).token).toBe("cuv_old");
  });
});
