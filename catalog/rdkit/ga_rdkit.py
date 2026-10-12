import csv
import math

import numpy as np
from rdkit import Chem, RDLogger, rdBase
from rdkit.Chem import Crippen, Descriptors, Lipinski, rdMolDescriptors
from rdkit.Chem.MolStandardize import rdMolStandardize

RDLogger.DisableLog("rdApp.*")
rdkit_version = rdBase.rdkitVersion

ESOL = {"intercept": 0.16, "logp": -0.63, "mw": -0.0062, "rb": 0.066, "ap": -0.74}
CUTOFFS = {"mw": 500.0, "logp": 5.0, "hbd": 5, "hba": 10}
FEATURES = ["logp", "mw", "rb", "ap"]


STORE = {}


def _keep(prefix, obj):
    name = "%s%d" % (prefix, len(STORE) + 1)
    STORE[name] = obj
    return name


def _get(name, cls):
    if isinstance(name, dict):
        name = name.get("handle") or name.get("id")
    obj = STORE.get(name)
    if not isinstance(obj, cls):
        raise KeyError("unknown %s %r. Run the earlier tool again (the ids are lost when the worker restarts)" % (cls.__name__, name))
    return obj


class Molecules:
    def __init__(self, ids, smiles, mols, target):
        self.ids = ids
        self.smiles = smiles
        self.mols = mols
        self.target = target

    def __repr__(self):
        return "Molecules(n=%d)" % len(self.mols)


class DescriptorTable:
    def __init__(self, ids, smiles, columns, target, logp_method, hbd_hba):
        self.ids = ids
        self.smiles = smiles
        self.columns = columns
        self.target = target
        self.logp_method = logp_method
        self.hbd_hba = hbd_hba

    def __repr__(self):
        return "Descriptors(n=%d, hbd_hba=%s)" % (len(self.ids), self.hbd_hba)


def _find(row, name):
    name = name.strip().strip("'\"")
    for key in row:
        if key.strip().lower() == name.strip().lower():
            return key
    raise KeyError("no column named %r. Columns: %s" % (name, ", ".join(row.keys())))


def load_molecules(path, smiles_column="smiles", id_column=None, target_column=None, salts="keep", invalid="stop"):
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise ValueError("the file has no rows")
    s_key = _find(rows[0], smiles_column)
    i_key = _find(rows[0], id_column) if id_column else None
    t_key = _find(rows[0], target_column) if target_column else None
    chooser = rdMolStandardize.LargestFragmentChooser() if salts == "largest_fragment" else None
    ids, smiles, mols, target, bad, no_target = [], [], [], [], [], []
    for n, row in enumerate(rows):
        smi = row[s_key].strip()
        mol = Chem.MolFromSmiles(smi)
        label = row[i_key].strip() if i_key else str(n + 1)
        if t_key and mol is not None:
            try:
                value = float(row[t_key])
            except ValueError:
                value = float("nan")
            if value != value:
                no_target.append(label)
                continue
        if mol is None:
            bad.append(label)
            continue
        if chooser:
            mol = chooser.choose(mol)
        ids.append(label)
        smiles.append(Chem.MolToSmiles(mol))
        mols.append(mol)
        if t_key:
            target.append(value)
    if bad and invalid == "stop":
        raise ValueError("%d of %d SMILES cannot be parsed (first: %s). Set invalid to report_and_drop to drop them." % (len(bad), len(rows), ", ".join(bad[:5])))
    n_multi = sum(1 for m in mols if len(Chem.GetMolFrags(m)) > 1)
    out = {
        "molecules": _keep("mol", Molecules(ids, smiles, mols, target if t_key else None)),
        "n_read": len(rows),
        "n_parsed": len(mols),
        "n_invalid": len(bad),
        "n_no_target": len(no_target),
        "no_target_ids": no_target[:20],
        "n_multi_fragment": n_multi,
        "invalid_ids": bad[:20],
        "salts": salts,
        "rdkit_version": rdkit_version,
        "invalid_handling": invalid,
    }
    return out


def _hbd_hba(mol, definition):
    if definition == "rdmoldescriptors":
        return rdMolDescriptors.CalcNumHBD(mol), rdMolDescriptors.CalcNumHBA(mol)
    return Lipinski.NHOHCount(mol), Lipinski.NOCount(mol)


def _aromatic_proportion(mol):
    n = mol.GetNumHeavyAtoms()
    return sum(1 for a in mol.GetAtoms() if a.GetIsAromatic()) / n if n else 0.0


