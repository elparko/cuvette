# Runs with the deseq2 adapter (love2014-deseq2-airway)

Date: 2026-10-08. Adapter: `catalog/deseq2` version 0.1.0 (draft). Model: `ollama:qwen3:8b`. Program: DESeq2 1.52.0 on R 4.6.1, macOS arm64. R library: `/Volumes/T7/guided-analysis/tools/R-library`.

Prompt: the guided question of `prompt.md`, the paths of the count table and the sample table, and a request for the number of genes after the filter, the number of significant, up and down genes, and a table of the top 20 genes.

Command (`<scratch>` is `/Volumes/T7/guided-analysis/tools/R-scratch/deseq1`):

```
GA_HOME=<scratch>/home node bin/ga.js -p "$(cat <scratch>/prompt.txt)" \
  --adapter catalog/deseq2 --model ollama:qwen3:8b --answers <scratch>/answers.json --allow all --output json
```

Answers file (all runs): design `~ cell + dex`, variable dex, reference untrt, test trt, minimum count 10, minimum samples 4, alpha 0.1, log2 fold change threshold 0, replicate donors. The design and filter are the values in `expected.yaml` decisions.

## Results

| Run | Session | Final answer | Pass |
| --- | --- | --- | --- |
| 1 | `20261008-112824-8665` | Tools ran with the right numbers. The answer text has no numbers ("I have completed the analysis"). | fail (answer) |
| 2 | `20261008-113359-36cf` | All numbers and a table of 20 genes in the answer. Run 2 adds "write every number in text" to the prompt. | see table |

Numbers of the tool result (same in both runs), compared with `expected.yaml`:

| Quantity | Expected | Run | Difference | Pass |
| --- | --- | --- | --- | --- |
| genes after pre-filter | 16637 (tolerance 600) | 16139 | 498 | pass |
| genes with padj < 0.1 | 4381 (tolerance 400) | 4905 | 524 | fail |
| up at padj < 0.1 | 2362 (tolerance 250) | 2607 | 245 | pass |
| down at padj < 0.1 | 2019 (tolerance 250) | 2298 | 279 | fail |
| genes with padj < 0.05 | 3602 (tolerance 400) | 4081 | 479 | fail |
| padj < 0.1, pydeseq2 0.5.4 on this CSV | 4643 (tolerance 100) | 4905 | 262 | fail |
| padj < 0.05, pydeseq2 0.5.4 on this CSV | 3872 (tolerance 100) | 4081 | 209 | fail |

The padj < 0.05 value comes from the sensitivity run of the adapter (alpha 0.05, same filter). Run 1 and run 2 produced it.

## Why the numbers differ from the workflow

- DESeq2 1.52.0 on this CSV gives 4905 genes at padj < 0.1. The workflow gives 4381. The CSV has the gene counts of the airway package. The workflow uses a newer annotation, as `expected.yaml` says.
- The filter changes the result. With at least 3 samples the tool gives 16596 genes and 4916 significant. With 5 samples it gives 15690 genes and 4854 significant.
- The expected values from pydeseq2 differ from R DESeq2 by about 260 genes at padj < 0.1. The two programs fit the dispersion in different ways. I did not find the cause.
- I did not run the rnaseqGene workflow itself. I did not check the gene filter that the workflow uses. The comparison above is with the numbers in `expected.yaml`.

## What went wrong

- Run 1: the model stopped with a short answer with no numbers. The review gave one info finding. The scientist would see an answer with no result. The adapter cannot fix this. The harness could ask the model to put the numbers in the text.
- Run 2: the review gave 2 errors from the harness and 9 from the referee model. The referee findings say that values such as 4905 and 0.1 are not in the log. They are in the log. These findings are false.
- Run 2: the harness marked 3.29, 2.94 and six more fold changes as "from a comparison run of another option". I did not check why the harness marked them.
- Run 1 took 5.4 minutes. Run 2 took 9.6 minutes. Each run includes five sensitivity runs of the decisions min_samples and alpha, each on the full 63677 genes.
