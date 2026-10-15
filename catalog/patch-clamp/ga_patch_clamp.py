import functools
import os
import warnings

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy import optimize, signal, stats

import pc_read as R
import pc_spikes as S

warnings.filterwarnings("ignore")

METHODS = ("dvdt_cutoff", "dvdt_fraction_of_upstroke")
BLUE, ORANGE, RED, GRAY = "#0072B2", "#E69F00", "#D55E00", "#777777"


def _fail(message):
    return {"ok": False, "error": message}


def guarded(fn):
    @functools.wraps(fn)
    def run(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except (ValueError, FileNotFoundError) as e:
            return _fail("%s: %s" % (fn.__name__, e))
        except Exception as e:
            return _fail("%s stopped with %s: %s. Check path and the argument values." % (fn.__name__, type(e).__name__, e))

    return run


def _style():
    plt.rcParams.update({
        "font.size": 9, "font.family": "sans-serif", "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans"],
        "axes.spines.top": False, "axes.spines.right": False, "svg.fonttype": "none",
    })


def _save(fig, stem):
    png = os.path.join(os.getcwd(), stem + ".png")
    svg = os.path.join(os.getcwd(), stem + ".svg")
    fig.savefig(png, dpi=200, bbox_inches="tight")
    fig.savefig(svg, bbox_inches="tight")
    plt.close(fig)
    return [{"path": png, "kind": "image", "name": os.path.basename(png)}, {"path": svg, "kind": "file", "name": os.path.basename(svg)}]


def _clean(v):
    if isinstance(v, (float, np.floating)):
        return None if not np.isfinite(v) else float(v)
    if isinstance(v, np.integer):
        return int(v)
    if isinstance(v, np.bool_):
        return bool(v)
    return v


def _table(frame, name, limit=30):
    path = os.path.join(os.getcwd(), name + ".csv")
    frame.to_csv(path, index=False)
    rows = [[_clean(v) for v in r] for r in frame.head(limit).itertuples(index=False, name=None)]
    return {"columns": [str(c) for c in frame.columns], "rows": rows, "n_rows": int(len(frame)), "path": path}


def _metrics(d):
    return {k: _clean(v) for k, v in d.items()}


def _need_ljp(ljp_mv):
    if ljp_mv is None:
        raise ValueError("ljp_mv is missing. It is a decision: the liquid junction potential in mV. The tool subtracts it from every voltage. Write 0 if you do not correct.")
    return float(ljp_mv)


def _need_window(spec, name, what):
    if spec is None:
        raise ValueError("%s is missing: %s Give two times in seconds, such as 0.1,0.9." % (name, what))
    return R.parse_window(spec, name)


def _open(path, channel, sweeps, sweep_label, expect=None, signal_unit=None):
    rec = R.load_recording(path, channel, signal_unit)
    if expect and rec.mode != expect:
        other = "measure_spikes and measure_passive" if rec.mode == "current_clamp" else "measure_current_steps and detect_events"
        raise ValueError("%s is a %s recording (unit %s). This tool needs %s. Use %s for this file." % (
            os.path.basename(path), rec.mode.replace("_", " "), rec.unit, expect.replace("_", " "), other))
    ids = R.parse_sweeps(sweeps, len(rec.sweeps))
    if sweep_label:
        ids = [i for i in ids if str(sweep_label).lower() in rec.labels[i].lower()]
        if not ids:
            raise ValueError("No sweep label contains %r. The labels are: %s." % (sweep_label, ", ".join(sorted(set(l.split(" ", 2)[-1] for l in rec.labels))[:8])))
    return rec, ids


def _stim(rec, ids, stim_window):
    if stim_window is not None:
        return R.parse_window(stim_window, "stim_window")
    w = R.step_window(rec, ids)
    if w is None:
        raise ValueError("The file has no command waveform with a step, so stim_window cannot come from it. Give stim_window as two times in seconds, such as 0.25,0.75.")
    return w


def _in_range(rec, ids, win, current_range_pa):
    if current_range_pa is None:
        return ids
    lo, hi = R.parse_window(current_range_pa, "current_range_pa")
    keep = [i for i in ids if lo < R.step_amplitude(rec, i, win) < hi]
    if not keep:
        raise ValueError("No included sweep has a step between %g and %g pA. The steps run from %g to %g pA." % (
            lo, hi, min(R.step_amplitude(rec, i, win) for i in ids), max(R.step_amplitude(rec, i, win) for i in ids)))
    return keep


def _need_cmd(rec, ids):
    missing = [i + 1 for i in ids if rec.sweeps[i]["cmd"] is None]
    if missing:
        raise ValueError("Sweep(s) %s have no command waveform, so the step current is not known. Use a file that records the command (an ABF or NWB file with the stimulus), not a text or Neo export of the voltage only." % ", ".join(map(str, missing[:10])))


def _cell(path, cell_id):
    return str(cell_id) if cell_id else os.path.splitext(os.path.basename(path))[0]


@guarded
def inspect_recording(path, channel=0, signal_unit=None):
    rec = R.load_recording(path, channel, signal_unit)
    n = len(rec.sweeps)
    ids = list(range(n))
    win = None
    try:
        win = R.step_window(rec, ids)
    except Exception:
        win = None
    amps = [R.step_amplitude(rec, i, win) if win else float("nan") for i in ids]
    dur = float(rec.sweeps[0]["t"][-1]) if n else 0.0
    rows = []
    for i in ids:
        s = rec.sweeps[i]
        n0 = max(int(0.05 * rec.rate), 5)
        rows.append({"sweep": i + 1, "label": rec.labels[i], "duration_s": float(s["t"][-1]), "baseline_mean": float(np.mean(s["y"][:n0])),
                     "step": amps[i], "min": float(np.min(s["y"])), "max": float(np.max(s["y"]))})
    frame = pd.DataFrame(rows).rename(columns={"step": "step_" + rec.command_unit.lower() if rec.command_unit else "step",
                                               "baseline_mean": "baseline_mean_" + rec.unit.lower(), "min": "min_" + rec.unit.lower(), "max": "max_" + rec.unit.lower()})
    _style()
    fig, axes = plt.subplots(2 if rec.sweeps[0]["cmd"] is not None else 1, 1, figsize=(6.5, 4.4 if rec.sweeps[0]["cmd"] is not None else 2.8), sharex=True, squeeze=False)
    cmap = plt.get_cmap("viridis")
    show = ids if n <= 40 else ids[:: int(np.ceil(n / 40))]
    for k, i in enumerate(show):
        axes[0][0].plot(rec.sweeps[i]["t"], rec.sweeps[i]["y"], lw=0.5, color=cmap(k / max(len(show) - 1, 1)))
        if rec.sweeps[0]["cmd"] is not None:
            axes[1][0].plot(rec.sweeps[i]["t"], rec.sweeps[i]["cmd"], lw=0.5, color=cmap(k / max(len(show) - 1, 1)))
    axes[0][0].set_ylabel("Recorded signal (%s)" % rec.unit)
    if rec.sweeps[0]["cmd"] is not None:
        axes[1][0].set_ylabel("Command (%s)" % rec.command_unit)
    axes[-1][0].set_xlabel("Time (s)")
    axes[0][0].set_title("%s: %d sweeps, %s" % (os.path.basename(path), n, rec.mode.replace("_", " ")), fontsize=9)
    metrics = {"n_sweeps": n, "sampling_rate_hz": rec.rate, "sweep_duration_s": dur, "step_start_s": win[0] if win else None, "step_end_s": win[1] if win else None,
               "step_min": float(np.nanmin(amps)) if win else None, "step_max": float(np.nanmax(amps)) if win else None}
    nxt = "measure_spikes, then measure_passive" if rec.mode == "current_clamp" else "measure_current_steps for steps, or detect_events for spontaneous events"
    summary = "%s: %s file, %d sweep(s), %.0f Hz, %.3f s long. The recorded signal is in %s (%s)." % (os.path.basename(path), rec.fmt, n, rec.rate, dur, rec.unit, rec.mode.replace("_", " "))
    if win:
        summary += " The command steps from %.4g s to %.4g s, from %.4g to %.4g %s." % (win[0], win[1], metrics["step_min"], metrics["step_max"], rec.command_unit)
    else:
        summary += " No step in the command was found."
    summary += " Next: " + nxt + "."
    if rec.notes:
        summary += " " + " ".join(rec.notes)
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics), "data": {"mode": rec.mode, "format": rec.fmt, "unit": rec.unit, "command_unit": rec.command_unit},
            "table": _table(frame, "sweeps"), "outputs": _save(fig, "recording")}


