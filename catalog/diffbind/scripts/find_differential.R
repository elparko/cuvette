args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

METHODS <- c("deseq2", "edger")
NORMS <- c("library_size", "median_of_ratios", "tmm", "peak_total")

run_tool(function() {
  p <- read_params()
  cnt <- read_data(p$counts, "the count matrix")
  smp <- read_data(p$samples, "the sample table")
  method <- tolower(need(p, "method", "Differential method"))
  if (!method %in% METHODS) fail(sprintf("method '%s' is not known. Choices: %s", method, paste(METHODS, collapse = ", ")))
  norm <- need(p, "normalization", "Normalization")
  if (!norm %in% NORMS) fail(sprintf("normalization '%s' is not known. Choices: %s", norm, paste(NORMS, collapse = ", ")))
  sample_col <- need_column(smp, pick(p, "sample_col", "sample"), "sample_col")
  var <- need_column(smp, need(p, "condition_variable", "Condition variable"), "condition_variable")
  ref <- as.character(need(p, "reference_level", "Reference level"))
  test <- as.character(need(p, "test_level", "Level to compare with the reference"))
  levs <- unique(as.character(smp[[var]]))
  for (lv in c(ref, test)) if (!lv %in% levs) fail(sprintf("the level '%s' is not a value of '%s'. Values: %s", lv, var, paste(levs, collapse = ", ")))
  if (ref == test) fail("reference_level and test_level are the same. Give two different levels.")
  exclude <- as_list_arg(p$exclude)
  names_all <- as.character(smp[[sample_col]])
  if (length(exclude)) {
    miss <- setdiff(exclude, names_all)
    if (length(miss)) fail(sprintf("exclude names samples that are not in column '%s': %s", sample_col, paste(miss, collapse = ", ")))
    smp <- smp[!names_all %in% exclude, , drop = FALSE]
  }
  samples <- as.character(smp[[sample_col]])
  gone <- setdiff(samples, names(cnt))
  if (length(gone)) fail(sprintf("the count matrix has no column for the sample '%s'. Columns: %s", gone[1], paste(head(names(cnt), 20), collapse = ", ")))
  n_ref <- sum(as.character(smp[[var]]) == ref); n_test <- sum(as.character(smp[[var]]) == test)
  if (n_ref < 2 || n_test < 2) fail(sprintf("the groups have %d samples (%s) and %d samples (%s). Each group needs at least 2 replicates.", n_ref, ref, n_test, test))
  n_other <- nrow(smp) - n_ref - n_test
  blocking <- as_list_arg(p$blocking_factors)
  for (b in blocking) {
    need_column(smp, b, "blocking_factors")
    if (b == var) fail("blocking_factors contains the condition variable. Name another column.")
    if (length(unique(as.character(smp[[b]]))) < 2) fail(sprintf("blocking_factors '%s' has one value (%s) in all samples, so it cannot block anything. Remove it from blocking_factors.", b, unique(as.character(smp[[b]]))[1]))
  }
  m <- as.matrix(cnt[, samples, drop = FALSE])
  suppressWarnings(storage.mode(m) <- "numeric")
  if (anyNA(m)) fail("the count matrix has a missing value or text in the sample columns. Give raw read counts.")
  if (any(m < 0)) fail("the count matrix has a negative count. Give raw read counts.")
  if (any(abs(m - round(m)) > 1e-8)) fail("the count matrix has counts with decimals. Normalized or control-subtracted scores break the count model. Give raw read counts (the reads in each peak).")
  storage.mode(m) <- "integer"
  id <- if ("peak_id" %in% names(cnt)) as.character(cnt$peak_id) else sprintf("peak%d", seq_len(nrow(cnt)))
  rownames(m) <- id
  min_count <- as.numeric(pick(p, "min_count", 1))
  min_samples <- as.integer(pick(p, "min_samples", 1))
  if (!is.finite(min_count) || min_count < 0 || !is.finite(min_samples) || min_samples < 1) fail("min_count must be 0 or more (reads) and min_samples at least 1 (count)")
  keep <- rowSums(m >= min_count) >= min_samples
  if (sum(keep) < 10) fail(sprintf("only %d peaks pass the filter (at least %g reads in at least %d samples). Lower min_count or min_samples.", sum(keep), min_count, min_samples))
  fdr <- as.numeric(pick(p, "fdr", 0.05))
  lfc <- as.numeric(pick(p, "lfc_threshold", 0))
  if (!is.finite(fdr) || fdr <= 0 || fdr >= 1) fail("fdr must be a number between 0 and 1 (a fraction), such as 0.05")
  if (!is.finite(lfc) || lfc < 0) fail("lfc_threshold must be 0 or more (log2 fold change)")
  fit_type <- pick(p, "fit_type", "local")
  if (!fit_type %in% c("parametric", "local", "mean")) fail(sprintf("fit_type '%s' is not known. Choices: parametric, local, mean", fit_type))
  independent <- pick(p, "independent_filtering", "on")
  if (!independent %in% c("on", "off")) fail(sprintf("independent_filtering must be on or off, not '%s'", independent))

  group <- factor(as.character(smp[[var]]), levels = c(ref, test, setdiff(unique(as.character(smp[[var]])), c(ref, test))))
  cd <- data.frame(row.names = samples, group = group)
  for (b in blocking) cd[[b]] <- factor(as.character(smp[[b]]))
  design_terms <- c(blocking, "group")
  mm <- model.matrix(as.formula(paste("~", paste(design_terms, collapse = " + "))), cd)
  if (qr(mm)$rank < ncol(mm)) fail(sprintf("the design %s is not full rank. A blocking factor is confounded with %s. Remove a blocking factor.", paste(design_terms, collapse = " + "), var))
  if (nrow(cd) - ncol(mm) < 1) fail("the design leaves no residual degrees of freedom. Remove a blocking factor or add samples.")

  if (method == "edger" && norm == "median_of_ratios") fail("normalization median_of_ratios belongs to DESeq2. With method edger, use library_size, tmm or peak_total.")
  lib <- NULL
  if (norm == "library_size") {
    lib_col <- need_column(smp, pick(p, "library_size_col", "library_size"), "library_size_col")
    lib <- numeric_column(smp, lib_col, "library_size_col")
    if (any(lib <= 0)) fail(sprintf("library_size_col '%s' has a value of 0 or less", lib_col))
  }
  factors <- NULL
  if (method == "deseq2") {
    suppressMessages(library(DESeq2))
    dds <- DESeqDataSetFromMatrix(m[keep, , drop = FALSE], cd, as.formula(paste("~", paste(design_terms, collapse = " + "))))
    if (norm == "library_size") sizeFactors(dds) <- lib / mean(lib)
    if (norm == "peak_total") { tot <- colSums(m[keep, , drop = FALSE]); sizeFactors(dds) <- tot / mean(tot) }
    if (norm == "tmm") { y0 <- edgeR::DGEList(m[keep, , drop = FALSE]); y0 <- edgeR::calcNormFactors(y0, method = "TMM"); sizeFactors(dds) <- y0$samples$norm.factors * colSums(m[keep, , drop = FALSE]) / mean(y0$samples$norm.factors * colSums(m[keep, , drop = FALSE])) }
    dds <- suppressMessages(DESeq(dds, quiet = TRUE, fitType = fit_type))
    res <- if (lfc > 0) results(dds, contrast = c("group", test, ref), lfcThreshold = lfc, altHypothesis = "greaterAbs", independentFiltering = independent == "on") else results(dds, contrast = c("group", test, ref), independentFiltering = independent == "on")
    out <- data.frame(peak_id = rownames(res), base_mean = res$baseMean, log2_fold_change = res$log2FoldChange, std_error = res$lfcSE, p_value = res$pvalue, fdr = res$padj, stringsAsFactors = FALSE)
    factors <- sizeFactors(dds)
  } else {
    suppressMessages(library(edgeR))
    y <- DGEList(counts = m[keep, , drop = FALSE])
    if (norm == "library_size") { y$samples$lib.size <- lib; y$samples$norm.factors <- 1 }
    if (norm == "tmm") y <- calcNormFactors(y, method = "TMM")
    y <- estimateDisp(y, mm)
    fit <- glmQLFit(y, mm)
    coef <- match(paste0("group", test), colnames(mm))
    tt <- if (lfc > 0) glmTreat(fit, coef = coef, lfc = lfc) else glmQLFTest(fit, coef = coef)
    top <- topTags(tt, n = Inf, sort.by = "none")$table
    pcol <- grep("^PValue", names(top), value = TRUE)[1]
    out <- data.frame(peak_id = rownames(top), base_mean = 2^top$logCPM * mean(y$samples$lib.size * y$samples$norm.factors) / 1e6, log2_fold_change = top$logFC, std_error = NA_real_, p_value = top[[pcol]], fdr = top$FDR, stringsAsFactors = FALSE)
    factors <- y$samples$norm.factors * y$samples$lib.size / mean(y$samples$norm.factors * y$samples$lib.size)
  }
  coords <- cnt[match(out$peak_id, id), intersect(c("chr", "start", "end"), names(cnt)), drop = FALSE]
  out <- cbind(out[, "peak_id", drop = FALSE], coords, out[, -1, drop = FALSE])
  out <- out[order(out$fdr, na.last = TRUE), ]
  sig <- !is.na(out$fdr) & out$fdr <= fdr
  up <- sum(sig & out$log2_fold_change > 0); down <- sum(sig & out$log2_fold_change < 0)
  if (nzchar(out_path("results"))) write.csv(out, out_path("results"), row.names = FALSE)
  if (nzchar(out_path("significant")) && all(c("chr", "start", "end") %in% names(out))) {
    bed <- out[sig, c("chr", "start", "end", "peak_id", "log2_fold_change")]
    write.table(bed, out_path("significant"), sep = "\t", quote = FALSE, row.names = FALSE, col.names = FALSE)
  }
  metrics <- list(n_peaks_input = nrow(m), n_peaks_tested = sum(keep), n_significant = sum(sig), n_up = up, n_down = down, fdr = fdr, n_samples = length(samples), n_reference = n_ref, n_test = n_test, n_other_samples = n_other, n_na_fdr = sum(is.na(out$fdr)))
  for (i in seq_along(samples)) metrics[[paste0("size_factor_", samples[i])]] <- unname(factors[i])
  warns <- character()
  if (norm == "median_of_ratios" || norm == "tmm") warns <- c(warns, "the normalization uses the reads in peaks only. A change in the number of bound sites between groups can bias it; the library size normalization is the alternative")
  if (norm == "peak_total") warns <- c(warns, "peak_total scales by the reads in peaks, which can hide a global change of binding")
  if (sum(sig) == 0) warns <- c(warns, sprintf("no peak passes FDR %g. Look at the p values and the fold change before you lower the cutoff", fdr))
  top5 <- head(out[sig, ], 5)
  emit(list(
    ok = TRUE,
    summary = sprintf("%s: %d of %d peaks tested (at least %g reads in at least %d samples), design ~ %s, normalization %s%s. %d peaks pass FDR %g: %d gain (more %s in %s) and %d lose.%s", test, sum(keep), nrow(m), min_count, min_samples, paste(design_terms, collapse = " + "), norm, if (method == "deseq2") sprintf(", dispersion fit %s", fit_type) else ", quasi-likelihood F test", sum(sig), fdr, up, "signal", test, down, if (length(warns)) paste0(" Warnings: ", paste(warns, collapse = "; "), ".") else ""),
    metrics = metrics,
    data = list(method = method, normalization = norm, design = paste(design_terms, collapse = " + "), contrast = sprintf("%s: %s against %s", var, test, ref), results_file = out_path("results"), program_version = if (method == "deseq2") paste("DESeq2", as.character(packageVersion("DESeq2"))) else paste("edgeR", as.character(packageVersion("edgeR"))), significant_file = out_path("significant"), fit_type = if (method == "deseq2") fit_type else NULL, independent_filtering = if (method == "deseq2") independent else NULL, warnings = as.list(warns), direction_note = "log2_fold_change above 0 means more signal in the test level"),
    table = table_of(head(out, 40), out_path("results")),
    manualRoute = if (method == "deseq2") "library(DESeq2); dds <- DESeqDataSetFromMatrix(counts, coldata, ~ group); sizeFactors(dds) <- libsize/mean(libsize); dds <- DESeq(dds, fitType = \"local\"); res <- results(dds, contrast = c(\"group\", test, ref))" else "library(edgeR); y <- DGEList(counts); y <- estimateDisp(y, design); fit <- glmQLFit(y, design); topTags(glmQLFTest(fit, coef = 2))"
  ))
})
