import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { loadSettings } from "../src/core/config.ts";
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
