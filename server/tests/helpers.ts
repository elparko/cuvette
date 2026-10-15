import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { vi } from "vitest";
import { handle, type Env } from "../src/index.ts";

const enc = new TextEncoder();

export const SCHEMA = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");

class FakeStatement {
  constructor(private db: DatabaseSync, readonly sql: string, private params: unknown[] = []) {}
  bind(...params: unknown[]): FakeStatement {
    return new FakeStatement(this.db, this.sql, params);
  }
  async first<T>(): Promise<T | null> {
    return (this.db.prepare(this.sql).get(...this.params) as T | undefined) ?? null;
  }
  async all<T>(): Promise<{ results: T[] }> {
    return { results: this.db.prepare(this.sql).all(...this.params) as T[] };
  }
  runNow(): { success: true; meta: { changes: number } } {
    const r = this.db.prepare(this.sql).run(...this.params);
    return { success: true, meta: { changes: Number(r.changes) } };
  }
  async run() {
    return this.runNow();
  }
}

class FakeD1 {
  readonly sqlite = new DatabaseSync(":memory:");
  constructor() {
    this.sqlite.exec(SCHEMA);
  }
  prepare(sql: string): FakeStatement {
    return new FakeStatement(this.sqlite, sql);
  }
  async batch(statements: FakeStatement[]) {
    this.sqlite.exec("BEGIN");
    try {
      const results = statements.map((s) => s.runNow());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (e) {
      this.sqlite.exec("ROLLBACK");
      throw e;
    }
  }
  row<T = Record<string, any>>(sql: string, ...params: unknown[]): T {
    return this.sqlite.prepare(sql).get(...params) as T;
  }
  rows<T = Record<string, any>>(sql: string, ...params: unknown[]): T[] {
    return this.sqlite.prepare(sql).all(...params) as T[];
  }
}

export interface TestEnv extends Env {
  DB: D1Database;
  fake: FakeD1;
}

export const TEST_PLANS = {
  plans: {
    basic: { price_usd_month: 10, price_usd_year: 100, allowance_usd: 7, models: ["claude-sonnet-5-5", "claude-haiku-5-5"], stripe_price_month: "price_basic_m", stripe_price_year: "price_basic_y" },
    standard: { price_usd_month: 20, price_usd_year: 200, allowance_usd: 15, models: "all", stripe_price_month: "price_standard_m", stripe_price_year: "price_standard_y" },
    lab: { price_usd_month: 60, price_usd_year: 600, allowance_usd: 46, models: "all", stripe_price_month: "price_lab_m", stripe_price_year: "price_lab_y" },
    lab_plus: { price_usd_month: 150, price_usd_year: 1500, allowance_usd: 118, models: "all", stripe_price_month: "price_labplus_m", stripe_price_year: "price_labplus_y" },
  },
  topup: { price_usd: 10, allowance_usd: 8, stripe_price: "price_topup" },
  trial: { plan: "standard", days: 7, allowance_usd: 2 },
};

export function makeEnv(extra: Partial<Env> = {}): TestEnv {
  const fake = new FakeD1();
  return {
    DB: fake as unknown as D1Database,
    fake,
    ANTHROPIC_API_KEY: "sk-ant-test-key",
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    ADMIN_SECRET: "admin-secret-value",
    HOSTED_ENABLED: "true",
    PLANS: JSON.stringify(TEST_PLANS),
    SITE_URL: "https://cuvette.test",
    GOOGLE_CLIENT_ID: "google-client",
    GOOGLE_CLIENT_SECRET: "google-secret",
    MICROSOFT_CLIENT_ID: "ms-client",
    MICROSOFT_CLIENT_SECRET: "ms-secret",
    ORCID_CLIENT_ID: "orcid-client",
    ORCID_CLIENT_SECRET: "orcid-secret",
    GITHUB_CLIENT_ID: "github-client",
    GITHUB_CLIENT_SECRET: "github-secret",
    ...extra,
  };
}

export async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const DAY = 86_400_000;

export interface AddOptions {
  id?: string;
  plan?: string;
  interval?: string | null;
  subStatus?: string;
  granted?: number;
  resetsAt?: number | null;
  periodEnd?: number | null;
  customer?: string | null;
  subscription?: string | null;
  suspended?: number;
}

export function newToken(): string {
  return `cuv_${[...crypto.getRandomValues(new Uint8Array(43))].map((b) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[b % 64]).join("")}`;
}

export async function addDevice(env: TestEnv, accountId: string, name = "Test device"): Promise<{ id: string; token: string }> {
  const token = newToken();
  const id = `dev_${crypto.randomUUID()}`;
  env.fake.sqlite.prepare("INSERT INTO devices (id, account_id, token_hash, name, created_at) VALUES (?, ?, ?, ?, ?)").run(id, accountId, await sha256Hex(token), name, new Date().toISOString());
  return { id, token };
}

export async function addAccount(env: TestEnv, allowance: number, o: AddOptions = {}): Promise<{ id: string; token: string; deviceId: string }> {
  const id = o.id ?? `acc_${crypto.randomUUID()}`;
  const plan = o.plan ?? "lab_plus";
  const none = plan === "none";
  env.fake.sqlite
    .prepare(
      "INSERT INTO accounts (id, created_at, plan, plan_interval, sub_status, stripe_customer_id, stripe_subscription_id, allowance_remaining_usd, allowance_granted_usd, allowance_resets_at, period_end, suspended) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      id,
      "2026-01-01T00:00:00Z",
      plan,
      none ? null : (o.interval ?? "month"),
      o.subStatus ?? (none ? "none" : "active"),
      o.customer ?? null,
      o.subscription ?? null,
      allowance,
      o.granted ?? (none ? 0 : allowance),
      o.resetsAt === undefined ? (none ? null : Date.now() + 20 * DAY) : o.resetsAt,
      o.periodEnd === undefined ? (none ? null : Date.now() + 25 * DAY) : o.periodEnd,
      o.suspended ?? 0,
    );
  const device = await addDevice(env, id);
  return { id, token: device.token, deviceId: device.id };
}

export function addTopup(env: TestEnv, accountId: string, remaining: number, expiresAt = Date.now() + 100 * DAY, id = crypto.randomUUID(), intent: string | null = null): string {
  env.fake.sqlite.prepare("INSERT INTO topups (id, account_id, remaining_usd, expires_at, stripe_payment_intent) VALUES (?, ?, ?, ?, ?)").run(id, accountId, remaining, expiresAt, intent);
  return id;
}

export function balanceOf(env: TestEnv, id: string): number {
  return env.fake.row<{ allowance_remaining_usd: number }>("SELECT allowance_remaining_usd FROM accounts WHERE id = ?", id).allowance_remaining_usd;
}

export function topupsOf(env: TestEnv, id: string): number {
  return env.fake.row<{ n: number }>("SELECT COALESCE(SUM(remaining_usd), 0) AS n FROM topups WHERE account_id = ?", id).n;
}

export function holdsOf(env: TestEnv, id: string): number {
  return env.fake.row<{ n: number }>("SELECT COUNT(*) AS n FROM holds WHERE account_id = ?", id).n;
}

export function heldTotal(env: TestEnv, id: string): number {
  return env.fake.row<{ n: number }>("SELECT COALESCE(SUM(amount_usd), 0) AS n FROM holds WHERE account_id = ?", id).n;
}

export function addHold(env: TestEnv, accountId: string, amount: number, startedAt = Date.now(), requestId = crypto.randomUUID(), model = "claude-sonnet-5-5"): string {
  env.fake.sqlite.prepare("INSERT INTO holds (request_id, account_id, amount_usd, started_at, model, session_id) VALUES (?, ?, ?, ?, ?, NULL)").run(requestId, accountId, amount, startedAt, model);
  return requestId;
}

export function addUsage(env: TestEnv, accountId: string, cost: number, at = new Date(), sessionId: string | null = null, topupCost = 0, model = "claude-sonnet-5-5"): void {
  env.fake.sqlite
    .prepare("INSERT INTO usage (request_id, account_id, session_id, model, status, input_tokens, output_tokens, cost_usd, topup_cost_usd, at) VALUES (?, ?, ?, ?, 'ok', 10, 20, ?, ?, ?)")
    .run(crypto.randomUUID(), accountId, sessionId, model, cost, topupCost, at.toISOString());
}

export function call(env: Env, path: string, init: RequestInit = {}): Promise<{ res: Response; settled: () => Promise<void> }> {
  const pending: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => void pending.push(p), passThroughOnException() {} } as unknown as ExecutionContext;
  return handle(new Request(`https://api.cuvette.ai${path}`, init), env, ctx).then((res) => ({ res, settled: async () => void (await Promise.all(pending)) }));
}