def _efel_train(v, rate, win, cutoff, min_peak):
    import efel

    efel.reset()
    efel.set_setting("DerivativeThreshold", float(cutoff))
    efel.set_setting("Threshold", float(min_peak))
    t = np.arange(len(v)) / rate * 1e3
    trace = {"T": t, "V": v, "stim_start": [win[0] * 1e3], "stim_end": [win[1] * 1e3]}
    names = ["Spikecount", "ISI_CV", "adaptation_index", "time_to_first_spike", "AP_begin_voltage", "AP_duration_half_width"]
    out = efel.get_feature_values([trace], names, raise_warnings=False)[0]
    def first(k):
        x = out.get(k)
        return float(x[0]) if x is not None and len(x) else float("nan")
    return {"n_spikes_efel": first("Spikecount"), "isi_cv": first("ISI_CV"), "adaptation_index": first("adaptation_index"),
            "latency_ms": first("time_to_first_spike"), "efel_threshold_mv": first("AP_begin_voltage"), "efel_half_width_ms": first("AP_duration_half_width")}


@guarded
def measure_spikes(path, spike_threshold_method=None, dvdt_cutoff_mv_per_ms=None, min_peak_mv=None, sweeps=None, ljp_mv=None,
                   channel=0, sweep_label=None, stim_window=None, cell_id=None, signal_unit=None):
    if spike_threshold_method not in METHODS:
        raise ValueError("spike_threshold_method is missing or not known. It is a decision. Use one of: %s." % ", ".join(METHODS))
    if dvdt_cutoff_mv_per_ms is None:
        raise ValueError("dvdt_cutoff_mv_per_ms is missing. It is a decision: the dV/dt in mV per ms that marks the start of a spike.")
    if min_peak_mv is None:
        raise ValueError("min_peak_mv is missing. It is a decision: the lowest peak voltage in mV that counts as a spike.")
    ljp = _need_ljp(ljp_mv)
    rec, ids = _open(path, channel, sweeps, sweep_label, "current_clamp", signal_unit)
    win = _stim(rec, ids, stim_window)
    _need_cmd(rec, ids)
    cutoff, minpk = float(dvdt_cutoff_mv_per_ms), float(min_peak_mv)
    rows, spikes = [], []
    for i in ids:
        s = rec.sweeps[i]
        v = s["y"] - ljp
        amp = R.step_amplitude(rec, i, win)
        sp = S.detect(v, rec.rate, 0.0, cutoff, minpk, spike_threshold_method, window=win)
        for k, f in enumerate(sp):
            spikes.append({"sweep": i + 1, "current_pa": amp, "spike": k + 1, **{a: b for a, b in f.items() if a not in ("threshold_index", "peak_index")}})
        dur = win[1] - win[0]
        row = {"sweep": i + 1, "label": rec.labels[i], "current_pa": amp, "n_spikes": len(sp), "rate_hz": len(sp) / dur}
        if len(sp) and amp > 0:
            row.update(_efel_train(v, rec.rate, win, cutoff, minpk))
        rows.append(row)
    frame = pd.DataFrame(rows).sort_values(["current_pa", "sweep"]).reset_index(drop=True)
    sp_frame = pd.DataFrame(spikes)
    spiking = frame[(frame["n_spikes"] > 0)]
    depol = spiking[spiking["current_pa"] > 0]
    metrics = {"n_sweeps": len(frame), "n_sweeps_with_spikes": len(spiking), "stim_start_s": win[0], "stim_end_s": win[1], "ljp_mv": ljp}
    cell = {"cell": _cell(path, cell_id)}
    if depol.empty:
        summary = "No spike in %d sweep(s) with dV/dt >= %g mV/ms and a peak of %g mV or higher. The largest step is %g pA. Lower dvdt_cutoff_mv_per_ms or min_peak_mv, or include sweeps with larger steps." % (
            len(frame), cutoff, minpk, float(frame["current_pa"].max()))
        return {"ok": True, "summary": summary, "metrics": _metrics(metrics), "data": {"threshold_method": spike_threshold_method}, "table": _table(frame, "sweeps")}
    first = depol.iloc[0]
    rheo = float(first["current_pa"])
    rheo_sweep = int(first["sweep"])
    f1 = sp_frame[(sp_frame["sweep"] == rheo_sweep) & (sp_frame["spike"] == 1)].iloc[0]
    x, y = spiking["current_pa"].to_numpy(float), spiking["rate_hz"].to_numpy(float)
    slope = float(np.linalg.lstsq(np.vstack([x, np.ones_like(x)]).T, y, rcond=None)[0][0]) if len(x) >= 2 else float("nan")
    below = frame.loc[(frame["current_pa"] > 0) & (frame["current_pa"] < rheo), "current_pa"]
    resolution = float(rheo - below.max()) if len(below) else float("nan")
    top = depol.sort_values("rate_hz").iloc[-1]
    spont = spiking[spiking["current_pa"] <= 0]
    metrics.update({"rheobase_pa": rheo, "rheobase_resolution_pa": resolution, "rheobase_sweep": rheo_sweep, "threshold_mv": f1["threshold_mv"], "peak_mv": f1["peak_mv"],
                    "amplitude_mv": f1["amplitude_mv"], "half_width_ms": f1["half_width_ms"], "ahp_mv": f1["ahp_mv"], "trough_mv": f1["trough_mv"],
                    "upstroke_downstroke_ratio": f1["upstroke_downstroke_ratio"], "max_upstroke_mv_per_ms": f1["upstroke_mv_per_ms"],
                    "fi_slope_hz_per_pa": slope, "max_rate_hz": float(top["rate_hz"]), "max_rate_current_pa": float(top["current_pa"]),
                    "adaptation_index_at_max_rate": top.get("adaptation_index"), "efel_threshold_mv": first.get("efel_threshold_mv"),
                    "efel_half_width_ms": first.get("efel_half_width_ms")})
    cell.update({k: metrics[k] for k in ("rheobase_pa", "threshold_mv", "amplitude_mv", "half_width_ms", "ahp_mv", "upstroke_downstroke_ratio", "fi_slope_hz_per_pa", "max_rate_hz")})
    _style()
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(8, 3.1), gridspec_kw={"width_ratios": [1.6, 1]})
    for sid, col, lab in [(rheo_sweep, BLUE, "rheobase %g pA" % rheo), (int(top["sweep"]), ORANGE, "%g pA" % float(top["current_pa"]))]:
        s = rec.sweeps[sid - 1]
        a1.plot(s["t"], s["y"] - ljp, lw=0.6, color=col, label=lab)
    a1.plot(f1["time_s"], f1["threshold_mv"], "o", color=RED, ms=4, label="threshold")
    a1.set_xlim(win[0] - 0.1, win[1] + 0.1)
    a1.set_xlabel("Time (s)")
    a1.set_ylabel("Vm (mV)")
    a1.legend(fontsize=7, frameon=False)
    a2.plot(frame["current_pa"], frame["rate_hz"], "o-", color=BLUE, ms=3, lw=0.8)
    if np.isfinite(slope):
        xs = np.array([x.min(), x.max()])
        a2.plot(xs, np.polyval(np.polyfit(x, y, 1), xs), "--", color=RED, lw=0.8)
    a2.set_xlabel("Step current (pA)")
    a2.set_ylabel("Spike rate (Hz)")
    meth = "dV/dt >= %g mV/ms" % cutoff if spike_threshold_method == "dvdt_cutoff" else "5%% of the mean upstroke after dV/dt >= %g mV/ms" % cutoff
    summary = ("%s: %d sweep(s), step %.3f to %.3f s. Rheobase %.4g pA (%s). First spike at rheobase: threshold %.2f mV (%s), peak %.2f mV, amplitude %.2f mV, "
               "half-width %.3f ms, fast trough %.2f mV, AHP depth %.2f mV below threshold, upstroke to downstroke ratio %.3f. "
               "F-I slope %.4g Hz per pA over %d sweep(s) with spikes. Highest rate %.4g Hz at %g pA. Voltages are corrected by %g mV (LJP)." % (
                   os.path.basename(path), len(frame), win[0], win[1], rheo, ("the next lower step is %.4g pA lower" % resolution) if np.isfinite(resolution) else "no lower positive step", f1["threshold_mv"], meth, f1["peak_mv"], f1["amplitude_mv"], f1["half_width_ms"],
                   f1["trough_mv"], f1["ahp_mv"], f1["upstroke_downstroke_ratio"], slope, len(spiking), float(top["rate_hz"]), float(top["current_pa"]), ljp))
    if len(spont):
        summary += " Warning: %d sweep(s) with a step of 0 pA or less have spikes. The cell fires without a depolarizing step, so the rheobase is not a threshold current." % len(spont)
        metrics["n_spiking_sweeps_without_step"] = len(spont)
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics), "data": {"threshold_method": spike_threshold_method, "dvdt_cutoff_mv_per_ms": cutoff, "min_peak_mv": minpk},
            "table": _table(frame, "sweeps"), "tables": {"spikes": _table(sp_frame, "spikes"), "cell_features": _table(pd.DataFrame([cell]), "cell_features")}, "outputs": _save(fig, "spikes")}


