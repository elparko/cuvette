args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_pwr()
  s <- settings(p)
  type <- pick(p, "type", "two.sample")
  if (!type %in% c("two.sample", "one.sample", "paired")) fail("type must be two.sample, one.sample or paired.")
  d <- num(p, "d")
  diff <- num(p, "mean_diff")
  sd <- num(p, "sd")
  if (is.null(d) && !is.null(diff)) {
    if (is.null(sd) || sd <= 0) fail("mean_diff needs sd, the standard deviation (of the outcome, or of the paired differences for type paired), in the unit of the outcome.")
    d <- diff / sd
  }
  n1 <- num(p, "n1"); n2 <- num(p, "n2")
  if (!is.null(n1) && !is.null(n2)) {
    if (type != "two.sample") fail("n1 and n2 are for two.sample only.")
    v <- solve_for(p, list(power = s$power, d = d)); s$power <- v$power; d <- v$d; solved <- v$target
    r <- pwr.t2n.test(n1 = n1, n2 = n2, d = d, sig.level = s$alpha, power = s$power, alternative = s$alternative)
    summary <- sprintf("two groups of %g and %g, d = %.4f, power %.4f.", n1, n2, r$d, r$power)
    finish("Two-sample t-test with unequal groups", solved, s, NULL, "per group", r$power, r$d, "Cohen's d", list(n1 = n1, n2 = n2), summary,
           sprintf("pwr.t2n.test(n1 = %g, n2 = %g, d = %s, sig.level = %g, power = %s, alternative = \"%s\")", n1, n2, if (is.null(d)) "NULL" else format(d), s$alpha, if (is.null(s$power)) "NULL" else format(s$power), s$alternative),
           NULL, "n")
  }
  n <- num(p, "n")
  v <- solve_for(p, list(n = n, power = s$power, d = d)); n <- v$n; s$power <- v$power; d <- v$d; solved <- v$target
  r <- pwr.t.test(n = n, d = d, sig.level = s$alpha, power = s$power, type = type, alternative = s$alternative)
  unit <- switch(type, two.sample = "per group", one.sample = "in total", paired = "pairs")
  total <- if (type == "two.sample") 2 * ceiling(r$n - 1e-9) else ceiling(r$n - 1e-9)
  label <- switch(type, two.sample = "two-sample t-test", one.sample = "one-sample t-test", paired = "paired t-test")
  summary <- sprintf("d = %.4f, n = %.2f %s (round up to %d; %d in total), power %.4f.", r$d, r$n, unit, ceiling(r$n - 1e-9), total, r$power)
  dd <- r$d
  finish(paste0("Power of the ", label), solved, s, r$n, unit, r$power, r$d, "Cohen's d", list(n_total = total), summary,
         sprintf("pwr.t.test(n = %s, d = %s, sig.level = %g, power = %s, type = \"%s\", alternative = \"%s\")", if (is.null(n)) "NULL" else format(n), if (is.null(d)) "NULL" else format(d), s$alpha, if (is.null(s$power)) "NULL" else format(s$power), type, s$alternative),
         function(k) pwr.t.test(n = k, d = dd, sig.level = s$alpha, type = type, alternative = s$alternative)$power, paste("n", unit),
         list(type = type))
})
