from pathlib import Path

import numpy as np

D = Path(__file__).resolve().parent
rng = np.random.default_rng(20261009)

rate, dur = 10000, 8.0
t = np.arange(int(rate * dur)) / rate
rise, decay = 0.7e-3, 8e-3
gap = int(0.1 * rate)
starts, pos = [], int(0.3 * rate)
while pos < len(t) - int(0.1 * rate):
    starts.append(pos)
    pos += gap + int(rng.exponential(0.2) * rate)
amps = rng.uniform(25, 90, len(starts))
kernel_t = np.arange(int(0.06 * rate)) / rate
shape = (1 - np.exp(-kernel_t / rise)) * np.exp(-kernel_t / decay)
shape /= shape.max()
y = -50.0 + 3.0 * np.sin(2 * np.pi * 0.2 * t) + rng.normal(0, 4.0, len(t))
for s, a in zip(starts, amps):
    y[s:s + len(shape)] -= a * shape
with open(D / "synthetic_events.csv", "w") as f:
    f.write("time_s,pA\n")
    for ti, yi in zip(t, y):
        f.write("%.4f,%.2f\n" % (ti, yi))
with open(D / "synthetic_events_truth.csv", "w") as f:
    f.write("time_s,amplitude_pa\n")
    for s, a in zip(starts, amps):
        f.write("%.4f,%.2f\n" % (s / rate, a))

v = np.arange(-60, 41, 10.0)
g = 10.0 / (1 + np.exp((-20.0 - v) / 7.5))
i = g * (v - 60.0) + rng.normal(0, 3.0, len(v))
with open(D / "synthetic_activation.csv", "w") as f:
    f.write("voltage_mv,current_pa\n")
    for a, b in zip(v, i):
        f.write("%.1f,%.3f\n" % (a, b))

v2 = np.arange(-110, -9, 10.0)
i2 = 800.0 / (1 + np.exp((v2 + 60.0) / 6.0)) + rng.normal(0, 8.0, len(v2))
with open(D / "synthetic_inactivation.csv", "w") as f:
    f.write("voltage_mv,current_pa\n")
    for a, b in zip(v2, i2):
        f.write("%.1f,%.3f\n" % (a, b))
print(len(starts), "events")
