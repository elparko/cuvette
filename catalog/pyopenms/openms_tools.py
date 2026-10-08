import os

import numpy as np
import pyopenms as oms

ELECTRON_MASS = 0.00054857990946

_ADDUCTS = {
    "positive": [
        ("[M+H]+", "H", "", 1),
        ("[M+Na]+", "Na", "", 1),
        ("[M+K]+", "K", "", 1),
        ("[M+NH4]+", "NH4", "", 1),
        ("[M+H-H2O]+", "H", "H2O", 1),
    ],
    "negative": [
        ("[M-H]-", "", "H", -1),
        ("[M+Cl]-", "Cl", "", -1),
        ("[M+HCOO]-", "CHO2", "", -1),
        ("[M+CH3COO]-", "C2H3O2", "", -1),
    ],
}

_cache = {}


def _path(path):
    path = os.path.abspath(os.path.expanduser(path))
    if not os.path.isfile(path):
        raise FileNotFoundError(path)
    return path


def _load(path):
    path = _path(path)
    key = (path, os.path.getmtime(path))
    if key not in _cache:
        _cache.clear()
        exp = oms.MSExperiment()
        oms.MzMLFile().load(path, exp)
        exp.sortSpectra(True)
        _cache[key] = exp
    return _cache[key]


def _out(name):
    return os.path.join(os.getcwd(), name)


def _write_csv(path, header, rows):
    with open(path, "w", encoding="utf-8") as f:
        f.write(",".join(header) + "\n")
        for r in rows:
            f.write(",".join(repr(float(v)) if isinstance(v, (float, np.floating)) else str(v) for v in r) + "\n")


def _formula(text):
    try:
        ef = oms.EmpiricalFormula(text.strip())
    except Exception as e:
        raise ValueError("cannot read the formula %r. Write element symbols and counts, such as C6H12O6. (%s)" % (text, e))
    if ef.isEmpty():
        raise ValueError("the formula %r is empty" % text)
    return ef


def _count(counter, name):
    return int(counter.get(name, 0))


def load_mzml(path):
    exp = _load(path)
    n = exp.getNrSpectra()
    levels, kinds, pol = {}, {}, {}
    n_points = 0
    mz_lo, mz_hi = np.inf, -np.inf
    tic = 0.0
    for s in exp:
        levels[s.getMSLevel()] = levels.get(s.getMSLevel(), 0) + 1
        k = str(s.getType()).split(".")[-1].lower()
        kinds[k] = kinds.get(k, 0) + 1
        p = str(s.getInstrumentSettings().getPolarity()).split(".")[-1]
        pol[p] = pol.get(p, 0) + 1
        mz, ints = s.get_peaks()
        n_points += len(mz)
        if len(mz):
            mz_lo, mz_hi = min(mz_lo, float(mz.min())), max(mz_hi, float(mz.max()))
            tic += float(ints.sum())
    rts = [s.getRT() for s in exp]
    path = _path(path)
    metrics = {
        "n_spectra": n,
        "n_ms1": levels.get(1, 0),
        "n_ms2": levels.get(2, 0),
        "n_points": n_points,
        "rt_min_s": float(min(rts)) if rts else 0.0,
        "rt_max_s": float(max(rts)) if rts else 0.0,
        "mz_min": float(mz_lo),
        "mz_max": float(mz_hi),
        "file_bytes": os.path.getsize(path),
    }
    info = {"ms_levels": {str(k): v for k, v in levels.items()}, "spectrum_types": kinds, "polarity": pol}
    rows = [["spectra", n], ["MS1 spectra", metrics["n_ms1"]], ["MS2 spectra", metrics["n_ms2"]], ["spectrum types", str(kinds)], ["polarity", str(pol)], ["RT range (s)", "%.2f to %.2f" % (metrics["rt_min_s"], metrics["rt_max_s"])], ["m/z range", "%.4f to %.4f" % (mz_lo, mz_hi)]]
    out = {
        "ok": True,
        "summary": "%d spectra (%d MS1), %s, RT %.1f to %.1f s, m/z %.2f to %.2f" % (n, metrics["n_ms1"], "/".join(sorted(kinds)), metrics["rt_min_s"], metrics["rt_max_s"], mz_lo, mz_hi),
        "metrics": metrics,
        "data": info,
        "table": {"columns": ["property", "value"], "rows": rows, "n_rows": len(rows)},
    }
    if set(pol) <= {"POLNULL"}:
        out["warning"] = "The file does not state its polarity. Feature finding does not need it. Only an adduct or a database match needs the ion mode."
    return out


