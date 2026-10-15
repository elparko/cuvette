import { describe, expect, it } from "vitest";
import { FIVE_HOUR_FLOOR_USD, fiveHourLimit, loadPlans, modelsOf, priceMatch } from "../src/plans.ts";
import { TEST_PLANS, makeEnv } from "./helpers.ts";

const copy = () => JSON.parse(JSON.stringify(TEST_PLANS));

describe("loadPlans", () => {
  it("reads a JSON string and an object", () => {
    expect(loadPlans(JSON.stringify(TEST_PLANS)).plans.size).toBe(4);
    expect(loadPlans(TEST_PLANS).plans.get("lab")).toMatchObject({ id: "lab", allowanceUsd: 46, priceUsdMonth: 60, priceUsdYear: 600, stripePrice: { month: "price_lab_m", year: "price_lab_y" } });
  });

  it("reads the topup and the trial", () => {
    const cfg = loadPlans(TEST_PLANS);
    expect(cfg.topup).toEqual({ priceUsd: 10, allowanceUsd: 8, stripePrice: "price_topup" });
    expect(cfg.trial).toEqual({ plan: "standard", days: 7, allowanceUsd: 2 });
  });

  for (const raw of [undefined, null, "", "{nope", "[]", "5", "{}"]) {
    it(`throws for ${JSON.stringify(raw)}`, () => {
      expect(() => loadPlans(raw)).toThrow(/PLANS/);
    });
  }

  const breaks: [string, (c: any) => void][] = [
    ["no plans", (c) => (c.plans = {})],
    ["a plan id with capitals", (c) => (c.plans.Basic = c.plans.basic)],
    ["a plan id none", (c) => (c.plans.none = c.plans.basic)],
    ["a plan that is not an object", (c) => (c.plans.basic = 5)],
    ["a negative allowance", (c) => (c.plans.basic.allowance_usd = -1)],
    ["an allowance that is text", (c) => (c.plans.basic.allowance_usd = "7")],
    ["no monthly price id", (c) => delete c.plans.basic.stripe_price_month],
    ["an empty yearly price id", (c) => (c.plans.basic.stripe_price_year = "")],
    ["models that are text other than all", (c) => (c.plans.basic.models = "some")],
    ["models that are an empty list", (c) => (c.plans.basic.models = [])],
    ["models with a number", (c) => (c.plans.basic.models = [5])],
    ["a trial plan that does not exist", (c) => (c.trial.plan = "gold")],
    ["no trial", (c) => delete c.trial],
    ["no top-up price id", (c) => delete c.topup.stripe_price],
    ["no top-up", (c) => delete c.topup],
  ];
  for (const [name, change] of breaks) {
    it(`throws for ${name}`, () => {
      const c = copy();
      change(c);
      expect(() => loadPlans(c)).toThrow(/PLANS/);
    });
  }
});

describe("models of a plan", () => {
  it("returns the list of a plan and every public model for all", () => {
    const env = makeEnv();
    const cfg = loadPlans(env.PLANS);
    expect(modelsOf(env, cfg.plans.get("basic")!)).toEqual(["claude-sonnet-5-5", "claude-haiku-5-5"]);
    expect(modelsOf(env, cfg.plans.get("lab")!)).toEqual(["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-1"]);
  });
});

describe("price match", () => {
  it("finds the plan and the interval of a price id", () => {
    const cfg = loadPlans(TEST_PLANS);
    expect(priceMatch(cfg, "price_lab_y")).toMatchObject({ plan: { id: "lab" }, interval: "year" });
    expect(priceMatch(cfg, "price_basic_m")).toMatchObject({ plan: { id: "basic" }, interval: "month" });
    expect(priceMatch(cfg, "price_topup")).toBeUndefined();
    expect(priceMatch(cfg, "")).toBeUndefined();
  });
});

describe("five-hour limit", () => {
  it("is 30 percent of the allowance and never below 3 dollars", () => {
    expect(FIVE_HOUR_FLOOR_USD).toBe(3);
    expect(fiveHourLimit(7)).toBe(3);
    expect(fiveHourLimit(10)).toBe(3);
    expect(fiveHourLimit(15)).toBeCloseTo(4.5, 12);
    expect(fiveHourLimit(46)).toBeCloseTo(13.8, 12);
    expect(fiveHourLimit(118)).toBeCloseTo(35.4, 12);
    expect(fiveHourLimit(0)).toBe(3);
  });
});
