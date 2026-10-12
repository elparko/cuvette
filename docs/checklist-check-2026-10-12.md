# Checklist check of 12 October 2026: ARRIVE 2.0 for the Jahncke 2025 paper

This is a dated record. It does not change after this date.

## What was checked

Proposal 2.3 says: "A scientist reads the filled checklist for one paper and marks each wrong or missing item. The count must be zero wrong."
An agent did this check, not a scientist. See "Limit of this check".

The paper is `jahncke2025-dag1-mipsc` (miniature inhibitory postsynaptic currents of Purkinje cells in Dag1 conditional knockout mice).
The record is a real session of a benchmark run: Claude Haiku, 9 October 2026, session `20261009-053013-97c5`.
The log is on the T7 drive in `tools/bench-runs/2026-10-09/claude_claude-haiku-5-5/jahncke2025-dag1-mipsc/run1/home/sessions/20261009-053013-97c5/log.jsonl`.
The result file is `bench/results/papers-2026-10-09-jahncke-haiku-rerun.json`.
The agent loaded the log with `AnalysisRecord` and called `buildChecklist(record, "arrive")`.

What the record holds:

- The request of the scientist: mice at postnatal day 30, whole-cell voltage clamp at -70 mV, NBQX and TTX in the bath, groups Ctrl and cKO.
- Decisions: sweeps = all, event method = template, threshold = 4, replicate unit = cells, group test = t, alpha = 0.05.
- A sample sheet with 12 rows. Each row is one animal.
- Seven program steps, among them `detect_events_for_cells` (32 cells, 0 failed) and `compare_cell_groups` (Welch t-test, 4 outcomes, Benjamini-Hochberg adjustment).
- A `run_script` step for an animal-level test and a mixed model.

The record holds no plan, no randomization, no blinding, no sample size calculation and no exclusion list.

## Result

| Run | Items wrong | Items right |
| --- | --- | --- |
| Before the fixes | 12 | 10 |
| After the fixes | 0 | 22 |

## Review table

"Before" is the table that the old code printed.
"After" is the table of the fixed code.
"Right" means that the status and the value agree with the record and with the ARRIVE 2.0 Essential 10 definition of the item.

| Item | Status before | Correct status | Value before | Why | After the fix |
| --- | --- | --- | --- | --- | --- |
| 1a | Covered | Covered | Right: "Ctrl, cKO" | The groups are in the sample sheet. The control group is Ctrl (named in the request). | Same. Right. |
| 1b | Covered | Covered | Right: "replicate_unit = cells" | The scientist chose cells. | Same. Right. |
| 2a | Covered | Covered | Wrong: "6 units, 6 samples" in each group | The sample sheet counts animals. The unit is cells. The comparison step has 16 cells in each group and 6 animals. The value gave no total. | Right: "unit = cells, n_a = 16, n_b = 16, n_animals_a = 6, n_animals_b = 6; total = 32". |
| 2b | Not in the record | Not in the record | Right: empty | No sample size calculation is in the record. | Same. Right. |
| 3a | Not in the record | Covered | Wrong: empty | The decision "sweeps = all" sets which data points enter the analysis. The scientist set it before the run. | Right: "sweeps = all". |
| 3b | Covered | Covered | Wrong: notes on the empty columns "label" and "step" | Empty columns of the pilot table are not animals or data points that the analysis left out. | Right: "sweeps = all; n_failed = 0". All sweeps were kept. No cell file failed. |
| 3c | Covered | Covered | Wrong: "6 units, 6 samples" in each group | Same cause as 2a. | Right: 16 cells and 6 animals in each analysis. |
| 4a | Not in the record | Not in the record | Right: empty | The analysis does not hold a randomization method. | Same. Right. |
| 4b | Not in the record | Not in the record | Right: empty | No batch or confounder step is in the record. | Same. Right. |
| 5 | Not in the record | Not in the record | Right: empty | No blinding is in the record. | Same. Right. |
| 6a | Not in the record | Covered | Wrong: empty | The comparison step names the four outcomes with units: frequency, amplitude, 10-90% rise time and decay time constant. | Right: "features = event_frequency_hz, event_amplitude_pa, event_rise_10_90_ms, event_decay_tau_ms". |
| 6b | Not in the record | Not in the record | Right: empty | The record names no primary outcome. The paper names none. | Same. Right. |
| 7a | Covered | Covered | Wrong: "group_test = t" only | The value did not name the test (Welch), the alpha, the second analysis or the software. | Right: the test, alpha 0.05, the Welch step, the animal-level and mixed-model step, program version 2.3.8 and Python 3.12.10. |
| 7b | Covered | Covered | Wrong: the start of the Welch summary, cut in the middle of a sentence | The checker matched the word "variance" in the text of the summary. The summary describes the test. It does not describe a check. The record holds one real check: the intraclass correlation over animals. | Right: "max_icc_animal = 0.2718". |
| 8a | Not in the record | Not in the record | Wrong: note had no hint | The request gives the species and the age (mice, postnatal day 30). It does not give the strain, the sex or the weight. The status is right. The note hid what the record holds. | Right: the note quotes the sentence of the request. |
| 8b | Not in the record | Not in the record | Wrong: note had no hint | The request gives the genotype (Dag1 conditional knockout). It does not give the source or the health state. | Right: the note quotes the sentence of the request. |
| 9a | Not in the record | Not in the record | Wrong: note had no hint | The request gives the recording method (-70 mV, NBQX, TTX). It does not give the procedure for each group. | Right: the note quotes the sentence of the request. |
| 9b | Not in the record | Not in the record | Right: empty | No time or frequency of a procedure is in the record. | Same. Right. |
| 9c | Not in the record | Not in the record | Right: empty | No housing or place is in the record. | Same. Right. |
| 9d | Not in the record | Not in the record | Right: empty | No reason for a procedure is in the record. | Same. Right. |
| 10a | Covered | Covered | Wrong: mean and standard deviation of one pilot cell | The value came from the pilot step `detect_events` on one cell. The item needs a summary for each group. | Right: mean and standard deviation of Ctrl and cKO for each outcome, from the comparison step. |
| 10b | Not in the record | Covered | Wrong: empty | The comparison step has the difference of means, the 95% confidence interval and Cohen d for each outcome. The checker read only the metrics of a step, not its result table. | Right: difference, confidence interval and Cohen d for each outcome. |

