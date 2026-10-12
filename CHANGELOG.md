# Changelog

All notable changes to Cuvette. The newest changes are at the top. Dates are in Central Time.
The project is in early development. Version numbers start at the first public release.

## 11 October 2026

### Network failures

- The Claude provider waits and tries again three times after a rate limit (HTTP 429), a server error (HTTP 5xx or 529) or a network error. The wait grows each time, has random jitter, and follows the `retry-after` header. The session shows "Waiting to retry (2 of 3)".
- After the last try fails, a card offers "Resume", "Switch to the local model" or "Stop". "Resume" goes on from the last finished step. No finished tool call runs again. A headless run waits and tries again three more times, then stops with an error.

### Suggest the program from the files

- When you choose a folder, Cuvette reads the file names and the first 16 bytes of each file. It looks two folder levels down and stops at 400 files. It matches them to the `file_types` and the new `file_magic` of each adapter.
- The app shows a card: "These look like flow cytometry files. Use FlowKit?" The other matches are below it. "Let Cuvette choose later" starts the session with no program, as before.
- If no program fits, the card says so and offers the table route (the `tables` adapter). A folder with only `.csv`, `.tsv` or `.xlsx` files gets the same offer.
- `cuvette` in the terminal prints the same suggestion before it starts, if the folder has data files and you gave no `--adapter`.
- The adapter manifest has three new optional fields: `file_magic`, `file_label` and `file_priority`. 34 catalog adapters now have a label. See [docs/adapter-spec.md](docs/adapter-spec.md).

### Spend

- The plan card shows a cost range, for example "About $0.40 to $1.20 with Sonnet." A local model shows "Free: runs on this computer." The range comes from the benchmark runs of 9 October. On papers that the fit did not see, 93% to 94% of the runs fall in the range. See [docs/cost-estimate.md](docs/cost-estimate.md).
- At 80% of the spend limit, a card asks if the scientist wants to continue, switch to a cheaper model or stop. It appears once. A headless run logs a notice instead. At 100%, Claude requests still stop.
- `scripts/fit-estimate.ts` fits the range again from benchmark results.

### Methods

- A saved method now stores a summary of its data: the column names and order, the types, the units, the median, the range, the missing count and the group sizes.
- When you run a method on new data, Cuvette compares the new data with the summary. It shows one card for each difference before any step runs. The differences are a missing, new or renamed column, a changed column order, a type change, a likely unit change (a median that is 10, 60, 100, 1000, 3600 or 1,000,000 times different), a range far outside the old range, more missing values, new or missing groups, and very different group sizes.
- You continue or stop on each card. The record keeps the comparison and the answers.
- In headless mode, a likely unit change stops the run. Add `data-change` to `--allow` to continue.
- A method saved before this change has no summary. It still runs, and Cuvette shows one note. The next save stores the summary.

## 9 October 2026

### Benchmark

- Final paper benchmark on commit 1d5f392, 53 papers, blind: Claude Opus, Sonnet and Haiku with three runs each, and qwen3:8b with one run. Computed items correct: 99.6% for each Claude model and 79.7% for qwen3:8b. The report is `docs/benchmark-2026-10-09.md`.

### Adapters from others
- `cuvette adapter add <name | git address | folder | .zip>` installs an adapter in the user adapter folder. `update` shows the changed files, the new tools and the new permissions before it applies. `remove` deletes it. `list --installed` shows the source, the version, the commit and the SHA-256.
- A git source is pinned to a commit. A registry source is pinned to a version. Cuvette records the source and a SHA-256 of the files in `installed-adapters.json`.
- Before each install or update, Cuvette runs `cuvette adapter check --static` (no code is imported) and shows a card: the program, shipped code, network use, decisions, license, citations and the check result. An adapter with an error is not installed. Bypass permissions does not skip the question.
- Trust labels: Reviewed (built-in catalog), Checked (registry, passed its checks) and Unlisted (git address, folder or zip, with a warning). They show in `cuvette adapters`, on the Programs page, in `list_adapters`, in the program choice and in the record.
- An Unlisted adapter that ships code asks once more the first time it runs. `cuvette adapter allow-code <name>` answers it without a window.
- The registry client reads `index.json` from the setting `adapter_registry`. If the registry is not reachable, Cuvette says so in one line. `scripts/build-registry-index.mjs` builds the index. See [docs/adapter-registry.md](docs/adapter-registry.md).
- `cuvette adapter audit <folder | name>` asks Claude to review the files. It asks first and shows the cost. `registry-template/` holds the pull request workflow for the future registry repository: lint, known-answer tests, a Claude review with a verdict, CODEOWNERS and the pull request template. A maintainer still approves the merge.
- The Programs page has an "Add an adapter" button and the trust label on each row. In the terminal, press `a` in the `/programs` panel.

