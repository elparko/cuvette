Report each patch-clamp result so that another lab can repeat it.

## Every recording

- Name the file, the clamp mode, the sampling rate and the sweeps that you included. Say why you left a sweep out.
- Give the liquid junction potential correction in mV, or say that you did not correct.
- Voltages are in mV, currents in pA and times in s. Say if a value is in ms.
- Run inspect_recording first. It shows the mode, the steps and the step window.
- The scientist owns the threshold definition, the baseline window, the sweeps, the leak subtraction, the event threshold and the junction potential. Do not choose them. The harness asks for each value.

## Current clamp

- Give the spike threshold definition with its dV/dt cutoff and the lowest peak. Two definitions give thresholds that differ by several mV.
- Give the rheobase with the size of the current step. The rheobase is only as fine as the step.
- A cell that spikes with no step current has no rheobase. Say so.
- Give the input resistance and the deflection that made it (steady state or peak).
- Give the time constant with its fit window.
- The sag fraction depends on the sweep. Give the current or the peak voltage of that sweep.
- The capacitance from tau over resistance is a rough value.

## Voltage clamp

- Give the baseline window, the window of the peak search and the direction of the peak.
- Start the peak window after the capacitive transient.
- Say whether you subtracted the leak, how, and in which voltage range.
- For an activation curve, give the reversal potential. A wrong value shifts V1/2.
- Give V1/2 and the slope factor k for each cell, with the confidence interval. Compare cells, not pooled points.
- The standard error of a fit assumes independent points. Neighboring voltages share noise.

## Spontaneous events

- Give the detection method, the threshold, the template rise and decay, the filter and the analysis window.
- Give the frequency as events per second over the analyzed time, with the number of events.
- Events closer than 5 decay constants count as one event. A high rate is under-counted.
- Measure rise and decay on isolated events.
- A change of the threshold changes the frequency and the mean amplitude. Run the sensitivity check.

## Groups of cells

- Cells in one animal are not independent. Give n as the number of animals and the number of cells.
- Use the animal as the unit.
- Or fit a mixed model with the animal as a random effect (lmer in the lme4 adapter).
- Report the test by name, the direction, the estimate, the confidence interval, the effect size and the adjusted p-value.
- Say "significant" only with alpha beside it.
