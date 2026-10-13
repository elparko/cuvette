args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "mr_input.R"))

run_tool(function() {
  suppressMessages(library(MendelianRandomization))
  p <- read_params()
  inp <- load_mr_input(p)
  n <- length(inp$bx)
  if (n < 3) fail(sprintf("%d variants remain. The check needs at least 3 variants.", n))
  if (!is.null(inp$corr)) fail("check_variants needs uncorrelated variants. Give no correlation file.")
  alpha <- as.numeric(pick(p, "alpha", 0.05))
  min_f <- as.numeric(pick(p, "min_f", 10))
  model <- pick(p, "ivw_model", "default")
  if (!model %in% c("default", "random", "fixed")) fail(sprintf("ivw_model must be default, random or fixed, not '%s'", model))
  ratio <- inp$by / inp$bx
  ratio_se <- inp$byse / abs(inp$bx)
  w <- 1 / ratio_se^2
  ivw_all <- sum(w * ratio) / sum(w)
  q_i <- w * (ratio - ivw_all)^2
  f_i <- (inp$bx / inp$bxse)^2
  loo <- vapply(seq_len(n), function(i) {
    o <- mr_ivw(mr_input(bx = inp$bx[-i], bxse = inp$bxse[-i], by = inp$by[-i], byse = inp$byse[-i]), model = model)
    c(o@Estimate, o@StdError)
  }, numeric(2))
  full <- mr_ivw(mr_input(bx = inp$bx, bxse = inp$bxse, by = inp$by, byse = inp$byse), model = model)
  q_crit <- qchisq(1 - alpha, 1)
  tab <- data.frame(snp = inp$snps, beta_exposure = inp$bx, beta_outcome = inp$by, wald_ratio = ratio, wald_ratio_se = ratio_se, f_statistic = f_i, q_contribution = q_i, ivw_without = loo[1, ], ivw_without_se = loo[2, ], shift = loo[1, ] - full@Estimate, stringsAsFactors = FALSE)
  tab$flag <- ifelse(f_i < min_f, "weak instrument", ifelse(q_i > q_crit, "outlier in Q", ""))
  tab <- tab[order(-tab$q_contribution), ]
  if (nzchar(out_path("variants"))) write.csv(tab, out_path("variants"), row.names = FALSE)
  n_weak <- sum(f_i < min_f); n_out <- sum(q_i > q_crit)
  top <- tab[1, ]
  emit(list(
    ok = TRUE,
    summary = sprintf("%d variants. IVW estimate %.3f. %d variants have F below %g. %d variants have a Q contribution above %.2f (chi-square, 1 df, alpha %g). Largest Q contribution: %s (%.2f); the IVW estimate without it is %.3f.", n, full@Estimate, n_weak, min_f, n_out, q_crit, alpha, top$snp, top$q_contribution, top$ivw_without),
    metrics = list(n_variants = n, ivw_estimate = full@Estimate, n_weak = n_weak, n_outliers = n_out, q_total = sum(q_i), q_critical = q_crit, max_q_contribution = top$q_contribution, min_f = min(f_i), max_abs_shift = max(abs(tab$shift))),
    data = list(variants_file = out_path("variants"), top_variant = top$snp, min_f_threshold = min_f),
    table = table_of(tab, out_path("variants")),
    manualRoute = "R: ratio <- by/bx; w <- bx^2/byse^2; Q_i <- w*(ratio - weighted.mean(ratio, w))^2; for each i drop variant i and rerun mr_ivw()"
  ))
})
