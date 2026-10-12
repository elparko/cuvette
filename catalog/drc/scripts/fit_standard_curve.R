args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

MODELS <- c("4PL", "5PL", "5PL-softmax")

fit_plate <- function(d, model, weighting, avg) {
  wells <- d[d$kind == "standard" & is.finite(d$y) & is.finite(d$x), ]
  st <- if (avg == "signal" && nrow(wells)) aggregate(y ~ x, wells, mean) else wells
  if (nrow(st) < 5) fail(sprintf("plate %s has %d standard wells with a concentration and a signal. A %s fit needs at least 5.", d$plate[1], nrow(st), model))
  if (length(unique(st$x)) < 4) fail(sprintf("plate %s has %d standard concentrations. A %s fit needs at least 4 levels.", d$plate[1], length(unique(st$x)), model))
  r <- fit_curve(st$x, st$y, model, weighting, paste("plate", d$plate[1]))
  c(r, list(st = st, wells = wells))
}

loq_range <- function(levels, ok) {
  best <- c(NA, NA); run_start <- NA; best_len <- 0
  for (i in seq_along(ok)) {
    if (ok[i]) {
      if (is.na(run_start)) run_start <- i
      if (i - run_start + 1 > best_len) { best_len <- i - run_start + 1; best <- c(run_start, i) }
    } else run_start <- NA
  }
  if (best_len == 0) return(c(NA, NA))
  levels[best]
}

