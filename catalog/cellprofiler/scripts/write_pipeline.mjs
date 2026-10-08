import { writeFileSync } from "node:fs";
import { readParams, renderPipeline } from "./lib.mjs";

const p = readParams();
const { text, values } = renderPipeline(p);
const out = process.env.GA_OUTPUT_PIPELINE;
writeFileSync(out, text);
console.log(JSON.stringify({ ok: true, pipeline: out, settings: values, outputs: [{ path: out, kind: "file", name: "pipeline.cppipe" }] }));
