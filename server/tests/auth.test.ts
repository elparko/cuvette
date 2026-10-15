import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addAccount, call, makeEnv, mockFetch, post, sha256Hex } from "./helpers.ts";
import { APP_STATE, CLIENT_IDS, MS_TENANT, claimsFor, exchange, makeKeys, resetSso, signIn, startOnly } from "./sso.ts";

beforeEach(resetSso);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function login(env = makeEnv(), o: Parameters<typeof signIn>[1] = {}) {
  const r = await signIn(env, o);
  expect(r.callback?.status).toBe(302);
  const { res } = await exchange(env, r.code!, r.verifier);
  expect(res.status).toBe(200);
  const body = (await res.json()) as { token: string; device_id: string; account_id: string };
  return { env, r, ...body };
}

describe("start: provider redirect", () => {
  it("redirects Google with PKCE, nonce, select_account and the callback address", async () => {
    const env = makeEnv();
    const r = await signIn(env, { provider: "google", callbackQuery: () => "error=access_denied&state=x" });
    expect(r.start.status).toBe(302);
    const u = r.location;
    expect(u.origin + u.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(u.searchParams.get("client_id")).toBe("google-client");
    expect(u.searchParams.get("redirect_uri")).toBe("https://api.cuvette.ai/v1/auth/callback/google");
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("scope")).toBe("openid email");
    expect(u.searchParams.get("prompt")).toBe("select_account");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(u.searchParams.get("nonce")).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(u.searchParams.get("state")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(u.searchParams.get("state")).not.toBe(APP_STATE);
  });

  it("redirects Microsoft through the common endpoint with select_account", async () => {
    const r = await signIn(makeEnv(), { provider: "microsoft", callbackQuery: () => "error=access_denied&state=x" });
    expect(r.location.origin + r.location.pathname).toBe("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    expect(r.location.searchParams.get("prompt")).toBe("select_account");
    expect(r.location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(r.location.searchParams.get("client_id")).toBe("ms-client");
  });

  it("uses PKCE for ORCID only when the discovery document lists S256", async () => {
    const withPkce = await signIn(makeEnv(), { provider: "orcid", callbackQuery: () => "error=access_denied&state=x" });
    expect(withPkce.location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(withPkce.location.searchParams.get("nonce")).toBeTruthy();
    expect(withPkce.location.searchParams.get("prompt")).toBeNull();
    expect(withPkce.location.searchParams.get("scope")).toBe("openid");
    resetSso();
    const without = await signIn(makeEnv(), { provider: "orcid", orcidPkce: false, callbackQuery: () => "error=access_denied&state=x" });
    expect(without.location.searchParams.get("code_challenge")).toBeNull();
    expect(without.location.searchParams.get("state")).toBeTruthy();
    expect(without.location.searchParams.get("nonce")).toBeTruthy();
  });

  it("uses no PKCE when the ORCID discovery document cannot be read", async () => {
    const r = await signIn(makeEnv(), { provider: "orcid", rawHandler: (c) => (c.url.includes("openid-configuration") ? new Response("no", { status: 500 }) : undefined), callbackQuery: () => "error=access_denied&state=x" });
    expect(r.location.searchParams.get("code_challenge")).toBeNull();
  });

  it("sends GitHub with the state only", async () => {
    const r = await signIn(makeEnv(), { provider: "github", callbackQuery: () => "error=access_denied&state=x" });
    expect(r.location.origin + r.location.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(r.location.searchParams.get("state")).toBeTruthy();
    expect(r.location.searchParams.get("nonce")).toBeNull();
    expect(r.location.searchParams.get("code_challenge")).toBeNull();
    expect(r.location.searchParams.get("prompt")).toBeNull();
  });

  it("answers 400 for an unknown provider and 503 for a provider without a secret", async () => {
    const env = makeEnv({ GITHUB_CLIENT_SECRET: undefined });
    expect((await startOnly(env, { provider: "facebook" })).res.status).toBe(400);
    expect((await startOnly(env, { provider: "github" })).res.status).toBe(503);
    expect((await startOnly(env, { provider: "google" })).res.status).toBe(302);
  });

  it("stores the state hashed and expires it after ten minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    const env = makeEnv();
    const fresh = await startOnly(env);
    const server = fresh.location!.searchParams.get("state")!;
    const stored = env.fake.row<{ state_hash: string; expires_at: number; app_state: string; port: string }>("SELECT * FROM auth_states");
    expect(stored.state_hash).toBe(await sha256Hex(server));
    expect(JSON.stringify(stored)).not.toContain(server);
    expect(stored.expires_at).toBe(Date.now() + 600_000);
    expect(stored.port).toBe("51234");
    expect(stored.app_state).toBe(APP_STATE);
  });
});

describe("start: parameter checks", () => {
  const bad = ["1@evil.com", "80", "1023", "65536", "99999", "0", "-1", "abc", "", " 5000", "5000 ", "5000/path", "50.5", "+5000", "0x1400", "05000", "5000@evil.com", "evil.com:5000", "PASTE", "paste ", "1e4"];
  for (const port of bad) {
    it(`rejects the port ${JSON.stringify(port)}`, async () => {
      const env = makeEnv();
      const { res } = await startOnly(env, { port });
      expect(res.status).toBe(400);
      expect(res.headers.get("location")).toBeNull();
      expect(env.fake.rows("SELECT * FROM auth_states")).toHaveLength(0);
    });
  }

  for (const port of ["1024", "8080", "51234", "65535", "paste"]) {
    it(`accepts the port ${port}`, async () => {
      expect((await startOnly(makeEnv(), { port })).res.status).toBe(302);
    });
  }

  it("rejects a missing port", async () => {
    const { res } = await call(makeEnv(), `/v1/auth/start?provider=google&challenge=${"A".repeat(43)}&state=${APP_STATE}`);
    expect(res.status).toBe(400);
  });

  for (const challenge of ["short", "A".repeat(42), "A".repeat(44), `${"A".repeat(42)}=`, `${"A".repeat(42)}+`, `${"A".repeat(42)}!`]) {
    it(`rejects the challenge ${JSON.stringify(challenge)}`, async () => {
      expect((await startOnly(makeEnv(), { challenge })).res.status).toBe(400);
    });
  }

  for (const state of ["short_state", "a".repeat(15), "a".repeat(65), `${"a".repeat(15)}!`, `${"a".repeat(15)} `, `${"a".repeat(15)}=`, `${"a".repeat(15)}%`]) {
    it(`rejects the state ${JSON.stringify(state)}`, async () => {
      expect((await startOnly(makeEnv(), { state })).res.status).toBe(400);
    });
  }

  for (const state of ["a".repeat(16), "a".repeat(64), "Ab-_".repeat(8)]) {
    it(`accepts the state of ${state.length} characters`, async () => {
      expect((await startOnly(makeEnv(), { state })).res.status).toBe(302);
    });
  }

  it("answers only GET on start and callback", async () => {
    const env = makeEnv();
    expect((await call(env, "/v1/auth/start", { method: "POST" })).res.status).toBe(405);
    expect((await call(env, "/v1/auth/callback/google", { method: "POST" })).res.status).toBe(405);
    expect((await call(env, "/v1/auth/token")).res.status).toBe(405);
  });
});

describe("sign-in happy path", () => {
  const cases: [string, string][] = [
    ["google", "ada@gmail.test"],
    ["microsoft", "ada@uni.test"],
    ["orcid", ""],
    ["github", ""],
  ];
  for (const [provider, email] of cases) {
    it(`signs in with ${provider}, makes an account and returns a device token`, async () => {
      const env = makeEnv();
      const r = await signIn(env, { provider });
      expect(r.callback!.status).toBe(302);
      const target = new URL(r.callback!.headers.get("location")!);
      expect(target.origin).toBe("http://127.0.0.1:51234");
      expect(target.pathname).toBe("/auth/cuvette");
      expect(target.searchParams.get("state")).toBe(APP_STATE);
      expect(target.searchParams.get("code")).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect([...target.searchParams.keys()].sort()).toEqual(["code", "state"]);
      const { res } = await exchange(env, r.code!, r.verifier, "Ada's laptop");
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.token).toMatch(/^cuv_[A-Za-z0-9_-]{43}$/);
      expect(body.account_id).toMatch(/^acc_/);
      expect(body.device_id).toMatch(/^dev_/);
      const identity = env.fake.row<any>("SELECT * FROM identities");
      expect(identity.provider).toBe(provider);
      expect(identity.account_id).toBe(body.account_id);
      expect(identity.email ?? "").toBe(email);
      const device = env.fake.row<any>("SELECT * FROM devices");
      expect(device).toMatchObject({ id: body.device_id, account_id: body.account_id, name: "Ada's laptop" });
      expect(device.token_hash).toBe(await sha256Hex(body.token));
      const info = await call(env, "/v1/account", { headers: { authorization: `Bearer ${body.token}` } });
      expect(info.res.status).toBe(200);
      expect(((await info.res.json()) as any).account_id).toBe(body.account_id);
      expect(env.fake.row<any>("SELECT plan, sub_status, allowance_remaining_usd FROM accounts")).toEqual({ plan: "none", sub_status: "none", allowance_remaining_usd: 0 });
    });
  }

  it("sends the code exchange with the client secret, the redirect address and the PKCE verifier", async () => {
    const env = makeEnv();
    const r = await signIn(env);
    const tokenCall = r.calls.find((c) => c.url === "https://oauth2.googleapis.com/token")!;
    const form = new URLSearchParams(tokenCall.body);
    expect(form.get("grant_type")).toBe("authorization_code");
    expect(form.get("code")).toBe("auth-code-123");
    expect(form.get("client_id")).toBe("google-client");
    expect(form.get("client_secret")).toBe("google-secret");
    expect(form.get("redirect_uri")).toBe("https://api.cuvette.ai/v1/auth/callback/google");
    const verifier = form.get("code_verifier")!;
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
    const expected = btoa(String.fromCharCode(...digest)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(expected).toBe(r.location.searchParams.get("code_challenge"));
  });

  it("reads the GitHub numeric id from the user endpoint with the access token", async () => {
    const env = makeEnv();
    const r = await signIn(env, { provider: "github", githubUser: { id: 42, login: "x", email: "dev@example.test" } });
    const user = r.calls.find((c) => c.url === "https://api.github.com/user")!;
    expect(user.headers.get("authorization")).toBe("Bearer gho_test");
    expect(user.headers.get("user-agent")).toBeTruthy();
    expect(new URLSearchParams(r.calls.find((c) => c.url.includes("access_token"))!.body).get("code_verifier")).toBeNull();
    expect(env.fake.row<any>("SELECT subject, email FROM identities")).toEqual({ subject: "42", email: "dev@example.test" });
  });

  it("rejects a GitHub user id that is not a positive integer", async () => {
    for (const id of ["583231", 0, -4, 1.5, null]) {
      const env = makeEnv();
      const r = await signIn(env, { provider: "github", githubUser: { id } });
      expect(new URL(r.callback!.headers.get("location")!).searchParams.get("error")).toBe("sign_in_failed");
      expect(env.fake.rows("SELECT * FROM accounts")).toHaveLength(0);
    }
  });

  it("gives the same account to the same provider subject and a new account to another subject", async () => {
    const env = makeEnv();
    const keys = await makeKeys();
    const a = await login(env, { keys });
    const b = await login(env, { keys });
    const c = await login(env, { keys, claims: (n) => claimsFor("google", n, { sub: "someone-else" }) });
    expect(b.account_id).toBe(a.account_id);
    expect(b.device_id).not.toBe(a.device_id);
    expect(b.token).not.toBe(a.token);
    expect(c.account_id).not.toBe(a.account_id);
    expect(env.fake.rows("SELECT * FROM accounts")).toHaveLength(2);
    expect(env.fake.rows("SELECT * FROM devices")).toHaveLength(3);
  });

  it("does not join two providers with the same email", async () => {
    const env = makeEnv();
    const g = await login(env, { provider: "google", claims: (n) => claimsFor("google", n, { email: "same@x.test" }) });
    const m = await login(env, { provider: "microsoft", claims: (n) => claimsFor("microsoft", n, { email: "same@x.test" }) });
    expect(m.account_id).not.toBe(g.account_id);
  });

  it("updates the stored email when the provider sends a new one", async () => {
    const env = makeEnv();
    const keys = await makeKeys();
    await login(env, { keys });
    await login(env, { keys, claims: (n) => claimsFor("google", n, { email: "new@gmail.test" }) });
    expect(env.fake.row<any>("SELECT email FROM identities").email).toBe("new@gmail.test");
  });

  it("falls back to preferred_username for a Microsoft email", async () => {
    const env = makeEnv();
    await login(env, { provider: "microsoft", claims: (n) => claimsFor("microsoft", n, { email: undefined, preferred_username: "ada@uni.test" }) });
    expect(env.fake.row<any>("SELECT email FROM identities").email).toBe("ada@uni.test");
  });
});

describe("sign-in checks", () => {
  const refused = async (o: Parameters<typeof signIn>[1], env = makeEnv()) => {
    const r = await signIn(env, o);
    expect(r.callback!.status).toBe(302);
    const target = new URL(r.callback!.headers.get("location")!);
    expect(target.searchParams.get("code")).toBeNull();
    expect(target.searchParams.get("error")).toBe("sign_in_failed");
    expect(target.searchParams.get("state")).toBe(APP_STATE);
    expect(env.fake.rows("SELECT * FROM accounts")).toHaveLength(0);
    expect(env.fake.rows("SELECT * FROM auth_codes")).toHaveLength(0);
    return r;
  };

  it("echoes the state of the app unchanged, with every allowed character", async () => {
    for (const state of ["Ab-_Cd-_Ef-_Gh-_Ij-_", "z".repeat(64), "0123456789abcdef"]) {
      const r = await signIn(makeEnv(), { state });
      expect(new URL(r.callback!.headers.get("location")!).searchParams.get("state")).toBe(state);
    }
  });

  it("rejects an id_token with a wrong nonce", async () => {
    await refused({ claims: (n) => claimsFor("google", `${n}x`) });
    await refused({ claims: () => claimsFor("google", "another-nonce") });
    await refused({ claims: (n) => ({ ...claimsFor("google", n), nonce: undefined }) });
  });

  it("rejects an id_token with a wrong issuer", async () => {
    await refused({ claims: (n) => claimsFor("google", n, { iss: "https://accounts.google.com.evil.test" }) });
    await refused({ claims: (n) => claimsFor("google", n, { iss: "http://accounts.google.com" }) });
    await refused({ claims: (n) => claimsFor("google", n, { iss: undefined }) });
  });

  it("accepts both Google issuer forms", async () => {
    for (const iss of ["https://accounts.google.com", "accounts.google.com"]) {
      const r = await signIn(makeEnv(), { claims: (n) => claimsFor("google", n, { iss }) });
      expect(r.code).toBeTruthy();
    }
  });

  it("checks the Microsoft issuer against the tid claim", async () => {
    const ok = await signIn(makeEnv(), { provider: "microsoft" });
    expect(ok.code).toBeTruthy();
    await refused({ provider: "microsoft", claims: (n) => claimsFor("microsoft", n, { tid: "99999999-2222-3333-4444-555555555555" }) });
    await refused({ provider: "microsoft", claims: (n) => claimsFor("microsoft", n, { iss: "https://login.microsoftonline.com/common/v2.0" }) });
    await refused({ provider: "microsoft", claims: (n) => claimsFor("microsoft", n, { tid: undefined }) });
    await refused({ provider: "microsoft", claims: (n) => claimsFor("microsoft", n, { tid: "../x", iss: "https://login.microsoftonline.com/../x/v2.0" }) });
    await refused({ provider: "microsoft", claims: (n) => claimsFor("microsoft", n, { iss: `https://login.microsoftonline.com/${MS_TENANT}/v2.0/` }) });
    const personal = "9188040d-6c67-4c5b-b112-36a304b66dad";
    const accepted = await signIn(makeEnv(), { provider: "microsoft", claims: (n) => claimsFor("microsoft", n, { tid: personal, iss: `https://login.microsoftonline.com/${personal}/v2.0` }) });
    expect(accepted.code).toBeTruthy();
  });

  it("checks the ORCID issuer", async () => {
    expect((await signIn(makeEnv(), { provider: "orcid" })).code).toBeTruthy();
    await refused({ provider: "orcid", claims: (n) => claimsFor("orcid", n, { iss: "https://sandbox.orcid.org" }) });
    await refused({ provider: "orcid", claims: (n) => claimsFor("orcid", n, { iss: "https://orcid.org/" }) });
  });

  it("rejects a wrong audience, also when the audience is a list", async () => {
    await refused({ claims: (n) => claimsFor("google", n, { aud: "another-client" }) });
    await refused({ claims: (n) => claimsFor("google", n, { aud: ["another-client", "other"] }) });
    await refused({ claims: (n) => claimsFor("google", n, { aud: undefined }) });
    expect((await signIn(makeEnv(), { claims: (n) => claimsFor("google", n, { aud: [CLIENT_IDS.google, "x"], azp: CLIENT_IDS.google }) })).code).toBeTruthy();
    await refused({ claims: (n) => claimsFor("google", n, { aud: [CLIENT_IDS.google, "x"], azp: "x" }) });
  });

  it("rejects an expired id_token and one that is not valid yet", async () => {
    const now = Math.floor(Date.now() / 1000);
    await refused({ claims: (n) => claimsFor("google", n, { exp: now - 600 }) });
    await refused({ claims: (n) => claimsFor("google", n, { exp: undefined }) });
    await refused({ claims: (n) => claimsFor("google", n, { exp: "9999999999" }) });
    await refused({ claims: (n) => claimsFor("google", n, { nbf: now + 3600 }) });
  });

  it("rejects a bad signature, an unknown key, and a bad algorithm", async () => {
    const other = await makeKeys("other-kid");
    const keys = await makeKeys("kid-a");
    await refused({ keys, signWith: { ...other, kid: "kid-a" } });
    await refused({ keys, signWith: other });
    await refused({ keys, header: { alg: "none" } });
    await refused({ keys, header: { alg: "HS256" } });
    await refused({ keys, header: { kid: undefined } });
  });

  it("rejects an id_token with a missing subject", async () => {
    await refused({ claims: (n) => claimsFor("google", n, { sub: undefined }) });
    await refused({ claims: (n) => claimsFor("google", n, { sub: "" }) });
    await refused({ claims: (n) => claimsFor("google", n, { sub: "x".repeat(300) }) });
  });

  it("rejects a token that is not three parts", async () => {
    const r = await signIn(makeEnv(), { rawHandler: (c) => (c.url.includes("oauth2.googleapis.com") ? Response.json({ id_token: "a.b" }) : undefined) });
    expect(new URL(r.callback!.headers.get("location")!).searchParams.get("error")).toBe("sign_in_failed");
  });

  it("answers sign_in_failed when the token endpoint fails or sends no id_token", async () => {
    await refused({ tokenStatus: 400 });
    await refused({ tokenStatus: 500 });
    await refused({ rawHandler: (c) => (c.url.includes("oauth2.googleapis.com") ? Response.json({ access_token: "x" }) : undefined) });
  });

  it("passes the access_denied answer of the provider to the app and nothing else", async () => {
    const env = makeEnv();
    const r = await signIn(env, { callbackQuery: (s) => `error=access_denied&error_description=secret&state=${s}` });
    const target = new URL(r.callback!.headers.get("location")!);
    expect(target.search).toBe(`?error=access_denied&state=${APP_STATE}`);
    const other = await signIn(env, { callbackQuery: (s) => `error=server_error&state=${s}` });
    expect(new URL(other.callback!.headers.get("location")!).searchParams.get("error")).toBe("sign_in_failed");
    expect(env.fake.rows("SELECT * FROM accounts")).toHaveLength(0);
  });

  it("answers sign_in_failed when the callback has no code", async () => {
    await refused({ callbackQuery: (s) => `state=${s}` });
  });

  it("rejects a state that was never issued, with a page and not a redirect", async () => {
    const env = makeEnv();
    for (const query of ["code=x&state=" + "A".repeat(43), "code=x", "code=x&state=", "code=x&state=bad state!"]) {
      const { res } = await call(env, `/v1/auth/callback/google?${query}`);
      expect(res.status).toBe(400);
      expect(res.headers.get("location")).toBeNull();
      expect(res.headers.get("content-type")).toContain("text/html");
    }
  });

  it("accepts a state only once", async () => {
    const env = makeEnv();
    const r = await signIn(env);
    expect(r.code).toBeTruthy();
    const again = await call(env, `/v1/auth/callback/google?code=auth-code-123&state=${r.serverState}`);
    expect(again.res.status).toBe(400);
    expect(again.res.headers.get("location")).toBeNull();
    expect(env.fake.rows("SELECT * FROM auth_codes")).toHaveLength(1);
  });

  it("rejects a state that was issued for another provider", async () => {
    const env = makeEnv();
    const started = await startOnly(env, { provider: "google" });
    const server = started.location!.searchParams.get("state")!;
    const { res } = await call(env, `/v1/auth/callback/github?code=x&state=${server}`);
    expect(res.status).toBe(400);
    expect(env.fake.rows("SELECT * FROM auth_states")).toHaveLength(0);
  });

  it("rejects a state after ten minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    const env = makeEnv();
    const started = await startOnly(env);
    const server = started.location!.searchParams.get("state")!;
    vi.setSystemTime(new Date("2026-10-01T12:10:01Z"));
    const { res } = await call(env, `/v1/auth/callback/google?code=x&state=${server}`);
    expect(res.status).toBe(400);
  });

  it("does not call a provider for a callback with an unknown provider name", async () => {
    const calls = mockFetch(() => new Response("{}"));
    const { res } = await call(makeEnv(), "/v1/auth/callback/facebook?code=x&state=" + "A".repeat(43));
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });
});

describe("paste mode", () => {
  it("shows the code and the warning on the final page", async () => {
    const env = makeEnv();
    const r = await signIn(env, { port: "paste" });
    expect(r.callback!.status).toBe(200);
    expect(r.callback!.headers.get("location")).toBeNull();
    expect(r.callback!.headers.get("content-type")).toContain("text/html");
    expect(r.callback!.headers.get("cache-control")).toBe("no-store");
    const page = await r.callback!.text();
    const code = /([A-Za-z0-9_-]{43})/.exec(page.replace(/<[^>]+>/g, " "))![1]!;
    expect(page).toContain("Paste this code only into a terminal that you started.");
    expect((await exchange(env, code, r.verifier)).res.status).toBe(200);
  });

  it("shows no code when the sign-in fails", async () => {
    const r = await signIn(makeEnv(), { port: "paste", claims: (n) => claimsFor("google", `${n}x`) });
    expect(r.callback!.status).toBe(400);
    expect(await r.callback!.text()).not.toMatch(/[A-Za-z0-9_-]{43}/);
  });
});

describe("code exchange", () => {
  it("stores the one-time code as a SHA-256 hash", async () => {
    const env = makeEnv();
    const r = await signIn(env);
    const row = env.fake.row<any>("SELECT * FROM auth_codes");
    expect(row.code_hash).toBe(await sha256Hex(r.code!));
    expect(JSON.stringify(row)).not.toContain(r.code!);
    expect(row.challenge).toBe(r.challenge);
  });

  it("accepts a code only once", async () => {
    const env = makeEnv();
    const r = await signIn(env);
    expect((await exchange(env, r.code!, r.verifier)).res.status).toBe(200);
    const second = await exchange(env, r.code!, r.verifier);
    expect(second.res.status).toBe(400);
    expect(((await second.res.json()) as any).error.type).toBe("invalid_grant");
    expect(env.fake.rows("SELECT * FROM devices")).toHaveLength(1);
  });

  it("rejects a code that is used again at the same time", async () => {
    const env = makeEnv();
    const r = await signIn(env);
    const results = await Promise.all([exchange(env, r.code!, r.verifier), exchange(env, r.code!, r.verifier)]);
    expect(results.map((x) => x.res.status).sort()).toEqual([200, 400]);
    expect(env.fake.rows("SELECT * FROM devices")).toHaveLength(1);
  });

  it("rejects a code after 60 seconds", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    const env = makeEnv();
    const r = await signIn(env);
    vi.setSystemTime(new Date("2026-10-01T12:01:01Z"));
    const { res } = await exchange(env, r.code!, r.verifier);
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).error.type).toBe("invalid_grant");
    expect(env.fake.rows("SELECT * FROM devices")).toHaveLength(0);
  });

  it("accepts a code just before 60 seconds", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    const env = makeEnv();
    const r = await signIn(env);
    vi.setSystemTime(new Date("2026-10-01T12:00:59Z"));
    expect((await exchange(env, r.code!, r.verifier)).res.status).toBe(200);
  });

  it("rejects a wrong verifier and burns the code", async () => {
    const env = makeEnv();
    const r = await signIn(env);
    const wrong = "A".repeat(43);
    expect((await exchange(env, r.code!, wrong)).res.status).toBe(400);
    expect((await exchange(env, r.code!, r.verifier)).res.status).toBe(400);
    expect(env.fake.rows("SELECT * FROM devices")).toHaveLength(0);
  });

  it("rejects a bad body", async () => {
    const env = makeEnv();
    const r = await signIn(env);
    const cases: unknown[] = ["not json", {}, { code: r.code }, { verifier: r.verifier }, { code: 5, verifier: r.verifier }, { code: r.code, verifier: "short" }, { code: "short", verifier: r.verifier }, { code: `${r.code}!`, verifier: r.verifier }, null];
    for (const body of cases) {
      const { res } = await call(env, "/v1/auth/token", post(undefined, body as any));
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(((await res.json()) as any).error.type).toBe("invalid_grant");
    }
    expect((await exchange(env, r.code!, r.verifier)).res.status).toBe(200);
  });

  it("names a device from the body and cleans the name", async () => {
    const env = makeEnv();
    const a = await signIn(env);
    await call(env, "/v1/auth/token", post(undefined, { code: a.code, verifier: a.verifier, device_name: "  Lab\u0000 PC\n" + "x".repeat(200) }));
    const name = env.fake.row<any>("SELECT name FROM devices").name as string;
    expect(name.startsWith("Lab  PC")).toBe(true);
    expect(name.length).toBeLessThanOrEqual(80);
    const b = await signIn(env);
    await call(env, "/v1/auth/token", post(undefined, { code: b.code, verifier: b.verifier }));
    expect(env.fake.rows<any>("SELECT name FROM devices ORDER BY created_at, id").map((d) => d.name)).toContain("Unnamed device");
  });

  it("allows 10 exchanges a minute for each address and answers 429 for the 11th", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T12:00:10Z"));
    const env = makeEnv();
    const headers = { "cf-connecting-ip": "203.0.113.5" };
    for (let i = 0; i < 10; i++) expect((await exchange(env, "x".repeat(43), "y".repeat(43), "d", headers)).res.status).toBe(400);
    const over = await exchange(env, "x".repeat(43), "y".repeat(43), "d", headers);
    expect(over.res.status).toBe(429);
    expect(over.res.headers.get("retry-after")).toBe("60");
    expect((await exchange(env, "x".repeat(43), "y".repeat(43), "d", { "cf-connecting-ip": "203.0.113.6" })).res.status).toBe(400);
    expect(JSON.stringify(env.fake.rows("SELECT * FROM auth_token_calls"))).not.toContain("203.0.113.5");
    vi.setSystemTime(new Date("2026-10-01T12:01:00Z"));
    expect((await exchange(env, "x".repeat(43), "y".repeat(43), "d", headers)).res.status).toBe(400);
  });

  it("counts a good exchange in the limit", async () => {
    const env = makeEnv();
    const headers = { "cf-connecting-ip": "203.0.113.7" };
    for (let i = 0; i < 10; i++) await exchange(env, "x".repeat(43), "y".repeat(43), "d", headers);
    const r = await signIn(env);
    expect((await exchange(env, r.code!, r.verifier, "d", headers)).res.status).toBe(429);
  });
});

