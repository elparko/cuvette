args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "mr_input.R"))

METHODS <- c("ivw", "egger", "weighted_median", "simple_median", "mode", "maxlik")

run_tool(function() {
  suppressMessages(library(MendelianRandomization))
  p <- read_params()
  inp <- load_mr_input(p)
  methods <- tolower(as_list_arg(pick(p, "methods", "ivw,egger,weighted_median")))
  if (!length(methods)) fail(sprintf("give methods. Choices: %s", paste(METHODS, collapse = ", ")))
  bad <- setdiff(methods, METHODS)
  if (length(bad)) fail(sprintf("method '%s' is not known. Choices: %s", bad[1], paste(METHODS, collapse = ", ")))
  n <- length(inp$bx)
  if (n < 3 && any(methods %in% c("egger", "weighted_median", "simple_median", "mode"))) fail(sprintf("%d variants remain after the exclusions. egger, the medians and mode need at least 3 variants.", n))
  correl <- !is.null(inp$corr)
  if (correl && any(methods %in% c("weighted_median", "simple_median", "mode"))) fail("the median and mode methods need uncorrelated variants. Remove them from methods, or give no correlation file after you prune the variants to independent ones.")
  model <- pick(p, "ivw_model", "default")
  if (!model %in% c("default", "random", "fixed")) fail(sprintf("ivw_model must be default, random or fixed, not '%s'", model))
  dist <- pick(p, "distribution", "normal")
  if (!dist %in% c("normal", "t-dist")) fail(sprintf("distribution must be normal or t-dist, not '%s'", dist))
  alpha <- as.numeric(pick(p, "alpha", 0.05))
  if (!is.finite(alpha) || alpha <= 0 || alpha >= 1) fail("alpha must be a number between 0 and 1 (a fraction), such as 0.05")
  seed <- as.integer(pick(p, "seed", 314159265))
  iterations <- as.integer(pick(p, "iterations", 10000))
  x <- if (correl) mr_input(bx = inp$bx, bxse = inp$bxse, by = inp$by, byse = inp$byse, exposure = inp$exposure, outcome = inp$outcome, snps = inp$snps, corr = inp$corr) else mr_input(bx = inp$bx, bxse = inp$bxse, by = inp$by, byse = inp$byse, exposure = inp$exposure, outcome = inp$outcome, snps = inp$snps)

  rows <- list(); metrics <- list(); notes <- character()
  add <- function(m, est, se, lo, hi, pv) {
    rows[[length(rows) + 1]] <<- data.frame(method = m, estimate = est, std_error = se, ci_low = lo, ci_high = hi, p_value = pv, stringsAsFactors = FALSE)
    metrics[[paste0(m, "_estimate")]] <<- est
    metrics[[paste0(m, "_se")]] <<- se
    metrics[[paste0(m, "_ci_low")]] <<- lo
    metrics[[paste0(m, "_ci_high")]] <<- hi
    metrics[[paste0(m, "_p")]] <<- pv
  }
  for (m in methods) {
    if (m == "ivw") {
      o <- if (correl) mr_ivw(x, model = model, correl = TRUE, distribution = dist, alpha = alpha) else mr_ivw(x, model = model, distribution = dist, alpha = alpha)
      add("ivw", o@Estimate, o@StdError, o@CILower, o@CIUpper, o@Pvalue)
      metrics$ivw_q <- unname(o@Heter.Stat[1]); metrics$ivw_q_p <- unname(o@Heter.Stat[2])
      metrics$ivw_q_df <- n - 1
      metrics$ivw_i2 <- if (is.finite(metrics$ivw_q) && metrics$ivw_q > 0) max(0, 100 * (metrics$ivw_q - (n - 1)) / metrics$ivw_q) else 0
      metrics$ivw_rse <- o@RSE
      metrics$f_statistic <- o@Fstat
      notes <- c(notes, sprintf("IVW %s model", o@Model))
    } else if (m == "egger") {
      o <- if (correl) mr_egger(x, correl = TRUE, distribution = dist, alpha = alpha) else mr_egger(x, distribution = dist, alpha = alpha)
      add("egger", o@Estimate, o@StdError.Est, o@CILower.Est, o@CIUpper.Est, o@Pvalue.Est)
      metrics$egger_intercept <- o@Intercept; metrics$egger_intercept_se <- o@StdError.Int; metrics$egger_intercept_p <- o@Pvalue.Int
      metrics$egger_q <- unname(o@Heter.Stat[1]); metrics$egger_q_df <- n - 2
      metrics$egger_rse <- o@RSE
      metrics$egger_i2_gx <- o@I.sq
    } else if (m == "weighted_median" || m == "simple_median") {
      o <- mr_median(x, weighting = if (m == "weighted_median") "weighted" else "simple", distribution = dist, alpha = alpha, iterations = iterations, seed = seed)
      add(m, o@Estimate, o@StdError, o@CILower, o@CIUpper, o@Pvalue)
    } else if (m == "mode") {
      o <- mr_mbe(x, distribution = dist, alpha = alpha, iterations = iterations, seed = seed)
      add("mode", o@Estimate, o@StdError, o@CILower, o@CIUpper, o@Pvalue)
    } else if (m == "maxlik") {
      o <- if (correl) mr_maxlik(x, correl = TRUE, distribution = dist, alpha = alpha) else mr_maxlik(x, distribution = dist, alpha = alpha)
      add("maxlik", o@Estimate, o@StdError, o@CILower, o@CIUpper, o@Pvalue)
      metrics$maxlik_q <- unname(o@Heter.Stat[1])
    }
  }
  tab <- do.call(rbind, rows)
  metrics$n_variants <- n
  metrics$n_excluded <- inp$n_excluded
  if (nzchar(out_path("estimates"))) write.csv(tab, out_path("estimates"), row.names = FALSE)

  warns <- character()
  if (!is.null(metrics$f_statistic) && metrics$f_statistic < 10) warns <- c(warns, sprintf("the F statistic %.1f is below 10, so the instruments can be weak", metrics$f_statistic))
  if (!is.null(metrics$egger_intercept_p) && metrics$egger_intercept_p < alpha) warns <- c(warns, sprintf("the MR-Egger intercept p value %.3g is below %.3g, which points to directional pleiotropy", metrics$egger_intercept_p, alpha))
  if (!is.null(metrics$ivw_q_p) && metrics$ivw_q_p < alpha) warns <- c(warns, sprintf("Cochran's Q p value %.3g is below %.3g, so the variant estimates differ more than chance allows", metrics$ivw_q_p, alpha))
  per <- paste(sprintf("%s %.3f (SE %.3f, %g%% CI %.3f to %.3f, p %.3g)", tab$method, tab$estimate, tab$std_error, 100 * (1 - alpha), tab$ci_low, tab$ci_high, tab$p_value), collapse = "; ")
  extra <- c(
    if (!is.null(metrics$ivw_q)) sprintf("Cochran's Q %.4f on %d df (p %.3g), I2 %.1f%%", metrics$ivw_q, n - 1, metrics$ivw_q_p, metrics$ivw_i2),
    if (!is.null(metrics$f_statistic)) sprintf("F statistic %.1f", metrics$f_statistic),
    if (!is.null(metrics$egger_intercept)) sprintf("Egger intercept %.4f (SE %.4f, p %.3g)", metrics$egger_intercept, metrics$egger_intercept_se, metrics$egger_intercept_p))
  emit(list(
    ok = TRUE,
    summary = sprintf("%d variants%s. %s. %s.%s", n, if (correl) " (correlated)" else "", per, paste(extra, collapse = "; "), if (length(warns)) paste0(" Warnings: ", paste(warns, collapse = "; "), ".") else ""),
    metrics = metrics,
    data = list(package_version = paste("MendelianRandomization", as.character(packageVersion("MendelianRandomization"))), methods = as.list(methods), distribution = dist, alpha = alpha, ivw_model = model, estimates_file = out_path("estimates"), warnings = as.list(warns), notes = as.list(notes), effect_scale = "Estimate is the change in the outcome (as the outcome beta scale, such as log odds) for one unit of the exposure beta scale"),
    table = table_of(tab, out_path("estimates")),
    manualRoute = "library(MendelianRandomization); x <- mr_input(bx, bxse, by, byse); mr_ivw(x); mr_egger(x); mr_median(x)"
  ))
})
