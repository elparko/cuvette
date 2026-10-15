import type { Env } from "./env.ts";
import { summary, type Account } from "./money.ts";
import { loadPlans, modelsOf } from "./plans.ts";
import { loadUpstreams } from "./upstreams.ts";
import { fail, reply, round6, safeEqual } from "./util.ts";

const DAY_MS = 86_400_000;
const MAX_RANGE_MS = 90 * DAY_MS;
const COUNTED = "status IN ('ok', 'cut', 'expired')";

export async function accountInfo(env: Env, account: Account): Promise<Response> {
  const identities = await env.DB.prepare("SELECT provider, email FROM identities WHERE account_id = ?1 ORDER BY provider, subject").bind(account.id).all<{ provider: string; email: string | null }>();
  return reply(200, { account_id: account.id, identities: identities.results, ...(await summary(env, account)) });
}

function range(q: URLSearchParams): { from: number; to: number } | string {
  const to = q.has("to") ? Date.parse(q.get("to")!) : Date.now();
  const from = q.has("from") ? Date.parse(q.get("from")!) : to - 30 * DAY_MS;
  if (!Number.isFinite(from) || !Number.isFinite(to)) return "The fields from and to must be ISO dates.";
  if (from >= to) return "The field from must be before the field to.";
  if (to - from > MAX_RANGE_MS) return "The range must be 90 days or less.";
  return { from, to };
}

interface UsageRow {
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

const csvCell = (v: unknown): string => {
  const text = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export async function usageReport(req: Request, env: Env, account: Account): Promise<Response> {
  const q = new URL(req.url).searchParams;
  const format = q.get("format") ?? "json";
  if (format !== "json" && format !== "csv") return fail(400, "invalid_request_error", "The format must be json or csv.");
  const r = range(q);
  if (typeof r === "string") return fail(400, "invalid_request_error", r);
  const from = new Date(r.from).toISOString();
  const to = new Date(r.to).toISOString();
  const rows = (
    await env.DB
      .prepare(
        `SELECT at, session_id, model, input_tokens, output_tokens, cache_write_5m_tokens + cache_write_1h_tokens AS cache_write_tokens, cache_read_tokens, cost_usd,
         CASE WHEN topup_cost_usd > 0 THEN 'topup' ELSE 'allowance' END AS paid_from
         FROM usage WHERE account_id = ?1 AND at >= ?2 AND at < ?3 AND ${COUNTED} ORDER BY at, id`,
      )
      .bind(account.id, from, to)
      .all<UsageRow>()
  ).results;
  if (format === "csv") {
    const head = ["at", "session_id", "model", "input_tokens", "output_tokens", "cache_write_tokens", "cache_read_tokens", "cost_usd", "paid_from"] as const;
    const body = [head.join(","), ...rows.map((row) => head.map((k) => csvCell(row[k])).join(","))].join("\r\n") + "\r\n";
    return new Response(body, { status: 200, headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="cuvette-usage.csv"' } });
  }
  const sessions = (
    await env.DB
      .prepare(`SELECT session_id, MIN(at) AS started_at, COUNT(*) AS requests, SUM(cost_usd) AS cost_usd FROM usage WHERE account_id = ?1 AND at >= ?2 AND at < ?3 AND ${COUNTED} AND session_id IS NOT NULL GROUP BY session_id ORDER BY started_at`)
      .bind(account.id, from, to)
      .all<{ session_id: string; started_at: string; requests: number; cost_usd: number }>()
  ).results;
  return reply(200, { rows, sessions: sessions.map((s) => ({ ...s, cost_usd: round6(s.cost_usd) })) });
}

export function pricing(env: Env): Response {
  const cfg = loadPlans(env.PLANS);
  const table = loadUpstreams(env.UPSTREAMS);
  const prices: Record<string, unknown> = {};
  for (const [name, up] of table) prices[name] = { input: up.price.input, output: up.price.output, cache_write_5m: up.price.cacheWrite5m, cache_write_1h: up.price.cacheWrite1h, cache_read: up.price.cacheRead };
  return reply(
    200,
    {
      plans: [...cfg.plans.values()].map((p) => ({ id: p.id, price_usd_month: p.priceUsdMonth, price_usd_year: p.priceUsdYear, allowance_usd: p.allowanceUsd, models: modelsOf(env, p) })),
      topup: { price_usd: cfg.topup.priceUsd, allowance_usd: cfg.topup.allowanceUsd },
      model_prices_per_million: prices,
      records: ["token counts", "model", "time", "session id"],
      never_stored: ["prompts", "images", "results"],
    },
    { "cache-control": "public, max-age=300" },
  );
}

export async function adminCosts(req: Request, env: Env): Promise<Response> {
  const given = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!env.ADMIN_SECRET || !given || !(await safeEqual(given, env.ADMIN_SECRET))) return fail(401, "authentication_error", "The admin secret is missing or not valid.");
  const since = new Date(Date.now() - 30 * DAY_MS).toISOString();
  const { results } = await env.DB
    .prepare(
      `SELECT a.plan AS plan, COUNT(*) AS sessions, AVG(s.cost) AS mean_cost, COUNT(DISTINCT s.account_id) AS accounts
       FROM (SELECT account_id, session_id, SUM(cost_usd) AS cost FROM usage WHERE at >= ?1 AND session_id IS NOT NULL AND ${COUNTED} GROUP BY account_id, session_id) s
       JOIN accounts a ON a.id = s.account_id GROUP BY a.plan ORDER BY a.plan`,
    )
    .bind(since)
    .all<{ plan: string; sessions: number; mean_cost: number; accounts: number }>();
  const total = results.reduce((n, r) => n + r.sessions, 0);
  const sum = results.reduce((n, r) => n + r.sessions * r.mean_cost, 0);
  return reply(200, {
    since,
    sessions: total,
    mean_cost_per_session_usd: total ? round6(sum / total) : 0,
    plans: results.map((r) => ({ plan: r.plan, accounts: r.accounts, sessions: r.sessions, mean_cost_per_session_usd: round6(r.mean_cost) })),
  });
}
