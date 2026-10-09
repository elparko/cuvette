# Ross-Innes 2012: DiffBind, estrogen receptor binding in tamoxifen-resistant breast cancer cells

## Citation
- Ross-Innes CS, Stark R, Teschendorff AE, et al. Differential oestrogen receptor binding is associated with clinical outcome in breast cancer. Nature 481:389-393 (2012). DOI: 10.1038/nature10730. GEO series GSE32222.
- Program: Stark R, Brown G. DiffBind: differential binding analysis of ChIP-Seq peak data. Bioconductor. The vignette 3.22 (read 2026-10-09 from the installed package) prints the numbers below. The paper text does not print them.

## Data
- DiffBind vignette data: https://content.cruk.cam.ac.uk/bioinformatics/software/DiffBind/DiffBind_vignette_data.tar.gz (561 MB, SHA-256 8d08067509c819d1b0e8df07781045c6ac86d4093db2bd0be62b78e4ec8b1cef). 22 BAM files of chromosome 18 (11 ER ChIP-seq samples and their input controls), 10 peak files and the sample sheet tamoxifen.csv.
- The page states no license. The files are fetched, not redistributed. The reads are from cell lines in a public GEO series. No data of persons.
- Local folder: /Volumes/T7/guided-analysis/data/ross-innes2012-diffbind-tamoxifen/x/DiffBind_Vignette

## Tool
- Original: R package DiffBind: dba, dba.count, dba.contrast, dba.analyze, dba.report. DiffBind 3.22.2, DESeq2 1.52.0, edgeR 4.10.5, R 4.6.1.
- Adapter route: diffbind adapter, tools count_reads_in_peaks and find_differential_peaks.

## Sample design
11 samples: BT474 (resistant, 2), MCF7 (responsive, 3), T47D (responsive, 2), tamoxifen-resistant MCF7 (resistant, 2), ZR75 (responsive, 2). Condition has 4 resistant and 7 responsive samples. Each sample has an input control. The cell line (tissue) is the blocking factor of the benchmark analysis.

## Method steps
1. Merge the peak files into consensus sites (a site in at least 2 samples), re-center on the summit with 200 base pairs on each side (401 base pairs), and count the reads of each sample in each site.
2. Scale each sample by its total number of reads in the BAM file (full library size).
3. DESeq2 with the local dispersion fit, Wald test, FDR 0.05. Benchmark analysis: design ~ Tissue + Condition. Comparison: design ~ Condition.

## Numbers to reproduce
| Quantity | DiffBind vignette 3.22 | check.out (DESeq2 called directly) |
|---|---|---|
| Consensus sites | 2845 | the same counts file |
| Differential peaks, design ~ Tissue + Condition | 783 | 783 (188 gain, 595 lose) |
| Differential peaks, design ~ Condition | 246 | 246 (64 gain, 182 lose) |
| Differential peaks, MCF7 against T47D, condition as blocking factor | 1470 | 1470 (not an item) |
| edgeR, design ~ Tissue + Condition | 819 | 820 (quasi-likelihood test, not an item) |
