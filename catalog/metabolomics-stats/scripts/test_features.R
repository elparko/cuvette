args <- commandArgs(FALSE)
here <- dirname(sub("^--file=", "", args[grep("^--file=", args)]))
source(file.path(here, "lib.R"))
source(file.path(here, "table_lib.R"))

run_tool(function() {
  p <- read_params()
  tb <- load_prepared(p)
  x <- tb$x
  test <- pick(p, "test", "")
  valid <- c("welch", "student", "wilcoxon", "anova", "kruskal", "pearson", "spearman")
  if (!test %in% valid) fail(sprintf("test '%s' is not valid. Valid: %s. This is the decision 'Univariate test'.", test, paste(valid, collapse = ", ")))
  adjust <- pick(p, "adjust", "BH")
  if (!adjust %in% p.adjust.methods) fail(sprintf("adjust '%s' is not valid. Valid: %s", adjust, paste(p.adjust.methods, collapse = ", ")))
  fdr <- as.numeric(pick(p, "fdr", 0.05))
  lfc_min <- as.numeric(pick(p, "min_abs_log2fc", 0))
  values_are <- pick(p, "values_are", "")
  if (!values_are %in% c("linear", "log2", "log10", "other")) fail(sprintf("values_are '%s' is not valid. Valid: linear, log2, log10, other. Say how the table values were transformed.", values_are))
  resp <- tb$resp
  numeric_test <- test %in% c("pearson", "spearman")
  if (numeric_test && !is.numeric(resp)) fail(sprintf("test %s needs a numeric response_column and '%s' holds text. Use welch, wilcoxon, anova or kruskal for groups.", test, tb$resp_col))
  if (!numeric_test && is.numeric(resp)) fail(sprintf("test %s needs a group column and '%s' is numeric. Use pearson or spearman.", test, tb$resp_col))

  fc_of <- function(ma, mb) switch(values_are, linear = log2(ma / mb), log2 = ma - mb, log10 = (ma - mb) * log2(10), NA_real_)
  ga <- gb <- NULL
  if (test %in% c("welch", "student", "wilcoxon")) {
    ga <- pick(p, "group_a", ""); gb <- pick(p, "group_b", "")
    lv <- unique(as.character(resp))
    for (g in c(ga, gb)) if (!g %in% lv) fail(sprintf("group '%s' is not in column '%s'. Groups: %s", g, tb$resp_col, paste(lv, collapse = ", ")))
    ia <- as.character(resp) == ga; ib <- as.character(resp) == gb
    if (sum(ia) < 2 || sum(ib) < 2) fail(sprintf("each group needs 2 or more samples. %s has %d and %s has %d.", ga, sum(ia), gb, sum(ib)))
  }
  stat_p <- t(vapply(seq_len(ncol(x)), function(j) {
    v <- x[, j]
    r <- tryCatch(switch(test,
      welch = { h <- t.test(v[ia], v[ib], var.equal = FALSE); c(h$statistic, h$p.value) },
      student = { h <- t.test(v[ia], v[ib], var.equal = TRUE); c(h$statistic, h$p.value) },
      wilcoxon = { h <- wilcox.test(v[ia], v[ib], exact = FALSE, correct = TRUE); c(h$statistic, h$p.value) },
      anova = { a <- summary(aov(v ~ factor(resp)))[[1]]; c(a[1, "F value"], a[1, "Pr(>F)"]) },
      kruskal = { h <- kruskal.test(v ~ factor(resp)); c(h$statistic, h$p.value) },
      pearson = { h <- cor.test(v, resp, method = "pearson"); c(h$estimate, h$p.value) },
      spearman = { h <- suppressWarnings(cor.test(v, resp, method = "spearman", exact = FALSE)); c(h$estimate, h$p.value) }),
      error = function(e) c(NA_real_, NA_real_))
    as.numeric(r)
  }, numeric(2)))
  res <- data.frame(feature = colnames(x), statistic = stat_p[, 1], p_value = stat_p[, 2], stringsAsFactors = FALSE)
  n_failed <- sum(is.na(res$p_value))
  res$adj_p <- p.adjust(res$p_value, method = adjust)
  if (!is.null(ga)) {
    res$mean_a <- colMeans(x[ia, , drop = FALSE]); res$mean_b <- colMeans(x[ib, , drop = FALSE])
    res$log2fc <- fc_of(res$mean_a, res$mean_b)
    if (lfc_min > 0 && values_are == "other") fail("min_abs_log2fc needs values_are linear, log2 or log10 to compute a fold change. Set min_abs_log2fc to 0.")
  } else {
    res$log2fc <- NA_real_
  }
  sig <- !is.na(res$adj_p) & res$adj_p < fdr
  if (lfc_min > 0 && !is.null(ga)) sig <- sig & !is.na(res$log2fc) & abs(res$log2fc) >= lfc_min
  res$significant <- sig
  res$direction <- ifelse(!sig, "ns", if (!is.null(ga)) ifelse(res$log2fc > 0, "up", "down") else ifelse(res$statistic > 0, "up", "down"))
  res <- res[order(res$p_value), ]
  if (nzchar(out_path("results"))) write.csv(res, out_path("results"), row.names = FALSE)

  if (!is.null(ga)) {
    draw_both(out_path("plot"), out_path("plot_svg"), 6, 5, function() {
      par(mar = c(4, 4, 3, 1))
      col <- ifelse(res$direction == "up", "#b03a2e", ifelse(res$direction == "down", "#1f618d", "grey70"))
      xv <- if (values_are == "other") res$statistic else res$log2fc
      plot(xv, -log10(res$p_value), pch = 16, cex = 0.6, col = col, xlab = if (values_are == "other") "test statistic" else sprintf("log2 fold change (%s over %s)", ga, gb), ylab = "-log10 p value",
           main = sprintf("%s: %d up, %d down of %d", test, sum(res$direction == "up"), sum(res$direction == "down"), nrow(res)))
      top <- head(res[res$significant, ], 8)
      if (nrow(top)) text(if (values_are == "other") top$statistic else top$log2fc, -log10(top$p_value), labels = top$feature, cex = 0.55, pos = 3, xpd = NA)
    })
  }
  metrics <- list(n_tested = nrow(res), n_failed = n_failed, n_significant = sum(res$significant), n_up = sum(res$direction == "up"), n_down = sum(res$direction == "down"), n_raw_p_below_alpha = sum(res$p_value < fdr, na.rm = TRUE), fdr = fdr)
  if (!is.null(ga)) metrics <- c(metrics, list(n_a = sum(ia), n_b = sum(ib)))
  top5 <- head(res, 5)
  emit(list(
    ok = TRUE,
    summary = sprintf("%s test on %d features%s, %s adjustment, level %s. %d significant (%d up, %d down); %d have a raw p below the level. Top: %s.%s",
      test, nrow(res), if (!is.null(ga)) sprintf(", %s (%d samples) against %s (%d samples)", ga, sum(ia), gb, sum(ib)) else sprintf(", response %s", tb$resp_col), adjust, fmt_num(fdr),
      metrics$n_significant, metrics$n_up, metrics$n_down, metrics$n_raw_p_below_alpha,
      paste(sprintf("%s (p %s, adj p %s%s)", top5$feature, fmt_num(top5$p_value), fmt_num(top5$adj_p), ifelse(is.na(top5$log2fc), "", sprintf(", log2FC %s", fmt_num(top5$log2fc)))), collapse = "; "),
      if (n_failed > 0) sprintf(" %d feature(s) gave no p value because the test failed.", n_failed) else ""),
    metrics = metrics,
    data = list(test = test, adjust = adjust, results_file = out_path("results"), values_are = values_are),
    table = table_of(res, out_path("results"), 15),
    outputs = c(if (!is.null(ga)) plot_outputs(), if (nzchar(out_path("results"))) list(list(path = out_path("results"), kind = "table", name = basename(out_path("results"))))),
    manualRoute = sprintf("MetaboAnalyst: Statistical Analysis, Univariate Analysis, T-tests (or Wilcoxon), FDR adjusted p. R: apply(x, 2, function(v) %s); p.adjust(p, \"%s\")", switch(test, welch = "t.test(v[a], v[b])$p.value", student = "t.test(v[a], v[b], var.equal = TRUE)$p.value", wilcoxon = "wilcox.test(v[a], v[b], exact = FALSE)$p.value", anova = "summary(aov(v ~ g))[[1]][1, 5]", kruskal = "kruskal.test(v ~ g)$p.value", sprintf("cor.test(v, y, method = \"%s\")$p.value", test)), adjust)
  ))
})
