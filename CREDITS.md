# Credits

Cuvette runs science programs that other people wrote. This file credits each program, library, dataset and paper that Cuvette uses.

- If you publish a result that you made with Cuvette, cite the programs and the data that your analysis used. Cite Cuvette too (see `CITATION.cff`, BibTeX `smith2026cuvette`).
- BibTeX entries for every item in this file are in `docs/references.bib`. The key of each entry is given after "BibTeX".
- Details of each data file, its license and its changes are in `DATA_LICENSES.md`.
- Full license texts are in `LICENSES/`.

The license check behind this file was done on 2026-10-08. It is a technical check, not legal advice.

## How Cuvette uses other software

- Cuvette starts each science program as a separate process, or imports a Python or R library in a separate worker process. Cuvette does not include the code of these programs. The user installs each program.
- The adapter files in `catalog/` hold Cuvette's own scripts, settings and help text. They name program menus, options and functions to describe how to use the program.
- Program names identify the programs. They do not show a partnership or an endorsement. The repository has no third-party logos.
- Exception: `catalog/cellprofiler/templates/nuclei.cppipe` is derived from the CellProfiler example pipeline `ExampleFly.cppipe`. See the CellProfiler entry.

## Software

### Programs that adapters run

#### samtools and HTSlib
- Authors: Heng Li, Petr Danecek, James K. Bonfield, Robert M. Davies and the samtools developers (Wellcome Sanger Institute).
- Version used: samtools 1.24.
- License: MIT (samtools). MIT and BSD-3-Clause (HTSlib).
- Cite: Danecek P, Bonfield JK, Liddle J, Marshall J, Ohan V, Pollard MO, et al. Twelve years of SAMtools and BCFtools. GigaScience 10(2):giab008 (2021). https://doi.org/10.1093/gigascience/giab008
- Also: Li H, Handsaker B, Wysoker A, Fennell T, Ruan J, Homer N, et al. The Sequence Alignment/Map format and SAMtools. Bioinformatics 25(16):2078-2079 (2009). https://doi.org/10.1093/bioinformatics/btp352
- HTSlib: Bonfield JK, Marshall J, Danecek P, Li H, Ohan V, Whitwham A, et al. HTSlib: C library for reading/writing high-throughput sequencing data. GigaScience 10(2):giab007 (2021). https://doi.org/10.1093/gigascience/giab007
- Link: https://www.htslib.org
- BibTeX: `danecek2021twelve`, `li2009sequence`, `bonfield2021htslib`

#### BCFtools
- Authors: Petr Danecek and the samtools developers.
- Version used: 1.24.
- License: MIT, or GPL-3.0 if built with the GNU Scientific Library.
- Cite: Danecek P et al. (2021), as above.
- Link: https://samtools.github.io/bcftools/
- BibTeX: `danecek2021twelve`

#### bedtools
- Authors: Aaron R. Quinlan and contributors.
- Version used: 2.31.1.
- License: MIT.
- Cite: Quinlan AR, Hall IM. BEDTools: a flexible suite of utilities for comparing genomic features. Bioinformatics 26(6):841-842 (2010). https://doi.org/10.1093/bioinformatics/btq033
- Link: https://bedtools.readthedocs.io
- BibTeX: `quinlan2010bedtools`

#### FastQC
- Authors: Simon Andrews, Babraham Bioinformatics.
- Version used: 0.13.0.
- License: GPL-3.0-or-later.
- Cite: Andrews S. FastQC: A Quality Control Tool for High Throughput Sequence Data (2010). https://www.bioinformatics.babraham.ac.uk/projects/fastqc/ (no paper, no DOI).
- BibTeX: `andrews2010fastqc`

#### IQ-TREE
- Authors: Bui Quang Minh, Robert Lanfear and the IQ-TREE developers.
- Version used: 3.1.4.
- License: GPL-2.0.
- Cite: Wong TKF, Ly-Trong N, Ren H, Demotte P, Baños H, Roger AJ, et al. IQ-TREE 3: phylogenomic inference software using complex evolutionary models. Molecular Biology and Evolution 43(5):msag117 (2026). https://doi.org/10.1093/molbev/msag117
- Also (version 2, used by the benchmark paper): Minh BQ, Schmidt HA, Chernomor O, Schrempf D, Woodhams MD, von Haeseler A, Lanfear R. IQ-TREE 2: New Models and Efficient Methods for Phylogenetic Inference in the Genomic Era. Molecular Biology and Evolution 37(5):1530-1534 (2020). https://doi.org/10.1093/molbev/msaa015
- IQ-TREE asks users to also cite the papers of the model and the method that they used.
- Link: http://www.iqtree.org
- BibTeX: `wong2026iqtree`, `minh2020iqtree`

#### MAFFT
- Authors: Kazutaka Katoh and Daron M. Standley.
- License: BSD-3-Clause style.
- Cite: Katoh K, Standley DM. MAFFT Multiple Sequence Alignment Software Version 7: Improvements in Performance and Usability. Molecular Biology and Evolution 30(4):772-780 (2013). https://doi.org/10.1093/molbev/mst010
- Link: https://mafft.cbrc.jp/alignment/software/
- BibTeX: `katoh2013mafft`

#### DESeq2
- Authors: Michael I. Love, Simon Anders, Wolfgang Huber.
- Version used: 1.52.0 (Bioconductor).
- License: LGPL-3.0-or-later.
- Cite: Love MI, Huber W, Anders S. Moderated estimation of fold change and dispersion for RNA-seq data with DESeq2. Genome Biology 15(12):550 (2014). https://doi.org/10.1186/s13059-014-0550-8
- Link: https://bioconductor.org/packages/DESeq2
- BibTeX: `love2014moderated`