### Rename
- The project is now Cuvette (was guided-analysis), and the command `ga` is now `cuvette`. Run `npm link` again so that `cuvette` is the global command.
- The environment variables start with `CUVETTE_`. Cuvette still reads the old `GA_*` names and gives each adapter process both names.
- The first start moves `~/.guided-analysis` to `~/.cuvette` and leaves a link at the old path. The `.ga/` folder of a project still works, and folder trust covers `.ga/` and `.cuvette/`.
### Desktop app
- A new logo and app icon: a cuvette with a light beam that comes out weaker on the far side.
- Cuvette for macOS: a Tauri app of 68 MB (a 17 MB .dmg), with the Cuvette core and its own Node inside. Open a folder from the File menu, drag a folder onto the Dock icon, or use the Finder action. Cuvette > Install Command Line Tool adds the `cuvette` command for Terminal. The app is not signed yet.

### Session flow
- The question of the setup card starts the analysis. Before, the scientist had to type the request again after the card.
- Before it asks anything, the agent looks at the data with a new read-only tool, `inspect_data`: the channels and their kind (brightfield or fluorescence), names, bit depth and groups. It then says what it found, and it never asks about a stain or channel that the data does not have.
- Questions come one at a time ("Question 1 of 3"), with the recommendation selected. Enter accepts it, the next question opens by itself, and Back returns to the previous one.
- `/change` reopens any answered question or decision. Results that used the old value become out of date, and a demonstration that used it can run again.
- The agent chooses the program and gives the reason. `/program` shows or changes it.
- Settings that you confirm in the proposed metrics count as answered when the steps run, so no card asks again.

