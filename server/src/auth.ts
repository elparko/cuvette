import type { Env } from "./env.ts";
import type { Account } from "./money.ts";
import { credentials, exchangeCode, providerOf, usesPkce, type Provider } from "./providers.ts";
import { fail, html, logError, randomToken, reply, s256, safeEqual, sha256Hex } from "./util.ts";

export const STATE_TTL_MS = 10 * 60_000;
export const CODE_TTL_MS = 60_000;
export const LINK_TTL_MS = 5 * 60_000;
export const TOKENS_PER_MINUTE = 10;
const LAST_USED_GAP_MS = 60_000;

const B64URL = /^[A-Za-z0-9_-]+$/;

export interface Session {
  account: Account;
  deviceId: string;
}

export async function authenticate(req: Request, env: Env, ctx: ExecutionContext): Promise<Session | undefined> {
  const m = /^Bearer (cuv_[A-Za-z0-9_-]{43})$/.exec(req.headers.get("authorization") ?? "");
  if (!m) return undefined;
  const row = await env.DB.prepare("SELECT d.id AS device_id, d.last_used_at AS device_last_used_at, a.* FROM devices d JOIN accounts a ON a.id = d.account_id WHERE d.token_hash = ?1").bind(await sha256Hex(m[1]!)).first<Account & { device_id: string; device_last_used_at: string | null }>();
  if (!row) return undefined;
  const { device_id, device_last_used_at, ...account } = row;
  const now = Date.now();
  if (!device_last_used_at || now - Date.parse(device_last_used_at) > LAST_USED_GAP_MS) {
    ctx.waitUntil(env.DB.prepare("UPDATE devices SET last_used_at = ?1 WHERE id = ?2").bind(new Date(now).toISOString(), device_id).run().catch((e) => logError("last_used", e)));
  }
  return { account, deviceId: device_id };
}

interface StartParams {
  port: string;
  challenge: string;
  state: string;
}

function checkStart(get: (name: string) => unknown): StartParams | string {
  const port = get("port");
  if (typeof port !== "string" || !/^(paste|[1-9][0-9]{3,4})$/.test(port) || (port !== "paste" && (Number(port) < 1024 || Number(port) > 65535))) return "The port must be a number from 1024 to 65535, or the word paste.";
  const challenge = get("challenge");
  if (typeof challenge !== "string" || challenge.length !== 43 || !B64URL.test(challenge)) return "The challenge must have 43 characters of base64url.";
  const state = get("state");
  if (typeof state !== "string" || state.length < 16 || state.length > 64 || !B64URL.test(state)) return "The state must have 16 to 64 characters of base64url.";
  return { port, challenge, state };
}

async function purgeExpired(env: Env, now: number) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM auth_states WHERE expires_at <= ?1").bind(now),
    env.DB.prepare("DELETE FROM auth_codes WHERE expires_at <= ?1").bind(now),
    env.DB.prepare("DELETE FROM auth_links WHERE expires_at <= ?1").bind(now),
  ]);
}