@guarded
def measure_passive(path, baseline_window=None, input_resistance_measure=None, sweeps=None, ljp_mv=None, channel=0, sweep_label=None,
                    stim_window=None, current_range_pa=None, cell_id=None, signal_unit=None):
    bw = _need_window(baseline_window, "baseline_window", "the time window before the step that gives the resting potential.")
    if input_resistance_measure not in ("steady_state", "peak"):
        raise ValueError("input_resistance_measure is missing or not known. It is a decision. Use steady_state or peak.")
    ljp = _need_ljp(ljp_mv)
    rec, ids = _open(path, channel, sweeps, sweep_label, "current_clamp", signal_unit)
    win = _stim(rec, ids, stim_window)
    _need_cmd(rec, ids)
    ids = _in_range(rec, ids, win, current_range_pa)
    neg = [i for i in ids if R.step_amplitude(rec, i, win) >= 0]
    if neg:
        raise ValueError("Sweep(s) %s have a step of zero or more. Passive properties need hyperpolarizing steps. Set current_range_pa, such as -100,0, or list only the negative sweeps." % ", ".join(str(i + 1) for i in neg))
    rows, peaks_t = [], []
    for i in ids:
        s = rec.sweeps[i]
        t, v = s["t"], s["y"] - ljp
        a, b = R.idx(t, win[0]), R.idx(t, win[1])
        k = int(np.argmin(v[a:b])) + a
        peaks_t.append(t[k])
    med_peak = float(np.median(peaks_t))
    for i in ids:
        s = rec.sweeps[i]
        t, v = s["t"], s["y"] - ljp
        a, b = R.idx(t, win[0]), R.idx(t, win[1])
        base = float(np.mean(v[R.idx(t, bw[0]):R.idx(t, bw[1])]))
        k = int(np.argmin(v[a:b])) + a
        ss_a = R.idx(t, win[1] - 0.1)
        ss = float(np.mean(v[ss_a:b]))
        pk_avg = float(np.mean(v[R.idx(t, t[k] - 0.0025):R.idx(t, t[k] + 0.0025)]))
        base_sag = float(np.mean(v[R.idx(t, win[0] - 0.03):a]))
        sag = (pk_avg - ss) / (pk_avg - base_sag) if pk_avg != base_sag else float("nan")
        amp = R.step_amplitude(rec, i, win)
        tau = S.time_constant(t, v, win[0], win[1], 0.1, med_peak)
        rows.append({"sweep": i + 1, "current_pa": amp, "baseline_mv": base, "peak_mv": float(v[k]), "peak_current_pa": float(s["cmd"][k]), "steady_state_mv": ss,
                     "sag_fraction": sag, "tau_ms": tau * 1e3})
    frame = pd.DataFrame(rows).sort_values("current_pa").reset_index(drop=True)
    cur = frame["current_pa"].to_numpy(float)
    def slope(vm, im, base):
        vm, im = np.asarray(vm, float), np.asarray(im, float)
        if len(vm) == 1:
            vm, im = np.append(vm, base), np.append(im, 0.0)
        A = np.vstack([im, np.ones_like(im)]).T
        m, c = np.linalg.lstsq(A, vm, rcond=None)[0]
        pred = A @ np.array([m, c])
        ss_res, ss_tot = float(np.sum((vm - pred) ** 2)), float(np.sum((vm - vm.mean()) ** 2))
        return m * 1e3, (1 - ss_res / ss_tot) if ss_tot > 0 else float("nan")
    rin_peak, r2_peak = slope(frame["peak_mv"], frame["peak_current_pa"], frame["baseline_mv"].iloc[0])
    rin_ss, r2_ss = slope(frame["steady_state_mv"], cur, frame["baseline_mv"].iloc[0])
    rin, r2 = (rin_ss, r2_ss) if input_resistance_measure == "steady_state" else (rin_peak, r2_peak)
    tau = float(np.nanmean(frame["tau_ms"])) if frame["tau_ms"].notna().any() else float("nan")
    vm_at_peak = frame["peak_mv"].to_numpy(float)
    k = int(np.argmin(np.abs(vm_at_peak - (-100.0))))
    rest = float(frame["baseline_mv"].mean())
    cm = tau / rin * 1e3 if np.isfinite(tau) and rin > 0 else float("nan")
    metrics = {"n_sweeps": len(frame), "resting_potential_mv": rest, "input_resistance_mohm": rin, "input_resistance_r_squared": r2, "rin_steady_state_mohm": rin_ss,
               "rin_peak_mohm": rin_peak, "tau_ms": tau, "n_tau_fits": int(frame["tau_ms"].notna().sum()), "sag_fraction": float(frame["sag_fraction"].iloc[k]),
               "sag_sweep_peak_mv": float(vm_at_peak[k]), "sag_current_pa": float(cur[k]), "capacitance_pf_from_tau": cm, "ljp_mv": ljp}
    cell = {"cell": _cell(path, cell_id), **{x: metrics[x] for x in ("resting_potential_mv", "input_resistance_mohm", "tau_ms", "sag_fraction", "capacitance_pf_from_tau")}}
    _style()
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(8, 3.1), gridspec_kw={"width_ratios": [1.5, 1]})
    for i in ids:
        s = rec.sweeps[i]
        a1.plot(s["t"], s["y"] - ljp, lw=0.6, color=BLUE)
    a1.set_xlim(win[0] - 0.15, win[1] + 0.15)
    a1.set_xlabel("Time (s)")
    a1.set_ylabel("Vm (mV)")
    a2.plot(frame["peak_current_pa"], frame["peak_mv"], "o", color=ORANGE, ms=4, label="peak")
    a2.plot(cur, frame["steady_state_mv"], "o", color=BLUE, ms=4, label="steady state")
    xs = np.array([min(cur.min(), 0), 0.0])
    a2.plot(xs, np.polyval(np.polyfit(cur, frame["steady_state_mv"], 1), xs) if len(cur) > 1 else xs * 0, "--", color=GRAY, lw=0.8)
    a2.set_xlabel("Current (pA)")
    a2.set_ylabel("Vm (mV)")
    a2.legend(fontsize=7, frameon=False)
    summary = ("%s: %d hyperpolarizing sweep(s). Resting potential %.2f mV (baseline %.3f to %.3f s). Input resistance %.4g MOhm from the %s deflection (R squared %.4f); "
               "steady state %.4g MOhm, peak %.4g MOhm. Membrane time constant %.4g ms (mean of %d fits). Sag fraction %.3f at the sweep with a peak of %.1f mV. "
               "Capacitance from tau over resistance %.4g pF (a rough value). Voltages are corrected by %g mV (LJP)." % (
                   os.path.basename(path), len(frame), rest, bw[0], bw[1], rin, input_resistance_measure.replace("_", " "), r2, rin_ss, rin_peak, tau, int(frame["tau_ms"].notna().sum()),
                   metrics["sag_fraction"], metrics["sag_sweep_peak_mv"], cm, ljp))
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics), "data": {"input_resistance_measure": input_resistance_measure},
            "table": _table(frame, "passive_sweeps"), "tables": {"cell_features": _table(pd.DataFrame([cell]), "cell_features")}, "outputs": _save(fig, "passive")}


