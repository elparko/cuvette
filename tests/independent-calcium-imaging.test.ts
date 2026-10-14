import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const python = await programOf("calcium-imaging");
const dff = join(CATALOG, "calcium-imaging/data/cascade/allen_101084_dff.csv");
const spikes = join(CATALOG, "calcium-imaging/data/cascade/allen_101084_spikes.csv");
const slow = 600_000;

describe.skipIf(!python || !existsSync(dff) || !existsSync(spikes))("calcium-imaging threshold events against scipy", () => {
  let tool: OpenAdapter;
  beforeAll(async () => {
    tool = await openAdapter("calcium-imaging");
  });
  afterAll(async () => {
    await tool?.close();
  });

  // Hand computation on the Allen neuron 101084 trace. The noise SD is the scaled median absolute deviation (scipy.stats.median_abs_deviation).
  // An event is a run of samples above median + 1.5 SD that holds a sample above median + 3 SD. The runs come from numpy.diff on the mask.
  // The matching is a maximum one-to-one matching of events and reference spikes within 0.5 s (scipy.sparse.csgraph.maximum_bipartite_matching).
  test("the event count, the matches, the sensitivity and the precision agree with the scipy computation", { timeout: slow }, async () => {
    const hand = await pyJson<{ frames: number; duration: number; n_truth: number; n_events: number; matched: number }>(
      python!,
      `
import csv, numpy as np
from scipy import stats
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import maximum_bipartite_matching
rows = list(csv.reader(open(${JSON.stringify(dff)})))[1:]
t = np.array([float(r[0]) for r in rows]); y = np.array([float(r[1]) for r in rows])
truth = np.array([float(r[0]) for r in list(csv.reader(open(${JSON.stringify(spikes)})))[1:]])
fs = 1 / np.median(np.diff(t))
sd = stats.median_abs_deviation(y, scale="normal"); med = np.median(y)
above = y > med + 1.5 * sd
edges = np.flatnonzero(np.diff(np.concatenate([[0], above.astype(int), [0]])))
onsets = np.array([t[a] for a, b in zip(edges[::2], edges[1::2]) if (y[a:b] > med + 3 * sd).any()])
close = np.abs(truth[:, None] - onsets[None, :]) <= 0.5 + 1e-12
matched = int((maximum_bipartite_matching(csr_matrix(close), perm_type="column") >= 0).sum())
print(json.dumps({"frames": len(y), "duration": len(y) / fs, "n_truth": len(truth), "n_events": len(onsets), "matched": matched}))
`,
    );
    const out = await tool.run("detect_events", { traces: dff, method: "threshold", threshold_sd: 3, truth_times: spikes, truth_tolerance_s: 0.5 });
    expect(out.metrics).toMatchObject({ n_truth: hand.n_truth, n_events: hand.n_events, n_matched: hand.matched });
    expect(Math.abs(out.metrics!.duration_s - hand.duration)).toBeLessThan(0.001);
    expect(Math.abs(out.metrics!.sensitivity - hand.matched / hand.n_truth)).toBeLessThan(1e-9);
    expect(Math.abs(out.metrics!.precision - hand.matched / hand.n_events)).toBeLessThan(1e-9);
  });
});
