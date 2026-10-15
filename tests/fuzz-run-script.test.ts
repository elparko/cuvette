import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, truncateSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { fingerprint, settingsScope } from "../src/tools/run_script.ts";
import { Rng, runs } from "./fuzz-rng.ts";

const root = realpathSync(mkdtempSync(join(tmpdir(), "cuvette-fuzz-guard-")));
const saved = { home: process.env.HOME, profile: process.env.USERPROFILE, cuvette: process.env.CUVETTE_HOME };
beforeAll(() => {
  process.env.HOME = join(root, "home");
  process.env.USERPROFILE = join(root, "home");
  process.env.CUVETTE_HOME = join(root, "cuvette-home");
  mkdirSync(process.env.HOME, { recursive: true });
  mkdirSync(process.env.CUVETTE_HOME, { recursive: true });
});
afterAll(() => {
  for (const [k, v] of [["HOME", saved.home], ["USERPROFILE", saved.profile], ["CUVETTE_HOME", saved.cuvette]] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  rmSync(root, { recursive: true, force: true });
});

let counter = 0;

function layout() {
  const project = join(root, `project-${counter++}`);
  const out = join(project, "cuvette", "2026-10-14-mine");
  mkdirSync(join(out, ".record"), { recursive: true });
  mkdirSync(join(project, ".cuvette"), { recursive: true });
  mkdirSync(join(project, ".ga"), { recursive: true });
  const dirs = { workDir: out, sessionDir: join(out, ".record"), projectDir: project };
  return { project, out, dirs, log: join(out, ".record", "log.jsonl") };
}

const read = (p: string): Buffer | undefined => {
  try {
    return readFileSync(p);
  } catch {
    return undefined;
  }
};

function same(a: Buffer | undefined, b: Buffer | undefined): boolean {
  return a === undefined || b === undefined ? a === b : a.equals(b);
}

function restoreTimes(p: string, before: { atime: Date; mtime: Date }): void {
  utimesSync(p, before.atime, before.mtime);
}

describe("fuzz: the check after a script", () => {
  test("the watched files include the settings of the project and of the user", () => {
    const l = layout();
    const names = settingsScope(l.dirs).files;
    for (const f of [".cuvette/settings.json", ".cuvette/settings.local.json", ".ga/settings.json", ".ga/settings.local.json"]) expect(names).toContain(join(l.project, f));
    expect(names).toContain(join(process.env.CUVETTE_HOME!, "settings.json"));
  });

  test("the check finds each change to the settings and to the old part of the log, and no other change", () => {
    const r = new Rng(71001);
    let found = 0;
    let quiet = 0;
    for (let i = 0; i < runs(120); i++) {
      const l = layout();
      const watched = [...new Set(settingsScope(l.dirs).files)];
      for (const p of watched) {
        if (!r.bool(0.6)) continue;
        mkdirSync(dirname(p), { recursive: true });
        writeFileSync(p, r.bytes(r.int(0, 120)));
      }
      writeFileSync(l.log, r.bool(0.9) ? r.bytes(r.int(1, 300)) : "");
      const baseline = new Map(watched.map((p) => [p, read(p)]));
      const oldLog = read(l.log)!;
      const withLog = r.bool(0.85);
      const guard = fingerprint(l.dirs, withLog);
      for (let k = r.int(0, 6); k > 0; k--) {
        const kind = r.pick(["append-log", "append-log", "flip-log", "truncate-log", "replace-log", "delete-log", "rename-log", "flip-settings", "flip-settings", "append-settings", "delete-settings", "create-settings", "touch-settings", "rewrite-same", "work-file", "work-rename", "swap-two", "shrink-settings"]);
        const file = r.pick(watched);
        const present = existsSync(file);
        if (kind === "append-log") appendFileSync(l.log, r.bytes(r.int(1, 50)));
        else if (kind === "flip-log" && existsSync(l.log) && statSync(l.log).size > 0) {
          const before = statSync(l.log);
          const body = readFileSync(l.log);
          const at = r.int(0, body.length - 1);
          body[at] = (body[at]! + 1) & 255;
          writeFileSync(l.log, body);
          restoreTimes(l.log, before);
        } else if (kind === "truncate-log" && existsSync(l.log)) truncateSync(l.log, r.int(0, statSync(l.log).size));
        else if (kind === "replace-log" && existsSync(l.log)) writeFileSync(l.log, Buffer.concat([readFileSync(l.log), r.bytes(r.int(0, 20))]));
        else if (kind === "delete-log") rmSync(l.log, { force: true });
        else if (kind === "rename-log" && existsSync(l.log)) renameSync(l.log, `${l.log}.old`);
        else if (kind === "flip-settings" && present && statSync(file).size > 0) {
          const before = statSync(file);
          const body = readFileSync(file);
          const at = r.int(0, body.length - 1);
          body[at] = (body[at]! + r.int(1, 255)) & 255;
          writeFileSync(file, body);
          restoreTimes(file, before);
        } else if (kind === "append-settings" && present) appendFileSync(file, r.bytes(r.int(1, 10)));
        else if (kind === "shrink-settings" && present && statSync(file).size > 0) truncateSync(file, statSync(file).size - 1);
        else if (kind === "delete-settings" && present) rmSync(file);
        else if (kind === "create-settings" && !present) {
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, r.bytes(r.int(0, 50)));
        } else if (kind === "touch-settings" && present) {
          const t = new Date(Date.now() + r.int(1000, 100000));
          utimesSync(file, t, t);
        } else if (kind === "rewrite-same" && present) writeFileSync(file, readFileSync(file));
        else if (kind === "work-file") writeFileSync(join(l.out, `new-${r.int(0, 99)}.csv`), r.bytes(r.int(0, 40)));
        else if (kind === "work-rename") {
          const from = join(l.out, "moved.csv");
          writeFileSync(from, "x");
          renameSync(from, join(l.out, `moved-${r.int(0, 99)}.csv`));
        } else if (kind === "swap-two") {
          const [a, b] = [r.pick(watched), r.pick(watched)];
          if (a !== b && existsSync(a) && existsSync(b)) {
            const [x, y] = [readFileSync(a), readFileSync(b)];
            writeFileSync(a, y);
            writeFileSync(b, x);
          }
        }
      }
      const expected = watched.filter((p) => !same(baseline.get(p), read(p)));
      const now = read(l.log);
      if (withLog && oldLog.length > 0 && (now === undefined || now.length < oldLog.length || !now.subarray(0, oldLog.length).equals(oldLog))) expected.push(l.log);
      const got = guard.changed();
      expect(got.sort(), `seed iteration ${i}`).toEqual(expected.sort());
      if (expected.length) found++;
      else quiet++;
    }
    expect(found).toBeGreaterThan(10);
    expect(quiet).toBeGreaterThan(10);
  });

  test("a settings file of more than 5 MB with one byte changed in the middle is found", () => {
    const l = layout();
    const file = join(l.project, ".cuvette", "settings.json");
    const body = Buffer.alloc(6_000_000, 32);
    body.write('{"a":1}', 0);
    writeFileSync(file, body);
    const before = statSync(file);
    const guard = fingerprint(l.dirs, false);
    body[3_000_000] = 120;
    writeFileSync(file, body);
    restoreTimes(file, before);
    expect(guard.changed()).toEqual([file]);
    body[3_000_000] = 32;
    writeFileSync(file, body);
    expect(guard.changed()).toEqual([]);
  });

  test("a log with an old part of 3 MB is checked in the whole old part", () => {
    const l = layout();
    const body = Buffer.alloc(3_000_000, 97);
    writeFileSync(l.log, body);
    const guard = fingerprint(l.dirs, true);
    appendFileSync(l.log, "more\n");
    expect(guard.changed()).toEqual([]);
    body[1_500_000] = 98;
    writeFileSync(l.log, Buffer.concat([body, Buffer.from("more\n")]));
    expect(guard.changed()).toEqual([l.log]);
  });

  test.skipIf(process.platform === "win32")("a link in place of a settings file is found if its content differs, and not if it is the same", () => {
    const l = layout();
    const file = join(l.project, ".cuvette", "settings.json");
    writeFileSync(file, '{"permissions":"ask"}');
    const guard = fingerprint(l.dirs, false);
    const copy = join(l.project, "copy.json");
    writeFileSync(copy, '{"permissions":"ask"}');
    rmSync(file);
    symlinkSync(copy, file);
    expect(guard.changed()).toEqual([]);
    writeFileSync(copy, '{"permissions":"bypass"}');
    expect(guard.changed()).toEqual([file]);
  });
});