def pick_peaks(path, snr=0.0, ms_levels=None, name="centroided"):
    exp = _load(path)
    kinds = {str(s.getType()).split(".")[-1].lower() for s in exp}
    if kinds == {"centroid"}:
        return {"ok": False, "error": "All spectra are already centroided. Peak picking is not needed."}
    picker = oms.PeakPickerHiRes()
    p = picker.getParameters()
    p.setValue("signal_to_noise", float(snr))
    p.setValue("ms_levels", list(ms_levels or [1]))
    picker.setParameters(p)
    out = picker.pickExperiment(exp, True)
    target = _out(name + ".mzML")
    oms.MzMLFile().store(target, out)
    before = sum(s.size() for s in exp)
    after = sum(s.size() for s in out)
    mz, ints = out[0].get_peaks() if out.getNrSpectra() else (np.array([]), np.array([]))
    order = np.argsort(ints)[::-1][:10]
    rows = [[float(mz[i]), float(ints[i])] for i in order]
    return {
        "ok": True,
        "summary": "Peak picking at S/N %g: %d points became %d peaks in %d spectra" % (snr, before, after, out.getNrSpectra()),
        "metrics": {"n_spectra": out.getNrSpectra(), "n_points_before": before, "n_peaks_after": after, "peaks_in_first_spectrum": int(len(mz)), "snr": float(snr)},
        "outputs": [{"path": target, "kind": "file", "name": os.path.basename(target)}],
        "table": {"columns": ["mz", "intensity"], "rows": rows, "n_rows": len(rows)},
        "data": {"first_spectrum_note": "The table lists the 10 strongest peaks of the first spectrum."},
    }


def find_features(
    path,
    mass_error_ppm=20.0,
    noise_threshold_int=10.0,
    chrom_fwhm=5.0,
    min_trace_length=5.0,
    max_trace_length=-1.0,
    trace_termination="outlier",
    width_filtering="fixed",
    name="features",
):
    exp = _load(path)
    if any(str(s.getType()).split(".")[-1].lower() == "profile" for s in exp if s.getMSLevel() == 1):
        return {"ok": False, "error": "The file has profile spectra. Call pick_peaks first and run this tool on the centroided file."}

    mtd = oms.MassTraceDetection()
    p = mtd.getDefaults()
    p.setValue("mass_error_ppm", float(mass_error_ppm))
    p.setValue("noise_threshold_int", float(noise_threshold_int))
    p.setValue("trace_termination_criterion", trace_termination)
    p.setValue("min_trace_length", float(min_trace_length))
    p.setValue("max_trace_length", float(max_trace_length))
    mtd.setParameters(p)
    traces = mtd.run(exp, 0)

    epd = oms.ElutionPeakDetection()
    p = epd.getDefaults()
    p.setValue("chrom_fwhm", float(chrom_fwhm))
    p.setValue("width_filtering", width_filtering)
    epd.setParameters(p)
    peaks = epd.detectPeaks(traces)

    ffm = oms.FeatureFindingMetabo()
    p = ffm.getDefaults()
    p.setValue("chrom_fwhm", float(chrom_fwhm))
    ffm.setParameters(p)
    fmap = oms.FeatureMap()
    ffm.run(peaks, fmap)

    rows = []
    for i in range(fmap.size()):
        f = fmap[i]
        n_tr = f.getMetaValue("num_of_masstraces") if f.metaValueExists("num_of_masstraces") else 0
        rows.append([f.getMZ(), f.getRT(), f.getIntensity(), f.getCharge(), int(n_tr), f.getWidth()])
    rows.sort(key=lambda r: (-round(r[2], 3), r[0]))
    csv = _out(name + ".csv")
    header = ["mz", "rt_s", "intensity", "charge", "n_mass_traces", "width_s"]
    _write_csv(csv, header, rows)
    xml = _out(name + ".featureXML")
    fmap.setUniqueIds()
    oms.FeatureXMLFile().store(xml, fmap)
    n = len(rows)
    metrics = {
        "n_mass_traces": len(traces),
        "n_elution_peaks": len(peaks),
        "n_features": n,
        "n_features_charge_known": sum(1 for r in rows if r[3] != 0),
        "median_intensity": float(np.median([r[2] for r in rows])) if rows else 0.0,
        "mass_error_ppm": float(mass_error_ppm),
        "noise_threshold_int": float(noise_threshold_int),
        "chrom_fwhm": float(chrom_fwhm),
    }
    return {
        "ok": True,
        "summary": "%d mass traces, %d elution peaks, %d features (mass error %g ppm, noise threshold %g, chromatographic FWHM %g s)" % (len(traces), len(peaks), n, mass_error_ppm, noise_threshold_int, chrom_fwhm),
        "metrics": metrics,
        "outputs": [{"path": csv, "kind": "table", "name": os.path.basename(csv)}, {"path": xml, "kind": "file", "name": os.path.basename(xml)}],
        "table": {"columns": header, "rows": [list(map(float, r)) for r in rows[:10]], "n_rows": n, "path": csv},
        "data": {"table_note": "The table preview lists the 10 strongest features. The CSV file lists all."},
    }