@guarded
def measure_current_steps(path, current_window=None, baseline_window=None, peak_direction=None, leak_subtraction=None, ljp_mv=None, sweeps=None, leak_fit_range_mv=None,
                          voltage_window=None, channel=0, sweep_label=None, cell_id=None):
    cw = _need_window(current_window, "current_window", "the time window in which the tool measures the current.")
    bw = _need_window(baseline_window, "baseline_window", "the time window before the step that gives the baseline current.")
    if peak_direction not in ("inward", "outward", "largest"):
        raise ValueError("peak_direction is missing or not known. Use inward, outward or largest.")
    if leak_subtraction not in ("none", "linear_extrapolation"):
        raise ValueError("leak_subtraction is missing or not known. It is a decision. Use none or linear_extrapolation.")
    ljp = _need_ljp(ljp_mv)
    rec, ids = _open(path, channel, sweeps, sweep_label, "voltage_clamp")
    vw = R.parse_window(voltage_window, "voltage_window") if voltage_window else _stim(rec, ids, None)
    rows = []
    for i in ids:
        s = rec.sweeps[i]
        t, y = s["t"], s["y"]
        if s["cmd"] is None:
            raise ValueError("%s has no command waveform, so the voltage of each sweep is unknown." % os.path.basename(path))
        base = float(np.mean(y[R.idx(t, bw[0]):R.idx(t, bw[1])]))
        a, b = R.idx(t, cw[0]), R.idx(t, cw[1])
        seg = y[a:b] - base
        if peak_direction == "inward":
            k = int(np.argmin(seg))
        elif peak_direction == "outward":
            k = int(np.argmax(seg))
        else:
            k = int(np.argmax(np.abs(seg)))
        v = float(np.mean(s["cmd"][R.idx(t, vw[0]):R.idx(t, vw[1])])) - ljp
        rows.append({"sweep": i + 1, "voltage_mv": v, "baseline_pa": base, "mean_pa": float(np.mean(seg)), "peak_raw_pa": float(seg[k]), "peak_time_ms": float((t[a + k] - cw[0]) * 1e3)})
    frame = pd.DataFrame(rows).sort_values("voltage_mv").reset_index(drop=True)
    leak_g = leak_b = float("nan")
    frame["leak_pa"] = 0.0
    if leak_subtraction == "linear_extrapolation":
        lr = _need_window(leak_fit_range_mv, "leak_fit_range_mv", "the voltage range in mV where the current is only leak.")
        m = (frame["voltage_mv"] >= lr[0]) & (frame["voltage_mv"] <= lr[1])
        if m.sum() < 2:
            raise ValueError("Only %d sweep(s) have a voltage between %g and %g mV. The leak fit needs 2 or more. The voltages run from %g to %g mV." % (
                int(m.sum()), lr[0], lr[1], frame["voltage_mv"].min(), frame["voltage_mv"].max()))
        leak_g, leak_b = np.polyfit(frame.loc[m, "voltage_mv"], frame.loc[m, "mean_pa"], 1)
        frame["leak_pa"] = leak_g * frame["voltage_mv"] + leak_b
    frame["current_pa"] = frame["peak_raw_pa"] - frame["leak_pa"]
    big = frame.iloc[int(np.argmax(np.abs(frame["current_pa"].to_numpy())))]
    metrics = {"n_sweeps": len(frame), "peak_current_pa": float(big["current_pa"]), "voltage_at_peak_mv": float(big["voltage_mv"]), "leak_conductance_ns": float(leak_g) if np.isfinite(leak_g) else None,
               "leak_intercept_pa": float(leak_b) if np.isfinite(leak_b) else None, "ljp_mv": ljp, "voltage_window_start_s": vw[0], "voltage_window_end_s": vw[1]}
    cell = {"cell": _cell(path, cell_id), "peak_current_pa": metrics["peak_current_pa"], "voltage_at_peak_mv": metrics["voltage_at_peak_mv"]}
    _style()
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(8, 3.1), gridspec_kw={"width_ratios": [1.5, 1]})
    cmap = plt.get_cmap("viridis")
    for n_, i in enumerate(ids):
        s = rec.sweeps[i]
        a1.plot(s["t"], s["y"], lw=0.5, color=cmap(n_ / max(len(ids) - 1, 1)))
    a1.axvspan(cw[0], cw[1], color=ORANGE, alpha=0.15)
    a1.set_xlabel("Time (s)")
    a1.set_ylabel("Current (pA)")
    a2.plot(frame["voltage_mv"], frame["current_pa"], "o-", color=BLUE, ms=3, lw=0.8)
    a2.axhline(0, color=GRAY, lw=0.5)
    a2.set_xlabel("Voltage (mV)")
    a2.set_ylabel("Current (pA)")
    summary = ("%s: %d sweep(s), %s peak current in %.4g to %.4g s after a baseline of %.4g to %.4g s. Voltage is the command from %.4g to %.4g s, corrected by %g mV (LJP). "
               "Leak subtraction: %s. Largest current %.4g pA at %.4g mV." % (
                   os.path.basename(path), len(frame), peak_direction, cw[0], cw[1], bw[0], bw[1], vw[0], vw[1], ljp,
                   "none" if leak_subtraction == "none" else "linear fit of %d sweep(s), %.4g nS" % (int(m.sum()), leak_g), float(big["current_pa"]), float(big["voltage_mv"])))
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics), "data": {"leak_subtraction": leak_subtraction, "peak_direction": peak_direction},
            "table": _table(frame, "iv"), "tables": {"cell_features": _table(pd.DataFrame([cell]), "cell_features")}, "outputs": _save(fig, "iv")}


def _boltz_act(v, a, v_half, k):
    return a / (1.0 + np.exp((v_half - v) / k))


def _boltz_inact(v, a, v_half, k, floor):
    return floor + (a - floor) / (1.0 + np.exp((v - v_half) / k))


