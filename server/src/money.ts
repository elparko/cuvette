import type { Env } from "./env.ts";
import { allModels, loadPlans, fiveHourLimit, modelsOf, type PlanConfig, type PlansConfig } from "./plans.ts";
import type { Tokens } from "./pricing.ts";
import { addMonths, fail, iso, round6 } from "./util.ts";

export const MAX_LIVE_HOLDS = 4;
export const LIVE_HOLD_MS = 15 * 60_000;
export const FIVE_HOURS_MS = 5 * 3_600_000;
export const COUNTING_STATUSES = ["active", "trialing", "past_due"];
const SERVING = "('active', 'trialing', 'past_due')";

export interface Account {
  id: string;
  created_at: string;
  plan: string;
  plan_interval: string | null;
  sub_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  allowance_remaining_usd: number;
  allowance_granted_usd: number;
  allowance_resets_at: number | null;
  period_end: number | null;
  suspended: number;
}

export async function loadAccount(env: Env, id: string): Promise<Account | undefined> {
  return (await env.DB.prepare("SELECT * FROM accounts WHERE id = ?1").bind(id).first<Account>()) ?? undefined;
}

export function allowanceCounts(a: Account, now: number): boolean {
  return COUNTING_STATUSES.includes(a.sub_status) && a.allowance_resets_at !== null && a.allowance_resets_at > now;
}

export async function topupBalance(env: Env, accountId: string, now: number): Promise<number> {
  const row = await env.DB.prepare("SELECT COALESCE(SUM(remaining_usd), 0) AS total FROM topups WHERE account_id = ?1 AND expires_at > ?2 AND remaining_usd > 0").bind(accountId, now).first<{ total: number }>();
  return row?.total ?? 0;
}

export async function holdTotal(env: Env, accountId: string, now: number): Promise<{ n: number; total: number }> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(amount_usd), 0) AS total FROM holds WHERE account_id = ?1 AND started_at > ?2").bind(accountId, now - LIVE_HOLD_MS).first<{ n: number; total: number }>();
  return row ?? { n: 0, total: 0 };
}

export function planOf(cfg: PlansConfig, a: Account): PlanConfig | undefined {
  return cfg.plans.get(a.plan);
}

export async function allowedModels(env: Env, cfg: PlansConfig, a: Account, now: number): Promise<string[]> {
  const plan = planOf(cfg, a);
  if (plan) return modelsOf(env, plan);
  return (await topupBalance(env, a.id, now)) > 0 ? allModels(env) : [];
}

interface HeldRow {
  request_id: string;
  account_id: string;
  amount_usd: number;
  started_at: number;
  model: string;
  session_id: string | null;
}

const STATEMENTS_PER_HOLD = 4;

function settleStatements(env: Env, hold: HeldRow, charge: number, status: string, model: string | null, t: Tokens, now: number): D1PreparedStatement[] {
  const live = hold.started_at > now - LIVE_HOLD_MS;
  const amount = live ? charge : hold.amount_usd;
  const effective = `CASE WHEN a.sub_status IN ${SERVING} AND a.allowance_resets_at > ?2 THEN MAX(a.allowance_remaining_usd, 0) ELSE 0 END`;
  const topups = "COALESCE((SELECT SUM(t.remaining_usd) FROM topups t WHERE t.account_id = a.id AND t.expires_at > ?2 AND t.remaining_usd > 0), 0)";
  const db = env.DB;
  const held = "EXISTS (SELECT 1 FROM holds WHERE request_id = ?1)";
  return [
    db
      .prepare(
        `INSERT INTO usage (request_id, account_id, session_id, model, status, input_tokens, output_tokens, cache_read_tokens, cache_write_5m_tokens, cache_write_1h_tokens, cost_usd, topup_cost_usd, at)
         SELECT ?1, a.id, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, MIN(MAX(0, ?11 - ${effective}), ${topups}), ?12
         FROM accounts a WHERE a.id = ?13 AND ${held}`,
      )
      .bind(hold.request_id, now, hold.session_id, model ?? hold.model, live ? status : "expired", t.input, t.output, t.cacheRead, t.cacheWrite5m, t.cacheWrite1h, amount, new Date(now).toISOString(), hold.account_id),
    db
      .prepare(
        `WITH spent AS (SELECT account_id, topup_cost_usd AS need FROM usage WHERE request_id = ?1),
         live AS (
           SELECT t.id, COALESCE(SUM(t.remaining_usd) OVER (ORDER BY t.expires_at, t.id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS prior
           FROM topups t WHERE t.account_id = (SELECT account_id FROM spent) AND t.expires_at > ?2 AND t.remaining_usd > 0
         )
         UPDATE topups SET remaining_usd = MAX(0, remaining_usd - MIN(remaining_usd, MAX(0, (SELECT need FROM spent) - (SELECT prior FROM live WHERE live.id = topups.id))))
         WHERE id IN (SELECT id FROM live) AND (SELECT need FROM spent) > 0 AND ${held}`,
      )
      .bind(hold.request_id, now),
    db
      .prepare(`UPDATE accounts SET allowance_remaining_usd = allowance_remaining_usd - (SELECT cost_usd - topup_cost_usd FROM usage WHERE request_id = ?1) WHERE id = (SELECT account_id FROM usage WHERE request_id = ?1) AND ${held}`)
      .bind(hold.request_id),
    db.prepare("DELETE FROM holds WHERE request_id = ?1").bind(hold.request_id),
  ];
}

