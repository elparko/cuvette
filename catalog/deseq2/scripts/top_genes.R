args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  if (!file.exists(p$results)) fail(paste("file not found:", p$results))
  df <- read.csv(p$results, stringsAsFactors = FALSE)
  n <- as.integer(pick(p, "n", 20))
  alpha <- as.numeric(pick(p, "alpha", 0.1))
  direction <- pick(p, "direction", "both")
  d <- df[!is.na(df$padj) & df$padj < alpha, ]
  if (direction == "up") d <- d[d$log2FoldChange > 0, ]
  if (direction == "down") d <- d[d$log2FoldChange < 0, ]
  d <- head(d[order(d$padj, d$pvalue), c("gene_id", "baseMean", "log2FoldChange", "lfcSE", "pvalue", "padj")], n)
  out <- out_path("top")
  write.csv(d, out, row.names = FALSE)
  emit(list(
    ok = TRUE,
    summary = sprintf("top %d of the genes with padj < %s (%s)", nrow(d), alpha, direction),
    metrics = list(n_rows = nrow(d), alpha = alpha),
    data = list(top_file = out),
    table = table_of(d, out, n),
    manualRoute = sprintf("head(res[order(res$padj), ], %d)", n)
  ))
})
