---
name: preprocess-recording
description: How to load a raw EEG or MEG file, check its band and bad channels, filter it and set the reference.
---

# Prepare a raw recording

The scientist owns the bad channels, the filter band and the reference. Help the scientist to see the data.

1. Run load_raw with the absolute path of the .fif file. Read the sampling rate, the band that the file carries and the bad channels stored in the file.
2. Run count_events. For the MNE sample data the ids are 1 auditory/left, 2 auditory/right, 3 visual/left, 4 visual/right, 5 smiley and 32 buttonpress.
3. Run set_bad_channels. The harness asks for the list. The value file keeps the list of the file. The MNE sample file marks MEG 2443 and EEG 053.
4. Run filter_raw only if the chosen band differs from the band of the file. The file sample_audvis_filt-0-40_raw.fif already holds 0.1 to 40 Hz. Filtering it again at 0.1 to 40 Hz changes the data a little. Say so in the report.
5. Run set_reference. The sample EEG data carry an average reference as a projection. The projection is applied when you cut epochs.
6. Use the checkpoint path (.fif) of the last step if a handle is lost.

Plots from MNE are PNG files in the work folder. The harness shows them.
