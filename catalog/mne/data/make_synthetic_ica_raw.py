import mne
import numpy as np

sfreq = 200.0
n = int(60 * sfreq)
t = np.arange(n) / sfreq
names = ["Fz", "Cz", "Pz", "EOG 061", "STI 014"]
info = mne.create_info(names, sfreq, ["eeg", "eeg", "eeg", "eog", "stim"])
a_events = [int((1.0 + 2.5 * i) * sfreq) for i in range(20)]
b_events = [int((2.25 + 5.0 * i) * sfreq) for i in range(10)]
bump = lambda s, c, w: np.exp(-0.5 * ((t - (s / sfreq + c)) / w) ** 2)
brain = sum(bump(s, 0.1, 0.02) for s in a_events)
blink = sum(bump(s, 0.15, 0.1) for s in b_events)
mixing = np.array([[-5e-6, 100e-6], [-3e-6, 50e-6], [-4e-6, 20e-6]])
data = np.zeros((len(names), n))
data[:3] = mixing @ np.vstack([brain, blink])
data[3] = 300e-6 * blink
for s in a_events:
    data[4, s:s + 2] = 1
for s in b_events:
    data[4, s:s + 2] = 2
raw = mne.io.RawArray(data, info, verbose=False)
raw.set_montage("colin27_1020")
raw.save("synthetic_ica_raw.fif", overwrite=True, fmt="double")
