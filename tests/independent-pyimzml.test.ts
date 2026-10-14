import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("pyimzml");
const python = join(homedir(), ".cuvette/envs/pyimzml/bin/python");
const data = join(CATALOG, "pyimzml/data");
const processed = join(data, "lipids_tiny.imzML");
const continuous = join(data, "lipids_tiny_continuous.imzML");
const slow = 600_000;

// Hand computation with a small imzML reader written for this test (xml.etree and numpy). It does not use pyimzML.
// The reader takes the pixel (x, y, z), the offset, the length and the data type of each array from the imzML text, and reads the numbers from the .ibd file.
const reader = `
import xml.etree.ElementTree as ET
import numpy as np
NS = {"m": "http://psi.hupo.org/ms/mzml"}
TYPES = {"MS:1000523": "<f8", "MS:1000521": "<f4", "MS:1000519": "<i4", "MS:1000522": "<i8"}
def read(path):
    root = ET.parse(path).getroot()
    groups = {g.get("id"): g for g in root.iter("{%s}referenceableParamGroup" % NS["m"])}
    ibd = open(path[:-6] + ".ibd", "rb").read()
    out = []
    for sp in root.iter("{%s}spectrum" % NS["m"]):
        pos = {}
        for c in sp.iter("{%s}cvParam" % NS["m"]):
            if c.get("accession") in ("IMS:1000050", "IMS:1000051", "IMS:1000052"):
                pos[c.get("accession")] = int(c.get("value"))
        arrays = {}
        for ba in sp.iter("{%s}binaryDataArray" % NS["m"]):
            params = {}
            for ref in ba.iter("{%s}referenceableParamGroupRef" % NS["m"]):
                for c in groups[ref.get("ref")].iter("{%s}cvParam" % NS["m"]): params[c.get("accession")] = c.get("value")
            for c in ba.iter("{%s}cvParam" % NS["m"]): params[c.get("accession")] = c.get("value")
            kind = "mz" if "MS:1000514" in params else "int"
            dtype = next(TYPES[a] for a in params if a in TYPES)
            off, n = int(params["IMS:1000102"]), int(params["IMS:1000103"])
            arrays[kind] = np.frombuffer(ibd, dtype=dtype, count=n, offset=off).astype(float)
        out.append((pos["IMS:1000050"], pos["IMS:1000051"], pos.get("IMS:1000052", 1), arrays["mz"], arrays["int"]))
    return out
def factor(ints, norm):
    return {"none": 1.0, "tic": ints.sum(), "rms": float(np.sqrt((ints ** 2).mean()))}[norm]
def ion_image(spectra, mz, ppm, norm, reduce):
    nx, ny = max(s[0] for s in spectra), max(s[1] for s in spectra)
    raw = np.full((ny, nx), np.nan); f = np.full((ny, nx), np.nan)
    for x, y, z, m, i in spectra:
        w = i[(m >= mz * (1 - ppm * 1e-6)) & (m <= mz * (1 + ppm * 1e-6))]
        raw[y - 1, x - 1] = 0.0 if len(w) == 0 else {"sum": w.sum(), "max": w.max(), "mean": w.mean()}[reduce]
        f[y - 1, x - 1] = factor(i, norm)
    if norm == "none": return raw
    return np.where(f > 0, raw / np.where(f > 0, f, 1) * np.nanmean(f), 0.0)
`;

