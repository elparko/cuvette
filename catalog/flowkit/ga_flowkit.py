import copy
import os
import re
import warnings
import xml.etree.ElementTree as ET

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

import flowkit as fk

COMP_MODES = ("gating_file", "fcs", "csv", "none")
TRANSFORMS = ("none", "logicle", "asinh", "hyperlog")


def _fail(message):
    return {"ok": False, "error": message}


def _num(v):
    return float(v) if isinstance(v, (float, np.floating)) else int(v)


def _safe(name):
    return re.sub(r"[^A-Za-z0-9]+", "_", str(name)).strip("_") or "x"


def _path(p):
    return os.path.abspath(os.path.expanduser(p))


def _png(name, fig):
    path = os.path.join(os.getcwd(), name + ".png")
    fig.savefig(path, dpi=110, bbox_inches="tight")
    plt.close("all")
    return path


def _table(frame, name):
    path = os.path.join(os.getcwd(), name + ".csv")
    frame.to_csv(path, index=False)
    return path


def _preview(frame, path, limit=40):
    rows = frame.head(limit)
    clean = [[v.item() if hasattr(v, "item") else v for v in r] for r in rows.itertuples(index=False, name=None)]
    return {"columns": [str(c) for c in frame.columns], "rows": clean, "n_rows": int(len(frame)), "path": path}


def _out(path):
    kind = "image" if path.endswith(".png") else "table" if path.endswith(".csv") else "file"
    return {"path": path, "kind": kind, "name": os.path.basename(path)}


def _sample(path, ignore_offset_error=False):
    p = _path(path)
    if not os.path.isfile(p):
        raise FileNotFoundError("FCS file not found: %s" % path)
    return fk.Sample(p, ignore_offset_error=bool(ignore_offset_error))


def _spill_text(sample):
    meta = sample.get_metadata()
    return meta.get("spillover") or meta.get("spill")


def _transform(kind, t, w, m, a):
    if kind == "none":
        return None
    if kind == "logicle":
        return fk.transforms.LogicleTransform(param_t=t, param_w=w, param_m=m, param_a=a)
    if kind == "asinh":
        return fk.transforms.AsinhTransform(param_t=t, param_m=m, param_a=a)
    if kind == "hyperlog":
        return fk.transforms.HyperlogTransform(param_t=t, param_w=w, param_m=m, param_a=a)
    raise ValueError("transform must be one of: " + ", ".join(TRANSFORMS))


def _matrix(sample, compensation, matrix_path):
    if compensation == "fcs":
        spill = _spill_text(sample)
        if not spill:
            raise ValueError("the FCS file has no spill matrix ($SPILLOVER or $SPILL)")
        src = spill
    elif compensation == "csv":
        if not matrix_path:
            raise ValueError("compensation csv needs matrix_path")
        src = _path(matrix_path)
        if not os.path.isfile(src):
            raise FileNotFoundError("matrix file not found: %s" % matrix_path)
    else:
        return None
    detectors = [sample.pnn_labels[i] for i in sample.fluoro_indices]
    fluors = [sample.pns_labels[i] for i in sample.fluoro_indices]
    return fk.Matrix(src, detectors, fluors, null_channels=sample.null_channels)


def inspect_fcs(path, ignore_offset_error=False):
    try:
        s = _sample(path, ignore_offset_error)
    except Exception as e:
        return _fail("cannot read the FCS file %s: %s" % (path, e))
    raw = s.get_events(source="raw")
    rows = []
    for i, (n, label) in enumerate(zip(s.pnn_labels, s.pns_labels)):
        kind = "scatter" if i in s.scatter_indices else "fluorescence" if i in s.fluoro_indices else "time" if i == s.time_index else "other"
        col = raw[:, i]
        rows.append([i + 1, n, label, kind, float(col.min()), float(np.median(col)), float(col.max()), int((col < 0).sum())])
    frame = pd.DataFrame(rows, columns=["number", "pnn", "pns", "kind", "min", "median", "max", "n_negative"])
    csv = _table(frame, "channels")
    spill = _spill_text(s)
    summary = "%s: %d events, %d channels (%d fluorescence, %d scatter). Spill matrix in file: %s." % (
        os.path.basename(path), s.event_count, len(s.pnn_labels), len(s.fluoro_indices), len(s.scatter_indices), "yes" if spill else "no")
    metrics = {"n_events": s.event_count, "n_channels": len(s.pnn_labels), "n_fluoro": len(s.fluoro_indices), "n_scatter": len(s.scatter_indices), "has_spill": 1 if spill else 0}
    return {"ok": True, "summary": summary, "metrics": metrics, "table": _preview(frame, csv), "outputs": [_out(csv)],
            "data": {"cytometer": s.get_metadata().get("cyt", ""), "date": s.get_metadata().get("date", "")}}


