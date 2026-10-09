args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

read_protein_table <- function(path) {
  if (is.null(path) || !nzchar(path)) fail("give the argument data, the path of the protein table")
  if (!file.exists(path)) fail(paste("file not found:", path))
  sep <- if (grepl("\\.(csv)$", path, ignore.case = TRUE)) "," else "\t"
  read.delim(path, sep = sep, check.names = FALSE, stringsAsFactors = FALSE, quote = "", comment.char = "")
}

parse_groups <- function(g, samples) {
  if (is.null(g) || !length(g)) fail("give groups (one group name for each sample column, in the column order, or name=group pairs) or group_regex (a pattern with the group as the first capture group)")
  if (is.character(g) && length(g) == 1 && grepl("^\\s*[\\[{]", g)) g <- jsonlite::fromJSON(g)
  if (is.list(g) && !is.null(names(g))) g <- unlist(g)
  if (!is.null(names(g)) && all(samples %in% names(g))) return(unname(as.character(g[samples])))
  g <- trimws(unlist(strsplit(as.character(unlist(g)), ",")))
  if (all(grepl("=", g))) {
    kv <- strsplit(g, "=")
    m <- setNames(trimws(vapply(kv, `[`, "", 2)), trimws(vapply(kv, `[`, "", 1)))
    miss <- setdiff(samples, names(m))
    if (length(miss)) fail(sprintf("groups has no entry for the sample column(s): %s", paste(head(miss, 6), collapse = ", ")))
    return(unname(m[samples]))
  }
  if (length(g) != length(samples)) fail(sprintf("groups has %d entries but there are %d sample columns (%s). Give one group for each column, or name=group pairs.", length(g), length(samples), paste(head(samples, 8), collapse = ", ")))
  g
}

