library(survival)
d <- Sys.getenv("GA_DATA", "/Volumes/T7/guided-analysis/data")
g <- read.csv(file.path(d, "kasurinen2018-mmp14-gastric", "mmp14_gastric.csv"))
g$stage <- factor(g$stage)

hr <- function(fit, term, label = term) {
  s <- summary(fit)
  cat(sprintf("%-28s HR %.4f  CI %.4f to %.4f  p %.5f\n", label, s$conf.int[term, 1], s$conf.int[term, 3], s$conf.int[term, 4], s$coefficients[term, 5]))
}

cat("patients", nrow(g), "events", sum(g$dss_event), "\n")
lr <- survdiff(Surv(years, dss_event) ~ mmp14_high, data = g)
cat(sprintf("log-rank chi2 %.4f p %.5f\n", lr$chisq, pchisq(lr$chisq, 1, lower.tail = FALSE)))
km <- summary(survfit(Surv(years, dss_event) ~ mmp14_high, data = g), times = 5)
cat(sprintf("5-year survival low %.4f high %.4f\n", km$surv[1], km$surv[2]))

for (ties in c("efron", "breslow")) {
  cat("ties", ties, "\n")
  hr(coxph(Surv(years, dss_event) ~ mmp14_high, data = g, ties = ties), "mmp14_high")
  m <- coxph(Surv(years, dss_event) ~ age_ge67 + stage + diffuse + mmp14_high, data = g, ties = ties)
  for (t in c("age_ge67", "stage2", "stage3", "stage4", "diffuse", "mmp14_high")) hr(m, t)
  hr(coxph(Surv(years, dss_event) ~ mmp14_high, data = subset(g, lauren == 1), ties = ties), "mmp14_high", "mmp14_high intestinal")
  hr(coxph(Surv(years, dss_event) ~ mmp14_high, data = subset(g, lauren == 2), ties = ties), "mmp14_high", "mmp14_high diffuse")
}
