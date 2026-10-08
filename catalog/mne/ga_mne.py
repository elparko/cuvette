import hashlib
import os
import re
import sys
import warnings

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import mne
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")
mne.set_log_level("ERROR")

UNITS = {"grad": ("fT/cm", 1e13), "mag": ("fT", 1e15), "eeg": ("uV", 1e6), "eog": ("uV", 1e6)}


def _handle(name):
    table = getattr(sys.modules.get("__main__"), "handles", {})
    if name not in table:
        raise KeyError("unknown handle %s. Handles are lost when the worker restarts. Pass the checkpoint path instead." % name)
    return table[name]


def _get(x):
    if isinstance(x, dict) and isinstance(x.get("handle"), str):
        x = _handle(x["handle"])
    if isinstance(x, str):
        named = re.search(r'"handle"\s*:\s*"(h\d+)"', x)
        if named:
            x = named.group(1)
    if isinstance(x, str) and re.fullmatch(r"h\d+", x):
        x = _handle(x)
    if isinstance(x, (mne.io.BaseRaw, mne.BaseEpochs, mne.Evoked, mne.preprocessing.ICA)):
        return x.copy()
    if isinstance(x, str):
        p = os.path.expanduser(x)
        if p.endswith("-epo.fif"):
            return mne.read_epochs(p, preload=True)
        if p.endswith("-ave.fif"):
            return mne.read_evokeds(p, condition=0)
        if p.endswith("-ica.fif"):
            return mne.preprocessing.read_ica(p)
        return mne.io.read_raw_fif(p, preload=True)
    raise TypeError('input must be a handle such as {"handle": "h3"} or the path of a .fif checkpoint')


def _sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def _png(name, fig=None):
    path = os.path.join(os.getcwd(), name + ".png")
    (fig or plt.gcf()).savefig(path, dpi=100, bbox_inches="tight")
    plt.close("all")
    return path


def _table(frame, name):
    path = os.path.join(os.getcwd(), name + ".csv")
    frame.to_csv(path, index=False)
    return path


def _preview(frame, path, limit=20):
    rows = frame.head(limit)
    clean = [[v.item() if hasattr(v, "item") else v for v in r] for r in rows.itertuples(index=False, name=None)]
    return {"columns": [str(c) for c in frame.columns], "rows": clean, "n_rows": int(len(frame)), "path": path}


def _fail(message):
    return {"ok": False, "error": message}


def _num(v):
    return float(v) if isinstance(v, (float, np.floating)) else int(v)


def _result(obj, name, summary, metrics, outputs=(), table=None, data=None, key="inst"):
    path = os.path.join(os.getcwd(), name)
    if isinstance(obj, mne.Evoked):
        mne.write_evokeds(path, obj, overwrite=True)
    else:
        obj.save(path, overwrite=True)
    files = [{"path": path, "kind": "file", "name": name}]
    for p in outputs:
        kind = "image" if p.endswith(".png") else "table" if p.endswith(".csv") else "file"
        files.append({"path": p, "kind": kind, "name": os.path.basename(p)})
    out = {
        "ok": True,
        "summary": summary,
        "metrics": {k: _num(v) for k, v in metrics.items() if v is not None},
        "outputs": files,
        "checkpoint": path,
        "checkpoint_sha256": _sha256(path),
        key: obj,
    }
    if table is not None:
        out["table"] = table
    if data:
        out.update(data)
    return out


def _names(text):
    if text is None:
        return []
    if isinstance(text, (list, tuple)):
        return [str(t).strip() for t in text if str(t).strip()]
    return [t.strip() for t in str(text).split(",") if t.strip() and t.strip().lower() != "none"]


def _event_id(spec):
    if not spec:
        return None
    if isinstance(spec, dict):
        return {str(k): int(v) for k, v in spec.items()}
    out = {}
    for part in str(spec).split(","):
        name, _, num = part.partition("=")
        out[name.strip()] = int(num)
    return out


def _safe(name):
    return re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_")


def _types(info):
    return {
        "grad": len(mne.pick_types(info, meg="grad", exclude=[])),
        "mag": len(mne.pick_types(info, meg="mag", exclude=[])),
        "eeg": len(mne.pick_types(info, eeg=True, exclude=[])),
        "eog": len(mne.pick_types(info, eog=True, exclude=[])),
        "stim": len(mne.pick_types(info, stim=True, meg=False, exclude=[])),
    }


