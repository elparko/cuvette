# Run: ~/.guided-analysis/envs/pyopenms/bin/python -I check_features_zero_intensity.py
# Uses the same pyOpenMS 3.6.0 classes as the adapter. This is not an independent check.
# It explains why the TOPP tool stores 104 fewer features than the algorithm reports: 104 features have intensity 0.
import collections

import pyopenms as oms

exp = oms.MSExperiment()
oms.MzMLFile().load("/Volumes/T7/guided-analysis/data/rost2016-openms/datasets/2012_02_03_PStd_050_1.mzML", exp)
mtd = oms.MassTraceDetection()
p = mtd.getDefaults()
p.setValue("trace_termination_criterion", "sample_rate")
p.setValue("min_trace_length", 3.0)
p.setValue("max_trace_length", 600.0)
mtd.setParameters(p)
tr = mtd.run(exp, 0)
epd = oms.ElutionPeakDetection()
p = epd.getDefaults()
p.setValue("chrom_fwhm", 8.0)
p.setValue("width_filtering", "off")
epd.setParameters(p)
pk = epd.detectPeaks(tr)
ffm = oms.FeatureFindingMetabo()
p = ffm.getDefaults()
p.setValue("chrom_fwhm", 8.0)
ffm.setParameters(p)
fm = oms.FeatureMap()
ffm.run(pk, fm)
print("traces", len(tr), "peaks", len(pk), "features", fm.size())
print("zero intensity", sum(1 for f in fm if f.getIntensity() == 0))
print("charge", collections.Counter(f.getCharge() for f in fm))
