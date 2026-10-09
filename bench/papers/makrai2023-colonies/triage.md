# Triage: makrai2023-colonies

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 run 1 (blind): `20261008-235054-c9e5`, adapter image-assays 0.1.0. Every tool call failed with "the program was not found". Cause (b): the version command of locate ran with the repository as its working folder, and blind mode denies the repository, so Python stopped on its first import. Fixed in `src/adapters/locate.ts` (the version command runs in the temporary folder), commit a686634.
- claude-haiku-5-5 run 2 (blind): `20261008-235553-82f3`, 258 s, 13 tool calls (0 failed), computed 2/2, reported 1/1. Leak check: 0 paths outside the allow list, 0 blocked, 0 unsourced claims. Report: `bench/results/papers-2026-10-09-image-assays-haiku.md`.

| Run | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | total_colonies | 88 (tolerance 9) | 88 (15, 14, 12, 17, 16, 14) | none | Pass. The printed counts are 14, 14, 14, 14, 16, 16; the largest error on one photo is 3. | none |

Other findings:

- e45 to e65: the harness ran the threshold comparison (otsu, triangle, li) on the first photo before the answers were applied. With the default settings (gray channel, no size limit) the counts were 306 to 557. The comparison on the folder after the answers gave triangle 88, otsu 64, li 35.
- (a) The folder summary did not name the threshold method, so the agent could not tell which comparison folder belonged to which method (final answer, "Correction to my earlier answer"). The folder summary now names the threshold and lists the count of each photo (image-assays 0.1.2).
- The agent did not open the QC overlays. It said so in the answer.
