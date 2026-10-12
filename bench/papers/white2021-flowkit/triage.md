# Triage: white2021-flowkit

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-154029-df6d`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | cd3_flowjo | 133860 | computed pass, reported 133670, 82484, 47165 (FlowKit counts) | d | The request asks if the counts match FlowJo. The tool result (e29) holds the largest difference only (690). The model reported its own counts and not the FlowJo counts. The FlowJo counts are in the table of the result. | model fault |
| qwen3:8b | cd4_flowjo | 82636 | computed pass, reported 133670, 82484, 47165 (FlowKit counts) | d | The request asks if the counts match FlowJo. The tool result (e29) holds the largest difference only (690). The model reported its own counts and not the FlowJo counts. The FlowJo counts are in the table of the result. | model fault |
| qwen3:8b | cd8_flowjo | 47241 | computed pass, reported 133670, 82484, 47165 (FlowKit counts) | d | The request asks if the counts match FlowJo. The tool result (e29) holds the largest difference only (690). The model reported its own counts and not the FlowJo counts. The FlowJo counts are in the table of the result. | model fault |
| qwen3:8b | cd3_no_compensation | 135381 | computed nearest 133860, 82636, 47241 and 690; reported FlowKit counts | c, d | The answers file fixes compensation at the workspace matrix. A count without compensation exists only in a comparison run (compare_options on compensation). The model did not call compare_options. The scorer ignored comparison runs. | item flag from_comparison would fix the scorer part (8daaa0e). Not set: the coordinator changes the scorer for these values. |
| qwen3:8b | cd4_no_compensation | 85369 | computed nearest 133860, 82636, 47241 and 690; reported FlowKit counts | c, d | The answers file fixes compensation at the workspace matrix. A count without compensation exists only in a comparison run (compare_options on compensation). The model did not call compare_options. The scorer ignored comparison runs. | item flag from_comparison would fix the scorer part (8daaa0e). Not set: the coordinator changes the scorer for these values. |
| qwen3:8b | cd8_no_compensation | 47694 | computed nearest 133860, 82636, 47241 and 690; reported FlowKit counts | c, d | The answers file fixes compensation at the workspace matrix. A count without compensation exists only in a comparison run (compare_options on compensation). The model did not call compare_options. The scorer ignored comparison runs. | item flag from_comparison would fix the scorer part (8daaa0e). Not set: the coordinator changes the scorer for these values. |
| qwen3:8b | cd8_ifng_no_compensation | 672 | computed nearest 133860, 82636, 47241 and 690; reported FlowKit counts | c, d | The answers file fixes compensation at the workspace matrix. A count without compensation exists only in a comparison run (compare_options on compensation). The model did not call compare_options. The scorer ignored comparison runs. | item flag from_comparison would fix the scorer part (8daaa0e). Not set: the coordinator changes the scorer for these values. |

Other findings:

- e19: the model wrote the volume T5 in the path of the workspace. The harness replaced it with the recorded path (deviation e20, e28). Works as designed.

Commits in this branch for this paper: 8daaa0e
