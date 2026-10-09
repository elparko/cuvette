# Data licenses

This file lists each third-party data file in the repository. It gives the source, the license, the required attribution and the status of each file.

The Cuvette code is AGPL-3.0-only. The data files in this list are not. Each data file keeps its own license. The AGPL does not apply to them. The repository holds them next to the code as separate works.

This is a technical license check, done on 2026-10-08. It is not legal advice.

Full license texts are in the folder `LICENSES/`.

## Rules for contributors

- Keep the copyright notice and the license of each file in this list.
- Do not edit `catalog/flowkit/data/data1.fcs` or `catalog/flowkit/data/gml_all_gates.xml`. The ISAC notice permits only unmodified copies.
- If you add a data file, add a row to this file before you commit. Write the source URL, the license and the changes that you made.
- If a source states no license, do not commit the file. Write a `fetch.sh` script that downloads it and checks its SHA-256 checksum.

## Files removed from the repository

These files have no license that permits redistribution. The three catalog files are not in the current tree. A download script takes the place of each one. The two test fixtures hold new content with no third-party data. A download script downloads the original file, checks its SHA-256 checksum and makes the same subset.

| File | Source | Problem | Replacement |
|---|---|---|---|
| `catalog/fastqc/data/good_sequence_short.fastq.gz`, `catalog/fastqc/data/bad_sequence.fastq.gz` | First 10000 reads of the FastQC example files, https://www.bioinformatics.babraham.ac.uk/projects/fastqc/ | No license is stated. The files are not in the FastQC source repository. | `catalog/fastqc/data/fetch.sh` |
| `catalog/mzmine/data/PStd_050_1_rt600-660_mz100-200.mzML` | Crop of `2012_02_03_PStd_050_1.mzML`, OpenMS tutorial data, https://abibuilder.cs.uni-tuebingen.de/archive/openms/Tutorials/Example_Data/Metabolomics/datasets/ | No license is stated on the archive. It is not MetaboLights data. | `catalog/mzmine/data/fetch.sh` and `crop_pstd.py` (pyOpenMS, 221 MB download) |
| `catalog/rdkit/data/delaney-processed.csv` | DeepChem copy of the ESOL set of Delaney (2004) | The DeepChem MIT license covers the DeepChem code. The values come from the American Chemical Society (ACS) supporting information, which states no reuse license. | `catalog/rdkit/data/fetch.sh` (pinned to DeepChem commit 108af21) |
| `tests/fixtures/paper-figures/delaney2004-esol/session/work/compute_descriptors-1/descriptors.csv` | Output of a run on the ESOL set. It holds all 1128 names, SMILES and measured values. | Same as above. | The name column holds row numbers. The SMILES column is removed. The computed columns stay. |
| `tests/fixtures/paper-figures/gramfort2013-mne-sample/**/evoked-ave.fif` | Derived from the MNE sample dataset | The MNE sample dataset states no license. The MNE page says that it is "provided solely for the purpose of getting familiar with the MNE software". | Made again from `catalog/mne/data/synthetic_raw.fif` with `make_evoked.py` in the fixture folder. |

SHA-256 of the removed files, for the record:

```
0d595b8cf9d816743b6bb9d1602cf4445be492a0b2fe5cc412c5e405ea8919a3  catalog/fastqc/data/good_sequence_short.fastq.gz
c53c7d16b91a753bb296e15f790fcbd989abf696d59f491f0fdc6abf7180505d  catalog/fastqc/data/bad_sequence.fastq.gz
3dddb2ca9c08f82dd3d098ad735e2c7c3e5f57d4f6adee48c4b2bfcacccffd70  catalog/mzmine/data/PStd_050_1_rt600-660_mz100-200.mzML
8c06a76f0c6487d29ab0f903e6a7a7139f189ab3c1178f159c8be8964602f189  catalog/rdkit/data/delaney-processed.csv
5e8aff4b33151f9451c5fe471fb5452630565c4bc5b28e79489e694ec6bd816d  tests/fixtures/paper-figures/delaney2004-esol/session/work/compute_descriptors-1/descriptors.csv
```

