args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  suppressMessages({library(flowCore); library(FlowSOM)})
  paths <- fcs_files(p$files)
  markers <- split_list(p$markers)
  if (!length(markers)) fail("markers is empty. Name the channels or markers to cluster on, as a comma list.")
  cofactor <- as.numeric(pick(p, "cofactor", NA))
  if (is.na(cofactor) || cofactor <= 0) fail("cofactor is missing or not above 0. The scientist must choose the arcsinh cofactor (5 is common for mass cytometry).")
  xdim <- as.integer(pick(p, "xdim", 10))
  ydim <- as.integer(pick(p, "ydim", 10))
  n_meta <- as.integer(pick(p, "n_metaclusters", NA))
  if (is.na(n_meta) || n_meta < 2) fail("n_metaclusters is missing or below 2. The scientist must choose the number of metaclusters.")
  if (n_meta > xdim * ydim) fail(sprintf("n_metaclusters (%d) is larger than the number of grid nodes (%d x %d = %d).", n_meta, xdim, ydim, xdim * ydim))
  seed <- as.integer(pick(p, "seed", 1))
  label_channel <- pick(p, "label_channel", NULL)

  first <- read_fcs(paths[1])
  cols <- resolve_channels(first, markers)
  label_col <- if (is.null(label_channel)) NULL else resolve_channels(first, label_channel)
  mats <- list(); ids <- character(); labels <- numeric()
  for (i in seq_along(paths)) {
    ff <- if (i == 1) first else read_fcs(paths[i])
    e <- exprs(ff)
    if (!all(cols %in% colnames(e))) fail(paste0("file ", basename(paths[i]), " lacks the channels ", paste(setdiff(cols, colnames(e)), collapse = ", ")))
    mats[[i]] <- asinh(e[, cols, drop = FALSE] / cofactor)
    ids <- c(ids, rep(sample_id_of(paths[i]), nrow(e)))
    if (!is.null(label_col)) labels <- c(labels, e[, label_col])
  }
  mat <- do.call(rbind, mats)
  colnames(mat) <- cols
  ff_all <- flowFrame(mat)
  fsom <- FlowSOM(ff_all, colsToUse = seq_along(cols), nClus = n_meta, xdim = xdim, ydim = ydim, seed = seed, scale = FALSE, transform = FALSE)
  cluster <- as.integer(GetClusters(fsom))
  meta <- as.integer(GetMetaclusters(fsom))

  cells <- data.frame(sample_id = ids, cluster = cluster, metacluster = meta, stringsAsFactors = FALSE)
  if (!is.null(label_col)) cells$label <- labels
  cells_path <- out_path("cells")
  write.csv(cells, cells_path, row.names = FALSE)

  med <- do.call(rbind, lapply(sort(unique(meta)), function(k) apply(mat[meta == k, , drop = FALSE], 2, median)))
  tab <- data.frame(metacluster = sort(unique(meta)), cells = as.integer(table(meta)), percent = 100 * as.numeric(table(meta)) / length(meta), med, check.names = FALSE)
  names(tab)[-(1:3)] <- first_markers <- channel_names(first)$marker[match(cols, channel_names(first)$channel)]
  tab_path <- out_path("medians")
  write.csv(tab, tab_path, row.names = FALSE)

  png_path <- out_path("plot")
  png(png_path, width = 900, height = 700, res = 110)
  z <- scale(med)
  z[is.nan(z)] <- 0
  rownames(z) <- paste0("M", tab$metacluster)
  colnames(z) <- first_markers
  heatmap(z, scale = "none", margins = c(8, 4), col = hcl.colors(50, "Blue-Red 3"), main = "Median of each metacluster (scaled by marker)")
  dev.off()

  sizes <- as.integer(table(cluster))
  emit(list(
    ok = TRUE,
    summary = sprintf("FlowSOM on %d cells from %d files: %d x %d grid (%d nodes, %d non-empty), %d metaclusters, arcsinh cofactor %g, %d markers, seed %d. Smallest metacluster %d cells, largest %d cells.", nrow(cells), length(paths), xdim, ydim, xdim * ydim, length(sizes), n_meta, cofactor, length(cols), seed, min(tab$cells), max(tab$cells)),
    metrics = list(n_cells = nrow(cells), n_files = length(paths), n_nodes = xdim * ydim, n_nonempty_nodes = length(sizes), n_metaclusters = length(unique(meta)), cofactor = cofactor, seed = seed, min_metacluster_cells = min(tab$cells), max_metacluster_cells = max(tab$cells)),
    data = list(cells_file = cells_path, markers_used = first_markers, channels_used = cols, flowsom_version = as.character(packageVersion("FlowSOM")), label_channel = if (is.null(label_col)) NULL else label_col),
    table = table_of(tab, tab_path, 20),
    manualRoute = sprintf("mat <- asinh(exprs(ff)[, markers] / %g); fsom <- FlowSOM::FlowSOM(flowCore::flowFrame(mat), colsToUse = seq_along(markers), nClus = %d, xdim = %d, ydim = %d, seed = %d, scale = FALSE, transform = FALSE)", cofactor, n_meta, xdim, ydim, seed)
  ))
})
