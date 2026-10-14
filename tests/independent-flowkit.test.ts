import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("flowkit");
const python = join(homedir(), ".cuvette/envs/flowkit/bin/python");
const data = join(CATALOG, "flowkit/data");
const fcs = join(data, "data1.fcs");
const slow = 600_000;

// Hand computation with numpy. FlowKit only reads the events of the FCS file.
// Compensation: the compensated events are the raw events times the inverse of the spillover matrix. Each row of the matrix is one fluorochrome, each column one detector.
// The asinh transform of GatingML 2.0 (Spidlen et al. 2013, section 7.1.5): y = (asinh(x sinh(M ln 10) / T) + A ln 10) / ((M + A) ln 10).
const hand = `
import warnings; warnings.filterwarnings("ignore")
import numpy as np, flowkit as fk
s = fk.Sample(${JSON.stringify(fcs)})
raw = np.array(s.get_events("raw"), dtype=float)
names = list(s.pnn_labels)
fl = list(s.fluoro_indices)
def asinh(x, t, m, a): return (np.arcsinh(x * np.sinh(m * np.log(10)) / t) + a * np.log(10)) / ((m + a) * np.log(10))
`;

describe.skipIf(!found || !existsSync(python))("flowkit adapter against numpy", () => {
  let flow: OpenAdapter;
  let root: string;
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "cuvette-flowkit-"));
    flow = await openAdapter("flowkit");
  });
  afterAll(async () => {
    await flow?.close();
    rmSync(root, { recursive: true, force: true });
  });

  test("a rectangle gate on compensated and asinh-transformed events counts the events that the numpy computation counts", { timeout: slow }, async () => {
    const matrix = join(root, "spill.csv");
    const names = ["FL1-H", "FL2-H", "FL3-H", "FL2-A", "FL4-H"];
    const spill = [
      [1, 0.12, 0.01, 0.1, 0],
      [0.03, 1, 0.2, 1, 0.02],
      [0, 0.15, 1, 0.15, 0.01],
      [0.03, 1, 0.2, 1, 0.02],
      [0, 0.01, 0.1, 0.01, 1],
    ];
    spill[3] = [0.01, 0.3, 0.1, 1, 0.05];
    writeFileSync(matrix, [names.join(","), ...spill.map((r) => r.join(","))].join("\n"));
    const want = await pyJson<{ count: number; count_1d: number; count_raw: number }>(
      python,
      `${hand}
S = np.array(${JSON.stringify(spill)})
comp = raw.copy(); comp[:, fl] = raw[:, fl] @ np.linalg.inv(S)
t = asinh(comp, 1024.0, 4.0, 0.0)
x, y = names.index("FL1-H"), names.index("FL3-H")
inside = (t[:, x] >= 0.50) & (t[:, x] < 0.62) & (t[:, y] >= 0.45) & (t[:, y] < 0.70)
one = (t[:, x] >= 0.50) & (t[:, x] < 0.62)
rawc = (raw[:, x] >= 100) & (raw[:, x] < 400)
print(json.dumps({"count": int(inside.sum()), "count_1d": int(one.sum()), "count_raw": int(rawc.sum())}))`,
    );
    const common = { path: fcs, compensation: "csv", matrix_path: matrix, transform: "asinh", transform_t: 1024, transform_m: 4, transform_a: 0 };
    const two = await flow.run("count_rectangle", { ...common, x_channel: "FL1-H", x_min: 0.5, x_max: 0.62, y_channel: "FL3-H", y_min: 0.45, y_max: 0.7 });
    expect(two.metrics.count).toBe(want.count);
    const one = await flow.run("count_rectangle", { ...common, x_channel: "FL1-H", x_min: 0.5, x_max: 0.62 });
    expect(one.metrics.count).toBe(want.count_1d);
    const raw = await flow.run("count_rectangle", { path: fcs, x_channel: "FL1-H", x_min: 100, x_max: 400 });
    expect(raw.metrics.count).toBe(want.count_raw);
    expect(want.count).toBeGreaterThan(50);
  });

  test("an event on the lower limit is inside the gate and an event on the upper limit is outside, as the help says for the lower limit", { timeout: slow }, async () => {
    const want = await pyJson<{ value: number; below: number; at_min: number; above: number }>(
      python,
      `${hand}
x = names.index("FL1-H")
v = float(np.sort(np.unique(raw[:, x]))[len(np.unique(raw[:, x])) // 2])
print(json.dumps({"value": v, "below": int((raw[:, x] < v).sum()), "at_min": int((raw[:, x] == v).sum()), "above": int((raw[:, x] > v).sum())}))`,
    );
    const lowerAt = await flow.run("count_rectangle", { path: fcs, x_channel: "FL1-H", x_min: want.value });
    expect(lowerAt.metrics.count).toBe(want.at_min + want.above);
    const upperAt = await flow.run("count_rectangle", { path: fcs, x_channel: "FL1-H", x_max: want.value });
    expect(upperAt.metrics.count).toBe(want.below);
  });

  test("the compensation table gives the means of the raw events times the inverse spillover matrix", { timeout: slow }, async () => {
    const matrix = join(data, "synthetic_comp_matrix.csv");
    const sample = join(data, "synthetic_comp.fcs");
    const out = await flow.run("apply_compensation", { path: sample, compensation: "csv", matrix_path: matrix });
    expect(out.metrics.mean_raw_FL2_A).toBeCloseTo(560, 6);
    expect(out.metrics.mean_comp_FL2_A).toBeCloseTo(500, 6);
    expect(out.metrics.mean_comp_FL1_A).toBeCloseTo(600, 6);
  });
});
