from pathlib import Path

import numpy as np

D = Path(__file__).resolve().parent.parent / "data"
truth = np.loadtxt(D / "synthetic_events_truth.csv", delimiter=",", skiprows=1)
amps = truth[:, 1]
print("events put into synthetic_events.csv by make_synthetic.py (seed 20261009)")
print("number of events", len(amps))
print("duration 8.0 s, frequency %.4f Hz" % (len(amps) / 8.0))
print("amplitude mean %.4f pA, median %.4f pA" % (amps.mean(), np.median(amps)))
rise, decay = 0.7, 8.0
t = np.arange(0, 80, 0.001)
shape = (1 - np.exp(-t / rise)) * np.exp(-t / decay)
shape /= shape.max()
k = int(np.argmax(shape))
t10 = t[np.argmax(shape[:k + 1] >= 0.1)]
t90 = t[np.argmax(shape[:k + 1] >= 0.9)]
print("10 to 90 percent rise time of the noise-free shape: %.4f ms" % (t90 - t10))
print("decay time constant of the shape: %.1f ms" % decay)
print("peak of the shape is at %.4f ms after the onset" % t[k])