def apply_compensation(path, compensation="none", matrix_path=None, gating_file=None, sample_id=None, ignore_offset_error=False):
    try:
        s = _sample(path, ignore_offset_error)
        if compensation == "gating_file":
            if not gating_file or not str(gating_file).lower().endswith(".wsp"):
                return _fail("compensation gating_file works with a FlowJo workspace (.wsp). A GatingML file applies matrices gate by gate. Use count_gates, or choose fcs, csv or none.")
            ws = fk.Workspace(_path(gating_file), fcs_samples=_path(path), load_missing_file_data=True)
            sid = sample_id or s.id
            matrix = ws.get_comp_matrix(sid)
            if matrix is None:
                return _fail("the workspace holds no matrix for %s" % sid)
        else:
            matrix = _matrix(s, compensation, matrix_path)
    except Exception as e:
        return _fail("cannot read the FCS file %s or its compensation matrix (compensation %s): %s" % (path, compensation, e))
    raw = s.get_events(source="raw").copy()
    idx = list(s.fluoro_indices)
    if matrix is None:
        comp = raw
    else:
        s.apply_compensation(matrix)
        comp = s.get_events(source="comp")
    rows = []
    for i in idx:
        rows.append([s.pnn_labels[i], s.pns_labels[i], float(raw[:, i].mean()), float(comp[:, i].mean()), float(np.median(raw[:, i])), float(np.median(comp[:, i])),
                     int((raw[:, i] < 0).sum()), int((comp[:, i] < 0).sum()), float(np.abs(comp[:, i] - raw[:, i]).max())])
    frame = pd.DataFrame(rows, columns=["channel", "marker", "mean_raw", "mean_comp", "median_raw", "median_comp", "n_negative_raw", "n_negative_comp", "max_abs_change"])
    outs = [_out(_table(frame, "compensation_effect"))]
    metrics = {"n_events": s.event_count, "n_fluoro": len(idx), "n_negative_raw": int(frame.n_negative_raw.sum()), "n_negative_comp": int(frame.n_negative_comp.sum()),
               "max_abs_change": float(frame.max_abs_change.max())}
    for r in rows:
        metrics["mean_comp_" + _safe(r[0])] = r[3]
        metrics["mean_raw_" + _safe(r[0])] = r[2]
    data = {"compensation": compensation}
    if matrix is not None:
        mdf = pd.DataFrame(matrix.matrix, index=matrix.detectors, columns=matrix.detectors).reset_index().rename(columns={"index": "detector"})
        outs.append(_out(_table(mdf, "compensation_matrix")))
        off = matrix.matrix - np.diag(np.diag(matrix.matrix))
        metrics["max_offdiag"] = float(off.max())
        data["matrix_max_offdiag"] = float(off.max())
    summary = "Compensation %s on %d events and %d fluorescence channels. Negative values: %d before, %d after. Largest change in one event: %.4g." % (
        compensation, s.event_count, len(idx), metrics["n_negative_raw"], metrics["n_negative_comp"], metrics["max_abs_change"])
    return {"ok": True, "summary": summary, "metrics": {k: _num(v) for k, v in metrics.items()}, "table": _preview(frame, outs[0]["path"]), "outputs": outs, "data": data}


