args <- commandArgs(FALSE)
here <- dirname(sub("^--file=", "", args[grep("^--file=", args)]))
source(file.path(here, "lib.R"))
source(file.path(here, "epi_lib.R"))

US2000_11 <- c(13818, 55317, 145565, 138646, 135573, 162613, 134834, 87247, 66037, 44842, 15508)

run_tool(function() {
  suppressMessages(library(epitools))
  p <- read_params()
  lv <- level_args(p)
  method <- choice(p, "method", c("direct", "indirect"), "Standardization method")
  df <- read_data(p$data, "the age-specific table")
  gcol <- pick(p, "group_col", NULL)
  g <- if (is.null(gcol)) rep("all", nrow(df)) else as.character(df[[need_column(df, gcol, "group_col")]])
  groups <- unique(g)
  count <- column_values(df, p, "count_col"); pop <- column_values(df, p, "population_col"); rate <- column_values(df, p, "rate_col")
  rows <- list(); m <- list(); lines <- character(); dsr_info <- list()

  if (method == "direct") {
    standard <- choice(p, "standard", c("us2000_11", "custom"), "Standard population")
    stdcol <- NULL
    if (standard == "custom") {
      stdcol <- need_column(df, pick(p, "standard_col", NULL), "standard_col")
      wcol <- numeric_column(df, stdcol, "standard_col")
    }
    if (is.null(rate) && (is.null(count) || is.null(pop))) fail(sprintf("give count_col and population_col, or rate_col. Columns: %s", paste(names(df), collapse = ", ")))
    for (gr in groups) {
      i <- which(g == gr)
      w <- if (standard == "us2000_11") US2000_11 else wcol[i]
      if (length(w) != length(i)) fail(sprintf("group '%s' has %d rows but the standard population '%s' has %d age groups. Give one row for each age group, in the order of the standard.", gr, length(i), standard, length(w)))
      if (!is.null(count) && !is.null(pop)) {
        if (any(pop[i] <= 0)) fail(sprintf("population_col has a value of 0 or less in group '%s'", gr))
        r <- ageadjust.direct(count = count[i], pop = pop[i], stdpop = w, conf.level = lv$conf)
        rows[[gr]] <- data.frame(group = gr, observed = sum(count[i]), crude = r["crude.rate"] * lv$per, adjusted = r["adj.rate"] * lv$per, lower = r["lci"] * lv$per, upper = r["uci"] * lv$per)
        stdwt <- w / sum(w); dsr_info[[gr]] <- c(dsr = unname(r["adj.rate"]), var = sum(stdwt^2 * count[i] / pop[i]^2))
      } else {
        adj <- sum(w / sum(w) * rate[i])
        crude <- if (!is.null(pop)) sum(rate[i] * pop[i]) / sum(pop[i]) else NA
        rows[[gr]] <- data.frame(group = gr, observed = NA, crude = crude, adjusted = adj, lower = NA, upper = NA)
      }
    }
    tab <- do.call(rbind, rows); rownames(tab) <- NULL
    for (k in seq_len(nrow(tab))) {
      s <- slug(tab$group[k])
      m[[paste0("adjusted_rate_", s)]] <- tab$adjusted[k]
      if (!is.na(tab$lower[k])) { m[[paste0("adjusted_lower_", s)]] <- tab$lower[k]; m[[paste0("adjusted_upper_", s)]] <- tab$upper[k] }
      if (!is.na(tab$crude[k])) m[[paste0("crude_rate_", s)]] <- tab$crude[k]
    }
    if (nrow(tab) == 1) m <- c(m, list(adjusted_rate = tab$adjusted, crude_rate = tab$crude), if (!is.na(tab$lower)) list(adjusted_lower = tab$lower, adjusted_upper = tab$upper))
    lines <- vapply(seq_len(nrow(tab)), function(k) {
      ci <- if (is.na(tab$lower[k])) "no interval, because the table has no counts" else sprintf("%s gamma interval %s to %s", pct(lv$conf), fmt(tab$lower[k], 6), fmt(tab$upper[k], 6))
      sprintf("%s: directly standardized rate %s per %g (%s); crude rate %s", tab$group[k], fmt(tab$adjusted[k], 6), lv$per, ci, if (is.na(tab$crude[k])) "not computed" else fmt(tab$crude[k], 6))
    }, "")
    ga <- pick(p, "group_a", if (length(groups) == 2) groups[1] else NULL); gb <- pick(p, "group_b", if (length(groups) == 2) groups[2] else NULL)
    if (!is.null(ga) && !is.null(gb)) {
      for (x in c(ga, gb)) if (!x %in% groups) fail(sprintf("group '%s' is not in column '%s'. Groups: %s", x, gcol, paste(groups, collapse = ", ")))
      ra <- tab$adjusted[tab$group == ga] ; rb <- tab$adjusted[tab$group == gb]
      ratio <- ra / rb
      if (length(dsr_info) == length(groups)) {
        a <- dsr_info[[ga]]; b <- dsr_info[[gb]]
        se <- sqrt(a["var"] / a["dsr"]^2 + b["var"] / b["dsr"]^2); zq <- qnorm(1 - lv$alpha / 2)
        lo <- ratio * exp(-zq * se); hi <- ratio * exp(zq * se)
        m <- c(m, list(rate_ratio = unname(ratio), rate_ratio_low = unname(lo), rate_ratio_high = unname(hi)))
        lines <- c(lines, sprintf("Ratio of standardized rates %s to %s: %s (%s interval %s to %s, log scale)", ga, gb, fmt(ratio, 6), pct(lv$conf), fmt(lo, 6), fmt(hi, 6)))
      } else {
        m <- c(m, list(rate_ratio = unname(ratio)))
        lines <- c(lines, sprintf("Ratio of standardized rates %s to %s: %s (no interval, because the table has no counts)", ga, gb, fmt(ratio, 6)))
      }
    }
    how <- sprintf("Direct standardization, standard population %s", standard)
  } else {
    sir_ci <- choice(p, "sir_ci", c("exact", "log"), "Interval of the ratio")
    if (is.null(count) || is.null(pop)) fail(sprintf("indirect standardization needs count_col and population_col. Columns: %s", paste(names(df), collapse = ", ")))
    refrate <- column_values(df, p, "reference_rate_col")
    refcount <- column_values(df, p, "reference_count_col"); refpop <- column_values(df, p, "reference_population_col")
    if (is.null(refrate) && (is.null(refcount) || is.null(refpop))) fail("give reference_rate_col, or give reference_count_col and reference_population_col. The reference rates come from the scientist's decision 'Reference rates'.")
    if (is.null(refrate)) refrate <- refcount / refpop
    for (gr in groups) {
      i <- which(g == gr)
      obs <- sum(count[i]); exp <- sum(refrate[i] * pop[i])
      if (exp <= 0) fail(sprintf("the expected count is 0 in group '%s'. Check reference_rate_col and population_col.", gr))
      sir <- obs / exp
      ci <- if (sir_ci == "exact") { q <- pois.exact(obs, 1, lv$conf); c(q$lower, q$upper) / exp }
            else { zq <- qnorm(1 - lv$alpha / 2); c(exp(log(sir) - zq / sqrt(obs)), exp(log(sir) + zq / sqrt(obs))) * 1 }
      if (sir_ci == "log" && obs == 0) ci <- c(NA, NA)
      isr <- if (!is.null(refcount)) sir * sum(refcount[i]) / sum(refpop[i]) * lv$per else NA
      rows[[gr]] <- data.frame(group = gr, observed = obs, expected = exp, ratio = sir, lower = ci[1], upper = ci[2], crude = sum(count[i]) / sum(pop[i]) * lv$per, indirect_rate = isr)
    }
    tab <- do.call(rbind, rows); rownames(tab) <- NULL
    for (k in seq_len(nrow(tab))) {
      s <- slug(tab$group[k]); sfx <- if (nrow(tab) == 1) "" else paste0("_", s)
      m[[paste0("observed", sfx)]] <- tab$observed[k]; m[[paste0("expected", sfx)]] <- tab$expected[k]
      m[[paste0("sir", sfx)]] <- tab$ratio[k]; m[[paste0("sir_low", sfx)]] <- tab$lower[k]; m[[paste0("sir_high", sfx)]] <- tab$upper[k]
      if (!is.na(tab$indirect_rate[k])) m[[paste0("indirect_rate", sfx)]] <- tab$indirect_rate[k]
    }
    lines <- vapply(seq_len(nrow(tab)), function(k) sprintf("%s: observed %g, expected %s, standardized ratio %s (%s %s interval %s to %s)%s",
      tab$group[k], tab$observed[k], fmt(tab$expected[k], 6), fmt(tab$ratio[k], 6), pct(lv$conf), if (sir_ci == "exact") "exact Poisson" else "log-normal", fmt(tab$lower[k], 6), fmt(tab$upper[k], 6),
      if (is.na(tab$indirect_rate[k])) "" else sprintf("; indirectly standardized rate %s per %g", fmt(tab$indirect_rate[k], 6), lv$per)), "")
    how <- sprintf("Indirect standardization, reference rates: %s", pick(p, "reference_source", "not stated"))
  }
  if (nzchar(out_path("standardized"))) write.csv(tab, out_path("standardized"), row.names = FALSE)
  emit(list(
    ok = TRUE,
    summary = paste0(how, ". ", paste(lines, collapse = ". "), "."),
    metrics = m,
    table = table_of(tab, out_path("standardized")),
    manualRoute = "Stata: dstdize count pop strata, by(group) using standard for direct, istdize for indirect. SAS: PROC STDRATE METHOD=DIRECT or INDIRECT. R: epitools::ageadjust.direct() and ageadjust.indirect(). OpenEpi: not available."
  ))
})
