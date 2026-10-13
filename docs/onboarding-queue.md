# Onboarding queue

This file lists the open-source tools to onboard next. It shows the order, the install status, the
benchmark papers, and the next action for each tool. Date of the checks: 2026-10-08. Machine: macOS
arm64 (Apple silicon).

## Storage

- On the computer of the author, large things are on the external drive of the author:
  `/Volumes/T7/guided-analysis/` with `tools/<tool>/` and `data/<paper-id>/`. Other users set
  `CUVETTE_DRIVE_ROOT` to their own folder.
- The T7 drive uses exFAT. Symlinks work. Some Python wheels fail to install there because of
  `._` files (error: `failed to rename ... ._ttx.1`). The venvs for the tools below are in
  `~/.cuvette/envs/<tool>/`. Other venvs from the paper-preparation runs also exist in
  `tools/` on T7. They are not part of the queue.
- Download totals: all paper data is 8.0 GB. The largest sets are NuInsSeg (3.1 GB), BBBC005 (2.6 GB)
   and the OpenMS tutorial set (1.2 GB). The limit is 60 GB.
- Each paper has `fetch.sh` in `bench/papers/<paper-id>/` that downloads its data again.

## Queue

Order: easiest and most useful first. "Verified" means the tool ran one command on this machine.

| # | Tool | Kind | Status | Install path | Papers (bench/papers/) | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | scikit-image 0.26.0 | python | Installed and verified | `~/.cuvette/envs/skimage` | `mahbod2024-nuinsseg`, `schindelin2012-fiji-blobs` (check in python) | Write wrapper functions for threshold, label, regionprops. |
| 2 | scanpy 1.12.4 | python | Installed and verified | `~/.cuvette/envs/scanpy` | `wolf2018-scanpy` | Write the PBMC 3k tutorial as the first known-answer test. |
| 3 | samtools 1.24 | cli | Installed and verified | `/opt/homebrew/bin/samtools` | `li2009-samtools` | Write checked-argument tools for view, sort, index, flagstat. |
| 4 | FastQC 0.13.0 | cli | Installed and verified | `/opt/homebrew/bin/fastqc` | `andrews-fastqc` | Parse `fastqc_data.txt` for module status. |
| 5 | pyimzML 1.5.5 | python | Installed and verified | `~/.cuvette/envs/pyimzml` | `schramm2012-imzml-pyimzml` | Add a reader for imzML so the agent can inspect any MSI file. |
| 6 | pyOpenMS 3.6.0 | python | Installed and verified | `~/.cuvette/envs/pyopenms` | `rost2016-openms` | Run feature finding on the tutorial mzML files. |
| 7 | RDKit 2026.03.6 | python | Installed and verified | `~/.cuvette/envs/rdkit` | `delaney2004-esol` | Write descriptor and rule-of-five tools. |
| 8 | METASPACE client 2.0.9 | http and python | Installed and verified (network call) | `~/.cuvette/envs/metaspace` | `palmer2017-metaspace-fdr`, `alexandrov2019-metaspace` | Make an API key. Write dataset search and annotation download tools. |
| 9 | Cellpose 4.2.1.1 | python and cli | Installed and verified | `~/.cuvette/envs/cellpose` | none yet (run on `caicedo2019-bbbc039`) | Run on BBBC039 and compare object counts. |
| 10 | Bio-Formats bftools 8.5.0 | cli | Installed and verified | `/Volumes/T7/guided-analysis/tools/bftools/bftools` | none yet (use on `bankhead2017-qupath-workshop` images) | Write `showinf` and `bfconvert` tools. |
| 11 | Fiji/ImageJ 1.53k | macro | Installed and verified (headless) | `/Applications/ImageJ.app` | `schindelin2012-fiji-blobs`, `ljosa2012-bbbc005` | Record a macro for the blobs task. Build the tool-to-UI map from the recorder. |
| 12 | QuPath 0.7.0 | macro | Installed and verified | `/Volumes/T7/guided-analysis/tools/qupath/expanded/.../QuPath-0.7.0-arm64.app` | `bankhead2017-qupath-workshop` (no reference numbers) | Run a Groovy script on one image through `QuPath script`. |
| 13 | CellProfiler 4.2.8 | cli | Installed and verified (Rosetta). Adapter `catalog/cellprofiler`. Paper test passes on the 100-image sample. | `/Volumes/T7/guided-analysis/tools/cellprofiler/CellProfiler.app` | `caicedo2019-bbbc039`, `ljosa2012-bbbc005` | Build a `.cppipe` for BBBC005 and run it headless. |
| 14 | MZmine 4.10.90 | cli (batch) | Installed and verified | `/Volumes/T7/guided-analysis/tools/mzmine/mzmine.app` | none yet (reuse `rost2016-openms` mzML files) | Export a batch XML from the GUI. Run it with `-b`. |
| 15 | Open Babel 3.2.1 | cli | Installed and verified | `/opt/homebrew/bin/obabel` | none yet (reuse `delaney2004-esol` SMILES) | Write convert and descriptor tools. |
| 16 | Cardinal 3.14.0 (R 4.6.1) | script | Installed and verified. Adapter `catalog/cardinal`. | `/Volumes/T7/guided-analysis/tools/R-library` | `bemis2015-cardinal` | Compare the ion list with the vignette peaks. Add a test on the full pig206 data. |
| 17 | DESeq2 1.52.0 (R 4.6.1) | script | Installed and verified. Adapter `catalog/deseq2`. | `/Volumes/T7/guided-analysis/tools/R-library` | `love2014-deseq2-airway` | Find why R DESeq2 gives 4905 genes and the workflow gives 4381. |
| 18 | OpenMS TOPP tools 3.5.0 | cli | Installed (bioconda through micromamba) and verified. Adapter `catalog/openms`. | `/Volumes/T7/guided-analysis/tools/openms/env/bin` | `rost2016-openms` | Add the metabolomics TOPP chain and peptide-level and protein-level FDR. |
| 19 | PSPP | screen and files | Data only. Blocked: no macOS binary. | none | `student1908-sleep` | Use jamovi (open source, macOS arm64) as the screen-control test. |
| 20 | SMILE MSI | mcp | Exists in the catalog | not in this queue | the synthetic demo slide | none |
| 21 | statsmodels 0.15, pingouin 0.7, lifelines 0.30 | python | Adapter `catalog/biostats`. 11 tests pass. qwen3:8b passes all 3 papers. | `~/.cuvette/envs/biostats` | `student1908-sleep`, `rossi1980-recidivism`, `belenky2003-sleepstudy` | Run the stratified Cox model. |
| 22 | MAFFT 7.526, IQ-TREE 3.1.4 | cli | Adapter `catalog/phylo`. 5 tests pass. qwen3:8b failed 2 of 2 (never reached the tree tools). | `/opt/homebrew/bin` | `minh2020-iqtree2` | Rerun with the plan reminder. |
| 23 | bcftools 1.24, bedtools 2.31.1 | cli | Adapters `catalog/bcftools`, `catalog/bedtools`. 7 and 6 tests pass. qwen3:8b 5 of 6 and 4 of 5 items. | `/opt/homebrew/bin` | `danecek2021-bcftools`, `quinlan2010-bedtools` | Rerun after the empty-value and nudge fixes. |
| 24 | MNE-Python 1.13.2 | python | Adapter `catalog/mne`. 6 tests pass. qwen3:8b: counts and N100 pass, one channel peak fails. | `~/.cuvette/envs/mne`; sample data on T7 | `gramfort2013-mne-sample` | Make the peak sign a decision. Add an ICA test. |
| 25 | MDAnalysis 2.10, Biopython 1.88 | python | Adapter `catalog/mdanalysis`. 10 tests pass. qwen3:8b 6 of 8 values. | `~/.cuvette/envs/mdanalysis` | `gowers2016-mdanalysis` | Add a decision for atom names in distances. |
| 26 | vegan 2.7.6, lme4 2.0.6 (R) | script | Adapters `catalog/vegan`, `catalog/lme4`. 8 and 6 tests pass. qwen3:8b 6 of 6 and 9 of 9. | `/Volumes/T7/guided-analysis/tools/R-library` | `oksanen-vegan-dune`, `bates2015-lme4-sleepstudy` | Compare with the printed vignettes. |
| 27 | astropy 8.0.1, photutils 3.0.0 | python | Adapter `catalog/astropy`. 9 tests pass. qwen3:8b passes the main numbers. | `~/.cuvette/envs/astropy` | `bradley-photutils-100gaussians` | Add a real telescope FITS case. |
| 28 | GDAL 3.13.3 | cli | Adapter `catalog/gdal`. 11 tests pass. qwen3:8b passes in run 3. | `/opt/homebrew/bin`; `~/.cuvette/envs/gdal` | `rouault-gdal-autotest` | Run the all-touched variant. |
| 29 | QGIS 4.2.3 (`qgis_process`) | cli | Adapter `catalog/qgis`. 5 tests pass. No model run. | `/Volumes/T7/guided-analysis/tools/qgis/` | reuses `rouault-gdal-autotest` | Run one emulation. |
| 30 | Sage 0.14.6 | cli | Adapter `catalog/sage`. 4 tests pass. qwen3:8b 1 pass, 1 partial. | `/Volumes/T7/guided-analysis/tools/sage/` | `lazear2023-sage` | Add a tool that lists peptides. |

