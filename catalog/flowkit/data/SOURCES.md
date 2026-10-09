# Test data sources

The FlowKit files come from the FlowKit repository, commit f2159043b6a56e527d4baacf97490caf8354618e
(bench/papers/white2021-flowkit/fetch.sh). Each file is byte for byte the same as the file in that commit.

| File | Source | License |
| --- | --- | --- |
| data1.fcs | Gating-ML 2.0 compliance set in the FlowKit repository, data/gate_ref/data1.fcs | BSD 3-Clause (FlowKit). The Gating-ML compliance files carry an ISAC notice that allows free distribution and read-only use (bench/papers/white2021-flowkit/paper.md). |
| gml_all_gates.xml | Gating-ML 2.0 compliance set in the FlowKit repository, data/gate_ref/gml/gml_all_gates.xml | BSD 3-Clause (FlowKit). The Gating-ML compliance files carry an ISAC notice that allows free distribution and read-only use (bench/papers/white2021-flowkit/paper.md). |
| truth_counts.json | Made by data/make_truth_counts.py from the reference files data/gate_ref/truth/Results_*.txt of the Gating-ML 2.0 compliance set in the FlowKit repository | BSD 3-Clause (FlowKit). The Gating-ML compliance files carry an ISAC notice that allows free distribution and read-only use (bench/papers/white2021-flowkit/paper.md). |
| test_comp_example.fcs | FlowKit repository, data/test_comp_example.fcs | BSD 3-Clause (FlowKit repository LICENSE) |
| comp_complete_example.csv | FlowKit repository, data/comp_complete_example.csv | BSD 3-Clause (FlowKit repository LICENSE) |
| data_set_simple_line_100.fcs | FlowKit repository, data/simple_line_example/data_set_simple_line_100.fcs | BSD 3-Clause (FlowKit repository LICENSE) |
| single_ellipse_51_events.wsp | FlowKit repository, data/simple_line_example/single_ellipse_51_events.wsp | BSD 3-Clause (FlowKit repository LICENSE) |
| synthetic_comp.fcs | synthetic, made by data/make_synthetic.py | synthetic, no third-party data |
| synthetic_comp_matrix.csv | synthetic, made by data/make_synthetic.py | synthetic, no third-party data |
