import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, rJson, type OpenAdapter } from "./independent.ts";

const rscript = await programOf("vegan");
const data = join(CATALOG, "vegan/data");
const community = join(data, "dune.csv");
const environment = join(data, "dune_env.csv");
const slow = 600_000;

const baseR = `
  setwd(${JSON.stringify(data)})
  comm <- as.matrix(read.csv("dune.csv", row.names = 1, check.names = FALSE))
  env <- read.csv("dune_env.csv", row.names = 1, stringsAsFactors = TRUE)
  bray <- function(m) { n <- nrow(m); d <- matrix(0, n, n); for (i in 1:n) for (j in 1:n) d[i, j] <- sum(abs(m[i, ] - m[j, ])) / sum(m[i, ] + m[j, ]); d }
  pseudo_f <- function(d, g) {
    n <- nrow(d); g <- factor(g)
    sst <- sum(d[upper.tri(d)]^2) / n
    ssw <- sum(sapply(levels(g), function(l) { k <- g == l; dd <- d[k, k, drop = FALSE]; sum(dd[upper.tri(dd)]^2) / sum(k) }))
    list(f = ((sst - ssw) / (nlevels(g) - 1)) / (ssw / (n - nlevels(g))), r2 = (sst - ssw) / sst)
  }
`;

describe.skipIf(!rscript)("vegan against hand computations in base R", () => {
  let vegan: OpenAdapter;
  beforeAll(async () => {
    vegan = await openAdapter("vegan");
  });
  afterAll(async () => {
    await vegan?.close();
  });

  // Anderson (2001) pseudo-F from the squared distances: SS_total = sum(d^2)/N, SS_within = sum over groups of sum(d^2)/n_g.
  test("PERMANOVA with Jaccard distance on presence data gives the pseudo-F of the hand computation", { timeout: slow }, async () => {
    const hand = await rJson<{ f: number; r2: number }>(rscript!, `${baseR}\n pseudo_f(as.matrix(dist((comm > 0) * 1, method = "binary")), env$Management)`);
    const out = await vegan.run("run_permanova", { community, environment, formula: "Management", distance: "jaccard", transform: "presence", permutations: 99, seed: 1 });
    expect(Math.abs(out.metrics!.f - hand.f)).toBeLessThan(0.001);
    expect(Math.abs(out.metrics!.r2 - hand.r2)).toBeLessThan(0.0005);
    expect(hand.f).toBeCloseTo(2.1738, 3);
  }, slow);

  // Own permutation test: shuffle the Management labels inside each Use block. The p value has a standard error of about 0.003.
  test("PERMANOVA with permutations inside blocks gives a p value that agrees with a hand permutation test", async () => {
    const hand = await rJson<{ f: number; p: number; p_free: number }>(
      rscript!,
      `${baseR}
      set.seed(42)
      d <- bray(comm); obs <- pseudo_f(d, env$Management)[["f"]]
      shuffle <- function(g, blk) { out <- g; for (b in levels(blk)) { k <- which(blk == b); out[k] <- g[k][sample.int(length(k))] }; out }
      pv <- function(stat) (sum(stat >= obs - 1e-12) + 1) / (length(stat) + 1)
      within <- replicate(4999, pseudo_f(d, shuffle(env$Management, env$Use))[["f"]])
      free <- replicate(4999, pseudo_f(d, sample(env$Management))[["f"]])
      list(f = obs, p = pv(within), p_free = pv(free))`,
    );
    const strata = await vegan.run("run_permanova", { community, environment, formula: "Management", distance: "bray", permutations: 999, seed: 1, strata: "Use" });
    expect(Math.abs(strata.metrics!.f - hand.f)).toBeLessThan(0.001);
    expect(Math.abs(strata.metrics!.p - hand.p)).toBeLessThan(0.01);
    const free = await vegan.run("run_permanova", { community, environment, formula: "Management", distance: "bray", permutations: 999, seed: 1 });
    expect(Math.abs(free.metrics!.p - hand.p_free)).toBeLessThan(0.006);
  }, slow);

  // Anderson (2006): principal coordinates of the Bray-Curtis matrix, then one-way ANOVA on the distances to the group centre.
  // Positive axes add to the squared distance and negative axes subtract from it. The spatial median uses the Weiszfeld iteration.
  const dispersion = `${baseR}
    d <- bray(comm); n <- nrow(d); g <- factor(env$Management)
    e <- eigen(-0.5 * (diag(n) - 1 / n) %*% d^2 %*% (diag(n) - 1 / n), symmetric = TRUE)
    keep <- abs(e$values) > 1e-9
    x <- sweep(e$vectors[, keep], 2, sqrt(abs(e$values[keep])), "*"); pos <- e$values[keep] > 0
    weiszfeld <- function(y) { m <- colMeans(y); for (i in 1:2000) { w <- 1 / pmax(sqrt(rowSums(sweep(y, 2, m)^2)), 1e-12); m2 <- colSums(y * w) / sum(w); if (max(abs(m2 - m)) < 1e-12) break; m <- m2 }; m2 }
    spread <- function(center) {
      z <- numeric(n)
      for (l in levels(g)) {
        k <- g == l
        cp <- center(x[k, pos, drop = FALSE]); cn <- if (any(!pos)) center(x[k, !pos, drop = FALSE]) else NULL
        dp <- rowSums(sweep(x[k, pos, drop = FALSE], 2, cp)^2)
        dn <- if (any(!pos)) rowSums(sweep(x[k, !pos, drop = FALSE], 2, cn)^2) else 0
        z[k] <- sqrt(pmax(dp - dn, 0))
      }
      anova(lm(z ~ g))[["F value"]][1]
    }
    list(centroid = spread(colMeans), median = spread(weiszfeld))`;

  test("the dispersion test to the centroid gives the F of the hand computation", { timeout: slow }, async () => {
    const hand = await rJson<{ centroid: number; median: number }>(rscript!, dispersion);
    const centroid = await vegan.run("test_dispersion", { community, environment, variable: "Management", distance: "bray", permutations: 99, seed: 1, type: "centroid" });
    expect(Math.abs(centroid.metrics!.f - hand.centroid)).toBeLessThan(0.001);
    expect(centroid.data?.center).toBe("centroid");
    const median = await vegan.run("test_dispersion", { community, environment, variable: "Management", distance: "bray", permutations: 99, seed: 1 });
    expect(Math.abs(median.metrics!.f - hand.median)).toBeLessThan(0.001);
    expect(median.metrics!.f).not.toBeCloseTo(centroid.metrics!.f, 1);
  });

  // RDA by least squares: project the centred Hellinger table on the centred model matrix. R2adj = 1 - (1 - R2)(n - 1)/(n - m - 1).
  test("the RDA of Hellinger data gives the variance fraction, adjusted R2 and F of a least-squares hand computation", { timeout: slow }, async () => {
    const hand = await rJson<{ con: number; adj: number; f: number }>(
      rscript!,
      `${baseR}
      y <- scale(sqrt(comm / rowSums(comm)), scale = FALSE)
      xc <- scale(model.matrix(~ Management + A1, env)[, -1], scale = FALSE)
      fit <- xc %*% solve(crossprod(xc), crossprod(xc, y))
      con <- sum(fit^2); tot <- sum(y^2); m <- qr(xc)$rank; n <- nrow(y); r2 <- con / tot
      list(con = r2, adj = 1 - (1 - r2) * (n - 1) / (n - m - 1), f = (con / m) / ((tot - con) / (n - m - 1)))`,
    );
    const out = await vegan.run("run_rda", { community, environment, formula: "Management + A1", transform: "hellinger", scale: false, permutations: 99, seed: 1 });
    expect(Math.abs(out.metrics!.constrained_fraction - hand.con)).toBeLessThan(0.0001);
    expect(Math.abs(out.metrics!.adj_r2 - hand.adj)).toBeLessThan(0.0001);
    expect(Math.abs(out.metrics!.global_f - hand.f)).toBeLessThan(0.001);
  });
});
