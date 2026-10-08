# Runs: wolf2018-scanpy (scanpy PBMC 3k)

Date: 2026-10-08. Model: ollama:qwen3:8b. Adapter: scanpy 0.1.0 (draft). Program: scanpy 1.12.4.
Method: prompt-only emulation. The model gets the plain prompts of `prompt.md` as one request, with
the data folder added. The answers file gives the paper decisions.

Command (run 4):

```
GA_HOME=<temp dir> node bin/ga.js -p "I have a folder of 10x output for blood cells from one healthy donor. The folder is /Volumes/T7/guided-analysis/data/wolf2018-scanpy/filtered_gene_bc_matrices/hg19 . Clean this single-cell data the usual way and group the cells into clusters. Tell me how many cells you kept and how many clusters you found. Then tell me which genes mark each cluster." --adapter catalog/scanpy --model ollama:qwen3:8b --answers answers.json --allow all --output json
```

answers.json (keys are adapter decision keys, values are from `expected.yaml`):
`min_genes_per_cell 200, max_genes_per_cell 2500, max_pct_mito 5, min_cells_per_gene 3, target_sum 10000,
n_top_genes 0, regress_out "total_counts,pct_counts_mt", n_pcs 40, n_neighbors 10, leiden_resolution 0.7,
random_seed 0, marker_method wilcoxon`.

## Result summary

| Quantity | Expected | Run 4 | Pass |
| --- | --- | --- | --- |
| Cells at load | 2700 | 2700 | yes |
| Genes at load | 32738 | 32738 | yes |
| Genes after min_cells 3 | 13714 | 13714 | yes |
| Cells after QC | 2638 | 2638 | yes |
| Highly variable genes | 1838 (+/- 20) | 1838 | yes |
| Leiden clusters at 0.7 | 7 (+/- 1) | 7 (1174, 486, 438, 341, 150, 36, 13) | yes |
| Marker genes | no list in expected.yaml | B: CD79A, MS4A1. Monocytes: LYZ, S100A8, S100A9. NK: NKG7, GZMA. Megakaryocytes: PF4, PPBP. T cells: LDHB, CD3D | numbers yes, labels partly wrong |

Verdict: PASS on all numbers. FAIL on cell type labels in the final text (see below).
The decision values came from the harness (the harness replaced the model values 20, 100000 and 15
with the answers in the file). The cluster sizes equal the sizes in `paper.md`.
A direct run of the wrapper functions on the full data (outside the harness) gave the same numbers.

## Run 4 (final)

- Session: `20261008-012420-9988`. Home: `/tmp/ga_home4.7Iqn`.
- Tool order of the model: load, inspect, filter genes, QC, filter cells, normalize, variable genes, scale, PCA, neighbors, UMAP, Leiden, markers, plot. 14 calls, all ok.
- The sensitivity table for the resolution ran before the question: 0.3 gives 5 clusters, 0.7 gives 7, 1.0 gives 8, 1.5 gives 14.
- Final answer (short): 2700 cells in, 2638 kept, 7 clusters with the right sizes, markers for each cluster, putative cell types.
- What went wrong in the answer (model, not adapter):
  - It says "after filtering genes: 2638 cells (removed 62 cells)". The 62 cells come from the cell filter, not the gene filter.
  - Cluster 0 is named "Red Blood Cells". The top genes (RPS12, LDHB, CD3D) mark T cells.
  - Cluster 4 is named "Macrophages". The tutorial names this group FCGR3A monocytes.
  - It does not state the resolution, the seed, the test name (wilcoxon) or the QC cutoffs.
- The review findings list is empty. No referee model was set, so the text checks (seed_not_fixed, resolution_not_reported, marker_test_not_named, qc_cutoffs_not_reported) did not run.
- The model did not read the skill `marker-genes`. After this run I added a line to `STANDARDS.md` that points to it. This line was not tested in a run.

## Run 3

- Session: `20261008-005314-5085`. Home: `/tmp/ga_home3.Ki1E`.
- Same prompt and adapter as run 4.
- The process ended with no output at the find_markers step (about 19 minutes after the last log line; no worker process was left). The numbers up to the Leiden step were the same as in run 4. Cause not found. Another process on the machine may have stopped it. Run 4 is the same run again.

## Run 2

- Session: `20261008-003159-0afa`. Stopped by hand after 40 minutes.
- Adapter problems found and fixed:
  - `run_pca` had an `n_comps` argument. The model chose 30, then `build_neighbors` failed because the decision `n_pcs` was 40. Fix: `run_pca` has no `n_comps` argument and always computes 50 components. The decision `n_pcs` has a maximum of 50.
  - The model called `run_umap` with `n_components` 15 times and the call failed each time (unknown argument). Fix: `run_umap` accepts `n_components`.
  - The model filtered cells before genes (13656 genes instead of 13714). Fix: the tool descriptions, the skill and `STANDARDS.md` give the order. In runs 3 and 4 the model filtered genes first.
  - The seed decision had a sensitivity on `cluster_leiden`. The three runs failed with "missing required argument adata" (harness bug 1 below). Fix: the sensitivity is removed from the seed decision.

## Run 1

- Session: `20261008-002945-ec9f`. Home: `/tmp/ga_home1.NjMh`.
- The model passed the bare handle string `"h1"` to `inspect_data`. The tool took the string as a file path and failed. The model then stopped with a text answer and no result.
- Fix: the wrapper reads a bare handle string, and a `{handle, type, repr}` object, from the worker handle table.
- Cause in the manifest: the harness turns `"h1"` into `{handle: "h1"}` only when the argument type has `object` and not `string`. The tools take `[object, string]` so they also take a path.

## Harness notes (not fixed)

1. A decision with a sensitivity `tool` that differs from the tool that triggers the question gets empty base arguments (`src/core/session.ts` near line 660: `const base = sensTool === (tool.remoteName ?? tool.name) ? args : {}`). Reproduction: a decision with links to `run_pca` and `cluster_leiden` and `sensitivity.tool: cluster_leiden`. The first call of `run_pca` runs three sensitivity calls of `cluster_leiden` with no arguments. Each fails with "missing required argument adata".
2. `src/adapters/kinds/common.ts` `handleStrings` (line 690 to 696) does not convert `"h1"` to a handle when the argument type is `[object, string]`.
3. In headless mode, a free-text `ask_scientist` call from the model gets the first option when the answers file has no key for it. Run 2 got `max_genes_per_cell=3000, min_cells_per_gene=50` this way. The decision values were then replaced by the file values at the tool call.
4. `ga adapter check` warns that the decision `replicate` has no link. The decision is only for the review checks, so the warning stays.
