.libPaths(c(Sys.getenv("CUVETTE_R_LIBS", file.path(Sys.getenv("HOME"), ".cuvette", "R-library")), .libPaths()))
suppressMessages({ library(PropCIs); library(ratesci) })
cat("PropCIs", as.character(packageVersion("PropCIs")), "ratesci", as.character(packageVersion("ratesci")), "\n")
for (cc in list(c(56, 70, 48, 80), c(71, 152, 84, 150), c(30, 200, 36, 200))) {
  x1 <- cc[1]; n1 <- cc[2]; x0 <- cc[3]; n0 <- cc[4]
  mee <- diffscoreci(x1, n1, x0, n0, conf.level = 0.95)$conf.int
  mn <- scoreci(x1 = x1, n1 = n1, x2 = x0, n2 = n0, distrib = "bin", contrast = "RD", skew = FALSE, level = 0.95, bcf = TRUE)$estimates
  cat(sprintf("%d/%d against %d/%d\n  Mee score (PropCIs diffscoreci, no N/(N-1) factor): %.6f %.6f\n  Miettinen-Nurminen (ratesci scoreci, skew = FALSE, bcf = TRUE): %.6f %.6f\n", x1, n1, x0, n0, mee[1], mee[2], mn[1, "lower"], mn[1, "upper"]))
}
