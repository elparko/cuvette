import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const ROOT = join(__dirname, "..");
const FIXTURES = join(__dirname, "fixtures/paper-figures");
const PY = join(homedir(), ".guided-analysis/envs/science/bin/python");
const ids = existsSync(FIXTURES) ? readdirSync(FIXTURES).filter((d) => existsSync(join(FIXTURES, d, "run.json"))) : [];

describe.skipIf(!existsSync(PY))("paper figures", () => {
  test.each(ids)("%s writes a PNG", (id) => {
    const out = join(mkdtempSync(join(tmpdir(), "fig-")), `${id}.png`);
    const r = spawnSync(
      PY,
      [
        join(ROOT, "bench/papers", id, "figure.py"),
        "--session", join(FIXTURES, id, "session"),
        "--run", join(FIXTURES, id, "run.json"),
        "--expected", join(ROOT, "bench/papers", id, "expected.yaml"),
        "--out", out,
      ],
      { encoding: "utf8", timeout: 120000 },
    );
    expect(r.status, r.stderr).toBe(0);
    const png = readFileSync(out);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.length).toBeGreaterThan(5000);
  });
});

const STATS_IDS = [
  "student1908-sleep",
  "rossi1980-recidivism",
  "belenky2003-sleepstudy",
  "bates2015-lme4-sleepstudy",
  "oksanen-vegan-dune",
  "bradley-photutils-100gaussians",
  "rouault-gdal-autotest",
];

describe.skipIf(!existsSync(PY))("statistics, ecology, astronomy and geospatial figures", () => {
  test.each(STATS_IDS)("%s draws a PNG of at most 1600 x 800 pixels", (id) => {
    const out = join(mkdtempSync(join(tmpdir(), "fig-")), `${id}.png`);
    const r = spawnSync(
      PY,
      [
        join(ROOT, "bench/papers", id, "figure.py"),
        "--session", join(FIXTURES, id, "session"),
        "--run", join(FIXTURES, id, "run.json"),
        "--expected", join(ROOT, "bench/papers", id, "expected.yaml"),
        "--out", out,
      ],
      { encoding: "utf8", timeout: 120000 },
    );
    expect(r.status, r.stderr).toBe(0);
    const png = readFileSync(out);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBeLessThanOrEqual(1600);
    expect(png.readUInt32BE(20)).toBeLessThanOrEqual(800);
  });

  test("the left panel shows a message when the session has no result", () => {
    const empty = mkdtempSync(join(tmpdir(), "fig-empty-"));
    const runFile = join(empty, "run.json");
    writeFileSync(runFile, JSON.stringify({ paper: "x", model: "m", status: "error", error: "model stopped", items: [] }));
    for (const id of STATS_IDS) {
      const out = join(empty, `${id}.png`);
      const r = spawnSync(PY, [join(ROOT, "bench/papers", id, "figure.py"), "--session", empty, "--run", runFile, "--expected", join(ROOT, "bench/papers", id, "expected.yaml"), "--out", out], { encoding: "utf8", timeout: 120000 });
      expect(r.status, `${id}: ${r.stderr}`).toBe(0);
      expect(existsSync(out)).toBe(true);
    }
  });
});

const OMICS_IDS = [
  "li2009-samtools",
  "andrews-fastqc",
  "danecek2021-bcftools",
  "quinlan2010-bedtools",
  "love2014-deseq2-airway",
  "wolf2018-scanpy",
  "minh2020-iqtree2",
  "gramfort2013-mne-sample",
  "gowers2016-mdanalysis",
  "delaney2004-esol",
];

function drawFigure(id: string, session: string, run: string) {
  const out = join(mkdtempSync(join(tmpdir(), "fig-")), `${id}.png`);
  const r = spawnSync(
    PY,
    [join(ROOT, "bench/papers", id, "figure.py"), "--session", session, "--run", run, "--expected", join(ROOT, "bench/papers", id, "expected.yaml"), "--out", out],
    { encoding: "utf8", timeout: 120000 },
  );
  return { r, out };
}

describe.skipIf(!existsSync(PY))("omics, genomics, phylogenetics, neuroscience, structure and chemistry figures", () => {
  test.each(OMICS_IDS)("%s draws a PNG of at most 1600 x 800 pixels", (id) => {
    const { r, out } = drawFigure(id, join(FIXTURES, id, "session"), join(FIXTURES, id, "run.json"));
    expect(r.status, r.stderr).toBe(0);
    const png = readFileSync(out);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBeLessThanOrEqual(1600);
    expect(png.readUInt32BE(20)).toBeLessThanOrEqual(800);
  });

  test("the MNE figure still draws when the session has no epochs or evoked file", () => {
    const dir = join(FIXTURES, "gramfort2013-mne-sample/empty");
    const { r, out } = drawFigure("gramfort2013-mne-sample", join(dir, "session"), join(dir, "run.json"));
    expect(r.status, r.stderr).toBe(0);
    expect(existsSync(out)).toBe(true);
  });

  test("every figure draws when the session folder is empty", () => {
    const empty = mkdtempSync(join(tmpdir(), "fig-empty-"));
    const runFile = join(empty, "run.json");
    writeFileSync(runFile, JSON.stringify({ paper: "x", model: "m", status: "error", items: [] }));
    for (const id of OMICS_IDS) {
      const { r, out } = drawFigure(id, empty, runFile);
      expect(r.status, `${id}: ${r.stderr}`).toBe(0);
      expect(existsSync(out)).toBe(true);
    }
  });
});
