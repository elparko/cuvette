import os
import warnings

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

import MDAnalysis as mda
from MDAnalysis.analysis import align, rms
from MDAnalysis.analysis.hydrogenbonds import HydrogenBondAnalysis
from MDAnalysis.lib.distances import capped_distance

BACKBONE_NAMES = ("N", "CA", "C", "O")


def _path(p):
    q = os.path.expanduser(p)
    if not os.path.isfile(q):
        raise FileNotFoundError("file not found: %s" % p)
    return q


def _universe(topology, trajectory=None):
    top = _path(topology)
    if trajectory:
        return mda.Universe(top, _path(trajectory))
    return mda.Universe(top)


def _select(u, text, label):
    ag = u.select_atoms(text)
    if ag.n_atoms == 0:
        raise ValueError("%s selection '%s' matches no atoms" % (label, text))
    return ag


def _check_frame(u, frame, label="reference_frame"):
    if not -len(u.trajectory) <= frame < len(u.trajectory):
        raise ValueError("%s %d is outside 0..%d" % (label, frame, len(u.trajectory) - 1))


def _frames(u, start, stop, stride):
    return range(*slice(start, stop, stride).indices(len(u.trajectory)))


def _png(name):
    path = os.path.join(os.getcwd(), name + ".png")
    plt.savefig(path, dpi=100, bbox_inches="tight")
    plt.close("all")
    return path


def _csv(frame, name):
    path = os.path.join(os.getcwd(), name + ".csv")
    frame.to_csv(path, index=False)
    return path


def _preview(frame, path, limit=12):
    rows = frame.head(limit)
    clean = [[v.item() if hasattr(v, "item") else v for v in r] for r in rows.itertuples(index=False, name=None)]
    return {"columns": [str(c) for c in frame.columns], "rows": clean, "n_rows": int(len(frame)), "path": path}


def _output(path):
    kind = "image" if path.endswith(".png") else "table" if path.endswith(".csv") else "file"
    return {"path": path, "kind": kind, "name": os.path.basename(path)}


def _num(x):
    return float(x) if isinstance(x, (float, np.floating)) else int(x)


def _result(summary, metrics, paths, frame=None, data=None):
    out = {
        "ok": True,
        "summary": summary,
        "metrics": {k: _num(v) for k, v in metrics.items()},
        "outputs": [_output(p) for p in paths],
    }
    if frame is not None:
        out["table"] = _preview(frame, paths[0])
    if data:
        out["data"] = data
    return out


def _fail(message):
    return {"ok": False, "error": message}


def _line_plot(x, y, xlabel, ylabel, title, name):
    plt.figure(figsize=(6, 3.5))
    plt.plot(x, y, lw=1.2)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    plt.title(title)
    return _png(name)


def inspect_trajectory(topology, trajectory=None):
    u = _universe(topology, trajectory)
    n_frames = len(u.trajectory)
    dt = float(u.trajectory.dt) if n_frames > 1 else 0.0
    groups = {
        "protein": "protein",
        "backbone": "backbone",
        "protein_ca": "protein and name CA",
        "water": "resname SOL TIP3 TIP3P HOH WAT",
        "hydrogen": "name H*",
    }
    counts = {k: int(u.select_atoms(v).n_atoms) for k, v in groups.items()}
    has_box = bool(u.dimensions is not None and np.all(u.dimensions[:3] > 0))
    summary = "%d atoms, %d residues, %d frames, dt %.4g ps, box %s." % (u.atoms.n_atoms, u.residues.n_residues, n_frames, dt, "yes" if has_box else "no")
    metrics = {"n_atoms": u.atoms.n_atoms, "n_residues": u.residues.n_residues, "n_segments": u.segments.n_segments,
               "n_frames": n_frames, "dt_ps": dt, "has_box": int(has_box)}
    metrics.update({"n_" + k: v for k, v in counts.items()})
    data = {"segids": [str(s) for s in u.segments.segids], "selection_counts": counts, "mdanalysis": mda.__version__}
    return _result(summary, metrics, [], data=data)


