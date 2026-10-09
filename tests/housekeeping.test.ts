import { expect, test } from "vitest";
import { role, roleInRecord, stepNumbers } from "../src/core/housekeeping.ts";
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
