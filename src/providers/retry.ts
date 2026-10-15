import Anthropic from "@anthropic-ai/sdk";
import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";
import { ProviderError } from "../core/types.ts";

export const RETRIES = 3;
export const RETRY_BUDGET_MS = 60_000;
const NETWORK_TEXT = /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket hang up|terminated|timed? ?out/i;

export interface RetryInfo {
  attempt: number;
  of: number;
  waitMs: number;
  reason: string;
}

export interface RetryBudget {
  leftMs: number;
}

export type Sleep = (ms: number, signal?: AbortSignal) => Promise<void>;

export const realSleep: Sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new Error("interrupted"));
    const onAbort = () => (clearTimeout(timer), reject(signal?.reason ?? new Error("interrupted")));
    const timer = setTimeout(() => (signal?.removeEventListener("abort", onAbort), resolve()), ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });

export interface IdleSignal {
  signal: AbortSignal;
  touch: () => void;
  stop: () => void;
}

// A streamed reply can take longer than the timeout. The timer starts again at each chunk, so only a server that sends nothing stops.
export function idleSignal(ms: number, user?: AbortSignal): IdleSignal {
  const ctl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => clearTimeout(timer);
  const touch = () => {
    stop();
    timer = setTimeout(() => ctl.abort(new DOMException(`No data for ${ms / 1000} s.`, "TimeoutError")), ms);
    timer.unref?.();
  };
  touch();
  return { signal: user ? AbortSignal.any([user, ctl.signal]) : ctl.signal, touch, stop };
}

const nativeFetch = globalThis.fetch;

// The global fetch ends a request after 300 s without response headers or without body data. The idle timer of the caller must decide that.
export function longFetch(url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }): Promise<Response> {
  if (globalThis.fetch !== nativeFetch) return fetch(url, init);
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const body = Buffer.from(init.body);
    const send = target.protocol === "https:" ? https.request : http.request;
    const req = send(target, { method: init.method, headers: { ...init.headers, "content-length": String(body.length) }, signal: init.signal }, (res) => {
      const headers = new Headers();
      for (const [k, v] of Object.entries(res.headers)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) headers.append(k, x);
      const status = res.statusCode ?? 0;
      const empty = status === 204 || status === 205 || status === 304;
      resolve(new Response(empty ? null : (Readable.toWeb(res) as ReadableStream), { status, statusText: res.statusMessage ?? "", headers }));
    });
    req.on("error", reject);
    req.end(body);
  });
}

export function timedOut(signal: AbortSignal | undefined): boolean {
  return !!signal?.aborted && signal.reason instanceof Error && signal.reason.name === "TimeoutError";
}

export function errorBody(text: string): string {
  return /^(error|blocked)\b/i.test(text) ? text : `Error: ${text}`;
}

function headerOf(e: any, name: string): string | undefined {
  const h = e?.headers;
  const v = typeof h?.get === "function" ? h.get(name) : h?.[name];
  return typeof v === "string" ? v : undefined;
}

export function retryAfterMs(e: unknown): number | undefined {
  const rawMs = headerOf(e, "retry-after-ms");
  if (rawMs && Number.isFinite(Number(rawMs)) && Number(rawMs) >= 0) return Number(rawMs);
  const raw = headerOf(e, "retry-after");
  if (!raw) return undefined;
  const s = Number(raw);
  if (Number.isFinite(s) && s >= 0) return s * 1000;
  const date = Date.parse(raw);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

export function noRetry(e: unknown): boolean {
  return headerOf(e, "x-should-retry") === "false";
}

export function retryReason(e: unknown): string | undefined {
  if (e instanceof Anthropic.APIUserAbortError || e instanceof ProviderError) return undefined;
  if ((e as any)?.partial === true) return "the reply stopped early";
  const should = headerOf(e, "x-should-retry");
  if (should === "false") return undefined;
  if (e instanceof Anthropic.RateLimitError) return "rate limit";
  if (e instanceof Anthropic.APIConnectionError) return "network error";
  if (e instanceof Anthropic.APIError) {
    const type = (e as any).error?.error?.type ?? (e as any).error?.type;
    if (typeof e.status === "number" && (e.status >= 500 || e.status === 408 || e.status === 409)) return `server error (${e.status})`;
    if (e.status === undefined && (type === "overloaded_error" || type === "api_error")) return "server error";
    if (e.status === undefined && should === "true") return "server error";
    return undefined;
  }
  const status = (e as any)?.status;
  if (typeof status === "number") {
    if (status === 429) return "rate limit";
    if (status >= 500 || status === 408 || status === 409) return `server error (${status})`;
    return undefined;
  }
  if (e instanceof Error && !(e as any).status && NETWORK_TEXT.test(`${e.message} ${(e as any).code ?? ""} ${(e as any).cause?.code ?? ""}`)) return "network error";
  return undefined;
}

export function waitMs(attempt: number, e: unknown, random: () => number = Math.random): number {
  const base = Math.min(30_000, 1000 * 2 ** (attempt - 1));
  const own = base / 2 + random() * (base / 2);
  return Math.max(own, retryAfterMs(e) ?? 0);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  o: { retries?: number; sleep?: Sleep; signal?: AbortSignal; onRetry?: (r: RetryInfo) => void; budget?: RetryBudget } = {},
): Promise<T> {
  const retries = o.retries ?? RETRIES;
  const budget = o.budget ?? { leftMs: RETRY_BUDGET_MS };
  const sleep = o.sleep ?? realSleep;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const reason = retryReason(e);
      if (!reason || attempt > retries || o.signal?.aborted) throw e;
      const wait = waitMs(attempt, e);
      if (wait > budget.leftMs) throw e;
      budget.leftMs -= wait;
      o.onRetry?.({ attempt, of: retries, waitMs: wait, reason });
      await sleep(wait, o.signal);
    }
  }
}
