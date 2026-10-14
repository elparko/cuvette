import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("mdanalysis");
const python = join(homedir(), ".cuvette/envs/mdanalysis/bin/python");
const data = join(CATALOG, "mdanalysis/data");
const topology = join(data, "adk_backbone_h.pdb");
const trajectory = join(data, "adk_backbone_h.dcd");
const slow = 600_000;

// Hand computation with numpy. MDAnalysis only reads the coordinates, the masses and the atom selections.
// The best fit uses the Kabsch algorithm: centre both sets, take the singular value decomposition of the covariance matrix, fix the sign for a proper rotation.
const hand = `
import warnings; warnings.filterwarnings("ignore")
import numpy as np, MDAnalysis as mda
u = mda.Universe(${JSON.stringify(topology)}, ${JSON.stringify(trajectory)})
frames = [u.trajectory[i].positions.astype(float).copy() for i in range(len(u.trajectory))]
times = [u.trajectory[i].time for i in range(len(u.trajectory))]
names = u.atoms.names; resids = u.atoms.resids; masses = u.atoms.masses.astype(float)
def mask(text):
    m = np.zeros(len(names), dtype=bool); m[u.select_atoms(text).indices] = True; return m
backbone = mask("backbone")
ca = mask("name CA")
def kabsch(mobile, ref):
    mc, rc = mobile.mean(0), ref.mean(0)
    h = (mobile - mc).T @ (ref - rc)
    v, s, wt = np.linalg.svd(h)
    d = np.sign(np.linalg.det(wt.T @ v.T))
    r = wt.T @ np.diag([1, 1, d]) @ v.T
    return (mobile - mc) @ r.T + rc
def rmsd(a, b): return float(np.sqrt(((a - b) ** 2).sum(1).mean()))
`;

