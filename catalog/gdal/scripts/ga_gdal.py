import argparse
import warnings
import csv
import json
import os
import shutil
import subprocess
import sys

warnings.filterwarnings("ignore")
BIN = os.path.dirname(os.environ.get("CUVETTE_PROGRAM_PATH") or "") or "/opt/homebrew/bin"
CALL_DIR = os.environ.get("CUVETTE_CALL_DIR", ".")


def exe(name):
    p = os.path.join(BIN, name)
    return p if os.path.exists(p) else shutil.which(name) or name


def run(argv, env=None):
    r = subprocess.run(argv, capture_output=True, text=True, env={**os.environ, **(env or {})})
    if r.returncode != 0:
        sys.exit((r.stderr or r.stdout).strip()[:2000] or f"{argv[0]} failed")
    return r.stdout


def quote(a):
    return a if a and all(c.isalnum() or c in "@%+=:,./_-" for c in a) else "'" + a.replace("'", "'\\''") + "'"


def line(argv):
    return " ".join(quote(os.path.basename(argv[0]) if i == 0 else a) for i, a in enumerate(argv))


def epsg_of(info):
    try:
        return info["stac"]["proj:epsg"]
    except KeyError:
        pass
    cs = info.get("coordinateSystem", {}).get("wkt", "")
    i = cs.rfind('ID["EPSG",')
    if i >= 0:
        return int(cs[i + 10 : cs.index("]", i)])
    return None


def raster_facts(path, band=1, stats=True):
    argv = [exe("gdalinfo"), "-json"] + (["-stats"] if stats else []) + [path]
    info = json.loads(run(argv, {"GDAL_PAM_ENABLED": "NO"}))
    w, h = info["size"]
    gt = info["geoTransform"]
    m = {"width": w, "height": h, "n_bands": len(info["bands"]), "pixel_x": gt[1], "pixel_y": abs(gt[5]),
         "origin_x": gt[0], "origin_y": gt[3]}
    e = epsg_of(info)
    if e:
        m["epsg"] = e
    b = info["bands"][band - 1]
    if "noDataValue" in b:
        m["nodata"] = b["noDataValue"]
    for k, name in (("minimum", "min"), ("maximum", "max"), ("mean", "mean"), ("stdDev", "stddev")):
        if k in b:
            m[name] = b[k]
    data = {"crs_name": info.get("coordinateSystem", {}).get("wkt", "").split('"')[1] if info.get("coordinateSystem") else None,
            "driver": info.get("driverShortName"), "type": b.get("type"), "corner_ul": info["cornerCoordinates"]["upperLeft"],
            "corner_lr": info["cornerCoordinates"]["lowerRight"]}
    return m, data


def out_path(ext):
    return os.environ.get("CUVETTE_OUTPUT_RESULT") or os.path.join(CALL_DIR, "result" + ext)


def emit(metrics, data=None, route="", **extra):
    o = {"ok": True, "metrics": metrics, "data": data or {}}
    if route:
        o["manualRoute"] = route
    o.update(extra)
    print(json.dumps(o))


def cmd_raster_info(a):
    m, d = raster_facts(a.path, a.band, not a.no_stats)
    argv = [exe("gdalinfo"), "-stats", a.path]
    emit(m, d, line(argv))


def cmd_vector_info(a):
    argv = [exe("ogrinfo"), "-json", "-so", "-al", a.path]
    if a.layer:
        argv = [exe("ogrinfo"), "-json", "-so", a.path, a.layer]
    info = json.loads(run(argv))
    lay = info["layers"][0]
    g = lay["geometryFields"][0] if lay.get("geometryFields") else {}
    ext = g.get("extent", [])
    m = {"n_features": lay.get("featureCount", 0), "n_layers": len(info["layers"]), "n_fields": len(lay.get("fields", []))}
    e = None
    crs = g.get("coordinateSystem", {})
    if isinstance(crs.get("projjson"), dict):
        i = crs["projjson"].get("id", {})
        if i.get("authority") == "EPSG":
            e = i.get("code")
    if e:
        m["epsg"] = e
    for k, v in zip(("xmin", "ymin", "xmax", "ymax"), ext):
        m[k] = v
    emit(m, {"layer": lay.get("name"), "geometry_type": g.get("type"), "fields": [f["name"] for f in lay.get("fields", [])]}, line(argv))


def warp_args(a):
    argv = [exe("gdalwarp"), "-overwrite", "-of", "GTiff", "-t_srs", a.target_crs, "-r", a.resampling]
    if a.pixel_size:
        argv += ["-tr", str(float(a.pixel_size)), str(float(a.pixel_size))]
    if a.src_nodata not in (None, ""):
        argv += ["-srcnodata", a.src_nodata]
    if a.dst_nodata not in (None, ""):
        argv += ["-dstnodata", a.dst_nodata]
    return argv


def cmd_reproject_raster(a):
    out = out_path(".tif")
    argv = warp_args(a) + [a.path, out]
    run(argv)
    m, d = raster_facts(out)
    sm, _ = raster_facts(a.path)
    m["src_width"] = sm["width"]
    m["src_height"] = sm["height"]
    emit(m, d, line(argv))


