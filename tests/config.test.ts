import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { loadSettings } from "../src/core/config.ts";
import { Session } from "../src/core/session.ts";
import { FakeProvider } from "../src/providers/fake.ts";
import { trustFolder } from "../src/core/trust.ts";

const OLD = ".ga";

test("loadSettings reads .ga/ settings and lets .cuvette/ settings win", () => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-config-home-"));
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-config-"));
  mkdirSync(join(cwd, OLD));
  writeFileSync(join(cwd, OLD, "settings.json"), JSON.stringify({ model: "old-model", maxSteps: 7 }));
  trustFolder(cwd);
  expect(loadSettings(cwd)).toMatchObject({ model: "old-model", maxSteps: 7 });
  mkdirSync(join(cwd, ".cuvette"));
  writeFileSync(join(cwd, ".cuvette", "settings.json"), JSON.stringify({ model: "new-model" }));
  trustFolder(cwd);
  expect(loadSettings(cwd)).toMatchObject({ model: "new-model", maxSteps: 7 });
});

test("an empty settings file gives the defaults, a file that is not an object stops with a clear message, and a value of the wrong type is left out", () => {
  const home = (process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-config-home-")));
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-config-"));
  writeFileSync(join(home, "settings.json"), "");
  expect(loadSettings(cwd).output_folder).toBe("cuvette");
  for (const body of ["null", "[1]", "7"]) {
    writeFileSync(join(home, "settings.json"), body);
    expect(() => loadSettings(cwd)).toThrow(/must hold one JSON object/);
  }
  writeFileSync(join(home, "settings.json"), JSON.stringify({ output_folder: 5, defaultAdapters: "tables", permissions: [1], maxSteps: "a", model: "m2", export_xlsx: false }));
  expect(loadSettings(cwd)).toMatchObject({ output_folder: "cuvette", defaultAdapters: ["tables"], permissions: {}, maxSteps: 40, model: "m2", export_xlsx: false });
  rmSync(home, { recursive: true, force: true });
  rmSync(cwd, { recursive: true, force: true });
});

test("a value of the wrong type gives a note in the session record", async () => {
  const before = process.env.CUVETTE_HOME;
  const home = (process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-config-home-")));
  const cwd = mkdtempSync(join(tmpdir(), "cuvette-config-"));
  try {
    writeFileSync(join(home, "settings.json"), JSON.stringify({ maxSteps: "ten", mode: "fast", permissions: { Bash: "maybe", run_script: "deny" } }));
    const notes: string[] = [];
    const s = loadSettings(cwd, {}, notes);
    expect(s).toMatchObject({ maxSteps: 40, mode: "watch", permissions: { run_script: "deny" } });
    expect(notes).toEqual([
      expect.stringMatching(/settings\.json: maxSteps must be a number above 0, not "ten"\. Cuvette ignores this value\./),
      expect.stringMatching(/mode must be one of: watch, follow, teach, plan, not "fast"/),
      expect.stringMatching(/the rule for Bash must be allow, ask or deny, not "maybe"/),
    ]);
    const session = await Session.create({ adapters: [], provider: new FakeProvider([{ text: "ok" }]), cwd });
    const recorded = session.record.entries(["notice"]).map((e) => String(e.data.text)).filter((t) => /Cuvette ignores/.test(t));
    await session.close();
    expect(recorded).toHaveLength(3);
    expect(recorded[0]).toContain("maxSteps");
  } finally {
    if (before === undefined) delete process.env.CUVETTE_HOME;
    else process.env.CUVETTE_HOME = before;
    rmSync(home, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  }
});
