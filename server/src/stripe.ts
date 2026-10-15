export const AMOUNTS_USD = [10, 25, 50];
export const TOLERANCE_SECONDS = 300;

const enc = new TextEncoder();

function hexBytes(hex: string): Uint8Array | undefined {
  if (!/^([0-9a-f]{2})+$/i.test(hex)) return undefined;
  return Uint8Array.from(hex.match(/../g)!, (h) => parseInt(h, 16));
}

export function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
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

export async function createCheckout(secretKey: string, accountId: string, amountUsd: number, siteUrl: string): Promise<string> {
  const form = new URLSearchParams({
    mode: "payment",
    client_reference_id: accountId,
    success_url: `${siteUrl}/account?checkout=done`,
    cancel_url: `${siteUrl}/account?checkout=cancelled`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(amountUsd * 100),
    "line_items[0][price_data][product_data][name]": `Cuvette inference credit, $${amountUsd}`,
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { authorization: `Bearer ${secretKey}`, "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) throw new Error(`Stripe answered HTTP ${res.status}`);
  const session = (await res.json()) as { url?: string };
  if (!session.url) throw new Error("Stripe sent no checkout URL");
  return session.url;
}
