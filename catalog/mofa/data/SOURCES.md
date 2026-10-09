# Test data sources

All files come from the Bioconductor package MOFAdata, files data/CLL_data.RData and data/CLL_covariates.RData (github.com/bioFAM/MOFAdata). The data come from Dietrich S, et al. (2018), Journal of Clinical Investigation 128(1): 427-445, DOI 10.1172/JCI93801, and Argelaguet R, et al. (2018), Molecular Systems Biology 14: e8124, DOI 10.15252/msb.20178124. data/fetch.sh downloads the two RData files, checks the SHA-256 sums, and writes one CSV file for each view with Rscript. The CSV files are not in the repository.

| File | Source | License |
| --- | --- | --- |
| data/cll/drugs.csv | MOFAdata CLL_data, view Drugs (310 drug response values for 200 patients). | LGPL-3, the license of MOFAdata |
| data/cll/methylation.csv | MOFAdata CLL_data, view Methylation (4248 CpG sites). | LGPL-3, the license of MOFAdata |
| data/cll/mrna.csv | MOFAdata CLL_data, view mRNA (5000 genes). | LGPL-3, the license of MOFAdata |
| data/cll/mutations.csv | MOFAdata CLL_data, view Mutations (69 features, with IGHV and trisomy12). | LGPL-3, the license of MOFAdata |
| data/cll/covariates.csv | MOFAdata CLL_covariates (gender and diagnosis). | LGPL-3, the license of MOFAdata |
