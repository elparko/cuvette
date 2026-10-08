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
  distance <- pick(p, "distance", "bray")
  by <- pick(p, "by", "terms")
  nperm <- as.integer(pick(p, "permutations", 999))
  perms <- make_perms(p, env)
  d <- vegdist(m, method = distance)
  fit <- adonis2(as.formula(paste("d ~", rhs)), data = env, permutations = perms, by = by)
  tab <- as.data.frame(fit)
  df <- data.frame(term = rownames(tab), Df = tab$Df, SumOfSqs = tab$SumOfSqs, R2 = tab$R2, F = tab$F, p = tab$`Pr(>F)`, row.names = NULL)
  out <- out_path("table")
  write.csv(df, out, row.names = FALSE)
  first <- df[1, ]
  strata <- pick(p, "strata", "none")
  emit(list(
    ok = TRUE,
    summary = sprintf("PERMANOVA %s, %s distance, %d permutations, seed %d, strata %s: %s R2 %.4f, F %.3f, p %.4f", rhs, distance, nperm, as.integer(pick(p, "seed", 1)), strata, first$term, first$R2, first$F, first$p),
    metrics = list(r2 = first$R2, f = first$F, p = first$p, df = first$Df, n_sites = nrow(m), permutations = nperm, residual_r2 = df$R2[df$term == "Residual"]),
    data = list(formula = rhs, distance = distance, transform = prep$transform, by = by, strata = strata, seed = as.integer(pick(p, "seed", 1)), min_p_possible = 1 / (nperm + 1), vegan_version = vegan_version()),
    table = table_of(df, out, 25),
    manualRoute = sprintf("set.seed(%d); adonis2(comm ~ %s, data=env, method=\"%s\", permutations=%d, by=\"%s\")", as.integer(pick(p, "seed", 1)), rhs, distance, nperm, by)
  ))
})
