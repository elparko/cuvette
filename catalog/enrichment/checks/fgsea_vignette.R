suppressMessages(library(fgsea))
data(exampleRanks)
data(examplePathways)
set.seed(42)
res <- fgsea(pathways = examplePathways, stats = exampleRanks, minSize = 15, maxSize = 500)
cat(R.version.string, "fgsea", as.character(packageVersion("fgsea")), "\n")
cat("pathways tested", nrow(res), "\n")
for (p in c("5991851_Mitotic_Prometaphase", "5990980_Cell_Cycle")) {
  r <- res[res$pathway == p, ]
  cat(sprintf("%s ES %.7f size %d leading edge %d NES %.4f pval %.3g\n", p, r$ES, r$size, length(r$leadingEdge[[1]]), r$NES, r$pval))
}
