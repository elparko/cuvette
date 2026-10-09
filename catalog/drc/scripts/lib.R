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

read_params <- function() jsonlite::fromJSON(commandArgs(trailingOnly = TRUE)[1], simplifyVector = TRUE)

pick <- function(p, key, default) {
  v <- p[[key]]
  if (is.null(v) || (length(v) == 1 && (is.na(v) || identical(v, "")))) default else v
}

need <- function(p, key, decision) {
  v <- pick(p, key, NULL)
  if (is.null(v)) fail(sprintf("%s is not set. It is the decision '%s'. Ask the scientist.", key, decision))
  v
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
    where <- if (!is.null(p$data)) paste0(" on ", p$data) else ""
    fail(paste0(step, " failed", where, ". R says: ", conditionMessage(e)))
  })
}

out_path <- function(key) Sys.getenv(paste0("GA_OUTPUT_", toupper(key)))

table_of <- function(df, path = NULL, max_rows = 40) {
  rows <- lapply(seq_len(min(nrow(df), max_rows)), function(i) unname(lapply(df[i, , drop = FALSE], function(v) if (is.factor(v)) as.character(v) else v)))
  list(columns = names(df), rows = rows, n_rows = nrow(df), path = path)
}

read_data <- function(path) {
  if (is.null(path) || !nzchar(path)) fail("give the data file (a CSV file with a header row)")
  if (!file.exists(path)) fail(paste("file not found:", path))
  sep <- if (grepl("\\.(tsv|txt)$", path, ignore.case = TRUE)) "\t" else ","
  read.csv(path, sep = sep, check.names = FALSE, stringsAsFactors = FALSE, strip.white = TRUE)
}

need_column <- function(df, col, arg) {
  if (is.null(col) || !nzchar(col)) fail(sprintf("give the argument %s. Columns: %s", arg, paste(names(df), collapse = ", ")))
  if (!col %in% names(df)) fail(sprintf("%s '%s' is not a column of the data. Columns: %s", arg, col, paste(names(df), collapse = ", ")))
  col
}

numeric_column <- function(df, col, arg) {
  v <- suppressWarnings(as.numeric(df[[col]]))
  bad <- which(is.na(v) & !is.na(df[[col]]) & nzchar(as.character(df[[col]])))
  if (length(bad)) fail(sprintf("%s '%s' has text that is not a number in rows %s, such as '%s'", arg, col, paste(head(bad + 1, 5), collapse = ", "), df[[col]][bad[1]]))
  v
}

as_list_arg <- function(v) {
  if (is.null(v)) return(character())
  v <- unlist(strsplit(as.character(unlist(v)), ","))
  v <- trimws(v)
  v[nzchar(v) & tolower(v) != "none"]
}

load_drc <- function() suppressMessages(library(drc))
drc_version <- function() as.character(packageVersion("drc"))
CONTROL <- quote(drmc(relTol = 1e-12, maxIt = 5000, errorm = FALSE, noMessage = TRUE))

sse_of <- function(fit, x, y, w = NULL) {
  f <- fit$fct$fct
  sw <- if (is.null(w)) rep(1, length(y)) else w
  function(p) sum(((y - f(x, matrix(p, nrow = length(x), ncol = length(p), byrow = TRUE))) / sw)^2)
}

polish <- function(fit, obj) {
  best <- coef(fit)
  val <- obj(best)
  for (i in 1:6) {
    o <- tryCatch(optim(best, obj, method = if (i %% 2) "Nelder-Mead" else "BFGS", control = list(reltol = 1e-15, maxit = 20000)), error = function(e) NULL)
    if (is.null(o) || !is.finite(o$value) || o$value >= val * (1 - 1e-12)) break
    best <- o$par
    val <- o$value
  }
  unname(best)
}

