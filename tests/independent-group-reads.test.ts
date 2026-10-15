import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, programOf, pyJson } from "./independent.ts";

const python = await programOf("biostats");
const slow = 600_000;

describe.skipIf(!python)("table readers keep None as a label and read NA as missing", () => {
  let root: string;
  let file: string;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "cuvette-group-reads-"));
    file = join(root, "groups.csv");
    writeFileSync(file, "cell,group,value\nc1,None,1\nc2,NA,2\nc3,null,3\nc4,A,4\nc5,,5\n");
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  const read = (folder: string, module: string, call: string) =>
    pyJson<(string | null)[]>(
      python!,
      `import sys
sys.path.insert(0, ${JSON.stringify(join(CATALOG, folder))})
import ${module} as m
frame = ${call}
print(json.dumps([None if v != v else v for v in frame["group"].tolist()]))`,
      root,
    );

  test("the bench assay reader", { timeout: slow }, async () => {
    expect(await read("bench-assays", "ga_bench_assays", `m.load(${JSON.stringify(file)})`)).toEqual(["None", null, null, "A", null]);
  });

  test("the patch clamp reader", { timeout: slow }, async () => {
    expect(await read("patch-clamp", "pc_read", `m.read_labels_csv(${JSON.stringify(file)})`)).toEqual(["None", null, null, "A", null]);
  });
});
