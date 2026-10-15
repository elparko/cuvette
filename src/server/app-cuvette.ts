import {
  AccountError,
  billingUrl,
  changePlan,
  checkoutUrl,
  CUVETTE_NOTICE,
  getAccount,
  getDevices,
  getPricing,
  getUsage,
  getUsageCsv,
  linkUrl,
  logout,
  revokeDevice,
  type AccountCtx,
} from "../core/account.ts";
import { cuvetteToken } from "../core/credentials.ts";
import { chooseCuvette, keepModelInPlan } from "../core/firststart.ts";
import { deviceName, makePkce, providerId, PROVIDERS, redeemCode, signInErrorText, signInPage, startUrl } from "../core/signin.ts";
import { openWithOs } from "../ui/commands.ts";

const PENDING_MS = 10 * 60_000;
const MAX_PENDING = 5;

export interface CuvetteApiOptions {
  env: Record<string, string | undefined>;
  fetch?: typeof fetch;
  port: () => number;
  cwd: () => string;
}

export interface ApiReply {
  status: number;
  body: unknown;
  type?: string;
  headers?: Record<string, string>;
}

const json = (body: unknown, status = 200): ApiReply => ({ status, body });

export function cuvetteApi(o: CuvetteApiOptions) {
  const pending = new Map<string, { verifier: string; at: number; use: boolean; link: boolean }>();
  let lastError = "";
  const ctx = (): AccountCtx => ({ env: o.env, fetch: o.fetch });
  const modelCtx = () => ({ cwd: o.cwd(), env: o.env, fetch: o.fetch });
  const range = (b: Record<string, unknown>) => ({ from: typeof b.from === "string" ? b.from : undefined, to: typeof b.to === "string" ? b.to : undefined });

  const state = async (): Promise<ApiReply> => {
    const base = { notice: CUVETTE_NOTICE, providers: PROVIDERS, waiting: pending.size > 0, error: lastError };
    if (cuvetteToken(o.env).from === "none") return json({ ...base, signedIn: false });
    try {
      const account = await getAccount(ctx());
      await keepModelInPlan(modelCtx(), account.models);
      return json({ ...base, signedIn: true, account });
    } catch (e) {
      if (e instanceof AccountError) return json({ ...base, signedIn: true, account: null, error: e.message });
      throw e;
    }
  };

  const signIn = async (b: Record<string, unknown>, link: boolean): Promise<ApiReply> => {
    const provider = providerId(b.provider);
    const now = Date.now();
    for (const [k, v] of pending) if (now - v.at > PENDING_MS) pending.delete(k);
    while (pending.size >= MAX_PENDING) pending.delete(pending.keys().next().value!);
    const pkce = makePkce();
    const port = o.port();
    const url = link ? await linkUrl({ provider, port: String(port), challenge: pkce.challenge, state: pkce.state }, ctx()) : startUrl(o.env, { provider, port, pkce });
    pending.set(pkce.state, { verifier: pkce.verifier, at: now, use: b.use === true, link });
    lastError = "";
    openWithOs(url);
    return json({ url });
  };

  const open = (url: string): ApiReply => {
    openWithOs(url);
    return json({ url });
  };

  return {
    async api(path: string, b: Record<string, unknown>, query: URLSearchParams): Promise<ApiReply | undefined> {
      try {
        switch (path) {
          case "/api/cuvette":
            return await state();
          case "/api/cuvette/signin":
            return await signIn(b, false);
          case "/api/cuvette/link":
            return await signIn(b, true);
          case "/api/cuvette/usage":
            return json(await getUsage(ctx(), range(b)));
          case "/api/cuvette/usage.csv": {
            const csv = await getUsageCsv(ctx(), range(Object.fromEntries(query)));
            return { status: 200, body: csv, type: "text/csv; charset=utf-8", headers: { "content-disposition": 'attachment; filename="cuvette-usage.csv"' } };
          }
          case "/api/cuvette/pricing":
            return json(await getPricing(ctx()));
          case "/api/cuvette/devices":
            return json({ devices: await getDevices(ctx()) });
          case "/api/cuvette/devices/remove":
            await revokeDevice(ctx(), String(b.id ?? ""));
            return json({ ok: true });
          case "/api/cuvette/checkout":
            return open(await checkoutUrl(b.topup === true ? { topup: true } : { plan: String(b.plan ?? ""), interval: b.interval === "year" ? "year" : "month" }, ctx()));
          case "/api/cuvette/plan":
            return json(await changePlan(String(b.plan ?? ""), b.interval === "year" ? "year" : "month", ctx()));
          case "/api/cuvette/portal":
            return open(await billingUrl(ctx()));
          case "/api/cuvette/logout":
            return json(await logout(ctx()));
          case "/api/firststart/cuvette": {
            const r = await chooseCuvette(modelCtx(), { onlyIfNoKey: false });
            return json(r.ok ? r : { error: r.text }, r.ok ? 200 : 400);
          }
          default:
            return undefined;
        }
      } catch (e) {
        if (e instanceof AccountError) return json({ error: e.message }, 400);
        throw e;
      }
    },

    async callback(query: URLSearchParams): Promise<ApiReply> {
      const html = (ok: boolean, status: number, problem?: string): ApiReply => ({ status, body: signInPage(ok, problem), type: "text/html; charset=utf-8" });
      const state = query.get("state") ?? "";
      const code = query.get("code") ?? "";
      const p = pending.get(state);
      pending.delete(state);
      if (!p || Date.now() - p.at > PENDING_MS) return html(false, 400);
      const problem = signInErrorText(query.get("error"));
      if (problem) {
        lastError = problem;
        return html(false, 400, problem);
      }
      if (!code) return html(false, 400);
      try {
        await redeemCode(ctx(), { code, verifier: p.verifier, device: deviceName("app") });
        if (p.link) await getAccount(ctx());
        else await chooseCuvette(modelCtx(), { onlyIfNoKey: !p.use });
        lastError = "";
        return html(true, 200);
      } catch (e) {
        lastError = e instanceof AccountError ? e.message : "The sign-in did not finish. Sign in again.";
        return html(false, 400);
      }
    },
  };
}
