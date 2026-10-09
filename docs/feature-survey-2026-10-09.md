# Feature survey: other agent harnesses and science tools

2026-10-09

This survey lists features of other tools that Cuvette does not have. It recommends which ones to add.
It builds on `docs/harness-survey.md` (2026-10-07), which covered OpenCode and Claude Code basics.
This file does not repeat that survey.

## Sources and limits

- Tools read: Claude Code, OpenAI Codex command-line interface (CLI), Gemini CLI, Aider, Cline, Roo Code, Cursor, Goose, OpenHands, Warp; Jupyter AI, Google Colab, Hex, Julius, Posit Assistant, DataLab, Deepnote, Marimo, Databricks; Biomni, FutureHouse and Edison Scientific, Elicit, ChemCrow, CRISPR-GPT, CellAgent, BioDiscoveryAgent, STELLA, Sakana AI Scientist, Google AI co-scientist, Galaxy, KNIME, Benchling, RSpace, SciNote, openBIS, protocols.io; Snakemake, Nextflow, DVC (Data Version Control), Quarto, RO-Crate (Research Object Crate), CWL (Common Workflow Language), uv, renv, Zenodo.
- Method: official docs pages, papers, and shallow clones of the open repositories. Nobody ran the cloned code.
- Clones: `/private/tmp/claude-501/-Users-parker-Code-guided-analysis/126f9c14-dc85-47a5-923d-e26fc34ce34a/scratchpad/survey/`.
- "[unverified]" marks a claim that comes only from a vendor page or a third-party summary.
- Cuvette state: `main` at `50d468b`, and `git log --since=2026-10-07`. Each "close in Cuvette today" line was checked in the source. The `file:line` references point to that commit.
- Two status facts: Roo Code's original team stopped work on 2026-05-15, and a community team maintains it now. Posit replaced Positron Assistant and Databot with Posit Assistant in Positron 2026.07.

## How to read the recommendations

- **Now:** small, low risk, and it closes a gap that a launch user can hit. Build it before the feature freeze (9 October, 15:00). If it does not pass `npx tsc --noEmit` and `npx vitest run` by then, build it first after the launch. Item 3.1 is the exception: do it before the posts.
- **After launch:** worth it, but not before the posts.
- **No:** it does not fit a scientist who is not a programmer, or it adds bulk for little gain.
- Effort is for one agent: small is less than one day, medium is one to three days, and large is more.

## Top 10, ranked

| Rank | Feature | Source | Effort | When |
| --- | --- | --- | --- | --- |
| 1 | Trust prompt before the settings, hooks and adapters of a project folder take effect (3.1) | Gemini CLI trusted folders; Codex trusted projects | Small | Now, before the posts |
| 2 | Package lock for each session: the exact Python and R package versions that each step used (2.1) | uv.lock, renv.lock, Snakemake pin files, nf-core | Small | Now |
| 3 | Warning card before patient identifiers go to a cloud model (4.1) | CRISPR-GPT sequence filter; Posit querychat | Small | Now |
| 4 | More reasons for "out of date" (a changed input file, adapter, program or package lock), and `/status` (1.3) | Snakemake rerun triggers and `--list-changes`; Nextflow resume | Small | Now |
| 5 | Data check on load: missing values, duplicates, text in number columns and group sizes, each problem as a question card (3.2) | Positron Data Explorer; Marimo; Benchling Notebook Check | Medium | After launch, first |
| 6 | Sample sheet: file, sample, group, unit of replication and batch, with confound and pseudoreplication checks (4.3) | Galaxy sample sheets; openBIS vocabularies | Medium | After launch |
| 7 | Before and after table when a step runs again after `/change` (1.4) | DVC `metrics diff`; Cline Compare; Hex review diffs | Small | After launch |
| 8 | Rewind to an earlier message, and branch a session to try another method (1.1, 1.2) | Claude Code `/rewind` and `/branch`; Gemini CLI `/rewind`; Goose fork; DVC experiments | Medium | After launch |
| 9 | Session cost in dollars and context fill in the status line (6.1) | Aider cost line; Claude Code `/usage`; Jupyter AI 3.1; Warp | Small | Now |
| 10 | Method templates: start a new session from a finished one with the plan and decisions filled in (5.1) | Goose recipes; Galaxy workflow extraction; nf-core launch form | Medium | After launch |

Next in line: adapter install from a URL with local tests (5.2), and a step cache (1.7).

Why this order:

- Rank 1 is a security gap that the launch makes larger. The Finder action invites the scientist to open any folder, including a folder from a colleague or a download.
- Ranks 2 to 4 close gaps in the record. The record says that each number can be repeated. Without a package lock and input checks, that statement is not complete.
- Ranks 5 and 6 target the two traps that the benchmark shows most often: silent exclusions and pseudoreplication or confounding.
- Ranks 7 to 10 make the session easier to steer. They are useful, but no result is wrong without them.

## 1. Session control

### 1.1 Rewind to an earlier message

- **What it is.** The scientist picks an earlier message. The conversation goes back to that point. The later turns leave the model's context.
- **Where it comes from.**
  - Claude Code `/rewind`, also Esc twice. It can restore the code, the conversation, or both: <https://code.claude.com/docs/en/checkpointing>.
  - Gemini CLI `/rewind` and `/restore`: <https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/rewind.md>, <https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/checkpointing.md>.
  - Cline "Restore Task Only": <https://docs.cline.bot/core-workflows/checkpoints.md>.
  - Goose "edit in place": <https://github.com/block/goose/blob/main/documentation/docs/guides/sessions/in-session-actions.md>.