#### lme4 and lmerTest
- Authors: Douglas Bates, Martin Mächler, Ben Bolker, Steve Walker (lme4). Alexandra Kuznetsova, Per B. Brockhoff, Rune H. B. Christensen (lmerTest).
- Versions used: lme4 2.0-6, lmerTest 3.2-1.
- License: GPL-2.0-or-later (both).
- Cite: Bates D, Mächler M, Bolker B, Walker S. Fitting Linear Mixed-Effects Models Using lme4. Journal of Statistical Software 67(1):1-48 (2015). https://doi.org/10.18637/jss.v067.i01
- Cite: Kuznetsova A, Brockhoff PB, Christensen RHB. lmerTest Package: Tests in Linear Mixed Effects Models. Journal of Statistical Software 82(13):1-26 (2017). https://doi.org/10.18637/jss.v082.i13
- Links: https://github.com/lme4/lme4, https://cran.r-project.org/package=lmerTest
- BibTeX: `bates2015fitting`, `kuznetsova2017lmertest`

#### vegan
- Authors: Jari Oksanen, Gavin L. Simpson, F. Guillaume Blanchet, Roeland Kindt, Pierre Legendre, Peter R. Minchin and others.
- Version used: 2.7-6.
- License: GPL-2.0.
- Cite: Oksanen J, Simpson GL, Blanchet FG, Kindt R, Legendre P, Minchin PR, et al. vegan: Community Ecology Package. R package version 2.7-6 (2026). https://doi.org/10.32614/CRAN.package.vegan
- Link: https://vegandevs.github.io/vegan/
- BibTeX: `oksanen2026vegan`

#### Cardinal
- Authors: Kylie Ariel Bemis, Olga Vitek and contributors.
- Version used: 3.14.0 (Bioconductor).
- License: Artistic-2.0.
- Cite (version 3): Bemis KA, Föll MC, Guo D, Lakkimsetty SS, Vitek O. Cardinal v.3: a versatile open-source software for mass spectrometry imaging analysis. Nature Methods 20(12):1883-1886 (2023). https://doi.org/10.1038/s41592-023-02070-z
- Also (version 1, the benchmark paper): Bemis KD, Harry A, Eberlin LS, Ferreira C, van de Ven SM, Mallick P, et al. Cardinal: an R package for statistical analysis of mass spectrometry-based imaging experiments. Bioinformatics 31(14):2418-2420 (2015). https://doi.org/10.1093/bioinformatics/btv146
- Link: https://cardinalmsi.org
- BibTeX: `bemis2023cardinal`, `bemis2015cardinal`

#### scanpy and anndata
- Authors: F. Alexander Wolf, Philipp Angerer, Fabian J. Theis, Isaac Virshup and the scverse community.
- Version used: scanpy 1.12.4.
- License: BSD-3-Clause (both).
- Cite: Wolf FA, Angerer P, Theis FJ. SCANPY: large-scale single-cell gene expression data analysis. Genome Biology 19(1):15 (2018). https://doi.org/10.1186/s13059-017-1382-0
- Also: Virshup I, Bredikhin D, Heumos L, Palla G, Sturm G, Gayoso A, et al. The scverse project provides a computational ecosystem for single-cell omics data analysis. Nature Biotechnology 41(5):604-606 (2023). https://doi.org/10.1038/s41587-023-01733-8
- anndata: Virshup I, Rybakov S, Theis FJ, Angerer P, Wolf FA. anndata: Access and store annotated data matrices. Journal of Open Source Software 9(101):4371 (2024). https://doi.org/10.21105/joss.04371
- Link: https://scanpy.org
- BibTeX: `wolf2018scanpy`, `virshup2023scverse`, `virshup2024anndata`

#### FlowKit and FlowIO
- Authors: Scott White, Cliburn Chan and contributors.
- Version used: FlowKit 1.3.2.
- License: BSD-3-Clause (both).
- Cite: White S, Quinn J, Enzor J, Staats J, Mosier SM, Almarode J, et al. FlowKit: A Python Toolkit for Integrated Manual and Automated Cytometry Analysis Workflows. Frontiers in Immunology 12:768541 (2021). https://doi.org/10.3389/fimmu.2021.768541
- Links: https://github.com/whitews/FlowKit, https://github.com/whitews/FlowIO
- BibTeX: `white2021flowkit`

#### OpenMS and pyOpenMS
- Authors: The OpenMS developers (OpenMS Inc., University of Tübingen, ETH Zurich, Freie Universität Berlin).
- Versions used: OpenMS command line tools 3.5.0, pyOpenMS 3.6.0.
- License: BSD-3-Clause.
- Cite: Pfeuffer J, Bielow C, Wein S, Jeong K, Netz E, Walter A, et al. OpenMS 3 enables reproducible analysis of large-scale mass spectrometry data. Nature Methods 21(3):365-367 (2024). https://doi.org/10.1038/s41592-024-02197-7
- Also: Röst HL, Sachsenberg T, Aiche S, Bielow C, Weisser H, Aicheler F, et al. OpenMS: a flexible open-source software platform for mass spectrometry data analysis. Nature Methods 13(9):741-748 (2016). https://doi.org/10.1038/nmeth.3959
- pyOpenMS: Röst HL, Schmitt U, Aebersold R, Malmström L. pyOpenMS: A Python-based interface to the OpenMS mass-spectrometry algorithm library. Proteomics 14(1):74-77 (2014). https://doi.org/10.1002/pmic.201300246
- Link: https://www.openms.de
- BibTeX: `pfeuffer2024openms`, `rost2016openms`, `rost2014pyopenms`

#### Sage
- Authors: Michael R. Lazear.
- Version used: 0.14.6.
- License: MIT.
- Cite: Lazear MR. Sage: An Open-Source Tool for Fast Proteomics Searching and Quantification at Scale. Journal of Proteome Research 22(11):3652-3659 (2023). https://doi.org/10.1021/acs.jproteome.3c00486
- Link: https://github.com/lazear/sage
- BibTeX: `lazear2023sage`

#### MZmine
- Authors: The mzmine development team and mzio GmbH.
- Version used: 4.10.90.
- License: the source code is MIT. The official MZmine 4 programs need a user login. mzio gives free licenses to students and staff of academic institutions. Other users, such as companies, contract labs and research institutes, need a paid license from mzio. Cuvette ships no MZmine code, but each user must have a valid MZmine license.
- Cite: Schmid R, Heuckeroth S, Korf A, Smirnov A, Myers O, Dyrlund TS, et al. Integrative analysis of multimodal mass spectrometry data in MZmine 3. Nature Biotechnology 41(4):447-449 (2023). https://doi.org/10.1038/s41587-023-01690-2
- Links: https://mzmine.github.io, https://mzio.io
- BibTeX: `schmid2023integrative`