@guarded
def fit_boltzmann(table, curve=None, reversal_potential_mv=None, voltage_col="voltage_mv", current_col="current_pa", exclude_within_mv=0.0, fit_floor=False, alpha=0.05):
    if curve not in ("activation", "inactivation"):
        raise ValueError("curve is missing or not known. Use activation or inactivation.")
    path = os.path.expanduser(str(table))
    if not os.path.exists(path):
        raise FileNotFoundError("File not found: %s." % path)
    d = pd.read_csv(path)
    for c in (voltage_col, current_col):
        if c not in d.columns:
            raise ValueError("Column %r is not in %s. The columns are: %s." % (c, os.path.basename(path), ", ".join(map(str, d.columns))))
    v = d[voltage_col].to_numpy(float)
    i = d[current_col].to_numpy(float)
    if curve == "activation":
        if reversal_potential_mv is None:
            raise ValueError("reversal_potential_mv is missing. An activation curve needs the reversal potential in mV to turn current into conductance. Take it from the Nernst equation or from the I-V curve.")
        erev = float(reversal_potential_mv)
        keep = np.abs(v - erev) > max(float(exclude_within_mv), 1e-9)
        v, i = v[keep], i[keep]
        y = i / (v - erev)
        y_name = "conductance_ns"
    else:
        y = i
        y_name = "current_pa"
    if len(v) < 5:
        raise ValueError("The fit has %d point(s). A Boltzmann fit with 3 parameters needs 5 or more voltages." % len(v))
    sign = 1.0 if np.nanmax(y) >= -np.nanmin(y) else -1.0
    y = y * sign
    a0 = float(np.max(y))
    half_idx = int(np.argmin(np.abs(y - a0 / 2.0)))
    v0 = float(v[half_idx])
    if curve == "activation":
        f, p0, lo, hi = _boltz_act, [a0, v0, 8.0], [0, -np.inf, 0.1], [np.inf, np.inf, 100.0]
        names = ["amplitude", "v_half_mv", "slope_k_mv"]
    elif fit_floor:
        f, p0, lo, hi = _boltz_inact, [a0, v0, 8.0, 0.0], [0, -np.inf, 0.1, -np.inf], [np.inf, np.inf, 100.0, np.inf]
        names = ["amplitude", "v_half_mv", "slope_k_mv", "floor"]
    else:
        f, p0, lo, hi = (lambda x, a, vh, k: _boltz_inact(x, a, vh, k, 0.0)), [a0, v0, 8.0], [0, -np.inf, 0.1], [np.inf, np.inf, 100.0]
        names = ["amplitude", "v_half_mv", "slope_k_mv"]
    try:
        popt, pcov = optimize.curve_fit(f, v, y, p0=p0, bounds=(lo, hi), maxfev=20000)
    except (RuntimeError, ValueError) as e:
        raise ValueError("The Boltzmann fit of %s did not converge on %d points (%s). Check that the voltages cover the rise of the curve." % (os.path.basename(path), len(v), e))
    se = np.sqrt(np.diag(pcov))
    dof = len(v) - len(popt)
    tq = stats.t.ppf(1 - float(alpha) / 2, dof) if dof > 0 else float("nan")
    pred = f(v, *popt)
    ss_res, ss_tot = float(np.sum((y - pred) ** 2)), float(np.sum((y - y.mean()) ** 2))
    r2 = 1 - ss_res / ss_tot
    res = dict(zip(names, popt))
    ses = dict(zip(names, se))
    amp = popt[0]
    frame = pd.DataFrame({"voltage_mv": v, y_name: y * sign, "normalized": y / amp, "fitted_normalized": pred / amp})
    order = np.argsort(v)
    frame = frame.iloc[order].reset_index(drop=True)
    metrics = {"v_half_mv": float(res["v_half_mv"]), "v_half_se_mv": float(ses["v_half_mv"]), "v_half_ci_lo": float(res["v_half_mv"] - tq * ses["v_half_mv"]),
               "v_half_ci_hi": float(res["v_half_mv"] + tq * ses["v_half_mv"]), "slope_k_mv": float(res["slope_k_mv"]), "slope_k_se_mv": float(ses["slope_k_mv"]),
               "slope_k_ci_lo": float(res["slope_k_mv"] - tq * ses["slope_k_mv"]), "slope_k_ci_hi": float(res["slope_k_mv"] + tq * ses["slope_k_mv"]),
               "amplitude": float(sign * amp), "r_squared": float(r2), "n_points": int(len(v)), "df": int(dof)}
    if "floor" in res:
        metrics["floor"] = float(sign * res["floor"])
    cell = {"cell": os.path.splitext(os.path.basename(path))[0], "%s_v_half_mv" % curve: metrics["v_half_mv"], "%s_slope_k_mv" % curve: metrics["slope_k_mv"]}
    _style()
    fig, ax = plt.subplots(figsize=(4.2, 3.2))
    ax.plot(frame["voltage_mv"], frame["normalized"], "o", color=BLUE, ms=4)
    xs = np.linspace(v.min(), v.max(), 200)
    ax.plot(xs, f(xs, *popt) / amp, color=RED, lw=1)
    ax.axvline(res["v_half_mv"], color=GRAY, lw=0.6, ls=":")
    ax.set_xlabel("Voltage (mV)")
    ax.set_ylabel("Normalized %s" % ("conductance" if curve == "activation" else "current"))
    ax.set_title("V1/2 %.2f mV, k %.2f mV" % (res["v_half_mv"], res["slope_k_mv"]), fontsize=9)
    summary = ("%s curve, Boltzmann fit to %d points (R squared %.4f): V1/2 = %.3f mV (SE %.3f, %g%% CI %.3f to %.3f), slope factor k = %.3f mV (SE %.3f, CI %.3f to %.3f)." % (
        curve, len(v), r2, metrics["v_half_mv"], metrics["v_half_se_mv"], 100 * (1 - float(alpha)), metrics["v_half_ci_lo"], metrics["v_half_ci_hi"], metrics["slope_k_mv"],
        metrics["slope_k_se_mv"], metrics["slope_k_ci_lo"], metrics["slope_k_ci_hi"]))
    summary += " The standard errors come from the covariance of the least squares fit, and they assume that the points are independent. Report V1/2 and k for each cell, not for the pooled points."
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics), "data": {"curve": curve, "model": "I = A / (1 + exp((V1/2 - V) / k))" if curve == "activation" else "I = floor + (A - floor) / (1 + exp((V - V1/2) / k))"},
            "table": _table(frame, "boltzmann"), "tables": {"cell_features": _table(pd.DataFrame([cell]), "cell_features")}, "outputs": _save(fig, "boltzmann")}


def _template(rate, rise_ms, decay_ms, sign):
    n = int(np.ceil(5.0 * decay_ms * 1e-3 * rate))
    t = np.arange(n) / rate * 1e3
    shape = (1 - np.exp(-t / rise_ms)) * np.exp(-t / decay_ms)
    shape = shape / shape.max()
    return sign * shape


def _template_scan(y, T):
    L = len(T)
    sT, sTT = T.sum(), (T ** 2).sum()
    c1 = np.concatenate([[0.0], np.cumsum(y)])
    c2 = np.concatenate([[0.0], np.cumsum(y ** 2)])
    n = len(y) - L + 1
    Sy = c1[L:L + n] - c1[:n]
    Syy = c2[L:L + n] - c2[:n]
    Sty = signal.correlate(y, T, mode="valid", method="fft")
    den = sTT - sT ** 2 / L
    s = (Sty - sT * Sy / L) / den
    c = (Sy - s * sT) / L
    sse = Syy + s ** 2 * sTT + L * c ** 2 - 2 * s * Sty - 2 * c * Sy + 2 * s * c * sT
    se = np.sqrt(np.maximum(sse, 1e-30) / (L - 2) / den)
    return s, se, c