Kinds covered by the queue: mcp (SMILE MSI), cli (samtools, FastQC, bftools, CellProfiler, MZmine,
Open Babel, MAFFT, IQ-TREE, bcftools, bedtools, GDAL, QGIS, Sage, OpenMS), python (scikit-image, scanpy, pyimzML, pyOpenMS, RDKit, Cellpose), script (Cardinal,
DESeq2), http (METASPACE), macro (Fiji, QuPath), files (PSPP exports, any table), screen (jamovi
or the ImageJ GUI, as a fallback test).

## Verified commands

These commands ran on this machine on 2026-10-08.

| Tool | Command | Output |
| --- | --- | --- |
| scanpy | `~/.cuvette/envs/scanpy/bin/python -c "import scanpy as sc;print(sc.__version__)"` | `1.12.4` |
| scikit-image | `~/.cuvette/envs/skimage/bin/python -c "import skimage;print(skimage.__version__)"` | `0.26.0` |
| pyOpenMS | `python -c "import pyopenms as p;print(p.__version__);print(p.EmpiricalFormula('C6H12O6').getMonoWeight())"` | `3.6.0`, `180.0633903828` |
| RDKit | `Descriptors.MolWt(Chem.MolFromSmiles('CC(=O)Oc1ccccc1C(=O)O'))` | `180.159`, formula `C9H8O4` |
| pyimzML | `importlib.metadata.version('pyimzml')` | `1.5.5` |
| METASPACE | `SMInstance().datasets(nameMask='Lipid')[:2]` | two datasets returned (network call) |
| samtools | `samtools --version` | `samtools 1.24`, `htslib 1.24` |
| FastQC | `fastqc --version` | `FastQC v0.13.0` |
| bftools | `bftools/showinf -version` | `Version: 8.5.0` |
| Cellpose | `python -m cellpose --version` | `cellpose version: 4.2.1.1`, `torch version: 2.14.1` |
| QuPath | `QuPath-0.7.0-arm64 --version` | `QuPath v0.7.0`. Commands: `script`, `convert-ome`. |
| MZmine | `mzmine.app/Contents/MacOS/mzmine -help` | usage with `-b` (batch file), `-i` (input files), `-l` (libraries) |
| CellProfiler | `JAVA_HOME=<x64 JRE> cp -c --version` | `4.2.8` |
| ImageJ | `java -Djava.awt.headless=true -cp "ImageJ.app/Contents/Java/*" ij.ImageJ -batch t.ijm` | `v1.53k`, `mean=126` |
| Open Babel | `obabel -V` | `Open Babel 3.2.1` |

