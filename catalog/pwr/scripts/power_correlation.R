args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_pwr()
  s <- settings(p)
  r0 <- num(p, "r")
  if (!is.null(r0) && (r0 <= -1 || r0 >= 1 || r0 == 0)) fail(paste0("r must be between -1 and 1 and not 0, not ", r0, "."))
  n <- num(p, "n")
  v <- solve_for(p, list(n = n, power = s$power, r = r0)); n <- v$n; s$power <- v$power; r0 <- v$r; solved <- v$target
  res <- pwr.r.test(r = r0, n = n, sig.level = s$alpha, power = s$power, alternative = s$alternative)
  rr <- res$r
  summary <- sprintf("r = %.4f, n = %.2f pairs of values (round up to %d), power %.4f.", res$r, res$n, ceiling(res$n - 1e-9), res$power)
  finish("Pearson correlation", solved, s, res$n, "in total", res$power, res$r, "correlation r", list(), summary,
         sprintf("pwr.r.test(r = %s, n = %s, sig.level = %g, power = %s, alternative = \"%s\")", if (is.null(r0)) "NULL" else format(r0), if (is.null(n)) "NULL" else format(n), s$alpha, if (is.null(s$power)) "NULL" else format(s$power), s$alternative),
         function(k) pwr.r.test(r = rr, n = k, sig.level = s$alpha, alternative = s$alternative)$power, "n")
})
