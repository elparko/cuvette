# Triage: rees2019-uptake

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 run 1 (blind, adapter 0.1.0): `20261009-000127-8cd0`, 143 s, 13 tool calls (3 failed), computed 5/5, reported 4/4. Report: `bench/results/papers-2026-10-09-image-assays-haiku.md`.
- claude-haiku-5-5 run 2 (blind, adapter 0.1.1): `20261009-000829-08b0`, 136 s, 12 tool calls (2 failed), computed 6/6, reported 5/5. Report: `bench/results/papers-2026-10-09-image-assays-haiku-rees-v011.md`.
- Leak check of both runs: 0 paths outside the allow list, 0 unsourced claims. The one "blocked" entry is the wait for the scientist's answers, not a denied read.

The answer of both runs, from the folder run with the recorded settings:

| Item | Expected (CellProfiler result file) | Answer | Tolerance | Result |
| --- | --- | --- | --- | --- |
| nuclei | 582 | 566 | 35 | pass |
| vesicles | 461 | 448 | 35 | pass |
| vesicles_per_cell | 0.6766 | 0.769 | 0.12 | pass |
| fraction_cells_with_vesicles | 0.4371 | 0.501 | 0.08 | pass |
| cells (reference) | 572 | 459 | 35 | differs |

| Run | Item | Class | Cause | Fix |
| --- | --- | --- | --- | --- |
| 1 | three calls failed in the comparison runs (e45 to e47) | a | The defaults of two decisions did not work together: cell_mode expand with a cell_expand of 0. | image-assays 0.1.1: cell_expand serves expand mode only (default 10 pixels); the new cell_max_growth limits membrane mode (default 0, no limit). |
| 2 | one call failed with "unknown argument nucleus_split_smoothing" (e119) | a | The decision key differed from the argument name nucleus_smoothing, and the agent passed the key as an argument. It recovered on the next call. | image-assays 0.1.2: the decision key is nucleus_smoothing. |
| 1, 2 | vesicles, vesicles_per_cell, fraction_cells_with_vesicles | b | The scorer takes the logged number nearest to the expected value. It matched vesicles to metrics.total_cells (459) and the per-cell items to the row of field 2 (0.640, 0.465). The answer values (448, 0.769, 0.501) also pass. | Not fixed. An item cannot name the metric path that the scorer must read. |
| 1, 2 | cells (reference) | none | The tool grows cells with a watershed on the membrane image. CellProfiler Propagation gives smaller cells, so fewer touch the image edge. Expected before the run (paper.md). | none |

Other findings:

- The per-cell items pass, but the tolerances were set after a pilot run on the same fields (expected.yaml notes). The nuclei and vesicle items had their tolerances set from the method difference before the pilot.
- (d) Run 2 first said that the thresholds came from Otsu, then corrected this after the review. The agent did not open the QC overlays and said so.
