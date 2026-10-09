args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  suppressMessages(library(limma))
  dat <- read_table(p$data, "prepared protein table")
  des <- read_table(p$design, "design")
  need_column(dat, "id", "data (the column id)")
  need_column(des, "sample", "design (the column sample)")
  need_column(des, "group", "design (the column group)")
  samples <- intersect(des$sample, names(dat))
  if (length(samples) < nrow(des)) fail(sprintf("design lists samples that are not columns of the data: %s", paste(head(setdiff(des$sample, names(dat)), 6), collapse = ", ")))
  ga <- pick(p, "group_a", NULL); gb <- pick(p, "group_b", NULL)
  levels_found <- unique(des$group)
  if (is.null(ga) || is.null(gb)) fail(sprintf("give group_a and group_b. The log2 fold change is group_a minus group_b. Groups in the design: %s", paste(levels_found, collapse = ", ")))
  for (g in c(ga, gb)) if (!g %in% levels_found) fail(sprintf("group '%s' is not in the design. Groups: %s", g, paste(levels_found, collapse = ", ")))
  if (identical(ga, gb)) fail("group_a and group_b are the same group")

  variance <- pick(p, "variance_model", "standard")
  if (!variance %in% c("standard", "trend", "robust", "trend and robust")) fail(paste("variance_model must be standard, trend, robust or 'trend and robust', not", variance))
  fdr <- as.numeric(pick(p, "fdr", 0.05))
  if (!is.finite(fdr) || fdr <= 0 || fdr >= 1) fail("fdr must be a fraction between 0 and 1, such as 0.05")
  lfc_min <- as.numeric(pick(p, "min_abs_log2fc", 0))

  keep_samples <- des$sample[des$group %in% c(ga, gb)]
  grp <- factor(des$group[match(keep_samples, des$sample)], levels = c(gb, ga))
  y <- as.matrix(dat[, keep_samples, drop = FALSE]); rownames(y) <- dat$id
  batch_col <- pick(p, "batch_column", NULL)
  if (!is.null(batch_col)) {
    need_column(des, batch_col, "batch_column")
    batch <- factor(des[[batch_col]][match(keep_samples, des$sample)])
    design <- model.matrix(~ grp + batch)
  } else design <- model.matrix(~ grp)
  if (nrow(design) <= ncol(design)) fail(sprintf("%d samples are too few for %d model terms", nrow(design), ncol(design)))
  n_a <- sum(grp == ga); n_b <- sum(grp == gb)
  if (n_a < 2 || n_b < 2) fail(sprintf("each group needs 2 samples or more. %s has %d and %s has %d.", ga, n_a, gb, n_b))

  fit <- lmFit(y, design)
  fit <- eBayes(fit, trend = grepl("trend", variance), robust = grepl("robust", variance))
  tt <- topTable(fit, coef = 2, number = Inf, sort.by = "none", adjust.method = "BH")
  tt$id <- rownames(tt)
  res <- data.frame(id = tt$id, label = dat$label[match(tt$id, dat$id)], log2fc = tt$logFC, ave_expr = tt$AveExpr, t = tt$t, p_value = tt$P.Value, adj_p = tt$adj.P.Val, stringsAsFactors = FALSE)
  res$n_valid_a <- rowSums(!is.na(y[, grp == ga, drop = FALSE]))
  res$n_valid_b <- rowSums(!is.na(y[, grp == gb, drop = FALSE]))
  if ("n_imputed" %in% names(dat)) res$n_imputed <- dat$n_imputed[match(res$id, dat$id)]
  res$significant <- res$adj_p < fdr & abs(res$log2fc) >= lfc_min
  res$direction <- ifelse(res$significant, ifelse(res$log2fc > 0, "up", "down"), "ns")

  ann_col <- pick(p, "annotation_column", NULL)
  ann_pat <- pick(p, "annotation_pattern", NULL)
  metrics <- list()
  if (!is.null(ann_col) || !is.null(ann_pat)) {
    if (is.null(ann_col) || is.null(ann_pat)) fail("give both annotation_column and annotation_pattern, or neither")
    need_column(dat, ann_col, "annotation_column")
    hit <- tryCatch(grepl(ann_pat, dat[[ann_col]][match(res$id, dat$id)]), error = function(e) fail(sprintf("annotation_pattern '%s' is not a valid regular expression: %s", ann_pat, conditionMessage(e))))
    res$annotation_match <- hit
    metrics$n_tested_match <- sum(hit)
    metrics$n_up_match <- sum(res$direction == "up" & hit)
    metrics$n_up_other <- sum(res$direction == "up" & !hit)
    metrics$n_down_match <- sum(res$direction == "down" & hit)
    metrics$n_down_other <- sum(res$direction == "down" & !hit)
    if (sum(hit) == 0) fail(sprintf("annotation_pattern '%s' matches no protein in column '%s'", ann_pat, ann_col))
  }
  res <- res[order(res$p_value), ]
  metrics <- c(list(n_tested = nrow(res), n_significant = sum(res$significant), n_up = sum(res$direction == "up"), n_down = sum(res$direction == "down"),
                    n_a = n_a, n_b = n_b, fdr = fdr, min_abs_log2fc = lfc_min,
                    df_prior = round(mean(fit$df.prior), 4), s2_prior_median = round(median(fit$s2.prior), 6)), metrics)
  if (nzchar(out_path("results"))) write.csv(res, out_path("results"), row.names = FALSE)

  nlab <- as.integer(pick(p, "n_labels", 10))
  draw_both(out_path("plot"), out_path("plot_svg"), 6, 5, function() {
    par(mar = c(4, 4, 3, 1))
    col <- ifelse(res$direction == "up", "#b03a2e", ifelse(res$direction == "down", "#1f618d", "grey70"))
    plot(res$log2fc, -log10(res$p_value), pch = 16, cex = 0.5, col = col, xlab = sprintf("log2 fold change (%s minus %s)", ga, gb), ylab = "-log10 p value",
         main = sprintf("%s vs %s, FDR %s: %d up, %d down of %d", ga, gb, fdr, metrics$n_up, metrics$n_down, metrics$n_tested))
    if (lfc_min > 0) abline(v = c(-lfc_min, lfc_min), lty = 2, col = "grey50")
    sig_p <- res$p_value[res$significant]
    if (length(sig_p)) abline(h = -log10(max(sig_p)), lty = 3, col = "grey50")
    top <- head(res[res$significant, ], nlab)
    if (nrow(top)) text(top$log2fc, -log10(top$p_value), labels = ifelse(nzchar(top$label) & !is.na(top$label), top$label, top$id), cex = 0.6, pos = 3, xpd = NA)
  })

  fmt <- function(v) trimws(formatC(v, digits = 3, format = "g"))
  top5 <- head(res, 5)
  emit(list(
    ok = TRUE,
    summary = sprintf("limma %s, %s minus %s (%d vs %d samples), variance model %s%s, Benjamini-Hochberg FDR %s. %d proteins tested: %d significant, %d up and %d down. Prior degrees of freedom %s. Top: %s.%s",
                      pkg_version("limma"), ga, gb, n_a, n_b, variance, if (!is.null(batch_col)) paste0(", batch ", batch_col) else "", fdr,
                      nrow(res), metrics$n_significant, metrics$n_up, metrics$n_down, fmt(metrics$df_prior),
                      paste(sprintf("%s (log2FC %s, adj p %s)", ifelse(nzchar(top5$label) & !is.na(top5$label), top5$label, top5$id), fmt(top5$log2fc), fmt(top5$adj_p)), collapse = "; "),
                      if (!is.null(metrics$n_up_match)) sprintf(" Among the significant proteins, up: %d match the pattern and %d do not; down: %d match and %d do not.", metrics$n_up_match, metrics$n_up_other, metrics$n_down_match, metrics$n_down_other) else ""),
    metrics = metrics,
    data = list(results_file = out_path("results"), group_a = ga, group_b = gb, variance_model = variance, limma_version = pkg_version("limma")),
    table = table_of(res, out_path("results"), 15),
    outputs = c(plot_outputs(), if (nzchar(out_path("results"))) list(list(path = out_path("results"), kind = "table", name = basename(out_path("results"))))),
    manualRoute = sprintf("library(limma); design <- model.matrix(~ grp); fit <- eBayes(lmFit(y, design), trend = %s, robust = %s); topTable(fit, coef = 2, number = Inf, adjust.method = \"BH\")", grepl("trend", variance), grepl("robust", variance))
  ))
})
