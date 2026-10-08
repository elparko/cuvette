import functools
import inspect
import os

if os.environ.get("GA_WORK_DIR"):
    os.environ["SMILE_MSI_MCP_OUT"] = os.environ["GA_WORK_DIR"]

from smile_msi import mcpserver, profiles, registry

ROUTES = {
    "list_slides": "File > Open analysis... shows the saved slides.",
    "slide_state": "No step. The Analyses... tab (File menu) shows the runs on a slide.",
    "analysis_catalog": "No step. The Analyze tab shows the same list of analyses.",
    "scripting_guide": "No step. Data > Analysis script... shows the same reference.",
    "run_result": "File > Analyses... > History > open the run.",
    "state": "Read the right panel (Display, Regions, Features) and Data > Acquisition & matching...",
    "find_peaks": "Analyze > This slide > Peaks > Find peaks > Run.",
    "find_peaks_spatial": "Analyze > This slide > Peaks > Find spatial features > Run.",
    "run_script": "Data > Analysis script... > paste the code > Run.",
    "send_regions": "Draw each region in the Regions panel and set its group.",
    "ion_image": "Ion image tab: click the m/z in the peak table. The Display panel sets the normalization.",
    "mean_spectrum": "Ion image tab: the spectrum plot.",
    "annotate": "Analyze > This slide > Annotation > Annotate lipids > Run.",
    "export_feature_table": "File > Export... (Export hub) > feature table.",
    "close_slide": "Open another slide, or close the program.",
    "apply_settings": "Data > Acquisition & matching... and the Display panel: Extraction tolerance (ppm), "
                      "Reduce (m/z window), Normalization. TIC amplification cap: Data > Analysis profiles... "
                      "> Apply to current sample.",
}
NO_ROUTE = "No manual route. This tool exists only in the agent and MCP interface."
CHECKED = ("ppm", "norm", "reduce", "tic_max_amp")
Q_LIMIT, AUC_LIMIT = 0.05, 0.7


def _check(key, value):
    p = profiles._BY_KEY[key]
    if p.kind == "choice":
        if str(value) not in p.choices:
            raise ValueError(f"{p.label} must be one of {list(p.choices)}")
        return str(value)
    v = float(value)
    if not (p.lo <= v <= p.hi):
        raise ValueError(f"{p.label} must be between {p.lo} and {p.hi}")
    return v


def apply_settings(ppm: float | None = None, norm: str | None = None, reduce: str | None = None,
                   tic_max_amp: float | None = None) -> dict:
    """Set the open slide's extraction settings: tolerance (ppm), normalization (tic, none, rms),
    window reducer (sum, max, mean) and the TIC amplification cap. Use it to apply the decision
    record to the slide. Returns what the settings were and what they are now."""
    slide = mcpserver._slide()
    api, ds = slide.api, slide.ds
    want = {"ppm": ppm, "norm": norm, "reduce": reduce, "tic_max_amp": tic_max_amp}
    was = {"ppm": api.ppm, "norm": api.norm, "reduce": api.reduce,
           "tic_max_amp": float(getattr(ds, "tic_max_amp", 3.0))}
    for key, value in want.items():
        if value is None:
            continue
        value = _check(key, value)
        if key == "tic_max_amp":
            if was[key] != value:
                ds.tic_max_amp = value
                if hasattr(ds, "_norm_cache"):
                    ds._norm_cache.clear()
        elif was[key] != value:
            setattr(api, key, value)
    now = {"ppm": api.ppm, "norm": api.norm, "reduce": api.reduce,
           "tic_max_amp": float(getattr(ds, "tic_max_amp", 3.0))}
    return {"was": was, "now": now, "changed": [k for k in CHECKED if was[k] != now[k]]}


def state() -> dict:
    """The open slide's live state: slide reference, regions with their groups and pixel counts,
    group sizes, the current extraction settings (ppm, norm, reduce, TIC cap) and the number
    of features in the working set. Works with no slide open."""
    if mcpserver._open["slide"] is None:
        return {"slide_open": False}
    slide = mcpserver._open["slide"]
    base = mcpserver.state()
    return {
        "slide_open": True,
        "ref": mcpserver._open["ref"],
        "source": slide.source,
        "n_pixels": int(slide.ds.n_pixels),
        "regions": [{"name": r["name"], "group": r.get("group"), "n_pixels": r.get("n_pixels")}
                    for r in base.get("regions", [])],
        "groups": base.get("resolved_groups", {}),
        "settings": apply_settings()["now"],
        "n_features": len(slide.api.get_features()),
        "mode": slide.ds.polarity if hasattr(slide.ds, "polarity") else None,
    }


def open_slide(ref: str = "demo", stride: int = 1, ppm: float | None = None, norm: str | None = None,
               reduce: str | None = None, tic_max_amp: float | None = None) -> dict:
    """Open a slide for analysis and keep it open. ref is a slide from list_slides, a path to an
    imzML or session file, or 'demo' for the synthetic slide. stride loads every Nth pixel; keep
    it 1 for real analysis. ppm, norm, reduce and tic_max_amp set the extraction settings right
    after the slide opens."""
    mcpserver.open_slide(ref, stride)
    out = state()
    if any(v is not None for v in (ppm, norm, reduce, tic_max_amp)):
        out["settings_change"] = apply_settings(ppm, norm, reduce, tic_max_amp)
        out["settings"] = out["settings_change"]["now"]
    return out


def _bound(fn, a, k):
    b = inspect.signature(fn).bind(*a, **k)
    b.apply_defaults()
    return dict(b.arguments)


