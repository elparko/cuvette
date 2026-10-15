# Paper benchmark, final runs of 9 October 2026

This report gives the results of the final benchmark runs before the release of Cuvette.
The result files are in `bench/results/final-2026-10-09/`. All runs used commit `31f71fb`.

## Summary

| Model | Runs | Runs with an answer | Computed items correct | Reported items correct | Cost (USD) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Claude Opus 5.5 | 159 | 159 | 1411 of 1416 (99.6%) | 1146 of 1152 (99.5%) | 92.77 |
| Claude Sonnet 5.5 | 159 | 157 | 1410 of 1416 (99.6%) | 1143 of 1152 (99.2%) | 35.77 |
| Claude Haiku 5.5 | 159 | 159 | 1410 of 1416 (99.6%) | 1133 of 1152 (98.4%) | 3.52 |
| qwen3:8b (Ollama, local) | 53 | 51 | 376 of 472 (79.7%) | 240 of 384 (62.5%) | 0 |

- 53 papers. Each Claude model ran each paper three times. qwen3:8b ran each paper one time.
- No run read an expected value. Four runs read a file outside their allowed folders. None of these files held an expected value (see "Leak check").
- Three scored items of one paper pass for a wrong reason in every model (see "Scoring caveats"). Without them, the computed scores do not change at one decimal place.

## Method

### What a run does

A script plays the scientist. It sends the request of the paper, which names the data files and the question.
It applies the setup values of the paper. It answers each decision card with the method choice from the methods section of the paper.
If a card has no prepared answer, the script accepts the recommendation of the card.
The script approves the tool permissions. It does not correct the agent and it does not see the progress of the agent.

The agent runs in blind mode. It cannot read the expected values, the paper notes, the results of other runs or other run records.
A leak check runs after each run. It lists each file that the agent read and each read that the allow list stopped.
`docs/benchmark-blinding.md` gives the allow list and the checks.

### Two scores

- **Computed**: the tool outputs in the session record hold a value within the tolerance of the expected value.
  This score tests whether the agent drove the program to the correct number.
- **Reported**: the final answer of the agent states a value within the tolerance.
  This score tests whether the agent told the scientist the correct number.

A reference item has an expected value that does not reproduce from the data, or that is not a fair test. The report shows reference items, but no score counts them.

### Models and runs

| Model | Provider | Runs for each paper | Budget guard |
| --- | --- | ---: | --- |
| claude-opus-5-5 | Anthropic API | 3 | $150 |
| claude-sonnet-5-5 | Anthropic API | 3 | $120 |
| claude-haiku-5-5 | Anthropic API | 3 | $120 |
| qwen3:8b | Ollama on the same Mac, 32k context | 1 | none |

The Claude runs started at 04:59 and ended at 08:52 (Central Time) on 9 October. They ran in shards in parallel.
Shards that were slow at 08:14 got helper shards. A helper took the papers that its shard had not started, and the shard stopped when it reached them. No paper ran twice.
Three runs stopped with "Cannot reach the Claude API": Opus palmer2017 run 2, Sonnet nair2024 run 3 and Sonnet yun2026 run 1.
These were network failures, not results. Each ran again one time, and the new run takes the place of the failed run in the result file.
The field `rerunOf` of each such run gives the old status and error. The rerun files are in `bench/results/final-2026-10-09-reruns/`.

The qwen3:8b run started at 03:02 and ended at 07:15. Parker removed qwen3:14b, qwen3:30b-a3b and MedGemma from the final runs on 9 October.

### Value source of each expected value

Each scored item has a source class in the `items` section of its `case.yaml`. `docs/benchmark-sources.md` defines the classes.

| Source | Items | Opus | Sonnet | Haiku | qwen3:8b |
| --- | ---: | ---: | ---: | ---: | ---: |
| Published: a publication prints the value | 276 | 276 | 276 | 276 | 223 |
| Tutorial: the official tutorial or test suite prints the value | 51 | 51 | 51 | 50 | 50 |
| Computed, independent: a second program or code path gives the value | 133 | 131 | 131 | 133 | 93 |
| Computed, same path: only the adapter's program gives the value | 12 | 12 | 12 | 12 | 10 |
| All scored items | 472 | 470 | 470 | 471 | 376 |

The model columns give the computed items correct in run 1.

## Results

### Totals per model

| Model | Computed | Computed without the 3 bradley flux items | Reported | Median time of a run (s) | Total run time (h) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Opus | 1411 of 1416 (99.6%) | 1402 of 1407 (99.6%) | 1146 of 1152 (99.5%) | 141 | 7.8 |
| Sonnet | 1410 of 1416 (99.6%) | 1401 of 1407 (99.6%) | 1143 of 1152 (99.2%) | 75 | 5.9 |
| Haiku | 1410 of 1416 (99.6%) | 1401 of 1407 (99.6%) | 1133 of 1152 (98.4%) | 126 | 7.5 |
| qwen3:8b | 376 of 472 (79.7%) | 373 of 469 (79.5%) | 240 of 384 (62.5%) | 163 | 4.2 |

