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
  tryCatch(body(), error = function(e) fail(conditionMessage(e)))
}

out_path <- function(key) Sys.getenv(paste0("GA_OUTPUT_", toupper(key)))

table_of <- function(df, path = NULL, max_rows = 12) {
  rows <- lapply(seq_len(min(nrow(df), max_rows)), function(i) unname(lapply(df[i, , drop = FALSE], function(v) if (is.factor(v)) as.character(v) else v)))
  list(columns = names(df), rows = rows, n_rows = nrow(df), path = path)
}

read_counts <- function(path) {
  if (!file.exists(path)) fail(paste("file not found:", path))
  df <- read.csv(path, check.names = FALSE, stringsAsFactors = FALSE)
  m <- as.matrix(df[, -1, drop = FALSE])
  rownames(m) <- df[[1]]
  storage.mode(m) <- "integer"
  m
}

read_coldata <- function(path) {
  if (!file.exists(path)) fail(paste("file not found:", path))
  df <- read.csv(path, check.names = FALSE, stringsAsFactors = FALSE)
  rownames(df) <- df[[1]]
  df[, -1, drop = FALSE]
}

load_deseq <- function() suppressMessages(library(DESeq2))
