import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("cellpose");
const python = join(homedir(), ".cuvette/envs/cellpose/bin/python");
const image = join(CATALOG, "cellpose/data/bbbc039-mini/images/crop1.tif");
const truth = join(CATALOG, "cellpose/data/bbbc039-mini/masks/crop1.png");
const slow = 600_000;

const truthCode = `
import numpy as np, tifffile
from PIL import Image
from scipy import ndimage as ndi
r = np.array(Image.open(${JSON.stringify(truth)}))[..., 0]
T = np.zeros(r.shape, np.int64); n = 0
for v in (1, 2):
    lab, k = ndi.label(r == v, structure=np.ones((3, 3)))
    T[lab > 0] = lab[lab > 0] + n; n += k
`;

describe.skipIf(!found || !existsSync(python))("cellpose against brute force and the Cellpose metrics module", () => {
  let cp: OpenAdapter;
  let base: Awaited<ReturnType<OpenAdapter["run"]>>;
  beforeAll(async () => {
    cp = await openAdapter("cellpose");
    base = await cp.run("segment_cells", { path: image, use_gpu: false, pixel_size: 0.5 });
  }, slow);
  afterAll(async () => {
    await cp?.close();
  });

  // The BBBC039 page and the adapter data notes give 36 cells in the crop. The score uses the Cellpose metrics module: F1 = 2 TP / (2 TP + FP + FN) with the matching of cellpose.metrics.average_precision.
  test("the scores of a segmentation agree with a brute-force calculation and with cellpose.metrics.average_precision", { timeout: slow }, async () => {
    const seg = base;
    const score = await cp.run("score_masks", { prediction: seg.data.label_image, truth });
    const hand = await pyJson<Record<string, number>>(
      python,
      `${truthCode}
P = tifffile.imread(${JSON.stringify(seg.data.label_image)}).astype(np.int64)
from cellpose import metrics
thr = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95]
ap, tp, fp, fn = metrics.average_precision([T], [P], threshold=thr)
f1 = 2 * tp[0] / (2 * tp[0] + fp[0] + fn[0])
pi = [i for i in np.unique(P) if i]; ti = [j for j in np.unique(T) if j]
iou = np.zeros((len(pi), len(ti)))
for a, i in enumerate(pi):
    for b, j in enumerate(ti):
        x, y = P == i, T == j
        iou[a, b] = (x & y).sum() / (x | y).sum()
brute = [float(2 * (iou >= t).sum() / (len(pi) + len(ti))) for t in thr]
p, t = P > 0, T > 0
print(json.dumps({"dice": float(2 * (p & t).sum() / (p.sum() + t.sum())), "iou": float((p & t).sum() / (p | t).sum()), "n_pred": len(pi), "n_truth": len(ti),
  "f50": float(f1[0]), "f70": float(f1[4]), "avg": float(f1.mean()), "b50": brute[0], "b70": brute[4], "bavg": float(np.mean(brute)), "missed70": float(1 - (iou >= 0.7).sum() / len(ti))}))`,
    );
    expect(hand.n_truth).toBe(36);
    expect(score.metrics.n_truth).toBe(36);
    expect(score.metrics.n_pred).toBe(hand.n_pred);
    expect(Math.abs(score.metrics.dice - hand.dice)).toBeLessThan(1e-9);
    expect(Math.abs(score.metrics.pixel_iou - hand.iou)).toBeLessThan(1e-9);
    expect(Math.abs(score.metrics.f1_iou_50 - hand.b50)).toBeLessThan(1e-9);
    expect(Math.abs(score.metrics.f1_iou_50 - hand.f50)).toBeLessThan(1e-6);
    expect(Math.abs(score.metrics.f1_iou_70 - hand.f70)).toBeLessThan(1e-6);
    expect(Math.abs(score.metrics.average_f1 - hand.bavg)).toBeLessThan(1e-9);
    expect(Math.abs(score.metrics.average_f1 - hand.avg)).toBeLessThan(1e-6);
    expect(Math.abs(score.metrics.missed_fraction_iou_70 - hand.missed70)).toBeLessThan(1e-9);
    expect(score.metrics.dice).toBeGreaterThan(0.8);
  });

  test("the cell table agrees with the area and the centre of mass of each label, and the border option removes the cells that touch the edge", { timeout: slow }, async () => {
    const all = base;
    const hand = await pyJson<{ areas: number[]; cy: number[]; cx: number[]; touching: number }>(
      python,
      `import numpy as np, tifffile
P = tifffile.imread(${JSON.stringify(all.data.label_image)}).astype(np.int64)
ids = [i for i in np.unique(P) if i]
areas, cy, cx = [], [], []
for i in ids:
    ys, xs = np.nonzero(P == i)
    areas.append(len(ys)); cy.append(round(float(ys.mean()), 2)); cx.append(round(float(xs.mean()), 2))
edge = set(P[0].tolist()) | set(P[-1].tolist()) | set(P[:, 0].tolist()) | set(P[:, -1].tolist())
print(json.dumps({"areas": areas, "cy": cy, "cx": cx, "touching": len(edge - {0})}))`,
    );
    expect(all.metrics.n_cells).toBe(hand.areas.length);
    expect(Math.abs(all.metrics.mean_area_px - hand.areas.reduce((a, b) => a + b, 0) / hand.areas.length)).toBeLessThan(1e-9);
    expect(all.metrics.mean_area_calibrated / all.metrics.mean_area_px).toBeCloseTo(0.25, 12);
    const rows = all.table.rows as number[][];
    rows.forEach((r, i) => {
      expect(r[1]).toBe(hand.areas[i]);
      expect(Math.abs(r[2] - hand.cy[i])).toBeLessThan(0.0051);
      expect(Math.abs(r[3] - hand.cx[i])).toBeLessThan(0.0051);
    });
    expect(hand.touching).toBeGreaterThan(0);
    const inner = await cp.run("segment_cells", { path: image, use_gpu: false, exclude_border_cells: true, pixel_size: 1 });
    expect(inner.metrics.removed_border).toBe(hand.touching);
    expect(inner.metrics.n_cells).toBe(hand.areas.length - hand.touching);
    expect(inner.data.data.calibrated).toBe(true);
    expect(inner.data.data.area_unit).not.toBe("pixel");
    expect(inner.metrics.mean_area_calibrated).toBeCloseTo(inner.metrics.mean_area_px, 12);
  });
});
