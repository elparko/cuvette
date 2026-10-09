args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

DR_MODELS <- c("4PL", "3PL", "4PL-normalized", "5PL", "Weibull1", "Weibull2")

ed_ci <- function(fit, level, type, ci, alpha, x, y, w) {
  vc <- if (ci == "log") jtj_vcov(fit, x, y, w) else vcov(fit)
  e <- suppressWarnings(ED(fit, level, type = type, interval = "none", display = FALSE, vcov. = function(...) vc))
  est <- e[1, 1]; se <- e[1, 2]
  q <- qt(1 - alpha / 2, df.residual(fit))
  if (ci == "log") c(est, se, exp(log(est) - q * se / est), exp(log(est) + q * se / est)) else c(est, se, est - q * se, est + q * se)
}

shared_e_test <- function(fits, model, weighting) {
  if (!model %in% c("4PL", "3PL", "4PL-normalized", "5PL")) return(NULL)
  free <- setdiff(c("b", "c", "d", "f"), c(names(FIXED[[model]]), if (model != "5PL") "f"))
  gr <- names(fits)
  start <- c(unlist(lapply(gr, function(g) unlist(fits[[g]]$par[free]))), log_e = mean(log(sapply(gr, function(g) fits[[g]]$par$e))))
  k <- length(free)
  obj <- function(q) {
    tot <- 0
    for (i in seq_along(gr)) {
      dg <- fits[[gr[i]]]$d
      par <- fits[[gr[i]]]$par
      par[free] <- as.list(q[(i - 1) * k + seq_len(k)])
      par$e <- exp(q[length(q)])
      sw <- if (weighting == "none") 1 else weights_of(dg$y, weighting)
      tot <- tot + sum(((dg$y - curve_fun(par, model)(dg$x)) / sw)^2)
    }
    if (is.finite(tot)) tot else 1e300
  }
  best <- start; val <- obj(best)
  for (i in 1:12) {
    o <- tryCatch(optim(best, obj, method = if (i %% 2) "Nelder-Mead" else "BFGS", control = list(reltol = 1e-15, maxit = 50000)), error = function(e) NULL)
    if (is.null(o) || o$value >= val * (1 - 1e-13)) { if (i > 2) break else next }
    best <- o$par; val <- o$value
  }
  all <- do.call(rbind, lapply(seq_along(gr), function(i) data.frame(x = fits[[gr[i]]]$d$x, y = fits[[gr[i]]]$d$y, g = i)))
  all$w <- if (weighting == "none") 1 else 1 / weights_of(all$y, weighting)^2
  term <- function(k) if (k %in% free) paste0(k, "[g]") else as.character(FIXED[[model]][[k]])
  rhs <- sprintf("%s + (%s - %s) / (1 + exp(%s * (log(x) - log_e)))^%s", term("c"), term("d"), term("c"), term("b"), if (model == "5PL") "f[g]" else "1")
  nf <- length(free)
  st <- c(lapply(setNames(free, free), function(p) unname(best[(seq_along(gr) - 1) * nf + match(p, free)])), list(log_e = unname(best[[length(best)]])))
  n <- tryCatch(nls(as.formula(paste("y ~", rhs)), data = all, start = st, weights = w, algorithm = "port", control = nls.control(maxiter = 1000, tol = 1e-12, warnOnly = TRUE)), error = function(e) NULL)
  if (!is.null(n)) {
    r2 <- sum(all$w * residuals(n)^2)
    if (r2 < val) { val <- r2; best <- coef(n) }
  }
  list(rss = val, n_par = length(start), ic50 = exp(best[[length(best)]]))
}

