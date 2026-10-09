# Triage: aulicino2022-baculovirus-hdr

Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 run 1 (blind, before the fixes): `20261009-040024-8040`, computed 5/8, reported 5/8.
- claude-haiku-5-5 run 2 (blind, after the first fix): `20261009-040250-ac15`, computed 7/8, reported 8/8.
- claude-haiku-5-5 run 3 (blind, final): computed 8/8, reported 8/8, 102 s, 0 paths outside the allow list, 0 blocked reads, 0 unsourced claims.

| Run | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | control_cutoff, hdr_pct_mean, hiti_pct_mean | 3791.17, 4.419, 20.903 | 3762.9, 4.431, 20.945 | a | The description of `control` in `population_stats` said "a control FCS file". The model used control replicate 1 alone, then tried replicates 2 and 3 one by one, and asked the scientist which one to use. | `control` takes a list of files and pools their events (flowcore 0.1.0). The description says so. |
| 2 | welch_p | 0.006018 | 5.4e-06 | a | The model passed the marker PE-CF594-A and the population PE-CF594-A+. The tool wrote the same population twice, so each sample counted twice in `compare_groups`. | `population_stats` skips a population that has the name of a marker plus "+". `compare_groups` stops if a sample appears twice for one population. `list_files` drops a repeated path. Test `population-named-like-marker`. |

Other findings:

- The paper prints about 5% and about 20%. The tolerances of the two published items are 1.0 and 1.5 percentage points. The cutoff at the 99.9th percentile of the pooled control gives 4.42% and 20.90%. The 99th percentile gives 6.62% and 25.95%, which the paper does not support.
- The model wrote the design file with `run_script`. The tool `compare_groups` needs a file with the columns sample and group.
