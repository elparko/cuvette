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

load_proc <- function() suppressMessages(library(pROC))
proc_version <- function() as.character(packageVersion("pROC"))

read_cases <- function(p, cols) {
  path <- p$path
  if (is.null(path) || !nzchar(path)) fail("path is missing. Give the CSV file with one row for each patient.")
  if (!file.exists(path)) fail(paste("file not found:", path))
  df <- read.csv(path, check.names = FALSE, stringsAsFactors = FALSE)
  for (a in cols) {
    v <- p[[a]]
    if (is.null(v) || !nzchar(v)) fail(paste0(a, " is missing. Name the column of the CSV file."))
    if (!v %in% names(df)) fail(paste0(a, " is not a column of ", basename(path), ": ", v, ". Columns: ", paste(names(df), collapse = ", ")))
  }
  df
}

outcome_levels <- function(p, df) {
  y <- as.character(df[[p$outcome]])
  lv <- sort(unique(y[!is.na(y) & nzchar(y)]))
  if (length(lv) != 2) fail(paste0("the outcome column ", p$outcome, " must have exactly 2 values. It has ", length(lv), ": ", paste(head(lv, 8), collapse = ", ")))
  positive <- pick(p, "positive", "")
  if (!nzchar(positive)) fail(paste0("positive is missing. Name the outcome value of the patients with the disease (the cases). The values are: ", paste(lv, collapse = ", "), ". The decision positive_class sets it."))
  if (!positive %in% lv) fail(paste0("positive is not a value of ", p$outcome, ": ", positive, ". The values are: ", paste(lv, collapse = ", ")))
  c(setdiff(lv, positive), positive)
}

direction_of <- function(value, name = "direction") {
  if (is.null(value) || !nzchar(value)) fail(paste0(name, " is missing. Say higher (higher values mean disease) or lower (lower values mean disease). The decision direction sets it."))
  if (value == "higher") return("<")
  if (value == "lower") return(">")
  fail(paste0(name, " must be higher or lower, not ", value, "."))
}

make_roc <- function(df, outcome, predictor, levels, direction) {
  x <- suppressWarnings(as.numeric(df[[predictor]]))
  y <- as.character(df[[outcome]])
  keep <- !is.na(x) & !is.na(y) & y %in% levels
  if (sum(y[keep] == levels[2]) == 0 || sum(y[keep] == levels[1]) == 0) fail(paste0("the predictor ", predictor, " needs values for both outcome groups (", paste(levels, collapse = " and "), ")."))
  list(roc = roc(y[keep], x[keep], levels = levels, direction = direction, quiet = TRUE), n_dropped = sum(!keep), x = x[keep], y = y[keep])
}

exact_ci <- function(k, n, alpha) {
  if (n == 0) return(c(NA, NA))
  as.numeric(binom.test(k, n, conf.level = 1 - alpha)$conf.int)
}

accuracy <- function(x, y, levels, direction, threshold, alpha, prevalence = NULL) {
  pos <- if (direction == "<") x >= threshold else x <= threshold
  case <- y == levels[2]
  tp <- sum(pos & case); fn <- sum(!pos & case); fp <- sum(pos & !case); tn <- sum(!pos & !case)
  sens <- tp / (tp + fn); spec <- tn / (tn + fp)
  out <- list(threshold = threshold, tp = tp, fp = fp, tn = tn, fn = fn, sensitivity = sens, specificity = spec)
  ci <- exact_ci(tp, tp + fn, alpha); out$sensitivity_ci_lo <- ci[1]; out$sensitivity_ci_hi <- ci[2]
  ci <- exact_ci(tn, tn + fp, alpha); out$specificity_ci_lo <- ci[1]; out$specificity_ci_hi <- ci[2]
  if (is.null(prevalence)) {
    out$ppv <- if (tp + fp) tp / (tp + fp) else NA
    out$npv <- if (tn + fn) tn / (tn + fn) else NA
    ci <- exact_ci(tp, tp + fp, alpha); out$ppv_ci_lo <- ci[1]; out$ppv_ci_hi <- ci[2]
    ci <- exact_ci(tn, tn + fn, alpha); out$npv_ci_lo <- ci[1]; out$npv_ci_hi <- ci[2]
    out$prevalence <- mean(case)
  } else {
    out$prevalence <- prevalence
    out$ppv <- sens * prevalence / (sens * prevalence + (1 - spec) * (1 - prevalence))
    out$npv <- spec * (1 - prevalence) / (spec * (1 - prevalence) + (1 - sens) * prevalence)
  }
  out$lr_positive <- if (spec < 1) sens / (1 - spec) else NA
  out$lr_negative <- if (spec > 0) (1 - sens) / spec else NA
  out
}

accuracy_text <- function(a, alpha, prevalence_given) {
  lv <- 100 * (1 - alpha)
  pv <- if (prevalence_given) sprintf("PPV %.4f and NPV %.4f at the stated prevalence %.4g", a$ppv, a$npv, a$prevalence)
        else sprintf("PPV %.4f (%g%% CI %.4f to %.4f) and NPV %.4f (%.4f to %.4f) at the sample prevalence %.4f", a$ppv, lv, a$ppv_ci_lo, a$ppv_ci_hi, a$npv, a$npv_ci_lo, a$npv_ci_hi, a$prevalence)
  sprintf("sensitivity %.4f (%g%% exact CI %.4f to %.4f), specificity %.4f (%.4f to %.4f), %s. TP %d, FP %d, TN %d, FN %d.",
          a$sensitivity, lv, a$sensitivity_ci_lo, a$sensitivity_ci_hi, a$specificity, a$specificity_ci_lo, a$specificity_ci_hi, pv, a$tp, a$fp, a$tn, a$fn)
}

prevalence_of <- function(p) {
  v <- pick(p, "prevalence", NULL)
  if (is.null(v) || identical(v, "") || identical(v, "sample")) return(NULL)
  v <- as.numeric(v)
  if (is.na(v) || v <= 0 || v >= 1) fail("prevalence must be a fraction between 0 and 1, or sample for the prevalence of the file.")
  v
}