### New analyses
- Tables adapter 0.2.0: the tool `read_plate` reads plate-reader grids (96 or 384 wells, several blocks in a sheet, an optional plate map) into one long table. Text cells such as OVRFLW stay missing.
- Metabolomics statistics (metabolomics-stats): PQN and total area normalization, PCA, PLS-DA and OPLS-DA with permutation tests and VIP scores, and feature tests with FDR. The Thevenot 2015 urine data are the benchmark case.
- Epidemiology rates (epi-rates): exact rate intervals, rate ratios, attributable fractions, number needed to treat, and direct and indirect standardization. The benchmark case is the NCHS final death data for 2020.
- Trial endpoints (trial-endpoints): risk difference with Wald, Newcombe or Miettinen-Nurminen intervals, Mantel-Haenszel strata, hazard ratio, restricted mean survival time and non-inferiority checks. The benchmark case is the SHOCK trial.
- qPCR (qpcr): reference gene stability (geNorm and NormFinder), primer efficiencies, ΔΔCt and Pfaffl, with the Hildyard 2021 paper as the benchmark case.
- Growth curves (growthcurver): logistic growth rate, lag time, carrying capacity and group comparison, with the Nair 2024 paper.
- Image assays (image-assays): colony counts and clonogenic survival, colocalization (Pearson and Manders with the Costes threshold), and cell uptake indices, with three benchmark papers.
- Bench assays (bench-assays): protein assay curves (BCA, Bradford, Lowry), blot and dual-luciferase ratios, hemocytometer and counter cell counts, and NanoDrop quality control. Each method choice is a decision.
- Statistics in the style of Prism and SPSS (biostats): two-way and three-way ANOVA, repeated measures, Kruskal-Wallis with Dunn's test, Friedman, and exact rank tests.
- Pathway and gene set enrichment (enrichment), to replace Ingenuity Pathway Analysis for common work.
- Cloning and primers (cloning): primer design with melting temperatures and in-silico PCR, to replace basic SnapGene and Geneious work.
- Chromatography (chromatography): peak integration and calibration for exported HPLC traces.
- Single-cell integration (harmony): merge samples, remove batch effects with Harmony and measure the mixing with LISI (local inverse Simpson index), with the Korsunsky 2019 paper.
- Spatial transcriptomics (squidpy): spatially variable genes by Moran's I, neighborhood enrichment and spatial domains for Visium data, with the Weber 2023 paper.
- Mass cytometry (cytof): arcsinh transform, FlowSOM clustering, population counts and differential abundance with diffcyt, to replace the clustering and abundance tests of Cytobank and OMIQ, with the Nowicka 2019 workflow as the benchmark case.
- Microbiome tables (microbiome): alpha and beta diversity with PERMANOVA, and differential abundance with MaAsLin 2 or ALDEx2 for 16S and shotgun tables, to replace the statistics steps of CLC Microbial Genomics, with the El Masri 2026 paper.
- `docs/proprietary-alternatives.md` maps common proprietary lab and clinical programs to open-source alternatives and shows which ones Cuvette supports.
- Clinical statistics: logistic regression with odds ratios, chi-square, Fisher's exact and McNemar tests, and Cox models with categorical covariates and row subsets (biostats). Meta-analysis with forest and funnel plots and Egger's test (metafor). ROC curves, AUC with DeLong intervals and best thresholds (pROC). Power and sample size (pwr). Manual routes give the menu paths in SPSS, Stata, SAS, Prism, RevMan, MedCalc and G*Power. Four new benchmark papers: TB treatment default, HCC biomarkers, passive smoking and lung cancer, and a trial sample size.
- ELISA and other immunoassays (R drc): standard curves with 4PL and 5PL fits, in the Prism and SoftMax Pro forms, back-calculated concentrations with the dilution factor, replicate CV, LOD, LLOQ and ULOQ, and samples outside the curve flagged. A published Lassa ELISA paper is the benchmark case.
- CRISPR screens (mageck), ChIP-seq and ATAC-seq differential peaks (diffbind) and Mendelian randomization from summary statistics (mendelianrandomization). Each has known-answer tests, manual routes, and one benchmark paper.
- The mageck tools refuse a count table where Excel changed gene symbols to dates. The supplement of the MAGeCK paper has this fault in 120 rows.
- Flow cytometry statistics (flowcore) and susceptibility testing (amr): a spillover matrix from single-stain controls, percent positive and MFI with group tests, and EUCAST or CLSI S, I, R with MIC50 and MIC90 from MIC tables. Each has known-answer tests, manual routes and benchmark cases.
- Dose-response, enzyme kinetics and plate quality (R drc): IC50 and EC50 with a confidence interval and Hill slope, Michaelis-Menten and inhibition fits, plate normalization to controls and the Z' factor. Three published papers are the benchmark cases.
- Proteomics statistics (limma-proteomics): filter, log2, normalize and impute a protein table, then run the moderated t test and draw a volcano plot, in place of the Perseus steps. Two benchmark papers reproduce their printed counts.
- Multi-omics factor analysis (mofa): MOFA+ factors and the variance that each factor explains in each view, with factor correlation to covariates. The Argelaguet 2018 leukemia data is the benchmark paper.
- IHC scoring (ihc-scoring): H-score, Allred score and Ki-67 index with a hot spot, from a QuPath cell table, a table of pathologist percents or an image with color deconvolution, in place of the scoring step in HALO, Visiopharm and ImageScope. It also gives weighted kappa and the intraclass correlation of two scorers. The Ram 2021 paper is the benchmark case.
- Calcium imaging (calcium-imaging): dF/F with a percentile, first-frames or fixed baseline and a neuropil coefficient, events by threshold or OASIS, event rate, amplitude, area, rise and decay times, the fraction of responsive cells, pairwise correlation, and group tests on animal means. Suite2p runs motion correction and cell detection if it is installed. It replaces steps in Inscopix Data Processing, NIS-Elements, ZEN, MetaFluor and ImageJ.
- Patch-clamp electrophysiology (patch-clamp): spike threshold, amplitude, half-width, rheobase and the F-I curve. It also gives input resistance, tau, sag, I-V curves with Boltzmann fits, and mEPSC or mIPSC events. The scientist chooses the threshold definition, baseline window, sweeps, leak subtraction, event threshold and liquid junction potential. Group tests use the animal as the unit. Three Allen Cell Types cells give known answers. The Jahncke 2025 Purkinje cell mIPSC paper is the benchmark.

