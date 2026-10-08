import csv
import os
import time

FDR_LEVELS = (0.05, 0.1, 0.2, 0.5)
_sm = None


def _client():
    global _sm
    if _sm is None:
        from metaspace import SMInstance

        _sm = SMInstance()
        if _sm.logged_in():
            raise RuntimeError("a METASPACE login was found on this computer. This adapter reads public data only. Remove the login and run again")
    return _sm


def _retry(fn, tries=3):
    for i in range(tries):
        try:
            return fn()
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


def _fail(msg):
    return {"ok": False, "error": msg}


def _dataset(dataset_id):
    return _retry(lambda: _client().dataset(id=dataset_id))


def _database(database, version):
    return (database, version) if version else database


def _db_label(database, version):
    return "%s %s" % (database, version) if version else database


def _check_fdr(fdr):
    if fdr not in FDR_LEVELS:
        raise ValueError("fdr must be one of 0.05, 0.1, 0.2, 0.5, got %r" % (fdr,))


SEARCH_QUERY = """
query($f: DatasetFilter, $o: Int, $l: Int) {
  allDatasets(filter: $f, offset: $o, limit: $l) {
    id name uploadDT status organism organismPart condition polarity maldiMatrix ionisationSource
    submitter { name }
    group { shortName }
    analyzer { type resolvingPower(mz: 400) }
    databases { name version }
  }
}
"""


def search_datasets(name=None, organism=None, polarity=None, submitter=None, maldi_matrix=None, analyzer_type=None, ionisation_source=None, group=None, limit=20):
    flt = {}
    if name:
        flt["name"] = name
    if organism:
        flt["organism"] = organism
    if polarity:
        flt["polarity"] = polarity.upper()
    if maldi_matrix:
        flt["maldiMatrix"] = maldi_matrix
    if analyzer_type:
        flt["analyzerType"] = analyzer_type
    if ionisation_source:
        flt["ionisationSource"] = ionisation_source
    gq = _client()._gqclient
    if group:
        hits = _retry(lambda: gq.query("query($q: String){allGroups(query: $q, limit: 5){id name}}", {"q": group}))["allGroups"] or []
        if not hits:
            return _fail("no group matches %r" % group)
        flt["group"] = hits[0]["id"]
    page, scan_cap = 100, 1500
    found, scanned = [], 0
    while scanned < scan_cap and len(found) < limit:
        rows = _retry(lambda: gq.query(SEARCH_QUERY, {"f": flt, "o": scanned, "l": page}))["allDatasets"]
        if not rows:
            break
        scanned += len(rows)
        for r in rows:
            if r["status"] != "FINISHED":
                continue
            if submitter and submitter.lower() not in (r["submitter"] or {}).get("name", "").lower():
                continue
            found.append(r)
            if len(found) >= limit:
                break
        if len(rows) < page:
            break
        time.sleep(0.5)
    columns = ["id", "name", "organism", "organism_part", "polarity", "matrix", "analyzer", "resolving_power_400", "submitter", "group", "uploaded"]
    table_rows = [
        [
            r["id"], r["name"], r["organism"], r["organismPart"], r["polarity"], r["maldiMatrix"],
            (r["analyzer"] or {}).get("type"), (r["analyzer"] or {}).get("resolvingPower"),
            (r["submitter"] or {}).get("name"), (r["group"] or {}).get("shortName"), (r["uploadDT"] or "")[:10],
        ]
        for r in found
    ]
    capped = scanned >= scan_cap and len(found) < limit
    return {
        "n_found": len(found),
        "n_scanned": scanned,
        "scan_capped": capped,
        "warning": "The search read only the newest %d datasets that match the filters. Add a filter to narrow it." % scan_cap if capped else "",
        "table": {"columns": columns, "rows": table_rows, "n_rows": len(table_rows)},
    }


def get_dataset_info(dataset_id):
    try:
        ds = _dataset(dataset_id)
    except Exception as e:
        return _fail("dataset not found or not public: %s" % e)
    md = ds.metadata
    ms = md.get("MS_Analysis", {})
    rp = ms.get("Detector_Resolving_Power", {})
    sample = md.get("Sample_Information", {})
    prep = md.get("Sample_Preparation", {})
    cfg = ds.config
    iso = cfg.get("isotope_generation", {})
    return {
        "id": ds.id,
        "name": ds.name,
        "status": ds.status,
        "submitter": (ds.submitter or {}).get("name"),
        "group": (ds.group or {}).get("name"),
        "projects": [p["name"] for p in (ds.projects or [])],
        "organism": sample.get("Organism"),
        "organism_part": sample.get("Organism_Part"),
        "condition": sample.get("Condition"),
        "polarity": ms.get("Polarity"),
        "ionisation_source": ms.get("Ionisation_Source"),
        "analyzer": ms.get("Analyzer"),
        "resolving_power": rp.get("Resolving_Power"),
        "resolving_power_mz": rp.get("mz"),
        "pixel_size": ms.get("Pixel_Size"),
        "maldi_matrix": prep.get("MALDI_Matrix"),
        "matrix_application": prep.get("MALDI_Matrix_Application"),
        "databases": [{"name": d.name, "version": d.version} for d in ds.database_details],
        "adducts": iso.get("adducts"),
        "charge": iso.get("charge"),
        "n_peaks": iso.get("n_peaks"),
        "ppm": cfg.get("image_generation", {}).get("ppm"),
        "decoy_sample_size": cfg.get("fdr", {}).get("decoy_sample_size"),
        "image_size": list(ds.image_size()) if callable(getattr(ds, "image_size", None)) else None,
    }


