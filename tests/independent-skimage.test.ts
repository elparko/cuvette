import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const python = await programOf("scikit-image");
const mini = join(CATALOG, "scikit-image/data/nuinsseg-mini");
const slow = 600_000;
const image = (name: string) => join(mini, name.replace(/_\d+$/, ""), "tissue images", `${name}.png`);

// Hand computation with numpy, scipy, Pillow and tifffile, without scikit-image.
// Stain matrix: Ruifrok and Johnston (2001), rounded as in the scikit-image documentation of rgb2hed.
// Optical density = ln(I) / ln(1e-6). Otsu (1979) on a 256 bin histogram. Dice (1945) on the foreground pixels.
const hand = (names: string[]) => `
import numpy as np, tifffile
from PIL import Image
from scipy import ndimage as ndi
stains = np.array([[0.65, 0.70, 0.29], [0.07, 0.99, 0.11], [0.27, 0.57, 0.78]])
stains = np.linalg.inv(stains / np.linalg.norm(stains, axis=1, keepdims=True))
def hematoxylin(rgb):
    od = np.log(np.maximum(rgb.astype(float) / 255, 1e-6)) / np.log(1e-6)
    return np.maximum(od @ stains, 0)[..., 0]
def otsu(x):
    hist, edges = np.histogram(x.ravel(), bins=256)
    centers = (edges[:-1] + edges[1:]) / 2
    w1 = np.cumsum(hist); w2 = np.cumsum(hist[::-1])[::-1]
    m1 = np.cumsum(hist * centers) / w1; m2 = (np.cumsum((hist * centers)[::-1]) / w2[::-1])[::-1]
    return centers[np.argmax(w1[:-1] * w2[1:] * (m1[:-1] - m2[1:]) ** 2)]
out = []
for name in ${JSON.stringify(names)}:
    organ = name.rsplit("_", 1)[0]
    rgb = np.array(Image.open(${JSON.stringify(mini)} + f"/{organ}/tissue images/{name}.png").convert("RGB"))
    plane = hematoxylin(rgb)
    mask = plane > otsu(plane)
    lab, n = ndi.label(mask, structure=np.ones((3, 3)))
    sizes = ndi.sum(mask, lab, range(1, n + 1))
    mask = np.isin(lab, 1 + np.flatnonzero(sizes >= 30))
    n_pred = ndi.label(mask, structure=np.ones((3, 3)))[1]
    truth = tifffile.imread(${JSON.stringify(mini)} + f"/{organ}/label masks/{name}.tif")
    inter = (mask & (truth > 0)).sum()
    out.append({"n_pred": int(n_pred), "n_truth": int(len(np.unique(truth[truth > 0]))), "dice": float(2 * inter / (mask.sum() + (truth > 0).sum()))})
print(json.dumps(out))
`;

describe.skipIf(!python)("scikit-image against numpy and scipy", () => {
  let skimage: OpenAdapter;
  beforeAll(async () => {
    skimage = await openAdapter("scikit-image");
  });
  afterAll(async () => {
    await skimage?.close();
  });

  test("the object count, the truth count and the Dice value of one crop agree with the hand computation", { timeout: slow }, async () => {
    const [h] = await pyJson<{ n_pred: number; n_truth: number; dice: number }[]>(python!, hand(["mouse_spleen_01"]));
    const seg = await skimage.run("count_objects", { path: image("mouse_spleen_01"), stain_channel: "hematoxylin", threshold_method: "otsu", min_object_size: 30 });
    const cmp = await skimage.run("compare_masks", { prediction: seg.data!.label_image, truth: join(mini, "mouse_spleen", "label masks", "mouse_spleen_01.tif") });
    expect(seg.metrics!.n_objects).toBe(h.n_pred);
    expect(cmp.metrics!.n_pred).toBe(h.n_pred);
    expect(cmp.metrics!.n_truth).toBe(h.n_truth);
    expect(Math.abs(cmp.metrics!.dice - h.dice)).toBeLessThan(0.0005);
  });

  test("the folder mode gives the truth total and the mean Dice value of the hand computation", { timeout: slow }, async () => {
    const hands = await pyJson<{ n_pred: number; n_truth: number; dice: number }[]>(python!, hand(["human_liver_01", "mouse_spleen_01"]));
    const out = await skimage.run("count_objects", { path: mini, pattern: "*/tissue images/*.png", truth_folder: mini, truth_match: "label masks", stain_channel: "hematoxylin", threshold_method: "otsu", min_object_size: 30 });
    expect(out.metrics!.total_truth).toBe(hands.reduce((a, b) => a + b.n_truth, 0));
    expect(out.metrics!.total_objects).toBe(hands.reduce((a, b) => a + b.n_pred, 0));
    expect(Math.abs(out.metrics!.mean_dice - (hands[0].dice + hands[1].dice) / 2)).toBeLessThan(0.0005);
  });
});
