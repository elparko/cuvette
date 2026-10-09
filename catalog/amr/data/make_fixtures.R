here <- dirname(sub("^--file=", "", grep("^--file=", commandArgs(FALSE), value = TRUE)[1]))
long <- function(organism, drug, mic) data.frame(organism = organism, drug = drug, mic = mic)
w <- function(name, d) write.csv(d, file.path(here, name), row.names = FALSE, quote = FALSE)

w("amr_test_eucast2023.csv", long("Escherichia coli", "ertapenem", c(0.256, 0.5, 1, 2)))
w("amr_test_eucast2020.csv", rbind(
  long("Streptococcus pneumoniae", "ampicillin", c(0.125, 0.5, 1, 2, 4)),
  long("Escherichia coli", "ampicillin", c(2, 32))))
w("amr_test_clsi2019.csv", long("Streptococcus pneumoniae", "amoxicillin", c(1, 2, 4, 8, 16)))
w("amr_test_clsi2024.csv", rbind(
  long("Enterococcus faecium", "daptomycin", 2^(-2:4)),
  long("Enterococcus faecium", "ciprofloxacin", 2^(-2:2))))
w("amr_test_eucast2022_amc.csv", long("Escherichia coli", "amoxicillin/clavulanic acid", 2^(-4:6)))