### Patient data and cost
- Before content goes to a cloud model, Cuvette looks for likely patient identifiers (names, record numbers, dates of birth, contact data and similar, after the HIPAA Safe Harbor list). A card shows what it found, masked, and you choose: send, mask the values, use a local model, or stop. Local models skip the card. The check is a help, not a guarantee; see `docs/patient-data.md`.
- The status line shows the session cost and how full the model context is. `/usage` shows the cost of each turn.

### Citations
- Every adapter carries the citation that its program authors ask for, and each tool cites the published methods it uses: 174 citations, each with a DOI or a URL that was checked.
- `/cite` lists what a session must cite, in APA or Vancouver style, and exports BibTeX and RIS. Only what ran is cited. Methods used only in a comparison are listed apart.
- The data book methods paragraph cites each program and method inline. The HTML report, the protocol, the .eln export, `results.xlsx` (a References sheet) and `references.bib` carry the list.
- The Programs page shows "How to cite" for each program, and the app shows the list in the Results tab.
- The setting `citation_style` is `apa` or `vancouver`. `/cite bibtex`, `/cite ris` and `/cite text` save the list.
- `cuvette adapter check` reports a program adapter without a citation as an error.

### Session control
- `/rewind` returns the session to an earlier message or stage. Later results stay in the folder, marked "rewound", and later decisions return to their earlier values.
- `/branch <name>` copies the session to try another method. `/branches` lists them, and `/compare` shows their numbers side by side.
- `/save-method <name>` saves a confirmed analysis as a method. `cuvette --method <name> <folder>` runs it on new data: the answers come pre-filled for you to confirm, and the demonstration on a sample still runs first. Methods export as one file to share with a lab.

### Writing
- The agent writes to you in ASD-STE100 Simplified Technical English: short sentences, active voice and plain words. A checker reports long or passive sentences in answers, adapter text and docs (`npm run lint:text`). The setting `text_style` turns the rules off.

### Reproducibility
- Each session records the exact package versions of each environment it uses, and saves `environment.lock.json`, `requirements.txt` and `renv.lock`.
- A step is out of date when its decision, an input file, the adapter, the program or the packages change. `/status` lists each step and the reason, and `/rerun` runs the out-of-date steps again.
- When a step runs again, a before-and-after table shows each number that changed.

### Terminal
- The screen no longer jumps to the top after each message. The input box stays on the bottom rows.
- Footer hints: full, short or off, with Ctrl+T.
- Option+Backspace and the other word keys work in every text field, also when the key bytes arrive in pieces. `CUVETTE_KEYLOG=<file>` records raw key bytes for a bug report.

### Security
- Folder trust: the settings, hooks and adapters in `.ga/` or `.cuvette/` of a project folder take effect only after you trust the folder. A card shows every setting, every command in full and every adapter that would replace a built-in one. Choose Trust, Trust once or Do not trust. A changed file asks again. `cuvette trust`, `/trust`, `--trust-folder`, and a Folder trust row in `/config` and the app Settings page.

### Programs
- A Programs manager in the app, in the terminal (`/programs`) and on the command line (`cuvette programs`). It shows each science program with its status, version, size, last use and access. It installs, updates and removes the environments that Cuvette made, sets a custom program path, turns adapters on or off, and controls whether an adapter may run code that the agent writes. Every change asks first. Cuvette never removes a program that you installed yourself.

### Outputs
- Image decks: `/export images` compiles figures and QC images into a PowerPoint file or a PDF, one per page or in grids of 2, 4, 6 or 9. Each image has an editable caption from the record. The last page lists the methods and the record hash. The app has a "Make an image deck" button.

