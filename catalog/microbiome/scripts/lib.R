local({
  home <- Sys.getenv("HOME")
  cand <- c(Sys.getenv("GA_R_LIBS"), Sys.getenv("R_LIBS_USER"), "/Volumes/T7/guided-analysis/tools/R-library", file.path(home, ".guided-analysis", "R-library"))
  cand <- unique(cand[nzchar(cand) & dir.exists(cand)])
  if (length(cand)) {
    Sys.setenv(R_LIBS_USER = paste(cand, collapse = .Platform$path.sep))
    .libPaths(c(cand, .libPaths()))
  }
})

sink(stderr(), type = "output")
options(warn = 1)

read_params <- function() jsonlite::fromJSON(commandArgs(trailingOnly = TRUE)[1], simplifyVector = TRUE)

pick <- function(p, key, default) {
  v <- p[[key]]
  if (is.null(v) || (length(v) == 1 && is.na(v)) || identical(v, "")) default else v
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

split_list <- function(x) {
  if (is.null(x)) return(character())
  v <- if (length(x) == 1) trimws(strsplit(as.character(x), ",")[[1]]) else as.character(x)
  v[nzchar(v)]
}

read_delim_file <- function(path, what) {
  if (!file.exists(path)) fail(paste0(what, " file not found: ", path))
  first <- readLines(path, n = 1, warn = FALSE)
  sep <- if (grepl("\t", first, fixed = TRUE)) "\t" else ","
  read.table(path, header = TRUE, sep = sep, quote = "\"", check.names = FALSE, stringsAsFactors = FALSE, comment.char = "", fill = FALSE)
}

load_metadata <- function(path) {
  md <- read_delim_file(path, "metadata")
  if (ncol(md) < 2) fail(paste0("the metadata file needs a sample id column and at least one more column: ", path))
  ids <- as.character(md[[1]])
  if (anyDuplicated(ids)) fail(paste0("duplicate sample ids in the first column of the metadata file: ", paste(head(ids[duplicated(ids)], 5), collapse = ", ")))
  rownames(md) <- ids
  md <- md[, -1, drop = FALSE]
  for (nm in names(md)) if (is.character(md[[nm]])) md[[nm]][trimws(md[[nm]]) == ""] <- NA
  md
}

load_counts <- function(path, md_ids) {
  df <- read_delim_file(path, "feature table")
  first <- as.character(df[[1]])
  rest <- df[, -1, drop = FALSE]
  col_hit <- sum(names(rest) %in% md_ids)
  row_hit <- sum(first %in% md_ids)
  if (col_hit >= row_hit && col_hit > 0) {
    keep <- names(rest)[names(rest) %in% md_ids]
    num <- rest[, keep, drop = FALSE]
    if (!all(vapply(num, is.numeric, logical(1)))) fail("the sample columns of the feature table hold text. Check the file.")
    m <- t(as.matrix(num))
    colnames(m) <- first
    orientation <- "features in rows, samples in columns"
    ignored <- setdiff(names(rest), keep)
  } else if (row_hit > 0) {
    num <- rest[, vapply(rest, is.numeric, logical(1)), drop = FALSE]
    m <- as.matrix(num)
    rownames(m) <- first
    m <- m[rownames(m) %in% md_ids, , drop = FALSE]
    orientation <- "samples in rows, features in columns"
    ignored <- setdiff(names(rest), colnames(num))
  } else {
    fail(paste0("no sample id of the metadata file matches the column names or the first column of the feature table. Metadata ids start with: ", paste(head(md_ids, 3), collapse = ", "), ". The table starts with: ", paste(head(c(names(rest), first), 3), collapse = ", ")))
  }
  if (anyNA(m)) fail("the feature table has missing values")
  if (any(m < 0)) fail("the feature table has negative values")
  list(m = m, orientation = orientation, ignored = ignored)
}

load_inputs <- function(p) {
  md <- load_metadata(p$metadata)
  ct <- load_counts(p$counts, rownames(md))
  common <- intersect(rownames(ct$m), rownames(md))
  list(m = ct$m[common, , drop = FALSE], md = md[common, , drop = FALSE], orientation = ct$orientation, ignored = ct$ignored, n_md = nrow(md), n_table = nrow(ct$m))
}

apply_filter <- function(inp, filter) {
  if (is.null(filter) || identical(filter, "none")) return(inp)
  parts <- strsplit(filter, "=", fixed = TRUE)[[1]]
  if (length(parts) != 2) fail(paste0("sample_filter must look like column=value. Got: ", filter))
  col <- trimws(parts[1]); val <- trimws(parts[2])
  if (!col %in% names(inp$md)) fail(paste0("sample_filter column is not in the metadata: ", col, ". Columns: ", paste(names(inp$md), collapse = ", ")))
  keep <- as.character(inp$md[[col]]) == val
  keep[is.na(keep)] <- FALSE
  if (!any(keep)) fail(paste0("sample_filter keeps no sample: ", filter, ". Values of ", col, ": ", paste(head(unique(as.character(inp$md[[col]])), 8), collapse = ", ")))
  inp$m <- inp$m[keep, , drop = FALSE]
  inp$md <- inp$md[keep, , drop = FALSE]
  inp
}

is_whole <- function(m) all(abs(m - round(m)) < 1e-8)

load_vegan <- function() suppressMessages(library(vegan))