def _state(inst):
    info = inst.info
    return {"kind": type(inst).__name__, "sfreq": float(info["sfreq"]), "highpass": float(info["highpass"]), "lowpass": float(info["lowpass"]),
            "bads": list(info["bads"]), "channel_types": _types(info), "n_projs": len(info["projs"])}


def inspect_data(inst):
    x = _get(inst)
    s = _state(x)
    metrics = {"sfreq": s["sfreq"], "highpass": s["highpass"], "lowpass": s["lowpass"], "n_bads": len(s["bads"]), "n_projs": s["n_projs"]}
    metrics.update({"n_" + k: v for k, v in s["channel_types"].items()})
    if isinstance(x, mne.io.BaseRaw):
        metrics["duration_s"] = float(x.times[-1])
    if isinstance(x, mne.BaseEpochs):
        metrics["n_epochs"] = len(x)
    if isinstance(x, mne.Evoked):
        metrics["nave"] = int(x.nave)
    return {"ok": True, "summary": "%s. Sampling %.2f Hz, band %.2f to %.2f Hz, bad channels: %s." % (s["kind"], s["sfreq"], s["highpass"], s["lowpass"], ", ".join(s["bads"]) or "none"),
            "metrics": metrics, "state": s}


def load_raw(path, preload=True):
    p = os.path.expanduser(path)
    if not os.path.isfile(p):
        return _fail("path not found: %s" % path)
    raw = mne.io.read_raw_fif(p, preload=preload, allow_maxshield="yes")
    s = _state(raw)
    summary = "Loaded %d channels, %.1f s at %.2f Hz. File band %.2f to %.2f Hz. Bad channels in file: %s." % (
        len(raw.ch_names), raw.times[-1], s["sfreq"], s["highpass"], s["lowpass"], ", ".join(s["bads"]) or "none")
    metrics = {"n_channels": len(raw.ch_names), "duration_s": float(raw.times[-1]), "sfreq": s["sfreq"], "highpass": s["highpass"],
               "lowpass": s["lowpass"], "n_bads": len(s["bads"]), "n_projs": s["n_projs"]}
    metrics.update({"n_" + k: v for k, v in s["channel_types"].items()})
    return _result(raw, "loaded_raw.fif", summary, metrics, data={"state": s, "source": p})


def count_events(raw, stim_channel="STI 014", event_id=None, min_duration=0.0):
    r = _get(raw)
    events = mne.find_events(r, stim_channel=stim_channel, min_duration=min_duration, verbose=False)
    ids, counts = np.unique(events[:, 2], return_counts=True)
    names = {v: k for k, v in (_event_id(event_id) or {}).items()}
    frame = pd.DataFrame({"event_id": ids, "name": [names.get(int(i), "") for i in ids], "count": counts})
    csv = _table(frame, "event_counts")
    metrics = {"n_events": len(events), "n_event_ids": len(ids)}
    metrics.update({"count_%d" % i: c for i, c in zip(ids, counts)})
    summary = "%d events on %s: %s." % (len(events), stim_channel, ", ".join("id %d: %d" % (i, c) for i, c in zip(ids, counts)))
    if min_duration:
        all_events = mne.find_events(r, stim_channel=stim_channel, min_duration=0.0, verbose=False)
        metrics["n_events_without_min_duration"] = len(all_events)
        summary = summary.replace(": .", ".") + " Only pulses of at least %g s count. Without that limit there are %d events. Use min_duration 0 to count every pulse." % (min_duration, len(all_events))
    return {"ok": True, "summary": summary, "metrics": {k: _num(v) for k, v in metrics.items()}, "table": _preview(frame, csv),
            "outputs": [{"path": csv, "kind": "table", "name": "event_counts.csv"}]}


def set_bad_channels(raw, bads=None):
    r = _get(raw)
    names = _names(bads)
    missing = [n for n in names if n not in r.ch_names]
    if missing:
        return _fail("channels not found: %s" % ", ".join(missing))
    r.info["bads"] = names
    summary = "Bad channels set to: %s." % (", ".join(names) or "none")
    return _result(r, "bads_raw.fif", summary, {"n_bads": len(names)}, data={"bads": names})


