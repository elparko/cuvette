# MNE-Python reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- Use the named tools. Each tool does one MNE step and returns a handle.
- Pass the handle of the last step to the next step. If a handle is lost, pass the checkpoint path (.fif).
- Each step saves a checkpoint. Name the file of the final step in the report.
- Do the steps in this order: load, count events, mark bad channels, filter, reference, ICA (only if the scientist wants it), epochs, evoked, peak, plots, time-frequency.
- Answer every part of the request. Call the next tool instead of ending a turn with a plan. The last step for an N100 question is measure_peak.
- MNE plots are written to PNG files. Show the file names.

## Preprocessing

- The scientist chooses the filter band, the reference, the bad channels and the ICA components. Do not choose them. The harness asks for each value.
- Do not ask for decision values in your own words. Do not suggest values in a question.
- Check the band that the file already carries (load_raw shows it). Filtering a second time changes the data. Say if you filter again.
- Report the filter band, the notch frequency, the reference and the bad channels.
- ICA changes every channel. Report the number of components, the seed, the removed components and why. The EOG correlation list is a hint. Look at the maps first.

## Epochs

- Report the epoch window, the baseline interval and every rejection limit with its unit.
- Report the events found, the epochs kept and the epochs dropped for each condition.
- The count of kept epochs depends on the rejection limits. Show the sensitivity table before you state a count.
- Bad channels are not tested for rejection. A different bad-channel list gives a different count.

## Evoked peaks

- Report the channel type, the search window, the method (global field power or one channel), the latency in ms, the amplitude with unit and the number of epochs averaged.
- A latency has the resolution of one sample. At 150 Hz this is 6.7 ms. Do not report more digits than that.
- The sign of a gradiometer or magnetometer value depends on the sensor. Use the absolute value or the global field power for MEG. Use the negative peak for an EEG N100.
- The peak depends on the window, the filter band and the reference. Say so when you compare with another study.
- Do not call a latency a property of a person from one recording.

## Time-frequency

- Report the frequencies, the cycles, the baseline interval and the baseline mode.
- Power at low frequencies needs long epochs. Say when edge effects can matter.

## Report

- Give each number with the tool step that made it.
- Say which results hold at every setting that you tried, and which depend on one setting.