### Runs without an answer

| Model | Paper | Run | Status |
| --- | --- | ---: | --- |
| Sonnet | caicedo2019-bbbc039 | 2 | time limit (1860 s) |
| Sonnet | caicedo2019-bbbc039 | 3 | time limit (1860 s) |
| qwen3:8b | cooley2020-splitluc-zprime | 1 | no answer |
| qwen3:8b | nair2024-plasmid-growth | 1 | time limit (1801 s) |

### Items that a Claude model got wrong

Each cell gives the number of runs, of three, with a wrong value. "c" is the computed score and "r" is the reported score.

| Paper and item | Opus | Sonnet | Haiku |
| --- | --- | --- | --- |
| lazear2023-sage, target_psms_fdr1 | c 2, r 3 | c 2, r 2 | |
| lazear2023-sage, target_psms_fdr5 | c 3, r 3 | c 3, r 3 | |
| bemis2015-cardinal, peaks | | | c 3, r 3 |
| hildyard2021-embryo-refgenes, normfinder_tissue_b2m and _ubc | | | c 1, r 1 |
| liao2025-scanpy-bone-marrow, chase_cells_after_qc | | | c 1, r 1 |
| rossi1980-recidivism, logrank_chi2_fin | | c 1 | |
| caicedo2019-bbbc039, true_nuclei_test | | r 2 (the two timeouts) | |
| white2021-flowkit, cd3_flowjo | | r 2 | |
| alexandrov2019-metaspace, d1 and d2_hmdb_fdr10 | | | r 1 |
| bradley-photutils-100gaussians, three net_flux items | | | r 1 |
| lackey2015-tb-default, p_marital | | | r 2 |
| oreshkova2024-qmp-honeybee, five acini items | | | r 1 |
| weber2023-nnsvg-dlpfc, layer_genes_in_top_100 | | | r 1 |

### Leak check

| Model | Reads outside the allow list | Reads that the allow list stopped |
| --- | ---: | ---: |
| Opus | 0 | 45 |
| Sonnet | 2 | 39 |
| Haiku | 1 | 45 |
| qwen3:8b | 1 | 2 |

The reads outside the allow list:

- Haiku, oreshkova2024 run 1: a directory listing of `/`.
- Sonnet, white2021 runs 2 and 3: `bench-runs/2026-10-09/claude_claude-sonnet-5-5/work/count_gates-1/gate_counts.csv`.
  This is a tool output in a shared work folder of the model, not a run folder. It holds gate counts that another run computed, not expected values.
  The shared work folder is a harness fault. A run must write only in its own run folder.
- qwen3:8b, mahbod2024: a wrong path, `/tissue images/*.png`.

A stopped read is a read that the allow list refused. The agent did not get the file.

### Time and cost

The Claude runs took 3 hours 53 minutes of wall time. The cost comes from the spend log at list prices, from 04:59 to 08:52.
It includes the runs of the first start that did not finish (in `partial/` on the T7 drive), and about $1 of Sonnet demo sessions after 08:22.
The local run has no API cost.

## Scoring caveats

1. **Nearest-value matching.** The computed check takes the logged number nearest to the expected value. A wrong number can pass if it falls within the tolerance.
   The three bradley-photutils-100gaussians net_flux items pass this way in every model: the median net flux (925.2) or the flux of another source falls within the tolerance of 106.
   The table above gives the computed score with and without these three items.
2. **Loose tolerances.** Eight scored items have a tolerance above 25% of the value. Most are small p values:
   oksanen permanova_p, jahncke p_frequency and p_amplitude, oreshkova protein_p_age, rossi ph_test_p_age, weber mobp_rank, bemis segments_s64 and jahncke freq_cko.
   A wrong number can pass these items. The jahncke papers are not in the final runs.
3. **Reference items.** The caicedo2019 missed_fraction items, the cooley2020 "printed" Z' items and the hildyard2021 slope_actb_printed item are reference items or fail as they should.
   The value that the case page shows for a failed item can come from another row, because of the nearest-value matching.
4. **Stored values.** `tests/papers-cases.test.ts` checks every committed result file for a stored value that disagrees with its difference. It passes for all 24 files.
   The scoring is the scoring of `31f71fb`. A rescore with the scorer on `main` changed 0 of 66 items in a test, so no rescore was done.

## Papers that are not in the final runs

