# qwen3:8b failures: harness or model

Date: 8 October 2026. Question from Parker: before the large rerun of Claude and of the larger local models, is each qwen3:8b failure caused by us (the harness, the adapters, the benchmark specs) or by the model?

## Data

- Results: `bench/results/papers-2026-10-08-qwen3-rerun.json` (15 papers, rerun on the fixed code) and `bench/results/papers-2026-10-08-qwen3.json` (first run, used for the other 13 papers). Both files were rescored on main 267250b.
- Claude results for the same items: `bench/results/papers-2026-10-08-claude*.json`.
- Session records: `/Volumes/T7/guided-analysis/tools/bench-runs/2026-10-08/ollama_qwen3_8b/<paper>/run1/home/sessions/<sid>/log.jsonl`. Entry numbers below (eNN) are ids in these logs.
- Experiment results: `bench/results/qwen3-8b-experiments-*.json`.

## Classes

- US-tool: the adapter or program fails or returns something misleading.
- US-harness: the harness made the task harder than it must be.
- US-spec: the prompt, the expected value or the tolerance is wrong or unclear.
- MODEL: the model had what it needed and still did the wrong thing.

## Failure table

After rescoring, 38 scored items fail in 12 papers. Two runs ended at the paper time limit (belenky2003, wolf2018). No run ended in an error. Claude passes every item in this table. For the two li2009 items, Claude ran one more step than the prompt asks for.

Source: R = rerun (15 papers), F = first run (13 papers). Items: the failed items of the paper.

