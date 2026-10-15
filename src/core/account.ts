import { cuvetteToken, cuvetteUrl, saveCuvetteToken } from "./credentials.ts";

export const AMOUNTS = [10, 25, 50] as const;

export const CUVETTE_NOTICE =
  "Cuvette uses Claude from Anthropic to run your analysis. Your requests go through the Cuvette server to Anthropic. The Cuvette server does not keep the data.";

export const NO_TOKEN = "No Cuvette account yet. Run `cuvette account create`, or open Settings and choose Pay Cuvette for inference.";
export const CREDIT_USED_UP = "Your Cuvette credit is used up. Run `cuvette account buy`, or open Settings and buy credit.";
export const TOKEN_REFUSED = "Your Cuvette account token is not valid. Run `cuvette account status`.";
export const TOO_MANY = "Cuvette is busy with other requests from your account. Wait a moment and retry.";

export class AccountError extends Error {}

export interface AccountCtx {
  env?: Record<string, string | undefined>;
  fetch?: typeof fetch;
}

export interface AccountStatus {
  accountId: string;
  balanceUsd: number;
}

async function request<T>(ctx: AccountCtx, method: "GET" | "POST", path: string, opts: { auth?: boolean; body?: unknown } = {}): Promise<T> {
  const env = ctx.env ?? process.env;
  const headers: Record<string, string> = {};
  if (opts.auth !== false) {
    const t = cuvetteToken(env).token;
    if (!t) throw new AccountError(NO_TOKEN);
    headers.authorization = `Bearer ${t}`;
  }
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  let res: Response;
  try {
    res = await (ctx.fetch ?? fetch)(`${cuvetteUrl(env)}${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  } catch {
    throw new AccountError("Cannot reach the Cuvette server. Check the network.");
  }
  if (res.status === 401) throw new AccountError(TOKEN_REFUSED);
  if (res.status === 402) throw new AccountError(CREDIT_USED_UP);
  if (res.status === 429) throw new AccountError(TOO_MANY);
  if (!res.ok) throw new AccountError(`The Cuvette server returned HTTP ${res.status}.`);
  return (await res.json()) as T;
}

export async function createAccount(ctx: AccountCtx = {}): Promise<{ accountId: string; path: string }> {
  const r = await request<{ account_id: string; token: string }>(ctx, "POST", "/v1/accounts", { auth: false });
  return { accountId: r.account_id, path: saveCuvetteToken(r.token) };
}

export async function accountStatus(ctx: AccountCtx = {}): Promise<AccountStatus> {
  const r = await request<{ account_id: string; balance_usd: number }>(ctx, "GET", "/v1/account");
  return { accountId: r.account_id, balanceUsd: Number(r.balance_usd) };
}

export async function checkoutUrl(amount: number, ctx: AccountCtx = {}): Promise<string> {
  if (!(AMOUNTS as readonly number[]).includes(amount)) throw new AccountError(`Choose ${AMOUNTS.join(", ")} US dollars.`);
  return (await request<{ url: string }>(ctx, "POST", "/v1/checkout", { body: { amount_usd: amount } })).url;
}

export const balanceText = (usd: number): string => `$${usd.toFixed(2)}`;
