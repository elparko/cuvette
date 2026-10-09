args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_proc()
  df <- read_cases(p, c("outcome", "predictor"))
  levels <- outcome_levels(p, df)
  direction <- direction_of(pick(p, "direction", ""))
  thr <- suppressWarnings(as.numeric(pick(p, "threshold", NA)))
  if (is.na(thr)) fail("threshold is missing or not a number. Give the cut-off in the unit of the predictor column.")
  r <- make_roc(df, p$outcome, p$predictor, levels, direction)
  alpha <- as.numeric(pick(p, "alpha", 0.05))
  prev <- prevalence_of(p)
  a <- accuracy(r$x, r$y, levels, direction, thr, alpha, prev)
  side <- if (direction == "<") ">=" else "<="
  emit(list(
    ok = TRUE,
    summary = sprintf("%s %s %.6g is positive for %s = %s (%d cases, %d controls): %s", p$predictor, side, thr, p$outcome, levels[2], a$tp + a$fn, a$tn + a$fp, accuracy_text(a, alpha, !is.null(prev))),
    metrics = a,
    data = list(positive = levels[2], direction = pick(p, "direction", ""), positive_if = paste(p$predictor, side, format(thr)), ci_method = "exact binomial (Clopper-Pearson)", proc_version = proc_version()),
    manualRoute = sprintf("tab <- table(test = df$%s %s %g, disease = df$%s == \"%s\"); binom.test(TP, TP + FN)  # sensitivity with exact CI", p$predictor, side, thr, p$outcome, levels[2])
  ))
})
