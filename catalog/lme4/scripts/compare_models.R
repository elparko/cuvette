args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_lme4()
  df <- read_data(p$data)
  full <- p$formula
  reduced <- p$formula_reduced
  f1 <- check_formula(full, df)
  f0 <- check_formula(reduced, df)
  df <- as_grouping(df, unique(c(grouping_columns(f1), grouping_columns(f0))))
  method <- pick(p, "comparison_method", "ML")
  reml <- identical(method, "REML")
  m1 <- eval(bquote(lme4::lmer(.(f1), data = df, REML = .(reml))))
  m0 <- eval(bquote(lme4::lmer(.(f0), data = df, REML = .(reml))))
  fixed_differ <- !identical(sort(names(lme4::fixef(m1))), sort(names(lme4::fixef(m0))))
  a <- anova(m1, m0, refit = FALSE)
  tab <- as.data.frame(a)
  df_out <- data.frame(model = c("reduced", "full"), formula = c(reduced, full), npar = tab$npar[order(tab$npar)], AIC = tab$AIC[order(tab$npar)], BIC = tab$BIC[order(tab$npar)], logLik = tab$logLik[order(tab$npar)], stringsAsFactors = FALSE)
  k <- which.max(tab$npar)
  chisq <- tab$Chisq[k]
  pv <- tab$`Pr(>Chisq)`[k]
  warn <- if (fixed_differ && reml) "The fixed effects differ and the models were fitted with REML. The likelihood ratio test is not valid." else NULL
  emit(list(
    ok = TRUE,
    summary = sprintf("Likelihood ratio test, %s fits: chi-square %.3f on %d df, p %s. AIC reduced %.2f, full %.2f", method, chisq, tab$Df[k], format.pval(pv, digits = 3), df_out$AIC[1], df_out$AIC[2]),
    metrics = list(chisq = chisq, df = tab$Df[k], p = pv, AIC_reduced = df_out$AIC[1], AIC_full = df_out$AIC[2], logLik_reduced = df_out$logLik[1], logLik_full = df_out$logLik[2], reml = as.integer(reml)),
    data = list(comparison_method = method, formula_full = full, formula_reduced = reduced, warning = warn, lme4_version = lme4_version()),
    table = table_of(df_out, NULL, 5),
    manualRoute = sprintf("m1 <- lmer(%s, data = d, REML = %s); m0 <- lmer(%s, data = d, REML = %s); anova(m1, m0, refit = FALSE)", full, if (reml) "TRUE" else "FALSE", reduced, if (reml) "TRUE" else "FALSE")
  ))
})
