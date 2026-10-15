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

export function makeEnv(extra: Partial<Env> = {}): TestEnv {
  const fake = new FakeD1();
  return {
    DB: fake as unknown as D1Database,
    fake,
    ANTHROPIC_API_KEY: "sk-ant-test-key",
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    MARKUP: "1.25",
    SITE_URL: "https://cuvette.test",
    ...extra,
  };
}

export async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function addAccount(env: TestEnv, balance: number, id = crypto.randomUUID()): Promise<{ id: string; token: string }> {
  const token = `cuv_${[...crypto.getRandomValues(new Uint8Array(43))].map((b) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[b % 64]).join("")}`;
  env.fake.sqlite.prepare("INSERT INTO accounts (id, token_hash, balance_usd, in_flight, created_at) VALUES (?, ?, ?, 0, ?)").run(id, await sha256Hex(token), balance, "2026-01-01T00:00:00Z");
  return { id, token };
}

export function balanceOf(env: TestEnv, id: string): number {
  return env.fake.row<{ balance_usd: number }>("SELECT balance_usd FROM accounts WHERE id = ?", id).balance_usd;
}

export function inFlightOf(env: TestEnv, id: string): number {
  return env.fake.row<{ in_flight: number }>("SELECT in_flight FROM accounts WHERE id = ?", id).in_flight;
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

export function reserveFor(body: unknown, input: number, output: number, markup = 1.25): number {
  const bytes = enc.encode(JSON.stringify(body)).length;
  const tokens = Math.ceil(bytes / 2);
  const max = Math.min((body as any).max_tokens, 64000);
  return ((tokens * input + max * output) / 1e6) * markup;
}
