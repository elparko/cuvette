import { OpenAiUsage, openAiTokens } from "./openai.ts";
import { listCost, reservationCost, type Price, type Tokens } from "./pricing.ts";
import { SseUsage, mergeUsage } from "./sse.ts";
import { AMOUNTS_USD, createCheckout, hex, verifySignature } from "./stripe.ts";
import { answerPrice, loadUpstreams, type Kind, type Upstream, type UpstreamTable } from "./upstreams.ts";

export interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY?: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  MARKUP?: string;
  SITE_URL: string;
  UPSTREAMS?: unknown;
}

export const MAX_IN_FLIGHT = 4;
export const IN_FLIGHT_TTL_MS = 15 * 60_000;
export const COUNT_TOKENS_PER_MINUTE = 60;
export const SIGNUPS_PER_HOUR = 5;
export const ALLOWED_BETAS = ["server-side-fallback-2026-07-01"];
export const ALLOWED_FIELDS = ["model", "messages", "system", "max_tokens", "tools", "tool_choice", "stream", "thinking", "metadata", "output_config", "fallbacks"];
const MAX_BODY_BYTES = 32 * 1024 * 1024;
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
  await env.DB.prepare("INSERT INTO accounts (id, token_hash, balance_usd, created_at) VALUES (?1, ?2, 0, ?3)").bind(id, await sha256Hex(token), new Date().toISOString()).run();
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

const OPENAI_FIELDS = ["model", "messages", "tools", "tool_choice", "stream", "max_tokens", "max_completion_tokens", "temperature", "top_p", "stop", "response_format", "stream_options"];
const WRONG_ROUTE: Record<Kind, string> = {
  anthropic: "This model does not work on this route. Use POST /v1/messages for it.",
  openai: "This model does not work on this route. Use POST /v1/chat/completions for it.",
};

interface Checked {
  name: string;
  up: Upstream;
  maxTokens: number;
  forward: Record<string, unknown>;
}

const isObject = (v: unknown): boolean => !!v && typeof v === "object" && !Array.isArray(v);

function checkModel(body: any, table: UpstreamTable, kind: Kind): { name: string; up: Upstream } | string {
  if (typeof body.model !== "string") return "The field model must be a string.";
  const up = table.get(body.model);
  if (!up) return `The model "${body.model}" is not available.`;
  if (up.kind !== kind) return WRONG_ROUTE[up.kind];
  return { name: body.model, up };
}

function checkAnthropic(body: any, table: UpstreamTable, counting: boolean): Checked | string {
  if (!isObject(body)) return "The body must be a JSON object.";
  for (const key of Object.keys(body)) if (!ALLOWED_FIELDS.includes(key)) return `The field "${key}" is not allowed.`;
  const model = checkModel(body, table, "anthropic");
  if (typeof model === "string") return model;
  if (!Array.isArray(body.messages) || !body.messages.length) return "The field messages must be a list that is not empty.";
  const hasMax = body.max_tokens !== undefined;
  if ((!counting || hasMax) && (!Number.isInteger(body.max_tokens) || body.max_tokens < 1)) return "The field max_tokens must be a positive integer.";
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
  const maxTokens = hasMax ? Math.min(body.max_tokens, model.up.maxOutputTokens) : 0;
  const forward: Record<string, unknown> = { ...body, model: model.up.upstreamModel };
  if (hasMax) forward.max_tokens = maxTokens;
  return { ...model, maxTokens, forward };
}

