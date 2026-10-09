d <- Sys.getenv("GA_DATA", "/Volumes/T7/guided-analysis/data")
x <- read.csv(file.path(d, "lackey2015-tb-default", "tb_default.csv"), stringsAsFactors = FALSE)
cat("patients", nrow(x), "defaulted", sum(x$default), "\n\n")

cat("Bivariate Pearson chi-square (no continuity correction, as Stata tabulate, chi2):\n")
for (v in c("age_group", "sex", "marital_status", "poverty", "chronic_disease")) {
  t <- table(x[[v]], x$default)
  p0 <- suppressWarnings(chisq.test(t, correct = FALSE))
  p1 <- suppressWarnings(chisq.test(t))
  cat(sprintf("%-16s chi2 %.4f df %d p %.5f | with Yates p %.5f\n", v, p0$statistic, p0$parameter, p0$p.value, p1$p.value))
}

x$bmi <- relevel(factor(x$bmi), "Normal")
x$hiv_status <- relevel(factor(x$hiv_status), "Negative")
x$secondary_education <- relevel(factor(x$secondary_education), "Yes")
m <- glm(default ~ drug_use + bmi + mdr_tb + alcohol_weekly + hiv_status + secondary_education, family = binomial, data = x)
ci <- confint.default(m)
cat("\nMultivariable logistic regression, Wald 95% CI (as Stata logistic):\n")
print(round(cbind(OR = exp(coef(m)), lo = exp(ci[, 1]), hi = exp(ci[, 2]), p = coef(summary(m))[, 4]), 4))
cat("\nLikelihood-ratio test of each covariate:\n")
print(drop1(m, test = "LRT"))
s <- glm(default ~ sex, family = binomial, data = x)
cat(sprintf("\nBivariate OR male: %.4f (%.4f to %.4f)\n", exp(coef(s)[2]), exp(confint.default(s)[2, 1]), exp(confint.default(s)[2, 2])))
