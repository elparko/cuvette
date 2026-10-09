args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

NESTED <- list(c("3PL", "4PL"), c("4PL", "5PL"), c("4PL", "5PL-softmax"), c("4PL-normalized", "4PL"))

run_tool(function() {
  p <- read_params()
  load_drc()
  df <- read_data(p$data)
  models <- as_list_arg(pick(p, "models", NULL))
  if (length(models) < 2) fail(paste0("models needs two or more model names, such as 4PL, 5PL. Choices: ", paste(CURVE_MODELS, collapse = ", ")))
  bad <- setdiff(models, CURVE_MODELS)
  if (length(bad)) fail(sprintf("models has unknown names: %s. Choices: %s", paste(bad, collapse = ", "), paste(CURVE_MODELS, collapse = ", ")))
  weighting <- pick(p, "weighting", "none")
  x_col <- need_column(df, pick(p, "x_col", if ("conc" %in% names(df)) "conc" else NULL), "x_col")
  y_col <- need_column(df, pick(p, "y_col", if ("signal" %in% names(df)) "signal" else NULL), "y_col")
  x <- numeric_column(df, x_col, "x_col")
  y <- numeric_column(df, y_col, "y_col")
  keep <- rep(TRUE, nrow(df))
  type_col <- pick(p, "type_col", NULL)
  blank_mode <- pick(p, "blank", "none")
  where <- p$data
  if (!is.null(type_col)) {
    need_column(df, type_col, "type_col")
    kind <- type_of(df[[type_col]])
    if (!any(kind == "standard")) fail(sprintf("type_col '%s' has no standard rows. Values: %s", type_col, paste(head(unique(df[[type_col]]), 8), collapse = ", ")))
    if (blank_mode == "subtract") {
      b <- y[kind == "blank" & is.finite(y)]
      if (!length(b)) b <- y[kind == "standard" & x == 0 & is.finite(y)]
      if (!length(b)) fail("blank is subtract, but the data have no blank wells and no zero standard")
      y <- y - mean(b)
    }
    keep <- kind == "standard"
  }
  group_col <- pick(p, "group_col", NULL)
  group <- pick(p, "group", NULL)
  if (!is.null(group_col)) {
    need_column(df, group_col, "group_col")
    if (is.null(group)) fail(sprintf("group_col is set. Give group, one value of '%s': %s", group_col, paste(head(unique(df[[group_col]]), 10), collapse = ", ")))
    if (!group %in% as.character(df[[group_col]])) fail(sprintf("group '%s' is not a value of '%s'. Values: %s", group, group_col, paste(head(unique(df[[group_col]]), 10), collapse = ", ")))
    keep <- keep & as.character(df[[group_col]]) == group
    where <- paste0(where, ", group ", group)
  }
  ok <- keep & is.finite(x) & is.finite(y)
  x <- x[ok]; y <- y[ok]
  if (length(unique(x)) < 4) fail(sprintf("%s has %d distinct x values. A curve comparison needs at least 4.", where, length(unique(x))))

  n <- length(y)
  w <- weights_of(y, weighting)
  fits <- lapply(models, function(m) fit_curve(x, y, m, weighting, where))
  names(fits) <- models
  rows <- do.call(rbind, lapply(models, function(m) {
    fit <- fits[[m]]$fit
    k <- length(coef(fit))
    sw <- if (is.null(w)) rep(1, n) else w
    rss <- sum(((y - curve_fun(fits[[m]]$par, m)(x)) / sw)^2)
    aic <- n * log(rss / n) + 2 * (k + 1)
    aicc <- aic + 2 * (k + 1) * (k + 2) / (n - k - 2)
    lof <- tryCatch(modelFit(fit)[2, "p value"], error = function(e) NA)
    data.frame(model = m, n_par = k, df = n - k, rss = rss, rse = sqrt(rss / (n - k)), aic_drc = AIC(fit), aicc = aicc, lack_of_fit_p = lof, stringsAsFactors = FALSE)
  }))
  rows$delta_aicc <- rows$aicc - min(rows$aicc)
  tests <- list()
  for (pr in NESTED) {
    if (!all(pr %in% models)) next
    a <- rows[rows$model == pr[1], ]; b <- rows[rows$model == pr[2], ]
    if (b$df <= 0 || a$n_par >= b$n_par) next
    Fv <- ((a$rss - b$rss) / (b$n_par - a$n_par)) / (b$rss / b$df)
    pv <- pf(Fv, b$n_par - a$n_par, b$df, lower.tail = FALSE)
    tests[[length(tests) + 1]] <- list(simpler = pr[1], complex = pr[2], F = Fv, df1 = b$n_par - a$n_par, df2 = b$df, p = pv)
  }
  metrics <- list(n_points = n)
  for (i in seq_len(nrow(rows))) {
    k <- clean_name(rows$model[i])
    metrics[[paste0("rss_", k)]] <- rows$rss[i]
    metrics[[paste0("rse_", k)]] <- rows$rse[i]
    metrics[[paste0("aicc_", k)]] <- rows$aicc[i]
    metrics[[paste0("aic_", k)]] <- rows$aic_drc[i]
    metrics[[paste0("lack_of_fit_p_", k)]] <- rows$lack_of_fit_p[i]
  }
  for (t in tests) {
    metrics[[sprintf("F_%s_vs_%s", clean_name(t$simpler), clean_name(t$complex))]] <- t$F
    metrics[[sprintf("p_%s_vs_%s", clean_name(t$simpler), clean_name(t$complex))]] <- t$p
  }
  if (nzchar(out_path("table"))) write.csv(rows, out_path("table"), row.names = FALSE)

  dev <- open_plot(out_path("plot"), out_path("plot_svg"))
  draw_both(dev, function() {
    pos <- x[x > 0]
    lo <- min(pos) / 10; hi <- max(pos) * 3
    grid <- exp(seq(log(lo), log(hi), length.out = 300))
    curves <- lapply(models, function(m) curve_fun(fits[[m]]$par, m)(grid))
    plot(log_axis_x(x), y, log = "x", xaxt = "n", pch = 16, xlim = c(lo, hi), ylim = range(c(y, unlist(curves)), na.rm = TRUE), xlab = x_col, ylab = y_col, main = paste("Model comparison:", where))
    log_ticks(lo, hi)
    cols <- c("#1f4e79", "#b03a2e", "#1e8449", "#7d3c98", "#b9770e", "#566573", "#17a589")
    for (i in seq_along(models)) lines(grid, curves[[i]], col = cols[i], lwd = 2, lty = i)
    legend("topleft", sprintf("%s (AICc %.1f)", models, rows$aicc), col = cols[seq_along(models)], lty = seq_along(models), lwd = 2, bty = "n", cex = 0.8)
  })

  best <- rows$model[which.min(rows$aicc)]
  test_text <- if (length(tests)) paste(sapply(tests, function(t) sprintf("%s against %s: F %.3g on %d and %d df, p %.3g", t$complex, t$simpler, t$F, t$df1, t$df2, t$p)), collapse = "; ") else "no nested pair"
  emit(list(
    ok = TRUE,
    summary = sprintf("%d models on %d points of %s, weighting %s. Lowest AICc: %s. %s. Lack-of-fit p: %s", length(models), n, where, weighting, best, test_text, paste(sprintf("%s %.3g", rows$model, rows$lack_of_fit_p), collapse = ", ")),
    metrics = metrics,
    data = list(lowest_aicc = best, tests = tests, warnings = as.list(unlist(lapply(fits, `[[`, "warnings"))), drc_version = drc_version()),
    table = table_of(rows, out_path("table")),
    outputs = plot_outputs(),
    manualRoute = sprintf("library(drc); m1 <- drm(y ~ x, data = d, fct = %s); m2 <- drm(y ~ x, data = d, fct = %s); anova(m1, m2); AIC(m1, m2); modelFit(m2)", DRC_CALL[[models[1]]], DRC_CALL[[models[2]]])
  ))
})
