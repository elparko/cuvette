args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

normal_n <- function(p1, p2, alpha, power, alt, cc) {
  za <- qnorm(1 - if (alt == "two.sided") alpha / 2 else alpha)
  zb <- qnorm(power)
  pbar <- (p1 + p2) / 2
  n <- (za * sqrt(2 * pbar * (1 - pbar)) + zb * sqrt(p1 * (1 - p1) + p2 * (1 - p2)))^2 / (p1 - p2)^2
  if (cc) n <- n / 4 * (1 + sqrt(1 + 4 / (n * abs(p1 - p2))))^2
  n
}

normal_power <- function(p1, p2, alpha, n, alt, cc) {
  za <- qnorm(1 - if (alt == "two.sided") alpha / 2 else alpha)
  delta <- abs(p1 - p2)
  if (cc) delta <- delta - 1 / n
  pbar <- (p1 + p2) / 2
  pnorm((sqrt(n) * delta - za * sqrt(2 * pbar * (1 - pbar))) / sqrt(p1 * (1 - p1) + p2 * (1 - p2)))
}

run_tool(function() {
  p <- read_params()
  load_pwr()
  s <- settings(p)
  method <- pick(p, "method", "")
  if (!method %in% c("arcsine", "normal", "normal_cc")) fail("method must be arcsine (Cohen's h, pwr.2p.test), normal or normal_cc (Fleiss continuity correction). The decision proportion_method sets it.")
  p1 <- num(p, "p1"); p2 <- num(p, "p2"); h <- num(p, "h")
  for (v in list(list("p1", p1), list("p2", p2))) if (!is.null(v[[2]]) && (v[[2]] <= 0 || v[[2]] >= 1)) fail(paste0(v[[1]], " must be a proportion between 0 and 1, not ", v[[2]], "."))
  if (is.null(h) && !is.null(p1) && !is.null(p2)) h <- ES.h(p1, p2)
  n <- num(p, "n")
  if (method == "arcsine") {
    v <- solve_for(p, list(n = n, power = s$power, h = h)); n <- v$n; s$power <- v$power; h <- v$h; solved <- v$target
    r <- pwr.2p.test(h = h, n = n, sig.level = s$alpha, power = s$power, alternative = s$alternative)
    hh <- r$h
    summary <- sprintf("Cohen's h = %.4f%s, n = %.2f per group (round up to %d; %d in total), power %.4f.", r$h,
                    if (!is.null(p1)) sprintf(" (p1 %g against p2 %g)", p1, p2) else "", r$n, ceiling(r$n - 1e-9), 2 * ceiling(r$n - 1e-9), r$power)
    finish("Two proportions, arcsine method (Cohen's h)", solved, s, r$n, "per group", r$power, r$h, "Cohen's h", list(n_total = 2 * ceiling(r$n - 1e-9)), summary,
           sprintf("pwr.2p.test(h = %s, n = %s, sig.level = %g, power = %s, alternative = \"%s\")", if (is.null(h)) "NULL" else format(h), if (is.null(n)) "NULL" else format(n), s$alpha, if (is.null(s$power)) "NULL" else format(s$power), s$alternative),
           function(k) pwr.2p.test(h = hh, n = k, sig.level = s$alpha, alternative = s$alternative)$power, "n per group")
  }
  if (is.null(p1) || is.null(p2)) fail("methods normal and normal_cc need p1 and p2, the expected proportions in the two groups.")
  if (s$alternative == "less") fail("methods normal and normal_cc use the size of p1 - p2; use two.sided or greater.")
  cc <- method == "normal_cc"
  v <- solve_for(p, list(n = n, power = s$power)); n <- v$n; s$power <- v$power; solved <- v$target
  if (solved == "n") {
    nn <- normal_n(p1, p2, s$alpha, s$power, s$alternative, cc)
    pw <- s$power
  } else {
    nn <- n
    pw <- normal_power(p1, p2, s$alpha, n, s$alternative, cc)
  }
  name <- if (cc) "Two proportions, normal approximation with continuity correction (Fleiss)" else "Two proportions, normal approximation (pooled variance)"
  summary <- sprintf("p1 %g against p2 %g, n = %.2f per group (round up to %d; %d in total), power %.4f.", p1, p2, nn, ceiling(nn - 1e-9), 2 * ceiling(nn - 1e-9), pw)
  finish(name, solved, s, if (solved == "n") nn else NULL, "per group", pw, p1 - p2, "difference of proportions", list(n_total = 2 * ceiling(nn - 1e-9), h = ES.h(p1, p2)), summary,
         sprintf("closed form: n = (z_alpha * sqrt(2 * pbar * (1 - pbar)) + z_beta * sqrt(p1 * (1 - p1) + p2 * (1 - p2)))^2 / (p1 - p2)^2%s",
                 if (cc) "; Fleiss correction n' = n / 4 * (1 + sqrt(1 + 4 / (n * |p1 - p2|)))^2" else ""),
         function(k) normal_power(p1, p2, s$alpha, k, s$alternative, cc), "n per group")
})
