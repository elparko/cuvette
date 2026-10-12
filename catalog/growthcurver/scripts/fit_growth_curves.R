args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

logistic <- function(v, t) v$k / (1 + ((v$k - v$n0) / v$n0) * exp(-v$r * t))

run_tool(function() {
  p <- read_params()
  suppressMessages(library(growthcurver))
  df <- read_table(p$data)
  bg <- pick(p, "bg_correct", "min")
  if (!bg %in% c("min", "blank", "none")) fail(paste("bg_correct must be min, blank or none, not", bg))
  t_trim <- as.numeric(pick(p, "t_trim", 0))
  unit <- pick(p, "time_unit", "h")
  do_lag <- isTRUE(as.logical(pick(p, "lag", FALSE)))
  h <- as.integer(pick(p, "easylinear_points", 5))
  if (do_lag) suppressMessages(library(growthrates))
  time_col <- need_column(df, pick(p, "time_col", if ("time" %in% names(df)) "time" else names(df)[1]), "time_col")
  well_col <- pick(p, "well_col", NULL)
  if (!is.null(well_col)) {
    need_column(df, well_col, "well_col")
    value_col <- need_column(df, pick(p, "value_col", if ("od" %in% names(df)) "od" else NULL), "value_col")
    wide <- reshape(df[, c(time_col, well_col, value_col)], idvar = time_col, timevar = well_col, direction = "wide")
    pre <- paste0(value_col, ".")
    names(wide) <- ifelse(startsWith(names(wide), pre), substring(names(wide), nchar(pre) + 1), names(wide))
    df <- wide[order(wide[[time_col]]), ]
  }
  time <- suppressWarnings(as.numeric(df[[time_col]]))
  if (all(is.na(time))) fail(sprintf("time_col '%s' has no numbers", time_col))
  wells_all <- setdiff(names(df), time_col)
  blank_wells <- as_list_arg(p$blank_wells)
  missing <- setdiff(blank_wells, wells_all)
  if (length(missing)) fail(sprintf("blank_wells names wells that are not in the data: %s. Wells: %s", paste(missing, collapse = ", "), paste(head(wells_all, 12), collapse = ", ")))
  if (bg == "blank" && !length(blank_wells)) fail("bg_correct is blank, but blank_wells is empty. Name the medium-only wells, or set bg_correct to min or none.")
  exclude <- as_list_arg(p$exclude)
  missing <- setdiff(exclude, wells_all)
  if (length(missing)) fail(sprintf("exclude names wells that are not in the data: %s. Wells: %s", paste(missing, collapse = ", "), paste(head(wells_all, 12), collapse = ", ")))
  wells <- as_list_arg(p$wells)
  missing <- setdiff(wells, wells_all)
  if (length(missing)) fail(sprintf("wells names wells that are not in the data: %s. Wells: %s", paste(missing, collapse = ", "), paste(head(wells_all, 12), collapse = ", ")))
  if (!length(wells)) wells <- wells_all
  wells <- setdiff(wells, c(blank_wells, exclude))
  if (!length(wells)) fail("no wells are left to fit after the blank and excluded wells are removed")
  blank <- if (length(blank_wells)) rowMeans(sapply(blank_wells, function(w) suppressWarnings(as.numeric(df[[w]]))), na.rm = TRUE) else NULL

  rows <- list(); fits <- list(); metrics <- list(); notes <- character()
  for (w in wells) {
    y <- suppressWarnings(as.numeric(df[[w]]))
    ok <- is.finite(time) & is.finite(y)
    if (!is.null(blank)) ok <- ok & is.finite(blank)
    if (sum(ok) < 5) { notes <- c(notes, sprintf("%s: fewer than 5 time points with a value", w)); next }
    tt <- time[ok]; yy <- y[ok]
    bl <- if (is.null(blank)) NA else blank[ok]
    g <- tryCatch(SummarizeGrowth(tt, yy, t_trim = t_trim, bg_correct = bg, blank = bl), error = function(e) e)
    if (inherits(g, "error")) { notes <- c(notes, sprintf("%s: growthcurver failed: %s", w, conditionMessage(g))); next }
    v <- g$vals
    row <- data.frame(well = w, k = v$k, n0 = v$n0, r = v$r, t_mid = v$t_mid, t_gen = v$t_gen, auc_l = v$auc_l, auc_e = v$auc_e, sigma = v$sigma, note = v$note, stringsAsFactors = FALSE)
    if (do_lag) {
      ly <- if (bg == "blank") yy - bl else yy
      keep <- ly > 0 & (t_trim <= 0 | tt <= t_trim)
      el <- tryCatch(fit_easylinear(tt[keep], ly[keep], h = h), error = function(e) e)
      if (inherits(el, "error")) {
        row$mumax <- NA; row$lag <- NA; row$el_r2 <- NA
        notes <- c(notes, sprintf("%s: easylinear failed: %s", w, conditionMessage(el)))
      } else {
        co <- coef(el)
        row$mumax <- co[["mumax"]]; row$lag <- co[["lag"]]; row$el_r2 <- rsquared(el)[[1]]
      }
    }
    if (nzchar(v$note)) notes <- c(notes, sprintf("%s: %s", w, v$note))
    rows[[w]] <- row
    fits[[w]] <- list(t = g$data$t, y = g$data$N, v = v)
    k <- clean_name(w)
    for (m in c("r", "k", "t_gen", "auc_e")) metrics[[paste0(m, "_", k)]] <- row[[m]]
    if (do_lag) { metrics[[paste0("lag_", k)]] <- row$lag; metrics[[paste0("mumax_", k)]] <- row$mumax }
  }
  if (!length(rows)) fail(paste("no well could be fitted.", paste(head(notes, 5), collapse = "; ")))
  res <- do.call(rbind, rows)
  rownames(res) <- NULL
  if (nrow(res) == 1) for (m in setdiff(names(res), c("well", "note"))) metrics[[m]] <- res[[m]]
  metrics$n_wells <- nrow(res)
  metrics$n_with_note <- sum(nzchar(res$note))
  metrics$n_blank_wells <- length(blank_wells)
  metrics$n_excluded <- length(exclude)
  if (nzchar(out_path("results"))) write.csv(res, out_path("results"), row.names = FALSE)

  shown <- head(names(fits), 96)
  nc <- min(12, ceiling(sqrt(length(shown))))
  nr <- ceiling(length(shown) / nc)
  draw_both(out_path("plot"), out_path("plot_svg"), width = max(5, 1.6 * nc), height = max(4, 1.4 * nr + 0.6), function() {
    par(mfrow = c(nr, nc), mar = c(1.6, 1.6, 1.4, 0.3), mgp = c(1, 0.3, 0), tcl = -0.2, cex = 0.6, oma = c(1.5, 1.5, 1.5, 0))
    for (w in shown) {
      f <- fits[[w]]
      plot(f$t, f$y, pch = 16, cex = 0.4, col = "grey40", main = w, xlab = "", ylab = "")
      tg <- seq(min(f$t), max(f$t), length.out = 200)
      lines(tg, logistic(f$v, tg), col = "#b03a2e", lwd = 1.5)
    }
    mtext(paste0("Time (", unit, ")"), side = 1, outer = TRUE, cex = 0.8)
    mtext(paste("OD, background correction:", bg), side = 2, outer = TRUE, cex = 0.8)
    mtext(sprintf("growthcurver logistic fits (red), %d of %d wells", length(shown), length(fits)), side = 3, outer = TRUE, cex = 0.8)
  })

  fmt <- function(v) trimws(formatC(v, digits = 4, format = "g"))
  one <- if (nrow(res) == 1) sprintf("%s: k %s, n0 %s, r %s per %s, t_mid %s %s, doubling time %s %s, auc_l %s, auc_e %s, sigma %s%s", res$well, fmt(res$k), fmt(res$n0), fmt(res$r), unit, fmt(res$t_mid), unit, fmt(res$t_gen), unit, fmt(res$auc_l), fmt(res$auc_e), fmt(res$sigma), if (do_lag) sprintf(", easylinear mumax %s per %s, lag %s %s", fmt(res$mumax), unit, fmt(res$lag), unit) else "")
    else sprintf("%d wells: r from %s to %s per %s (median %s), k from %s to %s, doubling time median %s %s%s", nrow(res), fmt(min(res$r)), fmt(max(res$r)), unit, fmt(median(res$r)), fmt(min(res$k)), fmt(max(res$k)), fmt(median(res$t_gen)), unit, if (do_lag) sprintf(", lag median %s %s", fmt(median(res$lag, na.rm = TRUE)), unit) else "")
  emit(list(
    ok = TRUE,
    summary = sprintf("growthcurver logistic fit, background correction %s%s, t_trim %s. %s. %d well(s) with a note%s", bg, if (length(blank_wells)) sprintf(" (%d blank wells)", length(blank_wells)) else "", if (t_trim > 0) fmt(t_trim) else "none", one, sum(nzchar(res$note)), if (length(notes)) paste0(": ", paste(head(notes, 8), collapse = "; ")) else ""),
    metrics = metrics,
    data = list(results_file = out_path("results"), bg_correct = bg, t_trim = t_trim, time_unit = unit, notes = as.list(notes), growthcurver_version = pkg_version("growthcurver"), growthrates_version = if (do_lag) pkg_version("growthrates") else NULL),
    table = table_of(res, out_path("results")),
    outputs = plot_outputs(),
    manualRoute = sprintf("library(growthcurver); d <- read.csv(\"plate.csv\"); g <- SummarizeGrowth(d$%s, d$<well>, t_trim = %s, bg_correct = \"%s\"); g$vals%s", time_col, t_trim, bg, if (do_lag) sprintf("; growthrates::fit_easylinear(d$%s, d$<well>, h = %d)", time_col, h) else "")
  ))
})
