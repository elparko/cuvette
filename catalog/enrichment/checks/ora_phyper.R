args <- commandArgs(trailingOnly = FALSE)
here <- dirname(normalizePath(sub("^--file=", "", args[grep("^--file=", args)])))
d <- file.path(here, "..", "data")
rnk <- read.delim(file.path(d, "fgsea_exampleRanks.rnk"), header = FALSE, colClasses = c("character", "numeric"))
lines <- readLines(file.path(d, "fgsea_examplePathways.gmt"))
sets <- lapply(strsplit(lines, "\t"), function(x) x[-(1:2)])
names(sets) <- vapply(strsplit(lines, "\t"), `[`, "", 1)
annotated <- unique(unlist(sets))
query <- rnk$V1[rnk$V2 > 15]
cat(R.version.string, "\n")
cat("list: genes with score > 15:", length(query), "\n")
for (bgname in c("measured genes in the gene sets", "measured genes")) {
  universe <- if (bgname == "measured genes") rnk$V1 else intersect(rnk$V1, annotated)
  q <- intersect(query, universe)
  res <- do.call(rbind, lapply(names(sets), function(n) {
    s <- intersect(sets[[n]], universe)
    if (length(s) < 15 || length(s) > 500) return(NULL)
    x <- length(intersect(q, s))
    data.frame(term = n, overlap = x, set_size = length(s), p = phyper(x - 1, length(s), length(universe) - length(s), length(q), lower.tail = FALSE))
  }))
  tested <- nrow(res)
  res <- res[res$overlap > 0, ]
  res$padj <- p.adjust(res$p, method = "BH")
  res <- res[order(res$p, res$term), ]
  cat("\nbackground:", bgname, "size", length(universe), "list in background", length(q), "sets tested", tested, "with overlap", nrow(res), "\n")
  cat("BH over the sets with an overlap of 1 or more (the gseapy rule)\n")
  for (i in 1:3) cat(sprintf("%s overlap %d/%d p %.6g padj %.6g\n", res$term[i], res$overlap[i], res$set_size[i], res$p[i], res$padj[i]))
  cat(sprintf("Fisher exact one-sided check, top set: p %.6g\n",
    fisher.test(matrix(c(res$overlap[1], length(q) - res$overlap[1], res$set_size[1] - res$overlap[1],
      length(universe) - length(q) - res$set_size[1] + res$overlap[1]), 2), alternative = "greater")$p.value))
}

cat("\n## The Enrichr rule: a background of 20000 genes, no size limit\n")
q <- intersect(query, rnk$V1)
res <- do.call(rbind, lapply(names(sets), function(n) {
  s <- unique(sets[[n]])
  x <- length(intersect(q, s))
  if (x < 1) return(NULL)
  data.frame(term = n, overlap = x, set_size = length(s),
             p = phyper(x - 1, length(s), 20000 - length(s), length(q), lower.tail = FALSE),
             odds = x * (20000 - length(s) - length(q) + x) / max((length(s) - x) * (length(q) - x), 1))
}))
res$padj <- p.adjust(res$p, method = "BH")
res <- res[order(res$p, res$term), ]
cat("list", length(q), "terms with an overlap", nrow(res), "\n")
for (i in 1:3) cat(sprintf("%s overlap %d/%d p %.10g padj %.10g odds %.10g\n",
  res$term[i], res$overlap[i], res$set_size[i], res$p[i], res$padj[i], res$odds[i]))
