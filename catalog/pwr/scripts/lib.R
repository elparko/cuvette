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

load_pwr <- function() suppressMessages(library(pwr))
pwr_version <- function() as.character(packageVersion("pwr"))

num <- function(p, key) {
  v <- p[[key]]
  if (is.null(v) || (length(v) == 1 && (is.na(v) || identical(v, "")))) return(NULL)
  x <- suppressWarnings(as.numeric(v))
  if (any(is.na(x))) fail(paste0(key, " must be a number, not ", paste(v, collapse = ", "), "."))
  x
}

settings <- function(p, sided_test = TRUE) {
  alpha <- num(p, "alpha")
  if (is.null(alpha)) fail("alpha is missing. The decision alpha sets it.")
  if (alpha <= 0 || alpha >= 0.5) fail(paste("alpha must be between 0 and 0.5, not", alpha))
  alt <- if (sided_test) pick(p, "alternative", "") else "two.sided"
  if (!alt %in% c("two.sided", "greater", "less")) fail("alternative must be two.sided, greater or less. The decision sidedness sets it.")
  power <- num(p, "power")
  if (!is.null(power) && (power <= alpha || power >= 1)) fail(paste0("power must be between alpha and 1, not ", power, "."))
  dropout <- num(p, "dropout")
  if (is.null(dropout)) dropout <- 0
  if (dropout < 0 || dropout >= 1) fail(paste0("dropout must be a fraction from 0 to below 1, not ", dropout, "."))
  list(alpha = alpha, alternative = alt, power = power, dropout = dropout, source = pick(p, "effect_source", ""))
}

solve_for <- function(p, values) {
  target <- pick(p, "solve_for", "")
  if (!target %in% names(values)) fail(paste0("solve_for must be one of ", paste(names(values), collapse = ", "), ", the value that the tool computes from the others."))
  values[target] <- list(NULL)
  missing <- setdiff(names(values)[vapply(values, is.null, logical(1))], target)
  if (length(missing)) fail(paste0("to solve for ", target, ", give ", paste(missing, collapse = " and "), "."))
  c(values, list(target = target))
}

sided <- function(alt) switch(alt, two.sided = "two-sided", greater = "one-sided (greater)", less = "one-sided (less)")

power_curve <- function(fun, n_now, label) {
  path <- out_path("curve")
  if (!nzchar(path) || is.null(n_now) || !is.finite(n_now)) return(NULL)
  ns <- unique(round(seq(max(2, n_now * 0.3), n_now * 2, length.out = 40)))
  pw <- vapply(ns, function(n) tryCatch(fun(n), error = function(e) NA_real_), numeric(1))
  png(path, width = 900, height = 650, res = 110)
  plot(ns, pw, type = "l", lwd = 2, ylim = c(0, 1), xlab = label, ylab = "Power", main = "Power by sample size")
  abline(v = n_now, lty = 2)
  abline(h = 0.8, lty = 3, col = "grey40")
  dev.off()
  path
}

finish <- function(kind, solved, s, n_raw, n_unit, power, effect, effect_name, extra_metrics, text, route, curve_fun, curve_label, extra_data = list()) {
  n_round <- if (!is.null(n_raw)) ceiling(n_raw - 1e-9) else NULL
  m <- c(list(power = power, effect = effect, alpha = s$alpha), extra_metrics)
  if (!is.null(n_raw)) {
    m$n_exact <- n_raw
    m$n <- n_round
    m$n_with_dropout <- ceiling(n_round / (1 - s$dropout) - 1e-9)
  }
  src <- if (nzchar(s$source)) paste0(" Effect size source: ", s$source, ".") else " Effect size source: not stated."
  drop <- if (!is.null(n_raw) && s$dropout > 0) sprintf(" With %.0f%% dropout, enroll %d %s.", 100 * s$dropout, m$n_with_dropout, n_unit) else ""
  curve <- power_curve(curve_fun, n_round, curve_label)
  out <- list(
    ok = TRUE,
    summary = paste0(kind, ", ", sided(s$alternative), ", alpha ", s$alpha, ": ", text, drop, src),
    metrics = m,
    data = c(list(solved_for = solved, alternative = s$alternative, effect_name = effect_name, n_unit = n_unit, effect_source = s$source, pwr_version = pwr_version()), extra_data),
    manualRoute = route
  )
  if (!is.null(curve)) out$outputs <- list(list(path = curve, kind = "image", name = basename(curve)))
  emit(out)
}
