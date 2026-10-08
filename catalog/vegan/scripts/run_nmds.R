args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_vegan()
  prep <- prepare_community(p)
  distance <- pick(p, "distance", "bray")
  k <- as.integer(pick(p, "k", 2))
  trymax <- as.integer(pick(p, "trymax", 20))
  seed <- as.integer(pick(p, "seed", 1))
  m <- prep$m
  if (any(rowSums(m) == 0)) fail("a site has no species. Remove empty sites before NMDS")
  set.seed(seed)
  fit <- metaMDS(m, distance = distance, k = k, trymax = trymax, autotransform = FALSE, trace = 0)
  sc <- scores(fit, display = "sites")
  df <- data.frame(site = rownames(sc), sc, row.names = NULL)
  out <- out_path("scores")
  write.csv(df, out, row.names = FALSE)
  grp <- NULL
  if (!is.null(pick(p, "environment", NULL)) && !is.null(pick(p, "color_by", NULL))) {
    env <- read_env(p$environment, rownames(m))
    if (!p$color_by %in% names(env)) fail(paste("color_by is not a column of the environment table:", p$color_by))
    grp <- factor(env[[p$color_by]])
  }
  png(out_path("plot"), width = 900, height = 700, res = 110)
  cols <- if (is.null(grp)) "black" else seq_len(nlevels(grp))[grp]
  plot(sc[, 1], sc[, 2], type = "n", xlab = "NMDS1", ylab = "NMDS2", asp = 1, main = sprintf("NMDS, %s, stress %.4f", distance, fit$stress))
  text(sc[, 1], sc[, 2], labels = rownames(sc), col = cols, cex = 0.8)
  if (!is.null(grp)) legend("topright", legend = levels(grp), text.col = seq_len(nlevels(grp)), bty = "n", title = p$color_by)
  dev.off()
  stress <- fit$stress
  quality <- if (stress < 0.05) "excellent" else if (stress < 0.1) "good" else if (stress < 0.2) "usable" else "poor"
  emit(list(
    ok = TRUE,
    summary = sprintf("NMDS, %d dimensions, %s distance, transform %s: stress %.4f (%s), converged in %d of %d runs", k, distance, prep$transform, stress, quality, as.integer(fit$converged), as.integer(fit$tries)),
    metrics = list(stress = stress, k = k, n_converged_runs = as.integer(fit$converged), tries = fit$tries, n_sites = nrow(m), seed = seed),
    data = list(distance = distance, transform = prep$transform, trymax = trymax, stress_reading = quality, scores_file = out, vegan_version = vegan_version()),
    table = table_of(df, out, 25),
    manualRoute = sprintf("set.seed(%d); metaMDS(comm, distance=\"%s\", k=%d, trymax=%d, autotransform=FALSE)", seed, distance, k, trymax)
  ))
})
