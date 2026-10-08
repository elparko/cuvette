# Triage: schindelin2012-fiji-blobs

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-153707-2199`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | particles_edges_included | 64 | computed 64 (pass), reported none | d | The model counted 64 blobs but wrote an answer about a truth mask. In e46 it made up the path blobs_mask.tif (compare_masks, e47 failed). The final answer (e71) does not give the count. | model fault |
| qwen3:8b | particles_edges_excluded | 46 | computed 44.58 (a table cell) | c | The answers file sets exclude_border_objects to false and the prompt does not ask for the count without edge objects. The value can come only from a comparison run of that decision. Not changed here: the coordinator is changing the scorer for values that exist only in comparison runs. | none in this branch |

Other findings:

- e60 to e71 (b): the review called the file sizes 4096 and 25765 from list_dir "unsourced". Numbers in the result of list_dir and read_file are not logged numbers unless the file is an output of a step (src/core/record.ts numbers()). The model then cut the sizes from the answer. Not fixed.

Commits in this branch for this paper: none (model faults only).