## What was wrong, by cause

1. The checker read only the metrics of a step. It did not read the result table. This caused 2a, 3c, 10a and 10b.
2. The checker took the first source that had a value, even when the source did not fit the item. This caused 10a (pilot step) and 2a and 3c (sample sheet in animals when the unit is cells).
3. A data check note about an empty column counted as an exclusion report. This caused 3b.
4. The word "variance" in a step summary counted as a check of the assumptions. This caused 7b.
5. The checker did not read the `sweeps` decision or the `features` argument. This caused 3a and 6a.
6. One source was enough for 7a. The item needs the test, the alpha and the software together.
7. An item that the analysis cannot fill gave no hint, even when the request of the scientist held part of the answer. This caused 8a, 8b and 9a.

## Fixes

All fixes are in `src/core/checklist.ts` and `src/core/guidelines/arrive.yaml`.

- New source `table`: reads columns of the result table of the latest step that has them. It shows one line for equal rows, or one line for each row label. It can add a total.
- New source `args`: reads an argument of the latest step that has it.
- New item flag `merge`: shows all sources that have a value, not only the first.
- New item flag `request`: adds the matching sentences of the first request to the note of an item that the scientist must fill by hand. The status stays "Not in the record".
- The step source shows the first sentence of a summary. It shows the `purpose` of a `run_script` step. It joins equal sentences from several steps.
- The metric source removes equal values.
- Numbers in a value show four significant digits.
- ARRIVE 2a and 3c read the result table before the sample sheet.
- ARRIVE 3a and 3b read the `sweeps` decision. 3b reads `n_failed`. 3b no longer reads the data check.
- ARRIVE 6a reads the `features` argument.
- ARRIVE 7a joins the decision, the step text and the software. ARRIVE 7b reads the intraclass correlation and no longer matches the word "variance" alone.
- ARRIVE 10a and 10b read the result table before the metrics.

Regression tests are in `tests/checklist.test.ts`: eight new tests, one for each cause.

## Limit of this check

An agent did this review. A scientist can find errors that an agent cannot.

- The agent judged the items against the record and the ARRIVE 2.0 Essential 10 text. It did not read the full paper. It used the methods in `bench/papers/jahncke2025-dag1-mipsc/paper.md`.
- The agent wrote the fixes and then judged the result of its own fixes. A second reviewer is needed to break this link.
- This is one paper and one record from one model. The sources `table` and `args` use column and argument names of the patch-clamp adapter. Other adapters can name them in another way, and the checker can then miss them.
- Four judgments need a scientist. First, does "sweeps = all" count as an inclusion criterion for 3a. Second, does an intraclass correlation count as a check of the assumptions for 7b. Third, is a list of outcome names a definition for 6a. Fourth, must 8a, 8b and 9a show "Covered" when the request holds part of the answer.
- The checker does not know if the scientist set a criterion before the study. Item 3a asks for this. The checker shows the decision and not its time.
- The count of zero wrong is the count of this agent. It is not the pass mark of proposal 2.3. That mark needs the review of a scientist.
