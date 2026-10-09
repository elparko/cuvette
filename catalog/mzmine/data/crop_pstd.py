import sys

import pyopenms as oms

src, out = sys.argv[1], sys.argv[2]
exp = oms.MSExperiment()
oms.MzMLFile().load(src, exp)
kept = []
for s in exp.getSpectra():
    if 600 <= s.getRT() <= 660:
        mz, inten = s.get_peaks()
        m = (mz >= 100) & (mz <= 200)
        s.set_peaks((mz[m], inten[m]))
        kept.append(s)
exp.setSpectra(kept)
f = oms.MzMLFile()
o = f.getOptions()
o.setMz32Bit(True)
o.setIntensity32Bit(True)
o.setCompression(True)
f.setOptions(o)
f.store(out, exp)
n, peaks = exp.getNrSpectra(), sum(s.size() for s in exp.getSpectra())
if (n, peaks) != (238, 63775):
    sys.exit(f"unexpected crop: {n} spectra, {peaks} peaks")
print(n, peaks)
