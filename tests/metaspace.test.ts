import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "vitest";

const DIR = resolve("catalog/metaspace");

const py = (code: string): unknown =>
  JSON.parse(execFileSync("python3", ["-I", "-c", `import sys, json; sys.path.insert(0, ${JSON.stringify(DIR)}); import wrapper as w; print(json.dumps(${code}))`], { encoding: "utf8" }));

test("a tool for one dataset says so when it gets two ids", () => {
  for (const fn of ["get_dataset_info", "compare_fdr_counts", "list_annotations"]) {
    const r = py(`w.${fn}("2022-08-16_10h14m23s,2022-08-16_12h31m33s")`) as { ok: boolean; error: string };
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/takes one id, and you gave 2 .*Call the tool once for each dataset/);
  }
});

test("ids joined with a comma, a bar or a space split the same way", () => {
  expect(py(`w._split_ids("a, b|c d")`)).toEqual(["a", "b", "c", "d"]);
});