def filter_raw(raw, l_freq=None, h_freq=None, notch_freq=None):
    r = _get(raw)
    if l_freq is not None and h_freq is not None and l_freq >= h_freq:
        return _fail("l_freq must be below h_freq")
    notch = None if notch_freq in (None, "", "none", 0) else float(notch_freq)
    picks = mne.pick_types(r.info, meg=True, eeg=True, eog=True, exclude=[])
    if notch:
        r.notch_filter(notch, picks=picks, verbose=False)
    r.filter(l_freq=l_freq, h_freq=h_freq, picks=picks, verbose=False)
    summary = "Band-pass %s to %s Hz%s. File band after: %.2f to %.2f Hz." % (l_freq, h_freq, ", notch %s Hz" % notch if notch else "", r.info["highpass"], r.info["lowpass"])
    return _result(r, "filtered_raw.fif", summary, {"l_freq": l_freq, "h_freq": h_freq, "notch_freq": notch, "highpass": r.info["highpass"], "lowpass": r.info["lowpass"]})


def set_reference(raw, ref_channels="average", projection=False):
    r = _get(raw)
    if str(ref_channels).lower() in ("none", ""):
        return _result(r, "ref_raw.fif", "EEG reference left as it is.", {"n_ref_channels": 0})
    ref = "average" if str(ref_channels).lower() == "average" else _names(ref_channels)
    if ref != "average":
        missing = [c for c in ref if c not in r.ch_names]
        if missing:
            return _fail("reference channels not found: %s" % ", ".join(missing))
    r.set_eeg_reference(ref, projection=bool(projection), verbose=False)
    label = "the average of all EEG channels" if ref == "average" else ", ".join(ref)
    return _result(r, "ref_raw.fif", "EEG reference set to %s%s." % (label, " as a projection" if projection else ""), {"n_ref_channels": 0 if ref == "average" else len(ref)}, data={"reference": ref})


def run_ica(raw, n_components=15, method="fastica", random_state=97, fit_l_freq=1.0, picks="meg"):
    r = _get(raw)
    fit = r.copy().filter(l_freq=fit_l_freq, h_freq=None, verbose=False) if fit_l_freq else r.copy()
    kind = {"meg": dict(meg=True, eeg=False), "eeg": dict(meg=False, eeg=True), "meg+eeg": dict(meg=True, eeg=True)}[picks]
    idx = mne.pick_types(fit.info, eog=False, stim=False, **kind)
    ica = mne.preprocessing.ICA(n_components=int(n_components), method=method, random_state=int(random_state), max_iter="auto")
    ica.fit(fit, picks=idx)
    suggested = []
    if "EOG 061" in fit.ch_names or len(mne.pick_types(fit.info, eog=True)):
        suggested = [int(i) for i in ica.find_bads_eog(fit, verbose=False)[0]]
    figs = ica.plot_components(show=False)
    fig = figs[0] if isinstance(figs, list) else figs
    plot = _png("ica_components", fig)
    sources = ica.plot_sources(fit, show=False)
    plot2 = _png("ica_sources", sources)
    summary = "Fitted %d %s components on a copy high-passed at %s Hz. Components that correlate with the EOG channel: %s. None is removed yet." % (
        ica.n_components_, method, fit_l_freq, ", ".join(map(str, suggested)) or "none")
    path = os.path.join(os.getcwd(), "fitted-ica.fif")
    ica.save(path, overwrite=True)
    return {"ok": True, "summary": summary, "metrics": {"n_components": int(ica.n_components_), "n_eog_suggested": len(suggested), "random_state": int(random_state)},
            "outputs": [{"path": path, "kind": "file", "name": "fitted-ica.fif"}, {"path": plot, "kind": "image", "name": "ica_components.png"}, {"path": plot2, "kind": "image", "name": "ica_sources.png"}],
            "checkpoint": path, "ica": ica, "eog_suggested": suggested}


def apply_ica(raw, ica, exclude=None):
    r = _get(raw)
    model = _get(ica)
    if isinstance(exclude, (int, float)):
        exclude = [int(exclude)]
    idx = [int(v) for v in _names(exclude)] if not isinstance(exclude, list) else [int(v) for v in exclude]
    bad = [i for i in idx if i >= model.n_components_]
    if bad:
        return _fail("components not found: %s" % bad)
    model.exclude = idx
    model.apply(r, verbose=False)
    return _result(r, "ica_applied_raw.fif", "Removed ICA components: %s." % (", ".join(map(str, idx)) or "none"), {"n_removed": len(idx)}, data={"excluded": idx})


