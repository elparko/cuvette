args <- commandArgs(FALSE)
here <- dirname(sub("^--file=", "", args[grep("^--file=", args)]))
source(file.path(here, "lib.R"))

f3 <- function(x) formatC(x, format = "f", digits = 3)
f2 <- function(x) formatC(x, format = "f", digits = 2)

run_tool(function() {
  suppressMessages({ library(survival); library(survRM2) })
  p <- read_params()
  df <- read_data(p$data, "the patient table")
  time_col <- need_column(df, pick(p, "time_col", NULL), "time_col")
  event_col <- need_column(df, pick(p, "event_col", NULL), "event_col")
  arm_col <- need_column(df, pick(p, "arm_col", NULL), "arm_col")
  arm <- trimws(as.character(df[[arm_col]]))
  levs <- sort(unique(arm[!is.na(arm) & nzchar(arm)]))
  ga <- pick(p, "group_a", NULL); gb <- pick(p, "group_b", NULL)
  if (is.null(ga) || is.null(gb)) fail(sprintf("give group_a (the test arm) and group_b (the reference arm). arm_col '%s' has the values: %s", arm_col, paste(levs, collapse = ", ")))
  for (g in c(ga, gb)) if (!g %in% levs) fail(sprintf("group '%s' is not a value of arm_col '%s'. Values: %s", g, arm_col, paste(levs, collapse = ", ")))
  if (ga == gb) fail("group_a and group_b must differ")
  tm <- suppressWarnings(as.numeric(df[[time_col]]))
  ev_raw <- trimws(as.character(df[[event_col]])); ev_raw[ev_raw == ""] <- NA
  evv <- pick(p, "event_value", NULL)
  if (is.null(evv)) {
    vals <- sort(unique(ev_raw[!is.na(ev_raw)]))
    if (!all(vals %in% c("0", "1"))) fail(sprintf("event_col '%s' has the values %s. Give event_value, the value that marks an event", event_col, paste(vals, collapse = ", ")))
    evv <- "1"
  }
  evv <- as.character(evv)
  if (!evv %in% ev_raw) fail(sprintf("event_value '%s' is not a value of event_col '%s'. Values: %s", evv, event_col, paste(sort(unique(ev_raw[!is.na(ev_raw)])), collapse = ", ")))
  ev <- ifelse(is.na(ev_raw), NA, as.integer(ev_raw == evv))
  stratum <- NULL
  sc <- pick(p, "stratum_col", NULL)
  if (!is.null(sc) && tolower(sc) != "none") { sc <- need_column(df, sc, "stratum_col"); stratum <- trimws(as.character(df[[sc]])) }
  keep <- arm %in% c(ga, gb) & !is.na(tm) & !is.na(ev)
  if (!is.null(stratum)) keep <- keep & !is.na(stratum) & nzchar(stratum)
  n_in_arms <- sum(arm %in% c(ga, gb))
  n_dropped <- n_in_arms - sum(keep)
  if (any(tm[keep] < 0)) fail(sprintf("time_col '%s' has a negative time. Times must be 0 or more", time_col))
  d <- data.frame(time = tm[keep], event = ev[keep], a = as.integer(arm[keep] == ga), stringsAsFactors = FALSE)
  if (!is.null(stratum)) d$stratum <- stratum[keep]
  na <- sum(d$a == 1); nb <- sum(d$a == 0)
  if (na < 2 || nb < 2) fail(sprintf("an arm has fewer than 2 patients with a time and an event (n_a %d, n_b %d)", na, nb))
  ea <- sum(d$event[d$a == 1]); eb <- sum(d$event[d$a == 0])
  if (ea + eb == 0) fail("no patient has an event, so no hazard ratio exists")
  alpha <- as.numeric(pick(p, "alpha", 0.05))
  if (!is.finite(alpha) || alpha <= 0 || alpha >= 1) fail("alpha must be a number between 0 and 1 (a fraction), such as 0.05")
  z <- qnorm(1 - alpha / 2)
  ties <- pick(p, "cox_ties", "efron")
  if (!ties %in% c("efron", "breslow", "exact")) fail(sprintf("cox_ties must be efron, breslow or exact, not '%s'", ties))

  fml <- if (is.null(stratum)) Surv(time, event) ~ a else Surv(time, event) ~ a + strata(stratum)
  cx <- coxph(fml, data = d, ties = ties)
  sm <- summary(cx, conf.int = 1 - alpha)
  hr <- sm$conf.int[1, ]
  hr_p <- sm$coefficients[1, "Pr(>|z|)"]
  lr <- survdiff(if (is.null(stratum)) Surv(time, event) ~ a else Surv(time, event) ~ a + strata(stratum), data = d)
  lr_chi <- lr$chisq; lr_p <- pchisq(lr_chi, 1, lower.tail = FALSE)
  zph <- tryCatch(cox.zph(cx)$table["GLOBAL", "p"], error = function(e) NA_real_)

  m <- list(n_rows = nrow(d), n_dropped = n_dropped, n_a = na, n_b = nb, events_a = ea, events_b = eb, alpha = alpha,
            hr = unname(hr[1]), hr_ci_low = unname(hr[3]), hr_ci_high = unname(hr[4]), hr_p = unname(hr_p),
            logrank_chisq = lr_chi, logrank_p = lr_p, ph_test_p = unname(zph))
  lines <- c(sprintf("%s: %d patients, %d events. %s: %d patients, %d events.", ga, na, ea, gb, nb, eb),
    sprintf("Hazard ratio %s (%g%% CI %s to %s), Wald p = %s (Cox, ties %s%s). Log-rank chi-square %s, p = %s. Proportional hazards test (Schoenfeld, global) p = %s.",
      f3(hr[1]), 100 * (1 - alpha), f3(hr[3]), f3(hr[4]), formatC(hr_p, format = "g", digits = 4), ties, if (is.null(stratum)) "" else ", stratified", f3(lr_chi), formatC(lr_p, format = "g", digits = 4), if (is.na(zph)) "not available" else formatC(zph, format = "g", digits = 3)))
  rows <- list(data.frame(measure = "hazard ratio", estimate = hr[1], ci_low = hr[3], ci_high = hr[4], note = "Cox"))

  lm_time <- as.numeric(pick(p, "landmark_time", 0))
  if (is.finite(lm_time) && lm_time > 0) {
    fit <- survfit(Surv(time, event) ~ a, data = d)
    last <- c(max(d$time[d$a == 0]), max(d$time[d$a == 1]))
    if (lm_time > min(last)) fail(sprintf("landmark_time %g is later than the last time of an arm (group_b %g, group_a %g). Give an earlier time", lm_time, last[1], last[2]))
    s <- summary(fit, times = lm_time)
    sb <- s$surv[1]; sa <- s$surv[2]; seb <- s$std.err[1]; sea <- s$std.err[2]
    dif <- sa - sb; sed <- sqrt(sea^2 + seb^2)
    m$landmark_time <- lm_time
    m$surv_a <- sa; m$surv_b <- sb; m$surv_se_a <- sea; m$surv_se_b <- seb
    m$surv_diff <- dif; m$surv_diff_ci_low <- dif - z * sed; m$surv_diff_ci_high <- dif + z * sed
    m$event_prob_a <- 1 - sa; m$event_prob_b <- 1 - sb
    lines <- c(lines, sprintf("Kaplan-Meier survival at time %g: %s%% in %s and %s%% in %s (event probability %s%% and %s%%). Difference in survival %s points (%g%% CI %s to %s, Greenwood standard errors).",
      lm_time, f2(100 * sa), ga, f2(100 * sb), gb, f2(100 * (1 - sa)), f2(100 * (1 - sb)), f2(100 * dif), 100 * (1 - alpha), f2(100 * m$surv_diff_ci_low), f2(100 * m$surv_diff_ci_high)))
    rows[[length(rows) + 1]] <- data.frame(measure = sprintf("survival difference at %g", lm_time), estimate = dif, ci_low = m$surv_diff_ci_low, ci_high = m$surv_diff_ci_high, note = "Kaplan-Meier, Greenwood")
  }

  tau <- as.numeric(pick(p, "rmst_tau", 0))
  r <- NULL
  if (is.finite(tau) && tau > 0) {
    last <- c(max(d$time[d$a == 0]), max(d$time[d$a == 1]))
    if (tau > min(last)) fail(sprintf("rmst_tau %g is later than the last time of an arm (group_b %g, group_a %g). The restricted mean needs a tau at or before the smaller of the two last times", tau, last[1], last[2]))
    r <- rmst2(d$time, d$event, d$a, tau = tau, alpha = alpha)
    ua <- r$RMST.arm1$rmst; ub <- r$RMST.arm0$rmst
    u <- r$unadjusted.result
    m$rmst_tau <- tau
    m$rmst_a <- unname(ua["Est."]); m$rmst_se_a <- unname(ua["se"]); m$rmst_b <- unname(ub["Est."]); m$rmst_se_b <- unname(ub["se"])
    m$rmst_diff <- u[1, 1]; m$rmst_diff_ci_low <- u[1, 2]; m$rmst_diff_ci_high <- u[1, 3]; m$rmst_diff_p <- u[1, 4]
    m$rmst_ratio <- u[2, 1]; m$rmst_ratio_ci_low <- u[2, 2]; m$rmst_ratio_ci_high <- u[2, 3]
    m$rmtl_ratio <- u[3, 1]; m$rmtl_ratio_ci_low <- u[3, 2]; m$rmtl_ratio_ci_high <- u[3, 3]
    lines <- c(lines, sprintf("Restricted mean survival time up to tau = %g: %s in %s and %s in %s. Difference %s (%g%% CI %s to %s, p = %s). Ratio %s (%s to %s). Ratio of restricted mean time lost %s (%s to %s).",
      tau, f3(m$rmst_a), ga, f3(m$rmst_b), gb, f3(m$rmst_diff), 100 * (1 - alpha), f3(m$rmst_diff_ci_low), f3(m$rmst_diff_ci_high), formatC(m$rmst_diff_p, format = "g", digits = 4),
      f3(m$rmst_ratio), f3(m$rmst_ratio_ci_low), f3(m$rmst_ratio_ci_high), f3(m$rmtl_ratio), f3(m$rmtl_ratio_ci_low), f3(m$rmtl_ratio_ci_high)))
    if (!is.null(stratum)) lines <- c(lines, "The restricted mean survival time is not stratified.")
    rows[[length(rows) + 1]] <- data.frame(measure = sprintf("RMST difference to tau %g", tau), estimate = m$rmst_diff, ci_low = m$rmst_diff_ci_low, ci_high = m$rmst_diff_ci_high, note = "survRM2")
    rows[[length(rows) + 1]] <- data.frame(measure = sprintf("RMST ratio to tau %g", tau), estimate = m$rmst_ratio, ci_low = m$rmst_ratio_ci_low, ci_high = m$rmst_ratio_ci_high, note = "survRM2")
  }

  margin <- as.numeric(pick(p, "ni_margin", 0))
  if (is.finite(margin) && margin > 0) {
    scale <- pick(p, "ni_scale", NULL)
    if (is.null(scale)) fail("ni_scale is not set. It is the decision 'Scale of the non-inferiority margin'. Choices: hazard_ratio, rmst_difference")
    if (!scale %in% c("hazard_ratio", "rmst_difference")) fail(sprintf("ni_scale '%s' does not fit a time-to-event endpoint. Choices: hazard_ratio, rmst_difference", scale))
    ni_alpha <- as.numeric(pick(p, "ni_alpha", 0.025))
    if (!is.finite(ni_alpha) || ni_alpha <= 0 || ni_alpha >= 0.5) fail("ni_alpha must be a one-sided level between 0 and 0.5, such as 0.025")
    zn <- qnorm(1 - ni_alpha)
    if (scale == "hazard_ratio") {
      if (margin <= 1) fail("ni_margin on the hazard ratio scale must be above 1, such as 1.3")
      se <- unname(sm$coefficients[1, "se(coef)"])
      limit <- exp(log(hr[1]) + zn * se); met <- limit < margin
      txt <- sprintf("Non-inferiority on the hazard ratio: upper limit of the %g%% one-sided interval is %s; the margin is %s. Non-inferiority is %s.", 100 * (1 - ni_alpha), f3(limit), f3(margin), if (met) "shown" else "not shown")
      est <- hr[1]
    } else {
      if (is.null(r)) fail("ni_scale rmst_difference needs rmst_tau. Give the time limit tau")
      sed <- (m$rmst_diff_ci_high - m$rmst_diff_ci_low) / (2 * qnorm(1 - alpha / 2))
      limit <- m$rmst_diff - zn * sed; met <- limit > -margin
      txt <- sprintf("Non-inferiority on the restricted mean survival time difference: lower limit of the %g%% one-sided interval is %s; the margin is %s. Non-inferiority is %s.", 100 * (1 - ni_alpha), f3(limit), f3(-margin), if (met) "shown" else "not shown")
      est <- m$rmst_diff
    }
    m$ni_margin <- margin; m$ni_limit <- limit; m$ni_shown <- as.integer(met); m$ni_alpha <- ni_alpha
    lines <- c(lines, txt)
    rows[[length(rows) + 1]] <- data.frame(measure = "non-inferiority limit", estimate = est, ci_low = NA_real_, ci_high = limit, note = txt)
  }
  if (is.finite(zph) && zph < 0.05) lines <- c(lines, "The proportional hazards test is below 0.05, so one hazard ratio does not describe the whole follow-up. Report the restricted mean survival time too.")
  if (n_dropped > 0) lines <- c(lines, sprintf("%d rows were dropped because of a missing time, event or stratum.", n_dropped))
  endpoint <- pick(p, "endpoint", NULL)
  if (!is.null(endpoint) && nzchar(endpoint)) lines <- c(sprintf("Endpoint: %s.", endpoint), lines)
  pop <- pick(p, "population", NULL)
  if (!is.null(pop)) lines <- c(lines, sprintf("Analysis population: %s (%d patients analyzed).", pop, nrow(d)))
  tab <- do.call(rbind, rows)
  if (nzchar(out_path("results"))) write.csv(tab, out_path("results"), row.names = FALSE)
  emit(list(ok = TRUE, summary = paste(lines, collapse = " "), metrics = m, table = table_of(tab, out_path("results")),
            manualRoute = "R: coxph(Surv(time, event) ~ arm), survdiff(), survRM2::rmst2(time, status, arm, tau); SAS: PROC PHREG, PROC LIFETEST; Stata: stcox, sts test, strmst2"))
})
