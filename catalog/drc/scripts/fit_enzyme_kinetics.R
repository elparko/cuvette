args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

KIN_MODELS <- c("michaelis-menten", "competitive", "noncompetitive", "uncompetitive", "mixed")
FORMULAS <- list(
  competitive = v ~ Vmax * S / (Km * (1 + I / Ki) + S),
  noncompetitive = v ~ Vmax * S / ((Km + S) * (1 + I / Ki)),
  uncompetitive = v ~ Vmax * S / (Km + S * (1 + I / Ki)),
  mixed = v ~ Vmax * S / (Km * (1 + I / Ki) + S * (1 + I / (alpha * Ki)))
)

rate_fun <- function(model, co) function(S, I) switch(model,
  `michaelis-menten` = co[["Vmax"]] * S / (co[["Km"]] + S),
  competitive = co[["Vmax"]] * S / (co[["Km"]] * (1 + I / co[["Ki"]]) + S),
  noncompetitive = co[["Vmax"]] * S / ((co[["Km"]] + S) * (1 + I / co[["Ki"]])),
  uncompetitive = co[["Vmax"]] * S / (co[["Km"]] + S * (1 + I / co[["Ki"]])),
  mixed = co[["Vmax"]] * S / (co[["Km"]] * (1 + I / co[["Ki"]]) + S * (1 + I / (co[["alpha"]] * co[["Ki"]]))))

aicc_of <- function(rss, n, k) n * log(rss / n) + 2 * (k + 1) + 2 * (k + 1) * (k + 2) / (n - k - 2)

fit_mm <- function(d, where) {
  fc <- fit_curve_mm(d$S, d$v, where)
  co <- coef(fc)
  names(co) <- sub(":.*$", "", names(co))
  se <- sqrt(diag(jtj_vcov(fc, d$S, d$v)))
  list(fit = fc, est = c(Vmax = co[["d"]], Km = co[["e"]]), se = c(Vmax = se[[1]], Km = se[[2]]), df = df.residual(fc), rss = sum(residuals(fc)^2), k = 2)
}

fit_curve_mm <- function(S, v, where) {
  dd <- data.frame(x = S, y = v)
  env <- list(formula = y ~ x, data = dd, fct = MM.2(names = c("d", "e")), control = eval(CONTROL))
  fit <- tryCatch(do.call(drm, env), error = function(e) e)
  if (!inherits(fit, "drc")) fail(sprintf("the Michaelis-Menten fit on %s did not converge: %s", where, if (inherits(fit, "error")) conditionMessage(fit) else "drm returned no model"))
  refit_polished(env, fit, S, v, NULL)
}

fit_inhibition <- function(model, d, start) {
  st <- switch(model, mixed = c(start, alpha = 1), start)
  fit <- tryCatch(nls(FORMULAS[[model]], data = d, start = as.list(st), algorithm = "port", lower = rep(1e-12, length(st)), control = nls.control(maxiter = 1000, tol = 1e-10)), error = function(e) e)
  if (inherits(fit, "error")) return(list(error = conditionMessage(fit)))
  s <- summary(fit)$coefficients
  list(fit = fit, est = coef(fit), se = s[, 2], df = df.residual(fit), rss = sum(residuals(fit)^2), k = length(st))
}