#### METASPACE
- Authors: Theodore Alexandrov and the METASPACE team.
- Version used: Python client metaspace2020 2.0.9.
- License: Apache-2.0 (client and platform source code).
- Cite: Palmer A, Phapale P, Chernyavsky I, Lavigne R, Fay D, Tarasov A, et al. FDR-controlled metabolite annotation for high-resolution imaging mass spectrometry. Nature Methods 14(1):57-60 (2017). https://doi.org/10.1038/nmeth.4072
- Also: Alexandrov T, Ovchinnikova K, Palmer A, Kovalev V, Tarasov A, Stuart L, et al. METASPACE: A community-populated knowledge base of spatial metabolomes in health and disease. bioRxiv 539478 (2019). https://doi.org/10.1101/539478
- Link: https://metaspace2020.org
- BibTeX: `palmer2017fdr`, `alexandrov2019metaspace`

#### pyimzML
- Authors: Alexandrov team (EMBL) and contributors.
- Version used: 1.5.5.
- License: Apache-2.0.
- Cite the imzML format: Schramm T, Hester Z, Klinkert I, Both JP, Heeren RMA, Brunelle A, et al. imzML — A common data format for the flexible exchange and processing of mass spectrometry imaging data. Journal of Proteomics 75(16):5106-5110 (2012). https://doi.org/10.1016/j.jprot.2012.07.026
- Link: https://github.com/alexandrovteam/pyimzML
- BibTeX: `schramm2012imzml`

#### SMILE MSI
- Authors: The SMILE MSI authors (Parker Smith).
- Version used: 2.0.0.
- License: Apache-2.0.
- Link: https://github.com/elparko/SMILE-MSI

#### ImageJ and Fiji
- Authors: Wayne Rasband (ImageJ, US National Institutes of Health). Johannes Schindelin, Albert Cardona and the Fiji contributors.
- Version tested: ImageJ 1.53k.
- License: ImageJ 1.x is public domain. Fiji is GPL-3.0.
- Cite: Schneider CA, Rasband WS, Eliceiri KW. NIH Image to ImageJ: 25 years of image analysis. Nature Methods 9(7):671-675 (2012). https://doi.org/10.1038/nmeth.2089
- Fiji: Schindelin J, Arganda-Carreras I, Frise E, Kaynig V, Longair M, Pietzsch T, et al. Fiji: an open-source platform for biological-image analysis. Nature Methods 9(7):676-682 (2012). https://doi.org/10.1038/nmeth.2019
- Links: https://imagej.net/ij/, https://fiji.sc
- BibTeX: `schneider2012nih`, `schindelin2012fiji`

#### QuPath
- Authors: Peter Bankhead and the QuPath developers.
- Version used: 0.7.0.
- License: GPL-3.0-or-later.
- Cite: Bankhead P, Loughrey MB, Fernández JA, Dombrowski Y, McArt DG, Dunne PD, et al. QuPath: Open source software for digital pathology image analysis. Scientific Reports 7(1):16878 (2017). https://doi.org/10.1038/s41598-017-17204-5
- Link: https://qupath.github.io
- BibTeX: `bankhead2017qupath`

#### CellProfiler
- Authors: The CellProfiler team, Broad Institute (Anne E. Carpenter, Beth A. Cimini and others).
- Version used: 4.2.8.
- License: BSD-3-Clause (program, Copyright 2003-2021 Broad Institute). The example pipelines are BSD-3-Clause, Copyright (c) 2017, CellProfiler.
- Cite: Stirling DR, Swain-Bowden MJ, Lucas AM, Carpenter AE, Cimini BA, Goodman A. CellProfiler 4: improvements in speed, utility and usability. BMC Bioinformatics 22(1):433 (2021). https://doi.org/10.1186/s12859-021-04344-9
- Link: https://cellprofiler.org
- Derived file: `catalog/cellprofiler/templates/nuclei.cppipe` is derived from `ExampleFly/ExampleFly.cppipe` in https://github.com/CellProfiler/examples. Copyright (c) 2017, CellProfiler. BSD-3-Clause, text in `LICENSES/BSD-3-Clause.txt`.
- BibTeX: `stirling2021cellprofiler`

#### Cellpose
- Authors: Carsen Stringer, Marius Pachitariu and contributors (HHMI Janelia).
- Version used: 4.2.1.1.
- License: BSD-3-Clause (code). The Cellpose README states that the models are trained on data under CC BY-NC licenses. Cellpose downloads the model weights at run time. Cuvette ships no weights. Commercial users must check the model terms.
- Cite: Pachitariu M, Rariden M, Stringer C. Cellpose-SAM: superhuman generalization for cellular segmentation. bioRxiv (2025). https://doi.org/10.1101/2025.04.28.651001
- Also: Stringer C, Wang T, Michaelos M, Pachitariu M. Cellpose: a generalist algorithm for cellular segmentation. Nature Methods 18(1):100-106 (2021). https://doi.org/10.1038/s41592-020-01018-x
- Link: https://www.cellpose.org
- BibTeX: `pachitariu2025cellpose`, `stringer2021cellpose`

#### scikit-image
- Authors: The scikit-image developers.
- Version used: 0.26.0.
- License: BSD-3-Clause.
- Cite: van der Walt S, Schönberger JL, Nunez-Iglesias J, Boulogne F, Warner JD, Yager N, et al. scikit-image: image processing in Python. PeerJ 2:e453 (2014). https://doi.org/10.7717/peerj.453
- Link: https://scikit-image.org
- BibTeX: `vanderwalt2014scikitimage`

#### Bio-Formats command line tools (bftools)
- Authors: The Open Microscopy Environment (OME) consortium.
- Version used: 8.5.0.
- License: GPL-2.0-or-later (some components BSD-2-Clause).
- Cite: Linkert M, Rueden CT, Allan C, Burel JM, Moore W, Patterson A, et al. Metadata matters: access to image data in the real world. Journal of Cell Biology 189(5):777-782 (2010). https://doi.org/10.1083/jcb.201004104
- Link: https://www.openmicroscopy.org/bio-formats/
- BibTeX: `linkert2010metadata`

