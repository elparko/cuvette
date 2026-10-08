# Makes the small test inputs of the deseq2 adapter and prints the expected numbers.
# Usage: Rscript make_fixtures.R <adapter data folder>
# Needs the R packages DESeq2, tximport, rhdf5 and airway (for the gse subset).
# The transcript files are synthetic. The gse subset comes from the airway package (LGPL).
out <- commandArgs(trailingOnly = TRUE)[1]
libs <- c(Sys.getenv("GA_R_LIBS"), Sys.getenv("R_LIBS_USER"), "/Volumes/T7/guided-analysis/tools/R-airway", "/Volumes/T7/guided-analysis/tools/R-library")
.libPaths(c(libs[nzchar(libs) & dir.exists(libs)], .libPaths()))
suppressPackageStartupMessages({ library(DESeq2); library(tximport); library(airway) })

set.seed(20261008)
n_genes <- 120
n_tx <- sample(1:3, n_genes, replace = TRUE)
gene <- rep(sprintf("GENE%03d", seq_len(n_genes)), n_tx)
tx <- sprintf("TX%04d", seq_along(gene))
tx_len <- round(runif(length(tx), 600, 6000))
samples <- sprintf("s%d", 1:6)
cd <- data.frame(sample = samples, donor = rep(c("d1", "d2", "d3"), each = 2), condition = rep(c("ctrl", "trt"), 3))
gene_mean <- exp(rnorm(n_genes, 5.5, 1.5))
de <- sample(n_genes, 30)
fold <- rep(1, n_genes)
fold[de] <- exp(sample(c(-1, 1), 30, replace = TRUE) * runif(30, 0.7, 2))
switchers <- sample(which(n_tx > 1), 15)
donor_effect <- c(d1 = 0.8, d2 = 1, d3 = 1.25)

quant <- lapply(seq_along(samples), function(j) {
  trt <- cd$condition[j] == "trt"
  frac <- ave(runif(length(tx), 0.2, 1), gene, FUN = function(x) x / sum(x))
  if (trt) {
    for (g in sprintf("GENE%03d", switchers)) {
      i <- which(gene == g)
      long <- i[which.max(tx_len[i])]
      frac[i] <- 0.1 / length(i)
      frac[long] <- frac[long] + 0.9
    }
  }
  mu_gene <- gene_mean * (if (trt) fold else 1) * donor_effect[[cd$donor[j]]]
  idx <- match(gene, sprintf("GENE%03d", seq_len(n_genes)))
  eff <- pmax(tx_len - round(rnorm(length(tx), 210, 5)), 50)
  mu <- mu_gene[idx] * frac * eff / 1000
  reads <- rnbinom(length(tx), mu = mu, size = 20)
  multi <- n_tx[idx] > 1 & reads > 0
  reads <- as.numeric(reads)
  reads[multi] <- reads[multi] + round(runif(sum(multi), -0.5, 0.5), 3)
  reads[reads < 0] <- 0
  tpm <- 1e6 * (reads / eff) / sum(reads / eff)
  data.frame(tx = tx, gene = gene, len = tx_len, eff = eff, reads = reads, tpm = tpm)
})

w <- function(df, file) {
  dir.create(dirname(file), showWarnings = FALSE, recursive = TRUE)
  write.table(df, file, sep = "\t", quote = FALSE, row.names = FALSE)
}
for (j in seq_along(samples)) {
  q <- quant[[j]]
  s <- samples[j]
  w(data.frame(Name = paste0(q$tx, ".1"), Length = q$len, EffectiveLength = q$eff, TPM = q$tpm, NumReads = q$reads), file.path(out, "tx", "salmon", s, "quant.sf"))
  w(data.frame(target_id = q$tx, length = q$len, eff_length = q$eff, est_counts = q$reads, tpm = q$tpm), file.path(out, "tx", "kallisto", s, "abundance.tsv"))
  w(data.frame(transcript_id = q$tx, gene_id = q$gene, length = q$len, effective_length = q$eff, expected_count = q$reads, TPM = q$tpm, FPKM = 0, IsoPct = 0), file.path(out, "tx", "rsem", paste0(s, ".isoforms.results")))
  h5 <- file.path(out, "tx", "kallisto_h5", s, "abundance.h5")
  dir.create(dirname(h5), showWarnings = FALSE, recursive = TRUE)
  if (file.exists(h5)) file.remove(h5)
  rhdf5::h5createFile(h5)
  rhdf5::h5createGroup(h5, "aux")
  rhdf5::h5write(q$reads, h5, "est_counts")
  rhdf5::h5write(q$tx, h5, "aux/ids")
  rhdf5::h5write(as.numeric(q$eff), h5, "aux/eff_lengths")
  rhdf5::h5write(as.numeric(q$len), h5, "aux/lengths")
}
tx2gene <- data.frame(tx_id = tx, gene_id = gene)
write.csv(tx2gene, file.path(out, "tx", "tx2gene.csv"), row.names = FALSE)
write.csv(cd, file.path(out, "tx", "coldata.csv"), row.names = FALSE)

