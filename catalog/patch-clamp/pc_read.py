import os
import warnings

import numpy as np

warnings.filterwarnings("ignore")

CURRENT_UNITS = {"pa": 1.0, "na": 1e3, "ua": 1e6, "a": 1e12}
VOLTAGE_UNITS = {"mv": 1.0, "v": 1e3, "uv": 1e-3}


class Recording:
    def __init__(self, path, fmt, sweeps, rate, mode, unit, command_unit, labels=None, notes=None):
        self.path = path
        self.fmt = fmt
        self.sweeps = sweeps
        self.rate = rate
        self.mode = mode
        self.unit = unit
        self.command_unit = command_unit
        self.labels = labels or [""] * len(sweeps)
        self.notes = notes or []


def _unit_key(text):
    return str(text).strip().lower().replace("µ", "u").replace("μ", "u")


def _scale(unit):
    key = _unit_key(unit)
    if key in VOLTAGE_UNITS:
        return "current_clamp", VOLTAGE_UNITS[key], "mV"
    if key in CURRENT_UNITS:
        return "voltage_clamp", CURRENT_UNITS[key], "pA"
    return None, None, None


def _cmd_scale(unit, mode):
    key = _unit_key(unit)
    if mode == "current_clamp" and key in CURRENT_UNITS:
        return CURRENT_UNITS[key], "pA"
    if mode == "voltage_clamp" and key in VOLTAGE_UNITS:
        return VOLTAGE_UNITS[key], "mV"
    return 1.0, str(unit)


def _read_abf(path, channel):
    import pyabf

    abf = pyabf.ABF(path)
    if channel < 0 or channel >= abf.channelCount:
        raise ValueError("channel %d does not exist in %s. The file has %d channel(s): %s." % (
            channel, os.path.basename(path), abf.channelCount, ", ".join("%d = %s (%s)" % (i, abf.adcNames[i], abf.adcUnits[i]) for i in range(abf.channelCount))))
    mode, k, unit = _scale(abf.adcUnits[channel])
    if mode is None:
        raise ValueError("channel %d of %s has the unit %r. The adapter reads mV (current clamp) and pA or nA (voltage clamp)." % (channel, os.path.basename(path), abf.adcUnits[channel]))
    ck, cunit = _cmd_scale(abf.dacUnits[channel] if channel < len(abf.dacUnits) else abf.dacUnits[0], mode)
    sweeps = []
    for s in range(abf.sweepCount):
        abf.setSweep(s, channel=channel)
        t = np.asarray(abf.sweepX, dtype=float)
        y = np.asarray(abf.sweepY, dtype=float) * k
        try:
            c = np.asarray(abf.sweepC, dtype=float) * ck
        except Exception:
            c = None
        sweeps.append({"t": t, "y": y, "cmd": c})
    notes = []
    if abf.tagComments:
        notes.append("%d comment(s): %s" % (len(abf.tagComments), "; ".join(str(x) for x in abf.tagComments[:5])))
    return Recording(path, "abf %s" % abf.abfVersionString, sweeps, float(abf.dataRate), mode, unit, cunit, notes=notes)