def transform_channels(path, transform="logicle", transform_t=262144.0, transform_w=0.5, transform_m=4.5, transform_a=0.0,
                       compensation="none", matrix_path=None, channels=None, include_scatter=False, ignore_offset_error=False):
    try:
        s = _sample(path, ignore_offset_error)
        xf = _transform(transform, transform_t, transform_w, transform_m, transform_a)
        matrix = _matrix(s, compensation, matrix_path)
    except Exception as e:
        return _fail("cannot read the FCS file %s, the %s transform or the compensation matrix (compensation %s): %s" % (path, transform, compensation, e))
    if matrix is not None:
        s.apply_compensation(matrix)
    names = [c.strip() for c in str(channels).split(",") if c.strip()] if channels else None
    if xf is not None:
        if names:
            try:
                s.apply_transform({n: xf for n in names})
            except Exception as e:
                return _fail("cannot transform the channels %s of %s: %s" % (", ".join(names), path, e))
        else:
            s.apply_transform(xf, include_scatter=bool(include_scatter))
    before = s.get_events(source="comp" if matrix is not None else "raw")
    after = s.get_events(source="xform" if xf is not None else "comp" if matrix is not None else "raw")
    if names:
        try:
            idx = [s.get_channel_index(n) for n in names]
        except Exception as e:
            return _fail("cannot find the channels %s in %s: %s" % (", ".join(names), path, e))
    else:
        idx = list(s.scatter_indices) + list(s.fluoro_indices) if include_scatter else list(s.fluoro_indices)
    rows = []
    for i in idx:
        c = after[:, i]
        rows.append([s.pnn_labels[i], s.pns_labels[i], float(before[:, i].min()), float(before[:, i].max()), float(c.min()), float(np.median(c)), float(c.max()),
                     float(np.percentile(c, 1)), float(np.percentile(c, 99))])
    frame = pd.DataFrame(rows, columns=["channel", "marker", "min_before", "max_before", "min_after", "median_after", "max_after", "p01_after", "p99_after"])
    csv = _table(frame, "transform_effect")
    shown = idx[:8]
    cols = 2 if len(shown) > 1 else 1
    nrows = int(np.ceil(len(shown) / cols)) or 1
    fig, axes = plt.subplots(nrows, cols, figsize=(4.2 * cols, 2.6 * nrows), squeeze=False)
    for ax in axes.ravel():
        ax.set_visible(False)
    for ax, i in zip(axes.ravel(), shown):
        ax.set_visible(True)
        ax.hist(after[:, i], bins=120, color="#4a2e6e")
        ax.set_title("%s (%s)" % (s.pnn_labels[i], transform), fontsize=9)
        ax.set_xlabel("value")
        ax.set_ylabel("events")
    fig.tight_layout()
    plot = _png("transform_histograms", fig)
    metrics = {"n_events": s.event_count, "n_channels": len(idx), "max_after": float(frame.max_after.max()), "min_after": float(frame.min_after.min())}
    for r in rows:
        metrics["max_after_" + _safe(r[0])] = r[6]
    summary = "Transform %s (T=%g, W=%g, M=%g, A=%g) on %d channels, compensation %s. Range after: %.4g to %.4g." % (
        transform, transform_t, transform_w, transform_m, transform_a, len(idx), compensation, metrics["min_after"], metrics["max_after"])
    return {"ok": True, "summary": summary, "metrics": {k: _num(v) for k, v in metrics.items()}, "table": _preview(frame, csv), "outputs": [_out(csv), _out(plot)]}


def _flowjo_counts(wsp_path, sample_id):
    root = ET.parse(wsp_path).getroot()
    out = {}
    for node in root.iter("SampleNode"):
        if node.get("name") != sample_id:
            continue

        def walk(e, trail):
            for sub in e.findall("Subpopulations/Population"):
                p = trail + (sub.get("name"),)
                out[p] = int(sub.get("count"))
                walk(sub, p)

        out[("root",)] = int(node.get("count"))
        walk(node, ("root",))
        break
    return out


def _load_gating(path, gating_file, sample_id, ignore_offset_error=False):
    gf = _path(gating_file)
    if not os.path.isfile(gf):
        raise FileNotFoundError("gating file not found: %s" % gating_file)
    p = _path(path)
    if gf.lower().endswith(".wsp"):
        ws = fk.Workspace(gf, fcs_samples=p)
        sid = sample_id or os.path.basename(p)
        if sid not in ws.get_sample_ids():
            raise KeyError("sample %s is not in the workspace. Samples loaded: %s" % (sid, ", ".join(ws.get_sample_ids()) or "none"))
        return ws.get_gating_strategy(sid), ws.get_sample(sid), sid, _flowjo_counts(gf, sid)
    s = _sample(p, ignore_offset_error)
    sess = fk.Session(gf, fcs_samples=[s])
    return sess.gating_strategy, sess.get_sample(s.id), s.id, None


def _gate_objects(gs):
    for node in gs._gate_tree.descendants:
        yield node.gate
        for g in node.custom_gates.values():
            yield g


