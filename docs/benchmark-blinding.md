# Benchmark blinding

The paper benchmark must show one thing. A scientist uses Cuvette with the data and the method choices of a paper. Cuvette then reproduces the results of the paper. The AI agent that drives the harness must not see the expected results.

Blind mode makes this true for each run. Blind mode is on by default in `bench papers`. The flag `--no-blind` turns it off. Normal use of Cuvette (not a benchmark) does not change.

## How a run works

A script plays the scientist. It does three things:

1. It sends the request from `bench.yaml` (`prompt`). The request names the data files and the question of the paper. It gives no result.
2. It applies the setup values (`setup`).
3. It answers each decision card from `answers`. Each answer is a method choice from the methods section of the paper, for example the normalization, the cutoff, or the model formula. If a card has no answer, the script accepts the recommendation of the card.

The script approves the tool permissions. It does not type anything else. It does not see the progress of the agent. It does not correct the agent.

The expected values (`items` in `bench.yaml`, and `expected.yaml`) stay with the scorer. The scorer reads them only after the run ends.

## What the agent can see

- The request, the setup values and the answers of the decision cards.
- The system prompt of the harness and the text of the loaded adapters that the harness sends. This text is the instructions, the standards, the tool descriptions, and a skill when the agent calls `load_skill`.
- The files on the allow list, through `read_file` and `list_dir`.
- The outputs of the tools that it runs.

The allow list for `read_file`, `list_dir` and `run_command`:

| Path | Why |
| --- | --- |
| `<data root>/<paper id>/` and each data folder that `bench.yaml` names | The data of the paper |
| The run folder (`bench-runs/<date>/<model>/<paper>/run<N>/`) | The session record and the work folder |
| Program folders: the folder of the program that each adapter found, `~/.guided-analysis/envs/`, `~/.guided-analysis/adapters/`, the R library on the T7 disk | The programs that the adapters run |
| `/usr`, `/bin`, `/sbin`, `/opt`, `/Library`, `/System`, `/Applications`, `/etc`, `/dev` | System files |
| The temporary folder of the user (`$TMPDIR`) | Temporary files |
| `src/adapters/`, `node_modules/`, `package.json`, `tsconfig.json` of the repository | The adapter worker scripts and the Node.js packages that child processes load |

The session cwd is the work folder of the run, not the repository. A relative path resolves inside the run folder.

The folders of the loaded adapters (`catalog/<name>/`) are a special case. The adapter processes (the Python workers, R scripts and programs of the adapter) can read them, because they hold the adapter code. The agent cannot read them with a file tool, with `run_script`, or through a path argument of any tool. These folders hold the known-answer tests, and many tests use the same public data as a paper.

## What the agent cannot see

The deny list applies to every tool and to every child process:

- the repository, except the paths on the allow list above. This is `bench/`, `bench/results/`, `docs/`, `tests/`, `catalog/`, and the main checkout when the harness runs from a worktree;
- the folder of the paper specs and the results folder of the run;
- the past benchmark runs (`/Volumes/T7/guided-analysis/tools/bench-runs/`) and the other folders in `/Volumes/T7/guided-analysis/tools/`, except the program folders;
- the reference folder (`/Volumes/T7/guided-analysis/reference/`). It holds the result files from the downloads, for example the vignettes and the reports;
- the real home folder of the harness (`~/.guided-analysis`, `~/.cuvette`): past sessions, questions, spend. The program environments stay readable;
- `~/.claude` and `/private/tmp/claude-<uid>` (the notes and the transcripts of the coding agents).

If two rules match a path, the longer rule wins. Thus the adapter processes of rdkit can read `catalog/rdkit/`, but not the rest of the repository.

## How the harness enforces it

There are three layers.

1. **The tool check.** Before each tool call, the harness finds the paths in the arguments. This includes the paths in the code of `run_script`. A generic file tool must use a path on the allow list. Any other tool must not use a path on the deny list. The harness resolves symbolic links first. If the check fails, the tool does not run. The harness writes a `blocked` entry with the reason `blind mode` to the session record.
2. **The operating system sandbox.** On macOS, the harness starts each child process with `sandbox-exec`. This includes `run_script`, the adapter workers (Python, R, Node.js, Java) and the command-line programs. The sandbox profile denies `file-read-data` on the deny list. It allows the program folders inside it again. The profile of `run_script` also denies the adapter folders. A script that builds a path at run time still cannot open the file. When `run_script` fails on a denied path, the harness writes a `blocked` entry.
3. **The leak check.** After each run, the benchmark reads the session record. See the next section.