describe("key cache", () => {
  it("reads the key set once for two sign-ins", async () => {
    const env = makeEnv();
    const keys = await makeKeys();
    const a = await signIn(env, { keys });
    const b = await signIn(env, { keys });
    expect(a.code).toBeTruthy();
    expect(b.code).toBeTruthy();
    expect(a.calls.filter((c) => c.url.includes("googleapis.com/oauth2/v3/certs"))).toHaveLength(1);
    expect(b.calls.filter((c) => c.url.includes("googleapis.com/oauth2/v3/certs"))).toHaveLength(0);
  });

  it("reads the key set again after one hour", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    const env = makeEnv();
    const keys = await makeKeys();
    await signIn(env, { keys });
    vi.setSystemTime(new Date("2026-10-01T13:00:01Z"));
    const b = await signIn(env, { keys });
    expect(b.calls.filter((c) => c.url.includes("oauth2/v3/certs"))).toHaveLength(1);
    expect(b.code).toBeTruthy();
  });

  it("reads the key set again for a new key id, but not more than once a minute", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    const env = makeEnv();
    const old = await makeKeys("old-kid");
    await signIn(env, { keys: old });
    const rotated = await makeKeys("new-kid");
    vi.setSystemTime(new Date("2026-10-01T12:00:30Z"));
    const early = await signIn(env, { keys: rotated });
    expect(early.code).toBeUndefined();
    expect(early.calls.filter((c) => c.url.includes("oauth2/v3/certs"))).toHaveLength(0);
    vi.setSystemTime(new Date("2026-10-01T12:01:31Z"));
    const later = await signIn(env, { keys: rotated });
    expect(later.calls.filter((c) => c.url.includes("oauth2/v3/certs"))).toHaveLength(1);
    expect(later.code).toBeTruthy();
  });

  it("signs in with a key set that lists keys the code cannot use", async () => {
    const keys = await makeKeys("good");
    const r = await signIn(makeEnv(), {
      keys,
      rawHandler: (c) => (c.url.includes("oauth2/v3/certs") ? Response.json({ keys: [{ kty: "EC", kid: "ec", crv: "P-256", x: "a", y: "b" }, { kty: "RSA", kid: "broken", n: "!!", e: "AQAB" }, { kty: "RSA", n: "x", e: "AQAB" }, keys.jwk] }) : undefined),
    });
    expect(r.code).toBeTruthy();
  });

  it("fails the sign-in when the key set cannot be read", async () => {
    const r = await signIn(makeEnv(), { rawHandler: (c) => (c.url.includes("oauth2/v3/certs") ? new Response("no", { status: 503 }) : undefined) });
    expect(new URL(r.callback!.headers.get("location")!).searchParams.get("error")).toBe("sign_in_failed");
  });
});

