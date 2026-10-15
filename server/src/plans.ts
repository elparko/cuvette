import { loadUpstreams } from "./upstreams.ts";
import type { Env } from "./env.ts";

export type Interval = "month" | "year";

export interface PlanConfig {
  id: string;
  priceUsdMonth: number;
  priceUsdYear: number;
  allowanceUsd: number;
  models: string[] | "all";
  stripePrice: Record<Interval, string>;
}

export interface PlansConfig {
  plans: Map<string, PlanConfig>;
  topup: { priceUsd: number; allowanceUsd: number; stripePrice: string };
  trial: { plan: string; days: number; allowanceUsd: number };
}

export const FIVE_HOUR_SHARE = 0.3;
export const FIVE_HOUR_FLOOR_USD = 3;
export const TOPUP_MONTHS = 12;

const bad = (why: string) => new Error(`PLANS: ${why}`);
const isObject = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);

function money(where: string, v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) throw bad(`${where} must be a number that is not negative.`);
  return v;
}

function text(where: string, v: unknown): string {
  if (typeof v !== "string" || !v) throw bad(`${where} must be a string that is not empty.`);
  return v;
}

export function loadPlans(raw: unknown): PlansConfig {
  if (raw === undefined || raw === null || raw === "") throw bad("the variable is not set.");
  let config: unknown = raw;
  if (typeof raw === "string") {
    try {
      config = JSON.parse(raw);
    } catch {
      throw bad("the value is not valid JSON.");
    }
  }
  if (!isObject(config) || !isObject(config.plans) || !isObject(config.topup) || !isObject(config.trial)) throw bad("the value needs the objects plans, topup and trial.");
  const plans = new Map<string, PlanConfig>();
  for (const [id, p] of Object.entries(config.plans)) {
    if (!/^[a-z][a-z0-9_]*$/.test(id) || id === "none") throw bad(`"${id}" is not a valid plan id.`);
    if (!isObject(p)) throw bad(`plan "${id}" must be an object.`);
    if (p.models !== "all" && !(Array.isArray(p.models) && p.models.length && p.models.every((m: unknown) => typeof m === "string"))) throw bad(`plan "${id}" models must be "all" or a list of model names.`);
    plans.set(id, {
      id,
      priceUsdMonth: money(`${id}.price_usd_month`, p.price_usd_month),
      priceUsdYear: money(`${id}.price_usd_year`, p.price_usd_year),
      allowanceUsd: money(`${id}.allowance_usd`, p.allowance_usd),
      models: p.models,
      stripePrice: { month: text(`${id}.stripe_price_month`, p.stripe_price_month), year: text(`${id}.stripe_price_year`, p.stripe_price_year) },
    });
  }
  if (!plans.size) throw bad("at least one plan is needed.");
  const trial = { plan: text("trial.plan", config.trial.plan), days: money("trial.days", config.trial.days), allowanceUsd: money("trial.allowance_usd", config.trial.allowance_usd) };
  if (!plans.has(trial.plan)) throw bad("trial.plan is not a plan id.");
  const topup = { priceUsd: money("topup.price_usd", config.topup.price_usd), allowanceUsd: money("topup.allowance_usd", config.topup.allowance_usd), stripePrice: text("topup.stripe_price", config.topup.stripe_price) };
  return { plans, topup, trial };
}

export function allModels(env: Env): string[] {
  return [...loadUpstreams(env.UPSTREAMS).keys()];
}

export function modelsOf(env: Env, plan: PlanConfig): string[] {
  return plan.models === "all" ? allModels(env) : plan.models;
}

export function priceMatch(cfg: PlansConfig, priceId: string): { plan: PlanConfig; interval: Interval } | undefined {
  for (const plan of cfg.plans.values()) {
    if (plan.stripePrice.month === priceId) return { plan, interval: "month" };
    if (plan.stripePrice.year === priceId) return { plan, interval: "year" };
  }
  return undefined;
}

export const fiveHourLimit = (allowanceUsd: number): number => Math.max(FIVE_HOUR_SHARE * allowanceUsd, FIVE_HOUR_FLOOR_USD);
