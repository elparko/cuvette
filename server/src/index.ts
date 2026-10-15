import { accountInfo, adminCosts, pricing, usageReport } from "./account.ts";
import { authCallback, authLink, authStart, authToken, authenticate, listDevices, logout, revokeDevice, type Session } from "./auth.ts";
import { billingPortal, changePlan, checkout, webhook } from "./billing.ts";
import type { Env } from "./env.ts";
import { NO_TOKENS, allowedModels, planOf, prepareAccount, refusal, reserve, settle, topupBalance, type Account } from "./money.ts";
import { loadPlans, type PlansConfig } from "./plans.ts";
import { OpenAiUsage, openAiTokens } from "./openai.ts";
import { listCost, reservationCost, type Tokens } from "./pricing.ts";
import { SseUsage, mergeUsage } from "./sse.ts";
import { answerPrice, loadUpstreams, type Kind, type Upstream, type UpstreamTable } from "./upstreams.ts";
import { fail, logError, reply, secretOf } from "./util.ts";

export type { Env } from "./env.ts";
export { MAX_LIVE_HOLDS, LIVE_HOLD_MS } from "./money.ts";

export const COUNT_TOKENS_PER_MINUTE = 60;
export const ALLOWED_BETAS = ["server-side-fallback-2026-07-01"];
export const ALLOWED_FIELDS = ["model", "messages", "system", "max_tokens", "tools", "tool_choice", "stream", "thinking", "metadata", "output_config", "fallbacks"];
const MAX_BODY_BYTES = 32 * 1024 * 1024;
const SESSION_ID = /^[A-Za-z0-9._:-]{1,64}$/;

const unauthorized = () => fail(401, "authentication_error", "The account token is missing or not valid.");

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

interface Hold {
  requestId: string;
  sessionId: string | null;
  reserve: number;
  outputReserve: number;
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
  tracker(): { push(chunk: Uint8Array): void; outcome(completed: boolean, failed: boolean): Outcome };
  fromJson(json: any): Outcome | undefined;
  isOurs(status: number, text: string): boolean;
}

function settleSafe(env: Env, hold: Hold, charge: number, model: string, status: string, t: Tokens): Promise<void> {
  return settle(env, hold.requestId, charge, model, status, t).catch((e) => logError("settle", e));
}

