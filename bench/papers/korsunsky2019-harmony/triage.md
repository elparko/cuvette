# Triage: korsunsky2019-harmony

Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude:claude-haiku-5-5, run 1: `20261009-014706-3bf1`
- claude:claude-haiku-5-5, run 2: `20261009-020524-92e5`
- claude:claude-haiku-5-5, run 3 (final): `20261009-023719-c6f8`

| Model | Item or call | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| haiku | label_by_reference, 2 calls in run 1 | ok | error "reference_groups must name at least 2 values" | a | The model gave the list as the text `["jurkat", "t293"]`. The tool split the text at commas and kept the brackets and quotes. | `_as_list` reads a JSON text list. Run 2 has no failure. |
| haiku | filter_genes in runs 1 and 2 | ok | FileNotFoundError with a long h5py message | d | The model passed the text `{"handle": "merged.h5ad"}`. No handle has this name. | The scanpy error now names the path and says how to pass an object. The tools also read a handle that arrives as JSON text. Run 3 has no failed call. |
| haiku | plot_genes in a run between run 2 and run 3 | ok | error "Give genes, or run find_markers first" | a | The model gave the list of genes as the text `["CD3E", "LCK"]`. The tool took it as one gene name. | The scanpy tool reads a gene list that arrives as JSON text (test `handle-as-json-text`). |
| haiku | run_script in run 1 | ok | script exit code 1 | d | The model opened a checkpoint with a wrong path in its own script. | None. |
| spec | t293_pure_cells_after_qc, mix_jurkat_cells, mix_t293_cells | 2859, 1799, 1565 | 2885, 1773, 1615 | c | The paper counts do not reproduce from the 10x files with the stated filter. The paper drops cells of unclear identity (Figure S1) and gives no rule. | The items are references (no score). The reason is in `bench.yaml` and `case.yaml`. |
| spec | ilisi_before, ilisi_after | 1.01 and 1.59 | 1.056 and 1.657 | c | The R pipeline of 2019 differs from this pipeline in the L2 normalization and in the variable genes. The difference is 0.05 and 0.07. | The tolerance 0.1 was set before the runs. No change. |

Commits in this branch for this paper: see `git log -- bench/papers/korsunsky2019-harmony`.
