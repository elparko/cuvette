import sys
import mne

raw = mne.io.read_raw_fif(sys.argv[1], preload=True, verbose=False)
events = mne.find_events(raw, stim_channel="STI 014", verbose=False)
epochs = mne.Epochs(raw, events, event_id={"auditory/left": 1}, tmin=-0.2, tmax=0.5, baseline=(None, 0), preload=True, verbose=False)
epochs.average().save(sys.argv[2], overwrite=True, verbose=False)
