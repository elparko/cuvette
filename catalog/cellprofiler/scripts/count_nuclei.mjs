import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { readParams, renderPipeline, result, runCellProfiler, stageImages, summarize, writeTable } from "./lib.mjs";

const p = readParams();
const { text, values } = renderPipeline(p);
const pipeline = process.env.CUVETTE_OUTPUT_PIPELINE;
writeFileSync(pipeline, text);
const dir = process.env.CUVETTE_CALL_DIR;
const files = stageImages(p.folder, join(dir, "input_images"), p);
runCellProfiler(pipeline, join(dir, "input_images"), join(dir, "cp_output"), (Number(process.env.CUVETTE_CALL_TIMEOUT_S) || 3000) * 1000);
const { rows, metrics, data } = summarize(join(dir, "cp_output"), p);
const table = process.env.CUVETTE_OUTPUT_PER_IMAGE;
writeTable(table, rows);
console.log(JSON.stringify(result(rows, metrics, data, { per_image: table, pipeline, settings: values, n_staged: files.length })));