function checkOpenAi(body: any, table: UpstreamTable): Checked | string {
  if (!isObject(body)) return "The body must be a JSON object.";
  for (const key of Object.keys(body)) if (!OPENAI_FIELDS.includes(key)) return `The field "${key}" is not allowed.`;
  const model = checkModel(body, table, "openai");
  if (typeof model === "string") return model;
  if (!Array.isArray(body.messages) || !body.messages.length) return "The field messages must be a list that is not empty.";
  if (body.stream !== undefined && typeof body.stream !== "boolean") return "The field stream must be true or false.";
  for (const key of ["max_tokens", "max_completion_tokens"]) {
    if (body[key] !== undefined && (!Number.isInteger(body[key]) || body[key] < 1)) return `The field ${key} must be a positive integer.`;
  }
  for (const key of ["temperature", "top_p"]) {
    if (body[key] !== undefined && (typeof body[key] !== "number" || !Number.isFinite(body[key]))) return `The field ${key} must be a number.`;
  }
  if (body.stop !== undefined && typeof body.stop !== "string" && !(Array.isArray(body.stop) && body.stop.every((s: unknown) => typeof s === "string"))) return "The field stop must be a string or a list of strings.";
  if (body.response_format !== undefined && !isObject(body.response_format)) return "The field response_format must be an object.";
  if (body.stream_options !== undefined && !isObject(body.stream_options)) return "The field stream_options must be an object.";
  if (body.tools !== undefined) {
    if (!Array.isArray(body.tools)) return "The field tools must be a list.";
    for (const t of body.tools) {
      if (!isObject(t)) return "Each tool must be an object.";
      if (t.type !== "function") return `The tool type "${String(t.type)}" is not allowed. Only function tools work.`;
    }
  }
  const limit = model.up.maxOutputTokens;
  const forward: Record<string, unknown> = { ...body, model: model.up.upstreamModel };
  const given: number[] = [];
  for (const key of ["max_tokens", "max_completion_tokens"]) {
    if (body[key] === undefined) continue;
    forward[key] = Math.min(body[key], limit);
    given.push(forward[key] as number);
  }
  if (!given.length) forward.max_tokens = limit;
  if (body.stream === true) forward.stream_options = { ...(body.stream_options as object | undefined), include_usage: true };
  return { ...model, maxTokens: given.length ? Math.max(...given) : limit, forward };
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

function secretOf(env: Env, name: string): string | undefined {
  const v = (env as unknown as Record<string, unknown>)[name];
  return typeof v === "string" && v ? v : undefined;
}

interface Hold {
  requestId: string;
  accountId: string;
  reserve: number;
  outputReserve: number;
  markup: number;
  requestedModel: string;
}

interface Outcome {
  charge: number;
  model: string;
  tokens: Tokens;
  status: string;
}

interface Flavor {
  url: string;
  headers: Record<string, string>;
  body: string;
  tracker(): { push(chunk: Uint8Array): void; outcome(completed: boolean): Outcome };
  fromJson(json: any): Outcome | undefined;
  isOurs(status: number, text: string): boolean;
}

async function reserve(env: Env, hold: Hold): Promise<"ok" | "busy" | "poor"> {
  const now = Date.now();
  const cutoff = now - IN_FLIGHT_TTL_MS;
  const [, taken] = await env.DB.batch([
    env.DB.prepare("DELETE FROM in_flight WHERE account_id = ?1 AND started_at <= ?2").bind(hold.accountId, cutoff),
    env.DB.prepare(
      "INSERT INTO in_flight (request_id, account_id, started_at) SELECT ?1, ?2, ?3 WHERE (SELECT COUNT(*) FROM in_flight WHERE account_id = ?2 AND started_at > ?4) < ?5 AND (SELECT balance_usd FROM accounts WHERE id = ?2) >= ?6",
    ).bind(hold.requestId, hold.accountId, now, cutoff, MAX_IN_FLIGHT, hold.reserve),
    env.DB.prepare("UPDATE accounts SET balance_usd = balance_usd - ?1 WHERE id = ?2 AND EXISTS (SELECT 1 FROM in_flight WHERE request_id = ?3)").bind(hold.reserve, hold.accountId, hold.requestId),
  ]);
  if (taken!.meta.changes) return "ok";
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM in_flight WHERE account_id = ?1 AND started_at > ?2").bind(hold.accountId, cutoff).first<{ n: number }>();
  return row && row.n >= MAX_IN_FLIGHT ? "busy" : "poor";
}

async function settle(env: Env, hold: Hold, charge: number, model: string, status: string, t: Tokens): Promise<void> {
  const cutoff = Date.now() - IN_FLIGHT_TTL_MS;
  const live = "EXISTS (SELECT 1 FROM in_flight WHERE request_id = ?12 AND started_at > ?13)";
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO usage (account_id, model, status, input_tokens, output_tokens, cache_read_tokens, cache_write_5m_tokens, cache_write_1h_tokens, cost_usd, at) SELECT ?1, ?2, CASE WHEN ${live} THEN ?3 ELSE 'expired' END, ?4, ?5, ?6, ?7, ?8, CASE WHEN ${live} THEN ?9 ELSE ?11 END, ?10`,
    ).bind(hold.accountId, model, status, t.input, t.output, t.cacheRead, t.cacheWrite5m, t.cacheWrite1h, charge, new Date().toISOString(), hold.reserve, hold.requestId, cutoff),
    env.DB.prepare("UPDATE accounts SET balance_usd = balance_usd + ?1 WHERE id = ?2 AND EXISTS (SELECT 1 FROM in_flight WHERE request_id = ?3 AND started_at > ?4)").bind(hold.reserve - charge, hold.accountId, hold.requestId, cutoff),
    env.DB.prepare("DELETE FROM in_flight WHERE request_id = ?1").bind(hold.requestId),
  ]);
}

function settleSafe(env: Env, hold: Hold, charge: number, model: string, status: string, t: Tokens): Promise<void> {
  return settle(env, hold, charge, model, status, t).catch((e) => logError("settle", e));
}

function newHold(account: Account, checked: Checked, bytes: number, env: Env): Hold {
  const markup = markupOf(env);
  return {
    requestId: crypto.randomUUID(),
    accountId: account.id,
    reserve: reservationCost(checked.up.price, bytes, checked.maxTokens, markup),
    outputReserve: listCost(checked.up.price, { ...NO_ZERO, output: checked.maxTokens }) * markup,
    markup,
    requestedModel: checked.name,
  };
}

async function readBody(req: Request): Promise<{ raw: ArrayBuffer; body: any } | Response> {
  const raw = await req.arrayBuffer();
  if (raw.byteLength > MAX_BODY_BYTES) return fail(413, "request_too_large", "The request is too large.");
  try {
    return { raw, body: JSON.parse(new TextDecoder().decode(raw)) };
  } catch {
    return fail(400, "invalid_request_error", "The body is not JSON.");
  }
}

const unavailable = () => fail(503, "api_error", "The inference service is not available. Try again later.");

function anthropicFlavor(req: Request, table: UpstreamTable, hold: Hold, checked: Checked, key: string, path: string): Flavor {
  const version = req.headers.get("anthropic-version") ?? "";
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": key,
    "anthropic-version": /^\d{4}-\d{2}-\d{2}$/.test(version) ? version : "2023-06-01",
  };
  const beta = betaHeader(req.headers.get("anthropic-beta"));
  if (beta) headers["anthropic-beta"] = beta;
  const query = new URL(req.url).searchParams.get("beta") === "true" ? "?beta=true" : "";
  const finalCharge = (model: string, t: Tokens) => listCost(answerPrice(table, model), t) * hold.markup;
  return {
    url: checked.up.baseUrl + path + query,
    headers,
    body: JSON.stringify(checked.forward),
    tracker() {
      const sse = new SseUsage();
      return {
        push: (chunk) => sse.push(chunk),
        outcome() {
          const seen = sse.seen;
          if (seen.finished && seen.total) {
            const model = seen.model ?? hold.requestedModel;
            return { charge: finalCharge(model, seen.total), model, tokens: seen.total, status: "ok" };
          }
          if (!seen.started || !seen.start) return { charge: hold.reserve, model: hold.requestedModel, tokens: NO_ZERO, status: "cut" };
          const model = seen.model ?? hold.requestedModel;
          return { charge: finalCharge(model, { ...seen.start, output: 0 }) + hold.outputReserve, model, tokens: seen.start, status: "cut" };
        },
      };
    },
    fromJson(json) {
      if (!json || typeof json !== "object" || !json.usage) return undefined;
      const model = typeof json.model === "string" ? json.model : hold.requestedModel;
      const tokens = mergeUsage(undefined, json.usage);
      return { charge: finalCharge(model, tokens), model, tokens, status: "ok" };
    },
    isOurs: (status, text) => status === 401 || status === 403 || (status === 400 && /credit balance/i.test(text)),
  };
}

function openAiFlavor(hold: Hold, checked: Checked, key: string): Flavor {
  const cost = (t: Tokens) => listCost(checked.up.price, t) * hold.markup;
  return {
    url: `${checked.up.baseUrl}/chat/completions`,
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(checked.forward),
    tracker() {
      const usage = new OpenAiUsage();
      return {
        push: (chunk) => usage.push(chunk),
        outcome(completed) {
          if (usage.tokens && (usage.done || completed)) return { charge: cost(usage.tokens), model: hold.requestedModel, tokens: usage.tokens, status: "ok" };
          return { charge: hold.reserve, model: hold.requestedModel, tokens: NO_ZERO, status: "cut" };
        },
      };
    },
    fromJson(json) {
      const tokens = openAiTokens(json?.usage);
      return tokens ? { charge: cost(tokens), model: hold.requestedModel, tokens, status: "ok" } : undefined;
    },
    isOurs: (status, text) => status === 401 || status === 402 || status === 403 || (status === 429 && /insufficient_quota/i.test(text)),
  };
}

async function forward(env: Env, ctx: ExecutionContext, hold: Hold, flavor: Flavor): Promise<Response> {
  const refundAll = (status: string) => settleSafe(env, hold, 0, hold.requestedModel, status, NO_ZERO);
  let up: Response;
  try {
    up = await fetch(flavor.url, { method: "POST", headers: flavor.headers, body: flavor.body });
  } catch (e) {
    logError("upstream", e);
    await refundAll("error");
    return fail(502, "api_error", "The inference service did not answer. Try again.");
  }

  if (!up.ok) {
    const text = await up.text();
    await refundAll("rejected");
    if (flavor.isOurs(up.status, text)) return unavailable();
    return new Response(text, { status: up.status, headers: passHeaders(up) });
  }

  if (up.body && (up.headers.get("content-type") ?? "").startsWith("text/event-stream")) {
    const tracker = flavor.tracker();
    const reader = up.body.getReader();
    let finished = false;
    let release!: () => void;
    ctx.waitUntil(new Promise<void>((r) => (release = r)));
    const finish = (completed: boolean) => {
      if (finished) return;
      finished = true;
      const o = tracker.outcome(completed);
      void settleSafe(env, hold, o.charge, o.model, o.status, o.tokens).finally(release);
    };
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            finish(true);
            return;
          }
          tracker.push(value);
          controller.enqueue(value);
        } catch (e) {
          logError("stream", e);
          controller.error(e);
          finish(false);
        }
      },
      async cancel(reason) {
        try {
          await reader.cancel(reason);
        } catch {}
        finish(false);
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
  const o = flavor.fromJson(json);
  if (o) ctx.waitUntil(settleSafe(env, hold, o.charge, o.model, o.status, o.tokens));
  else ctx.waitUntil(settleSafe(env, hold, hold.reserve, hold.requestedModel, "cut", NO_ZERO));
  return new Response(text, { status: up.status, headers: passHeaders(up) });
}

async function takeCredit(env: Env, hold: Hold): Promise<Response | undefined> {
  const result = await reserve(env, hold);
  if (result === "busy") return fail(429, "too_many_requests", "Too many requests are running for this account. Wait for one to finish.");
  if (result === "poor") return fail(402, "insufficient_credit", "The Cuvette credit is used up. Buy more credit to continue.");
  return undefined;
}

async function messages(req: Request, env: Env, ctx: ExecutionContext, account: Account): Promise<Response> {
  const read = await readBody(req);
  if (read instanceof Response) return read;
  const table = loadUpstreams(env.UPSTREAMS);
  const checked = checkAnthropic(read.body, table, false);
  if (typeof checked === "string") return fail(400, "invalid_request_error", checked);
  const key = secretOf(env, checked.up.keySecretName);
  if (!key) {
    console.error("upstream key missing", checked.up.keySecretName);
    return unavailable();
  }
  const hold = newHold(account, checked, read.raw.byteLength, env);
  const refused = await takeCredit(env, hold);
  if (refused) return refused;
  return forward(env, ctx, hold, anthropicFlavor(req, table, hold, checked, key, "/messages"));
}

async function chatCompletions(req: Request, env: Env, ctx: ExecutionContext, account: Account): Promise<Response> {
  const read = await readBody(req);
  if (read instanceof Response) return read;
  const table = loadUpstreams(env.UPSTREAMS);
  const checked = checkOpenAi(read.body, table);
  if (typeof checked === "string") return fail(400, "invalid_request_error", checked);
  const key = secretOf(env, checked.up.keySecretName);
  if (!key) {
    console.error("upstream key missing", checked.up.keySecretName);
    return unavailable();
  }
  const hold = newHold(account, checked, read.raw.byteLength, env);
  const refused = await takeCredit(env, hold);
  if (refused) return refused;
  return forward(env, ctx, hold, openAiFlavor(hold, checked, key));
}

async function countTokens(req: Request, env: Env, account: Account): Promise<Response> {
  const minute = Math.floor(Date.now() / 60_000);
  const [limit] = await env.DB.batch([
    env.DB.prepare("INSERT INTO count_tokens_calls (account_id, minute, count) VALUES (?1, ?2, 1) ON CONFLICT (account_id, minute) DO UPDATE SET count = count + 1 WHERE count < ?3").bind(account.id, minute, COUNT_TOKENS_PER_MINUTE),
    env.DB.prepare("DELETE FROM count_tokens_calls WHERE account_id = ?1 AND minute < ?2").bind(account.id, minute),
  ]);
  if (!limit!.meta.changes) return fail(429, "too_many_requests", "Too many token counts. Try again in a minute.", { "retry-after": "60" });
  const read = await readBody(req);
  if (read instanceof Response) return read;
  const table = loadUpstreams(env.UPSTREAMS);
  const checked = checkAnthropic(read.body, table, true);
  if (typeof checked === "string") return fail(400, "invalid_request_error", checked);
  const key = secretOf(env, checked.up.keySecretName);
  if (!key) {
    console.error("upstream key missing", checked.up.keySecretName);
    return unavailable();
  }
  const hold = newHold(account, checked, read.raw.byteLength, env);
  const flavor = anthropicFlavor(req, table, hold, checked, key, "/messages/count_tokens");
  let up: Response;
  try {
    up = await fetch(flavor.url, { method: "POST", headers: flavor.headers, body: flavor.body });
  } catch (e) {
    logError("count_tokens", e);
    return fail(502, "api_error", "The inference service did not answer. Try again.");
  }
  const text = await up.text();
  if (!up.ok && flavor.isOurs(up.status, text)) return unavailable();
  return new Response(text, { status: up.status, headers: passHeaders(up) });
}

function models(env: Env): Response {
  const table = loadUpstreams(env.UPSTREAMS);
  return reply(200, { object: "list", data: [...table.keys()].map((id) => ({ id, object: "model", owned_by: "cuvette" })) });
}

export async function handle(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const path = new URL(req.url).pathname;
  const routes: Record<string, string> = {
    "/v1/accounts": "POST",
    "/v1/account": "GET",
    "/v1/checkout": "POST",
    "/v1/stripe/webhook": "POST",
    "/v1/messages": "POST",
    "/v1/messages/count_tokens": "POST",
    "/v1/chat/completions": "POST",
    "/v1/models": "GET",
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
    if (path === "/v1/models") return models(env);
    if (path === "/v1/messages/count_tokens") return await countTokens(req, env, account);
    if (path === "/v1/chat/completions") return await chatCompletions(req, env, ctx, account);
    return await messages(req, env, ctx, account);
  } catch (e) {
    logError(path, e);
    return fail(500, "api_error", "The server had an internal error.");
  }
}

export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) => handle(req, env, ctx),
} satisfies ExportedHandler<Env>;
