args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_proc()
  df <- read_cases(p, c("outcome", "predictor"))
  levels <- outcome_levels(p, df)
  direction <- direction_of(pick(p, "direction", ""))
  rule <- pick(p, "rule", "")
  if (!rule %in% c("youden", "closest.topleft")) fail("rule must be youden or closest.topleft. The decision threshold_rule sets it.")
  r <- make_roc(df, p$outcome, p$predictor, levels, direction)
  alpha <- as.numeric(pick(p, "alpha", 0.05))
  prev <- prevalence_of(p)
  best <- coords(r$roc, "best", best.method = rule, ret = c("threshold", "sensitivity", "specificity"), transpose = FALSE)
  ties <- nrow(best)
  thr <- best$threshold[1]
  a <- accuracy(r$x, r$y, levels, direction, thr, alpha, prev)
  rule_name <- if (rule == "youden") "Youden index (sensitivity + specificity - 1, largest)" else "closest to the top-left corner"
  side <- if (direction == "<") ">=" else "<="
  warn <- " The threshold was chosen on the same data. The sensitivity and specificity are optimistic; confirm them in other patients."
  if (ties > 1) warn <- paste0(warn, sprintf(" %d thresholds tie for the rule; the tool reports the first.", ties))
  emit(list(
    ok = TRUE,
    summary = sprintf("Best threshold of %s by the %s: %s %s %.6g is positive for %s = %s. At this threshold: %s%s",
                      p$predictor, rule_name, p$predictor, side, thr, p$outcome, levels[2], accuracy_text(a, alpha, !is.null(prev)), warn),
    metrics = a,
    data = list(rule = rule, positive = levels[2], direction = pick(p, "direction", ""), positive_if = paste(p$predictor, side, format(thr)), n_tied = ties, proc_version = proc_version()),
    manualRoute = sprintf("r <- roc(df$%s, df$%s, levels = c(\"%s\", \"%s\"), direction = \"%s\"); coords(r, \"best\", best.method = \"%s\", ret = c(\"threshold\", \"sensitivity\", \"specificity\", \"ppv\", \"npv\"))",
                          p$outcome, p$predictor, levels[1], levels[2], direction, rule)
  ))
})
