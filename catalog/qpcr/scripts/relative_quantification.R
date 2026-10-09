args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  method <- need(p, "method", "Quantification method")
  if (!method %in% c("ddct", "pfaffl")) fail(paste("method must be ddct or pfaffl, not", method))
  err <- pick(p, "error", "sd_dct")
  if (!err %in% c("sd_dct", "sd_livak", "ci95")) fail(paste("error must be sd_dct, sd_livak or ci95, not", err))
  level <- as.numeric(pick(p, "ci_level", 0.95))
  d <- read_long(p, need_group = TRUE)
  reps <- pick(p, "replicates", "mean")
  s <- collapse_reps(d, reps)
  genes <- unique(s$gene)
  refs <- as_list_arg(need(p, "reference_genes", "Reference genes"))
  if (!length(refs)) fail("reference_genes is empty. Name one or more reference genes from the data.")
  miss <- setdiff(refs, genes)
  if (length(miss)) fail(sprintf("reference_genes names %s, which is not a gene of the data. Genes: %s", paste(miss, collapse = ", "), paste(genes, collapse = ", ")))
  cal <- as.character(need(p, "calibrator", "Calibrator group"))
  groups <- unique(s$group)
  if (!cal %in% groups) fail(sprintf("calibrator '%s' is not a group of the data. Groups: %s", cal, paste(groups, collapse = ", ")))
  targets <- as_list_arg(pick(p, "targets", NULL))
  if (!length(targets)) targets <- setdiff(genes, refs)
  miss <- setdiff(targets, genes)
  if (length(miss)) fail(sprintf("targets names %s, which is not a gene of the data. Genes: %s", paste(miss, collapse = ", "), paste(genes, collapse = ", ")))
  if (!length(targets)) fail("there is no target gene: every gene of the data is a reference gene")
  eff_in <- pick(p, "efficiencies", "2")
  eff <- parse_efficiencies(eff_in, genes)
  warns <- character()
  if (method == "ddct") {
    if (any(eff != 2)) warns <- c(warns, "method ddct uses an efficiency of 2 for every gene; the efficiencies were not used. Choose pfaffl to use them")
    eff[] <- 2
  }
  lg <- log2(eff)
  w <- reshape(s[, c("sample", "group", "gene", "cq")], idvar = c("sample", "group"), timevar = "gene", direction = "wide")
  names(w) <- sub("^cq\\.", "", names(w))
  refL <- if (length(refs) == 1) -w[[refs]] * lg[[refs]] else rowMeans(sapply(refs, function(r) -w[[r]] * lg[[r]]))
  refCq <- if (length(refs) == 1) w[[refs]] else rowMeans(as.matrix(w[, refs, drop = FALSE]))
  rows <- list(); per_sample <- list(); dropped <- 0
  q <- function(df) qt(1 - (1 - level) / 2, df)
  for (tg in targets) {
    L <- -w[[tg]] * lg[[tg]] - refL
    ok <- is.finite(L)
    dropped <- dropped + sum(!ok)
    ps <- data.frame(sample = w$sample, group = w$group, gene = tg, cq_target = w[[tg]], cq_reference = refCq, dct = -L, stringsAsFactors = FALSE)[ok, ]
    per_sample[[tg]] <- ps
    Lc <- L[ok & w$group == cal]
    if (length(Lc) < 1) fail(sprintf("the calibrator group '%s' has no sample with a Cq for %s and the reference genes", cal, tg))
    for (g in groups) {
      sel <- ok & w$group == g
      Lg <- L[sel]
      n <- length(Lg)
      if (!n) { warns <- c(warns, sprintf("group %s has no sample with a Cq for %s and the reference genes", g, tg)); next }
      l2fc <- mean(Lg) - mean(Lc)
      sdd <- if (n >= 2) sd(Lg) else NA
      e <- switch(err,
        sd_dct = sdd,
        sd_livak = if (n >= 2) sqrt(sd(w[[tg]][sel] * lg[[tg]])^2 + sd(-refL[sel])^2) else NA,
        ci95 = NA)
      lo <- hi <- pv <- NA
      if (err == "ci95") {
        if (g != cal && n >= 2 && length(Lc) >= 2) {
          tt <- t.test(Lg, Lc, conf.level = level)
          lo <- 2^tt$conf.int[1]; hi <- 2^tt$conf.int[2]; pv <- tt$p.value
        }
      } else if (is.finite(e)) { lo <- 2^(l2fc - e); hi <- 2^(l2fc + e) }
      rows[[paste(tg, g)]] <- data.frame(gene = tg, group = g, n = n, mean_dct = -mean(Lg), sd_dct = sdd, ddct = -l2fc, log2_fold = l2fc, fold = 2^l2fc, error = e, lower = lo, upper = hi, p = pv, stringsAsFactors = FALSE)
    }
  }
  tab <- do.call(rbind, rows); rownames(tab) <- NULL
  ps <- do.call(rbind, per_sample); rownames(ps) <- NULL
  if (nzchar(out_path("results"))) write.csv(tab, out_path("results"), row.names = FALSE)
  if (nzchar(out_path("samples"))) write.csv(ps, out_path("samples"), row.names = FALSE)
  metrics <- list(n_samples = nrow(w), n_targets = length(targets), n_reference_genes = length(refs), n_non_detect = sum(d$non_detect), n_excluded = attr(d, "n_excluded"), n_dropped = dropped)
  for (i in seq_len(nrow(tab))) {
    k <- paste0(clean_name(tab$gene[i]), "_", clean_name(tab$group[i]))
    for (f in c("fold", "ddct", "mean_dct", "lower", "upper", "p")) if (is.finite(tab[[f]][i])) metrics[[paste0(f, "_", k)]] <- tab[[f]][i]
  }

  draw_both(out_path("plot"), out_path("plot_svg"), max(6, 1.2 * nrow(tab)), 5, function() {
    par(mar = c(7, 4.5, 3, 1))
    yl <- range(log2(c(tab$fold, tab$lower, tab$upper)), na.rm = TRUE)
    yl <- range(c(yl, 0, ps$dct * 0)) + c(-0.5, 0.5)
    x <- barplot(tab$log2_fold, names.arg = paste(tab$gene, tab$group), las = 2, cex.names = 0.75, ylim = yl, ylab = "log2 fold change", col = ifelse(tab$group == cal, "grey80", "#1f4e79"), main = sprintf("%s, reference %s, calibrator %s", if (method == "ddct") "2^-ddCt" else "Pfaffl", paste(refs, collapse = "+"), cal))
    ok <- is.finite(tab$lower) & is.finite(tab$upper)
    arrows(x[ok], log2(tab$lower[ok]), x[ok], log2(tab$upper[ok]), angle = 90, code = 3, length = 0.04)
    abline(h = 0)
    for (i in seq_len(nrow(tab))) {
      sp <- ps[ps$gene == tab$gene[i] & ps$group == tab$group[i], ]
      cal_mean <- -mean(ps$dct[ps$gene == tab$gene[i] & ps$group == cal])
      points(rep(x[i], nrow(sp)) + runif(nrow(sp), -0.15, 0.15), -sp$dct - cal_mean, pch = 16, cex = 0.6, col = "#b03a2e")
    }
  })
  per <- paste(sprintf("%s in %s: ddCt %s, fold %s (%s %s to %s%s), n %d", tab$gene, tab$group, sapply(tab$ddct, fmt), sapply(tab$fold, fmt), if (err == "ci95") sprintf("%g%% CI", 100 * level) else err, sapply(tab$lower, fmt), sapply(tab$upper, fmt), ifelse(is.finite(tab$p), sprintf(", Welch p %s", sapply(tab$p, fmt, digits = 3)), ""), tab$n)[tab$group != cal], collapse = "; ")
  emit(list(
    ok = TRUE,
    summary = sprintf("%s, reference %s, calibrator %s, replicates %s, %d samples. %s%s%s", if (method == "ddct") "2^-ddCt (Livak)" else "Pfaffl with efficiencies", paste(refs, collapse = " + "), cal, reps, nrow(w), per,
      if (dropped) sprintf(". %d sample-gene pairs without a Cq were left out", dropped) else "",
      if (length(warns)) paste0(". Warnings: ", paste(unique(warns), collapse = "; ")) else ""),
    metrics = metrics,
    data = list(results_file = out_path("results"), samples_file = out_path("samples"), method = method, reference_genes = refs, calibrator = cal, error = err, efficiencies = as.list(eff), warnings = as.list(unique(warns))),
    table = table_of(tab, out_path("results")),
    outputs = plot_outputs(),
    manualRoute = sprintf("dCt <- Cq_target - Cq_reference for each sample; ddCt <- mean(dCt[group]) - mean(dCt[calibrator]); fold <- %s", if (method == "ddct") "2^-ddCt" else "E_target^(dCq_target) / E_reference^(dCq_reference), with dCq = mean Cq of the calibrator minus mean Cq of the group")
  ))
})
