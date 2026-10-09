args <- commandArgs(FALSE)
here <- dirname(sub("^--file=", "", args[grep("^--file=", args)]))
source(file.path(here, "lib.R"))
source(file.path(here, "lib_flow.R"))

run_tool(function() {
  p <- read_params()
  load_flowcore()
  files <- list_files(p$controls, "controls")
  if (length(files) < 2) fail("give at least two single-stain control files")
  primary <- as_list_arg(p$primary_channels)
  if (length(primary) && length(primary) != length(files)) fail(sprintf("primary_channels has %d names but controls has %d files. Give one channel for each control, in the same order.", length(primary), length(files)))
  pct <- as.numeric(pick(p, "positive_percentile", 99))
  if (!is.finite(pct) || pct < 0 || pct > 100) fail("positive_percentile must be a number from 0 to 100")
  decades <- as.numeric(pick(p, "log_decades", 0))
  pregate <- parse_ranges(p$pregate)
  unstained_path <- pick(p, "unstained", NULL)
  if (is.null(unstained_path) || !file.exists(unstained_path)) fail("give unstained, the path of the unstained control FCS file")

  prep <- function(path) {
    ff <- read_fcs(path)
    x <- exprs(ff)
    if (length(pregate)) {
      keep <- rep(TRUE, nrow(x))
      for (g in pregate) {
        ch <- resolve_channel(ff, g$channel, "pregate channel")
        keep <- keep & x[, ch] >= g$lo & x[, ch] <= g$hi
      }
      x <- x[keep, , drop = FALSE]
    }
    if (decades > 0) {
      rng <- pData(parameters(ff))$range
      names(rng) <- pData(parameters(ff))$name
      for (ch in colnames(x)) if (!grepl("^(Time|Event)", ch, ignore.case = TRUE)) x[, ch] <- 10^(x[, ch] * decades / rng[[ch]])
    }
    list(ff = ff, x = x)
  }
  un <- prep(unstained_path)
  skip <- "^(FSC|SSC|Time|Event)"
  det_all <- colnames(un$x)[!grepl(skip, colnames(un$x), ignore.case = TRUE)]
  ctl <- lapply(files, prep)
  if (!length(primary)) {
    primary <- vapply(ctl, function(cc) {
      gain <- apply(cc$x[, det_all, drop = FALSE], 2, median) - apply(un$x[, det_all, drop = FALSE], 2, median)
      det_all[which.max(gain)]
    }, "")
  } else primary <- vapply(seq_along(files), function(i) resolve_channel(ctl[[i]]$ff, primary[i], "primary_channels"), "")
  if (anyDuplicated(primary)) fail(sprintf("two controls have the same primary channel (%s). Give primary_channels, one channel for each control.", primary[anyDuplicated(primary)]))
  detectors <- primary
  mu <- apply(un$x[, detectors, drop = FALSE], 2, median)
  S <- matrix(NA_real_, length(detectors), length(detectors), dimnames = list(detectors, detectors))
  npos <- integer(length(files))
  names(npos) <- detectors
  for (i in seq_along(files)) {
    pc <- primary[i]
    cutoff <- quantile(un$x[, pc], pct / 100, names = FALSE)
    pos <- ctl[[i]]$x[ctl[[i]]$x[, pc] > cutoff, detectors, drop = FALSE]
    npos[i] <- nrow(pos)
    if (nrow(pos) < 20) fail(sprintf("control %s has only %d events above the cutoff of %s. Lower positive_percentile, or check the primary channel.", basename(files[i]), nrow(pos), pc))
    mp <- apply(pos, 2, median)
    S[pc, ] <- (mp - mu) / (mp[pc] - mu[pc])
  }
  write.csv(S, out_path("spillover"), quote = FALSE)
  resid <- sapply(seq_along(files), function(i) {
    pc <- primary[i]
    pos <- ctl[[i]]$x[ctl[[i]]$x[, pc] > quantile(un$x[, pc], pct / 100, names = FALSE), detectors, drop = FALSE]
    comp <- (sweep(pos, 2, mu, "-")) %*% solve(S)
    max(abs(apply(comp, 2, median)[setdiff(detectors, pc)]) / abs(median(comp[, pc])))
  })
  names(resid) <- detectors
  off <- S
  diag(off) <- NA
  notes <- character()
  if (any(npos < 100)) notes <- c(notes, sprintf("Controls with fewer than 100 positive events: %s.", paste(detectors[npos < 100], collapse = ", ")))
  big <- which(off > 1, arr.ind = TRUE)
  if (nrow(big)) notes <- c(notes, "A spillover coefficient is above 1. Check that each control has its own primary channel.")

  draw_both(out_path("plot"), out_path("plot_svg"), width = 6, height = 5, function() {
    par(mar = c(6, 6, 3, 1))
    image(seq_along(detectors), seq_along(detectors), t(log10(pmax(S, 1e-4))[rev(seq_along(detectors)), , drop = FALSE]), col = hcl.colors(20, "Blues 3", rev = TRUE), axes = FALSE, xlab = "", ylab = "", main = "Spillover (log10)")
    axis(1, at = seq_along(detectors), labels = detectors, las = 2, cex.axis = 0.7)
    axis(2, at = seq_along(detectors), labels = rev(detectors), las = 2, cex.axis = 0.7)
    for (i in seq_along(detectors)) for (j in seq_along(detectors)) text(j, length(detectors) + 1 - i, formatC(S[i, j], digits = 2, format = "g"), cex = 0.6)
  })

  metrics <- list(n_controls = length(files), positive_percentile = pct, max_off_diagonal = max(off, na.rm = TRUE), max_residual_after_compensation = max(resid))
  for (i in seq_along(detectors)) for (j in seq_along(detectors)) metrics[[paste0("spill_", clean_name(detectors[i]), "_to_", clean_name(detectors[j]))]] <- S[i, j]
  df <- data.frame(stain_channel = detectors, control_file = basename(files), n_positive = npos, unstained_median = as.numeric(mu), row.names = NULL)
  emit(list(
    ok = TRUE,
    summary = sprintf("Spillover matrix of %d channels from %d single-stain controls. Positive events: above the %s percentile of the unstained control in the primary channel. Largest off-diagonal coefficient: %s.%s", length(detectors), length(files), pct, signif(max(off, na.rm = TRUE), 3), if (length(notes)) paste0(" ", paste(notes, collapse = " ")) else ""),
    metrics = metrics,
    data = list(spillover_file = out_path("spillover"), flowcore_version = pkg_version("flowCore"), primary_channels = as.list(primary), notes = as.list(notes)),
    table = table_of(df, NULL),
    outputs = plot_outputs(),
    manualRoute = "FlowJo: Compensation, Create Compensation. Drag the single-stain controls and the unstained control to the matrix. Gate the positive population of each control. Calculate Compensation. Excel: coefficient(i, j) = (median of channel j in the positive gate of control i - median of channel j in the unstained control) divided by the same difference in channel i."
  ))
})
