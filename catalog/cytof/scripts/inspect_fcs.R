args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  suppressMessages(library(flowCore))
  paths <- fcs_files(p$files)
  first <- read_fcs(paths[1])
  ch <- channel_names(first)
  counts <- integer(length(paths))
  mism <- character()
  for (i in seq_along(paths)) {
    ff <- if (i == 1) first else read_fcs(paths[i])
    counts[i] <- nrow(ff)
    if (i > 1 && !identical(channel_names(ff)$channel, ch$channel)) mism <- c(mism, basename(paths[i]))
  }
  if (length(mism)) fail(paste0("these files have other channels than ", basename(paths[1]), ": ", paste(head(mism, 5), collapse = ", "), ". Cluster files with the same panel only."))
  e <- exprs(first)
  chan <- data.frame(channel = ch$channel, marker = ch$marker, min = apply(e, 2, min), median = apply(e, 2, median), max = apply(e, 2, max), n_distinct = apply(e, 2, function(v) length(unique(v))), row.names = NULL)
  chan$looks_like_label <- chan$n_distinct <= 50 & apply(e, 2, function(v) all(v == round(v)))
  files <- data.frame(file = basename(paths), sample_id = sample_id_of(paths), cells = counts)
  out <- out_path("table")
  write.csv(files, out, row.names = FALSE)
  emit(list(
    ok = TRUE,
    summary = sprintf("%d FCS files, %d cells in total, %d channels. Smallest file %d cells, largest %d cells.", length(paths), sum(counts), nrow(chan), min(counts), max(counts)),
    metrics = list(n_files = length(paths), n_cells_total = sum(counts), n_channels = nrow(chan), min_cells = min(counts), max_cells = max(counts)),
    data = list(
      cells_per_file = as.list(setNames(as.list(counts), sample_id_of(paths))),
      channels = lapply(seq_len(nrow(chan)), function(i) as.list(chan[i, ])),
      label_channels = chan$channel[chan$looks_like_label],
      channel_stats_file = basename(paths[1]),
      flowcore_version = as.character(packageVersion("flowCore"))
    ),
    table = table_of(files, out, 40),
    manualRoute = "ff <- flowCore::read.FCS(\"file.fcs\", transformation = FALSE); nrow(ff); flowCore::pData(flowCore::parameters(ff))"
  ))
})