fit_drm <- function(formula, data, fct, weights = NULL, curveid = NULL) {
  env <- list(formula = formula, data = data, fct = fct, control = eval(CONTROL))
  if (!is.null(weights)) env$weights <- weights
  if (!is.null(curveid)) env$curveid <- curveid
  fit <- tryCatch(do.call(drm, env), error = function(e) e)
  if (inherits(fit, "error") || inherits(fit, "try-error") || !inherits(fit, "drc")) fail(paste("the drc fit did not converge:", if (inherits(fit, "error")) conditionMessage(fit) else "drm returned no model"))
  if (!is.null(curveid)) return(fit)
  mf <- model.frame(formula, data)
  obj <- sse_of(fit, mf[[2]], mf[[1]], weights)
  start <- polish(fit, obj)
  if (obj(start) < obj(coef(fit)) * (1 - 1e-10)) {
    again <- tryCatch(do.call(drm, c(env, list(start = start))), error = function(e) NULL)
    if (inherits(again, "drc") && obj(coef(again)) < obj(coef(fit))) fit <- again
  }
  fit
}

CURVE_MODELS <- c("4PL", "5PL", "5PL-softmax", "3PL", "4PL-normalized", "Weibull1", "Weibull2")
FAMILY <- c(`4PL` = "LL", `5PL` = "LL", `5PL-softmax` = "LL", `3PL` = "LL", `4PL-normalized` = "LL", Weibull1 = "W1", Weibull2 = "W2")
FIXED <- list(`3PL` = list(c = 0, f = 1), `4PL-normalized` = list(c = 0, d = 100, f = 1))
DRC_CALL <- c(`4PL` = "LL.4()", `5PL` = "LL.5()", `5PL-softmax` = "LL.5() started with b > 0", `3PL` = "LL.3()", `4PL-normalized` = "LL.4(fixed = c(NA, 0, 100, NA))", Weibull1 = "W1.4()", Weibull2 = "W2.4()")

fct_of <- function(model) switch(model,
  `4PL` = LL.4(names = c("b", "c", "d", "e")),
  `5PL` = LL.5(names = c("b", "c", "d", "e", "f")),
  `5PL-softmax` = LL.5(names = c("b", "c", "d", "e", "f")),
  `3PL` = LL.3(names = c("b", "d", "e")),
  `4PL-normalized` = LL.4(fixed = c(NA, 0, 100, NA), names = c("b", "c", "d", "e")),
  Weibull1 = W1.4(names = c("b", "c", "d", "e")),
  Weibull2 = W2.4(names = c("b", "c", "d", "e")),
  fail(sprintf("model '%s' is not known. Choices: %s", model, paste(CURVE_MODELS, collapse = ", "))))

params_of <- function(fit, model) {
  co <- coef(fit)
  names(co) <- sub(":.*$", "", names(co))
  par <- as.list(co)
  for (k in names(FIXED[[model]])) par[[k]] <- FIXED[[model]][[k]]
  if (is.null(par$f)) par$f <- 1
  par[c("b", "c", "d", "e", "f")]
}

curve_fun <- function(par, model = "4PL") {
  fam <- FAMILY[[model]]
  function(x) {
    z <- par[["b"]] * (log(x) - log(par[["e"]]))
    switch(fam,
      LL = par[["c"]] + (par[["d"]] - par[["c"]]) / (1 + exp(z))^par[["f"]],
      W1 = par[["c"]] + (par[["d"]] - par[["c"]]) * exp(-exp(z)),
      W2 = par[["c"]] + (par[["d"]] - par[["c"]]) * (1 - exp(-exp(z))))
  }
}

inverse <- function(par, y) {
  r <- (par[["d"]] - par[["c"]]) / (y - par[["c"]])
  inner <- suppressWarnings(r^(1 / par[["f"]]) - 1)
  out <- suppressWarnings(par[["e"]] * inner^(1 / par[["b"]]))
  out[!is.finite(out) | is.na(r) | r <= 1 | inner <= 0] <- NA
  out
}

type_of <- function(v) {
  v <- tolower(trimws(as.character(v)))
  ifelse(v %in% c("standard", "std", "cal", "calibrator", "standards"), "standard", ifelse(v %in% c("blank", "blk", "background"), "blank", "sample"))
}

weights_of <- function(y, weighting) switch(weighting,
  none = NULL,
  `1/y` = sqrt(pmax(abs(y), 1e-12)),
  `1/y^2` = pmax(abs(y), 1e-12),
  fail(paste0("unknown weighting: ", weighting, ". Choices: none, 1/y, 1/y^2")))

