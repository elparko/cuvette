args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_cardinal()
  obj <- readRDS(p$model)
  s <- as.numeric(pick(p, "s", NA))
  if (is.na(s)) s <- obj$s[1]
  idx <- match(s, obj$s)
  if (is.na(idx)) fail(paste("no model with s =", s, ". Fitted s values:", paste(obj$s, collapse = ", ")))
  m <- if (length(obj$s) == 1) obj$fit else obj$fit[[idx]]
  n <- pick(p, "n", 5)
  tf <- as.data.frame(topFeatures(m, n = n))
  tf <- tf[, intersect(c("class", "mz", "statistic", "centers", "sd"), names(tf))]
  tf$class <- as.character(tf$class)
  sizes <- table(m$class)
  out <- out_path("features")
  write.csv(tf, out, row.names = FALSE)
  emit(list(
    ok = TRUE,
    summary = sprintf("model s=%s has %d segments; top ions of the segments (up to %d for each)", s, length(sizes), n),
    metrics = list(s = s, n_segments = length(sizes), n_rows = nrow(tf)),
    data = list(features_file = out, segment_sizes = as.list(setNames(as.integer(sizes), names(sizes)))),
    table = table_of(tf, out, max_rows = 30),
    manualRoute = sprintf("topFeatures(fit[[%d]], n=%s)  # model s=%s", idx, n, s)
  ))
})
