import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const gdalinfo = await programOf("gdal");
const python = join(homedir(), ".cuvette/envs/gdal/bin/python");
const data = join(CATALOG, "gdal/data");
const byte = join(data, "byte.tif");
const zones = join(data, "zones.geojson");
const slow = 600_000;

// Hand computation with numpy, shapely and pyproj. The datum stays NAD27 (EPSG:4267), so that no datum shift grid changes the coordinates. The raster is read with rasterio. A pixel belongs to a polygon if its center is inside the polygon
// (centers), or if its square shares area with the polygon (all_touched). A square that only meets the polygon edge does not count. The standard deviation is the population value, as in GDAL and numpy.
const pixels = `
import numpy as np, rasterio, shapely
from shapely.geometry import shape, box
import json as js
def zone_values(raster, polygon, touched, nodata=None):
    with rasterio.open(raster) as src:
        a = src.read(1).astype(float); t = src.transform; nd = src.nodata if nodata is None else nodata
    rows, cols = a.shape
    out = []
    for r in range(rows):
        for c in range(cols):
            x0, y0 = t * (c, r); x1, y1 = t * (c + 1, r + 1)
            cell = box(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1))
            hit = cell.intersection(polygon).area > 0 if touched else polygon.contains(cell.centroid)
            if hit and not (nd is not None and a[r, c] == nd): out.append(a[r, c])
    v = np.array(out)
    return {"count": int(len(v)), "min": float(v.min()), "max": float(v.max()), "mean": float(v.mean()), "sum": float(v.sum()), "std": float(v.std()), "median": float(np.median(v))}
polys = [shape(f["geometry"]) for f in js.load(open(${JSON.stringify(zones)}))["features"]]
`;

