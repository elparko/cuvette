# Proprietary programs and open-source alternatives

This map lists the proprietary programs that wet labs and clinical research groups use most.
For each program, it gives the open-source alternatives, the Cuvette adapter that runs one of
them today, and the gap.

Checked on 2026-10-08. The licenses come from the repository, PyPI, CRAN or Bioconductor page
of each package. The sources are at the end.

## How to read the table

- License: "commercial" is a paid license. "Free, closed" is a free download with closed source
  code. A free, closed program is not open source.
- Usage: the shares of statistics programs come from one count of 40,582 PubMed Central papers
  from 2016 to 2021 that name a statistics program [Q]. Other usage notes come from vendor pages
  and general knowledge. They are not counts.
- Cuvette adapter: the folder in `catalog/` that runs an alternative today. "none" means that no
  adapter runs it.
- Gap:
  - "covered": an adapter does the usual work.
  - "partial": an adapter does a part of the usual work. The cell says what is missing.
  - "in progress by another agent": another agent builds this part in parallel.
  - "this work": this work adds an adapter or tools for it. See "What this work builds".
  - "open": no adapter, and no plan yet.

## Statistics and general analysis

| Proprietary program | Vendor, license | Use in the lab | Open-source alternatives (license) | Cuvette adapter | Gap |
| --- | --- | --- | --- | --- | --- |
| GraphPad Prism | GraphPad (Dotmatics), commercial | Bar and scatter graphs, t-tests, one-way and two-way ANOVA with post hoc tests, nonparametric tests, dose-response fits. Third most named statistics program in papers (17.4%) [Q]. | R with ggplot2 (GPL-2 or GPL-3; MIT); statsmodels (BSD-3); pingouin (GPL-3); SciPy (BSD-3); jamovi (AGPL-3, GUI); JASP (AGPL-3, GUI) | `biostats`, `tables` | Partial. t-tests, one-way ANOVA, mixed models and survival are covered. Two-way ANOVA, repeated-measures ANOVA, Kruskal-Wallis with Dunn, Friedman and exact rank tests: this work. Dose-response, IC50 and 4PL fits: in progress by another agent. |
| IBM SPSS Statistics | IBM, commercial | Menu-driven statistics for clinical and survey studies. Most named statistics program in papers (40.5%) [Q]. | PSPP (GPL-3, GUI clone); jamovi (AGPL-3); JASP (AGPL-3); statsmodels (BSD-3) | `biostats` | Partial. Repeated-measures ANOVA and rank tests: this work. Logistic regression, chi-square, Fisher and McNemar tests: in progress by another agent. |
| SAS | SAS Institute, commercial | Clinical trials, epidemiology, regulatory submissions. 9.0% of papers [Q]. | R with survival (LGPL-2 or later); survRM2 (GPL-3); statsmodels (BSD-3); lifelines (MIT) | `biostats`, `lme4`, `trial-endpoints` | Partial. `trial-endpoints` covers the PROC FREQ risk difference, Mantel-Haenszel and non-inferiority work and the PROC PHREG and restricted mean survival time work. Survival and mixed models are covered. Logistic regression and power analysis: in progress by another agent. Regulatory output formats (CDISC) are open. |
| Stata | StataCorp, commercial | Epidemiology and regression. 8.3% of papers [Q]. | R (GPL-2 or GPL-3); epitools (GPL-2 or later); statsmodels (BSD-3) | `biostats`, `epi-rates`, `trial-endpoints` | Partial. `epi-rates` covers the `ir`, `cs` and `dstdize` style work: exact rates, rate ratios and standardization. Logistic regression and meta-analysis: in progress by another agent. |
| OpenEpi | Emory University (Dean AG, Sullivan KM, Soe MM), free web tool | Rates, 2 by 2 tables, stratified tables and standardized rates. | epitools (GPL-2 or later); base R | `epi-rates` | This work: exact rate intervals, rate ratio, risk measures, attributable fractions, number needed to treat, direct and indirect standardization. Sample size and the web tool stay open. |
| JMP | JMP Statistical Discovery (SAS), commercial | Design of experiments, exploratory statistics. 1.5% of papers [Q]. | R (GPL-2 or GPL-3); jamovi (AGPL-3); JASP (AGPL-3) | `biostats`, `tables` | Open for design of experiments. |
| MATLAB | MathWorks, commercial | Custom analysis scripts for signals and images. 7.3% of papers [Q]. | GNU Octave (GPL-3); SciPy (BSD-3); scikit-image (BSD-3) | `scikit-image`, `mne` | Partial. No Octave adapter. The `run_script` tool runs Python. |
| Excel Solver and Analysis ToolPak | Microsoft, commercial | Quick t-tests, regression, curve fits by Solver. Excel is in 6.6% of papers [Q]. | LibreOffice Calc Solver (MPL-2.0); scipy.optimize (BSD-3); statsmodels (BSD-3) | `tables`, `biostats` | Partial. Curve fits: in progress by another agent. |
| G*Power | Heinrich Heine University Düsseldorf, free, closed | A priori power and sample size for grants and ethics boards. | pwr (GPL-3 or later); statsmodels.stats.power (BSD-3); pingouin (GPL-3) | none | In progress by another agent. |
| REDCap | Vanderbilt University, free for non-profits under a license, not open source | Electronic data capture. The analysis is done on the export. | REDCapR (MIT); PyCap (MIT); then R or pandas | `tables`, `biostats` (on the CSV export) | Covered for the analysis of a CSV export. No API connection. |
| NVivo | Lumivero, commercial | Qualitative coding of interviews. Not quantitative work. | QualCoder (LGPL-3); Taguette (BSD-3) | none | Not in scope. |