def _set_compensation(gs, sample, compensation, matrix_path):
    if compensation == "gating_file":
        return
    if compensation == "none":
        ref = "uncompensated"
    elif compensation == "fcs":
        if not _spill_text(sample):
            raise ValueError("the FCS file has no spill matrix ($SPILLOVER or $SPILL)")
        ref = "FCS"
    elif compensation == "csv":
        gs.add_comp_matrix("ga_matrix", _matrix(sample, "csv", matrix_path))
        ref = "ga_matrix"
    else:
        raise ValueError("compensation must be one of: " + ", ".join(COMP_MODES))
    for gate in _gate_objects(gs):
        for d in getattr(gate, "dimensions", None) or []:
            if hasattr(d, "compensation_ref"):
                old = d.compensation_ref
                mat = gs.comp_matrices.get(old) if old not in ("FCS", "uncompensated") else None
                if mat is not None and getattr(d, "id", None) in mat.fluorochromes:
                    d.id = mat.detectors[mat.fluorochromes.index(d.id)]
                d.compensation_ref = ref


def _gate_table(report, flowjo):
    rows = []
    names = report.gate_name.value_counts()
    for _, r in report.iterrows():
        trail = tuple(r.gate_path) + (r.gate_name,)
        row = [r.gate_name, "/".join(r.gate_path[1:]) or "(root)", r.gate_type, int(r["count"]), float(r.absolute_percent), float(r.relative_percent)]
        if flowjo is not None:
            fj = flowjo.get(trail)
            row += [fj, (int(r["count"]) - fj) if fj is not None else None, (100.0 * (int(r["count"]) - fj) / fj) if fj else None]
        row.append(names[r.gate_name] > 1)
        rows.append(row)
    cols = ["gate", "path", "type", "count", "percent_of_all", "percent_of_parent"]
    if flowjo is not None:
        cols += ["flowjo_count", "diff_vs_flowjo", "diff_percent"]
    cols.append("ambiguous")
    return pd.DataFrame(rows, columns=cols)


def _run_gating(path, gating_file, sample_id, compensation, matrix_path, ignore_offset_error):
    gs, sample, sid, flowjo = _load_gating(path, gating_file, sample_id, ignore_offset_error)
    _set_compensation(gs, sample, compensation, matrix_path)
    results = gs.gate_sample(sample)
    return gs, sample, sid, flowjo, results


def count_gates(path, gating_file, sample_id=None, compensation="gating_file", matrix_path=None, control_path=None, ignore_offset_error=False):
    try:
        gs, sample, sid, flowjo, results = _run_gating(path, gating_file, sample_id, compensation, matrix_path, ignore_offset_error)
        control = None
        if control_path:
            cid = None
            _, _, _, _, control = _run_gating(control_path, gating_file, cid, compensation, matrix_path, ignore_offset_error)
    except Exception as e:
        return _fail("cannot run the gates of %s on %s%s: %s" % (gating_file, path, " or the control " + str(control_path) if control_path else "", e))
    frame = _gate_table(results.report, flowjo)
    if control is not None:
        cr = control.report
        lut = {(tuple(r.gate_path), r.gate_name): (int(r["count"]), float(r.relative_percent)) for _, r in cr.iterrows()}
        cc, cp = [], []
        for _, r in results.report.iterrows():
            v = lut.get((tuple(r.gate_path), r.gate_name))
            cc.append(v[0] if v else None)
            cp.append(v[1] if v else None)
        frame.insert(6, "control_count", cc)
        frame.insert(7, "control_percent_of_parent", cp)
        frame.insert(8, "percent_of_parent_minus_control", frame.percent_of_parent - frame.control_percent_of_parent)
    csv = _table(frame, "gate_counts")
    metrics = {"n_events": sample.event_count, "n_gates": len(frame)}
    for _, r in frame.iterrows():
        key = _safe(r.path + "_" + r.gate) if r.ambiguous else _safe(r.gate)
        metrics["count_" + key] = int(r["count"])
        metrics["percent_of_parent_" + key] = float(r.percent_of_parent)
    if flowjo is not None:
        diffs = frame.dropna(subset=["flowjo_count"])
        if len(diffs):
            metrics["max_abs_diff_vs_flowjo"] = int(diffs.diff_vs_flowjo.abs().max())
            metrics["max_abs_diff_percent_vs_flowjo"] = float(diffs.diff_percent.abs().max())
    if control is not None:
        diff = frame.percent_of_parent_minus_control.dropna()
        if len(diff):
            metrics["max_abs_percent_vs_control"] = float(diff.abs().max())
    last = frame.iloc[-1]
    summary = "%s: %d events, %d gates, compensation %s. Last gate %s: %d events (%.3f%% of parent)." % (
        sid, sample.event_count, len(frame), compensation, last.gate, int(last["count"]), last.percent_of_parent)
    if "max_abs_diff_vs_flowjo" in metrics:
        summary += " Largest difference from the FlowJo count: %d events." % metrics["max_abs_diff_vs_flowjo"]
    if control is not None:
        summary += " Control: %s." % os.path.basename(control_path)
    return {"ok": True, "summary": summary, "metrics": {k: _num(v) for k, v in metrics.items()}, "table": _preview(frame, csv), "outputs": [_out(csv)],
            "data": {"sample_id": sid, "compensation": compensation, "control": os.path.basename(control_path) if control_path else ""}}


