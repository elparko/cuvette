import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { addedSteps, approvedPlan, currentPlan, definitionFindings, matchStep, mergePlan, openDecisions, planFindings, planMarkdown, planText, planView, readPlan, type AnalysisPlan } from "../src/core/plan.ts";
import { AnalysisRecord } from "../src/core/record.ts";

export const SLEEP_PLAN = {
  question: "Does drug 2 give more extra sleep than drug 1?",
  data: { files: ["sleep.csv"], row: "One patient on one drug.", replicate: "One patient.", n: "10 patients, 2 drugs each." },
  programs: [{ part: "Statistics", adapter: "biostats", why: "It has a paired t test.", alternatives: ["lme4"] }],
  steps: [
    { step: "Look at the table", tool: "inspect_table", status: "done" },
    {
      step: "Compare the two drugs",
      method: "Paired t test",
      tool: "compare_two_groups",
      decisions: [
        { key: "paired", label: "Paired test", value: true },
        { key: "alpha", label: "Significance level" },
      ],
    },
  ],
  outputs: ["Mean difference", "95% confidence interval", "p value"],
  checks: [{ check: "The differences are near normal.", if_fails: "Use a Wilcoxon signed-rank test." }],
  out_of_scope: ["Side effects"],
};

function record() {
  return new AnalysisRecord(mkdtempSync(join(tmpdir(), "ga-plan-")), "s1");
}

test("the plan text has every section in plain words", () => {
  const text = planText(readPlan(SLEEP_PLAN));
  expect(text).toContain("Question: Does drug 2 give more extra sleep than drug 1?");
  for (const h of ["Data", "Programs", "Steps", "Outputs", "Checks", "Out of scope"]) expect(text).toMatch(new RegExp(`^${h}$`, "m"));
  expect(text).toContain("- Unit of replication: One patient.");
  expect(text).toContain("- Sample size: 10 patients, 2 drugs each.");
  expect(text).toContain("- Statistics: biostats. It has a paired t test. Other choices: lme4.");
  expect(text).toContain("2. Compare the two drugs");
  expect(text).toContain("   Method: Paired t test");
  expect(text).toContain("   - Paired test: true");
  expect(text).toContain("   - Significance level: open, you decide.");
  expect(text).toContain("- The differences are near normal. If it fails: Use a Wilcoxon signed-rank test.");
});

test("a short plan has only the parts it gives", () => {
  expect(planText(readPlan({ question: "What is in the file?", steps: [{ step: "Read the file", tool: "read_file" }] }))).toBe("Question: What is in the file?\n\nSteps\n1. Read the file\n   Tool: read_file");
});

test("open decisions are the decisions with no value", () => {
  const plan = readPlan(SLEEP_PLAN) as AnalysisPlan;
  expect(openDecisions(plan).map((d) => [d.step, d.decision.key])).toEqual([[2, "alpha"]]);
});

test("merge updates a step by its text and adds new steps", () => {
  const plan = readPlan(SLEEP_PLAN) as AnalysisPlan;
  const next = mergePlan(plan, readPlan({ steps: [{ step: "compare the two drugs", status: "done" }, { step: "Plot the differences", tool: "run_script" }] }));
  expect(next.steps.map((s) => [s.step, s.status])).toEqual([["Look at the table", "done"], ["Compare the two drugs", "done"], ["Plot the differences", "todo"]]);
  expect(next.steps[1]!.method).toBe("Paired t test");
  expect(addedSteps(plan, next).map((s) => s.step)).toEqual(["Plot the differences"]);
  expect(next.question).toBe(plan.question);
});

test("a tool matches the plan step by tool name or by the step text", () => {
  const plan = readPlan(SLEEP_PLAN) as AnalysisPlan;
  expect(matchStep(plan, "compare_two_groups")).toBe(1);
  expect(matchStep(plan, "biostats_compare_two_groups")).toBe(1);
  expect(matchStep(plan, "fit_cox")).toBe(-1);
  expect(matchStep({ steps: [{ step: "Paired t test", tool: "biostats", status: "todo" }] }, "compare_two_groups", "biostats")).toBe(0);
  expect(matchStep({ steps: [{ step: "Paired t test", tool: "biostats", status: "todo" }] }, "compare_two_groups", "lme4")).toBe(-1);
  expect(matchStep({ steps: [{ step: "Run inspect table first", status: "todo" }] }, "inspect_table")).toBe(0);
});

