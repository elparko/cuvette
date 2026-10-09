# Changelog

All notable changes to Cuvette. The newest changes are at the top. Dates are in Central Time.
The project is in early development. Version numbers start at the first public release.

## Unreleased: work in progress on 8 and 9 October 2026

These items are being built and are not on main yet:
- A desktop app for macOS (Tauri), about one third the size of an Electron app.
- Citations for every program and method that a session uses: `/cite`, BibTeX, RIS, APA and Vancouver.
- New analyses: ELISA standard curves, dose-response, qPCR, growth curves and enzyme kinetics; logistic regression, chi-square, Fisher and McNemar tests; meta-analysis; ROC curves; power analysis; blot and gel densitometry, colony counts, wound healing and colocalization.
- A map of proprietary lab software and the open-source alternatives that Cuvette supports.
- A warning before likely patient identifiers go to a cloud model, and the session cost in the status line.
- Rewind, branches and method templates.

## 9 October 2026

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