def compute_descriptors(molecules, logp_method="crippen", hbd_hba="lipinski"):
    molecules = _get(molecules, Molecules)
    cols = {k: [] for k in ["mw", "logp", "tpsa", "hbd", "hba", "rb", "ap"]}
    for m in molecules.mols:
        d, a = _hbd_hba(m, hbd_hba)
        cols["mw"].append(Descriptors.MolWt(m))
        cols["logp"].append(Crippen.MolLogP(m))
        cols["tpsa"].append(rdMolDescriptors.CalcTPSA(m))
        cols["hbd"].append(d)
        cols["hba"].append(a)
        cols["rb"].append(Lipinski.NumRotatableBonds(m))
        cols["ap"].append(_aromatic_proportion(m))
    desc = DescriptorTable(molecules.ids, molecules.smiles, cols, molecules.target, logp_method, hbd_hba)
    names = ["id", "smiles"] + list(cols) + (["measured"] if molecules.target else [])
    rows = []
    for i in range(len(molecules.ids)):
        r = [molecules.ids[i], molecules.smiles[i]] + [cols[k][i] for k in cols]
        if molecules.target:
            r.append(molecules.target[i])
        rows.append(r)
    with open("descriptors.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(names)
        w.writerows(rows)
    arr = {k: np.array(v, dtype=float) for k, v in cols.items()}
    return {
        "descriptors": _keep("desc", desc),
        "n_molecules": len(rows),
        "rdkit_version": rdkit_version,
        "mean_mw": float(arr["mw"].mean()),
        "mean_logp": float(arr["logp"].mean()),
        "mean_tpsa": float(arr["tpsa"].mean()),
        "mean_rotatable_bonds": float(arr["rb"].mean()),
        "mean_aromatic_proportion": float(arr["ap"].mean()),
        "table": {"columns": names, "rows": [[round(x, 4) if isinstance(x, float) else x for x in r] for r in rows[:8]], "n_rows": len(rows), "path": "descriptors.csv"},
    }


def rule_of_five(descriptors, cutoffs="lipinski_1997", allowed_violations=1):
    c = CUTOFFS
    descriptors = _get(descriptors, DescriptorTable)
    cols = descriptors.columns
    n = len(descriptors.ids)
    viol = [
        int(cols["mw"][i] > c["mw"]) + int(cols["logp"][i] > c["logp"]) + int(cols["hbd"][i] > c["hbd"]) + int(cols["hba"][i] > c["hba"])
        for i in range(n)
    ]
    v = np.array(viol)
    return {
        "n_molecules": n,
        "n_zero_violations": int((v == 0).sum()),
        "n_one_violation": int((v == 1).sum()),
        "n_two_or_more_violations": int((v >= 2).sum()),
        "n_pass": int((v <= allowed_violations).sum()),
        "n_fail": int((v > allowed_violations).sum()),
        "fraction_pass": float((v <= allowed_violations).mean()),
        "n_mw_over_500": int((np.array(cols["mw"]) > c["mw"]).sum()),
        "n_logp_over_5": int((np.array(cols["logp"]) > c["logp"]).sum()),
        "n_hbd_over_5": int((np.array(cols["hbd"]) > c["hbd"]).sum()),
        "n_hba_over_10": int((np.array(cols["hba"]) > c["hba"]).sum()),
        "allowed_violations": allowed_violations,
        "hbd_hba": descriptors.hbd_hba,
    }


def _scores(y, p):
    ss_res = float(((y - p) ** 2).sum())
    ss_tot = float(((y - y.mean()) ** 2).sum())
    r = float(np.corrcoef(y, p)[0, 1]) if len(y) > 2 else float("nan")
    return {"r2": 1 - ss_res / ss_tot if ss_tot > 0 else float("nan"), "r_squared_correlation": r * r, "rmse": math.sqrt(ss_res / len(y)), "n": int(len(y))}


def fit_solubility_model(descriptors, equation="published", test_fraction=0.2, seed=42, n_outliers=10):
    descriptors = _get(descriptors, DescriptorTable)
    if descriptors.target is None:
        raise ValueError("the molecules have no measured values. Load them with target_column.")
    cols = descriptors.columns
    y = np.array(descriptors.target, dtype=float)
    X = np.column_stack([cols[k] for k in FEATURES]).astype(float)
    ids = descriptors.ids
    if equation == "published":
        coef = np.array([ESOL[k] for k in FEATURES])
        pred = ESOL["intercept"] + X @ coef
        out = {"equation": "published", "intercept": ESOL["intercept"], "coef_logp": ESOL["logp"], "coef_mw": ESOL["mw"], "coef_rb": ESOL["rb"], "coef_ap": ESOL["ap"]}
        out.update({"all_" + k: v for k, v in _scores(y, pred).items()})
        resid = y - pred
    else:
        rng = np.random.default_rng(seed)
        order = rng.permutation(len(y))
        n_test = int(round(test_fraction * len(y)))
        test, train = order[:n_test], order[n_test:]
        A = np.column_stack([np.ones(len(train)), X[train]])
        beta, *_ = np.linalg.lstsq(A, y[train], rcond=None)
        pred = beta[0] + X @ beta[1:]
        out = {"equation": "refit", "seed": seed, "test_fraction": test_fraction, "intercept": float(beta[0])}
        out.update({"coef_" + k: float(b) for k, b in zip(FEATURES, beta[1:])})
        out.update({"train_" + k: v for k, v in _scores(y[train], pred[train]).items()})
        if n_test:
            out.update({"test_" + k: v for k, v in _scores(y[test], pred[test]).items()})
        resid = y - pred
        out["evaluated_on"] = "held-out test set" if n_test else "training data only"
    top = np.argsort(-np.abs(resid))[:n_outliers]
    out["outliers"] = [{"id": ids[i], "smiles": descriptors.smiles[i], "measured": float(y[i]), "predicted": float(pred[i]), "residual": float(resid[i])} for i in top]
    return out
