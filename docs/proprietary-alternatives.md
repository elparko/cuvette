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
| SAS | SAS Institute, commercial | Clinical trials, epidemiology, regulatory submissions. 9.0% of papers [Q]. | R with survival (LGPL-2 or later); statsmodels (BSD-3); lifelines (MIT) | `biostats`, `lme4` | Partial. Survival and mixed models are covered. Logistic regression and power analysis: in progress by another agent. Regulatory output formats (CDISC) are open. |
| Stata | StataCorp, commercial | Epidemiology and regression. 8.3% of papers [Q]. | R (GPL-2 or GPL-3); statsmodels (BSD-3) | `biostats` | Partial. Logistic regression and meta-analysis: in progress by another agent. |
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

## Flow cytometry

| Proprietary program | Vendor, license | Use in the lab | Open-source alternatives (license) | Cuvette adapter | Gap |
| --- | --- | --- | --- | --- | --- |
| FlowJo | FlowJo LLC (BD, then Waters), commercial | Gating and population statistics. The usual flow program in most labs. | FlowKit (BSD-3, reads FlowJo `.wsp`); flowCore (Artistic-2.0); CytoML (AGPL-3) | `flowkit` | Covered. |
| FCS Express | De Novo Software (Dotmatics), commercial | Flow and image cytometry. | FlowKit (BSD-3); flowCore (Artistic-2.0); FlowSOM (GPL-2 or later) | `flowkit` | Partial. Clustering of high-dimensional data is open. |

## Omics and pathway analysis

| Proprietary program | Vendor, license | Use in the lab | Open-source alternatives (license) | Cuvette adapter | Gap |
| --- | --- | --- | --- | --- | --- |
| Ingenuity Pathway Analysis (IPA) | QIAGEN, commercial subscription | Pathway and upstream-regulator analysis of gene lists from RNA-seq and proteomics. | clusterProfiler (Artistic-2.0); fgsea (MIT); gseapy (BSD-3); GSEA desktop (BSD-style Broad license) | none | This work: over-representation analysis and preranked GSEA. IPA's upstream-regulator scores use a closed knowledge base and stay open. |
| MetaCore | Clarivate, commercial subscription | Curated pathway enrichment. | clusterProfiler (Artistic-2.0); ReactomePA (GPL-2); gseapy (BSD-3) | none | This work (same tools as for IPA). |
| Partek Flow and Genomics Suite | Partek (Illumina), commercial | Point-and-click bulk and single-cell RNA-seq. | DESeq2 (LGPL-3 or later); limma (GPL-2 or later); edgeR (GPL-2 or later); scanpy (BSD-3) | `deseq2`, `scanpy` | Partial. No limma adapter. |
| GeneSpring | Agilent, commercial | Microarray expression analysis. | limma (GPL-2 or later); oligo and affy (LGPL-2 or later) | none | Open (microarrays are less common now). |
| CLC Genomics Workbench | QIAGEN, commercial | Read mapping, variant calls, RNA-seq in a GUI. | samtools, bcftools (MIT); bedtools (MIT); Galaxy (MIT); UGENE (GPL-2) | `samtools`, `bcftools`, `bedtools`, `fastqc`, `deseq2` | Partial. No read aligner adapter. |
| MaxQuant and Perseus | Max Planck Institute of Biochemistry, free, closed | Label-free, SILAC and TMT protein quantification; statistics in Perseus. | Sage (MIT); OpenMS (BSD-3); MSstats (Artistic-2.0) | `sage`, `openms`, `pyopenms` | Partial. Protein-level statistics (MSstats) are open. |

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
| Spectronaut | Biognosys, commercial | Data-independent acquisition (DIA) proteomics. | EncyclopeDIA (Apache-2.0); OpenSWATH in OpenMS (BSD-3); alphaDIA (Apache-2.0). DIA-NN is free for academia but closed. | `openms` | Open for DIA. |
| Proteome Discoverer | Thermo Fisher, commercial | Database search for DDA and TMT. | Sage (MIT); OpenMS (BSD-3); mokapot (Apache-2.0). MSFragger is free for academia but closed. | `sage`, `openms` | Covered for search. TMT reporter quantification is partial. |
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

The status of each one is in "Results" below.

## Results

This work finished all four parts. `ga adapter check <name> --run-tests` passes with no error for each one.

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