| Paper (run) | Items | What qwen3:8b did (evidence) | What Claude did | Class |
| --- | --- | --- | --- | --- |
| alexandrov2019-metaspace (R) | d1_lipidmaps_fdr10, d1_hmdb_fdr10, d2_lipidmaps_fdr10, d2_hmdb_fdr10, d1_lipidmaps_fdr5 (5) | Called `search_datasets {"dataset_id": "2022-08-16_10h14m23s,2022-08-16_12h31m33s"}` (e11) and `get_dataset_info` with the same two ids (e21). The search said "0 datasets found ... The dataset can be private" and the info tool said "not found or not public ... You are not logged in". The model concluded that the data is private and asked the scientist what to do (final e62). In the first run the same model got 5 of 5 computed. | Called each tool once for each dataset. All items pass. | US-tool (misleading error for two ids in one field; the search took "\|" but not a comma). The joined ids are a model slip. |
| belenky2003-sleepstudy (R, time limit) | days_slope, se_days_random_slope (2) | The fit was right (e31: Days 10.47, se 1.546). The next reply (e39) had the right numbers and then repeated the same paragraphs until the cap: 8192 tokens, 44,331 characters, 9 minutes. The review and the revision ran past the limit of 900 s. No answer was recorded. The first run failed the same way (error "did not finish within 600 s" after the same step). | Reported both values. | US-harness (no stop for a repeated reply; the answer was lost at the time limit). The loop itself is a model fault. |
| danecek2021-bcftools (R) | records_in_region (1) | Never counted the region 1,000,000 to 1,050,000. The answer gives the total, 2210, as "the total number of variants in the region chr20:1000000-1100000" (e30). | Ran a region count, 1137. | MODEL |
| gowers2016-mdanalysis (R) | atoms, frames, backbone_rmsd_last_frame, rg_last_frame, ca_rmsd_open_closed (5) | After each step it wrote the result and "Next, I will ..." and stopped (e11, e21, e35). Each harness nudge produced the next tool call. The turn had a budget of 3 nudges, so the fourth such message (e45, open structure only) became the final answer. The numbers of the first four steps were in messages between steps, which do not count. | All in one turn, 7 of 7 reported. | US-harness (the nudge budget counted nudges that worked). The narrate-then-stop habit is the model. |
| gramfort2013-mne-sample (R) | strongest_grad_latency, strongest_grad_amplitude (2) | Called `measure_peak` with `"mode": "neg"` for gradiometers (e98). The tool description said "Use neg for an EEG N100". The strongest channel became MEG 0243, -161 fT/cm at 0.100 s, not the absolute peak. In both baseline experiment runs the model did the same and wrote "(mode: neg for EEG N100)". | Left mode at its default, abs. | US-tool (misleading parameter description). |
| gramfort2013-mne-sample (R) | n100_amplitude_gfp (1) | The tool result had the GFP amplitude, 42.07 fT/cm (e121). The answer gives only the strongest channel. | Reported both. | MODEL |
| ljosa2012-bbbc005 (R) | ratio_sample, mean_abs_error_sample (2) | count_nuclei reported ratio 0.9399, mean absolute error 3.01 and R squared 0.9951 (e68). The model then called `calculate` with `mae([4706], [5007])` and `r2([4706], [5007])` three times (e74 to e86); the calculate description says to use it for every ratio and error, and its example uses BBBC005 totals. The harness then removed the tools and asked for the answer. The answer (e90) had 0.9399 and 3.01 and ended "please let me know!". The promise check read "let me" as a plan and asked for a tool call three times, with no tools offered. The last reply, "I will now provide my final answer based on the results obtained." (e102), became the final answer. | Reported all three values. | US-harness |
| rouault-gdal-autotest (R) | warp_width, warp_height, zone_a_pixels, zone_a_mean, zone_b_pixels_centers, zone_b_mean_centers (6) | Ran only `raster_info` and answered parts 3 to 5 with "will be determined after the reprojecting step" and "after the zonal statistics step" (e15). The promise check did not catch this wording. | Ran the warp and both zonal steps. | MODEL (stopped early). The harness did not push back. |
| wolf2018-scanpy (R, time limit) | cells_after_qc, leiden_clusters (2) | The answer at e143 (5 minutes) had 2,638 cells and 7 clusters. The review with the same model ran 8.5 minutes (e144 to e146); in the first run the same review repeated one finding 20 times. The revision request then ran into the time limit and the answer was lost. | Reported both. | US-harness |
| bradley-photutils-100gaussians (F) | net_flux_48_70_200_33, net_flux_355_56_252_20 (2) | Passed `positions_csv` with the 82 detected sources to `measure_apertures` instead of x and y (e94). It then wrote the flux of table rows 1, 2 and 5 as the flux at the three named positions. The description was made clearer in d242121; the baseline experiment run on main got 6 of 6. | Passed x and y. | MODEL (the old description was ambiguous) |
| li2009-samtools (F) | reads_seq1, reads_seq2 (2, computed score only) | Ran convert, sort, index, flagstat and the region count, which is what the prompt asks for. No tool gave counts for each reference sequence. | Ran idxstats as an extra step. | US-spec (the prompt does not ask for counts for each sequence; fab6abb made them reference items, the merge undid it). Not changed here: a decision for Parker. |
| schindelin2012-fiji-blobs (F) | particles_edges_included (1) | count_objects found 64 (e43). The model then called `compare_masks` with a truth file that it made up (e44), and the answer is about the missing file. It does not give the count. | Reported 64. | MODEL |
| white2021-flowkit (F) | cd3_flowjo, cd4_flowjo, cd8_flowjo (3) | The count_gates table had the FlowJo counts (133,860, 82,636, 47,241) next to the FlowKit counts (e31). The answer gives only the FlowKit counts. The standards say "Report both counts". | Reported both. | MODEL |
| white2021-flowkit (F) | cd3, cd4, cd8 and cd8_ifng _no_compensation (4) | Never called `compare_compensation`, although it was in the tool list and the standards say "Run compare_compensation to answer what changes without compensation". The answer says "the counts change significantly" and names the FlowJo difference of the Singlets gate (690). | Called compare_compensation. All pass. | MODEL |

Counts by item: US-tool 7 (alexandrov 5, gramfort 2), US-harness 11 (belenky 2, gowers 5, ljosa 2, wolf 2), US-spec 2 (li2009), MODEL 18 (danecek 1, gramfort 1, rouault 6, bradley 2, schindelin 1, white 7). In 2 of the MODEL rows a weakness on our side made the slip easier: the old measure_apertures description (bradley) and the promise check that did not see "will be determined after" (rouault). Both are fixed.

Counts by run: 12 runs have a failure. The cause is on us in 6 (alexandrov, belenky, gowers, gramfort, ljosa, wolf), on the spec in 1 (li2009) and on the model in 5 (danecek, rouault, bradley, schindelin, white).

## Harness checks that found no problem

