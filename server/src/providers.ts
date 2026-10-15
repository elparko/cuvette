import type { Env } from "./env.ts";
import { verifyIdToken } from "./jwt.ts";
import { secretOf } from "./util.ts";

export const PROVIDER_IDS = ["google", "microsoft", "orcid", "github"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface Provider {
  id: ProviderId;
  authUrl: string;
  tokenUrl: string;
  scope: string;
  prompt?: string;
  jwksUrl?: string;
  discoveryUrl?: string;
  pkce: "always" | "discovery" | "never";
  issuerOk?: (claims: Record<string, any>) => boolean;
}

export const PROVIDERS: Record<ProviderId, Provider> = {
  google: {
    id: "google",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email",
    prompt: "select_account",
    jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
    pkce: "always",
    issuerOk: (c) => c.iss === "https://accounts.google.com" || c.iss === "accounts.google.com",
  },
  microsoft: {
    id: "microsoft",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "openid email",
    prompt: "select_account",
    jwksUrl: "https://login.microsoftonline.com/common/discovery/v2.0/keys",
    pkce: "always",
    issuerOk: (c) => typeof c.tid === "string" && /^[0-9a-f-]{36}$/i.test(c.tid) && c.iss === `https://login.microsoftonline.com/${c.tid}/v2.0`,
  },
  orcid: {
    id: "orcid",
    authUrl: "https://orcid.org/oauth/authorize",
    tokenUrl: "https://orcid.org/oauth/token",
    scope: "openid",
    jwksUrl: "https://orcid.org/oauth/jwks",
    discoveryUrl: "https://orcid.org/.well-known/openid-configuration",
    pkce: "discovery",
    issuerOk: (c) => c.iss === "https://orcid.org",
  },
  github: {
    id: "github",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scope: "",
    pkce: "never",
  },
};

export function providerOf(id: string): Provider | undefined {
  return (PROVIDER_IDS as readonly string[]).includes(id) ? PROVIDERS[id as ProviderId] : undefined;
}

export function credentials(env: Env, p: Provider): { clientId: string; clientSecret: string } | undefined {
  const clientId = secretOf(env, `${p.id.toUpperCase()}_CLIENT_ID`);
  const clientSecret = secretOf(env, `${p.id.toUpperCase()}_CLIENT_SECRET`);
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
}

let discoveryCache: { at: number; s256: boolean } | undefined;
const DISCOVERY_TTL_MS = 3_600_000;

export function clearDiscoveryCache(): void {
  discoveryCache = undefined;
}

export async function usesPkce(p: Provider): Promise<boolean> {
  if (p.pkce === "always") return true;
  if (p.pkce === "never") return false;
  const now = Date.now();
  if (discoveryCache && now - discoveryCache.at < DISCOVERY_TTL_MS) return discoveryCache.s256;
  let s256 = false;
  try {
    const res = await fetch(p.discoveryUrl!);
    if (res.ok) {
      const doc = (await res.json()) as { code_challenge_methods_supported?: unknown };
      s256 = Array.isArray(doc.code_challenge_methods_supported) && doc.code_challenge_methods_supported.includes("S256");
    }
  } catch {}
  discoveryCache = { at: now, s256 };
  return s256;
}

export interface ProviderIdentity {
  subject: string;
  email: string | null;
}

const clean = (v: unknown): string | null => (typeof v === "string" && v.length > 0 && v.length <= 254 ? v : null);

export async function exchangeCode(env: Env, p: Provider, code: string, redirectUri: string, nonce: string, providerVerifier: string | null): Promise<ProviderIdentity> {
  const creds = credentials(env, p);
  if (!creds) throw new Error("provider is not set up");
  const form = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: creds.clientId, client_secret: creds.clientSecret });
  if (providerVerifier) form.set("code_verifier", providerVerifier);
  const res = await fetch(p.tokenUrl, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, body: form.toString() });
  if (!res.ok) throw new Error(`token endpoint answered HTTP ${res.status}`);
  const token = (await res.json()) as { id_token?: string; access_token?: string };
  if (p.id === "github") {
    if (typeof token.access_token !== "string") throw new Error("no access token");
    const who = await fetch("https://api.github.com/user", { headers: { authorization: `Bearer ${token.access_token}`, accept: "application/vnd.github+json", "user-agent": "cuvette-inference" } });
    if (!who.ok) throw new Error(`user endpoint answered HTTP ${who.status}`);
    const user = (await who.json()) as { id?: unknown; email?: unknown };
    if (typeof user.id !== "number" || !Number.isSafeInteger(user.id) || user.id <= 0) throw new Error("no user id");
    return { subject: String(user.id), email: clean(user.email) };
  }
  if (typeof token.id_token !== "string") throw new Error("no id_token");
  const claims = await verifyIdToken(token.id_token, { jwksUrl: p.jwksUrl!, audience: creds.clientId, issuerOk: p.issuerOk!, nonce });
  const email = p.id === "microsoft" ? clean(claims.email) ?? (typeof claims.preferred_username === "string" && claims.preferred_username.includes("@") ? clean(claims.preferred_username) : null) : clean(claims.email);
  return { subject: claims.sub as string, email };
}
