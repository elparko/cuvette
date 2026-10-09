args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_metafor()
  df <- read_studies(p$path)
  e <- effect_sizes(p, df)
  f <- fit_model(p, e)
  res <- f$res
  egger <- pick(p, "egger_model", "lm")
  if (!egger %in% c("lm", "rma")) fail("egger_model must be lm (the classic Egger test) or rma (the test in the fitted model).")
  rt <- regtest(res, model = egger)
  plot <- out_path("funnel")
  png(plot, width = 900, height = 750, res = 110)
  tf <- back(e$measure, p)
  if (is.null(tf)) funnel(res) else funnel(res, atransf = tf)
  dev.off()
  m <- list(k = res$k, egger_z = rt$zval, egger_p = rt$pval, limit_estimate = as.numeric(rt$est))
  if (!is.null(rt$dfs)) m$egger_df <- rt$dfs
  warn <- if (res$k < 10) sprintf(" Warning: %d studies. A funnel plot test has low power below 10 studies; do not read a large p as no small-study effect.", res$k) else ""
  stat <- if (egger == "lm") sprintf("t = %.4f on %d df", rt$zval, rt$dfs) else sprintf("z = %.4f", rt$zval)
  emit(list(
    ok = TRUE,
    summary = sprintf("Funnel plot and Egger regression test (%s), %s model, %d studies: %s, p = %.4g. Limit estimate %.4f.%s",
                      if (egger == "lm") "classic weighted regression, Egger 1997" else "in the fitted model", model_name(f), res$k, stat, rt$pval, as.numeric(rt$est), warn),
    metrics = m,
    data = list(measure = e$measure, model = f$model, method = f$method, egger_model = egger, metafor_version = metafor_version()),
    outputs = list(list(path = plot, kind = "image", name = basename(plot))),
    manualRoute = sprintf("res <- rma(yi, vi, data = dat, method = \"%s\"); funnel(res); regtest(res, model = \"%s\")", f$method, egger)
  ))
})