def compare_compensation(path, gating_file, sample_id=None, modes="gating_file,none", matrix_path=None, ignore_offset_error=False):
    names = [m.strip() for m in str(modes).split(",") if m.strip()]
    bad = [m for m in names if m not in COMP_MODES]
    if bad or len(names) < 2:
        return _fail("modes must list at least two of: " + ", ".join(COMP_MODES))
    frames = {}
    try:
        for m in names:
            gs, sample, sid, flowjo, results = _run_gating(path, gating_file, sample_id, m, matrix_path, ignore_offset_error)
            frames[m] = _gate_table(results.report, flowjo)
    except Exception as e:
        return _fail("cannot run the gates of %s on %s with compensation %s: %s" % (gating_file, path, m, e))
    base = frames[names[0]][["gate", "path", "type", "ambiguous"]].copy()
    for m in names:
        base["count_" + m] = frames[m]["count"].values
    base["change"] = base["count_" + names[-1]] - base["count_" + names[0]]
    base["change_percent"] = [100.0 * c / b if b else None for c, b in zip(base.change, base["count_" + names[0]])]
    csv = _table(base, "compensation_comparison")
    metrics = {"n_events": sample.event_count, "n_gates": len(base), "n_modes": len(names)}
    for _, r in base.iterrows():
        key = _safe(r.path + "_" + r.gate) if r.ambiguous else _safe(r.gate)
        for m in names:
            metrics["count_%s_%s" % (key, m)] = int(r["count_" + m])
    big = base.loc[base.change.abs().idxmax()]
    rel = base.dropna(subset=["change_percent"])
    relbig = rel.loc[rel.change_percent.abs().idxmax()]
    metrics["largest_change_events"] = int(big.change)
    metrics["largest_change_percent"] = float(relbig.change_percent)
    summary = "%s: counts with compensation %s. Largest change in events: gate %s (%s), %d to %d. Largest change in percent: gate %s (%s), %d to %d (%.1f%%)." % (
        sid, " and ".join(names), big.gate, big.path, int(big["count_" + names[0]]), int(big["count_" + names[-1]]), relbig.gate, relbig.path,
        int(relbig["count_" + names[0]]), int(relbig["count_" + names[-1]]), relbig.change_percent)
    return {"ok": True, "summary": summary, "metrics": {k: _num(v) for k, v in metrics.items()}, "table": _preview(base, csv), "outputs": [_out(csv)], "data": {"modes": names, "sample_id": sid}}


