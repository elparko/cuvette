import mne
import numpy as np

sfreq = 200.0
n = int(60 * sfreq)
t = np.arange(n) / sfreq
names = ["MEG 0112", "MEG 0113", "MEG 0111", "EEG 001", "EEG 002", "EEG 003", "EOG 061", "STI 014"]
types = ["grad", "grad", "mag", "eeg", "eeg", "eeg", "eog", "stim"]
info = mne.create_info(names, sfreq, types)
data = np.zeros((len(names), n))
a_events = [int((1.0 + 2.5 * i) * sfreq) for i in range(20)]
b_events = [int((2.25 + 5.0 * i) * sfreq) for i in range(10)]
bump = lambda s, c: np.exp(-0.5 * ((t - (s / sfreq + c)) / 0.02) ** 2)
gains = [100e-13, 60e-13, 300e-15, -5e-6, -3e-6, -4e-6]
for s in a_events:
    for ch, g in enumerate(gains):
        data[ch] += g * bump(s, 0.1)
for i in (3, 7):
    data[3] += 400e-6 * bump(a_events[i], 0.2)
data[6] += 300e-6 * bump(b_events[4], 0.15)
stim = data[7]
for s in a_events:
    stim[s:s + 2] = 1
for s in b_events:
    stim[s:s + 2] = 2
raw = mne.io.RawArray(data, info, verbose=False)
raw.save("synthetic_raw.fif", overwrite=True, fmt="single")