def make_epochs(raw, event_id, tmin=-0.2, tmax=0.5, baseline_start=None, baseline_end=0.0, reject_grad=None, reject_mag=None, reject_eeg=None, reject_eog=None, stim_channel="STI 014"):
    r = _get(raw)
    ids = _event_id(event_id)
    if not ids:
        return _fail("event_id is required, such as {\"auditory/left\": 1}")
    events = mne.find_events(r, stim_channel=stim_channel, verbose=False)
    scale = {"grad": 1e-13, "mag": 1e-15, "eeg": 1e-6, "eog": 1e-6}
    given = {"grad": reject_grad, "mag": reject_mag, "eeg": reject_eeg, "eog": reject_eog}
    reject = {k: v * scale[k] for k, v in given.items() if v}
    reject = {k: v for k, v in reject.items() if k != "eog" or len(mne.pick_types(r.info, eog=True))}
    baseline = None if baseline_end is None and baseline_start is None else (baseline_start, baseline_end)
    ep = mne.Epochs(r, events, ids, tmin, tmax, baseline=baseline, reject=reject or None, preload=True, verbose=False)
    n_matching = int(sum(1 for e in events if int(e[2]) in ids.values()))
    counts = {k: int(len(ep[k])) for k in ids if k in ep.event_id}
    reasons = {}
    for log in ep.drop_log:
        for reason in log:
            if reason not in ("IGNORED",):
                reasons[reason] = reasons.get(reason, 0) + 1
    metrics = {"n_matching_events": n_matching, "n_epochs": len(ep), "n_dropped": n_matching - len(ep), "tmin": tmin, "tmax": tmax}
    metrics.update({"count_" + _safe(k): v for k, v in counts.items()})
    frame = pd.DataFrame({"condition": list(counts), "epochs_kept": list(counts.values())})
    csv = _table(frame, "epoch_counts")
    fig = ep.plot_drop_log(show=False)
    plot = _png("drop_log", fig)
    rej_text = ", ".join("%s %g" % (k, v) for k, v in given.items() if v) or "none"
    summary = "%d of %d matching events kept as epochs (%d dropped). Window %.3f to %.3f s, baseline %s, rejection limits: %s. Dropped by channel: %s." % (
        len(ep), n_matching, n_matching - len(ep), tmin, tmax, "%s to %s" % (ep.baseline[0], ep.baseline[1]) if ep.baseline else "none", rej_text,
        ", ".join("%s %d" % kv for kv in sorted(reasons.items())) or "none")
    return _result(ep, "epochs-epo.fif", summary, metrics, [plot, csv], _preview(frame, csv), {"counts": counts, "drop_reasons": reasons, "reject_si": reject})


def compute_evoked(epochs, condition):
    ep = _get(epochs)
    if condition not in ep.event_id:
        return _fail("condition not in epochs: %s. Conditions: %s" % (condition, ", ".join(ep.event_id)))
    ev = ep[condition].average()
    ev.comment = condition
    return _result(ev, "evoked-ave.fif", "Averaged %d epochs of %s." % (ev.nave, condition), {"nave": int(ev.nave)}, data={"condition": condition})


def measure_peak(evoked, ch_type="grad", tmin=0.08, tmax=0.12, mode="abs"):
    ev = _get(evoked)
    unit, k = UNITS[ch_type]
    sub = ev.copy().pick(ch_type, exclude="bads")
    times = sub.times
    win = (times >= tmin - 1e-9) & (times <= tmax + 1e-9)
    if not win.any():
        return _fail("the window holds no samples")
    gfp = np.sqrt((sub.data ** 2).mean(axis=0))
    gi = int(np.argmax(np.where(win, gfp, -np.inf)))
    ch, lat, amp = sub.get_peak(tmin=tmin, tmax=tmax, mode=mode, return_amplitude=True)
    metrics = {"gfp_latency_s": times[gi], "gfp_amplitude": gfp[gi] * k, "peak_latency_s": lat, "peak_amplitude": amp * k, "n_channels": len(sub.ch_names), "window_start_s": tmin, "window_end_s": tmax}
    summary = "%s peak in %.3f to %.3f s: global field power %.3f s (%.2f %s), strongest channel %s at %.3f s (%.2f %s, mode %s). %d channels, bad channels excluded." % (
        ch_type, tmin, tmax, times[gi], gfp[gi] * k, unit, ch, lat, amp * k, unit, mode, len(sub.ch_names))
    return {"ok": True, "summary": summary, "metrics": {a: _num(b) for a, b in metrics.items()}, "data": {"channel": ch, "unit": unit, "ch_type": ch_type, "mode": mode}}