def rmsd_trajectory(topology, trajectory, select, fit_select=None, fit=True, reference_frame=0, stride=1, start=0, stop=None):
    u = _universe(topology, trajectory)
    _select(u, select, "select")
    _check_frame(u, reference_frame)
    if reference_frame < 0:
        reference_frame += len(u.trajectory)
    fit_select = fit_select or select
    if fit:
        _select(u, fit_select, "fit_select")
        groups = None if fit_select == select else [select]
        run = rms.RMSD(u, u, select=fit_select, groupselections=groups, ref_frame=reference_frame).run(start=start, stop=stop, step=stride)
        col = 2 if groups is None else 3
        res = run.results.rmsd
    else:
        ag = u.select_atoms(select)
        u.trajectory[reference_frame]
        ref = ag.positions.astype(np.float64)
        rows = []
        for f in _frames(u, start, stop, stride):
            ts = u.trajectory[f]
            rows.append((f, ts.time, rms.rmsd(ag.positions.astype(np.float64), ref, center=False, superposition=False)))
        res = np.array(rows)
        col = 2
    frame = pd.DataFrame({"frame": res[:, 0].astype(int), "time_ps": res[:, 1], "rmsd_angstrom": res[:, col]})
    table = _csv(frame, "rmsd")
    plot = _line_plot(frame.time_ps, frame.rmsd_angstrom, "time (ps)", "RMSD (A)", "RMSD of '%s' to frame %d%s" % (select, reference_frame, "" if fit else ", no fit"), "rmsd")
    values = frame.rmsd_angstrom.values
    metrics = {"n_frames_used": len(frame), "rmsd_first": values[0], "rmsd_last": values[-1], "rmsd_mean": values.mean(),
               "rmsd_max": values.max(), "last_frame_index": int(frame.frame.iloc[-1]), "n_atoms_measured": u.select_atoms(select).n_atoms,
               "reference_frame": reference_frame, "fitted": int(fit)}
    summary = "RMSD of '%s' to frame %d, %s: last frame %.3f A over %d frames." % (select, reference_frame, "fit on '%s'" % fit_select if fit else "no fit", values[-1], len(frame))
    return _result(summary, metrics, [table, plot], frame)


def rmsf_per_residue(topology, trajectory, select="protein and name CA", fit_select=None, fit=True, reference_frame=0, stride=1, start=0, stop=None):
    u = _universe(topology, trajectory)
    _select(u, select, "select")
    _check_frame(u, reference_frame)
    ref = _universe(topology, trajectory)
    ref.trajectory[reference_frame]
    u.transfer_to_memory(start=start, stop=stop, step=stride)
    fit_select = fit_select or select
    if fit:
        _select(u, fit_select, "fit_select")
        align.AlignTraj(u, ref, select=fit_select, in_memory=True).run()
    ag = u.select_atoms(select)
    values = rms.RMSF(ag).run().results.rmsf
    frame = pd.DataFrame({"resid": ag.resids, "resname": ag.resnames, "atom": ag.names, "rmsf_angstrom": values})
    table = _csv(frame, "rmsf")
    plot = _line_plot(np.arange(len(values)), values, "atom index in selection", "RMSF (A)", "RMSF of '%s'" % select, "rmsf")
    top = frame.loc[frame.rmsf_angstrom.idxmax()]
    metrics = {"n_atoms": ag.n_atoms, "n_frames_used": len(u.trajectory), "rmsf_mean": values.mean(), "rmsf_max": values.max(),
               "resid_of_max": int(top.resid), "fitted": int(fit)}
    summary = "RMSF of '%s': mean %.3f A, max %.3f A at residue %d, %d frames." % (select, values.mean(), values.max(), int(top.resid), len(u.trajectory))
    return _result(summary, metrics, [table, plot], frame)


def radius_of_gyration(topology, trajectory, select="protein", stride=1, start=0, stop=None):
    u = _universe(topology, trajectory)
    ag = _select(u, select, "select")
    rows = []
    for f in _frames(u, start, stop, stride):
        ts = u.trajectory[f]
        rows.append((f, ts.time, ag.radius_of_gyration()))
    frame = pd.DataFrame(rows, columns=["frame", "time_ps", "rg_angstrom"])
    table = _csv(frame, "rgyr")
    plot = _line_plot(frame.time_ps, frame.rg_angstrom, "time (ps)", "radius of gyration (A)", "Radius of gyration of '%s'" % select, "rgyr")
    v = frame.rg_angstrom.values
    metrics = {"n_frames_used": len(frame), "rg_first": v[0], "rg_last": v[-1], "rg_mean": v.mean(), "rg_min": v.min(), "rg_max": v.max()}
    summary = "Radius of gyration of '%s' (mass weighted): mean %.3f A, last %.3f A over %d frames." % (select, v.mean(), v[-1], len(frame))
    return _result(summary, metrics, [table, plot], frame)