def _read_allen_nwb(path):
    import h5py

    f = h5py.File(path, "r")
    if "acquisition/timeseries" not in f:
        f.close()
        return None
    acq = f["acquisition/timeseries"]
    stim = f["stimulus/presentation"] if "stimulus/presentation" in f else None
    names = sorted(acq.keys(), key=lambda n: int(n.split("_")[-1]) if n.split("_")[-1].isdigit() else 0)
    sweeps, labels = [], []
    mode, unit, cunit = None, None, None
    rate = None
    for n in names:
        g = acq[n]
        if "data" not in g:
            continue
        u = g["data"].attrs.get("unit", b"")
        u = u.decode() if isinstance(u, bytes) else str(u)
        m, k, un = _scale(u.replace("Volts", "V").replace("Amps", "A"))
        if m is None:
            continue
        mode = mode or m
        if m != mode:
            continue
        y = np.asarray(g["data"][()], dtype=float) * k
        rate = float(g["starting_time"].attrs["rate"])
        t = np.arange(len(y)) / rate
        c = None
        if stim is not None and n in stim and "data" in stim[n]:
            su = stim[n]["data"].attrs.get("unit", b"")
            su = su.decode() if isinstance(su, bytes) else str(su)
            ck, cu = _cmd_scale(su.replace("Volts", "V").replace("Amps", "A"), mode)
            c = np.asarray(stim[n]["data"][()], dtype=float) * ck
            cunit = cu
        name = g["aibs_stimulus_name"][()] if "aibs_stimulus_name" in g else b""
        name = name.decode() if isinstance(name, bytes) else str(name)
        valid = np.isfinite(y)
        if not valid.any():
            continue
        last = int(np.flatnonzero(valid)[-1]) + 1
        sweeps.append({"t": t[:last], "y": y[:last], "cmd": None if c is None else c[:last]})
        labels.append("%s %s" % (n, name))
        unit = un
    f.close()
    if not sweeps:
        return None
    return Recording(path, "nwb 1.0 (Allen)", sweeps, rate, mode, unit, cunit, labels=labels)


def _read_neo(path, channel, signal_unit=None):
    import neo

    io = neo.io.get_io(path)
    block = io.read_block(lazy=False)
    sweeps = []
    mode, unit, cunit = None, None, None
    rate = None
    for sig in (s for seg in block.segments for s in seg.analogsignals):
        if channel >= sig.shape[1]:
            raise ValueError("channel %d does not exist in %s. The signal has %d channel(s)." % (channel, os.path.basename(path), sig.shape[1]))
        raw_unit = str(sig.units.dimensionality)
        m, k, un = _scale(signal_unit if signal_unit else raw_unit)
        if m is None:
            raise ValueError("The unit %r of %s is not mV, V, pA, nA or A. Set signal_unit to the unit of the recorded signal, such as pA." % (raw_unit, os.path.basename(path)))
        mode, unit = m, un
        y = np.asarray(sig.magnitude[:, channel], dtype=float) * k
        rate = float(sig.sampling_rate.rescale("Hz").magnitude)
        sweeps.append({"t": np.arange(len(y)) / rate, "y": y, "cmd": None})
    if not sweeps:
        raise ValueError("Neo found no analog signal in %s." % os.path.basename(path))
    return Recording(path, "neo %s" % type(io).__name__, sweeps, rate, mode, unit, "", notes=["Neo files carry no command waveform. Give stim_window."])


MISSING_TEXT = {"", "na", "n/a", "#n/a", "<na>", "null", "nan", "-", "—", "?", "."}


def read_labels_csv(path, **kw):
    import numpy as np
    import pandas as pd

    frame = pd.read_csv(path, **kw)
    raw = pd.read_csv(path, dtype=str, keep_default_na=False, **kw)
    for column in frame.columns:
        if pd.api.types.is_object_dtype(frame[column]) or pd.api.types.is_string_dtype(frame[column]):
            frame[column] = raw[column].where(~raw[column].astype(str).str.strip().str.lower().isin(MISSING_TEXT), np.nan)
    return frame


def _read_text_table(path, signal_unit):
    import pandas as pd

    sep = "\t" if path.lower().endswith((".txt", ".tsv")) else ","
    d = pd.read_csv(path, sep=sep)
    if d.shape[1] < 2:
        raise ValueError("%s has %d column(s) with the separator %r. A text file needs a time column in seconds and one column for each sweep." % (os.path.basename(path), d.shape[1], sep))
    if not signal_unit:
        raise ValueError("signal_unit is missing. A text file has no unit. Set signal_unit to mV, V, pA or nA.")
    mode, k, unit = _scale(signal_unit)
    if mode is None:
        raise ValueError("signal_unit %r is not mV, V, pA, nA or A." % signal_unit)
    t = d.iloc[:, 0].to_numpy(float)
    step = np.diff(t)
    if len(t) < 10 or step.min() <= 0 or abs(step.max() - step.min()) > 0.01 * step.mean():
        raise ValueError("The first column of %s must be a time in seconds with a constant step. It has %d rows." % (os.path.basename(path), len(t)))
    sweeps = [{"t": t - t[0], "y": d.iloc[:, j].to_numpy(float) * k, "cmd": None} for j in range(1, d.shape[1])]
    return Recording(path, "text table", sweeps, float(1.0 / step.mean()), mode, unit, "", notes=["A text file carries no command waveform. Give stim_window where a tool needs it."])


