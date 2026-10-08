suppressMessages(library(lme4))
d <- Sys.getenv("GA_DATA", "/Volumes/T7/guided-analysis/data")
x <- read.csv(file.path(d, "andreasson2019-endotoxin-health", "endotoxin_exp2.csv"))
cur <- subset(x, !is.na(current))
cat("rows", nrow(cur), "subjects", length(unique(cur$id)), "\n")
for (reml in c(FALSE, TRUE)) {
  m <- lmer(current ~ factor(lps) * factor(time) + (1 | id), data = cur, REML = reml)
  cat(if (reml) "REML" else "ML", "\n")
  print(round(cbind(coef = fixef(m), se = sqrt(diag(as.matrix(vcov(m))))), 5))
}
o <- lm(current ~ factor(lps) * factor(time), data = cur)
cat("OLS, rows as independent (wrong method)\n")
print(round(coef(summary(o))[, 1:2], 5))

g <- subset(x, time == 2 & !is.na(general))
cat("general health at 90 minutes: placebo", sum(g$lps == 0), "LPS", sum(g$lps == 1), "\n")
mw <- function(...) suppressWarnings(wilcox.test(general ~ lps, data = g, ...)$p.value)
cat(sprintf("Mann-Whitney p: normal with continuity correction %.5f (SciPy default), normal without correction %.5f (Stata ranksum), exact with ties %.5f (R default)\n",
            mw(exact = FALSE, correct = TRUE), mw(exact = FALSE, correct = FALSE), mw()))
cat(sprintf("Welch t-test p (wrong method for an ordinal scale) %.5f\n", t.test(general ~ lps, data = g)$p.value))
cat("lme4", as.character(packageVersion("lme4")), "\n")
