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


read_community <- function(path) {
  if (!file.exists(path)) fail(paste("file not found:", path))
  df <- read.csv(path, check.names = FALSE, stringsAsFactors = FALSE)
  m <- as.matrix(df[, -1, drop = FALSE])
  rownames(m) <- as.character(df[[1]])
  if (!is.numeric(m)) fail("the community table must hold numbers only (first column is the site name)")
  if (anyNA(m)) fail("the community table has missing values")
  if (any(m < 0)) fail("the community table has negative values")
  m
}

read_env <- function(path, sites) {
  if (!file.exists(path)) fail(paste("file not found:", path))
  df <- read.csv(path, check.names = FALSE, stringsAsFactors = FALSE)
  rownames(df) <- as.character(df[[1]])
  df <- df[, -1, drop = FALSE]
  miss <- setdiff(sites, rownames(df))
  if (length(miss)) fail(paste("sites without a row in the environment table:", paste(head(miss, 5), collapse = ", ")))
  df <- df[sites, , drop = FALSE]
  for (v in names(df)) if (is.character(df[[v]])) df[[v]] <- factor(df[[v]])
  df
}

transform_community <- function(m, transform) {
  switch(transform,
    none = m,
    sqrt = sqrt(m),
    log1p = log1p(m),
    hellinger = vegan::decostand(m, "hellinger"),
    wisconsin = vegan::wisconsin(m),
    presence = (m > 0) * 1,
    fail(paste("unknown transform:", transform)))
}

prepare_community <- function(p) {
  m <- read_community(p$community)
  transform <- pick(p, "transform", "none")
  list(raw = m, m = transform_community(m, transform), transform = transform)
}

make_perms <- function(p, env = NULL) {
  n <- as.integer(pick(p, "permutations", 999))
  strata <- pick(p, "strata", NULL)
  set.seed(as.integer(pick(p, "seed", 1)))
  if (is.null(strata) || identical(strata, "") || identical(strata, "none")) return(permute::how(nperm = n))
  if (is.null(env) || !strata %in% names(env)) fail(paste("strata is not a column of the environment table:", strata))
  permute::how(nperm = n, blocks = env[[strata]])
}

rhs_of <- function(f) {
  f <- trimws(f)
  if (grepl("~", f, fixed = TRUE)) f <- sub("^.*~", "", f)
  trimws(f)
}

check_terms <- function(rhs, env) {
  bad <- setdiff(all.vars(as.formula(paste("~", rhs))), names(env))
  if (length(bad)) fail(paste("not a column of the environment table:", paste(bad, collapse = ", "), ". Columns:", paste(names(env), collapse = ", ")))
}

load_vegan <- function() suppressMessages(library(vegan))
vegan_version <- function() as.character(packageVersion("vegan"))