## The leak check

For each run, the report and the JSON file show:

- **Paths read.** Every path in the arguments of the tool calls and of the steps.
- **Outside.** Each path that is not on the allow list. The report lists these paths.
- **Blocked.** The number of reads that blind mode stopped (the `blocked` entries, and the sandbox denials in the tool results).
- **Unsourced.** The number of claims in the final answer that the claim check labels unsourced. No logged step holds the number.
- **Literature.** The number of claims that the answer attributes to a publication.
- **Sandbox.** `on` if the operating system sandbox was active.

A clean run has zero paths outside the allow list. The JSON field is `runs[].leaks`. The policy of each run is in `runs[].blind` (cwd, allow list, deny list, sandbox).

`ga bench rescore` computes the leak check again from the session record.

## Leaks found and fixed

The audit on 2026-10-08 searched for each expected value of each paper. It searched the data folders (with the archives and PDFs), the adapter folders, `src/`, and the `prompt`, `setup` and `answers` fields. The table lists each way that the agent could see an expected value before this change.

### The harness

| Leak | Evidence | Fix |
| --- | --- | --- |
| `read_file` and `list_dir` accepted any path under the session cwd, and the cwd was the repository root | The agent could read `bench/papers/<id>/expected.yaml`, `paper.md`, `triage.md`, `runs-*.md`, `bench/results/`, `docs/` | Blind mode: the cwd is the work folder of the run, and the file tools use the allow list |
| `run_script` and the adapter processes could read any file | The macOS sandbox limited only writes | Blind mode: the sandbox denies reads on the deny list |
| Past runs and notes were readable | `/Volumes/T7/guided-analysis/tools/bench-runs/`, the rerun folders and logs in `tools/`, `~/.guided-analysis/sessions/`, `~/.claude/` | On the deny list |
| The description of the `calculate` tool (sent in every run) | `ratio(4696, 5007)` is the ratio item of ljosa2012 (0.9379, true total 5007) | New example numbers |

### The data folders

| Paper | Files | Evidence | Fix |
| --- | --- | --- | --- |
| alexandrov2019 | `2022-08-16_*_{LipidMaps,HMDB}_fdr10.csv` | METASPACE result tables; the row counts 414, 263, 191, 123 are the items | Moved to the reference folder; removed from `data:` |
| andrews-fastqc | `*_fastqc.html` | The example reports give the total sequences, length, %GC and module status | Moved |
| bemis2015 | `CardinalWorkflows_1.44.0.tar.gz` and the unpacked package (`inst/doc`, `vignettes`) | The vignette gives 4,959 spectra, 10,200 m/z values, 687 peaks, 6 and 3 segments | Moved; only `data/pig206.rda` stays |
| bradley-photutils | `truth_100gaussians.csv`, `isolated_truth.csv`, `gaussians_noiseless.fits` | The truth fluxes at the three asked positions | Moved |
| ljosa2012 | `BBBC005_results_bray.csv` | The published CellProfiler counts, the source of two items | Moved |
| gramfort2013 | `MEG/sample/*-ave.fif`, `*-ave.log`, `*-eve.fif`, `*-cov.*`, source estimates | Event counts per id (72, 73, 73, 71) and a precomputed evoked average | Moved; only the two raw files stay |
| white2021-flowkit | the package source (`docs/notebooks`, `src/tests`) | The notebooks print 133670, 82484, 47165; a test asserts 133670 | Moved; only `8_color_data_set` and `gate_ref` stay |
| palmer2017 | `MTBLS313_..._maf.tsv`, `MTBLS317_m_maf.tsv` | The published annotation table, the source of 51, 66, 103 | Moved; removed from `data:` |
| schramm2012 | `test_basic.py`, `Example_Continuous.parse.npz` | `assert len(parser.coordinates) == 9` | Moved |

The `fetch.sh` of each paper now writes these files to `/Volumes/T7/guided-analysis/reference/<id>/` (or `$GA_REFERENCE`). The `expected.yaml` files name the new source paths. No expected value changed.

### The adapters

