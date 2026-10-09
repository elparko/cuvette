from pathlib import Path

import numpy as np
import pyabf

D = Path(__file__).resolve().parent.parent / "data" / "pyabf"

abf = pyabf.ABF(str(D / "171116sh_0018.abf"))
rate = abf.dataRate
ep = abf.sweepEpochs
abf.setSweep(0)
p1, p2 = abf.sweepEpochs.p1s[2], abf.sweepEpochs.p2s[2]
t0, t1 = p1 / rate, p2 / rate
print("current clamp file 171116sh_0018.abf: %d sweeps, %d Hz, step window %.5f to %.5f s" % (abf.sweepCount, rate, t0, t1))
rows = []
for s in range(abf.sweepCount):
    abf.setSweep(s)
    v, c = abf.sweepY, abf.sweepC
    amp = float(np.median(c[p1 + 10:p2 - 10]) - c[0])
    dv = np.diff(v) * rate / 1000.0
    seg = dv[p1:p2]
    up = np.flatnonzero(np.diff((seg >= 20.0).astype(int)) == 1) + p1
    keep = [u for k, u in enumerate(up) if k == 0 or np.any(dv[up[k - 1]:u] < 0)]
    spikes = [u for u in keep if v[u:u + int(0.005 * rate)].max() >= -10.0]
    ss = float(np.mean(v[p2 - int(0.1 * rate):p2]))
    base = float(np.mean(v[int(0.02 * rate):int(0.13 * rate)]))
    rows.append((amp, len(spikes), ss, base, spikes, v))
rows.sort(key=lambda r: r[0])
for r in rows:
    print("step %7.1f pA  spikes %2d  rate %5.1f Hz  steady %8.3f mV" % (r[0], r[1], r[1] / (t1 - t0), r[2]))
spiking = [r for r in rows if r[1] > 0]
rheo = min(r[0] for r in spiking if r[0] > 0)
x = np.array([r[0] for r in spiking])
y = np.array([r[1] / (t1 - t0) for r in spiking])
m = np.polyfit(x, y, 1)[0]
print("rheobase %.1f pA, F-I slope %.6f Hz per pA over %d sweeps" % (rheo, m, len(spiking)))
first = [r for r in rows if r[0] == rheo][0]
u = first[4][0]
print("first spike at rheobase: raw dV/dt crossing, threshold %.3f mV" % first[5][u])
hyper = [r for r in rows if -100 < r[0] < 0]
cur = np.array([r[0] for r in hyper])
vss = np.array([r[2] for r in hyper])
slope = np.polyfit(cur, vss, 1)[0]
print("input resistance from steady state of %d hyperpolarizing sweeps: %.4f MOhm" % (len(hyper), slope * 1e3))
print("resting potential, mean baseline of these sweeps: %.4f mV" % np.mean([r[3] for r in hyper]))

vc = pyabf.ABF(str(D / "17o05024_vc_steps.abf"))
vr = vc.dataRate
vc.setSweep(0)
a1, a2 = vc.sweepEpochs.p1s[2], vc.sweepEpochs.p2s[2]
print("\nvoltage clamp file 17o05024_vc_steps.abf: %d sweeps, %d Hz, step window %.5f to %.5f s" % (vc.sweepCount, vr, a1 / vr, a2 / vr))
w1, w2 = int(0.6 * vr), int(1.05 * vr)
out = []
for s in range(vc.sweepCount):
    vc.setSweep(s)
    y = vc.sweepY
    cmd = vc.sweepC
    base = float(np.mean(y[int(0.1 * vr):int(0.5 * vr)]))
    seg = y[w1:w2] - base
    k = int(np.argmax(np.abs(seg)))
    out.append([float(np.mean(cmd[a1 + 10:a2 - 10])), float(seg[k]), float(np.mean(seg))])
out.sort()
for o in out:
    print("V %7.2f mV  largest deviation %10.3f pA  mean %10.3f pA  (window 0.6 to 1.05 s, baseline 0.1 to 0.5 s)" % tuple(o))
sel = [o for o in out if -80 <= o[0] <= -60]
g, b = np.polyfit([o[0] for o in sel], [o[2] for o in sel], 1)
print("leak line from the mean current of %d sweeps between -80 and -60 mV: %.6f nS, intercept %.4f pA" % (len(sel), g, b))
sub = [(o[0], o[1] - (g * o[0] + b)) for o in out]
for v_, i_ in sub:
    print("V %7.2f mV  leak-subtracted largest deviation %10.3f pA" % (v_, i_))
print("largest after the leak subtraction %.3f pA at %.2f mV" % max(((i_, v_) for v_, i_ in sub), key=lambda z: abs(z[0])))
