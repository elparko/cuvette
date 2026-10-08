args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_deseq()
  m <- read_counts(p$counts)
  cd <- read_coldata(p$coldata)
  cd <- cd[colnames(m), , drop = FALSE]
  design <- p$design
  variable <- p$variable
  reference <- p$reference_level
  test_level <- p$test_level
  min_count <- as.numeric(pick(p, "min_count", 10))
  min_samples <- as.numeric(pick(p, "min_samples", 4))
  alpha <- as.numeric(pick(p, "alpha", 0.1))
  lfc <- as.numeric(pick(p, "lfc_threshold", 0))
  vars <- all.vars(as.formula(design))
  bad <- setdiff(c(vars, variable), names(cd))
  if (length(bad)) fail(paste("not a coldata column:", paste(bad, collapse = ", ")))
  if (!variable %in% vars) fail("variable must be a term of the design")
  for (v in vars) if (!is.numeric(cd[[v]])) cd[[v]] <- factor(cd[[v]])
  if (!reference %in% levels(cd[[variable]])) fail(paste("reference_level is not a level of", variable, ". Levels:", paste(levels(cd[[variable]]), collapse = ", ")))
  if (!test_level %in% levels(cd[[variable]])) fail(paste("test_level is not a level of", variable, ". Levels:", paste(levels(cd[[variable]]), collapse = ", ")))
  cd[[variable]] <- relevel(cd[[variable]], ref = reference)
  dds <- DESeqDataSetFromMatrix(m, cd, design = as.formula(design))
  n_input <- nrow(dds)
  keep <- rowSums(counts(dds) >= min_count) >= min_samples
  dds <- dds[keep, ]
  dds <- DESeq(dds, quiet = TRUE)
  res <- results(dds, contrast = c(variable, test_level, reference), alpha = alpha, lfcThreshold = lfc, altHypothesis = "greaterAbs")
  df <- as.data.frame(res)
  df <- cbind(gene_id = rownames(df), df)
  df <- df[order(df$padj, na.last = TRUE), ]
  out <- out_path("results")
  write.csv(df, out, row.names = FALSE)
  sig <- !is.na(df$padj) & df$padj < alpha
  n_na <- sum(is.na(df$padj))
  metrics <- list(n_genes_input = n_input, n_genes_tested = nrow(dds), n_significant = sum(sig), n_up = sum(sig & df$log2FoldChange > 0), n_down = sum(sig & df$log2FoldChange < 0), n_padj_missing = n_na, n_samples = ncol(dds), alpha = alpha)
  emit(list(
    ok = TRUE,
    summary = sprintf("%d of %d genes pass the filter. %d have padj < %s (%d up, %d down) for %s %s vs %s, design %s", nrow(dds), n_input, sum(sig), alpha, metrics$n_up, metrics$n_down, variable, test_level, reference, design),
    metrics = metrics,
    data = list(results_file = out, design = design, variable = variable, test_level = test_level, reference_level = reference, min_count = min_count, min_samples = min_samples, alpha = alpha, lfc_threshold = lfc, deseq2_version = as.character(packageVersion("DESeq2"))),
    table = table_of(df[sig, c("gene_id", "baseMean", "log2FoldChange", "lfcSE", "pvalue", "padj")], out, 10),
    manualRoute = sprintf("dds <- DESeqDataSetFromMatrix(counts, coldata, design=%s); dds$%s <- relevel(dds$%s, ref=\"%s\"); dds <- dds[rowSums(counts(dds) >= %s) >= %s, ]; dds <- DESeq(dds); res <- results(dds, contrast=c(\"%s\",\"%s\",\"%s\"), alpha=%s, lfcThreshold=%s)", design, variable, variable, reference, min_count, min_samples, variable, test_level, reference, alpha, lfc)
  ))
})