export const NO_TOKENS: Tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 };

export async function settle(env: Env, requestId: string, charge: number, model: string | null, status: string, t: Tokens): Promise<void> {
  const hold = await env.DB.prepare("SELECT * FROM holds WHERE request_id = ?1").bind(requestId).first<HeldRow>();
  if (hold) await env.DB.batch(settleStatements(env, hold, charge, status, model, t, Date.now()));
}

export async function expireHolds(env: Env, accountId: string, now: number): Promise<boolean> {
  const { results } = await env.DB.prepare("SELECT * FROM holds WHERE account_id = ?1 AND started_at <= ?2").bind(accountId, now - LIVE_HOLD_MS).all<HeldRow>();
  if (!results.length) return false;
  const done = await env.DB.batch(results.flatMap((h) => settleStatements(env, h, 0, "expired", null, NO_TOKENS, now)));
  return done.some((r, i) => i % STATEMENTS_PER_HOLD === STATEMENTS_PER_HOLD - 1 && r.meta.changes > 0);
}

export async function lazyReset(env: Env, cfg: PlansConfig, a: Account, now: number): Promise<boolean> {
  const plan = planOf(cfg, a);
  if (!plan || !["active", "trialing"].includes(a.sub_status)) return false;
  if (a.allowance_resets_at === null || a.period_end === null || a.allowance_resets_at > now || a.period_end <= now) return false;
  const anchorDay = new Date(a.period_end).getUTCDate();
  let next = a.allowance_resets_at;
  for (let i = 0; i < 36 && next <= now; i++) next = Math.min(addMonths(next, 1, anchorDay), a.period_end);
  if (next <= now) return false;
  const done = await env.DB.prepare("UPDATE accounts SET allowance_remaining_usd = ?1, allowance_granted_usd = ?1, allowance_resets_at = ?2 WHERE id = ?3 AND allowance_resets_at = ?4").bind(plan.allowanceUsd, next, a.id, a.allowance_resets_at).run();
  return done.meta.changes > 0;
}

export async function prepareAccount(env: Env, cfg: PlansConfig, a: Account, now = Date.now()): Promise<Account> {
  const expired = await expireHolds(env, a.id, now);
  const reset = await lazyReset(env, cfg, a, now);
  return expired || reset ? ((await loadAccount(env, a.id)) ?? a) : a;
}

export interface HoldRequest {
  requestId: string;
  amount: number;
  model: string;
  sessionId: string | null;
}

export async function reserve(env: Env, cfg: PlansConfig, a: Account, hold: HoldRequest, now = Date.now()): Promise<boolean> {
  const plan = planOf(cfg, a);
  const limit = fiveHourLimit(plan?.allowanceUsd ?? 0);
  const live = "h.account_id = a.id AND h.started_at > ?7";
  const result = await env.DB
    .prepare(
      `INSERT INTO holds (request_id, account_id, amount_usd, started_at, model, session_id)
       SELECT ?1, a.id, ?3, ?4, ?5, ?6 FROM accounts a
       WHERE a.id = ?2 AND a.suspended = 0
         AND (CASE WHEN a.sub_status IN ${SERVING} AND a.allowance_resets_at > ?4 THEN MAX(a.allowance_remaining_usd, 0) ELSE 0 END
              + COALESCE((SELECT SUM(t.remaining_usd) FROM topups t WHERE t.account_id = a.id AND t.expires_at > ?4 AND t.remaining_usd > 0), 0)
              - COALESCE((SELECT SUM(h.amount_usd) FROM holds h WHERE ${live}), 0)) >= ?3
         AND (SELECT COUNT(*) FROM holds h WHERE ${live}) < ?8
         AND COALESCE((SELECT SUM(u.cost_usd) FROM usage u WHERE u.account_id = a.id AND u.at > ?9), 0)
             + COALESCE((SELECT SUM(h.amount_usd) FROM holds h WHERE ${live}), 0) + ?3 <= ?10`,
    )
    .bind(hold.requestId, a.id, hold.amount, now, hold.model, hold.sessionId, now - LIVE_HOLD_MS, MAX_LIVE_HOLDS, new Date(now - FIVE_HOURS_MS).toISOString(), limit)
    .run();
  return result.meta.changes > 0;
}

