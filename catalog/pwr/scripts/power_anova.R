args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_pwr()
  s <- settings(p, FALSE)
  f <- num(p, "f")
  means <- num(p, "group_means")
  sd <- num(p, "sd")
  k <- num(p, "k")
  if (is.null(f) && !is.null(means)) {
    if (is.null(sd) || sd <= 0) fail("group_means needs sd, the common standard deviation inside the groups, in the unit of the outcome.")
    f <- sqrt(mean((means - mean(means))^2)) / sd
    if (is.null(k)) k <- length(means)
  }
  if (is.null(k) || k < 2) fail("k is missing. Give the number of groups (2 or more).")
  n <- num(p, "n")
  v <- solve_for(p, list(n = n, power = s$power, f = f)); n <- v$n; s$power <- v$power; f <- v$f; solved <- v$target
  r <- pwr.anova.test(k = k, n = n, f = f, sig.level = s$alpha, power = s$power)
  ff <- r$f
  total <- k * ceiling(r$n - 1e-9)
  summary <- sprintf("k = %d groups, f = %.4f, n = %.2f per group (round up to %d; %d in total), power %.4f.", as.integer(k), r$f, r$n, ceiling(r$n - 1e-9), total, r$power)
  finish("One-way ANOVA", solved, s, r$n, "per group", r$power, r$f, "Cohen's f", list(k = k, n_total = total), summary,
         sprintf("pwr.anova.test(k = %d, n = %s, f = %s, sig.level = %g, power = %s)", as.integer(k), if (is.null(n)) "NULL" else format(n), if (is.null(f)) "NULL" else format(f), s$alpha, if (is.null(s$power)) "NULL" else format(s$power)),
         function(j) pwr.anova.test(k = k, n = j, f = ff, sig.level = s$alpha)$power, "n per group")
})
