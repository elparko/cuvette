import { readFileSync } from "node:fs";
import type { Tool } from "../../../src/core/types.ts";

function column(path: string, name: string): number[] {
  const [head, ...rows] = readFileSync(path, "utf8").trim().split("\n");
  const i = head.split(",").indexOf(name);
  if (i < 0) throw new Error(`no column ${name} in ${path}`);
  return rows.map((r) => Number(r.split(",")[i]));
}

const tools: Tool[] = [
  {
    name: "mean_of",
    description: "Compute the mean of one column of a CSV file.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Path of the CSV file." }, column: { type: "string", description: "Name of the column." } },
      required: ["path", "column"],
    },
    source: "adapter",
    readOnly: true,
    async execute(a) {
      try {
        const v = column(String(a.path), String(a.column));
        const mean = v.reduce((s, x) => s + x, 0) / v.length;
        return { ok: true, summary: `mean ${mean}`, metrics: { mean } };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },
  },
  {
    name: "count_rows",
    description: "Count the data rows of a CSV file.",
    inputSchema: { type: "object", properties: { path: { type: "string", description: "Path of the CSV file." } }, required: ["path"] },
    source: "adapter",
    readOnly: true,
    async execute(a) {
      const n = readFileSync(String(a.path), "utf8").trim().split("\n").length - 1;
      return { ok: true, summary: `${n} rows`, metrics: { n_rows: n } };
    },
  },
];

export default { tools };
