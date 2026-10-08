d <- Sys.getenv("GA_DATA", "/Volumes/T7/guided-analysis/data")
x <- read.csv(file.path(d, "sriphoosanaphan2021-vitd-hcv", "vitd_hcv.csv"))
x$arm <- factor(x$arm, levels = c("vitamin_d", "placebo"))
cat("patients", nrow(x), "vitamin D", sum(x$arm == "vitamin_d"), "placebo", sum(x$arm == "placebo"), "\n")

for (m in c("VD", "AST", "ALT", "TGF", "TIMP", "MMP", "P3NP")) {
  change <- x[[paste0(m, "6")]] - x[[paste0(m, "0")]]
  s <- t.test(change ~ arm, data = x, var.equal = TRUE)
  w <- t.test(change ~ arm, data = x, var.equal = FALSE)
  cat(sprintf("%-5s change, vitamin D minus placebo: %.4f  Student CI %.4f to %.4f  p %.5f  t %.4f | Welch CI %.4f to %.4f  p %.5f\n",
              m, -diff(s$estimate), s$conf.int[1], s$conf.int[2], s$p.value, s$statistic, w$conf.int[1], w$conf.int[2], w$p.value))
}

w6 <- t.test(MMP6 ~ arm, data = x, var.equal = TRUE)
cat(sprintf("MMP6 at week 6 only (wrong method): %.4f  p %.5f\n", -diff(w6$estimate), w6$p.value))