def count_contacts(topology, trajectory, select_a, select_b, cutoff, stride=1, start=0, stop=None):
    u = _universe(topology, trajectory)
    a = _select(u, select_a, "select_a")
    b = _select(u, select_b, "select_b")
    if len(a & b):
        return _fail("select_a and select_b share %d atoms. Use two groups with no common atoms." % len(a & b))
    rows = []
    for f in _frames(u, start, stop, stride):
        ts = u.trajectory[f]
        pairs = capped_distance(a.positions, b.positions, cutoff, box=ts.dimensions, return_distances=False)
        rows.append((f, ts.time, len(pairs), len(np.unique(a.resindices[pairs[:, 0]] * 1000003 + b.resindices[pairs[:, 1]]))))
    frame = pd.DataFrame(rows, columns=["frame", "time_ps", "n_atom_pairs", "n_residue_pairs"])
    table = _csv(frame, "contacts")
    plot = _line_plot(frame.time_ps, frame.n_atom_pairs, "time (ps)", "atom pairs within %.2f A" % cutoff, "Contacts between two groups", "contacts")
    v = frame.n_atom_pairs.values
    metrics = {"n_frames_used": len(frame), "pairs_first": v[0], "pairs_last": v[-1], "pairs_mean": v.mean(),
               "residue_pairs_mean": frame.n_residue_pairs.mean(), "n_atoms_a": a.n_atoms, "n_atoms_b": b.n_atoms}
    summary = "Atom pairs within %.2f A: mean %.2f, first %d, last %d over %d frames." % (cutoff, v.mean(), v[0], v[-1], len(frame))
    return _result(summary, metrics, [table, plot], frame)


def find_hydrogen_bonds(topology, trajectory, donors_sel, hydrogens_sel, acceptors_sel, d_a_cutoff=3.0, d_h_a_angle_cutoff=150.0, stride=1, start=0, stop=None):
    u = _universe(topology, trajectory)
    for text, label in ((donors_sel, "donors_sel"), (hydrogens_sel, "hydrogens_sel"), (acceptors_sel, "acceptors_sel")):
        _select(u, text, label)
    run = HydrogenBondAnalysis(u, donors_sel=donors_sel, hydrogens_sel=hydrogens_sel, acceptors_sel=acceptors_sel,
                               d_a_cutoff=d_a_cutoff, d_h_a_angle_cutoff=d_h_a_angle_cutoff, update_selections=False)
    run.run(start=start, stop=stop, step=stride)
    hb = run.results.hbonds
    frames = list(_frames(u, start, stop, stride))
    counts = pd.Series(hb[:, 0].astype(int)).value_counts().reindex(frames, fill_value=0).sort_index()
    frame = pd.DataFrame({"frame": counts.index, "n_hydrogen_bonds": counts.values})
    table = _csv(frame, "hbonds_per_frame")
    events = pd.DataFrame({
        "frame": hb[:, 0].astype(int),
        "donor_resid": u.atoms[hb[:, 1].astype(int)].resids,
        "donor": u.atoms[hb[:, 1].astype(int)].names,
        "acceptor_resid": u.atoms[hb[:, 3].astype(int)].resids,
        "acceptor": u.atoms[hb[:, 3].astype(int)].names,
        "distance_angstrom": hb[:, 4],
        "angle_degrees": hb[:, 5],
    })
    events_path = _csv(events, "hbond_events")
    plot = _line_plot(frame.frame, frame.n_hydrogen_bonds, "frame", "hydrogen bonds", "Hydrogen bonds per frame", "hbonds")
    pairs = len(set(zip(hb[:, 1].astype(int), hb[:, 3].astype(int))))
    v = frame.n_hydrogen_bonds.values
    metrics = {"n_frames_used": len(frame), "hbonds_first": v[0], "hbonds_last": v[-1], "hbonds_mean": v.mean(),
               "n_events": len(events), "n_unique_donor_acceptor_pairs": pairs}
    summary = "Hydrogen bonds (donor-acceptor %.2f A, angle %.0f degrees): mean %.2f per frame, %d unique pairs over %d frames." % (d_a_cutoff, d_h_a_angle_cutoff, v.mean(), pairs, len(frame))
    return _result(summary, metrics, [table, events_path, plot], frame)