def _drift(y, rate):
    block = max(int(0.05 * rate), 3)
    nb = max(len(y) // block, 1)
    centers = (np.arange(nb) + 0.5) * block
    meds = np.array([np.median(y[k * block:(k + 1) * block]) for k in range(nb)])
    return np.interp(np.arange(len(y)), centers, meds)


def _measure_event(y, rate, onset, nxt, rise_ms, decay_ms, sign):
    pre = max(int(0.001 * rate), 2)
    base = float(np.mean(y[max(onset - pre, 0):onset])) if onset > 0 else float(y[0])
    win_end = min(nxt, onset + int(5 * decay_ms * 1e-3 * rate), len(y) - 1)
    seg = y[onset:win_end + 1]
    if len(seg) < 3:
        return None
    sm = np.convolve(seg, np.ones(3) / 3, mode="same")
    k = int(np.argmax(sign * sm))
    amp = float(sign * (sm[k] - base))
    if amp <= 0:
        return None
    d = sign * (sm[:k + 1] - base)
    def cross(level):
        hit = np.flatnonzero(d >= level)
        if hit.size == 0:
            return float("nan")
        j = int(hit[0])
        if j == 0:
            return 0.0
        return j - 1 + (level - d[j - 1]) / (d[j] - d[j - 1])
    rise = (cross(0.9 * amp) - cross(0.1 * amp)) / rate * 1e3
    tail = sign * (y[onset + k:win_end + 1] - base)
    tau = float("nan")
    if len(tail) >= 8:
        x = np.arange(len(tail)) / rate * 1e3
        try:
            popt, _ = optimize.curve_fit(lambda xx, a, t: a * np.exp(-xx / t), x, tail, p0=(tail[0], decay_ms), bounds=([0, 0.05], [np.inf, 1000.0]))
            tau = float(popt[1])
        except (RuntimeError, ValueError):
            tau = float("nan")
    half = np.flatnonzero(tail <= amp / 2)
    half_decay = float(half[0] / rate * 1e3) if half.size else float("nan")
    return {"peak_index": onset + k, "baseline": base, "amplitude": amp, "rise_10_90_ms": float(rise), "decay_tau_ms": tau, "half_decay_ms": half_decay}


@guarded
def detect_events(path, event_method=None, event_threshold=None, event_direction=None, event_rise_ms=None, event_decay_ms=None, sweeps=None, channel=0,
                  sweep_label=None, filter_hz=0.0, analysis_window=None, cell_id=None, signal_unit=None):
    if event_method not in ("template", "threshold"):
        raise ValueError("event_method is missing or not known. It is a decision. Use template or threshold.")
    if event_threshold is None:
        raise ValueError("event_threshold is missing. It is a decision: the detection criterion for the template method, or the multiple of the noise SD for the threshold method.")
    if event_direction not in ("inward", "outward"):
        raise ValueError("event_direction is missing or not known. Use inward (negative current, such as mEPSC at -70 mV) or outward.")
    if event_rise_ms is None or event_decay_ms is None:
        raise ValueError("event_rise_ms and event_decay_ms are missing. They are decisions: the expected rise and decay time constants of the events, in ms.")
    rec, ids = _open(path, channel, sweeps, sweep_label, "voltage_clamp", signal_unit)
    sign = -1.0 if event_direction == "inward" else 1.0
    thr, rise_ms, decay_ms = float(event_threshold), float(event_rise_ms), float(event_decay_ms)
    aw = R.parse_window(analysis_window, "analysis_window") if analysis_window else None
    T = _template(rec.rate, rise_ms, decay_ms, sign)
    sep = max(len(T), 2)
    events, total, noise_all, unmeasured = [], 0.0, [], 0
    traces = []
    for i in ids:
        s = rec.sweeps[i]
        t, y = s["t"], s["y"].copy()
        if aw:
            a, b = R.idx(t, aw[0]), R.idx(t, aw[1])
            t, y = t[a:b], y[a:b]
        if filter_hz and float(filter_hz) > 0:
            bb, aa = signal.bessel(4, float(filter_hz) / (rec.rate / 2.0), "low")
            y = signal.filtfilt(bb, aa, y)
        total += len(y) / rec.rate
        if len(y) <= len(T) + 5:
            raise ValueError("Sweep %d has %d samples after the analysis window. The template has %d. Widen analysis_window." % (i + 1, len(y), len(T)))
        resid = y - _drift(y, rec.rate)
        noise = 1.4826 * float(np.median(np.abs(resid - np.median(resid))))
        noise_all.append(noise)
        if event_method == "template":
            sc, se, off = _template_scan(y, T)
            det = sc / se
            det_sd = 1.4826 * float(np.median(np.abs(det - np.median(det))))
            det = det / det_sd
            peaks, _ = signal.find_peaks(det, height=thr, distance=sep)
            onsets = peaks
            scale = sc[peaks]
            crit = det[peaks]
        else:
            mag = sign * resid
            peaks, _ = signal.find_peaks(mag, height=thr * noise, distance=sep)
            onsets, scale, crit = [], [], []
            for p in peaks:
                lim = max(p - int(5 * rise_ms * 1e-3 * rec.rate) - 2, 0)
                seg = mag[lim:p + 1]
                lowv = np.flatnonzero(seg <= 0.1 * seg[-1])
                onsets.append(lim + (int(lowv[-1]) if lowv.size else 0))
                scale.append(float(mag[p]))
                crit.append(float(mag[p] / noise))
            onsets = np.array(onsets, dtype=int)
        order = np.argsort(onsets)
        onsets = np.asarray(onsets)[order]
        scale = np.asarray(scale)[order]
        crit = np.asarray(crit)[order]
        for n_, on in enumerate(onsets):
            nxt = int(onsets[n_ + 1]) if n_ + 1 < len(onsets) else len(y) - 1
            m = _measure_event(y, rec.rate, int(on), nxt, rise_ms, decay_ms, sign)
            if m is None:
                unmeasured += 1
                continue
            isolated = (nxt - on) >= int(7 * decay_ms * 1e-3 * rec.rate) and (n_ == 0 or (on - onsets[n_ - 1]) >= int(7 * decay_ms * 1e-3 * rec.rate))
            events.append({"sweep": i + 1, "time_s": float(t[on]), "amplitude_pa": m["amplitude"], "template_scale_pa": float(scale[n_]) if event_method == "template" else float("nan"),
                           "criterion": float(crit[n_]), "rise_10_90_ms": m["rise_10_90_ms"], "decay_tau_ms": m["decay_tau_ms"], "half_decay_ms": m["half_decay_ms"],
                           "baseline_pa": m["baseline"], "isolated": bool(isolated)})
        traces.append((t, y, onsets))
    frame = pd.DataFrame(events)
    n_ev = len(frame)
    noise_sd = float(np.mean(noise_all))
    metrics = {"n_events": n_ev, "analysed_s": float(total), "noise_sd_pa": noise_sd, "event_threshold": thr, "n_detected_not_measured": unmeasured}
    if n_ev == 0:
        summary = "No event found in %.1f s with %s detection at %g (noise SD %.3g pA). Lower event_threshold, check event_direction (%s), or check event_rise_ms and event_decay_ms." % (total, event_method, thr, noise_sd, event_direction)
        return {"ok": True, "summary": summary, "metrics": _metrics(metrics), "data": {"event_method": event_method}}
    iso = frame[frame["isolated"]]
    freq = n_ev / total
    metrics.update({"frequency_hz": freq, "mean_amplitude_pa": float(frame["amplitude_pa"].mean()), "median_amplitude_pa": float(frame["amplitude_pa"].median()),
                    "amplitude_sd_pa": float(frame["amplitude_pa"].std(ddof=1)) if n_ev > 1 else float("nan"), "n_isolated": int(len(iso)),
                    "mean_rise_10_90_ms": float(iso["rise_10_90_ms"].mean()) if len(iso) else float("nan"), "mean_decay_tau_ms": float(iso["decay_tau_ms"].mean()) if len(iso) else float("nan"),
                    "mean_half_decay_ms": float(iso["half_decay_ms"].mean()) if len(iso) else float("nan")})
    cell = {"cell": _cell(path, cell_id), "event_frequency_hz": freq, "event_amplitude_pa": metrics["mean_amplitude_pa"], "event_rise_10_90_ms": metrics["mean_rise_10_90_ms"], "event_decay_tau_ms": metrics["mean_decay_tau_ms"]}
    _style()
    fig, axes = plt.subplots(1, 3, figsize=(9.5, 2.9), gridspec_kw={"width_ratios": [1.8, 1, 1]})
    t, y, on = traces[0]
    seg_end = min(len(y), int(10 * rec.rate))
    axes[0].plot(t[:seg_end], y[:seg_end], lw=0.4, color=BLUE)
    m_on = on[on < seg_end]
    axes[0].plot(t[m_on], y[m_on], "v", color=RED, ms=3)
    axes[0].set_xlabel("Time (s)")
    axes[0].set_ylabel("Current (pA)")
    pre, post = int(0.005 * rec.rate), int(5 * decay_ms * 1e-3 * rec.rate)
    waves = []
    for _, yy, oo in traces:
        for o in oo:
            if o - pre >= 0 and o + post < len(yy):
                waves.append(yy[o - pre:o + post] - np.mean(yy[max(o - pre, 0):o]))
    if waves:
        w = np.mean(waves, axis=0)
        xs = (np.arange(len(w)) - pre) / rec.rate * 1e3
        for ww in waves[:30]:
            axes[1].plot(xs, ww, lw=0.3, color=GRAY, alpha=0.4)
        axes[1].plot(xs, w, color=RED, lw=1.2)
    axes[1].set_xlabel("Time from onset (ms)")
    axes[1].set_ylabel("Current (pA)")
    srt = np.sort(frame["amplitude_pa"].to_numpy())
    axes[2].plot(srt, np.arange(1, len(srt) + 1) / len(srt), color=BLUE, lw=1)
    axes[2].set_xlabel("Amplitude (pA)")
    axes[2].set_ylabel("Cumulative fraction")
    crit_text = "detection trace of the scaled template fit (Clements and Bekkers) above %g times its noise SD" % thr if event_method == "template" else "threshold %g times the noise SD (%.3g pA)" % (thr, noise_sd)
    summary = ("%s: %d %s event(s) in %.1f s, %s. Frequency %.4g Hz. Amplitude mean %.4g pA, median %.4g pA. On %d isolated event(s): 10-90%% rise %.3g ms, decay time constant %.3g ms, "
               "time to half decay %.3g ms. Template kinetics: rise %g ms, decay %g ms; filter %s." % (
                   os.path.basename(path), n_ev, event_direction, total, crit_text, freq, metrics["mean_amplitude_pa"], metrics["median_amplitude_pa"], len(iso),
                   metrics["mean_rise_10_90_ms"], metrics["mean_decay_tau_ms"], metrics["mean_half_decay_ms"], rise_ms, decay_ms, "none" if not filter_hz else "%g Hz" % float(filter_hz)))
    if unmeasured:
        summary += " %d detected event(s) could not be measured and are not in the table." % unmeasured
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics), "data": {"event_method": event_method, "event_direction": event_direction},
            "table": _table(frame, "events"), "tables": {"cell_features": _table(pd.DataFrame([cell]), "cell_features")}, "outputs": _save(fig, "events")}


