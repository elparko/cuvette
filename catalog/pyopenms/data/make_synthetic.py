import sys

import numpy as np
import pyopenms as oms

PROTON = 1.007276466812
COMPOUNDS = [("C6H12O6", 25.0), ("C42H82NO8P", 40.0), ("C8H10N4O2", 55.0)]


def lcms(path):
    exp = oms.MSExperiment()
    patterns = []
    for formula, rt in COMPOUNDS:
        ef = oms.EmpiricalFormula(formula)
        iso = oms.CoarseIsotopePatternGenerator(3).run(ef).getContainer()
        patterns.append((rt, [(ef.getMonoWeight() + PROTON + (p.getMZ() - iso[0].getMZ()), p.getIntensity() / iso[0].getIntensity()) for p in iso]))
    for t in range(0, 81):
        s = oms.MSSpectrum()
        s.setRT(float(t))
        s.setMSLevel(1)
        s.setType(oms.SpectrumSettings.SpectrumType.CENTROID)
        mz, ints = [], []
        for rt, pattern in patterns:
            apex = 1.0e5 * np.exp(-((t - rt) ** 2) / (2 * 3.0**2))
            for m, rel in pattern:
                if apex * rel > 20:
                    mz.append(m)
                    ints.append(apex * rel)
        order = np.argsort(mz)
        s.set_peaks((np.array(mz)[order], np.array(ints)[order]))
        exp.addSpectrum(s)
    oms.MzMLFile().store(path, exp)


def profile(path):
    exp = oms.MSExperiment()
    s = oms.MSSpectrum()
    s.setRT(1.0)
    s.setMSLevel(1)
    s.setType(oms.SpectrumSettings.SpectrumType.PROFILE)
    axis = np.arange(700.0, 800.0, 0.002)
    y = np.zeros_like(axis)
    for center, height in ((760.5851, 1000.0), (786.6007, 500.0), (734.5694, 200.0)):
        y += height * np.exp(-((axis - center) ** 2) / (2 * 0.01**2))
    keep = y > 0.01
    s.set_peaks((axis[keep], y[keep]))
    exp.addSpectrum(s)
    oms.MzMLFile().store(path, exp)


if __name__ == "__main__":
    lcms(sys.argv[1] + "/lcms_tiny.mzML")
    profile(sys.argv[1] + "/profile_tiny.mzML")
