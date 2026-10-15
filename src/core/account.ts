import { cuvetteToken, cuvetteUrl, removeCuvetteToken } from "./credentials.ts";

export const CUVETTE_NOTICE =
  "Cuvette uses Claude from Anthropic to run your analysis. Your requests go through the Cuvette server to Anthropic. The Cuvette server does not keep the data.";

export const NOT_SIGNED_IN = "You are not signed in to Cuvette. Run `cuvette account login`, or open Settings and sign in.";
export const SIGN_IN_REFUSED = "Cuvette does not accept your sign-in. Sign in again. Run `cuvette account login`, or open Settings.";
export const TOO_MANY = "Cuvette is busy with other requests from your account. Wait a moment and retry.";
export const NO_MODEL = "Your plan does not include this model. Choose another model, or choose a larger plan.";
export const SUSPENDED = "Cuvette suspended this account. Ask Cuvette support for help.";
export const NO_PLAN = "Your account has no plan. Choose a plan in Settings, or run `cuvette account plan standard`.";
export const ALREADY_SUBSCRIBED = "You already have a plan. Use Manage billing to cancel it. Run `cuvette account plan <id>` to change it.";
export const HOSTED_OFF = "Cuvette hosted is not open yet.";
export const ACCOUNT_TAKEN = "This sign-in belongs to another Cuvette account. Sign out and sign in with it, or use a different sign-in.";
export const BAD_CODE = "The sign-in code is not valid, or it expired. Sign in again.";

export const PLAN_IDS = ["basic", "standard", "lab", "lab_plus"] as const;
export const PLAN_NAMES: Record<string, string> = { basic: "Basic", standard: "Standard", lab: "Lab", lab_plus: "Lab Plus", none: "No plan" };

export class AccountError extends Error {}

export interface AccountCtx {
  env?: Record<string, string | undefined>;
  fetch?: typeof fetch;
}

export interface AccountInfo {
  account_id: string;
  identities: { provider: string; email?: string | null }[];
  plan: string;
  interval: "month" | "year" | null;
  sub_status: string;
  period_end: string | null;
  allowance_usd: number;
  allowance_remaining_usd: number;
  topup_remaining_usd: number;
  analyses_left_estimate: number;
  mean_cost_per_analysis_usd: number;
  resets_at: string | null;
  models: string[];
}

export interface UsageRow {
  at: string;
  session_id: string | null;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_write_tokens: number;
  cache_read_tokens: number;
  cost_usd: number;
  paid_from: "allowance" | "topup";
}

export interface UsageReport {
  rows: UsageRow[];
  sessions: { session_id: string; started_at: string; requests: number; cost_usd: number }[];
}

export interface Pricing {
  plans: { id: string; price_usd_month: number; price_usd_year: number; allowance_usd: number; models: string[] }[];
  topup: { price_usd: number; allowance_usd: number };
  model_prices_per_million: Record<string, { input: number; output: number; cache_write_5m: number; cache_write_1h: number; cache_read: number }>;
  records: string[];
  never_stored: string[];
}

export interface Device {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  current: boolean;
}

export const balanceText = (usd: number): string => `$${usd.toFixed(2)}`;

