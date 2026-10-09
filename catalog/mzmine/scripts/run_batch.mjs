import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { existsSync, fail, readLog, readParams, runMzmine, summarizeTable } from "./lib.mjs";

const p = readParams();
if (!existsSync(p.batch)) fail(`Batch file not found: ${p.batch}`);
const dir = process.env.CUVETTE_CALL_DIR;
const features = process.env.CUVETTE_OUTPUT_FEATURES;
const batch = join(dir, "batch_run.mzbatch");
writeFileSync(batch, readFileSync(p.batch, "utf8").replace(/<current_file>[^<]*<\/current_file>/, `<current_file>${features}</current_file>`));
const r = runMzmine(batch, p.input, (Number(process.env.CUVETTE_CALL_TIMEOUT_S) || 900) * 1000);
const info = readLog(r.log);
const route = `mzmine -b <batch.mzbatch> -i "${p.input}"`;
if (r.spawnError) fail(`cannot start mzmine: ${r.spawnError}`, { manualRoute: route });
if (info.gated) {
  fail(`mzmine stopped after ${info.steps.length} steps: the next module needs a user login ("Requires user login"). Create a free mzmine user in the mzmine window or with --login, then set MZMINE_USER_FILE to the user file. Steps that ran: ${info.steps.map((s) => s.name).join(", ")}.`, { manualRoute: route, login_required: true, metrics: { n_scans: info.n_scans, n_files: info.n_files, steps_finished: info.steps.length } });
}
if (r.code !== 0 || !info.steps_finished) {
  const tail = r.log.split("\n").filter((l) => /SEVERE|WARNING io.github.mzmine.modules|Invalid|error|outdated|newer/.test(l) && !/DataType/.test(l)).slice(-6).join(" | ");
  fail(`mzmine exited with code ${r.code}: ${tail.slice(0, 1500)}`, { manualRoute: route });
}
const out = { ok: true, manualRoute: route, steps: info.steps, metrics: { n_scans: info.n_scans, n_files: info.n_files, steps_finished: info.steps_finished } };
if (existsSync(features)) {
  const s = summarizeTable(features);
  Object.assign(out.metrics, s.metrics);
  out.per_file = s.per_file;
  out.table = s.table;
  out.features = features;
} else out.note = "The batch ended before the export step. No feature table was written.";
console.log(JSON.stringify(out));
