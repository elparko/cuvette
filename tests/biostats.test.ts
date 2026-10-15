import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const PY = process.env.CUVETTE_BIOSTATS_PYTHON || join(homedir(), ".cuvette/envs/biostats/bin/python");
const DIR = resolve("catalog/biostats");
const ROSSI = join(DIR, "data/rossi.csv");

function call(fn: string, args: Record<string, unknown>, mod = "ga_biostats"): { ok: boolean; error?: string; summary?: string; manual_route?: string; metrics?: Record<string, number> } {
  const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(DIR)})\nimport ${mod} as b\nprint(json.dumps(b.${fn}(**json.loads(sys.argv[1])), default=str))`;
  const out = execFileSync(PY, ["-c", code, JSON.stringify(args)], { encoding: "utf8", cwd: mkdtempSync(join(tmpdir(), "biostats-")), env: { ...process.env, PYTHONWARNINGS: "ignore" } });
  return JSON.parse(out.trim().split("\n").at(-1)!.replace(/\bNaN\b/g, "null"));
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

  test("chi-square, Fisher and McNemar name the rows with a missing category", () => {
    const p = write("c.csv", "r,c\nx,p\ny,q\nx,p\n,q\ny,p\nx,\ny,q\nx,q\n");
    for (const fn of ["chi_square_test", "fisher_exact"]) {
      const r = call(fn, { path: p, row: "r", column: "c", ...(fn === "chi_square_test" ? { correction: false } : {}) });
      expect(r.metrics!.n).toBe(6);
      expect(r.metrics!.n_dropped).toBe(2);
      expect(r.summary).toMatch(/Dropped 2 rows with a missing value in r, c\./);
    }
    const m = write("m.csv", "a,b\n1,1\n1,0\n0,0\n,1\n0,1\n");
    const r = call("mcnemar_test", { path: m, first: "a", second: "b", method: "exact" });
    expect(r.metrics!.n_pairs).toBe(4);
    expect(r.summary).toMatch(/Dropped 1 row with a missing value in a, b\./);
  });

  test("a mixed ANOVA takes epsilon and Mauchly from the mixed model, and runs with 2 levels", () => {
    const rows: string[] = [];
    for (let s = 0; s < 12; s++) for (const [k, t] of ["t1", "t2", "t3"].entries()) rows.push(`${s},${s < 6 ? "A" : "B"},${t},${(s % 5) * 0.7 + k * (s < 6 ? 0.3 : 1.5) + ((s * 7 + k * 3) % 5) * (s < 6 ? 0.2 : 0.2 + k * 0.4)}`);
    const p = write("mx.csv", "s,g,t,y\n" + rows.join("\n") + "\n");
    const pg = execFileSync(PY, ["-c", `import pandas as pd, pingouin as pg, json\nt = pg.mixed_anova(data=pd.read_csv(${JSON.stringify(p)}), dv="y", within="t", subject="s", between="g", correction=True)\nr = t[t.Source == "t"].iloc[0]\nprint(json.dumps([float(r.eps), float(r.p_spher)]))`], { encoding: "utf8" });
    const [eps, pSpher] = JSON.parse(pg.trim());
    const r = call("anova_repeated", { path: p, outcome: "y", within: "t", subject: "s", between: "g", correction: "auto" }, "ga_anova");
    expect(r.metrics!.epsilon_gg).toBeCloseTo(eps, 10);
    expect(r.metrics!.mauchly_p).toBeCloseTo(pSpher, 10);
    const two = write("mx2.csv", "s,g,t,y\n" + rows.filter((x) => !x.includes(",t3,")).join("\n") + "\n");
    const r2 = call("anova_repeated", { path: two, outcome: "y", within: "t", subject: "s", between: "g", correction: "auto" }, "ga_anova");
    expect(r2.ok).toBe(true);
    expect(r2.metrics!.epsilon_gg).toBe(1);
  });

  test("Friedman with 2 levels fails with a pointer; a paired rank test names the unpaired subjects", () => {
    const p = write("f.csv", "s,t,y\n1,a,1\n1,b,2\n2,a,2\n2,b,3.5\n3,a,3\n3,b,3.2\n4,a,1\n");
    const f = call("friedman_test", { path: p, outcome: "y", within: "t", subject: "s", p_adjust: "holm" }, "ga_anova");
    expect(f.ok).toBe(false);
    expect(f.error).toMatch(/3 or more levels.*rank_test with paired true/);
    const r = call("rank_test", { path: p, outcome: "y", group: "t", paired: true, id_column: "s", method: "asymptotic" }, "ga_anova");
    expect(r.summary).toMatch(/leaves out 1 subject with a value in only one group/);
  });

  test("a CSV in Windows-1252 reads", () => {
    const p = join(mkdtempSync(join(tmpdir(), "biostats-data-")), "w.csv");
    writeFileSync(p, Buffer.from("Gruppe,Wert\nKontrolle µ,1\nKontrolle µ,2\nBehandlung é,3\nBehandlung é,4\n", "latin1"));
    expect(call("compare_two_groups", { path: p, outcome: "Wert", group: "Gruppe" }).ok).toBe(true);
  });

  test("Kaplan-Meier names the rows with a missing time, event or group", () => {
    const p = write("k.csv", "t,e,g\n1,1,a\n2,0,a\n3,1,a\n4,1,b\n5,0,b\n6,1,\n,1,b\n7,1,b\n");
    const r = call("kaplan_meier", { path: p, duration: "t", event: "e", group: "g" });
    expect(r.metrics!.n).toBe(6);
    expect(r.metrics!.n_dropped).toBe(2);
    expect(r.summary).toMatch(/Dropped 2 rows with a missing value/);
  });
  test("a numeric column with the placeholders - ? and . stays numeric and the count is reported", () => {
    const p = write("ph.csv", "g,y,x,w\na,1.1,2.0,3\na,-,2.5,4\na,1.3,?,5\na,1.0,3.1,6\nb,2.2,.,7\nb,2.4,4.0,8\nb,2.1,4.2,9\nb,2.6,5.0,10\n");
    const t = call("compare_two_groups", { path: p, outcome: "y", group: "g" });
    expect(t.ok).toBe(true);
    expect(t.metrics!.n_placeholder_cells).toBe(3);
    expect(t.summary).toMatch(/3 cells in numeric columns hold a placeholder/);
    const o = call("fit_ols", { path: p, formula: "y ~ x" });
    expect(o.ok).toBe(true);
    expect(o.summary).toMatch(/x 0\.578/);
    expect(o.summary).not.toMatch(/x\[/);
    const a = call("kruskal_dunn", { path: p, outcome: "y", group: "g", p_adjust: "none" }, "ga_anova");
    expect(a.ok).toBe(true);
    expect(a.metrics!.n_placeholder_cells).toBe(3);
  });

  test("a text column with a placeholder stays text", () => {
    const p = write("ph2.csv", "g,y\na,1\na,2\nb,3\nb,-\nb,x\n");
    const r = call("inspect_table", { path: p });
    expect(r.metrics!.n_placeholder_cells).toBeUndefined();
  });
});
