args <- commandArgs(FALSE)
here <- dirname(sub("^--file=", "", args[grep("^--file=", args)]))
source(file.path(here, "lib.R"))
source(file.path(here, "table_lib.R"))

run_tool(function() {
  p <- read_params()
  df <- read_table(p$data, "feature table")
  id_col <- need_column(df, pick(p, "id_column", names(df)[1]), "id_column")
  group_col <- need_column(df, pick(p, "group_column", ""), "group_column")
  meta <- as_list_arg(p$meta_columns)
  bad_meta <- setdiff(meta, names(df))
  if (length(bad_meta)) fail(sprintf("meta_columns names column(s) that are not in the table: %s. Columns: %s", paste(bad_meta, collapse = ", "), paste(head(names(df), 20), collapse = ", ")))
  drop_samples <- as_list_arg(p$exclude_samples)
  unknown <- setdiff(drop_samples, df[[id_col]])
  if (length(unknown)) fail(sprintf("exclude_samples names sample(s) that are not in column '%s': %s", id_col, paste(unknown, collapse = ", ")))
  df <- df[!df[[id_col]] %in% drop_samples, , drop = FALSE]
  feat <- setdiff(names(df), c(id_col, group_col, meta))
  non_num <- feat[!vapply(df[feat], is.numeric, TRUE)]
  if (length(non_num)) fail(sprintf("column(s) %s are not numeric and are not named in meta_columns. Name them in meta_columns or remove them.", paste(head(non_num, 5), collapse = ", ")))
  if (length(feat) < 2) fail(sprintf("the table has %d feature column(s). The tool needs at least 2.", length(feat)))
  x <- as.matrix(df[feat])
  n_samples <- nrow(x)
  n_in <- ncol(x)
  groups <- as.character(df[[group_col]])
  if (anyNA(groups) || any(!nzchar(groups))) fail(sprintf("group_column '%s' has an empty cell. Fill the cell or remove the row.", group_col))

  if (isTRUE(pick(p, "zero_as_missing", FALSE))) x[!is.na(x) & x == 0] <- NA
  n_missing_raw <- sum(is.na(x))

  min_frac <- as.numeric(pick(p, "min_detect_fraction", 0))
  detect <- colMeans(!is.na(x))
  keep <- detect >= min_frac & detect > 0
  x <- x[, keep, drop = FALSE]
  n_removed <- n_in - ncol(x)
  if (ncol(x) < 2) fail(sprintf("only %d feature(s) have a value in at least %s of the samples. Lower min_detect_fraction.", ncol(x), fmt_num(min_frac)))

  imp <- pick(p, "imputation", "half_min")
  n_imputed <- 0
  if (anyNA(x)) {
    if (imp == "none") fail(sprintf("the table has %d missing value(s) after the filter and imputation is none. Choose an imputation method.", sum(is.na(x))))
    fill <- switch(imp,
      half_min = apply(x, 2, function(v) min(v[!is.na(v) & v > 0]) / 2),
      min = apply(x, 2, function(v) min(v[!is.na(v) & v > 0])),
      median = apply(x, 2, median, na.rm = TRUE),
      zero = rep(0, ncol(x)),
      fail(sprintf("imputation '%s' is not valid. Valid: none, half_min, min, median, zero", imp)))
    idx <- which(is.na(x), arr.ind = TRUE)
    n_imputed <- nrow(idx)
    x[idx] <- fill[idx[, 2]]
  }

  norm <- pick(p, "normalization", "none")
  tr <- pick(p, "transform", "none")
  n_negative <- sum(x < 0, na.rm = TRUE)
  if (n_negative > 0 && (norm != "none" || tr != "none")) fail(sprintf("the table has %d negative value(s), so it is probably on a log scale. Normalization %s and transform %s need intensities of zero or more. Set both to none, or give a linear table.", n_negative, norm, tr))
  tot <- rowSums(x)
  if (norm != "none" && any(tot <= 0)) fail(sprintf("sample(s) %s have a total of zero. Normalization cannot divide by zero.", paste(df[[id_col]][tot <= 0], collapse = ", ")))
  factors <- rep(1, n_samples)
  if (norm == "total_area") {
    factors <- tot / median(tot)
  } else if (norm == "median") {
    med <- apply(x, 1, median)
    if (any(med <= 0)) fail("normalization median needs a nonzero median in every sample. Use total_area or pqn.")
    factors <- med / median(med)
  } else if (norm == "pqn") {
    ref_group <- pick(p, "pqn_reference", "all")
    if (ref_group != "all" && !ref_group %in% groups) fail(sprintf("pqn_reference '%s' is not a group. Groups: %s. Use all for every sample.", ref_group, paste(unique(groups), collapse = ", ")))
    total_factor <- tot / median(tot)
    xi <- x / total_factor
    ref <- apply(if (ref_group == "all") xi else xi[groups == ref_group, , drop = FALSE], 2, median)
    ok <- ref > 0
    if (sum(ok) < 2) fail("the reference spectrum has fewer than 2 nonzero features. PQN needs more.")
    quot <- sweep(xi[, ok, drop = FALSE], 2, ref[ok], "/")
    factors <- total_factor * apply(quot, 1, median)
  } else if (norm != "none") {
    fail(sprintf("normalization '%s' is not valid. Valid: none, total_area, median, pqn", norm))
  }
  x <- x / factors

  if (tr %in% c("log2", "log10") && any(x <= 0)) fail(sprintf("transform %s needs positive values, and %d value(s) are zero. Use imputation half_min or min, or choose sqrt.", tr, sum(x <= 0)))
  x <- switch(tr, none = x, log2 = log2(x), log10 = log10(x), sqrt = sqrt(x),
    fail(sprintf("transform '%s' is not valid. Valid: none, log2, log10, sqrt", tr)))

  out <- data.frame(df[[id_col]], groups, df[meta], x, check.names = FALSE, stringsAsFactors = FALSE)
  names(out)[1:2] <- c(id_col, group_col)
  if (nzchar(out_path("prepared"))) write.csv(out, out_path("prepared"), row.names = FALSE)
  tab <- table(groups)
  emit(list(
    ok = TRUE,
    summary = sprintf("%d samples (%s). %d features read, %d removed for fewer than %s of values present, %d kept. %d missing values before imputation, %d imputed (%s). Normalization %s, transform %s. Scale factors of the samples: %s to %s.",
      n_samples, paste(sprintf("%s %d", names(tab), as.integer(tab)), collapse = ", "), n_in, n_removed, fmt_num(min_frac), ncol(x), n_missing_raw, n_imputed, imp, norm, tr, fmt_num(min(factors)), fmt_num(max(factors))),
    metrics = list(n_samples = n_samples, n_features_read = n_in, n_features_removed = n_removed, n_features_kept = ncol(x), n_missing_before_imputation = n_missing_raw, n_imputed = n_imputed,
                   factor_min = min(factors), factor_max = max(factors), n_groups = length(tab)),
    data = list(prepared_file = out_path("prepared"), id_column = id_col, group_column = group_col, meta_columns = meta, normalization = norm, transform = tr, imputation = imp, groups = as.list(tab)),
    table = table_of(out[, seq_len(min(ncol(out), 8))], out_path("prepared"), 8),
    outputs = list(list(path = out_path("prepared"), kind = "table", name = basename(out_path("prepared")))),
    manualRoute = "MetaboAnalyst: Data Processing, Filtering, Missing values, Row-wise normalization (sample-specific normalization PQN or sum), Data transformation (log10 or square root)"
  ))
})
