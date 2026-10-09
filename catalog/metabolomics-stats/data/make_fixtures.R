.libPaths(c("/Volumes/T7/guided-analysis/tools/R-library", .libPaths()))
suppressMessages(library(ropls))
here <- commandArgs(trailingOnly = TRUE)[1]
data(sacurine)
meta <- sacurine$sampleMetadata
x <- sacurine$dataMatrix
write.csv(data.frame(sample = rownames(x), gender = as.character(meta$gender), age = meta$age, bmi = meta$bmi, x, check.names = FALSE), file.path(here, "sacurine.csv"), row.names = FALSE)
write.csv(data.frame(sample = rownames(x), gender = as.character(meta$gender), age = meta$age, bmi = meta$bmi, 10^x, check.names = FALSE), file.path(here, "sacurine_linear.csv"), row.names = FALSE)
tiny <- data.frame(
  sample = paste0("s", 1:6),
  group = c("A", "A", "A", "B", "B", "B"),
  m1 = c(100, 120, 90, 200, 180, 220),
  m2 = c(50, 60, 45, 110, 100, 120),
  m3 = c(20, 26, 16, 40, 38, 44),
  m4 = c(10, 14, 9, 22, 18, 24),
  m5 = c(0, 8, 6, 12, NA, 14)
)
write.csv(tiny, file.path(here, "tiny_table.csv"), row.names = FALSE, na = "")
tiny$group <- c("A", "A", "B", "B", "C", "C")
write.csv(tiny[, names(tiny) != "m5"], file.path(here, "tiny_three_groups.csv"), row.names = FALSE, na = "")
