# Test data sources

| File | Source | License |
| --- | --- | --- |
| tamoxifen_counts.csv | R package DiffBind 3.22.2, data set `tamoxifen_counts`: the read counts in 2845 consensus sites (chromosome 18) of 11 estrogen receptor ChIP-seq samples of breast cancer cell lines (Ross-Innes CS et al. 2012, Nature 481: 389-393, DOI 10.1038/nature10730; GEO GSE32222). The `Reads` column of each sample, without control subtraction. Written by data/make_fixtures.R. Cell line data, no data of persons. | GPL-3, the license of DiffBind |
| tamoxifen_samples.csv | The same data set: the sample table with the tissue, the condition and the library size (the number of reads in the full BAM file) of each sample. Written by data/make_fixtures.R. | GPL-3, the license of DiffBind |
| tamoxifen_scores_decimals.csv | The first 60 sites of the same data set with the normalized scores of DiffBind, which have decimals. Made for the test of the decimals error. Written by data/make_fixtures.R. | GPL-3, the license of DiffBind |
| vignette/ | Not in the repository. data/fetch.sh downloads the DiffBind vignette data (561 MB: chromosome 18 BAM files, peak files and the sample sheet) from https://content.cruk.cam.ac.uk/bioinformatics/software/DiffBind/DiffBind_vignette_data.tar.gz, checks its SHA-256 sum, extracts it to ~/.cuvette/cache/data/diffbind-vignette (or $GA_DIFFBIND_DATA) and links it here. | The vignette data page states no license, so the repository does not redistribute the files. The reads come from GEO GSE32222 (public, cell lines). |
