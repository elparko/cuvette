args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_vegan()
  inp <- apply_filter(load_inputs(p), pick(p, "sample_filter", NULL))
  m <- inp$m
  md <- inp$md
  rhs <- trimws(sub("^.*~", "", pick(p, "formula", "")))
  if (!nzchar(rhs)) fail("formula is empty. Name the metadata columns to test, such as group or group + age.")
  vars <- all.vars(as.formula(paste("~", rhs)))
  bad <- setdiff(vars, names(md))
  if (length(bad)) fail(paste0("not a column of the metadata: ", paste(bad, collapse = ", "), ". Columns: ", paste(names(md), collapse = ", ")))
  ok <- complete.cases(md[, vars, drop = FALSE])
  n_missing <- sum(!ok)
  m <- m[ok, , drop = FALSE]
  md <- md[ok, , drop = FALSE]
  for (v in vars) if (is.character(md[[v]])) md[[v]] <- factor(md[[v]])
  min_prev <- as.numeric(pick(p, "min_prevalence", 0))
  if (min_prev > 0) m <- m[, colSums(m > 0) / nrow(m) >= min_prev, drop = FALSE]
  empty <- rownames(m)[rowSums(m) == 0]
  if (length(empty)) fail(paste0("samples with zero reads after the feature filter: ", paste(head(empty, 5), collapse = ", "), ". Remove them or lower min_prevalence."))
  norm <- pick(p, "normalization", NULL)
  below_depth <- character()
  if (is.null(norm)) fail("normalization is missing. The scientist must choose relative, rarefy, clr or none.")
  distance <- pick(p, "distance", "bray")
  seed <- as.integer(pick(p, "seed", 1))
  nperm <- as.integer(pick(p, "permutations", 999))
  pseudo <- as.numeric(pick(p, "pseudocount", 1))
  if (norm == "relative") {
    x <- m / rowSums(m)
  } else if (norm == "rarefy") {
    depth <- as.integer(pick(p, "rarefy_depth", NA))
    if (is.na(depth)) fail("rarefy_depth is missing. Rarefaction needs a depth in reads.")
    if (!is_whole(m)) fail("rarefaction needs whole-number counts.")
    keep <- rowSums(m) >= depth
    below_depth <- rownames(m)[!keep]
    if (sum(keep) < 3) fail(sprintf("only %d samples have %d reads or more. Lower rarefy_depth.", sum(keep), depth))
    m <- m[keep, , drop = FALSE]
    md <- md[keep, , drop = FALSE]
    set.seed(seed)
    x <- vegan::rrarefy(m, depth)
  } else if (norm == "clr") {
    lg <- log(m + pseudo)
    x <- lg - rowMeans(lg)
  } else if (norm == "none") {
    x <- m
  } else {
    fail(paste0("unknown normalization: ", norm, ". Use relative, rarefy, clr or none."))
  }
  if (norm == "clr" && distance != "euclidean") fail("CLR values can be negative. Use distance euclidean (the Aitchison distance) with normalization clr.")
  d <- vegdist(x, method = distance, binary = distance == "jaccard")
  perms <- permute::how(nperm = nperm)
  strata <- pick(p, "strata", "none")
  if (!identical(strata, "none")) {
    if (!strata %in% names(md)) fail(paste0("strata is not a column of the metadata: ", strata))
    perms <- permute::how(nperm = nperm, blocks = md[[strata]])
  }
  by <- pick(p, "by", "terms")
  set.seed(seed)
  fit <- adonis2(as.formula(paste("d ~", rhs)), data = md, permutations = perms, by = by)
  tab <- as.data.frame(fit)
  df <- data.frame(term = rownames(tab), Df = tab$Df, SumOfSqs = tab$SumOfSqs, R2 = tab$R2, F = tab$F, p = tab$`Pr(>F)`, row.names = NULL)
  first <- df[1, ]
  disp <- NULL
  v1 <- vars[1]
  if (is.factor(md[[v1]]) && nlevels(md[[v1]]) > 1 && all(table(md[[v1]]) > 0)) {
    bd <- betadisper(d, md[[v1]], type = "median")
    set.seed(seed)
    pt <- permutest(bd, permutations = nperm)
    disp <- list(variable = v1, center = "spatial median", f = pt$tab[1, "F"], p = pt$tab[1, "Pr(>F)"])
  }
  out <- out_path("table")
  write.csv(df, out, row.names = FALSE)
  pc <- cmdscale(d, k = 2, eig = TRUE)
  png(out_path("plot"), width = 800, height = 650, res = 110)
  col <- if (is.factor(md[[v1]])) as.integer(md[[v1]]) else "grey40"
  plot(pc$points, col = col, pch = 16, xlab = sprintf("PCo1 (%.1f%%)", 100 * pc$eig[1] / sum(abs(pc$eig))), ylab = sprintf("PCo2 (%.1f%%)", 100 * pc$eig[2] / sum(abs(pc$eig))), main = paste("PCoA,", distance, "distance"))
  if (is.factor(md[[v1]])) legend("topright", legend = levels(md[[v1]]), col = seq_len(nlevels(md[[v1]])), pch = 16, cex = 0.8)
  dev.off()
  metrics <- list(r2 = first$R2, f = first$F, p = first$p, df = first$Df, n_samples = nrow(m), n_features = ncol(m), permutations = nperm, n_missing_dropped = n_missing, residual_r2 = df$R2[df$term == "Residual"], n_below_rarefy_depth = length(below_depth))
  if (!is.null(disp)) { metrics$dispersion_f <- disp$f; metrics$dispersion_p <- disp$p }
  emit(list(
    ok = TRUE,
    summary = sprintf("PERMANOVA %s on %d samples, %s distance after %s, %d permutations, seed %d: %s R2 %.4f, F %.3f, p %.4f.%s", rhs, nrow(m), distance, norm, nperm, seed, first$term, first$R2, first$F, first$p, if (!is.null(disp)) sprintf(" Dispersion test of %s (distances to the %s): F %.3f, p %.4f.", disp$variable, disp$center, disp$f, disp$p) else "", if (length(below_depth)) sprintf(" %d samples have fewer reads than the rarefaction depth and are left out: %s.", length(below_depth), paste(head(below_depth, 10), collapse = ", ")) else ""),
    metrics = metrics,
    data = list(formula = rhs, distance = distance, normalization = norm, by = by, strata = strata, seed = seed, min_p_possible = 1 / (nperm + 1), dispersion = disp, vegan_version = as.character(packageVersion("vegan"))),
    table = table_of(df, out, 20),
    manualRoute = sprintf("set.seed(%d); d <- vegdist(x, \"%s\"%s); adonis2(d ~ %s, data = md, permutations = %d, by = \"%s\"); permutest(betadisper(d, md$%s, type = \"median\"))", seed, distance, if (distance == "jaccard") ", binary = TRUE" else "", rhs, nperm, by, v1)
  ))
})
