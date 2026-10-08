# White et al. 2021: FlowKit, a Python toolkit for flow cytometry gating

## Citation
- White S, Quinn J, Enzor J, Staats J, Mosier SM, Almarode J, Denny TN, Weinhold KJ, Ferrari G, Chan C. FlowKit: A Python Toolkit for Integrated Manual and Automated Cytometry Analysis Workflows. Frontiers in Immunology 12:768541 (2021). DOI: 10.3389/fimmu.2021.768541
- The paper has no table of event counts. The known answers below come from the FlowKit repository (tests and test data), from the Gating-ML 2.0 compliance suite that the repository carries, and from the workspace file.

## Data
- Source: FlowKit repository, commit f2159043b6a56e527d4baacf97490caf8354618e, folder `data/`. License: BSD 3-Clause (FlowKit). The Gating-ML compliance files carry an ISAC notice that allows free distribution and read-only use.
- 8 color data set: three FCS files (about 17 MB each) from an intracellular cytokine stimulation experiment, and the FlowJo workspace `8_color_ICS.wsp`. Each workspace sample stores the event count that FlowJo reported for every gate.
- Gating-ML compliance set: `gate_ref/data1.fcs` (13367 events), `gate_ref/gml/gml_all_gates.xml` and `gate_ref/truth/Results_*.txt` (one 0 or 1 for each event). The adapter folder holds a small copy of the first two and a table of the reference counts.
- Local path: /Volumes/T7/guided-analysis/data/white2021-flowkit/src/data/ (about 340 MB with the repository).
- Fetch: bench/papers/white2021-flowkit/fetch.sh.
- Human data: the samples are de-identified. No identifiers are in the files that were read.

## Tool
- FlowKit 1.3.2 (FlowIO 1.4.0, FlowUtils 1.2.2), Python 3.13, venv at ~/.guided-analysis/envs/flowkit/.

## Method steps, in order
1. `fk.Workspace("8_color_ICS.wsp", fcs_samples=<E01 fcs>)`. Sample id `101_DEN084Y5_15_E01_008_clean.fcs`, 290172 events.
2. `wsp.analyze_samples(sample_id=...)` and `wsp.get_analysis_report()`. The gate tree is Time, Singlets, aAmine-, CD3+, then CD4+ and CD8+, each with CD107a+, IFNg+, IL2+, TNFa+.
3. Compare each count with the count that FlowJo stored in the workspace.
4. Run the same gates with compensation none (every gate dimension set to uncompensated).

## Numbers to reproduce
| Quantity | FlowKit | FlowJo (in the workspace) | Source |
|---|---|---|---|
| Events in the file | 290172 | 290172 | workspace SampleNode count, FCS $TOT |
| Singlets | 239001 | 239691 | computed, workspace |
| aAmine- | 164655 | 164942 | computed, workspace |
| CD3+ | 133670 | 133860 | FlowKit test test_get_gate_events (133670), workspace |
| CD4+ | 82484 | 82636 | computed, workspace |
| CD8+ | 47165 | 47241 | computed, workspace |
| CD4+ IFNg+ and CD8+ IFNg+ | 4 and 2 | 4 and 2 | computed, workspace |
| CD4+ TNFa+ and CD8+ TNFa+ | 21 and 8 | 21 and 8 | computed, workspace |

FlowKit and FlowJo differ by at most 0.3 percent of events in the gates above Singlets. This difference is real and is not a tool error. The adapter shows both counts.

Effect of compensation (computed): with compensation none, CD3+ has 135381 events (133670 with the matrix in the workspace), CD4+ 85369, CD8+ 47694, and CD8+ IFNg+ 672 (2 with the matrix).

## Decisions the scientist owns
- Gating file: 8_color_ICS.wsp.
- Compensation for gating: gating_file (the matrix in the workspace). Alternative to show: none.
- Control sample: none for the main run.
- Transform: the workspace carries its own transforms. The hand gate tools are not used.
