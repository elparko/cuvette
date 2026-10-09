local({
  home <- Sys.getenv("HOME")
  cand <- c(Sys.getenv("GA_R_LIBS"), Sys.getenv("R_LIBS_USER"), "/Volumes/T7/guided-analysis/tools/R-library", file.path(home, ".guided-analysis", "R-library"))
  cand <- unique(cand[nzchar(cand) & dir.exists(cand)])
  if (length(cand)) {
    Sys.setenv(R_LIBS_USER = cand[1])
    .libPaths(c(cand, .libPaths()))
  }
})

sink(stderr(), type = "output")
options(warn = 1)

read_params <- function() {
  jsonlite::fromJSON(commandArgs(trailingOnly = TRUE)[1], simplifyVector = TRUE)
}

pick <- function(p, key, default) {
  v <- p[[key]]
  if (is.null(v) || (length(v) == 1 && is.na(v))) default else v
}

emit <- function(x) {
  if (!is.null(x$data)) x <- c(x[names(x) != "data"], x$data)
  sink()
  cat(jsonlite::toJSON(x, auto_unbox = TRUE, digits = NA, na = "null", null = "null"), "\n")
  quit(save = "no", status = 0)
}

fail <- function(msg) emit(list(ok = FALSE, error = msg))

run_tool <- function(body) {
  tryCatch(body(), error = function(e) {
    script <- grep("^--file=", commandArgs(FALSE), value = TRUE)
    step <- if (length(script)) sub("\\.R$", "", basename(sub("^--file=", "", script[1]))) else "the R step"
    p <- tryCatch(read_params(), error = function(e2) list())
    files <- unlist(Filter(function(v) is.character(v) && length(v) == 1 && file.exists(v), p))
    where <- if (length(files)) paste0(" on ", paste(files, collapse = ", ")) else ""
    fail(paste0(step, " failed", where, ". R says: ", conditionMessage(e)))
  })
}

out_path <- function(key) Sys.getenv(paste0("GA_OUTPUT_", toupper(key)))

table_of <- function(df, path = NULL, max_rows = 12) {
  rows <- lapply(seq_len(min(nrow(df), max_rows)), function(i) unname(lapply(df[i, , drop = FALSE], function(v) if (is.factor(v)) as.character(v) else v)))
  list(columns = names(df), rows = rows, n_rows = nrow(df), path = path)
}


read_data <- function(path) {
  if (!file.exists(path)) fail(paste("file not found:", path))
  df <- read.csv(path, check.names = FALSE, stringsAsFactors = FALSE)
  for (v in names(df)) if (is.character(df[[v]])) df[[v]] <- factor(df[[v]])
  df
}

as_grouping <- function(df, columns) {
  for (v in columns) if (v %in% names(df) && is.numeric(df[[v]])) df[[v]] <- factor(df[[v]])
  df
}

check_formula <- function(formula, df) {
  f <- as.formula(formula)
  bad <- setdiff(all.vars(f), names(df))
  if (length(bad)) fail(paste("not a column of the data:", paste(bad, collapse = ", "), ". Columns:", paste(names(df), collapse = ", ")))
  if (is.null(reformulas::findbars(f))) fail("the formula has no random-effects term, such as (1 | Subject)")
  f
}

grouping_columns <- function(f) {
  unique(unlist(lapply(reformulas::findbars(f), function(b) all.vars(b[[3]]))))
}

load_lme4 <- function() suppressMessages({library(lme4); library(lmerTest)})
lme4_version <- function() as.character(packageVersion("lme4"))

clean_name <- function(x) gsub("^_+|_+$", "", gsub("[^A-Za-z0-9]+", "_", x))