describe.skipIf(!found || !existsSync(python))("mdanalysis adapter against a numpy Kabsch fit", () => {
  let md: OpenAdapter;
  beforeAll(async () => {
    md = await openAdapter("mdanalysis");
  });
  afterAll(async () => {
    await md?.close();
  });

  test("the RMSD to a chosen reference frame, with and without the fit, agrees with the Kabsch value of each frame", { timeout: slow }, async () => {
    const want = await pyJson<{ fit: number[]; nofit: number[]; frames: number[] }>(
      python,
      `${hand}
sel = backbone
ref = frames[6][sel]
idx = list(range(2, 19, 4))
fit = [rmsd(kabsch(frames[i][sel], ref), ref) for i in idx]
nofit = [rmsd(frames[i][sel], ref) for i in idx]
print(json.dumps({"fit": fit, "nofit": nofit, "frames": idx}))`,
    );
    const common = { topology, trajectory, select: "backbone", reference_frame: 6, start: 2, stop: 19, stride: 4 };
    const fitted = await md.run("rmsd_trajectory", { ...common, fit: true });
    const raw = await md.run("rmsd_trajectory", { ...common, fit: false });
    const rows = (o: { table: { rows: number[][] } }) => o.table.rows;
    expect(rows(fitted).map((r) => r[0])).toEqual(want.frames);
    rows(fitted).forEach((r, i) => expect(Math.abs(r[2] - want.fit[i])).toBeLessThan(1e-4));
    rows(raw).forEach((r, i) => expect(Math.abs(r[2] - want.nofit[i])).toBeLessThan(1e-4));
  });

  test("the fit on the backbone and the RMSD of the alpha carbons agree with the numpy values", { timeout: slow }, async () => {
    const want = await pyJson<number[]>(
      python,
      `${hand}
ref = frames[0]
out = []
for i in (3, 10, 17):
    moved = frames[i].copy(); mc, rc = moved[backbone].mean(0), ref[backbone].mean(0)
    h = (moved[backbone] - mc).T @ (ref[backbone] - rc); v, s, wt = np.linalg.svd(h); d = np.sign(np.linalg.det(wt.T @ v.T)); r = wt.T @ np.diag([1, 1, d]) @ v.T
    moved = (moved - mc) @ r.T + rc
    out.append(rmsd(moved[ca], ref[ca]))
print(json.dumps(out))`,
    );
    const out = await md.run("rmsd_trajectory", { topology, trajectory, select: "name CA", fit_select: "backbone", fit: true, reference_frame: 0, start: 3, stop: 21, stride: 7 });
    (out.table.rows as number[][]).forEach((r, i) => expect(Math.abs(r[2] - want[i])).toBeLessThan(1e-4));
  });

  test("the RMSF per residue agrees with the root mean square fluctuation of fitted coordinates, for the reference frame that the tool gets", { timeout: slow }, async () => {
    const want = await pyJson<Record<string, number[]>>(
      python,
      `${hand}
out = {}
for k in (0, 9):
    fitted = np.array([kabsch(f[ca], frames[k][ca]) for f in frames])
    mean = fitted.mean(0)
    out[str(k)] = np.sqrt(((fitted - mean) ** 2).sum(2).mean(0)).tolist()
print(json.dumps(out))`,
    );
    for (const k of [0, 9]) {
      const out = await md.run("rmsf_per_residue", { topology, trajectory, select: "name CA", fit_select: "name CA", fit: true, reference_frame: k });
      const got = (out.table.rows as number[][]).map((r) => r[3]);
      expect(got.length).toBeGreaterThan(0);
      got.forEach((v, i) => expect(Math.abs(v - want[String(k)][i])).toBeLessThan(1e-4));
      expect(Math.abs(out.metrics.rmsf_max - Math.max(...want[String(k)]))).toBeLessThan(1e-4);
    }
  });

  test("the radius of gyration is mass weighted and the contacts count the atom pairs within the cutoff", { timeout: slow }, async () => {
    const want = await pyJson<{ rg: number[]; pairs: number[]; residue_pairs: number[] }>(
      python,
      `${hand}
rg = []
for f in frames:
    com = (f * masses[:, None]).sum(0) / masses.sum()
    rg.append(float(np.sqrt((masses * ((f - com) ** 2).sum(1)).sum() / masses.sum())))
a = (resids >= 1) & (resids <= 40) & ca
b = (resids >= 120) & (resids <= 214) & ca
pairs, rp = [], []
for f in frames:
    d = np.linalg.norm(f[a][:, None, :] - f[b][None, :, :], axis=2)
    pairs.append(int((d <= 12.0).sum()))
    ia, ib = np.nonzero(d <= 12.0)
    rp.append(len({(x, y) for x, y in zip(resids[a][ia], resids[b][ib])}))
print(json.dumps({"rg": rg, "pairs": pairs, "residue_pairs": rp}))`,
    );
    const rg = await md.run("radius_of_gyration", { topology, trajectory, select: "protein" });
    (rg.table.rows as number[][]).slice(0, 12).forEach((r, i) => expect(Math.abs(r[2] - want.rg[i])).toBeLessThan(1e-4));
    expect(Math.abs(rg.metrics.rg_last - want.rg[want.rg.length - 1])).toBeLessThan(1e-4);
    expect(Math.abs(rg.metrics.rg_mean - want.rg.reduce((s, v) => s + v, 0) / want.rg.length)).toBeLessThan(1e-4);
    const contacts = await md.run("count_contacts", { topology, trajectory, select_a: "resid 1-40 and name CA", select_b: "resid 120-214 and name CA", cutoff: 12 });
    expect(contacts.metrics.pairs_first).toBe(want.pairs[0]);
    expect(contacts.metrics.pairs_last).toBe(want.pairs[want.pairs.length - 1]);
    expect(contacts.metrics.pairs_mean).toBeCloseTo(want.pairs.reduce((s, v) => s + v, 0) / want.pairs.length, 6);
    expect(contacts.metrics.residue_pairs_mean).toBeCloseTo(want.residue_pairs.reduce((s, v) => s + v, 0) / want.residue_pairs.length, 6);
  });

  test("the distance and the superposition of two chains agree with the coordinates in the PDB file and the Kabsch fit", { timeout: slow }, async () => {
    const pdb = join(data, "4AKE.pdb");
    const want = await pyJson<{ d: number; before: number; after: number; n: number }>(
      python,
      `
import numpy as np
atoms = {}
for line in open(${JSON.stringify(pdb)}):
    if line.startswith("ATOM"):
        key = (line[21], int(line[22:26]), line[12:16].strip())
        atoms.setdefault(key, np.array([float(line[30:38]), float(line[38:46]), float(line[46:54])]))
d = float(np.linalg.norm(atoms[("A", 10, "CA")] - atoms[("A", 100, "CA")]))
a = np.array([v for (c, r, n), v in sorted(atoms.items()) if c == "A" and n == "CA"])
b = {(r): v for (c, r, n), v in atoms.items() if c == "B" and n == "CA"}
pairs = [(v, b[r]) for (c, r, n), v in sorted(atoms.items()) if c == "A" and n == "CA" and r in b]
m = np.array([p[0] for p in pairs]); f = np.array([p[1] for p in pairs])
mc, fc = m.mean(0), f.mean(0)
v, s, wt = np.linalg.svd((m - mc).T @ (f - fc)); sign = np.sign(np.linalg.det(wt.T @ v.T)); r = wt.T @ np.diag([1, 1, sign]) @ v.T
after = (m - mc) @ r.T + fc
print(json.dumps({"d": d, "before": float(np.sqrt(((m - f) ** 2).sum(1).mean())), "after": float(np.sqrt(((after - f) ** 2).sum(1).mean())), "n": len(pairs)}))`,
    );
    const dist = await md.run("measure_distance", { path: pdb, chain_a: "A", resid_a: 10, atom_a: "CA", chain_b: "A", resid_b: 100, atom_b: "CA" });
    expect(Math.abs(dist.metrics.distance_angstrom - want.d)).toBeLessThan(1e-3);
    const sup = await md.run("superpose_structures", { mobile_path: pdb, reference_path: pdb, mobile_chain: "A", reference_chain: "B", fit_atoms: "CA" });
    expect(sup.metrics.n_atoms_fitted).toBe(want.n);
    expect(Math.abs(sup.metrics.rmsd_before_fit - want.before)).toBeLessThan(1e-3);
    expect(Math.abs(sup.metrics.rmsd_after_fit - want.after)).toBeLessThan(1e-3);
  });
});