- Context window. `DEFAULT_NUM_CTX` is 32768 (`src/providers/ollama.ts:7`). The first request of a run (system prompt plus tool schemas plus the request) is 2,188 to 4,735 tokens (prompt_eval_count of the first usage entry). The largest request in any run is 28,893 tokens (wolf2018, first run). All others are below 17,000. No request reached num_ctx, so Ollama did not cut a prompt. `estimateTokens` in compaction does not count the tool schemas, but compaction needs two user turns and a benchmark run has one.
- Output cap. `MAX_OUTPUT_TOKENS` is 8192. Only the belenky2003 runs reached it, and the cause was a repeated text loop (see the table).
- Tool count. A small model gets 13 to 25 tools: all adapter tools (2 to 14, below the limit of 24 for deferred tools) and 11 harness tools. The schemas are 6,000 to 14,400 characters (about 1,700 to 4,100 tokens).
- System prompt. The small-model rules (`SMALL_RULES`, `src/core/prompt.ts`) and the program standards are 2,400 to 4,000 characters. The standards are cut at 2,500 characters for a small model. Only biostats, flowkit and mne are longer, and the cut parts are report rules, not tool rules.
- JSON and tool-call format. No tool call had arguments that were not valid JSON, and no call was written as text. In 3 of 43 runs (ljosa2012 first run, schramm2012 both runs) one reply was lost inside the tool-call parser of Ollama: the model wrote about 100 tokens, and Ollama returned no text and no call (schramm2012 rerun e5, e6). The harness nudge ("Your last reply was lost") recovered each one. None of these caused a failure.
- Think setting. `think` is false by default (`src/core/config.ts`, `src/providers/ollama.ts`). The Ollama model file of qwen3:8b sets temperature 0.6, top_p 0.95, top_k 20 and repeat_penalty 1. Qwen recommends these values for thinking mode. For non-thinking mode Qwen recommends temperature 0.7, top_p 0.8 and a presence penalty against loops. The harness does not set them. Not tested.

## Harness problems found and fixed

All commits are on main, each with tests. All changes apply to every model. Only the repeat stop is in the Ollama provider.

| Commit | Change | Failures it targets |
| --- | --- | --- |
| ea42fe4 | metaspace: the search splits ids on a comma, a bar or a space. The tools for one dataset return "dataset_id takes one id, and you gave 2 ... Call the tool once for each dataset" instead of "not found or not public". | alexandrov2019 (5) |
| a135591 | mne `measure_peak`: the mode description says to keep abs for gradiometers and magnetometers. | gramfort2013 strongest channel (2) |
| abc6943, 0122d23 | Ollama: stop a reply (and a review reply) when a 300-character block occurs for the third time, and keep the text before the second copy. Before: up to 8192 tokens, 9 minutes. | belenky2003 (2), wolf2018 review time |
| 0122d23 | When a turn stops while a revision is pending, the first answer is recorded as the final answer, with a notice. | belenky2003 (2), wolf2018 (2) |
| 775565d | A nudge that leads to a tool call does not count against the 3 nudges of a turn. | gowers2016 (5) |
| b30885d | "Let me know" is not a promise of a next step. | ljosa2012 (2), and a needless nudge in danecek2021 |
| 09097f7 | After the harness removes the tools for a forced answer, the promise nudges do not run. The calculate description says to use it only for values that no tool reported, and that mae, rmse and r2 take one pair for each sample. | ljosa2012 (2) |
| 1ae8211 | "will be determined after the ... step" counts as an unfinished answer, so the harness nudges. | rouault (6) |
| 34a5e14 | A Python tool result held the program reply three times (escaped JSON text, table and metrics, and data). 98 of 148 qwen3:8b results had the copy, and 15 were cut at the small-model limit of 6000 characters. The result now shows each part once, and the whole table when data held it. | general; white2021 count_gates was cut |

Other weak points seen, not fixed:

- The review uses the same 8B model (`referee: same`). Its findings are often wrong: in alexandrov2019 it said the answer "incorrectly infers" a private dataset, and in white2021 it called the CD8+ difference of 76 unsourced although the table has -76. Each error finding forces one revision.
- The rule check calls numbers unsourced that came from `list_dir` (file sizes, schindelin2012), from a cut note ("[cut 8916 characters", wolf2018), or that are the absolute value of a logged difference (76 for -76, white2021).
- The computed score passes by chance when a tool logs an unrelated number in the tolerance: gramfort2013 strongest_grad_latency 0.0866 passed with window_start_s 0.08, strongest_grad_amplitude 199 passed with n_channels 203. So the computed score of qwen3:8b is too high on these items.
- li2009 reads_seq1 and reads_seq2 are scored, but the prompt does not ask for them (see the table).

## Experiments

All experiments use qwen3:8b, num_ctx 32768, one paper at a time. Think is set by `{"think": true}` in `.ga/settings.local.json` of the folder that runs the benchmark. This is the setting `think` of `src/core/config.ts`, which the session passes to the Ollama provider. The runs so far used a small script around `runPapers` with the same effect.

