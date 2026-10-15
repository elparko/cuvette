args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_lme4()
  df <- read_data(p$data)
  formula <- p$formula
  f <- check_formula(formula, df)
  grp <- grouping_columns(f)
  df <- as_grouping(df, grp)
  reml <- isTRUE(as.logical(pick(p, "reml", TRUE)))
  method <- pick(p, "p_value_method", "satterthwaite")
  ddf <- switch(method, satterthwaite = "Satterthwaite", `kenward-roger` = "Kenward-Roger", none = "lme4", fail(paste("unknown p_value_method:", method)))
  warns <- character()
  fit <- withCallingHandlers(
    eval(bquote(lmerTest::lmer(.(f), data = df, REML = .(reml)))),
    warning = function(w) { warns <<- c(warns, conditionMessage(w)); invokeRestart("muffleWarning") }
  )
  s <- summary(fit, ddf = ddf)
  co <- as.data.frame(s$coefficients)
  has_p <- "Pr(>|t|)" %in% names(co)
  fixed <- data.frame(term = rownames(co), estimate = co$Estimate, se = co$`Std. Error`, df = if (has_p) co$df else NA, t = co$`t value`, p = if (has_p) co$`Pr(>|t|)` else NA, row.names = NULL)
  vc <- as.data.frame(VarCorr(fit))
  vc$var1 <- ifelse(is.na(vc$var1), "", vc$var1)
  rnd <- data.frame(group = vc$grp, term = vc$var1, variance = vc$vcov, sd = vc$sdcor, kind = ifelse(is.na(vc$var2), "variance", "correlation"), stringsAsFactors = FALSE)
  rnd$term[rnd$kind == "correlation"] <- paste(vc$var1[rnd$kind == "correlation"], vc$var2[rnd$kind == "correlation"], sep = ":")
  crit <- if (reml) lme4::REMLcrit(fit) else -2 * as.numeric(logLik(fit))
  conv <- fit@optinfo$conv$lme4$messages
  warns <- unique(c(warns, as.character(conv)))
  singular <- lme4::isSingular(fit)
  metrics <- list(n_obs = nobs(fit), reml = as.integer(reml), criterion = crit, logLik = as.numeric(logLik(fit)), AIC = AIC(fit), BIC = BIC(fit), singular = as.integer(singular), n_warnings = length(warns), sd_residual = sigma(fit))
  for (i in seq_len(nrow(fixed))) metrics[[paste0("estimate_", clean_name(fixed$term[i]))]] <- fixed$estimate[i]
  if (has_p) for (i in seq_len(nrow(fixed))) metrics[[paste0("p_", clean_name(fixed$term[i]))]] <- fixed$p[i]
  for (i in seq_len(nrow(rnd))) if (rnd$kind[i] == "variance" && rnd$group[i] != "Residual") metrics[[paste0("sd_", clean_name(rnd$group[i]), "_", clean_name(rnd$term[i]))]] <- rnd$sd[i]
  for (i in seq_len(nrow(rnd))) if (rnd$kind[i] == "correlation") metrics[[paste0("corr_", clean_name(rnd$group[i]))]] <- rnd$sd[i]
  for (g in names(lme4::getME(fit, "flist"))) metrics[[paste0("n_groups_", clean_name(g))]] <- nlevels(lme4::getME(fit, "flist")[[g]])
  saveRDS(fit, out_path("model"))
  write.csv(fixed, out_path("fixed"), row.names = FALSE)
  crit_name <- if (reml) "REML criterion" else "deviance (-2 log likelihood)"
  emit(list(
    ok = TRUE,
    summary = sprintf("%s, %s: %s %.4f, %d obs, %s%s", formula, if (reml) "REML" else "ML", crit_name, crit, nobs(fit), paste(sprintf("%s %.3f", fixed$term, fixed$estimate), collapse = ", "), if (singular) ". The fit is singular" else ""),
    metrics = metrics,
    data = list(model_file = out_path("model"), formula = formula, reml = reml, p_value_method = method, singular = singular, warnings = as.list(warns), random_effects = lapply(seq_len(nrow(rnd)), function(i) as.list(rnd[i, ])), lme4_version = lme4_version(), lmerTest_version = as.character(packageVersion("lmerTest")), p_terms = if (has_p) as.list(paste0("p_", clean_name(fixed$term[fixed$term != "(Intercept)"]))) else list()),
    table = table_of(fixed, out_path("fixed"), 20),
    manualRoute = sprintf("library(lmerTest); fit <- lmer(%s, data = d, REML = %s); summary(fit, ddf = \"%s\"); VarCorr(fit); isSingular(fit)", formula, if (reml) "TRUE" else "FALSE", ddf)
  ))
})
