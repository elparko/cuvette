cat(R.version.string, "\n")
conc <- c(0.5, 1, 3, 6)
area <- c(89667.793812, 184858.171138, 467600.286834, 960534.285710)
cat("\n## Areas from hplc-py 0.2.10 on the four lactose calibration traces\n")
print(data.frame(conc, area))

cat("\n## lm(area ~ conc), an intercept, no weighting\n")
m <- lm(area ~ conc)
print(summary(m))
cat(sprintf("slope %.10g intercept %.10g r_squared %.10g residual_se %.10g\n",
  coef(m)[2], coef(m)[1], summary(m)$r.squared, summary(m)$sigma))
cat(sprintf("LOD (3.3 x residual se / slope) %.10g  LOQ (10 x) %.10g\n",
  3.3 * summary(m)$sigma / coef(m)[2], 10 * summary(m)$sigma / coef(m)[2]))

cat("\n## lm(area ~ conc + 0), through the origin\n")
m0 <- lm(area ~ conc + 0)
print(sprintf("slope %.10g r_squared %.10g", coef(m0)[1], summary(m0)$r.squared))

cat("\n## Back-calculation of the 2 mM test trace, area 312048.107553 (hplc-py 0.2.10)\n")
a <- 312048.107553
cat(sprintf("with an intercept: %.10g mM\n", (a - coef(m)[1]) / coef(m)[2]))
cat(sprintf("through the origin: %.10g mM\n", a / coef(m0)[1]))