run_tool(function() {
  p <- read_params()
  load_drc()
  df <- read_data(p$data)
  model <- need(p, "model", "Enzyme kinetic model")
  if (!model %in% KIN_MODELS) fail(sprintf("model '%s' is not known. Choices: %s", model, paste(KIN_MODELS, collapse = ", ")))
  alpha <- 1 - as.numeric(pick(p, "ci_level", 0.95))
  s_col <- need_column(df, pick(p, "substrate_col", if ("substrate" %in% names(df)) "substrate" else NULL), "substrate_col")
  v_col <- need_column(df, pick(p, "rate_col", if ("rate" %in% names(df)) "rate" else NULL), "rate_col")
  i_col <- pick(p, "inhibitor_col", NULL)
  if (!is.null(i_col)) need_column(df, i_col, "inhibitor_col")
  g_col <- pick(p, "group_col", NULL)
  if (!is.null(g_col)) need_column(df, g_col, "group_col")
  if (model != "michaelis-menten" && is.null(i_col)) fail(sprintf("the model %s needs inhibitor_col, the column with the inhibitor concentration of each row", model))
  d <- data.frame(S = numeric_column(df, s_col, "substrate_col"), v = numeric_column(df, v_col, "rate_col"))
  d$I <- if (is.null(i_col)) 0 else numeric_column(df, i_col, "inhibitor_col")
  d$g <- if (is.null(g_col)) "all" else as.character(df[[g_col]])
  ok <- is.finite(d$S) & is.finite(d$v) & is.finite(d$I) & d$S >= 0
  dropped <- sum(!ok)
  d <- d[ok, ]
  groups <- unique(d$g)
  rows <- list(); metrics <- list(); fits <- list(); comp <- NULL
  for (gr in groups) {
    dg <- d[d$g == gr, ]
    where <- if (length(groups) > 1) paste("group", gr) else p$data
    base <- dg[dg$I == 0, ]
    if (length(unique(base$S)) < 3) fail(sprintf("%s has %d substrate levels without inhibitor. A Michaelis-Menten fit needs at least 3.", where, length(unique(base$S))))
    mm <- fit_mm(base, where)
    if (model == "michaelis-menten") {
      if (any(dg$I != 0)) fail(sprintf("%s has rows with inhibitor. Choose an inhibition model, or give only the rows without inhibitor.", where))
      res <- mm
    } else {
      if (length(unique(dg$I)) < 2) fail(sprintf("%s has one inhibitor concentration. An inhibition model needs rows with and without inhibitor.", where))
      start <- c(Vmax = mm$est[["Vmax"]], Km = mm$est[["Km"]], Ki = median(dg$I[dg$I > 0]))
      all <- lapply(setNames(names(FORMULAS), names(FORMULAS)), function(m) fit_inhibition(m, dg, start))
      comp <- do.call(rbind, lapply(names(all), function(m) {
        a <- all[[m]]
        if (!is.null(a$error)) return(data.frame(group = gr, model = m, n_par = NA, rss = NA, aicc = NA, error = a$error, stringsAsFactors = FALSE))
        data.frame(group = gr, model = m, n_par = a$k, rss = a$rss, aicc = aicc_of(a$rss, nrow(dg), a$k), error = "", stringsAsFactors = FALSE)
      }))
      comp$delta_aicc <- comp$aicc - min(comp$aicc, na.rm = TRUE)
      res <- all[[model]]
      if (!is.null(res$error)) fail(sprintf("the %s model did not converge on %s: %s", model, where, res$error))
      for (i in seq_len(nrow(comp))) metrics[[paste0(if (length(groups) > 1) paste0(clean_name(gr), "_") else "", "aicc_", comp$model[i])]] <- comp$aicc[i]
    }
    q <- qt(1 - alpha / 2, res$df)
    tab <- data.frame(group = gr, parameter = names(res$est), estimate = unname(res$est), se = unname(res$se[names(res$est)]), stringsAsFactors = FALSE)
    tab$ci_low <- tab$estimate - q * tab$se
    tab$ci_high <- tab$estimate + q * tab$se
    rows[[gr]] <- tab
    fits[[gr]] <- list(d = dg, est = res$est)
    pre <- if (length(groups) > 1) paste0(clean_name(gr), "_") else ""
    for (i in seq_len(nrow(tab))) {
      k <- tab$parameter[i]
      metrics[[paste0(pre, k)]] <- tab$estimate[i]
      metrics[[paste0(pre, k, "_se")]] <- tab$se[i]
      metrics[[paste0(pre, k, "_ci_low")]] <- tab$ci_low[i]
      metrics[[paste0(pre, k, "_ci_high")]] <- tab$ci_high[i]
    }
    metrics[[paste0(pre, "rse")]] <- sqrt(res$rss / res$df)
    metrics[[paste0(pre, "n")]] <- nrow(dg)
  }
  tab <- do.call(rbind, rows)
  metrics$n_dropped <- dropped
  if (nzchar(out_path("results"))) write.csv(tab, out_path("results"), row.names = FALSE)

  dev <- open_plot(out_path("plot"), out_path("plot_svg"), width = 11, height = 5)
  draw_both(dev, function() {
    par(mfrow = c(1, 2))
    keys <- unique(paste(d$g, d$I, sep = "\r"))
    cols <- rep(c("#1f4e79", "#b03a2e", "#1e8449", "#7d3c98", "#b9770e", "#566573", "#17a589", "#922b21"), length.out = length(keys))
    sg <- seq(0, max(d$S) * 1.05, length.out = 200)
    plot(d$S, d$v, type = "n", xlab = s_col, ylab = v_col, main = paste(model, "fit"), ylim = c(0, max(d$v) * 1.1))
    for (i in seq_along(keys)) {
      gr <- strsplit(keys[i], "\r")[[1]][1]; iv <- as.numeric(strsplit(keys[i], "\r")[[1]][2])
      dd <- d[d$g == gr & d$I == iv, ]
      points(dd$S, dd$v, pch = 16, col = cols[i])
      lines(sg, rate_fun(model, fits[[gr]]$est)(sg, iv), col = cols[i], lwd = 2)
    }
    lab <- sapply(strsplit(keys, "\r"), function(k) paste0(if (length(groups) > 1) paste0(k[1], ", ") else "", if (is.null(i_col)) "" else paste0("I = ", k[2])))
    if (length(keys) > 1) legend("bottomright", lab, col = cols, pch = 16, lwd = 2, bty = "n", cex = 0.8)
    pos <- d[d$S > 0 & d$v > 0, ]
    plot(1 / pos$S, 1 / pos$v, type = "n", xlab = paste0("1 / ", s_col), ylab = paste0("1 / ", v_col), main = "Lineweaver-Burk view (not used for the fit)")
    for (i in seq_along(keys)) {
      gr <- strsplit(keys[i], "\r")[[1]][1]; iv <- as.numeric(strsplit(keys[i], "\r")[[1]][2])
      dd <- pos[pos$g == gr & pos$I == iv, ]
      points(1 / dd$S, 1 / dd$v, pch = 16, col = cols[i])
      s2 <- seq(min(pos$S), max(pos$S), length.out = 100)
      lines(1 / s2, 1 / rate_fun(model, fits[[gr]]$est)(s2, iv), col = cols[i])
    }
  })

  fmt <- function(v) trimws(formatC(v, digits = 4, format = "g"))
  per <- paste(sapply(groups, function(gr) {
    t <- tab[tab$group == gr, ]
    paste0(if (length(groups) > 1) paste0(gr, ": ") else "", paste(sprintf("%s %s (%g%% CI %s to %s)", t$parameter, fmt(t$estimate), 100 * (1 - alpha), fmt(t$ci_low), fmt(t$ci_high)), collapse = ", "))
  }), collapse = "; ")
  best <- if (!is.null(comp)) comp$model[which.min(comp$aicc)] else NULL
  emit(list(
    ok = TRUE,
    summary = sprintf("%s fit by nonlinear least squares on %d rows. %s%s%s", model, nrow(d), per, if (!is.null(best)) sprintf(". Lowest AICc among the inhibition models: %s", best) else "",
      if (!is.null(comp) && any(nzchar(comp$error))) paste0(". Not fitted: ", paste(sprintf("%s (%s)", comp$model[nzchar(comp$error)], comp$error[nzchar(comp$error)]), collapse = "; "), ". A mixed model that does not converge often has alpha going to infinity: the data fit the competitive model") else ""),
    metrics = metrics,
    data = list(results_file = out_path("results"), model = model, inhibition_models = if (is.null(comp)) NULL else lapply(seq_len(nrow(comp)), function(i) as.list(comp[i, ])), drc_version = drc_version()),
    table = table_of(tab, out_path("results")),
    outputs = plot_outputs(),
    manualRoute = if (model == "michaelis-menten") sprintf("library(drc); fit <- drm(%s ~ %s, data = d, fct = MM.2(), control = drmc(relTol = 1e-12)); summary(fit)  # d is Vmax, e is Km", v_col, s_col) else sprintf("nls(%s, data = d, start = list(Vmax = , Km = , Ki = ), algorithm = \"port\")", deparse(FORMULAS[[model]]))
  ))
})
