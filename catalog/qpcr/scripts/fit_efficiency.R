args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  df <- read_data(p$data)
  gene_col <- need_column(df, default_col(p, "gene_col", df, "gene"), "gene_col")
  q_col <- need_column(df, default_col(p, "quantity_col", df, "quantity"), "quantity_col")
  cq_col <- need_column(df, default_col(p, "cq_col", df, "cq"), "cq_col")
  scale <- pick(p, "quantity_scale", "linear")
  if (!scale %in% c("linear", "log10")) fail(paste("quantity_scale must be linear or log10, not", scale))
  well_col <- default_col(p, "well_col", df, "well")
  cq <- cq_column(df, cq_col)
  q <- numeric_column(df, q_col, "quantity_col")
  d <- data.frame(row = seq_len(nrow(df)) + 1, gene = as.character(df[[gene_col]]), q = q, cq = cq$cq, stringsAsFactors = FALSE)
  d$well <- if (is.null(well_col)) as.character(d$row) else as.character(df[[well_col]])
  exclude <- as_list_arg(p$exclude)
  if (length(exclude)) {
    miss <- setdiff(exclude, c(d$well, as.character(d$row)))
    if (length(miss)) fail(sprintf("exclude names wells that are not in the data: %s", paste(miss, collapse = ", ")))
    d <- d[!(d$well %in% exclude | as.character(d$row) %in% exclude), ]
  }
  cutoff <- as.numeric(pick(p, "cq_cutoff", 40))
  n_nd <- sum(!is.finite(d$cq) | d$cq > cutoff)
  d <- d[is.finite(d$cq) & d$cq <= cutoff, ]
  if (scale == "linear") {
    if (any(d$q <= 0, na.rm = TRUE)) fail(sprintf("quantity_col '%s' has a value of 0 or below. Give the quantity or the dilution factor (above 0), or set quantity_scale to log10.", q_col))
    d$x <- log10(d$q)
  } else d$x <- d$q
  d <- d[is.finite(d$x), ]
  rows <- list(); fits <- list()
  for (g in unique(d$gene)) {
    dg <- d[d$gene == g, ]
    if (length(unique(dg$x)) < 3) {
      rows[[g]] <- data.frame(gene = g, n_points = nrow(dg), n_levels = length(unique(dg$x)), slope = NA, intercept = NA, r_squared = NA, efficiency = NA, efficiency_pct = NA, note = "fewer than 3 dilution levels with a Cq", stringsAsFactors = FALSE)
      next
    }
    f <- lm(cq ~ x, data = dg)
    co <- coef(f)
    e <- 10^(-1 / co[["x"]])
    rows[[g]] <- data.frame(gene = g, n_points = nrow(dg), n_levels = length(unique(dg$x)), slope = co[["x"]], intercept = co[["(Intercept)"]], r_squared = summary(f)$r.squared, efficiency = e, efficiency_pct = 100 * (e - 1), note = if (e < 1.9 || e > 2.1) "efficiency outside 90 to 110 percent" else "", stringsAsFactors = FALSE)
    fits[[g]] <- list(d = dg, co = co)
  }
  tab <- do.call(rbind, rows)
  rownames(tab) <- NULL
  if (nzchar(out_path("results"))) write.csv(tab, out_path("results"), row.names = FALSE)
  metrics <- list(n_genes = nrow(tab), n_points = nrow(d), n_non_detect = n_nd)
  for (i in seq_len(nrow(tab))) {
    k <- clean_name(tab$gene[i])
    metrics[[paste0("slope_", k)]] <- tab$slope[i]
    metrics[[paste0("efficiency_", k)]] <- tab$efficiency[i]
    metrics[[paste0("r_squared_", k)]] <- tab$r_squared[i]
  }
  n <- length(fits)
  cols <- rep(c("#1f4e79", "#b03a2e", "#1e8449", "#7d3c98", "#b9770e", "#566573", "#17a589", "#922b21"), length.out = max(n, 1))
  draw_both(out_path("plot"), out_path("plot_svg"), 7, 5, function() {
    if (!n) { plot.new(); title("No gene has 3 dilution levels"); return(invisible()) }
    plot(d$x, d$cq, type = "n", xlab = if (scale == "linear") paste("log10", q_col) else q_col, ylab = "Cq", main = "Standard curves")
    for (i in seq_len(n)) {
      fg <- fits[[i]]
      points(fg$d$x, fg$d$cq, pch = 16, col = cols[i])
      abline(fg$co, col = cols[i])
    }
    legend("topright", sprintf("%s: slope %.3f, E %.3f", names(fits), sapply(fits, function(f) f$co[["x"]]), 10^(-1 / sapply(fits, function(f) f$co[["x"]]))), col = cols, pch = 16, bty = "n", cex = 0.7)
  })
  ok <- tab[is.finite(tab$slope), ]
  emit(list(
    ok = TRUE,
    summary = paste0(sprintf("%d gene(s), %d points, %d non-detect(s) left out. ", nrow(tab), nrow(d), n_nd),
      paste(sprintf("%s: slope %s, efficiency %s (%s%%), R-squared %s, %d points%s", tab$gene, sapply(tab$slope, fmt, digits = 5), sapply(tab$efficiency, fmt), sapply(tab$efficiency_pct, fmt, digits = 3), sapply(tab$r_squared, fmt), tab$n_points, ifelse(nzchar(tab$note), paste0(" (", tab$note, ")"), "")), collapse = "; ")),
    metrics = metrics,
    data = list(results_file = out_path("results"), quantity_scale = scale),
    table = table_of(tab, out_path("results")),
    outputs = plot_outputs(),
    manualRoute = sprintf("fit <- lm(Cq ~ log10(%s), data = d[d$gene == \"%s\", ]); E <- 10^(-1 / coef(fit)[2])", q_col, if (nrow(ok)) ok$gene[1] else "gene")
  ))
})
