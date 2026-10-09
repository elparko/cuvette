# Wet-lab imaging paper candidates

Image-based bench assays with open image data, checked for the paper benchmark on 2026-10-08.
A candidate passes if the printed numbers reproduce from the shared images with a headless tool.
"Printed numbers" are numbers in the paper, in its tables, or in the result files that the
authors deposited with the images.

The search used Europe PMC full text, the BioImage Archive, Zenodo, figshare, Dryad, the Broad
Bioimage Benchmark Collection (BBBC) and the Image Data Resource (IDR).

## Outcome

| Flow | Built | Benchmark paper | Blind Claude Haiku run |
| --- | --- | --- | --- |
| Colony counting and clonogenic survival | `image-assays`: count_colonies, clonogenic_survival | `makrai2023-colonies` | Pass: 88 colonies against 88 printed (computed 2/2, reported 1/1) |
| Colocalization | `image-assays`: measure_colocalization | `manders1993-coloc` | Pass: Pearson 0.721, 0.443, 0.164 against 0.72, 0.44, 0.16 (computed 6/6, reported 5/5) |
| Uptake, phagocytosis and efferocytosis index, nuclei counts | `image-assays`: count_cell_uptake | `rees2019-uptake` | Pass: nuclei 566 against 582, vesicles 448 against 461, 0.769 vesicles per cell against 0.677, 50.1 percent positive against 43.7 (computed 6/6, reported 5/5). The cell count is a reference item that differs (459 against 572). |
| Western blot densitometry | Not built | None reproduces (see below) | - |
| Scratch assay | Not built | None found (see below) | - |

## Shortlist

### 1. Western blot and gel densitometry

| Item | Value |
| --- | --- |
| Paper | Vrettou S, Zetzsche S, Wirth B. Pharmacological activation of NRF2 by omaveloxolone upregulates NRF2-target proteins in SMA type I human fibroblasts. FASEB J 2026. DOI 10.1096/fj.202601358r (PMC13271045) |
| Data | Zenodo 19068621 (concept DOI 10.5281/zenodo.19068620): uncropped 16-bit TIFF blots of four replicates, a lane map, and `WB_Quantification_SMA_Fibroblasts.xlsx` with the Fiji band intensities of each lane |
| License | CC BY 4.0 (data and paper) |
| Printed numbers | Replicate 1, strip 1, normalized to the total protein stain: NQO1 fold change against untreated control, OMAV 200 nM: 3.95; SMA untreated against control untreated: 0.233. SMN in SMA untreated against control untreated: 0.096. Raw band intensities: NQO1 5970.095 (control untreated), 35509.915 (control OMAV 200 nM) |
| Software in the paper | Fiji (band intensity), GraphPad Prism (statistics) |
| Proprietary equivalent | Bio-Rad Image Lab (Lanes and Bands, Volume Tools), Cytiva ImageQuant TL (1D gel analysis) |
| Open-source tool | Fiji Gel Analyzer (GPL-3). Fiji: Schindelin J et al. 2012, DOI 10.1038/nmeth.2019. Rolling-ball background: Sternberg SR 1983, DOI 10.1109/MC.1983.1654163 |
| Plan | New tool `measure_blot_bands` in a new adapter (see "Build plan"). Lane profiles from the lane boxes, rolling-ball or baseline background, band volume per lane, ratio to the loading control, fold change against a reference lane. |
| Result | Rejected after a test. The deposited TIFF files are 8-bit RGBA copies, not the raw imager files. Lane profiles with a straight baseline on replicate 1 (NQO1) give the control lanes within 10 percent of the printed ratios (DMSO 1.50 against 1.445, OMAV 100 nM 4.56 against 4.26, OMAV 200 nM 6.42 against 5.95), but the SMA lanes differ by up to 3.5 times (OMAV 200 nM 5.45 against 1.29 relative to the control untreated lane). Replicate 2 shows the same: the SMA OMAV bands look as dark as the control bands, but the sheet prints a fifth of the control value. The SMN control bands are saturated (pixel value 0). The printed values must come from other exposures than the deposited images. The blot tool is not built until a paper with matching raw images is found. |

Other blot candidates:

| Paper | Result |
| --- | --- |
| Siegfried H et al. eLife 2024, DOI 10.7554/eLife.85962 (VAPA) | Rejected. The source data give three KO/control ratios (0.05, 0, 0.11) but only one raw blot, an 8-bit RGB export. The knockout ratio is near zero, so it does not test densitometry. |
| Yim WW et al. eLife 2022, DOI 10.7554/eLife.78923 (HaloTag) | Rejected. Raw 16-bit gels are open, but no lane values are printed. |
| Macrophage-hepatocyte glucocorticoid receptor paper, western blot record Zenodo 5810203 (2021) | Rejected. The authors changed the contrast in Preview before the Fiji measurement. The step cannot be repeated. |
| Butler TAJ et al. Biomed Res Int 2019, DOI 10.1155/2019/5214821 | Rejected. Compares ImageJ, ImageQuant TL and Image Studio, but the blots are only in a PDF. |
| Alonso Villela SM et al. A protocol for recombinant protein quantification by densitometry. MicrobiologyOpen 2020, DOI 10.1002/mbo3.1027 | Rejected. No raw gel images. |
| Cc2d1a dose study, Zenodo 23087973 (CC BY-SA 4.0, 2026) | Rejected. No peer-reviewed paper was found for the record. |
| SH-SY5Y tauopathy model, Zenodo 15235224 (CC BY 4.0) | Rejected. Uncropped blots only; the source data hold no band values. |