export async function refusal(env: Env, cfg: PlansConfig, a: Account, amount: number, now = Date.now()): Promise<Response> {
  const fresh = (await loadAccount(env, a.id)) ?? a;
  if (fresh.suspended) return fail(403, "account_suspended", "A payment dispute suspended this account. Contact support.");
  const held = await holdTotal(env, a.id, now);
  const available = (allowanceCounts(fresh, now) ? Math.max(fresh.allowance_remaining_usd, 0) : 0) + (await topupBalance(env, a.id, now));
  if (held.n >= MAX_LIVE_HOLDS) return fail(429, "too_many_requests", "Too many requests are running for this account. Wait for one to finish.");
  if (available - held.total < amount) {
    return fail(402, "allowance_used_up", "You used all of the allowance and the top-ups. Wait for the reset or buy a top-up.", {}, { resets_at: planOf(cfg, fresh) ? iso(fresh.allowance_resets_at) : null });
  }
  const limit = fiveHourLimit(planOf(cfg, fresh)?.allowanceUsd ?? 0);
  if (amount > limit) return fail(400, "invalid_request_error", "This request can cost more than the five-hour limit of the plan. Lower max_tokens.");
  const since = new Date(now - FIVE_HOURS_MS).toISOString();
  const { results } = await env.DB.prepare("SELECT at, cost_usd FROM usage WHERE account_id = ?1 AND at > ?2 AND cost_usd > 0 ORDER BY at ASC").bind(a.id, since).all<{ at: string; cost_usd: number }>();
  const used = results.reduce((sum, r) => sum + r.cost_usd, 0);
  let excess = used + held.total + amount - limit;
  let retry = FIVE_HOURS_MS / 1000;
  for (const r of results) {
    excess -= r.cost_usd;
    if (excess <= 1e-12) {
      retry = (Date.parse(r.at) + FIVE_HOURS_MS - now) / 1000;
      break;
    }
  }
  const seconds = Math.max(1, Math.min(FIVE_HOURS_MS / 1000, Math.ceil(retry)));
  return fail(429, "rate_limited", "You reached the five-hour limit of the plan. Try again later.", { "retry-after": String(seconds) }, { retry_after: seconds });
}

export async function meanSessionCost(env: Env, accountId: string): Promise<{ mean: number; n: number }> {
  const row = await env.DB
    .prepare("SELECT AVG(c) AS mean, COUNT(*) AS n FROM (SELECT SUM(cost_usd) AS c FROM usage WHERE account_id = ?1 AND session_id IS NOT NULL AND status IN ('ok', 'cut', 'expired') GROUP BY session_id ORDER BY MAX(at) DESC LIMIT 20)")
    .bind(accountId)
    .first<{ mean: number | null; n: number }>();
  return { mean: row?.mean ?? 0, n: row?.n ?? 0 };
}

export const DEFAULT_ANALYSIS_COST_USD = 0.62;

export async function summary(env: Env, a: Account, now = Date.now()) {
  const cfg = loadPlans(env.PLANS);
  const plan = planOf(cfg, a);
  const counts = allowanceCounts(a, now);
  const remaining = counts ? Math.max(a.allowance_remaining_usd, 0) : 0;
  const topups = await topupBalance(env, a.id, now);
  const sessions = await meanSessionCost(env, a.id);
  const mean = sessions.n >= 3 && sessions.mean > 0 ? sessions.mean : DEFAULT_ANALYSIS_COST_USD;
  return {
    plan: plan ? plan.id : "none",
    interval: plan ? a.plan_interval : null,
    sub_status: a.sub_status,
    period_end: iso(a.period_end),
    allowance_usd: plan ? a.allowance_granted_usd : 0,
    allowance_remaining_usd: round6(remaining),
    topup_remaining_usd: round6(topups),
    analyses_left_estimate: Math.floor((remaining + topups) / mean),
    mean_cost_per_analysis_usd: round6(mean),
    resets_at: plan ? iso(a.allowance_resets_at) : null,
    models: await allowedModels(env, cfg, a, now),
  };
}
