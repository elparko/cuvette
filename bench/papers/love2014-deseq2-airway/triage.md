# Triage: love2014-deseq2-airway

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-150813-6fdf`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | padj_01_workflow | 4381 +-400 | computed 4905, reported 4905 | c | The tool is R DESeq2 1.52.0 on this CSV. It gives 4905 at padj < 0.1 in every run (min_samples 4, e41). The expected value is from the rnaseqGene workflow, which uses a newer gene annotation (expected.yaml, paper.md). The tolerance 400 is a guess. The R package airway is not installed here, so the workflow value could not be checked. I did not change the item. | none. Not changed, to keep the tolerance. Needs a check of the workflow value on the airway package. |
| qwen3:8b | padj_01_pydeseq2 | 4643 +-100 | computed 4905 | c | The value is from pydeseq2. The adapter runs R DESeq2. runs-deseq2.md notes a difference of about 260 genes between the two programs with unknown cause. | be4c6c3 (reference item) |
| qwen3:8b | padj_005_pydeseq2 | 3872 +-100 | computed 3659.7 (a table cell) | c | Same cause. | be4c6c3 |

Other findings:

- e53: the referee did not run. The cause is the 300 s wait for response headers (5 min 01 s after the claim check e52). Fixed in 54adf28.

Commits in this branch for this paper: 54adf28, be4c6c3
