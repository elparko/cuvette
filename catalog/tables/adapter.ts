import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { AdapterModule } from "../../src/adapters/manifest.ts";
import { outputDir, readTable, sheetName, xlsx, type Sheet } from "../../src/core/results.ts";
import type { Args, ToolContext, ToolOutput } from "../../src/core/types.ts";

const ROUTE =
  "In Excel: paste each table into its own sheet; View > Freeze Panes > Freeze Top Row; select the columns, Home > Format > AutoFit Column Width; File > Save As > Excel Workbook (.xlsx).";

export function writeXlsx(args: Args, ctx: Pick<ToolContext, "workDir">): ToolOutput {
  const list = Array.isArray(args.tables) ? args.tables : [];
  if (!list.length) return { ok: false, error: "Give at least one table: a list of {path, sheet}." };
  const used = new Set<string>();
  const sheets: Sheet[] = [];
  for (const item of list) {
    const t = (typeof item === "string" ? { path: item } : item) as { path?: unknown; sheet?: unknown };
    const path = String(t.path ?? "");
    if (![".csv", ".tsv"].includes(extname(path).toLowerCase())) return { ok: false, error: `${path} is not a CSV or TSV file. Read an Excel sheet with read_table first; it saves a CSV.` };
    const table = readTable(path);
    if (!table) return { ok: false, error: `Cannot read ${path}.` };
    sheets.push({ name: sheetName(String(t.sheet || basename(path, extname(path))), used), columns: table.columns, rows: table.rows });
  }
  const dir = outputDir({ workDir: ctx.workDir });
  mkdirSync(dir, { recursive: true });
  const stem = String(args.file_name || "tables").replace(/\.xlsx$/i, "").replace(/[^\w.-]+/g, "-") || "tables";
  let target = join(dir, `${stem}.xlsx`);
  for (let n = 2; existsSync(target); n++) target = join(dir, `${stem}-${n}.xlsx`);
  writeFileSync(target, xlsx(sheets));
  const info = sheets.map((s) => ({ name: s.name, rows: s.rows.length, columns: s.columns.length, number_cells: s.rows.flat().filter((v) => typeof v === "number").length }));
  const numbers = info.reduce((n, s) => n + s.number_cells, 0);
  return {
    ok: true,
    summary: `Wrote ${target} with ${info.length} sheets: ${info.map((s) => `${s.name} (${s.rows} rows)`).join(", ")}. Numbers are stored as numbers (${numbers} cells); the header row is frozen.`,
    metrics: { n_sheets: info.length, n_number_cells: numbers, n_rows: info.reduce((n, s) => n + s.rows, 0) },
    data: { path: target, sheets: info },
    outputs: [{ path: target, kind: "file", name: basename(target) }],
    manualRoute: ROUTE,
    fidelity: "exact",
  };
}

const mod: AdapterModule = {
  tools: [
    {
      name: "write_xlsx",
      title: "Write an Excel file",
      description:
        "Write CSV tables to an xlsx file in the output folder, one sheet each, with numbers as numbers, a frozen header row and readable column widths. Use it when the scientist asks for an Excel file.",
      inputSchema: {
        type: "object",
        properties: {
          tables: {
            type: "array",
            minItems: 1,
            description: "Tables to write, one sheet each: a list of {path, sheet}. path is a CSV or TSV file. sheet is the sheet name; the default is the file name.",
            items: { type: "object", properties: { path: { type: "string" }, sheet: { type: "string" } }, required: ["path"] },
          },
          file_name: { type: "string", default: "tables", description: "Name of the xlsx file, without the extension." },
        },
        required: ["tables"],
      },
      source: "adapter",
      execute: async (args, ctx) => writeXlsx(args, ctx),
    },
  ],
};

export default mod;
