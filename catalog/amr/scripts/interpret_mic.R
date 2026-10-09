args <- commandArgs(FALSE)
here <- dirname(sub("^--file=", "", args[grep("^--file=", args)]))
source(file.path(here, "lib.R"))
source(file.path(here, "lib_mic.R"))

wilson <- function(x, n) {
  if (n == 0) return(c(NA, NA))
  z <- qnorm(0.975)
  ph <- x / n
  den <- 1 + z^2 / n
  ctr <- (ph + z^2 / (2 * n)) / den
  hw <- z * sqrt(ph * (1 - ph) / n + z^2 / (4 * n^2)) / den
  c(ctr - hw, ctr + hw)
}

run_tool(function() {
  p <- read_params()
  load_amr()
  guideline <- pick(p, "guideline", NULL)
  if (is.null(guideline)) fail("give guideline, such as 'EUCAST 2024' or 'CLSI 2024'. Choose the standard and the version before you read the results.")
  known <- unique(AMR::clinical_breakpoints$guideline)
  if (!guideline %in% known) fail(sprintf("guideline '%s' is not in AMR %s. Choices: %s", guideline, pkg_version("AMR"), paste(known, collapse = ", ")))
  host <- pick(p, "host", "human")
  uti <- parse_uti(p)
  s_def <- pick(p, "susceptible_definition", "S only")
  if (!s_def %in% c("S only", "S and I")) fail("susceptible_definition must be 'S only' or 'S and I'")
  capped <- pick(p, "capped_mic_handling", "standard")
  if (!capped %in% c("none", "conservative", "standard", "lenient")) fail("capped_mic_handling must be none, conservative, standard or lenient")
  pkpd <- isTRUE(as.logical(pick(p, "include_pkpd", TRUE)))
  inp <- read_mic_long(p)
  long <- inp$long
  mo <- suppressMessages(suppressWarnings(as.mo(long$.organism, language = NULL)))
  ab <- suppressMessages(suppressWarnings(as.ab(long$drug)))
  bad_mo <- bad_organism(mo, long$.organism)
  bad_ab <- unique(long$drug[is.na(ab)])
  if (length(bad_mo)) fail(sprintf("AMR does not know these organisms: %s. Write the full species name, such as Escherichia coli.", paste(head(bad_mo, 10), collapse = ", ")))
  if (length(bad_ab)) fail(sprintf("AMR does not know these drugs: %s. Use the drug name or the code of AMR, such as CIP.", paste(head(bad_ab, 10), collapse = ", ")))
  sir <- suppressMessages(suppressWarnings(as.sir(as.mic(long$mic), mo = mo, ab = ab, guideline = guideline, host = host, uti = uti, include_PKPD = pkpd, capped_mic_handling = capped)))
  long$organism <- as.character(mo_name(mo, language = NULL))
  long$drug_name <- ab_name(ab, language = NULL)
  long$drug_code <- as.character(ab)
  long$sir <- as.character(sir)
  keys <- c("organism", "drug_name", inp$group_cols)
  grp <- do.call(paste, c(lapply(keys, function(k) as.character(long[[k]])), sep = "\r"))
  rows <- lapply(split(seq_len(nrow(long)), grp), function(ix) {
    s <- long$sir[ix]
    n <- sum(!is.na(s))
    cnt <- sapply(c("S", "SDD", "I", "R", "NI"), function(k) sum(s == k, na.rm = TRUE))
    ns <- if (s_def == "S only") cnt[["S"]] else cnt[["S"]] + cnt[["SDD"]] + cnt[["I"]]
    ci <- wilson(ns, n)
    r_ci <- wilson(cnt[["R"]], n)
    out <- long[ix[1], keys, drop = FALSE]
    out$n <- length(ix)
    out$n_interpreted <- n
    out$n_S <- cnt[["S"]]
    out$n_SDD <- cnt[["SDD"]]
    out$n_I <- cnt[["I"]]
    out$n_R <- cnt[["R"]]
    out$n_NI <- cnt[["NI"]]
    out$pct_S <- if (n) 100 * cnt[["S"]] / n else NA
    out$pct_I <- if (n) 100 * (cnt[["SDD"]] + cnt[["I"]]) / n else NA
    out$pct_R <- if (n) 100 * cnt[["R"]] / n else NA
    out$pct_susceptible <- if (n) 100 * ns / n else NA
    out$pct_susceptible_low <- 100 * ci[1]
    out$pct_susceptible_high <- 100 * ci[2]
    out$pct_R_low <- 100 * r_ci[1]
    out$pct_R_high <- 100 * r_ci[2]
    out
  })
  summ <- do.call(rbind, rows)
  rownames(summ) <- NULL
  summ <- summ[do.call(order, lapply(keys, function(k) summ[[k]])), ]
  write.csv(summ, out_path("summary"), row.names = FALSE)
  rowsout <- long[, c(".isolate", keys[keys != "drug_name"], "drug_name", "drug_code", "mic", "sir")]
  names(rowsout)[1] <- "isolate"
  write.csv(rowsout, out_path("interpretations"), row.names = FALSE)

  labels <- do.call(paste, c(lapply(keys, function(k) as.character(summ[[k]])), sep = " | "))
  draw_both(out_path("plot"), out_path("plot_svg"), width = 8, height = max(3, 0.35 * nrow(summ) + 1.5), function() {
    par(mar = c(4.5, max(8, min(22, max(nchar(labels)) * 0.45)), 2, 1))
    m <- rbind(summ$pct_S, summ$pct_I, summ$pct_R)
    m[is.na(m)] <- 0
    barplot(m[, rev(seq_len(ncol(m))), drop = FALSE], horiz = TRUE, names.arg = rev(labels), las = 1, cex.names = 0.7, col = c("#2e7d32", "#f9a825", "#c62828"), xlab = sprintf("Percent of isolates (%s)", guideline), xlim = c(0, 100))
    legend("bottomright", legend = c("S", "I or SDD", "R"), fill = c("#2e7d32", "#f9a825", "#c62828"), cex = 0.7, bg = "white")
  })

  metrics <- list(n_rows = nrow(long), n_interpreted = sum(!is.na(long$sir)), n_no_breakpoint = sum(is.na(long$sir)), n_S = sum(long$sir == "S", na.rm = TRUE), n_SDD = sum(long$sir == "SDD", na.rm = TRUE), n_I = sum(long$sir == "I", na.rm = TRUE), n_R = sum(long$sir == "R", na.rm = TRUE), n_groups = nrow(summ))
  for (i in seq_len(min(nrow(summ), 60))) {
    tag <- clean_name(paste(summ[i, keys], collapse = "_"))
    metrics[[paste0("pct_S_", tag)]] <- summ$pct_S[i]
    metrics[[paste0("pct_R_", tag)]] <- summ$pct_R[i]
    metrics[[paste0("pct_susceptible_", tag)]] <- summ$pct_susceptible[i]
    metrics[[paste0("n_", tag)]] <- summ$n[i]
    metrics[[paste0("n_R_", tag)]] <- summ$n_R[i]
    metrics[[paste0("n_S_", tag)]] <- summ$n_S[i]
    metrics[[paste0("n_SDD_", tag)]] <- summ$n_SDD[i]
    metrics[[paste0("n_I_", tag)]] <- summ$n_I[i]
  }
  notes <- character()
  if (metrics$n_no_breakpoint > 0) notes <- c(notes, sprintf("%d of %d values have no breakpoint in %s for this organism, drug, host and site. Their S, I, R is empty.", metrics$n_no_breakpoint, metrics$n_rows, guideline))
  emit(list(
    ok = TRUE,
    summary = sprintf("Interpreted %d MIC values with %s (AMR %s): %d S, %d SDD, %d I, %d R.%s", metrics$n_interpreted, guideline, pkg_version("AMR"), metrics$n_S, metrics$n_SDD, metrics$n_I, metrics$n_R, if (length(notes)) paste0(" ", notes) else ""),
    metrics = metrics,
    data = list(guideline = guideline, host = host, uti = uti_label(uti), susceptible_definition = s_def, capped_mic_handling = capped, include_pkpd = pkpd, amr_version = pkg_version("AMR"), summary_file = out_path("summary"), interpretations_file = out_path("interpretations"), notes = as.list(notes)),
    table = table_of(summ, out_path("summary")),
    outputs = plot_outputs(),
    manualRoute = sprintf("library(AMR); as.sir(as.mic(mic), mo = \"<species>\", ab = \"<drug>\", guideline = \"%s\", host = \"%s\", uti = %s)", guideline, host, toupper(uti_label(uti)))
  ))
})
