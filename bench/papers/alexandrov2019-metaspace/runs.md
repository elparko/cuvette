# Runs: alexandrov2019-metaspace

Method emulation with the `metaspace` adapter. Model: `ollama:qwen3:8b`. Date: 2026-10-08.
Network was on. Counts come from the live METASPACE API.

Answers file (decisions from `expected.yaml`):

```json
{"fdr":0.1,"database":"LipidMaps 2017-12-12","adducts":"all","exclude_off_sample":false,"*":"Use the recommended value."}
```

Prompt (the guided prompt, plus the two dataset ids):

> How many lipid annotations does each public mouse brain dataset support at a controlled false discovery rate, and how does the count change with the database? The datasets are 2022-08-16_10h14m23s and 2022-08-16_12h31m33s on METASPACE.

Command (same for each run, with a new `GA_HOME`):

```
GA_HOME=<temp dir> node bin/ga.js -p "<prompt>" --adapter catalog/metaspace --model ollama:qwen3:8b --answers answers.json --output json
```

I added the ids to the prompt. The guided prompt has no ids, and the paper gives none. A lab would give the ids.

## Summary

| Run | Adapter version | Session | Result |
| --- | --- | --- | --- |
| 1 | 0.1.0 | 20261008-002654-dee7 | Fail (HMDB counts wrong) |
| 2 | 0.1.1 | 20261008-003622-866f | Fail (no answer) |
| 3 | 0.1.2 | 20261008-004354-9978 | Pass, with one wrong off-sample number |

## Expected numbers and the numbers from run 3

| Quantity | Expected | Run 3 |
| --- | --- | --- |
| 10h14m23s LipidMaps, FDR 10% | 414 | 414 |
| 10h14m23s HMDB, FDR 10% | 263 | 263 |
| 12h31m33s LipidMaps, FDR 10% | 191 | 191 |
| 12h31m33s HMDB, FDR 10% | 123 | 123 |
| 10h14m23s LipidMaps, FDR 5% | 144 | 144 |
| 12h31m33s LipidMaps / HMDB, FDR 5% (paper table) | 84 / 46 | 84 / 46 |
| 10h14m23s LipidMaps, FDR 20% | 903 | 903 |
| 10h14m23s LipidMaps, FDR 50% | 1934 | not asked; the tool offers 5, 10 and 20 percent only |
| Paper numbers (519 glutathione annotations) | not reproducible | not claimed |

All four required counts match with tolerance 0. The FDR 50% number is outside the tool scope on purpose.

## Run 1 (adapter 0.1.0)

- Final answer: gave 414 and 191 for LipidMaps. Dataset 1 HMDB gave 244 at FDR 10% (expected 263) and 763 at FDR 20% (expected 819). Dataset 2 HMDB was right (123). It called the database "LipidMaps v4.0".
- Result: fail for HMDB.
- What went wrong: the model called `compare_fdr_counts` with `exclude_off_sample: true` in some calls (logged as deviations). That removed the off-sample annotations (263 minus 19 gives 244) and the answer then listed the off-sample number beside it. Also, `database` and `database_version` were two decisions. A comparison with HMDB v4 broke the setup value `2017-12-12` for LipidMaps, so each HMDB call logged two deviations.
- Adapter fix: one `database` argument and decision that holds name and version ("LipidMaps 2017-12-12"). A sensitivity on the database. A tool argument text that says to leave `exclude_off_sample` out unless the scientist decided it.

## Run 2 (adapter 0.1.1)

- Final answer: the model said that the search found nothing and that it would check with `get_dataset_info`. It did not call the tool.
- Result: fail (no numbers).
- What went wrong: `search_datasets` had no argument for a dataset id. The model put the id in `name` and got 0 results. It stopped after four searches.
- Adapter fix: `search_datasets` takes `dataset_id` (one id or ids joined with `|`). A `name` that looks like an id is read as an id. An empty result shows a hint.

## Run 3 (adapter 0.1.2)

- Calls: `search_datasets` by id, `get_dataset_info` twice, `compare_fdr_counts` four times for the two databases on both datasets, and a second pass that repeated the four calls. No `exclude_off_sample` deviation. The HMDB calls logged a deviation against the setup value (LipidMaps), which is correct, because the prompt asks for a comparison of databases.
- Final answer: a table of counts at FDR 5, 10 and 20 percent for both databases and both datasets, with off-sample counts, the adduct (+H) and the dataset names. It said that the database changes the count a lot.
- Numbers: all match the table above.
- Faults in the answer: it wrote "6 off-sample" for HMDB at FDR 5% in dataset 1. The tool result says 0. The number 6 belongs to LipidMaps. The claim checker did not flag it, because 6 exists in another result. The answer does not say that the FDR level is a maximum. It does not say that the annotations are putative. The `fdr_stated` and `not_identification` text checks need a referee model; this run had none, so they did not run.
- Duration: about 9 minutes for 12 tool calls on `qwen3:8b`.

## Open points

- Adapter 0.1.3 added `overlap_annotations` and removed the tool-schema defaults for `database` and `fdr`. This run was not repeated for 0.1.3 because of the limit of three runs. The known-answer tests pass for 0.1.3.
- The expected numbers can change if METASPACE reprocesses the datasets.
