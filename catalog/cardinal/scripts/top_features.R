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
  tf <- as.data.frame(topFeatures(m, n = Inf))
  tf <- tf[tf$statistic > 0, intersect(c("class", "mz", "statistic", "centers", "sd"), names(tf)), drop = FALSE]
  sizes <- table(m$class)
  tf <- do.call(rbind, lapply(names(sizes), function(cl) {
    part <- tf[as.character(tf$class) == cl, , drop = FALSE]
    head(part[order(-part$statistic), , drop = FALSE], n)
  }))
  tf$class <- as.character(tf$class)
  out <- out_path("features")
  write.csv(tf, out, row.names = FALSE)
  emit(list(
    ok = TRUE,
    summary = sprintf("model s=%s has %d segments; at most %d ions with a positive statistic for each segment", s, length(sizes), n),
    metrics = list(s = s, n_segments = length(sizes), n_rows = nrow(tf)),
    data = list(features_file = out, segment_sizes = as.list(setNames(as.integer(sizes), names(sizes)))),
    table = table_of(tf, out, max_rows = 30),
    manualRoute = sprintf("topFeatures(fit[[%d]], n=%s)  # model s=%s", idx, n, s)
  ))
})
