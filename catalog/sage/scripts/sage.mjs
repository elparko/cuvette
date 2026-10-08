import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [mode, ...rest] = process.argv.slice(2);
const flags = {};
const files = [];
let i = 0;
for (; i < rest.length; i++) {
  if (rest[i] === "--") { files.push(...rest.slice(i + 1)); break; }
  flags[rest[i].replace(/^--/, "")] = rest[++i];
}
const fail = (msg) => { console.error(msg); process.exit(1); };
const num = (k) => (flags[k] === undefined ? undefined : Number(flags[k]));
const bool = (k) => (flags[k] === undefined ? undefined : flags[k] === "true");

const ENZYMES = {
  trypsin: { cleave_at: "KR", restrict: "P", c_terminal: true },
  trypsin_p: { cleave_at: "KR", c_terminal: true },
  lys_c: { cleave_at: "K", restrict: "P", c_terminal: true },
  arg_c: { cleave_at: "R", restrict: "P", c_terminal: true },
  chymotrypsin: { cleave_at: "FWYL", restrict: "P", c_terminal: true },
  asp_n: { cleave_at: "D", c_terminal: false },
  none: { cleave_at: "$" },
};

function parseMods(text, variable) {
  const out = {};
  for (const part of (text ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = /^(.+?)([+-]\d+(?:\.\d+)?)$/.exec(part);
    if (!m) fail(`cannot read the modification "${part}". Use residue and mass, such as C+57.0215`);
    const mass = Number(m[2]);
    if (variable) (out[m[1]] ??= []).push(mass);
    else out[m[1]] = mass;
  }
  return out;
}

function search() {
  const sage = flags.sage;
  const dir = process.env.GA_CALL_DIR;
  if (!files.length) fail("give at least one mzML file");
  for (const f of files) if (!existsSync(f)) fail(`cannot read ${f}`);
  if (!existsSync(flags.fasta)) fail(`cannot read the FASTA file ${flags.fasta}`);
  const enzyme = { ...ENZYMES[flags.enzyme ?? "trypsin"] };
  if (!enzyme.cleave_at) fail(`unknown enzyme ${flags.enzyme}`);
  for (const k of ["missed_cleavages", "min_len", "max_len"]) if (num(k) !== undefined) enzyme[k] = num(k);
  const database = {
    enzyme,
    static_mods: parseMods(flags.fixed_mods, false),
    variable_mods: parseMods(flags.variable_mods, true),
    decoy_tag: flags.decoy_tag ?? "rev_",
    generate_decoys: (flags.decoys ?? "sage_reverse") === "sage_reverse",
    fasta: flags.fasta,
  };
  if (num("max_variable_mods") !== undefined) database.max_variable_mods = num("max_variable_mods");
  const tol = (v, unit) => ({ [unit]: [-v, v] });
  if (num("precursor_tol_ppm") === undefined || num("fragment_tol") === undefined) fail("precursor_tol_ppm and fragment_tol are required");
  const config = {
    database,
    precursor_tol: tol(num("precursor_tol_ppm"), "ppm"),
    fragment_tol: tol(num("fragment_tol"), flags.fragment_tol_unit ?? "ppm"),
    mzml_paths: files,
  };
  if (num("isotope_min") !== undefined || num("isotope_max") !== undefined) config.isotope_errors = [num("isotope_min") ?? 0, num("isotope_max") ?? 0];
  for (const k of ["deisotope", "chimera", "predict_rt"]) if (bool(k) !== undefined) config[k] = bool(k);
  for (const k of ["min_peaks", "max_peaks", "min_matched_peaks", "max_fragment_charge", "report_psms"]) if (num(k) !== undefined) config[k] = num(k);
  const outDir = join(dir, "sage_out");
  mkdirSync(outDir, { recursive: true });
  const cfgPath = join(dir, "sage_config.json");
  writeFileSync(cfgPath, JSON.stringify(config, null, 2));
  const r = spawnSync(sage, [cfgPath, "-o", outDir, "--disable-telemetry-i-dont-want-to-improve-sage"], { encoding: "utf8", maxBuffer: 1 << 28 });
  const tsv = join(outDir, "results.sage.tsv");
  if (r.status !== 0 || !existsSync(tsv)) fail(`Sage failed: ${(r.stderr || r.stdout || "").trim().split("\n").slice(-4).join(" ")}`);
  copyFileSync(tsv, flags.out);
  copyFileSync(cfgPath, flags.config);
  const ver = spawnSync(sage, ["--version"], { encoding: "utf8" }).stdout.trim().replace(/^sage\s+/, "");
  const rows = readRows(flags.out);
  const decoys = rows.filter((x) => x.label === "-1").length;
  const best = rows.filter((x) => x.label === "1").sort((a, b) => Number(b.hyperscore) - Number(a.hyperscore))[0];
  console.log(`results=${flags.out}`);
  if (best) console.log(`top_peptide=${best.peptide}`);
  if (best) console.log(`top_hyperscore=${best.hyperscore}`);
  console.log(`config=${flags.config}`);
  console.log(`sage_version=${ver}`);
  console.log(`n_files=${files.length}`);
  console.log(`n_psm=${rows.length}`);
  console.log(`n_target_psm=${rows.length - decoys}`);
  console.log(`n_decoy_psm=${decoys}`);
  console.log(`decoys=${database.generate_decoys ? "made by Sage (reversed peptides)" : "read from the FASTA file"}`);
}

function readRows(path) {
  const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
  const head = lines[0].split("\t");
  return lines.slice(1).map((l) => {
    const c = l.split("\t");
    return Object.fromEntries(head.map((h, j) => [h, c[j]]));
  });
}

function qvalues(items) {
  const s = [...items].sort((a, b) => b.score - a.score);
  const q = [];
  let t = 0, d = 0;
  for (const x of s) {
    if (x.target) t++; else d++;
    q.push(t ? Math.min(1, (d + 1) / t) : 1);
  }
  for (let j = q.length - 2; j >= 0; j--) q[j] = Math.min(q[j], q[j + 1]);
  return s.map((x, j) => ({ ...x, q: q[j] }));
}

function count() {
  if (!existsSync(flags.path)) fail("cannot read the results file");
  const level = flags.level ?? "psm";
  const thr = num("threshold");
  const col = { psm: "spectrum_q", peptide: "peptide_q", protein: "protein_q" }[level];
  if (!col) fail(`unknown level ${level}`);
  const rows = readRows(flags.path);
  if (!rows.length) fail("the results file has no rows");
  if (!(col in rows[0])) fail(`the results file has no ${col} column`);
  const nDecoyAll = rows.filter((x) => x.label === "-1").length;
  if (!nDecoyAll) fail("the results file has no decoy hits. An FDR from a target-only search is not valid");
  const pass = rows.filter((x) => x.label === "1" && Number(x[col]) <= thr);
  const decoyPass = rows.filter((x) => x.label === "-1" && Number(x[col]) <= thr).length;
  console.log(`level=${level}`);
  console.log(`fdr_threshold=${thr}`);
  console.log(`n_psm_total=${rows.length}`);
  console.log(`n_decoy_total=${nDecoyAll}`);
  console.log(`n_psm_pass=${pass.length}`);
  console.log(`n_peptides_pass=${new Set(pass.map((x) => x.peptide)).size}`);
  console.log(`n_proteins_pass=${new Set(pass.map((x) => x.proteins)).size}`);
  console.log(`n_decoy_pass=${decoyPass}`);
  if (level === "psm") {
    const items = rows.map((x) => ({ score: Number(x.sage_discriminant_score), target: x.label === "1" }));
    const recount = qvalues(items).filter((x) => x.target && x.q <= thr).length;
    console.log(`n_recount=${recount}`);
    console.log(`recount_agrees=${recount === pass.length ? 1 : 0}`);
  }
}

if (mode === "search") search();
else if (mode === "count") count();
else fail("unknown mode");