Notes on the commands:

- QuPath prints JavaFX `--add-opens` warnings. The warnings are harmless.
- The `ImageJ` launcher in `Contents/MacOS` starts the GUI even with `-batch`. Start the bundled
  Java directly with `-Djava.awt.headless=true`.
- CellProfiler 4.2.8 for macOS is an x86_64 build. It runs through Rosetta. It needs an x86_64
  Java 17. The x86_64 Temurin 17 JRE is in `tools/cellprofiler/jre17x64`. Set `JAVA_HOME` to its
  `Contents/Home` before the run. The pip install fails on arm64 (`mysqlclient` and `pyzmq` 22
  do not build).
- FastQC installed `openjdk` 27 from Homebrew as a dependency.

## Blockers

- R is not installed (`which Rscript` finds nothing). `brew install r` gives R 4.6.1. Cardinal and
  DESeq2 wait for it. The data and prompts are ready.
- OpenMS TOPP tools have no Homebrew formula. pyOpenMS covers the same algorithms from python.
- PSPP has no macOS binary. Build from source or use jamovi.
- The MZmine paper (Schmid 2023) has no benchmark yet. Its data is large (MassIVE). Use the OpenMS
  tutorial files with an MZmine batch for the first test.
- The Palmer 2017 reproduction needs a METASPACE API key.
- Some data pages state no license: PBMC 3k (10x), the FastQC example reports, the OpenMS tutorial
  set and the METASPACE annotation tables. Check them before the harness redistributes any file.