files <- setNames(file.path(out, "tx", "salmon", samples, "quant.sf"), samples)
txi <- suppressMessages(tximport(files, type = "salmon", tx2gene = tx2gene, ignoreTxVersion = TRUE))
wm <- function(m, file) write.csv(data.frame(gene_id = rownames(m), m, check.names = FALSE), file.path(out, "tx", file), row.names = FALSE)
wm(txi$counts, "gene_counts.csv")
wm(txi$length, "gene_length.csv")
wm(round(txi$counts), "gene_counts_rounded.csv")
rc <- round(txi$counts)
fc <- file.path(out, "tx", "featurecounts.txt")
writeLines("# Program:featureCounts v2.0.6; Command:\"featureCounts\" (synthetic test file)", fc)
fc_df <- data.frame(Geneid = rownames(rc), Chr = "chr1", Start = seq_len(nrow(rc)) * 1000, End = seq_len(nrow(rc)) * 1000 + 500, Strand = "+", Length = 501, check.names = FALSE)
fc_df[paste0("/data/bam/", samples, ".sorted.bam")] <- rc
suppressWarnings(write.table(fc_df, fc, sep = "\t", quote = FALSE, row.names = FALSE, append = TRUE))
for (j in seq_along(samples)) {
  hf <- file.path(out, "tx", "htseq", paste0(samples[j], ".counts.txt"))
  dir.create(dirname(hf), showWarnings = FALSE, recursive = TRUE)
  ht <- rbind(data.frame(g = rownames(rc), n = rc[, j]), data.frame(g = c("__no_feature", "__ambiguous"), n = c(500, 20)))
  write.table(ht, hf, sep = "\t", quote = FALSE, row.names = FALSE, col.names = FALSE)
}
for (j in seq_along(samples)) {
  w(data.frame(gene_id = rownames(txi$counts), `transcript_id(s)` = "", length = 0, effective_length = txi$length[, j], expected_count = txi$counts[, j], TPM = txi$abundance[, j], FPKM = 0, check.names = FALSE), file.path(out, "tx", "rsem_genes", paste0(samples[j], ".genes.results")))
}

rownames(cd) <- cd$sample
cd$donor <- factor(cd$donor)
cd$condition <- relevel(factor(cd$condition), "ctrl")
report <- function(label, dds) {
  dds <- dds[rowSums(counts(dds) >= 10) >= 3, ]
  dds <- suppressMessages(DESeq(dds, quiet = TRUE))
  res <- results(dds, contrast = c("condition", "trt", "ctrl"), alpha = 0.1)
  sig <- !is.na(res$padj) & res$padj < 0.1
  cat(sprintf("%-40s tested %d  sig %d  up %d  down %d\n", label, nrow(dds), sum(sig), sum(sig & res$log2FoldChange > 0), sum(sig & res$log2FoldChange < 0)))
}
report("tximport salmon, with lengths", DESeqDataSetFromTximport(txi, cd, ~ donor + condition))
rounded <- round(txi$counts)
mode(rounded) <- "integer"
report("rounded counts, no lengths", DESeqDataSetFromMatrix(rounded, cd, ~ donor + condition))

data(gse)
keep <- rowSums(assay(gse) >= 10) >= 4
pick <- sort(c(sample(which(keep), 600), sample(which(!keep), 150)))
sub <- gse[pick, ]
sub$cell <- sub$donor
sub$dex <- sub$condition
levels(sub$dex) <- c("untrt", "trt")
saveRDS(sub, file.path(out, "gse_subset.rds"))
sub$dex <- relevel(sub$dex, "untrt")
d <- DESeqDataSet(sub, design = ~ cell + dex)
d <- d[rowSums(counts(d) >= 10) >= 4, ]
d <- DESeq(d, quiet = TRUE)
r <- results(d, alpha = 0.1)
sig <- !is.na(r$padj) & r$padj < 0.1
cat(sprintf("%-40s tested %d  sig %d  up %d  down %d\n", "gse subset, DESeqDataSet(se)", nrow(d), sum(sig), sum(sig & r$log2FoldChange > 0), sum(sig & r$log2FoldChange < 0)))
