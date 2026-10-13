import argparse
import json
import os
import re
import sqlite3
import subprocess
import sys

QP = os.environ.get("CUVETTE_PROGRAM_PATH") or "qgis_process"
CALL_DIR = os.environ.get("CUVETTE_CALL_DIR", ".")
RESAMPLING = ["near", "bilinear", "cubic", "cubicspline", "lanczos", "average", "mode", "max", "min", "med", "q1", "q3"]
ZSTATS = ["count", "sum", "mean", "median", "stdev", "min", "max", "range", "minority", "majority", "variety", "variance"]


def out_path(ext):
    return os.environ.get("CUVETTE_OUTPUT_RESULT") or os.path.join(CALL_DIR, "result" + ext)


def quote(a):
    return a if a and all(c.isalnum() or c in "@%+=:,./_-" for c in a) else "'" + a.replace("'", "'\\''") + "'"


def qgis(algorithm, inputs):
    env = {**os.environ, "QT_QPA_PLATFORM": "offscreen", "LANG": "en_US.UTF-8", "PYTHONUTF8": "1"}
    try:
        r = subprocess.run([QP, "run", algorithm, "-"], input=json.dumps({"inputs": inputs}), capture_output=True, text=True, env=env)
    except OSError:
        sys.exit(f"{os.path.basename(QP)}: command not found. Install QGIS or set CUVETTE_QGIS_PROCESS to the path of qgis_process.")
    try:
        res = json.loads(r.stdout)
    except ValueError:
        sys.exit((r.stderr or r.stdout).strip()[-1500:] or "qgis_process failed")
    if r.returncode != 0:
        sys.exit(json.dumps(res.get("log", res))[-1500:])
    return res


def route(algorithm, inputs):
    pairs = " ".join(quote(f"--{k}={x}") for k, v in inputs.items() for x in (v if isinstance(v, list) else [v]))
    return f"qgis_process run {algorithm} {pairs}"


def emit(metrics, data, algorithm, inputs, **extra):
    print(json.dumps({"ok": True, "metrics": metrics, "data": data, "manualRoute": route(algorithm, inputs), **extra}))


def layer_table(path):
    con = sqlite3.connect(path)
    name = con.execute("select table_name from gpkg_contents where data_type='features'").fetchone()[0]
    cur = con.execute(f'select * from "{name}"')
    cols = [c[0] for c in cur.description]
    return name, cols, cur.fetchall(), con


def cmd_raster_statistics(a):
    inputs = {"INPUT": a.path, "BAND": a.band}
    r = qgis("native:rasterlayerstatistics", inputs)["results"]
    m = {k.lower(): v for k, v in r.items() if isinstance(v, (int, float))}
    emit(m, {"std_dev_kind": "sample (n - 1)"}, "native:rasterlayerstatistics", inputs)


def cmd_zonal_statistics(a):
    names = [s for s in a.stats.split(",") if s]
    bad = [s for s in names if s not in ZSTATS]
    if bad:
        sys.exit(f"Unknown statistic {bad[0]}. Use: {', '.join(ZSTATS)}")
    out = out_path(".gpkg")
    if os.path.exists(out):
        os.remove(out)
    inputs = {"INPUT": a.zones, "INPUT_RASTER": a.raster, "RASTER_BAND": a.band, "COLUMN_PREFIX": "z_",
              "STATISTICS": [ZSTATS.index(s) for s in names], "OUTPUT": out}
    qgis("native:zonalstatisticsfb", inputs)
    _, cols, rows, _ = layer_table(out)
    keep = [c for c in cols if c.startswith("z_")]
    idc = a.id_field if a.id_field in cols else None
    table_rows = [[(row[cols.index(idc)] if idc else i + 1)] + [row[cols.index(c)] for c in keep] for i, row in enumerate(rows)]
    zones = [dict(zip(["zone"] + [c[2:] for c in keep], r)) for r in table_rows]
    m = {"n_zones": len(rows)}
    m.update({k: v for k, v in (zones[0] if zones else {}).items() if k != "zone" and isinstance(v, (int, float))})
    emit(m, {"zones": zones}, "native:zonalstatisticsfb", inputs,
         table={"columns": ["zone"] + [c[2:] for c in keep], "rows": table_rows, "n_rows": len(rows), "path": out})


def cmd_reproject_layer(a):
    out = out_path(".gpkg")
    if os.path.exists(out):
        os.remove(out)
    inputs = {"INPUT": a.path, "TARGET_CRS": a.target_crs, "OUTPUT": out}
    qgis("native:reprojectlayer", inputs)
    name, cols, rows, con = layer_table(out)
    ext = con.execute("select min_x, min_y, max_x, max_y, srs_id from gpkg_contents where table_name=?", (name,)).fetchone()
    m = {"n_features": len(rows), "xmin": ext[0], "ymin": ext[1], "xmax": ext[2], "ymax": ext[3], "epsg": ext[4]}
    emit(m, {"layer": name}, "native:reprojectlayer", inputs)


def cmd_warp_raster(a):
    out = out_path(".tif")
    inputs = {"INPUT": a.path, "TARGET_CRS": a.target_crs, "RESAMPLING": RESAMPLING.index(a.resampling), "OUTPUT": out}
    if a.nodata not in (None, ""):
        inputs["NODATA"] = float(a.nodata)
    if a.pixel_size:
        inputs["TARGET_RESOLUTION"] = float(a.pixel_size)
    res = qgis("gdal:warpreproject", inputs)
    log = json.dumps(res.get("log", ""))
    mm = re.search(r"that is (\d+)P x (\d+)L", log)
    cmds = [c for c in re.findall(r'"(gdalwarp [^"]*)"', log)]
    m = {}
    if mm:
        m["width"], m["height"] = int(mm.group(1)), int(mm.group(2))
    emit(m, {"gdal_command": cmds[0] if cmds else ""}, "gdal:warpreproject", inputs)


p = argparse.ArgumentParser()
sp = p.add_subparsers(dest="cmd", required=True)


def add(name, fn, *opts):
    s = sp.add_parser(name)
    for o in opts:
        kw = {}
        if isinstance(o, tuple):
            o, kw = o
        s.add_argument(o, **kw)
    s.set_defaults(fn=fn)


add("raster_statistics", cmd_raster_statistics, "path", ("--band", {"type": int, "default": 1}))
add("zonal_statistics", cmd_zonal_statistics, "raster", "zones", ("--stats", {"default": "count,sum,mean,min,max"}),
    ("--band", {"type": int, "default": 1}), ("--id-field", {"default": ""}))
add("reproject_layer", cmd_reproject_layer, "path", "--target-crs")
add("warp_raster", cmd_warp_raster, "path", "--target-crs", ("--resampling", {"default": "near"}),
    ("--nodata", {"default": None}), ("--pixel-size", {"default": None}))

args = p.parse_args()
args.fn(args)
