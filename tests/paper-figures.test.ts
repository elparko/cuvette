import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
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
