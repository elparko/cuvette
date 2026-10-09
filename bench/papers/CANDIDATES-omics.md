# Paper candidates: omics, imaging, neuroscience, mass spectrometry, phylogenetics

Rules: peer-reviewed research paper from 2018 or later with a DOI. Public input data with an open license. The paper prints the target numbers. An independent check reproduces them. One run takes about 15 minutes or less on a Mac.

Status: built and checked. The results are in the section "Outcome" at the end.

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

### 7. Kanetis 2022, IQ-TREE, Sporocadaceae from grapevine
- Citation: Kanetis LI, Taliadoros D, Makris G, Christoforou M. A Novel Seimatosporium and Other Sporocadaceae Species Associated with Grapevine Trunk Diseases in Cyprus. Plants 11(20):2733 (2022).
- DOI: 10.3390/plants11202733
- Data: figshare 10.6084/m9.figshare.20530188 (CC BY 4.0), five FASTA alignments, 264 kB.
- Numbers printed: log-likelihood -15,895.468 of the concatenated tree (Figure 1), model TIM2e+I+G, 2375 sites. Single-locus log-likelihoods in Figures S1 to S4.
- Adapter: phylo (infer_tree). Run time: about 30 seconds for IQ-TREE with 1000 ultrafast bootstraps.

### 7b. Other phylogenetics candidates
- Franco-Mena 2023 PeerJ, DOI 10.7717/peerj.14715, 16S alignment of 215 taxa in the supplement (CC BY): ML log-likelihood -10091.1778 (best of ten runs), model TIM2+F+R3.
- Devitt 2023 PeerJ, DOI 10.7717/peerj.14985, 16S alignment (CC BY): ten best trees from -4,996.8648 to -4,997.5458, model HKY+FO+G4 with restricted model options.
- Cho 2024 PLoS Genet, DOI 10.1371/journal.pgen.1011218, Dryad (CC0): the paper prints no log-likelihood.

### 8. Imaging
- Kromp 2020 Sci Data, DOI 10.1038/s41597-020-00608-w, BioStudies S-BSST265 (76 MB): 79 images with 7813 nuclei. A data paper; the license is not on the study page.
- Caicedo 2019 Nat Methods (Data Science Bowl 2018), DOI 10.1038/s41592-019-0612-7, BBBC038 (CC0): 29,464 training nuclei, 4,152 stage-1 test nuclei. The masks are one file for each nucleus, not label images.
- Vicar 2019 BMC Bioinformatics, DOI 10.1186/s12859-019-2880-8, Zenodo 1250729 (CC BY, 468 MB): Otsu Dice for each modality (Table 2). The paper does not say how Dice is averaged.

### 9. MEG (MNE)
- Tadel 2019 Front Neurosci, DOI 10.3389/fnins.2019.00076, OpenNeuro ds000117 (CC0), sub-01 run-01 (880 MB .fif): 40 good Familiar trials. Part of the trial rejection was by hand in Brainstorm.

### 10. Mass spectrometry
- Park 2023 J Proteome Res (Crux), DOI 10.1021/acs.jproteome.2c00615: 20,448 PSMs at 1% FDR in one HepG2 run. The raw file is not in the cited PRIDE project.
- Kontou 2023 J Cheminform (UmetaFlow), DOI 10.1186/s13321-023-00724-w: 778 of 836 features. About 7 GB of raw files, EMBL-EBI terms.

## Outcome

### Added
| Paper | Adapter | Published items | Independent check |
|---|---|---|---|
| astapova2021-deseq2-kgn | deseq2 | 173 genes, 125 up, 48 down at padj < 0.05; 2 genes without the pairing term (trap) | check_deseq2.R, DESeq2 1.52.0 called directly: 173, 125, 48 and 2, exact |
| liao2025-scanpy-bone-marrow | scanpy | 10608 and 10046 cells at load; 9612 and 8887 after QC | check_qc.py, numpy and scipy without scanpy: the same four numbers, exact |
| kanetis2022-iqtree-sporocadaceae | phylo | log-likelihood -15,895.468; 2375 sites | check_iqtree.sh, IQ-TREE 2.0.8 and 3.1.4 called directly: -15895.477 and -15895.483 |

Adapter route with no model (`ga run-step`, 2026-10-08):
- deseq2 run_deseq on kgn_counts.csv with the answers: 59087 genes tested, 173 at padj < 0.05, 125 up, 48 down.
- scanpy load_data and filter_cells with prefix mt-: pulse 10608 to 9612, chase 10046 to 8887. With the default prefix MT-, chase keeps 9859 (the trap value).
- phylo infer_tree with TIM2e+I+G4, ultrafast bootstrap 1000 and the outgroup: 55 sequences, 2375 sites, log-likelihood -15895.4825.

