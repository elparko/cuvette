# Triage: palmer2017-metaspace-fdr

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-152804-bef7`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | formulas_in_all_three_sections | 51 +-8 | computed 61 (a count of databases) | c | The value 51 comes from the MetaboLights table of the paper. The prompt names no table and the adapter reads public METASPACE datasets only. runs.md of this paper states that none of the expected numbers can be reached. | 45fa127 (reference item) |
| qwen3:8b | unique_formulas_three_sections | 66 | computed 61 | c | Same cause. The value is computed from the MAF table. | 45fa127 |
| qwen3:8b | total_formulas | 103 +-20 | computed 61 | c | Same cause. | 45fa127 |

Other findings:

- e39 to e112 (a): 13 tool calls failed with KeyError: offSample or msm. The answers file sets the database to HMDB v2.5. The dataset 2019-03-28_09h18m57s was processed with HMDB v4, LipidMaps and SwissLipids, so the result table had no columns. Fixed in 3e62321: the error names the databases of the dataset.

Commits in this branch for this paper: 3e62321, 45fa127

Status: not runnable. The numbers need an upload tool for the three section files and a METASPACE account. The adapter has no upload tool. The three items are reference items and leave the score. Claude runs this paper and its numbers differ for the same reason.
