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

describe.skipIf(!existsSync(PY))("biostats exclusions and coding", () => {
  const write = (name: string, text: string) => {
    const p = join(mkdtempSync(join(tmpdir(), "biostats-data-")), name);
    writeFileSync(p, text);
    return p;
  };

  test("an event column coded 1 and 2 is refused, not counted as all events", () => {
    const p = write("s.csv", "time,status\n" + Array.from({ length: 10 }, (_, i) => `${i + 1},${1 + (i % 2)}`).join("\n") + "\n");
    for (const fn of ["kaplan_meier", "fit_cox"]) {
      const r = call(fn, { path: p, duration: "time", event: "status", ...(fn === "fit_cox" ? { covariates: "time" } : {}) });
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/must hold 1 for an event and 0/);
    }
  });

  test("a paired test names the subjects it leaves out and the repeated rows", () => {
    const p = write("p.csv", "id,g,y\n1,pre,1\n1,post,2\n2,pre,2\n2,post,3.5\n3,pre,3\n4,pre,1\n4,post,2.2\n5,pre,2\n5,post,2.9\n5,post,9\n");
    const r = call("compare_two_groups", { path: p, outcome: "y", group: "g", paired: true, id_column: "id" });
    expect(r.metrics!.n_a).toBe(4);
    expect(r.summary).toMatch(/leaves out 1 subject that has a value in only one group/);
    expect(r.summary).toMatch(/1 subject has more than one row in one group/);
  });

  test("an unpaired test and OLS name the rows with no value", () => {
    const p = write("u.csv", "g,y\nA,1\nA,2\nA,\nA,3\nB,4\nB,5\nB,6\n");
    expect(call("compare_two_groups", { path: p, outcome: "y", group: "g" }).summary).toMatch(/leaves out 1 row that has no value for y/);
    const o = write("o.csv", "y,x\n1,1\n2,2\n,3\n4,4\n5,6\n7,7\n");
    const r = call("fit_ols", { path: o, formula: "y ~ x" });
    expect(r.metrics!.n_dropped).toBe(1);
    expect(r.summary).toMatch(/Dropped 1 of 6 rows with a missing value/);
  });

  test("Welch ANOVA with a Bonferroni post-hoc says that it uses Games-Howell", () => {
    const rows = Array.from({ length: 30 }, (_, i) => `${(i % 7) * (1 + (i % 3))},${"ABC"[i % 3]}`);
    const p = write("a.csv", "y,g\n" + rows.join("\n") + "\n");
    const r = call("anova_oneway", { path: p, outcome: "y", group: "g", variance: "unequal", posthoc: "bonferroni" });
    expect(r.summary).toMatch(/Games-Howell, not bonferroni/);
    expect(r.summary).toMatch(/Post-hoc: games-howell/);
  });
});