#### GDAL
- Authors: GDAL/OGR contributors (Even Rouault, Frank Warmerdam, Kurt Schwehr and others), Open Source Geospatial Foundation.
- Version used: 3.13.3.
- License: MIT.
- Cite: GDAL/OGR contributors. GDAL/OGR Geospatial Data Abstraction software Library. Open Source Geospatial Foundation (2026). https://doi.org/10.5281/zenodo.5884351
- Link: https://gdal.org
- BibTeX: `gdal2026gdal`

#### QGIS
- Authors: QGIS.org and the QGIS Association.
- Version used: 4.2.3.
- License: GPL-2.0-or-later.
- Cite: QGIS.org. QGIS Geographic Information System. QGIS Association (2026). https://doi.org/10.5281/zenodo.6139224
- Also: Graser A, Sutton T, Bernasocchi M. The QGIS project: Spatial without compromise. Patterns 6(7):101265 (2025). https://doi.org/10.1016/j.patter.2025.101265
- Link: https://qgis.org
- BibTeX: `qgis2026qgis`, `graser2025qgis`

#### astropy and photutils
- Authors: The Astropy Collaboration. Larry Bradley and the Photutils developers.
- Versions used: astropy 8.0.1, photutils 3.0.0.
- License: BSD-3-Clause (both).
- Cite: Astropy Collaboration, Price-Whelan AM, Lim PL, Earl N, Starkman N, Bradley L, et al. The Astropy Project: Sustaining and Growing a Community-oriented Open-source Project and the Latest Major Release (v5.0) of the Core Package. The Astrophysical Journal 935(2):167 (2022). https://doi.org/10.3847/1538-4357/ac7c74
- Astropy asks for the 2013 and 2018 papers too: A&A 558:A33 (2013), https://doi.org/10.1051/0004-6361/201322068; AJ 156(3):123 (2018), https://doi.org/10.3847/1538-3881/aabc4f
- photutils: Bradley L, Sipőcz BM, Robitaille TP, Tollerud EJ, et al. Photutils 3.0.0. Zenodo (2026). https://doi.org/10.5281/zenodo.596036
- Links: https://www.astropy.org, https://photutils.readthedocs.io
- BibTeX: `astropy2022astropy`, `astropy2018astropy`, `astropy2013astropy`, `bradley2026photutils`

#### MNE-Python
- Authors: Alexandre Gramfort, Eric Larson and the MNE developers.
- Version tested: 1.13.2.
- License: BSD-3-Clause.
- Cite: Gramfort A, Luessi M, Larson E, Engemann DA, Strohmeier D, Brodbeck C, et al. MEG and EEG data analysis with MNE-Python. Frontiers in Neuroscience 7:267 (2013). https://doi.org/10.3389/fnins.2013.00267
- Also: Gramfort A, Luessi M, Larson E, Engemann DA, Strohmeier D, Brodbeck C, et al. MNE software for processing MEG and EEG data. NeuroImage 86:446-460 (2014). https://doi.org/10.1016/j.neuroimage.2013.10.027
- Link: https://mne.tools
- BibTeX: `gramfort2013meg`, `gramfort2014mne`

#### MDAnalysis
- Authors: Oliver Beckstein and the MDAnalysis developers.
- Version tested: 2.10.0.
- License: LGPL-3.0-or-later (package and test data, MDAnalysis 2.x).
- Cite: Michaud-Agrawal N, Denning EJ, Woolf TB, Beckstein O. MDAnalysis: A toolkit for the analysis of molecular dynamics simulations. Journal of Computational Chemistry 32(10):2319-2327 (2011). https://doi.org/10.1002/jcc.21787
- Cite: Gowers RJ, Linke M, Barnoud J, Reddy TJE, Melo MN, Seyler SL, et al. MDAnalysis: A Python Package for the Rapid Analysis of Molecular Dynamics Simulations. Proceedings of the 15th Python in Science Conference, 98-105 (2016). https://doi.org/10.25080/Majora-629e541a-00e
- Link: https://www.mdanalysis.org
- BibTeX: `michaudagrawal2011mdanalysis`, `gowers2016mdanalysis`

#### Biopython
- Authors: The Biopython contributors.
- License: Biopython License Agreement, or BSD-3-Clause for files that state it.
- Cite: Cock PJA, Antao T, Chang JT, Chapman BA, Cox CJ, Dalke A, et al. Biopython: freely available Python tools for computational molecular biology and bioinformatics. Bioinformatics 25(11):1422-1423 (2009). https://doi.org/10.1093/bioinformatics/btp163
- Bio.PDB: Hamelryck T, Manderick B. PDB file parser and structure class implemented in Python. Bioinformatics 19(17):2308-2310 (2003). https://doi.org/10.1093/bioinformatics/btg299
- Link: https://biopython.org
- BibTeX: `cock2009biopython`, `hamelryck2003pdb`

#### RDKit
- Authors: Greg Landrum and the RDKit contributors.
- Version used: 2026.03.6.
- License: BSD-3-Clause.
- Cite: RDKit: Open-source cheminformatics. https://www.rdkit.org. https://doi.org/10.5281/zenodo.591637 (the project has no paper).
- BibTeX: `landrum2026rdkit`

#### Open Babel
- Authors: Noel M. O'Boyle, Geoffrey R. Hutchison and the Open Babel developers.
- Version used: 3.2.1.
- License: GPL-2.0-only. Cuvette only starts the program. Do not copy Open Babel code into Cuvette, because GPL-2.0-only code cannot be combined with AGPL-3.0 code.
- Cite: O'Boyle NM, Banck M, James CA, Morley C, Vandermeersch T, Hutchison GR. Open Babel: An open chemical toolbox. Journal of Cheminformatics 3:33 (2011). https://doi.org/10.1186/1758-2946-3-33
- Link: https://openbabel.org
- BibTeX: `oboyle2011open`

