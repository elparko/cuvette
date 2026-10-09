args <- commandArgs(FALSE)
here <- dirname(sub("^--file=", "", args[grep("^--file=", args)]))
source(file.path(here, "lib.R"))
source(file.path(here, "lib_flow.R"))

METRICS <- c("percent_of_parent", "median_all", "median_positive", "median_negative", "mean_all", "n_events")

run_tool(function() {
  p <- read_params()
  st <- read_table(p$stats, "stats")
  need_column(st, "sample", "stats (the column sample)")
  need_column(st, "population", "stats (the column population)")
  metric <- pick(p, "metric", "percent_of_parent")
  if (!metric %in% METRICS) fail(sprintf("metric '%s' is not known. Choices: %s", metric, paste(METRICS, collapse = ", ")))
  need_column(st, metric, "metric")
  dup <- st[duplicated(st[, c("sample", "population")]), ]
  if (nrow(dup)) fail(sprintf("the stats table has the sample '%s' more than once for the population '%s'. Run population_stats again with each file once.", dup$sample[1], dup$population[1]))
  des <- read_table(p$design, "design")
  need_column(des, "sample", "design (the column sample)")
  group_col <- need_column(des, pick(p, "group_col", "group"), "group_col")
  test <- pick(p, "test", "welch")
  if (!test %in% c("welch", "student", "mann-whitney", "paired")) fail("test must be welch, student, mann-whitney or paired")
  adjust <- pick(p, "adjust", "holm")
  if (!adjust %in% c("holm", "BH", "bonferroni", "none")) fail("adjust must be holm, BH, bonferroni or none")
  pair_col <- pick(p, "pair_col", NULL)
  if (test == "paired") need_column(des, pair_col, "pair_col")
  pops <- as_list_arg(p$populations)
  if (!length(pops)) pops <- unique(st$population)
  bad <- setdiff(pops, st$population)
  if (length(bad)) fail(sprintf("population '%s' is not in the stats table. Populations: %s", bad[1], paste(head(unique(st$population), 15), collapse = ", ")))
  d <- merge(st[st$population %in% pops, c("sample", "population", metric)], des, by = "sample")
  if (!nrow(d)) fail("no sample of the stats table is in the design file. Check the sample names in both files.")
  names(d)[names(d) == metric] <- "value"
  d$group <- as.character(d[[group_col]])
  ref <- pick(p, "reference", NULL)

  grp_rows <- list()
  cmp_rows <- list()
  for (pp in pops) {
    dd <- d[d$population == pp & is.finite(d$value), ]
    levs <- sort(unique(dd$group))
    if (!is.null(ref)) {
      if (!ref %in% levs) fail(sprintf("reference '%s' is not a value of %s. Values: %s", ref, group_col, paste(levs, collapse = ", ")))
      levs <- c(ref, setdiff(levs, ref))
    }
    for (g in levs) {
      v <- dd$value[dd$group == g]
      grp_rows[[length(grp_rows) + 1]] <- data.frame(population = pp, group = g, n = length(v), mean = mean(v), sd = if (length(v) > 1) sd(v) else NA, sem = if (length(v) > 1) sd(v) / sqrt(length(v)) else NA, median = median(v), stringsAsFactors = FALSE)
    }
    pairs <- if (!is.null(ref)) lapply(setdiff(levs, ref), function(g) c(ref, g)) else combn(levs, 2, simplify = FALSE)
    for (pr in pairs) {
      a <- dd[dd$group == pr[1], ]
      b <- dd[dd$group == pr[2], ]
      if (nrow(a) < 2 || nrow(b) < 2) next
      res <- if (test == "paired") {
        m <- merge(a[, c(pair_col, "value")], b[, c(pair_col, "value")], by = pair_col)
        tryCatch(t.test(m$value.y, m$value.x, paired = TRUE), error = function(e) NULL)
      } else if (test == "mann-whitney") {
        tryCatch(wilcox.test(b$value, a$value, exact = FALSE, conf.int = FALSE), error = function(e) NULL)
      } else tryCatch(t.test(b$value, a$value, var.equal = test == "student"), error = function(e) NULL)
      if (is.null(res)) next
      cmp_rows[[length(cmp_rows) + 1]] <- data.frame(population = pp, group_a = pr[1], group_b = pr[2], mean_a = mean(a$value), mean_b = mean(b$value), difference_b_minus_a = mean(b$value) - mean(a$value),
        ci_low = if (!is.null(res$conf.int)) res$conf.int[1] else NA, ci_high = if (!is.null(res$conf.int)) res$conf.int[2] else NA, statistic = unname(res$statistic), df = if (!is.null(res$parameter)) unname(res$parameter) else NA, p_value = res$p.value, stringsAsFactors = FALSE)
    }
  }
  grp <- do.call(rbind, grp_rows)
  cmp <- if (length(cmp_rows)) do.call(rbind, cmp_rows) else data.frame()
  if (nrow(cmp)) cmp$p_adjusted <- p.adjust(cmp$p_value, adjust)
  write.csv(grp, out_path("groups"), row.names = FALSE)
  if (nrow(cmp)) write.csv(cmp, out_path("comparisons"), row.names = FALSE)

  draw_both(out_path("plot"), out_path("plot_svg"), width = max(6, 1.2 * length(pops) * length(unique(grp$group)) / 2 + 2), height = 4.5, function() {
    par(mar = c(7, 4.5, 2, 1))
    lab <- paste(grp$population, grp$group)
    x <- seq_len(nrow(grp))
    plot(NA, xlim = c(0.5, nrow(grp) + 0.5), ylim = range(c(d$value[d$population %in% pops], 0), na.rm = TRUE), xaxt = "n", xlab = "", ylab = metric)
    axis(1, at = x, labels = lab, las = 2, cex.axis = 0.7)
    for (i in x) {
      v <- d$value[d$population == grp$population[i] & d$group == grp$group[i]]
      points(jitter(rep(i, length(v)), 0.3), v, pch = 16, col = "#1f4e7999")
      segments(i - 0.3, grp$mean[i], i + 0.3, grp$mean[i], lwd = 2, col = "#b03a2e")
    }
  })

  metrics <- list(n_populations = length(pops), n_comparisons = nrow(cmp))
  for (i in seq_len(nrow(grp))) {
    tag <- paste(pop_tag(grp$population[i]), clean_name(grp$group[i]), sep = "_")
    metrics[[paste0("mean_", tag)]] <- grp$mean[i]
    metrics[[paste0("sd_", tag)]] <- grp$sd[i]
    metrics[[paste0("n_", tag)]] <- grp$n[i]
  }
  for (i in seq_len(nrow(cmp))) {
    tag <- paste(pop_tag(cmp$population[i]), clean_name(cmp$group_a[i]), clean_name(cmp$group_b[i]), sep = "_")
    metrics[[paste0("p_", tag)]] <- cmp$p_value[i]
    metrics[[paste0("padj_", tag)]] <- cmp$p_adjusted[i]
    metrics[[paste0("diff_", tag)]] <- cmp$difference_b_minus_a[i]
  }
  fmt <- function(v) trimws(formatC(v, digits = 4, format = "g"))
  per <- if (nrow(cmp)) paste(head(sprintf("%s, %s against %s: difference %s, p %s (%s %s)", cmp$population, cmp$group_b, cmp$group_a, fmt(cmp$difference_b_minus_a), fmt(cmp$p_value), adjust, fmt(cmp$p_adjusted)), 20), collapse = "; ") else "no comparison (a group has fewer than 2 samples)"
  emit(list(
    ok = TRUE,
    summary = sprintf("%s of %d populations in groups of %s. Test: %s. %s.", metric, length(pops), group_col, test, per),
    metrics = metrics,
    data = list(groups_file = out_path("groups"), comparisons_file = if (nrow(cmp)) out_path("comparisons") else NULL, test = test, adjust = adjust),
    table = table_of(if (nrow(cmp)) cmp else grp, out_path("groups")),
    outputs = plot_outputs(),
    manualRoute = "Prism: Column table with one column for each group. Analyze, t tests (Welch, unpaired) or Mann-Whitney. Excel: T.TEST(range1, range2, 2, 3) for Welch."
  ))
})