The files stay in the git history until the history rewrite with `git filter-repo`. The owner decided on 8 October to do this rewrite before the repository becomes public.

## Data that requires attribution (CC BY 4.0)

The Creative Commons Attribution 4.0 license (CC BY 4.0) requires the credit, a link to the license and a statement of the changes. The license text is in `LICENSES/CC-BY-4.0.txt`.

- **PBMC 3k.** "3k PBMCs from a Healthy Donor", Single Cell Gene Expression Dataset by Cell Ranger 1.1.0, 10x Genomics (2016). CC BY 4.0. https://www.10xgenomics.com/datasets/3-k-pbm-cs-from-a-healthy-donor-1-standard-1-1-0
  - File: `catalog/scanpy/data/pbmc3k_small.h5ad`.
  - Changes: 300 random cells (seed 0) and 1000 genes (mitochondrial genes, marker genes and the genes with the highest totals), saved as h5ad by `catalog/scanpy/data/make_pbmc_small.py`.
- **QuPath workshop images.** Pécot T. Whole-Slide Image Analysis and Quantitative Pathology with QuPath. Zenodo (2022). https://doi.org/10.5281/zenodo.6390370. CC BY 4.0.
  - Files: `catalog/qupath/data/ki67_crop.ome.tif`, `catalog/qupath/data/ki67_crop.png`, `catalog/qupath/data/prostate_thumb.png`, `catalog/bftools/data/ki67_crop.ome.tif`, `catalog/bftools/data/ki67_pyramid.ome.tif`.
  - Changes: crops of `ki678_lymphoma.ndpi` saved as OME-TIFF, PNG and a pyramid, and a reduced copy of a prostate image.
  - The record does not state the origin of the tissue.
- **NuInsSeg.** Mahbod A, Polak C, Feldmann K, Khan R, Gelles K, Dorffner G, Woitek R, Hatamikia S, Ellinger I. NuInsSeg: A fully annotated dataset for nuclei instance segmentation in H&E-stained histological images. Zenodo (2024). https://doi.org/10.5281/zenodo.10518968. CC BY 4.0. Paper: Scientific Data 11:295 (2024), https://doi.org/10.1038/s41597-024-03117-2
  - Files: `catalog/scikit-image/data/nuinsseg-mini/**`.
  - Changes: one tissue image and one label mask for human liver and for mouse spleen, renamed.
- **UniProt.** The UniProt Consortium. UniProt: the Universal Protein Knowledgebase in 2025. Nucleic Acids Research 53(D1):D609-D617 (2025). https://doi.org/10.1093/nar/gkae1010. CC BY 4.0. https://www.uniprot.org
  - Files: `catalog/sage/data/Q99536.fasta`, and the protein sequences in `catalog/sage/data/standards.fasta` and `catalog/openms/data/standards_td.fasta`.
  - Changes: a subset of the OpenMS example FASTA file. `standards_td.fasta` adds decoy sequences.

## Data under open licenses

