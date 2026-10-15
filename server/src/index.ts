import { MAX_OUTPUT_TOKENS, listCost, priceOf, reservationCost, type Price, type Tokens } from "./pricing.ts";
import { SseUsage, mergeUsage } from "./sse.ts";
import { AMOUNTS_USD, createCheckout, hex, verifySignature } from "./stripe.ts";

export interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  MARKUP?: string;
  SITE_URL: string;
}

export const MAX_IN_FLIGHT = 4;
export const SIGNUPS_PER_HOUR = 5;
export const ALLOWED_BETAS = ["server-side-fallback-2026-07-01"];
export const ALLOWED_FIELDS = ["model", "messages", "system", "max_tokens", "tools", "tool_choice", "stream", "thinking", "metadata", "output_config", "fallbacks"];
const MAX_BODY_BYTES = 32 * 1024 * 1024;
const UPSTREAM = "https://api.anthropic.com/v1/messages";
const DEFAULT_MARKUP = 1.25;
const NO_ZERO = { input: 0, output: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 };

const encoder = new TextEncoder();

function reply(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

function fail(status: number, type: string, message: string, headers: Record<string, string> = {}): Response {
  return reply(status, { type: "error", error: { type, message } }, headers);
}

async function sha256Hex(text: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function markupOf(env: Env): number {
  const m = Number(env.MARKUP);
  return Number.isFinite(m) && m > 0 ? m : DEFAULT_MARKUP;
}

function logError(where: string, e: unknown): void {
  console.error(where, e instanceof Error ? `${e.name}: ${e.message}` : "unknown error");
}

interface Account {
  id: string;
  balance_usd: number;
}

async function authenticate(req: Request, env: Env): Promise<Account | undefined> {
  const m = /^Bearer (cuv_[A-Za-z0-9_-]{43})$/.exec(req.headers.get("authorization") ?? "");
  if (!m) return undefined;
  const row = await env.DB.prepare("SELECT id, balance_usd FROM accounts WHERE token_hash = ?1").bind(await sha256Hex(m[1]!)).first<Account>();
  return row ?? undefined;
}

const unauthorized = () => fail(401, "authentication_error", "The account token is missing or not valid.");

async function createAccount(req: Request, env: Env): Promise<Response> {
  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  const hour = Math.floor(Date.now() / 3_600_000);
  const [limit] = await env.DB.batch([
    env.DB.prepare("INSERT INTO signups (ip_hash, hour, count) VALUES (?1, ?2, 1) ON CONFLICT (ip_hash, hour) DO UPDATE SET count = count + 1 WHERE count < ?3").bind(await sha256Hex(ip), hour, SIGNUPS_PER_HOUR),
    env.DB.prepare("DELETE FROM signups WHERE hour < ?1").bind(hour),
  ]);
  if (!limit!.meta.changes) return fail(429, "too_many_requests", "Too many accounts were created from this address. Try again later.", { "retry-after": "3600" });
  const id = crypto.randomUUID();
  const token = `cuv_${base64url(crypto.getRandomValues(new Uint8Array(32)))}`;
  await env.DB.prepare("INSERT INTO accounts (id, token_hash, balance_usd, in_flight, created_at) VALUES (?1, ?2, 0, 0, ?3)").bind(id, await sha256Hex(token), new Date().toISOString()).run();
  return reply(201, { account_id: id, token });
}

async function checkout(req: Request, env: Env, account: Account): Promise<Response> {
  let amount: unknown;
  try {
    amount = ((await req.json()) as any)?.amount_usd;
  } catch {
    amount = undefined;
  }
  if (typeof amount !== "number" || !AMOUNTS_USD.includes(amount)) return fail(400, "invalid_request_error", `amount_usd must be one of ${AMOUNTS_USD.join(", ")}.`);
  try {
    return reply(200, { url: await createCheckout(env.STRIPE_SECRET_KEY, account.id, amount, env.SITE_URL) });
  } catch (e) {
    logError("checkout", e);
    return fail(502, "api_error", "The payment service did not answer. Try again later.");
  }
}

async function webhook(req: Request, env: Env): Promise<Response> {
  const raw = new Uint8Array(await req.arrayBuffer());
  if (!(await verifySignature(env.STRIPE_WEBHOOK_SECRET, req.headers.get("stripe-signature"), raw))) return fail(400, "invalid_request_error", "The signature is not valid.");
  let event: any;
  try {
    event = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return fail(400, "invalid_request_error", "The body is not JSON.");
  }
  if (event?.type !== "checkout.session.completed") return reply(200, { received: true });
  const s = event.data?.object;
  const cents = Number(s?.amount_total);
  const valid = typeof s?.id === "string" && typeof s?.client_reference_id === "string" && s.payment_status === "paid" && s.currency === "usd" && AMOUNTS_USD.some((a) => a * 100 === cents);
  if (!valid) {
    console.error("webhook ignored", typeof s?.id === "string" ? s.id : "no session id");
    return reply(200, { received: true, ignored: true });
  }
  const exists = await env.DB.prepare("SELECT id FROM accounts WHERE id = ?1").bind(s.client_reference_id).first();
  if (!exists) {
    console.error("webhook account not found", s.id);
    return reply(200, { received: true, ignored: true });
  }
  const usd = cents / 100;
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO payments (session_id, account_id, amount_usd, created_at) VALUES (?1, ?2, ?3, ?4)").bind(s.id, s.client_reference_id, usd, new Date().toISOString()),
      env.DB.prepare("UPDATE accounts SET balance_usd = balance_usd + ?1 WHERE id = ?2").bind(usd, s.client_reference_id),
    ]);
  } catch (e) {
    const done = await env.DB.prepare("SELECT session_id FROM payments WHERE session_id = ?1").bind(s.id).first();
    if (!done) throw e;
    return reply(200, { received: true, duplicate: true });
  }
  return reply(200, { received: true });
}

