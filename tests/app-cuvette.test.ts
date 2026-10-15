import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cuvetteToken, saveClaudeKey, saveCuvetteToken } from "../src/core/credentials.ts";
import { savedModel } from "../src/core/firststart.ts";
import { changeSetting } from "../src/core/settings.ts";
import { makePkce } from "../src/core/signin.ts";
import { startApp, type AppHandle } from "../src/server/app.ts";
import { FakeSession } from "../src/ui/fake-session.ts";

const oldHome = process.env.CUVETTE_HOME;
let app: AppHandle | undefined;
let home = "";

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cuvette-app-cuv-"));
  process.env.CUVETTE_HOME = home;
  vi.stubEnv("CUVETTE_TOKEN", "");
  vi.stubEnv("CUVETTE_NO_OPEN", "1");
  vi.stubEnv("CUVETTE_INFERENCE_URL", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
});
afterEach(async () => {
  await app?.close();
  app = undefined;
  vi.unstubAllEnvs();
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
});

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const ACCOUNT = {
  account_id: "acc_1",
  identities: [{ provider: "github", email: null }],
  plan: "basic",
  interval: "month",
  sub_status: "active",
  period_end: "2026-11-14T00:00:00Z",
  allowance_usd: 7,
  allowance_remaining_usd: 7,
  topup_remaining_usd: 0,
  analyses_left_estimate: 11,
  mean_cost_per_analysis_usd: 0.62,
  resets_at: "2026-11-01T00:00:00Z",
  models: ["claude-sonnet-5-5"],
};

