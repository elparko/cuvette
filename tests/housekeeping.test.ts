import { expect, test } from "vitest";
import { activity, makesNode, role, roleInRecord, stepNumbers } from "../src/core/housekeeping.ts";
import type { Entry, Node } from "../src/core/types.ts";

let id = 0;
const ent = (kind: Entry["kind"], data: Record<string, unknown>, node?: string): Entry => ({ id: ++id, ts: "", session: "s", kind, data, ...(node ? { node } : {}) });
const result = (tool: string, ok: boolean, extra: Record<string, unknown> = {}, node?: string) => ent("tool_result", { tool, ok, ...extra }, node);

test("a call that makes a result node is an analysis step", () => {
  expect(role(result("compare_two_groups", true, { adapter: "biostats" }, "n1"))).toBe("analysis");
  expect(role(result("run_script", true, {}, "n2"))).toBe("analysis");
  expect(role(result("calculate", true, {}, "n3"))).toBe("analysis");
});

test("a call with no node is housekeeping, whatever its name", () => {
  for (const t of ["list_dir", "read_file", "list_adapters", "load_skill", "find_tools", "run_command", "some_new_tool"]) expect(role(result(t, true))).toBe("housekeeping");
});

test("a comparison run is housekeeping even with a node", () => {
  expect(role(result("blur", true, { adapter: "fake", sensitivityOf: "sigma" }, "n4"))).toBe("housekeeping");
});

test("a failed call is housekeeping only if a later call in the same turn worked", () => {
  const fail = result("run_script", false);
  const other = result("list_dir", true);
  const retry = result("run_script", true, {}, "n5");
  expect(role(fail)).toBe("failed");
  expect(role(fail, [other])).toBe("failed");
  expect(role(fail, [other, retry])).toBe("housekeeping");
  expect(role(fail, [ent("user", { text: "go on" }), retry])).toBe("failed");
  const look = result("read_file", false);
  expect(role(look, [other])).toBe("housekeeping");
  expect(role(look, [])).toBe("failed");
});

test("roleInRecord looks at the entries after the failed call", () => {
  const ask = ent("user", { text: "x" });
  const fail = result("calculate", false);
  const all = [ask, fail, result("calculate", true, {}, "n6")];
  expect(roleInRecord(all, fail)).toBe("housekeeping");
  expect(roleInRecord(all.slice(0, 2), fail)).toBe("failed");
});

test("harness notes and allowed permissions are housekeeping; the rest stays in the main view", () => {
  expect(role(ent("notice", { text: "The agent called x with the same input three times. The harness asks for the final answer." }))).toBe("housekeeping");
  expect(role(ent("notice", { text: "converted a tool call written as text" }))).toBe("housekeeping");
  expect(role(ent("notice", { text: "Stopped." }))).toBe("main");
  expect(role(ent("permission", { decision: "allowed" }))).toBe("housekeeping");
  expect(role(ent("permission", { decision: "denied" }))).toBe("main");
  for (const k of ["user", "question", "answer", "decision", "deviation", "finding", "error", "note", "setup"] as const) expect(role(ent(k, {}))).toBe("main");
  expect(role(ent("assistant", { text: "I will open the file.", final: false }))).toBe("main");
});

test("step numbers count the result nodes and skip comparison runs", () => {
  const nodes = [{ id: "n1" }, { id: "n2", sensitivityOf: "sigma" }, { id: "n3" }] as Node[];
  expect([...stepNumbers(nodes)]).toEqual([["n1", 1], ["n3", 2]]);
});

test("the activity text says what the call does in plain words, never only a tool name", () => {
  expect(activity("list_dir", { path: "/data/LDL/", purpose: "look at the folders in LDL to find the image sets" })).toBe("Look at the folders in LDL to find the image sets");
  expect(activity("list_dir", { path: "/data/LDL/" })).toBe("Looking at the folder LDL");
  expect(activity("read_file", { path: "/d/sleep.csv" })).toBe("Reading sleep.csv");
  expect(activity("run_script", { code: "x", purpose: "measure nuclei in 24 images." })).toBe("Running a script: measure nuclei in 24 images");
  expect(activity("run_script", { code: "print(1)" })).toBe("Running a script");
  expect(activity("run_command", { argv: ["/bin/ls", "-l"] })).toBe("Running the command ls");
  expect(activity("list_adapters", {})).toBe("Checking the adapter list");
  expect(activity("compare_two_groups", { file: "/d/sleep.csv", paired: true }, "Compare two groups")).toBe("Compare two groups: sleep.csv");
  expect(activity("fit_mixed_model", {})).toBe("Fit mixed model");
});

test("a script that writes no file and gives no number to cite makes no result node", () => {
  const script = { name: "run_script", source: "harness" };
  const list = { purpose: "Find the image sets", does: "Lists the folders in LDL and the files in each one." };
  expect(makesNode(script, list, { ok: true, outputs: [], text: "LDL/Set 1 ['20X_CH1.tif']" })).toBe(false);
  expect(makesNode(script, {}, { ok: true, outputs: [], text: "done" })).toBe(false);
  expect(makesNode(script, { does: "Measures the mean intensity of each image." }, { ok: true, outputs: [], text: "mean 76.9" })).toBe(true);
  expect(makesNode(script, list, { ok: true, outputs: [{ path: "/w/files.csv" }], text: "" })).toBe(true);
  expect(makesNode(script, {}, { ok: true, outputs: [], text: "t = 4.06, p = 0.0028" })).toBe(true);
  expect(makesNode(script, list, { ok: false, outputs: [{ path: "/w/files.csv" }] })).toBe(false);
  expect(makesNode({ name: "compare_two_groups", source: "adapter" }, {}, { ok: true })).toBe(true);
  expect(makesNode({ name: "calculate", source: "harness" }, {}, { ok: true })).toBe(true);
  expect(makesNode({ name: "list_dir", source: "generic" }, {}, { ok: true })).toBe(false);
});
