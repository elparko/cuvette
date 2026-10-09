args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  df <- read_studies(p$path)
  cols <- lapply(names(df), function(n) {
    v <- df[[n]]
    num <- is.numeric(v)
    list(name = n, type = if (num) "number" else "text", missing = sum(is.na(v)),
         min = if (num) suppressWarnings(min(v, na.rm = TRUE)) else NULL, max = if (num) suppressWarnings(max(v, na.rm = TRUE)) else NULL,
         zeros = if (num) sum(v == 0, na.rm = TRUE) else NULL, first_values = head(unique(as.character(v)), 3))
  })
  tab <- data.frame(column = names(df), type = sapply(cols, `[[`, "type"), missing = sapply(cols, `[[`, "missing"),
                    zeros = sapply(cols, function(x) if (is.null(x$zeros)) NA else x$zeros), stringsAsFactors = FALSE)
  emit(list(
    ok = TRUE,
    summary = sprintf("%d studies (rows), %d columns: %s.", nrow(df), ncol(df), paste(names(df), collapse = ", ")),
    metrics = list(n_studies = nrow(df), n_columns = ncol(df)),
    data = list(columns = cols),
    table = table_of(tab, NULL, 40),
    manualRoute = sprintf("dat <- read.csv(\"%s\"); str(dat); summary(dat)", p$path)
  ))
})
