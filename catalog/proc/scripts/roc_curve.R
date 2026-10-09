args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_proc()
  df <- read_cases(p, c("outcome", "predictor"))
  levels <- outcome_levels(p, df)
  direction <- direction_of(pick(p, "direction", ""))
  r <- make_roc(df, p$outcome, p$predictor, levels, direction)
  alpha <- as.numeric(pick(p, "alpha", 0.05))
  method <- pick(p, "ci_method", "delong")
  if (!method %in% c("delong", "bootstrap")) fail("ci_method must be delong or bootstrap.")
  boot_n <- as.integer(pick(p, "boot_n", 2000))
  seed <- as.integer(pick(p, "seed", 1))
  set.seed(seed)
  ci <- if (method == "delong") ci.auc(r$roc, conf.level = 1 - alpha, method = "delong") else ci.auc(r$roc, conf.level = 1 - alpha, method = "bootstrap", boot.n = boot_n, progress = "none")
  auc <- as.numeric(auc(r$roc))
  plot <- out_path("plot")
  png(plot, width = 800, height = 800, res = 110)
  plot(r$roc, legacy.axes = TRUE, print.auc = TRUE, main = sprintf("ROC of %s for %s = %s", p$predictor, p$outcome, levels[2]))
  dev.off()
  n_case <- length(r$roc$cases); n_control <- length(r$roc$controls)
  how <- if (method == "delong") "DeLong" else sprintf("bootstrap, %d samples, seed %d", boot_n, seed)
  warn <- if (auc < 0.5) " Warning: the AUC is below 0.5. Check the direction and the positive class." else ""
  if (r$n_dropped) warn <- paste0(warn, sprintf(" Dropped %d rows with a missing value.", r$n_dropped))
  emit(list(
    ok = TRUE,
    summary = sprintf("ROC of %s for %s = %s (%d cases, %d controls; %s values mean disease): AUC %.4f, %g%% CI %.4f to %.4f (%s).%s",
                      p$predictor, p$outcome, levels[2], n_case, n_control, pick(p, "direction", ""), auc, 100 * (1 - alpha), ci[1], ci[3], how, warn),
    metrics = list(auc = auc, auc_ci_lo = ci[1], auc_ci_hi = ci[3], n_cases = n_case, n_controls = n_control, n_dropped = r$n_dropped),
    data = list(positive = levels[2], negative = levels[1], direction = pick(p, "direction", ""), ci_method = how, proc_version = proc_version()),
    manualRoute = sprintf("r <- roc(df$%s, df$%s, levels = c(\"%s\", \"%s\"), direction = \"%s\"); ci.auc(r, method = \"%s\"); plot(r)", p$outcome, p$predictor, levels[1], levels[2], direction, method)
  ))
})
