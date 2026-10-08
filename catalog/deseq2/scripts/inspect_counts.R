args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  m <- read_counts(p$counts)
  cd <- read_coldata(p$coldata)
  missing <- setdiff(colnames(m), rownames(cd))
  if (length(missing)) fail(paste("samples in the counts without a row in coldata:", paste(missing, collapse = ", ")))
  cd <- cd[colnames(m), , drop = FALSE]
  cols <- lapply(names(cd), function(n) {
    v <- cd[[n]]
    lv <- if (is.numeric(v)) NULL else sort(unique(as.character(v)))
    list(column = n, type = if (is.numeric(v)) "number" else "text", n_levels = length(lv), levels = paste(lv, collapse = ", "))
  })
  df <- data.frame(column = sapply(cols, `[[`, "column"), type = sapply(cols, `[[`, "type"), n_levels = sapply(cols, `[[`, "n_levels"), levels = sapply(cols, `[[`, "levels"), stringsAsFactors = FALSE)
  emit(list(
    ok = TRUE,
    summary = sprintf("%d genes, %d samples, %d coldata columns, %d zero-count genes", nrow(m), ncol(m), ncol(cd), sum(rowSums(m) == 0)),
    metrics = list(n_genes = nrow(m), n_samples = ncol(m), n_columns = ncol(cd), n_zero_genes = sum(rowSums(m) == 0), min_library_size = min(colSums(m)), max_library_size = max(colSums(m))),
    table = table_of(df, NULL, 30),
    manualRoute = sprintf("counts <- as.matrix(read.csv(\"%s\", row.names=1)); coldata <- read.csv(\"%s\", row.names=1)", p$counts, p$coldata)
  ))
})