function checkBody(body: any): { model: string; maxTokens: number; price: Price } | string {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "The body must be a JSON object.";
  for (const key of Object.keys(body)) if (!ALLOWED_FIELDS.includes(key)) return `The field "${key}" is not allowed.`;
  if (typeof body.model !== "string") return "The field model must be a string.";
  const price = priceOf(body.model);
  if (!price) return `The model "${body.model}" is not available.`;
  if (!Array.isArray(body.messages) || !body.messages.length) return "The field messages must be a list that is not empty.";
  if (!Number.isInteger(body.max_tokens) || body.max_tokens < 1) return "The field max_tokens must be a positive integer.";
  if (body.stream !== undefined && typeof body.stream !== "boolean") return "The field stream must be true or false.";
  if (body.fallbacks !== undefined && body.fallbacks !== "default") return 'The field fallbacks must be "default".';
  if (body.system !== undefined && typeof body.system !== "string" && !Array.isArray(body.system)) return "The field system must be a string or a list.";
  if (body.tools !== undefined) {
    if (!Array.isArray(body.tools)) return "The field tools must be a list.";
    for (const t of body.tools) {
      if (!t || typeof t !== "object") return "Each tool must be an object.";
      if (t.type !== undefined && t.type !== "custom") return `The tool type "${String(t.type)}" is not allowed. Only custom tools work.`;
    }
  }
  return { model: body.model, maxTokens: Math.min(body.max_tokens, MAX_OUTPUT_TOKENS), price };
}

function betaHeader(value: string | null): string | undefined {
  const kept = (value ?? "").split(",").map((v) => v.trim()).filter((v) => ALLOWED_BETAS.includes(v));
  return kept.length ? kept.join(",") : undefined;
}

function passHeaders(up: Response, extra: Record<string, string> = {}): Headers {
  const h = new Headers(extra);
  for (const name of ["content-type", "request-id", "retry-after", "cache-control"]) {
    const v = up.headers.get(name);
    if (v) h.set(name, v);
  }
  return h;
}

interface Hold {
  accountId: string;
  reserve: number;
  outputReserve: number;
  markup: number;
  requestedModel: string;
}

async function settle(env: Env, hold: Hold, charge: number, model: string, status: string, t: Tokens): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("UPDATE accounts SET balance_usd = balance_usd + ?1, in_flight = MAX(in_flight - 1, 0) WHERE id = ?2").bind(hold.reserve - charge, hold.accountId),
    env.DB.prepare("INSERT INTO usage (account_id, model, status, input_tokens, output_tokens, cache_read_tokens, cache_write_5m_tokens, cache_write_1h_tokens, cost_usd, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)").bind(
      hold.accountId, model, status, t.input, t.output, t.cacheRead, t.cacheWrite5m, t.cacheWrite1h, charge, new Date().toISOString(),
    ),
  ]);
}

function settleSafe(env: Env, hold: Hold, charge: number, model: string, status: string, t: Tokens): Promise<void> {
  return settle(env, hold, charge, model, status, t).catch((e) => logError("settle", e));
}

function chargeFinal(hold: Hold, model: string, t: Tokens): number {
  return listCost(priceOf(model), t) * hold.markup;
}

function chargeCut(hold: Hold, seen: SseUsage["seen"]): { charge: number; model: string; tokens: Tokens } {
  if (!seen.started || !seen.start) return { charge: hold.reserve, model: hold.requestedModel, tokens: NO_ZERO };
  const model = seen.model ?? hold.requestedModel;
  return { charge: listCost(priceOf(model), { ...seen.start, output: 0 }) * hold.markup + hold.outputReserve, model, tokens: seen.start };
}

