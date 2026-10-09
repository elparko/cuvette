args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  inp <- apply_filter(load_inputs(p), pick(p, "sample_filter", NULL))
  m <- inp$m
  md <- inp$md
  method <- pick(p, "method", NULL)
  if (is.null(method)) fail("method is missing. The scientist must choose maaslin2 or aldex2.")
  fixed <- split_list(p$fixed_effects)
  random <- setdiff(split_list(p$random_effects), "none")
  if (!length(fixed)) fail("fixed_effects is empty. Name the metadata columns to test, as a comma list.")
  bad <- setdiff(c(fixed, random), names(md))
  if (length(bad)) fail(paste0("not a column of the metadata: ", paste(bad, collapse = ", "), ". Columns: ", paste(names(md), collapse = ", ")))
  ok <- complete.cases(md[, c(fixed, random), drop = FALSE])
  n_incomplete <- sum(!ok)
  m <- m[ok, , drop = FALSE]
  md <- md[ok, , drop = FALSE]
  if (nrow(m) < 6) fail(sprintf("only %d samples remain after the filter and the removal of rows with missing values. Check sample_filter and the columns %s.", nrow(m), paste(c(fixed, random), collapse = ", ")))
  fdr <- as.numeric(pick(p, "fdr", 0.05))
  min_prev <- as.numeric(pick(p, "min_prevalence", NA))
  if (is.na(min_prev)) fail("min_prevalence is missing. The scientist must choose the share of samples in which a feature must occur (0 keeps all).")
  seed <- as.integer(pick(p, "seed", 1))
  out_dir <- file.path(tempdir(), "da_out")
  tab_path <- out_path("table")
  if (method == "maaslin2") {
    suppressMessages(library(Maaslin2))
    norm <- pick(p, "normalization", NULL)
    trans <- pick(p, "transform", NULL)
    if (is.null(norm) || is.null(trans)) fail("normalization and transform are missing. The scientist must choose them (for example TSS and LOG).")
    analysis <- pick(p, "analysis_method", "LM")
    standardize <- !identical(pick(p, "standardize", TRUE), FALSE)
    ref <- setdiff(split_list(p$reference), "none")
    ref_arg <- if (length(ref) >= 2) paste(ref[1], ref[2], sep = ",") else NULL
    for (v in fixed) if (is.character(md[[v]])) md[[v]] <- factor(md[[v]])
    if (!is.null(ref_arg)) {
      rv <- ref[1]
      if (!rv %in% names(md)) fail(paste0("reference variable is not a column of the metadata: ", rv))
      if (!ref[2] %in% as.character(md[[rv]])) fail(paste0("reference level ", ref[2], " is not a value of ", rv, ": ", paste(unique(as.character(md[[rv]])), collapse = ", ")))
    }
    set.seed(seed)
    sink("/dev/null")
    fit <- tryCatch(
      Maaslin2(input_data = m, input_metadata = md, output = out_dir, fixed_effects = fixed, random_effects = if (length(random)) random else NULL, reference = ref_arg, normalization = norm, transform = trans, analysis_method = analysis, standardize = standardize, min_prevalence = min_prev, min_abundance = as.numeric(pick(p, "min_abundance", 0)), max_significance = fdr, correction = "BH", plot_heatmap = FALSE, plot_scatter = FALSE, cores = 1),
      finally = sink())
    r <- fit$results
    tab <- data.frame(feature = r$feature, variable = r$metadata, value = r$value, coef = r$coef, stderr = r$stderr, p = r$pval, q = r$qval, n = r$N, n_nonzero = r$N.not.zero, stringsAsFactors = FALSE)
    tab <- tab[order(tab$q, tab$p), ]
    n_tested_features <- length(unique(tab$feature))
    version <- as.character(packageVersion("Maaslin2"))
    model <- sprintf("MaAsLin2 %s, %s normalization, %s transform, fixed %s%s%s", analysis, norm, trans, paste(fixed, collapse = " + "), if (length(random)) paste0(", random ", paste(random, collapse = " + ")) else "", if (standardize) ", continuous columns standardized" else "")
  } else if (method == "aldex2") {
    suppressMessages(library(ALDEx2))
    if (length(fixed) != 1) fail("aldex2 compares two groups. Give exactly one column in fixed_effects.")
    cond <- as.character(md[[fixed]])
    levs <- sort(unique(cond))
    if (length(levs) != 2) fail(paste0("aldex2 needs a column with exactly two levels. ", fixed, " has ", length(levs), ": ", paste(head(levs, 6), collapse = ", ")))
    if (!is_whole(m)) fail("aldex2 needs whole-number counts. This table has fractions.")
    keep <- colSums(m > 0) / nrow(m) >= min_prev & colSums(m) > 0
    mc <- as.integer(pick(p, "mc_samples", 128))
    set.seed(seed)
    sink("/dev/null")
    res <- tryCatch(aldex(t(m[, keep, drop = FALSE]), cond, mc.samples = mc, test = "t", effect = TRUE, denom = "all", verbose = FALSE), finally = sink())
    res$feature <- rownames(res)
    tab <- data.frame(feature = res$feature, variable = fixed, value = levs[2], coef = res$diff.btw, effect = res$effect, p = res$we.ep, q = res$we.eBH, wilcoxon_p = res$wi.ep, wilcoxon_q = res$wi.eBH, stringsAsFactors = FALSE)
    tab <- tab[order(tab$q, tab$p), ]
    n_tested_features <- nrow(tab)
    version <- as.character(packageVersion("ALDEx2"))
    model <- sprintf("ALDEx2 Welch t-test on centered log-ratio values, %d Monte Carlo draws, %s versus %s, denominator all features", mc, levs[2], levs[1])
  } else {
    fail(paste0("unknown method: ", method, ". Use maaslin2 or aldex2."))
  }
  sig <- tab$q <= fdr
  sig[is.na(sig)] <- FALSE
  write.csv(tab, tab_path, row.names = FALSE)
  top <- tab[1, ]
  feat_name <- pick(p, "feature", NULL)
  feat_rows <- NULL
  if (!is.null(feat_name)) {
    hit <- tab[tab$feature == feat_name | tab$feature == make.names(feat_name), , drop = FALSE]
    if (!nrow(hit)) fail(paste0("feature is not in the results: ", feat_name, ". The filter may have removed it. First features: ", paste(head(unique(tab$feature), 5), collapse = ", ")))
    keys <- ifelse(hit$value == hit$variable, hit$variable, paste(hit$variable, hit$value, sep = "_"))
    feat_rows <- setNames(lapply(seq_len(nrow(hit)), function(i) list(coef = hit$coef[i], stderr = if ("stderr" %in% names(hit)) hit$stderr[i] else NULL, p = hit$p[i], q = hit$q[i])), keys)
  }
  emit(list(
    ok = TRUE,
    summary = sprintf("%s. %d samples (%d removed for missing values), %d features tested, %d tests. %d results at q <= %g (Benjamini-Hochberg). Smallest q %.4g: %s, %s.", model, nrow(m), n_incomplete, n_tested_features, nrow(tab), sum(sig), fdr, top$q, top$feature, top$variable),
    metrics = list(n_samples = nrow(m), n_removed_missing = n_incomplete, n_features_tested = n_tested_features, n_tests = nrow(tab), n_significant = sum(sig), fdr = fdr, min_q = top$q, min_p = top$p),
    data = list(method = method, model = model, significant = unique(tab$feature[sig]), top_feature = top$feature, top_variable = top$variable, top_coef = top$coef, feature_coef = feat_rows, seed = seed, package_version = version),
    table = table_of(tab, tab_path, 20),
    manualRoute = if (method == "maaslin2") sprintf("Maaslin2::Maaslin2(input_data, input_metadata, output = \"out\", fixed_effects = c(%s), normalization = \"%s\", transform = \"%s\", analysis_method = \"%s\", min_prevalence = %g, max_significance = %g)", paste0("\"", fixed, "\"", collapse = ", "), norm, trans, analysis, min_prev, fdr) else sprintf("ALDEx2::aldex(reads, conditions, mc.samples = %d, test = \"t\", effect = TRUE, denom = \"all\")", mc)
  ))
})
