args <- commandArgs(FALSE)
here <- dirname(sub("^--file=", "", args[grep("^--file=", args)]))
source(file.path(here, "lib.R"))
source(file.path(here, "lib_flow.R"))

run_tool(function() {
  p <- read_params()
  load_flowcore()
  files <- list_files(p$data, "data")
  comp <- pick(p, "compensation", "none")
  comp_file <- pick(p, "comp_file", NULL)
  tr <- pick(p, "transform", "none")
  cofactor <- as.numeric(pick(p, "cofactor", 150))
  decades <- as.numeric(pick(p, "log_decades", 0))
  pregate <- parse_ranges(p$pregate)
  thr <- parse_thresholds(p$thresholds)
  control_paths <- if (is.null(p$control)) character() else list_files(p$control, "control")
  control_pct <- as.numeric(pick(p, "control_percentile", 99))
  markers <- as_list_arg(p$markers)
  if (!length(markers)) markers <- names(thr)
  if (!length(markers)) fail("give markers (the channels or markers to report) or thresholds")
  populations <- as_list_arg(p$populations)
  populations <- populations[!populations %in% paste0(markers, "+")]

  prep <- function(path) {
    ff <- read_fcs(path)
    raw <- exprs(ff)
    if (decades > 0) {
      x <- raw
      rng <- pData(parameters(ff))$range
      names(rng) <- pData(parameters(ff))$name
      for (ch in colnames(x)) if (!grepl("^(Time|Event)", ch, ignore.case = TRUE)) x[, ch] <- 10^(x[, ch] * decades / rng[[ch]])
      exprs(ff) <- x
    }
    ff <- apply_compensation(ff, comp, comp_file)
    list(ff = ff, x = exprs(ff), raw = raw)
  }
  cmarkers <- NULL
  first <- prep(files[1])
  chan <- vapply(markers, function(m) resolve_channel(first$ff, m, "markers"), "")
  scatter <- vapply(pregate, function(g) resolve_channel(first$ff, g$channel, "pregate channel"), "")
  fluor <- unique(chan)

  tx <- function(x) {
    for (ch in fluor) x[, ch] <- if (tr == "asinh") asinh(x[, ch] / cofactor) else if (tr == "log10") log10(pmax(x[, ch], 1)) else x[, ch]
    if (!tr %in% c("none", "asinh", "log10")) fail("transform must be none, asinh or log10")
    x
  }
  gate <- function(x) {
    keep <- rep(TRUE, nrow(x))
    for (i in seq_along(pregate)) keep <- keep & x[, scatter[i]] >= pregate[[i]]$lo & x[, scatter[i]] <= pregate[[i]]$hi
    keep
  }

  cutoff <- setNames(rep(NA_real_, length(markers)), markers)
  if (length(control_paths)) {
    cx <- do.call(rbind, lapply(control_paths, function(cp) {
      cc <- prep(cp)
      cc$x[gate(cc$raw), , drop = FALSE]
    }))
    cx <- tx(cx)
    for (i in seq_along(markers)) cutoff[i] <- quantile(cx[, chan[i]], control_pct / 100, names = FALSE)
  }
  for (m in names(thr)) {
    i <- match(m, markers)
    if (is.na(i)) fail(sprintf("threshold '%s' is not in markers: %s", m, paste(markers, collapse = ", ")))
    cutoff[i] <- thr[[m]]
  }
  if (anyNA(cutoff)) fail(sprintf("no cutoff for: %s. Give thresholds (such as CD4=2500) or a control file.", paste(markers[is.na(cutoff)], collapse = ", ")))
  names(cutoff) <- markers

  rows <- list()
  for (f in files) {
    s <- prep(f)
    xa <- s$x
    n_total <- nrow(xa)
    xg <- tx(xa[gate(s$raw), , drop = FALSE])
    n_parent <- nrow(xg)
    pos <- sapply(seq_along(markers), function(i) xg[, chan[i]] > cutoff[i])
    if (is.null(dim(pos))) pos <- matrix(pos, ncol = length(markers))
    colnames(pos) <- markers
    sample <- sub("\\.fcs$", "", basename(f), ignore.case = TRUE)
    for (i in seq_along(markers)) {
      v <- xg[, chan[i]]
      rows[[length(rows) + 1]] <- data.frame(sample = sample, population = paste0(markers[i], "+"), n_total = n_total, n_parent = n_parent, n_events = sum(pos[, i]),
        percent_of_parent = 100 * mean(pos[, i]), median_all = median(v), median_positive = if (any(pos[, i])) median(v[pos[, i]]) else NA, median_negative = if (any(!pos[, i])) median(v[!pos[, i]]) else NA, mean_all = mean(v), cutoff = cutoff[i], stringsAsFactors = FALSE)
    }
    for (pop in populations) {
      toks <- strsplit(trimws(pop), "\\s+")[[1]]
      sel <- rep(TRUE, n_parent)
      for (tk in toks) {
        sign <- substr(tk, nchar(tk), nchar(tk))
        nm <- substr(tk, 1, nchar(tk) - 1)
        if (!sign %in% c("+", "-") || !nm %in% markers) fail(sprintf("population '%s': each part must be a marker from markers with + or -, such as CD3+ CD4-. Markers: %s", pop, paste(markers, collapse = ", ")))
        sel <- sel & (if (sign == "+") pos[, nm] else !pos[, nm])
      }
      ch1 <- chan[1]
      rows[[length(rows) + 1]] <- data.frame(sample = sample, population = gsub("\\s+", " ", pop), n_total = n_total, n_parent = n_parent, n_events = sum(sel),
        percent_of_parent = 100 * mean(sel), median_all = NA, median_positive = NA, median_negative = NA, mean_all = NA, cutoff = NA, stringsAsFactors = FALSE)
    }
  }
  tab <- do.call(rbind, rows)
  rownames(tab) <- NULL
  write.csv(tab, out_path("stats"), row.names = FALSE)

  samples <- unique(tab$sample)
  pops <- unique(tab$population)
  draw_both(out_path("plot"), out_path("plot_svg"), width = max(6, 0.5 * length(samples) + 3), height = 4.5, function() {
    par(mar = c(max(5, min(14, max(nchar(samples)) * 0.45)), 4.5, 2, 1))
    m <- sapply(pops, function(pp) tab$percent_of_parent[tab$population == pp][match(samples, tab$sample[tab$population == pp])])
    if (is.null(dim(m))) m <- matrix(m, ncol = length(pops))
    barplot(t(m), beside = TRUE, names.arg = samples, las = 2, cex.names = 0.7, col = hcl.colors(length(pops), "Blues 3"), ylab = "Percent of parent", legend.text = pops, args.legend = list(x = "topright", cex = 0.6, bg = "white"))
  })

  metrics <- list(n_samples = length(samples), n_populations = length(pops))
  for (i in seq_len(min(nrow(tab), 200))) {
    tag <- paste(clean_name(tab$sample[i]), pop_tag(tab$population[i]), sep = "_")
    metrics[[paste0("pct_", tag)]] <- tab$percent_of_parent[i]
    metrics[[paste0("n_", tag)]] <- tab$n_events[i]
    if (!is.na(tab$median_all[i])) metrics[[paste0("med_", tag)]] <- tab$median_all[i]
    if (!is.na(tab$median_positive[i])) metrics[[paste0("medpos_", tag)]] <- tab$median_positive[i]
  }
  notes <- character()
  if (any(tab$n_parent < 1000)) notes <- c(notes, "Some samples have fewer than 1000 events in the parent gate. A percent from few events is not stable.")
  emit(list(
    ok = TRUE,
    summary = sprintf("%d samples, %d populations. Parent gate: %s. Transform: %s. Compensation: %s. Cutoffs: %s.%s", length(samples), length(pops), if (length(pregate)) paste(sapply(pregate, function(g) sprintf("%s %s to %s", g$channel, g$lo, g$hi)), collapse = " and ") else "all events", tr, comp, paste(sprintf("%s %s", markers, signif(cutoff, 5)), collapse = ", "), if (length(notes)) paste0(" ", paste(notes, collapse = " ")) else ""),
    metrics = metrics,
    data = list(stats_file = out_path("stats"), cutoffs = as.list(cutoff), channels = as.list(chan), flowcore_version = pkg_version("flowCore"), notes = as.list(notes)),
    table = table_of(tab, out_path("stats")),
    outputs = plot_outputs(),
    manualRoute = "FlowJo: gate the parent population on the scatter plots. Draw a gate on each marker with the cutoff from the control sample. Table Editor: add Freq. of Parent and Median for each gate, then export the table."
  ))
})