export async function authStart(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const q = url.searchParams;
  const provider = providerOf(q.get("provider") ?? "");
  if (!provider) return fail(400, "invalid_request_error", "The provider must be google, microsoft, orcid or github.");
  const params = checkStart((n) => q.get(n));
  if (typeof params === "string") return fail(400, "invalid_request_error", params);
  if (!credentials(env, provider)) return fail(503, "api_error", "The server has no setup for this sign-in provider.");
  const now = Date.now();
  await purgeExpired(env, now);
  let linkAccount: string | null = null;
  const link = q.get("link");
  if (link !== null) {
    const row = B64URL.test(link) && link.length <= 64 ? await env.DB.prepare("DELETE FROM auth_links WHERE link_hash = ?1 AND expires_at > ?2 RETURNING account_id").bind(await sha256Hex(link), now).first<{ account_id: string }>() : null;
    if (!row) return fail(400, "invalid_request_error", "The link is not valid or it expired.");
    linkAccount = row.account_id;
  }
  const serverState = randomToken(32);
  const nonce = randomToken(24);
  const pkce = await usesPkce(provider);
  const verifier = pkce ? randomToken(48) : null;
  await env.DB
    .prepare("INSERT INTO auth_states (state_hash, provider, port, challenge, app_state, nonce, provider_verifier, link_account_id, expires_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)")
    .bind(await sha256Hex(serverState), provider.id, params.port, params.challenge, params.state, nonce, verifier, linkAccount, now + STATE_TTL_MS)
    .run();
  const target = new URL(provider.authUrl);
  target.searchParams.set("response_type", "code");
  target.searchParams.set("client_id", credentials(env, provider)!.clientId);
  target.searchParams.set("redirect_uri", `${url.origin}/v1/auth/callback/${provider.id}`);
  if (provider.scope) target.searchParams.set("scope", provider.scope);
  target.searchParams.set("state", serverState);
  if (provider.id !== "github") target.searchParams.set("nonce", nonce);
  if (verifier) {
    target.searchParams.set("code_challenge", await s256(verifier));
    target.searchParams.set("code_challenge_method", "S256");
  }
  if (provider.prompt) target.searchParams.set("prompt", provider.prompt);
  return new Response(null, { status: 302, headers: { location: target.toString(), "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}

interface StateRow {
  provider: string;
  port: string;
  challenge: string;
  app_state: string;
  nonce: string;
  provider_verifier: string | null;
  link_account_id: string | null;
}

function finish(row: StateRow, result: { code: string } | { error: string }): Response {
  if (row.port === "paste") {
    if ("error" in result) return html(400, "Sign-in failed", ["Close this page and start the sign-in again."]);
    return html(200, "Your Cuvette code", [result.code, "Paste this code only into a terminal that you started."]);
  }
  const target = new URL(`http://127.0.0.1:${row.port}/auth/cuvette`);
  if ("error" in result) target.searchParams.set("error", result.error);
  else target.searchParams.set("code", result.code);
  target.searchParams.set("state", row.app_state);
  return new Response(null, { status: 302, headers: { location: target.toString(), "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}

async function accountFor(env: Env, provider: Provider, subject: string, email: string | null, linkAccount: string | null): Promise<string | "taken"> {
  const find = () => env.DB.prepare("SELECT account_id, email FROM identities WHERE provider = ?1 AND subject = ?2").bind(provider.id, subject).first<{ account_id: string; email: string | null }>();
  let existing = await find();
  if (linkAccount) {
    if (!existing) {
      await env.DB.prepare("INSERT OR IGNORE INTO identities (provider, subject, account_id, email) VALUES (?1, ?2, ?3, ?4)").bind(provider.id, subject, linkAccount, email).run();
      existing = await find();
    }
    return existing?.account_id === linkAccount ? linkAccount : "taken";
  }
  if (!existing) {
    const id = `acc_${randomToken(16)}`;
    try {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO accounts (id, created_at) VALUES (?1, ?2)").bind(id, new Date().toISOString()),
        env.DB.prepare("INSERT INTO identities (provider, subject, account_id, email) VALUES (?1, ?2, ?3, ?4)").bind(provider.id, subject, id, email),
      ]);
      return id;
    } catch (e) {
      existing = await find();
      if (!existing) throw e;
    }
  }
  if (email && existing.email !== email) await env.DB.prepare("UPDATE identities SET email = ?1 WHERE provider = ?2 AND subject = ?3").bind(email, provider.id, subject).run();
  return existing.account_id;
}

export async function authCallback(req: Request, env: Env, providerId: string): Promise<Response> {
  const url = new URL(req.url);
  const q = url.searchParams;
  const provider = providerOf(providerId);
  const state = q.get("state");
  if (!provider || !state || state.length > 128 || !B64URL.test(state)) return html(400, "Sign-in failed", ["This sign-in link is not valid. Start the sign-in again."]);
  const now = Date.now();
  const row = await env.DB.prepare("DELETE FROM auth_states WHERE state_hash = ?1 AND expires_at > ?2 RETURNING provider, port, challenge, app_state, nonce, provider_verifier, link_account_id").bind(await sha256Hex(state), now).first<StateRow>();
  if (!row || row.provider !== provider.id) return html(400, "Sign-in failed", ["This sign-in link expired, or someone used it already. Start the sign-in again."]);
  const denied = q.get("error");
  if (denied) return finish(row, { error: denied === "access_denied" ? "access_denied" : "sign_in_failed" });
  const code = q.get("code");
  if (!code || code.length > 2048) return finish(row, { error: "sign_in_failed" });
  let identity;
  try {
    identity = await exchangeCode(env, provider, code, `${url.origin}/v1/auth/callback/${provider.id}`, row.nonce, row.provider_verifier);
  } catch (e) {
    logError("sign-in", e);
    return finish(row, { error: "sign_in_failed" });
  }
  const account = await accountFor(env, provider, identity.subject, identity.email, row.link_account_id);
  if (account === "taken") return html(409, "Not linked", ["This sign-in belongs to another Cuvette account."]);
  const one = randomToken(32);
  await env.DB.prepare("INSERT INTO auth_codes (code_hash, account_id, challenge, expires_at) VALUES (?1, ?2, ?3, ?4)").bind(await sha256Hex(one), account, row.challenge, now + CODE_TTL_MS).run();
  return finish(row, { code: one });
}

export async function authToken(req: Request, env: Env): Promise<Response> {
  const minute = Math.floor(Date.now() / 60_000);
  const ip = await sha256Hex(req.headers.get("cf-connecting-ip") ?? "unknown");
  const [limit] = await env.DB.batch([
    env.DB.prepare("INSERT INTO auth_token_calls (ip_hash, minute, count) VALUES (?1, ?2, 1) ON CONFLICT (ip_hash, minute) DO UPDATE SET count = count + 1 WHERE count < ?3").bind(ip, minute, TOKENS_PER_MINUTE),
    env.DB.prepare("DELETE FROM auth_token_calls WHERE minute < ?1").bind(minute),
  ]);
  if (!limit!.meta.changes) return fail(429, "too_many_requests", "Too many sign-in attempts. Try again in a minute.", { "retry-after": "60" });
  let body: any;
  try {
    body = await req.json();
  } catch {
    body = undefined;
  }
  const invalid = () => fail(400, "invalid_grant", "The code or the verifier is not valid.");
  const { code, verifier, device_name } = body ?? {};
  if (typeof code !== "string" || code.length < 20 || code.length > 128 || !B64URL.test(code)) return invalid();
  if (typeof verifier !== "string" || verifier.length < 43 || verifier.length > 128 || !B64URL.test(verifier)) return invalid();
  const row = await env.DB.prepare("DELETE FROM auth_codes WHERE code_hash = ?1 AND expires_at > ?2 RETURNING account_id, challenge").bind(await sha256Hex(code), Date.now()).first<{ account_id: string; challenge: string }>();
  if (!row || !(await safeEqual(await s256(verifier), row.challenge))) return invalid();
  const name = typeof device_name === "string" ? device_name.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 80) : "";
  const deviceId = `dev_${randomToken(12)}`;
  const token = `cuv_${randomToken(32)}`;
  await env.DB.prepare("INSERT INTO devices (id, account_id, token_hash, name, created_at) VALUES (?1, ?2, ?3, ?4, ?5)").bind(deviceId, row.account_id, await sha256Hex(token), name || "Unnamed device", new Date().toISOString()).run();
  return reply(200, { token, device_id: deviceId, account_id: row.account_id });
}

export async function authLink(req: Request, env: Env, session: Session): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    body = undefined;
  }
  const provider = providerOf(typeof body?.provider === "string" ? body.provider : "");
  if (!provider) return fail(400, "invalid_request_error", "The provider must be google, microsoft, orcid or github.");
  const params = checkStart((n) => body?.[n]);
  if (typeof params === "string") return fail(400, "invalid_request_error", params);
  const link = randomToken(24);
  await env.DB.prepare("INSERT INTO auth_links (link_hash, account_id, expires_at) VALUES (?1, ?2, ?3)").bind(await sha256Hex(link), session.account.id, Date.now() + LINK_TTL_MS).run();
  const url = new URL("/v1/auth/start", new URL(req.url).origin);
  for (const [k, v] of Object.entries({ provider: provider.id, port: params.port, challenge: params.challenge, state: params.state, link })) url.searchParams.set(k, v);
  return reply(200, { url: url.toString() });
}

export async function listDevices(env: Env, session: Session): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT id, name, created_at, last_used_at FROM devices WHERE account_id = ?1 ORDER BY created_at, id").bind(session.account.id).all<{ id: string; name: string; created_at: string; last_used_at: string | null }>();
  return reply(200, { devices: results.map((d) => ({ ...d, current: d.id === session.deviceId })) });
}

export async function revokeDevice(env: Env, session: Session, id: string): Promise<Response> {
  const done = await env.DB.prepare("DELETE FROM devices WHERE id = ?1 AND account_id = ?2").bind(id, session.account.id).run();
  if (!done.meta.changes) return fail(404, "not_found_error", "The device does not exist.");
  return new Response(null, { status: 204 });
}

export async function logout(env: Env, session: Session): Promise<Response> {
  await env.DB.prepare("DELETE FROM devices WHERE id = ?1").bind(session.deviceId).run();
  return new Response(null, { status: 204 });
}