#### statsmodels, pingouin and lifelines
- Versions used: statsmodels 0.15.0, pingouin 0.7.0, lifelines 0.30.3.
- License: BSD-3-Clause (statsmodels), GPL-3.0 (pingouin), MIT (lifelines).
- Cite: Seabold S, Perktold J. Statsmodels: Econometric and Statistical Modeling with Python. Proceedings of the 9th Python in Science Conference, 92-96 (2010). https://doi.org/10.25080/Majora-92bf1922-011
- Cite: Vallat R. Pingouin: statistics in Python. Journal of Open Source Software 3(31):1026 (2018). https://doi.org/10.21105/joss.01026
- Cite: Davidson-Pilon C. lifelines: survival analysis in Python. Journal of Open Source Software 4(40):1317 (2019). https://doi.org/10.21105/joss.01317
- Links: https://www.statsmodels.org, https://pingouin-stats.org, https://lifelines.readthedocs.io
- BibTeX: `seabold2010statsmodels`, `vallat2018pingouin`, `davidsonpilon2019lifelines`

### Python libraries used by workers and figure scripts

| Library | License | Cite | Link |
|---|---|---|---|
| NumPy | BSD-3-Clause and others (0BSD, MIT, Zlib, CC0-1.0 for parts) | Harris CR et al. Nature 585:357-362 (2020). https://doi.org/10.1038/s41586-020-2649-2 (`harris2020array`) | https://numpy.org |
| SciPy | BSD-3-Clause | Virtanen P et al. Nature Methods 17:261-272 (2020). https://doi.org/10.1038/s41592-019-0686-2 (`virtanen2020scipy`) | https://scipy.org |
| pandas | BSD-3-Clause | McKinney W. Proc 9th Python in Science Conf, 56-61 (2010). https://doi.org/10.25080/Majora-92bf1922-00a (`mckinney2010data`) | https://pandas.pydata.org |
| Matplotlib | Matplotlib License (based on the PSF license) | Hunter JD. Computing in Science & Engineering 9(3):90-95 (2007). https://doi.org/10.1109/MCSE.2007.55 (`hunter2007matplotlib`) | https://matplotlib.org |
| GeoPandas | BSD-3-Clause | Fleischmann M et al. Computers, Environment and Urban Systems 130:102495 (2026). https://doi.org/10.1016/j.compenvurbsys.2026.102495 (`fleischmann2026geopandas`) | https://geopandas.org |
| Shapely | BSD-3-Clause | https://doi.org/10.5281/zenodo.5597138 (`gillies2026shapely`) | https://shapely.readthedocs.io |
| pyproj | MIT | https://doi.org/10.5281/zenodo.2592232 (`snow2026pyproj`) | https://pyproj4.github.io/pyproj |
| rasterio | BSD-3-Clause | none requested | https://rasterio.readthedocs.io |
| rasterstats | BSD-3-Clause | none requested | https://github.com/perrygeo/python-rasterstats |
| Pillow | MIT-CMU | none requested | https://python-pillow.org |
| tifffile | BSD-3-Clause | none requested | https://github.com/cgohlke/tifffile |
| PyYAML | MIT | none requested | https://pyyaml.org |
| rdata | MIT | Ramos-Carreño C, Rossi T. JOSS 9(104):7540 (2024). https://doi.org/10.21105/joss.07540 (`ramoscarreno2024rdata`) | https://github.com/vnmabus/rdata |
| MCP Python SDK (`mcp`) | MIT (Copyright 2024 Anthropic, PBC) | none requested | https://github.com/modelcontextprotocol/python-sdk |
| PySide6 | LGPL-3.0-only, GPL-2.0-only or GPL-3.0-only | none requested | https://doc.qt.io/qtforpython |

### Node.js packages

Cuvette runs on Node.js. `package.json` lists these direct dependencies.

| Package | Version | License |
|---|---|---|
| @anthropic-ai/sdk | 0.132.1 | MIT |
| @modelcontextprotocol/sdk | 1.32.1 | MIT |
| ink | 8.0.0 | MIT |
| ink-text-input | 6.0.0 | MIT |
| react | 19.3.0 | MIT |
| yaml | 2.9.1 | ISC |
| zod | 4.6.5 | MIT |

Development only: typescript 7.0.2 (Apache-2.0), esbuild 0.28.2, tsx 4.23.15, vitest 5.0.3, @types/node and @types/react (all MIT).

All 259 packages in `package-lock.json` have licenses that permit distribution with AGPL-3.0 code: MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, Unlicense (fast-sha256), and MIT or CC0-1.0 (type-fest). The 12 MPL-2.0 packages (lightningcss) are development tools only.

### Programs in the example adapters

- pandoc (`examples/adapters/pandoc-md`): John MacFarlane and contributors. GPL-2.0-or-later. https://pandoc.org
- GNU coreutils `wc` (`examples/adapters/wc-text`): GPL-3.0-or-later. https://www.gnu.org/software/coreutils/

### Fonts

- Inter, by Rasmus Andersson and the Inter Project Authors. SIL Open Font License 1.1. The benchmark site generator (`src/bench/papers-site.ts`) loads it from Google Fonts. The repository ships no font file. https://rsms.me/inter/
- Source Serif 4, by the Source Serif 4 Project Authors (Adobe). SIL Open Font License 1.1. The wordmark in `docs/images/logo.svg` and on the site is drawn from its outlines (weight 560). The repository ships no font file. https://github.com/adobe-fonts/source-serif

## Datasets

`DATA_LICENSES.md` lists every data file, its license and its changes. These datasets need a citation or an attribution.

