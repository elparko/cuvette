# Run: uv run --with tifffile --with pyproj --with numpy python check_raster_warp_zones.py [data folder]
# No GDAL, rasterio or rasterstats. tifffile reads the pixels and GeoTIFF tags, numpy does the statistics and the
# zones, and pyproj (PROJ) repeats the output size rule of GDALSuggestedWarpOutput.
import json
import sys
from pathlib import Path

import numpy as np
import tifffile
from pyproj import Transformer

root = Path(sys.argv[1] if len(sys.argv) > 1 else "/Volumes/T7/guided-analysis/data/rouault-gdal-autotest")
with tifffile.TiffFile(root / "byte.tif") as tif:
    page = tif.pages[0]
    data = page.asarray().astype(float)
    scale = page.tags["ModelPixelScaleTag"].value
    tie = page.tags["ModelTiepointTag"].value
    keys = page.tags["GeoKeyDirectoryTag"].value
geokeys = {keys[i]: keys[i + 3] for i in range(4, len(keys), 4)}
h, w = data.shape
x0, y0, px, py = tie[3] - tie[0] * scale[0], tie[4] + tie[1] * scale[1], scale[0], scale[1]
print(f"width {w}, height {h}, ProjectedCSTypeGeoKey {geokeys.get(3072)}, pixel size {px} x {py} m")
print(f"min {data.min():.0f}, max {data.max():.0f}, mean {data.mean():.4f}, population std {data.std():.4f}, sample std {data.std(ddof=1):.4f}")

t = Transformer.from_crs(f"EPSG:{geokeys[3072]}", "EPSG:4326", always_xy=True)
steps = np.linspace(0, 1, 21)
edge = [(s * w, 0) for s in steps] + [(s * w, h) for s in steps] + [(0, s * h) for s in steps] + [(w, s * h) for s in steps]
cols, rows = np.array(edge).T
lon, lat = t.transform(x0 + cols * px, y0 - rows * py)
minx, maxx, miny, maxy = lon.min(), lon.max(), lat.min(), lat.max()
(dlon0, dlon1), (dlat0, dlat1) = t.transform([x0, x0 + w * px], [y0, y0 - h * py])
res = np.hypot(dlon1 - dlon0, dlat1 - dlat0) / np.hypot(w, h)
print(f"warp to EPSG:4326 (GDALSuggestedWarpOutput rule): {int((maxx - minx) / res + 0.5)} x {int((maxy - miny) / res + 0.5)}")

cx = x0 + (np.arange(w) + 0.5) * px
cy = y0 - (np.arange(h) + 0.5) * py
for f in json.loads((root / "zones.geojson").read_text())["features"]:
    ring = np.array(f["geometry"]["coordinates"][0])
    inside = ((cx[None, :] > ring[:, 0].min()) & (cx[None, :] < ring[:, 0].max())
              & (cy[:, None] > ring[:, 1].min()) & (cy[:, None] < ring[:, 1].max()))
    print(f"zone {f['properties']['id']}, pixel centers inside: {inside.sum()} pixels, mean {data[inside].mean():.3f}")