def _step_route(args):
    step = registry.REGISTRY[args["step_id"]]
    slide = mcpserver._slide()
    given = dict(args.get("params") or {})
    shown = {**registry.default_params(step.id), **given}
    for key, value in (("tol_ppm", slide.api.ppm), ("norm", slide.api.norm)):
        if key in shown and key not in given:
            shown[key] = value
    parts = [f"Analyze > This slide > {step.category} > {step.name}."]
    if "ab" in step.needs:
        names = list(slide.api.groups)
        a, b = args.get("a") or names[0], args.get("b") or names[1]
        parts.append(f"Compare A = {a} vs B = {b}.")
    if args.get("mask"):
        parts.append(f"Run on ROIs: {args['mask']}.")
    fields = [f"{p.label} = {shown[p.name]}" for p in step.params if p.name in shown]
    if fields:
        parts.append("Settings: " + "; ".join(fields) + ".")
    return " ".join(parts + ["Press Run."])


def _route(name, args):
    if name == "run_analysis":
        return _step_route(args)
    if name == "find_peaks" and args.get("spatial"):
        name = "find_peaks_spatial"
    if name == "open_slide":
        return ("File > Load demo dataset." if str(args["ref"]).lower() in mcpserver._DEMO_REFS
                else f"File > Open imzML... > {args['ref']}.")
    return ROUTES.get(name, NO_ROUTE)


def _q_counts(path, args):
    import pandas as pd

    df = pd.read_csv(path)
    if "q_value" not in df.columns:
        return {}
    params = args.get("params") or {}
    ok = df["q_value"] <= float(params.get("max_q", Q_LIMIT))
    out = {"n_q_pass": int(ok.sum())}
    if "AUC" in df.columns:
        auc = df["AUC"].where(df["AUC"] >= 0.5, 1 - df["AUC"])
        out["n_q_auc_pass"] = int((ok & (auc >= float(params.get("min_auc", AUC_LIMIT)))).sum())
    return out


def _summary(name, args, out, m):
    if name == "run_analysis":
        a, b = args.get("a"), args.get("b")
        if args["step_id"] == "roi_comparison" and "n_q_pass" in m:
            who = f"{a} and {b}" if a and b else "the two groups"
            q = (args.get("params") or {}).get("max_q", Q_LIMIT)
            return f"Found {m['n_q_pass']} features different between {who} (q <= {q})."
        return f"{out['name']}: {out.get('summary') or 'done'}"
    if name == "find_peaks":
        kind = "spatial features" if args.get("spatial") else "peaks"
        return f"Found {out['n_features']} {kind} ({out['n_detected']} detected before any cap)."
    if name == "open_slide":
        return f"Opened {out['ref']}: {out['n_pixels']} pixels, {len(out['regions'])} regions."
    if name == "annotate":
        return f"Matched {m.get('n_matched', 0)} of {m.get('n_rows', 0)} features to a lipid ({args['mode']} mode)."
    if name == "run_script":
        return f"Script: {out['summary']}."
    if name == "apply_settings":
        return "Changed: " + (", ".join(out["changed"]) or "nothing") + "."
    if name == "state":
        return "Slide state read." if out.get("slide_open") else "No slide is open."
    if name == "ion_image":
        return f"Ion image of m/z {out['mz']} saved."
    return f"{name} finished."


def _decorate(name, args, out):
    if not isinstance(out, dict):
        out = {("slides" if name == "list_slides" else "analyses" if name == "analysis_catalog"
                else "text" if isinstance(out, str) else "result"): out}
    m = {k: out[k] for k in ("n_features", "n_detected", "working_features", "n_pixels")
         if isinstance(out.get(k), (int, float))}
    t = out.get("table")
    outputs = []
    if isinstance(t, dict) and "preview" in t:
        m["n_rows"] = t["n_rows"]
        if name == "run_analysis":
            m.update(_q_counts(t["csv"], args))
        if name == "annotate":
            import pandas as pd
            m["n_matched"] = int((pd.read_csv(t["csv"])["lipid"].fillna("") != "").sum())
        out["table"] = {"columns": t["columns"], "n_rows": t["n_rows"], "path": t["csv"],
                        "rows": [[r.get(c) for c in t["columns"]] for r in t["preview"]]}
        outputs.append({"path": t["csv"], "kind": "table"})
    for p in [out.get("png"), *(out.get("images") or [])]:
        if isinstance(p, str):
            outputs.append({"path": p, "kind": "image"})
    try:
        route = _route(name, args)
    except Exception:
        route = NO_ROUTE
    if isinstance(out.get("summary"), str):
        out["engine_summary"] = out["summary"]
    out.update(metrics=m, outputs=outputs, manual_route=route, summary=_summary(name, args, out, m))
    return out


def _wrap(fn):
    sig = inspect.signature(fn).replace(return_annotation=dict)

    @functools.wraps(fn)
    def run(*a, **k):
        args = _bound(fn, a, k)
        return _decorate(fn.__name__, args, fn(*a, **k))

    run.__signature__ = sig
    run.__annotations__ = {**fn.__annotations__, "return": dict}
    return run


def build_server():
    own = {"open_slide": open_slide, "state": state}
    tools = tuple((own.get(f.__name__, f), title, ro) for f, title, ro in mcpserver.TOOLS)
    tools += ((apply_settings, "Apply settings to the open slide", False),)
    mcpserver.TOOLS = tuple((_wrap(f), title, ro) for f, title, ro in tools)
    guard = mcpserver._guarded
    mcpserver._guarded = lambda fn: guard(fn if hasattr(fn, "__signature__") else _wrap(fn))
    return mcpserver.build_server()


if __name__ == "__main__":
    build_server().run("stdio")