- **Problem it solves.** The agent takes a wrong path, for example the wrong image channel or the wrong table. Now the scientist must explain the error in a new message, and the wrong turns stay in the context.
- **Close in Cuvette today.** `/change` with stale marks and `/rerun` correct a decision. Compaction already cuts `messages()` at a `compaction` entry. Nothing removes a wrong turn from the context.
- **How it fits.** The 2026-10-07 survey rejected file snapshots. This proposal keeps that choice. Raw data is read-only and outputs are blobs, so nothing on disk needs a restore.
  - Add a `rewind` entry with `upTo`. `messages()` stops at that entry, in the same way as at a `compaction` entry.
  - The nodes after that point get a "set aside" mark. They are not deleted.
  - The trail shows them dimmed. The claim check must not accept a number from a set-aside node.
  - After the rewind, the old message goes back into the input box, as in Claude Code.
- **Effort.** Medium. The change touches the record, the trail, the databook and the claim check.
- **Recommendation.** After launch. It changes four modules, and the decision path (`/change`) already covers the most common error.

### 1.2 Branch a session to try another method

- **What it is.** A copy of the session up to a point, with its own ID. The original does not change. The scientist then compares the two.
- **Where it comes from.**
  - Claude Code `/branch` and `--fork-session`: <https://code.claude.com/docs/en/sessions#branch-a-session>.
  - Codex `fork`: <https://github.com/openai/codex/blob/main/codex-rs/cli/src/main.rs>.
  - Goose "Fork Session" when you edit a message (link in 1.1).
  - DVC experiments with `exp run -S` and `exp show`: <https://doc.dvc.org/command-reference/exp/run>, <https://doc.dvc.org/command-reference/exp/show>.
- **Problem it solves.** "What if I count with Otsu instead of Default, and keep the edge cells?" Several decisions change at once, or the method itself changes. The sensitivity check compares the options of one decision only.
- **Close in Cuvette today.** `compare_options` and the sensitivity check, both inside one decision. `/change` changes the main session itself.
- **How it fits.**
  - A new session starts with a `fork` entry (parent session, entry ID) and copies the entries up to that point.
  - `cuvette compare <a> <b>` writes the decision differences and the result differences as one sheet in `results.xlsx`, as `dvc exp show` does.
- **Effort.** Medium, together with the compare command.
- **Recommendation.** After launch. Build it together with 1.1, because both need a "cut at entry N" rule in the record.

### 1.3 More reasons for "out of date", and `/status`

- **What it is.** A step is out of date when anything that it used changed: an input file, the adapter, the program version or the package lock. A status list shows each out-of-date step, the reason, and what `/rerun` will do.
- **Where it comes from.**
  - Snakemake `--rerun-triggers` (code, input, mtime, params, software-env), `--list-changes` and `--summary`: <https://snakemake.readthedocs.io/en/stable/executing/cli.html>.
  - Nextflow `-resume` and its task hash: <https://docs.seqera.io/nextflow/cache-and-resume>.
  - Nextflow `lineage diff` shows why a task ran again: <https://docs.seqera.io/nextflow/data-lineage>.
- **Problem it solves.** A scientist corrects a value in a CSV file and then resumes the session. The old results stay current, and nothing tells the scientist. The same thing happens after an adapter update.
- **Close in Cuvette today.** Only a decision change marks steps out of date (`src/core/decisions.ts:342`). Each node already stores the input hashes, the adapter version and the program version.
- **How it fits.**
  - On resume, before `/rerun` and before `cuvette replay`, check each node.
  - For each input file, compare size and modification time first. Compute the SHA-256 only when one of them changed. This is Nextflow's standard cache mode, so large images stay fast.
  - Mark the node with a reason kind: `input`, `adapter`, `program`, `environment` or `decision`.
  - `/status` lists the out-of-date steps with the reason, for example: "Step 3 is out of date: counts.csv changed on 9 October."
- **Effort.** Small.
- **Recommendation.** Now. It closes a gap that gives wrong numbers with no warning. The data to do it is already in the record.

### 1.4 Before and after table after a rerun

- **What it is.** When a step runs again after `/change` or after 1.3, the scientist sees each number with its old value, its new value and the change.
- **Where it comes from.**
  - DVC `metrics diff`: <https://doc.dvc.org/command-reference/metrics/diff>.
  - Cline Compare on a checkpoint (link in 1.1).
  - Hex review: a side-by-side diff of code and outputs, <https://hex.tech/blog/reviews>.
- **Problem it solves.** After the threshold changes, the scientist must find the new count and compare it with the old count by memory.
- **Close in Cuvette today.** The old node and the new node are both in the record. The sensitivity table shows the options before the choice, not after a change.
- **Effort.** Small. Show the table in the chat and the app, and add it as a sheet in `results.xlsx`.
- **Recommendation.** After launch. The value is high and the risk is low, but it is not a correctness gap.

### 1.5 Recap when the scientist comes back

- **What it is.** A short summary when the scientist returns to a session: what is done, what waits for an answer, and what is out of date.
- **Where it comes from.**
  - Claude Code session recap and `/recap`: <https://code.claude.com/docs/en/commands>.
  - Codex `/recap`: <https://github.com/openai/codex/blob/main/codex-rs/tui/src/slash_command.rs>.
