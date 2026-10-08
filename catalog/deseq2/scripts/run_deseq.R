args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

route_input <- function(input, p) {
  cd <- sprintf("coldata <- read.csv(\"%s\", row.names=1)", pick(p, "coldata", "coldata.csv"))
  switch(input$type,
    "count matrix" = sprintf("counts <- as.matrix(read.csv(\"%s\", row.names=1)); %s; dds <- DESeqDataSetFromMatrix(counts, coldata, design=%s)", p$counts, cd, p$design),
    "transcript quantification" = sprintf("files <- <one %s file per sample>; tx2gene <- read.csv(\"%s\"); txi <- tximport(files, type=\"%s\", tx2gene=tx2gene); %s; dds <- DESeqDataSetFromTximport(txi, coldata, design=%s)", input$program, pick(p, "tx2gene", ""), input$program, cd, p$design),
    "counts and lengths" = sprintf("txi <- list(counts=as.matrix(read.csv(\"%s\", row.names=1)), length=as.matrix(read.csv(\"%s\", row.names=1)), countsFromAbundance=\"no\"); %s; dds <- DESeqDataSetFromTximport(txi, coldata, design=%s)", p$counts, p$lengths, cd, p$design),
    "SummarizedExperiment rds" = if (is.null(input$length)) sprintf("se <- readRDS(\"%s\"); dds <- DESeqDataSetFromMatrix(assay(se, \"counts\"), colData(se), design=%s)", p$counts, p$design) else sprintf("se <- readRDS(\"%s\"); txi <- list(counts=assay(se, \"counts\"), length=assay(se, \"%s\"), countsFromAbundance=\"no\"); dds <- DESeqDataSetFromTximport(txi, colData(se), design=%s)", p$counts, input$length_assay, p$design)
  )
}

run_tool(function() {
  p <- read_params()
  load_deseq()
  input <- load_input(p)
  cd <- input$coldata
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
  if (length(bad)) fail(paste("not a coldata column:", paste(bad, collapse = ", "), ". Columns:", paste(names(cd), collapse = ", ")))
  if (!variable %in% vars) fail("variable must be a term of the design")
  for (v in vars) if (!is.numeric(cd[[v]])) cd[[v]] <- factor(cd[[v]])
  if (!reference %in% levels(cd[[variable]])) fail(paste("reference_level is not a level of", variable, ". Levels:", paste(levels(cd[[variable]]), collapse = ", ")))
  if (!test_level %in% levels(cd[[variable]])) fail(paste("test_level is not a level of", variable, ". Levels:", paste(levels(cd[[variable]]), collapse = ", ")))
  cd[[variable]] <- relevel(cd[[variable]], ref = reference)
  input$coldata <- cd
  dds <- make_dds(input, as.formula(design))
  offsets <- "avgTxLength" %in% assayNames(dds)
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
  constructor <- if (offsets) "DESeqDataSetFromTximport" else "DESeqDataSetFromMatrix"
  offsets_text <- if (offsets) "transcript length offsets used" else "no length offsets"
  emit(list(
    ok = TRUE,
    summary = sprintf("Input: %s (%s, %s). %d of %d genes pass the filter. %d have padj < %s (%d up, %d down) for %s %s vs %s, design %s", input$type, constructor, offsets_text, nrow(dds), n_input, sum(sig), alpha, metrics$n_up, metrics$n_down, variable, test_level, reference, design),
    metrics = metrics,
    data = list(results_file = out, input_type = input$type, import = input$import, constructor = constructor, length_offsets = offsets, genes_with_zero_length_set_to_1 = input$n_zero_length, design = design, variable = variable, test_level = test_level, reference_level = reference, min_count = min_count, min_samples = min_samples, alpha = alpha, lfc_threshold = lfc, deseq2_version = as.character(packageVersion("DESeq2"))),
    table = table_of(df[sig, c("gene_id", "baseMean", "log2FoldChange", "lfcSE", "pvalue", "padj")], out, 10),
    manualRoute = sprintf("# input: %s, %s\n%s; dds$%s <- relevel(dds$%s, ref=\"%s\"); dds <- dds[rowSums(counts(dds) >= %s) >= %s, ]; dds <- DESeq(dds); res <- results(dds, contrast=c(\"%s\",\"%s\",\"%s\"), alpha=%s, lfcThreshold=%s)", input$type, offsets_text, route_input(input, p), variable, variable, reference, min_count, min_samples, variable, test_level, reference, alpha, lfc)
  ))
})
