args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_vegan()
  inp <- apply_filter(load_inputs(p), pick(p, "sample_filter", NULL))
  m <- inp$m
  md <- inp$md
  depth_in <- pick(p, "rarefy_depth", "none")
  seed <- as.integer(pick(p, "seed", 1))
  index <- pick(p, "index", "shannon")
  dropped <- character()
  rarefied <- FALSE
  if (!identical(as.character(depth_in), "none")) {
    depth <- as.integer(depth_in)
    if (is.na(depth) || depth < 1) fail(paste0("rarefy_depth must be none or a whole number of reads above 0. Got: ", depth_in))
    if (!is_whole(m)) fail("rarefaction needs whole-number counts. This table has fractions. Use rarefy_depth none.")
    keep <- rowSums(m) >= depth
    dropped <- rownames(m)[!keep]
    if (sum(keep) < 2) fail(sprintf("only %d samples have %d reads or more. The deepest sample has %d reads. Lower the rarefaction depth.", sum(keep), depth, max(rowSums(m))))
    m <- m[keep, , drop = FALSE]
    md <- md[keep, , drop = FALSE]
    set.seed(seed)
    m <- vegan::rrarefy(m, depth)
    rarefied <- TRUE
  }
  S <- specnumber(m)
  H <- diversity(m, "shannon")
  est <- if (is_whole(m)) t(estimateR(m)) else NULL
  df <- data.frame(sample = rownames(m), reads = rowSums(m), observed = S, shannon = H, simpson = diversity(m, "simpson"), invsimpson = diversity(m, "invsimpson"), pielou = ifelse(S > 1, H / log(S), NA), chao1 = if (is.null(est)) NA else est[, "S.chao1"], row.names = NULL)
  main <- df[[index]]
  if (all(is.na(main))) fail(paste0("the index ", index, " needs whole-number counts. Use another index."))
  metrics <- list(n_samples = nrow(df), n_dropped = length(dropped), mean_index = mean(main, na.rm = TRUE), median_index = median(main, na.rm = TRUE), first_sample_index = main[1], mean_observed = mean(S))
  data <- list(index = index, rarefied = rarefied, rarefy_depth = depth_in, seed = seed, dropped_samples = dropped, vegan_version = as.character(packageVersion("vegan")))
  group <- pick(p, "group_by", NULL)
  png_path <- out_path("plot")
  if (!is.null(group)) {
    if (!group %in% names(md)) fail(paste0("group_by is not a column of the metadata: ", group, ". Columns: ", paste(names(md), collapse = ", ")))
    g <- factor(md[[group]])
    ok <- !is.na(g)
    g <- droplevels(g[ok])
    v <- main[ok]
    if (nlevels(g) < 2) fail(paste0("group_by ", group, " has fewer than two levels among the samples used."))
    stats <- lapply(levels(g), function(l) list(group = l, n = sum(g == l), median = median(v[g == l]), mean = mean(v[g == l])))
    if (nlevels(g) == 2) {
      w <- wilcox.test(v ~ g, exact = FALSE)
      test <- list(name = "Wilcoxon rank-sum", statistic = unname(w$statistic), p = w$p.value)
    } else {
      k <- kruskal.test(v ~ g)
      test <- list(name = "Kruskal-Wallis", statistic = unname(k$statistic), df = unname(k$parameter), p = k$p.value)
    }
    data$group_stats <- stats
    data$test <- test
    metrics$test_p <- test$p
    metrics$test_statistic <- test$statistic
    metrics$n_groups <- nlevels(g)
    png(png_path, width = 800, height = 600, res = 110)
    boxplot(v ~ g, xlab = group, ylab = index, col = "grey85")
    stripchart(v ~ g, vertical = TRUE, method = "jitter", pch = 16, add = TRUE)
    dev.off()
  } else {
    png(png_path, width = 900, height = 600, res = 110)
    hist(main, breaks = 20, main = "", xlab = index, col = "grey80")
    dev.off()
  }
  out <- out_path("table")
  write.csv(df, out, row.names = FALSE)
  emit(list(
    ok = TRUE,
    summary = sprintf("%s of %d samples%s: mean %.4f, median %.4f.%s%s", index, nrow(df), if (rarefied) sprintf(" rarefied to %s reads (seed %d, %d samples dropped)", depth_in, seed, length(dropped)) else " without rarefaction", metrics$mean_index, metrics$median_index, if (!is.null(metrics$test_p)) sprintf(" %s test of %s: statistic %.4g, p %.4g.", test$name, group, test$statistic, test$p) else "", if (!rarefied && length(unique(rowSums(m))) > 1) sprintf(" Reads per sample range from %g to %g. Richness depends on depth.", min(rowSums(m)), max(rowSums(m))) else ""),
    metrics = metrics,
    data = data,
    table = table_of(df, out, 15),
    manualRoute = sprintf("tab <- t(counts); %s vegan::diversity(tab, \"shannon\"); vegan::specnumber(tab); vegan::estimateR(tab)", if (rarefied) sprintf("set.seed(%d); tab <- vegan::rrarefy(tab, %s);", seed, depth_in) else "")
  ))
})
