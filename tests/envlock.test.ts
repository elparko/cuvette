import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, test } from "vitest";
import { captureEnv, clearEnvCache, envTarget, packageChanges, renvLock, requirementsText } from "../src/core/envlock.ts";
import { AnalysisRecord } from "../src/core/record.ts";
import { buildWorkbook, writeResults } from "../src/core/results.ts";

beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-env-home-"));
  clearEnvCache();
});

function fakePython(packages: [string, string][]) {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-fake-py-"));
  const site = join(dir, "lib", "site-packages");
  mkdirSync(site, { recursive: true });
  const py = join(dir, "python");
  const write = (p: [string, string][]) => writeFileSync(join(dir, "out.json"), JSON.stringify({ language: "Python 3.12.4", watch: [site], packages: p }));
  write(packages);
  writeFileSync(py, `#!/bin/sh\necho call >> "${dir}/calls"\ncat "${dir}/out.json"\n`);
  chmodSync(py, 0o755);
  const calls = () => (existsSync(join(dir, "calls")) ? readFileSync(join(dir, "calls"), "utf8").trim().split("\n").length : 0);
  const install = (p: [string, string][]) => {
    write(p);
    const t = new Date(Date.now() + 5000);
    utimesSync(site, t, t);
  };
  return { py, site, calls, install };
}

test.skipIf(process.platform === "win32")("the lock of a Python environment lists each package and its version, with a hash", async () => {
  const f = fakePython([["numpy", "1.26.4"], ["anndata", "0.10.8"]]);
  const lock = (await captureEnv({ kind: "python", path: f.py }))!;
  expect(lock.kind).toBe("python");
  expect(lock.language).toBe("Python 3.12.4");
  expect(lock.packages).toEqual([{ name: "numpy", version: "1.26.4" }, { name: "anndata", version: "0.10.8" }]);
  expect(lock.hash).toMatch(/^[0-9a-f]{64}$/);
  expect(requirementsText(lock)).toBe("numpy==1.26.4\nanndata==0.10.8\n");
});

test.skipIf(process.platform === "win32")("two captures of one environment at the same time run one package scan", async () => {
  const f = fakePython([["numpy", "1.26.4"]]);
  const [a, b] = await Promise.all([captureEnv({ kind: "python", path: f.py }), captureEnv({ kind: "python", path: f.py })]);
  expect(f.calls()).toBe(1);
  expect(b!.hash).toBe(a!.hash);
});

test.skipIf(process.platform === "win32")("the cache keeps the lock until the environment folder changes", async () => {
  const f = fakePython([["numpy", "1.26.4"]]);
  const a = (await captureEnv({ kind: "python", path: f.py }))!;
  const b = (await captureEnv({ kind: "python", path: f.py }))!;
  expect(f.calls()).toBe(1);
  expect(b.hash).toBe(a.hash);
  clearEnvCache();
  await captureEnv({ kind: "python", path: f.py });
  expect(f.calls()).toBe(1);
  f.install([["numpy", "2.0.0"]]);
  const c = (await captureEnv({ kind: "python", path: f.py }))!;
  expect(f.calls()).toBe(2);
  expect(c.hash).not.toBe(a.hash);
  expect(packageChanges(a, c)).toEqual(["numpy 1.26.4 to 2.0.0"]);
});

test.skipIf(process.platform === "win32")("the lock of an R library comes from installed.packages, and renv.lock has each package", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-fake-r-"));
  const r = join(dir, "Rscript");
  writeFileSync(r, `#!/bin/sh\nprintf 'LANG\\tR 4.4.1\\nLIB\\t${dir}\\nPKG\\tDESeq2\\t1.44.0\\nPKG\\tBiocGenerics\\t0.50.0\\n'\n`);
  chmodSync(r, 0o755);
  const t = envTarget({ kind: "script", interpreter: [r], program: "DESeq2", programVersion: "1.44.0" });
  expect(t.kind).toBe("r");
  const lock = (await captureEnv(t))!;
  expect(lock.language).toBe("R 4.4.1");
  expect(lock.packages.map((p) => p.name)).toEqual(["BiocGenerics", "DESeq2"]);
  const renv = JSON.parse(renvLock(lock));
  expect(renv.R.Version).toBe("4.4.1");
  expect(renv.Packages.DESeq2.Version).toBe("1.44.0");
});

test("a command-line program has a lock with its version only, and runs no process", async () => {
  const t = envTarget({ kind: "cli", interpreter: [], programPath: "/opt/homebrew/bin/bcftools", program: "bcftools", programVersion: "1.24" });
  expect(t.kind).toBe("program");
  const lock = (await captureEnv(t))!;
  expect(lock.packages).toEqual([{ name: "bcftools", version: "1.24" }]);
});

test.skipIf(process.platform === "win32")("the record keeps each lock once, and results write environment.lock.json, requirements.txt and the Packages sheet", async () => {
  const f = fakePython([["numpy", "1.26.4"], ["scipy", "1.13.1"]]);
  const dir = mkdtempSync(join(tmpdir(), "cuvette-env-rec-"));
  const record = new AnalysisRecord(dir, "s1");
  const lock = (await captureEnv({ kind: "python", path: f.py }))!;
  const hash = record.addEnvironment(lock, "biostats");
  record.addEnvironment(lock, "biostats");
  expect(record.entries(["environment"])).toHaveLength(1);
  record.addNode({ entry: 1, adapter: "biostats", adapterVersion: "1.0", programVersion: "0.30.3", tool: "fit", args: {}, decisions: {}, codeHash: "c", inputHashes: [], envHash: hash, outputs: [], result: { ok: true, metrics: { p: 0.03 } }, parents: [], summary: "Fitted.", model: "fake", manualRoute: "", fidelity: "none" });
  const reopened = new AnalysisRecord(dir, "s1");
  expect(reopened.environment(hash)?.packages).toHaveLength(2);
  const out = join(dir, "out");
  writeResults({ record, adapters: [], fields: [], programs: [], dir: out, xlsx: true });
  const json = JSON.parse(readFileSync(join(out, "environment.lock.json"), "utf8"));
  expect(json.environments[0]).toMatchObject({ hash, name: "biostats", language: "Python 3.12.4", steps: [1], packages: { numpy: "1.26.4", scipy: "1.13.1" } });
  expect(readFileSync(join(out, "requirements.txt"), "utf8")).toContain("scipy==1.13.1");
  const sheets = buildWorkbook({ record, adapters: [], fields: [], programs: [], dir: out, figures: [] });
  const pk = sheets.find((s) => s.name === "Packages")!;
  expect(pk.rows).toContainEqual(["biostats", "Python 3.12.4", "numpy", "1.26.4", f.py, hash.slice(0, 12)]);
  expect(sheets.find((s) => s.name === "Summary")!.rows.some((r) => r[0] === "Environment" && r[1] === "biostats")).toBe(true);
});