def plot_evoked(evoked, kind="butterfly", ch_type="grad", times=None):
    ev = _get(evoked)
    sub = ev.copy().pick(ch_type, exclude="bads")
    if kind == "butterfly":
        fig = sub.plot(spatial_colors=True, show=False)
    elif kind == "joint":
        fig = sub.plot_joint(show=False)
    elif kind == "topomap":
        t = [float(v) for v in times] if times else [0.05, 0.1, 0.15, 0.2]
        fig = sub.plot_topomap(times=t, show=False)
    else:
        return _fail("kind must be butterfly, joint or topomap")
    plot = _png("evoked_%s_%s" % (kind, ch_type), fig)
    return {"ok": True, "summary": "Drew the %s plot of %s channels." % (kind, ch_type), "metrics": {"n_channels": len(sub.ch_names)}, "outputs": [{"path": plot, "kind": "image", "name": os.path.basename(plot)}]}


def time_frequency(epochs, condition, fmin=6.0, fmax=35.0, n_freqs=8, n_cycles_divisor=3.0, ch_type="eeg", baseline_mode="logratio", baseline_start=None, baseline_end=0.0):
    ep = _get(epochs)
    if condition not in ep.event_id:
        return _fail("condition not in epochs: %s" % condition)
    freqs = np.logspace(np.log10(fmin), np.log10(fmax), int(n_freqs))
    sub = ep[condition].pick(ch_type, exclude="bads")
    try:
        tfr = sub.compute_tfr("morlet", freqs, n_cycles=freqs / n_cycles_divisor, average=True, return_itc=False, verbose=False)
    except ValueError as e:
        return _fail("%s. Use a larger n_cycles_divisor or longer epochs." % e)
    tfr.apply_baseline((baseline_start if baseline_start is not None else ep.tmin, baseline_end), mode=baseline_mode, verbose=False)
    power = tfr.data.mean(axis=0)
    fi, ti = np.unravel_index(np.argmax(np.abs(power)), power.shape)
    fig, ax = plt.subplots(figsize=(6, 3.5))
    im = ax.imshow(power, aspect="auto", origin="lower", extent=[tfr.times[0], tfr.times[-1], 0, len(freqs) - 1], cmap="RdBu_r", vmin=-np.abs(power).max(), vmax=np.abs(power).max())
    ax.set_yticks(range(len(freqs)))
    ax.set_yticklabels(["%.1f" % f for f in freqs])
    ax.set_xlabel("time (s)")
    ax.set_ylabel("frequency (Hz)")
    ax.set_title("%s, %s channels, baseline %s" % (condition, ch_type, baseline_mode))
    fig.colorbar(im, ax=ax)
    plot = _png("tfr_" + _safe(condition), fig)
    frame = pd.DataFrame(power, index=["%.2f" % f for f in freqs], columns=["%.3f" % t for t in tfr.times][: power.shape[1]]).iloc[:, ::4]
    frame.insert(0, "freq_hz", ["%.2f" % f for f in freqs])
    csv = _table(frame, "tfr_power")
    summary = "Morlet power of %s (%d epochs, %d %s channels), %.1f to %.1f Hz in %d steps, cycles = frequency / %g, baseline mode %s. Largest change %.3f at %.1f Hz, %.3f s." % (
        condition, len(sub), len(sub.ch_names), ch_type, fmin, fmax, n_freqs, n_cycles_divisor, baseline_mode, power[fi, ti], freqs[fi], tfr.times[ti])
    return {"ok": True, "summary": summary,
            "metrics": {"n_epochs": len(sub), "peak_change": float(power[fi, ti]), "peak_freq_hz": float(freqs[fi]), "peak_time_s": float(tfr.times[ti])},
            "outputs": [{"path": plot, "kind": "image", "name": os.path.basename(plot)}, {"path": csv, "kind": "table", "name": "tfr_power.csv"}]}
