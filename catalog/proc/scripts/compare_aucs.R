args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_proc()
  df <- read_cases(p, c("outcome", "predictor1", "predictor2"))
  levels <- outcome_levels(p, df)
  d1 <- direction_of(pick(p, "direction", ""))
  d2 <- direction_of(pick(p, "direction2", pick(p, "direction", "")), "direction2")
  x1 <- suppressWarnings(as.numeric(df[[p$predictor1]]))
  x2 <- suppressWarnings(as.numeric(df[[p$predictor2]]))
  y <- as.character(df[[p$outcome]])
  keep <- !is.na(x1) & !is.na(x2) & y %in% levels
  if (sum(y[keep] == levels[2]) == 0 || sum(y[keep] == levels[1]) == 0) fail("the two predictors need values for both outcome groups in the same patients.")
  r1 <- roc(y[keep], x1[keep], levels = levels, direction = d1, quiet = TRUE)
  r2 <- roc(y[keep], x2[keep], levels = levels, direction = d2, quiet = TRUE)
  method <- pick(p, "method", "delong")
  if (!method %in% c("delong", "bootstrap")) fail("method must be delong or bootstrap.")
  alpha <- as.numeric(pick(p, "alpha", 0.05))
  seed <- as.integer(pick(p, "seed", 1))
  set.seed(seed)
  t <- if (method == "delong") roc.test(r1, r2, method = "delong", paired = TRUE, conf.level = 1 - alpha)
       else roc.test(r1, r2, method = "bootstrap", paired = TRUE, boot.n = as.integer(pick(p, "boot_n", 2000)), progress = "none")
  a1 <- as.numeric(auc(r1)); a2 <- as.numeric(auc(r2))
  m <- list(auc1 = a1, auc2 = a2, difference = a1 - a2, statistic = as.numeric(t$statistic), p = t$p.value, n_patients = sum(keep), n_dropped = sum(!keep))
  if (!is.null(t$conf.int)) { m$diff_ci_lo <- t$conf.int[1]; m$diff_ci_hi <- t$conf.int[2] }
  ci_txt <- if (!is.null(t$conf.int)) sprintf(" (%g%% CI %.4f to %.4f)", 100 * (1 - alpha), t$conf.int[1], t$conf.int[2]) else ""
  emit(list(
    ok = TRUE,
    summary = sprintf("%s test of two paired ROC curves for %s = %s, %d patients: AUC %s %.4f, AUC %s %.4f, difference %.4f%s, Z = %.4f, p = %.4g.",
                      if (method == "delong") "DeLong" else "Bootstrap", p$outcome, levels[2], sum(keep), p$predictor1, a1, p$predictor2, a2, a1 - a2, ci_txt, m$statistic, t$p.value),
    metrics = m,
    data = list(method = method, paired = TRUE, positive = levels[2], proc_version = proc_version()),
    manualRoute = sprintf("roc.test(roc(df$%s, df$%s), roc(df$%s, df$%s), method = \"%s\", paired = TRUE)", p$outcome, p$predictor1, p$outcome, p$predictor2, method)
  ))
})