export function post(token: string | undefined, body: unknown, headers: Record<string, string> = {}): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

export interface FetchCall {
  url: string;
  init: RequestInit;
  headers: Headers;
  body: string;
}

export function mockFetch(handler: (call: FetchCall) => Response | Promise<Response>): FetchCall[] {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, init: RequestInit = {}) => {
      const c: FetchCall = { url: String(url), init, headers: new Headers(init.headers), body: typeof init.body === "string" ? init.body : String(init.body ?? "") };
      calls.push(c);
      return handler(c);
    }),
  );
  return calls;
}

export const sse = (events: [string, object][]): string => events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join("");

export const messageStart = (model: string, usage: object) => ["message_start", { type: "message_start", message: { id: "msg_1", type: "message", role: "assistant", model, content: [], usage } }] as [string, object];
export const textDelta = (text: string) => ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } }] as [string, object];
export const messageDelta = (usage: object) => ["message_delta", { type: "message_delta", delta: { stop_reason: "end_turn" }, usage }] as [string, object];
export const messageStop = () => ["message_stop", { type: "message_stop" }] as [string, object];

export function sseResponse(text: string, chunkSize = 7): Response {
  const bytes = enc.encode(text);
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (let i = 0; i < bytes.length; i += chunkSize) c.enqueue(bytes.slice(i, i + chunkSize));
      c.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } });
}