- **Problem it solves.** A question can wait for hours or days (design.md, "Questions that wait for you"). On return, the scientist has lost the context.
- **Close in Cuvette today.** Session titles and descriptions, `/questions`, and the trail.
- **How it fits.** Build it from the record without a model: trail level 1 of the last turn, the open questions, and the out-of-date steps from 1.3.
- **Effort.** Small.
- **Recommendation.** After launch.

### 1.6 Side question

- **What it is.** A question about the session that gets an answer without tools and stays out of the analysis context.
- **Where it comes from.** Claude Code `/btw` (<https://code.claude.com/docs/en/commands>). Cursor side chats (<https://cursor.com/docs/agent/overview>).
- **Problem it solves.** A student asks "What does SEM mean?" during a long step. Now that question goes into the analysis history.
- **Close in Cuvette today.** Messages sent during a turn go into a queue, and the agent reads them after the current step.
- **How it fits.** Log the side question and its answer as `note` entries. They stay out of the trail and out of the claim check.
- **Effort.** Small.
- **Recommendation.** After launch, low priority.

### 1.7 Step cache

- **What it is.** A step with the same tool, arguments, decisions, input hashes, adapter version and package lock as an earlier step uses the earlier output and does not run again.
- **Where it comes from.**
  - Nextflow task hash: <https://docs.seqera.io/nextflow/cache-and-resume>.
  - Snakemake cache across workflows, with a Merkle-tree hash: <https://snakemake.readthedocs.io/en/stable/executing/caching.html>.
  - Galaxy job cache, which is opt-in for each user and each tool: <https://training.galaxyproject.org/training-material/faqs/galaxy/re_use_equivalent_jobs.html>.
  - DVC run cache: <https://doc.dvc.org/user-guide/pipelines/run-cache>.
- **Problem it solves.** `/rerun` and `cuvette replay` run every step again, including a 20-minute segmentation whose inputs did not change.
- **Close in Cuvette today.** All the parts of the key are in the record. No cache exists.
- **How it fits.**
  - The node gets a `cachedFrom` field.
  - An adapter marks a tool with `cache: false` if it has randomness with no seed or depends on a web service. METASPACE is an example.
- **Effort.** Medium.
- **Recommendation.** After launch, after 2.1. Without the package lock, the cache key is not complete, and a cache hit can be wrong.

## 2. Reproducibility and sharing

### 2.1 Package lock for each session

- **What it is.** The record keeps the exact versions of all packages in each environment that a step used, including the packages that the main packages pull in.
- **Where it comes from.**
  - uv lock files and `exclude-newer`: <https://docs.astral.sh/uv/concepts/resolution/>.
  - renv lock files: <https://rstudio.github.io/renv/articles/renv.html>.
  - Snakemake pin files for each rule: <https://snakemake.readthedocs.io/en/stable/snakefiles/deployment.html>.
  - nf-core pinned versions for each module: <https://nf-co.re/docs/tutorials/migrate_to_topics/update_modules>.
  - CWL `SoftwareRequirement`: <https://www.commonwl.org/v1.2/CommandLineTool.html>.
- **Problem it solves.** A scanpy or DESeq2 result depends on numpy, anndata or Bioconductor versions. A reviewer or the scientist cannot rebuild the environment a year later.
- **Close in Cuvette today.**
  - Each node stores the adapter version and the program version.
  - `src/tools/science-requirements.txt` pins only some top-level packages.
  - The databook writes "version not recorded" for steps without a program version.
- **How it fits.**
  - At the first use of an environment in a session, run `uv pip freeze` for Python or read `installed.packages()` for R.
  - Store the result as a blob, and put its hash on each node (`envSha`).
  - The databook gets an appendix with the packages. The `.eln` file gets the lock file.
  - 1.3 and 1.7 use the hash.
- **Effort.** Small.
- **Recommendation.** Now. The record states that each number can be repeated. This is the largest gap in that statement, and it changes no screen that the demo shows.

### 2.2 Copy of small input files

- **What it is.** The session keeps a copy of each input file below a size limit, stored by its hash.
- **Where it comes from.** DVC data versioning (<https://doc.dvc.org/start/data-management/data-versioning>). The CWLProv `data/<sha1>` folder (<https://cwltool.readthedocs.io/en/latest/CWLProv.html>).
- **Problem it solves.** The scientist moves or edits the source file. `cuvette replay` and a reviewer then cannot find the original input.
- **Close in Cuvette today.** Each node stores the input hashes, and outputs are blobs. `docs/eln.md` states that the export does not send input data. That choice is deliberate.
- **How it fits.** Make it opt-in with a size limit, for example 50 MB. Do not copy a file that 4.1 flagged.
- **Effort.** Small.
- **Recommendation.** After launch, opt-in only.

### 2.3 Citation field in the adapter manifest

- **What it is.** Each adapter lists the DOI (Digital Object Identifier) of the paper to cite for the program, and optionally its bio.tools ID and EDAM (an ontology of bioinformatics operations and topics) terms. The adapter checker requires the DOI.
- **Where it comes from.**
  - Galaxy tool XML has citations, bio.tools references and EDAM terms: <https://docs.galaxyproject.org/en/master/dev/schema.html>.
  - Galaxy "export citations" for a whole history: <https://training.galaxyproject.org/training-material/faqs/galaxy/histories_export_citations.html>.
- **Problem it solves.** The methods section must cite the right paper for ImageJ, Cellpose or DESeq2.
- **Close in Cuvette today.** The databook already writes a methods paragraph with references. It finds a citation when the words of a credits heading match the adapter name (`src/core/databook.ts:135`). If no heading matches, it falls back to the program name and homepage. That match is fragile.
- **Effort.** Small: one field in the manifest, one lint rule, and the DOIs for the 34 catalog adapters.
- **Recommendation.** After launch. The databook works today, so this is an improvement and not a fix.

### 2.4 Provenance Run Crate inside the `.eln` file

- **What it is.** A standard RO-Crate profile that describes each tool run as a `CreateAction`. It has the tool (`instrument`), the inputs (`object`), the outputs (`result`), the person (`agent`) and the times. `ParameterConnection` entries describe the links between steps.
- **Where it comes from.**
  - Process Run Crate: <https://www.researchobject.org/workflow-run-crate/profiles/process_run_crate/>.
  - Provenance Run Crate: <https://www.researchobject.org/workflow-run-crate/profiles/provenance_run_crate/>.
  - Galaxy exports Workflow Run Crates (<https://training.galaxyproject.org/training-material/topics/fair/tutorials/ro-crate-in-galaxy/tutorial.html>), and so does the Nextflow nf-prov plugin (<https://github.com/nextflow-io/nf-prov>).
- **Problem it solves.** WorkflowHub, Galaxy and data repositories can read the steps of the analysis from the file. Now they see only a folder of files.
- **Close in Cuvette today.** The `.eln` export has one `Dataset` for each step and one `PropertyValue` for each decision. Cuvette nodes map one to one onto `CreateAction`.
- **Open point.** The run-crate profile pages say that they extend RO-Crate 1.3. The ELN Consortium format pins RO-Crate 1.2. Check that both can apply to one file before you build it.
- **Effort.** Medium.
- **Recommendation.** After launch. The scientist never sees this metadata. It matters to repositories and data stewards.

### 2.5 Hash chain on the session log

- **What it is.** Each line of `log.jsonl` holds the SHA-256 of the line before it. The databook and the eLabFTW push show the hash of the last line.
- **Where it comes from.** This item is a proposal from this survey, not a copy of one tool. Related work:
  - The ELN format allows a minisign signature on the metadata file: <https://github.com/TheELNConsortium/TheELNFileFormat/blob/master/SPECIFICATION.md>.
  - The Five Safes Crate records sign-off steps: <https://www.researchobject.org/ro-crate/5s-crate>.
- **Problem it solves.** After an eLabFTW push, a later edit of the log becomes visible, because the hash in the notebook no longer matches.
- **Close in Cuvette today.** The log is append-only by convention. The `.eln` metadata lists the SHA-256 of the whole log, and the push records a content hash.
- **Effort.** Small for the chain. Signing with a key per user is medium and needs key management.
- **Recommendation.** After launch for the chain. Do not add signing until a lab asks for it.

### 2.6 Parameters cell in the notebook export

- **What it is.** The first cell of the `.ipynb` export holds the input paths and the decision values, with the `parameters` tag. Papermill or `quarto render -P` can then run the notebook on new values.
- **Where it comes from.** Quarto parameters: <https://quarto.org/docs/computations/parameters.html>.
- **Close in Cuvette today.** The notebook export has Python cells that call `cuvette run-step`. `cuvette replay` runs a flow on new data.
- **Effort.** Small.
- **Recommendation.** After launch, low priority. It helps the programmer in the lab, not the scientist who does not program.

### 2.7 protocols.io export

- **What it is.** The protocol export goes to protocols.io as a draft. protocols.io can give it a DOI.
- **Where it comes from.**
  - protocols.io API: <https://apidoc.protocols.io/>.
  - Biomni searches protocols.io: `biomni/tool/protocols.py` in <https://github.com/snap-stanford/Biomni>.
  - RSpace and SciNote import protocols from protocols.io: <https://documentation.researchspace.com/article/s3j29if453-export-formats>, <https://knowledgebase.scinote.net/en/knowledge/ai-protocol-parser>.
- **Close in Cuvette today.** `/export protocol` writes Markdown with the manual route of each step.
- **Effort.** Medium: an API token, and a conversion to their step format.
- **Recommendation.** After launch, low priority. The Markdown protocol can already be pasted into protocols.io.

### 2.8 Publish to Zenodo with a DOI

- **What it is.** Upload the `.eln` file and the databook to Zenodo, reserve a DOI, and write the DOI into the databook.
- **Where it comes from.** Zenodo REST API with `prereserve_doi`: <https://developers.zenodo.org/>. WorkflowHub DOIs: <https://about.workflowhub.eu/docs/citable/>.
- **Recommendation.** No, for now. A published Zenodo record is public and cannot be deleted. That is a large step for an agent tool to take. A manual upload of the `.eln` file works today.

## 3. Review and trust

### 3.1 Trust prompt for a project folder

- **What it is.** The first time Cuvette starts in a folder that has its own settings, a card asks whether the scientist trusts that folder. Until the scientist answers yes, Cuvette ignores the folder's hooks, permission rules, bypass setting and adapters.
- **Where it comes from.**
  - Gemini CLI trusted folders, with "safe mode" for an untrusted folder: <https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/trusted-folders.md>.
  - Codex keeps a trust status for each hook, with a hash of the hook. A hook that changes needs trust again (`codex-rs/hooks/src/engine/discovery.rs:679` in <https://github.com/openai/codex>).
- **Problem it solves.** Today, a data folder from a colleague or a download can run code with no card:
  - `loadSettings` merges `<folder>/.ga/settings.json` and `settings.local.json` into the settings (`src/core/config.ts:99`). This includes `hooks` and `permissions`.
  - The session passes these hooks to the hook runner (`src/core/session.ts:388`) and fires `SessionStart` at the start (`src/core/session.ts:412`). A command hook in that file therefore runs at session start with no card.
  - The same file can set `"permissions": "bypass"`.
  - `<folder>/.ga/adapters` is first in the adapter search order (`src/core/settings.ts:359`). A folder can therefore replace the `imagej` adapter with its own `adapter.ts`. The draft notice shows, but the code still runs.
  - The Finder action ("Analyze with Cuvette") makes it easy to start Cuvette in any folder.
- **Close in Cuvette today.** Permission cards, deny rules, and the draft notice for adapters. Nothing checks where the settings came from.
- **How it fits.**
  - Keep a list of trusted folders in `CUVETTE_HOME`, with the SHA-256 of the folder's settings files. A changed file needs trust again, as in Codex.
  - The card lists what the folder sets: the hook commands in full, the permission changes, and the adapters that replace catalog adapters.
  - Record the answer in the log.
  - With no answer, or with "no", load only the user settings and the catalog.
- **Effort.** Small.
- **Recommendation.** Now, before the posts. If it cannot be built in time, add a warning to the README and turn off folder hooks by default until it is built.

### 3.2 Data check on load, with problems as question cards

- **What it is.** When a table loads, code (not the model) checks it. It looks for missing values, duplicate sample IDs, text in a number column, mixed units in a column name, groups with one or two units, and values far outside the rest. Each problem that can change the result becomes a question card, for example: "4 rows have no value for Drug 2. Remove these patients, or stop?"
- **Where it comes from.**
  - Positron Data Explorer summary panel, with missing values and a histogram for each column: <https://positron.posit.co/data-explorer-summary-panel.html>.
  - Marimo column summaries: <https://docs.marimo.io/guides/working_with_data/dataframes/>.
  - Posit Assistant "What does this data look like?": <https://assistant.posit.co/docs/guides/explore-your-data>.
  - Benchling Notebook Check, an advisory check for missing values, duplicates and decimal errors: <https://help.benchling.com/hc/en-us/articles/27659453707405-Notebook-Check>.
  - Julius "Edit Schema" to correct a column type [unverified]: <https://www.datacamp.com/tutorial/julius-ai-guide>.
- **Problem it solves.** Silent exclusions. A model or a library drops rows with missing values, and the scientist does not know. An exclusion is a method decision, so the scientist must own it.
- **Close in Cuvette today.**
  - `summarize_table` in the `tables` adapter gives n, mean, SD and quartiles. It does not report missing values or duplicates.
  - `fit_mixed_model` reports the count of dropped rows (commit `0a27fc1`), but only after the fact.
  - The plan can list exclusions.
- **How it fits.** The check runs in the harness, under design rule one. Each flagged problem becomes an `exclusion` decision that the scientist owns. The answer goes into the decision record and the databook's exclusion table.
- **Effort.** Medium. A first version for CSV and xlsx files is close to small.
- **Recommendation.** After launch, first item. It adds a card to the flow that the demo shows, so do not add it on launch day.

### 3.3 References for each option on a question card

- **What it is.** A question card shows, for each option, one or two sources that support it. Each source has a DOI and a short quote.
- **Where it comes from.**
  - PaperQA2 and WikiCrow (FutureHouse): <https://arxiv.org/abs/2409.13740>. The paper reports 85.2% precision on LitQA2. The system answered "insufficient information" in about 21.9% of cases.
  - Elicit reports, with an exact quote for each claim: <https://blog.elicit.com/introducing-elicit-reports>.
  - Biomni know-how documents, with source, license and date in a header: <https://github.com/snap-stanford/Biomni/tree/main/biomni/know_how>.
- **A warning from the same field.** An independent evaluation of Sakana's novelty check found that it marked all 12 ideas "novel", including known methods: <https://arxiv.org/abs/2502.14297>. A model that searches the literature without a strict default gives false comfort.
- **Problem it solves.** A student does not know why TMM differs from TIC normalization, or why a mixed model is needed. A reference makes the choice an informed one.
- **Close in Cuvette today.** `STANDARDS.md` for each adapter, the decision help text, the sensitivity check, and the agent's recommendation with its reason.
- **How it fits.** Use curated references only: add a `refs` list (DOI and quote) to each decision in `adapter.yaml`. The adapter author checks them, and the adapter checker checks that each DOI resolves. Do not add a live literature search.
- **Effort.** Small for the field and the card. The content takes time for each adapter.
- **Recommendation.** After launch, curated references only. Live search: no, because of the risk of invented or weak citations on a decision card.

### 3.4 Sign-off by a second person

- **What it is.** A colleague or principal investigator (PI) reads the session, comments on findings and decisions, and signs. The record gets a `signoff` entry with the name, the role and the hash of the last log line.
- **Where it comes from.**
  - Hex reviews before publish: <https://hex.tech/blog/reviews>.
  - Elicit dual screening: <https://support.elicit.com/en/articles/9514625>.
  - Benchling Notebook Check runs before a second person reviews (link in 3.2).
  - The Five Safes Crate has an `AssessAction` for sign-off (link in 2.5).
- **Problem it solves.** In a lab, a second person checks an analysis before it goes into a paper. Today the referee is a model, and the scientist resolves its findings alone.
- **Close in Cuvette today.** Findings with accept, reject or fix. The referee model. The eLabFTW push.
- **Open point.** eLabFTW has its own timestamp and signature features [not checked in this survey]. Check whether a push plus eLabFTW's own signature already does this job.
- **Effort.** Medium.
- **Recommendation.** After launch. First check eLabFTW. Build it in Cuvette only if eLabFTW does not cover it.

### 3.5 Referee focus on interpretation

- **What it is.** The referee gets a list of the "inferred" claims and checks each one against the logged results.
- **Where it comes from.** Kosmos (Edison Scientific): <https://arxiv.org/abs/2511.02824>. Independent scientists judged 79.4% of the statements in its reports accurate. A third-party summary splits this: data statements about 85.5%, literature 82.1%, interpretation 57.9% [split unverified].
- **Close in Cuvette today.** The claim check already labels claims `measured`, `inferred`, `literature` or `unsourced` (`src/core/claims.ts:199`). Only `unsourced` numbers make an error finding.
- **Effort.** Small: one extra section in the referee prompt and one finding type.
- **Recommendation.** After launch.

### 3.6 Repeat-run stability in the benchmark

- **What it is.** Run each benchmark paper several times. Score whether the values, the decisions and the claim links stay the same.
- **Where it comes from.**
  - An independent study of Elicit found the same extracted value about 90% of the time, but the same quote only about 46% [unverified, secondary report].
  - BixBench adds a refusal option to its multiple-choice form: <https://arxiv.org/abs/2503.00096>.
- **Problem it solves.** The status report already says that small-model runs vary a lot. A stability score shows how much.
- **Close in Cuvette today.** `cuvette bench papers --runs N`.
- **Effort.** Small.
- **Recommendation.** After launch.

## 4. Data handling

### 4.1 Warning card before patient identifiers go to a cloud model

- **What it is.** Before a table goes to a cloud model, code checks the column names and the values for patterns that look like identifiers. Examples: name, MRN (medical record number), DOB (date of birth), SSN (Social Security number), address, phone, email and ZIP code. If it finds one, a card asks the scientist what to do.
- **Where it comes from.**
  - CRISPR-GPT blocks a prompt with a DNA sequence of 20 bp or more before it goes to an external model: <https://arxiv.org/html/2404.18021v2>.
  - Posit querychat sends the schema and a data dictionary to the model, but no raw values: <https://posit-dev.github.io/querychat/py/>.
  - Gemini CLI `BeforeModel` hooks can redact a request: <https://github.com/google-gemini/gemini-cli/blob/main/docs/hooks/index.md>.
- **Problem it solves.** The launch targets medical students and wet-lab scientists. A clinical spreadsheet with protected health information (PHI) can go to a cloud model in the first session.
- **Close in Cuvette today.** `docs/design.md` plans "data rules" with "summaries only" as the default for a cloud model. This is not built. Local models through Ollama keep data on the computer.
- **How it fits.**
  - The card has three options: use a local model; continue with a copy of the table without the flagged columns; or continue as it is. The harness writes the copy, and the record logs the choice.
  - The card must say that this is a check of column names and patterns, not de-identification.
- **Effort.** Small.
- **Recommendation.** Now. The launch audience makes this risk real, and the check needs no model.

### 4.2 Summaries-only mode for cloud models

- **What it is.** With a cloud model, tool results that go to the model hold the schema, the counts and the summary statistics, but not the raw rows. The full results stay in the record.
- **Where it comes from.** Posit querychat (link in 4.1). Hex and DataLab state on their docs pages which data goes to the model provider: <https://learn.hex.tech/docs/getting-started/ai-overview>, <https://datalab-docs.datacamp.com/work/ai-assistant.md>.
- **Close in Cuvette today.** Tool results are already shortened for small models. `read_file` returns the file text.
- **Effort.** Medium to large. Each adapter's results need a check, and some steps need the model to see values, for example to pick a column.
- **Recommendation.** After launch. Build 4.1 first, then this as a setting.

### 4.3 Sample sheet

- **What it is.** One table that maps each file to its sample, group, unit of replication (for example animal, patient or culture) and batch (for example slide, plate, day or run). The scientist fills it in, or the agent drafts it from the file names and the scientist accepts each row. Column units and meanings can go in the same sheet.
- **Where it comes from.**
  - Galaxy 25.1 sample sheets (sample, treatment, condition, file): <https://docs.galaxyproject.org/en/latest/releases/25.1_announce_user.html>.
  - openBIS controlled vocabularies: <https://openbis.readthedocs.io/en/7.x/user-documentation/general-admin-users/admins-documentation/new-entity-type-registration.html>.
  - Databricks drafts column descriptions that the user accepts one by one: <https://docs.databricks.com/aws/en/comments/ai-comments>.
  - Hex semantic models: <https://learn.hex.tech/docs/connect-to-data/semantic-models/intro-to-semantic-models>.
- **Problem it solves.** The two most common traps in the Cuvette benchmark:
  - Pseudoreplication: the test uses cells or pixels as if they were animals.
  - Confounding: the treated group was imaged on another day.

  With a sample sheet, a rule check in code can flag both. A group that matches a batch is confounded. A test with n equal to the number of cells, not the number of units, is pseudoreplication.
- **Close in Cuvette today.** Question cards ask for the groups and the unit of replication. Reference mode reads a sheet of earlier hand counts. The checks depend on what the model reports.
- **Effort.** Medium.
- **Recommendation.** After launch. It is the strongest item in this survey for the core goal, but it adds a step to setup. Design that step with care, not in one day.

### 4.4 Read data from eLabFTW

- **What it is.** Import files from an eLabFTW experiment into a session, and push the results back to the same experiment.
- **Where it comes from.** Galaxy 25.0 eLabFTW file source: <https://galaxyproject.org/news/2025-04-02-elabftw-integration>.
- **Close in Cuvette today.** Push only (`docs/eln.md`). The roadmap lists a real test against a lab server as not done.
- **Effort.** Medium.
- **Recommendation.** After launch, low priority. Do the real eLabFTW push test first.

## 5. Collaboration and lab use

### 5.1 Method templates from a finished session

- **What it is.** "Save as method" writes a template from a session: the question, the adapters with versions, the confirmed plan, the decisions with their owners, and the inputs as parameters. "Start from method" opens a new session with these filled in. The new session asks only for the new inputs, then runs the data check and the pilot on one sample, then asks to confirm.
- **Where it comes from.**
  - Goose recipes: typed parameters (including `file` and `select`), example prompts as buttons, an output schema and retry checks: <https://github.com/block/goose/blob/main/documentation/docs/guides/recipes/recipe-reference.md>.
  - Galaxy "extract workflow from history": <https://training.galaxyproject.org/training-material/faqs/galaxy/workflows_extract_from_history.html>.
  - nf-core launch form from a parameter schema: <https://nf-co.re/docs/nf-core-tools/pipelines/launch>.
  - Warp workflows with `{{arg}}` slots: <https://docs.warp.dev/knowledge-and-collaboration/warp-drive/workflows>.
- **Problem it solves.** A lab repeats the same analysis each week. A new lab member must use the method that the lab agreed on.
- **Close in Cuvette today.**
  - Decision profiles (`saveProfile`).
  - The flow export with `cuvette replay`, which runs with no agent.
  - Lab memory and `LAB.md`.

  Replay stops at the first data difference. A method session keeps the guidance: the cards, the pilot and the review.
- **Effort.** Medium.
- **Recommendation.** After launch. Profiles and replay cover part of this job today.

### 5.2 Adapter install from a URL, with tests on this computer

- **What it is.** `cuvette adapter add <git URL>@<commit>` fetches an adapter at a fixed commit, runs `cuvette adapter check --run-tests` on this computer, shows the result on a card, and records the commit in each session that uses the adapter.
- **Where it comes from.**
  - Claude Code plugin marketplaces: <https://code.claude.com/docs/en/plugin-marketplaces>.
  - Galaxy IWC (Intergalactic Workflow Commission) review of workflows: <https://github.com/galaxyproject/iwc>.
  - nf-core `modules.json`, which pins each module to a git commit (link in 2.1).
  - Gemini CLI extensions declare secret settings, and the CLI keeps those in the keychain: <https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md>.
- **Problem it solves.** After the launch, people will write adapters. A second lab needs a safe way to use one. `docs/design.md` proposes that "the second lab runs the known-answer tests on its own computer before the first use". This item builds that.
- **Close in Cuvette today.** The catalog, `cuvette adapter check`, `cuvette adapter approve`, `~/.cuvette/adapters/`, and `cuvette onboard`.
- **Effort.** Medium.
- **Recommendation.** After launch. Build it when the first outside adapter arrives. It depends on 3.1 for the trust rules.

### 5.3 Tutorials in follow mode

- **What it is.** `cuvette learn <adapter>` picks a known-answer test and starts follow mode on its data. The scientist does each step in the program. The harness checks the numbers against the expected values.
- **Where it comes from.**
  - Galaxy Training Network, with learning pathways and training data on Zenodo: <https://training.galaxyproject.org>.
  - Claude Code "Learning" output style: <https://code.claude.com/docs/en/output-styles>.
- **Problem it solves.** Medical students and new lab members must learn ImageJ or QuPath. Follow mode exists, but nothing starts a guided lesson.
- **Close in Cuvette today.** Follow and teach modes, the sample sleep analysis, and known-answer tests with data and expected values.
- **Effort.** Small. Most parts exist.
- **Recommendation.** After launch.

## 6. Model use and cost

### 6.1 Session cost and context fill in the status line

- **What it is.** The status line shows the cost of this session in dollars, for example "$0.42 this session". For a local model it shows "local, no cost" and the context fill, for example "context 18k of 32k". The app shows the same values.
- **Where it comes from.**
  - Aider prints the cost of each message and the session total: `aider/coders/base_coder.py` in <https://github.com/Aider-AI/aider>.
  - Claude Code `/usage`: <https://code.claude.com/docs/en/costs>.
  - Jupyter AI 3.1 shows context fill and cost in the input box: <https://jupyter-ai.readthedocs.io/en/stable/releases/v3.1.0.html>.
  - Warp shows a context meter from 20% use: <https://docs.warp.dev/agents/using-agents>.
- **Problem it solves.** A scientist on an API key does not know what a session costs. A user of a local model does not know when compaction will start.
- **Close in Cuvette today.**
  - The status line shows input and output tokens (`src/tui/view.tsx:172`).
  - `src/core/spend.ts` computes dollars for each call and keeps a ledger.
  - `budgetUsd` stops spend at a monthly limit.
  - `/config` shows the spend of the month.
- **Effort.** Small.
- **Recommendation.** Now. The numbers already exist, so the change is to the display only.

### 6.2 Resume from a summary when the cache is cold

- **What it is.** When a large session resumes after a long pause, a card offers two choices: resume from a summary, or resume with the full history.
- **Where it comes from.** Claude Code. The card appears after about one hour idle on a session of more than 100k tokens: <https://code.claude.com/docs/en/sessions>.
- **Close in Cuvette today.** Conversation caching and compaction.
- **Effort.** Small.
- **Recommendation.** After launch, low priority. First measure how often a resumed Cuvette session passes 100k tokens.

## 7. User interface

### 7.1 Beginner level of explanation

- **What it is.** A setting with two values: brief or beginner. At the beginner level, each step line gets one "why" sentence from the decision help text, and each statistics term links to a short glossary in the adapter's `STANDARDS.md`. Code adds this text, not the model.
- **Where it comes from.**
  - Claude Code "Explanatory" and "Learning" output styles (link in 5.3).
  - Hex personal response style: <https://learn.hex.tech/docs/explore-data/notebook-view/notebook-agent>.
  - Databot offered three to five next steps after each turn: <https://posit.co/blog/introducing-databot>.
- **Problem it solves.** A first-year medical student and a senior scientist need different amounts of text.
- **Close in Cuvette today.** Teach and follow modes, the plain-language trail, and the decision help text.
- **Effort.** Small.
- **Recommendation.** After launch.

### 7.2 Notifications when a turn ends or fails

- **What it is.** A push notification when a long turn finishes or fails, not only when a question waits.
- **Where it comes from.**
  - Codex `notify` with `agent-turn-complete`: `codex-rs/hooks/src/legacy_notify.rs` in <https://github.com/openai/codex>.
  - Warp notifications for done, blocked and error: <https://docs.warp.dev/agents/capabilities/agent-notifications>.
  - Claude Code agent view states: <https://code.claude.com/docs/en/agent-view>.
- **Close in Cuvette today.** ntfy pushes questions (`src/core/session.ts:347`). The app uses the browser's notifications.
- **Effort.** Small.
- **Recommendation.** After launch.

## Considered and left out

| Feature | Source | Reason |
| --- | --- | --- |
| Background tasks and a view of all running agents | Claude Code `/tasks` and agent view; Cursor cloud agents | Large. A second process model for a session adds state that the record must cover. The pilot gate already limits long batches. Revisit when a real batch blocks a user |
| Model that approves actions in place of the human | Claude Code auto mode; Codex auto-review; OpenHands ConfirmRisky; Goose Smart Approval | Already rejected in the 2026-10-07 survey. Rules in code decide, not a model |
| Model score for the chance of success | OpenHands critic (<https://docs.openhands.dev/openhands/usage/cli/critic.md>) | A model's estimate is not evidence. The rule checks and the claim check do this job with records |
| `/goal` completion loop | Claude Code `/goal` | The confirmed plan and the claim check before the answer already define "done" |
| Scheduled runs | Hex, DataLab, Goose scheduler | Lab analyses start when data arrives, not on a timer |
| Click to edit a chart, or drill into a chart | ChatGPT interactive charts; Hex drill; Colab visualization cells | A figure that changes outside a tool call has no record. This breaks design rule four |
| Hosted share link for a session | Hex shared threads; Galaxy Pages; Goose deeplinks | Needs a server and moves data off the computer. The HTML trail, the databook and the `.eln` file are enough |
| PDF or report to table with a model | Benchling Data Entry; SciNote "Import with AI" | Numbers that a model reads from a PDF have no tool record |
| Stop for hazardous requests | ChemCrow controlled-chemical check; CRISPR-GPT germline warning | Cuvette analyzes existing data and does not plan syntheses or edits. ChemCrow's stop is also only a prompt line (`chemcrow/agents/prompts.py:33`), which shows why such a stop must be code |
| Hypothesis tournament, novelty check, automated paper review | Google AI co-scientist; Sakana AI Scientist | Outside Cuvette's job, which is the analysis. The novelty check also has a measured false "novel" rate |
| Auto memory without approval | Codex memories; Claude Code auto memory | Cuvette's lab memory needs the scientist's approval. Gemini CLI's auto memory uses an approval inbox, which matches what Cuvette does now |
| Custom status line scripts, custom output-style files | Claude Code `/statusline`, output styles | Configuration for programmers. Item 6.1 and item 7.1 cover the need |
| Containers, image freezes, signed images | Nextflow Wave; Apptainer; Docker digests | Large and heavy for a lab Mac. The package lock (2.1) covers most of the need |
| FAIR score of an export | F-UJI | Repositories run this. The scientist does not need it |
| Repository map, language server, file edit diffs | Aider; Cursor; Claude Code | The agent does not edit source code (2026-10-07 survey) |

## Open items

- RO-Crate 1.2 (the ELN format) against 1.3 (the run-crate profiles). Check this before item 2.4.
- eLabFTW signatures and timestamps. Check these before item 3.4.
- The Kosmos accuracy split and the Elicit stability figures come from secondary reports. Read the full papers before you cite them.
- Julius AI has no public docs that this survey could read. Its entries are unverified.
