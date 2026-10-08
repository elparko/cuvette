---
name: count-events-per-gate
description: How to run the gates of a GatingML file or FlowJo workspace on an FCS file and report the counts.
---

# Count events per gate

The scientist owns the gating file and the compensation. Do not pick them.

1. Run inspect_fcs on the file. Report the event count and the spill matrix.
2. Run list_gates on the gating file. For a workspace, check that the sample name is in the list.
3. Run count_gates. The harness fills in the compensation and the matrix file. For a workspace, pass the sample name if it is not the file name.
4. Read the table. Report the event count of the file, the count of each gate asked for and the percent of the parent.
5. For a workspace, read the FlowJo column. Report both counts and the difference.
6. For a question about other compensation, run compare_compensation. Do not pass another compensation to count_gates. The harness keeps the chosen value there. Report the gate with the largest change in events and the gate with the largest change in percent.
7. Run plot_gate for the gates that matter. A gate name that exists twice needs gate_path.

Gate names such as CD107a+ can occur under CD4+ and under CD8+. The metric name has the parent path then.
