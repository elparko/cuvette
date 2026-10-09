args <- commandArgs(FALSE)
here <- dirname(sub("^--file=", "", args[grep("^--file=", args)]))
source(file.path(here, "lib.R"))
source(file.path(here, "binary_methods.R"))

METHODS <- c("wald", "newcombe", "miettinen_nurminen")
TESTS <- c("chi_square", "chi_square_continuity", "fisher")

pct <- function(x) sprintf("%.1f", 100 * x)

load_binary <- function(p) {
  counts <- c(p$events_a, p$n_a, p$events_b, p$n_b)
  if (is.null(p$data) && length(counts) == 4) {
    ev <- as.numeric(c(p$events_a, p$events_b)); nn <- as.numeric(c(p$n_a, p$n_b))
    if (any(ev < 0) || any(ev > nn) || any(nn < 1)) fail("events_a, events_b, n_a and n_b must satisfy 0 <= events <= n and n >= 1")
    return(list(x = c(ev[1], ev[2]), n = c(nn[1], nn[2]), a = ev[1], n1 = nn[1], c0 = ev[2], n0 = nn[2], stratum = NULL,
                label_a = pick(p, "group_a", "arm A"), label_b = pick(p, "group_b", "arm B"), n_missing = 0, n_rows = sum(nn), strata = NULL))
  }
  if (is.null(p$data)) fail("give data (a CSV file with one row for each patient), or give events_a, n_a, events_b and n_b together")
  df <- read_data(p$data, "the patient table")
  arm_col <- need_column(df, pick(p, "arm_col", NULL), "arm_col")
  event_col <- need_column(df, pick(p, "event_col", NULL), "event_col")
  arm <- trimws(as.character(df[[arm_col]]))
  levs <- sort(unique(arm[!is.na(arm) & nzchar(arm)]))
  ga <- pick(p, "group_a", NULL); gb <- pick(p, "group_b", NULL)
  if (is.null(ga) || is.null(gb)) fail(sprintf("give group_a (the test arm) and group_b (the reference arm). arm_col '%s' has the values: %s", arm_col, paste(levs, collapse = ", ")))
  for (g in c(ga, gb)) if (!g %in% levs) fail(sprintf("group '%s' is not a value of arm_col '%s'. Values: %s", g, arm_col, paste(levs, collapse = ", ")))
  if (ga == gb) fail("group_a and group_b must differ")
  ev <- df[[event_col]]
  ev_chr <- trimws(as.character(ev))
  ev_chr[ev_chr == ""] <- NA
  evv <- pick(p, "event_value", NULL)
  if (is.null(evv)) {
    vals <- sort(unique(ev_chr[!is.na(ev_chr)]))
    if (!all(vals %in% c("0", "1"))) fail(sprintf("event_col '%s' has the values %s. Give event_value, the value that marks an event", event_col, paste(vals, collapse = ", ")))
    evv <- "1"
  }
  evv <- as.character(evv)
  if (!evv %in% ev_chr) fail(sprintf("event_value '%s' is not a value of event_col '%s'. Values: %s", evv, event_col, paste(sort(unique(ev_chr[!is.na(ev_chr)])), collapse = ", ")))
  y <- ifelse(is.na(ev_chr), NA, as.integer(ev_chr == evv))
  stratum <- NULL
  sc <- pick(p, "stratum_col", NULL)
  if (!is.null(sc) && tolower(sc) != "none") {
    sc <- need_column(df, sc, "stratum_col")
    stratum <- trimws(as.character(df[[sc]]))
  }
  in_arm <- arm %in% c(ga, gb)
  mo <- pick(p, "missing_outcome", "exclude")
  if (!mo %in% c("exclude", "count_as_event", "count_as_no_event")) fail(sprintf("missing_outcome must be exclude, count_as_event or count_as_no_event, not '%s'", mo))
  miss <- in_arm & is.na(y)
  n_missing <- sum(miss)
  if (mo == "count_as_event") y[miss] <- 1L
  if (mo == "count_as_no_event") y[miss] <- 0L
  use <- in_arm & !is.na(y)
  if (!is.null(stratum)) use <- use & !is.na(stratum) & nzchar(stratum)
  arm <- arm[use]; y <- y[use]; stratum <- if (is.null(stratum)) NULL else stratum[use]
  isa <- arm == ga
  list(x = c(sum(y[isa]), sum(y[!isa])), n = c(sum(isa), sum(!isa)), label_a = ga, label_b = gb, n_missing = n_missing,
       n_rows = sum(use), y = y, isa = isa, stratum = stratum, missing_outcome = mo)
}

