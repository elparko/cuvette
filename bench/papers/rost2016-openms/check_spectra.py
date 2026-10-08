# Run: python3 -I check_spectra.py /Volumes/T7/guided-analysis/data/rost2016-openms/datasets/2012_02_03_PStd_050_1.mzML
# Counts spectra and MS levels with the standard library XML parser. No OpenMS code.
import sys
import xml.etree.ElementTree as ET

MZ = "{http://psi.hupo.org/ms/mzml}"
n, levels, declared = 0, {}, None
for ev, el in ET.iterparse(sys.argv[1], events=("start", "end")):
    if ev == "start" and el.tag == MZ + "spectrumList":
        declared = el.get("count")
    if ev == "end" and el.tag == MZ + "spectrum":
        n += 1
        for p in el.iter(MZ + "cvParam"):
            if p.get("accession") == "MS:1000511":
                levels[p.get("value")] = levels.get(p.get("value"), 0) + 1
        el.clear()
print("spectrumList count attribute", declared)
print("spectra", n)
print("ms levels", levels)