## Plate readers, qPCR and bench assays

| Proprietary program | Vendor, license | Use in the lab | Open-source alternatives (license) | Cuvette adapter | Gap |
| --- | --- | --- | --- | --- | --- |
| SoftMax Pro | Molecular Devices, commercial, comes with SpectraMax readers | ELISA 4PL and 5PL standard curves, kinetics. | drc (GPL-2); dr4pl (GPL-2 or later); plater (GPL-3); SciPy (BSD-3) | none | In progress by another agent. |
| Gen5 | Agilent BioTek, commercial, comes with the reader | Plate kinetics, ELISA, growth curves. | drc (GPL-2); gcplyr (MIT); SciPy (BSD-3) | none | In progress by another agent. |
| CFX Maestro | Bio-Rad, comes with CFX instruments | qPCR Cq, delta-delta Cq, melt curves. | qpcR (GPL-2 or later); pcr (GPL-3); HTqPCR (Artistic-2.0); NormqPCR (LGPL-3) | none | In progress by another agent. |
| QuantStudio Design and Analysis | Thermo Fisher, closed | qPCR analysis. | qpcR, pcr, HTqPCR (as above) | none | In progress by another agent. |
| Seahorse Wave and Seahorse Analytics | Agilent, closed | Oxygen consumption rate (OCR), extracellular acidification rate (ECAR), Mito Stress Test. | ceas (MIT, R); seahtrue (Artistic-2.0, R) | none | Open. |
| Synbiosis ProtoCOL, Interscience Scan | Synbiosis, Interscience, commercial, with the counter hardware | Colony counts on agar plates and clonogenic dishes. | OpenCFU (GPL-3); Fiji Analyze Particles (GPL-3); scikit-image (BSD-3) | `image-assays` | Covered for plate photos: colony counts with a QC overlay, hand-count comparison, plating efficiency and surviving fraction. |

## Gels, blots and electrophoresis

| Proprietary program | Vendor, license | Use in the lab | Open-source alternatives (license) | Cuvette adapter | Gap |
| --- | --- | --- | --- | --- | --- |
| Image Lab | Bio-Rad. Standard edition free, closed. Security edition commercial. | Western blot and gel densitometry on ChemiDoc images. | Fiji Gel Analyzer (GPL-3) | `imagej` | Open. No blot tool yet: no paper with raw blot images that match its printed band values was found (bench/papers/CANDIDATES-wetlab-imaging.md). |
| ImageQuant TL | Cytiva, commercial | Gel and blot densitometry from Typhoon and Amersham imagers. | Fiji (GPL-3) | `imagej` | Open. As for Image Lab. |
| 2100 Expert and TapeStation Analysis | Agilent, closed, comes with the instrument | RNA integrity number (RIN), library size. | bioanalyzeR (MIT, R, reads the exports) | none | Open. The RIN algorithm is closed, so no open program gives the same RIN. |
| Experion software | Bio-Rad, closed (the system is discontinued) | Automated protein and RNA electrophoresis. | Fiji Gel Analyzer (GPL-3) | `imagej` | Open. |

## Microscopy and high-content screening

