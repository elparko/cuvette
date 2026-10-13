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

out_path <- function(key) Sys.getenv(paste0("CUVETTE_OUTPUT_", toupper(key)))

table_of <- function(df, path = NULL, max_rows = 12) {
  rows <- lapply(seq_len(min(nrow(df), max_rows)), function(i) unname(lapply(df[i, , drop = FALSE], function(v) if (is.factor(v)) as.character(v) else v)))
  list(columns = names(df), rows = rows, n_rows = nrow(df), path = path)
}

split_list <- function(x) {
  if (is.null(x)) return(character())
  v <- if (length(x) == 1) trimws(strsplit(as.character(x), ",")[[1]]) else as.character(x)
  v[nzchar(v)]
}

fcs_files <- function(input) {
  items <- split_list(input)
  if (!length(items)) fail("no FCS input. Give a folder or a comma list of .fcs files in the files argument.")
  paths <- character()
  for (it in items) {
    it <- path.expand(it)
    if (dir.exists(it)) {
      found <- sort(list.files(it, pattern = "\\.fcs$", full.names = TRUE, ignore.case = TRUE))
      if (!length(found)) fail(paste("the folder has no .fcs file:", it))
      paths <- c(paths, found)
    } else if (file.exists(it)) {
      paths <- c(paths, it)
    } else {
      fail(paste("FCS file or folder not found:", it))
    }
  }
  paths
}

sample_id_of <- function(path) sub("\\.fcs$", "", basename(path), ignore.case = TRUE)

read_fcs <- function(path) {
  flowCore::read.FCS(path, transformation = FALSE, truncate_max_range = FALSE, emptyValue = FALSE)
}

channel_names <- function(ff) {
  pd <- flowCore::pData(flowCore::parameters(ff))
  data.frame(channel = as.character(pd$name), marker = ifelse(is.na(pd$desc), as.character(pd$name), as.character(pd$desc)), stringsAsFactors = FALSE)
}

resolve_channels <- function(ff, wanted) {
  ch <- channel_names(ff)
  out <- character()
  for (w in wanted) {
    hit <- which(ch$channel == w)
    if (!length(hit)) hit <- which(ch$marker == w)
    if (!length(hit)) fail(paste0("channel or marker not found in the FCS file: ", w, ". Channels: ", paste(ch$channel, collapse = ", ")))
    out <- c(out, ch$channel[hit[1]])
  }
  out
}