async function messages(req: Request, env: Env, ctx: ExecutionContext, account: Account): Promise<Response> {
  const raw = await req.arrayBuffer();
  if (raw.byteLength > MAX_BODY_BYTES) return fail(413, "request_too_large", "The request is too large.");
  let body: any;
  try {
    body = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return fail(400, "invalid_request_error", "The body is not JSON.");
  }
  const checked = checkBody(body);
  if (typeof checked === "string") return fail(400, "invalid_request_error", checked);

  const markup = markupOf(env);
  const reserve = reservationCost(checked.price, raw.byteLength, checked.maxTokens, markup);
  const hold: Hold = {
    accountId: account.id,
    reserve,
    outputReserve: listCost(checked.price, { ...NO_ZERO, output: checked.maxTokens }) * markup,
    markup,
    requestedModel: checked.model,
  };
  const taken = await env.DB.prepare("UPDATE accounts SET balance_usd = balance_usd - ?1, in_flight = in_flight + 1 WHERE id = ?2 AND balance_usd >= ?1 AND in_flight < ?3").bind(reserve, account.id, MAX_IN_FLIGHT).run();
  if (!taken.meta.changes) {
    const row = await env.DB.prepare("SELECT in_flight FROM accounts WHERE id = ?1").bind(account.id).first<{ in_flight: number }>();
    if (row && row.in_flight >= MAX_IN_FLIGHT) return fail(429, "too_many_requests", "Too many requests are running for this account. Wait for one to finish.");
    return fail(402, "insufficient_credit", "The Cuvette credit is used up. Buy more credit to continue.");
  }

  const refundAll = (status: string) => settleSafe(env, hold, 0, checked.model, status, NO_ZERO);
  const version = req.headers.get("anthropic-version") ?? "";
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": env.ANTHROPIC_API_KEY,
    "anthropic-version": /^\d{4}-\d{2}-\d{2}$/.test(version) ? version : "2023-06-01",
  };
  const beta = betaHeader(req.headers.get("anthropic-beta"));
  if (beta) headers["anthropic-beta"] = beta;
  const query = new URL(req.url).searchParams.get("beta") === "true" ? "?beta=true" : "";

  let up: Response;
  try {
    up = await fetch(UPSTREAM + query, { method: "POST", headers, body: JSON.stringify({ ...body, max_tokens: checked.maxTokens }) });
  } catch (e) {
    logError("upstream", e);
    await refundAll("error");
    return fail(502, "api_error", "The inference service did not answer. Try again.");
  }

  if (!up.ok) {
    const text = await up.text();
    await refundAll("rejected");
    const ours = up.status === 401 || up.status === 403 || (up.status === 400 && /credit balance/i.test(text));
    if (ours) return fail(503, "api_error", "The inference service is not available. Try again later.");
    return new Response(text, { status: up.status, headers: passHeaders(up) });
  }

  if (up.body && (up.headers.get("content-type") ?? "").startsWith("text/event-stream")) {
    const sse = new SseUsage();
    const reader = up.body.getReader();
    let finished = false;
    let release!: () => void;
    ctx.waitUntil(new Promise<void>((r) => (release = r)));
    const finish = () => {
      if (finished) return;
      finished = true;
      const seen = sse.seen;
      const work =
        seen.finished && seen.total
          ? settleSafe(env, hold, chargeFinal(hold, seen.model ?? checked.model, seen.total), seen.model ?? checked.model, "ok", seen.total)
          : (({ charge, model, tokens }) => settleSafe(env, hold, charge, model, "cut", tokens))(chargeCut(hold, seen));
      void work.finally(release);
    };
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            finish();
            return;
          }
          sse.push(value);
          controller.enqueue(value);
        } catch (e) {
          logError("stream", e);
          controller.error(e);
          finish();
        }
      },
      async cancel(reason) {
        try {
          await reader.cancel(reason);
        } catch {}
        finish();
      },
    });
    return new Response(stream, { status: up.status, headers: passHeaders(up, { "cache-control": "no-cache" }) });
  }

  const text = await up.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  if (json && typeof json === "object" && json.usage) {
    const model = typeof json.model === "string" ? json.model : checked.model;
    const t = mergeUsage(undefined, json.usage);
    ctx.waitUntil(settleSafe(env, hold, chargeFinal(hold, model, t), model, "ok", t));
  } else {
    ctx.waitUntil(settleSafe(env, hold, hold.reserve, checked.model, "cut", NO_ZERO));
  }
  return new Response(text, { status: up.status, headers: passHeaders(up) });
}

export async function handle(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const path = new URL(req.url).pathname;
  const routes: Record<string, string> = {
    "/v1/accounts": "POST",
    "/v1/account": "GET",
    "/v1/checkout": "POST",
    "/v1/stripe/webhook": "POST",
    "/v1/messages": "POST",
  };
  const method = routes[path];
  if (!method) return fail(404, "not_found_error", "The route does not exist.");
  if (req.method !== method) return fail(405, "invalid_request_error", `Use ${method} for this route.`, { allow: method });
  try {
    if (path === "/v1/accounts") return await createAccount(req, env);
    if (path === "/v1/stripe/webhook") return await webhook(req, env);
    const account = await authenticate(req, env);
    if (!account) return unauthorized();
    if (path === "/v1/account") return reply(200, { account_id: account.id, balance_usd: Math.round(account.balance_usd * 1e6) / 1e6 });
    if (path === "/v1/checkout") return await checkout(req, env, account);
    return await messages(req, env, ctx, account);
  } catch (e) {
    logError(path, e);
    return fail(500, "api_error", "The server had an internal error.");
  }
}

export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) => handle(req, env, ctx),
} satisfies ExportedHandler<Env>;
