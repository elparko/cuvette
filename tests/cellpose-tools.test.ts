import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const PY = process.env.CUVETTE_CELLPOSE_PYTHON || join(homedir(), ".cuvette/envs/cellpose/bin/python");
const DIR = resolve("catalog/cellpose");

function py(body: string): any {
  const dir = mkdtempSync(join(tmpdir(), "cellpose-tools-"));
  const code = `import json, sys\nimport numpy as np, tifffile\nsys.path.insert(0, ${JSON.stringify(DIR)})\nimport cellpose_tools as c\nd = ${JSON.stringify(dir)}\n${body}`;
  const out = execFileSync(PY, ["-I", "-c", code], { encoding: "utf8", env: { ...process.env, PYTHONWARNINGS: "ignore", PYTHONPATH: DIR } });
  return JSON.parse(out.trim().split("\n").at(-1)!);
}

const inspect = (write: string) =>
  py(`${write}
try:
    r = c.inspect_image(d + "/a.tif")
    print(json.dumps({"ok": True, "channels": r["metrics"]["channels"], "warnings": r["data"]["warnings"], "sat": r["metrics"]["saturated_fraction"]}))
except ValueError as e:
    print(json.dumps({"ok": False, "error": str(e)}))`);

describe.skipIf(!existsSync(PY))("cellpose_tools image reading", () => {
  test("a 3-plane z-stack with axes ZYX is refused, not read as 3 channels", () => {
    const r = inspect(`tifffile.imwrite(d + "/a.tif", np.random.randint(0, 200, (3, 40, 50), dtype=np.uint16), imagej=True, metadata={"axes": "ZYX"})`);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/stack of 3 planes \(axes ZYX\)/);
  });

  test("a 3-plane file with axes CYX is read as 3 channels without a note", () => {
    const r = inspect(`tifffile.imwrite(d + "/a.tif", np.random.randint(0, 200, (3, 40, 50), dtype=np.uint16), imagej=True, metadata={"axes": "CYX"})`);
    expect(r).toMatchObject({ ok: true, channels: 3 });
    expect(r.warnings).toEqual([]);
  });

  test("a 3-plane file without axes information is read as channels and the result warns", () => {
    const r = inspect(`tifffile.imwrite(d + "/a.tif", np.random.randint(0, 200, (3, 40, 50), dtype=np.uint16))`);
    expect(r.ok).toBe(true);
    expect(r.channels).toBe(3);
    expect(r.warnings.join(" ")).toMatch(/3 planes and no axes information/);
  });
});

describe.skipIf(!existsSync(PY))("cellpose_tools saturation and label files", () => {
  test("saturation uses the maximum of the image, not the maximum of the data type", () => {
    const r = inspect(`a = np.random.randint(0, 3000, (40, 50)).astype(np.uint16)
a[:10, :] = 4095
tifffile.imwrite(d + "/a.tif", a)`);
    expect(r.sat).toBeCloseTo(0.25, 2);
    expect(r.warnings.join(" ")).toMatch(/25\.0 percent of the pixels are at the maximum value/);
  });

  test("a constant image is not reported as saturated", () => {
    expect(inspect(`tifffile.imwrite(d + "/a.tif", np.full((40, 50), 7, dtype=np.uint16))`).sat).toBe(0);
  });

  test("a label image with more than 65535 labels keeps every label", () => {
    const r = py(`lab = np.arange(1, 70001, dtype=np.int64).reshape(1, -1)
c._save_labels(d + "/big.tif", lab)
c._save_labels(d + "/small.tif", lab[:, :100])
big, small = tifffile.imread(d + "/big.tif"), tifffile.imread(d + "/small.tif")
print(json.dumps({"big_max": int(big.max()), "big_unique": int(len(np.unique(big))), "big_dtype": str(big.dtype), "small_dtype": str(small.dtype)}))`);
    expect(r).toEqual({ big_max: 70000, big_unique: 70000, big_dtype: "uint32", small_dtype: "uint16" });
  });
});
