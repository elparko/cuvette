import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { hostedMode } from "../src/core/hosted.ts";
import { describe as describeSettings, find, resolve } from "../src/core/settings.ts";

const oldHome = process.env.CUVETTE_HOME;
let home = "";
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "cuvette-hosted-"));
  process.env.CUVETTE_HOME = home;
});
afterEach(() => {
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
});

test("hosted mode is off by default", () => {
  expect(hostedMode({})).toBe(false);
});

test("CUVETTE_HOSTED=1 turns it on, and other values do not", () => {
  expect(hostedMode({ CUVETTE_HOSTED: "1" })).toBe(true);
  expect(hostedMode({ CUVETTE_HOSTED: "0" })).toBe(false);
  expect(hostedMode({ CUVETTE_HOSTED: "yes" })).toBe(false);
});

test("the user setting hosted_mode turns it on", () => {
  writeFileSync(join(home, "settings.json"), JSON.stringify({ hosted_mode: true }));
  expect(hostedMode({})).toBe(true);
  writeFileSync(join(home, "settings.json"), JSON.stringify({ hosted_mode: "on" }));
  expect(hostedMode({})).toBe(true);
  writeFileSync(join(home, "settings.json"), JSON.stringify({ hosted_mode: false }));
  expect(hostedMode({})).toBe(false);
});

test("a broken settings file means off", () => {
  writeFileSync(join(home, "settings.json"), "{");
  expect(hostedMode({})).toBe(false);
});

test("the settings list shows the Cuvette account only in hosted mode, and never shows hosted_mode", () => {
  const ctx = (env: Record<string, string>) => ({ cwd: home, env });
  const names = (env: Record<string, string>) => describeSettings(ctx(env)).map((r) => r.def.name);
  expect(names({})).not.toContain("cuvette_account");
  expect(names({})).not.toContain("hosted_mode");
  expect(names({ CUVETTE_HOSTED: "1" })).toContain("cuvette_account");
  expect(names({ CUVETTE_HOSTED: "1" })).not.toContain("hosted_mode");
  expect(resolve(find("hosted_mode")!, ctx({ CUVETTE_HOSTED: "1" })).value).toBe("on");
});

test("the model choices list cuvette only in hosted mode", () => {
  const choices = () => find("model")!.choices!();
  expect(choices()).not.toContain("cuvette");
  process.env.CUVETTE_HOSTED = "1";
  try {
    expect(choices()).toContain("cuvette");
  } finally {
    delete process.env.CUVETTE_HOSTED;
  }
});