- **10x Genomics PBMC 3k.** 3k PBMCs from a Healthy Donor. 10x Genomics (2016). CC BY 4.0. https://www.10xgenomics.com/datasets/3-k-pbm-cs-from-a-healthy-donor-1-standard-1-1-0
- **QuPath workshop images.** Pécot T. Whole-Slide Image Analysis and Quantitative Pathology with QuPath. Zenodo (2022). CC BY 4.0. https://doi.org/10.5281/zenodo.6390370 (BibTeX: `pecot2022whole`)
- **NuInsSeg.** Mahbod A, Polak C, Feldmann K, Khan R, Gelles K, Dorffner G, et al. Zenodo (2024). CC BY 4.0. https://doi.org/10.5281/zenodo.10518968 (BibTeX: `mahbod2024nuinssegdata`)
- **UniProt.** The UniProt Consortium. Nucleic Acids Research 53(D1):D609-D617 (2025). CC BY 4.0. https://doi.org/10.1093/nar/gkae1010 (BibTeX: `uniprot2025uniprot`)
- **BBBC005 and BBBC039.** Broad Bioimage Benchmark Collection. CC0 1.0. Cite Ljosa et al. (2012) and Caicedo et al. (2019). https://bbbc.broadinstitute.org
- **1000 Genomes Project, 30x panel.** Byrska-Bishop M, Evani US, Zhao X, Basile AO, Abel HJ, Regier AA, et al. High-coverage whole-genome sequencing of the expanded 1000 Genomes Project cohort including 602 trios. Cell 185(18):3426-3440.e19 (2022). https://doi.org/10.1016/j.cell.2022.08.004 (BibTeX: `byrskabishop2022high`)
- **PDB 4AKE.** Müller CW, Schlauderer GJ, Reinstein J, Schulz GE. Adenylate kinase motions during catalysis: an energetic counterweight balancing substrate binding. Structure 4(2):147-156 (1996). https://doi.org/10.1016/S0969-2126(96)00018-4. wwPDB: Berman H, Henrick K, Nakamura H. Nature Structural Biology 10(12):980 (2003). https://doi.org/10.1038/nsb1203-980 (BibTeX: `muller1996adenylate`, `berman2003announcing`)
- **CardinalWorkflows `pig206`.** Bemis KA. CardinalWorkflows 1.44.0. Bioconductor. Artistic-2.0. https://doi.org/10.18129/B9.bioc.CardinalWorkflows (BibTeX: `bemis2026cardinalworkflows`)
- **airway.** Love M. airway 1.32.0. Bioconductor. LGPL. https://doi.org/10.18129/B9.bioc.airway. Experiment: Himes et al. (2014). (BibTeX: `love2026airway`, `himes2014rnaseq`)
- **Gating-ML 2.0 compliance files.** Copyright (c) 2012 ISAC (International Society for Advancement of Cytometry). Distribution of unmodified copies permitted. Notice in `DATA_LICENSES.md`.
- **ImageJ sample image "Blobs".** NIH. Public domain. https://imagej.net/ij/images/blobs.gif
- **Natural Earth.** Public domain. https://www.naturalearthdata.com
- **METASPACE public datasets** 2022-08-16_10h14m23s and 2022-08-16_12h31m33s, submitted by the Ellis group. Michael JA, Mutuku SM, Ucur B, Sarretto T, Maccarone AT, Niehaus M, et al. Analytical Chemistry 94(50):17494-17503 (2022). https://doi.org/10.1021/acs.analchem.2c03745 (BibTeX: `michael2022mass`)
- **MetaboLights MTBLS313 and MTBLS317.** EMBL-EBI. Data of Palmer et al. (2017). https://www.ebi.ac.uk/metabolights/MTBLS313
- Test data from the source repositories of samtools, bedtools, Sage, OpenMS, pyimzML, GDAL, FlowKit, lifelines, IQ-TREE, vegan, lme4, MDAnalysis and photutils. Each one keeps the license of its project. See `DATA_LICENSES.md`.

## Benchmark papers

The paper benchmark (`bench/papers/`, `docs/benchmark-papers.md`) checks whether Cuvette can reproduce numbers from 29 published studies. The 28 folders with a `bench.yaml` are scored. `bankhead2017-qupath-workshop` has notes only.

How the repository uses the papers:
- `paper.md` gives the citation, the data, the method steps and the numbers in the project's own words.
- `expected.yaml` holds single numbers and facts. Numbers and facts are not protected by copyright.
- The repository copies no paper text beyond short phrases, no tables and no figure images.
- `figure.py` draws new figures from the output of each benchmark run. It does not copy a figure of a paper.

Each entry gives the citation, the license of the article, the data and the data license.