def list_gates(gating_file, sample_id=None):
    gf = _path(gating_file)
    if not os.path.isfile(gf):
        return _fail("gating file not found: %s" % gating_file)
    try:
        samples = []
        if gf.lower().endswith(".wsp"):
            ws = fk.Workspace(gf, load_missing_file_data=True)
            samples = ws.get_sample_ids(loaded_only=False)
            sid = sample_id or (samples[0] if samples else None)
            if sid is None:
                return _fail("the workspace holds no samples")
            gs = ws.get_gating_strategy(sid)
            groups = ws.get_sample_groups()
        else:
            gs = fk.Session(gf).gating_strategy
            sid, groups = None, []
        rows = []
        for name, trail in gs.get_gate_ids():
            try:
                g = gs.get_gate(name, gate_path=trail, sample_id=sid)
            except Exception:
                rows.append([name, "/".join(trail[1:]) or "(root)", "Quadrant", "", ""])
                continue
            dims = []
            for d in getattr(g, "dimensions", None) or []:
                label = getattr(d, "id", None) or getattr(d, "ratio_ref", None) or getattr(d, "dimension_ref", "")
                dims.append("%s[comp=%s,xform=%s]" % (label, getattr(d, "compensation_ref", ""), getattr(d, "transformation_ref", None)))
            rows.append([name, "/".join(trail[1:]) or "(root)", type(g).__name__, "; ".join(dims), len(trail) - 1])
        frame = pd.DataFrame(rows, columns=["gate", "parent_path", "type", "dimensions", "depth"])
        hierarchy = gs.get_gate_hierarchy("ascii")
        xforms = list(gs.transforms.keys()) if hasattr(gs, "transforms") else []
        mats = list(gs.comp_matrices.keys()) if hasattr(gs, "comp_matrices") else []
    except Exception as e:
        return _fail("cannot read the gates of %s: %s" % (gating_file, e))
    csv = _table(frame, "gates")
    summary = "%d gates in %s%s. Transforms: %d. Compensation matrices: %d." % (len(frame), os.path.basename(gf), " for sample " + sid if sid else "", len(xforms), len(mats))
    return {"ok": True, "summary": summary, "metrics": {"n_gates": len(frame), "n_transforms": len(xforms), "n_matrices": len(mats), "n_samples": len(samples)},
            "table": _preview(frame, csv), "text": hierarchy, "outputs": [_out(csv)], "data": {"samples": samples, "groups": groups, "transforms": xforms, "matrices": mats}}


def _density(x, y):
    if len(x) < 5:
        return np.zeros(len(x))
    h, xe, ye = np.histogram2d(x, y, bins=64)
    xi = np.clip(np.digitize(x, xe[1:-1]), 0, 63)
    yi = np.clip(np.digitize(y, ye[1:-1]), 0, 63)
    return np.log1p(h[xi, yi])


def _dot_plot(events, dim_ids, member, gate, title, name, labels=None):
    rng = np.random.default_rng(1)
    parent = events.index.values
    shown = rng.choice(len(events), size=min(len(events), 20000), replace=False)
    ev = events.iloc[shown]
    mem = member[shown]
    fig, ax = plt.subplots(figsize=(5.4, 5))
    if len(dim_ids) == 1:
        ax.hist(ev[dim_ids[0]].values, bins=120, color="#9aa0a6")
        ax.hist(ev[dim_ids[0]].values[mem], bins=120, color="#4a2e6e")
        ax.set_xlabel(dim_ids[0])
        ax.set_ylabel("events")
        for d in getattr(gate, "dimensions", []):
            for v in (getattr(d, "min", None), getattr(d, "max", None)):
                if v is not None:
                    ax.axvline(v, color="#c0392b", lw=1.2)
    else:
        x, y = ev[dim_ids[0]].values, ev[dim_ids[1]].values
        ax.scatter(x, y, c=_density(x, y), s=2, cmap="Greys", linewidths=0)
        ax.scatter(x[mem], y[mem], s=2, color="#4a2e6e", linewidths=0, alpha=0.6)
        ax.set_xlabel(dim_ids[0])
        ax.set_ylabel(dim_ids[1])
        kind = type(gate).__name__
        if kind == "RectangleGate":
            d1, d2 = gate.dimensions[0], gate.dimensions[1]
            x0 = d1.min if d1.min is not None else ev[dim_ids[0]].min()
            x1 = d1.max if d1.max is not None else ev[dim_ids[0]].max()
            y0 = d2.min if d2.min is not None else ev[dim_ids[1]].min()
            y1 = d2.max if d2.max is not None else ev[dim_ids[1]].max()
            ax.plot([x0, x1, x1, x0, x0], [y0, y0, y1, y1, y0], color="#c0392b", lw=1.4)
        elif kind == "PolygonGate":
            v = np.array([list(vert.coordinates) if hasattr(vert, "coordinates") else list(vert) for vert in gate.vertices])
            v = np.vstack([v, v[:1]])
            ax.plot(v[:, 0], v[:, 1], color="#c0392b", lw=1.4)
    ax.set_title(title, fontsize=10)
    return _png(name, fig)


