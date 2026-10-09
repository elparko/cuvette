args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  if (!file.exists(p$cells)) fail(paste("cells file not found:", p$cells))
  cells <- read.csv(p$cells, check.names = FALSE, stringsAsFactors = FALSE)
  col <- pick(p, "population_column", "metacluster")
  if (!all(c("sample_id", col) %in% names(cells))) fail(paste0("the cells file lacks the column ", paste(setdiff(c("sample_id", col), names(cells)), collapse = ", "), ". Columns: ", paste(names(cells), collapse = ", ")))
  cnt <- table(population = cells[[col]], sample_id = cells$sample_id)
  wide <- as.data.frame.matrix(cnt)
  wide <- cbind(population = rownames(wide), wide, row.names = NULL)
  totals <- colSums(cnt)
  pct <- sweep(unclass(cnt), 2, totals, "/") * 100
  pct_df <- cbind(population = rownames(pct), as.data.frame.matrix(pct), row.names = NULL)
  counts_path <- out_path("counts")
  write.csv(wide, counts_path, row.names = FALSE)
  pct_path <- out_path("percent")
  write.csv(pct_df, pct_path, row.names = FALSE)

  png_path <- out_path("plot")
  png(png_path, width = 1000, height = 600, res = 110)
  par(mar = c(9, 4, 2, 8), xpd = TRUE)
  barplot(pct, col = hcl.colors(nrow(pct), "Set 3"), las = 2, ylab = "percent of cells", legend.text = rownames(pct), args.legend = list(x = "right", inset = c(-0.15, 0), cex = 0.7))
  dev.off()

  emit(list(
    ok = TRUE,
    summary = sprintf("%d populations (column %s) in %d samples, %d cells. Cells per sample: %s.", nrow(cnt), col, ncol(cnt), sum(totals), paste(sprintf("%s %d", names(totals), totals), collapse = ", ")),
    metrics = list(n_populations = nrow(cnt), n_samples = ncol(cnt), n_cells = sum(totals), min_sample_cells = min(totals), max_sample_cells = max(totals)),
    data = list(population_column = col, counts_file = counts_path, percent_file = pct_path, cells_per_sample = as.list(setNames(as.list(as.integer(totals)), names(totals)))),
    table = table_of(pct_df, pct_path, 30),
    manualRoute = sprintf("tab <- table(cells$%s, cells$sample_id); prop.table(tab, 2) * 100", col)
  ))
})
