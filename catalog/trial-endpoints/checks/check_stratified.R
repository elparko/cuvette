library(survival)
d <- read.csv(file.path(commandArgs(TRUE)[1], "shock_endpoints.csv"))
d <- d[!is.na(d$time_days), ]
d$erv <- as.integer(d$arm == "early_revascularization")
cx <- coxph(Surv(time_days, death) ~ erv + strata(age_lt75), data = d)
s <- summary(cx)
cat(sprintf("stratified hazard ratio %.6f CI %.6f %.6f Wald p %.6f\n", s$conf.int[1, 1], s$conf.int[1, 3], s$conf.int[1, 4], s$coefficients[1, 5]))
lr <- survdiff(Surv(time_days, death) ~ erv + strata(age_lt75), data = d)
cat(sprintf("stratified log-rank chi-square %.6f p %.6f\n", lr$chisq, pchisq(lr$chisq, 1, lower.tail = FALSE)))