export function resetText(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function waitText(seconds: number): string {
  const n = (v: number, unit: string) => `${v} ${unit}${v === 1 ? "" : "s"}`;
  if (seconds < 60) return n(Math.max(1, Math.ceil(seconds)), "second");
  if (seconds < 3600) return n(Math.ceil(seconds / 60), "minute");
  return n(Math.ceil(seconds / 3600), "hour");
}

export function analysesText(n: number): string {
  return n === 1 ? "about 1 analysis left" : `about ${n} analyses left`;
}

export function meterFraction(a: Pick<AccountInfo, "allowance_usd" | "allowance_remaining_usd">): number {
  return a.allowance_usd > 0 ? Math.min(1, Math.max(0, 1 - a.allowance_remaining_usd / a.allowance_usd)) : 1;
}

export interface HostedError {
  type: string;
  text: string;
  transient: boolean;
  generic?: boolean;
}

export function hostedError(status: number, body: unknown, retryAfterHeader?: string | null): HostedError | undefined {
  const top = (body && typeof body === "object" ? body : {}) as Record<string, any>;
  const inner = (top.error && typeof top.error === "object" ? top.error : top) as Record<string, any>;
  const type = String(inner.type ?? "");
  const resets = inner.resets_at ?? top.resets_at;
  const seconds = Number(inner.retry_after ?? top.retry_after ?? retryAfterHeader);
  if (type === "authentication_error" || (status === 401 && !type)) return { type: "authentication_error", text: SIGN_IN_REFUSED, transient: false };
  if (type === "allowance_used_up" || (status === 402 && !type))
    return {
      type: "allowance_used_up",
      text: `Your allowance is used up. ${typeof resets === "string" ? `It resets on ${resetText(resets)}. ` : ""}Buy a top-up, or choose a larger plan.`,
      transient: false,
    };
  if (type === "model_not_in_plan") return { type, text: NO_MODEL, transient: false };
  if (type === "account_suspended") return { type, text: SUSPENDED, transient: false };
  if (type === "no_plan") return { type, text: NO_PLAN, transient: false };
  if (type === "already_subscribed") return { type, text: ALREADY_SUBSCRIBED, transient: false };
  if (type === "invalid_grant") return { type, text: BAD_CODE, transient: false };
  if (type === "rate_limited")
    return {
      type,
      text: `You reached the limit for five hours. ${Number.isFinite(seconds) && seconds > 0 ? `Wait ${waitText(seconds)} and retry.` : "Wait a few minutes and retry."}`,
      transient: false,
    };
  if (type === "too_many_requests") return { type, text: TOO_MANY, transient: true };
  if (type === "hosted_off") return { type, text: HOSTED_OFF, transient: false };
  if (type === "trial_in_progress") return { type, text: "The plan cannot change during the trial. Change it after the trial ends.", transient: false };
  if (type === "invalid_request_error") return { type, text: "Cuvette could not use the request. Update Cuvette, then try again.", transient: false };
  if (type === "not_found_error") return { type, text: "The Cuvette server does not have this item. Select Refresh, then try again.", transient: false };
  if (type === "request_too_large") return { type, text: "The request is too large. Send less data, then try again.", transient: false };
  if (type === "api_error") return { type, text: "The Cuvette server had an error. Wait a moment and retry.", transient: true };
  if (type === "overloaded")
    return {
      type,
      text: `The model service is busy. ${Number.isFinite(seconds) && seconds > 0 ? `Wait ${waitText(seconds)} and retry.` : "Wait a moment and retry."}`,
      transient: true,
    };
  const message = typeof inner.message === "string" ? inner.message.trim().slice(0, 300) : "";
  if (message) return { type: type || "error", text: message, transient: false, generic: true };
  return undefined;
}

interface Options {
  auth?: boolean;
  body?: unknown;
  text?: boolean;
}

async function request<T>(ctx: AccountCtx, method: "GET" | "POST" | "DELETE", path: string, opts: Options = {}): Promise<T> {
  const env = ctx.env ?? process.env;
  const headers: Record<string, string> = {};
  if (opts.auth !== false) {
    const t = cuvetteToken(env).token;
    if (!t) throw new AccountError(NOT_SIGNED_IN);
    headers.authorization = `Bearer ${t}`;
  }
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  let res: Response;
  try {
    res = await (ctx.fetch ?? fetch)(`${cuvetteUrl(env)}${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  } catch {
    throw new AccountError("Cannot reach the Cuvette server. Check the network.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    const known = hostedError(res.status, body, res.headers.get("retry-after"));
    throw new AccountError(known?.text ?? `The Cuvette server returned HTTP ${res.status}.`);
  }
  if (res.status === 204) return undefined as T;
  return (opts.text ? await res.text() : await res.json()) as T;
}

const query = (r: { from?: string; to?: string; format?: string }) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(r)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
};

let planModels: string[] | undefined;

export const knownPlanModels = (): string[] | undefined => planModels;

export async function getAccount(ctx: AccountCtx = {}): Promise<AccountInfo> {
  const info = await request<AccountInfo>(ctx, "GET", "/v1/account");
  planModels = Array.isArray(info.models) ? info.models : undefined;
  return info;
}

export async function linkUrl(body: { provider: string; port: string; challenge: string; state: string }, ctx: AccountCtx = {}): Promise<string> {
  return (await request<{ url: string }>(ctx, "POST", "/v1/auth/link", { body })).url;
}

export const getUsage = (ctx: AccountCtx = {}, range: { from?: string; to?: string } = {}) => request<UsageReport>(ctx, "GET", `/v1/usage${query({ ...range, format: "json" })}`);

export const getUsageCsv = (ctx: AccountCtx = {}, range: { from?: string; to?: string } = {}) => request<string>(ctx, "GET", `/v1/usage${query({ ...range, format: "csv" })}`, { text: true });

export const getPricing = (ctx: AccountCtx = {}) => request<Pricing>(ctx, "GET", "/v1/pricing", { auth: false });

export async function getDevices(ctx: AccountCtx = {}): Promise<Device[]> {
  return (await request<{ devices: Device[] }>(ctx, "GET", "/v1/devices")).devices;
}

export const revokeDevice = (ctx: AccountCtx, id: string) => request<void>(ctx, "DELETE", `/v1/devices/${encodeURIComponent(id)}`);

export async function logout(ctx: AccountCtx = {}): Promise<{ revoked: boolean }> {
  let revoked = true;
  try {
    await request<void>(ctx, "POST", "/v1/auth/logout");
  } catch {
    revoked = false;
  }
  removeCuvetteToken();
  planModels = undefined;
  return { revoked };
}

export async function checkoutUrl(body: { plan: string; interval: "month" | "year" } | { topup: true }, ctx: AccountCtx = {}): Promise<string> {
  if ("plan" in body) {
    if (!(PLAN_IDS as readonly string[]).includes(body.plan)) throw new AccountError(`Choose a plan: ${PLAN_IDS.join(", ")}.`);
    if (body.interval !== "month" && body.interval !== "year") throw new AccountError("Choose month or year.");
  }
  return (await request<{ url: string }>(ctx, "POST", "/v1/checkout", { body })).url;
}

export async function changePlan(plan: string, interval: "month" | "year", ctx: AccountCtx = {}): Promise<{ status: string; effective_at: string }> {
  if (!(PLAN_IDS as readonly string[]).includes(plan)) throw new AccountError(`Choose a plan: ${PLAN_IDS.join(", ")}.`);
  return request(ctx, "POST", "/v1/plan", { body: { plan, interval } });
}

export async function billingUrl(ctx: AccountCtx = {}): Promise<string> {
  return (await request<{ url: string }>(ctx, "POST", "/v1/billing/portal")).url;
}

export function accountLines(a: AccountInfo): string[] {
  const left = a.allowance_remaining_usd;
  return [
    `Account ${a.account_id}. Signed in with ${a.identities.map((i) => (i.email ? `${i.provider} (${i.email})` : i.provider)).join(", ") || "no identity"}.`,
    `Plan: ${PLAN_NAMES[a.plan] ?? a.plan}${a.interval ? `, billed each ${a.interval}` : ""}. Status: ${a.sub_status}.`,
    `Allowance: ${balanceText(left)} of ${balanceText(a.allowance_usd)} left.${a.resets_at ? ` It resets on ${resetText(a.resets_at)}.` : ""}`,
    `Top-up: ${balanceText(a.topup_remaining_usd)} left.`,
    `${analysesText(a.analyses_left_estimate)} (an analysis costs ${balanceText(a.mean_cost_per_analysis_usd)} on average).`,
  ];
}
