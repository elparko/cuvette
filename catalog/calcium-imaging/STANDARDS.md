# Calcium imaging reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Before the analysis

- Run inspect_recording first. Read the warnings about negative values and about traces that are dF/F already.
- Never compute dF/F on traces that are dF/F already.
- Look at the heatmap and the trace plot of compute_dff before you detect events.

## Method

- Report the frame rate and where it came from.
- Report the baseline method. For the percentile method give the window and the percentile.
- Report the neuropil coefficient and the place of the neuropil ring. Say if the tool made no correction.
- Report the event method and the threshold. For OASIS give the decay time constant.
- Report the indicator. Say where the decay time constant came from.
- For responsive cells, report the response window, the pre-stimulus window, the delay, the z criterion and the number of trials.
- Report the cell detection method (hand ROIs, Suite2p, other), the cell diameter and the probability threshold.

## How to read the result

- dF/F is a fraction. 0.5 means 50 percent.
- A threshold event is a calcium transient. It can hold several spikes. Do not call it an action potential.
- An OASIS spike size depends on the model and the penalty. It is not a spike count unless a recording with known spikes shows it.
- A slow indicator and a low frame rate smooth the events. Event rate and rise time then depend on the indicator.
- The fraction of responsive cells depends on the z criterion and the windows. State them with the number.
- A correlation of two cells includes shared stimulus and shared drift. It does not show a connection.

## Unit of replication

- Cells in one animal are not independent. Fields of one animal are not independent either.
- Compare animals, slices or independent cultures. Use compare_groups for the animal means.
- For a model that keeps every cell, use a mixed model with the animal as a random effect (lme4 adapter).
- Report n for each group and say what n counts.

## Do not claim

- Do not give a p value from cells as independent samples.
- Do not compare event rates between recordings with different frame rates or indicators without saying so.
