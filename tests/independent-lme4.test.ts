import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, rJson, type OpenAdapter } from "./independent.ts";

const rscript = await programOf("lme4");
const data = join(CATALOG, "lme4/data/sleepstudy.csv");
const slow = 600_000;

const fits = `
  d <- read.csv(${JSON.stringify(data)}); d$Subject <- factor(d$Subject)
  suppressMessages(library(nlme))
  fit <- function(fixed, random, method) lme(fixed, random = random, data = d, method = method, control = lmeControl(opt = "optim", msMaxIter = 500))
  ll <- function(f) as.numeric(logLik(f))
`;

describe.skipIf(!rscript || !(await rJson<boolean>(rscript, 'requireNamespace("nlme", quietly = TRUE)').catch(() => false)))("lme4 against nlme", () => {
  let lme4: OpenAdapter;
  beforeAll(async () => {
    lme4 = await openAdapter("lme4");
  });
  afterAll(async () => {
    await lme4?.close();
  });

  test("the mixed model lists the p value of each fixed effect except the intercept", { timeout: slow }, async () => {
    const fit = await lme4.run("fit_mixed_model", { data, formula: "Reaction ~ Days + (Days | Subject)", reml: true });
    expect((fit.data as any).p_terms).toEqual(["p_Days"]);
  });

  // nlme (a package that ships with R) fits the same model with its own code. Pinheiro and Bates (2000) describe the method.
  test("the ML fit and the likelihood ratio test of Days agree with nlme", { timeout: slow }, async () => {
    const hand = await rJson<{ ll: number; ll0: number }>(rscript!, `${fits}\n list(ll = ll(fit(Reaction ~ Days, ~ Days | Subject, "ML")), ll0 = ll(fit(Reaction ~ 1, ~ Days | Subject, "ML")))`);
    const ml = await lme4.run("fit_mixed_model", { data, formula: "Reaction ~ Days + (Days | Subject)", reml: false });
    expect(Math.abs(ml.metrics!.logLik - hand.ll)).toBeLessThan(0.01);
    expect(Math.abs(ml.metrics!.criterion + 2 * hand.ll)).toBeLessThan(0.02);
    const lrt = await lme4.run("compare_models", { data, formula: "Reaction ~ Days + (Days | Subject)", formula_reduced: "Reaction ~ 1 + (Days | Subject)", comparison_method: "ML" });
    const chisq = 2 * (hand.ll - hand.ll0);
    expect(Math.abs(lrt.metrics!.chisq - chisq)).toBeLessThan(0.01);
    expect(lrt.metrics!.df).toBe(1);
    const p = await rJson<number>(rscript!, `pchisq(${chisq}, 1, lower.tail = FALSE)`);
    expect(Math.abs(lrt.metrics!.p - p) / p).toBeLessThan(0.01);
  });

  test("the REML criterion and the fixed effect of the three random-effect structures agree with nlme", { timeout: slow }, async () => {
    const hand = await rJson<Record<string, { crit: number; days: number }>>(
      rscript!,
      `${fits}
      pick <- function(f) list(crit = -2 * ll(f), days = unname(fixef(f)["Days"]))
      list(slope = pick(fit(Reaction ~ Days, ~ Days | Subject, "REML")), uncorrelated = pick(fit(Reaction ~ Days, list(Subject = pdDiag(~ Days)), "REML")), intercept = pick(fit(Reaction ~ Days, ~ 1 | Subject, "REML")))`,
    );
    for (const [name, formula] of [["slope", "Reaction ~ Days + (Days | Subject)"], ["uncorrelated", "Reaction ~ Days + (1 | Subject) + (0 + Days | Subject)"], ["intercept", "Reaction ~ Days + (1 | Subject)"]] as const) {
      const out = await lme4.run("fit_mixed_model", { data, formula, reml: true });
      expect(Math.abs(out.metrics!.criterion - hand[name].crit), name).toBeLessThan(0.1);
      expect(Math.abs(out.metrics!.estimate_Days - hand[name].days), name).toBeLessThan(0.001);
    }
  });
});
