from pathlib import Path

import numpy as np
import pandas as pd
from scipy import integrate

D = Path(__file__).resolve().parent.parent / "data"
d = pd.read_csv(D / "hplc_py_integration_chrom.csv")
t, y = d["time"].to_numpy(float), d["signal"].to_numpy(float)
step = float(np.median(np.diff(t)))
truth = pd.read_csv(D / "hplc_py_integration_areas.csv")
print("time step", step)
print("hplc-py test ground truth (test_integration_window_areas.csv):")
print(truth.to_string(index=False))
for a, b in [(0.0, 19.99), (2.5, 17.5), (5.0, 15.0), (7.5, 12.5), (9.0, 11.0)]:
    m = (t >= a) & (t <= b)
    area_time = float(integrate.trapezoid(y[m], t[m]))
    print("window %5.2f to %5.2f  trapezoid (signal x time) %12.4f  divided by the step %14.3f" % (a, b, area_time, area_time / step))
print()
print("The hplc-py area is the summed signal over the window, not the signal times time.")
print("The trapezoid area divided by the time step gives the same number.")
