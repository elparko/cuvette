args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

METHODS <- c("percent_activity", "percent_inhibition", "fraction", "percent_of_high", "none")

robust_sd <- function(x) 1.4826 * mad(x, constant = 1)

run_tool(function() {
  p <- read_params()
  df <- read_data(p$data)
  method <- need(p, "normalization", "Normalization")
  if (!method %in% METHODS) fail(sprintf("normalization '%s' is not known. Choices: %s", method, paste(METHODS, collapse = ", ")))
  stat <- pick(p, "zprime_stat", "mean_sd")
  if (!stat %in% c("mean_sd", "median_mad")) fail(paste("zprime_stat must be mean_sd or median_mad, not", stat))
  sig_col <- need_column(df, pick(p, "signal_col", if ("signal" %in% names(df)) "signal" else NULL), "signal_col")
  type_col <- need_column(df, pick(p, "type_col", if ("type" %in% names(df)) "type" else NULL), "type_col")
  high <- as.character(need(p, "high_control", "High control label"))
  low <- as.character(pick(p, "low_control", ""))
  blank_label <- as.character(pick(p, "blank_label", ""))
  plate_col <- pick(p, "plate_col", NULL)
  if (!is.null(plate_col)) need_column(df, plate_col, "plate_col")
  well_col <- pick(p, "well_col", if ("well" %in% names(df)) "well" else NULL)
  exclude <- as_list_arg(p$exclude)
  y <- numeric_column(df, sig_col, "signal_col")
  type <- trimws(as.character(df[[type_col]]))
  values <- unique(type)
  for (lab in c(high, if (nzchar(low)) low, if (nzchar(blank_label)) blank_label)) if (!lab %in% values) fail(sprintf("the label '%s' is not a value of '%s'. Values: %s", lab, type_col, paste(head(values, 12), collapse = ", ")))
  if (method %in% c("percent_activity", "percent_inhibition", "fraction") && !nzchar(low)) fail(sprintf("the normalization %s needs low_control, the label of the 0 percent control in '%s'", method, type_col))
  plate <- if (is.null(plate_col)) rep("1", nrow(df)) else as.character(df[[plate_col]])
  well <- if (is.null(well_col)) as.character(seq_len(nrow(df)) + 1) else as.character(df[[well_col]])
  keep <- rep(TRUE, nrow(df))
  if (length(exclude)) {
    plate_well <- paste(plate, well, sep = ":")
    miss <- setdiff(exclude, c(well, plate_well))
    if (length(miss)) fail(sprintf("exclude names wells that are not in the column '%s': %s. Write plate:well, such as P2:A1, for a well of one plate only.", if (is.null(well_col)) "(file row numbers)" else well_col, paste(miss, collapse = ", ")))
    keep <- !(well %in% exclude | plate_well %in% exclude)
  }
  center <- if (stat == "mean_sd") mean else median
  spread <- if (stat == "mean_sd") sd else robust_sd
  out <- df
  out$normalized <- NA_real_
  out$excluded <- as.integer(!keep)
  rows <- list(); metrics <- list(); warns <- character()
  for (pl in unique(plate)) {
    i <- plate == pl & keep & is.finite(y)
    yb <- y
    bmean <- NA_real_
    if (nzchar(blank_label)) {
      b <- y[i & type == blank_label]
      if (!length(b)) fail(sprintf("plate %s has no '%s' wells", pl, blank_label))
      bmean <- mean(b)
      yb <- y - bmean
    }
    h <- yb[i & type == high]
    l <- if (nzchar(low)) yb[i & type == low] else numeric()
    if (length(h) < 2) fail(sprintf("plate %s has %d '%s' wells. Z' and the normalization need at least 2.", pl, length(h), high))
    if (nzchar(low) && length(l) < 2) fail(sprintf("plate %s has %d '%s' wells. Z' and the normalization need at least 2.", pl, length(l), low))
    mh <- center(h); ml <- if (length(l)) center(l) else NA
    sh <- spread(h); sl <- if (length(l)) spread(l) else NA
    z <- if (length(l)) 1 - 3 * (sh + sl) / abs(mh - ml) else NA
    j <- plate == pl & keep
    out$normalized[j] <- switch(method,
      percent_activity = 100 * (yb[j] - ml) / (mh - ml),
      percent_inhibition = 100 - 100 * (yb[j] - ml) / (mh - ml),
      fraction = (yb[j] - ml) / (mh - ml),
      percent_of_high = 100 * yb[j] / mh,
      none = yb[j])
    if (is.finite(z) && z < 0.5) warns <- c(warns, sprintf("plate %s: Z' %.3f is below 0.5", pl, z))
    rows[[pl]] <- data.frame(plate = pl, n_high = length(h), mean_high = mh, sd_high = sh, cv_high_pct = 100 * sh / abs(mh), n_low = length(l), mean_low = ml, sd_low = sl, cv_low_pct = 100 * sl / abs(ml), blank_mean = bmean, signal_to_background = mh / ml, z_prime = z, stringsAsFactors = FALSE)
    pre <- if (length(unique(plate)) > 1) paste0("p", clean_name(pl), "_") else ""
    for (k in c("mean_high", "sd_high", "mean_low", "sd_low", "z_prime", "signal_to_background")) metrics[[paste0(pre, k)]] <- rows[[pl]][[k]]
  }
  tab <- do.call(rbind, rows)
  metrics$n_plates <- nrow(tab)
  metrics$n_excluded <- sum(!keep)
  if (nrow(tab) > 1) { metrics$z_prime_mean <- mean(tab$z_prime); metrics$z_prime_min <- min(tab$z_prime) }
  if (nzchar(out_path("normalized"))) write.csv(out, out_path("normalized"), row.names = FALSE)
  if (nzchar(out_path("plates"))) write.csv(tab, out_path("plates"), row.names = FALSE)

  dev <- open_plot(out_path("plot"), out_path("plot_svg"), width = 9, height = 5)
  draw_both(dev, function() {
    set.seed(1)
    pls <- unique(plate)
    pos <- match(plate, pls) + runif(length(plate), -0.25, 0.25)
    col <- ifelse(type == high, "#1f4e79", ifelse(type == low, "#b03a2e", ifelse(type == blank_label, "grey60", "#1e8449")))
    plot(pos[keep], y[keep], col = col[keep], pch = 16, cex = 0.7, xaxt = "n", xlab = "Plate", ylab = sig_col, main = sprintf("Controls and samples; Z' (%s)", stat))
    axis(1, at = seq_along(pls), labels = pls)
    if (any(!keep)) points(pos[!keep], y[!keep], pch = 4, col = "black")
    text(seq_along(pls), max(y, na.rm = TRUE), sprintf("%.2f", tab$z_prime), cex = 0.8, pos = 1)
    legend("right", c(high, low, if (nzchar(blank_label)) blank_label, "other wells", if (any(!keep)) "excluded"), col = c("#1f4e79", "#b03a2e", if (nzchar(blank_label)) "grey60", "#1e8449", if (any(!keep)) "black"), pch = c(16, 16, if (nzchar(blank_label)) 16, 16, if (any(!keep)) 4), bty = "n", cex = 0.8)
  })

  per <- paste(sprintf("plate %s: high %.4g (SD %.3g, n %d), low %.4g (SD %.3g, n %d), Z' %.3f", tab$plate, tab$mean_high, tab$sd_high, tab$n_high, tab$mean_low, tab$sd_low, tab$n_low, tab$z_prime), collapse = "; ")
  emit(list(
    ok = TRUE,
    summary = sprintf("%s normalization, Z' from the %s, %d plate(s), %d well(s) excluded. %s%s", method, if (stat == "mean_sd") "mean and SD" else "median and MAD", nrow(tab), sum(!keep), per, if (length(warns)) paste0(". Warnings: ", paste(warns, collapse = "; ")) else ""),
    metrics = metrics,
    data = list(normalized_file = out_path("normalized"), plates_file = out_path("plates"), normalization = method, zprime_stat = stat, warnings = as.list(warns)),
    table = table_of(tab, out_path("plates")),
    outputs = plot_outputs(),
    manualRoute = "Excel: =AVERAGE() and =STDEV.S() of the high and low control wells of each plate; Z' = 1 - 3*(SD_high + SD_low)/ABS(mean_high - mean_low); normalized = 100*(signal - mean_low)/(mean_high - mean_low)"
  ))
})
