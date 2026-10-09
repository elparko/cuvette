args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_metafor()
  df <- read_studies(p$path)
  e <- effect_sizes(p, df)
  es <- e$es
  alpha <- as.numeric(pick(p, "alpha", 0.05))
  z <- qnorm(1 - alpha / 2)
  out <- data.frame(study = e$labels, yi = as.numeric(es$yi), vi = as.numeric(es$vi), sei = sqrt(as.numeric(es$vi)),
                    ci_lo = as.numeric(es$yi) - z * sqrt(as.numeric(es$vi)), ci_hi = as.numeric(es$yi) + z * sqrt(as.numeric(es$vi)))
  tf <- back(e$measure, p)
  if (!is.null(tf)) {
    out$effect <- tf(out$yi)
    out$effect_ci_lo <- tf(out$ci_lo)
    out$effect_ci_hi <- tf(out$ci_hi)
  }
  path <- out_path("table")
  write.csv(out, path, row.names = FALSE)
  scale <- if (e$measure %in% RATIO) " (yi is the log ratio; effect is the ratio)" else ""
  note <- if (e$zero > 0) sprintf(" %d studies have a zero cell; escalc added 0.5 to each cell of these studies.", e$zero) else ""
  if (length(e$dropped)) note <- paste0(note, sprintf(" %d studies have no effect size (both arms 0 or missing data): %s.", length(e$dropped), paste(e$dropped, collapse = ", ")))
  emit(list(
    ok = TRUE,
    summary = sprintf("Effect sizes %s for %d studies%s.%s", e$measure, nrow(out), scale, note),
    metrics = list(k = sum(e$keep), n_zero_cell_studies = e$zero, n_dropped = length(e$dropped)),
    data = list(measure = e$measure, metafor_version = metafor_version()),
    table = table_of(out, path, 40),
    manualRoute = sprintf("dat <- escalc(measure = \"%s\", %s, data = read.csv(\"%s\"))", e$measure,
                          paste(sprintf("%s = %s", intersect(ARGS, names(p)), unlist(p[intersect(ARGS, names(p))])), collapse = ", "), p$path)
  ))
})
