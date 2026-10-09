---
name: voltage-clamp-currents
description: How to measure peak currents, an I-V curve and Boltzmann activation or inactivation curves from voltage steps.
---

1. Run `inspect_recording` on the file. Check that the mode is voltage clamp and note the step window.
2. Ask the scientist for these values: the sweeps, the baseline window, the peak window and the peak direction.
3. Ask for the leak subtraction and the junction potential.
4. Place the peak window after the capacitive transient. Run `measure_current_steps`.
5. Look at the plot. Check that the window holds the current of interest and not the transient.
6. For a leak line, the scientist gives the voltage range where only the leak flows. Run the sensitivity check for the leak subtraction.
7. For an activation curve, ask for the reversal potential. Run `fit_boltzmann` with `curve` set to activation on the I-V table.
8. For an inactivation curve, set `voltage_window` to the prepulse and `current_window` to the test pulse. Run `fit_boltzmann` with `curve` set to inactivation.
9. Report V1/2 and k for each cell with the confidence interval. Compare the cell values with `compare_cell_groups`.

The matching steps in the programs:

- Clampfit: Analyze > Statistics with a baseline region and a peak region, then Analyze > Fit with a Boltzmann function.
- Easy Electrophysiology: the I-V analysis.
- Igor Pro with NeuroMatic: the Stats tab, then a sigmoid fit.

A leak line from sweeps near the holding voltage fails if a current is active there.
