args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  df <- read_cases(p, character(0))
  cols <- lapply(names(df), function(n) {
    v <- df[[n]]
    num <- is.numeric(v)
    list(column = n, type = if (num) "number" else "text", missing = sum(is.na(v) | (is.character(v) & !nzchar(v))), distinct = length(unique(v[!is.na(v)])),
         min = if (num) suppressWarnings(min(v, na.rm = TRUE)) else NA, max = if (num) suppressWarnings(max(v, na.rm = TRUE)) else NA)
  })
  tab <- do.call(rbind, lapply(cols, as.data.frame))
  two <- tab$column[tab$distinct == 2]
  counts <- lapply(setNames(two, two), function(n) as.list(table(df[[n]])))
  emit(list(
    ok = TRUE,
    summary = sprintf("%d patients (rows), %d columns. Columns with exactly 2 values (possible outcomes): %s.", nrow(df), ncol(df), if (length(two)) paste(two, collapse = ", ") else "none"),
    metrics = list(n_rows = nrow(df), n_columns = ncol(df)),
    data = list(binary_columns = counts),
    table = table_of(tab, NULL, 40),
    manualRoute = sprintf("df <- read.csv(\"%s\"); summary(df)", p$path)
  ))
})