| Files | Source | License | Required action |
|---|---|---|---|
| `catalog/cellprofiler/data/bbbc005/*`, `catalog/cellprofiler/data/bbbc005_dense/*` | BBBC005v1, Broad Bioimage Benchmark Collection, https://bbbc.broadinstitute.org/BBBC005 | CC0 1.0 | The collection asks for a citation: Ljosa V, Sokolnicki KL, Carpenter AE. Nature Methods 9:637 (2012). https://doi.org/10.1038/nmeth.2083 |
| `catalog/cellpose/data/bbbc039-mini/**` | Crops of BBBC039v1, https://bbbc.broadinstitute.org/BBBC039 | CC0 1.0 | Citation requested: Caicedo JC et al. Cytometry A 95(9):952-965 (2019). https://doi.org/10.1002/cyto.a.23863, and Ljosa 2012. |
| `catalog/mdanalysis/data/4AKE.pdb` | Protein Data Bank (PDB) entry 4AKE, https://www.rcsb.org/structure/4AKE | CC0 1.0 (wwPDB policy) | Credit requested: Müller CW, Schlauderer GJ, Reinstein J, Schulz GE. Structure 4(2):147-156 (1996). https://doi.org/10.1016/S0969-2126(96)00018-4 |
| `catalog/imagej/data/blobs.gif`, `catalog/scikit-image/data/blobs.gif` | ImageJ sample image "Blobs", https://imagej.net/ij/images/blobs.gif | Public domain (work of the US National Institutes of Health, 17 USC 105) | None. Credit: "ImageJ sample image, NIH, public domain." |
| `catalog/gdal/data/ne_110m_countries.geojson` | Natural Earth 1:110m Admin 0 countries, https://www.naturalearthdata.com | Public domain | None. Credit: "Made with Natural Earth." The file keeps three fields. |
| `catalog/bcftools/data/g1k_chr20_1000000_1100000.vcf.gz` and `.tbi` | 1000 Genomes Project, 30x panel of 3202 samples, sites only, chr20:1000000-1100000, https://ftp.1000genomes.ebi.ac.uk/vol1/ftp/data_collections/1000G_2504_high_coverage/working/20220422_3202_phased_SNV_INDEL_SV/ | Open access under the Fort Lauderdale terms, no embargo (IGSR) | Cite the project: Byrska-Bishop M et al. Cell 185(18):3426-3440.e19 (2022). https://doi.org/10.1016/j.cell.2022.08.004 |
| `catalog/samtools/data/ex1.fa`, `ex1.fa.fai`, `ex1.sam.gz` | samtools `examples/` folder, https://github.com/samtools/samtools | MIT (Copyright 2008-2026 Genome Research Ltd) | Keep the notice. Text: `LICENSES/MIT.txt`. |
| `catalog/bedtools/data/exons.chr1_0_10Mb.bed`, `aluY.chr1_0_10Mb.bed` | 10 Mb slices of `refseq.chr1.exons.bed` and `aluY.chr1.bed`, bedtools2 `data/` folder, https://github.com/arq5x/bedtools2 | MIT (Copyright 2009-2019 Aaron Quinlan). The annotations come from the UCSC Genome Browser. | Keep the notice. |
| `catalog/sage/data/LQSRPAAPPAPGPGQLTLR.mzML` | Sage `tests/` folder, https://github.com/lazear/sage | MIT (Copyright 2022 Michael Lazear) | Keep the notice. |
| `catalog/sage/data/bsa1.mzML`, `bsa2.mzML`, `bsa3.mzML`, `standards.fasta`; `catalog/openms/data/bsa3_ms2.mzML`, `standards_td.fasta`, `sage_psms.idXML` | OpenMS `share/OpenMS/examples/BSA/` and `TOPPAS/data/BSA_Identification/18Protein_SoCe_Tr_detergents_trace.fasta`, https://github.com/OpenMS/OpenMS | BSD-3-Clause (Copyright OpenMS Inc., University of Tübingen, ETH Zurich, Freie Universität Berlin). The repository license has no exception for data. | Keep the notice. Text: `LICENSES/BSD-3-Clause.txt`. Changes: only the 283 spectra that gave a match; 119 proteins that are not from Sorangium cellulosum; decoys added. |
| `catalog/openms/data/peptide_lcms.mzML`, `pi1.idXML`, `pi1.fasta` | OpenMS `src/tests/topp/` | BSD-3-Clause (as above) | Keep the notice. `pi1.*` are edited. |
| `catalog/pyimzml/data/Example_Continuous.imzML`, `Example_Continuous.ibd` | pyimzML `tests/data/`, https://github.com/alexandrovteam/pyimzML | Apache-2.0 | The license text is next to the files (`pyimzML_LICENSE`) and in `LICENSES/Apache-2.0.txt`. pyimzML has no NOTICE file. The pyimzML README says that the files first came from imzml.org. |
| `catalog/gdal/data/byte.tif`, `catalog/qgis/data/byte.tif` | GDAL `autotest/gcore/data/byte.tif`, https://github.com/OSGeo/gdal | MIT | Keep the notice. |
| `catalog/flowkit/data/test_comp_example.fcs`, `single_ellipse_51_events.wsp`, `data_set_simple_line_100.fcs`, `comp_complete_example.csv` | FlowKit `data/` folder at commit f2159043, https://github.com/whitews/FlowKit | BSD-3-Clause (Copyright 2018 Scott White) | Keep the notice. |
| `catalog/flowkit/data/data1.fcs`, `gml_all_gates.xml` | Gating-ML 2.0 compliance files of the International Society for Advancement of Cytometry (ISAC), as carried in the FlowKit repository | ISAC notice (see below) | Do not modify. Keep the notice. |
| `catalog/biostats/data/rossi.csv` | lifelines `datasets/rossi.csv`, https://github.com/CamDavidsonPilon/lifelines | MIT (lifelines). The same data are in the R package carData (GPL-2.0-or-later). | Keep the notice. Cite Rossi, Berk and Lenihan (1980). |
| `catalog/astropy/data/gaussians_noisy.fits`, `gaussians_noiseless.fits`, `truth_100gaussians.csv`, `isolated_truth.csv` | Made by `make_data.py` with `photutils.datasets.make_100gaussians_image` | BSD-3-Clause (photutils) | Credit photutils. |
| `catalog/phylo/data/example.phy`; `unaligned.fasta` (derived) | IQ-TREE `example/` folder, https://github.com/iqtree/iqtree2 | GPL-2.0 | Keep the notice. Text: `LICENSES/GPL-2.0-only.txt`. |
| `catalog/vegan/data/dune.csv`, `dune_env.csv` | R package vegan 2.7-6, data sets `dune` and `dune.env` | GPL-2.0 (CRAN: "GPL-2") | Keep the notice. Cite Jongman, ter Braak and van Tongeren (1987). |
| `catalog/lme4/data/sleepstudy.csv`, `catalog/biostats/data/sleepstudy.csv` | R package lme4, data set `sleepstudy` (the second copy through Rdatasets) | GPL-2.0-or-later | Keep the notice. Cite Belenky et al. (2003) and Bates et al. (2015). |
| `catalog/biostats/data/sleep.csv`, `plantgrowth.csv` | R `datasets` package, through Rdatasets | GPL-2.0 or GPL-3.0 (part of R). The 1905 sleep values are public domain by age. | Cite Student (1908) and Cushny and Peebles (1905) for `sleep`. |
| `catalog/mdanalysis/data/adk_backbone_h.pdb`, `adk_backbone_h.dcd` | Subset of the AdK files of MDAnalysisTests 2.10.0, made by `make_adk_small.py` | LGPL-3.0-or-later | Keep the notice. Text: `LICENSES/LGPL-3.0-only.txt` (it includes the GPL-3.0 text). |
| `catalog/deseq2/data/airway_counts_subset.csv`, `airway_coldata.csv` | Bioconductor package airway 1.32.0 | LGPL (no version stated) | Keep the notice. Cite Himes et al. (2014). |
| `catalog/cardinal/data/pig206_mini.rds` | Bioconductor package CardinalWorkflows 1.44.0, data set `pig206` | Artistic-2.0 | Keep the notice. Text: `LICENSES/Artistic-2.0.txt`. Changes: crop to x up to 45, y up to 30, m/z 500 to 700. Artistic-2.0 requires that the changes are documented. This row does that. |