### 2. Colony counting

| Item | Value |
| --- | --- |
| Paper | Makrai L, Fodróczy B, Nagy SÁ, et al. Annotated dataset for deep-learning-based bacterial colony detection. Sci Data 2023;10:497. DOI 10.1038/s41597-023-02404-8 |
| Data | figshare DOI 10.6084/m9.figshare.22022540.v3: 369 JPEG photos of agar plates (24 species), `images.xls` with the colony count of each photo, and bounding boxes of 56,865 colonies |
| License | CC BY 4.0 |
| Printed numbers | Colony count per photo, for example sp14_img01 14, sp14_img05 16, sp05_img01 24, sp09_img03 9. The same plate is photographed on a black and on a white background with the same count. |
| Software in the paper | Hand annotation (COCO Annotator). No counting program. |
| Proprietary equivalent | Synbiosis ProtoCOL, Interscience Scan, Bio-Rad Image Lab colony count |
| Open-source tool | OpenCFU (GPL-3), Geissmann Q 2013, DOI 10.1371/journal.pone.0054072. Fiji Analyze Particles. scikit-image (BSD-3), van der Walt S et al. 2014, DOI 10.7717/peerj.453 |
| Plan | New tool `count_colonies`: find the dish, threshold the colonies inside it, split touching colonies with a watershed, count with size and roundness limits. Clonogenic outputs: plating efficiency and surviving fraction from counts and the seeded cell numbers. |

Other colony candidates:

| Paper | Result |
| --- | --- |
| Brzozowska B et al. Radiat Environ Biophys 2019, DOI 10.1007/s00411-018-00772-z (countPHICS) | Rejected. Prints only category totals, no image data. |
| AGAR data set (Majchrowska S et al. 2021) | Rejected. CC BY-NC 2.0, and the paper is a preprint. |
| LeGO clonogenic survival assay paper, Cancers 2023 | Not checked in full. No per-image count table was found. |

### 3. Immunofluorescence colocalization

| Item | Value |
| --- | --- |
| Paper | Manders EMM, Verbeek FJ, Aten JA. Measurement of co-localization of objects in dual-colour confocal images. J Microsc 1993;169:375-382. DOI 10.1111/j.1365-2818.1993.tb03313.x |
| Data | The Fiji Coloc 2 test images that copy the designed object pairs of the paper (`mandersA.tiff` to `mandersI.tiff`), and the real two-channel image `colocsample1b` with its mask. Source: github.com/fiji/Colocalisation_Analysis, `src/test/resources` |
| License | GPL-3 (Coloc 2 repository). The paper is not open. |
| Printed numbers | Pearson r for the pairs A-A, A-B, A-C, A-D: 1.0, 0.72, 0.44, 0.16 (the values of the paper, asserted in the Coloc 2 test `mandersPaperImagesTest`). Manders M1 and M2 for the pairs A-B to A-I (Coloc 2 `MandersColocalizationTest`). colocsample1b with the Costes thresholds 70 and 53 and the mask: M1 0.705665, M2 0.724752. Pearson for colocsample1b: 0.75. |
| Software | Fiji Coloc 2 (GPL-3). Costes SV et al. 2004, DOI 10.1529/biophysj.103.038422. scikit-image `pearson_corr_coeff` and `manders_coloc_coeff` |
| Proprietary equivalent | Volocity Colocalization, Imaris Coloc, NIS-Elements Colocalization, ZEN Colocalization |
| Plan | New tool `measure_colocalization`: Pearson r, Manders M1 and M2 above a threshold, the Costes automatic thresholds, the Costes randomization p value, a scatter plot and an overlap image. |

Other colocalization candidates:

| Paper | Result |
| --- | --- |
| Alemany C et al. PLoS Biol 2025, DOI 10.1371/journal.pbio.3002958, Zenodo 15682874 | Rejected. Pearson values come from many cells, but Zenodo holds only the representative images. |
| Colocalization Benchmark Source (Zinchuk V et al.) | Rejected. The license of the images is not stated. |
| Stauffer W et al. Sci Rep 2018 (EzColocalization) | Rejected. The repository has no test images. |

No 2018-2026 paper with raw two-channel images and a printed coefficient for each image was found.
The benchmark uses the 1993 paper. The record says so.

### 4. Uptake and phagocytosis index, with nuclei counts

