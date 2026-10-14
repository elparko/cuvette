import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("pyopenms");
const python = join(homedir(), ".cuvette/envs/pyopenms/bin/python");
const slow = 600_000;

// Hand computation with the Python standard library. Monoisotopic masses of the elements (AME2016, Wang et al. 2017) and the natural abundances of IUPAC (Meija et al. 2016).
// An ion has the mass of the neutral molecule plus the mass of the atoms that it gains, minus the atoms that it loses, minus one electron for each positive charge (plus one for each negative charge).
const table = `
import itertools
E = 0.000548579909065
MASS = {"C": 12.0, "H": 1.00782503223, "N": 14.00307400443, "O": 15.99491461957, "P": 30.97376199842, "S": 31.9720711744, "Na": 22.9897692820, "K": 38.9637064864, "Cl": 34.968852682}
ISO = {
    "C": [(0, 0.9893), (1, 0.0107)], "H": [(0, 0.999885), (1, 0.000115)], "N": [(0, 0.99636), (1, 0.00364)],
    "O": [(0, 0.99757), (1, 0.00038), (2, 0.00205)], "P": [(0, 1.0)], "S": [(0, 0.9499), (1, 0.0075), (2, 0.0425), (4, 0.0001)], "Cl": [(0, 0.7576), (2, 0.2424)],
}
def mass(formula): return sum(MASS[k] * n for k, n in formula.items())
def pattern(formula, n):
    dist = {0: 1.0}
    for element, count in formula.items():
        for _ in range(count):
            new = {}
            for shift, p in dist.items():
                for s, a in ISO[element]:
                    if shift + s < n: new[shift + s] = new.get(shift + s, 0.0) + p * a
            dist = new
    return [dist.get(i, 0.0) for i in range(n)]
`;

describe.skipIf(!found || !existsSync(python))("pyopenms adapter against hand-written masses and isotope patterns", () => {
  let tool: OpenAdapter;
  beforeAll(async () => {
    tool = await openAdapter("pyopenms");
  });
  afterAll(async () => {
    await tool?.close();
  });

  test("the adduct m/z values and the ppm error agree with the element masses in both ion modes", { timeout: slow }, async () => {
    const hand = await pyJson<{ mass: number; positive: Record<string, number>; negative: Record<string, number> }>(
      python,
      `${table}
f = {"C": 42, "H": 82, "N": 1, "O": 8, "P": 1}
m = mass(f)
H, O2 = MASS["H"], 2 * MASS["H"] + MASS["O"]
pos = {"[M+H]+": m + H - E, "[M+Na]+": m + MASS["Na"] - E, "[M+K]+": m + MASS["K"] - E, "[M+NH4]+": m + MASS["N"] + 4 * H - E, "[M+H-H2O]+": m + H - O2 - E}
neg = {"[M-H]-": m - H + E, "[M+Cl]-": m + MASS["Cl"] + E, "[M+HCOO]-": m + MASS["C"] + H + 2 * MASS["O"] + E, "[M+CH3COO]-": m + 2 * MASS["C"] + 3 * H + 2 * MASS["O"] + E}
print(json.dumps({"mass": m, "positive": pos, "negative": neg}))`,
    );
    for (const mode of ["positive", "negative"] as const) {
      const measured = hand[mode][mode === "positive" ? "[M+H]+" : "[M-H]-"] * (1 + 3.2e-6);
      const out = await tool.run("monoisotopic_mass", { formula: "C42H82NO8P", polarity: mode, measured_mz: measured });
      expect(Math.abs(out.metrics.monoisotopic_mass - hand.mass)).toBeLessThan(1e-5);
      const rows = out.table.rows as [string, number, number][];
      for (const [label, mz, ppm] of rows) {
        expect(Math.abs(mz - hand[mode][label])).toBeLessThan(1e-5);
        expect(Math.abs(ppm - ((measured - hand[mode][label]) / hand[mode][label]) * 1e6)).toBeLessThan(0.01);
      }
      expect(rows.length).toBe(Object.keys(hand[mode]).length);
      expect(Math.abs(out.metrics.ppm_error_main_adduct - 3.2)).toBeLessThan(0.01);
    }
  });

  // The isotope peaks come from the product of the isotope distributions of every atom, cut at the nominal mass of M plus 4.
  // OpenMS uses an older table of sulfur abundances (4.29 percent for 34S, IUPAC 2016: 4.25 percent). The limit is 1.2 percent of the larger of the peak and 1 percent of M. It covers that difference.
  test("the isotope pattern of formulas with C, H, N, O, S, P and Cl agrees with the product of the natural abundances", { timeout: slow }, async () => {
    const formulas: Record<string, Record<string, number>> = {
      C42H82NO8P: { C: 42, H: 82, N: 1, O: 8, P: 1 },
      C6H12O6: { C: 6, H: 12, O: 6 },
      C9H11NO2S: { C: 9, H: 11, N: 1, O: 2, S: 1 },
      C12H10Cl2: { C: 12, H: 10, Cl: 2 },
    };
    const hand = await pyJson<Record<string, number[]>>(
      python,
      `${table}
formulas = ${JSON.stringify(formulas)}
print(json.dumps({k: [v / pattern(f, 5)[0] for v in pattern(f, 5)] for k, f in formulas.items()}))`,
    );
    for (const name of Object.keys(formulas)) {
      const out = await tool.run("isotope_pattern", { formula: name, n_peaks: 5 });
      const got = (out.table.rows as [string, number, number, number][]).map((r) => r[3]);
      got.forEach((v, i) => expect(Math.abs(v - hand[name][i]) / Math.max(hand[name][i], 0.01)).toBeLessThan(0.012));
    }
  });
});
