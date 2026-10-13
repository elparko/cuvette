local({
  home <- Sys.getenv("HOME")
  cand <- c(Sys.getenv("CUVETTE_R_LIBS"), Sys.getenv("R_LIBS_USER"), file.path(home, ".cuvette", "R-library"))
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
    step <- sub("\\.R$", "", basename(sub("^--file=", "", grep("^--file=", commandArgs(FALSE), value = TRUE)[1])))
    p <- tryCatch(read_params(), error = function(e2) list())
    input <- Filter(Negate(is.null), p[c("path", "image", "peaks", "model")])
    where <- if (length(input)) paste0(" on ", names(input)[1], " = ", input[[1]]) else ""
    fail(paste0("Cardinal step ", step, where, " stopped: ", conditionMessage(e)))
  })
}

out_path <- function(key) Sys.getenv(paste0("CUVETTE_OUTPUT_", toupper(key)))

table_of <- function(df, path = NULL, max_rows = 12) {
  rows <- lapply(seq_len(min(nrow(df), max_rows)), function(i) unname(lapply(df[i, , drop = FALSE], function(v) if (is.factor(v)) as.character(v) else v)))
  list(columns = names(df), rows = rows, n_rows = nrow(df), path = path)
}

load_cardinal <- function() {
  suppressMessages(library(Cardinal))
  setCardinalBPPARAM(BiocParallel::SerialParam())
  setCardinalVerbose(FALSE)
}

cardinal_version <- function() as.character(packageVersion("Cardinal"))
