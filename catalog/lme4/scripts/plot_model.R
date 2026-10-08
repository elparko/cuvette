args <- commandArgs(FALSE)
source(file.path(dirname(sub("^--file=", "", args[grep("^--file=", args)])), "lib.R"))

run_tool(function() {
  p <- read_params()
  load_lme4()
  fit <- readRDS(p$model)
  kind <- pick(p, "kind", "residuals")
  fr <- fit@frame
  out <- out_path("plot")
  if (kind == "residuals") {
    png(out, width = 1100, height = 520, res = 110)
    par(mfrow = c(1, 2))
    plot(fitted(fit), resid(fit, scaled = TRUE), xlab = "Fitted", ylab = "Scaled residual", pch = 16, col = "#00000088")
    abline(h = 0, lty = 2)
    qqnorm(resid(fit, scaled = TRUE), pch = 16, col = "#00000088", main = "Residual normal Q-Q")
    qqline(resid(fit, scaled = TRUE))
    dev.off()
  } else if (kind == "fit_by_group") {
    g <- names(lme4::getME(fit, "flist"))[1]
    resp <- names(fr)[1]
    xs <- setdiff(names(fr)[sapply(fr, is.numeric)], c(resp, "(weights)"))
    if (!length(xs)) fail("fit_by_group needs a numeric predictor in the model")
    x <- xs[1]
    gv <- lme4::getME(fit, "flist")[[g]]
    lv <- levels(gv)
    nr <- ceiling(length(lv) / 6)
    png(out, width = 1200, height = 220 * nr + 80, res = 110)
    par(mfrow = c(nr, min(6, length(lv))), mar = c(3, 3, 2, 0.5))
    ylim <- range(fr[[resp]], fitted(fit))
    for (l in lv) {
      i <- gv == l
      plot(fr[[x]][i], fr[[resp]][i], pch = 16, ylim = ylim, main = paste(g, l), xlab = "", ylab = "")
      o <- order(fr[[x]][i])
      lines(fr[[x]][i][o], fitted(fit)[i][o], col = "firebrick")
    }
    dev.off()
  } else if (kind == "random_effects") {
    re <- as.data.frame(lme4::ranef(fit, condVar = TRUE))
    re$key <- paste(re$grpvar, re$term, sep = ": ")
    keys <- unique(re$key)
    png(out, width = 1000, height = 420 * length(keys), res = 110)
    par(mfrow = c(length(keys), 1), mar = c(4, 7, 2, 1))
    for (k in keys) {
      d <- re[re$key == k, ]
      d <- d[order(d$condval), ]
      plot(d$condval, seq_len(nrow(d)), xlim = range(d$condval + 1.96 * d$condsd, d$condval - 1.96 * d$condsd), yaxt = "n", pch = 16, xlab = "Conditional mode", ylab = "", main = k)
      segments(d$condval - 1.96 * d$condsd, seq_len(nrow(d)), d$condval + 1.96 * d$condsd, seq_len(nrow(d)))
      axis(2, at = seq_len(nrow(d)), labels = as.character(d$grp), las = 1, cex.axis = 0.7)
      abline(v = 0, lty = 2)
    }
    dev.off()
  } else fail(paste("unknown kind:", kind))
  emit(list(ok = TRUE, summary = sprintf("%s plot written", kind), metrics = list(n_obs = nrow(fr)), manualRoute = switch(kind, residuals = "plot(fit); qqnorm(resid(fit))", fit_by_group = "lattice::xyplot(Reaction ~ Days | Subject, data = d, type = c(\"p\", \"r\"))", random_effects = "lattice::dotplot(ranef(fit, condVar = TRUE))")))
})
