import { writeFileSync } from "node:fs";
import { zip } from "../../src/eln/zip.ts";

export function writeXlsx(path: string, sheets: { name: string; rows: (string | number)[][] }[]): string {
  const col = (i: number) => String.fromCharCode(65 + i);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const files = [
    { name: "xl/workbook.xml", data: Buffer.from(`<workbook xmlns:r="r"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`) },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(`<Relationships>${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`) },
    ...sheets.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: Buffer.from(`<worksheet><sheetData>${s.rows.map((r, y) => `<row r="${y + 1}">${r.map((v, x) => (typeof v === "number" ? `<c r="${col(x)}${y + 1}"><v>${v}</v></c>` : `<c r="${col(x)}${y + 1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`)).join("")}</row>`).join("")}</sheetData></worksheet>`),
    })),
  ];
  writeFileSync(path, zip(files));
  return path;
}