jtj_vcov <- function(fit, x, y, w = NULL) {
  f <- fit$fct$fct
  par <- coef(fit)
  k <- length(par)
  sw <- if (is.null(w)) rep(1, length(y)) else w
  g <- function(p) f(x, matrix(p, nrow = length(x), ncol = k, byrow = TRUE)) / sw
  J <- numDeriv::jacobian(g, par)
  s2 <- sum((y / sw - g(par))^2) / (length(y) - k)
  v <- s2 * solve(crossprod(J))
  dimnames(v) <- list(names(par), names(par))
  v
}

refit_polished <- function(env, fit, x, y, w) {
  obj <- sse_of(fit, x, y, w)
  best <- polish(fit, obj)
  if (obj(best) < obj(coef(fit)) * (1 - 1e-10)) {
    again <- tryCatch(do.call(drm, modifyList(env, list(start = best))), error = function(e) NULL)
    if (inherits(again, "drc") && obj(coef(again)) < obj(coef(fit))) fit <- again
  }
  fit
}

fit_curve <- function(x, y, model, weighting = "none", where = "the data") {
  if (!model %in% CURVE_MODELS) fail(sprintf("model '%s' is not known. Choices: %s", model, paste(CURVE_MODELS, collapse = ", ")))
  d <- data.frame(x = x, y = y)
  w <- weights_of(y, weighting)
  env <- list(formula = y ~ x, data = d, fct = fct_of(model), control = eval(CONTROL))
  if (!is.null(w)) env$weights <- w
  if (model %in% c("5PL", "5PL-softmax")) {
    p4 <- params_of(fit_curve(x, y, "4PL", weighting, where)$fit, "4PL")
    env$start <- if (model == "5PL") {
      c(if (p4$c <= p4$d) p4$b else -p4$b, min(p4$c, p4$d), max(p4$c, p4$d), p4$e, 1)
    } else {
      if (p4$b > 0) c(p4$b, p4$c, p4$d, p4$e, 1) else c(-p4$b, p4$d, p4$c, p4$e, 1)
    }
  }
  fit <- tryCatch(do.call(drm, env), error = function(e) e)
  if (!inherits(fit, "drc")) fail(sprintf("the %s fit on %s did not converge: %s", model, where, if (inherits(fit, "error")) conditionMessage(fit) else "drm returned no model"))
  fit <- refit_polished(env, fit, x, y, w)
  par <- params_of(fit, model)
  warn <- character()
  if (model == "5PL" && par$c > par$d) warn <- c(warn, "the 5PL fit left the drc and Prism form: c is above d")
  if (model == "5PL-softmax" && par$b < 0) warn <- c(warn, "the 5PL fit left the SoftMax Pro form: b is below 0")
  list(fit = fit, par = par, w = w, warnings = warn, model = model)
}

open_plot <- function(png_path, svg_path, width = 7, height = 5) {
  list(png = png_path, svg = svg_path, width = width, height = height)
}

draw_both <- function(dev, draw) {
  if (nzchar(dev$png)) {
    png(dev$png, width = dev$width * 150, height = dev$height * 150, res = 150)
    draw()
    dev.off()
  }
  if (nzchar(dev$svg)) {
    if (requireNamespace("svglite", quietly = TRUE)) svglite::svglite(dev$svg, width = dev$width, height = dev$height) else svg(dev$svg, width = dev$width, height = dev$height)
    draw()
    dev.off()
  }
}

plot_outputs <- function(keys = c("plot", "plot_svg")) {
  paths <- vapply(keys, out_path, "")
  lapply(Filter(nzchar, paths), function(p) list(path = p, kind = if (grepl("\\.png$", p)) "image" else "file", name = basename(p)))
}

cv_pct <- function(x) {
  x <- x[is.finite(x)]
  if (length(x) < 2 || mean(x) == 0) NA_real_ else 100 * sd(x) / abs(mean(x))
}

log_axis_x <- function(x) {
  pos <- x[x > 0 & is.finite(x)]
  if (!length(pos)) return(x)
  lo <- min(pos) / 10
  ifelse(x <= 0, lo, x)
}

log_ticks <- function(lo, hi) {
  at <- 10^seq(floor(log10(lo)), ceiling(log10(hi)))
  axis(1, at = at, labels = formatC(at, format = "fg", digits = 3, drop0trailing = TRUE))
}

clean_name <- function(x) gsub("^_+|_+$", "", gsub("[^A-Za-z0-9]+", "_", x))