def _structure(path):
    from Bio.PDB import MMCIFParser, PDBParser

    p = _path(path)
    parser = MMCIFParser(QUIET=True) if p.lower().endswith((".cif", ".mmcif")) else PDBParser(QUIET=True)
    return parser.get_structure(os.path.basename(p), p)


def _kind(residue):
    flag = residue.id[0]
    if flag == " ":
        return "standard"
    return "water" if flag == "W" else "hetero"


def inspect_structure(path):
    s = _structure(path)
    models = list(s)
    model = models[0]
    chains = {}
    metrics = {"n_models": len(models), "n_chains": len(model), "n_atoms_model0": sum(1 for _ in model.get_atoms())}
    for chain in model:
        kinds = [_kind(r) for r in chain]
        n_std = kinds.count("standard")
        std = [int(r.id[1]) for r in chain if _kind(r) == "standard"]
        chains[chain.id] = {"residues": n_std, "hetero": kinds.count("hetero"), "water": kinds.count("water"),
                            "first": std[0] if std else None, "last": std[-1] if std else None}
        metrics["residues_" + str(chain.id)] = n_std
        metrics["hetero_" + str(chain.id)] = kinds.count("hetero")
        metrics["water_" + str(chain.id)] = kinds.count("water")
    summary = "%d model(s), chains %s. Standard residues per chain: %s." % (len(models), ", ".join(map(str, chains)), ", ".join("%s %d" % (k, v["residues"]) for k, v in chains.items()))
    return _result(summary, metrics, [], data={"chains": chains})


def _atom(model, chain, resid, name):
    try:
        return model[chain][(" ", int(resid), " ")][name]
    except KeyError:
        raise KeyError("atom %s of residue %s in chain %s not found" % (name, resid, chain))


def measure_distance(path, chain_a, resid_a, atom_a, chain_b, resid_b, atom_b, model=0):
    s = _structure(path)
    m = s[model]
    a = _atom(m, chain_a, resid_a, atom_a)
    b = _atom(m, chain_b, resid_b, atom_b)
    d = float(a - b)
    summary = "Distance %s%s:%s to %s%s:%s is %.3f A (model %d)." % (chain_a, resid_a, atom_a, chain_b, resid_b, atom_b, d, model)
    return _result(summary, {"distance_angstrom": d}, [])


def superpose_structures(mobile_path, reference_path, mobile_chain, reference_chain, fit_atoms="CA", mobile_model=0, reference_model=0):
    from Bio.PDB import PDBIO, Superimposer

    names = BACKBONE_NAMES if fit_atoms == "backbone" else (fit_atoms,)
    mc = _structure(mobile_path)[mobile_model][mobile_chain]
    rc = _structure(reference_path)[reference_model][reference_chain]
    ref_ids = {r.id for r in rc if _kind(r) == "standard"}
    mob_ids = {r.id for r in mc if _kind(r) == "standard"}
    moving, fixed, skipped = [], [], 0
    for r in mc:
        if _kind(r) != "standard" or r.id not in ref_ids:
            continue
        q = rc[r.id]
        if all(n in r and n in q for n in names) and r.get_resname() == q.get_resname():
            for n in names:
                moving.append(r[n])
                fixed.append(q[n])
        else:
            skipped += 1
    if len(moving) < 3:
        return _fail("fewer than 3 matching atoms. Check that the chains use the same residue numbers.")
    before = float(np.sqrt(np.mean([(a - b) ** 2 for a, b in zip(moving, fixed)])))
    sup = Superimposer()
    sup.set_atoms(fixed, moving)
    sup.apply(list(mc.get_atoms()))
    out = os.path.join(os.getcwd(), "superposed_chain_%s.pdb" % mobile_chain)
    io = PDBIO()
    io.set_structure(mc)
    io.save(out)
    only_mobile, only_ref = len(mob_ids - ref_ids), len(ref_ids - mob_ids)
    metrics = {"n_atoms_fitted": len(moving), "rmsd_before_fit": before, "rmsd_after_fit": float(sup.rms), "n_residues_skipped": skipped,
               "n_residues_only_mobile": only_mobile, "n_residues_only_reference": only_ref}
    summary = "Fitted %d %s atoms: RMSD %.3f A before the fit, %.3f A after the fit." % (len(moving), fit_atoms, before, sup.rms)
    if skipped or only_mobile or only_ref:
        summary += " Not fitted: %d residues with another name or a missing atom, %d residues only in the mobile chain, %d only in the reference chain." % (skipped, only_mobile, only_ref)
    return _result(summary, metrics, [out])
