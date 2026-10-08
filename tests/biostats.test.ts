import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const PY = process.env.GA_BIOSTATS_PYTHON || join(homedir(), ".guided-analysis/envs/biostats/bin/python");
const DIR = resolve("catalog/biostats");
const ROSSI = join(DIR, "data/rossi.csv");

function call(fn: string, args: Record<string, unknown>): { ok: boolean; error?: string; metrics?: Record<string, number> } {
  const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(DIR)})\nimport ga_biostats as b\nprint(json.dumps(b.${fn}(**json.loads(sys.argv[1]))))`;
  const out = execFileSync(PY, ["-c", code, JSON.stringify(args)], { encoding: "utf8", cwd: resolve("."), env: { ...process.env, PYTHONWARNINGS: "ignore" } });
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
