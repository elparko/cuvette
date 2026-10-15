import { expect, test } from "vitest";
import { commands, windowsOpenArgs } from "../src/ui/commands.ts";

const run = (path: string) => {
  const out = { errors: [] as string[], notices: [] as string[] };
  const ctx = { outputs: () => [{ n: 1, path, kind: "file" }], error: (m: string) => out.errors.push(m), notice: (m: string) => out.notices.push(m) };
  commands.find((c) => c.name === "open")!.run(["1"], ctx as never);
  return out;
};

test("/open shows the path of a program file and does not open it", () => {
  for (const ext of ["command", "sh", "bat", "cmd", "exe", "jar", "app", "ps1", "scpt", "SH"]) {
    const out = run(`/work/run.${ext}`);
    expect(out.errors[0]).toContain(`/work/run.${ext}`);
    expect(out.notices).toEqual([]);
  }
});

test("/open opens a data file", () => {
  expect(run("/work/results.csv")).toEqual({ errors: [], notices: ["Opening /work/results.csv"] });
});

test("the Windows open command quotes the path so that & stays in the name", () => {
  expect(windowsOpenArgs("C:\\data\\a & b.csv")).toEqual(["/c", "start", '""', '"C:\\data\\a & b.csv"']);
  expect(windowsOpenArgs('C:\\data\\a"b.csv')[3]).toBe('"C:\\data\\ab.csv"');
});
