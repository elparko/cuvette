import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { captureEnv, clearEnvCache, packageChanges, type EnvLock, type Package } from "../src/core/envlock.ts";
import { Rng, runs } from "./fuzz-rng.ts";

const root = mkdtempSync(join(tmpdir(), "cuvette-fuzz-env-"));
const saved = process.env.CUVETTE_HOME;
beforeAll(() => {
  process.env.CUVETTE_HOME = join(root, "home");
  mkdirSync(process.env.CUVETTE_HOME, { recursive: true });
});
afterAll(() => {
  if (saved === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = saved;
  rmSync(root, { recursive: true, force: true });
});

const lock = (language: string, packages: Package[]): EnvLock => ({ hash: "", kind: "python", path: "/x", language, packages });
const variants = (name: string, r: Rng): string => {
  const sep = r.pick(["-", "_", ".", "--"]);
  const v = name.replace(/[-_.]+/g, sep);
  return r.pick([v, v.toUpperCase(), v.toLowerCase(), v.replace(/^./, (c) => c.toUpperCase())]);
};

describe("fuzz: the change list between two environment locks", () => {
  test("a name that differs only in capitals or in -, _ and . is the same package", () => {
    const r = new Rng(81001);
    const names = ["typing-extensions", "ruamel.yaml", "scikit-learn", "PyYAML", "zope.interface", "backports.zoneinfo", "numpy", "Jinja2", "importlib_metadata", "a-b_c.d"];
    for (let i = 0; i < runs(500); i++) {
      const base = Array.from(new Set(Array.from({ length: r.int(0, 8) }, () => r.pick(names)))).map((n) => ({ name: n, version: `${r.int(0, 3)}.${r.int(0, 9)}.${r.int(0, 9)}` }));
      const same = base.map((p) => ({ name: variants(p.name, r), version: p.version }));
      expect(packageChanges(lock("Python 3.12.4", base), lock("Python 3.12.4", same)), JSON.stringify([base, same])).toEqual([]);
      if (!base.length) continue;
      const k = r.int(0, base.length - 1);
      const bumped = same.map((p, j) => (j === k ? { ...p, version: p.version + ".1" } : p));
      const changes = packageChanges(lock("Python 3.12.4", base), lock("Python 3.12.4", bumped));
      expect(changes, JSON.stringify([base, bumped])).toEqual([`${bumped[k]!.name} ${base[k]!.version} to ${bumped[k]!.version}`]);
      const removed = same.filter((_, j) => j !== k);
      expect(packageChanges(lock("Python 3.12.4", base), lock("Python 3.12.4", removed))).toEqual([`${base[k]!.name} ${base[k]!.version} removed`]);
      expect(packageChanges(lock("Python 3.12.4", removed), lock("Python 3.12.4", base))).toEqual([`${base[k]!.name} ${base[k]!.version} added`]);
    }
  });

  test("a language change is listed once", () => {
    expect(packageChanges(lock("Python 3.11.9", []), lock("Python 3.12.4", []))).toEqual(["Python 3.11.9 to Python 3.12.4"]);
    expect(packageChanges(lock("", []), lock("R 4.4.1", []))).toEqual(["the language to R 4.4.1"]);
  });
});

describe.skipIf(process.platform === "win32")("fuzz: the cache of an environment lock", () => {
  let counter = 0;

  function fakePython() {
    const dir = mkdtempSync(join(root, `py-${counter++}-`));
    const site = join(dir, "lib", "site-packages");
    const userSite = join(dir, "user", "site-packages");
    mkdirSync(site, { recursive: true });
    const py = join(dir, "python");
    let version = 1;
    const write = () => writeFileSync(join(dir, "out.json"), JSON.stringify({ language: "Python 3.12.4", watch: [site, userSite], packages: [["numpy", `1.${version}.0`]] }));
    write();
    writeFileSync(py, `#!/bin/sh\necho call >> "${dir}/calls"\ncat "${dir}/out.json"\n`);
    chmodSync(py, 0o755);
    const calls = () => (existsSync(join(dir, "calls")) ? readFileSync(join(dir, "calls"), "utf8").trim().split("\n").length : 0);
    let clock = Date.now() + 10_000;
    const later = (p: string) => {
      clock += 5000;
      utimesSync(p, new Date(clock), new Date(clock));
    };
    return {
      py,
      calls,
      install() {
        version++;
        write();
        later(site);
      },
      createUserSite() {
        version++;
        write();
        mkdirSync(userSite, { recursive: true });
        later(userSite);
      },
      touchUserSite() {
        version++;
        write();
        later(userSite);
      },
      version: () => version,
    };
  }

  test("a package folder that did not exist at the scan is watched after it appears", async () => {
    clearEnvCache();
    const f = fakePython();
    const first = (await captureEnv({ kind: "python", path: f.py }))!;
    expect(f.calls()).toBe(1);
    expect((await captureEnv({ kind: "python", path: f.py }))!.hash).toBe(first.hash);
    expect(f.calls()).toBe(1);
    f.createUserSite();
    const second = (await captureEnv({ kind: "python", path: f.py }))!;
    expect(f.calls()).toBe(2);
    expect(second.packages[0]!.version).toBe("1.2.0");
    clearEnvCache();
    expect((await captureEnv({ kind: "python", path: f.py }))!.hash).toBe(second.hash);
    expect(f.calls()).toBe(2);
    f.touchUserSite();
    expect((await captureEnv({ kind: "python", path: f.py }))!.packages[0]!.version).toBe("1.3.0");
    expect(f.calls()).toBe(3);
  });

  test("the lock is rescanned after each change and not before", async () => {
    const r = new Rng(81002);
    for (let i = 0; i < runs(6); i++) {
      clearEnvCache();
      const f = fakePython();
      let expected = f.calls();
      await captureEnv({ kind: "python", path: f.py });
      expected++;
      expect(f.calls()).toBe(expected);
      for (let k = r.int(2, 8); k > 0; k--) {
        const event = r.pick(["none", "none", "install", "user-site", "touch-user-site", "clear-memory"]);
        if (event === "install") f.install();
        else if (event === "user-site") f.createUserSite();
        else if (event === "touch-user-site" && existsSync(join(f.py, "..", "user", "site-packages"))) f.touchUserSite();
        else if (event === "clear-memory") clearEnvCache();
        const changed = event === "install" || event === "user-site" || (event === "touch-user-site" && existsSync(join(f.py, "..", "user", "site-packages")));
        if (changed) expected++;
        const latest = (await captureEnv({ kind: "python", path: f.py }))!;
        expect(f.calls(), event).toBe(expected);
        expect(latest.packages[0]!.version, event).toBe(`1.${f.version()}.0`);
      }
    }
  });
});

const python = process.platform === "win32" ? undefined : spawnSync("python3", ["-c", "import site;print(site.getusersitepackages())"], { encoding: "utf8" });
const rscript = process.platform === "win32" ? undefined : spawnSync("Rscript", ["--vanilla", "-e", 'cat(Sys.getenv("R_LIBS_USER"))'], { encoding: "utf8" });

describe("the folders that a real interpreter reports", () => {
  const stamps = (key: string): string[] => Object.keys(JSON.parse(readFileSync(join(process.env.CUVETTE_HOME!, "cache", "env-locks.json"), "utf8"))[key].stamps);

  test.skipIf(python?.status !== 0)("Python reports the folder of the user packages, also if it does not exist", async () => {
    clearEnvCache();
    const path = spawnSync("sh", ["-c", "command -v python3"], { encoding: "utf8" }).stdout.trim();
    await captureEnv({ kind: "python", path });
    expect(stamps(`python:${path}`)).toContain(python!.stdout.trim());
  });

  test.skipIf(rscript?.status !== 0 || !rscript?.stdout.trim())("R reports the folder of the user packages, also if it does not exist", async () => {
    clearEnvCache();
    const path = spawnSync("sh", ["-c", "command -v Rscript"], { encoding: "utf8" }).stdout.trim();
    await captureEnv({ kind: "r", path });
    expect(stamps(`r:${path}`)).toContain(rscript!.stdout.trim().split(":")[0]);
  });
});
