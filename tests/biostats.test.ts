import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const PY = process.env.CUVETTE_BIOSTATS_PYTHON || join(homedir(), ".cuvette/envs/biostats/bin/python");
const DIR = resolve("catalog/biostats");
const ROSSI = join(DIR, "data/rossi.csv");

function call(fn: string, args: Record<string, unknown>): { ok: boolean; error?: string; summary?: string; manual_route?: string; metrics?: Record<string, number> } {
  const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(DIR)})\nimport ga_biostats as b\nprint(json.dumps(b.${fn}(**json.loads(sys.argv[1]))))`;
  const out = execFileSync(PY, ["-c", code, JSON.stringify(args)], { encoding: "utf8", cwd: mkdtempSync(join(tmpdir(), "biostats-")), env: { ...process.env, PYTHONWARNINGS: "ignore" } });
  return JSON.parse(out.trim().split("\n").at(-1)!);
}

describe.skipIf(!existsSync(PY))("biostats fit_cox", () => {
  test.each(["efron", "breslow"])("an empty covariate list gives a clear error with %s ties", (ties) => {
    for (const covariates of ["", " , "]) {
      const r = call("fit_cox", { path: ROSSI, duration: "week", event: "arrest", covariates, ties });
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/covariate list is empty/);
    }
  });

  test("one covariate still fits", () => {
    const r = call("fit_cox", { path: ROSSI, duration: "week", event: "arrest", covariates: "fin", ties: "breslow" });
    expect(r.ok).toBe(true);
    expect(r.metrics!.n).toBe(432);
  });
});

describe.skipIf(!existsSync(PY))("biostats fit_mixed_model", () => {
  test("rows with a blank outcome are dropped, counted and shown in the manual route", () => {
    const lines = readFileSync(join(DIR, "data/sleepstudy.csv"), "utf8").trim().split("\n");
    const header = lines[0].split(",");
    const col = header.indexOf("Reaction");
    const blanked = lines.map((l, i) => {
      if (![5, 50, 100].includes(i)) return l;
      const cells = l.split(",");
      cells[col] = "";
      return cells.join(",");
    });
    const file = join(mkdtempSync(join(tmpdir(), "mixed-")), "sleep_blank.csv");
    writeFileSync(file, blanked.join("\n") + "\n");
    const r = call("fit_mixed_model", { path: file, formula: "Reaction ~ Days", groups: "Subject" });
    expect(r.ok).toBe(true);
    expect(r.metrics!.n).toBe(177);
    expect(r.metrics!.n_dropped).toBe(3);
    expect(r.summary).toMatch(/Dropped 3 of 180 rows with a missing value in Reaction\./);
    expect(r.manual_route).toMatch(/dropna\(subset=\[.*'Reaction'.*'Subject'\]\)  # drops 3 rows/);
  });

  test("a complete file drops no rows and keeps the map route", () => {
    const r = call("fit_mixed_model", { path: join(DIR, "data/sleepstudy.csv"), formula: "Reaction ~ Days", groups: "Subject", re_formula: "~Days" });
    expect(r.metrics!.n_dropped).toBe(0);
    expect(r.manual_route).toBeUndefined();
    expect(r.metrics!.se_Days).toBeCloseTo(1.546, 3);
  });
});
