load_mr_input <- function(p) {
  df <- read_data(p$data, "the variant table")
  snp_col <- need_column(df, pick(p, "snp_col", if ("snp" %in% names(df)) "snp" else NULL), "snp_col")
  cols <- c(
    bx = need_column(df, pick(p, "bx_col", if ("beta_exposure" %in% names(df)) "beta_exposure" else NULL), "bx_col"),
    bxse = need_column(df, pick(p, "bxse_col", if ("se_exposure" %in% names(df)) "se_exposure" else NULL), "bxse_col"),
    by = need_column(df, pick(p, "by_col", if ("beta_outcome" %in% names(df)) "beta_outcome" else NULL), "by_col"),
    byse = need_column(df, pick(p, "byse_col", if ("se_outcome" %in% names(df)) "se_outcome" else NULL), "byse_col"))
  harmonized <- pick(p, "alleles_harmonized", NULL)
  if (is.null(harmonized)) fail("alleles_harmonized is not set. It is the decision 'Allele harmonization'. Ask the scientist whether the exposure and outcome effects use the same effect allele for every variant.")
  if (!isTRUE(as.logical(harmonized))) fail("alleles_harmonized is false. The package does not align alleles. Align the effect allele of the exposure and the outcome for every variant, then set alleles_harmonized to true.")
  snps <- as.character(df[[snp_col]])
  if (anyDuplicated(snps)) fail(sprintf("snp_col '%s' has the repeated name '%s'. Each variant must appear once.", snp_col, snps[anyDuplicated(snps)]))
  v <- lapply(cols, function(cn) numeric_column(df, cn, "the column"))
  names(v) <- names(cols)
  if (any(v$bxse <= 0) || any(v$byse <= 0)) fail("a standard error is zero or negative in the variant table. Standard errors must be above 0.")
  exclude <- as_list_arg(p$exclude)
  keep <- rep(TRUE, length(snps))
  if (length(exclude)) {
    miss <- setdiff(exclude, snps)
    if (length(miss)) fail(sprintf("exclude names variants that are not in column '%s': %s", snp_col, paste(miss, collapse = ", ")))
    keep <- !snps %in% exclude
  }
  corr <- NULL
  if (!is.null(pick(p, "correlation", NULL))) {
    if (!file.exists(p$correlation)) fail(paste("file not found:", p$correlation))
    cd <- read.csv(p$correlation, header = FALSE, colClasses = "character", strip.white = TRUE)
    is_num <- function(x) !anyNA(suppressWarnings(as.numeric(x)))
    if (!all(vapply(cd[1, ], is_num, TRUE))) cd <- cd[-1, , drop = FALSE]
    first_text <- !is_num(cd[[1]])
    m <- as.matrix(cd[, if (first_text) -1 else seq_len(ncol(cd)), drop = FALSE])
    storage.mode(m) <- "numeric"
    if (nrow(m) != ncol(m) || nrow(m) != length(snps)) fail(sprintf("the correlation file is %d by %d. It must be a square matrix with one row for each of the %d variants in the variant table, before any exclusion.", nrow(m), ncol(m), length(snps)))
    if (any(is.na(m))) fail("the correlation file has a missing value")
    if (first_text && !identical(as.character(cd[[1]]), snps)) fail("the first column of the correlation file does not list the variants in the same order as the variant table")
    corr <- unname(m[keep, keep, drop = FALSE])
  }
  list(bx = v$bx[keep], bxse = v$bxse[keep], by = v$by[keep], byse = v$byse[keep], snps = snps[keep], corr = corr,
       exposure = pick(p, "exposure", "exposure"), outcome = pick(p, "outcome", "outcome"), n_excluded = sum(!keep))
}