| Proprietary program | Vendor, license | Use in the lab | Open-source alternatives (license) | Cuvette adapter | Gap |
| --- | --- | --- | --- | --- | --- |
| Imaris | Oxford Instruments (Bitplane), commercial | 3D and 4D rendering, surfaces, spot tracking. | napari (BSD-3); Fiji (GPL-3); Icy (GPL-3) | `imagej`, `scikit-image`, `cellpose` | Partial. 2D segmentation and counts are covered. 3D surfaces and tracking are open. |
| Volocity | Quorum Technologies, commercial, no developer updates | 3D views, colocalization. | Fiji Coloc 2 (GPL-3); napari (BSD-3) | `image-assays`, `imagej` | Partial. Colocalization (Pearson, Manders, Costes thresholds and test, 2D or z-stack, with a mask) is covered by `image-assays`, which repeats the Coloc 2 calculations. 3D views are open. |
| MetaMorph | Molecular Devices, commercial | Acquisition, ratio and calcium imaging. | Fiji (GPL-3); CellProfiler (BSD-3) | `imagej`, `cellprofiler` | Partial. Acquisition is not in scope. |
| NIS-Elements | Nikon, commercial (the viewer is free, closed) | Acquisition and analysis, `.nd2` files. | Bio-Formats (GPL-2); nd2 (BSD-3); napari (BSD-3) | `bftools`, `imagej` | Covered for file reading and 2D analysis. |
| ZEN | Carl Zeiss, commercial (ZEN lite is free, closed) | Acquisition and analysis, `.czi` files. | Bio-Formats (GPL-2); czifile (BSD-3) | `bftools`, `imagej` | Covered for file reading and 2D analysis. |
| LAS X | Leica, commercial | Confocal acquisition and analysis, `.lif` files. | Bio-Formats (GPL-2); readlif (GPL-3) | `bftools`, `imagej` | Covered for file reading and 2D analysis. |
| Harmony and Columbus | Revvity, commercial. Columbus reached end of life on 2024-03-25. | High-content screening on Operetta and Opera Phenix. | CellProfiler (BSD-3); Cellpose (BSD-3); Fiji (GPL-3) | `cellprofiler`, `cellpose`, `image-assays` | Partial. Nuclei counts, positive-cell fractions, cargo per cell and phagocytic indices are covered by `image-assays` (count_cell_uptake) with `cellpose` labels as an option. Plate-level quality (Z' factor): in progress by another agent. |
| HALO | Indica Labs, commercial | Digital pathology scoring: positive cells, H-score, Ki-67 index on whole slides. | QuPath (GPL-3); scikit-image (BSD-3); pandas (BSD-3) | `qupath`, `ihc-scoring` | Partial. `ihc-scoring` gives the H-score, the Allred score, the Ki-67 index with a hot spot, and the agreement with a pathologist, from a QuPath cell table or from an image. `qupath` finds the cells. Tissue classifiers and multiplex modules are open. |
| Visiopharm | Visiopharm, commercial | Image analysis apps for IHC scoring, Ki-67 hot spots and tissue classes. | QuPath (GPL-3); scikit-image (BSD-3) | `qupath`, `ihc-scoring` | Partial. Same as HALO. The Visiopharm hot spot rules are its own. The `ihc-scoring` hot spot is a square window that moves in half steps. |
| Aperio ImageScope | Leica Biosystems, the viewer is free, closed. The analysis algorithms are licensed. | Nuclear, membrane and positive pixel count algorithms. | QuPath (GPL-3); scikit-image (BSD-3) | `qupath`, `ihc-scoring` | Partial. Same as HALO. The positive pixel count algorithm is open. |
| inForm | Akoya Biosciences, commercial | Tissue and cell segmentation and scoring for multiplex and brightfield slides. | QuPath (GPL-3); scikit-image (BSD-3) | `qupath`, `ihc-scoring` | Partial. Brightfield DAB scoring is covered as for HALO. Multiplex unmixing and tissue learning are open. |

## Flow cytometry

| Proprietary program | Vendor, license | Use in the lab | Open-source alternatives (license) | Cuvette adapter | Gap |
| --- | --- | --- | --- | --- | --- |
| FlowJo | FlowJo LLC (BD, then Waters), commercial | Gating and population statistics. The usual flow program in most labs. | FlowKit (BSD-3, reads FlowJo `.wsp`); flowCore (Artistic-2.0); CytoML (AGPL-3) | `flowkit`, `flowcore` | Covered for gates from a workspace (`flowkit`). `flowcore`: spillover matrix from single-stain controls, percent positive and MFI from cutoffs, group tests. Automated gates (openCyto, flowDensity) are open. |
| FCS Express | De Novo Software (Dotmatics), commercial | Flow and image cytometry. | FlowKit (BSD-3); flowCore (Artistic-2.0); FlowSOM (GPL-2 or later) | `flowkit`, `cytof` | Partial. Gating is covered by `flowkit`. FlowSOM clustering and abundance tests are covered by `cytof`. |
| Cytobank | Cytobank (Beckman Coulter), commercial, cloud | Mass cytometry and flow cytometry: arcsinh scaling, FlowSOM, viSNE, Citrus, population statistics. | FlowSOM (GPL-2 or later); flowCore (Artistic-2.0); diffcyt (MIT); CATALYST (GPL-2 or later) | `cytof` | Partial. Arcsinh scaling, FlowSOM, population counts and differential abundance are covered. viSNE, UMAP and Citrus are open. |
| OMIQ | Dotmatics, commercial, cloud | Spectral and mass cytometry: scaling, FlowSOM, UMAP, population statistics. | FlowSOM (GPL-2 or later); diffcyt (MIT); CATALYST (GPL-2 or later) | `cytof` | Partial. As for Cytobank. |

## Microbiology susceptibility testing

| Proprietary program | Vendor, license | Use in the lab | Open-source alternatives (license) | Cuvette adapter | Gap |
| --- | --- | --- | --- | --- | --- |
| Vitek 2 and Sensititre software, BioMerieux and Thermo Fisher | commercial, tied to the instrument | MIC reading, S, I, R by the breakpoint table in the instrument. | R AMR (GPL-2 or later); WHONET (free, closed) | `amr` | Partial. S, I, R from a MIC table by EUCAST or CLSI tables of 2011 to 2025, MIC50, MIC90 and percent susceptible with a 95% interval. Reading the plate or the disk zone is open. Disk diffusion and time-kill curves are open. |
| Excel for MIC50 and MIC90 | Microsoft, commercial | Sorted MIC lists and percent susceptible. | R AMR (GPL-2 or later) | `amr` | Covered. |

## Omics and pathway analysis

| Proprietary program | Vendor, license | Use in the lab | Open-source alternatives (license) | Cuvette adapter | Gap |
| --- | --- | --- | --- | --- | --- |
| Ingenuity Pathway Analysis (IPA) | QIAGEN, commercial subscription | Pathway and upstream-regulator analysis of gene lists from RNA-seq and proteomics. | clusterProfiler (Artistic-2.0); fgsea (MIT); gseapy (BSD-3); GSEA desktop (BSD-style Broad license) | none | This work: over-representation analysis and preranked GSEA. IPA's upstream-regulator scores use a closed knowledge base and stay open. |
| MetaCore | Clarivate, commercial subscription | Curated pathway enrichment. | clusterProfiler (Artistic-2.0); ReactomePA (GPL-2); gseapy (BSD-3) | none | This work (same tools as for IPA). |
| Partek Flow and Genomics Suite | Partek (Illumina), commercial | Point-and-click bulk and single-cell RNA-seq. | DESeq2 (LGPL-3 or later); limma (GPL-2 or later); edgeR (GPL-2 or later); scanpy (BSD-3); harmonypy (GPL-3 or later); Squidpy (BSD-3) | `deseq2`, `scanpy`, `harmony`, `squidpy`, `diffbind`, `limma-proteomics` | Partial. `limma-proteomics` runs limma on protein tables. Limma on microarray or RNA-seq tables is open. Clustering, sample integration with Harmony and spatial statistics: this work. ChIP-seq and ATAC-seq peak counts and differential peaks: `diffbind` (DiffBind with DESeq2 or edgeR). |
| Loupe Browser | 10x Genomics, free, closed | Views Cell Ranger and Space Ranger results: clusters, gene expression, differential expression and spatial gene plots. | scanpy (BSD-3); Squidpy (BSD-3); harmonypy (GPL-3 or later) | `scanpy`, `harmony`, `squidpy` | Partial. Clustering, marker genes, sample integration with Harmony, Moran's I, neighborhood enrichment and spatial domains: this work. Selecting cells by hand on the screen is open. |
| Golden Helix SVS and other genetics suites | Golden Helix, commercial | Association tests and Mendelian randomization from summary statistics of genetic variants. | MendelianRandomization (GPL-2 or GPL-3); TwoSampleMR (MIT); PLINK 2 (GPL-3) | `mendelianrandomization` | This work: inverse-variance, MR-Egger, median, mode and maximum likelihood estimates from summary statistics. The PLINK 2 association test on genotypes stays open. |
| CRISPR screen analysis in vendor portals | Several vendors, commercial | Hit genes from pooled CRISPR screens. | MAGeCK (BSD-3); BAGEL2 (MIT); DrugZ (MIT) | `mageck` | This work: MAGeCK rank aggregation and beta scores from a count table. Read counting from FASTQ files stays open. |
| GeneSpring | Agilent, commercial | Microarray expression analysis. | limma (GPL-2 or later); oligo and affy (LGPL-2 or later) | none | Open (microarrays are less common now). |
| CLC Genomics Workbench | QIAGEN, commercial | Read mapping, variant calls, RNA-seq in a GUI. | samtools, bcftools (MIT); bedtools (MIT); Galaxy (MIT); UGENE (GPL-2) | `samtools`, `bcftools`, `bedtools`, `fastqc`, `deseq2` | Partial. No read aligner adapter. |
| MaxQuant and Perseus | Max Planck Institute of Biochemistry, free, closed | Label-free, SILAC and TMT protein quantification; statistics in Perseus. | Sage (MIT); OpenMS (BSD-3); limma (GPL-2 or later); MSstats (Artistic-2.0) | `sage`, `openms`, `pyopenms`, `limma-proteomics` | Partial. `limma-proteomics` replaces the Perseus steps for a proteinGroups.txt table: filter rows, log2, valid values, normalization, imputation by down shift, the test and the volcano plot. The Perseus t test with permutation FDR, clustering and the other Perseus plugins are open. MSstats on feature-level input is open. |
| MetaboAnalyst (web server) | Xia lab, McGill University, free web service | Normalization, PCA, PLS-DA, OPLS-DA, t tests with FDR and volcano plots for a metabolite table. | ropls (CeCILL); limma (GPL-2 or later); mixOmics (GPL-2 or later) | `metabolomics-stats` | This work: row-wise normalization (PQN, total area, median), log and square root transforms, PCA, PLS-DA and OPLS-DA with permutation tests and VIP scores, and univariate tests with FDR. Pathway analysis, spectral processing and the web service itself stay open. |
| SIMCA | Sartorius (Umetrics), commercial | Principal component analysis (PCA), PLS-DA and OPLS-DA of multivariate data, multi-block models. | MOFA+ (mofapy2, LGPL-3); mixOmics (GPL-2 or later); ropls (CeCILL) | `mofa`, `metabolomics-stats` | Partial. `metabolomics-stats` fits PCA, PLS-DA and OPLS-DA with ropls: R2X, R2Y, cross-validated Q2, permutation tests and VIP scores. `mofa` finds the factors and the variance of each view for several tables. The SIMCA CV-ANOVA test, O2PLS and multi-block models stay open. |
| CLC Microbial Genomics Module | QIIME (Qiagen), commercial add-on to CLC Genomics Workbench | Alpha and beta diversity, PERMANOVA and differential abundance for 16S and shotgun abundance tables. | vegan (GPL-2 or later); MaAsLin 2 (MIT); ALDEx2 (GPL-3); QIIME 2 (BSD-3) | `microbiome` | Partial. Diversity, PERMANOVA and differential abundance from a feature table are covered. Read processing (DADA2, taxonomy assignment), UniFrac and ANCOM-BC are open. |

## Sequences, cloning and primers

| Proprietary program | Vendor, license | Use in the lab | Open-source alternatives (license) | Cuvette adapter | Gap |
| --- | --- | --- | --- | --- | --- |
| SnapGene | GSL Biotech (Dotmatics), commercial. SnapGene Viewer is free, closed. | Plasmid maps, primer design, PCR and restriction cloning simulation. | Biopython (Biopython License); primer3 and primer3-py (GPL-2); pydna (BSD); UGENE (GPL-2). ApE is free but not open source. | none | This work: primers and melting temperature, in-silico PCR, restriction digests, SnapGene `.dna` reading. Plasmid map drawing stays open. |
| Geneious Prime | Biomatters (Dotmatics), commercial | Alignment, cloning, Sanger trace review. | Biopython; UGENE (GPL-2); sangeranalyseR (GPL-2) | `phylo` (alignment for trees only) | This work: Sanger read alignment to a reference, with quality trimming. |

## Chromatography and mass spectrometry

| Proprietary program | Vendor, license | Use in the lab | Open-source alternatives (license) | Cuvette adapter | Gap |
| --- | --- | --- | --- | --- | --- |
| Chromeleon CDS | Thermo Fisher, commercial | HPLC, ion and gas chromatography: control, peak integration, calibration. | hplc-py (GPL-3); chromatographR (GPL-2 or later); OpenChrom (EPL-2.0, GUI) | none | This work: peak integration and calibration of exported traces. Instrument control and 21 CFR Part 11 audit trails stay open. |
| Empower | Waters, commercial | Regulated HPLC data system. | hplc-py (GPL-3); chromatographR (GPL-2 or later) | none | This work (as for Chromeleon). No open program is a Part 11 data system. |
| OpenLab CDS | Agilent, commercial | HPLC and GC data system. | hplc-py (GPL-3); OpenChrom (EPL-2.0) | none | This work (as for Chromeleon). |
| MassHunter | Agilent, commercial | LC-MS and GC-MS qualitative and quantitative work. | MZmine (MIT); xcms (GPL-2 or later); OpenMS and pyOpenMS (BSD-3) | `mzmine`, `pyopenms`, `openms` | Covered for features. Targeted quantification is partial. |
| Xcalibur and FreeStyle | Thermo Fisher. Xcalibur commercial. FreeStyle free, closed. | Raw file viewing, targeted quantification. | ProteoWizard msconvert (Apache-2.0; the vendor readers are closed); pyteomics (Apache-2.0) | `pyopenms`, `openms` | Partial. `.raw` files need a conversion to mzML first. |
| Spectronaut | Biognosys, commercial | Data-independent acquisition (DIA) proteomics. | EncyclopeDIA (Apache-2.0); OpenSWATH in OpenMS (BSD-3); alphaDIA (Apache-2.0). DIA-NN is free for academia but closed. | `openms`, `limma-proteomics` | Partial. `limma-proteomics` covers the post-analysis (filter, normalize, test, volcano plot) of an exported protein group table. Extraction of the DIA data is open. |
| Proteome Discoverer | Thermo Fisher, commercial | Database search for DDA and TMT. | Sage (MIT); OpenMS (BSD-3); mokapot (Apache-2.0); limma (GPL-2 or later). MSFragger is free for academia but closed. | `sage`, `openms`, `limma-proteomics` | Covered for search. TMT reporter quantification is partial. `limma-proteomics` replaces the statistics of a Proteins table export (ratio test and volcano plot). |
| PEAKS Studio | Bioinformatics Solutions, commercial | De novo sequencing and database search. | Sage (MIT); OpenMS (BSD-3) | `sage` | Partial. De novo sequencing is open. |

## What this work builds

The order of value follows the table. The choice leaves out what the other agents build.

1. `enrichment` (gseapy, BSD-3): over-representation analysis with an explicit background, and
   preranked GSEA. It replaces the basic pathway step of IPA and MetaCore.
2. `cloning` (Biopython, primer3-py, pydna): primer design and melting temperature, in-silico
   PCR, restriction digests, Sanger read alignment. It replaces the basic work in SnapGene and
   Geneious.
3. `chromatography` (hplc-py, GPL-3, and SciPy): baseline correction, peak integration and a
   calibration curve for HPLC-UV traces that the scientist exports from Chromeleon, Empower or
   OpenLab.
4. New tools in `biostats`: two-way ANOVA with post hoc tests, repeated-measures ANOVA,
   Kruskal-Wallis with Dunn, Friedman and exact rank tests. These are the Prism and SPSS menus
   that the other agents do not cover.

The status of each one is in "Results" below. A second work added `limma-proteomics` and `mofa`; see "Proteomics statistics and multi-omics".

## Results

This work finished all four parts. `cuvette adapter check <name> --run-tests` passes with no error for each one.

| Part | Adapter | Tools | Known-answer tests | Benchmark paper |
| --- | --- | --- | --- | --- |
| Pathways | `enrichment` | 4 | 6 | Wang 2023, DOI 10.3390/biom13010127 |
| Sequences and cloning | `cloning` | 6 | 12 | Klindworth 2013, DOI 10.1093/nar/gks808 |
| Chromatography | `chromatography` | 5 | 6 | Chure 2024, DOI 10.21105/joss.06270 |
| Prism and SPSS statistics | `biostats` (5 new tools) | 5 new | 6 new | Oreshkova 2024, DOI 10.1371/journal.pone.0292500 |

Where each test value comes from:

- `cloning`: the primer3 test suite, with 33 rows of `test/oligotm.txt` and the Primer3web settings output.
  Also the Biopython test suite and docs, the New England Biolabs lambda EcoRI fragment sizes, and the
  published 16S primer positions.
- `enrichment`: the fgsea vignette (enrichment score and leading edge), and R `phyper`, `fisher.test` and
  `p.adjust` for the hypergeometric p values (`checks/ora_phyper.R`).
- `chromatography`: the hplc-py test suite ground truth, R `lm` for the calibration
  (`checks/calibration_r.R`), and a trapezoid integral that shows what the hplc-py area means
  (`checks/area_units.py`).
- `biostats`: R 4.6.1 `aov`, `TukeyHSD`, `kruskal.test`, `FSA::dunnTest`, `friedman.test` and `wilcox.test`
  (`checks/anova_r.R`).

Two faults that the benchmark papers found, now fixed:

- `gseapy.get_library` drops a gene set line whose first gene field is empty. That changes the
  Benjamini-Hochberg denominator and every adjusted p value. `fetch_gene_sets` now reads the raw library file.
- The Enrichr web site uses a fixed background of 20000 genes, and prints an odds ratio with no
  Haldane-Anscombe correction. `run_ora` now offers that background and gives both odds ratios.

What stays open:

- No open paper found so far prints a preranked GSEA enrichment score with a frozen ranked list, so the
  benchmark covers over-representation only. The GSEA tool has the fgsea vignette as its known answer.
- No paper found that prints HPLC-UV peak areas with open traces under a license on the list. The
  chromatography benchmark uses the hplc-py paper itself, whose figure prints two significant figures.

## Single-cell integration and spatial analysis

Added on 9 October 2026. `cuvette adapter check <name> --run-tests` passes with no error for both adapters.

| Part | Adapter | Tools | Known-answer tests | Benchmark paper |
| --- | --- | --- | --- | --- |
| Integration of samples | `harmony` (harmonypy, GPL-3 or later; scanpy for the steps before and after) | 7 | 13 | Korsunsky 2019, DOI 10.1038/s41592-019-0619-0 |
| Spatial transcriptomics | `squidpy` (Squidpy, BSD-3) | 8 | 13 | Weber 2023, DOI 10.1038/s41467-023-39748-z |

Why two adapters and not new scanpy tools: Harmony needs one more Python package. It works on the scanpy checkpoints, so the adapter `harmony` uses the scanpy environment and adds no environment. Squidpy needs many packages that scanpy does not need (numba, xarray, dask, zarr), so it has its own environment. The scanpy adapter changed in one place. `build_neighbors` takes `use_rep`, so that the neighbor graph can use the Harmony components.

Where each test value comes from:

- `harmony`, `compute_lisi`: the output of the R package lisi that the harmonypy tests store (`lisi_lisi.tsv.gz`, 400 points). The tool matches it to 0.01 for each point. An own implementation (`checks/lisi_check.py`) matches it to 0.002.
- `harmony`, `integrate_harmony`: the output of R harmony2 on 3500 PBMC (peripheral blood mononuclear cell) components that the harmonypy tests store. The tool gives a Pearson r of 0.9985 or more in each of 30 dimensions (`checks/harmony_check.py`). The harmonypy test needs 0.99.
- `harmony`, `label_by_reference` and `count_groups`: numpy calculations without scanpy (`checks/label_check.py`).
- `squidpy`, `spatial_autocorr`: the Moran's I values that the Squidpy documentation prints for the Visium mouse brain sample (3110035E14Rik 0.665132, Resp18 0.649582). The tool matches them to 0.0001. A SciPy calculation without Squidpy (`checks/moran_check.py`) gives 0.665133 and 0.649583.
- `squidpy`, `nhood_enrichment`: a numpy calculation of the pair counts and of the z scores with its own permutations on the imaging mass cytometry sample (`checks/nhood_check.py`). The pair counts are equal. The z scores agree within the error of the permutations.
- `squidpy`, `filter_genes_by_spots`: a numpy calculation without scanpy (`checks/filter_check.py`).
- `squidpy`, `find_spatial_domains`: scikit-learn and numpy recalculate the adjusted Rand index and the share of neighbor pairs in one domain (`checks/domains_check.py`). The number of domains is from a run of the tool.

Faults that the work found:

- `scanpy.external.pp.harmony_integrate` fails with harmonypy 2.1.0 (scanpy 1.12.4). harmonypy 2.x returns the corrected components with cells in the rows, and scanpy transposes them. The adapter calls harmonypy directly and reads the result in the shape of the input.

Paper results:

- Korsunsky 2019: median iLISI 1.06 before and 1.66 after Harmony, paper 1.01 and 1.59. The cell counts of the pure 293T data set (2885, paper 2859) and of the mix (3388, paper 3364) do not reproduce. The paper counts are references in the benchmark.
- Weber 2023: 3639 spots in the tissue, MOBP at rank 4 and SNAP25 at rank 19. The paper puts both in the top 100. Two values do not reproduce. The genes that pass the filter are 3322 (paper 3396). The ranks of HBB, IGKC and NPY are 54, 33 and 260 (paper 100 to 1000). They are references in the benchmark.

What stays open:

- No adapter yet for annotation with CellTypist, trajectories (PAGA, RNA velocity with scVelo) or cell-cell communication (LIANA, CellChat). The search found no open paper whose printed number a run from processed data reproduces. The reasons are in `bench/papers/CANDIDATES-singlecell-spatial.md`.
- No adapter yet for integration with scVI, for the same reason.

## Proteomics statistics and multi-omics

Two adapters from the work of 9 October 2026. Each passes `cuvette adapter check <name> --run-tests`.

| Adapter | Engine | Tools | Known-answer tests | Benchmark papers |
| --- | --- | --- | --- | --- |
| `limma-proteomics` | R limma | prepare_protein_table, test_differential_proteins | 10 | Thaqi 2026, DOI 10.1038/s41597-026-07515-6. Zhu 2020, DOI 10.1074/mcp.TIR119.001646 |
| `mofa` | MOFA+ (mofapy2) | run_mofa, associate_factors, top_features | 4 | Argelaguet 2018, DOI 10.15252/msb.20178124 |

Where each test value comes from:

- `limma-proteomics`: the counts that the two papers print. Also the R code of Thaqi et al., written out
  with limma (`checks/check_bovine.R`). Also a NumPy and SciPy calculation of the empirical Bayes variance,
  the moderated t and the Benjamini-Hochberg adjustment (`checks/check_limma.py`).
- `mofa`: the variance explained and the factors that the CLL paper prints. Also a NumPy calculation of the
  variance explained and of the correlations from the saved factors and weights (`checks/check_mofa.py`).

What stays open:

- No mixOmics adapter. No paper from 2018 on has an open data table and a printed result that a seeded run
  reproduces. The DIABLO paper prints error rates for a four-block panel, and the `breast.TCGA` data of the
  package has three blocks. `bench/papers/CANDIDATES-multiomics-proteomics.md` lists the papers that the work checked.
- limma runs the moderated t test only. The DEqMS variance model, MSstats on feature-level input and the
  roll-up of peptides to proteins stay open. The DEqMS numbers of Zhu 2020 do not reproduce.
- The work did not run the Perseus, Proteome Discoverer, Spectronaut and SIMCA manual routes.

## Microbiome tables and mass cytometry

Added on 9 October 2026. `ga adapter check <name> --run-tests` passes with no error for both adapters.

| Part | Adapter | Tools | Known-answer tests | Benchmark paper |
| --- | --- | --- | --- | --- |
| Mass cytometry clustering and population tests | `cytof` (FlowSOM, GPL-2 or later; diffcyt, MIT; flowCore) | 4 | 12 | Nowicka 2019 (version 3 of the 2017 paper), DOI 10.12688/f1000research.11622.3 |
| Microbiome feature tables | `microbiome` (Maaslin2, MIT; ALDEx2, GPL-3; vegan, GPL-2 or later) | 4 | 16 | El Masri 2026, DOI 10.1080/19490976.2026.2712811 |

Where each test value comes from:

- `cytof`, `inspect_fcs` and `population_frequencies` on the Bodenmiller BCR-XL data: the cells in each of 16 samples and the percent of each cell type. The Nowicka workflow prints them. A count with flowio (`checks/check_bcrxl.py`) gives the same values.
- `cytof`, `differential_abundance`: the p values and the numbers of significant cell types that the workflow prints for the GLMM with and without the donor pairing. A direct lme4 fit (`checks/check_glmm.R`) gives the same values.
- `cytof`, `cluster_cells`: the sizes and the arcsinh medians of three synthetic populations, from numpy (`checks/check_synthetic.py`). The benchmark does not score the FlowSOM cluster numbers of the real data. The paper merges its clusters by hand.
- `microbiome`, `differential_abundance` with MaAsLin 2: the q value, the 132 samples and the 7 samples with the OTU that the El Masri paper prints. An OLS fit in Python (`checks/check_limit_maaslin.py`) gives the same coefficient and q. On the HMP2 example data, statsmodels gives the same linear and mixed model coefficients (`checks/check_maaslin2.py`).
- `microbiome`, `differential_abundance` with ALDEx2: a Python implementation with Dirichlet draws gives the same number of significant features. Its median difference is within 2 percent (`checks/check_aldex.py`).
- `microbiome`, `alpha_diversity` and `beta_diversity`: numpy and SciPy calculations of Shannon, richness, the Kruskal-Wallis test and the PERMANOVA R2 and F (`checks/check_limit.py`).

Paper results:

- Nowicka 2019: all 10 scored values reproduce, and the model scores 10 of 10 in a blind run. The paper merges 20 FlowSOM metaclusters into 8 cell types by hand, so the benchmark scores the published cell type labels.
- El Masri 2026: the q value 0.043, the 132 samples and the 7 samples reproduce. The model scores 9 of 9 in a blind run. An independent script computes the four diversity values, because the paper prints no number for them.

What stays open:

- No ANCOM-BC, UniFrac or DADA2 read processing. The reasons are in `bench/papers/CANDIDATES-microbiome-cytometry.md`. Several papers failed because their printed numbers do not reproduce from the open data.
- No viSNE, UMAP or Citrus for cytometry, and no differential state tests (marker levels inside a cell type).

## Histology scoring

One adapter from the work of 9 October 2026. It passes `cuvette adapter check ihc-scoring --run-tests`.

| Adapter | Engine | Tools | Known-answer tests | Benchmark papers |
| --- | --- | --- | --- | --- |
| `ihc-scoring` | scikit-image color deconvolution and pandas | inspect_cell_table, measure_stain_intensity, score_h_score, score_allred, score_ki67, compare_scorers | 24 | Ram 2021, DOI 10.1371/journal.pone.0245638 |

`qupath` already counts positive cells and gives an H-score. `ihc-scoring` does not repeat that step. It reads the cell table of QuPath, or a pathologist table of percents. It adds the Allred score, the Ki-67 hot spot and the agreement statistics.

## Sources

- [Q] Statistics program counts in PubMed Central, 2016 to 2021: https://quantifyinghealth.com/?p=7735
- R: https://www.r-project.org/about.html
- jamovi: https://github.com/jamovi/jamovi/blob/main/LICENSE.md
- JASP: https://github.com/jasp-stats/jasp-desktop
- PSPP: https://www.gnu.org/software/pspp/
- statsmodels: https://pypi.org/project/statsmodels/
- lifelines: https://pypi.org/project/lifelines/
- pingouin: https://pypi.org/project/pingouin/
- SciPy: https://github.com/scipy/scipy
- GNU Octave: https://github.com/gnu-octave/octave
- LibreOffice: https://www.libreoffice.org/about-us/licenses/
- Bioconductor package licenses (flowCore, CytoML, FlowSOM, HTqPCR, NormqPCR, clusterProfiler,
  fgsea, ReactomePA, limma, DESeq2, edgeR, oligo, affy, sangeranalyseR, xcms, MSstats,
  seahtrue): https://bioconductor.org/packages/release/bioc/VIEWS
- drc, dr4pl, plater, gcplyr, qpcR, pcr, pwr, ceas, chromatographR, REDCapR: the CRAN page of
  each package, https://cran.r-project.org/package=NAME
- FlowKit: https://github.com/whitews/FlowKit
- napari: https://github.com/napari/napari
- Fiji: https://github.com/fiji/fiji
- Icy: https://icy.bioimageanalysis.org/
- CellProfiler: https://github.com/CellProfiler/CellProfiler/blob/main/LICENSE
- Bio-Formats: https://github.com/ome/bioformats
- nd2, czifile, readlif, cellpose: the PyPI page of each package
- Columbus end of life: https://support.revvitysignals.com/hc/en-us/articles/21816959218836
- Image Lab: https://www.bio-rad.com/imagelabsoftware
- fgsea: https://github.com/alserglab/fgsea
- gseapy: https://github.com/zqfang/GSEApy
- GSEA desktop: https://github.com/GSEA-MSigDB/gsea-desktop/blob/master/LICENSE.txt
- UGENE: https://github.com/ugeneunipro/ugene
- Biopython: https://github.com/biopython/biopython/blob/master/LICENSE.rst
- pydna: https://github.com/pydna-group/pydna/blob/master/LICENSE.txt
- primer3: https://github.com/primer3-org/primer3 and https://pypi.org/project/primer3-py/
- ApE: https://github.com/mwdavis2/ApE/blob/master/LICENSE.md
- OpenChrom: https://github.com/OpenChrom/openchrom/blob/develop/LICENSE
- hplc-py: https://github.com/cremerlab/hplc-py
- harmonypy: https://pypi.org/project/harmonypy/ and https://github.com/slowkow/harmonypy
- Squidpy: https://pypi.org/project/squidpy/
- Loupe Browser: https://www.10xgenomics.com/support/software/loupe-browser
- chromConverter: https://github.com/ethanbass/chromConverter
- MZmine: https://github.com/mzmine/mzmine
- OpenMS: https://github.com/OpenMS/OpenMS/blob/develop/LICENSE
- ProteoWizard and Skyline: https://github.com/ProteoWizard/pwiz/blob/master/LICENSE
- EncyclopeDIA: https://bitbucket.org/searleb/encyclopedia/src/master/LICENSE.txt
- DIA-NN: https://github.com/vdemichev/DiaNN
- Sage: https://github.com/lazear/sage
- FragPipe and MSFragger: https://github.com/Nesvilab/FragPipe
- Bioanalyzer end of production: https://explore.agilent.com/bioanalyzer-discontinuation
- bioanalyzeR: https://github.com/jwfoley/bioanalyzeR
- G*Power: https://psycho.uni-duesseldorf.de/abteilungen/aap/gpower3
- MaxQuant: https://maxquant.org/
- QualCoder: https://github.com/ccbogel/QualCoder
- REDCap terms: https://projectredcap.org/join/termsofuse/
- PyCap: https://github.com/redcap-tools/PyCap

The vendor names of these programs come from general knowledge, not from a web check:

- microscopy and gels: Imaris, MetaMorph, NIS-Elements, ZEN, LAS X, ImageQuant TL.
- plate readers and pathways: SoftMax Pro, Gen5, MetaCore.
- chromatography and mass spectrometry: Chromeleon, Empower, OpenLab, MassHunter, Xcalibur, Spectronaut,
  Proteome Discoverer, PEAKS.
- qualitative work: NVivo.
No web source confirmed whether these downloads are free or paid: CFX Maestro, QuantStudio,
Seahorse Wave, 2100 Expert and TapeStation.