run_tool(function() {
  p <- read_params()
  d <- load_binary(p)
  method <- pick(p, "rd_ci_method", NULL)
  if (is.null(method)) fail(sprintf("rd_ci_method is not set. It is the decision 'Confidence interval method for the risk difference'. Choices: %s", paste(METHODS, collapse = ", ")))
  if (!method %in% METHODS) fail(sprintf("rd_ci_method '%s' is not known. Choices: %s", method, paste(METHODS, collapse = ", ")))
  test <- pick(p, "binary_test", NULL)
  if (is.null(test)) fail(sprintf("binary_test is not set. It is the decision 'Test of the two proportions'. Choices: %s", paste(TESTS, collapse = ", ")))
  if (!test %in% TESTS) fail(sprintf("binary_test '%s' is not known. Choices: %s", test, paste(TESTS, collapse = ", ")))
  alpha <- as.numeric(pick(p, "alpha", 0.05))
  if (!is.finite(alpha) || alpha <= 0 || alpha >= 1) fail("alpha must be a number between 0 and 1 (a fraction), such as 0.05")
  z <- qnorm(1 - alpha / 2)
  x1 <- d$x[1]; n1 <- d$n[1]; x0 <- d$x[2]; n0 <- d$n[2]
  if (n1 < 1 || n0 < 1) fail(sprintf("an arm has no patients after the exclusions (n_a %d, n_b %d)", n1, n0))
  rd <- rd_ci(method, x1, n1, x0, n0, z)
  rr <- rr_ci(x1, n1, x0, n0, z)
  orr <- or_ci(x1, n1, x0, n0, z)
  nnt <- nnt_text(rd)
  tb <- matrix(c(x1, n1 - x1, x0, n0 - x0), 2, byrow = TRUE)
  pval <- switch(test,
    chi_square = suppressWarnings(chisq.test(tb, correct = FALSE)$p.value),
    chi_square_continuity = suppressWarnings(chisq.test(tb, correct = TRUE)$p.value),
    fisher = fisher.test(tb)$p.value)

  m <- list(n_rows = d$n_rows, n_missing_outcome = d$n_missing, n_a = n1, n_b = n0, events_a = x1, events_b = x0,
            risk_a = x1 / n1, risk_b = x0 / n0, rd = rd[1], rd_ci_low = rd[2], rd_ci_high = rd[3],
            rr = rr[1], rr_ci_low = rr[2], rr_ci_high = rr[3], or = orr[1], or_ci_low = orr[2], or_ci_high = orr[3],
            nnt = nnt$value, nnt_ci_low = nnt$low, nnt_ci_high = nnt$high, test_p = pval, alpha = alpha)
  rows <- list(data.frame(measure = "risk difference", estimate = rd[1], ci_low = rd[2], ci_high = rd[3], note = method))
  rows[[2]] <- data.frame(measure = "relative risk", estimate = rr[1], ci_low = rr[2], ci_high = rr[3], note = "log scale, Wald")
  rows[[3]] <- data.frame(measure = "odds ratio", estimate = orr[1], ci_low = orr[2], ci_high = orr[3], note = "log scale, Woolf")

  lines <- c(sprintf("%s: %d/%d events (%s%%). %s: %d/%d events (%s%%).", d$label_a, x1, n1, pct(x1 / n1), d$label_b, x0, n0, pct(x0 / n0)),
    sprintf("Risk difference %s points (%g%% CI %s to %s, %s). Relative risk %s (%s to %s). Odds ratio %s (%s to %s). %s p = %s.",
      pct(rd[1]), 100 * (1 - alpha), pct(rd[2]), pct(rd[3]), method,
      formatC(rr[1], format = "f", digits = 3), formatC(rr[2], format = "f", digits = 3), formatC(rr[3], format = "f", digits = 3),
      formatC(orr[1], format = "f", digits = 3), formatC(orr[2], format = "f", digits = 3), formatC(orr[3], format = "f", digits = 3),
      test, formatC(pval, format = "g", digits = 4)),
    sprintf("Number needed to treat: %s.", nnt$text))
  if (d$n_missing > 0) lines <- c(lines, sprintf("%d rows had a missing outcome (missing_outcome = %s).", d$n_missing, pick(p, "missing_outcome", "exclude")))
  if (is.finite(rr[1]) == FALSE) lines <- c(lines, "The relative risk and odds ratio are not defined because a cell has zero patients.")

  if (!is.null(d$stratum)) {
    st <- sort(unique(d$stratum))
    a <- n_1 <- c0 <- n_0 <- numeric(length(st))
    for (i in seq_along(st)) {
      s <- d$stratum == st[i]
      a[i] <- sum(d$y[s & d$isa]); n_1[i] <- sum(s & d$isa); c0[i] <- sum(d$y[s & !d$isa]); n_0[i] <- sum(s & !d$isa)
    }
    bad <- which(n_1 == 0 | n_0 == 0)
    if (length(bad)) fail(sprintf("stratum '%s' of stratum_col has no patients in one arm (n_a %d, n_b %d). Merge strata or remove it", st[bad[1]], n_1[bad[1]], n_0[bad[1]]))
    mh <- mh_strata(a, n_1, c0, n_0)
    cmh <- cmh_test(a, n_1, c0, n_0)
    bd <- if (length(st) > 1 && is.finite(mh$or) && mh$or > 0) breslow_day_tarone(a, n_1, c0, n_0, mh$or) else c(bd = NA, tarone = NA, df = NA, p = NA)
    m$n_strata <- length(st)
    m$mh_rd <- mh$rd; m$mh_rd_ci_low <- mh$rd - z * mh$se_rd; m$mh_rd_ci_high <- mh$rd + z * mh$se_rd
    m$mh_rr <- mh$rr; m$mh_rr_ci_low <- exp(log(mh$rr) - z * mh$se_log_rr); m$mh_rr_ci_high <- exp(log(mh$rr) + z * mh$se_log_rr)
    m$mh_or <- mh$or; m$mh_or_ci_low <- exp(log(mh$or) - z * mh$se_log_or); m$mh_or_ci_high <- exp(log(mh$or) + z * mh$se_log_or)
    m$cmh_chisq <- unname(cmh["statistic"]); m$cmh_p <- unname(cmh["p"])
    m$breslow_day_chisq <- unname(bd["bd"]); m$tarone_chisq <- unname(bd["tarone"]); m$homogeneity_df <- unname(bd["df"]); m$homogeneity_p <- unname(bd["p"])
    rows[[4]] <- data.frame(measure = "Mantel-Haenszel risk difference", estimate = m$mh_rd, ci_low = m$mh_rd_ci_low, ci_high = m$mh_rd_ci_high, note = "Greenland-Robins variance")
    rows[[5]] <- data.frame(measure = "Mantel-Haenszel relative risk", estimate = m$mh_rr, ci_low = m$mh_rr_ci_low, ci_high = m$mh_rr_ci_high, note = "log scale, Greenland-Robins variance")
    rows[[6]] <- data.frame(measure = "Mantel-Haenszel odds ratio", estimate = m$mh_or, ci_low = m$mh_or_ci_low, ci_high = m$mh_or_ci_high, note = "log scale, Robins-Breslow-Greenland variance")
    lines <- c(lines, sprintf("Stratified by %d strata. Mantel-Haenszel risk difference %s points (%s to %s). Mantel-Haenszel relative risk %s (%s to %s). Mantel-Haenszel odds ratio %s (%s to %s). Cochran-Mantel-Haenszel chi-square %s, p = %s (no continuity correction). Breslow-Day with Tarone correction: chi-square %s on %s df, p = %s.",
      length(st), pct(m$mh_rd), pct(m$mh_rd_ci_low), pct(m$mh_rd_ci_high),
      formatC(m$mh_rr, format = "f", digits = 3), formatC(m$mh_rr_ci_low, format = "f", digits = 3), formatC(m$mh_rr_ci_high, format = "f", digits = 3),
      formatC(m$mh_or, format = "f", digits = 3), formatC(m$mh_or_ci_low, format = "f", digits = 3), formatC(m$mh_or_ci_high, format = "f", digits = 3),
      formatC(m$cmh_chisq, format = "f", digits = 4), formatC(m$cmh_p, format = "g", digits = 4),
      formatC(m$tarone_chisq, format = "f", digits = 4), m$homogeneity_df, formatC(m$homogeneity_p, format = "g", digits = 4)))
  }

  margin <- as.numeric(pick(p, "ni_margin", 0))
  if (is.finite(margin) && margin > 0) {
    scale <- pick(p, "ni_scale", NULL)
    if (is.null(scale)) fail("ni_scale is not set. It is the decision 'Scale of the non-inferiority margin'. Choices: risk_difference, risk_ratio")
    if (!scale %in% c("risk_difference", "risk_ratio")) fail(sprintf("ni_scale '%s' does not fit a binary endpoint. Choices: risk_difference, risk_ratio", scale))
    dir <- pick(p, "outcome_direction", NULL)
    if (is.null(dir)) fail("outcome_direction is not set. It is the decision 'Direction of the outcome'. Choices: event is bad, event is good")
    if (!dir %in% c("event is bad", "event is good")) fail(sprintf("outcome_direction '%s' is not known. Choices: event is bad, event is good", dir))
    ni_alpha <- as.numeric(pick(p, "ni_alpha", 0.025))
    if (!is.finite(ni_alpha) || ni_alpha <= 0 || ni_alpha >= 0.5) fail("ni_alpha must be a one-sided level between 0 and 0.5, such as 0.025")
    zn <- qnorm(1 - ni_alpha)
    if (scale == "risk_difference") {
      if (margin >= 1) fail("ni_margin on the risk difference scale must be a fraction below 1, such as 0.10 for 10 points")
      if (!is.null(d$stratum)) { est <- m$mh_rd; se <- (m$mh_rd_ci_high - m$mh_rd_ci_low) / (2 * z); ci <- c(est - zn * se, est + zn * se); how <- "Mantel-Haenszel, Greenland-Robins variance" }
      else { ci <- rd_ci(method, x1, n1, x0, n0, zn)[2:3]; est <- rd[1]; how <- method }
      met <- if (dir == "event is bad") ci[2] < margin else ci[1] > -margin
      limit <- if (dir == "event is bad") ci[2] else ci[1]
      bound <- if (dir == "event is bad") margin else -margin
      txt <- sprintf("Non-inferiority on the risk difference (%s): %s limit of the %g%% one-sided interval is %s points; the margin is %s points. Non-inferiority is %s.", how, if (dir == "event is bad") "upper" else "lower", 100 * (1 - ni_alpha), pct(limit), pct(bound), if (met) "shown" else "not shown")
    } else {
      if (margin <= 1) fail("ni_margin on the risk ratio scale must be above 1, such as 1.25")
      if (!is.null(d$stratum)) { est <- m$mh_rr; se <- (log(m$mh_rr_ci_high) - log(m$mh_rr_ci_low)) / (2 * z); ci <- exp(log(est) + c(-1, 1) * zn * se) }
      else { if (!is.finite(rr[1])) fail("the risk ratio is not defined because an arm has zero events; use the risk difference scale"); se <- sqrt(1 / x1 - 1 / n1 + 1 / x0 - 1 / n0); est <- rr[1]; ci <- exp(log(est) + c(-1, 1) * zn * se) }
      met <- if (dir == "event is bad") ci[2] < margin else ci[1] > 1 / margin
      limit <- if (dir == "event is bad") ci[2] else ci[1]
      bound <- if (dir == "event is bad") margin else 1 / margin
      txt <- sprintf("Non-inferiority on the risk ratio: %s limit of the %g%% one-sided interval is %s; the margin is %s. Non-inferiority is %s.", if (dir == "event is bad") "upper" else "lower", 100 * (1 - ni_alpha), formatC(limit, format = "f", digits = 3), formatC(bound, format = "f", digits = 3), if (met) "shown" else "not shown")
    }
    m$ni_margin <- margin; m$ni_limit <- limit; m$ni_bound <- bound; m$ni_shown <- as.integer(met); m$ni_alpha <- ni_alpha
    lines <- c(lines, txt)
    rows[[length(rows) + 1]] <- data.frame(measure = "non-inferiority limit", estimate = est, ci_low = ci[1], ci_high = ci[2], note = txt)
  }
  pop <- pick(p, "population", NULL)
  if (!is.null(pop)) lines <- c(lines, sprintf("Analysis population: %s (%d patients analyzed).", pop, d$n_rows))
  tab <- do.call(rbind, rows)
  if (nzchar(out_path("results"))) write.csv(tab, out_path("results"), row.names = FALSE)
  emit(list(ok = TRUE, summary = paste(lines, collapse = " "), metrics = m, table = table_of(tab, out_path("results")),
            manualRoute = "SAS: PROC FREQ; TABLES arm*event / RISKDIFF CMH; Stata: cs event arm, or; R: this tool's formulas"))
})