function newHold(req: Request, checked: Checked, bytes: number): Hold {
  const session = req.headers.get("x-cuvette-session");
  return {
    requestId: crypto.randomUUID(),
    sessionId: session && SESSION_ID.test(session) ? session : null,
    reserve: reservationCost(checked.up.price, bytes, checked.maxTokens),
    outputReserve: listCost(checked.up.price, { ...NO_TOKENS, output: checked.maxTokens }),
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

const isBusy = (status: number) => status === 429 || status === 529;

function busy(up: Response): Response {
  const retry = up.headers.get("retry-after");
  return fail(503, "overloaded", "The model service is busy. Try again in a short time.", retry ? { "retry-after": retry } : {});
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
  const finalCharge = (model: string, t: Tokens) => listCost(answerPrice(table, model), t);
  return {
    url: checked.up.baseUrl + path + query,
    headers,
    body: JSON.stringify(checked.forward),
    tracker() {
      const sse = new SseUsage();
      return {
        push: (chunk) => sse.push(chunk),
        outcome(completed, failed) {
          const seen = sse.seen;
          if (seen.finished && seen.total) {
            const model = seen.model ?? hold.requestedModel;
            return { charge: finalCharge(model, seen.total), model, tokens: seen.total, status: "ok" };
          }
          if (!seen.started && (completed || failed || seen.failed)) return { charge: 0, model: hold.requestedModel, tokens: NO_TOKENS, status: "error" };
          if (!seen.started || !seen.start) return { charge: hold.reserve, model: hold.requestedModel, tokens: NO_TOKENS, status: "cut" };
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
  const cost = (t: Tokens) => listCost(checked.up.price, t);
  return {
    url: `${checked.up.baseUrl}/chat/completions`,
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(checked.forward),
    tracker() {
      const usage = new OpenAiUsage();
      return {
        push: (chunk) => usage.push(chunk),
        outcome(completed, failed) {
          if (usage.tokens && (usage.done || completed)) return { charge: cost(usage.tokens), model: hold.requestedModel, tokens: usage.tokens, status: "ok" };
          if (!usage.chunks && (completed || failed)) return { charge: 0, model: hold.requestedModel, tokens: NO_TOKENS, status: "error" };
          return { charge: hold.reserve, model: hold.requestedModel, tokens: NO_TOKENS, status: "cut" };
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
  const refundAll = (status: string) => settleSafe(env, hold, 0, hold.requestedModel, status, NO_TOKENS);
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
    if (isBusy(up.status)) return busy(up);
    return new Response(text, { status: up.status, headers: passHeaders(up) });
  }

  if (up.body && (up.headers.get("content-type") ?? "").startsWith("text/event-stream")) {
    const tracker = flavor.tracker();
    const reader = up.body.getReader();
    let finished = false;
    let cancelled = false;
    let release!: () => void;
    ctx.waitUntil(new Promise<void>((r) => (release = r)));
    const finish = (completed: boolean, failed = false) => {
      if (finished) return;
      finished = true;
      const o = tracker.outcome(completed, failed);
      void settleSafe(env, hold, o.charge, o.model, o.status, o.tokens).finally(release);
    };
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (cancelled) return;
          if (done) {
            controller.close();
            finish(true);
            return;
          }
          tracker.push(value);
          controller.enqueue(value);
        } catch (e) {
          if (cancelled) return;
          logError("stream", e);
          controller.error(e);
          finish(false, true);
        }
      },
      async cancel(reason) {
        cancelled = true;
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
  else ctx.waitUntil(settleSafe(env, hold, hold.reserve, hold.requestedModel, "cut", NO_TOKENS));
  return new Response(text, { status: up.status, headers: passHeaders(up) });
}

async function entitlement(env: Env, cfg: PlansConfig, account: Account, model: string, now: number): Promise<Response | undefined> {
  if (account.suspended) return fail(403, "account_suspended", "A payment dispute suspended this account. Contact support.");
  if (!planOf(cfg, account) && (await topupBalance(env, account.id, now)) <= 0) return fail(403, "no_plan", "This account has no plan. Choose a plan or buy a top-up.");
  if (!(await allowedModels(env, cfg, account, now)).includes(model)) return fail(403, "model_not_in_plan", `The plan of this account does not include the model "${model}".`);
  return undefined;
}

async function admit(env: Env, base: Account, checked: Checked, hold: Hold): Promise<Response | undefined> {
  const cfg = loadPlans(env.PLANS);
  const now = Date.now();
  const account = await prepareAccount(env, cfg, base, now);
  const denied = await entitlement(env, cfg, account, checked.name, now);
  if (denied) return denied;
  if (await reserve(env, cfg, account, { requestId: hold.requestId, amount: hold.reserve, model: checked.name, sessionId: hold.sessionId }, now)) return undefined;
  return refusal(env, cfg, account, hold.reserve, now);
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
  const hold = newHold(req, checked, read.raw.byteLength);
  const refused = await admit(env, account, checked, hold);
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
  const hold = newHold(req, checked, read.raw.byteLength);
  const refused = await admit(env, account, checked, hold);
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
  const denied = await entitlement(env, loadPlans(env.PLANS), account, checked.name, Date.now());
  if (denied) return denied;
  const key = secretOf(env, checked.up.keySecretName);
  if (!key) {
    console.error("upstream key missing", checked.up.keySecretName);
    return unavailable();
  }
  const hold = newHold(req, checked, read.raw.byteLength);
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
  if (isBusy(up.status)) return busy(up);
  return new Response(text, { status: up.status, headers: passHeaders(up) });
}

function models(env: Env): Response {
  const table = loadUpstreams(env.UPSTREAMS);
  return reply(200, { object: "list", data: [...table.keys()].map((id) => ({ id, object: "model", owned_by: "cuvette" })) });
}

type Name = "pricing" | "webhook" | "start" | "callback" | "token" | "link" | "logout" | "account" | "usage" | "devices" | "revoke" | "checkout" | "plan" | "portal" | "messages" | "count_tokens" | "chat" | "models" | "admin";

const ROUTES: { method: string; pattern: RegExp; name: Name }[] = [
  { method: "GET", pattern: /^\/v1\/pricing$/, name: "pricing" },
  { method: "POST", pattern: /^\/v1\/stripe\/webhook$/, name: "webhook" },
  { method: "GET", pattern: /^\/v1\/auth\/start$/, name: "start" },
  { method: "GET", pattern: /^\/v1\/auth\/callback\/([a-z]{1,20})$/, name: "callback" },
  { method: "POST", pattern: /^\/v1\/auth\/token$/, name: "token" },
  { method: "POST", pattern: /^\/v1\/auth\/link$/, name: "link" },
  { method: "POST", pattern: /^\/v1\/auth\/logout$/, name: "logout" },
  { method: "GET", pattern: /^\/v1\/account$/, name: "account" },
  { method: "GET", pattern: /^\/v1\/usage$/, name: "usage" },
  { method: "GET", pattern: /^\/v1\/devices$/, name: "devices" },
  { method: "DELETE", pattern: /^\/v1\/devices\/([A-Za-z0-9_-]{1,64})$/, name: "revoke" },
  { method: "POST", pattern: /^\/v1\/checkout$/, name: "checkout" },
  { method: "POST", pattern: /^\/v1\/plan$/, name: "plan" },
  { method: "POST", pattern: /^\/v1\/billing\/portal$/, name: "portal" },
  { method: "POST", pattern: /^\/v1\/messages$/, name: "messages" },
  { method: "POST", pattern: /^\/v1\/messages\/count_tokens$/, name: "count_tokens" },
  { method: "POST", pattern: /^\/v1\/chat\/completions$/, name: "chat" },
  { method: "GET", pattern: /^\/v1\/models$/, name: "models" },
  { method: "GET", pattern: /^\/v1\/admin\/costs$/, name: "admin" },
];

export async function handle(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const path = new URL(req.url).pathname;
  const matches = ROUTES.filter((r) => r.pattern.test(path));
  if (!matches.length) return fail(404, "not_found_error", "The route does not exist.");
  if (env.HOSTED_ENABLED !== "true" && !(req.method === "GET" && path === "/v1/pricing")) return fail(503, "hosted_off", "Cuvette hosted is not open yet.");
  const route = matches.find((r) => r.method === req.method);
  if (!route) {
    const allow = matches.map((r) => r.method).join(", ");
    return fail(405, "invalid_request_error", `Use ${allow} for this route.`, { allow });
  }
  const param = route.pattern.exec(path)?.[1] ?? "";
  try {
    switch (route.name) {
      case "pricing":
        return pricing(env);
      case "webhook":
        return await webhook(req, env);
      case "start":
        return await authStart(req, env);
      case "callback":
        return await authCallback(req, env, param);
      case "token":
        return await authToken(req, env);
      case "admin":
        return await adminCosts(req, env);
    }
    const session: Session | undefined = await authenticate(req, env, ctx);
    if (!session) return unauthorized();
    const account = session.account;
    switch (route.name) {
      case "link":
        return await authLink(req, env, session);
      case "logout":
        return await logout(env, session);
      case "account":
        return await accountInfo(env, await prepareAccount(env, loadPlans(env.PLANS), account));
      case "usage":
        return await usageReport(req, env, account);
      case "devices":
        return await listDevices(env, session);
      case "revoke":
        return await revokeDevice(env, session, param);
      case "checkout":
        return await checkout(req, env, account);
      case "plan":
        return await changePlan(req, env, account);
      case "portal":
        return await billingPortal(env, account);
      case "models":
        return models(env);
      case "count_tokens":
        return await countTokens(req, env, account);
      case "chat":
        return await chatCompletions(req, env, ctx, account);
      default:
        return await messages(req, env, ctx, account);
    }
  } catch (e) {
    logError(path, e);
    return fail(500, "api_error", "The server had an internal error.");
  }
}

export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) => handle(req, env, ctx),
} satisfies ExportedHandler<Env>;
