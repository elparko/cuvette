import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STAGES = ["chromatograms", "resolved", "deisotoped", "aligned", "exported"];

export function readParams() {
  return JSON.parse(readFileSync(process.argv[2], "utf8"));
}

export function fail(error, extra = {}) {
  console.log(JSON.stringify({ ok: false, error, ...extra }));
  process.exit(0);
}

export function renderBatch(p) {
  const steps = JSON.parse(readFileSync(join(HERE, "..", "templates", "steps.json"), "utf8"));
  const stop = p.stop_after ?? "exported";
  const values = {
    noise_level: p.noise_level,
    mz_tolerance_ppm: p.mz_tolerance_ppm,
    min_height: p.min_height,
    rt_tolerance_min: p.rt_tolerance_min,
    min_scans: p.min_scans ?? 5,
    max_charge: p.max_charge ?? 2,
    rt_search_range_min: p.rt_search_range_min ?? 0.05,
    max_peak_duration_min: p.max_peak_duration_min ?? 1.0,
  };
  const blocks = STAGES.slice(0, STAGES.indexOf(stop) + 1).flatMap((s) => steps[s]);
  const body = blocks.join("\n  ").replace(/@@(\w+)@@/g, (_, k) => {
    if (values[k] === undefined) fail(`missing value for ${k}`);
    return String(values[k]);
  });
  const text = `<?xml version="1.0" encoding="UTF-8"?>\n<batch mzmine_version="4.10.90">\n  ${body}\n</batch>\n`;
  return { text, values, stop };
}

export function programPath() {
  const p = process.env.CUVETTE_PROGRAM_PATH;
  if (!p) fail("mzmine was not found. Set MZMINE_PATH to the mzmine executable.");
  return p;
}

export function runMzmine(batch, input, timeoutMs) {
  const argv = ["-b", batch, "-i", input];
  if (process.env.MZMINE_USER_FILE) argv.push("-user", process.env.MZMINE_USER_FILE);
  const r = spawnSync(programPath(), argv, { encoding: "utf8", maxBuffer: 64e6, timeout: timeoutMs });
  const log = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  return { code: r.status, log, spawnError: r.error?.message };
}

export function readLog(log) {
  const lines = log.split("\n");
  const scans = [...log.matchAll(/parsed (\d+) scans/g)].map((m) => Number(m[1]));
  const done = /Finished a batch of (\d+) steps/.exec(log);
  const steps = [...log.matchAll(/Step (\d+): ([^\n]*?) took ([\d.]+) seconds/g)].map((m) => ({ step: Number(m[1]), name: m[2], seconds: Number(m[3]) }));
  const gated = /Requires user login|Invalid user: You need to be logged in/.test(log);
  const warnings = lines.filter((l) => /outdated parameters|newer mzmine version|Invalid parameter settings|is not set properly/.test(l)).map((l) => l.replace(/^\S+ \S+ \S+\s+\S+ \S+\s*/, "").trim()).slice(0, 5);
  return { n_scans: scans.reduce((s, x) => s + x, 0), n_files: scans.length, steps_finished: done ? Number(done[1]) : 0, steps, gated, warnings };
}

export function readCsv(path) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const text = readFileSync(path, "utf8");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0] !== "");
  return { head, body };
}

const num = (x) => (x === "" || x === undefined ? NaN : Number(x));
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN;
};
const round = (x, n = 5) => (Number.isFinite(x) ? Number(x.toFixed(n)) : null);

export function summarizeTable(path) {
  const { head, body } = readCsv(path);
  const col = (re) => head.findIndex((h) => re.test(h));
  const iMz = col(/^row m\/z$|^mz$/);
  const iRt = col(/^row retention time$|^rt$/);
  const iId = col(/^row ID$|^id$/);
  const heightCols = head.map((h, i) => (/ Peak height$/.test(h) ? i : -1)).filter((i) => i >= 0);
  if (iMz < 0 || iRt < 0 || !heightCols.length) fail(`The CSV file does not have the columns row m/z, row retention time and Peak height: ${head.slice(0, 8).join(" | ")}`);
  const mz = body.map((r) => num(r[iMz]));
  const rt = body.map((r) => num(r[iRt]));
  const perFile = heightCols.map((i) => ({ file: head[i].replace(/ Peak height$/, ""), n_detected: body.filter((r) => num(r[i]) > 0).length }));
  const heights = body.flatMap((r) => heightCols.map((i) => num(r[i]))).filter((x) => x > 0);
  const inAll = body.filter((r) => heightCols.every((i) => num(r[i]) > 0)).length;
  const metrics = {
    n_features: body.length,
    n_files: heightCols.length,
    n_features_in_all_files: inAll,
    mean_mz: round(mean(mz), 5),
    mean_rt_min: round(mean(rt), 4),
    median_height: round(median(heights), 1),
    min_height: round(Math.min(...heights), 1),
  };
  const table = { columns: ["row ID", "m/z", "RT (min)", ...perFile.map((f) => `${f.file} height`)], rows: body.slice(0, 12).map((r) => [iId >= 0 ? r[iId] : "", num(r[iMz]), num(r[iRt]), ...heightCols.map((i) => num(r[i]))]), n_rows: body.length, path };
  return { metrics, per_file: perFile, table };
}

export { existsSync, writeFileSync, join };
