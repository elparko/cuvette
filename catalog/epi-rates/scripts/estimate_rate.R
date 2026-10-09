args <- commandArgs(FALSE)
here <- dirname(sub("^--file=", "", args[grep("^--file=", args)]))
source(file.path(here, "lib.R"))
source(file.path(here, "epi_lib.R"))

run_tool(function() {
  suppressMessages(library(epitools))
  p <- read_params()
  lv <- level_args(p)
  measure <- choice(p, "measure", c("incidence_rate", "proportion"))
  method <- choice(p, "ci_method", c("exact", "wilson"), "Interval method")
  if (measure == "incidence_rate" && method == "wilson") fail("ci_method 'wilson' works only for measure 'proportion'. Use 'exact' for an incidence rate.")
  denom_name <- if (measure == "incidence_rate") "person_time" else "population"
  if (!is.null(pick(p, "data", NULL))) {
    df <- read_data(p$data, "the count table")
    events <- column_values(df, p, "events_col")
    denom <- column_values(df, p, paste0(denom_name, "_col"))
    if (is.null(events)) fail(sprintf("give events_col. Columns: %s", paste(names(df), collapse = ", ")))
    if (is.null(denom)) fail(sprintf("give %s_col for measure '%s'. Columns: %s", denom_name, measure, paste(names(df), collapse = ", ")))
    gcol <- pick(p, "group_col", NULL)
    groups <- if (is.null(gcol)) paste0("group", seq_along(events)) else as.character(df[[need_column(df, gcol, "group_col")]])
  } else {
    events <- num_value(p, "events")
    denom <- num_value(p, denom_name)
    if (is.null(events)) fail("give events (a count), or give data with events_col")
    if (is.null(denom)) fail(sprintf("give %s, or give data with %s_col. Measure '%s' needs it.", denom_name, denom_name, measure))
    groups <- pick(p, "label", "all")
  }
  if (any(events != round(events))) fail("events must be whole numbers")
  if (any(denom <= 0)) fail(sprintf("%s must be above 0 in every row", denom_name))
  if (measure == "proportion" && any(events > denom)) fail("events is larger than population in a row. A proportion cannot be above 1.")
  res <- t(vapply(seq_along(events), function(i) {
    r <- if (measure == "incidence_rate") pois.exact(events[i], denom[i], lv$conf)
         else if (method == "exact") binom.exact(events[i], denom[i], lv$conf) else binom.wilson(events[i], denom[i], lv$conf)
    c(estimate = if (measure == "incidence_rate") r$rate else r$proportion, lower = r$lower, upper = r$upper)
  }, numeric(3)))
  tab <- data.frame(group = groups, events = events, denominator = denom, estimate = res[, 1] * lv$per, lower = res[, 2] * lv$per, upper = res[, 3] * lv$per, stringsAsFactors = FALSE)
  names(tab)[3] <- denom_name
  if (nzchar(out_path("rates"))) write.csv(tab, out_path("rates"), row.names = FALSE)
  what <- if (measure == "incidence_rate") "rate" else "proportion"
  lines <- sprintf("%s: %g events, %s %g, %s %s per %g (%s interval %s to %s)", tab$group, tab$events, denom_name, denom,
                   what, fmt(tab$estimate, 6), lv$per, pct(lv$conf), fmt(tab$lower, 6), fmt(tab$upper, 6))
  how <- if (measure == "incidence_rate") "exact Poisson" else if (method == "exact") "exact binomial (Clopper-Pearson)" else "Wilson score"
  metrics <- if (nrow(tab) == 1) list(estimate = tab$estimate, lower = tab$lower, upper = tab$upper, events = tab$events, denominator = denom[1])
             else c(list(n_groups = nrow(tab)), setNames(as.list(tab$estimate), paste0("estimate_", slug(tab$group))),
                    setNames(as.list(tab$lower), paste0("lower_", slug(tab$group))), setNames(as.list(tab$upper), paste0("upper_", slug(tab$group))))
  emit(list(
    ok = TRUE,
    summary = sprintf("%s per %g, %s interval, %s. %s", what, lv$per, how, pct(lv$conf), paste(lines, collapse = "; ")),
    metrics = metrics,
    table = table_of(tab, out_path("rates")),
    manualRoute = "R: epitools::pois.exact(x, pt) for a rate, epitools::binom.exact(x, n) for a proportion. Stata: cii proportions n x, poisson for a rate. OpenEpi: Person-Time or Proportion."
  ))
})