## Per-tool notes

For each tool: kind, version, license, install, platforms, headless support, manual route, and
the best evidence for the tool-to-UI map.

### scikit-image

- Kind: python. Version 0.26.0. License: BSD-3-Clause.
- Install: `uv pip install scikit-image`. About 140 MB with dependencies.
- Platforms: macOS arm64, Windows, Linux. Fully headless.
- Manual route: the same code. Fiji menu equivalents: Image > Adjust > Threshold, Analyze >
  Analyze Particles.
- Evidence: the gallery examples and the API docs.

### scanpy

- Kind: python. Version 1.12.4. License: BSD-3-Clause.
- Install: `uv pip install scanpy`. About 450 MB.
- Platforms: macOS arm64, Windows, Linux. Fully headless.
- Manual route: the tutorial code. There is no GUI.
- Evidence: the official tutorials (PBMC 3k). The code is the manual route.

### samtools

- Kind: cli. Version 1.24 (htslib 1.24). License: MIT/Expat.
- Install: `brew install samtools`. Small.
- Platforms: macOS arm64, Linux. Windows through WSL (Windows Subsystem for Linux).
- Manual route: the command with its arguments.
- Evidence: `samtools <command> --help` and the man pages.

### FastQC

- Kind: cli (Java). Version 0.13.0. License: GPL-3.0-or-later.
- Install: `brew install fastqc`. 15 MB plus Java.
- Platforms: macOS arm64, Windows, Linux. Headless with `fastqc -o outdir file.fq.gz`.
- Manual route: File > Open in the GUI. The same checks run.
- Evidence: `fastqc --help` and the `fastqc_data.txt` output.

### pyimzML

- Kind: python. Version 1.5.5. License: Apache-2.0.
- Install: `uv pip install pyimzml`. About 20 MB.
- Platforms: all. Headless.
- Manual route: Cardinal or the vendor viewer opens the same file.
- Evidence: the README and the imzML specification.

### pyOpenMS

- Kind: python. Version 3.6.0. License: BSD-3-Clause.
- Install: `uv pip install pyopenms`. About 250 MB.
- Platforms: macOS arm64, Windows, Linux. Headless.
- Manual route: the TOPP command with the same name, or the TOPPAS/OpenMS GUI.
- Evidence: the pyOpenMS docs and the matching TOPP `--help` text.

