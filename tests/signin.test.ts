import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AccountError } from "../src/core/account.ts";
import { cuvetteToken } from "../src/core/credentials.ts";
import { listenForCode, makePkce, providerId, PROVIDERS, redeemCode, signInFromTerminal, startUrl } from "../src/core/signin.ts";

const oldHome = process.env.CUVETTE_HOME;
beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-signin-"));
  vi.stubEnv("CUVETTE_TOKEN", "");
  vi.stubEnv("CUVETTE_INFERENCE_URL", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
});

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const ACCOUNT = { account_id: "acc_1", identities: [], plan: "none", interval: null, sub_status: "none", period_end: null, allowance_usd: 0, allowance_remaining_usd: 0, topup_remaining_usd: 0, analyses_left_estimate: 0, mean_cost_per_analysis_usd: 0.62, resets_at: null, models: [] };

describe("PKCE (Proof Key for Code Exchange)", () => {
  test("the challenge is the SHA-256 of the verifier, and the lengths fit the contract", () => {
    const p = makePkce();
    expect(p.challenge).toHaveLength(43);
    expect(p.challenge).toBe(createHash("sha256").update(p.verifier).digest("base64url"));
    expect(p.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(p.state).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
  });

  test("each call makes new values", () => {
    const a = makePkce();
    const b = makePkce();
    expect(a.verifier).not.toBe(b.verifier);
    expect(a.state).not.toBe(b.state);
  });
});

describe("the start URL", () => {
  test("has the provider, port, challenge and state", () => {
    const pkce = makePkce();
    const u = new URL(startUrl({}, { provider: "google", port: 51234, pkce }));
    expect(u.origin + u.pathname).toBe("https://api.cuvette.ai/v1/auth/start");
    expect(Object.fromEntries(u.searchParams)).toEqual({ provider: "google", port: "51234", challenge: pkce.challenge, state: pkce.state });
  });

  test("the paste flow uses the word paste", () => {
    const u = new URL(startUrl({ CUVETTE_INFERENCE_URL: "http://localhost:8787" }, { provider: "github", port: "paste", pkce: makePkce() }));
    expect(u.origin).toBe("http://localhost:8787");
    expect(u.searchParams.get("port")).toBe("paste");
  });

  test("the four providers are the only ones", () => {
    expect(PROVIDERS.map((p) => p.id)).toEqual(["google", "microsoft", "orcid", "github"]);
    expect(providerId("orcid")).toBe("orcid");
    expect(() => providerId("apple")).toThrow(AccountError);
  });
});

describe("redeem a code", () => {
  test("posts the code, verifier and device name, and saves the device token", async () => {
    const seen: { url: string; body: any; auth: string | null }[] = [];
    const fn = (async (url: string, init: RequestInit) => {
      seen.push({ url, body: JSON.parse(String(init.body)), auth: new Headers(init.headers).get("authorization") });
      return json(200, { token: "cuv_dev", device_id: "dev_1", account_id: "acc_1" });
    }) as unknown as typeof fetch;
    expect(await redeemCode({ fetch: fn }, { code: "c1", verifier: "v1", device: "Mac (app)" })).toEqual({ accountId: "acc_1", deviceId: "dev_1" });
    expect(seen[0]).toEqual({ url: "https://api.cuvette.ai/v1/auth/token", body: { code: "c1", verifier: "v1", device_name: "Mac (app)" }, auth: null });
    expect(cuvetteToken({}).token).toBe("cuv_dev");
  });

  test("invalid_grant has its own text and saves nothing", async () => {
    const fn = (async () => json(400, { type: "error", error: { type: "invalid_grant", message: "x" } })) as unknown as typeof fetch;
    await expect(redeemCode({ fetch: fn }, { code: "c", verifier: "v", device: "d" })).rejects.toThrow("The sign-in code is not valid, or it expired. Sign in again.");
    expect(cuvetteToken({}).from).toBe("none");
  });

  test("a 400 with no body also gets that text, and a 429 gets the rate text", async () => {
    await expect(redeemCode({ fetch: (async () => new Response("", { status: 400 })) as unknown as typeof fetch }, { code: "c", verifier: "v", device: "d" })).rejects.toThrow("not valid, or it expired");
    const limited = (async () => json(429, { type: "error", error: { type: "rate_limited", message: "x", retry_after: 60 } })) as unknown as typeof fetch;
    await expect(redeemCode({ fetch: limited }, { code: "c", verifier: "v", device: "d" })).rejects.toThrow("Wait 1 minute and retry.");
  });
});

describe("the one-time listener", () => {
  test("takes the code from a request with the right state, then closes", async () => {
    const l = await listenForCode("state-1");
    const r = await fetch(`http://127.0.0.1:${l.port}/auth/cuvette?code=abc&state=state-1`);
    expect(r.status).toBe(200);
    expect(await r.text()).toContain("You are signed in to Cuvette");
    expect(await l.wait()).toBe("abc");
    await expect(fetch(`http://127.0.0.1:${l.port}/auth/cuvette?code=abc&state=state-1`)).rejects.toThrow();
  });

  test("a wrong state ends the wait with an error", async () => {
    const l = await listenForCode("state-1");
    const done = l.wait().catch((e) => e);
    expect((await fetch(`http://127.0.0.1:${l.port}/auth/cuvette?code=abc&state=other`)).status).toBe(400);
    expect(await done).toBeInstanceOf(AccountError);
  });

  test("other paths get 404 and do not end the wait", async () => {
    const l = await listenForCode("state-1");
    expect((await fetch(`http://127.0.0.1:${l.port}/favicon.ico`)).status).toBe(404);
    await fetch(`http://127.0.0.1:${l.port}/auth/cuvette?code=zzz&state=state-1`);
    expect(await l.wait()).toBe("zzz");
  });

  test("a request with a foreign host header is ignored", async () => {
    const l = await listenForCode("state-1", 200);
    const { request } = await import("node:http");
    const status = await new Promise<number>((resolve) => {
      const req = request({ host: "127.0.0.1", port: l.port, path: "/auth/cuvette?code=abc&state=state-1", headers: { host: "evil.example" } }, (res) => resolve(res.statusCode ?? 0));
      req.end();
    });
    expect(status).toBe(404);
    await expect(l.wait()).rejects.toThrow("The sign-in did not finish");
  });

  test("it closes after the time limit", async () => {
    const l = await listenForCode("state-1", 30);
    await expect(l.wait()).rejects.toThrow("The sign-in did not finish");
  });
});

describe("sign in from a terminal", () => {
  test("browser flow: opens the start URL, waits for the redirect, exchanges the code", async () => {
    const said: string[] = [];
    let verifier = "";
    const fn = (async (url: string, init: RequestInit) => {
      if (url.endsWith("/v1/auth/token")) {
        verifier = JSON.parse(String(init.body)).verifier;
        return json(200, { token: "cuv_dev", device_id: "d", account_id: "acc_1" });
      }
      return json(200, ACCOUNT);
    }) as unknown as typeof fetch;
    const info = await signInFromTerminal({
      provider: "microsoft",
      browser: true,
      ctx: { fetch: fn },
      say: (t) => said.push(t),
      ask: async () => "",
      open: (url) => {
        const u = new URL(url);
        expect(u.searchParams.get("provider")).toBe("microsoft");
        void fetch(`http://127.0.0.1:${u.searchParams.get("port")}/auth/cuvette?code=thecode&state=${u.searchParams.get("state")}`);
      },
    });
    expect(info.account_id).toBe("acc_1");
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(cuvetteToken({}).token).toBe("cuv_dev");
    expect(said[0]).toContain("This command waits 5 minutes");
  });

  test("--no-browser: prints a start URL with port paste and asks for the code", async () => {
    const said: string[] = [];
    const bodies: any[] = [];
    const fn = (async (url: string, init: RequestInit) => {
      if (url.endsWith("/v1/auth/token")) {
        bodies.push(JSON.parse(String(init.body)));
        return json(200, { token: "cuv_dev", device_id: "d", account_id: "acc_1" });
      }
      return json(200, ACCOUNT);
    }) as unknown as typeof fetch;
    let opened = false;
    await signInFromTerminal({ provider: "github", browser: false, ctx: { fetch: fn }, say: (t) => said.push(t), ask: async () => " pasted-code ", open: () => void (opened = true) });
    expect(opened).toBe(false);
    const url = new URL(said[0]!.split("\n")[1]!);
    expect(url.searchParams.get("port")).toBe("paste");
    expect(createHash("sha256").update(bodies[0].verifier).digest("base64url")).toBe(url.searchParams.get("challenge"));
    expect(bodies[0].code).toBe("pasted-code");
    expect(bodies[0].device_name).toContain("(command line)");
  });

  test("--no-browser with an empty answer stops", async () => {
    await expect(signInFromTerminal({ provider: "github", browser: false, ctx: { fetch: (async () => json(500, {})) as unknown as typeof fetch }, say: () => {}, ask: async () => "  ", open: () => {} })).rejects.toThrow("No code given.");
  });
});