describe.skipIf(!gdalinfo || !existsSync(python))("gdal adapter against numpy, shapely and pyproj", () => {
  let gdal: OpenAdapter;
  let root: string;
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "cuvette-gdal-"));
    gdal = await openAdapter("gdal");
  });
  afterAll(async () => {
    await gdal?.close();
    rmSync(root, { recursive: true, force: true });
  });

  test("zonal statistics with pixel centers and with all touched pixels agree with a pixel loop over the polygon", { timeout: slow }, async () => {
    const hand = await pyJson<Record<string, Record<string, number>>[]>(
      python,
      `${pixels}
print(js.dumps([{"centers": zone_values(${JSON.stringify(byte)}, p, False), "touched": zone_values(${JSON.stringify(byte)}, p, True)} for p in polys]))`,
    );
    for (const mode of ["centers", "all_touched"] as const) {
      const out = await gdal.run("zonal_stats", { raster: byte, zones, pixels: mode, id_field: "id" });
      out.data.data.zones.forEach((z: Record<string, number>, i: number) => {
        const want = hand[i][mode === "centers" ? "centers" : "touched"];
        expect(z.count).toBe(want.count);
        for (const k of ["min", "max", "mean", "sum", "std", "median"]) expect(Math.abs(z[k] - want[k])).toBeLessThan(1e-6);
      });
    }
  });

  test("a nodata value that the tool gets is skipped by raster statistics, zonal statistics and the raster algebra", { timeout: slow }, async () => {
    const file = join(root, "nodata.tif");
    const hand = await pyJson<{ mean: number; std: number; min: number; max: number; zone: Record<string, number>; double_mean: number; double_nodata: number }>(
      python,
      `${pixels}
from rasterio.transform import from_origin
rng = np.random.default_rng(3)
a = rng.uniform(1, 50, (20, 20)).astype("float32"); a[rng.random((20, 20)) < 0.25] = -9999
with rasterio.open(${JSON.stringify(file)}, "w", driver="GTiff", height=20, width=20, count=1, dtype="float32", crs="EPSG:26711", transform=from_origin(440720, 3751320, 60, 60), nodata=-9999) as dst: dst.write(a, 1)
v = a[a != -9999].astype(float)
zone = zone_values(${JSON.stringify(file)}, polys[0], False)
print(js.dumps({"mean": v.mean(), "std": v.std(), "min": v.min(), "max": v.max(), "zone": zone, "double_mean": 2 * v.mean(), "double_nodata": -9999}))`,
    );
    const info = await gdal.run("raster_info", { path: file });
    expect(info.metrics.nodata).toBe(-9999);
    expect(Math.abs(info.metrics.mean - hand.mean)).toBeLessThan(1e-3);
    expect(Math.abs(info.metrics.stddev - hand.std)).toBeLessThan(1e-3);
    expect(info.metrics.min).toBeCloseTo(hand.min, 4);
    expect(info.metrics.max).toBeCloseTo(hand.max, 4);
    const zonal = await gdal.run("zonal_stats", { raster: file, zones });
    expect(zonal.data.data.zones[0].count).toBe(hand.zone.count);
    expect(Math.abs(zonal.data.data.zones[0].mean - hand.zone.mean)).toBeLessThan(1e-4);
    const doubled = await gdal.run("calc_raster", { path: file, expression: "A*2" });
    expect(Math.abs(doubled.metrics.mean - hand.double_mean)).toBeLessThan(2e-3);
    expect(doubled.metrics.min).toBeGreaterThan(0);
  });

  test("the statistics of a raster with values near 1e-5 keep their digits", { timeout: slow }, async () => {
    const file = join(root, "small.tif");
    const hand = await pyJson<{ mean: number; std: number; min: number; max: number }>(
      python,
      `import numpy as np, rasterio
from rasterio.transform import from_origin
a = (np.random.default_rng(1).uniform(1, 50, (20, 20)) * 1e-5).astype("float32")
with rasterio.open(${JSON.stringify(file)}, "w", driver="GTiff", height=20, width=20, count=1, dtype="float32", crs="EPSG:26711", transform=from_origin(0, 100, 5, 5)) as dst: dst.write(a, 1)
v = a.astype(float)
print(json.dumps({"mean": v.mean(), "std": v.std(), "min": v.min(), "max": v.max()}))`,
    );
    const info = await gdal.run("raster_info", { path: file });
    for (const k of ["mean", "min", "max"] as const) expect(Math.abs(info.metrics[k] / hand[k] - 1)).toBeLessThan(1e-4);
    expect(Math.abs(info.metrics.stddev / hand.std - 1)).toBeLessThan(1e-4);
  });

  test("a raster that is warped to EPSG:4267 keeps its corners at the coordinates of pyproj", { timeout: slow }, async () => {
    const hand = await pyJson<{ west: number; north: number; east: number; south: number }>(
      python,
      `from pyproj import Transformer
t = Transformer.from_crs(26711, 4267, always_xy=True)
xs, ys = zip(*[t.transform(x, y) for x in range(440720, 441921, 60) for y in (3751320, 3750120)] + [t.transform(x, y) for y in range(3750120, 3751321, 60) for x in (440720, 441920)])
print(json.dumps({"west": min(xs), "east": max(xs), "north": max(ys), "south": min(ys)}))`,
    );
    const out = await gdal.run("reproject_raster", { path: byte, target_crs: "EPSG:4267", resampling: "near", pixel_size: "0.0001" });
    const px = out.metrics.pixel_x;
    expect(px).toBeCloseTo(0.0001, 10);
    expect(Math.abs(out.data.data.corner_ul[0] - hand.west)).toBeLessThan(px);
    expect(Math.abs(out.data.data.corner_ul[1] - hand.north)).toBeLessThan(px);
    expect(Math.abs(out.data.data.corner_lr[0] - hand.east)).toBeLessThan(px);
    expect(Math.abs(out.data.data.corner_lr[1] - hand.south)).toBeLessThan(px);
    expect(Math.abs(out.metrics.width * px - (hand.east - hand.west))).toBeLessThan(2 * px);
    expect(Math.abs(out.metrics.height * px - (hand.north - hand.south))).toBeLessThan(2 * px);
  });

  test("a vector file that is reprojected to EPSG:4267 has the extent of the pyproj coordinates of its vertices", { timeout: slow }, async () => {
    const hand = await pyJson<number[]>(
      python,
      `${pixels}
from pyproj import Transformer
t = Transformer.from_crs(26711, 4267, always_xy=True)
pts = [t.transform(x, y) for p in polys for x, y in p.exterior.coords]
xs, ys = zip(*pts)
print(js.dumps([min(xs), min(ys), max(xs), max(ys)]))`,
    );
    const out = await gdal.run("reproject_vector", { path: zones, target_crs: "EPSG:4267" });
    const got = [out.metrics.xmin, out.metrics.ymin, out.metrics.xmax, out.metrics.ymax];
    got.forEach((v, i) => expect(Math.abs(v - hand[i])).toBeLessThan(1e-7));
    expect(out.metrics.n_features).toBe(2);
  });
});
