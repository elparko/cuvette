import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const TEMPLATE = join(HERE, "..", "templates", "nuclei.cppipe");

export const DEFAULTS = {
  diameter_min: 10,
  diameter_max: 40,
  discard_outside: true,
  discard_border: true,
  declump_method: "Intensity",
  threshold_strategy: "Global",
  threshold_method: "Otsu",
  threshold_classes: "Two classes",
  threshold_correction: 1.0,
  threshold_smoothing: 1.3488,
  adaptive_window: 50,
};

const yn = (v) => (v ? "Yes" : "No");

export function readParams() {
  return JSON.parse(readFileSync(process.argv[2], "utf8"));
}

export function fail(error) {
  console.log(JSON.stringify({ ok: false, error }));
  process.exit(0);
}

export function renderPipeline(p) {
  const q = { ...DEFAULTS, ...p };
  if (q.diameter_min >= q.diameter_max) fail("diameter_min must be smaller than diameter_max");
  const lines = q.declump_method === "None" ? "None" : q.dividing_lines && q.dividing_lines !== "None" ? q.dividing_lines : "Intensity";
  const auto = (v) => v === undefined || v === null || v === 0;
  const values = {
    diameter_min: q.diameter_min,
    diameter_max: q.diameter_max,
    discard_outside: yn(q.discard_outside),
    discard_border: yn(q.discard_border),
    declump_method: q.declump_method,
    dividing_lines: lines,
    smoothing_filter_size: auto(q.smoothing_filter_size) ? 10 : q.smoothing_filter_size,
    min_maxima_distance: auto(q.min_maxima_distance) ? 7 : q.min_maxima_distance,
    auto_smoothing: yn(auto(q.smoothing_filter_size)),
    auto_distance: yn(auto(q.min_maxima_distance)),
    threshold_strategy: q.threshold_strategy,
    threshold_method: q.threshold_method,
    threshold_smoothing: q.threshold_smoothing || 1.3488,
    threshold_correction: q.threshold_correction,
    threshold_classes: q.threshold_classes,
    adaptive_window: q.adaptive_window || 50,
  };
  const text = readFileSync(TEMPLATE, "utf8").replace(/@@(\w+)@@/g, (_, k) => {
    if (!(k in values)) throw new Error(`template field ${k} has no value`);
    return String(values[k]);
  });
  return { text, values };
}

export function javaHome() {
  const t7 = "/Volumes/T7/guided-analysis/tools/cellprofiler/jre17x64";
  const found = [process.env.CELLPROFILER_JAVA_HOME, process.env.JAVA_HOME].filter(Boolean);
  if (existsSync(t7)) for (const d of readdirSync(t7)) found.push(join(t7, d, "Contents", "Home"));
  return found.find((h) => existsSync(join(h, "bin", "java")) || existsSync(join(h, "bin", "java.exe")));
}

export function programPath() {
  const p = process.env.GA_PROGRAM_PATH;
  if (!p) fail("CellProfiler was not found. Set CELLPROFILER_PATH to the cp executable.");
  return p;
}