run_tool(function() {
  p <- read_params()
  load_drc()
  df <- read_data(p$data)
  model <- need(p, "model", "Dose-response model")
  if (!model %in% DR_MODELS) fail(sprintf("model '%s' is not known. Choices: %s", model, paste(DR_MODELS, collapse = ", ")))
  ic50_type <- pick(p, "ic50_type", "relative")
  if (!ic50_type %in% c("relative", "absolute")) fail(paste("ic50_type must be relative or absolute, not", ic50_type))
  level <- as.numeric(pick(p, "response_level", 50))
  ci <- pick(p, "ci", "log")
  if (!ci %in% c("log", "delta")) fail(paste("ci must be log or delta, not", ci))
  alpha <- 1 - as.numeric(pick(p, "ci_level", 0.95))
  weighting <- pick(p, "weighting", "none")
  unit <- pick(p, "dose_unit", "")
  dose_col <- need_column(df, pick(p, "dose_col", if ("dose" %in% names(df)) "dose" else NULL), "dose_col")
  resp_col <- need_column(df, pick(p, "response_col", if ("response" %in% names(df)) "response" else NULL), "response_col")
  group_col <- pick(p, "group_col", NULL)
  if (!is.null(group_col)) need_column(df, group_col, "group_col")
  x <- numeric_column(df, dose_col, "dose_col")
  y <- numeric_column(df, resp_col, "response_col")
  g <- if (is.null(group_col)) rep("all", nrow(df)) else as.character(df[[group_col]])
  ok <- is.finite(x) & is.finite(y) & x >= 0
  dropped <- sum(!ok)
  d <- data.frame(x = x[ok], y = y[ok], g = g[ok], stringsAsFactors = FALSE)
  groups <- unique(d$g)
  rows <- list(); fits <- list(); metrics <- list(); warns <- character()
  for (gr in groups) {
    dg <- d[d$g == gr, ]
    if (length(unique(dg$x)) < 4) fail(sprintf("group '%s' has %d distinct doses. A %s fit needs at least 4.", gr, length(unique(dg$x)), model))
    fc <- fit_curve(dg$x, dg$y, model, weighting, paste("group", gr))
    fit <- fc$fit; par <- fc$par
    warns <- c(warns, fc$warnings)
    f <- curve_fun(par, model)
    pos <- dg$x[dg$x > 0]
    increasing <- f(max(pos)) > f(min(pos))
    lv <- if (ic50_type == "relative") 50 else level
    est <- tryCatch(ed_ci(fit, lv, ic50_type, ci, alpha, dg$x, dg$y, fc$w), error = function(e) rep(NA_real_, 4))
    rss <- sum((dg$y - f(dg$x))^2)
    extrap <- is.finite(est[1]) && (est[1] < min(pos) || est[1] > max(dg$x))
    if (extrap) warns <- c(warns, sprintf("group %s: the %s is outside the tested doses", gr, if (increasing) "EC50" else "IC50"))
    if (!is.finite(est[1])) warns <- c(warns, sprintf("group %s: the curve does not reach the response %g, so there is no absolute IC50", gr, lv))
    row <- data.frame(group = gr, n = nrow(dg), bottom = min(par$c, par$d), top = max(par$c, par$d), hill_slope = if (increasing) abs(par$b) else -abs(par$b), ic50 = est[1], se = est[2], ci_low = est[3], ci_high = est[4], log10_ic50 = log10(est[1]), r_squared = 1 - rss / sum((dg$y - mean(dg$y))^2), rse = sqrt(rss / df.residual(fit)), b = par$b, c = par$c, d = par$d, e = par$e, f = par$f, extrapolated = extrap, stringsAsFactors = FALSE)
    rows[[gr]] <- row
    fits[[gr]] <- list(fit = fit, par = par, d = dg, rss = sum(((dg$y - f(dg$x)) / if (is.null(fc$w)) 1 else fc$w)^2), k = length(coef(fit)))
    pre <- if (length(groups) > 1) paste0(clean_name(gr), "_") else ""
    for (k in c("ic50", "ci_low", "ci_high", "hill_slope", "bottom", "top", "r_squared", "rse", "b", "c", "d", "e")) metrics[[paste0(pre, k)]] <- row[[k]]
    if (model %in% c("5PL")) metrics[[paste0(pre, "f")]] <- par$f
  }
  res <- do.call(rbind, rows)
  metrics$n_groups <- length(groups)
  metrics$n_points <- nrow(d)
  metrics$n_dropped <- dropped
  test <- NULL
  if (length(groups) > 1 && isTRUE(as.logical(pick(p, "compare_ic50", FALSE)))) {
    full_rss <- sum(sapply(fits, `[[`, "rss")); full_k <- sum(sapply(fits, `[[`, "k"))
    red <- shared_e_test(fits, model, weighting)
    if (is.null(red)) warns <- c(warns, sprintf("the shared-IC50 test is not available for the model %s or did not converge", model))
    else {
      df2 <- nrow(d) - full_k; df1 <- full_k - red$n_par
      Fv <- ((red$rss - full_rss) / df1) / (full_rss / df2)
      test <- list(F = Fv, df1 = df1, df2 = df2, p = pf(Fv, df1, df2, lower.tail = FALSE))
      metrics$F_shared_ic50 <- Fv
      metrics$p_shared_ic50 <- test$p
      metrics$shared_ic50 <- red$ic50
    }
  }
  if (nzchar(out_path("results"))) write.csv(res, out_path("results"), row.names = FALSE)

  dev <- open_plot(out_path("plot"), out_path("plot_svg"))
  draw_both(dev, function() {
    pos <- d$x[d$x > 0]
    lo <- min(pos) / 10; hi <- max(pos) * 3
    grid <- exp(seq(log(lo), log(hi), length.out = 300))
    cols <- rep(c("#1f4e79", "#b03a2e", "#1e8449", "#7d3c98", "#b9770e", "#566573", "#17a589", "#922b21"), length.out = length(groups))
    curves <- lapply(groups, function(gr) curve_fun(fits[[gr]]$par, model)(grid))
    plot(log_axis_x(d$x), d$y, log = "x", xaxt = "n", type = "n", xlim = c(lo, hi), ylim = range(c(d$y, unlist(curves)), na.rm = TRUE), xlab = paste("Dose", if (nzchar(unit)) paste0("(", unit, ")") else ""), ylab = resp_col, main = paste(model, "dose-response"))
    log_ticks(lo, hi)
    for (i in seq_along(groups)) {
      dg <- fits[[groups[i]]]$d
      points(log_axis_x(c(dg$x, d$x))[seq_len(nrow(dg))], dg$y, pch = 15 + (i %% 4), col = cols[i])
      lines(grid, curves[[i]], col = cols[i], lwd = 2)
      if (is.finite(res$ic50[i])) abline(v = res$ic50[i], col = cols[i], lty = 3)
    }
    if (length(groups) > 1) legend("topright", groups, col = cols, pch = 15 + (seq_along(groups) %% 4), lwd = 2, bty = "n", cex = 0.8)
  })

  name <- if (all(res$hill_slope < 0)) "IC50" else if (all(res$hill_slope > 0)) "EC50" else "IC50 or EC50"
  u <- if (nzchar(unit)) paste0(" ", unit) else ""
  per <- paste(sprintf("%s: %s %.4g%s (%g%% CI %.4g to %.4g), Hill slope %.3g, bottom %.4g, top %.4g", res$group, name, res$ic50, u, 100 * (1 - alpha), res$ci_low, res$ci_high, res$hill_slope, res$bottom, res$top), collapse = "; ")
  emit(list(
    ok = TRUE,
    summary = sprintf("%s fit, %s %s, %s CI, weighting %s. %s%s%s", model, ic50_type, name, ci, weighting, per,
      if (!is.null(test)) sprintf(". Shared %s test: F %.3g on %d and %d df, p %.3g", name, test$F, test$df1, test$df2, test$p) else "",
      if (length(warns)) paste0(". Warnings: ", paste(warns, collapse = "; ")) else ""),
    metrics = metrics,
    data = list(results_file = out_path("results"), model = model, ic50_type = ic50_type, response_level = if (ic50_type == "absolute") level else NULL, ci = ci, warnings = as.list(warns), shared_ic50_test = test, drc_version = drc_version()),
    table = table_of(res, out_path("results")),
    outputs = plot_outputs(),
    manualRoute = sprintf("library(drc); fit <- drm(%s ~ %s, data = d, fct = %s, control = drmc(relTol = 1e-12)); ED(fit, %g, type = \"%s\", interval = \"delta\")", resp_col, dose_col, DRC_CALL[[model]], if (ic50_type == "relative") 50 else level, ic50_type)
  ))
})