@guarded
def detect_events_for_cells(folder, pattern=None, metadata=None, event_method=None, event_threshold=None, event_direction=None, event_rise_ms=None, event_decay_ms=None,
                            sweeps=None, filter_hz=0.0, analysis_window=None, signal_unit=None):
    import glob

    if not pattern:
        raise ValueError("pattern is missing. Give a file pattern, such as *.pxp or *cell*.abf. The tool takes each matching file in folder as one cell.")
    root = os.path.expanduser(str(folder))
    files = sorted(glob.glob(os.path.join(root, str(pattern))))
    if not files:
        raise ValueError("No file in %s matches %r. Check folder and pattern." % (root, pattern))
    rows, failed = [], []
    last = None
    for f in files:
        r = detect_events(f, event_method=event_method, event_threshold=event_threshold, event_direction=event_direction, event_rise_ms=event_rise_ms,
                          event_decay_ms=event_decay_ms, sweeps=sweeps, filter_hz=filter_hz, analysis_window=analysis_window, signal_unit=signal_unit)
        if not r["ok"]:
            failed.append("%s: %s" % (os.path.basename(f), r["error"]))
            continue
        last = r
        m = r["metrics"]
        rows.append({"cell": os.path.splitext(os.path.basename(f))[0], "n_events": m["n_events"], "analysed_s": m["analysed_s"], "event_frequency_hz": m.get("frequency_hz", 0.0),
                     "event_amplitude_pa": m.get("mean_amplitude_pa"), "event_rise_10_90_ms": m.get("mean_rise_10_90_ms"), "event_decay_tau_ms": m.get("mean_decay_tau_ms"),
                     "noise_sd_pa": m["noise_sd_pa"]})
    if not rows:
        raise ValueError("Event detection failed for all %d file(s). First error: %s" % (len(files), failed[0]))
    frame = pd.DataFrame(rows)
    note = ""
    if metadata:
        m = R.read_labels_csv(os.path.expanduser(str(metadata)))
        if "cell" not in m.columns:
            raise ValueError("The metadata file %s has no column 'cell'. The column must hold the file name of each cell without the extension. The columns are: %s." % (os.path.basename(str(metadata)), ", ".join(map(str, m.columns))))
        m["cell"] = m["cell"].astype(str)
        unmatched = sorted(set(frame["cell"]) - set(m["cell"]))
        frame = frame.merge(m, on="cell", how="left")
        if unmatched:
            note = " No metadata for %d cell(s): %s." % (len(unmatched), ", ".join(unmatched[:5]))
    metrics = {"n_cells": len(frame), "n_failed": len(failed), "mean_frequency_hz": float(frame["event_frequency_hz"].mean()), "mean_amplitude_pa": float(frame["event_amplitude_pa"].mean())}
    summary = ("%d cell(s) from %s (%s detection, threshold %g, %s). Mean of the cell values: frequency %.4g Hz, amplitude %.4g pA, 10-90%% rise %.3g ms, decay time constant %.3g ms.%s%s "
               "Use compare_cell_groups on this table." % (
                   len(frame), os.path.basename(root.rstrip("/")) or root, event_method, float(event_threshold), event_direction, metrics["mean_frequency_hz"], metrics["mean_amplitude_pa"],
                   float(frame["event_rise_10_90_ms"].mean()), float(frame["event_decay_tau_ms"].mean()), note, " %d file(s) failed: %s." % (len(failed), failed[0]) if failed else ""))
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics), "data": {"files": len(files)}, "table": _table(frame, "cells"), "outputs": last.get("outputs")}


def _as_list(x):
    if x is None:
        return []
    if isinstance(x, str):
        return [p.strip() for p in x.split(",") if p.strip()]
    return list(x)


@guarded
def collect_cell_features(paths, metadata=None, id_column="cell"):
    files = [os.path.expanduser(p) for p in _as_list(paths)]
    if not files:
        raise ValueError("paths is empty. Give the cell_features.csv files from the measure tools, one or more for each cell.")
    parts = {}
    for f in files:
        if not os.path.exists(f):
            raise FileNotFoundError("File not found: %s." % f)
        d = R.read_labels_csv(f)
        if id_column not in d.columns:
            raise ValueError("Column %r is not in %s. The columns are: %s." % (id_column, os.path.basename(f), ", ".join(map(str, d.columns))))
        for _, row in d.iterrows():
            parts.setdefault(str(row[id_column]), {}).update({k: v for k, v in row.items() if k != id_column and pd.notna(v)})
    frame = pd.DataFrame([{id_column: k, **v} for k, v in parts.items()])
    note = ""
    if metadata:
        m = R.read_labels_csv(os.path.expanduser(str(metadata)))
        if id_column not in m.columns:
            raise ValueError("Column %r is not in the metadata file %s. The columns are: %s." % (id_column, os.path.basename(str(metadata)), ", ".join(map(str, m.columns))))
        m[id_column] = m[id_column].astype(str)
        missing = sorted(set(frame[id_column]) - set(m[id_column]))
        frame = frame.merge(m, on=id_column, how="left")
        if missing:
            note = " No metadata for: %s." % ", ".join(missing[:8])
    feats = [c for c in frame.columns if c != id_column and pd.api.types.is_numeric_dtype(frame[c])]
    summary = "%d cell(s) and %d numeric column(s) from %d file(s).%s Save this table as the input of compare_cell_groups, and keep the columns for animal and group." % (len(frame), len(feats), len(files), note)
    return {"ok": True, "summary": summary, "metrics": {"n_cells": len(frame), "n_columns": len(frame.columns)}, "data": {"columns": [str(c) for c in frame.columns]}, "table": _table(frame, "cells")}