## Data made by this project

These files are synthetic or written by hand. They are under the Cuvette license.

- `catalog/imagej/data/discs*.png`, `catalog/imagej/data/recording-blobs.ijm` (made by `make-synthetic.ts` or written by hand).
- `catalog/mne/data/synthetic_raw.fif` (made by `make_synthetic_raw.py`).
- `catalog/pyopenms/data/lcms_tiny.mzML`, `profile_tiny.mzML` (made by `make_synthetic.py`).
- `catalog/pyimzml/data/lipids_tiny*` (made with the pyimzML writer).
- `catalog/flowkit/data/synthetic_comp.fcs`, `synthetic_comp_matrix.csv`, `truth_counts.json`.
- `catalog/bedtools/data/a.bed`, `b.bed`; `catalog/bcftools/data/toy.*`; `catalog/openbabel/data/mini.smi`; `catalog/rdkit/data/mini.csv`; `catalog/mzmine/data/legacy_export_example.csv`; `catalog/gdal/data/zones.geojson`, `catalog/qgis/data/zones.geojson`; `*.tif.aux.xml`.
- `bench/*/data/*` (made by `src/bench/datasets.ts`).
- `tests/fixtures/paper-figures/**`: outputs of benchmark runs. They follow the license of the data that each run read. The two files in the table at the top must change.

