import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { parseCsv } from "../src/adapters/kinds/common.ts";
import { CATALOG, openAdapter, programOf, pyJson, scriptOut, type OpenAdapter } from "./independent.ts";

const python = await programOf("rdkit");
const obabel = await programOf("openbabel");
const delaney = join(CATALOG, "rdkit/data/delaney-processed.csv");
const slow = 600_000;
const load = { path: delaney, smiles_column: "smiles", id_column: "Compound ID", target_column: "measured log solubility in mols per litre" };

describe.skipIf(!python || !existsSync(delaney))("rdkit on the ESOL set against Open Babel and numpy", () => {
  let rdkit: OpenAdapter;
  let descriptors: Record<string, any>;
  let table: string;
  beforeAll(async () => {
    rdkit = await openAdapter("rdkit");
    const mols = await rdkit.run("load_molecules", load);
    descriptors = await rdkit.run("compute_descriptors", { molecules: mols.data!.molecules });
    table = descriptors.outputs[0].path;
  }, slow);
  afterAll(async () => {
    await rdkit?.close();
  });

  const columns = (file: string) => {
    const [head, ...rows] = parseCsv(readFileSync(file, "utf8")).filter((r) => r.length > 1);
    return { head, rows };
  };

  // Open Babel (a second chemistry library) computes the molecular weight from the same SMILES (Simplified Molecular Input Line Entry System).
  test.skipIf(!obabel)("the molecular weights and the count above 500 agree with Open Babel", { timeout: slow }, async () => {
    const dir = mkdtempSync(join(tmpdir(), "cuvette-rdkit-ob-"));
    try {
      const { head, rows } = columns(table);
      const smi = head.indexOf("smiles");
      const mw = head.indexOf("mw");
      writeFileSync(join(dir, "in.smi"), rows.map((r, i) => `${r[smi]} ${i}`).join("\n"));
      const out = (await scriptOut([obabel!, "-ismi", join(dir, "in.smi"), "-osmi", "--append", "MW"])).trim().split("\n");
      const theirs = out.map((l) => Number(l.split(/\s+/).at(-1)));
      expect(theirs.length).toBe(rows.length);
      const worst = Math.max(...rows.map((r, i) => Math.abs(Number(r[mw]) - theirs[i])));
      expect(worst).toBeLessThan(0.02);
      const rule = await rdkit.run("rule_of_five", { descriptors: descriptors.data!.descriptors });
      expect(rule.metrics!.n_mw_over_500).toBe(theirs.filter((v) => v > 500).length);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Wildman and Crippen (1999), Table 1: an aromatic CH carbon (C18) adds 0.1581 and a hydrogen on carbon (H1) adds 0.1230.
  // Benzene has six of each, so logP is 6 * (0.1581 + 0.1230) = 1.6866.
  test("the logP of benzene equals the sum of the published atom contributions", { timeout: slow }, async () => {
    const mini = await rdkit.run("load_molecules", { path: join(CATALOG, "rdkit/data/mini.csv"), smiles_column: "smiles", id_column: "name", target_column: "logS", invalid: "report_and_drop" });
    const out = await rdkit.run("compute_descriptors", { molecules: mini.data!.molecules });
    const { head, rows } = columns(out.outputs![0].path);
    const benzene = rows.find((r) => r[head.indexOf("id")] === "benzene")!;
    expect(Math.abs(Number(benzene[head.indexOf("logp")]) - 6 * (0.1581 + 0.1230))).toBeLessThan(0.0005);
  });

  // The ESOL equation of Delaney (2004) is intercept 0.16, logP -0.63, MW -0.0062, rotatable bonds 0.066, aromatic proportion -0.74.
  // The file holds the ESOL value that Delaney computed with his own logP. R2 and RMSE come from numpy.
  test("the published equation gives the R2 and RMSE of a numpy computation and follows the ESOL column of the file", { timeout: slow }, async () => {
    const hand = await pyJson<{ r2corr: number; rmse: number; versus_file: number }>(
      python!,
      `
import csv, numpy as np
rows = list(csv.DictReader(open(${JSON.stringify(table)})))
full = list(csv.DictReader(open(${JSON.stringify(delaney)})))
col = lambda k: np.array([float(r[k]) for r in rows])
pred = 0.16 - 0.63 * col("logp") - 0.0062 * col("mw") + 0.066 * col("rb") - 0.74 * col("ap")
y = col("measured")
esol = np.array([float(r["ESOL predicted log solubility in mols per litre"]) for r in full])
print(json.dumps({"r2corr": float(np.corrcoef(y, pred)[0, 1] ** 2), "rmse": float(np.sqrt(((y - pred) ** 2).mean())), "versus_file": float(np.corrcoef(pred, esol)[0, 1])}))
`,
    );
    const fit = await rdkit.run("fit_solubility_model", { descriptors: descriptors.data!.descriptors, equation: "published" });
    expect(Math.abs(fit.metrics!.all_r_squared_correlation - hand.r2corr)).toBeLessThan(1e-6);
    expect(Math.abs(fit.metrics!.all_rmse - hand.rmse)).toBeLessThan(1e-6);
    expect(hand.versus_file).toBeGreaterThan(0.95);
  });

  // The refit uses a hand-written normal-equation solution on a random split of the same size. The held-out scores use only the test rows.
  test("the refit gives the coefficients and the held-out scores of a normal-equation fit on its own split", { timeout: slow }, async () => {
    const hand = await pyJson<{ logp: number; r2: number; rmse: number; full_logp: number }>(
      python!,
      `
import csv, numpy as np
rows = list(csv.DictReader(open(${JSON.stringify(table)})))
col = lambda k: np.array([float(r[k]) for r in rows])
X = np.column_stack([np.ones(len(rows)), col("logp"), col("mw"), col("rb"), col("ap")]); y = col("measured")
order = np.random.default_rng(42).permutation(len(y)); test, train = order[:226], order[226:]
solve = lambda A, b: np.linalg.solve(A.T @ A, A.T @ b)
beta = solve(X[train], y[train]); res = y[test] - X[test] @ beta
print(json.dumps({"logp": float(beta[1]), "r2": float(1 - (res ** 2).sum() / ((y[test] - y[test].mean()) ** 2).sum()), "rmse": float(np.sqrt((res ** 2).mean())), "full_logp": float(solve(X, y)[1])}))
`,
    );
    const fit = await rdkit.run("fit_solubility_model", { descriptors: descriptors.data!.descriptors, equation: "refit", test_fraction: 0.2, seed: 42 });
    expect(fit.metrics!.train_n).toBe(902);
    expect(fit.metrics!.test_n).toBe(226);
    expect(Math.abs(fit.metrics!.coef_logp - hand.logp)).toBeLessThan(1e-6);
    expect(Math.abs(fit.metrics!.test_r2 - hand.r2)).toBeLessThan(1e-6);
    expect(Math.abs(fit.metrics!.test_rmse - hand.rmse)).toBeLessThan(1e-6);
    expect(Math.abs(fit.metrics!.coef_logp - -0.63)).toBeLessThan(0.15);
    expect(Math.abs(hand.full_logp - fit.metrics!.coef_logp)).toBeLessThan(0.05);
  });
});
