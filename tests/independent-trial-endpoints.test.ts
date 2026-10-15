import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { openAdapter, programOf, type OpenAdapter } from "./independent.ts";

const rscript = await programOf("trial-endpoints");
const slow = 600_000;

describe.skipIf(!rscript)("trial endpoints event coding", () => {
  let trial: OpenAdapter;
  let root: string;
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "cuvette-trial-endpoints-"));
    trial = await openAdapter("trial-endpoints");
  });
  afterAll(async () => {
    await trial?.close();
    rmSync(root, { recursive: true, force: true });
  });

  const write = (name: string, codes: [string, string]) => {
    const file = join(root, name);
    const rows = ["arm,time,status"];
    for (let i = 0; i < 12; i++) {
      rows.push(`drug,${10 + i * 3},${i % 3 === 0 ? codes[1] : codes[0]}`);
      rows.push(`control,${6 + i * 2},${i % 2 === 0 ? codes[1] : codes[0]}`);
    }
    writeFileSync(file, rows.join("\n") + "\n");
    return file;
  };
  const args = (data: string) => ({ data, arm_col: "arm", time_col: "time", event_col: "status", group_a: "drug", group_b: "control" });

  test("a status column coded 1 and 2 needs event_value", { timeout: slow }, async () => {
    const file = write("coded-12.csv", ["1", "2"]);
    await expect(trial.run("compare_survival_endpoint", args(file))).rejects.toThrow(/Give event_value/);
    const ok = await trial.run("compare_survival_endpoint", { ...args(file), event_value: "2" });
    expect(ok.metrics.events_a + ok.metrics.events_b).toBe(4 + 6);
  });

  test("a status column coded 0 and 1 needs no event_value", { timeout: slow }, async () => {
    const out = await trial.run("compare_survival_endpoint", args(write("coded-01.csv", ["0", "1"])));
    expect(out.metrics.events_a + out.metrics.events_b).toBe(4 + 6);
  });
});
