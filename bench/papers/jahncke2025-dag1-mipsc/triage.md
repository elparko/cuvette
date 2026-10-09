# Triage: jahncke2025-dag1-mipsc

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 (blind, adapter 0.1.0): `20261009-050212-27d1`, 273 s, computed 12/12 (12 scored items and 1 reference item) after the rescore, reported 12/12. Report: `bench/results/papers-2026-10-09-ephys-haiku.md`.
- Before the rescore, the report showed computed 10/12. The cause was the item fault in row 2 and the stored-value fault in row 3.
- Leak check: 36 paths read, 0 outside the allow list, 0 blocked reads, 0 unsourced claims.
- The run used 1 sweep for each cell, not 10. See row 1. The reported numbers pass because the tolerances are wide, not because the run is right.

- Rerun after the reader fix (all 10 sweeps of each cell): `20261009-053013-97c5`, 398 s, computed 10/10, reported 10/10. Report: `bench/results/papers-2026-10-09-jahncke-haiku-rerun.md`. Leak check: 0 outside, 0 blocked, 0 unsourced.
- p_rise and p_decay are now reference items, not scored. With tolerances of 0.2 and 0.25, the nearest-number match took an ICC value (0.27) for both p values. The paper used a different event detection, so a tighter tolerance has no basis.

| Run | Item | Class | Cause | Fix |
| --- | --- | --- | --- | --- |
| 1 | all items | a | The Igor reader took only the first analog signal of the first segment. A pxp file holds 10 signals (sweep32 to sweep41) in one segment. The tool said "1 sweep" and analyzed 28.5 s for each cell, not 285 s. The model saw the conflict with the prompt and said so. | `catalog/patch-clamp/pc_read.py` now reads every analog signal as one sweep. Cell 1 gives 1003 events in 285 s (3.52 Hz). Before the fix it gave 87 events in 28.5 s (3.05 Hz). The Haiku run must run again. |
| 1 | n_cells_ctrl, n_cells_cko | c | The item had `tool: detect_events_for_cells`. That tool gives one table with all 32 cells and the count 32. It has no count for each group. The group counts (n_a, n_b = 16, 16) are in the table of `compare_cell_groups`. The nearest number in the allowed tool was 17, the event count of one cell (n10 table.rows[8][1]). The model analyzed 16 and 16 cells, as the answer says. | The two items now have `tool: compare_cell_groups`. The tolerance is unchanged (exact). The rescore finds 16 at n12 table.rows[0][4]. |
| 1 | 10 items | b | The stored `value` and `diff` of n_cells_cko to amp_ctrl were the numbers of amp_cko (40.22686, 1.92686). The `node`, `path` and `pass` fields were correct. The scoring code and a replay of the run records give the correct values. The cause is not found in the code. | `scoreItems` and `rescoreItems` now check that diff equals the distance of value from the expected value, and that pass follows diff. The match objects are frozen. A test checks all committed result files. The rescore gives the correct values. |
| 1 | p_rise, p_decay | c | The computed match is not the p value. It is the upper limit of a confidence interval (n12 table.rows[3][14] = 0.397). The tolerances (0.2 and 0.25) are wide, so the real p values (0.269 and 0.178) also pass. The reported match for p_rise is the intraclass correlation 0.30, not the p value 0.269. | none. Tighten the two tolerances only after the rerun with 10 sweeps gives the tool values. |
| 1 | amp_cko | c | The reported match is 37.8 pA, a number of the threshold 3 comparison run. The group value (40.2 pA) is also in tolerance, so the score does not change. | none. |
| 1 | metadata file | c | `fetch.sh` wrote a carriage return after each cell name in `cells_metadata.csv`. A reader sees a line break inside each row. The model called the file malformed and wrote a clean copy. | `fetch.sh` removes the carriage return. The file on the T7 disk is written again. |

Findings of the model:

- The model asked the scientist one question about the metadata and sweeps (e75). The answer in the decision record covers the rest.
- It ran the event threshold 3 and 5 comparison through `detect_events_for_cells` (n14, n15). It wrote that it had no frequency for them. The log has 3.04 Hz and 1.60 Hz. The referee finding (e299) shows this.
- It ran `compare_cell_groups` once with a feature list as one string (e111, a failed call). It ran the call again in the next step.
- The headline called the cell-level difference significant. The animal-level check does not. The referee finding (e301) asked for a change. The answer states the limit.
- It did not run the mixed model. The adapter lme4 holds it. The answer says so.
