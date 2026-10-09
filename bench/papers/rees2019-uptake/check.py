# Reads the deposited CellProfiler 2.2 results (S-BSST249) for the first three fields (no adapter code).
# Run: python -I check.py > check.out  (numpy, scipy)
import sys

import numpy as np
import scipy.io as sio

R = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/reference/rees2019-uptake"
m = sio.loadmat(R + "/1_BEAS_0.5nM_1h.mat", squeeze_me=True, struct_as_record=False)
meas = m["handles"].Measurements
img, cells = meas.Image, meas.Cells
print("CellProfiler", meas.Experiment.CellProfiler_Version)
tot = {"nuclei": 0, "cells": 0, "nlv": 0, "nlv_in_cells": 0, "positive": 0}
for i in range(3):
    ch = np.atleast_1d(cells.Children_NLV_Count[i]).astype(int)
    row = {"nuclei": int(img.Count_Nuclei[i]), "cells": int(img.Count_Cells[i]), "nlv": int(img.Count_NLV[i]), "nlv_in_cells": int(ch.sum()), "positive": int((ch > 0).sum())}
    print("field %d (%s): %s, NLV per cell %.4f, fraction with NLV %.4f" % (i + 1, img.FileName_input_images[i], row, ch.mean(), (ch > 0).mean()))
    for k in tot:
        tot[k] += row[k]
print("three fields:", tot)
print("NLV per cell %.4f; fraction of cells with at least one NLV %.4f" % (tot["nlv_in_cells"] / tot["cells"], tot["positive"] / tot["cells"]))
print("thresholds: nuclei", [float(v) for v in img.Threshold_FinalThreshold_Nuclei[:3]], "cells", [round(float(v), 4) for v in img.Threshold_FinalThreshold_Cells[:3]],
      "ThreshNLV Otsu", [round(float(v), 4) for v in img.Threshold_FinalThreshold_ThreshNLV[:3]], "NLV", [float(v) for v in img.Threshold_FinalThreshold_NLV[:3]])