1. **alexandrov2019-metaspace.** Alexandrov T, Ovchinnikova K, Palmer A, Kovalev V, Tarasov A, Stuart L, et al. METASPACE: A community-populated knowledge base of spatial metabolomes in health and disease. bioRxiv 539478 (2019). https://doi.org/10.1101/539478. Article: CC BY 4.0 (preprint). Data: METASPACE datasets of Michael et al. (2022); license not verified. BibTeX: `alexandrov2019metaspace`, `michael2022mass`.
2. **andrews-fastqc.** Andrews S. FastQC: A Quality Control Tool for High Throughput Sequence Data (2010). https://www.bioinformatics.babraham.ac.uk/projects/fastqc/. No paper. Data: FastQC example files; no license stated. BibTeX: `andrews2010fastqc`.
3. **bankhead2017-qupath-workshop.** Bankhead P, Loughrey MB, Fernández JA, Dombrowski Y, McArt DG, Dunne PD, et al. QuPath: Open source software for digital pathology image analysis. Scientific Reports 7(1):16878 (2017). https://doi.org/10.1038/s41598-017-17204-5. Article: CC BY 4.0. Data: Pécot T, Zenodo 6390370; CC BY 4.0. BibTeX: `bankhead2017qupath`, `pecot2022whole`.
4. **bates2015-lme4-sleepstudy.** Bates D, Mächler M, Bolker B, Walker S. Fitting Linear Mixed-Effects Models Using lme4. Journal of Statistical Software 67(1):1-48 (2015). https://doi.org/10.18637/jss.v067.i01. Article: CC BY. Data: lme4 `sleepstudy`; GPL-2.0-or-later. BibTeX: `bates2015fitting`.
5. **belenky2003-sleepstudy.** Belenky G, Wesensten NJ, Thorne DR, Thomas ML, Sing HC, Redmond DP, et al. Patterns of performance degradation and restoration during sleep restriction and subsequent recovery: a sleep dose-response study. Journal of Sleep Research 12(1):1-12 (2003). https://doi.org/10.1046/j.1365-2869.2003.00337.x. Article: closed. Data: lme4 `sleepstudy` through Rdatasets; GPL-2.0-or-later. BibTeX: `belenky2003patterns`.
6. **bemis2015-cardinal.** Bemis KD, Harry A, Eberlin LS, Ferreira C, van de Ven SM, Mallick P, et al. Cardinal: an R package for statistical analysis of mass spectrometry-based imaging experiments. Bioinformatics 31(14):2418-2420 (2015). https://doi.org/10.1093/bioinformatics/btv146. Article: CC BY 4.0. Data: CardinalWorkflows `pig206`; Artistic-2.0. BibTeX: `bemis2015cardinal`, `bemis2026cardinalworkflows`.
7. **bradley-photutils-100gaussians.** Bradley L, Sipőcz BM, Robitaille TP, Tollerud EJ, et al. Photutils 3.0.0. Zenodo (2026). https://doi.org/10.5281/zenodo.596036. Also the three Astropy papers. Software: BSD-3-Clause. Data: simulated by photutils. BibTeX: `bradley2026photutils`, `astropy2013astropy`, `astropy2018astropy`, `astropy2022astropy`.
8. **caicedo2019-bbbc039.** Caicedo JC, Roth J, Goodman A, Becker T, Karhohs KW, Broisin M, et al. Evaluation of Deep Learning Strategies for Nucleus Segmentation in Fluorescence Images. Cytometry Part A 95(9):952-965 (2019). https://doi.org/10.1002/cyto.a.23863. Article: CC BY-NC 4.0. Data: BBBC039v1; CC0 1.0. BibTeX: `caicedo2019evaluation`.
9. **danecek2021-bcftools.** Danecek P, Bonfield JK, Liddle J, Marshall J, Ohan V, Pollard MO, et al. Twelve years of SAMtools and BCFtools. GigaScience 10(2):giab008 (2021). https://doi.org/10.1093/gigascience/giab008. Article: CC BY 4.0. Data: 1000 Genomes 30x panel slice; open access. BibTeX: `danecek2021twelve`, `byrskabishop2022high`.
10. **delaney2004-esol.** Delaney JS. ESOL: Estimating Aqueous Solubility Directly from Molecular Structure. Journal of Chemical Information and Computer Sciences 44(3):1000-1005 (2004). https://doi.org/10.1021/ci034243x. Rule of five: Lipinski CA, Lombardo F, Dominy BW, Feeney PJ. Experimental and computational approaches to estimate solubility and permeability in drug discovery and development settings. Advanced Drug Delivery Reviews 23(1-3):3-25 (1997). https://doi.org/10.1016/S0169-409X(96)00423-1. Articles: closed. Data: DeepChem `delaney-processed.csv`; the license of the original values is not stated. BibTeX: `delaney2004esol`, `lipinski1997experimental`.
11. **gowers2016-mdanalysis.** Gowers RJ, Linke M, Barnoud J, Reddy TJE, Melo MN, Seyler SL, et al. MDAnalysis: A Python Package for the Rapid Analysis of Molecular Dynamics Simulations. Proceedings of the 15th Python in Science Conference, 98-105 (2016). https://doi.org/10.25080/Majora-629e541a-00e. Also Michaud-Agrawal et al. (2011), Cock et al. (2009), Hamelryck and Manderick (2003). Article: CC BY. Data: MDAnalysisTests AdK files, LGPL-3.0-or-later; PDB 1AKE and 4AKE, CC0 1.0. BibTeX: `gowers2016mdanalysis`, `michaudagrawal2011mdanalysis`, `cock2009biopython`, `hamelryck2003pdb`.
12. **gramfort2013-mne-sample.** Gramfort A, Luessi M, Larson E, Engemann DA, Strohmeier D, Brodbeck C, et al. MEG and EEG data analysis with MNE-Python. Frontiers in Neuroscience 7:267 (2013). https://doi.org/10.3389/fnins.2013.00267. Also Gramfort et al., NeuroImage 86:446-460 (2014). Article: CC BY. Data: MNE sample dataset; no license stated. BibTeX: `gramfort2013meg`, `gramfort2014mne`.
13. **lazear2023-sage.** Lazear MR. Sage: An Open-Source Tool for Fast Proteomics Searching and Quantification at Scale. Journal of Proteome Research 22(11):3652-3659 (2023). https://doi.org/10.1021/acs.jproteome.3c00486. Article: closed. Data: OpenMS BSA example files; BSD-3-Clause. BibTeX: `lazear2023sage`.
14. **li2009-samtools.** Li H, Handsaker B, Wysoker A, Fennell T, Ruan J, Homer N, et al. The Sequence Alignment/Map format and SAMtools. Bioinformatics 25(16):2078-2079 (2009). https://doi.org/10.1093/bioinformatics/btp352. Article: CC BY-NC 2.0 UK. Data: samtools `examples/`; MIT. BibTeX: `li2009sequence`.
15. **ljosa2012-bbbc005.** Ljosa V, Sokolnicki KL, Carpenter AE. Annotated high-throughput microscopy image sets for validation. Nature Methods 9(7):637 (2012). https://doi.org/10.1038/nmeth.2083. Results file: Bray MA, Fraser AN, Hasaka TP, Carpenter AE. Workflow and Metrics for Image Quality Control in Large-Scale High-Content Screens. Journal of Biomolecular Screening 17(2):266-274 (2012). https://doi.org/10.1177/1087057111420292. Data: BBBC005v1; CC0 1.0. BibTeX: `ljosa2012annotated`, `bray2012workflow`.
16. **love2014-deseq2-airway.** Love MI, Huber W, Anders S. Moderated estimation of fold change and dispersion for RNA-seq data with DESeq2. Genome Biology 15(12):550 (2014). https://doi.org/10.1186/s13059-014-0550-8. Data paper: Himes BE, Jiang X, Wagner P, Hu R, Wang Q, Klanderman B, et al. PLoS ONE 9(6):e99625 (2014). https://doi.org/10.1371/journal.pone.0099625. Workflow: Love MI, Anders S, Kim V, Huber W. RNA-Seq workflow: gene-level exploratory analysis and differential expression. F1000Research 4:1070 (2016, version 2). https://doi.org/10.12688/f1000research.7035.2. Articles: CC BY 4.0. Data: Bioconductor airway; LGPL. BibTeX: `love2014moderated`, `himes2014rnaseq`, `love2016rnaseq`, `love2026airway`.
17. **mahbod2024-nuinsseg.** Mahbod A, Polak C, Feldmann K, Khan R, Gelles K, Dorffner G, et al. NuInsSeg: A fully annotated dataset for nuclei instance segmentation in H&E-stained histological images. Scientific Data 11(1):295 (2024). https://doi.org/10.1038/s41597-024-03117-2. Article: CC BY 4.0. Data: Zenodo 10518968; CC BY 4.0. BibTeX: `mahbod2024nuinsseg`, `mahbod2024nuinssegdata`.
18. **minh2020-iqtree2.** Minh BQ, Schmidt HA, Chernomor O, Schrempf D, Woodhams MD, von Haeseler A, Lanfear R. IQ-TREE 2: New Models and Efficient Methods for Phylogenetic Inference in the Genomic Era. Molecular Biology and Evolution 37(5):1530-1534 (2020). https://doi.org/10.1093/molbev/msaa015. Also Katoh and Standley (2013). Article: CC BY 4.0. Data: IQ-TREE `example.phy`; GPL-2.0. BibTeX: `minh2020iqtree`, `katoh2013mafft`.
19. **oksanen-vegan-dune.** Oksanen J, Simpson GL, Blanchet FG, Kindt R, Legendre P, Minchin PR, et al. vegan: Community Ecology Package. R package version 2.7-6 (2026). https://doi.org/10.32614/CRAN.package.vegan. Data: Jongman RHG, ter Braak CJF, van Tongeren OFR. Data Analysis in Community and Landscape Ecology. Pudoc, Wageningen (1987). Software and data: GPL-2.0. BibTeX: `oksanen2026vegan`, `jongman1987data`.
20. **palmer2017-metaspace-fdr.** Palmer A, Phapale P, Chernyavsky I, Lavigne R, Fay D, Tarasov A, et al. FDR-controlled metabolite annotation for high-resolution imaging mass spectrometry. Nature Methods 14(1):57-60 (2017). https://doi.org/10.1038/nmeth.4072. Article: closed. Data: MetaboLights MTBLS313 and MTBLS317; EMBL-EBI terms of use. BibTeX: `palmer2017fdr`.
21. **quinlan2010-bedtools.** Quinlan AR, Hall IM. BEDTools: a flexible suite of utilities for comparing genomic features. Bioinformatics 26(6):841-842 (2010). https://doi.org/10.1093/bioinformatics/btq033. Article: CC BY-NC 2.0 UK. Data: bedtools2 `data/`; MIT. BibTeX: `quinlan2010bedtools`.
22. **rossi1980-recidivism.** Rossi PH, Berk RA, Lenihan KJ. Money, Work, and Crime: Experimental Evidence. Academic Press, New York (1980). ISBN 978-0-12-598240-5. Method: Fox J, Weisberg S. An R Companion to Applied Regression, 3rd edition. Sage (2019), online appendix "Cox Proportional-Hazards Regression for Survival Data in R". Data: lifelines `rossi.csv`; MIT. BibTeX: `rossi1980money`, `fox2019r`.
23. **rost2016-openms.** Röst HL, Sachsenberg T, Aiche S, Bielow C, Weisser H, Aicheler F, et al. OpenMS: a flexible open-source software platform for mass spectrometry data analysis. Nature Methods 13(9):741-748 (2016). https://doi.org/10.1038/nmeth.3959. Article: closed. Data: OpenMS tutorial data, Tübingen archive; no license stated. BibTeX: `rost2016openms`.
24. **rouault-gdal-autotest.** GDAL/OGR contributors (Rouault E, Warmerdam F, Schwehr K, et al.). GDAL 3.13.3. Zenodo (2026). https://doi.org/10.5281/zenodo.5884351. Software: MIT. Data: GDAL `byte.tif`, MIT; Natural Earth, public domain. BibTeX: `gdal2026gdal`.
25. **schindelin2012-fiji-blobs.** Schindelin J, Arganda-Carreras I, Frise E, Kaynig V, Longair M, Pietzsch T, et al. Fiji: an open-source platform for biological-image analysis. Nature Methods 9(7):676-682 (2012). https://doi.org/10.1038/nmeth.2019. Article: closed. Data: ImageJ `blobs.gif`; public domain. BibTeX: `schindelin2012fiji`.
26. **schramm2012-imzml-pyimzml.** Schramm T, Hester Z, Klinkert I, Both JP, Heeren RMA, Brunelle A, et al. imzML — A common data format for the flexible exchange and processing of mass spectrometry imaging data. Journal of Proteomics 75(16):5106-5110 (2012). https://doi.org/10.1016/j.jprot.2012.07.026. Article: closed. Data: pyimzML `tests/data`; Apache-2.0. BibTeX: `schramm2012imzml`.
27. **student1908-sleep.** Student. The Probable Error of a Mean. Biometrika 6(1):1-25 (1908). https://doi.org/10.2307/2331554. Data: Cushny AR, Peebles AR. The action of optical isomers: II. Hyoscines. The Journal of Physiology 32(5-6):501-510 (1905). https://doi.org/10.1113/jphysiol.1905.sp001097. Both articles are public domain by age. Data: R `datasets::sleep` through Rdatasets. BibTeX: `student1908probable`, `cushny1905action`.
28. **white2021-flowkit.** White S, Quinn J, Enzor J, Staats J, Mosier SM, Almarode J, et al. FlowKit: A Python Toolkit for Integrated Manual and Automated Cytometry Analysis Workflows. Frontiers in Immunology 12:768541 (2021). https://doi.org/10.3389/fimmu.2021.768541. Article: CC BY 4.0. Data: FlowKit `data/`, BSD-3-Clause; ISAC Gating-ML files, ISAC notice. BibTeX: `white2021flowkit`.
29. **wolf2018-scanpy.** Wolf FA, Angerer P, Theis FJ. SCANPY: large-scale single-cell gene expression data analysis. Genome Biology 19(1):15 (2018). https://doi.org/10.1186/s13059-017-1382-0. Article: CC BY 4.0. Data: 10x Genomics PBMC 3k; CC BY 4.0. BibTeX: `wolf2018scanpy`.
