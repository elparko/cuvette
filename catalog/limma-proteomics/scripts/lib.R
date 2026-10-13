local({
  home <- Sys.getenv("HOME")
  cand <- c(Sys.getenv("CUVETTE_R_LIBS"), Sys.getenv("R_LIBS_USER"), "/Volumes/T7/guided-analysis/tools/R-library", file.path(home, ".cuvette", "R-library"))
  cand <- unique(cand[nzchar(cand) & dir.exists(cand)])
  if (length(cand)) {
    Sys.setenv(R_LIBS_USER = cand[1])
    .libPaths(c(cand, .libPaths()))
  }
})

sink(stderr(), type = "output")
options(warn = 1)

read_params <- function() jsonlite::fromJSON(commandArgs(trailingOnly = TRUE)[1], simplifyVector = TRUE)

pick <- function(p, key, default) {
  v <- p[[key]]
  if (is.null(v) || (length(v) == 1 && (is.na(v) || identical(v, "")))) default else v
}

emit <- function(x) {
  if (!is.null(x$data)) x <- c(x[names(x) != "data"], x$data)
  sink()
  cat(jsonlite::toJSON(x, auto_unbox = TRUE, digits = NA, na = "null", null = "null"), "\n")
  quit(save = "no", status = 0)
}

fail <- function(msg) emit(list(ok = FALSE, error = msg))

run_tool <- function(body) {
  script <- grep("^--file=", commandArgs(FALSE), value = TRUE)
  step <- if (length(script)) sub("\\.R$", "", basename(sub("^--file=", "", script[1]))) else "the R step"
  tryCatch(body(), error = function(e) {
    p <- tryCatch(read_params(), error = function(e2) list())
    where <- if (!is.null(p$data)) paste0(" on ", paste(p$data, collapse = ", ")) else ""
    fail(paste0(step, " failed", where, ". R says: ", conditionMessage(e)))
  })
}

out_path <- function(key) Sys.getenv(paste0("CUVETTE_OUTPUT_", toupper(key)))

table_of <- function(df, path = NULL, max_rows = 40) {
  rows <- lapply(seq_len(min(nrow(df), max_rows)), function(i) unname(lapply(df[i, , drop = FALSE], function(v) if (is.factor(v)) as.character(v) else v)))
  list(columns = names(df), rows = rows, n_rows = nrow(df), path = path)
}

read_table <- function(path, what = "data") {
  if (is.null(path) || !nzchar(path)) fail(paste("give the", what, "file (a CSV file with a header row)"))
  if (!file.exists(path)) fail(paste("file not found:", path))
  sep <- if (grepl("\\.(tsv|txt)$", path, ignore.case = TRUE)) "\t" else ","
  read.csv(path, sep = sep, check.names = FALSE, stringsAsFactors = FALSE, strip.white = TRUE)
}

need_column <- function(df, col, arg) {
  if (is.null(col) || !nzchar(col)) fail(sprintf("give the argument %s. Columns: %s", arg, paste(head(names(df), 20), collapse = ", ")))
  if (!col %in% names(df)) fail(sprintf("%s '%s' is not a column of the data. Columns: %s", arg, col, paste(head(names(df), 20), collapse = ", ")))
  col
}

as_list_arg <- function(v) {
  if (is.null(v)) return(character())
  if (is.character(v) && length(v) == 1 && grepl("^\\s*\\[", v)) v <- tryCatch(jsonlite::fromJSON(v), error = function(e) gsub("[][\"]", "", v))
  v <- trimws(unlist(strsplit(as.character(unlist(v)), ",")))
  v[nzchar(v) & tolower(v) != "none"]
}

draw_both <- function(png_path, svg_path, width, height, draw) {
  if (nzchar(png_path)) {
    png(png_path, width = width * 120, height = height * 120, res = 120)
    draw()
    dev.off()
  }
  if (nzchar(svg_path)) {
    if (requireNamespace("svglite", quietly = TRUE)) svglite::svglite(svg_path, width = width, height = height) else svg(svg_path, width = width, height = height)
    draw()
    dev.off()
  }
}

plot_outputs <- function(keys = c("plot", "plot_svg")) {
  paths <- vapply(keys, out_path, "")
  unname(lapply(Filter(nzchar, paths), function(p) list(path = p, kind = if (grepl("\\.png$", p)) "image" else "file", name = basename(p))))
}

clean_name <- function(x) gsub("^_+|_+$", "", gsub("[^A-Za-z0-9]+", "_", x))
pkg_version <- function(p) as.character(packageVersion(p))
