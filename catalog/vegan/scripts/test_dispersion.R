args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_vegan()
  prep <- prepare_community(p)
  m <- prep$m
  env <- read_env(p$environment, rownames(m))
  variable <- p$variable
  if (!variable %in% names(env)) fail(paste("not a column of the environment table:", variable))
  distance <- pick(p, "distance", "bray")
  nperm <- as.integer(pick(p, "permutations", 999))
  perms <- make_perms(p, env)
  g <- factor(env[[variable]])
  bd <- betadisper(vegdist(m, method = distance), g)
  pt <- permutest(bd, permutations = perms)
  tab <- pt$tab
  avg <- tapply(bd$distances, g, mean)
  png(out_path("plot"), width = 900, height = 700, res = 110)
  plot(bd, main = sprintf("Dispersion by %s, %s distance", variable, distance))
  dev.off()
  f <- tab$F[1]
  pv <- tab$`Pr(>F)`[1]
  emit(list(
    ok = TRUE,
    summary = sprintf("Dispersion test for %s, %s distance, %d permutations: F %.3f, p %.4f", variable, distance, nperm, f, pv),
    metrics = list(f = f, p = pv, df_groups = tab$Df[1], df_residual = tab$Df[2], permutations = nperm),
    data = list(mean_distance_to_centroid = as.list(avg), distance = distance, transform = prep$transform, vegan_version = vegan_version()),
    manualRoute = sprintf("set.seed(%d); permutest(betadisper(vegdist(comm, \"%s\"), env$%s), permutations=%d)", as.integer(pick(p, "seed", 1)), distance, variable, nperm)
  ))
})