### OpenMS TOPP tools

- Kind: cli. License: BSD-3-Clause.
- Install: installer from the OpenMS releases page. No Homebrew formula. Not installed.
- Platforms: macOS arm64, Windows, Linux. Headless. Each tool writes an `.ini` file with
  `-write_ini`.
- Manual route: TOPPView and TOPPAS menus.
- Evidence: the `.ini` files and `<tool> --help`.

### Cardinal

- Kind: script (R). License: Artistic-2.0. Bioconductor package.
- Install: R first, then `BiocManager::install("Cardinal")`. Not installed.
- Platforms: macOS arm64, Windows, Linux. Headless with `Rscript`.
- Manual route: the same R code. The Cardinal GUI does not exist. Use the vignettes.
- Evidence: the vignettes and the help pages.

### METASPACE

- Kind: http and python. Client `metaspace2020` 2.0.9. License: Apache-2.0.
- Install: `uv pip install metaspace2020`. About 160 MB.
- Platforms: all. Public data needs no key. Private data and uploads need an API key.
- Manual route: the web app at metaspace2.eu (browse datasets, set the FDR filter, download the
  annotation table).
- Evidence: the GraphQL API reference and the web UI. Watch the network calls of the web app.

### MZmine

- Kind: cli (batch). Version 4.10.90. License: MIT.
- Install: macOS arm64 portable zip from GitHub. About 360 MB. The zip gives 1 GB on disk.
- Platforms: macOS arm64, Windows, Linux. Batch run: `mzmine -b batch.mzbatch -i "files/*.mzML"`.
- Manual route: Batch mode dialog. Each wizard step saves as one batch step.
- Evidence: the batch file (XML) that the GUI exports.
- Note: the queue said MZmine 3. The current release is 4.10.90.

### QuPath

- Kind: macro (Groovy). Version 0.7.0. License: GPL-3.0.
- Install: macOS arm64 `.pkg` from GitHub (240 MB). `pkgutil --expand-full` unpacks it with no
  admin rights.
- Platforms: macOS arm64, macOS x64, Windows, Linux. `QuPath script -p project -i image file.groovy`
  runs without the GUI.
- Manual route: the Analyze menu (Cell detection, Positive cell detection, Create thresholder).
- Evidence: the workflow history (Workflows tab > Create script) and the scripting docs.

### CellProfiler

- Kind: cli. Version 4.2.8. License: BSD-3-Clause.
- Install: the macOS zip from GitHub (490 MB, 1.8 GB on disk). It is x86_64 and needs Rosetta
  and an x86_64 Java.
- Platforms: macOS (x86_64 build), Windows, Linux. Headless: `cp -c -r -p x.cppipe -i in -o out`.
- Manual route: the module list in the GUI. The `.cppipe` file is a text list of modules.
- Evidence: the `.cppipe` file.

### Cellpose

- Kind: python and cli. Version 4.2.1.1. License: BSD-3-Clause.
- Install: `uv pip install cellpose packaging`. About 870 MB (PyTorch). The `packaging` package
  is missing from its dependencies.
- Platforms: macOS arm64 (MPS or CPU), Windows, Linux. Headless.
- Manual route: the Cellpose GUI (`python -m cellpose`) with the same model and diameter.
- Evidence: `python -m cellpose --help` and the docs.

### Bio-Formats bftools

- Kind: cli (Java). Version 8.5.0. License: GPL-2.0.
- Install: `bftools.zip` from the GitHub release. 51 MB.
- Platforms: all with Java. Headless.
- Manual route: Fiji File > Import > Bio-Formats.
- Evidence: `showinf -h`, `bfconvert -h`.
- Note: the `latest` link on downloads.openmicroscopy.org returns an index page, not the zip.

### Fiji/ImageJ

- Kind: macro. Version 1.53k (the installed `/Applications/ImageJ.app`). License: public domain.
- Install: already present.
- Platforms: all. Headless through the bundled Java with `-Djava.awt.headless=true`.
- Manual route: the menus. Plugins > Macros > Record writes the macro line for each action.
- Evidence: the macro recorder. The user does one task by hand while it records.

