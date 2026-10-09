args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  suppressMessages({library(diffcyt); library(SummarizedExperiment)})
  if (!file.exists(p$counts)) fail(paste("counts file not found:", p$counts))
  if (!file.exists(p$metadata)) fail(paste("metadata file not found:", p$metadata))
  counts <- read.csv(p$counts, check.names = FALSE, stringsAsFactors = FALSE)
  cm <- as.matrix(counts[, -1, drop = FALSE])
  rownames(cm) <- as.character(counts[[1]])
  md <- read.csv(p$metadata, check.names = FALSE, stringsAsFactors = FALSE)
  names(md)[1] <- "sample_id"
  miss <- setdiff(colnames(cm), md$sample_id)
  if (length(miss)) fail(paste0("samples without a row in the metadata file: ", paste(head(miss, 5), collapse = ", "), ". The first column of the metadata file must be sample_id."))
  md <- md[match(colnames(cm), md$sample_id), , drop = FALSE]
  cond <- pick(p, "condition", NULL)
  if (is.null(cond) || !cond %in% names(md)) fail(paste0("condition is not a column of the metadata file: ", cond, ". Columns: ", paste(names(md), collapse = ", ")))
  levs <- sort(unique(as.character(md[[cond]])))
  if (length(levs) != 2) fail(paste0("condition ", cond, " has ", length(levs), " levels (", paste(levs, collapse = ", "), "). This tool compares exactly two levels."))
  ref <- pick(p, "reference", levs[1])
  if (!ref %in% levs) fail(paste0("reference ", ref, " is not a level of ", cond, ": ", paste(levs, collapse = ", ")))
  other <- setdiff(levs, ref)
  md[[cond]] <- factor(md[[cond]], levels = c(ref, other))
  pair <- pick(p, "pair_by", "none")
  paired <- !identical(pair, "none")
  if (paired) {
    if (!pair %in% names(md)) fail(paste0("pair_by is not a column of the metadata file: ", pair, ". Columns: ", paste(names(md), collapse = ", ")))
    md[[pair]] <- factor(md[[pair]])
  }
  method <- pick(p, "method", "glmm")
  fdr <- as.numeric(pick(p, "fdr", 0.05))
  se <- SummarizedExperiment(assays = list(counts = cm), rowData = data.frame(cluster_id = factor(rownames(cm), levels = rownames(cm)), n_cells = rowSums(cm)), colData = md)
  if (method == "glmm") {
    f <- createFormula(md, cols_fixed = cond, cols_random = c("sample_id", if (paired) pair))
    res <- testDA_GLMM(se, f, createContrast(c(0, 1)))
  } else {
    cols <- c(cond, if (paired) pair)
    design <- createDesignMatrix(md, cols_design = cols)
    contrast <- createContrast(c(0, 1, rep(0, ncol(design) - 2)))
    res <- if (method == "edgeR") testDA_edgeR(se, design, contrast) else if (method == "voom") testDA_voom(se, design, contrast) else fail(paste("unknown method:", method))
  }
  rd <- as.data.frame(rowData(res))
  rd$cluster_id <- as.character(rd$cluster_id)
  pct <- sweep(cm, 2, colSums(cm), "/") * 100
  m_ref <- rowMeans(pct[, md[[cond]] == ref, drop = FALSE])
  m_oth <- rowMeans(pct[, md[[cond]] == other, drop = FALSE])
  tab <- data.frame(population = rd$cluster_id, mean_percent_ref = m_ref[rd$cluster_id], mean_percent_other = m_oth[rd$cluster_id], log2_ratio = log2(m_oth[rd$cluster_id] / m_ref[rd$cluster_id]), p = rd$p_val, p_adj = rd$p_adj, row.names = NULL)
  if ("logFC" %in% names(rd)) tab$logFC <- rd$logFC
  names(tab)[2:3] <- c(paste0("mean_percent_", ref), paste0("mean_percent_", other))
  tab <- tab[order(tab$p), ]
  tab_path <- out_path("table")
  write.csv(tab, tab_path, row.names = FALSE)
  sig <- tab$p_adj <= fdr
  design_text <- if (method == "glmm") paste0("binomial GLMM: ", cond, " + (1|sample_id)", if (paired) paste0(" + (1|", pair, ")") else "") else paste0(method, ": ~ ", cond, if (paired) paste0(" + ", pair) else "")
  emit(list(
    ok = TRUE,
    summary = sprintf("Differential abundance of %d populations, %s, %s %s versus %s. %d populations at adjusted p <= %g (Benjamini-Hochberg). Smallest p %.3g (%s).", nrow(tab), design_text, cond, other, ref, sum(sig), fdr, min(tab$p, na.rm = TRUE), tab$population[1]),
    metrics = list(n_populations = nrow(tab), n_significant = sum(sig), fdr = fdr, n_samples = ncol(cm), min_p = min(tab$p, na.rm = TRUE)),
    data = list(method = method, model = design_text, condition = cond, reference = ref, compared = other, paired = paired, pair_by = pair, significant = tab$population[sig], diffcyt_version = as.character(packageVersion("diffcyt"))),
    table = table_of(tab, tab_path, 30),
    manualRoute = sprintf("diffcyt::%s on a SummarizedExperiment with rowData cluster_id and n_cells. Design: %s", c(glmm = "testDA_GLMM", edgeR = "testDA_edgeR", voom = "testDA_voom")[[method]], design_text)
  ))
})