def monoisotopic_mass(formula, polarity=None, measured_mz=None):
    if polarity is None:
        raise ValueError("polarity is not set. The decision polarity sets it.")
    if polarity not in _ADDUCTS:
        raise ValueError("polarity must be positive or negative")
    ef = _formula(formula)
    mass = ef.getMonoWeight()
    rows = []
    for label, add, lose, z in _ADDUCTS[polarity]:
        delta = 0.0
        if add:
            delta += oms.EmpiricalFormula(add).getMonoWeight()
        if lose:
            delta -= oms.EmpiricalFormula(lose).getMonoWeight()
        mz = mass + delta - z * ELECTRON_MASS
        row = [label, mz]
        if measured_mz:
            row.append((float(measured_mz) - mz) / mz * 1e6)
        rows.append(row)
    cols = ["adduct", "mz"] + (["ppm_error"] if measured_mz else [])
    main = rows[0]
    metrics = {"monoisotopic_mass": mass, "mz_main_adduct": main[1], "average_mass": ef.getAverageWeight()}
    if measured_mz:
        best = min(rows, key=lambda r: abs(r[2]))
        metrics["measured_mz"] = float(measured_mz)
        metrics["ppm_error_main_adduct"] = main[2]
        metrics["ppm_error_best_adduct"] = best[2]
    summary = "%s: monoisotopic mass %.5f, %s m/z %.5f" % (ef.toString(), mass, main[0], main[1])
    if measured_mz:
        summary += ", measured %.5f is %.2f ppm from %s" % (float(measured_mz), main[2], main[0])
    return {
        "ok": True,
        "summary": summary,
        "metrics": metrics,
        "data": {"formula": ef.toString(), "polarity": polarity, "main_adduct": main[0], "adduct_masses": "monoisotopic element masses; the electron mass %.8f is subtracted for each positive charge and added for each negative charge" % ELECTRON_MASS},
        "table": {"columns": cols, "rows": rows, "n_rows": len(rows)},
    }


def isotope_pattern(formula, n_peaks=4):
    ef = _formula(formula)
    iso = oms.CoarseIsotopePatternGenerator(int(n_peaks)).run(ef)
    peaks = [(p.getMZ(), p.getIntensity()) for p in iso.getContainer()]
    base = peaks[0][1]
    rows = [["M+%d" % i if i else "M", m, a, a / base] for i, (m, a) in enumerate(peaks)]
    metrics = {"n_peaks": len(rows), "monoisotopic_mass": peaks[0][0], "m1_over_m0": rows[1][3] if len(rows) > 1 else 0.0, "m2_over_m0": rows[2][3] if len(rows) > 2 else 0.0}
    return {
        "ok": True,
        "summary": "%s: M+1 is %.1f%% and M+2 is %.1f%% of M" % (ef.toString(), 100 * metrics["m1_over_m0"], 100 * metrics["m2_over_m0"]),
        "metrics": metrics,
        "data": {"note": "Neutral molecule, coarse pattern: one peak for each nominal mass. Add the adduct mass to get the m/z."},
        "table": {"columns": ["peak", "mass", "abundance", "relative_to_M"], "rows": rows, "n_rows": len(rows)},
    }
