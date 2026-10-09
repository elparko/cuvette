import { join } from "node:path";
import { existsSync } from "node:fs";
import { fail, readParams, result, runCellProfiler, stageImages, summarize, writeTable } from "./lib.mjs";

const p = readParams();
if (!existsSync(p.pipeline)) fail(`Pipeline not found: ${p.pipeline}`);
const dir = process.env.CUVETTE_CALL_DIR;
const files = stageImages(p.folder, join(dir, "input_images"), p);
runCellProfiler(p.pipeline, join(dir, "input_images"), join(dir, "cp_output"), (Number(process.env.CUVETTE_CALL_TIMEOUT_S) || 3000) * 1000);
const { rows, metrics, data } = summarize(join(dir, "cp_output"), p);
const table = process.env.CUVETTE_OUTPUT_PER_IMAGE;
writeTable(table, rows);
console.log(JSON.stringify(result(rows, metrics, data, { per_image: table, pipeline: p.pipeline, n_staged: files.length })));
