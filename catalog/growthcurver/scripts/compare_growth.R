args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

METRICS <- c("r", "k", "t_gen", "t_mid", "auc_e", "auc_l", "lag", "mumax")

ci_of <- function(v) {
  v <- v[is.finite(v)]
  n <- length(v)
  if (n < 2) return(c(NA, NA, NA, NA))
  se <- sd(v) / sqrt(n)
  q <- qt(0.975, n - 1)
  c(mean(v) - q * se, mean(v) + q * se, se, n)
}

run_tool(function() {
  p <- read_params()
  res <- read_table(p$results, "results")
  need_column(res, "well", "results (the column well)")
  metric <- pick(p, "metric", "r")
  if (!metric %in% METRICS) fail(sprintf("metric '%s' is not known. Choices: %s", metric, paste(METRICS, collapse = ", ")))
  need_column(res, metric, "metric")
  design <- if (is.null(p$design)) NULL else read_table(p$design, "design")
  if (!is.null(design)) need_column(design, "well", "design (the column well)")
  group_cols <- as_list_arg(p$group_cols)
  if (!length(group_cols)) fail("group_cols needs one or more design columns, such as strain or host, plasmid")
  d <- if (is.null(design)) res else merge(res[, c("well", metric)], design[, setdiff(names(design), metric), drop = FALSE], by = "well")
  for (g in group_cols) need_column(d, g, "group_cols")
  if (!nrow(d)) fail("no well of the results is in the design file. Check the well names in both files.")
  unmatched <- if (is.null(design)) character() else setdiff(res$well, design$well)
  exclude <- as_list_arg(p$exclude)
  d <- d[!d$well %in% exclude, ]
  d$value <- suppressWarnings(as.numeric(d[[metric]]))
  d <- d[is.finite(d$value), ]
  ref_col <- pick(p, "reference_col", group_cols[length(group_cols)])
  if (!ref_col %in% group_cols) fail(sprintf("reference_col '%s' must be one of group_cols: %s", ref_col, paste(group_cols, collapse = ", ")))
  reference <- pick(p, "reference", NULL)
  rel_to <- pick(p, "relative_to", "reference mean")
  if (!rel_to %in% c("reference mean", "same block")) fail(paste("relative_to must be 'reference mean' or 'same block', not", rel_to))
  block_col <- pick(p, "block_col", NULL)
  outer <- setdiff(group_cols, ref_col)
  okey <- if (length(outer)) do.call(paste, c(lapply(outer, function(g) as.character(d[[g]])), sep = " | ")) else rep("all", nrow(d))
  d$rel <- NA_real_
  if (!is.null(reference)) {
    if (!reference %in% as.character(d[[ref_col]])) fail(sprintf("reference '%s' is not a value of '%s'. Values: %s", reference, ref_col, paste(head(unique(d[[ref_col]]), 12), collapse = ", ")))
    is_ref <- as.character(d[[ref_col]]) == reference
    if (rel_to == "same block") {
      if (is.null(block_col)) fail("relative_to is 'same block', so give block_col, the design column with the plate column or block of each well")
      need_column(d, block_col, "block_col")
      bkey <- paste(okey, d[[block_col]], sep = " # ")
      refs <- tapply(d$value[is_ref], bkey[is_ref], function(v) if (length(v) == 1) v else NA)
      n_ref <- tapply(is_ref, bkey, sum)
      bad <- names(n_ref)[n_ref != 1]
      if (length(bad)) fail(sprintf("relative_to is 'same block', but %d block(s) have no reference well or more than one, such as %s. Exclude these wells, or use 'reference mean'.", length(bad), bad[1]))
      d$rel <- d$value / as.numeric(refs[bkey])
    } else {
      refs <- tapply(d$value[is_ref], okey[is_ref], mean)
      if (any(!okey %in% names(refs))) fail(sprintf("no reference well for: %s", paste(unique(okey[!okey %in% names(refs)]), collapse = ", ")))
      d$rel <- d$value / as.numeric(refs[okey])
    }
  }
  gkey <- do.call(paste, c(lapply(group_cols, function(g) as.character(d[[g]])), sep = " | "))
  groups <- unique(gkey)
  tab <- do.call(rbind, lapply(groups, function(k) {
    s <- d[gkey == k, ]
    ci <- ci_of(s$value)
    row <- as.list(s[1, group_cols, drop = FALSE])
    row <- c(row, list(n = nrow(s), mean = mean(s$value), sd = if (nrow(s) > 1) sd(s$value) else NA, ci_low = ci[1], ci_high = ci[2]))
    if (!is.null(reference)) {
      rc <- ci_of(s$rel)
      isref <- as.character(s[[ref_col]][1]) == reference
      tt <- if (!isref && sum(is.finite(s$rel)) >= 2 && sd(s$rel, na.rm = TRUE) > 0) t.test(s$rel, mu = 1) else NULL
      row <- c(row, list(rel_mean = mean(s$rel), rel_sd = if (nrow(s) > 1) sd(s$rel) else NA, rel_ci_low = rc[1], rel_ci_high = rc[2], t = if (is.null(tt)) NA else unname(tt$statistic), p = if (is.null(tt)) NA else tt$p.value))
    }
    as.data.frame(row, stringsAsFactors = FALSE, check.names = FALSE)
  }))
  metrics <- list(n_wells = nrow(d), n_groups = nrow(tab), n_unmatched = length(unmatched), n_excluded = length(exclude))
  for (i in seq_len(nrow(tab))) {
    k <- clean_name(groups[i])
    metrics[[paste0("mean_", k)]] <- tab$mean[i]
    if (!is.null(reference)) {
      metrics[[paste0("rel_mean_", k)]] <- tab$rel_mean[i]
      if (is.finite(tab$p[i])) metrics[[paste0("p_", k)]] <- tab$p[i]
    }
  }
  by_tab <- NULL; aov_res <- NULL
  summary_by <- pick(p, "summary_by", if (length(group_cols) > 1) group_cols[1] else NULL)
  if (!is.null(summary_by) && !is.null(reference)) {
    if (!summary_by %in% group_cols) fail(sprintf("summary_by '%s' must be one of group_cols: %s", summary_by, paste(group_cols, collapse = ", ")))
    nr <- tab[as.character(tab[[ref_col]]) != reference, ]
    by_tab <- do.call(rbind, lapply(unique(nr[[summary_by]]), function(l) {
      s <- nr[nr[[summary_by]] == l, ]
      data.frame(level = l, n_groups = nrow(s), mean_of_group_means = mean(s$rel_mean), sd = if (nrow(s) > 1) sd(s$rel_mean) else NA, stringsAsFactors = FALSE)
    }))
    for (i in seq_len(nrow(by_tab))) metrics[[paste0("rel_mean_by_", clean_name(by_tab$level[i]))]] <- by_tab$mean_of_group_means[i]
    if (nrow(by_tab) >= 2 && nrow(nr) > nrow(by_tab)) {
      a <- summary(aov(rel_mean ~ factor(nr[[summary_by]]), data = nr))[[1]]
      aov_res <- list(F = a[1, "F value"], df1 = a[1, "Df"], df2 = a[2, "Df"], p = a[1, "Pr(>F)"])
      metrics$anova_F <- aov_res$F; metrics$anova_p <- aov_res$p
    }
  }
  if (nzchar(out_path("groups"))) write.csv(tab, out_path("groups"), row.names = FALSE)
  if (nzchar(out_path("wells"))) write.csv(d, out_path("wells"), row.names = FALSE)

  y <- if (!is.null(reference)) d$rel else d$value
  draw_both(out_path("plot"), out_path("plot_svg"), width = max(6, 0.35 * length(groups) + 2), height = 4.5, function() {
    par(mar = c(max(5, min(14, max(nchar(groups)) * 0.45)), 4.5, 2, 1))
    x <- match(gkey, groups)
    plot(jitter(x, 0.4), y, pch = 16, col = "#1f4e7999", xaxt = "n", xlab = "", xlim = c(0.5, length(groups) + 0.5), ylab = if (!is.null(reference)) paste0(metric, " relative to ", reference) else metric, main = paste("Growth", metric, "by group"))
    axis(1, at = seq_along(groups), labels = groups, las = 2, cex.axis = 0.7)
    m <- if (!is.null(reference)) tab$rel_mean else tab$mean
    lo <- if (!is.null(reference)) tab$rel_ci_low else tab$ci_low
    hi <- if (!is.null(reference)) tab$rel_ci_high else tab$ci_high
    points(seq_along(groups), m, pch = 18, cex = 1.6, col = "#b03a2e")
    ok <- is.finite(lo) & is.finite(hi) & hi > lo
    if (any(ok)) arrows(seq_along(groups)[ok], lo[ok], seq_along(groups)[ok], hi[ok], angle = 90, code = 3, length = 0.04, col = "#b03a2e")
    if (!is.null(reference)) abline(h = 1, lty = 2, col = "grey40")
  })

  fmt <- function(v) trimws(formatC(v, digits = 4, format = "g"))
  per <- paste(head(sprintf("%s: n %d, mean %s %s%s", groups, tab$n, metric, fmt(tab$mean), if (!is.null(reference)) sprintf(", relative %s (95%% CI %s to %s, p vs 1 %s)", sapply(tab$rel_mean, fmt), sapply(tab$rel_ci_low, fmt), sapply(tab$rel_ci_high, fmt), sapply(tab$p, fmt)) else ""), 30), collapse = "; ")
  emit(list(
    ok = TRUE,
    summary = sprintf("%d wells in %d groups, metric %s%s. %s%s%s%s", nrow(d), nrow(tab), metric, if (!is.null(reference)) sprintf(", relative to %s=%s (%s)", ref_col, reference, rel_to) else "", per,
      if (!is.null(by_tab)) paste0(". Mean of the group means by ", summary_by, ": ", paste(sprintf("%s %s (%d groups)", by_tab$level, sapply(by_tab$mean_of_group_means, fmt), by_tab$n_groups), collapse = ", ")) else "",
      if (!is.null(aov_res)) sprintf(". One-way ANOVA of the group means: F %s on %d and %d df, p %s", fmt(aov_res$F), aov_res$df1, aov_res$df2, fmt(aov_res$p)) else "",
      if (length(unmatched)) sprintf(". %d well(s) of the results are not in the design, such as %s", length(unmatched), unmatched[1]) else ""),
    metrics = metrics,
    data = list(groups_file = out_path("groups"), wells_file = out_path("wells"), metric = metric, reference = reference, relative_to = rel_to, by = if (is.null(by_tab)) NULL else lapply(seq_len(nrow(by_tab)), function(i) as.list(by_tab[i, ])), anova = aov_res),
    table = table_of(tab, out_path("groups")),
    outputs = plot_outputs(),
    manualRoute = sprintf("d <- merge(read.csv(\"results.csv\"), read.csv(\"design.csv\")); d$rel <- d$%s / <%s of %s=%s>; aggregate(rel ~ %s, d, mean); t.test(d$rel[<group>], mu = 1)", metric, if (rel_to == "same block") "the reference well of the same block" else "the mean", ref_col, if (is.null(reference)) "" else reference, paste(group_cols, collapse = " + "))
  ))
})