export function globToRegex(glob) {
  const body = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${body}$`, "i");
}

export function stageImages(folder, dest, a) {
  if (!existsSync(folder)) fail(`Folder not found: ${folder}`);
  const re = globToRegex(a.pattern ?? "*");
  let files = readdirSync(folder).filter((f) => !f.startsWith(".") && re.test(f)).sort();
  const nth = a.every_nth ?? 1;
  if (nth > 1) files = files.filter((_, i) => i % nth === 0);
  if (a.max_images) files = files.slice(0, a.max_images);
  if (!files.length) fail(`No files in ${folder} match ${a.pattern ?? "*"}`);
  for (const key of ["truth_regex", "group_regex"]) {
    if (a[key] && !files.some((f) => new RegExp(a[key]).test(f)))
      fail(`${key} ${a[key]} matches none of the ${files.length} file names, for example ${files[0]}. Write a regular expression with one group that matches part of the file name.`);
  }
  mkdirSync(dest, { recursive: true });
  for (const f of files) {
    const to = join(dest, f);
    copyFileSync(join(folder, f), to);
  }
  return files;
}

export function runCellProfiler(pipeline, inputDir, outDir, timeoutMs) {
  mkdirSync(outDir, { recursive: true });
  const env = { ...process.env };
  const jh = javaHome();
  if (jh) env.JAVA_HOME = jh;
  const r = spawnSync(programPath(), ["-c", "-r", "-p", pipeline, "-i", inputDir, "-o", outDir], { env, encoding: "utf8", maxBuffer: 64e6, timeout: timeoutMs });
  const log = `${r.stdout ?? ""}\n${r.stderr ?? ""}`.split("\n").filter((l) => !/LOADER|PyInstaller/.test(l)).join("\n");
  if (r.error || r.status !== 0) fail(`CellProfiler failed (exit ${r.status}): ${(r.error?.message ?? log).slice(-1500)}`);
  if (!existsSync(join(outDir, "Image.csv"))) fail(`CellProfiler wrote no Image.csv: ${log.slice(-1500)}`);
  return log;
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
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : NaN;
};
const round = (x, n = 6) => (Number.isFinite(x) ? Number(x.toFixed(n)) : x);

export function summarize(outDir, a) {
  const images = readCsv(join(outDir, "Image.csv"));
  const rows = images.map((r) => {
    const file = r.FileName_DNA ?? "";
    const count = Number(r.Count_Nuclei);
    const area = Number(r.Mean_Nuclei_AreaShape_Area);
    const eqd = Number(r.Mean_Nuclei_AreaShape_EquivalentDiameter);
    const out = { file, count, mean_area: Number.isFinite(area) ? round(area, 3) : null, median_area: Number(r.Median_Nuclei_AreaShape_Area) || null, mean_diameter: Number.isFinite(eqd) ? round(eqd, 2) : null };
    if (a.truth_regex) {
      const m = new RegExp(a.truth_regex).exec(file);
      out.true_count = m ? Number(m[1]) : null;
    }
    if (a.group_regex) {
      const m = new RegExp(a.group_regex).exec(file);
      out.group = m ? m[1] : null;
    }
    return out;
  });
  rows.sort((x, y) => x.file.localeCompare(y.file));
  const counts = rows.map((r) => r.count);
  const areas = rows.map((r) => r.mean_area).filter((x) => x !== null);
  const diameters = rows.map((r) => r.mean_diameter).filter((x) => x !== null);
  const metrics = {
    n_images: rows.length,
    n_objects_total: counts.reduce((s, x) => s + x, 0),
    mean_objects_per_image: round(mean(counts), 4),
    median_objects_per_image: median(counts),
    mean_area: round(mean(areas), 3),
    mean_diameter: round(mean(diameters), 2),
  };
  const data = {};
  if (a.truth_regex) {
    const t = rows.filter((r) => r.true_count !== null && r.true_count !== undefined);
    if (t.length) Object.assign(metrics, accuracy(t));
    metrics.n_with_truth = t.length;
    if (a.group_regex) {
      data.by_group = {};
      const groups = [...new Set(t.map((r) => r.group))].sort((x, y) => Number(x) - Number(y) || String(x).localeCompare(String(y)));
      for (const g of groups) data.by_group[g] = accuracy(t.filter((r) => r.group === g), true);
    }
  }
  return { rows, metrics, data };
}

function accuracy(t, brief = false) {
  const truth = t.map((r) => r.true_count);
  const det = t.map((r) => r.count);
  const mt = mean(truth);
  const md = mean(det);
  const ssRes = t.reduce((s, r) => s + (r.true_count - r.count) ** 2, 0);
  const ssTot = t.reduce((s, r) => s + (r.true_count - mt) ** 2, 0);
  const sxy = t.reduce((s, r) => s + (r.true_count - mt) * (r.count - md), 0);
  const sxx = ssTot;
  const syy = t.reduce((s, r) => s + (r.count - md) ** 2, 0);
  const out = {
    n: t.length,
    true_total: truth.reduce((s, x) => s + x, 0),
    detected_total: det.reduce((s, x) => s + x, 0),
    detected_to_true_ratio: round(det.reduce((s, x) => s + x, 0) / truth.reduce((s, x) => s + x, 0), 4),
    mean_abs_error: round(mean(t.map((r) => Math.abs(r.count - r.true_count))), 4),
    r_squared: round(sxx && syy ? (sxy * sxy) / (sxx * syy) : NaN, 4),
  };
  if (brief) return out;
  return { true_total: out.true_total, detected_to_true_ratio: out.detected_to_true_ratio, mean_abs_error: out.mean_abs_error, r_squared: out.r_squared, r_squared_vs_identity: round(ssTot ? 1 - ssRes / ssTot : NaN, 4) };
}

export function writeTable(path, rows) {
  const cols = Object.keys(rows[0] ?? { file: 0, count: 0 });
  writeFileSync(path, [cols.join(","), ...rows.map((r) => cols.map((c) => r[c] ?? "").join(","))].join("\n") + "\n");
}

export function result(rows, metrics, data, extra = {}) {
  const cols = Object.keys(rows[0] ?? {});
  return {
    ok: true,
    manualRoute: `cellprofiler -c -r -p ${extra.pipeline} -i <image folder> -o <output folder>`,
    metrics,
    ...data,
    ...extra,
    table: { columns: cols, rows: rows.slice(0, 12).map((r) => cols.map((c) => r[c])), n_rows: rows.length, path: extra.per_image },
  };
}

export { basename, resolve };
