# Runs: palmer2017-metaspace-fdr

Method emulation with the `metaspace` adapter. Model: `ollama:qwen3:8b`. Date: 2026-10-08.

## Scope

The paper data are imzML files of three serial sections (MetaboLights MTBLS313). The adapter reads public METASPACE datasets only. It has no upload tool by design. The upload needs an API key. I skipped the upload and the annotation of the three sections. The test therefore cannot reproduce the numbers in `expected.yaml` (51 formulas in all three sections, 103 in total, 16 by LC-MS/MS, and the others). Those numbers come from the MetaboLights tables and from the 2016 engine (pySM).

What the run can test: if the model uses the decision record (HMDB v2.5, FDR 10%), asks for what it lacks, and says that it cannot assess serial sections without the datasets.

Answers file:

```json
{"fdr":0.1,"database":"HMDB v2.5","adducts":"all","exclude_off_sample":false,"*":"Use the recommended value."}
```

Prompt (the guided prompt, unchanged):

> How reproducible is the set of confidently annotated metabolites across serial sections of one mouse brain imaged by high-resolution MALDI?

Command (same for each run, new `GA_HOME`):

```
GA_HOME=<temp dir> node bin/ga.js -p "<prompt>" --adapter catalog/metaspace --model ollama:qwen3:8b --answers answers.json --output json
```

## Summary

| Run | Adapter version | Session | Result |
| --- | --- | --- | --- |
| 1 | 0.1.2 | 20261008-005303-c54b | Fail |
| 2 | 0.1.3 | 20261008-010420-408d | Fail |
| 3 | 0.1.4 | 20261008-011148-ddc5 | Fail (expected: no data) |

## Numbers against expected.yaml

| Quantity | Expected | Result |
| --- | --- | --- |
| Formulas in all 3 sections (51 +/- 8) | 51 | none; no section data |
| Total formulas (103 +/- 20) | 103 | none |
| Validated by LC-MS/MS | 16 | none; not a METASPACE number |
| Dominant lipid classes | PC, PE, SM, PA | none |
| FDR level | 0.1 | The answers file says 0.1. The model used 0.05 in some calls. |

None of the expected numbers can be reached with public METASPACE data. All three runs fail on this point, and they would fail with any adapter.

## What each run did

Run 1 (0.1.2). The model asked three questions with `ask_scientist` and then searched for "mouse brain" MALDI datasets. It picked one dataset, 2019-03-28_09h18m57s, which is not a serial section set. It reported counts for that dataset (17 at FDR 5%, 334 at FDR 20%, and "18" at FDR 10%, which is a wrong copy). It then wrote that HMDB v2.5 in the decision record "was an error" and replaced it with HMDB v4.

Run 2 (0.1.3). Same dataset choice and the same replacement of the database. The model called `overlap_annotations` with one dataset id, repeated. The tool raised a Python error (`set.union` with no arguments). The answer had invented number-like tokens ("2019 [no source]") and the same database error.

Run 3 (0.1.4). The tool now returns a clear error for one dataset id ("give 2 to 6 different dataset ids"). The model still used one dataset, called `overlap_annotations` twice, and ended with a short answer that says it found a single dataset and cannot assess serial sections. This is the correct conclusion. The answer does not give the FDR level, the database or the count.

## What went wrong

- Adapter fault, fixed in 0.1.4: `overlap_annotations` failed with a Python error when the same id was given twice. It now removes repeated ids and returns an error that says what to do.
- Model fault, not fixed: the model used HMDB v4 and FDR 0.05 although the decision record says HMDB v2.5 and 0.1. The harness logged each as a deviation and flagged "decision_misreported" and "deviation_not_mentioned". The harness works as intended here.
- Model fault: the model picked a dataset that was not a serial section set and did not ask the scientist for dataset ids.
- Data limit: HMDB v2.5 may not be in the dataset of a modern submission. A METASPACE dataset lists only the databases that it was processed with.

## Next step for a full test

Upload the three sections to METASPACE with an API key (on the website, not with this adapter), process them with HMDB v2.5, +H +Na +K, then run `overlap_annotations` with the three ids. Compare `n_in_all` with 51 (tolerance 8).