A larger num_ctx was not tested. No request in the 43 qwen3:8b runs reached 32768 tokens (largest 28,893, wolf2018; all others below 17,000). A larger window cannot change these failures.

### Results so far

| Variant | Code | Paper | Runs | Computed | Reported | Compare with |
| --- | --- | --- | --- | --- | --- | --- |
| think off | main 267250b | gramfort2013 | 2 | 13/14, 14/14 | 3/12, 11/12 | rerun: 14/14, 9/12 |
| think off | main 267250b | bradley-photutils | 1 | 6/6 | 6/6 | first run (before d242121): 6/6, 4/6 |
| think on | main 3f5e95b | white2021 | 1 | 8/12 | 4/10 | first run, think off: 8/12, 4/10 |
| think on | main 3f5e95b | rouault-gdal | 1 | 14/14 | 14/14 | rerun, think off: 8/14, 8/14 |

What the runs show:

- gramfort2013, think off: two runs on the same code differ by 8 reported items. In both runs, and in the rerun, the model called `measure_peak` with `"mode": "neg"` for gradiometers. It wrote "(mode: neg for EEG N100)", the text of the old description. This confirms the US-tool class of the strongest-channel items. One run of qwen3:8b is noisy, so compare variants on more than one run.
- white2021, think on: the same seven items fail as with think off. The model again reported only the FlowKit counts and did not call `compare_compensation`. Thinking does not change this MODEL failure.
- rouault, think on: the model ran `raster_info`, `vector_info` and `reproject_raster` without a nudge. Its first answer still missed the zones. The review found 5 problems, and in the revision the model ran `zonal_stats`. All 14 items pass. The run took 639 s against 39 s with think off. This run is on main with the new promise check (1ae8211), so the gain can come from thinking and the review together. The think-off run on the same code is in the queue below.
- gowers2016, think on (stopped by the pause at step 3 of 5): the model called each tool in the same reply as its text, so it needed no nudge. It passed `"stop": 97` to `radius_of_gyration`, so the last radius of gyration was 19.568 (frame 96), not 19.592.

### Remaining runs (overnight queue)

Run from the repo root of a main checkout, one after the other, when no other local run is active:

```sh
mkdir -p .ga && echo '{"think": true}' > .ga/settings.local.json
node bin/ga.js bench papers --papers gowers2016-mdanalysis,alexandrov2019-metaspace,gramfort2013-mne-sample,belenky2003-sleepstudy --models ollama:qwen3:8b --runs 1 --out bench/results/qwen3-8b-experiments-think-main2
rm .ga/settings.local.json
node bin/ga.js bench papers --papers white2021-flowkit,rouault-gdal-autotest,gowers2016-mdanalysis,alexandrov2019-metaspace,gramfort2013-mne-sample,belenky2003-sleepstudy --models ollama:qwen3:8b --runs 1 --out bench/results/qwen3-8b-experiments-nothink-main
curl -s localhost:11434/api/generate -d '{"model":"qwen3:8b","keep_alive":0}'
```

Then compare `qwen3-8b-experiments-think-main.json` and `-think-main2.json` (think on) with `-nothink-main.json` (think off), paper by paper. Expected time: about 40 minutes for the first run command and 30 minutes for the second.

## Conclusion

This conclusion is preliminary. The overnight runs above can change the part about thinking.

- Of the 38 failed items, 20 are on us: 7 US-tool, 11 US-harness, 2 US-spec. 18 are MODEL. By run, 6 of the 12 failed runs had a cause on our side. Each of these causes has a fix on main now, except li2009 (a decision for Parker).
- Our causes hit small models: replies that loop, a narrate-then-stop habit, and wording that a small model takes literally ("Use neg for an EEG N100", "Use it for every ratio"). Claude did not trigger them in its runs. The fixes apply to all models.
- The model part is real. white2021 (7 items) fails the same way with think on. danecek2021, schindelin2012, bradley (old description) and rouault (think off) show steps that the model skipped or made up.
- Thinking: one clear gain (rouault, 8/14 to 14/14) and one no change (white2021), one run each. This is not proven yet. Thinking made the rouault run 16 times slower.

Recommended settings for the large rerun, as of now:

- num_ctx: keep 32768. No run came near it.
- think: keep it off until the overnight think-off runs on the same code are in. If they confirm the rouault gain, turn think on for qwen3. A model that cannot think gets the request again without the setting (`thinkOk` in `src/providers/ollama.ts`).
- Harness: run from main with the fixes above. Consider `referee: none` or a larger referee for small models, because an 8B review gives many wrong findings. Not tested.
