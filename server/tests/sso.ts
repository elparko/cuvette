import { clearKeyCache } from "../src/jwt.ts";
import { clearDiscoveryCache } from "../src/providers.ts";
import { call, mockFetch, post, type FetchCall, type TestEnv } from "./helpers.ts";

const enc = new TextEncoder();

export function b64u(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? enc.encode(input) : input;
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface Keys {
  kid: string;
  privateKey: CryptoKey;
  jwk: JsonWebKey & { kid: string };
}

let keyCount = 0;

export async function makeKeys(kid = `key-${++keyCount}`): Promise<Keys> {
  const pair = (await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const jwk = (await crypto.subtle.exportKey("jwk", pair.publicKey)) as JsonWebKey;
  return { kid, privateKey: pair.privateKey, jwk: { ...jwk, kid, use: "sig", alg: "RS256" } };
}

export async function signJwt(keys: Keys, claims: Record<string, unknown>, header: Record<string, unknown> = {}): Promise<string> {
  const head = b64u(JSON.stringify({ alg: "RS256", typ: "JWT", kid: keys.kid, ...header }));
  const body = b64u(JSON.stringify(claims));
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, enc.encode(`${head}.${body}`)));
  return `${head}.${body}.${b64u(sig)}`;
}

export async function pkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = b64u(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64u(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(verifier))));
  return { verifier, challenge };
}

export const APP_STATE = "app_state-0123456789abcdef";
export const MS_TENANT = "11111111-2222-3333-4444-555555555555";

export const JWKS_URLS: Record<string, string> = {
  google: "https://www.googleapis.com/oauth2/v3/certs",
  microsoft: "https://login.microsoftonline.com/common/discovery/v2.0/keys",
  orcid: "https://orcid.org/oauth/jwks",
};
export const TOKEN_URLS: Record<string, string> = {
  google: "https://oauth2.googleapis.com/token",
  microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  orcid: "https://orcid.org/oauth/token",
  github: "https://github.com/login/oauth/access_token",
};
export const CLIENT_IDS: Record<string, string> = { google: "google-client", microsoft: "ms-client", orcid: "orcid-client", github: "github-client" };

export function claimsFor(provider: string, nonce: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  const base = { aud: CLIENT_IDS[provider], nonce, iat: now, exp: now + 3600 };
  const specific: Record<string, Record<string, unknown>> = {
    google: { iss: "https://accounts.google.com", sub: "google-subject-1", email: "ada@gmail.test" },
    microsoft: { iss: `https://login.microsoftonline.com/${MS_TENANT}/v2.0`, tid: MS_TENANT, sub: "ms-subject-1", email: "ada@uni.test" },
    orcid: { iss: "https://orcid.org", sub: "0000-0002-1825-0097" },
  };
  return { ...base, ...specific[provider], ...over };
}

export interface SignInOptions {
  provider?: string;
  port?: string;
  challenge?: string;
  state?: string;
  keys?: Keys;
  claims?: (nonce: string) => Record<string, unknown>;
  header?: Record<string, unknown>;
  signWith?: Keys;
  orcidPkce?: boolean;
  tokenStatus?: number;
  githubUser?: unknown;
  callbackQuery?: (server: string) => string;
  link?: string;
  startPath?: string;
  rawHandler?: (c: FetchCall) => Response | undefined;
}

export interface SignInResult {
  start: Response;
  callback?: Response;
  calls: FetchCall[];
  location: URL;
  serverState: string;
  nonce: string;
  verifier: string;
  challenge: string;
  keys: Keys;
  code?: string;
}

let shared: Keys | undefined;

export async function defaultKeys(): Promise<Keys> {
  shared ??= await makeKeys("default-kid");
  return shared;
}

export function resetSso(): void {
  clearKeyCache();
  clearDiscoveryCache();
}

export async function startOnly(env: TestEnv, o: SignInOptions = {}): Promise<{ res: Response; location?: URL }> {
  const provider = o.provider ?? "google";
  const { challenge } = await pkce();
  const q = new URLSearchParams({ provider, port: o.port ?? "51234", challenge: o.challenge ?? challenge, state: o.state ?? APP_STATE });
  if (o.link) q.set("link", o.link);
  const { res } = await call(env, `/v1/auth/start?${q}`);
  const loc = res.headers.get("location");
  return { res, location: loc ? new URL(loc) : undefined };
}

export async function signIn(env: TestEnv, o: SignInOptions = {}): Promise<SignInResult> {
  const provider = o.provider ?? "google";
  const keys = o.keys ?? (await defaultKeys());
  let pendingToken = "";
  const spy = mockFetch((c) => {
    const custom = o.rawHandler?.(c);
    if (custom) return custom;
    if (c.url === "https://orcid.org/.well-known/openid-configuration") return Response.json({ code_challenge_methods_supported: o.orcidPkce === false ? [] : ["S256"] });
    if (Object.values(JWKS_URLS).includes(c.url)) return Response.json({ keys: [keys.jwk] });
    if (c.url === "https://api.github.com/user") return Response.json(o.githubUser ?? { id: 583231, login: "ada", email: null });
    if (c.url === TOKEN_URLS[provider]) {
      if (o.tokenStatus && o.tokenStatus !== 200) return new Response("{}", { status: o.tokenStatus });
      if (provider === "github") return Response.json({ access_token: "gho_test", token_type: "bearer" });
      return Response.json({ id_token: pendingToken, access_token: "at" });
    }
    return new Response("{}", { status: 404 });
  });

  const { challenge, verifier } = await pkce();
  const q = new URLSearchParams({ provider, port: o.port ?? "51234", challenge: o.challenge ?? challenge, state: o.state ?? APP_STATE });
  if (o.link) q.set("link", o.link);
  const { res: start } = await call(env, `${o.startPath ?? "/v1/auth/start"}?${q}`);
  const location = new URL(start.headers.get("location") ?? "https://invalid.test/");
  const serverState = location.searchParams.get("state") ?? "";
  const nonce = location.searchParams.get("nonce") ?? "";
  const result: SignInResult = { start, calls: spy, location, serverState, nonce, verifier, challenge, keys };
  if (start.status !== 302) return result;
  if (provider !== "github") {
    const claims = o.claims ? o.claims(nonce) : claimsFor(provider, nonce);
    pendingToken = await signJwt(o.signWith ?? keys, claims, o.header);
  }
  const query = o.callbackQuery ? o.callbackQuery(serverState) : `code=auth-code-123&state=${serverState}`;
  const { res: callback } = await call(env, `/v1/auth/callback/${provider}?${query}`);
  result.callback = callback;
  const target = callback.headers.get("location");
  if (target) result.code = new URL(target).searchParams.get("code") ?? undefined;
  return result;
}

export function exchange(env: TestEnv, code: string, verifier: string, deviceName = "Lab laptop", headers: Record<string, string> = {}) {
  return call(env, "/v1/auth/token", post(undefined, { code, verifier, device_name: deviceName }, headers));
}