## Data that the benchmark downloads but does not ship

`bench/papers/*/fetch.sh` downloads these data to the local data folder. The repository does not hold them. CREDITS.md gives the citation for each one.

| Benchmark folder | Data | License |
|---|---|---|
| alexandrov2019-metaspace | METASPACE public datasets 2022-08-16_10h14m23s and 2022-08-16_12h31m33s (Michael et al. 2022) | Not verified. The repo notes say CC BY 4.0 by platform policy. No terms page that states this was found. |
| andrews-fastqc | FastQC example files | No license stated |
| bankhead2017-qupath-workshop | Zenodo 6390370 | CC BY 4.0 |
| caicedo2019-bbbc039 | BBBC039v1 | CC0 1.0 |
| gramfort2013-mne-sample | MNE sample dataset | No license stated |
| ljosa2012-bbbc005 | BBBC005v1 and `BBBC005_results_bray.csv` | CC0 1.0 |
| mahbod2024-nuinsseg | Zenodo 10518968 | CC BY 4.0 |
| palmer2017-metaspace-fdr | MetaboLights MTBLS313 and MTBLS317 | EMBL-EBI terms of use |
| rost2016-openms | OpenMS tutorial data, Tübingen archive | No license stated |
| wolf2018-scanpy | 10x Genomics PBMC 3k | CC BY 4.0 |
| gowers2016-mdanalysis | MDAnalysisTests AdK files; PDB 1AKE and 4AKE | LGPL-3.0-or-later; CC0 1.0 |
| love2014-deseq2-airway | Bioconductor airway 1.32.0 | LGPL |
| lazear2023-sage | OpenMS BSA example files | BSD-3-Clause |

## ISAC notice

The two Gating-ML compliance files carry this notice. It is copied here word for word, with the spelling of the original.

```
Copyright (c) 2012 ISAC (International Society for Advancement of Cytometry).
Free of charge distribution and read-only usage permited. Modification
and all other rights reserved. For all other uses please contact ISAC.
```

## Copyright notices for MIT and BSD files

The MIT and BSD-3-Clause licenses require the copyright notice and the license text with each copy. The license texts are in `LICENSES/MIT.txt` and `LICENSES/BSD-3-Clause.txt`. The holders are:

- samtools example data: Copyright (C) 2008-2026 Genome Research Ltd. MIT.
- bedtools2 data: Copyright (c) 2009-2019 Aaron Quinlan. MIT.
- Sage test spectrum: Copyright (c) 2022 Michael Lazear. MIT.
- GDAL `byte.tif`: the GDAL/OGR project. The GDAL file `LICENSE.TXT` gives the MIT terms and names no single holder. MIT.
- lifelines `rossi.csv`: Copyright (c) 2017 Cameron Davidson-Pilon. MIT.
- OpenMS example and test data: Copyright OpenMS Inc. -- Eberhard Karls University Tuebingen, ETH Zurich, and Freie Universitaet Berlin 2002-present. BSD-3-Clause.
- FlowKit test data: Copyright (c) 2018, Scott White. BSD-3-Clause.
- photutils (generator of the astropy test images): Copyright (c) 2011-2026, Photutils Developers. BSD-3-Clause.
