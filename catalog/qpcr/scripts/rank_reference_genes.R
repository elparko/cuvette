args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  suppressMessages(library(NormqPCR))
  method <- pick(p, "method", "both")
  if (!method %in% c("geNorm", "NormFinder", "both")) fail(paste("method must be geNorm, NormFinder or both, not", method))
  d <- read_long(p)
  reps <- pick(p, "replicates", "mean")
  s <- collapse_reps(d, reps)
  genes <- unique(s$gene)
  only <- as_list_arg(pick(p, "genes", NULL))
  if (length(only)) {
    miss <- setdiff(only, genes)
    if (length(miss)) fail(sprintf("genes names %s, which is not in the data. Genes: %s", paste(miss, collapse = ", "), paste(genes, collapse = ", ")))
    s <- s[s$gene %in% only, ]
    genes <- only
  }
  if (length(genes) < 3) fail(sprintf("geNorm and NormFinder need at least 3 candidate genes. The data have %d: %s", length(genes), paste(genes, collapse = ", ")))
  eff <- parse_efficiencies(pick(p, "efficiencies", "2"), genes)
  m <- tapply(s$cq, list(factor(s$gene, levels = genes), factor(s$sample, levels = unique(s$sample))), mean)
  incomplete <- colnames(m)[colSums(!is.finite(m)) > 0]
  if (length(incomplete)) m <- m[, setdiff(colnames(m), incomplete), drop = FALSE]
  if (ncol(m) < 3) fail(sprintf("only %d samples have a Cq for every gene. %d samples miss a gene (non-detect or excluded), such as %s.", ncol(m), length(incomplete), paste(head(incomplete, 3), collapse = ", ")))
  log2q <- -m * log2(eff[rownames(m)])
  metrics <- list(n_genes = nrow(m), n_samples = ncol(m), n_samples_dropped = length(incomplete), n_non_detect = sum(d$non_detect), n_excluded = attr(d, "n_excluded"))
  tabs <- list()
  gn <- NULL; nf <- NULL
  if (method %in% c("geNorm", "both")) {
    b <- new("qPCRBatch", exprs = log2q)
    g <- selectHKs(b, method = "geNorm", minNrHKs = 2, log = TRUE, trace = FALSE, na.rm = TRUE, Symbols = rownames(log2q))
    rank <- as.character(g$ranking)
    meanM <- as.numeric(g$meanM)
    removed <- rev(rank)[seq_len(length(meanM) - 1)]
    step_gene <- c(removed, paste(rank[1:2], collapse = "/"))
    gn <- data.frame(step = seq_along(meanM), gene_removed = step_gene, n_genes = rev(seq(2, nrow(log2q))), average_M = meanM, stringsAsFactors = FALSE)
    single <- stabMeasureM(t(log2q), log = TRUE, na.rm = TRUE)
    V <- as.numeric(g$variation); names(V) <- names(g$variation)
    vt <- data.frame(pair = paste0("V", rev(names(V))), V = rev(V), stringsAsFactors = FALSE)
    metrics$genorm_best_pair_M <- tail(meanM, 1)
    metrics$genorm_n_genes_M_below_0_5 <- sum(meanM < 0.5) + (tail(meanM, 1) < 0.5)
    for (i in seq_along(meanM)) metrics[[paste0("genorm_average_M_", clean_name(step_gene[i]))]] <- meanM[i]
    for (k in names(single)) metrics[[paste0("genorm_M_all_", clean_name(k))]] <- single[[k]]
    for (i in seq_len(nrow(vt))) metrics[[paste0("genorm_", sub("/", "_", vt$pair[i]))]] <- vt$V[i]
    tabs$genorm <- gn
    tabs$variation <- vt
  }
  grp_col <- pick(p, "stability_group_col", NULL)
  if (!is.null(grp_col) && tolower(grp_col) == "none") grp_col <- NULL
  if (method %in% c("NormFinder", "both")) {
    lnq <- t(log2q) * log(2)
    grp <- rep("all", nrow(lnq))
    if (!is.null(grp_col)) {
      raw <- read_data(p$data)
      need_column(raw, grp_col, "stability_group_col")
      sc <- default_col(p, "sample_col", raw, "sample")
      lut <- tapply(as.character(raw[[grp_col]]), as.character(raw[[sc]]), function(v) v[1])
      grp <- unname(lut[rownames(lnq)])
    }
    groups <- unique(grp)
    if (length(groups) > 1 && min(table(grp)) < 2) fail(sprintf("NormFinder needs 2 or more samples in each group of '%s'. Group sizes: %s", grp_col, paste(names(table(grp)), table(grp), sep = " ", collapse = ", ")))
    rho <- suppressWarnings(stabMeasureRho(lnq, group = factor(grp), log = TRUE, na.rm = TRUE))
    if (length(groups) == 1) rho <- sqrt(rho)
    nf <- data.frame(gene = names(rho), stability = as.numeric(rho), stringsAsFactors = FALSE)
    nf <- nf[order(nf$stability), ]
    nf$rank <- seq_len(nrow(nf))
    rownames(nf) <- NULL
    for (i in seq_len(nrow(nf))) metrics[[paste0("normfinder_", clean_name(nf$gene[i]))]] <- nf$stability[i]
    metrics$normfinder_n_groups <- length(groups)
    tabs$normfinder <- nf
  }
  if (!is.null(gn) && nzchar(out_path("genorm"))) write.csv(gn, out_path("genorm"), row.names = FALSE)
  if (!is.null(gn) && nzchar(out_path("variation"))) write.csv(tabs$variation, out_path("variation"), row.names = FALSE)
  if (!is.null(nf) && nzchar(out_path("normfinder"))) write.csv(nf, out_path("normfinder"), row.names = FALSE)

  panels <- (!is.null(gn)) * 2 + (!is.null(nf))
  draw_both(out_path("plot"), out_path("plot_svg"), 5 * panels, 5, function() {
    par(mfrow = c(1, panels), mar = c(7, 4.5, 3, 1))
    if (!is.null(gn)) {
      barplot(gn$average_M, names.arg = gn$gene_removed, las = 2, cex.names = 0.7, ylab = "Average M of the remaining genes", main = "geNorm: least stable gene removed at each step", col = ifelse(gn$average_M < 0.5, "#1f4e79", "#b03a2e"))
      abline(h = 0.5, lty = 2)
      barplot(tabs$variation$V, names.arg = tabs$variation$pair, las = 2, cex.names = 0.7, ylab = "Pairwise variation V", main = "geNorm: V for n and n+1 genes", col = "#566573")
      abline(h = 0.15, lty = 2)
    }
    if (!is.null(nf)) {
      barplot(nf$stability, names.arg = nf$gene, las = 2, cex.names = 0.7, ylab = "Stability value (natural log scale)", main = sprintf("NormFinder, %s", if (length(unique(grp)) > 1) paste("grouped by", grp_col) else "no groups"), col = "#1e8449")
    }
  })

  txt <- character()
  if (!is.null(gn)) txt <- c(txt, sprintf("geNorm: best pair %s (average M %s); least stable %s (average M with all genes %s); %d of %d genes in a step with average M below 0.5; V2/3 %s", gn$gene_removed[nrow(gn)], fmt(tail(gn$average_M, 1)), gn$gene_removed[1], fmt(gn$average_M[1]), metrics$genorm_n_genes_M_below_0_5, nrow(log2q), fmt(tabs$variation$V[1])))
  if (!is.null(nf)) txt <- c(txt, sprintf("NormFinder (%s): most stable %s (%s), least stable %s (%s)", if (length(unique(grp)) > 1) paste(length(unique(grp)), "groups of", grp_col) else "no groups", nf$gene[1], fmt(nf$stability[1]), nf$gene[nrow(nf)], fmt(nf$stability[nrow(nf)])))
  note <- c(if (length(incomplete)) sprintf("%d sample(s) without a Cq for every gene were left out: %s", length(incomplete), paste(head(incomplete, 5), collapse = ", ")), if (any(eff != 2)) "Cq values are scaled by log2 of each efficiency")
  emit(list(
    ok = TRUE,
    summary = sprintf("%d genes, %d samples, replicates %s. %s%s", nrow(m), ncol(m), reps, paste(txt, collapse = ". "), if (length(note)) paste0(". ", paste(note, collapse = ". ")) else ""),
    metrics = metrics,
    data = list(genorm_file = out_path("genorm"), variation_file = out_path("variation"), normfinder_file = out_path("normfinder"), ranking_genorm = if (!is.null(gn)) rev(c(strsplit(gn$gene_removed[nrow(gn)], "/")[[1]], rev(gn$gene_removed[-nrow(gn)]))) else NULL, ranking_normfinder = if (!is.null(nf)) nf$gene else NULL, efficiencies = as.list(eff), NormqPCR_version = pkg_version("NormqPCR")),
    table = if (!is.null(gn)) table_of(gn) else table_of(nf),
    outputs = plot_outputs(),
    manualRoute = "library(NormqPCR); b <- new(\"qPCRBatch\", exprs = -Cq_matrix); selectHKs(b, method = \"geNorm\", log = TRUE, Symbols = genes); stabMeasureRho(t(-Cq_matrix) * log(2), group = groups, log = TRUE)"
  ))
})
