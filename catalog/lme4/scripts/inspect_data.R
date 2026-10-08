args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  df <- read_data(p$data)
  cols <- lapply(names(df), function(v) {
    x <- df[[v]]
    if (is.factor(x)) {
      n <- as.integer(table(x))
      list(name = v, type = "factor", n_levels = nlevels(x), min_rows_per_level = min(n), max_rows_per_level = max(n), levels = as.list(head(levels(x), 12)))
    } else {
      nd <- length(unique(x))
      info <- list(name = v, type = if (is.integer(x)) "integer" else "number", n_distinct = nd, min = min(x, na.rm = TRUE), max = max(x, na.rm = TRUE), n_missing = sum(is.na(x)))
      if (is.integer(x) && nd <= 100) { n <- as.integer(table(x)); info$min_rows_per_value <- min(n); info$max_rows_per_value <- max(n) }
      info
    }
  })
  fac <- Filter(function(c) c$type == "factor", cols)
  fac <- c(fac, Filter(function(c) !is.null(c$min_rows_per_value), cols))
  desc <- if (length(fac)) paste(sprintf("%s: %d distinct values, %d to %d rows each", sapply(fac, `[[`, "name"), sapply(fac, function(c) if (is.null(c$n_levels)) c$n_distinct else c$n_levels), sapply(fac, function(c) if (is.null(c$min_rows_per_level)) c$min_rows_per_value else c$min_rows_per_level), sapply(fac, function(c) if (is.null(c$max_rows_per_level)) c$max_rows_per_value else c$max_rows_per_level)), collapse = "; ") else "no factor columns"
  emit(list(
    ok = TRUE,
    summary = sprintf("%d rows, %d columns, %d rows with a missing value. %s", nrow(df), ncol(df), sum(!complete.cases(df)), desc),
    metrics = list(n_rows = nrow(df), n_columns = ncol(df), n_incomplete_rows = sum(!complete.cases(df))),
    data = list(columns = cols, lme4_version = lme4_version()),
    table = table_of(df, NULL, 10),
    manualRoute = "d <- read.csv(\"data.csv\"); str(d); sapply(d[sapply(d, is.character)], function(x) table(x))"
  ))
})
