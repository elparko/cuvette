args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_vegan()
  prep <- prepare_community(p)
  m <- prep$m
  env <- read_env(p$environment, rownames(m))
  rhs <- rhs_of(p$formula)
  check_terms(rhs, env)
  scale <- isTRUE(as.logical(pick(p, "scale", FALSE)))
  nperm <- as.integer(pick(p, "permutations", 999))
  perms <- make_perms(p, env)
  f <- as.formula(paste("m ~", rhs))
  fit <- eval(bquote(rda(.(f), data = env, scale = .(scale))))
  glob <- anova(fit, permutations = perms)
  tt <- anova(fit, by = "terms", permutations = perms)
  adj <- RsquareAdj(fit)
  tot <- fit$tot.chi
  con <- fit$CCA$tot.chi
  tdf <- data.frame(term = rownames(tt), Df = tt$Df, Variance = tt$Variance, F = tt$F, p = tt$`Pr(>F)`, row.names = NULL)
  out <- out_path("table")
  write.csv(tdf, out, row.names = FALSE)
  png(out_path("plot"), width = 900, height = 700, res = 110)
  ttl <- sprintf("RDA %s", rhs)
  plot(fit, scaling = 2)
  title(main = ttl)
  dev.off()
  emit(list(
    ok = TRUE,
    summary = sprintf("RDA %s, transform %s, scale %s, %d permutations: constrained %.1f%% of variance, adjusted R2 %.4f, global F %.3f, p %.4f", rhs, prep$transform, scale, nperm, 100 * con / tot, adj$adj.r.squared, glob$F[1], glob$`Pr(>F)`[1]),
    metrics = list(constrained_fraction = con / tot, r2 = adj$r.squared, adj_r2 = adj$adj.r.squared, global_f = glob$F[1], global_p = glob$`Pr(>F)`[1], permutations = nperm, n_constrained_axes = length(fit$CCA$eig)),
    data = list(formula = rhs, transform = prep$transform, scale = scale, strata = pick(p, "strata", "none"), seed = as.integer(pick(p, "seed", 1)), vegan_version = vegan_version()),
    table = table_of(tdf, out, 25),
    manualRoute = sprintf("set.seed(%d); fit <- rda(comm ~ %s, data=env, scale=%s); anova(fit, permutations=%d); RsquareAdj(fit)", as.integer(pick(p, "seed", 1)), rhs, scale, nperm)
  ))
})
