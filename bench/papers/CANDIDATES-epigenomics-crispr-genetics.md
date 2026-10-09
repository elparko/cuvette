# Paper candidates: CRISPR screens, epigenomics, human genetics

Rules: peer-reviewed paper or package paper with a DOI. Public input data with an open license. Human genetic data are public summary statistics or counts, with no data of persons and no access control. The source prints the target numbers. An independent check reproduces them. One run takes about 15 minutes or less on a Mac. The search found few research papers since 2018 that print numbers and deposit a count table. The shortlist therefore also holds tool papers with a tutorial that prints the numbers, as the DESeq2 and bedtools cases do.

Status: searched on 2026-10-09. The section "Outcome" at the end lists what was built and what was rejected.

## Shortlist

### 1. MAGeCK, leukemia screen of KBM7 and HL-60 cells (CRISPR)
- Citation: Li W et al. MAGeCK enables robust identification of essential genes from genome-scale CRISPR/Cas9 knockout screens. Genome Biol 15:554 (2014). Data: Wang T et al. Science 343:80-84 (2014).
- DOI: 10.1186/s13059-014-0554-4
- Data: Additional file 4 (xlsx, 12 MB) of the paper: 73,151 sgRNAs of 7,115 genes in four samples. Open access, CC BY.
- Numbers printed in the paper: 7,115 genes ranked; 23 positively selected genes; MAP4K3 rank 9 and EPM2A rank 10 (FDR 0.14); IGF1R rank 1, BCR rank 7, ABL1 rank 18 in the KBM7 against HL-60 comparison.
- Adapter: mageck (test_screen, fit_screen_model).
- Run time: 3 minutes for the rank test, 7 minutes for the beta score model on all genes.

### 2. MAGeCK documentation, beta scores of the leukemia screen (CRISPR)
- Source: the MAGeCK demo page, demo 4 (mageck mle with the design matrix baseline, HL60, KBM7), on the table of candidate 1.
- Numbers printed: beta score and z score of RNF14, RNF10 and RNF11 for HL60 and KBM7.
- Adapter: mageck (fit_screen_model).

### 3. MAGeCKFlute protocol (CRISPR)
- Citation: Wang B et al. Integrative analysis of pooled CRISPR genetic screens using MAGeCKFlute. Nat Protoc 14:756-780 (2019). DOI: 10.1038/s41596-018-0113-7.
- Data: the test data of the package are result files, not count tables.

### 4. DiffBind vignette, estrogen receptor binding in tamoxifen-resistant breast cancer cells (epigenomics)
- Citation: Ross-Innes CS et al. Differential oestrogen receptor binding is associated with clinical outcome in breast cancer. Nature 481:389-393 (2012). DOI: 10.1038/nature10730. Program: Stark R, Brown G. DiffBind, Bioconductor.
- Data: GEO GSE32222 and the vignette data (11 samples, 2,845 sites on chromosome 18; the package ships the count object).
- Numbers printed in the vignette (DiffBind 3.22): 11 samples, 2,845 sites, 4 resistant and 7 responsive samples, 246 sites with FDR 0.05 or less with DESeq2.
- Adapter: planned, DiffBind (count peaks, find differential sites).

### 5. Gontarz 2020, ATAC-seq differential accessibility methods (epigenomics)
- Citation: Gontarz P et al. Comparison of differential accessibility analysis strategies for ATAC-seq data. Sci Rep 10:10150 (2020). DOI: 10.1038/s41598-020-66998-4.
- Data: GEO GSE131144 (rat hippocampus). Numbers printed: 2,106 and 2,117 regions with edgeR after RUVSeq.

### 6. Tsao 2022, Batf in CD8 T cells, ATAC-seq (epigenomics)
- Citation: Tsao HW et al. Batf-mediated epigenetic control of effector CD8+ T cell differentiation. Sci Immunol 7:eabi4919 (2022). DOI: 10.1126/sciimmunol.abi4919.
- Source of numbers: the NBIS epigenomics workshop tutorial on the count matrix of the paper.

### 7. MendelianRandomization package, LDL cholesterol and coronary heart disease (human genetics)
- Citation: Yavorska OO, Burgess S. MendelianRandomization: an R package for performing Mendelian randomization analyses using summarized data. Int J Epidemiol 46:1734-1739 (2017). DOI: 10.1093/ije/dyx034.
- Data: 28 variants of the package (Waterworth et al. 2010), published summary statistics. GPL-2 or GPL-3.
- Numbers printed in the package vignette: inverse-variance weighted estimate, standard error, interval, Cochran Q, I-squared, F statistic, MR-Egger, median, mode and maximum likelihood estimates. A second data set has 6 correlated variants (calcium and fasting glucose; Burgess et al. 2015, DOI 10.1007/s10654-015-0011-z).
- Adapter: mendelianrandomization (estimate_causal_effect, check_variants).
- Run time: 10 seconds.

### 8. PLINK 2 association test on a small public data set (human genetics)
- Source: 1000 Genomes genotypes with a simulated trait, or the PLINK tutorial files.
- Problem: no peer-reviewed paper prints numbers for a small public data set. The expected values would come from our own simulation. PLINK 2 is also not installed.

### 9. TwoSampleMR with IEU OpenGWAS (human genetics)
- Source: Hemani G et al. The MR-Base platform supports systematic causal inference across the human phenome. eLife 7:e34408 (2018). DOI: 10.7554/eLife.34408.
- Problem: the OpenGWAS API needs a token since 2024. A run cannot start from a clean account.

## Outcome

Built on 2026-10-09:

- mendelianrandomization (candidate 7): the vignette values reproduce to the printed digits with package 0.10.0, and a NumPy script reproduces the inverse-variance estimate, Q, the Egger fit and the medians. Blind benchmark paper yavorska2017-mendelianrandomization.
- mageck (candidates 1 and 2): see the sections added with the benchmark papers.

Rejected, with the reason:

- Candidate 1, the rank statements of the paper: the current MAGeCK 0.5.9.5 does not reproduce them. MAP4K3 is at rank 17 and EPM2A at rank 18 with an FDR of 0.095, not 9 and 10 with 0.14. The paper used MAGeCK 0.2 and a comparison between the two cell lines that the test command does not run. The count table is a usable input for candidate 2. The supplement also has a data fault: Excel changed 120 gene symbols (SEPT and MARCH families) to dates. The mageck tools refuse such a table.
- Candidate 3: the package data are result files. A run cannot start from counts.
- Candidate 5: the GEO series holds only a 6.3 GB raw tar and no count matrix. A run takes hours.
- Candidate 6: the tutorial prints no count of differential peaks.
- Candidate 8: no source prints numbers that we did not make ourselves.
- Candidate 9: needs a token.
