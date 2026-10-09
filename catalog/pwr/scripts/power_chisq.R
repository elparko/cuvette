args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_pwr()
  s <- settings(p, FALSE)
  w <- num(p, "w")
  p0 <- num(p, "p0"); p1 <- num(p, "p1")
  if (is.null(w) && !is.null(p0) && !is.null(p1)) {
    if (length(p0) != length(p1)) fail("p0 and p1 must have the same number of cells.")
    if (abs(sum(p0) - 1) > 1e-6 || abs(sum(p1) - 1) > 1e-6) fail("p0 and p1 must each add to 1 (cell proportions of the whole table).")
    w <- ES.w1(p0, p1)
  }
  df <- num(p, "df")
  if (is.null(df) || df < 1) fail("df is missing. For a table of r rows and c columns, df is (r - 1) * (c - 1). For a goodness-of-fit test with k cells, df is k - 1.")
  n <- num(p, "n")
  v <- solve_for(p, list(n = n, power = s$power, w = w)); n <- v$n; s$power <- v$power; w <- v$w; solved <- v$target
  r <- pwr.chisq.test(w = w, N = n, df = df, sig.level = s$alpha, power = s$power)
  ww <- r$w
  summary <- sprintf("w = %.4f, df = %d, N = %.2f in total (round up to %d), power %.4f.", r$w, as.integer(df), r$N, ceiling(r$N - 1e-9), r$power)
  finish("Chi-square test", solved, s, r$N, "in total", r$power, r$w, "Cohen's w", list(df = df), summary,
         sprintf("pwr.chisq.test(w = %s, N = %s, df = %d, sig.level = %g, power = %s)", if (is.null(w)) "NULL" else format(w), if (is.null(n)) "NULL" else format(n), as.integer(df), s$alpha, if (is.null(s$power)) "NULL" else format(s$power)),
         function(k) pwr.chisq.test(w = ww, N = k, df = df, sig.level = s$alpha)$power, "N in total")
})
