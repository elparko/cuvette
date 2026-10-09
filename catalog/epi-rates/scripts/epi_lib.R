slug <- function(x) gsub("^_|_$", "", gsub("[^A-Za-z0-9]+", "_", as.character(x)))

num_value <- function(p, key, positive = FALSE) {
  v <- pick(p, key, NULL)
  if (is.null(v)) return(NULL)
  n <- suppressWarnings(as.numeric(v))
  if (length(n) != 1 || is.na(n)) fail(sprintf("%s '%s' is not a number", key, paste(v, collapse = " ")))
  if (positive && n <= 0) fail(sprintf("%s is %g. It must be above 0.", key, n))
  if (n < 0) fail(sprintf("%s is %g. It must not be negative.", key, n))
  n
}

choice <- function(p, key, allowed, decision = key) {
  v <- need(p, key, decision)
  if (!v %in% allowed) fail(sprintf("%s '%s' is not valid. Choices: %s", key, v, paste(allowed, collapse = ", ")))
  v
}

level_args <- function(p) {
  alpha <- num_value(p, "alpha")
  if (is.null(alpha)) alpha <- 0.05
  if (alpha <= 0 || alpha >= 1) fail(sprintf("alpha is %g. It must be between 0 and 1.", alpha))
  per <- num_value(p, "per", positive = TRUE)
  if (is.null(per)) fail("per is not set. It is the decision 'Rate multiplier'. Ask the scientist, for example 100000 for a rate per 100,000.")
  list(alpha = alpha, conf = 1 - alpha, per = per)
}

column_values <- function(df, p, arg) {
  if (is.null(pick(p, arg, NULL))) return(NULL)
  numeric_column(df, need_column(df, p[[arg]], arg), arg)
}

pct <- function(conf) sprintf("%g%%", round(conf * 100, 4))

fmt <- function(x, d = 4) trimws(formatC(x, digits = d, format = "g"))
