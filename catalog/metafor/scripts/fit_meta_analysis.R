args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_metafor()
  df <- read_studies(p$path)
  e <- effect_sizes(p, df)
  f <- fit_model(p, e)
  res <- f$res
  alpha <- as.numeric(pick(p, "alpha", 0.05))
  level <- 100 * (1 - alpha)
  pr <- predict(res, level = level)
  tf <- back(e$measure, p)
  m <- list(k = res$k, estimate = as.numeric(res$b), se = res$se, ci_lo = res$ci.lb, ci_hi = res$ci.ub, z = res$zval, p = res$pval,
            q = res$QE, q_df = res$k - 1, q_p = res$QEp, i2 = res$I2, h2 = res$H2)
  if (f$model == "random") {
    m$tau2 <- res$tau2
    m$tau2_se <- res$se.tau2
    m$tau <- sqrt(res$tau2)
    m$pi_lo <- pr$pi.lb
    m$pi_hi <- pr$pi.ub
  }
  if (!is.null(tf)) {
    m$effect <- tf(m$estimate)
    m$effect_ci_lo <- tf(m$ci_lo)
    m$effect_ci_hi <- tf(m$ci_hi)
    if (f$model == "random") {
      m$effect_pi_lo <- tf(m$pi_lo)
      m$effect_pi_hi <- tf(m$pi_hi)
    }
  }
  plot <- out_path("forest")
  png(plot, width = 1100, height = 300 + 32 * res$k, res = 110)
  if (is.null(tf)) forest(res, header = c("Study", "Estimate [CI]")) else forest(res, atransf = tf, header = c("Study", paste(e$measure, "[CI]")))
  dev.off()
  stat <- if (f$test == "knha") "t" else "z"
  fmt <- function(x) formatC(x, digits = 4, format = "fg", flag = "#")
  est <- if (is.null(tf)) sprintf("%s %s (%g%% CI %s to %s)", e$measure, fmt(m$estimate), level, fmt(m$ci_lo), fmt(m$ci_hi))
         else sprintf("%s %s (%g%% CI %s to %s); log scale %s (SE %s)", e$measure, fmt(m$effect), level, fmt(m$effect_ci_lo), fmt(m$effect_ci_hi), fmt(m$estimate), fmt(m$se))
  het <- sprintf("Heterogeneity: Q = %s on %d df, p = %s; I2 = %.2f%%; H2 = %s", fmt(m$q), m$q_df, format(signif(m$q_p, 4)), m$i2, fmt(m$h2))
  if (f$model == "random") {
    het <- paste0(het, sprintf("; tau2 = %s (SE %s)", fmt(m$tau2), fmt(m$tau2_se)))
    pi <- if (is.null(tf)) sprintf(" %g%% prediction interval %s to %s.", level, fmt(m$pi_lo), fmt(m$pi_hi)) else sprintf(" %g%% prediction interval %s to %s.", level, fmt(m$effect_pi_lo), fmt(m$effect_pi_hi))
  } else pi <- ""
  warn <- ""
  if (f$model == "fixed" && m$i2 > 50) warn <- sprintf(" Warning: I2 is %.0f%%. A fixed-effect model assumes one true effect for all studies.", m$i2)
  if (e$zero > 0) warn <- paste0(warn, sprintf(" %d studies have a zero cell; escalc added 0.5 to their cells.", e$zero))
  if (length(e$dropped)) warn <- paste0(warn, sprintf(" Studies with no effect size, left out: %s.", paste(e$dropped, collapse = ", ")))
  emit(list(
    ok = TRUE,
    summary = sprintf("Meta-analysis, %s model, %d studies: %s, %s = %s, p = %s. %s.%s%s", model_name(f), res$k, est, stat, fmt(m$z), format(signif(m$p, 4)), het, pi, warn),
    metrics = m,
    data = list(measure = e$measure, model = f$model, method = f$method, test = f$test, alpha = alpha, metafor_version = metafor_version(),
                studies = data.frame(study = e$labels[e$keep], yi = as.numeric(e$es$yi[e$keep]), vi = as.numeric(e$es$vi[e$keep]), weight = as.numeric(weights(res)))),
    outputs = list(list(path = plot, kind = "image", name = basename(plot))),
    manualRoute = sprintf("res <- rma(yi, vi, data = dat, method = \"%s\", test = \"%s\"); predict(res%s); forest(res)", f$method, f$test, if (is.null(tf)) "" else ", transf = exp")
  ))
})
