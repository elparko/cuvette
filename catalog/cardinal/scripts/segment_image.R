args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_cardinal()
  pk <- readRDS(p$peaks)
  r <- as.numeric(pick(p, "r", 2))
  k <- as.numeric(pick(p, "k", 8))
  s <- as.numeric(unlist(pick(p, "s", 2^(1:6))))
  weights <- pick(p, "weights", "adaptive")
  seed <- as.integer(pick(p, "seed", 1))
  if (!weights %in% c("adaptive", "gaussian")) fail("weights must be adaptive or gaussian")
  set.seed(seed)
  fit <- spatialShrunkenCentroids(pk, weights = weights, r = r, k = k, s = s)
  models <- if (length(s) == 1) list(fit) else lapply(seq_along(s), function(i) fit[[i]])
  mc <- if (length(s) > 1) as.data.frame(mcols(fit)) else NULL
  rows <- do.call(rbind, lapply(seq_along(models), function(i) {
    cls <- table(models[[i]]$class)
    data.frame(s = s[i], n_segments = length(cls), smallest_segment = min(cls), largest_segment = max(cls), AIC = if (is.null(mc)) NA_real_ else mc$AIC[i], BIC = if (is.null(mc)) NA_real_ else mc$BIC[i])
  }))
  out <- out_path("model")
  saveRDS(list(fit = fit, s = s, r = r, k = k, weights = weights, seed = seed), out)
  table_file <- out_path("models")
  write.csv(rows, table_file, row.names = FALSE)
  metrics <- list(n_models = length(s))
  for (i in seq_along(s)) metrics[[paste0("n_segments_s", s[i])]] <- rows$n_segments[i]
  emit(list(
    ok = TRUE,
    summary = sprintf("%d models (r=%s, k=%s, %s weights): segments %s for s = %s", length(s), r, k, weights, paste(rows$n_segments, collapse = ", "), paste(s, collapse = ", ")),
    metrics = metrics,
    data = list(model_file = out, models_file = table_file, r = r, k = k, s = s, weights = weights, seed = seed),
    table = table_of(rows, table_file),
    manualRoute = sprintf("set.seed(%s); fit <- spatialShrunkenCentroids(pk, weights=\"%s\", r=%s, k=%s, s=c(%s))", seed, weights, r, k, paste(s, collapse = ", "))
  ))
})