def plot_gate(path, gating_file, gate_name, sample_id=None, compensation="gating_file", matrix_path=None, gate_path=None, ignore_offset_error=False):
    try:
        gs, sample, sid, _, results = _run_gating(path, gating_file, sample_id, compensation, matrix_path, ignore_offset_error)
        trail = tuple(t.strip() for t in str(gate_path).split("/") if t.strip()) if gate_path else None
        if trail is None:
            matches = gs.find_matching_gate_paths(gate_name)
            if len(matches) > 1:
                return _fail("gate name %s is ambiguous. Give gate_path, one of: %s" % (gate_name, "; ".join("/".join(m[1:]) for m in matches)))
            trail = matches[0]
        else:
            trail = ("root",) + trail
        gate = gs.get_gate(gate_name, gate_path=trail, sample_id=sid)
        dims = [getattr(d, "id", None) for d in gate.dimensions]
        if None in dims or not 1 <= len(dims) <= 2:
            return _fail("only gates on one or two plain channels can be drawn")
        events = gs._preprocess_sample_events(sample, gate)
        parent_name, parent_path = trail[-1], trail[:-1]
        mask = np.ones(sample.event_count, dtype=bool) if parent_name == "root" else results.get_gate_membership(parent_name, parent_path)
        inside = results.get_gate_membership(gate_name, trail)
        count = int(inside.sum())
        parent_n = int(mask.sum())
        sub = events[mask]
        member = inside[mask]
    except Exception as e:
        return _fail("cannot draw the gate %s of %s on %s: %s" % (gate_name, gating_file, path, e))
    plot = _dot_plot(sub, dims, member, gate, "%s: %d of %d parent events (%.2f%%)" % (gate_name, count, parent_n, 100.0 * count / max(parent_n, 1)), "gate_" + _safe(gate_name))
    summary = "Drew gate %s on %s: %d of %d parent events inside (%.2f%%). Compensation %s." % (gate_name, " and ".join(dims), count, parent_n, 100.0 * count / max(parent_n, 1), compensation)
    return {"ok": True, "summary": summary, "metrics": {"count": count, "parent_count": parent_n, "percent_of_parent": 100.0 * count / max(parent_n, 1)}, "outputs": [_out(plot)]}


def count_rectangle(path, x_channel, x_min=None, x_max=None, y_channel=None, y_min=None, y_max=None, compensation="none", matrix_path=None,
                    transform="none", transform_t=262144.0, transform_w=0.5, transform_m=4.5, transform_a=0.0, ignore_offset_error=False):
    if compensation == "gating_file":
        compensation = "none"
    try:
        s = _sample(path, ignore_offset_error)
        xf = _transform(transform, transform_t, transform_w, transform_m, transform_a)
        matrix = _matrix(s, compensation, matrix_path)
        gs = fk.GatingStrategy()
        cref = "uncompensated" if matrix is None else "FCS" if compensation == "fcs" else "ga_matrix"
        if compensation == "csv":
            gs.add_comp_matrix("ga_matrix", matrix)
        xref = None
        if xf is not None:
            gs.add_transform("ga_transform", xf)
            xref = "ga_transform"
        dims = [fk.Dimension(x_channel, compensation_ref=cref, transformation_ref=xref, range_min=x_min, range_max=x_max)]
        if y_channel:
            dims.append(fk.Dimension(y_channel, compensation_ref=cref, transformation_ref=xref, range_min=y_min, range_max=y_max))
        if all(d.min is None and d.max is None for d in dims):
            return _fail("give at least one limit")
        gate = fk.gates.RectangleGate("rectangle", dims)
        gs.add_gate(gate, ("root",))
        results = gs.gate_sample(s)
        inside = results.get_gate_membership("rectangle")
        events = gs._preprocess_sample_events(s, gate)
    except Exception as e:
        return _fail("cannot count the rectangle gate on %s in %s: %s" % (x_channel, path, e))
    count = int(inside.sum())
    pct = 100.0 * count / s.event_count
    ids = [d.id for d in dims]
    plot = _dot_plot(events, ids, inside, gate, "rectangle: %d of %d events (%.2f%%), %s" % (count, s.event_count, pct, transform), "rectangle")
    summary = "Rectangle gate on %s with compensation %s and transform %s: %d of %d events (%.3f%%)." % (" and ".join(ids), compensation, transform, count, s.event_count, pct)
    return {"ok": True, "summary": summary, "metrics": {"count": count, "n_events": s.event_count, "percent": pct}, "outputs": [_out(plot)]}
