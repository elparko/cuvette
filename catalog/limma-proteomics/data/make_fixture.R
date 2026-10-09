args <- commandArgs(TRUE)
mode <- args[1]
if (mode == "pxd000279") {
  pg <- read.delim(args[2], check.names = FALSE, stringsAsFactors = FALSE, quote = "")
  first <- function(x) sub(";.*$", "", x)
  hf <- sub(";>.*$", "", pg$`Fasta headers`)
  out <- data.frame(
    `Protein IDs` = first(pg$`Protein IDs`),
    `Gene names` = first(pg$`Gene names`),
    `Fasta headers` = substr(hf, 1, 120),
    `Only identified by site` = pg$`Only identified by site`,
    Reverse = pg$Reverse,
    Contaminant = pg$Contaminant,
    pg[, grep("^LFQ intensity", names(pg))],
    check.names = FALSE, stringsAsFactors = FALSE)
  write.table(out, args[3], sep = "\t", quote = FALSE, row.names = FALSE, na = "")
} else if (mode == "bovine") {
  pg <- read.table(args[2], header = TRUE, sep = "\t", quote = "", check.names = FALSE, comment.char = "")
  keep <- c("Protein IDs", "Peptides", "Only identified by site", "Reverse", "Potential contaminant", grep("^LFQ intensity", names(pg), value = TRUE))
  write.table(pg[, keep], args[3], sep = "\t", quote = FALSE, row.names = FALSE, na = "")
}
