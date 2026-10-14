import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("mne");
const python = join(homedir(), ".cuvette/envs/mne/bin/python");
const raw = join(CATALOG, "mne/data/synthetic_raw.fif");
const slow = 600_000;

// Hand computation with numpy. MNE only reads the samples of the file. The events are the samples where the stimulus channel changes from 0 to a value.
// An epoch holds the samples from round(tmin * sfreq) to round(tmax * sfreq) around the event. The baseline is the mean of the samples from tmin to 0 in each channel.
// A channel type rejects an epoch if the peak-to-peak range of any channel of that type is larger than the limit (SI units: T/m, T and V).
const hand = `
import warnings; warnings.filterwarnings("ignore")
import numpy as np, mne
mne.set_log_level("ERROR")
r = mne.io.read_raw_fif(${JSON.stringify(raw)}, preload=True)
sf = r.info["sfreq"]
data = r.get_data()
stim = data[r.ch_names.index("STI 014")].astype(int)
edges = [(i, stim[i]) for i in range(1, len(stim)) if stim[i] != 0 and stim[i - 1] == 0]
types = {"grad": mne.pick_types(r.info, meg="grad"), "mag": mne.pick_types(r.info, meg="mag"), "eeg": mne.pick_types(r.info, eeg=True), "eog": mne.pick_types(r.info, eog=True)}
def epochs(code, tmin, tmax, limits):
    a, b = int(round(tmin * sf)), int(round(tmax * sf))
    kept = []
    for i, c in edges:
        if c != code or i + a < 0 or i + b >= data.shape[1]: continue
        seg = data[:, i + a:i + b + 1].copy()
        if any(np.ptp(seg[types[k]], axis=1).max() > v for k, v in limits.items() if len(types[k])): continue
        base = seg[:, : -a + 1].mean(axis=1, keepdims=True)
        kept.append(seg - base)
    return np.array(kept), np.arange(a, b + 1) / sf
`;

describe.skipIf(!found || !existsSync(python))("mne adapter against numpy", () => {
  let mne: OpenAdapter;
  beforeAll(async () => {
    mne = await openAdapter("mne");
  });
  afterAll(async () => {
    await mne?.close();
  });

  test("the epoch counts, the evoked peak and the global field power agree with a numpy average of the baseline-corrected epochs", { timeout: slow }, async () => {
    const limits = { grad: 4000e-13, mag: 4000e-15, eeg: 150e-6, eog: 250e-6 };
    const want = await pyJson<{ n1: number; n2: number; events: Record<string, number>; gfp_t: number; gfp: number; peak_t: number; peak: number; peak_ch: string }>(
      python,
      `${hand}
e1, times = epochs(1, -0.2, 0.5, ${JSON.stringify(limits)})
e2, _ = epochs(2, -0.2, 0.5, ${JSON.stringify(limits)})
ev = e1.mean(axis=0)
g = types["grad"]
win = (times >= 0.08 - 1e-9) & (times <= 0.12 + 1e-9)
gfp = np.sqrt((ev[g] ** 2).mean(axis=0))
gi = int(np.argmax(np.where(win, gfp, -np.inf)))
sub = np.abs(ev[g][:, win]); ci, ti = np.unravel_index(np.argmax(sub), sub.shape)
counts = {}
for _, c in edges: counts[str(c)] = counts.get(str(c), 0) + 1
print(json.dumps({"n1": len(e1), "n2": len(e2), "events": counts, "gfp_t": times[gi], "gfp": gfp[gi] * 1e13, "peak_t": times[win][ti], "peak": float(ev[g][ci, win][ti] * 1e13), "peak_ch": r.ch_names[g[ci]]}))`,
    );
    const loaded = await mne.run("load_raw", { path: raw });
    const events = await mne.run("count_events", { raw: { handle: loaded.data.inst.handle }, event_id: "cond_a=1,cond_b=2" });
    expect(events.metrics.count_1).toBe(want.events["1"]);
    expect(events.metrics.count_2).toBe(want.events["2"]);
    const epochs = await mne.run("make_epochs", {
      raw: { handle: loaded.data.inst.handle },
      event_id: "cond_a=1,cond_b=2",
      tmin: -0.2,
      tmax: 0.5,
      baseline_end: 0,
      reject_grad: 4000,
      reject_mag: 4000,
      reject_eeg: 150,
      reject_eog: 250,
    });
    expect(epochs.metrics.count_cond_a).toBe(want.n1);
    expect(epochs.metrics.count_cond_b).toBe(want.n2);
    const evoked = await mne.run("compute_evoked", { epochs: { handle: epochs.data.inst.handle }, condition: "cond_a" });
    expect(evoked.metrics.nave).toBe(want.n1);
    const peak = await mne.run("measure_peak", { evoked: { handle: evoked.data.inst.handle }, ch_type: "grad", tmin: 0.08, tmax: 0.12, mode: "abs" });
    expect(Math.abs(peak.metrics.gfp_latency_s - want.gfp_t)).toBeLessThan(1e-6);
    expect(Math.abs(peak.metrics.gfp_amplitude / want.gfp - 1)).toBeLessThan(1e-4);
    expect(Math.abs(peak.metrics.peak_latency_s - want.peak_t)).toBeLessThan(1e-6);
    expect(Math.abs(peak.metrics.peak_amplitude / want.peak - 1)).toBeLessThan(1e-4);
    expect(peak.data.data.channel).toBe(want.peak_ch);
  });
});
