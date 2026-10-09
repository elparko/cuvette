# Triage: nowicka2019-cytof-bcrxl

Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude:claude-haiku-5-5, run 1: `20261009-032305-87f9`
- claude:claude-haiku-5-5, run 2 (final): `20261009-033119-d666`

| Model | Item or call | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| haiku | inspect_fcs, cluster_cells, differential_abundance in run 1 (16 calls) | ok | "there is no package called flowCore" | a | The R packages were in `R-library-microcyto`. Blind mode lets child processes read only `tools/R-library`. | The packages are in `tools/R-library`. The scripts and the install text name that folder. Run 2 has no failed call. |
| haiku | inspect_data in run 1 | ok | "can't open file src/tools/inspect_data.py" | b | Blind mode hides the repository from child processes. The built-in tool could not start. | None. The model then used the adapter tools. |
| spec | the 20 FlowSOM metaclusters | not scored | not scored | c | The paper merges the 20 metaclusters into 8 cell types by hand (a figure). The merge cannot be repeated from the text. | The benchmark scores the published cell types (channel population_id). `case.yaml` and `paper.md` say so. |

Commits in this branch for this paper: see `git log -- bench/papers/nowicka2019-cytof-bcrxl`.
