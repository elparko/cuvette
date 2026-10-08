# Writes data(gse) of the airway package as files that the deseq2 adapter reads.
# Usage: Rscript export_gse.R <output folder>
# The R library must have the packages airway and SummarizedExperiment (GA_R_LIBS or R_LIBS_USER).
out <- commandArgs(trailingOnly = TRUE)[1]
libs <- c(Sys.getenv("GA_R_LIBS"), Sys.getenv("R_LIBS_USER"), "/Volumes/T7/guided-analysis/tools/R-airway", "/Volumes/T7/guided-analysis/tools/R-library")
.libPaths(c(libs[nzchar(libs) & dir.exists(libs)], .libPaths()))
suppressPackageStartupMessages({ library(SummarizedExperiment); library(airway) })
dir.create(out, showWarnings = FALSE, recursive = TRUE)

data(gse)
gse$cell <- gse$donor
gse$dex <- gse$condition
levels(gse$dex) <- c("untrt", "trt")
saveRDS(gse, file.path(out, "airway_gse.rds"))

write_matrix <- function(m, file) {
  df <- data.frame(gene_id = rownames(m), m, check.names = FALSE)
  write.csv(df, file.path(out, file), row.names = FALSE)
}
write_matrix(assay(gse, "counts"), "gse_counts.csv")
write_matrix(assay(gse, "length"), "gse_length.csv")
cd <- as.data.frame(colData(gse))
write.csv(data.frame(sample = colnames(gse), cd[, c("donor", "condition", "cell", "dex")]), file.path(out, "gse_coldata.csv"), row.names = FALSE)

back <- as.matrix(read.csv(file.path(out, "gse_length.csv"), row.names = 1, check.names = FALSE))
cat("airway", as.character(packageVersion("airway")), "genes", nrow(gse), "samples", ncol(gse), "\n")
cat("largest relative change of a length after the CSV round trip:", max(abs(back / assay(gse, "length") - 1)), "\n")
