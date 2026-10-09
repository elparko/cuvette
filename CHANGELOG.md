# Changelog

All notable changes to Cuvette. The newest changes are at the top. Dates are in Central Time.
The project is in early development. Version numbers start at the first public release.

## Unreleased: work in progress on 8 and 9 October 2026

These items are being built and are not on main yet:
- New analyses: dose-response, qPCR, growth curves and enzyme kinetics; blot and gel densitometry, colony counts, wound healing and colocalization.

## 9 October 2026

### Desktop app
- Cuvette for macOS: a Tauri app of 68 MB (a 17 MB .dmg), with the Cuvette core and its own Node inside. Open a folder from the File menu, drag a folder onto the Dock icon, or use the Finder action. Cuvette > Install Command Line Tool adds the `cuvette` command for Terminal. The app is not signed yet.

### Session flow
- Before it asks anything, the agent looks at the data with a new read-only tool, `inspect_data`: the channels and their kind (brightfield or fluorescence), names, bit depth and groups. It then says what it found, and it never asks about a stain or channel that the data does not have.
- Questions come one at a time ("Question 1 of 3"), with the recommendation selected. Enter accepts it, the next question opens by itself, and Back returns to the previous one.
- `/change` reopens any answered question or decision. Results that used the old value become out of date, and a demonstration that used it can run again.
- The agent chooses the program and gives the reason. `/program` shows or changes it.
- Settings that you confirm in the proposed metrics count as answered when the steps run, so no card asks again.

### New analyses
- qPCR (qpcr): reference gene stability (geNorm and NormFinder), primer efficiencies, ΔΔCt and Pfaffl, with the Hildyard 2021 paper as the benchmark case.
- Growth curves (growthcurver): logistic growth rate, lag time, carrying capacity and group comparison, with the Nair 2024 paper.
- Image assays (image-assays): colony counts and clonogenic survival, colocalization (Pearson and Manders with the Costes threshold), and cell uptake indices, with three benchmark papers.
- Statistics in the style of Prism and SPSS (biostats): two-way and three-way ANOVA, repeated measures, Kruskal-Wallis with Dunn's test, Friedman, and exact rank tests.
- Pathway and gene set enrichment (enrichment), to replace Ingenuity Pathway Analysis for common work.
- Cloning and primers (cloning): primer design with melting temperatures and in-silico PCR, to replace basic SnapGene and Geneious work.
- Chromatography (chromatography): peak integration and calibration for exported HPLC traces.
- `docs/proprietary-alternatives.md` maps common proprietary lab and clinical programs to open-source alternatives and shows which ones Cuvette supports.
- Clinical statistics: logistic regression with odds ratios, chi-square, Fisher's exact and McNemar tests, and Cox models with categorical covariates and row subsets (biostats). Meta-analysis with forest and funnel plots and Egger's test (metafor). ROC curves, AUC with DeLong intervals and best thresholds (pROC). Power and sample size (pwr). Manual routes give the menu paths in SPSS, Stata, SAS, Prism, RevMan, MedCalc and G*Power. Four new benchmark papers: TB treatment default, HCC biomarkers, passive smoking and lung cancer, and a trial sample size.
- ELISA and other immunoassays (R drc): standard curves with 4PL and 5PL fits, in the Prism and SoftMax Pro forms, back-calculated concentrations with the dilution factor, replicate CV, LOD, LLOQ and ULOQ, and samples outside the curve flagged. A published Lassa ELISA paper is the benchmark case.
- Dose-response, enzyme kinetics and plate quality (R drc): IC50 and EC50 with a confidence interval and Hill slope, Michaelis-Menten and inhibition fits, plate normalization to controls and the Z' factor. Three published papers are the benchmark cases.

### Patient data and cost
- Before content goes to a cloud model, Cuvette looks for likely patient identifiers (names, record numbers, dates of birth, contact data and similar, after the HIPAA Safe Harbor list). A card shows what it found, masked, and you choose: send, mask the values, use a local model, or stop. Local models skip the card. The check is a help, not a guarantee; see `docs/patient-data.md`.
- The status line shows the session cost and how full the model context is. `/usage` shows the cost of each turn.

### Citations
- Every adapter carries the citation that its program authors ask for, and each tool cites the published methods it uses: 174 citations, each with a DOI or a URL that was checked.
- `/cite` lists what a session must cite, in APA or Vancouver style, and exports BibTeX and RIS. Only what ran is cited. Methods used only in a comparison are listed apart.
- The data book methods paragraph cites each program and method inline. The HTML report, the protocol, the .eln export, `results.xlsx` (a References sheet) and `references.bib` carry the list.
- The Programs page shows "How to cite" for each program.

### Session control
- `/rewind` returns the session to an earlier message or stage. Later results stay in the folder, marked "rewound", and later decisions return to their earlier values.
- `/branch <name>` copies the session to try another method. `/branches` lists them, and `/compare` shows their numbers side by side.
- `/save-method <name>` saves a confirmed analysis as a method. `ga --method <name> <folder>` runs it on new data: the answers come pre-filled for you to confirm, and the demonstration on a sample still runs first. Methods export as one file to share with a lab.

### Citations
- Each adapter cites its program in `program.citation`, and each tool cites the published methods that it uses. All 34 catalog adapters have checked references with DOIs. `ga adapter check` reports a program adapter without a citation as an error.
- `/cite` lists the programs and methods that ran in the session. A method that ran only in a comparison run is listed apart. `/cite bibtex`, `/cite ris` and `/cite text` save the list. The setting `citation_style` is `apa` or `vancouver`.
- The data book, the HTML report, the protocol, `results.xlsx` (sheet References) and `references.bib` in the output folder carry the references. The methods paragraph cites each program and method in the text. The app shows the list in the Results tab, and the Programs page shows how to cite each program.

### Security
- Folder trust: settings, hooks and adapters in a data folder take effect only after you trust the folder. A card shows every setting, every command in full and every adapter that would replace a built-in one. Choose Trust, Trust once or Do not trust. If a trusted file changes, Cuvette asks again. `ga trust` and `/trust` manage the list.

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
- Folder trust: the settings, hooks and adapters in `.ga/` or `.cuvette/` of a project folder take effect only after you trust the folder. A card shows what the folder contains. A changed file asks again. `ga trust`, `/trust`, `--trust-folder`, and a Folder trust row in `/config` and the app Settings page.

### Programs
- A Programs manager in the app, in the terminal (`/programs`) and on the command line (`ga programs`). It shows each science program with its status, version, size, last use and access. It installs, updates and removes the environments that Cuvette made, sets a custom program path, turns adapters on or off, and controls whether an adapter may run code that the agent writes. Every change asks first. Cuvette never removes a program that you installed yourself.

### Outputs
- Image decks: `/export images` compiles figures and QC images into a PowerPoint file or a PDF, one per page or in grids of 2, 4, 6 or 9. Each image has an editable caption from the record. The last page lists the methods and the record hash. The app has a "Make an image deck" button.

### Data handling
- A data check runs when the agent first reads a table or a folder: missing values, duplicates, mixed types, missing channels, names spelled two ways, and files that differ. Problems that need a choice become question cards.
- A sample sheet (`samples.csv`) lists each sample with its group, unit of replication and batch. You edit it in the app or with `/samples`. The proposed metrics take n from it.
- Design checks on the sample sheet: pseudoreplication, groups confounded with a batch, unbalanced groups, and too few n for the planned test.

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