def list_databases():
    dbs = _retry(lambda: _client().databases())
    rows = [[d.id, d.name, d.version] for d in dbs]
    return {"n_databases": len(rows), "table": {"columns": ["id", "name", "version"], "rows": rows, "n_rows": len(rows)}}


def _results(ds, database, version, fdr):
    df = _retry(lambda: ds.results(database=_database(database, version), fdr=fdr))
    return df


def list_annotations(dataset_id, database="HMDB", database_version="v4", fdr=0.1, exclude_off_sample=False, adduct=""):
    try:
        _check_fdr(fdr)
        ds = _dataset(dataset_id)
        df = _results(ds, database, database_version, fdr)
    except Exception as e:
        return _fail(str(e))
    df = df.reset_index()
    n_all = len(df)
    n_off = int(df["offSample"].fillna(False).sum()) if n_all else 0
    if adduct:
        df = df[df["adduct"] == adduct]
    if exclude_off_sample:
        df = df[~df["offSample"].fillna(False).astype(bool)]
    df = df.sort_values("msm", ascending=False)
    columns = ["formula", "adduct", "mz", "msm", "fdr", "off_sample", "molecule_names"]
    rows = []
    for _, r in df.iterrows():
        names = r["moleculeNames"] if isinstance(r["moleculeNames"], list) else []
        rows.append([r["formula"], r["adduct"], round(float(r["mz"]), 5), round(float(r["msm"]), 4), float(r["fdr"]), bool(r["offSample"]), "; ".join(names[:5])])
    path = os.path.join(os.getcwd(), "annotations_%s_%s_fdr%g.csv" % (dataset_id, _db_label(database, database_version).replace(" ", "_"), fdr))
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(columns)
        w.writerows(rows)
    return {
        "dataset_id": dataset_id,
        "database": _db_label(database, database_version),
        "fdr_max": fdr,
        "n_annotations": len(rows),
        "n_off_sample_in_fdr_set": n_off,
        "n_in_fdr_set": n_all,
        "off_sample_excluded": bool(exclude_off_sample),
        "level": "sum formula plus adduct (putative; not a structure)",
        "table": {"columns": columns, "rows": rows[:12], "n_rows": len(rows), "path": path},
    }


def compare_fdr_counts(dataset_id, database="HMDB", database_version="v4", exclude_off_sample=False):
    try:
        ds = _dataset(dataset_id)
        df = _results(ds, database, database_version, 0.2).reset_index()
    except Exception as e:
        return _fail(str(e))
    off = df["offSample"].fillna(False).astype(bool)
    out = {"dataset_id": dataset_id, "database": _db_label(database, database_version), "off_sample_excluded": bool(exclude_off_sample)}
    rows = []
    for level in (0.05, 0.1, 0.2):
        sel = df["fdr"] <= level + 1e-9
        n = int((sel & ~off).sum()) if exclude_off_sample else int(sel.sum())
        n_off = int((sel & off).sum())
        key = "n_fdr_%02d" % round(level * 100)
        out[key] = n
        out["n_off_sample_fdr_%02d" % round(level * 100)] = n_off
        rows.append(["%d%%" % round(level * 100), n, n_off])
    out["ratio_fdr20_to_fdr05"] = round(out["n_fdr_20"] / out["n_fdr_05"], 2) if out["n_fdr_05"] else None
    out["table"] = {"columns": ["FDR", "annotations", "off_sample"], "rows": rows, "n_rows": 3}
    return out


def get_ion_image(dataset_id, formula, adduct, hotspot_clipping=True):
    try:
        ds = _dataset(dataset_id)
        imgs = _retry(lambda: ds.isotope_images(formula, adduct, only_first_isotope=True, hotspot_clipping=hotspot_clipping))
    except Exception as e:
        return _fail("no ion image for %s%s in %s: %s" % (formula, adduct, dataset_id, e))
    import numpy as np
    from matplotlib import colormaps
    from PIL import Image

    if len(imgs) == 0:
        return _fail("no ion image for %s%s in %s" % (formula, adduct, dataset_id))
    a = np.asarray(imgs[0], dtype=float)
    a = np.nan_to_num(a, nan=0.0)
    top = float(a.max())
    norm = a / top if top > 0 else a
    rgba = (colormaps["viridis"](norm) * 255).astype("uint8")
    rgba[..., 3] = 255
    path = os.path.join(os.getcwd(), "ion_image_%s_%s%s.png" % (dataset_id, formula, adduct))
    Image.fromarray(rgba).save(path)
    return {
        "dataset_id": dataset_id,
        "ion": "%s%s" % (formula, adduct),
        "width": int(a.shape[1]),
        "height": int(a.shape[0]),
        "n_pixels_with_signal": int((a > 0).sum()),
        "max_intensity": top,
        "hotspot_clipping": bool(hotspot_clipping),
        "path": path,
    }
