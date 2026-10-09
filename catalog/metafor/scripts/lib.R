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

out_path <- function(key) Sys.getenv(paste0("CUVETTE_OUTPUT_", toupper(key)))

table_of <- function(df, path = NULL, max_rows = 12) {
  rows <- lapply(seq_len(min(nrow(df), max_rows)), function(i) unname(lapply(df[i, , drop = FALSE], function(v) if (is.factor(v)) as.character(v) else v)))
  list(columns = names(df), rows = rows, n_rows = nrow(df), path = path)
}

load_metafor <- function() suppressMessages(library(metafor))
metafor_version <- function() as.character(packageVersion("metafor"))

RATIO <- c("RR", "OR", "PETO", "ROM", "IRR")
ARGS <- c("ai", "bi", "ci", "di", "n1i", "n2i", "m1i", "m2i", "sd1i", "sd2i", "ri", "ni", "xi", "yi", "vi", "sei")
NEEDS <- list(
  RR = c("ai", "bi", "ci", "di"), OR = c("ai", "bi", "ci", "di"), RD = c("ai", "bi", "ci", "di"), PETO = c("ai", "bi", "ci", "di"),
  SMD = c("m1i", "sd1i", "n1i", "m2i", "sd2i", "n2i"), MD = c("m1i", "sd1i", "n1i", "m2i", "sd2i", "n2i"), ROM = c("m1i", "sd1i", "n1i", "m2i", "sd2i", "n2i"),
  ZCOR = c("ri", "ni"), COR = c("ri", "ni"), PLO = c("xi", "ni"), PR = c("xi", "ni"), GEN = c("yi"))

read_studies <- function(path) {
  if (is.null(path) || !nzchar(path)) fail("path is missing. Give the CSV file with one row for each study.")
  if (!file.exists(path)) fail(paste("file not found:", path))
  read.csv(path, check.names = FALSE, stringsAsFactors = FALSE)
}

back <- function(measure, p = list()) {
  if (measure %in% RATIO) return(exp)
  if (measure == "GEN" && identical(pick(p, "yi_scale", "raw"), "log")) return(exp)
  if (measure == "ZCOR") return(transf.ztor)
  if (measure == "PLO") return(transf.ilogit)
  NULL
}

effect_sizes <- function(p, df) {
  measure <- pick(p, "measure", "")
  if (!nzchar(measure)) fail("measure is missing. The decision effect_measure sets it, such as RR, OR, SMD or GEN for effect sizes that the file already holds.")
  if (!measure %in% names(NEEDS)) fail(paste0("unknown measure: ", measure, ". Use one of: ", paste(names(NEEDS), collapse = ", ")))
  given <- Filter(function(a) !is.null(p[[a]]) && nzchar(p[[a]]), ARGS)
  need <- NEEDS[[measure]]
  if (measure == "GEN" && !any(c("vi", "sei") %in% given)) fail("measure GEN needs yi and vi or sei: the columns of the effect sizes and of their sampling variances or standard errors.")
  miss <- setdiff(need, given)
  if (length(miss)) fail(paste0("measure ", measure, " needs the column arguments ", paste(need, collapse = ", "), ". Missing: ", paste(miss, collapse = ", "), "."))
  cols <- unlist(lapply(given, function(a) p[[a]]))
  bad <- setdiff(cols, names(df))
  if (length(bad)) fail(paste0("not a column of the study table: ", paste(bad, collapse = ", "), ". Columns: ", paste(names(df), collapse = ", ")))
  study <- pick(p, "study", "")
  if (nzchar(study) && !study %in% names(df)) fail(paste0("study is not a column of the study table: ", study, ". Columns: ", paste(names(df), collapse = ", ")))
  labels <- if (nzchar(study)) as.character(df[[study]]) else paste("Study", seq_len(nrow(df)))
  args <- lapply(setNames(given, given), function(a) df[[p[[a]]]])
  zero <- 0L
  if (measure %in% c("RR", "OR", "RD", "PETO")) zero <- sum(apply(cbind(args$ai, args$bi, args$ci, args$di) == 0, 1, any))
  if (measure == "GEN") {
    es <- if (!is.null(args$vi)) escalc(measure = "GEN", yi = args$yi, vi = args$vi) else escalc(measure = "GEN", yi = args$yi, sei = args$sei)
  } else {
    es <- do.call(escalc, c(list(measure = measure), args[intersect(names(args), need)]))
  }
  keep <- !is.na(es$yi) & !is.na(es$vi)
  list(es = es, labels = labels, measure = measure, zero = zero, dropped = labels[!keep], keep = keep)
}

fit_model <- function(p, e) {
  model <- pick(p, "model", "")
  if (!model %in% c("fixed", "random")) fail("model must be fixed or random. The decision model sets it.")
  method <- if (model == "fixed") "FE" else pick(p, "method", "REML")
  if (!method %in% c("FE", "REML", "DL", "PM", "ML", "HE", "SJ", "EB", "HS")) fail(paste("unknown tau2 estimator (method):", method))
  test <- pick(p, "test", "z")
  if (!test %in% c("z", "knha")) fail("test must be z or knha.")
  es <- e$es[e$keep, ]
  if (nrow(es) < 2) fail(paste("the meta-analysis needs 2 or more studies with an effect size. It has", nrow(es)))
  level <- 100 * (1 - as.numeric(pick(p, "alpha", 0.05)))
  res <- rma(yi, vi, data = es, method = method, test = test, level = level, slab = e$labels[e$keep])
  list(res = res, model = model, method = method, test = test)
}

model_name <- function(f) if (f$model == "fixed") "fixed-effect (inverse variance)" else sprintf("random-effects (tau2 estimator %s)", f$method)