| Adapter | Text | Paper | Fix |
| --- | --- | --- | --- |
| astropy | `skills/detect-sources.md` ("finds 82 sources"), `skills/measure-background.md` ("5.15"), a referee check in `adapter.yaml` ("5.15 … 5.03") | bradley-photutils | Numbers removed; the method advice stays |
| biostats | `skills/compare-two-groups.md` (p = 0.0028, 0.079), `skills/model-repeated-measures.md` (1.24, 1.55), `skills/cox-survival.md` (−0.3794, 0.68, 0.0007, 432, 114) | student1908, belenky2003, rossi1980 | Numbers removed |
| cardinal | `skills/choose-sparsity.md` ("8, 8, 8, 8, 6 and 3 segments … s = 32") | bemis2015 | Numbers removed |
| deseq2 | `skills/choose-the-design.md` ("4381 significant genes") | love2014 | Sentence removed |
| astropy, biostats, lme4, bcftools, samtools, rdkit, vegan, gdal, pyimzml, scanpy, mdanalysis, mne, metaspace, fastqc, phylo, cardinal, scikit-image, sage | The `tests:` blocks and `evidence` notes in `adapter.yaml`, and reference files in `data/` (for example `astropy/data/isolated_truth.csv`, `gdal/data/byte.tif.aux.xml`) | Most papers | The harness does not send this text to the model. Blind mode hides the adapter folders from the agent. The tests stay, because they check the adapters |

### The request fields

No `prompt`, `setup` or `answers` field gives a result. Four cases are close and stay as they are:

- gramfort2013: the prompt says that the peak is "about a tenth of a second after the tone". This defines the N100 component. The expected latency is 0.0932 s.
- bemis2015: `answers.sparsity: 32` is the model that the paper reports. It is a method choice of the paper.
- bates2015, belenky2003, rossi1980 and student1908 state the number of subjects. These counts describe the data. The matching items have `in_answer: false`.
- love2014: no match for the new values (16139, 4905, 2607, 2298, 4081) in the vignette, the adapter or `src/`.

## Proof

These checks ran on 2026-10-08.

- Unit tests: `tests/blind.test.ts` and `tests/papers-blind.test.ts`. A fake agent tries to read `expected.yaml` with an absolute path and with a relative path. Both reads stop. The record has two `blocked` entries. No tool result holds the expected value. A script that builds the path at run time gets "Operation not permitted". With `--no-blind`, the old behavior stays.
- Adapter programs under the sandbox: the known-answer tests of all 24 paper adapters and ImageJ (Fiji) pass with the blind policy active. This includes R (lme4, deseq2, vegan, cardinal), Python (astropy, scanpy, mne and others), Java (ImageJ, CellProfiler) and command-line programs (bcftools, samtools, sage, iqtree).
- A fake agent on the real astropy adapter (bradley-photutils): reads of `expected.yaml`, of `catalog/astropy/data/isolated_truth.csv`, of the reference folder, and of `~/.guided-analysis/sessions` from `run_script` all stop. The leak check shows 5 blocked reads and the 4 paths outside the allow list.
- A real local model: `ollama:qwen3:8b` on bradley-photutils-100gaussians in blind mode (`bench/results/papers-2026-10-08-qwen3-blind-bradley.md`). The sandbox was on. The agent read 2 paths: the data file and a file in its work folder. 0 paths were outside the allow list. The sandbox blocked 0 reads. The answer had 0 unsourced and 0 literature claims. The score was 6 of 6 computed and 6 of 6 reported. The leak check found no source for the numbers other than the steps of the run.

## Limits

- A model can know a famous published value from its training. Blind mode cannot remove this knowledge. If the model writes such a number and no tool made it, the claim check labels it unsourced or literature. The leak check counts these claims. This count does not prove that the model did not know the value. A model can also know a value and then make a tool produce it.
- The reported score counts only numbers that the claim check labels measured. A measured number must match a logged step. Thus a number from memory cannot pass the reported score, but it can steer the choices of the agent.
- The sandbox works only on macOS. On Linux and Windows, only the tool check applies. The report shows `sandbox: off` in this case.
- The deny list for child processes is a list of known places. It is not complete. A copy of the expected values in another folder (for example a download folder) stays readable for child processes. The file tools of the agent use an allow list, so this hole applies only to code that the agent runs.
- Adapter text and tool descriptions are visible. We removed the benchmark results from them. New adapter text can add a result again. Run the grep in step 1 of the audit again when an adapter changes.
- Adapters that use the network (for example METASPACE) can reach public servers. The `run_script` sandbox blocks the network. The adapter processes can use it.
- The tool check reads the paths in the arguments. A path that the agent builds inside code passes the tool check. The sandbox then stops the read.