export function heldStream() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const state = { cancelled: false };
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      state.cancelled = true;
    },
  });
  return {
    response: new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } }),
    push: (text: string) => controller.enqueue(enc.encode(text)),
    end: () => controller.close(),
    state,
  };
}

export const SONNET = "claude-sonnet-5-5";

export function chatBody(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { model: SONNET, max_tokens: 1000, stream: true, messages: [{ role: "user", content: "hello" }], ...extra };
}

export function reserveFor(body: unknown, input: number, output: number): number {
  const bytes = enc.encode(JSON.stringify(body)).length;
  const tokens = Math.ceil(bytes / 2);
  const max = Math.min((body as any).max_tokens, 64000);
  return (tokens * input + max * output) / 1e6;
}

export const OPENAI_MODEL = "host-model";
export const OPENAI_UPSTREAMS = {
  [OPENAI_MODEL]: {
    kind: "openai",
    base_url: "https://llm.example.test/v1/",
    key_secret_name: "HOST_API_KEY",
    upstream_model: "vendor/real-model",
    price: { input: 1, output: 4, cache_read: 0.1 },
    max_output_tokens: 8000,
  },
};
export const HOST_KEY = "sk-host-secret-key";

export function makeOpenAiEnv(extra: Partial<Env> = {}): TestEnv {
  return makeEnv({ UPSTREAMS: JSON.stringify(OPENAI_UPSTREAMS), HOST_API_KEY: HOST_KEY, ...extra } as Partial<Env>);
}

export function openAiBody(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { model: OPENAI_MODEL, max_tokens: 1000, stream: true, messages: [{ role: "user", content: "hello" }], ...extra };
}

export const chunk = (data: object | string) => `data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`;

const encoder = new TextEncoder();

export async function hmac(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(text)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sendRaw(env: Env, body: string, header?: string | null, secret = "whsec_test", ts = Math.floor(Date.now() / 1000)): Promise<Response> {
  const sig = header === undefined ? `t=${ts},v1=${await hmac(secret, `${ts}.${body}`)}` : header;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (sig !== null) headers["stripe-signature"] = sig;
  return (await call(env, "/v1/stripe/webhook", { method: "POST", headers, body })).res;
}

let eventCount = 0;

export function event(type: string, object: unknown, id = `evt_${++eventCount}`): { id: string; type: string; data: { object: unknown } } {
  return { id, type, data: { object } };
}

export function send(env: Env, e: { id: string; type: string; data: { object: unknown } }): Promise<Response> {
  return sendRaw(env, JSON.stringify(e));
}

export type StripeRoutes = Record<string, (c: FetchCall) => unknown>;

export function stripeMock(routes: StripeRoutes): FetchCall[] {
  return mockFetch((c) => {
    const path = c.url.replace("https://api.stripe.com/v1", "").split("?")[0]!;
    const handler = routes[`${c.init.method ?? "GET"} ${path}`];
    if (!handler) return new Response(JSON.stringify({ error: { code: "route_missing", message: `${c.init.method} ${path}` } }), { status: 404 });
    const out = handler(c);
    return out instanceof Response ? out : new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
  });
}