test("the approved plan, its changes and the review findings come from the record", () => {
  const r = record();
  expect(approvedPlan(r)).toBeUndefined();
  expect(planFindings(r)).toEqual([]);
  const plan = readPlan(SLEEP_PLAN) as AnalysisPlan;
  r.append("plan", { action: "proposed", version: 1, text: "draft", full: planText(plan), plan });
  expect(planView(r)).toMatchObject({ approved: false, version: 1 });
  r.append("plan_approved", { version: 1, text: planText(plan), plan, mode: "watch" });
  const extra = mergePlan(plan, readPlan({ steps: [{ step: "Fit a Cox model", tool: "fit_cox" }] }));
  r.append("plan", { action: "updated", version: 2, reason: "The scientist asked for survival.", text: planText(extra), plan: extra });
  const a = approvedPlan(r)!;
  expect(a.version).toBe(1);
  expect(a.updates).toEqual([expect.objectContaining({ version: 2, reason: "The scientist asked for survival." })]);
  expect(currentPlan(r)!.steps).toHaveLength(3);
  expect(planView(r)).toMatchObject({ approved: true, version: 2 });
  expect(planMarkdown(r).join("\n")).toMatch(/## Proposed analysis \(version 1, confirmed .*\)\n\n### Proposed metrics\n\nQuestion: Does drug 2[\s\S]*### Changes after confirmation\n\n- Version 2: The scientist asked for survival\./);
  const missing = planFindings(r);
  expect(missing.map((f) => f.check)).toEqual(["plan_step_missing", "plan_step_missing"]);
  expect(missing[0]!.message).toContain("step 2 (Compare the two drugs)");
});

test("a step that ran after approval and is not in the plan is a finding; the look before the plan is not", () => {
  const r = record();
  const plan = readPlan({ steps: [{ step: "Paired t test", tool: "compare_two_groups" }] }) as AnalysisPlan;
  const node = (tool: string, entry = 99) => r.addNode({ entry, adapter: "biostats", adapterVersion: "1", programVersion: "1", tool, args: {}, decisions: {}, codeHash: "", inputHashes: [], outputs: [], result: {}, parents: [], summary: "", model: "m", manualRoute: "", fidelity: "none" });
  node("inspect_table", 0);
  r.append("plan_approved", { version: 1, text: planText(plan), plan });
  node("compare_two_groups");
  node("fit_ols");
  expect(planFindings(r)).toEqual([expect.objectContaining({ check: "plan_step_extra", message: "The step fit_ols is not in the approved plan, and the plan was not updated with a reason." })]);
});

const CELLS = {
  restatement: "You want: for each field, the number of cells that took up red particles, and the number of all cells.",
  question: "How many cells in each field took up red particles?",
  definitions: [
    { measure: "cell", definition: "An object in the brightfield image between 300 and 15,000 pixels." },
    { measure: "positive cell", definition: "A cell with at least 1 red pixel inside its outline." },
  ],
  exclusions: [{ what: "Clumps over 15,000 px are left out.", effect: "On the pilot field this leaves out about 40% of the area with cells, and the red inside it." }],
  pilot: { sample: "Set 1", shows: ["The overlay image with a legend", "The counts for Set 1"] },
  reference: { path: "/p/Analysis.xlsx", sheet: "Ox-LDL", columns: ["Red dots", "Total cells"], question: "The reference counts 'Red dots'. Is that the number of red-positive cells, or the number of red spots?" },
  steps: [{ step: "Count the cells in each field", tool: "count" }],
};

test("the restatement opens the proposed analysis; the definitions, exclusions with effects, pilot and reference have their own sections", () => {
  const text = planText(readPlan(CELLS));
  expect(text.split("\n")[0]).toBe("You want: for each field, the number of cells that took up red particles, and the number of all cells.");
  expect(text).toContain("Metrics\n- cell: An object in the brightfield image between 300 and 15,000 pixels.\n- positive cell: A cell with at least 1 red pixel inside its outline.");
  expect(text).toContain("What I will leave out, and what it does\n- Clumps over 15,000 px are left out. Effect: On the pilot field this leaves out about 40% of the area with cells, and the red inside it.");
  expect(text).toContain("Demonstration on a sample\n- First sample: Set 1. The metrics run on this sample only. You check the result before the other samples run.\n- You will see: The overlay image with a legend");
  expect(text).toContain("Reference\n- /p/Analysis.xlsx, sheet Ox-LDL, columns Red dots, Total cells\n- The reference counts 'Red dots'. Is that the number of red-positive cells, or the number of red spots?");
});

test("the review flags a reported measure that has no definition in the answer", () => {
  const r = record();
  const plan = readPlan(CELLS) as AnalysisPlan;
  r.append("plan_approved", { version: 1, text: planText(plan), plan });
  expect(definitionFindings(r, "Set 1 has 296 positive cells.")).toEqual([
    { check: "measure_without_definition", severity: "warning", message: "The answer reports positive cell but does not say what it counts. Add the definition: A cell with at least 1 red pixel inside its outline." },
  ]);
  expect(definitionFindings(r, "Set 1 has 296 positive cells (a positive cell has at least 1 red pixel inside its outline).")).toEqual([]);
  expect(definitionFindings(r, "The mean is 3.")).toEqual([]);
});
