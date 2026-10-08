---
name: compare-with-control
description: How to show the gate counts of a sample next to the counts of a control sample.
---

# Compare a sample with a control

The scientist names the control. Do not choose it.

1. Ask which file is the control and why. An unstained, a no-stimulation or a fluorescence-minus-one sample are common controls.
2. Run count_gates with the control file. The control uses the same gates, the same compensation and the same matrix.
3. Read the control columns. Report the sample percent of parent, the control percent of parent and the difference.
4. A gate that holds few events has a large counting error. Say so for a gate with fewer than 100 events.
5. Do not claim a difference from one sample and one control. Name the missing replicates.
