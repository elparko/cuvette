args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  inp <- load_inputs(p)
  m <- inp$m
  md <- inp$md
  depth <- rowSums(m)
  prev <- colSums(m > 0) / nrow(m)
  cols <- lapply(names(md), function(nm) {
    v <- md[[nm]]
    n_na <- sum(is.na(v))
    if (is.numeric(v)) list(name = nm, type = "number", n_missing = n_na, min = min(v, na.rm = TRUE), max = max(v, na.rm = TRUE))
    else {
      t <- table(v)
      list(name = nm, type = "text", n_missing = n_na, n_levels = length(t), levels = if (length(t) <= 12) names(t) else NULL, counts = if (length(t) <= 12) as.integer(t) else NULL)
    }
  })
  per <- data.frame(sample = rownames(m), reads = depth, features = rowSums(m > 0), row.names = NULL)
  tab_path <- out_path("table")
  write.csv(per, tab_path, row.names = FALSE)
  whole <- is_whole(m)
  emit(list(
    ok = TRUE,
    summary = sprintf("%d samples and %d features (%s). Reads per sample: min %g, median %g, max %g. %.1f percent of the cells are zero. %s", nrow(m), ncol(m), inp$orientation, min(depth), median(depth), max(depth), 100 * mean(m == 0), if (whole) "All values are whole numbers (counts)." else "The values are not whole numbers (relative abundances or normalized values)."),
    metrics = list(n_samples = nrow(m), n_features = ncol(m), total_reads = sum(m), min_depth = min(depth), median_depth = median(depth), max_depth = max(depth), fraction_zero = mean(m == 0), n_empty_samples = sum(depth == 0), n_features_in_10pct_samples = sum(prev >= 0.1), n_metadata_rows = inp$n_md, n_table_samples = inp$n_table),
    data = list(orientation = inp$orientation, whole_numbers = whole, ignored_columns = inp$ignored, metadata_columns = cols),
    table = table_of(per, tab_path, 15),
    manualRoute = "tab <- read.delim(\"table.tsv\", row.names = 1); dim(tab); summary(colSums(tab)); mean(tab == 0)"
  ))
})
