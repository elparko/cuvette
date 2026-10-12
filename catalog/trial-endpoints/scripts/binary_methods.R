wilson <- function(x, n, z) {
  p <- x / n
  centre <- (p + z^2 / (2 * n)) / (1 + z^2 / n)
  half <- z * sqrt(p * (1 - p) / n + z^2 / (4 * n^2)) / (1 + z^2 / n)
  c(centre - half, centre + half)
}

rd_wald <- function(x1, n1, x0, n0, z) {
  p1 <- x1 / n1; p0 <- x0 / n0
  d <- p1 - p0
  se <- sqrt(p1 * (1 - p1) / n1 + p0 * (1 - p0) / n0)
  c(d, d - z * se, d + z * se)
}

rd_newcombe <- function(x1, n1, x0, n0, z) {
  p1 <- x1 / n1; p0 <- x0 / n0
  w1 <- wilson(x1, n1, z); w0 <- wilson(x0, n0, z)
  d <- p1 - p0
  c(d, d - sqrt((p1 - w1[1])^2 + (w0[2] - p0)^2), d + sqrt((w1[2] - p1)^2 + (p0 - w0[1])^2))
}

mn_z <- function(delta, x1, n1, x0, n0) {
  p1 <- x1 / n1; p0 <- x0 / n0
  theta <- n0 / n1
  a <- 1 + theta
  b <- -(1 + theta + p1 + theta * p0 + delta * (theta + 2))
  cc <- delta^2 + delta * (2 * p1 + theta + 1) + p1 + theta * p0
  d <- -p1 * delta * (1 + delta)
  v <- b^3 / (3 * a)^3 - b * cc / (6 * a^2) + d / (2 * a)
  u <- sign(v) * sqrt(b^2 / (3 * a)^2 - cc / (3 * a))
  if (!is.finite(u) || u == 0) return(NA_real_)
  w <- (pi + acos(max(-1, min(1, v / u^3)))) / 3
  q1 <- 2 * u * cos(w) - b / (3 * a)
  q0 <- q1 - delta
  var <- (q1 * (1 - q1) / n1 + q0 * (1 - q0) / n0) * (n1 + n0) / (n1 + n0 - 1)
  (p1 - p0 - delta) / sqrt(var)
}

rd_mn <- function(x1, n1, x0, n0, z) {
  d <- x1 / n1 - x0 / n0
  eps <- 1e-9
  f <- function(delta) mn_z(delta, x1, n1, x0, n0)
  root <- function(lo, hi, target) {
    g <- function(delta) f(delta) - target
    glo <- g(lo + eps); ghi <- g(hi - eps)
    if (!is.finite(glo) || !is.finite(ghi) || glo * ghi > 0) return(NA_real_)
    uniroot(g, c(lo + eps, hi - eps), tol = 1e-12)$root
  }
  lower <- root(-1, d, z); upper <- root(d, 1, -z)
  if (is.na(lower)) lower <- -1
  if (is.na(upper)) upper <- 1
  c(d, lower, upper)
}

rd_ci <- function(method, x1, n1, x0, n0, z) {
  switch(method, wald = rd_wald(x1, n1, x0, n0, z), newcombe = rd_newcombe(x1, n1, x0, n0, z), miettinen_nurminen = rd_mn(x1, n1, x0, n0, z))
}

rr_ci <- function(x1, n1, x0, n0, z) {
  if (x1 == 0 || x0 == 0) return(rep(NA_real_, 3))
  rr <- (x1 / n1) / (x0 / n0)
  se <- sqrt(1 / x1 - 1 / n1 + 1 / x0 - 1 / n0)
  c(rr, exp(log(rr) - z * se), exp(log(rr) + z * se))
}

or_ci <- function(x1, n1, x0, n0, z) {
  cells <- c(x1, n1 - x1, x0, n0 - x0)
  if (any(cells == 0)) return(rep(NA_real_, 3))
  o <- (x1 * (n0 - x0)) / ((n1 - x1) * x0)
  se <- sqrt(sum(1 / cells))
  c(o, exp(log(o) - z * se), exp(log(o) + z * se))
}