### RDKit

- Kind: python. Version 2026.03.6. License: BSD-3-Clause.
- Install: `uv pip install rdkit`. About 140 MB.
- Platforms: all. Headless.
- Manual route: the same code. No GUI.
- Evidence: the Getting Started guide and the API docs.

### Open Babel

- Kind: cli. Version 3.2.1. License: GPL-2.0.
- Install: `brew install open-babel`. 25 MB.
- Platforms: macOS arm64, Windows, Linux. Headless.
- Manual route: the Open Babel GUI converts files with the same options.
- Evidence: `obabel -H` and the format list.

### DESeq2

- Kind: script (R). License: LGPL-3.0-or-later. Bioconductor package.
- Install: R first. Not installed. The python route is pydeseq2.
- Platforms: all. Headless with `Rscript`.
- Manual route: the same R code. No GUI.
- Evidence: the vignette and `?DESeq`.

### PSPP and jamovi

- Kind: screen and files. PSPP license: GPL-3.0. No macOS binary. Not installed.
- jamovi (AGPL-3.0) has a macOS arm64 build. Use it for the screen-control test.
- Manual route: the Analyze menu (Compare Means > Paired-Samples T Test).
- Evidence: the syntax pane (PSPP) or the Rj editor (jamovi) shows the command for each click.

## Benchmark papers

Each paper has `paper.md`, `prompt.md`, `expected.yaml` and `fetch.sh` in `bench/papers/<paper-id>/`.
Numbers in `expected.yaml` come from the paper or from a computation on the data. The notes field
says which. Open items are in the notes of each file.

| Paper id | Field | Tool | Kind | Data size on T7 |
| --- | --- | --- | --- | --- |
| `bemis2015-cardinal` | MSI | Cardinal | script | 54 MB |
| `palmer2017-metaspace-fdr` | MSI, lipids | METASPACE client | python | 220 MB |
| `alexandrov2019-metaspace` | MSI, lipids | METASPACE client | python | 3 MB |
| `schramm2012-imzml-pyimzml` | MSI | pyimzML | python | 2.4 MB |
| `rost2016-openms` | metabolomics | pyOpenMS, TOPP | cli | 1.2 GB |
| `bankhead2017-qupath-workshop` | histology | QuPath | macro | 269 MB |
| `mahbod2024-nuinsseg` | histology (H&E) | scikit-image (QuPath second) | python | 3.1 GB |
| `caicedo2019-bbbc039` | microscopy | CellProfiler, Cellpose | cli | 306 MB |
| `ljosa2012-bbbc005` | microscopy | CellProfiler, Fiji | cli | 2.6 GB |
| `schindelin2012-fiji-blobs` | microscopy | Fiji | macro | 0.4 MB |
| `wolf2018-scanpy` | omics | scanpy | python | 36 MB |
| `love2014-deseq2-airway` | omics | DESeq2, pydeseq2 | script | 27 MB |
| `li2009-samtools` | omics | samtools | cli | 0.6 MB |
| `andrews-fastqc` | omics | FastQC | cli | 99 MB |
| `delaney2004-esol` | chemistry | RDKit | python | 0.4 MB |
| `student1908-sleep` | statistics | PSPP, scipy | files | 0.4 MB |

## Open number checks

- NuInsSeg: the label masks hold 35,138 nuclei. The paper (Table 2) says 30,698. The cause is not found.
- BBBC039: the masks hold 23,615 nuclei. The paper says 23,165.
- Palmer 2017: the paper says 73 formulas. The table gives 66 (sections 1 to 3) or 76 (sections 1 to 5).
- The CellProfiler F1 scores for BBBC039 are not yet reproduced. QuPath has no reference numbers.
- The Fiji blob counts (64 and 46) come from an ImageJ 1.53 run, not from the paper.
- The license of `blobs.gif` is not found.
