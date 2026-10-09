args <- commandArgs(TRUE)
suppressMessages({library(flowCore); library(lme4)})
files <- list.files(args[1], pattern = "fcs$", full.names = TRUE)
tab <- do.call(rbind, lapply(files, function(f) {
  e <- exprs(read.FCS(f, transformation = FALSE, truncate_max_range = FALSE))
  data.frame(sample = sub("\\.fcs$", "", basename(f)), pop = e[, "population_id"])
}))
cnt <- table(tab$pop, tab$sample)
md <- data.frame(sample = colnames(cnt), condition = factor(ifelse(grepl("BCR-XL", colnames(cnt)), "BCR-XL", "Reference"), levels = c("Reference", "BCR-XL")), patient = sub("PBMC8_30min_(patient[0-9]).*", "\\1", colnames(cnt)))
tot <- colSums(cnt)
for (paired in c(TRUE, FALSE)) {
  cat(if (paired) "binomial GLMM with (1|patient) + (1|sample)\n" else "binomial GLMM with (1|sample)\n")
  p <- sapply(1:8, function(k) {
    d <- data.frame(md, y = cnt[k, md$sample], n = tot[md$sample])
    fml <- if (paired) cbind(y, n - y) ~ condition + (1 | patient) + (1 | sample) else cbind(y, n - y) ~ condition + (1 | sample)
    summary(glmer(fml, data = d, family = binomial))$coefficients[2, 4]
  })
  padj <- p.adjust(p, "BH")
  for (k in 1:8) cat(sprintf("population %d p %.4g p_adj %.4g\n", k, p[k], padj[k]))
  cat(sprintf("significant at 0.05: %d\n", sum(padj <= 0.05)))
}