nnt_text <- function(rd, direction = "event is bad") {
  if (is.na(rd[1]) || rd[1] == 0) return(list(value = NA_real_, low = NA_real_, high = NA_real_, text = "not defined because the risk difference is 0"))
  v <- 1 / abs(rd[1])
  kind <- if ((rd[1] < 0) == (direction != "event is good")) "benefit" else "harm"
  if (rd[2] > 0 || rd[3] < 0) {
    lims <- sort(abs(1 / c(rd[2], rd[3])))
    list(value = v, low = lims[1], high = lims[2], text = sprintf("%.1f (%.1f to %.1f) for %s", v, lims[1], lims[2], kind))
  } else {
    list(value = v, low = NA_real_, high = NA_real_, text = sprintf("%.1f for %s; the interval of the risk difference includes 0, so the interval of the number needed to treat is open and has no finite upper limit", v, kind))
  }
}

mh_strata <- function(a, n1, c0, n0) {
  b <- n1 - a; d <- n0 - c0; n <- n1 + n0
  w <- n1 * n0 / n
  rd <- sum(w * (a / n1 - c0 / n0)) / sum(w)
  var_rd <- sum((a * b * n0^3 + c0 * d * n1^3) / (n1 * n0 * n^2)) / sum(w)^2
  r <- sum(a * n0 / n); s <- sum(c0 * n1 / n)
  rr <- r / s
  var_rr <- sum((n1 * n0 * (a + c0) - a * c0 * n) / n^2) / (r * s)
  rr_o <- sum(a * d / n); s_o <- sum(b * c0 / n)
  orr <- rr_o / s_o
  p_i <- (a + d) / n; q_i <- (b + c0) / n; r_i <- a * d / n; s_i <- b * c0 / n
  var_or <- sum(p_i * r_i) / (2 * rr_o^2) + sum(p_i * s_i + q_i * r_i) / (2 * rr_o * s_o) + sum(q_i * s_i) / (2 * s_o^2)
  list(rd = rd, se_rd = sqrt(var_rd), rr = rr, se_log_rr = sqrt(var_rr), or = orr, se_log_or = sqrt(var_or))
}

cmh_test <- function(a, n1, c0, n0) {
  m1 <- a + c0; n <- n1 + n0
  e <- n1 * m1 / n
  v <- n1 * n0 * m1 * (n - m1) / (n^2 * (n - 1))
  keep <- n > 1
  stat <- sum((a - e)[keep])^2 / sum(v[keep])
  c(statistic = stat, p = pchisq(stat, 1, lower.tail = FALSE))
}

breslow_day_tarone <- function(a, n1, c0, n0, psi) {
  m1 <- a + c0; n <- n1 + n0
  expected <- numeric(length(a)); variance <- numeric(length(a))
  expected[] <- NA_real_; variance[] <- NA_real_
  for (i in seq_along(a)) {
    if (m1[i] <= 0 || m1[i] >= n[i] || n1[i] <= 0 || n0[i] <= 0) next
    lo <- max(0, m1[i] - n0[i]); hi <- min(n1[i], m1[i])
    f <- function(x) (x * (n0[i] - m1[i] + x)) - psi * (n1[i] - x) * (m1[i] - x)
    expected[i] <- uniroot(f, c(lo, hi), tol = 1e-12)$root
    e <- expected[i]
    variance[i] <- 1 / (1 / e + 1 / (n1[i] - e) + 1 / (m1[i] - e) + 1 / (n0[i] - m1[i] + e))
  }
  ok <- is.finite(variance) & variance > 0 & (m1 > 0) & (m1 < n)
  d <- (a - expected)[ok]
  bd <- sum(d^2 / variance[ok])
  tarone <- bd - sum(d)^2 / sum(variance[ok])
  df <- sum(ok) - 1
  c(bd = bd, tarone = tarone, df = df, p = pchisq(tarone, df, lower.tail = FALSE))
}