def _cohen_d(x, y):
    nx, ny = len(x), len(y)
    if nx < 2 or ny < 2:
        return float("nan")
    sp = np.sqrt(((nx - 1) * np.var(x, ddof=1) + (ny - 1) * np.var(y, ddof=1)) / (nx + ny - 2))
    return float((np.mean(x) - np.mean(y)) / sp) if sp > 0 else float("nan")


def _bh(p):
    p = np.asarray(p, float)
    n = len(p)
    order = np.argsort(p)
    adj = np.empty(n)
    run = 1.0
    for rank, idx_ in enumerate(order[::-1]):
        r = n - rank
        run = min(run, p[idx_] * n / r)
        adj[idx_] = run
    return adj


@guarded
def compare_cell_groups(table, group_col=None, features=None, replicate_unit=None, test=None, animal_col="animal", alpha=0.05):
    if replicate_unit not in ("animals", "cells"):
        raise ValueError("replicate_unit is missing or not known. It is a decision. Use animals (average the cells of each animal first) or cells.")
    if test not in ("t", "mannwhitney"):
        raise ValueError("test is missing or not known. Use t (Welch t-test) or mannwhitney (Mann-Whitney U test).")
    path = os.path.expanduser(str(table))
    if not os.path.exists(path):
        raise FileNotFoundError("File not found: %s." % path)
    d = R.read_labels_csv(path)
    if not group_col or group_col not in d.columns:
        raise ValueError("group_col %r is not a column of %s. The columns are: %s." % (group_col, os.path.basename(path), ", ".join(map(str, d.columns))))
    levels = sorted(d[group_col].dropna().unique().tolist(), key=str)
    if len(levels) != 2:
        raise ValueError("The group column has %d levels: %s. This tool compares exactly 2. For 3 or more groups use anova_oneway or kruskal_dunn in the biostats adapter." % (len(levels), levels))
    feats = _as_list(features)
    if not feats:
        feats = [c for c in d.columns if c not in (group_col, animal_col) and pd.api.types.is_numeric_dtype(d[c])]
    miss = [f for f in feats if f not in d.columns]
    if miss:
        raise ValueError("Feature column(s) %s are not in %s. The columns are: %s." % (miss, os.path.basename(path), ", ".join(map(str, d.columns))))
    has_animal = animal_col in d.columns
    if replicate_unit == "animals" and not has_animal:
        raise ValueError("replicate_unit is animals, but the table has no column %r. Add the column or set animal_col. If each cell is from a different animal, write cells and say so." % animal_col)
    first, second = levels
    rows = []
    for f in feats:
        sub = d[[group_col, f] + ([animal_col] if has_animal else [])].dropna(subset=[f])
        if replicate_unit == "animals":
            unit = sub.groupby([group_col, animal_col], as_index=False)[f].mean()
        else:
            unit = sub
        a = unit.loc[unit[group_col] == first, f].to_numpy(float)
        b = unit.loc[unit[group_col] == second, f].to_numpy(float)
        if len(a) < 2 or len(b) < 2:
            raise ValueError("Feature %s has %d value(s) in %s and %d in %s after the %s step. Each group needs 2 or more." % (f, len(a), first, len(b), second, replicate_unit))
        if test == "t":
            r = stats.ttest_ind(b, a, equal_var=False)
            ci = r.confidence_interval(1 - float(alpha))
            stat, p, lo, hi = float(r.statistic), float(r.pvalue), float(ci.low), float(ci.high)
        else:
            r = stats.mannwhitneyu(b, a)
            stat, p, lo, hi = float(r.statistic), float(r.pvalue), float("nan"), float("nan")
        icc = float("nan")
        n_anim_a = n_anim_b = None
        if has_animal:
            n_anim_a = int(sub.loc[sub[group_col] == first, animal_col].nunique())
            n_anim_b = int(sub.loc[sub[group_col] == second, animal_col].nunique())
            g = sub.groupby(animal_col)[f]
            k = g.ngroups
            if k > 1 and len(sub) > k:
                ms_b = float(((g.mean() - sub[f].mean()) ** 2 * g.size()).sum() / (k - 1))
                ms_w = float(((sub[f] - g.transform("mean")) ** 2).sum() / (len(sub) - k))
                n0 = (len(sub) - float((g.size() ** 2).sum()) / len(sub)) / (k - 1)
                dn = ms_b + (n0 - 1) * ms_w
                icc = (ms_b - ms_w) / dn if dn > 0 else float("nan")
        rows.append({"feature": f, "unit": replicate_unit, "group_a": first, "group_b": second, "n_a": len(a), "n_b": len(b), "n_animals_a": n_anim_a, "n_animals_b": n_anim_b,
                     "mean_a": float(a.mean()), "sd_a": float(a.std(ddof=1)), "mean_b": float(b.mean()), "sd_b": float(b.std(ddof=1)),
                     "mean_diff_b_minus_a": float(b.mean() - a.mean()), "ci_lo": lo, "ci_hi": hi, "statistic": stat, "p": p, "cohen_d": _cohen_d(b, a), "icc_animal": icc})
    frame = pd.DataFrame(rows)
    frame["p_bh"] = _bh(frame["p"].to_numpy()) if len(frame) > 1 else frame["p"]
    frame["significant_bh"] = frame["p_bh"] < float(alpha)
    name = "Welch t-test" if test == "t" else "Mann-Whitney U test"
    worst = frame["icc_animal"].max() if has_animal else float("nan")
    metrics = {"n_features": len(frame), "n_significant_bh": int(frame["significant_bh"].sum()), "min_p": float(frame["p"].min()), "min_p_bh": float(frame["p_bh"].min()),
               "max_icc_animal": float(worst) if np.isfinite(worst) else None}
    note = ""
    if replicate_unit == "cells":
        note = (" The unit of replication is the cell. Cells from the same animal are not independent, so the p values are too small if the animal explains part of the variance"
                "%s. For a mixed model use the lme4 adapter: lmer(feature ~ group + (1 | animal))." % ("; the largest ICC (intraclass correlation) over animals is %.2f" % worst if np.isfinite(worst) else ""))
    elif has_animal:
        note = " The unit of replication is the animal: each animal contributes the mean of its cells. For a model that uses every cell, use the lme4 adapter: lmer(feature ~ group + (1 | animal))."
    summary = ("%s on %d feature(s), %s minus %s, unit %s, alpha %g, Benjamini-Hochberg adjustment over the %d feature(s). %d feature(s) pass the adjusted p value. Smallest p %.4g (adjusted %.4g).%s" % (
        name, len(frame), second, first, replicate_unit, float(alpha), len(frame), metrics["n_significant_bh"], metrics["min_p"], metrics["min_p_bh"], note))
    _style()
    fig, ax = plt.subplots(figsize=(max(3.2, 1.6 * min(len(feats), 4) + 1.2), 3.0))
    pos = np.arange(len(feats))
    for k, f in enumerate(feats):
        for off, g_, col in [(-0.18, first, BLUE), (0.18, second, ORANGE)]:
            sub = d[d[group_col] == g_]
            vals = sub.groupby(animal_col)[f].mean().to_numpy(float) if replicate_unit == "animals" and has_animal else sub[f].dropna().to_numpy(float)
            ax.plot(np.full(len(vals), k + off) + np.random.default_rng(1).uniform(-0.05, 0.05, len(vals)), vals / (abs(d[f].mean()) or 1), "o", color=col, ms=3, alpha=0.8)
    ax.set_xticks(pos)
    ax.set_xticklabels(feats, rotation=20, ha="right", fontsize=7)
    ax.set_ylabel("Value divided by the mean of all cells")
    ax.set_title("%s (blue) and %s (orange), one dot for each %s" % (first, second, "animal" if replicate_unit == "animals" else "cell"), fontsize=8)
    return {"ok": True, "summary": summary, "metrics": _metrics(metrics), "data": {"test": name, "direction": "%s minus %s" % (second, first), "replicate_unit": replicate_unit},
            "table": _table(frame, "group_comparison"), "outputs": _save(fig, "group_comparison")}
