# Triage: li2009-samtools

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-145502-fd51`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | reads_seq1 | 1482 | computed 1653 | c | The request asks for mapped and properly paired reads, a sorted and indexed file, and the region count. It does not ask for counts per reference sequence. The run called convert_to_bam, sort_bam, index_bam, flagstat and count_reads (e7 to e35). No tool gave per-sequence counts. | 3d1f05b (reference item) |
| qwen3:8b | reads_seq2 | 1789 | computed 1654 | c | Same cause. | 3d1f05b |
| qwen3:8b | mapq_ge_30 | 3210 | computed 3271 | c | The request does not ask for a MAPQ filter. Same cause. | 3d1f05b |

Commits in this branch for this paper: 3d1f05b