These 18 papers came after commit `31f71fb`. They have their own Haiku runs on 9 October (`bench/results/papers-2026-10-09-*`), but they are not part of these results:

argelaguet2018-mofa-cll, aulicino2022-baculovirus-hdr, elmasri2026-limit-maaslin2, gouwens2019-allen-ephys,
hahne2009-flowcore-compdata, hochman1999-shock-trial, jahncke2025-dag1-mipsc, kochanek2023-deaths-final-data-2020,
kovacs2026-mycoplasma-mic, kresken2021-temocillin, li2014-mageck-melanoma, nowicka2019-cytof-bcrxl, ram2021-pix-h-score,
ross-innes2012-diffbind-tamoxifen, thaqi2026-bovine-corpus-luteum, thevenot2015-ropls-sacurine,
yavorska2017-mendelianrandomization, zhu2020-deqms-spike-in.

## Results for each paper

Each cell gives the computed items correct and the reported items correct, summed over all runs of the model.

| Paper | Opus | Sonnet | Haiku | qwen3:8b |
| --- | --- | --- | --- | --- |
| aledo2022-renz-onpg | 6/6 · 6/6 | 6/6 · 6/6 | 6/6 · 6/6 | 2/2 · 2/2 |
| alexandrov2019-metaspace | 15/15 · 12/12 | 15/15 · 12/12 | 15/15 · 10/12 | 4/5 · 2/4 |
| andreasson2019-endotoxin-health | 30/30 · 21/21 | 30/30 · 21/21 | 30/30 · 21/21 | 9/10 · 6/7 |
| andrews-fastqc | 21/21 · 9/9 | 21/21 · 9/9 | 21/21 · 9/9 | 7/7 · 3/3 |
| astapova2021-deseq2-kgn | 12/12 · 9/9 | 12/12 · 9/9 | 12/12 · 9/9 | 4/4 · 3/3 |
| bates2015-lme4-sleepstudy | 27/27 · 21/21 | 27/27 · 21/21 | 27/27 · 21/21 | 9/9 · 7/7 |
| belenky2003-sleepstudy | 18/18 · 6/6 | 18/18 · 6/6 | 18/18 · 6/6 | 6/6 · 2/2 |
| bemis2015-cardinal | 15/15 · 15/15 | 15/15 · 15/15 | 12/15 · 12/15 | 5/5 · 5/5 |
| bradley-photutils-100gaussians | 18/18 · 18/18 | 18/18 · 18/18 | 18/18 · 15/18 | 6/6 · 6/6 |
| caicedo2019-bbbc039 | 3/3 · 3/3 | 3/3 · 1/3 (2 timeout) | 3/3 · 3/3 | 1/1 · 1/1 |
| chure2024-hplc-py | 36/36 · 33/33 | 36/36 · 33/33 | 36/36 · 33/33 | 6/12 · 6/11 |
| cooley2020-splitluc-zprime | 57/57 · 57/57 | 57/57 · 57/57 | 57/57 · 57/57 | 9/19 · 0/19 (1 no_answer) |
| danecek2021-bcftools | 18/18 · 15/15 | 18/18 · 15/15 | 18/18 · 15/15 | 6/6 · 4/5 |
| delaney2004-esol | 18/18 · 12/12 | 18/18 · 12/12 | 18/18 · 12/12 | 4/6 · 2/4 |
| desveaux2026-pcrv-ic50 | 27/27 · 24/24 | 27/27 · 24/24 | 27/27 · 24/24 | 9/9 · 8/8 |
| gowers2016-mdanalysis | 21/21 · 21/21 | 21/21 · 21/21 | 21/21 · 21/21 | 7/7 · 7/7 |
| gramfort2013-mne-sample | 42/42 · 36/36 | 42/42 · 36/36 | 42/42 · 36/36 | 14/14 · 1/12 |
| hackshaw1997-ets-lung-cancer | 12/12 · 9/9 | 12/12 · 9/9 | 12/12 · 9/9 | 4/4 · 3/3 |
| hildyard2021-embryo-refgenes | 54/54 · 48/48 | 54/54 · 48/48 | 52/54 · 46/48 | 10/18 · 0/16 |
| jang2016-hcc-biomarkers | 66/66 · 60/60 | 66/66 · 60/60 | 66/66 · 60/60 | 22/22 · 20/20 |
| kanetis2022-iqtree-sporocadaceae | 9/9 · 6/6 | 9/9 · 6/6 | 9/9 · 6/6 | 2/3 · 0/2 |
| kasurinen2018-mmp14-gastric | 75/75 · 51/51 | 75/75 · 51/51 | 75/75 · 51/51 | 19/25 · 0/17 |
| klindworth2013-16s-primers | 33/33 · 33/33 | 33/33 · 33/33 | 33/33 · 33/33 | 9/11 · 9/11 |
| korsunsky2019-harmony | 15/15 · 15/15 | 15/15 · 15/15 | 15/15 · 15/15 | 4/5 · 3/5 |
| lackey2015-tb-default | 90/90 · 84/84 | 90/90 · 84/84 | 90/90 · 82/84 | 28/30 · 23/28 |
| lazear2023-sage | 13/18 · 3/9 | 13/18 · 4/9 | 18/18 · 9/9 | 5/6 · 2/3 |
| li2009-samtools | 21/21 · 9/9 | 21/21 · 9/9 | 21/21 · 9/9 | 5/7 · 3/3 |
| liao2025-scanpy-bone-marrow | 15/15 · 12/12 | 15/15 · 12/12 | 14/15 · 11/12 | 3/5 · 2/4 |
| ljosa2012-bbbc005 | 9/9 · 6/6 | 9/9 · 6/6 | 9/9 · 6/6 | 3/3 · 2/2 |
| love2014-deseq2-airway | 15/15 · 12/12 | 15/15 · 12/12 | 15/15 · 12/12 | 5/5 · 4/4 |
| mahbod2024-nuinsseg | 9/9 · 3/3 | 9/9 · 3/3 | 9/9 · 3/3 | 3/3 · 1/1 |
| makrai2023-colonies | 6/6 · 3/3 | 6/6 · 3/3 | 6/6 · 3/3 | 2/2 · 1/1 |
| manders1993-coloc | 18/18 · 15/15 | 18/18 · 15/15 | 18/18 · 15/15 | 6/6 · 5/5 |
| minh2020-iqtree2 | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 1/1 · 1/1 |
| nair2024-plasmid-growth | 60/60 · 51/51 | 60/60 · 51/51 | 60/60 · 51/51 | 4/20 · 0/17 (1 timeout) |
| oksanen-vegan-dune | 18/18 · 15/15 | 18/18 · 15/15 | 18/18 · 15/15 | 6/6 · 5/5 |
| oreshkova2024-qmp-honeybee | 57/57 · 48/48 | 57/57 · 48/48 | 57/57 · 43/48 | 18/19 · 15/16 |
| palmer2017-metaspace-fdr | 0/0 · 0/0 | 0/0 · 0/0 | 0/0 · 0/0 | 0/0 · 0/0 |
| quinlan2010-bedtools | 12/12 · 9/9 | 12/12 · 9/9 | 12/12 · 9/9 | 4/4 · 3/3 |
| rees2019-uptake | 15/15 · 12/12 | 15/15 · 12/12 | 15/15 · 12/12 | 5/5 · 4/4 |
| rossi1980-recidivism | 33/33 · 12/12 | 32/33 · 12/12 | 33/33 · 12/12 | 6/11 · 0/4 |
| rost2016-openms | 15/15 · 6/6 | 15/15 · 6/6 | 15/15 · 6/6 | 5/5 · 1/2 |
| rouault-gdal-autotest | 42/42 · 42/42 | 42/42 · 42/42 | 42/42 · 42/42 | 8/14 · 8/14 |
| schindelin2012-fiji-blobs | 3/3 · 3/3 | 3/3 · 3/3 | 3/3 · 3/3 | 1/1 · 1/1 |
| schramm2012-imzml-pyimzml | 21/21 · 12/12 | 21/21 · 12/12 | 21/21 · 12/12 | 5/7 · 3/4 |
| sriphoosanaphan2021-sample-size | 9/9 · 6/6 | 9/9 · 6/6 | 9/9 · 6/6 | 3/3 · 2/2 |
| sriphoosanaphan2021-vitd-hcv | 63/63 · 57/57 | 63/63 · 57/57 | 63/63 · 57/57 | 5/21 · 3/19 |
| student1908-sleep | 18/18 · 12/12 | 18/18 · 12/12 | 18/18 · 12/12 | 6/6 · 4/4 |
| wang2023-cuproptosis-oa | 42/42 · 39/39 | 42/42 · 39/39 | 42/42 · 39/39 | 14/14 · 13/13 |
| weber2023-nnsvg-dlpfc | 12/12 · 12/12 | 12/12 · 12/12 | 12/12 · 11/12 | 3/4 · 3/4 |
| white2021-flowkit | 36/36 · 30/30 | 36/36 · 28/30 | 36/36 · 30/30 | 8/12 · 4/10 |
| wolf2018-scanpy | 18/18 · 6/6 | 18/18 · 6/6 | 18/18 · 6/6 | 6/6 · 2/2 |
| yun2026-lasv-elisa | 90/90 · 84/84 | 90/90 · 84/84 | 90/90 · 84/84 | 30/30 · 25/28 |
