---
name: current-clamp-cell
description: How to measure spikes, rheobase, the F-I curve, input resistance, tau and sag from current-clamp steps.
---

1. Run `inspect_recording` on the file. Check that the mode is current clamp and note the step window and the step currents.
2. Ask the scientist for the sweeps to include, the baseline window and the junction potential correction.
3. Run `measure_passive` on the hyperpolarizing sweeps. Set `current_range_pa` to the negative steps. The tool keeps steps above the first value and below the second, so -101,0 keeps a -100 pA step and leaves out 0.
4. Read the input resistance, the R squared of the line and the number of tau fits. A tau fit can fail on a small step.
5. Run `measure_spikes` on all sweeps. The scientist chooses the threshold definition, the dV/dt cutoff and the lowest peak.
6. Read the rheobase and its step size. If a sweep with no step current has spikes, the cell fires by itself.
7. Look at the plot. The threshold dot must sit at the start of the rise.
8. Run the sensitivity check for the threshold definition and the cutoff. Report the range of the threshold.
9. Repeat for each cell. Join the cell tables with `collect_cell_features`.

The matching steps in the programs:

- Clampfit: Analyze > Statistics for levels and peaks, Analyze > Fit for tau.
- Easy Electrophysiology: the action potential, rheobase, input resistance, time constant and sag modules.
- Igor Pro with NeuroMatic: the Stats and Fit tabs.

The program rules for the threshold differ. Name the rule that made your numbers.
