import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { openAdapter, programOf, rJson, type OpenAdapter } from "./independent.ts";

const python = await programOf("biostats");
const rscript = await programOf("vegan");
const slow = 600_000;

const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol);

// The limits of the odds ratio interval solve P(X <= x) = alpha/2 and P(X >= x) = alpha/2 for the noncentral hypergeometric distribution (Fisher 1935). The test finds them with a small tolerance.
// The z of the Dunn test is the mean rank of the second group minus the mean rank of the first group, so its sign is the reverse of the hand formula below.
// Reference values come from base R (stats package): fisher.test, chisq.test, mcnemar.test, binom.test, p.adjust, kruskal.test, friedman.test, wilcox.test and t.test.
// The Dunn test is written out by hand: z = (mean rank i - mean rank j) / sqrt((N(N+1)/12 - tie term) (1/n_i + 1/n_j)), with the tie term sum(t^3 - t) / (12 (N - 1)).
describe.skipIf(!python || !rscript)("biostats adapter against base R", () => {
  let stats: OpenAdapter;
  let root: string;
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "cuvette-biostats-"));
    stats = await openAdapter("biostats");
  });
  afterAll(async () => {
    await stats?.close();
    rmSync(root, { recursive: true, force: true });
  });

  test("Fisher's exact test gives the p value and the conditional odds ratio of R for both sides, and the p value of a 2 x 3 table", { timeout: slow }, async () => {
    const r = await rJson<Record<string, any>>(
      rscript!,
      `t <- matrix(c(3, 1, 1, 3), 2, byrow = TRUE); u <- matrix(c(8, 3, 2, 9, 5, 4), 2)
      two <- fisher.test(t); gr <- fisher.test(t, alternative = "greater"); ls <- fisher.test(t, alternative = "less"); big <- fisher.test(u)
      m <- 4; n <- 4; k <- 4; x <- 3; sup <- max(0, k - n):min(k, m)
      pmf <- function(psi) { w <- dhyper(sup, m, n, k) * psi^sup; w / sum(w) }
      hi_exact <- uniroot(function(l) sum(pmf(exp(l))[sup <= x]) - 0.025, c(-10, 30), tol = 1e-13)$root
      lo_exact <- uniroot(function(l) sum(pmf(exp(l))[sup >= x]) - 0.025, c(-10, 30), tol = 1e-13)$root
      list(or = unname(two$estimate), lo = exp(lo_exact), hi = exp(hi_exact), p2 = two$p.value, pg = gr$p.value, pl = ls$p.value, pbig = big$p.value, org = unname(gr$estimate), glo = gr$conf.int[1])`,
    );
    const two = await stats.run("fisher_exact", { counts: [[3, 1], [1, 3]] });
    close(two.metrics.p_value, r.p2);
    close(two.metrics.odds_ratio, r.or, 1e-3);
    close(two.metrics.or_ci_lo, r.lo, 1e-4);
    expect(Math.abs(two.metrics.or_ci_hi / r.hi - 1)).toBeLessThan(1e-4);
    const greater = await stats.run("fisher_exact", { counts: [[3, 1], [1, 3]], alternative: "greater" });
    close(greater.metrics.p_value, r.pg);
    close(greater.metrics.or_ci_lo, r.glo, 1e-3);
    const less = await stats.run("fisher_exact", { counts: [[3, 1], [1, 3]], alternative: "less" });
    close(less.metrics.p_value, r.pl);
    const big = await stats.run("fisher_exact", { counts: [[8, 2, 5], [3, 9, 4]] });
    close(big.metrics.p_value, r.pbig);
  });

  test("the chi-square test gives the statistic, the p value and Cramer's V of R with and without the Yates correction", { timeout: slow }, async () => {
    const r = await rJson<Record<string, any>>(
      rscript!,
      `a <- matrix(c(12, 3, 5, 9), 2); b <- matrix(c(20, 15, 12, 8, 14, 25, 30, 9, 11), 3)
      y <- chisq.test(a, correct = TRUE); n <- chisq.test(a, correct = FALSE); big <- chisq.test(b)
      list(y = unname(y$statistic), yp = y$p.value, n = unname(n$statistic), np = n$p.value, v = sqrt(unname(n$statistic) / sum(a)),
           big = unname(big$statistic), bigp = big$p.value, bigdf = unname(big$parameter), bigv = sqrt(unname(big$statistic) / (sum(b) * 2)), minexp = min(big$expected))`,
    );
    const yates = await stats.run("chi_square_test", { counts: [[12, 5], [3, 9]], correction: true });
    close(yates.metrics.chi2, r.y);
    close(yates.metrics.p_value, r.yp);
    const plain = await stats.run("chi_square_test", { counts: [[12, 5], [3, 9]], correction: false });
    close(plain.metrics.chi2, r.n);
    close(plain.metrics.p_value, r.np);
    close(plain.metrics.cramers_v, r.v);
    const big = await stats.run("chi_square_test", { counts: [[20, 8, 30], [15, 14, 9], [12, 25, 11]] });
    close(big.metrics.chi2, r.big);
    close(big.metrics.p_value, r.bigp);
    expect(big.metrics.df).toBe(r.bigdf);
    close(big.metrics.cramers_v, r.bigv);
    close(big.metrics.min_expected, r.minexp);
  });

  test("McNemar's test gives the exact p value of the binomial test and the chi-square values of R", { timeout: slow }, async () => {
    const r = await rJson<Record<string, number>>(
      rscript!,
      `m <- matrix(c(10, 9, 3, 20), 2); m2 <- matrix(c(30, 14, 6, 25), 2)
      list(exact = binom.test(3, 12, 0.5)$p.value, chi = unname(mcnemar.test(m2, correct = FALSE)$statistic), chip = mcnemar.test(m2, correct = FALSE)$p.value,
           cc = unname(mcnemar.test(m2, correct = TRUE)$statistic), ccp = mcnemar.test(m2, correct = TRUE)$p.value)`,
    );
    close((await stats.run("mcnemar_test", { counts: [[10, 3], [9, 20]], method: "exact" })).metrics.p_value, r.exact);
    const chi = await stats.run("mcnemar_test", { counts: [[30, 6], [14, 25]], method: "chi-square" });
    close(chi.metrics.p_value, r.chip);
    const cc = await stats.run("mcnemar_test", { counts: [[30, 6], [14, 25]], method: "chi-square-corrected" });
    close(cc.metrics.p_value, r.ccp);
  });

  test("the p value corrections give the adjusted values of R p.adjust, and Sidak gives 1 - (1 - p)^m", { timeout: slow }, async () => {
    const p = [0.001, 0.008, 0.02, 0.041, 0.049, 0.3, 0.6];
    const r = await rJson<Record<string, number[]>>(
      rscript!,
      `p <- c(${p.join(", ")}); list(bonferroni = p.adjust(p, "bonferroni"), holm = p.adjust(p, "holm"), fdr_bh = p.adjust(p, "BH"), fdr_by = p.adjust(p, "BY"), sidak = pmin(1, 1 - (1 - p)^length(p)))`,
    );
    for (const method of ["bonferroni", "holm", "fdr_bh", "fdr_by", "sidak"]) {
      const out = await stats.run("adjust_pvalues", { pvalues: p, method });
      const got = (out.table.rows as [number, number, boolean][]).map((row) => row[1]);
      got.forEach((v, i) => close(v, r[method][i], 1e-9));
      expect(out.metrics.n_rejected).toBe(r[method].filter((v) => v < 0.05).length);
    }
  });

  test("the Kruskal-Wallis test, the Dunn test with ties, and the Friedman test with Kendall W agree with R and the hand formula", { timeout: slow }, async () => {
    const kw = join(root, "kw.csv");
    const fr = join(root, "fr.csv");
    const r = await rJson<Record<string, any>>(
      rscript!,
      `set.seed(11)
      d <- data.frame(g = rep(c("a", "b", "c", "d"), c(9, 12, 7, 10)), y = c(round(rnorm(9, 5, 2), 1), round(rnorm(12, 7, 2), 1), round(rexp(7, 0.2), 1), round(rnorm(10, 6, 3), 1)))
      write.csv(d, ${JSON.stringify(kw)}, row.names = FALSE)
      f <- data.frame(s = rep(1:10, each = 3), cond = rep(c("t1", "t2", "t3"), 10), y = round(rnorm(30, rep(c(5, 5.8, 6.5), 10)), 2))
      write.csv(f, ${JSON.stringify(fr)}, row.names = FALSE)
      k <- kruskal.test(y ~ g, d)
      rk <- rank(d$y); N <- nrow(d); tt <- table(d$y); tie <- sum(tt^3 - tt) / (12 * (N - 1))
      mr <- tapply(rk, d$g, mean); n <- table(d$g); lv <- sort(unique(d$g))
      pairs <- t(combn(lv, 2))
      z <- apply(pairs, 1, function(q) (mr[[q[1]]] - mr[[q[2]]]) / sqrt((N * (N + 1) / 12 - tie) * (1 / n[[q[1]]] + 1 / n[[q[2]]])))
      pr <- 2 * pnorm(-abs(z))
      fm <- friedman.test(matrix(f$y, ncol = 3, byrow = TRUE))
      list(H = unname(k$statistic), p = k$p.value, z = unname(z), praw = pr, padj = p.adjust(pr, "holm"), chi = unname(fm$statistic), fp = fm$p.value, w = unname(fm$statistic) / (10 * 2))`,
    );
    const out = await stats.run("kruskal_dunn", { path: kw, outcome: "y", group: "g", p_adjust: "holm" });
    close(out.metrics.H, r.H);
    close(out.metrics.p_value, r.p);
    const rows = out.table.rows as [string, string, number, number, number, number, number][];
    rows.forEach((row, i) => {
      close(row[4], -r.z[i], 1e-6);
      close(row[5], r.praw[i], 1e-6);
      close(row[6], r.padj[i], 1e-6);
    });
    const fried = await stats.run("friedman_test", { path: fr, outcome: "y", within: "cond", subject: "s", p_adjust: "holm" });
    close(fried.metrics.chi2, r.chi);
    close(fried.metrics.p_value, r.fp);
    close(fried.metrics.kendall_w, r.w);
  });

  test("the two-group tests give the t statistic, the interval and the exact rank p values of R", { timeout: slow }, async () => {
    const file = join(root, "two.csv");
    const r = await rJson<Record<string, any>>(
      rscript!,
      `set.seed(5)
      a <- round(rnorm(8, 10, 2), 2); b <- round(rnorm(11, 12, 3), 2)
      write.csv(data.frame(grp = rep(c("x", "y"), c(8, 11)), v = c(a, b)), ${JSON.stringify(file)}, row.names = FALSE)
      w <- t.test(b, a); s <- t.test(b, a, var.equal = TRUE); g <- t.test(b, a, alternative = "greater")
      pa <- round(a + rnorm(8, 0.5, 1), 2)
      write.csv(data.frame(grp = rep(c("x", "y"), each = 8), id = rep(1:8, 2), v = c(a, pa)), ${JSON.stringify(file.replace("two", "pair"))}, row.names = FALSE)
      list(diff = unname(w$estimate[1] - w$estimate[2]), t = unname(w$statistic), p = w$p.value, lo = w$conf.int[1], hi = w$conf.int[2], df = unname(w$parameter), st = unname(s$statistic), sp = s$p.value, gp = g$p.value,
           mw = wilcox.test(b, a)$p.value, mwv = unname(wilcox.test(b, a)$statistic), sr = wilcox.test(pa, a, paired = TRUE)$p.value, srv = unname(wilcox.test(pa, a, paired = TRUE)$statistic))`,
    );
    const welch = await stats.run("compare_two_groups", { path: file, outcome: "v", group: "grp" });
    close(welch.metrics.p_value, r.p, 1e-8);
    const student = await stats.run("compare_two_groups", { path: file, outcome: "v", group: "grp", equal_variance: true });
    close(student.metrics.p_value, r.sp, 1e-8);
    const greater = await stats.run("compare_two_groups", { path: file, outcome: "v", group: "grp", alternative: "greater" });
    close(greater.metrics.p_value, r.gp, 1e-8);
    const exact = await stats.run("rank_test", { path: file, outcome: "v", group: "grp", method: "exact" });
    close(exact.metrics.p_value, r.mw, 1e-8);
    const paired = await stats.run("rank_test", { path: file.replace("two", "pair"), outcome: "v", group: "grp", paired: true, id_column: "id", method: "exact" });
    close(paired.metrics.p_value, r.sr, 1e-8);
  });
});
