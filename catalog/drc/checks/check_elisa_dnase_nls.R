# The four-parameter logistic fit of DNase run 1 from the R help page ?DNase (R stats nls with SSfpl, not drc).
# Run: Rscript checks/check_elisa_dnase_nls.R > checks/check_elisa_dnase_nls.out
fm2 <- nls(density ~ SSfpl(log(conc), A, B, xmid, scal), data = DNase, subset = Run == 1)
co <- coef(fm2)
print(summary(fm2)$coefficients)
cat(sprintf("as drc LL.4: b %.6f c %.6f d %.6f e %.6f\n", -1 / co[["scal"]], co[["A"]], co[["B"]], exp(co[["xmid"]])))
cat(sprintf("residual SE %.6f on %d df\n", summary(fm2)$sigma, df.residual(fm2)))
fm1 <- nls(density ~ SSlogis(log(conc), Asym, xmid, scal), data = DNase, subset = Run == 1)
a <- anova(fm1, fm2)
print(a)
cat(sprintf("3PL against 4PL: RSS %.8f and %.8f, F %.6f, p %.6f\n", deviance(fm1), deviance(fm2), a$`F value`[2], a$`Pr(>F)`[2]))
