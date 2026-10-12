args <- commandArgs(FALSE)
here <- dirname(sub("^--file=", "", args[grep("^--file=", args)]))
source(file.path(here, "lib.R"))
source(file.path(here, "lib_mic.R"))

fmt_mic <- function(v) as.character(signif(v, 6))

mic_label <- function(value, op) paste0(ifelse(op %in% c("<", ">", "<=", ">="), op, ""), fmt_mic(value))

mic_rank_value <- function(m, p) {
  v <- mic_numeric(m)
  op <- mic_operator(m)
  rank_op <- match(op, c("<=", "<", "", ">=", ">"))
  o <- order(v, rank_op)
  k <- max(1, ceiling(p * length(m) - 1e-9))
  mic_label(v[o][k], op[o][k])
}

run_tool(function() {
  p <- read_params()
  load_amr()
  off_scale <- pick(p, "off_scale", "next dilution")
  if (!off_scale %in% c("next dilution", "as written")) fail("off_scale must be 'next dilution' or 'as written'")
  inp <- read_mic_long(p)
  long <- inp$long
  bad_mic <- unique(long$mic[is.na(mic_numeric(long$mic)) | !grepl("^(<=|>=|<|>)?[0-9.]+$", long$mic)])
  if (length(bad_mic)) fail(sprintf("these values are not MICs: %s. Write a number, optionally with <=, <, >= or >.", paste(head(bad_mic, 10), collapse = ", ")))
  mo <- suppressMessages(suppressWarnings(as.mo(long$.organism, language = NULL)))
  ab <- suppressMessages(suppressWarnings(as.ab(long$drug)))
  bad_mo <- bad_organism(mo, long$.organism)
  bad_ab <- unique(long$drug[is.na(ab)])
  if (length(bad_mo)) fail(sprintf("AMR does not know these organisms: %s. Write the full species name, such as Escherichia coli.", paste(head(bad_mo, 10), collapse = ", ")))
  if (length(bad_ab)) fail(sprintf("AMR does not know these drugs: %s. Use the drug name or the code of AMR, such as CIP.", paste(head(bad_ab, 10), collapse = ", ")))
  long$organism <- as.character(mo_name(mo, language = NULL))
  long$drug_name <- ab_name(ab, language = NULL)
  keys <- c("organism", "drug_name", inp$group_cols)
  grp <- do.call(paste, c(lapply(keys, function(k) as.character(long[[k]])), sep = "\r"))
  rows <- lapply(split(seq_len(nrow(long)), grp), function(ix) {
    m <- long$mic[ix]
    v <- mic_numeric(m)
    op <- mic_operator(m)
    vg <- ifelse(off_scale == "next dilution" & op %in% c(">", ">="), v * 2, v)
    tab <- table(m)
    out <- long[ix[1], keys, drop = FALSE]
    out$n <- length(m)
    out$mic50 <- mic_rank_value(m, 0.5)
    out$mic90 <- mic_rank_value(m, 0.9)
    o <- order(v, match(op, c("<=", "<", "", ">=", ">")))
    out$mic_min <- mic_label(v[o][1], op[o][1])
    out$mic_max <- mic_label(v[o][length(o)], op[o][length(o)])
    out$mic_mode <- names(tab)[which.max(tab)]
    out$geometric_mean <- exp(mean(log(vg)))
    out$n_off_scale_low <- sum(op %in% c("<", "<="))
    out$n_off_scale_high <- sum(op %in% c(">", ">="))
    out
  })
  summ <- do.call(rbind, rows)
  rownames(summ) <- NULL
  summ <- summ[do.call(order, lapply(keys, function(k) summ[[k]])), ]
  write.csv(summ, out_path("summary"), row.names = FALSE)

  labels <- do.call(paste, c(lapply(keys, function(k) as.character(summ[[k]])), sep = " | "))
  draw_both(out_path("plot"), out_path("plot_svg"), width = 8, height = max(3, 0.35 * nrow(summ) + 1.5), function() {
    par(mar = c(4.5, max(8, min(22, max(nchar(labels)) * 0.45)), 2, 1))
    lo <- log2(mic_numeric(summ$mic50))
    hi <- log2(mic_numeric(summ$mic90))
    y <- rev(seq_len(nrow(summ)))
    plot(NA, xlim = range(c(lo, hi), na.rm = TRUE) + c(-0.5, 0.5), ylim = c(0.5, nrow(summ) + 0.5), yaxt = "n", ylab = "", xlab = "log2 MIC", main = "MIC50 and MIC90")
    axis(2, at = y, labels = labels, las = 1, cex.axis = 0.7)
    segments(lo, y, hi, y, col = "grey50")
    points(lo, y, pch = 16, col = "#1f4e79")
    points(hi, y, pch = 17, col = "#b03a2e")
    legend("bottomright", legend = c("MIC50", "MIC90"), pch = c(16, 17), col = c("#1f4e79", "#b03a2e"), cex = 0.7, bg = "white")
  })

  metrics <- list(n_values = nrow(long), n_groups = nrow(summ), n_no_value = inp$n_no_value)
  for (i in seq_len(min(nrow(summ), 60))) {
    tag <- clean_name(paste(summ[i, keys], collapse = "_"))
    metrics[[paste0("n_", tag)]] <- summ$n[i]
    metrics[[paste0("mic50_", tag)]] <- mic_numeric(summ$mic50[i])
    metrics[[paste0("mic90_", tag)]] <- mic_numeric(summ$mic90[i])
    metrics[[paste0("gmean_", tag)]] <- summ$geometric_mean[i]
  }
  emit(list(
    ok = TRUE,
    summary = sprintf("%d MIC values in %d groups. MIC50 and MIC90 are the lowest concentrations that inhibit at least 50%% and 90%% of the isolates. Off-scale values: %s.%s", nrow(long), nrow(summ), off_scale, if (inp$n_no_value > 0) sprintf(" %d cells have no MIC value (blank, NA, nd or -) and are left out.", inp$n_no_value) else ""),
    metrics = metrics,
    data = list(off_scale = off_scale, amr_version = pkg_version("AMR"), summary_file = out_path("summary")),
    table = table_of(summ, out_path("summary")),
    outputs = plot_outputs(),
    manualRoute = "Sort the MICs of one drug from low to high. MIC50 is the value at position ceiling(0.5 * n). MIC90 is the value at position ceiling(0.9 * n). Excel: =SMALL(range, ROUNDUP(0.5*COUNT(range),0))."
  ))
})