run_tool(function() {
  p <- read_params()
  suppressMessages(library(limma))
  df <- read_protein_table(p$data)
  cols <- as_list_arg(p$sample_columns)
  prefix <- pick(p, "sample_prefix", "")
  if (!length(cols) && nzchar(prefix)) cols <- grep(paste0("^", gsub("([][{}()+*^$|\\\\?.])", "\\\\\\1", prefix)), names(df), value = TRUE)
  if (!length(cols)) fail(sprintf("no sample columns. Give sample_columns or a sample_prefix that matches column names. Columns: %s", paste(head(names(df), 25), collapse = ", ")))
  miss <- setdiff(cols, names(df))
  if (length(miss)) fail(sprintf("sample_columns not in the table: %s. Columns: %s", paste(head(miss, 6), collapse = ", "), paste(head(names(df), 25), collapse = ", ")))
  rx <- pick(p, "group_regex", NULL)
  if (!is.null(rx)) {
    hit <- tryCatch(grepl(rx, cols), error = function(e) fail(sprintf("group_regex '%s' is not a valid regular expression: %s", rx, conditionMessage(e))))
    if (!all(hit)) fail(sprintf("group_regex '%s' does not match the sample column(s): %s", rx, paste(head(cols[!hit], 6), collapse = ", ")))
    groups <- sub(rx, "\\1", cols)
  } else groups <- parse_groups(p$groups, cols)
  excl <- as_list_arg(p$exclude_samples)
  if (length(excl)) {
    unknown <- setdiff(excl, cols)
    if (length(unknown)) fail(sprintf("exclude_samples not in the sample columns: %s. Sample columns: %s", paste(unknown, collapse = ", "), paste(head(cols, 12), collapse = ", ")))
    groups <- groups[!cols %in% excl]
    cols <- setdiff(cols, excl)
  }
  if (length(unique(groups)) < 2) fail("groups has only one group. A comparison needs two groups or more.")

  id_col <- pick(p, "id_column", intersect(c("Protein IDs", "Protein accession", "Protein.IDs", "Accession", "ProteinGroup", "PG.ProteinGroups"), names(df))[1])
  if (is.na(id_col)) id_col <- names(df)[1]
  need_column(df, id_col, "id_column")
  label_col <- pick(p, "label_column", intersect(c("Gene names", "Gene", "Gene.names", "PG.Genes"), names(df))[1])
  if (!is.na(label_col) && !label_col %in% names(df)) fail(sprintf("label_column '%s' is not a column of the table. Columns: %s", label_col, paste(head(names(df), 25), collapse = ", ")))
  keep_cols <- as_list_arg(p$keep_columns)
  miss <- setdiff(keep_cols, names(df))
  if (length(miss)) fail(sprintf("keep_columns not in the table: %s. Columns: %s", paste(miss, collapse = ", "), paste(head(names(df), 25), collapse = ", ")))

  n_input <- nrow(df)
  flags <- as_list_arg(pick(p, "exclude_flags", "Reverse, Potential contaminant, Contaminant"))
  flags_found <- intersect(flags, names(df))
  drop <- rep(FALSE, nrow(df))
  for (f in flags_found) drop <- drop | df[[f]] %in% c("+", "TRUE", "True", "true", "1")
  n_flagged <- sum(drop)
  df <- df[!drop, , drop = FALSE]

  min_pep <- as.integer(pick(p, "min_peptides", 0))
  n_after_flags <- nrow(df)
  if (min_pep > 0) {
    pep_col <- pick(p, "peptide_column", "Peptides")
    need_column(df, pep_col, "peptide_column")
    pep <- suppressWarnings(as.numeric(df[[pep_col]]))
    df <- df[!is.na(pep) & pep >= min_pep, , drop = FALSE]
    if (!nrow(df)) fail(sprintf("no protein has %d peptides or more in column %s. Lower min_peptides.", min_pep, pep_col))
  }
  n_after_peptides <- nrow(df)

  m <- as.matrix(as.data.frame(lapply(df[, cols, drop = FALSE], function(v) suppressWarnings(as.numeric(v))), check.names = FALSE))
  bad <- setdiff(cols[colSums(!is.na(m)) == 0], character())
  if (length(bad)) fail(sprintf("these sample columns have no numbers: %s. Check sample_columns.", paste(head(bad, 6), collapse = ", ")))
  if (isTRUE(as.logical(pick(p, "zero_as_missing", TRUE)))) m[!is.na(m) & m == 0] <- NA
  if (!isTRUE(as.logical(pick(p, "already_log2", FALSE)))) {
    if (any(m < 0, na.rm = TRUE)) fail("the sample columns have negative numbers, so they are not intensities. Set already_log2 to true if the values are log2 values.")
    m <- log2(m)
  }
  rownames(m) <- NULL
  n_quantified <- sum(rowSums(!is.na(m)) > 0)

  min_valid <- as.integer(pick(p, "min_valid", 2))
  rule <- pick(p, "valid_rule", "each group")
  if (!rule %in% c("each group", "at least one group")) fail(paste("valid_rule must be 'each group' or 'at least one group', not", rule))
  g_ok <- vapply(unique(groups), function(g) {
    k <- sum(groups == g)
    rowSums(!is.na(m[, groups == g, drop = FALSE])) >= min(min_valid, k)
  }, logical(nrow(m)))
  g_ok <- matrix(g_ok, nrow = nrow(m))
  keep <- if (rule == "each group") rowSums(g_ok) == ncol(g_ok) else rowSums(g_ok) >= 1
  m <- m[keep, , drop = FALSE]
  df <- df[keep, , drop = FALSE]
  if (!nrow(m)) fail(sprintf("no protein has %d valid value(s) (%s). Lower min_valid or change valid_rule.", min_valid, rule))

  med_before <- apply(m, 2, median, na.rm = TRUE)
  norm <- pick(p, "normalization", "median")
  if (!norm %in% c("none", "median", "quantile")) fail(paste("normalization must be none, median or quantile, not", norm))
  imp <- pick(p, "imputation", "none")
  if (!imp %in% c("none", "downshift normal", "minimum")) fail(paste("imputation must be none, 'downshift normal' or minimum, not", imp))
  order_of <- pick(p, "step_order", "normalize first")
  if (!order_of %in% c("normalize first", "impute first")) fail(paste("step_order must be 'normalize first' or 'impute first', not", order_of))
  scope <- pick(p, "impute_scope", "each sample")
  if (!scope %in% c("each sample", "all samples")) fail(paste("impute_scope must be 'each sample' or 'all samples', not", scope))
  n_missing_before <- sum(is.na(m))
  imputed <- if (imp == "none") matrix(FALSE, nrow(m), ncol(m)) else is.na(m)

  do_norm <- function(m) {
    if (norm == "median") {
      med <- apply(m, 2, median, na.rm = TRUE)
      sweep(m, 2, med - mean(med))
    } else if (norm == "quantile") normalizeBetweenArrays(m, method = "quantile") else m
  }
  do_impute <- function(m) {
    if (imp == "none") return(m)
    width <- as.numeric(pick(p, "impute_width", 0.3))
    shift <- as.numeric(pick(p, "impute_shift", 1.8))
    set.seed(as.integer(pick(p, "seed", 1)))
    if (imp == "downshift normal" && scope == "all samples") {
      v <- m[!is.na(m)]
      miss <- which(is.na(m))
      m[miss] <- rnorm(length(miss), mean(v) - shift * sd(v), width * sd(v))
      return(m)
    }
    for (j in seq_len(ncol(m))) {
      na <- is.na(m[, j])
      if (!any(na)) next
      v <- m[!na, j]
      m[na, j] <- if (imp == "minimum") min(v) else rnorm(sum(na), mean(v) - shift * sd(v), width * sd(v))
    }
    m
  }
  m <- if (order_of == "normalize first") do_impute(do_norm(m)) else do_norm(do_impute(m))
  med_after <- apply(m, 2, median, na.rm = TRUE)

  design <- data.frame(sample = cols, group = groups, stringsAsFactors = FALSE)
  extra <- df[, setdiff(keep_cols, c(id_col)), drop = FALSE]
  out <- data.frame(id = make.unique(as.character(df[[id_col]])), label = if (!is.na(label_col)) as.character(df[[label_col]]) else as.character(df[[id_col]]), extra, check.names = FALSE, stringsAsFactors = FALSE)
  out$n_imputed <- rowSums(imputed)
  out <- cbind(out, as.data.frame(m, check.names = FALSE))
  if (nzchar(out_path("prepared"))) write.csv(out, out_path("prepared"), row.names = FALSE)
  if (nzchar(out_path("design"))) write.csv(design, out_path("design"), row.names = FALSE)

  tab <- table(groups)
  per_group <- paste(sprintf("%s n=%d", names(tab), as.integer(tab)), collapse = ", ")
  metrics <- list(n_input = n_input, n_flagged_removed = n_flagged, n_after_flags = n_after_flags, n_after_peptide_filter = n_after_peptides, n_quantified = n_quantified, n_kept = nrow(m), n_samples = length(cols),
                  n_groups = length(tab), min_valid = min_valid, n_missing_before_imputation = n_missing_before, median_of_column_medians = round(mean(med_before), 6), column_median_range_before = round(diff(range(med_before)), 6), column_median_range_after = round(diff(range(med_after)), 6), n_imputed = if (imp == "none") 0L else n_missing_before,
                  pct_missing_kept = round(100 * n_missing_before / length(m), 2))
  emit(list(
    ok = TRUE,
    summary = sprintf("%d rows read, %d removed by the flag columns (%s), %d quantified in at least one sample, %d kept with %d valid value(s) in %s. Normalization %s, imputation %s%s. Groups: %s.%s",
                      n_input, n_flagged, if (length(flags_found)) paste(flags_found, collapse = ", ") else "no flag column found", n_quantified, nrow(m), min_valid, rule, norm, imp, if (imp != "none") sprintf(" (%d values, %s, %s)", n_missing_before, scope, order_of) else "", per_group, if (length(excl)) paste(" Excluded samples:", paste(excl, collapse = ", "), ".") else ""),
    metrics = metrics,
    data = list(prepared_file = out_path("prepared"), design_file = out_path("design"), groups = as.list(setNames(as.integer(tab), names(tab))), flag_columns_used = as.list(flags_found), limma_version = pkg_version("limma")),
    table = table_of(head(out[, setdiff(names(out), cols)], 10), out_path("prepared")),
    outputs = unname(lapply(Filter(nzchar, c(out_path("prepared"), out_path("design"))), function(q) list(path = q, kind = "table", name = basename(q)))),
    manualRoute = "Perseus: Filter rows based on categorical column (Reverse, Potential contaminant), Transform log2(x), Filter rows based on valid values, Normalization Subtract median, Imputation Replace missing values from normal distribution"
  ))
})