def load_recording(path, channel=0, signal_unit=None):
    path = os.path.expanduser(str(path))
    if not os.path.exists(path):
        raise FileNotFoundError("File not found: %s." % path)
    ext = os.path.splitext(path)[1].lower()
    if ext == ".abf":
        return _read_abf(path, int(channel))
    if ext in (".csv", ".tsv", ".txt"):
        return _read_text_table(path, signal_unit)
    if ext == ".nwb":
        rec = _read_allen_nwb(path)
        if rec is not None:
            return rec
    return _read_neo(path, int(channel), signal_unit)


def parse_sweeps(spec, n):
    if spec is None:
        raise ValueError("sweeps is missing. It is a decision: write all, or a list such as 1-8,10 (1 is the first sweep).")
    if isinstance(spec, (list, tuple)):
        spec = ",".join(str(x) for x in spec)
    text = str(spec).strip().lower()
    if text in ("all", "*"):
        return list(range(n))
    out = []
    for part in text.replace(" ", "").split(","):
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            out.extend(range(int(a) - 1, int(b)))
        else:
            out.append(int(part) - 1)
    bad = [i + 1 for i in out if i < 0 or i >= n]
    if bad:
        raise ValueError("sweeps %s is outside the file. The file has %d sweeps (1 to %d)." % (bad, n, n))
    return sorted(set(out))


def parse_window(spec, name):
    if spec is None:
        return None
    if isinstance(spec, str):
        spec = [x for x in spec.replace(";", ",").split(",") if x.strip()]
    w = [float(x) for x in spec]
    if len(w) != 2 or w[0] >= w[1]:
        raise ValueError("%s must be two times in seconds, the start and the end, with start below end. It is %r." % (name, spec))
    return w


def idx(t, x):
    i = int(np.clip(np.searchsorted(t, x), 0, len(t) - 1))
    if i > 0 and abs(t[i - 1] - x) <= abs(t[i] - x):
        i -= 1
    return i


def step_window(rec, sweep_ids):
    spans, amps = [], []
    for i in sweep_ids:
        s = rec.sweeps[i]
        c = s["cmd"]
        if c is None:
            return None
        n0 = max(int(0.005 * rec.rate), 5)
        d = c - np.median(c[:n0])
        amps.append(float(np.max(np.abs(d))))
        spans.append(d)
    top = max(amps) if amps else 0.0
    if top <= 0:
        return None
    best = spans[int(np.argmax(amps))]
    mask = np.abs(best) > 0.5 * top
    edges = np.diff(np.concatenate([[0], mask.astype(int), [0]]))
    starts, ends = np.flatnonzero(edges == 1), np.flatnonzero(edges == -1)
    if len(starts) == 0:
        return None
    k = int(np.argmax(ends - starts))
    t = rec.sweeps[sweep_ids[int(np.argmax(amps))]]["t"]
    return [float(t[starts[k]]), float(t[min(ends[k], len(t) - 1)])]


def step_amplitude(rec, i, window):
    s = rec.sweeps[i]
    c = s["cmd"]
    if c is None:
        return float("nan")
    a, b = idx(s["t"], window[0]), idx(s["t"], window[1])
    n0 = max(int(0.005 * rec.rate), 5)
    base = np.median(c[:n0])
    mid = a + (b - a) // 2
    return round(float(np.median(c[max(mid - 5, a):mid + 5]) - base), 2)
