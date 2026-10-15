import { safeEqual } from "./util.ts";

const KEY_TTL_MS = 3_600_000;
const REFETCH_GAP_MS = 60_000;
const SKEW_SECONDS = 60;
const MAX_TOKEN_CHARS = 8192;

interface KeySet {
  fetchedAt: number;
  keys: Map<string, CryptoKey>;
}

const cache = new Map<string, KeySet>();

export function clearKeyCache(): void {
  cache.clear();
}

const decoder = new TextDecoder();

function decode(part: string): Uint8Array {
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function fetchKeys(url: string, now: number): Promise<KeySet> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JWKS answered HTTP ${res.status}`);
  const body = (await res.json()) as { keys?: any[] };
  const keys = new Map<string, CryptoKey>();
  for (const jwk of body.keys ?? []) {
    if (jwk?.kty !== "RSA" || typeof jwk.kid !== "string" || typeof jwk.n !== "string" || typeof jwk.e !== "string") continue;
    if (jwk.use !== undefined && jwk.use !== "sig") continue;
    try {
      keys.set(jwk.kid, await crypto.subtle.importKey("jwk", { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256" }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]));
    } catch {}
  }
  const set = { fetchedAt: now, keys };
  cache.set(url, set);
  return set;
}

async function keyFor(url: string, kid: string, now: number): Promise<CryptoKey | undefined> {
  const cached = cache.get(url);
  if (cached && now - cached.fetchedAt < KEY_TTL_MS) {
    const hit = cached.keys.get(kid);
    if (hit) return hit;
    if (now - cached.fetchedAt < REFETCH_GAP_MS) return undefined;
  }
  return (await fetchKeys(url, now)).keys.get(kid);
}

export interface IdTokenRules {
  jwksUrl: string;
  audience: string;
  issuerOk: (claims: Record<string, any>) => boolean;
  nonce: string;
  now?: number;
}

export async function verifyIdToken(token: string, rules: IdTokenRules): Promise<Record<string, any>> {
  const now = rules.now ?? Date.now();
  if (token.length > MAX_TOKEN_CHARS) throw new Error("id_token too long");
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((p) => !/^[A-Za-z0-9_-]+$/.test(p))) throw new Error("id_token malformed");
  const header = JSON.parse(decoder.decode(decode(parts[0]!)));
  const claims = JSON.parse(decoder.decode(decode(parts[1]!)));
  if (header?.alg !== "RS256" || typeof header.kid !== "string") throw new Error("id_token algorithm");
  const key = await keyFor(rules.jwksUrl, header.kid, now);
  if (!key) throw new Error("id_token key unknown");
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  if (!(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode(parts[2]!), signed))) throw new Error("id_token signature");
  if (!claims || typeof claims !== "object") throw new Error("id_token claims");
  if (!rules.issuerOk(claims)) throw new Error("id_token issuer");
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(rules.audience)) throw new Error("id_token audience");
  if (aud.length > 1 && claims.azp !== rules.audience) throw new Error("id_token authorized party");
  const seconds = now / 1000;
  if (typeof claims.exp !== "number" || claims.exp + SKEW_SECONDS < seconds) throw new Error("id_token expired");
  if (claims.nbf !== undefined && (typeof claims.nbf !== "number" || claims.nbf - SKEW_SECONDS > seconds)) throw new Error("id_token not yet valid");
  if (typeof claims.nonce !== "string" || !(await safeEqual(claims.nonce, rules.nonce))) throw new Error("id_token nonce");
  if (typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 255) throw new Error("id_token subject");
  return claims;
}
