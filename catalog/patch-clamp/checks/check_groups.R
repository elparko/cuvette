d <- read.csv(file.path("..", "data", "jahncke_cells_events.csv"))
feat <- c("event_frequency_hz", "event_amplitude_pa", "event_rise_10_90_ms", "event_decay_tau_ms")
d$group <- factor(d$group, levels = c("Ctrl", "cKO"))
cat("Unit: cells. Welch t-test, cKO minus Ctrl\n")
p <- numeric(0)
for (f in feat) {
  t <- t.test(d[d$group == "cKO", f], d[d$group == "Ctrl", f], var.equal = FALSE)
  p <- c(p, t$p.value)
  m <- tapply(d[[f]], d$group, mean)
  sdv <- tapply(d[[f]], d$group, sd)
  n <- tapply(d[[f]], d$group, length)
  sp <- sqrt(((n[1] - 1) * sdv[1]^2 + (n[2] - 1) * sdv[2]^2) / (n[1] + n[2] - 2))
  cat(sprintf("%s: diff %.6f, t %.6f, df %.4f, p %.8f, CI %.6f to %.6f, Cohen d %.6f\n", f, unname(m[2] - m[1]), t$statistic, t$parameter, t$p.value, t$conf.int[1], t$conf.int[2], unname((m[2] - m[1]) / sp)))
}
cat("Benjamini-Hochberg over the 4 features:", sprintf("%.8f", p.adjust(p, "BH")), "\n")
cat("\nMann-Whitney U, cells\n")
for (f in feat) {
  w <- wilcox.test(d[d$group == "cKO", f], d[d$group == "Ctrl", f], exact = FALSE, correct = TRUE)
  cat(sprintf("%s: W %.1f, p %.8f\n", f, w$statistic, w$p.value))
}
cat("\nUnit: animals (mean of the cells of each animal), Welch t-test\n")
a <- aggregate(d[feat], by = list(animal = d$animal, group = d$group), FUN = mean)
for (f in feat) {
  t <- t.test(a[a$group == "cKO", f], a[a$group == "Ctrl", f], var.equal = FALSE)
  cat(sprintf("%s: diff %.6f, t %.6f, df %.4f, p %.8f, CI %.6f to %.6f\n", f, mean(a[a$group == "cKO", f]) - mean(a[a$group == "Ctrl", f]), t$statistic, t$parameter, t$p.value, t$conf.int[1], t$conf.int[2]))
}
cat("\nICC over animals (one-way ANOVA estimator), all cells\n")
for (f in feat) {
  fit <- anova(lm(d[[f]] ~ factor(d$animal)))
  k <- nlevels(factor(d$animal)); N <- nrow(d)
  n0 <- (N - sum(table(d$animal)^2) / N) / (k - 1)
  msb <- fit[1, "Mean Sq"]; msw <- fit[2, "Mean Sq"]
  cat(sprintf("%s: ICC %.6f\n", f, (msb - msw) / (msb + (n0 - 1) * msw)))
}
