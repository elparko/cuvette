import { hex } from "./util.ts";

export const TOLERANCE_SECONDS = 300;

const enc = new TextEncoder();

function hexBytes(hex: string): Uint8Array | undefined {
  if (!/^([0-9a-f]{2})+$/i.test(hex)) return undefined;
  return Uint8Array.from(hex.match(/../g)!, (h) => parseInt(h, 16));
}

async function hmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

export async function signPayload(secret: string, timestamp: number, raw: Uint8Array): Promise<string> {
  const head = enc.encode(`${timestamp}.`);
  const data = new Uint8Array(head.length + raw.length);
  data.set(head);
  data.set(raw, head.length);
  return hex(await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), data));
}

export async function verifySignature(secret: string, header: string | null, raw: Uint8Array, nowMs = Date.now()): Promise<boolean> {
  if (!header) return false;
  let timestamp = NaN;
  const candidates: Uint8Array[] = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (key === "t") timestamp = Number(value);
    else if (key === "v1") {
      const bytes = hexBytes(value);
      if (bytes) candidates.push(bytes);
    }
  }
  if (!Number.isInteger(timestamp) || !candidates.length) return false;
  if (Math.abs(nowMs / 1000 - timestamp) > TOLERANCE_SECONDS) return false;
  const head = enc.encode(`${timestamp}.`);
  const data = new Uint8Array(head.length + raw.length);
  data.set(head);
  data.set(raw, head.length);
  const key = await hmacKey(secret, "verify");
  let ok = false;
  for (const sig of candidates) if (await crypto.subtle.verify("HMAC", key, sig, data)) ok = true;
  return ok;
}

export class StripeError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(`Stripe answered HTTP ${status} ${code}`);
  }
}

export async function stripeCall(secretKey: string, method: "GET" | "POST", path: string, params: Record<string, string> = {}, idempotencyKey?: string): Promise<any> {
  const query = new URLSearchParams(params).toString();
  const headers: Record<string, string> = { authorization: `Bearer ${secretKey}` };
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
  const init: RequestInit = { method, headers };
  if (method === "POST") {
    headers["content-type"] = "application/x-www-form-urlencoded";
    init.body = query;
  }
  const res = await fetch(`https://api.stripe.com/v1${path}${method === "GET" && query ? `?${query}` : ""}`, init);
  if (!res.ok) {
    let code = "";
    try {
      code = String(((await res.json()) as any)?.error?.code ?? "");
    } catch {}
    throw new StripeError(res.status, code);
  }
  return res.json();
}
