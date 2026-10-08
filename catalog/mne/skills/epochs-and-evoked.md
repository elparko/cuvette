---
name: epochs-and-evoked
description: How to cut epochs, count the epochs kept, average a condition and measure the N100 peak.
---

# Epochs, evoked response and the N100

The scientist owns the window, the baseline, the rejection limits and the peak window.

1. Run make_epochs with the event ids as a text such as "auditory/left=1,auditory/right=2,visual/left=3,visual/right=4,smiley=5,buttonpress=32". The harness fills in the window, the baseline and the limits from the scientist.
2. Read n_matching_events, n_epochs, n_dropped and the count for each condition. Look at the drop log plot. Show the sensitivity table for the EEG limit before you state a count.
3. Run compute_evoked for the condition that the question names, such as "auditory/left".
4. Run measure_peak for the channel type that the scientist chose. The tool reports the global field power peak and the strongest channel. For gradiometers and magnetometers use the global field power latency. For EEG use mode neg.
5. Run plot_evoked with kind butterfly or joint. Name the PNG file in the report.
6. In the report give the channel type, the window, the method, the latency in ms, the amplitude with unit and the number of epochs averaged.

The sample data have one sample every 6.7 ms. A latency has no finer resolution.