| Item | Value |
| --- | --- |
| Paper | Rees P, Wills JW, Brown MR, Barnes CM, Summers HD. The origin of heterogeneous nanoparticle uptake by cells. Nat Commun 2019;10:2341. DOI 10.1038/s41467-019-10112-4 |
| Data | BioImage Archive S-BSST249: raw 3-channel LSM confocal fields (Hoechst 33342 nuclei, WGA-555 membrane, Qtracker 705 nanoparticles), the CellProfiler 2.2 pipeline, and the CellProfiler result files (`.mat`) for each field |
| License | The paper is CC BY 4.0. The BioStudies record states no license. EMBL-EBI terms of use apply. The data are fetched, not committed. |
| Printed numbers | The deposited CellProfiler results for each field. Field Image01 of BEAS-2B 0.5 nM 1 h: 229 nuclei, 222 cells, 189 nanoparticle-loaded vesicles (NLV). Image02: 216, 215, 141. The paper reports about 0 to 40 NLVs per cell. |
| Software in the paper | CellProfiler 2.2 (BSD-3). Stirling DR et al. 2021, DOI 10.1186/s12859-021-04344-9 (CellProfiler 4) |
| Proprietary equivalent | Revvity Harmony and Columbus (spot and cell analysis), Imaris Spots, MetaMorph, NIS-Elements |
| Plan | New tool `count_cell_uptake`: find nuclei (or read a label image from Cellpose), grow cells from the nuclei, find cargo spots or cargo area in the cargo channel, count cargo per cell, call a cell positive by a rule, give the fraction of positive cells and the cargo per cell. The same tool covers the owner's efferocytosis images (brightfield plus a red channel). |

Other uptake and positive-fraction candidates:

| Paper | Result |
| --- | --- |
| Ounissi M et al. Sci Rep 2024 (PhagoStat), Zenodo 10803492 | Rejected. 94 GB of time-lapse data. The printed values are aggregate areas in time, not counts per field. |
| Ford HZ et al. Proc R Soc B 2019 (efferocytosis and bead accumulation), Zenodo 5059506 | Rejected. 7.5 GB of whole-slide images for the bead experiment; no count for each field is printed. |
| Xu X et al. A versatile in vitro quantitative assay for macrophage efferocytosis. Bio-protocol 2026, DOI 10.21769/BioProtoc.5690 | Rejected. No image data, CC BY-NC. |
| Settle AH et al. Nat Commun 2024, DOI 10.1038/s41467-024-52453-9 (beta2 integrins and phagocytosis) | Rejected. Images on request only. |
| BioImage Archive S-BIAD1871 (alveolar macrophage phagocytosis) | Rejected. Z-stacks with no printed numbers for each field. |
| Clissa L et al. Sci Data 2024 (Fluorescent Neuronal Cells v2), CC BY 4.0 | Reserve. Hand counts of stained cells for each field, but no count of all cells. |
| BBBC010 (C. elegans live and dead, brightfield plus a stain) | Reserve. CC0, 2012. Hand masks for each worm, but no live or dead call for each worm. |

### 5. Scratch and wound-healing assays (not built)

| Paper | Result |
| --- | --- |
| Suarez-Arnedo A et al. PLoS ONE 2020, DOI 10.1371/journal.pone.0232565 (Wound Healing Size Tool) | Rejected. No raw images; the tables in the figures are screenshots. |
| Kauanova S et al. Front Cell Dev Biol 2021, DOI 10.3389/fcell.2021.640972 | Rejected. Raw data on request. |
| Zenodo 21779854 (wound-healing instance segmentation, CC BY 4.0) | Rejected for now. The paper is under revision, not peer reviewed. |
| Löwenstein K et al. 2024, arXiv 2407.02187 (Segment Anything for scratch assays) | Rejected. Preprint, no data link. |

Open-source tools for a later build: Wound Healing Size Tool for Fiji (Suarez-Arnedo 2020), the
MRI Wound Healing Tool macro for Fiji, TScratch (Gebäck T et al. 2009, DOI 10.2144/000113083).

## Build plan

The four tools go into one new adapter, `image-assays`, that runs scikit-image and SciPy in its
own Python environment.

Reasons:

- The `scikit-image` adapter holds general threshold-and-count tools. Its setup decisions (one
  channel, one threshold method, one size limit) apply to every tool. The assay tools need
  other decisions: lane boxes and the background method for a blot, the dish and the colony
  size for a plate, the thresholds of two channels for colocalization, the positivity rule for
  uptake. These decisions in the same adapter give a long, mixed setup form.
- The `cellpose` adapter wraps one model. The uptake tool accepts a Cellpose label image as the
  cell outlines, so the two adapters work together.
- The ImageJ adapter needs a window, and its tests are `gui: true`. The new tools are headless.

Each tool gives a plain summary, the Fiji route with the dialog values, the route in the
proprietary program, a QC overlay image with a legend that shows what was counted and what was
left out, plots as PNG and SVG, and decisions that the scientist owns.

Validation for each tool:

1. Known-answer tests: synthetic images with a known answer, the Coloc 2 test values, and values
   that a second program (SciPy only, or the Coloc 2 numbers) gives. Check scripts and their
   output go in `catalog/image-assays/checks/`.
2. One failure test for each tool.
3. A benchmark paper folder for each flow, run blind with one Claude Haiku session.