Local model runs (ollama qwen3:8b, blind mode, one run each):
- astapova2021-deseq2-kgn (2026-10-08): answer in 283 s. Computed 4/4, reported 3/3. Leak check: 3 paths read, 0 outside the allow list, 0 blocked, 0 unsourced. Report: bench/results/new-astapova2021-deseq2-kgn-check.md.
- liao2025-scanpy-bone-marrow: not run. The run was stopped before it started because the computer was needed for other work.
- kanetis2022-iqtree-sporocadaceae: not run, for the same reason.

### Rejected
- Li 2025 EMBO Rep (scanpy): the control count matches, but the knockout count (8711) needs "more than 750 genes", and the text says "fewer than 750 removed" (8712). A second scanpy QC case also adds little to Liao 2025.
- Pei 2023 Int J Mol Sci (scanpy): the yak mitochondrial genes have no common prefix. The scanpy adapter takes only a prefix. Adapter gap.
- Chousal 2022 Development (DESeq2): DESeq2 1.52.0 gives 176 genes (102 up, 74 down). The paper prints 178 (102 up, 76 down). The paper names R 3.2.2, edgeR normalization and isoform-level work, so the exact method is not clear. With the old default betaPrior = TRUE the count is 122.
- Lidschreiber 2018 NAR and Odermatt 2018 Sci Rep (DESeq2): both apply a fold change cutoff after the test. The deseq2 adapter has no such step. Adapter gap.
- Liu 2021 Front Genet (DESeq2): fold change cutoff after the test (|log2FC| > 1.5). Same adapter gap.
- Kanetis 2022 single-locus trees: ITS and LSU match (-1641.889 and -1744.624 against -1641.838 and -1744.611), but tub2 and tef1-a do not (-7037.664 against -7026.633, -4880.517 against -4806.893). The phylo adapter takes one model for each session, so the spec scores only the concatenated tree.
- Kromp 2020 Sci Data (imaging): the BioStudies record S-BSST265 has no license. A data paper.
- Caicedo 2019 Nat Methods, Data Science Bowl (imaging): the training masks are one PNG for each nucleus, not label images, and the published numbers are mask counts only.
- Vicar 2019 BMC Bioinformatics (imaging): the paper does not say how the Dice score is averaged. Not checked further.
- Tadel 2019 Front Neurosci (MEG): the printed 40 good trials include a rejection by hand in Brainstorm. Not reproducible by a rule.
- Jas 2018 Front Neurosci (MEG): no numbers for one subject.
- Park 2023 J Proteome Res (Crux): the raw file is not in the cited PRIDE project.
- Kontou 2023 J Cheminform (UmetaFlow): about 7 GB of raw files, EMBL-EBI terms, and the count is for the whole set.
- Franco-Mena 2023 and Devitt 2023 (IQ-TREE): not built. The printed values are the best of ten runs, and Kanetis 2022 already covers the phylo adapter.

### Adapter gaps found
- deseq2: no fold change cutoff after the test and no baseMean filter. Many papers count genes with padj below a cutoff and |log2FC| above a cutoff.
- scanpy: the mitochondrial genes are found only by a name prefix. Species such as yak need a gene list. There is also no minimum UMI count filter.
- phylo: one model for each session, so a run cannot build single-locus trees with different models. The tool does not report parsimony-informative sites.
- mne: load_raw reads only .fif files. Most public EEG data (BrainVision, EDF, EEGLAB) cannot be used.

## Gene set enrichment, checked on 2026-10-09

The `enrichment` adapter needs a paper whose gene list and gene sets are both frozen, and that prints the
overlap with the p values.

Built:

| Folder | Paper | Data | Result |
|---|---|---|---|
| `wang2023-cuproptosis-oa` | Wang Y et al. Cuproptosis-related gene signature in synovial inflammation during osteoarthritis. Biomolecules 13(1):127 (2023). DOI 10.3390/biom13010127 | Four hub genes from the abstract; DSigDB from Enrichr | All ten rows of Table 1 reproduce: overlap, p and adjusted p to about 5 significant figures, and the odds ratio exactly. |

Rejected or not used:

| Paper | Reason |
|---|---|
| Law CW et al. F1000Research 5:1408 (2016), limma camera on GEO GSE63310 | The gene set names, sizes, direction and order reproduce exactly. The p values drift 2 to 9 percent, because the Bioconductar release differs from the one in the paper. The adapter has no camera method. |
| Chen Y et al. F1000Research 5:1438 (2016), goana and camera on GSE60450 | The sample-to-group table is not in the text, and the GO p values move with the org.Mm.eg.db release. |
| Fang Z et al. Bioinformatics 39(1):btac757 (2023), the gseapy paper | It prints a normalized enrichment score, which depends on the permutations. The Scanpy steps before it are not pinned. |
| Several PeerJ and PLOS ONE papers with a clusterProfiler table | They print GeneRatio and BgRatio, so the arithmetic checks from the table alone, but the gene list is not in a supplement. |

Still open: no paper found that prints a preranked GSEA enrichment score with a frozen ranked list. The
`run_gsea_prerank` tool has the fgsea vignette as its known answer instead.