function server(routes: Record<string, (init: RequestInit | undefined) => Response>) {
  const calls: { path: string; method: string; auth: string | null; body: any }[] = [];
  const fn = (async (url: string | URL, init?: RequestInit) => {
    const path = new URL(String(url)).pathname + new URL(String(url)).search;
    calls.push({ path, method: init?.method ?? "GET", auth: new Headers(init?.headers).get("authorization"), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const key = Object.keys(routes).find((k) => path.startsWith(k));
    return key ? routes[key]!(init) : json(404, {});
  }) as unknown as typeof fetch;
  return { fn, calls };
}

async function start(env: Record<string, string | undefined>, fetchFn?: typeof fetch) {
  app = await startApp({ env, model: "claude", start: home, session: new FakeSession(), fetch: fetchFn });
  const base = `http://127.0.0.1:${app.port}`;
  return {
    base,
    get: (p: string) => fetch(`${base}/${p}${p.includes("?") ? "&" : "?"}t=${app!.token}`),
    post: (p: string, body: unknown) => fetch(`${base}/${p}`, { method: "POST", headers: { "content-type": "application/json", "x-token": app!.token }, body: JSON.stringify(body) }),
  };
}

describe("hosted mode off", () => {
  test("no Cuvette route answers and the sign-in route is closed", async () => {
    const c = await start({});
    for (const p of ["api/cuvette", "api/cuvette/signin", "api/cuvette/pricing", "api/firststart/cuvette"]) expect((await c.post(p, {})).status).toBe(404);
    expect((await c.get("api/cuvette/usage.csv")).status).toBe(404);
    expect((await fetch(`${c.base}/auth/cuvette?code=a&state=b`)).status).toBe(401);
  });

  test("the first-start choices and the settings rows show no Cuvette control", async () => {
    const c = await start({});
    const fs = await (await c.post("api/firststart", {})).json();
    expect(fs.choices.map((x: { id: string }) => x.id)).toEqual(["claude", "local"]);
    expect(fs.notice).toBeUndefined();
    const rows = (await (await c.get("api/settings.json")).json()) as { rows?: { name: string }[]; groups?: unknown };
    expect(JSON.stringify(rows)).not.toContain("cuvette_account");
    expect(JSON.stringify(rows)).not.toContain("hosted_mode");
  });
});

describe("hosted mode on", () => {
  const env = { CUVETTE_HOSTED: "1" };

  test("the first-start choices include Cuvette and the notice", async () => {
    const c = await start(env);
    const fs = await (await c.post("api/firststart", {})).json();
    expect(fs.choices.map((x: { id: string }) => x.id)).toEqual(["claude", "cuvette", "local"]);
    expect(fs.notice).toContain("The Cuvette server does not keep the data");
  });

  test("the settings rows include the Cuvette account", async () => {
    const c = await start(env);
    expect(JSON.stringify(await (await c.get("api/settings.json")).json())).toContain("cuvette_account");
  });

  test("the setting hosted_mode in the user settings turns it on", async () => {
    writeFileSync(join(home, "settings.json"), JSON.stringify({ hosted_mode: true }));
    const c = await start({});
    expect((await c.post("api/cuvette", {})).status).toBe(200);
  });

  test("signed out: the state lists the four providers", async () => {
    const c = await start(env);
    const r = await (await c.post("api/cuvette", {})).json();
    expect(r.signedIn).toBe(false);
    expect(r.providers.map((p: { id: string }) => p.id)).toEqual(["google", "microsoft", "orcid", "github"]);
  });

  test("signed in: the state has the account", async () => {
    saveCuvetteToken("cuv_abc");
    const s = server({ "/v1/account": () => json(200, ACCOUNT) });
    const c = await start(env, s.fn);
    const r = await (await c.post("api/cuvette", {})).json();
    expect(r).toMatchObject({ signedIn: true, account: { plan: "basic", analyses_left_estimate: 11 } });
    expect(s.calls[0]).toMatchObject({ path: "/v1/account", auth: "Bearer cuv_abc" });
  });

  test("signed in, but the server refuses the token: the state keeps the error text", async () => {
    saveCuvetteToken("cuv_abc");
    const s = server({ "/v1/account": () => json(401, { type: "error", error: { type: "authentication_error", message: "x" } }) });
    const c = await start(env, s.fn);
    const r = await (await c.post("api/cuvette", {})).json();
    expect(r).toMatchObject({ signedIn: true, account: null });
    expect(r.error).toContain("Sign in again");
  });

  test("an unknown provider is refused", async () => {
    const c = await start(env);
    const r = await c.post("api/cuvette/signin", { provider: "yahoo" });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toContain("Choose a provider");
  });

  describe("the sign-in", () => {
    const begin = async (c: Awaited<ReturnType<typeof start>>, body: object = {}) => {
      const r = await (await c.post("api/cuvette/signin", { provider: "orcid", ...body })).json();
      const url = new URL(r.url);
      return { url, state: url.searchParams.get("state")!, challenge: url.searchParams.get("challenge")! };
    };

    test("the start URL has the provider, the sidecar port, a challenge and a state", async () => {
      const c = await start(env);
      const { url, state, challenge } = await begin(c);
      expect(url.origin + url.pathname).toBe("https://api.cuvette.ai/v1/auth/start");
      expect(url.searchParams.get("provider")).toBe("orcid");
      expect(url.searchParams.get("port")).toBe(String(app!.port));
      expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(state).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    });

    test("the callback needs no app token, but needs a pending state, and works once", async () => {
      const token = { token: "cuv_new", device_id: "dev_1", account_id: "acc_1" };
      const s = server({ "/v1/auth/token": () => json(200, token), "/v1/account": () => json(200, ACCOUNT) });
      const c = await start(env, s.fn);
      const { state } = await begin(c);
      const bad = await fetch(`${c.base}/auth/cuvette?code=abc&state=${"x".repeat(32)}`);
      expect(bad.status).toBe(400);
      expect(s.calls).toHaveLength(0);
      const ok = await fetch(`${c.base}/auth/cuvette?code=abc&state=${state}`);
      expect(ok.status).toBe(200);
      expect(await ok.text()).toContain("You are signed in to Cuvette");
      expect(s.calls[0]).toMatchObject({ path: "/v1/auth/token", method: "POST", auth: null });
      expect(s.calls[0]!.body).toMatchObject({ code: "abc" });
      expect(s.calls[0]!.body.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(s.calls[0]!.body.device_name).toContain("(app)");
      expect(cuvetteToken({}).token).toBe("cuv_new");
      expect(savedModel({ cwd: home, env: {} })).toBe("cuvette:claude-sonnet-5-5");
      const again = await fetch(`${c.base}/auth/cuvette?code=abc&state=${state}`);
      expect(again.status).toBe(400);
      expect(s.calls.filter((x) => x.path === "/v1/auth/token")).toHaveLength(1);
    });

    test("an error in the redirect sets the error text and stops the waiting", async () => {
      const s = server({ "/v1/auth/token": () => json(200, {}) });
      const c = await start(env, s.fn);
      for (const [error, text] of [
        ["access_denied", "You stopped the sign-in."],
        ["sign_in_failed", "The sign-in did not finish. Try again."],
      ] as const) {
        const { state } = await begin(c);
        expect((await (await c.post("api/cuvette", {})).json()).waiting).toBe(true);
        const r = await fetch(`${c.base}/auth/cuvette?error=${error}&state=${state}`);
        expect(r.status).toBe(400);
        expect(await r.text()).toContain(text);
        const st = await (await c.post("api/cuvette", {})).json();
        expect(st).toMatchObject({ signedIn: false, waiting: false, error: text });
      }
      expect(s.calls).toHaveLength(0);
    });

    test("an error with an unknown state sets no error text", async () => {
      const c = await start(env);
      expect((await fetch(`${c.base}/auth/cuvette?error=access_denied&state=${"x".repeat(32)}`)).status).toBe(400);
      expect((await (await c.post("api/cuvette", {})).json()).error).toBe("");
    });

    test("add a sign-in method: asks the server for the link, opens it, and keeps the model", async () => {
      saveCuvetteToken("cuv_old");
      const s = server({
        "/v1/auth/link": () => json(200, { url: "https://api.cuvette.ai/v1/auth/start?provider=github&link=abc" }),
        "/v1/auth/token": () => json(200, { linked: true, account_id: "acc_1" }),
        "/v1/account": () => json(200, ACCOUNT),
      });
      const c = await start(env, s.fn);
      const r = await (await c.post("api/cuvette/link", { provider: "github" })).json();
      expect(r.url).toContain("link=abc");
      expect(s.calls[0]).toMatchObject({ path: "/v1/auth/link", method: "POST", auth: "Bearer cuv_old" });
      expect(s.calls[0]!.body).toMatchObject({ provider: "github", port: String(app!.port) });
      const { challenge, state } = s.calls[0]!.body;
      expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect((await fetch(`${c.base}/auth/cuvette?code=abc&state=${state}`)).status).toBe(200);
      expect(cuvetteToken({}).token).toBe("cuv_old");
      expect(s.calls.at(-1)).toMatchObject({ path: "/v1/account", auth: "Bearer cuv_old" });
      expect(savedModel({ cwd: home, env: {} })).toBe("claude");
    });

    test("add a sign-in method: a sign-in of another account shows the account_taken text and keeps the token", async () => {
      saveCuvetteToken("cuv_old");
      const s = server({ "/v1/auth/link": () => json(200, { url: "https://api.cuvette.ai/v1/auth/start?provider=github&link=abc" }), "/v1/account": () => json(200, ACCOUNT) });
      const c = await start(env, s.fn);
      await c.post("api/cuvette/link", { provider: "github" });
      const { state } = s.calls[0]!.body;
      const r = await fetch(`${c.base}/auth/cuvette?error=account_taken&state=${state}`);
      expect(r.status).toBe(400);
      expect(await r.text()).toContain("This sign-in belongs to another Cuvette account. Sign out and sign in with it, or use a different sign-in.");
      expect((await (await c.post("api/cuvette", {})).json()).error).toBe("This sign-in belongs to another Cuvette account. Sign out and sign in with it, or use a different sign-in.");
      expect(s.calls.some((x) => x.path === "/v1/auth/token")).toBe(false);
      expect(cuvetteToken({}).token).toBe("cuv_old");
    });

    test("add a sign-in method: a server refusal shows its text", async () => {
      saveCuvetteToken("cuv_old");
      const s = server({ "/v1/auth/link": () => json(400, { type: "error", error: { type: "invalid_request_error", message: "The provider must be google." } }) });
      const c = await start(env, s.fn);
      const r = await c.post("api/cuvette/link", { provider: "github" });
      expect(r.status).toBe(400);
      expect((await r.json()).error).toContain("Update Cuvette");
    });

    test("a signed-in state moves a model that the plan does not include to the first listed plan model", async () => {
      saveCuvetteToken("cuv_abc");
      await changeSetting({ cwd: home, env: {} }, "model", "cuvette", "user");
      const s = server({ "/v1/account": () => json(200, { ...ACCOUNT, models: ["claude-future-9", "claude-haiku-5-5", "claude-sonnet-5-5"] }) });
      const c = await start(env, s.fn);
      await c.post("api/cuvette", {});
      expect(savedModel({ cwd: home, env: {} })).toBe("cuvette:claude-haiku-5-5");
      await c.post("api/cuvette", {});
      expect(savedModel({ cwd: home, env: {} })).toBe("cuvette:claude-haiku-5-5");
    });

    test("a signed-in state keeps a plan model, and does not touch a Claude model", async () => {
      saveCuvetteToken("cuv_abc");
      const s = server({ "/v1/account": () => json(200, { ...ACCOUNT, models: ["claude-opus-5-5", "claude-sonnet-5-5"] }) });
      const c = await start(env, s.fn);
      await changeSetting({ cwd: home, env: {} }, "model", "cuvette", "user");
      await c.post("api/cuvette", {});
      expect(savedModel({ cwd: home, env: {} })).toBe("cuvette");
      await changeSetting({ cwd: home, env: {} }, "model", "claude:claude-haiku-5-5", "user");
      await c.post("api/cuvette", {});
      expect(savedModel({ cwd: home, env: {} })).toBe("claude:claude-haiku-5-5");
    });

    test("the verifier matches the challenge of the start URL", async () => {
      const s = server({ "/v1/auth/token": () => json(200, { token: "cuv_new", device_id: "d", account_id: "a" }) });
      const c = await start(env, s.fn);
      const { state, challenge } = await begin(c);
      await fetch(`${c.base}/auth/cuvette?code=abc&state=${state}`);
      const { createHash } = await import("node:crypto");
      expect(createHash("sha256").update(s.calls[0]!.body.verifier).digest("base64url")).toBe(challenge);
    });

    test("a refused code saves no token and shows the error in the state", async () => {
      const s = server({ "/v1/auth/token": () => json(400, { type: "error", error: { type: "invalid_grant", message: "x" } }) });
      const c = await start(env, s.fn);
      const { state } = await begin(c);
      expect((await fetch(`${c.base}/auth/cuvette?code=abc&state=${state}`)).status).toBe(400);
      expect(cuvetteToken({}).from).toBe("none");
      const st = await (await c.post("api/cuvette", {})).json();
      expect(st.error).toBe("The sign-in code is not valid, or it expired. Sign in again.");
    });

    test("the callback does not change the model if a Claude key exists, unless the setup asked for Cuvette", async () => {
      saveClaudeKey("sk-ant-api03-abcdefghijklmnop-WXYZ");
      const s = server({ "/v1/auth/token": () => json(200, { token: "cuv_new", device_id: "d", account_id: "a" }) });
      const c = await start(env, s.fn);
      const first = await begin(c);
      await fetch(`${c.base}/auth/cuvette?code=abc&state=${first.state}`);
      expect(savedModel({ cwd: home, env: {} })).toBe("claude");
      const second = await begin(c, { use: true });
      await fetch(`${c.base}/auth/cuvette?code=abc&state=${second.state}`);
      expect(savedModel({ cwd: home, env: {} })).toBe("cuvette");
    });

    test("only the GET method and the right host are accepted", async () => {
      const c = await start(env);
      const { state } = await begin(c);
      expect((await fetch(`${c.base}/auth/cuvette?code=abc&state=${state}`, { method: "POST" })).status).toBe(401);
      const wrong = await fetch(`${c.base}/auth/cuvette?code=abc&state=${state}`, { headers: { origin: "https://evil.example" } });
      expect(wrong.status).toBe(403);
    });

    test("a state from makePkce that was never started is refused", async () => {
      const c = await start(env);
      expect((await fetch(`${c.base}/auth/cuvette?code=abc&state=${makePkce().state}`)).status).toBe(400);
    });
  });

  describe("the account actions", () => {
    beforeEach(() => saveCuvetteToken("cuv_abc"));

    test("usage, csv, pricing and devices go to the server", async () => {
      const s = server({
        "/v1/usage?from": (init) => json(200, { rows: [], sessions: [] }),
        "/v1/usage?format=csv": () => new Response("at,model\n", { status: 200, headers: { "content-type": "text/csv" } }),
        "/v1/pricing": () => json(200, { plans: [], topup: { price_usd: 10, allowance_usd: 8 }, model_prices_per_million: {}, records: ["token counts"], never_stored: ["prompts"] }),
        "/v1/devices": () => json(200, { devices: [{ id: "dev_1", name: "Mac", created_at: "x", last_used_at: null, current: true }] }),
      });
      const c = await start(env, s.fn);
      expect(await (await c.post("api/cuvette/usage", { from: "2026-10-01T00:00:00Z", to: "2026-10-14T00:00:00Z" })).json()).toEqual({ rows: [], sessions: [] });
      const csv = await c.get("api/cuvette/usage.csv");
      expect(csv.headers.get("content-type")).toContain("text/csv");
      expect(csv.headers.get("content-disposition")).toContain("cuvette-usage.csv");
      expect(await csv.text()).toBe("at,model\n");
      expect((await (await c.post("api/cuvette/pricing", {})).json()).never_stored).toEqual(["prompts"]);
      expect((await (await c.post("api/cuvette/devices", {})).json()).devices[0].id).toBe("dev_1");
      expect(s.calls.find((x) => x.path.startsWith("/v1/pricing"))!.auth).toBeNull();
      expect(s.calls[0]!.path).toBe("/v1/usage?from=2026-10-01T00%3A00%3A00Z&to=2026-10-14T00%3A00%3A00Z&format=json");
    });

    test("checkout, plan change and billing", async () => {
      const s = server({
        "/v1/checkout": () => json(200, { url: "https://checkout.stripe.com/x" }),
        "/v1/plan": () => json(200, { status: "changed", effective_at: "2026-10-14T00:00:00Z" }),
        "/v1/billing/portal": () => json(200, { url: "https://billing.stripe.com/y" }),
        "/v1/devices/dev_2": () => new Response(null, { status: 204 }),
      });
      const c = await start(env, s.fn);
      expect((await (await c.post("api/cuvette/checkout", { plan: "lab", interval: "year" })).json()).url).toBe("https://checkout.stripe.com/x");
      expect((await (await c.post("api/cuvette/checkout", { topup: true })).json()).url).toBe("https://checkout.stripe.com/x");
      expect(s.calls.map((x) => x.body)).toEqual([{ plan: "lab", interval: "year" }, { topup: true }]);
      expect((await (await c.post("api/cuvette/plan", { plan: "basic", interval: "month" })).json()).status).toBe("changed");
      expect((await (await c.post("api/cuvette/portal", {})).json()).url).toBe("https://billing.stripe.com/y");
      expect((await c.post("api/cuvette/devices/remove", { id: "dev_2" })).status).toBe(200);
      expect(s.calls.at(-1)).toMatchObject({ path: "/v1/devices/dev_2", method: "DELETE" });
    });

    test("a server error shows its text", async () => {
      const s = server({ "/v1/checkout": () => json(409, { type: "error", error: { type: "already_subscribed", message: "x" } }) });
      const c = await start(env, s.fn);
      const r = await c.post("api/cuvette/checkout", { plan: "lab", interval: "month" });
      expect(r.status).toBe(400);
      expect((await r.json()).error).toContain("already have a plan");
    });

    test("sign out removes the token", async () => {
      const s = server({ "/v1/auth/logout": () => new Response(null, { status: 204 }) });
      const c = await start(env, s.fn);
      expect(await (await c.post("api/cuvette/logout", {})).json()).toEqual({ revoked: true });
      expect(cuvetteToken({}).from).toBe("none");
    });

    test("the removed routes answer 404", async () => {
      const c = await start(env);
      expect((await c.post("api/cuvette/buy", { amount: 10 })).status).toBe(404);
    });
  });
});

describe("the setup screen", () => {
  const state = async (env: Record<string, string | undefined>) => {
    app = await startApp({ env, start: home, doctor: async () => [] });
    return (await (await fetch(`http://127.0.0.1:${app.port}/api/state?t=${app.token}`)).json()) as { setup: boolean };
  };

  test("a signed-in user with no Claude key does not see it, when hosted mode is on", async () => {
    saveCuvetteToken("cuv_abc");
    expect((await state({ CUVETTE_HOSTED: "1" })).setup).toBe(false);
  });

  test("a user with no key and no sign-in sees it", async () => {
    expect((await state({ CUVETTE_HOSTED: "1" })).setup).toBe(true);
  });

  test("with hosted mode off a saved token changes nothing", async () => {
    saveCuvetteToken("cuv_abc");
    expect((await state({})).setup).toBe(true);
  });
});