run_tool(function() {
  p <- read_params()
  load_drc()
  df <- read_data(p$data)
  model <- need(p, "model", "Standard curve model")
  if (!model %in% MODELS) fail(sprintf("model '%s' is not known. Choices: %s", model, paste(MODELS, collapse = ", ")))
  weighting <- pick(p, "weighting", "none")
  blank_mode <- pick(p, "blank", "subtract")
  if (!blank_mode %in% c("subtract", "none")) fail(paste("blank must be subtract or none, not", blank_mode))
  lod_k <- as.numeric(pick(p, "lod_sd", 3))
  rec_lim <- as.numeric(pick(p, "recovery_limit_pct", 20))
  cv_lim <- as.numeric(pick(p, "cv_limit_pct", 20))
  unit <- pick(p, "conc_unit", "")
  type_col <- need_column(df, pick(p, "type_col", "type"), "type_col")
  conc_col <- need_column(df, pick(p, "conc_col", "conc"), "conc_col")
  sig_col <- need_column(df, pick(p, "signal_col", "signal"), "signal_col")
  sample_col <- pick(p, "sample_col", if ("sample" %in% names(df)) "sample" else NULL)
  if (!is.null(sample_col)) need_column(df, sample_col, "sample_col")
  plate_col <- pick(p, "plate_col", NULL)
  if (!is.null(plate_col)) need_column(df, plate_col, "plate_col")
  well_col <- pick(p, "well_col", if ("well" %in% names(df)) "well" else NULL)
  dil_col <- pick(p, "dilution_col", if ("dilution" %in% names(df)) "dilution" else NULL)
  if (!is.null(dil_col)) need_column(df, dil_col, "dilution_col")
  dilution <- as.numeric(pick(p, "dilution", 1))
  exclude <- as_list_arg(p$exclude)
  avg <- pick(p, "average_replicates", "none")
  if (!avg %in% c("signal", "none")) fail(paste("average_replicates must be signal or none, not", avg))
  nominal_col <- pick(p, "nominal_col", NULL)
  if (!is.null(nominal_col)) need_column(df, nominal_col, "nominal_col")

  d <- data.frame(row = seq_len(nrow(df)) + 1, kind = type_of(df[[type_col]]), x = numeric_column(df, conc_col, "conc_col"), y_raw = numeric_column(df, sig_col, "signal_col"), stringsAsFactors = FALSE)
  d$sample <- if (is.null(sample_col)) paste0("row", d$row) else as.character(df[[sample_col]])
  d$plate <- if (is.null(plate_col)) "1" else as.character(df[[plate_col]])
  d$well <- if (is.null(well_col) || !well_col %in% names(df)) as.character(d$row) else as.character(df[[well_col]])
  d$dilution <- if (is.null(dil_col)) dilution else numeric_column(df, dil_col, "dilution_col")
  d$dilution[!is.finite(d$dilution)] <- dilution
  d$nominal <- if (is.null(nominal_col)) NA_real_ else numeric_column(df, nominal_col, "nominal_col")
  d$type <- as.character(df[[type_col]])
  if (!any(d$kind == "standard")) fail(sprintf("no standard rows: type_col '%s' has the values %s. Standards need the value standard (or std, cal, calibrator).", type_col, paste(head(unique(df[[type_col]]), 8), collapse = ", ")))
  if (length(exclude)) {
    hit <- d$well %in% exclude | as.character(d$row) %in% exclude
    missing <- setdiff(exclude, c(d$well, as.character(d$row)))
    if (length(missing)) fail(sprintf("exclude names wells or rows that are not in the data: %s. Give well names from the column '%s' or file row numbers.", paste(missing, collapse = ", "), if (is.null(well_col)) "(no well column)" else well_col))
    n_excluded <- sum(hit)
    d <- d[!hit, ]
  } else n_excluded <- 0L

  plates <- unique(d$plate)
  std_rows <- list(); smp_rows <- list(); metrics <- list(); curves <- list()
  for (pl in plates) {
    dp <- d[d$plate == pl, ]
    blanks <- dp$y_raw[dp$kind == "blank" & is.finite(dp$y_raw)]
    blank_src <- "blank wells"
    if (!length(blanks)) { blanks <- dp$y_raw[dp$kind == "standard" & dp$x == 0 & is.finite(dp$y_raw)]; blank_src <- "zero standard" }
    if (blank_mode == "subtract" && !length(blanks)) fail(sprintf("blank is subtract, but plate %s has no blank wells and no zero standard. Set blank to none, or mark the blank wells in '%s'.", pl, type_col))
    bmean <- if (length(blanks)) mean(blanks) else NA
    bsd <- if (length(blanks) >= 2) sd(blanks) else NA
    dp$y <- if (blank_mode == "subtract") dp$y_raw - bmean else dp$y_raw
    fp <- fit_plate(dp, model, weighting, avg)
    fit <- fp$fit; st <- fp$st
    par <- fp$par
    f <- curve_fun(par)
    pred <- f(st$x)
    ss_res <- sum((st$y - pred)^2); ss_tot <- sum((st$y - mean(st$y))^2)
    increasing <- f(max(st$x)) > f(min(st$x[st$x > 0]))
    bottom <- min(par$c, par$d); top <- max(par$c, par$d)

    wells <- fp$wells
    wells$back <- inverse(par, wells$y)
    lev <- sort(unique(wells$x[wells$x > 0]))
    sl <- do.call(rbind, lapply(lev, function(L) {
      b <- wells$back[wells$x == L]
      mb <- if (avg == "signal") inverse(par, mean(wells$y[wells$x == L])) else if (all(is.na(b))) NA else mean(b, na.rm = TRUE)
      data.frame(plate = pl, nominal = L, n = length(b), mean_signal = mean(wells$y[wells$x == L]), mean_back = mb, recovery_pct = 100 * mb / L, cv_pct = cv_pct(b), stringsAsFactors = FALSE)
    }))
    sl$in_range <- !is.na(sl$recovery_pct) & abs(sl$recovery_pct - 100) <= rec_lim & (is.na(sl$cv_pct) | sl$cv_pct <= cv_lim)
    lod_signal <- NA; lod <- NA
    if (is.finite(bsd)) {
      base <- if (blank_mode == "subtract") 0 else bmean
      lod_signal <- if (increasing) base + lod_k * bsd else base - lod_k * bsd
      lod <- inverse(par, lod_signal)
      if (is.na(lod)) fp$warnings <- c(fp$warnings, sprintf("plate %s: the LOD signal %.4g (blank mean plus %g SD) is beyond the %s asymptote of the curve (%.4g), so the curve gives no LOD concentration", pl, lod_signal, lod_k, if (increasing) "lower" else "upper", if (increasing) bottom else top))
    } else if (length(blanks) < 2) fp$warnings <- c(fp$warnings, sprintf("plate %s: fewer than 2 blank wells, so no LOD", pl))
    rng <- loq_range(lev, sl$in_range)
    lloq <- rng[1]; uloq <- rng[2]
    if (is.finite(lod) && is.finite(lloq) && lloq < lod) {
      ok_above <- lev[sl$in_range & lev >= lod & lev <= uloq]
      lloq <- if (length(ok_above)) min(ok_above) else NA
    }
    std_rows[[pl]] <- sl

    sm <- dp[dp$kind == "sample" & is.finite(dp$y), ]
    if (nrow(sm)) {
      sm$conc_well <- inverse(par, sm$y)
      sm$conc <- sm$conc_well * sm$dilution
      sm$beyond <- ifelse(is.na(sm$conc_well), ifelse(xor(sm$y < bottom, !increasing), "below", "above"), "")
      key <- paste(sm$sample, sm$dilution, sep = "\r")
      grp <- lapply(split(seq_len(nrow(sm)), factor(key, levels = unique(key))), function(i) {
        s <- sm[i, ]
        mw <- if (avg == "signal") inverse(par, mean(s$y)) else if (all(is.na(s$conc_well))) NA else mean(s$conc_well, na.rm = TRUE)
        beyond <- if (avg == "signal") { if (is.na(mw)) (if (xor(mean(s$y) < bottom, !increasing)) "below" else "above") else "" } else s$beyond
        flags <- character()
        if (any(beyond == "below")) flags <- c(flags, "signal beyond the low asymptote")
        if (any(beyond == "above")) flags <- c(flags, "signal beyond the high asymptote")
        if (is.finite(mw) && is.finite(lod) && mw < lod) flags <- c(flags, "below LOD")
        if (is.finite(mw) && is.finite(lloq) && mw < lloq) flags <- c(flags, "below LLOQ")
        if (is.finite(mw) && is.finite(uloq) && mw > uloq) flags <- c(flags, "above ULOQ")
        if (is.na(lloq)) flags <- c(flags, "no quantifiable range")
        cvc <- cv_pct(s$conc)
        if (is.finite(cvc) && cvc > cv_lim) flags <- c(flags, "CV above limit")
        conc <- if (avg == "signal") mw * s$dilution[1] else if (all(is.na(s$conc))) NA else mean(s$conc, na.rm = TRUE)
        nom <- s$nominal[1]
        data.frame(plate = pl, type = s$type[1], sample = s$sample[1], dilution = s$dilution[1], n = nrow(s), mean_signal = mean(s$y), cv_signal_pct = cv_pct(s$y), conc_in_well = mw, conc = conc, sd_conc = if (sum(is.finite(s$conc)) >= 2) sd(s$conc, na.rm = TRUE) else NA, cv_conc_pct = cvc, nominal = nom, recovery_pct = if (is.finite(nom) && nom > 0) 100 * conc / nom else NA, flag = if (length(flags)) paste(flags, collapse = "; ") else "", stringsAsFactors = FALSE)
      })
      smp_rows[[pl]] <- do.call(rbind, grp)
      sm$plate <- pl
      curves[[pl]] <- list(warnings = fp$warnings, par = par, st = st, sm = sm, lod = lod, lloq = lloq, uloq = uloq, increasing = increasing)
    } else curves[[pl]] <- list(warnings = fp$warnings, par = par, st = st, sm = NULL, lod = lod, lloq = lloq, uloq = uloq, increasing = increasing)

    pre <- if (length(plates) > 1) paste0("p", clean_name(pl), "_") else ""
    m <- list(b = par$b, c = par$c, d = par$d, e = par$e, bottom = bottom, top = top, ec50 = inverse(par, (par$c + par$d) / 2), hill_slope = if (increasing) abs(par$b) else -abs(par$b), r_squared = 1 - ss_res / ss_tot, rse = summary(fit)$rseMat[1, "rse"], aic = AIC(fit), n_standards = nrow(st), n_blanks = length(blanks), blank_mean = bmean, blank_sd = bsd, lod = lod, lod_signal = lod_signal, lloq = lloq, uloq = uloq)
    if (model != "4PL") m$f <- par$f
    names(m) <- paste0(pre, names(m))
    metrics <- c(metrics, m)
  }
  stds <- do.call(rbind, std_rows)
  smps <- if (length(smp_rows)) do.call(rbind, smp_rows) else data.frame()
  metrics$n_plates <- length(plates)
  metrics$n_samples <- nrow(smps)
  metrics$n_flagged <- if (nrow(smps)) sum(nzchar(smps$flag)) else 0
  metrics$n_excluded <- n_excluded
  across <- NULL
  if (length(plates) > 1 && nrow(smps)) {
    key <- paste(smps$sample, smps$dilution, sep = "\r")
    across <- do.call(rbind, lapply(split(seq_len(nrow(smps)), factor(key, levels = unique(key))), function(i) {
      s <- smps[i, ]
      mc <- if (all(is.na(s$conc))) NA else mean(s$conc, na.rm = TRUE)
      nom <- s$nominal[1]
      data.frame(type = s$type[1], sample = s$sample[1], dilution = s$dilution[1], n_plates = nrow(s), n_with_conc = sum(is.finite(s$conc)), mean_signal = mean(s$mean_signal), cv_signal_pct = cv_pct(s$mean_signal), mean_conc = mc, cv_conc_pct = cv_pct(s$conc), nominal = nom, recovery_pct = if (is.finite(nom) && nom > 0) 100 * mc / nom else NA, stringsAsFactors = FALSE)
    }))
    across$in_range <- is.finite(across$recovery_pct) & abs(across$recovery_pct - 100) <= rec_lim & is.finite(across$cv_conc_pct) & across$cv_conc_pct <= cv_lim & is.finite(across$cv_signal_pct) & across$cv_signal_pct <= cv_lim
    across$in_range[!is.finite(across$nominal)] <- NA
    best_n <- 0
    for (ty in unique(across$type[is.finite(across$nominal)])) {
      a <- across[across$type == ty & is.finite(across$nominal), ]
      a <- a[order(a$nominal), ]
      if (length(unique(a$nominal)) < 3) next
      rng <- loq_range(a$nominal, a$in_range)
      metrics[[paste0("series_lloq_", clean_name(ty))]] <- rng[1]
      metrics[[paste0("series_uloq_", clean_name(ty))]] <- rng[2]
      if (nrow(a) > best_n) { best_n <- nrow(a); metrics$series_lloq <- rng[1]; metrics$series_uloq <- rng[2] }
    }
    for (i in seq_len(nrow(across))) {
      k <- clean_name(across$sample[i])
      metrics[[paste0("mean_conc_", k)]] <- across$mean_conc[i]
      metrics[[paste0("cv_conc_pct_", k)]] <- across$cv_conc_pct[i]
      if (is.finite(across$recovery_pct[i])) metrics[[paste0("recovery_pct_", k)]] <- across$recovery_pct[i]
    }
    if (nzchar(out_path("across"))) write.csv(across, out_path("across"), row.names = FALSE)
  }

  if (nzchar(out_path("standards"))) write.csv(stds, out_path("standards"), row.names = FALSE)
  if (nrow(smps) && nzchar(out_path("samples"))) write.csv(smps, out_path("samples"), row.names = FALSE)

  dev <- open_plot(out_path("plot"), out_path("plot_svg"), width = if (length(plates) > 1) 11 else 7, height = 5 * ceiling(length(plates) / 2))
  draw_both(dev, function() {
    if (length(plates) > 1) par(mfrow = c(ceiling(length(plates) / 2), 2))
    for (pl in plates) {
      cv <- curves[[pl]]
      st <- cv$st
      xs <- c(st$x, if (!is.null(cv$sm)) cv$sm$conc_well)
      pos <- xs[is.finite(xs) & xs > 0]
      lo <- min(pos) / 10; hi <- max(pos) * 3
      grid <- exp(seq(log(lo), log(hi), length.out = 300))
      ys <- c(st$y, curve_fun(cv$par)(grid), if (!is.null(cv$sm)) cv$sm$y)
      plot(log_axis_x(st$x), st$y, log = "x", xaxt = "n", xlim = c(lo, hi), ylim = range(ys, na.rm = TRUE), pch = 16, xlab = paste("Concentration", if (nzchar(unit)) paste0("(", unit, ")") else ""), ylab = if (blank_mode == "subtract") "Signal minus blank" else "Signal", main = paste0(model, " standard curve", if (length(plates) > 1) paste(", plate", pl) else ""))
      log_ticks(lo, hi)
      lines(grid, curve_fun(cv$par)(grid), col = "#1f4e79", lwd = 2)
      if (!is.null(cv$sm)) {
        ok <- is.finite(cv$sm$conc_well)
        points(cv$sm$conc_well[ok], cv$sm$y[ok], pch = 2, col = "#b03a2e")
        if (any(!ok)) rug(rep(if (cv$increasing) hi else lo, sum(!ok)), side = 1, col = "#b03a2e")
      }
      if (is.finite(cv$lloq)) abline(v = cv$lloq, lty = 2, col = "grey40")
      if (is.finite(cv$uloq)) abline(v = cv$uloq, lty = 2, col = "grey40")
      if (is.finite(cv$lod)) abline(v = cv$lod, lty = 3, col = "#7d3c98")
      show <- c(TRUE, !is.null(cv$sm), is.finite(cv$lloq), is.finite(cv$lod))
      legend("topleft", c("standards", "samples (back-calculated)", "LLOQ and ULOQ", "LOD")[show], pch = c(16, 2, NA, NA)[show], lty = c(NA, NA, 2, 3)[show], col = c("black", "#b03a2e", "grey40", "#7d3c98")[show], bty = "n", cex = 0.8)
    }
  })

  pre <- if (length(plates) > 1) paste0("p", clean_name(plates[1]), "_") else ""
  u <- if (nzchar(unit)) paste0(" ", unit) else ""
  fmt <- function(v) if (is.null(v) || is.na(v)) "none" else trimws(formatC(v, digits = 4, format = "g"))
  per_plate <- if (length(plates) == 1) {
    sprintf("R-squared %s, EC50 %s%s, Hill slope %s; LOD %s%s, LLOQ %s%s, ULOQ %s%s", fmt(metrics$r_squared), fmt(metrics$ec50), u, fmt(metrics$hill_slope), fmt(metrics$lod), u, fmt(metrics$lloq), u, fmt(metrics$uloq), u)
  } else {
    paste(sapply(plates, function(pl) { q <- paste0("p", clean_name(pl), "_"); sprintf("plate %s: R-squared %s, LLOQ %s, ULOQ %s", pl, fmt(metrics[[paste0(q, "r_squared")]]), fmt(metrics[[paste0(q, "lloq")]]), fmt(metrics[[paste0(q, "uloq")]])) }), collapse = "; ")
  }
  across_text <- if (is.null(across)) "" else paste0(". Across plates: ", paste(head(sprintf("%s mean %s%s (CV %s%%%s, %d of %d plates)", across$sample, sapply(across$mean_conc, fmt), u, sapply(across$cv_conc_pct, fmt), ifelse(is.finite(across$recovery_pct), sprintf(", recovery %s%%", sapply(across$recovery_pct, fmt)), ""), across$n_with_conc, across$n_plates), 30), collapse = "; "),
    if (!is.null(metrics$series_lloq)) sprintf(". From the samples with a nominal value: LLOQ %s%s, ULOQ %s%s", fmt(metrics$series_lloq), u, fmt(metrics$series_uloq), u) else "")
  all_warn <- unique(unlist(lapply(curves, `[[`, "warnings")))
  summary_text <- sprintf("%s fit, weighting %s, blank %s, replicates averaged: %s, %d plate(s). %s. %d sample result(s), %d flagged%s%s",
    model, weighting, blank_mode, avg, length(plates), per_plate, metrics$n_samples, metrics$n_flagged, across_text, if (length(all_warn)) paste0(". Warnings: ", paste(all_warn, collapse = "; ")) else "")
  fct <- switch(model, `4PL` = "LL.4()", `5PL` = "LL.5()", `5PL-softmax` = "LL.5() with b > 0 (start values)")
  emit(list(
    ok = TRUE,
    summary = summary_text,
    metrics = metrics,
    data = list(samples_file = out_path("samples"), standards_file = out_path("standards"), model = model, weighting = weighting, blank = blank_mode, average_replicates = avg, conc_unit = unit, across_file = if (is.null(across)) NULL else out_path("across"), warnings = as.list(all_warn), drc_version = drc_version()),
    table = if (!is.null(across)) table_of(across, out_path("across")) else if (nrow(smps)) table_of(smps, out_path("samples")) else table_of(stds, out_path("standards")),
    outputs = plot_outputs(),
    manualRoute = sprintf("library(drc); fit <- drm(signal ~ conc, data = standards, fct = %s%s, control = drmc(relTol = 1e-12)); x <- ED(fit, sample_signal, type = \"absolute\") * dilution", fct, if (weighting == "none") "" else sprintf(", weights = %s", if (weighting == "1/y^2") "signal" else "sqrt(signal)"))
  ))
})
