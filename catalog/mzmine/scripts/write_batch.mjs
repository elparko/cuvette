import { writeFileSync } from "node:fs";
import { readParams, renderBatch } from "./lib.mjs";

const { text, values, stop } = renderBatch(readParams());
const out = process.env.GA_OUTPUT_BATCH;
writeFileSync(out, text);
console.log(JSON.stringify({ ok: true, batch: out, stop_after: stop, settings: values, outputs: [{ path: out, kind: "file", name: "batch.mzbatch" }] }));
