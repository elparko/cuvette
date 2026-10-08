# Paper candidates: omics, imaging, neuroscience, mass spectrometry, phylogenetics

Rules: peer-reviewed research paper from 2018 or later with a DOI. Public input data with an open license. The paper prints the target numbers. An independent check reproduces them. One run takes about 15 minutes or less on a Mac.

Status: shortlist. The results of the builds are in the section "Outcome" at the end.

## Shortlist

### 1. Astapova 2021, DESeq2, KGN cells with DHT
- Citation: Astapova O, Seger C, Hammes SR. Ligand Binding Prolongs Androgen Receptor Protein Half-Life by Reducing its Degradation. J Endocr Soc 5(5):bvab035 (2021).
- DOI: 10.1210/jendso/bvab035
- Data: GEO GSE158218, `GSE158218_experiment1_deSeq2_counts.txt.gz` (666 kB, integer featureCounts, 59087 genes by 10 samples). NCBI GEO, no use restrictions.
- Numbers printed: 173 genes at the 0.05 threshold, 125 up and 48 down (Results, Figure 1A). 2 genes without the pair factor (Discussion).
- Adapter: deseq2 (count matrix input). Design ~ experiment + treatment.
- Download: 0.7 MB. Run time: under 1 minute for DESeq2.

### 2. Liao 2025, scanpy, mouse bone marrow stromal cells
- Citation: Liao X et al. An adipo-osteoprogenitor population in the endosteal niche contributes to bone and fat formation in adult mouse bone marrow. PNAS 122(47):e2502436122 (2025).
- DOI: 10.1073/pnas.2502436122
- Data: GEO GSE253262, Cell Ranger filtered matrices of two samples (about 188 MB). NCBI GEO, no use restrictions.
- Numbers printed: 10,608 and 10,046 cells recovered; 9,612 and 8,887 cells after quality control (Methods).
- Adapter: scanpy (load_data, calculate_qc, filter_cells).
- Download: 188 MB. Run time: about 2 minutes of compute.

### 3. Li 2025, scanpy, mouse testis with BRCA1 knockout
- Citation: Li P et al. BRCA1 preserves genome integrity during the formation of undifferentiated spermatogonia. EMBO Rep 26(15):3747-3772 (2025).
- DOI: 10.1038/s44319-025-00487-5
- Data: GEO GSE273607, two filtered matrices (about 244 MB). NCBI GEO.
- Numbers printed: 5077 control cells and 8711 knockout cells after quality control (fewer than 750 genes or more than 10% mitochondrial removed).
- Adapter: scanpy. Problem: the knockout count needs "more than 750 genes", but the text says "fewer than 750 removed" (8712).
- Download: 244 MB. Run time: about 3 minutes of compute.

### 4. Pei 2023, scanpy, yak ovary
- Citation: Pei J et al. Single-Cell Transcriptomics Analysis Reveals a Cell Atlas and Cell Communication in Yak Ovary. Int J Mol Sci 24(3):1839 (2023).
- DOI: 10.3390/ijms24031839
- Data: GEO GSE213989, one raw (unfiltered) matrix, about 120 MB.
- Numbers printed: 15,333 cells and 18,402 genes after quality control.
- Adapter: scanpy. Problem: the yak mitochondrial genes have no "mt-" or "MT-" prefix. The adapter takes only a prefix.

### 5. Chousal 2022, DESeq2, mouse blastocysts without UPF2
- Citation: Chousal JN et al. Progression of the pluripotent epiblast depends upon the NMD factor UPF2. Development 149(21):dev200764 (2022).
- DOI: 10.1242/dev.200764
- Data: GEO GSE191039, `GSE191039_rawcounts-unfiltered.txt.gz` (636 kB).
- Numbers printed: 178 genes at Q < 0.1 (102 up, 76 down). Pre-filter: at least ten reads in one sample.
- Adapter: deseq2. Risk: old R (3.2.2), so the DESeq2 release is old. The GEO summary says the analysis was at the transcript isoform level.

### 6. Lidschreiber 2018 and Odermatt 2018, DESeq2 with a fold change cutoff after the test
- Lidschreiber 2018 NAR, DOI 10.1093/nar/gky845, GEO GSE114301: 229 up and 104 down at padj 0.1 and a fold change above 1.5, after a baseMean filter of 30.
- Odermatt 2018 Sci Rep, DOI 10.1038/s41598-018-32340-2, GEO GSE111193: 464 up and 679 down at FDR 1% and a fold change above 2.
- Adapter: deseq2. Problem: the adapter has no fold change cutoff after the test and no baseMean filter. lfcThreshold is a different test.

### 7. Phylogenetics (IQ-TREE): search in progress
- Target: a small public alignment (Dryad, Zenodo, TreeBASE, CC0 or CC BY) with a printed log-likelihood or best-fit model.

### 8. Imaging
- Kromp 2020 Sci Data, DOI 10.1038/s41597-020-00608-w, BioStudies S-BSST265 (76 MB): 79 images with 7813 nuclei. A data paper; the license is not on the study page.
- Caicedo 2019 Nat Methods (Data Science Bowl 2018), DOI 10.1038/s41592-019-0612-7, BBBC038 (CC0): 29,464 training nuclei, 4,152 stage-1 test nuclei. The masks are one file for each nucleus, not label images.
- Vicar 2019 BMC Bioinformatics, DOI 10.1186/s12859-019-2880-8, Zenodo 1250729 (CC BY, 468 MB): Otsu Dice for each modality (Table 2). The paper does not say how Dice is averaged.

### 9. MEG (MNE)
- Tadel 2019 Front Neurosci, DOI 10.3389/fnins.2019.00076, OpenNeuro ds000117 (CC0), sub-01 run-01 (880 MB .fif): 40 good Familiar trials. Part of the trial rejection was by hand in Brainstorm.

### 10. Mass spectrometry
- Park 2023 J Proteome Res (Crux), DOI 10.1021/acs.jproteome.2c00615: 20,448 PSMs at 1% FDR in one HepG2 run. The raw file is not in the cited PRIDE project.
- Kontou 2023 J Cheminform (UmetaFlow), DOI 10.1186/s13321-023-00724-w: 778 of 836 features. About 7 GB of raw files, EMBL-EBI terms.