describe.skipIf(!found || !existsSync(python))("pyimzml adapter against a hand-written imzML reader", () => {
  let msi: OpenAdapter;
  beforeAll(async () => {
    msi = await openAdapter("pyimzml");
  });
  afterAll(async () => {
    await msi?.close();
  });

  test("the ion images of both storage modes give the maximum, the mean and the brightest pixel of the hand computation for each reduction and normalization", { timeout: slow }, async () => {
    for (const file of [processed, continuous]) {
      const want = await pyJson<Record<string, { max: number; mean: number; x: number; y: number; frac: number }>>(
        python,
        `${reader}
sp = read(${JSON.stringify(file)})
allmz = np.concatenate([s[3] for s in sp])
target = float(np.median(allmz[allmz > 0]))
out = {}
for norm in ("none", "tic", "rms"):
    for red in ("sum", "max", "mean"):
        img = ion_image(sp, target, 25.0, norm, red)
        k = int(np.nanargmax(img)); y, x = divmod(k, img.shape[1])
        out[norm + "/" + red] = {"max": float(np.nanmax(img)), "mean": float(np.nanmean(img)), "x": x + 1, "y": y + 1, "frac": float((img[np.isfinite(img)] > 0).mean()), "mz": target}
print(json.dumps(out))`,
      );
      const mz = (want["none/sum"] as unknown as { mz: number }).mz;
      for (const [key, v] of Object.entries(want)) {
        const [normalization, reduce] = key.split("/");
        expect(v.max).toBeGreaterThan(0);
        const out = await msi.run("get_ion_image", { path: file, mz, ppm: 25, normalization, reduce });
        expect(Math.abs(out.metrics.max_intensity / v.max - 1)).toBeLessThan(1e-9);
        expect(Math.abs(out.metrics.mean_intensity / v.mean - 1)).toBeLessThan(1e-9);
        expect(out.metrics.frac_pixels_with_signal).toBeCloseTo(v.frac, 9);
        const top = out.table.rows[0] as number[];
        expect(Math.abs(top[2] / v.max - 1)).toBeLessThan(1e-9);
        if (normalization === "none" && reduce === "sum") {
          expect([out.metrics.peak_pixel_x, out.metrics.peak_pixel_y]).toEqual([v.x, v.y]);
        }
      }
    }
  });

  test("the total ion current image gives the sum of each pixel and the position of the largest sum", { timeout: slow }, async () => {
    for (const file of [processed, continuous]) {
      const want = await pyJson<{ mean: number; median: number; max: number; min: number; x: number; y: number; n: number }>(
        python,
        `${reader}
sp = read(${JSON.stringify(file)})
t = np.array([s[4].sum() for s in sp])
k = int(np.argmax(t))
print(json.dumps({"mean": t.mean(), "median": float(np.median(t)), "max": t.max(), "min": t.min(), "x": sp[k][0], "y": sp[k][1], "n": len(sp)}))`,
      );
      const out = await msi.run("get_tic_image", { path: file });
      expect(out.metrics.n_pixels).toBe(want.n);
      expect(Math.abs(out.metrics.tic_mean / want.mean - 1)).toBeLessThan(1e-9);
      expect(Math.abs(out.metrics.tic_median / want.median - 1)).toBeLessThan(1e-9);
      expect(Math.abs(out.metrics.tic_max / want.max - 1)).toBeLessThan(1e-9);
      expect(Math.abs(out.metrics.tic_min / want.min - 1)).toBeLessThan(1e-9);
      expect([out.metrics.tic_max_x, out.metrics.tic_max_y]).toEqual([want.x, want.y]);
    }
  });

  test("the mean spectrum of a continuous file averages the TIC-normalized pixels, and a processed file in bins gives the same total", { timeout: slow }, async () => {
    const want = await pyJson<{ cont_max: number; cont_mz: number; cont_sum: number; proc_sum: number }>(
      python,
      `${reader}
c = read(${JSON.stringify(continuous)}); p = read(${JSON.stringify(processed)})
acc = sum(s[4] / s[4].sum() for s in c) / len(c)
pm = sum((s[4] / s[4].sum()).sum() for s in p) / len(p)
print(json.dumps({"cont_max": float(acc.max()), "cont_mz": float(c[0][3][int(np.argmax(acc))]), "cont_sum": float(acc.sum()), "proc_sum": float(pm)}))`,
    );
    const cont = await msi.run("get_mean_spectrum", { path: continuous, normalization: "tic", max_pixels: 0 });
    expect(Math.abs(cont.metrics.max_mean_intensity / want.cont_max - 1)).toBeLessThan(1e-9);
    expect(Math.abs(cont.metrics.mz_at_max - want.cont_mz)).toBeLessThan(1e-9);
    expect(Math.abs(cont.metrics.sum_mean_intensity / want.cont_sum - 1)).toBeLessThan(1e-9);
    const proc = await msi.run("get_mean_spectrum", { path: processed, normalization: "tic", bin_width: 0.05, max_pixels: 0 });
    expect(Math.abs(proc.metrics.sum_mean_intensity / want.proc_sum - 1)).toBeLessThan(1e-9);
  });
});