### Data handling
- A data check runs when the agent first reads a table or a folder: missing values, duplicates, mixed types, missing channels, names spelled two ways, and files that differ. Problems that need a choice become question cards.
- A sample sheet (`samples.csv`) lists each sample with its group, unit of replication and batch. You edit it in the app or with `/samples`. The proposed metrics take n from it.
- Design checks on the sample sheet: pseudoreplication, groups confounded with a batch, unbalanced groups, and too few n for the planned test.

### Fixes
- A headless run no longer hangs when the answers file gives a value that a decision refuses (for example a text catch-all for a number). The harness uses the recommendation, the default or the first option, and logs a notice. The terminal and panel views show the reason and keep the question open. The drc papers now give explicit numeric answers.

## 8 October 2026

### Session flow
- A session starts with questions about meaning: what one n is, what counts as positive, which groups, and any reference counts. The agent looks at the data first and asks only about what it finds.
- The proposed metrics come next, with every setting filled in and editable.
- A demonstration on one sample shows the numbers and a QC image before any batch runs. You change the method or confirm and run all.
- The record names each stage: Questions, Proposed metrics, Demonstration on a sample, Confirmed.
- A blind reference check compares the results with hand counts after the batch, with a Bland-Altman plot.
- The agent chooses the program and gives the reason. You change it in the proposed metrics or with `/program`.
- Question cards accept a typed answer and stay open if the answer is refused.

### Interfaces
- `ga app`: a full session in a browser window, with the same cards, commands and settings as the terminal.
- Start without the terminal: `ga doctor` checks the computer, a guided first start, a Finder action ("Analyze with Cuvette") and a launcher.
- Sessions get a title and a one-sentence description.
- `/config` and the Settings page: sections, controls that fit each value, source badges, search, and "Save for" this session, all projects or this project.
- Bypass permissions for the cards that ask to run commands. Method questions still go to you.
- Resume: `ga --resume` opens the newest session of the folder; `ga resume` shows a picker.
- Messages that you type during a turn go to the agent after the current step. A `!` prefix sends at once.
- A quiet main view: file lookups collapse into one line, analysis steps are numbered, and `/details` shows everything.
- A live status line in plain words, with a spinner and the elapsed time.
- Script steps describe in plain words what the code did. No code shows in the main view.
- Input keys: mac (Option+Backspace and the other word keys), emacs, vim and classic, in every text field.
- The screen stays clean when you resize the window, and tall cards scroll inside their frame.

### Outputs
- Each session saves its results in the data folder: `cuvette/<date>-<title>/`, with `results.xlsx`, `figures/`, `index.html` and the record. You can set another folder.
- `results.xlsx` after every turn with results: a summary, one sheet for each step, the steps with their manual routes, and the files.
- Figures as 300 dpi PNG and SVG.
- A data book: one PDF and HTML lab record of a session or a project, with methods, results, checks and references.
- A `tables` adapter in every session: messy lab sheets, group summaries, Excel files and lab-style plots.

### Adapters and checks
- An adapter checklist, with lint rules in `ga adapter check`, a small-model drive test, and rules for the `ga onboard` agent.
- All built-in adapters pass the checklist. Each adapter checks the identity of its program.
- DESeq2 reads Salmon, kallisto and RSEM output through tximport, with length offsets, and reproduces the published rnaseqGene numbers.
- Known-answer tests for each adapter, with values from published or independent sources, and license records for all test data.

### Benchmark
- Blind mode: the agent cannot read the expected values, the paper notes or other runs. Each run gets a leak check.
- 34 papers: 14 research papers and 20 tool tutorials or test suites, with the source of each expected value.
- Case pages: one page per paper and model, showing the session as a scientist sees it.
- Fixes found by the benchmark: the claim check, empty decisions, comparison runs, repeated replies from local models, and clearer tool descriptions.

### Fixes
- Claude requests no longer fail when a failed tool result holds an image.
- Paths in all tools resolve from the project folder. A search of the whole disk asks first.
- Setup no longer fails when a field has no value.

## 7 October 2026

- First version: a terminal agent that runs science programs through adapters, with decision cards, a record of every step, manual routes, a claim check and a review.
- 33 adapters for imaging, mass spectrometry, genomics, neuroscience, statistics, ecology, chemistry, astronomy and geospatial work.
- Local models through Ollama, export to `.eln` and eLabFTW, and an MCP server mode.