describe("linking", () => {
  async function accountWithToken(env = makeEnv()) {
    return login(env);
  }

  const linkBody = async (extra: Record<string, unknown> = {}) => ({ provider: "github", port: "52000", challenge: "B".repeat(43), state: "link_state-0123456789", ...extra });

  it("returns a start address with a one-time link id and no device token", async () => {
    const { env, token } = await accountWithToken();
    const { res } = await call(env, "/v1/auth/link", post(token, await linkBody()));
    expect(res.status).toBe(200);
    const url = new URL(((await res.json()) as any).url);
    expect(url.origin + url.pathname).toBe("https://api.cuvette.ai/v1/auth/start");
    expect(url.searchParams.get("provider")).toBe("github");
    expect(url.searchParams.get("port")).toBe("52000");
    expect(url.searchParams.get("challenge")).toBe("B".repeat(43));
    expect(url.searchParams.get("state")).toBe("link_state-0123456789");
    expect(url.searchParams.get("link")).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(url.toString()).not.toContain("cuv_");
    expect(url.toString()).not.toContain(token);
    const stored = env.fake.row<any>("SELECT * FROM auth_links");
    expect(stored.link_hash).toBe(await sha256Hex(url.searchParams.get("link")!));
  });

  it("checks the link body like the start request", async () => {
    const { env, token } = await accountWithToken();
    for (const extra of [{ port: "1@evil.com" }, { port: "80" }, { challenge: "short" }, { state: "short" }, { provider: "facebook" }, { provider: undefined }]) {
      expect((await call(env, "/v1/auth/link", post(token, await linkBody(extra)))).res.status, JSON.stringify(extra)).toBe(400);
    }
    expect((await call(env, "/v1/auth/link", post(token, "nope"))).res.status).toBe(400);
    expect((await call(env, "/v1/auth/link", post(undefined, await linkBody()))).res.status).toBe(401);
  });

  it("adds a second sign-in provider to the same account", async () => {
    const { env, token, account_id } = await accountWithToken();
    const { res } = await call(env, "/v1/auth/link", post(token, await linkBody({ provider: "github" })));
    const link = new URL(((await res.json()) as any).url).searchParams.get("link")!;
    const r = await signIn(env, { provider: "github", link, port: "52000", state: "link_state-0123456789" });
    expect(r.callback!.status).toBe(302);
    expect(new URL(r.callback!.headers.get("location")!).origin).toBe("http://127.0.0.1:52000");
    expect(env.fake.rows("SELECT * FROM accounts")).toHaveLength(1);
    expect(env.fake.row<any>("SELECT account_id FROM identities WHERE provider = 'github'").account_id).toBe(account_id);
    const info = (await (await call(env, "/v1/account", { headers: { authorization: `Bearer ${token}` } })).res.json()) as any;
    expect(info.identities).toEqual([{ provider: "github", email: null }, { provider: "google", email: "ada@gmail.test" }]);
    const ex = await exchange(env, r.code!, r.verifier);
    expect(((await ex.res.json()) as any).account_id).toBe(account_id);
    expect(env.fake.rows("SELECT * FROM auth_links")).toHaveLength(0);
  });

  it("links nothing when the sign-in belongs to another account", async () => {
    const env = makeEnv();
    const keys = await makeKeys();
    const first = await login(env, { provider: "github", githubUser: { id: 1001 } });
    const second = await login(env, { keys, claims: (n) => claimsFor("google", n, { sub: "owner-two" }) });
    expect(second.account_id).not.toBe(first.account_id);
    const { res } = await call(env, "/v1/auth/link", post(second.token, await linkBody({ provider: "github" })));
    const link = new URL(((await res.json()) as any).url).searchParams.get("link")!;
    const r = await signIn(env, { provider: "github", githubUser: { id: 1001 }, link, port: "52000", state: "link_state-0123456789" });
    expect(r.callback!.status).toBe(409);
    expect(r.callback!.headers.get("location")).toBeNull();
    expect(await r.callback!.text()).toContain("This sign-in belongs to another Cuvette account.");
    expect(env.fake.rows("SELECT * FROM identities WHERE account_id = ?", second.account_id)).toHaveLength(1);
    expect(env.fake.row<any>("SELECT account_id FROM identities WHERE provider = 'github'").account_id).toBe(first.account_id);
    expect(env.fake.rows("SELECT * FROM auth_codes")).toHaveLength(0);
  });

  it("accepts a link to an identity that the account has already", async () => {
    const { env, token, account_id } = await accountWithToken();
    const keys = await makeKeys();
    const { res } = await call(env, "/v1/auth/link", post(token, await linkBody({ provider: "google" })));
    const link = new URL(((await res.json()) as any).url).searchParams.get("link")!;
    const r = await signIn(env, { keys, link, port: "52000", state: "link_state-0123456789" });
    expect(r.callback!.status).toBe(302);
    expect(env.fake.rows("SELECT * FROM identities WHERE account_id = ?", account_id)).toHaveLength(1);
  });

  it("uses a link id once", async () => {
    const { env, token } = await accountWithToken();
    const { res } = await call(env, "/v1/auth/link", post(token, await linkBody()));
    const link = new URL(((await res.json()) as any).url).searchParams.get("link")!;
    const first = await startOnly(env, { provider: "github", link });
    expect(first.res.status).toBe(302);
    const second = await startOnly(env, { provider: "github", link });
    expect(second.res.status).toBe(400);
  });

  it("rejects a link id after five minutes and a link id that was never issued", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    const { env, token } = await accountWithToken();
    const { res } = await call(env, "/v1/auth/link", post(token, await linkBody()));
    const link = new URL(((await res.json()) as any).url).searchParams.get("link")!;
    vi.setSystemTime(new Date("2026-10-01T12:05:01Z"));
    expect((await startOnly(env, { provider: "github", link })).res.status).toBe(400);
    expect((await startOnly(env, { provider: "github", link: "Z".repeat(32) })).res.status).toBe(400);
    expect((await startOnly(env, { provider: "github", link: "bad link!" })).res.status).toBe(400);
  });

  it("makes a new account, not a link, when the start has no link id", async () => {
    const { env } = await accountWithToken();
    await login(env, { provider: "github" });
    expect(env.fake.rows("SELECT * FROM accounts")).toHaveLength(2);
  });
});

