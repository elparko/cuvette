.libPaths(c(Sys.getenv("CUVETTE_R_LIBS", file.path(Sys.getenv("HOME"), ".cuvette", "R-library")), .libPaths()))
suppressMessages(library(DiffBind))
here <- commandArgs(trailingOnly = TRUE)[1]
data(tamoxifen_counts)
info <- dba.show(tamoxifen)
reads <- sapply(tamoxifen$peaks, function(p) p$Reads)
colnames(reads) <- info$ID
pk <- tamoxifen$peaks[[1]]
counts <- data.frame(peak_id = sprintf("%s:%d-%d", pk$Chr, pk$Start, pk$End), chr = pk$Chr, start = pk$Start, end = pk$End, reads, check.names = FALSE)
write.csv(counts, file.path(here, "tamoxifen_counts.csv"), row.names = FALSE)
samples <- data.frame(sample = info$ID, tissue = info$Tissue, condition = info$Condition, treatment = info$Treatment, replicate = info$Replicate, library_size = info$Reads, frip = info$FRiP)
write.csv(samples, file.path(here, "tamoxifen_samples.csv"), row.names = FALSE)
sc <- dba.peakset(tamoxifen, bRetrieve = TRUE, DataType = DBA_DATA_FRAME)
scores <- data.frame(peak_id = sprintf("%s:%d-%d", sc[[1]], sc[[2]], sc[[3]]), chr = sc[[1]], start = sc[[2]], end = sc[[3]], sc[, -(1:3)], check.names = FALSE)
write.csv(head(scores, 60), file.path(here, "tamoxifen_scores_decimals.csv"), row.names = FALSE)
