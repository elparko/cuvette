# Gramfort 2013/2014: MNE software, sample dataset (auditory and visual stimuli)

## Citation
- Gramfort A, Luessi M, Larson E, Engemann DA, Strohmeier D, Brodbeck C, Goj R, Jas M, Brooks T, Parkkonen L, Hamalainen M. MEG and EEG data analysis with MNE-Python. Frontiers in Neuroscience 7:267 (2013). DOI: 10.3389/fnins.2013.00267
- Gramfort A, et al. MNE software for processing MEG and EEG data. NeuroImage 86:446-460 (2014). DOI: 10.1016/j.neuroimage.2013.10.027
- The steps and printed numbers below come from the MNE tutorial "Overview of MEG/EEG analysis with MNE-Python" (stable docs, read 2026-10-08). The papers describe the same pipeline but print no event counts or N100 values.

## Data
- Source: MNE sample dataset, `mne.datasets.sample`. One subject, 6 min of MEG (306 channels) and EEG (60 channels) with auditory and visual stimuli, left and right.
- Size: 1.6 GB download. License: BSD-style, given with the dataset (mne.tools/stable/overview/datasets_index.html).
- Local path: /Volumes/T7/guided-analysis/data/gramfort2013-mne-sample/MNE-sample-data/MEG/sample/sample_audvis_filt-0-40_raw.fif (filtered 0.1 to 40 Hz, 150.15 Hz)
- Fetch: bench/papers/gramfort2013-mne-sample/fetch.sh. The download worked on 2026-10-08, so the smaller testing and EEGBCI datasets are not used.
- One research volunteer, no identifiers in the files.

## Tool
- MNE-Python 1.13.2, Python 3.13, venv at ~/.guided-analysis/envs/mne/.

## Method steps, in order
1. `raw = mne.io.read_raw_fif(sample_audvis_filt-0-40_raw.fif, preload=True)`. Bad channels in the file: MEG 2443, EEG 053.
2. `events = mne.find_events(raw, stim_channel="STI 014")`. Result: 319 events, ids 1, 2, 3, 4, 5, 32.
3. `mne.Epochs(raw, events, event_dict, tmin=-0.2, tmax=0.5, reject=dict(mag=4000e-15, grad=4000e-13, eeg=150e-6, eog=250e-6), preload=True)`. Result: 319 matching events, 10 bad epochs dropped. The default baseline is (None, 0).
4. `epochs["auditory/left"].average()`.
5. Peak: absolute maximum of the global field power (root mean square over good gradiometers) between 0.08 and 0.12 s. Also the strongest single channel.

## Numbers to reproduce
| Quantity | Value | Source |
|---|---|---|
| Events found | 319 | tutorial |
| Counts for ids 1, 2, 3, 4, 5, 32 | 72, 73, 73, 70, 15, 16 | computed |
| Epochs dropped, all ids | 10 (309 kept) | tutorial |
| auditory/left epochs kept | 68 | computed |
| N100 latency, gradiometer global field power | 0.0932 s | computed |
| N100 amplitude, gradiometer global field power | 42.1 fT/cm | computed |
| N100 latency and amplitude, EEG negative peak | 0.0999 s, -6.0 uV | computed |

The tutorial text gives no N100 numbers. Its joint plot of both auditory conditions labels 0.093 s. One sample is 6.7 ms, so the tolerance on latency is 7 ms.

## Decisions the scientist owns (pipeline choice)
- Bad channels: MEG 2443 and EEG 053.
- Filter band: 0.1 to 40 Hz (already in the file).
- Reference: average (stored as a projection in the file).
- ICA: not used.
- Epoch window -0.2 to 0.5 s, baseline -0.2 to 0 s.
- Rejection: 4000 fT/cm grad, 4000 fT mag, 150 uV EEG, 250 uV EOG.
- Peak: gradiometers, window 0.08 to 0.12 s.