describe("devices", () => {
  async function twoDevices() {
    const env = makeEnv();
    const keys = await makeKeys();
    const a = await login(env, { keys });
    const b = await login(env, { keys });
    return { env, a, b };
  }

  const auth = (token: string, method = "GET") => ({ method, headers: { authorization: `Bearer ${token}` } });

  it("lists the devices of the account and marks the calling device", async () => {
    const { env, a, b } = await twoDevices();
    const list = (await (await call(env, "/v1/devices", auth(a.token))).res.json()) as any;
    expect(list.devices.map((d: any) => d.id).sort()).toEqual([a.device_id, b.device_id].sort());
    expect(list.devices.find((d: any) => d.id === a.device_id).current).toBe(true);
    expect(list.devices.find((d: any) => d.id === b.device_id).current).toBe(false);
    expect(Object.keys(list.devices[0]).sort()).toEqual(["created_at", "current", "id", "last_used_at", "name"]);
    expect(JSON.stringify(list)).not.toContain("token_hash");
  });

  it("does not list the devices of another account", async () => {
    const { env, a } = await twoDevices();
    const other = await addAccount(env, 0, { plan: "none" });
    const list = (await (await call(env, "/v1/devices", auth(other.token))).res.json()) as any;
    expect(list.devices.map((d: any) => d.id)).toEqual([other.deviceId]);
    expect(list.devices.map((d: any) => d.id)).not.toContain(a.device_id);
  });

  it("revokes another device with 204 and that token stops working", async () => {
    const { env, a, b } = await twoDevices();
    const { res } = await call(env, `/v1/devices/${b.device_id}`, auth(a.token, "DELETE"));
    expect(res.status).toBe(204);
    expect((await call(env, "/v1/account", auth(b.token))).res.status).toBe(401);
    expect((await call(env, "/v1/account", auth(a.token))).res.status).toBe(200);
  });

  it("answers 404 for a device that does not exist or belongs to another account", async () => {
    const { env, a, b } = await twoDevices();
    const other = await addAccount(env, 0, { plan: "none" });
    expect((await call(env, "/v1/devices/dev_nothing", auth(a.token, "DELETE"))).res.status).toBe(404);
    expect((await call(env, `/v1/devices/${other.deviceId}`, auth(a.token, "DELETE"))).res.status).toBe(404);
    expect((await call(env, "/v1/account", auth(other.token))).res.status).toBe(200);
    expect(b.device_id).toBeTruthy();
  });

  it("revokes the calling device on logout", async () => {
    const { env, a, b } = await twoDevices();
    const { res } = await call(env, "/v1/auth/logout", auth(a.token, "POST"));
    expect(res.status).toBe(204);
    expect((await call(env, "/v1/account", auth(a.token))).res.status).toBe(401);
    expect((await call(env, "/v1/account", auth(b.token))).res.status).toBe(200);
    expect(env.fake.rows("SELECT * FROM accounts")).toHaveLength(1);
  });

  it("needs a token for the device routes", async () => {
    const env = makeEnv();
    expect((await call(env, "/v1/devices")).res.status).toBe(401);
    expect((await call(env, "/v1/devices/dev_x", { method: "DELETE" })).res.status).toBe(401);
    expect((await call(env, "/v1/auth/logout", { method: "POST" })).res.status).toBe(401);
  });

  it("writes the last use time and does not write it again within a minute", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
    const env = makeEnv();
    const acct = await addAccount(env, 0, { plan: "none" });
    expect(env.fake.row<any>("SELECT last_used_at FROM devices").last_used_at).toBeNull();
    await call(env, "/v1/devices", auth(acct.token));
    expect(env.fake.row<any>("SELECT last_used_at FROM devices").last_used_at).toBe("2026-10-01T12:00:00.000Z");
    vi.setSystemTime(new Date("2026-10-01T12:00:30Z"));
    await call(env, "/v1/devices", auth(acct.token));
    expect(env.fake.row<any>("SELECT last_used_at FROM devices").last_used_at).toBe("2026-10-01T12:00:00.000Z");
    vi.setSystemTime(new Date("2026-10-01T12:01:30Z"));
    await call(env, "/v1/devices", auth(acct.token));
    expect(env.fake.row<any>("SELECT last_used_at FROM devices").last_used_at).toBe("2026-10-01T12:01:30.000Z");
  });

  it("rejects a malformed token and a token with the wrong prefix", async () => {
    const env = makeEnv();
    await addAccount(env, 0);
    for (const t of ["cuv_short", "xyz_" + "A".repeat(43), "cuv_" + "A".repeat(44), "cuv_" + "A".repeat(42) + "!"]) {
      expect((await call(env, "/v1/devices", auth(t))).res.status).toBe(401);
    }
  });
});