def cmd_calc_raster(a):
    out = out_path(".tif")
    argv = [exe("gdal_calc"), "-A", a.path, "--outfile", out, "--calc", a.expression, "--overwrite", "--type", a.type, "--quiet"]
    if a.nodata not in (None, ""):
        argv += ["--NoDataValue", a.nodata]
    run(argv)
    m, d = raster_facts(out)
    emit(m, d, line(argv))


def cmd_reproject_vector(a):
    out = out_path(".gpkg")
    if os.path.exists(out):
        os.remove(out)
    argv = [exe("ogr2ogr"), "-f", "GPKG", "-t_srs", a.target_crs, out, a.path]
    run(argv)
    sub = argparse.Namespace(path=out, layer=None)
    cmd_vector_info(sub)


STATS = ["count", "min", "max", "mean", "sum", "std", "median"]


def cmd_zonal_stats(a):
    import geopandas as gpd
    import rasterio
    from rasterstats import zonal_stats

    with rasterio.open(a.raster) as src:
        rcrs = src.crs
        nodata = src.nodatavals[a.band - 1] if 1 <= a.band <= src.count else src.nodata
    zones = gpd.read_file(a.zones)
    if zones.crs is not None and rcrs is not None and zones.crs != rcrs:
        sys.exit(f"The zones use {zones.crs.to_string()} and the raster uses {rcrs.to_string()}. Reproject one of them first.")
    if a.nodata not in (None, ""):
        nodata = float(a.nodata)
    touched = a.pixels == "all_touched"
    res = zonal_stats(zones, a.raster, stats=STATS, all_touched=touched, nodata=nodata, band=a.band)
    idcol = a.id_field if a.id_field and a.id_field in zones.columns else None
    rows = []
    for i, r in enumerate(res):
        rows.append([zones[idcol].iloc[i] if idcol else i + 1] + [r[s] for s in STATS])
    path = os.path.join(CALL_DIR, "zonal_stats.csv")
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["zone"] + STATS)
        w.writerows(rows)
    zdata = [{"zone": row[0], **dict(zip(STATS, row[1:]))} for row in rows]
    first = zdata[0] if zdata else {}
    m = {"n_zones": len(rows)}
    for s in STATS:
        if first.get(s) is not None:
            m[s] = first[s]
    emit(m, {"zones": zdata, "pixels": a.pixels, "nodata": nodata, "raster_epsg": rcrs.to_epsg() if rcrs else None},
         f"rasterstats.zonal_stats('{a.zones}', '{a.raster}', all_touched={touched}, nodata={nodata})",
         table={"columns": ["zone"] + STATS, "rows": rows, "n_rows": len(rows), "path": path},
         outputs=[{"path": path, "kind": "table", "name": "zonal_stats.csv"}])


def cmd_plot_map(a):
    import matplotlib

    matplotlib.use("Agg")
    import geopandas as gpd
    import matplotlib.pyplot as plt
    import numpy as np
    import rasterio

    out = out_path(".png")
    fig, ax = plt.subplots(figsize=(6, 6))
    with rasterio.open(a.raster) as src:
        arr = src.read(a.band, masked=True)
        b = src.bounds
        im = ax.imshow(arr, extent=(b.left, b.right, b.bottom, b.top), cmap=a.colormap)
        fig.colorbar(im, ax=ax, shrink=0.7)
        crs = src.crs
    if a.zones:
        z = gpd.read_file(a.zones)
        if crs is not None and z.crs is not None and z.crs != crs:
            z = z.to_crs(crs)
        z.boundary.plot(ax=ax, color="black", linewidth=1)
    ax.set_title(a.title or os.path.basename(a.raster))
    ax.set_xlabel("x (" + (crs.to_string() if crs else "no CRS") + ")")
    fig.savefig(out, dpi=120, bbox_inches="tight")
    emit({"width_px": int(arr.shape[1]), "height_px": int(arr.shape[0]), "valid_pixels": int(np.ma.count(arr))},
         {"colormap": a.colormap}, f"Open {a.raster} in QGIS and add {a.zones or 'no zones'} as an outline layer",
         outputs=[{"path": out, "kind": "image", "name": "map.png"}])


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


add("raster_info", cmd_raster_info, "path", ("--band", {"type": int, "default": 1}), ("--no-stats", {"action": "store_true"}))
add("vector_info", cmd_vector_info, "path", ("--layer", {"default": ""}))
add("reproject_raster", cmd_reproject_raster, "path", "--target-crs", ("--resampling", {"default": "near"}),
    ("--pixel-size", {"default": None}), ("--src-nodata", {"default": None}), ("--dst-nodata", {"default": None}))
add("calc_raster", cmd_calc_raster, "path", "--expression", ("--nodata", {"default": None}), ("--type", {"default": "Float32"}))
add("reproject_vector", cmd_reproject_vector, "path", "--target-crs")
add("zonal_stats", cmd_zonal_stats, "raster", "zones", ("--pixels", {"default": "centers"}), ("--nodata", {"default": None}),
    ("--band", {"type": int, "default": 1}), ("--id-field", {"default": ""}))
add("plot_map", cmd_plot_map, "raster", ("--zones", {"default": ""}), ("--band", {"type": int, "default": 1}),
    ("--colormap", {"default": "viridis"}), ("--title", {"default": ""}))

args = p.parse_args()
args.fn(args)
