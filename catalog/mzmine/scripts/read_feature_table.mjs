import { existsSync, fail, readParams, summarizeTable } from "./lib.mjs";

const p = readParams();
if (!existsSync(p.path)) fail(`File not found: ${p.path}`);
const s = summarizeTable(p.path);
console.log(JSON.stringify({ ok: true, metrics: s.metrics, per_file: s.per_file, table: s.table }));
